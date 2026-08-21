// CareerEngine：通用主业系统类型定义

/** 职业类型 */
export type ProfessionType = 'WRITER' | 'UP_HOST' | 'STREAMER' | 'AI_DEV'

/** 通用项目生命周期阶段 */
export type ProjectPhase =
  | 'CONCEPT' // 选题/立项中
  | 'DEVELOPING' // 创作/开发中
  | 'LAUNCHED' // 上线/运营/连载中
  | 'COMPLETED' // 完结/结项
  | 'ABANDONED' // 太监/烂尾

/** 项目市场表现指标 */
export interface CareerProjectMetrics {
  /** 累计阅读/播放/活跃用户 (PV/UV) */
  viewsOrReaders: number
  /** 转化率：转化为有效粉丝的比例 (0-1) */
  fanConversionRate: number
  /** 热度衰减系数：每日热度自然下滑率 (0-1) */
  hypeDecay: number
  /** 当前爆火热度值 (0-100) */
  currentHype: number
}

/** 项目累计收益与隐患 */
export interface CareerProjectStats {
  /** 累计赚到的钱 */
  totalRevenue: number
  /** 累计吸粉数 */
  totalFansGained: number
  /** 隐患值：网络爆料 / 代码 Bug / 黑粉炸弹 (0-100) */
  bugOrControversy: number
  /** IP 价值：影视/广播剧/动漫改编潜力 (0-1000) */
  ipValue: number
}

/** 通用项目（所有职业的抽象底座） */
export interface CareerProject {
  id: string
  professionType: ProfessionType
  title: string
  phase: ProjectPhase
  /** 创建日期（游戏内天数） */
  dayCreated: number
  /** 上线日期 */
  dayLaunched?: number

  // 三维核心质量 (0-100)
  quality: number
  commerciality: number
  memeValue: number

  // 生产进度
  progress: number
  totalWorkload: number

  // 运营与数据表现
  metrics: CareerProjectMetrics

  // 累计收益
  stats: CareerProjectStats
}

/** 通用创作动作 */
export interface CareerActionDef {
  id: string
  name: string
  description: string
  /** 该动作只能在什么阶段使用 */
  phaseRequired: ProjectPhase | ProjectPhase[]
  /** 对玩家属性的消耗 */
  cost: {
    energy: number
    stress: number
    money?: number
  }
  /** 对项目或玩家属性的影响 */
  effects: {
    progressAdd?: number
    qualityAdd?: number
    commercialityAdd?: number
    memeValueAdd?: number
    hypeBoost?: number
    fixBugOrIssue?: number
  }
}

/** 动作执行结果 */
export interface CareerActionResult {
  /** 更新后的项目 */
  project: CareerProject
  /** 玩家属性变化（会与现有 applyEffects 对接） */
  playerDelta: {
    energy?: number
    stress?: number
    savings?: number
  }
  /** 本动作产生的日志文本 */
  logs: string[]
}

/** 每日发酵结算结果 */
export interface CareerDailyResult {
  /** 更新后的项目 */
  project: CareerProject
  /** 玩家属性变化 */
  playerDelta: {
    savings?: number
    fans?: number
    stress?: number
  }
  /** 结算日志 */
  logs: string[]
}

/* ============================================================
 * 网络作家（WRITER）职业专属扩展
 * ============================================================ */

/** 网文项目阶段（比通用生命周期更细粒度） */
export type WriterStage =
  | 'CONCEPT' // 试水签约期（未签约）
  | 'SIGNED' // 已签约未上架
  | 'LAUNCHED' // 上架首订期（约 20 万字节点）
  | 'SERIALIZING' // 漫长连载期
  | 'COMPLETED' // 已完结
  | 'ABANDONED' // 太监

/** 写作策略类型 */
export type WriterStrategy =
  | 'SETUP' // 爆肝铺垫
  | 'CLIMAX' // 爆更发糖/打脸
  | 'FILLER' // 水字数
  | 'CLIFFHANGER' // 悬念钩子
  | 'TROPE_INSERT' // 跟风整活

/** 网络作家项目 */
export interface WriterProject extends CareerProject {
  professionType: 'WRITER'
  /** 发书平台 */
  platformId: import('./platform').NovelPlatformId
  stage: WriterStage
  /** 当前总字数 */
  wordCount: number
  /** 上架所需字数（默认 200000） */
  launchWordCount: number
  /** 是否已签约 */
  signed: boolean
  /** 追读率 (0-1) */
  readerRetention: number
  /** 月票数 */
  monthlyTickets: number
  /** 连续更新天数（用于全勤奖） */
  consecutiveDailyUpdates: number
  /** 最后更新日期 */
  lastUpdatedDay: number
  /** 累计章节数 */
  totalChapters: number
  /** 读者情绪 (-100 ~ 100，负数会掉追读) */
  readerMood: number
  /** 本日已写字数（每日结算后归零，用于全勤奖判定） */
  dailyWordCount: number
}

/** 判断一个项目是否为网文项目 */
export function isWriterProject(p: CareerProject): p is WriterProject {
  return p.professionType === 'WRITER'
}

/** 网络作家动作定义 */
export interface WriterAction extends CareerActionDef {
  /** 写作策略类型 */
  strategy: WriterStrategy | 'META'
  /** 单次动作增加的字数 */
  wordCountAdd: number
  /** 对追读率的影响 */
  retentionDelta: number
  /** 对读者情绪的影响 */
  readerMoodDelta: number
  /** 是否计入日更/全勤 */
  countsAsDailyUpdate: boolean
}

/** 写作策略配置 */
export interface WriterStrategyConfig {
  id: WriterStrategy
  name: string
  desc: string
  /** 章节读者反馈文案池 */
  readerComments: string[]
}

/* ============================================================
 * 灵感与作者梗系统（跨作品叙事遗产）
 * ============================================================ */

/** 作者等级：新人 / 签约 / 精品 / 大神 / 白金 */
export type AuthorRank =
  | 'COLT' // 新人
  | 'SIGNED' // 签约
  | 'BOUTIQUE' // 精品
  | 'GREAT_GOD' // 大神
  | 'PLATINUM' // 白金

/** 写作灵感（从现实生活事件中萃取的素材） */
export interface WritingInspiration {
  id: string
  name: string
  description: string
  /** 来源说明，例如：兼职外卖员时获得 */
  source: string
  /** 对三维的加成 */
  statBonus: {
    quality?: number
    commerciality?: number
    memeValue?: number
  }
  /** 特殊标签，用于触发专属读者评论或后续事件 */
  specialTag?: string
}

/** 梗/名场面的读者口碑类型 */
export type MemeReputation = 'LEGEND' | 'INFAMOUS' | 'FUNNY'

/** 作者梗（跨作品可用的名场面遗产） */
export interface AuthorMeme {
  id: string
  name: string
  /** 诞生于哪本书 */
  originBookTitle: string
  /** 读者口碑 */
  reputation: MemeReputation
  /** 累计使用次数（用多了读者会审美疲劳） */
  usageCount: number
  /** 最后一次使用是在第几天 */
  lastUsedDay?: number
}

/** 注入灵感后的动作结果扩展 */
export interface InspirationApplyResult {
  /** 更新后的项目 */
  project: WriterProject
  /** 已被消耗的灵感 id */
  consumedInspirationId: string
  /** 专属读者评论 */
  readerComments: string[]
  /** 额外热度加成 */
  extraHype: number
}

/** 造梗结果 */
export interface MemeGenerateResult {
  meme: AuthorMeme | null
  log: string
}
