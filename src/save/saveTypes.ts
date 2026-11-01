/**
 * 本局存档数据结构定义
 *
 * 所有字段均基于项目真实类型，不虚构类型。
 * 本模块不依赖 React、不依赖 useGame / App，可独立使用。
 */

import type { GameState, LogEntry, GameEvent } from '../types/game'

/** 当前存档结构版本号，未来数据结构变更时递增 */
export const SAVE_SCHEMA_VERSION = 1 as const

/** 游戏版本号（当前项目暂无版本管理，先用固定常量占位） */
export const GAME_VERSION = '0.1.0' as const

/** localStorage 中本局存档的主 key */
export const SAVE_KEY_PRIMARY = 'freelancer-survival-save-v1'

/** localStorage 中本局存档的临时 key（写入中使用，成功后替换主 key） */
export const SAVE_KEY_TEMP = 'freelancer-survival-save-v1.tmp'

/** 事件链运行时状态
 *
 *  事件链定义（EventChain 对象）来自静态配置，不需要保存。
 *  只需保存 chainId + stepId + stepDepth 即可恢复。
 */
export interface SaveEventChainState {
  /** 事件链 id，对应静态 EVENT_CHAINS 中的 key */
  chainId: string | null
  /** 当前步骤 id */
  stepId: string | null
  /** 当前深度（用于进度条展示） */
  stepDepth: number
}

/** 游戏存档结构 */
export interface GameSave {
  /** 存档结构版本，用于迁移和兼容性判断 */
  schemaVersion: number

  /** 游戏版本号，辅助排查问题 */
  gameVersion: string

  /** 存档时间戳（毫秒，Date.now()） */
  savedAt: number

  /** 本局唯一标识，一局游戏生命周期内不变，用于遗产结算幂等保护 */
  runId: string

  /** 游戏主状态 */
  state: GameState

  /** 游戏日志 */
  logs: LogEntry[]

  /** 事件链运行态（null 表示没有进行中的事件链） */
  eventChain: SaveEventChainState

  /** 弹窗事件（null 表示没有待处理事件） */
  pendingEvent: GameEvent | null

  /** 结局 id（null 表示未结局；结局定义来自静态 ENDINGS，只需保存 id） */
  endingId: string | null

  /**
   * 日志 ID 生成种子（模块级计数器）。
   *
   *  理论上可以从 `logs` 数组的最大 id + 1 推算，但为了避免极端情况下的重复，
   *  以及应对"日志裁剪后种子丢失"的问题，显式保存更安全。
   */
  logIdSeed: number

  /**
   * 事件 ID 生成种子（模块级计数器）。
   *
   *  事件 id 是递增数字，用于唯一标识每次触发的弹窗事件。
   *  恢复后需要继续递增，不能与历史事件 id 重复。
   */
  eventIdSeed: number
}

/** 存档加载结果类型 */
export type SaveLoadResult =
  | {
      /** 存档不存在 */
      status: 'empty'
    }
  | {
      /** 存档有效 */
      status: 'valid'
      data: GameSave
    }
  | {
      /** 存档损坏（JSON 解析失败或关键字段缺失） */
      status: 'corrupted'
      error: string
      /** 原始字符串（如有），供后续调试 */
      raw?: string
    }
  | {
      /** 存档版本不兼容 */
      status: 'incompatible'
      error: string
      schemaVersion: number
    }
  | {
      /** 读取失败（localStorage 不可用等） */
      status: 'read_error'
      error: string
    }

/** 存档写入结果类型 */
export type SaveWriteResult =
  | {
      status: 'success'
    }
  | {
      status: 'error'
      error: string
    }
