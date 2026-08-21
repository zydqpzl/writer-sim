// 游戏核心类型定义
import type {
  AuthorMeme,
  AuthorRank,
  CareerProject,
  WritingInspiration,
} from './career'
import type { InspirationCard } from './event'
import type { PlatformEcosystemState } from './platform'

/** 一天中的时段 */
export type TimeSlot = 'morning' | 'afternoon' | 'evening'

/** 玩家当前所处地点 */
export type PlayerLocation = 'city' | 'hometown'

/** 人生主路线（可组合，最终按最高倾向 + 关键阈值判定结局） */
export type LifePath =
  | 'BIG_CITY_CREATOR' // 一线数字游民：大城市坚守创作
  | 'HOMETOWN_KOL' // 县城下沉：回老家做生活/三农/黑色幽默
  | 'SUBCULTURE_GURU' // 亚文化硬核：兼职与奇遇堆出圈内声望
  | 'REALITY_COMPROMISE' // 向现实妥协：兼职>创作，考编/求职
  | 'BALANCED' // 没有明显偏向

/** 结局标签 */
export type EndingTag = 'triumph' | 'compromise' | 'fail' | 'open'

/** 玩家可执行的行动类型 */
export type ActionType =
  | 'work' // 创作/工作
  | 'social' // 运营社交媒体
  | 'family' // 沟通父母
  | 'rest' // 摆烂/休息
  | 'parttime' // 应急保命兼职（极简确定性）
  | 'subculture' // 亚文化奇遇兼职（触发事件链）
  | 'hometown_parttime' // 县城老家帮工（低收益低压力）

/** 玩家属性集合 */
export interface PlayerStats {
  /** 存款（元） */
  savings: number
  /** 健康 0-100 */
  health: number
  /** 精力 0-100 */
  energy: number
  /** 压力 0-300（CK3 风格，越高越糟；0-99 正常 / 100-199 轻度焦虑 / 200-299 职业倦怠 / 300 精神崩溃） */
  stress: number
  /** 父母满意度 0-100 */
  familyApproval: number
  /** 职业影响力 0-100 */
  influence: number
  /** 粉丝数 */
  fans: number
}

/** 健康状态阈值（派生自 health） */
export type HealthStatus = 'EXCELLENT' | 'SUB_HEALTH' | 'SICK' | 'CRITICAL'

/** 压力等级（CK3 风格，派生自 stress） */
export type StressLevel = 0 | 1 | 2 | 3

/** 特质类型：BUFF 为正面，DEBUFF 为负面 */
export type StatusTraitType = 'BUFF' | 'DEBUFF'

/**
 * 状态特质效果定义。
 * - energyMaxDelta：精力上限的修正（基础 100，可累加，可为负）
 * - stressMaxDelta：压力上限的修正（基础 STRESS_MAX=300，可累加，可为负）
 * - healthDeltaPerDay：每日结算时健康变化（可为负）
 * - stressDeltaPerDay：每日结算时压力变化（可为负，即每日降压）
 * - disableActions：持有该特质期间禁用的行动类型
 */
export interface StatusTraitEffects {
  energyMaxDelta?: number
  stressMaxDelta?: number
  healthDeltaPerDay?: number
  stressDeltaPerDay?: number
  disableActions?: ActionType[]
}

/** 状态特质：有限时长的状态修饰器，每日结算时衰减 */
export interface StatusTrait {
  id: string
  name: string
  type: StatusTraitType
  description: string
  /** 剩余天数（含获得当天，每日结算时 -1，归 0 时移除） */
  durationDays: number
  effects: StatusTraitEffects
}

/** 结局定义 */
export interface Ending {
  id: string
  title: string
  description: string
  /** 结局标签：胜利/妥协/失败/开放 */
  tag: EndingTag
  /** 图鉴中未解锁时的提示文本 */
  hint: string
}

/** 路线判定快照（用于 UI 趋势展示） */
export interface PathSnapshot {
  dominant: LifePath
  scores: Record<LifePath, number>
}

