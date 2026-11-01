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

  // 先校验结构
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

  // 类型断言：校验通过后结构基本正确
  const save = parsed as GameSave

  // 再检查版本兼容性
  if (!isSchemaVersionCompatible(save.schemaVersion)) {
    return {
      status: 'incompatible',
      error: `存档版本 ${save.schemaVersion} 不被当前版本支持`,
      schemaVersion: save.schemaVersion,
    }
  }

  return { status: 'valid', data: save }
}
