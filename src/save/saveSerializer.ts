/**
 * 存档序列化与反序列化
 *
 *  - serialize: GameSave -> string（JSON）
 *  - deserialize: string -> SaveLoadResult（含校验）
 *
 *  不依赖 localStorage，纯函数，方便测试。
 */

import type { GameSave, SaveLoadResult } from './saveTypes'
import { validateGameSave, isSchemaVersionCompatible } from './saveValidator'

/** 将存档序列化为 JSON 字符串
 *
 *  序列化失败返回错误信息。
 */
export function serializeSave(save: GameSave): string {
  return JSON.stringify(save)
}

/** 将 JSON 字符串反序列化为存档对象，并进行校验
 *
 *  返回 SaveLoadResult，明确区分各种失败情况。
 *
 *  检查顺序：
 *  1. JSON 解析 → 失败：corrupted
 *  2. schemaVersion 版本检查 → 不兼容：incompatible
 *  3. 结构校验（仅对兼容版本执行）→ 失败：corrupted
 *
 *  注意：版本检查先于结构检查，避免未来版本的存档因结构差异被误判为 corrupted。
 *        不兼容版本的存档不进行结构深度校验，只确认 schemaVersion 字段存在且为数字。
 */
export function deserializeSave(raw: string): SaveLoadResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    return {
      status: 'corrupted',
      error: `JSON 解析失败: ${e instanceof Error ? e.message : String(e)}`,
      raw,
    }
  }

  // 第 2 步：先检查 schemaVersion 字段的合法性
  // 必须是正的安全整数；小数、负数、Infinity、NaN 等非法值 → corrupted
  // 合法但当前不支持的版本 → incompatible
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('schemaVersion' in parsed)
  ) {
    return {
      status: 'corrupted',
      error: '存档缺少 schemaVersion 字段，格式不合法',
      raw,
    }
  }

  const rawVersion = (parsed as Record<string, unknown>).schemaVersion
  if (
    typeof rawVersion !== 'number' ||
    !Number.isSafeInteger(rawVersion) ||
    rawVersion <= 0
  ) {
    return {
      status: 'corrupted',
      error: `schemaVersion 必须是正的安全整数，实际值: ${String(rawVersion)}`,
      raw,
    }
  }

  const schemaVersion = rawVersion
  if (!isSchemaVersionCompatible(schemaVersion)) {
    return {
      status: 'incompatible',
      error: `存档版本 ${schemaVersion} 不被当前版本支持`,
      schemaVersion,
    }
  }

  // 第 3 步：对兼容版本执行完整结构校验
  const validation = validateGameSave(parsed)
  if (!validation.valid) {
    const msg = validation.errors
      .map((e) => `${e.path}: ${e.message}`)
      .join('; ')
    return {
      status: 'corrupted',
      error: `存档结构校验失败 (${validation.errors.length} 个错误): ${msg}`,
      raw,
    }
  }

  return { status: 'valid', data: parsed as GameSave }
}
