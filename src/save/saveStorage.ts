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
 *  3. 都失败返回 empty 或 corrupted
 *
 *  注意：localStorage 不提供跨 key 原子事务，本模块尽量降低数据丢失风险，
 *        但不宣称实现了真正的原子提交。
 */

import type { GameSave, SaveLoadResult, SaveWriteResult } from './saveTypes'
import { SAVE_KEY_PRIMARY, SAVE_KEY_TEMP } from './saveTypes'
import { serializeSave, deserializeSave } from './saveSerializer'

/** 检测 localStorage 是否可用
 *
 *  某些环境（隐私模式、SSR、浏览器禁用存储）下 localStorage 不可用。
 *  用 try/catch 包裹读写操作，避免抛出异常导致应用崩溃。
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__ls_test__'
    window.localStorage.setItem(testKey, '1')
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
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

/** 读取本局存档
 *
 *  读取顺序：主 key → 临时 key → 不存在/损坏。
 *  返回 SaveLoadResult，明确区分各种情况。
 */
export function loadSave(): SaveLoadResult {
  if (!isLocalStorageAvailable()) {
    return {
      status: 'read_error',
      error: 'localStorage 不可用',
    }
  }

  // 先尝试主 key
  const primaryResult = readRaw(SAVE_KEY_PRIMARY)
  if (!primaryResult.ok) {
    return { status: 'read_error', error: primaryResult.error }
  }
  const primaryRaw = primaryResult.value

  // 主存档损坏的中间状态（用于后续分支判断）
  let primaryCorruptedResult: { status: 'corrupted'; error: string; raw?: string } | null = null

  if (primaryRaw !== null) {
    const result = deserializeSave(primaryRaw)
    if (result.status === 'valid') {
      return result
    }
    if (result.status === 'incompatible') {
      return result // 版本不兼容直接返回，不回退到临时 key
    }
    // 主 key 损坏，保存下来，继续尝试临时 key
    // （不删除主 key，保留原始数据供调试）
    if (result.status === 'corrupted') {
      primaryCorruptedResult = result
    }
  }

  // 主 key 不存在或损坏，尝试临时 key
  const tempResult = readRaw(SAVE_KEY_TEMP)
  if (!tempResult.ok) {
    // 如果主 key 已经是损坏状态，且临时 key 也读失败，返回主 key 的错误
    if (primaryCorruptedResult) {
      return {
        status: 'corrupted',
        error: `主存档损坏，且无法读取临时存档: ${primaryCorruptedResult.error}`,
        raw: primaryRaw ?? undefined,
      }
    }
    return { status: 'read_error', error: tempResult.error }
  }
  const tempRaw = tempResult.value

  if (tempRaw !== null) {
    const tempDesResult = deserializeSave(tempRaw)
    if (tempDesResult.status === 'valid') {
      // 临时存档有效，将其提升为主存档（上次写入被中断）
      const promoteErr = writeRaw(SAVE_KEY_PRIMARY, tempRaw)
      if (!promoteErr) {
        removeKey(SAVE_KEY_TEMP)
      }
      return tempDesResult
    }
    // 临时存档版本不兼容
    if (tempDesResult.status === 'incompatible') {
      // 主存档存在（损坏）时，主存档状态优先；主存档不存在时，直接返回 incompatible
      if (!primaryCorruptedResult) {
        return tempDesResult
      }
      // 主存档损坏 + 临时存档不兼容 → 报告 corrupted（主存档优先级更高）
      // 不删除任何数据，保留原始内容
      return {
        status: 'corrupted',
        error: '主存档损坏，临时存档版本不兼容',
        raw: primaryRaw ?? undefined,
      }
    }
    // 临时存档也损坏
    if (primaryCorruptedResult) {
      return {
        status: 'corrupted',
        error: '主存档和临时存档均已损坏',
        raw: primaryRaw ?? undefined,
      }
    }
    // 主存档不存在，只有一个损坏的临时存档 → 返回 corrupted
    // （注意：即使是首次写入中断产生的损坏数据，也不应误判为空档，
    //  以免自动保存逻辑覆盖掉可能有价值的数据）
    return {
      status: 'corrupted',
      error: '临时存档损坏',
      raw: tempRaw,
    }
  }

  // 临时 key 不存在
  if (primaryCorruptedResult) {
    // 主存档损坏、临时存档不存在 → 返回 corrupted
    return primaryCorruptedResult
  }

  // 两个 key 都没有
  return { status: 'empty' }
}

/** 写入本局存档（两步法，尽量保证新存档写入失败时旧存档仍可用）
 *
 *  流程：
 *  1. 序列化数据
 *  2. 写入临时 key
 *  3. 回读临时 key 校验
 *  4. 写入主 key
 *  5. 删除临时 key
 *
 *  任何步骤失败都不会删除已有主存档。
 */
export function writeSave(save: GameSave): SaveWriteResult {
  if (!isLocalStorageAvailable()) {
    return { status: 'error', error: 'localStorage 不可用' }
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

  // 步骤 3：回读校验（确保写入成功且数据完整）
  const tempReadResult = readRaw(SAVE_KEY_TEMP)
  if (!tempReadResult.ok) {
    // 回读失败，尝试清理临时 key，主存档不受影响
    removeKey(SAVE_KEY_TEMP)
    return { status: 'error', error: `回读校验失败: ${tempReadResult.error}` }
  }
  const tempReadBack = tempReadResult.value
  if (tempReadBack === null || tempReadBack !== serialized) {
    removeKey(SAVE_KEY_TEMP)
    return { status: 'error', error: '回读校验失败：数据不一致' }
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
 */
export function deleteSave(): SaveWriteResult {
  if (!isLocalStorageAvailable()) {
    return { status: 'error', error: 'localStorage 不可用' }
  }

  const err1 = removeKey(SAVE_KEY_PRIMARY)
  const err2 = removeKey(SAVE_KEY_TEMP)

  if (err1 || err2) {
    return {
      status: 'error',
      error: [err1, err2].filter(Boolean).join('; '),
    }
  }
  return { status: 'success' }
}

/** 检查某个 key 中的存档是否有效（只读，不修改存储）
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

/** 检查是否存在有效存档（可正常加载的存档）
 *
 *  只做有效性检查，不返回数据，也不会修改存储内容。
 *  - 主存档或临时存档中只要有一个能被当前版本正常解析，就返回 true。
 *  - 损坏数据、版本不兼容的数据不会被误判为有效存档。
 *  - 读取失败时返回 false。
 *
 *  注意：此函数不区分"只有损坏存档"和"完全没有存档"，
 *        如需更细的状态信息，请使用 loadSave()。
 */
export function hasSave(): boolean {
  if (!isLocalStorageAvailable()) return false

  // 主 key 有效 → 直接返回 true
  const primaryStatus = checkKeyStatus(SAVE_KEY_PRIMARY)
  if (primaryStatus === 'valid') return true

  // 主 key 不兼容 → 不算有效存档，但也不回退（与 loadSave 策略一致）
  if (primaryStatus === 'incompatible') return false

  // 主 key 不存在或损坏 → 检查临时 key
  const tempStatus = checkKeyStatus(SAVE_KEY_TEMP)
  return tempStatus === 'valid'
}
