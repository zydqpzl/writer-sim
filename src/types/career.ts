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
  /** 作家职业专属：更新后的作者档案 */
  authorProfile?: AuthorProfile
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

/** 主题材：决定作品基础调性 */
export type MainGenre =
  | 'XUANHUAN' // 玄幻
  | 'URBAN' // 都市
  | 'SCI_FI' // 科幻
  | 'SUSPENSE' // 悬疑
  | 'GAME' // 游戏
  | 'HISTORY' // 历史

/** 主题材配置 */
export interface GenreConfig {
  id: MainGenre
  name: string
  /** 基础商业化倾向 0-100 */
  baseCommerciality: number
  /** 基础爆点潜力 0-100 */
  baseMemePotential: number
  /** 质量权重加成（影响算法分） */
  qualityWeight: number
  description: string
}

/** 作品标签：跨题材的元素/风格 */
export interface BookTag {
  id: string
  name: string
  /** 风险/小众指数 0-100；越高越难赚钱，但黑马上限越高 */
  riskFactor: number
  /** 爆点潜力加成 0-100 */
  memePotential: number
  /** 商业化修正系数（乘算） */
  commercialityModifier: number
  /** 兼容题材（空数组表示全题材） */
  compatibleGenres?: MainGenre[]
}

/** 核心噱头/卖点 */
export interface Gimmick {
  id: string
  name: string
  description: string
  /** 风险指数 */
  riskFactor: number
  /** 爆点潜力加成 */
  memePotential: number
  /** 商业化修正系数 */
  commercialityModifier: number
  /** 质量修正系数 */
  qualityModifier: number
}

/** 市场流行趋势：活的流行风向 */
export interface MarketTrend {
  id: string
  name: string
  /** 当前热门题材 */
  hotGenres: MainGenre[]
  /** 当前热门标签 id */
  hotTags: string[]
  /** 当前热门噱头 id */
  hotGimmicks: string[]
  /** 剩余持续天数 */
  decayDays: number
  /** 各 tag 被跟风使用的次数（用于饱和度计算） */
  saturation: Record<string, number>
}

/** 复杂度等级 */
export type ComplexityTier = 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'EPIC'

/** 复杂度评分结构 */
export interface NovelComplexity {
  /** 原始复杂度 0-100 */
  score: number
  /** 等级 */
  tier: ComplexityTier
  /** 分项来源（用于 UI 展示） */
  breakdown: {
    genre: number
    tags: number
    gimmick: number
    overlapPenalty: number
  }
}

/** 作品生长曲线类型 */
export type GrowthCurveType =
  | 'FAST_FOOD' // 快餐爆火：前期高热度，后期快速衰减
  | 'SLOW_BURN' // 慢热逆袭：前期平淡，后期指数爆发
  | 'NICHE_CULT' // 偏科死忠：流量中等但极度稳定
  | 'STEADY' // 稳健线性：稳定积累，无大起大落

/** 生长曲线配置 */
export interface GrowthCurveConfig {
  id: GrowthCurveType
  name: string
  description: string
  /** 前期热度系数（0-1） */
  earlyHypeMultiplier: number
  /** 后期热度系数（>1） */
  lateHypeMultiplier: number
  /** 热度衰减系数（越高衰减越快） */
  decayFactor: number
  /** 口碑积累效率（越高蓄力越快） */
  wordOfMouthEfficiency: number
  /** 爆发阈值（口碑池满 100 时触发） */
  breakthroughThreshold: number
}

/** 文风特质效果 */
export interface NovelStyleTrait {
  id: string
  name: string
  description: string
  /** 正面效果 */
  buff: {
    /** 死忠粉转化率加成倍率（1.0 = 无加成） */
    fanConversionBoost?: number
    /** 口碑积累速度加成倍率 */
    wordOfMouthBoost?: number
    /** 读者情绪自然恢复加成 */
    readerMoodRecovery?: number
    /** 完结后长尾收益加成 */
    longTailBoost?: number
    /** 慢热书质量阈值降低 */
    slowBurnQualityThreshold?: number
  }
  /** 负面效果 */
  debuff: {
    /** 初期留存率惩罚（绝对值，如 -0.30） */
    earlyRetentionPenalty?: number
    /** 商业化变现惩罚倍率（0.7 = 收益×0.7） */
    commercialityPenalty?: number
    /** 热度自然衰减加成 */
    hypeDecayBoost?: number
    /** 爆款爆发概率降低 */
    viralChancePenalty?: number
  }
  /** 觉醒条件（可选，用于涌现式触发） */
  unlockCondition?: {
    /** 连续使用某策略次数 */
    consecutiveStrategy?: WriterStrategy
    /** 最低字数 */
    minWordCount?: number
    /** 最低质量 */
    minQuality?: number
  }
}

/** 口碑发酵池 */
export interface WordOfMouthPool {
  /** 当前口碑积累 0-100 */
  current: number
  /** 是否已达到爆发阈值 */
  primed: boolean
  /** 已触发过的自来水事件次数 */
  breakthroughCount: number
  /** 最近一次爆发章节 */
  lastBreakthroughChapter?: number
  /** 读者安利文案池 */
  activeEvangelists: number
}

/** 单题材掌握度 */
export interface GenreMastery {
  genre: MainGenre
  /** 完本作品数 */
  completedCount: number
  /** 累计写作字数 */
  totalWordCount: number
  /** 题材熟练度 0-100，影响掌控力 */
  proficiency: number
}

