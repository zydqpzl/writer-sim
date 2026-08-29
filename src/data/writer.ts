// 网络作家（WRITER）职业数据配置

import type {
  BookCreationDraft,
  BookTag,
  MainGenre,
  MarketTrend,
  WriterAction,
  WriterStrategyConfig,
} from '../types/career'
import { BOOK_TAGS, isTagCompatibleWithGenre } from './bookTags'
import { GENRES } from './genres'
import { GIMMICKS } from './gimmicks'

/* ============== 核心数值参数 ============== */

/** 网文上架字数（默认 20 万字） */
export const WRITER_LAUNCH_WORD_COUNT = 200_000
/** 试水签约门槛字数（约 3-5 万字） */
export const WRITER_SIGNING_THRESHOLD_WORDS = 30_000
/** 全勤奖要求日更字数 */
export const WRITER_FULL_ATTENDANCE_DAILY_WORDS = 4_000
/** 全勤奖金额（元/月，按 30 天折算为每日） */
export const WRITER_FULL_ATTENDANCE_MONTHLY_REWARD = 1_500
export const WRITER_FULL_ATTENDANCE_DAILY_REWARD = Math.round(
  WRITER_FULL_ATTENDANCE_MONTHLY_REWARD / 30,
)
/** 每 1000 次有效阅读带来的订阅收益（元） */
export const WRITER_REVENUE_PER_1K_READS = 0.5
/** 每日热度基础值 */
export const WRITER_BASE_HYPE = 100
/** 市场随机波动范围 [min, max] */
export const WRITER_MARKET_RNG_RANGE: [number, number] = [0.8, 1.2]
/** 默认热度衰减率 */
export const WRITER_DEFAULT_HYPE_DECAY = 0.08
/** 完结作品余热收益系数（相对连载期） */
export const WRITER_COMPLETED_PASSIVE_RATIO = 0.05
/** 太监作品负面：追读率归零，信誉/心态惩罚 */
export const WRITER_ABANDON_RETENTION_PENALTY = -0.3

/* ============== 动态书名生成器 ============== */

const GOLD_FINGERS = [
  '带着AI系统',
  '能看到未来弹幕',
  '重回2008',
  '继承了邪神遗产',
  '获得每日签到系统',
  '觉醒码字机之魂',
  '下载了全网小说数据库',
  '被读者灌入了核动力',
]

const IDENTITIES = [
  '在异世界',
  '在废土重构区',
  '在横店当群演',
  '在桌游店做DM',
  '在一线大厂',
  '在县城老家',
  '在高考考场',
  '在赛博修仙界',
]

const ACTIONS = [
  '做全栈开发',
  '日更十万字',
  '被女帝逼婚',
  '逆袭成首富',
  '直播带货',
  '搞赛博修仙',
  '整顿职场',
  '靠吐槽封神',
]

function randomPick<T>(arr: T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)]
}

export function generateWriterTitle(
  draft?: BookCreationDraft,
  rng: () => number = Math.random,
): string {
  if (draft?.title) return draft.title
  const gf = randomPick(GOLD_FINGERS, rng)
  const id = randomPick(IDENTITIES, rng)
  const act = randomPick(ACTIONS, rng)
  return `${gf}${id}${act}`
}

/** 抽取与题材兼容的标签 */
function sampleCompatibleTags(
  genre: MainGenre,
  rng: () => number = Math.random,
  count: number = 2,
): string[] {
  const compatible = BOOK_TAGS.filter((t) => isTagCompatibleWithGenre(t, genre))
  const shuffled = [...compatible].sort(() => rng() - 0.5)
  return shuffled.slice(0, count).map((t) => t.id)
}

