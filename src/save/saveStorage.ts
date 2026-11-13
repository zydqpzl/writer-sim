/**
 * 存档 localStorage 安全读写
 *
 *  写入策略（两步法）：
 *  1. 先写入临时 key (SAVE_KEY_TEMP)
 *  2. 读取临时 key 并校验（确保写入成功且数据完整）
 *  3. 写入主 key (SAVE_KEY_PRIMARY)
 *  4. 删除临时 key
 *
 *  读取策略：
 *  1. 先尝试读主 key
 *  2. 如果主 key 不存在或损坏，尝试读临时 key（上次写入中断时的备份）
 *  3. 都失败返回 empty / corrupted / incompatible / read_error
 *
 *  注意：localStorage 不提供跨 key 原子事务，本模块尽量降低数据丢失风险，
 *        但不宣称实现了真正的原子提交。
 */

import type { GameSave, SaveLoadResult, SaveWriteResult } from './saveTypes'
import { SAVE_KEY_PRIMARY, SAVE_KEY_TEMP } from './saveTypes'
import { serializeSave, deserializeSave } from './saveSerializer'
import { validateGameSave } from './saveValidator'

/** 检测 localStorage 读取是否可用
 *
 *  某些环境（隐私模式、SSR、浏览器禁用存储）下 localStorage 不可用。
 *  这里只测试读取能力。写入失败不等于读取也失败（例如配额已满但仍可读）。
 */
function canReadLocalStorage(): boolean {
  try {
    window.localStorage.getItem('__ls_read_test__')
    return true
  } catch {
    return false
  }
}

/** 检测 localStorage 写入是否可用
 *
 *  执行一次写入 + 删除测试。
 *  读取失败时写入一定也失败，所以先检查读取能力。
 *  使用带时间戳的唯一 key，避免与业务数据或并行测试冲突。
 */
function canWriteLocalStorage(): boolean {
  if (!canReadLocalStorage()) return false
  const testKey = `__ls_write_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}__`
  try {
    window.localStorage.setItem(testKey, '1')
    return true
  } catch {
    return false
  } finally {
    // 清理放在 finally 中，即使 setItem 成功但 removeItem 失败
    // （极罕见），也不会影响可用性判断本身
    try {
      window.localStorage.removeItem(testKey)
    } catch {
      // 清理失败不影响可用性判断结果
    }
  }
}

/** 对外导出的可用性检测（保留原函数名，用于 UI 层快速判断）
 *
 *  返回 true 表示读写均可用。
 *  内部读写函数不再依赖此函数做前置检查，而是各自独立处理异常。
 */
export function isLocalStorageAvailable(): boolean {
  return canWriteLocalStorage()
}

/** 从 localStorage 读取原始字符串
 *
 *  返回：
 *  - { ok: true, value: string | null } 成功，value 为 null 表示 key 不存在
 *  - { ok: false, error: string } 失败
 */