/** 游戏全局状态 */
export interface GameState {
  /** 当前天数 1-60 */
  day: number
  /** 当前时段 */
  slot: TimeSlot
  /** 玩家当前所处地点（城市 / 老家） */
  location: PlayerLocation
  /** 玩家属性 */
  stats: PlayerStats
  /** 当前时段是否已行动 */
  actedThisSlot: boolean
  /** 今日是否已兼职（锁定兼职与主业创作） */
  partTimeLock: boolean
  /** 今日是否进行了主业创作（用于连续兼职判定） */
  workedToday: boolean
  /** 连续靠兼职生存且主业进度为 0 的天数 */
  consecutivePartTimeDays: number
  /** 是否已触发"现实的铁拳" */
  realityPunchTriggered: boolean
  /** 今日刷新出的限时奇遇事件链 id（null 表示今日无奇遇） */
  availableEncounter: string | null
  /** 灵感卡牌背包 */
  inventory: InspirationCard[]
  /** 当前生效的状态特质（BUFF/DEBUFF） */
  activeTraits: StatusTrait[]
  /** 人生路线倾向分数 */
  pathScores: Record<LifePath, number>
  /** 亚文化圈内声望（0-100） */
  subcultureReputation: number
  /** 考编/求职进度（0-100） */
  examProgress: number
  /** CareerEngine：当前进行中的主业项目（一本书、一个视频、一个 App 等） */
  careerProjects: CareerProject[]
  /** 写作灵感背包（从现实事件中萃取的素材） */
  inspirations: WritingInspiration[]
  /** 已解锁的作者梗/名场面（跨作品、跨局可用） */
  unlockedMemes: AuthorMeme[]
  /** 作者等级（新人 / 签约 / 精品 / 大神 / 白金） */
  authorRank: AuthorRank
  /** 网文江湖：平台生态、NPC 同行与排行榜 */
  platformEcosystem: PlatformEcosystemState
}

/** 日志条目类型 */
export type LogKind = 'info' | 'gain' | 'loss' | 'event' | 'system' | 'celebrate'

/** 单条游戏日志 */
export interface LogEntry {
  id: number
  day: number
  slot: TimeSlot
  kind: LogKind
  text: string
}

/** 行动定义（用于渲染行动卡片） */
export interface ActionDef {
  type: ActionType
  label: string
  desc: string
  icon: string
  accent: string // tailwind 颜色类
  /** 仅在指定地点可用；不填则两地通用 */
  location?: PlayerLocation
  effects: {
    savings?: number
    health?: number
    energy?: number
    stress?: number
    familyApproval?: number
    influence?: number
    fans?: number
  }
}

/** 弹窗事件类型 */
export type GameEventType = 'reality_punch' | 'stress_breakdown' | 'major_branch'

/** 弹窗事件情绪色调 */
export type EventTone = 'good' | 'bad' | 'neutral' | 'critical'

/** 弹窗事件的内嵌选项（简化版，就地结算属性效果；仅用于非事件链的一步选择） */
export interface EventPopupOption {
  text: string
  /** 选中后结算的属性变化 */
  effects?: Partial<PlayerStats>
  /** 选中后获得的灵感卡牌 id */
  getCard?: string
  /** 选中后写入日志的描述文本 */
  outcomeLog?: string
  /** 重大分支选项：选中后改变玩家所处地点 */
  setLocation?: PlayerLocation
}

/** 弹窗事件 */
export interface GameEvent {
  id: number
  type: GameEventType
  title: string
  icon: string
  tone: EventTone
  text: string
  /** 随事件附带的效果摘要（用于展示） */
  effects: string[]
  /**
   * 内嵌选项：若提供，弹窗会渲染为按钮组而不是单一"知道了"。
   * 玩家点击选项后就地结算属性/卡牌，事件关闭。
   */
  options?: EventPopupOption[]
}