/** 随机生成一份新书方案 */
export function generateRandomDraft(
  rng: () => number = Math.random,
): BookCreationDraft {
  const genre = randomPick(GENRES, rng).id
  return {
    penName: '咸鱼作者',
    title: generateWriterTitle(undefined, rng),
    genre,
    tags: sampleCompatibleTags(genre, rng, 2),
    gimmick: randomPick(GIMMICKS, rng).id,
    isBlackHorseTarget: false,
  }
}

/** 根据当前市场趋势生成一份跟风方案 */
export function generateTrendFollowingDraft(
  trend: MarketTrend,
  rng: () => number = Math.random,
): BookCreationDraft {
  const genre = randomPick(trend.hotGenres, rng) ?? randomPick(GENRES, rng).id
  const tags: string[] = [...trend.hotTags]
  if (tags.length < 3) {
    const extra = sampleCompatibleTags(genre, rng, 3 - tags.length).filter(
      (t) => !tags.includes(t),
    )
    tags.push(...extra)
  }
  return {
    penName: '跟风作者',
    title: generateWriterTitle(undefined, rng),
    genre,
    tags: tags.slice(0, 3),
    gimmick: randomPick(trend.hotGimmicks, rng) ?? randomPick(GIMMICKS, rng).id,
    isBlackHorseTarget: false,
  }
}

/* ============== 写作策略配置（用于 UI 文案） ============== */

export const WRITER_STRATEGIES: WriterStrategyConfig[] = [
  {
    id: 'SETUP',
    name: '爆肝铺垫',
    desc: '牺牲短期追读，提升质量与口碑，为后续大高潮蓄力。',
    readerComments: [
      '这章信息量很大，但爽点不够啊……',
      '作者又在埋伏笔了，希望后面能爆。',
      '铺垫得不错，先养着，等爆发了再订阅。',
    ],
  },
  {
    id: 'CLIMAX',
    name: '爆更发糖/打脸',
    desc: '高消耗、高爆点、高收益，冲榜冲追读首选。',
    readerComments: [
      '卧槽，过年了！盟主打赏一个！',
      '这一巴掌等了三百章，爽！',
      '生产队的驴都没你勤快，月票投了！',
    ],
  },
  {
    id: 'FILLER',
    name: '老油条水字数',
    desc: '低消耗、稳日更，保全勤奖，但会小幅掉口碑。',
    readerComments: [
      '作者又在水日常了？打卡丢月票跑路。',
      '这几章感觉看了个寂寞……',
      '水归水，但好歹有更新，养着吧。',
    ],
  },
  {
    id: 'CLIFFHANGER',
    name: '悬念留钩子',
    desc: '断在关键处，拉高次日追读与订阅。',
    readerComments: [
      '？？？就断了？作者你没有心！',
      '刀片已经寄出，明天必须爆更！',
      '这钩子把我钓成翘嘴了，追了追了。',
    ],
  },
  {
    id: 'TROPE_INSERT',
    name: '跟风整活',
    desc: '蹭热点、玩梗，短期流量暴涨，老读者可能骂你毁设定。',
    readerComments: [
      '这个梗紧跟时事，作者冲浪强度可以。',
      '整活归整活，别把主线写崩了啊。',
      '老粉失望，感觉为了流量不要质量了。',
    ],
  },
]

/* ============== 写作动作定义 ============== */