/** 玩家网络作家生涯档案 */
export interface WriterCareerProfile {
  /** 各题材掌握度 */
  genreMastery: Record<MainGenre, GenreMastery>
  /** 已解锁文风特质（跨作品可用） */
  unlockedStyleTraits: string[]
  /** 历史完本数 */
  totalCompletedBooks: number
  /** 历史太监数 */
  totalAbandonedBooks: number
}

/** 掌控力校验结果 */
export interface ExecutionCheckResult {
  /** 掌控比 execution / complexity */
  ratio: number
  /** 失控等级 */
  tier: 'PERFECT' | 'SOLID' | 'SHAKY' | 'LOST'
  /** 对质量的实际影响倍率 */
  qualityMultiplier: number
  /** 对追读的实际影响 */
  retentionDelta: number
  /** 读者吐槽文本 */
  readerComment?: string
}

/** 新书立项数据包 */
export interface BookCreationDraft {
  penName: string
  title: string
  genre: MainGenre
  tags: string[]
  gimmick: string
  /** 是否命中“小众黑马”潜能（由系统根据风险/爆点判定） */
  isBlackHorseTarget: boolean
  /** 预设文风特质 id */
  styleTraits?: string[]
}

/** 网络作家项目 */
export interface WriterProject extends CareerProject {
  professionType: 'WRITER'
  /** 发书平台 */
  platformId: import('./platform').NovelPlatformId
  stage: WriterStage
  /** 笔名 */
  penName: string
  /** 主题材 */
  genre: MainGenre
  /** 融合标签 */
  tags: string[]
  /** 核心噱头 */
  gimmick: string
  /** 是否已触发过黑马爆款 */
  blackHorseTriggered: boolean
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

  /** 作品复杂度 */
  complexity: NovelComplexity
  /** 作者创作本书时的掌控力（快照） */
  executionCapacity: number
  /** 生长曲线 */
  growthCurve: GrowthCurveType
  /** 已激活文风特质 */
  activeStyleTraits: string[]
  /** 口碑发酵池 */
  wordOfMouth: WordOfMouthPool
  /** 伏笔蓄力进度 0-100 */
  foreshadowingCharge: number
  /** 距离下一章大高潮还差多少章 */
  chaptersToClimax: number
  /** 当前是否处于爆火状态 */
  isViralSurge: boolean
  /** 爆火剩余天数 */
  viralSurgeDays: number

  /** 创建本书时作者五维技能快照 */
  authorSkillSnapshot: AuthorSkills
  /** 创建本书时触发的履历化学反应快照 */
  backgroundBonuses: BackgroundBonus[]
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
 * 多维作者技能进化 & 履历背景矩阵
 * ============================================================ */

/** 作者进化阶段：远瞳式"肉眼可见的成长" */
export type AuthorEvolutionStage =
  | 'NEWBIE' // 萌新期：第一本书，结构力弱
  | 'RISING_STAR' // 上升期：开始找到自己的节奏
  | 'MASTER' // 成熟期：能驾驭长篇与世界观
  | 'LEGEND' // 传奇期：大神/白金，形成独特文风

/** 作者五维核心能力（0-100） */
export interface AuthorSkills {
  /** 文笔力：画面感、文采、情感描写 */
  prose: number
  /** 节奏感：黄金三章、高潮掌控、追读粘性 */
  pacing: number
  /** 结构力：伏笔回收、长篇世界观掌控 */
  structure: number
  /** 题材敏锐度：流行趋势、热点梗洞察 */
  marketInsight: number
  /** 专精领域知识：由职业/背景/经历积累 */
  domainKnowledge: Record<string, number>
}

/** 履历标签分类 */
export type BackgroundTagCategory =
  | 'EDUCATION' // 学业与专业背景
  | 'PROFESSION' // 职业与社会履历
  | 'FAMILY' // 家庭与出身
  | 'PAST_WRITING' // 创作马甲历史

/** 单一履历标签对特定题材的化学反应 */
export interface GenreSynergy {
  /** 匹配的题材 */
  targetGenre: MainGenre
  /** 质量加成倍率（如 0.25 = +25%） */
  qualityBonus: number
  /** 商业化加成倍率（如 0.15 = +15%） */
  commercialityBonus?: number
  /** 追读加成 */
  retentionBonus?: number
  /** 专属读者评论池 */
  uniqueReaderComments: string[]
  /** 触发时显示的化学反应名称 */
  synergyName: string
  /** 触发条件：需要相关专精领域知识达到多少 */
  requiredDomain?: { domain: string; min: number }
}

/** 身份与履历标签 */
export interface BackgroundTag {
  id: string
  name: string
  category: BackgroundTagCategory
  description: string
  /** 基础能力初始修正（可为负） */
  skillModifiers: Partial<AuthorSkills> & { domainKnowledge?: Record<string, number> }
  /** 题材匹配时的化学反应加成 */
  genreSynergies: GenreSynergy[]
  /** 全局效果：不绑定特定题材 */
  globalEffects?: {
    /** 初始粉丝基数 */
    startingFans?: number
    /** 追读率修正 */
    retentionModifier?: number
    /** 读者情绪起始修正 */
    readerMoodModifier?: number
    /** 隐患值起始修正 */
    initialControversy?: number
  }
}

/** 玩家作者档案 */
export interface AuthorProfile {
  penName: string
  skills: AuthorSkills
  /** 玩家拥有的身份履历（可随游戏人生不断丰富） */
  backgrounds: BackgroundTag[]
  evolutionStage: AuthorEvolutionStage
}

/** 创建项目时由履历触发的化学反应快照 */
export interface BackgroundBonus {
  backgroundId: string
  backgroundName: string
  synergyName: string
  qualityBonus: number
  commercialityBonus: number
  retentionBonus: number
  comment: string
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