function readRaw(key: string):
  | { ok: true; value: string | null }
  | { ok: false; error: string } {
  try {
    const raw = window.localStorage.getItem(key)
    return { ok: true, value: raw }
  } catch (e) {
    return {
      ok: false,
      error: `读取失败: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}

/** 写入原始字符串到 localStorage
 *
 *  返回 null 表示成功，否则返回错误信息。
 */
function writeRaw(key: string, value: string): string | null {
  try {
    window.localStorage.setItem(key, value)
    return null
  } catch (e) {
    return `写入失败: ${e instanceof Error ? e.message : String(e)}`
  }
}

/** 删除指定 key */
function removeKey(key: string): string | null {
  try {
    window.localStorage.removeItem(key)
    return null
  } catch (e) {
    return `删除失败: ${e instanceof Error ? e.message : String(e)}`
  }
}

/** 检查某个 key 中的存档状态（只读，不修改存储）
 *
 *  返回：
 *  - 'valid'：该 key 下有有效存档
 *  - 'corrupted'：该 key 下有数据但已损坏
 *  - 'incompatible'：该 key 下有数据但版本不兼容
 *  - 'empty'：该 key 不存在
 *  - 'read_error'：读取失败
 */
function checkKeyStatus(key: string):
  | 'valid'
  | 'corrupted'
  | 'incompatible'
  | 'empty'
  | 'read_error' {
  const rawResult = readRaw(key)
  if (!rawResult.ok) return 'read_error'
  if (rawResult.value === null) return 'empty'
  const desResult = deserializeSave(rawResult.value)
  return desResult.status
}

/** 读取本局存档
 *
 *  读取顺序：主 key → 临时 key → 不存在/损坏。
 *  返回 SaveLoadResult，明确区分各种情况。
 *
 *  分支表（主状态 → 临时状态 → 返回）：
 *  - valid → 任意 → valid（主存档直接返回）
 *  - incompatible → 任意 → incompatible（主存档不兼容不回退）
 *  - corrupted → valid → valid（临时存档有效，提升为主存档）
 *  - corrupted → incompatible → corrupted（主损坏优先报告）
 *  - corrupted → corrupted → corrupted（双损坏）
 *  - corrupted → empty → corrupted（仅主损坏）
 *  - empty → valid → valid（临时有效，提升为主存档）
 *  - empty → incompatible → incompatible（仅临时不兼容）
 *  - empty → corrupted → corrupted（仅临时损坏）
 *  - empty → empty → empty（无存档）
 *  - read_error → 任意 → read_error
 */
export function loadSave(): SaveLoadResult {
  // 读取失败直接返回，不做可用性预判断（读和写的可用性可能不同）
  const primaryResult = readRaw(SAVE_KEY_PRIMARY)
  if (!primaryResult.ok) {
    return { status: 'read_error', error: primaryResult.error }
  }
  const primaryRaw = primaryResult.value

  // 主存档存在 → 先解析并判断状态
  let primaryStatus: 'valid' | 'corrupted' | 'incompatible' | 'empty' = 'empty'
  let primaryDesResult: SaveLoadResult | null = null

  if (primaryRaw !== null) {
    primaryDesResult = deserializeSave(primaryRaw)
    primaryStatus = primaryDesResult.status as 'valid' | 'corrupted' | 'incompatible'

    if (primaryStatus === 'valid') {
      return primaryDesResult // 主存档有效，直接返回
    }
    if (primaryStatus === 'incompatible') {
      return primaryDesResult // 主存档版本不兼容，直接返回不回退
    }
    // corrupted：继续尝试临时 key
  }

  // 主存档不存在或损坏 → 尝试临时 key
  const tempResult = readRaw(SAVE_KEY_TEMP)
  if (!tempResult.ok) {
    // 临时 key 读取失败
    if (primaryDesResult && primaryDesResult.status === 'corrupted') {
      return {
        status: 'corrupted',
        error: `主存档损坏，且无法读取临时存档: ${primaryDesResult.error}`,
        raw: primaryRaw ?? undefined,
      }
    }
    return { status: 'read_error', error: tempResult.error }
  }
  const tempRaw = tempResult.value

  if (tempRaw === null) {
    // 临时 key 不存在
    if (primaryStatus === 'corrupted' && primaryDesResult) {
      return primaryDesResult // 主存档损坏、临时不存在 → 返回主存档损坏
    }
    return { status: 'empty' } // 都不存在
  }

  // 临时 key 有数据 → 解析
  const tempDesResult = deserializeSave(tempRaw)

  if (tempDesResult.status === 'valid') {
    // 临时存档有效，将其提升为主存档
    // 安全保证：只有当主存档不存在或损坏时才会走到这里，
    //         不会用临时存档覆盖一个有效的主存档
    const promoteErr = writeRaw(SAVE_KEY_PRIMARY, tempRaw)
    if (!promoteErr) {
      removeKey(SAVE_KEY_TEMP)
    }
    return tempDesResult
  }

  if (tempDesResult.status === 'incompatible') {
    if (primaryStatus === 'corrupted') {
      // 主存档损坏 + 临时存档不兼容 → 报告 corrupted（主存档优先级更高）
      // 不删除任何数据，两份原始内容都保留
      return {
        status: 'corrupted',
        error: '主存档损坏，临时存档版本不兼容',
        raw: primaryRaw ?? undefined,
      }
    }
    // 主存档不存在，只有临时不兼容 → 返回 incompatible
    return tempDesResult
  }

  // 临时存档损坏
  if (primaryStatus === 'corrupted') {
    return {
      status: 'corrupted',
      error: '主存档和临时存档均已损坏',
      raw: primaryRaw ?? undefined,
    }
  }

  // 主存档不存在，只有损坏的临时存档 → 返回 corrupted
  // 注意：即使可能是首次写入中断产生的碎片，也不应误判为空档，
  //      以免自动保存逻辑覆盖掉可能有价值的数据
  return {
    status: 'corrupted',
    error: '临时存档损坏',
    raw: tempRaw,
  }
}

/** 写入本局存档（两步法，尽量保证新存档写入失败时旧存档仍可用）
 *
 *  流程：
 *  1. 结构校验（运行时安全网，确保即将写入的数据合法）
 *  2. 序列化数据
 *  3. 写入临时 key
 *  4. 回读临时 key 并校验（字符串比对 + 反序列化验证）
 *  5. 写入主 key
 *  6. 删除临时 key
 *
 *  任何步骤失败都不会删除已有主存档。
 *  验证失败（步骤 4）时会清理临时 key，保证原有主存档不受影响。
 */
export function writeSave(save: GameSave): SaveWriteResult {
  // 步骤 0：运行时结构校验（防御性检查）
  // TypeScript 在编译期保证类型，但运行时可能因 bug 或外部注入导致数据异常
  const validation = validateGameSave(save)
  if (!validation.valid) {
    const msg = validation.errors
      .map((e) => `${e.path}: ${e.message}`)
      .join('; ')
    return {
      status: 'error',
      error: `存档结构校验失败，拒绝写入: ${msg}`,
    }
  }

  // 步骤 1：序列化
  let serialized: string
  try {
    serialized = serializeSave(save)
  } catch (e) {
    return {
      status: 'error',
      error: `序列化失败: ${e instanceof Error ? e.message : String(e)}`,
    }
  }

  // 步骤 2：写入临时 key
  const tempWriteErr = writeRaw(SAVE_KEY_TEMP, serialized)
  if (tempWriteErr) {
    // 临时写入失败，主存档不受影响
    return { status: 'error', error: tempWriteErr }
  }

  // 步骤 3：回读校验
  // 3a. 确认能读回来
  const tempReadResult = readRaw(SAVE_KEY_TEMP)
  if (!tempReadResult.ok) {
    // 回读失败，尝试清理临时 key，主存档不受影响
    removeKey(SAVE_KEY_TEMP)
    return { status: 'error', error: `回读校验失败: ${tempReadResult.error}` }
  }
  const tempReadBack = tempReadResult.value
  if (tempReadBack === null) {
    removeKey(SAVE_KEY_TEMP)
    return { status: 'error', error: '回读校验失败：临时 key 为空' }
  }

  // 3b. 字符串比对（确保写入的数据和读回的数据完全一致）
  if (tempReadBack !== serialized) {
    removeKey(SAVE_KEY_TEMP)
    return { status: 'error', error: '回读校验失败：数据不一致' }
  }

  // 3c. 反序列化验证（确保回读的数据确实是合法存档）
  const tempVerifyResult = deserializeSave(tempReadBack)
  if (tempVerifyResult.status !== 'valid') {
    removeKey(SAVE_KEY_TEMP)
    return {
      status: 'error',
      error: `回读校验失败：回读数据不合法 (${tempVerifyResult.status})`,
    }
  }

  // 步骤 4：写入主 key
  const primaryWriteErr = writeRaw(SAVE_KEY_PRIMARY, serialized)
  if (primaryWriteErr) {
    // 主 key 写入失败，但临时 key 里有有效数据
    // 不删除临时 key，下次读取时会自动提升为主存档
    return { status: 'error', error: primaryWriteErr }
  }

  // 步骤 5：删除临时 key
  removeKey(SAVE_KEY_TEMP)

  return { status: 'success' }
}

/** 删除本局存档
 *
 *  同时删除主 key 和临时 key。
 *  删除失败不会抛异常，只返回错误信息。
 *
 *  删除顺序（安全优先）：
 *    1. 先删临时 key — 失败则立即返回，不碰主 key
 *    2. 再删主 key — 失败则主 key 保留，返回错误
 *  原则：任何一步失败都要尽可能保留主存档。
 */
export function deleteSave(): SaveWriteResult {
  // 第一步：删除临时存档
  const tempError = removeKey(SAVE_KEY_TEMP)
  if (tempError) {
    return {
      status: 'error',
      error: `删除临时存档失败：${tempError}`,
    }
  }

  // 第二步：删除主存档
  const primaryError = removeKey(SAVE_KEY_PRIMARY)
  if (primaryError) {
    return {
      status: 'error',
      error: `删除主存档失败：${primaryError}`,
    }
  }

  return { status: 'success' }
}

/** 检查是否存在可正常加载的有效存档
 *
 *  语义：主存档或临时存档中，是否存在一个能被当前版本正常解析、可继续游戏的存档。
 *
 *  返回规则（与 loadSave 的成功条件一致）：
 *  - 主存档有效 → true
 *  - 主存档不兼容 → false（不回退，与 loadSave 策略一致）
 *  - 主存档损坏/不存在 + 临时存档有效 → true
 *  - 主存档损坏/不存在 + 临时存档损坏/不兼容/不存在 → false
 *  - 读取失败 → false
 *
 *  只做有效性检查，不返回数据，也不会修改存储内容。
 *  损坏数据、版本不兼容的数据不会被误判为有效存档。
 *
 *  如需更细的状态信息（损坏/不兼容/空/读错误），请使用 loadSave()。
 */
export function hasSave(): boolean {
  // 主 key 有效 → 直接返回 true
  const primaryStatus = checkKeyStatus(SAVE_KEY_PRIMARY)
  if (primaryStatus === 'valid') return true

  // 主 key 读取失败 / 不兼容 → 都不算有有效存档
  // 读取失败时不回退检查临时 key（与 loadSave 策略一致：主 key 读取失败直接返回 read_error）
  if (primaryStatus === 'read_error' || primaryStatus === 'incompatible') return false

  // 主 key 不存在或损坏 → 检查临时 key
  // 只有临时 key 有效才算有存档；损坏、不兼容、读错误都不算
  const tempStatus = checkKeyStatus(SAVE_KEY_TEMP)
  return tempStatus === 'valid'
}