export const WRITER_ACTIONS: WriterAction[] = [
  {
    id: 'writer_setup',
    name: '爆肝铺垫',
    description: '慢热铺垫，质量提升，短期追读平淡。',
    strategy: 'SETUP',
    phaseRequired: ['CONCEPT', 'DEVELOPING', 'LAUNCHED'],
    cost: { energy: -25, stress: 8 },
    effects: { progressAdd: 3, qualityAdd: 2, memeValueAdd: -1 },
    wordCountAdd: 3_000,
    retentionDelta: -0.02,
    readerMoodDelta: -2,
    countsAsDailyUpdate: true,
  },
  {
    id: 'writer_climax',
    name: '爆更发糖/打脸',
    description: '高爆发更新，追读与打赏暴涨，但身心消耗极大。',
    strategy: 'CLIMAX',
    phaseRequired: ['DEVELOPING', 'LAUNCHED'],
    cost: { energy: -40, stress: 18 },
    effects: { progressAdd: 10, qualityAdd: 1, commercialityAdd: 1, memeValueAdd: 3, hypeBoost: 15 },
    wordCountAdd: 10_000,
    retentionDelta: 0.08,
    readerMoodDelta: 15,
    countsAsDailyUpdate: true,
  },
  {
    id: 'writer_filler',
    name: '老油条水字数',
    description: '低消耗保日更，稳全勤奖，但会小幅掉追读与口碑。',
    strategy: 'FILLER',
    phaseRequired: ['DEVELOPING', 'LAUNCHED'],
    cost: { energy: -10, stress: -5 },
    effects: { progressAdd: 4, qualityAdd: -1, memeValueAdd: -1 },
    wordCountAdd: 4_000,
    retentionDelta: -0.03,
    readerMoodDelta: -5,
    countsAsDailyUpdate: true,
  },
  {
    id: 'writer_cliffhanger',
    name: '悬念留钩子',
    description: '断在高潮前，提升次日追读与订阅压力。',
    strategy: 'CLIFFHANGER',
    phaseRequired: ['DEVELOPING', 'LAUNCHED'],
    cost: { energy: -15, stress: 10 },
    effects: { progressAdd: 2.5, memeValueAdd: 2, hypeBoost: 8 },
    wordCountAdd: 2_500,
    retentionDelta: 0.05,
    readerMoodDelta: 3,
    countsAsDailyUpdate: true,
  },
  {
    id: 'writer_trope_insert',
    name: '跟风整活',
    description: '蹭热点玩梗，短期流量暴涨，老读者可能反感。',
    strategy: 'TROPE_INSERT',
    phaseRequired: ['DEVELOPING', 'LAUNCHED'],
    cost: { energy: -12, stress: 3 },
    effects: { progressAdd: 3, commercialityAdd: 1, memeValueAdd: 4 },
    wordCountAdd: 3_000,
    retentionDelta: 0.02,
    readerMoodDelta: -8,
    countsAsDailyUpdate: true,
  },
  // 元动作
  {
    id: 'writer_complete',
    name: '完结本书',
    description: '为作品画上句号，进入长尾余热阶段。',
    strategy: 'META',
    phaseRequired: 'LAUNCHED',
    cost: { energy: 0, stress: -10 },
    effects: {},
    wordCountAdd: 0,
    retentionDelta: 0,
    readerMoodDelta: 20,
    countsAsDailyUpdate: false,
  },
  {
    id: 'writer_abandon',
    name: '太监切书',
    description: '弃坑重开，损失读者信誉与心态。',
    strategy: 'META',
    phaseRequired: ['CONCEPT', 'DEVELOPING', 'LAUNCHED'],
    cost: { energy: 0, stress: -20 },
    effects: {},
    wordCountAdd: 0,
    retentionDelta: WRITER_ABANDON_RETENTION_PENALTY,
    readerMoodDelta: -50,
    countsAsDailyUpdate: false,
  },
  {
    id: 'writer_meme_homage',
    name: '致敬前作梗',
    description: '在新书里callback前作名场面，老粉狂喜但用多了会被骂炒冷饭。',
    strategy: 'META',
    phaseRequired: ['DEVELOPING', 'LAUNCHED'],
    cost: { energy: -15, stress: 5 },
    effects: {},
    wordCountAdd: 3_000,
    retentionDelta: 0,
    readerMoodDelta: 0,
    countsAsDailyUpdate: true,
  },
]

export const WRITER_ACTION_BY_ID: Record<string, WriterAction> =
  WRITER_ACTIONS.reduce((acc, a) => {
    acc[a.id] = a
    return acc
  }, {} as Record<string, WriterAction>)
