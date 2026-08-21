// 网文江湖：平台生态、NPC 同行与排行榜类型定义

/** 小说平台 ID */
export type NovelPlatformId = 'ZHONGDIAN' | 'KUAIYUE' | 'SUCHUAN' | 'LVJIANG'

/** 平台变现模式 */
export type BusinessModel = 'SUBSCRIPTION' | 'FREE_AD' | 'SPONSORSHIP' | 'IP_DRIVEN'

/** 平台对作品三维的算法偏好（权重和，用于排行榜排序） */
export interface AlgorithmFocus {
  /** 质量权重 */
  quality: number
  /** 商业性/爽点权重 */
  commerciality: number
  /** 梗/话题度权重 */
  memeValue: number
  /** 热度/追读权重 */
  hype: number
}

/** 小说平台定义 */
export interface NovelPlatform {
  id: NovelPlatformId
  /** 平台显示名 */
  name: string
  /** 一句话生态定位 */
  tagline: string
  /** 详细描述：机制、痛点、收益 */
  description: string
  /** 变现模式 */
  businessModel: BusinessModel
  /** 算法偏好：决定什么样的书在这个平台更容易上榜 */
  algorithmFocus: AlgorithmFocus
  /** 签约难度（0-100，越高越难） */
  baseContractDifficulty: number
  /** 基础日活读者数（影响新书曝光池大小） */
  baseDailyReaders: number
  /** 平台对新书的基础流量扶持（0-1） */
  newBookBoost: number
  /** 完结/太监后的梗传播系数（影响跨作品梗发酵） */
  memeSpreadFactor: number
  /** 平台特色事件触发权重 */
  eventWeights: {
    blackfan: number
    peerRoast: number
    antiPiracy: number
    commentRevolt: number
  }
}

/** NPC 同行写作风格 */
export type NPCCreatorStyle =
  | 'SPEED_RUN' // 触手怪：日更万字
  | 'QUALITY_MONSTER' // 质量怪：更新慢但质量高
  | 'DRAMA_QUEEN' // 键盘侠：爱对线、爱整活
  | 'SLACKER' // 咸鱼：更新不稳定
  | 'TURTLE' // 太监大魔王：数据不好立刻切

/** NPC 创作状态 */
export type NPCCreatorStatus = 'ACTIVE' | 'HIATUS' | 'COMPLETED' | 'ABANDONED'

/** NPC 同行创作者 */
export interface NPCCreator {
  id: string
  /** NPC 笔名 */
  name: string
  /** 写作风格 */
  style: NPCCreatorStyle
  /** 当前作品标题 */
  currentBookTitle: string
  /** 所属平台 */
  platformId: NovelPlatformId
  /** 当前热度（0-100） */
  hype: number
  /** 当前总字数 */
  wordCount: number
  /** 作品质量（0-100） */
  quality: number
  /** 商业性（0-100） */
  commerciality: number
  /** 梗值（0-100） */
  memeValue: number
  /** 追读率（0-1） */
  readerRetention: number
  /** 创作状态 */
  status: NPCCreatorStatus
  /** 已连续更新天数 */
  consecutiveDailyUpdates: number
  /** 当前作品已连载天数 */
  bookAgeDays: number
  /** 与玩家的关系值（-100 ~ 100，正数友好，负数敌对） */
  relationship: number
  /** NPC 是否曾和玩家互动过 */
  hasMetPlayer: boolean
}

/** 榜单类型 */
export type BoardType = 'NEW_BOOK' | 'MONTHLY_TICKET' | 'RECOMMEND' | 'READING'

/** 榜单条目：可能是玩家的书或 NPC 的书 */
export interface LeaderboardEntry {
  /** 条目类型 */
  type: 'player' | 'npc'
  /** 玩家项目 id 或 NPC id */
  id: string
  /** 排名 */
  rank: number
  /** 用于排序的分数 */
  score: number
  /** 显示标题 */
  title: string
  /** 显示作者 */
  author: string
}

/** 单个榜单 */
export interface Leaderboard {
  platformId: NovelPlatformId
  boardType: BoardType
  /** 榜单条目（已按 score 降序排列） */
  entries: LeaderboardEntry[]
  /** 榜单结算日期 */
  updatedDay: number
}

/** NPC 对玩家的互动类型 */
export type NPCInteractionType = 'CHAPTER_REC' | 'ROAST' | 'PRAISE' | 'IGNORE'

/** NPC 主动互动事件 */
export interface NPCInteraction {
  id: string
  day: number
  platformId: NovelPlatformId
  npcId: string
  npcName: string
  type: Exclude<NPCInteractionType, 'IGNORE'>
  text: string
  /** 对玩家作品的影响（可选，用于 UI 展示） */
  effect?: {
    hype?: number
    retention?: number
    controversy?: number
    relationshipDelta?: number
  }
}

/** 平台 meme 趋势：某个梗在这个平台的流行度 */
export interface PlatformMemeTrend {
  /** 梗 id */
  memeId: string
  /** 梗名 */
  memeName: string
  /**  originated book title */
  originBookTitle: string
  /** 热度（0-100） */
  heat: number
  /** 被 NPC/读者引用的次数 */
  references: number
  /** 当前传播平台 */
  platformId: NovelPlatformId
}

/** 平台生态运行状态（存入 GameState） */
export interface PlatformEcosystemState {
  /** 各平台当前存活的 NPC 同行 */
  npcs: NPCCreator[]
  /** 各平台当前榜单 */
  leaderboards: Leaderboard[]
  /** 江湖传闻/昨日头条（每日模拟产生的叙事日志） */
  rumors: PlatformRumor[]
  /** NPC 对玩家的主动互动记录 */
  interactions: NPCInteraction[]
  /** 跨平台 meme 流行趋势 */
  memeTrends: PlatformMemeTrend[]
}

/** 江湖传闻：昨日网文圈发生了什么事 */
export interface PlatformRumor {
  id: string
  day: number
  platformId: NovelPlatformId
  text: string
  /** 是否涉及玩家 */
  involvesPlayer: boolean
}

/** NPC 每日模拟结果 */
export interface NPCDailyResult {
  npc: NPCCreator
  logs: string[]
}

/** 平台每日模拟结果 */
export interface PlatformDailyResult {
  updatedNpcs: NPCCreator[]
  updatedLeaderboards: Leaderboard[]
  /** 所有 NPC 状态变化日志 */
  logs: string[]
  rumors: PlatformRumor[]
  /** NPC 对玩家的主动互动 */
  interactions: NPCInteraction[]
  /** 更新后的 meme 趋势 */
  memeTrends: PlatformMemeTrend[]
}
