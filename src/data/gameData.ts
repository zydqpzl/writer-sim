import type { ActionDef, GameState, PlayerLocation, TimeSlot } from '../types/game'

/** 总天数 */
export const TOTAL_DAYS = 60

/** 时段顺序与展示信息 */
export const TIME_SLOTS: { key: TimeSlot; label: string; icon: string }[] = [
  { key: 'morning', label: '上午', icon: '☀️' },
  { key: 'afternoon', label: '下午', icon: '🌤️' },
  { key: 'evening', label: '晚上', icon: '🌙' },
]

/** 时段 -> 下一时段映射 */
export const NEXT_SLOT: Record<TimeSlot, TimeSlot | 'next-day'> = {
  morning: 'afternoon',
  afternoon: 'evening',
  evening: 'next-day',
}

/* ============== CK3 式三维状态阈值 ============== */

/** 健康状态阈值（派生 healthStatus） */
export const HEALTH_THRESHOLDS = {
  EXCELLENT: 80, // 80-100 健步如飞
  SUB_HEALTH: 50, // 50-79 亚健康
  SICK: 20, // 20-49 虚弱/抱病（禁用高强度体力兼职）
  // 0-19 危急重病（强制住院）
} as const

/** 压力等级阈值（派生 stressLevel，CK3 风格 0-3 级） */
export const STRESS_THRESHOLDS = {
  /** 0-99 正常 */
  LEVEL_1: 100, // 100-199 轻度焦虑
  LEVEL_2: 200, // 200-299 职业倦怠（30% 概率摆烂）
  LEVEL_3: 300, // 300 精神崩溃（强制应对事件）
} as const
/** 压力上限 */
export const STRESS_MAX = 300

/* ============== 兼职系统参数（两层） ============== */

/**
 * 存款警戒线：低于此值时 UI 高亮警示（不再硬性锁定兼职）。
 * 兼职解禁——任何时候都可选择，由精力/压力/健康自然限制。
 */
export const PART_TIME_WARNING_LINE = 1500
/** 应急保命兼职：固定消耗精力、获得存款 */
export const EMERGENCY_PART_TIME_INCOME = 180
export const EMERGENCY_PART_TIME_ENERGY = -40
/** 应急保命兼职增加的压力（体力劳动升压） */
export const EMERGENCY_PART_TIME_STRESS = 20
/** 触发"现实的铁拳"的连续兼职天数阈值 */
export const REALITY_PUNCH_THRESHOLD = 5

/* ============== 地点与房租参数 ============== */

/** 大城市每日房租/生活费 */
export const CITY_RENT = 80
/** 回老家后无房租 */
export const HOMETOWN_RENT = 0
/** 回老家后每日家庭碎碎念压力 */
export const HOMETOWN_DAILY_STRESS = 5
/** 回老家后县城帮工收入 */
export const HOMETOWN_PART_TIME_INCOME = 50
/** 回老家后县城帮工精力消耗 */
export const HOMETOWN_PART_TIME_ENERGY = -30
/** 回老家后县城帮工压力 */
export const HOMETOWN_PART_TIME_STRESS = 10

/* ============== 创作转化赌博参数 ============== */
/** 放入灵感卡牌时触发"大爆特爆"的概率（其余为平平无奇） */
export const CREATION_VIRAL_RATE = 0.3
/** 大爆特爆时的流量收益加成（元） */
export const VIRAL_BONUS_SAVINGS = 200

/* ============== 限时奇遇刷新机制 ============== */
/** 每日结算时刷出限时奇遇的概率 */
export const ENCOUNTER_SPAWN_RATE = 0.4
/** 候选奇遇事件链 id 列表（每日随机抽取一个） */
export const ENCOUNTER_CHAIN_IDS: string[] = ['boardgame_dm', 'family_new_year']

/** 初始游戏状态 */
export const INITIAL_STATE: GameState = {
  day: 1,
  slot: 'morning',
  location: 'city',
  actedThisSlot: false,
  partTimeLock: false,
  workedToday: false,
  consecutivePartTimeDays: 0,
  realityPunchTriggered: false,
  availableEncounter: null,
  inventory: [],
  activeTraits: [],
  pathScores: {
    BIG_CITY_CREATOR: 0,
    HOMETOWN_KOL: 0,
    SUBCULTURE_GURU: 0,
    REALITY_COMPROMISE: 0,
    BALANCED: 0,
  },
  subcultureReputation: 0,
  examProgress: 0,
  careerProjects: [],
  inspirations: [],
  unlockedMemes: [],
  authorRank: 'COLT',
  platformEcosystem: {
    npcs: [],
    leaderboards: [],
    rumors: [],
    interactions: [],
    memeTrends: [],
  },
  stats: {
    savings: 8000,
    health: 80,
    energy: 75,
    // 反向映射自原 mood=70：毕业两个月没着落，落在轻度焦虑边缘
    stress: 130,
    familyApproval: 65,
    influence: 5,
    fans: 12,
  },
}

/** 主行动定义（不含兼职） */
export const ACTIONS: ActionDef[] = [
  {
    type: 'work',
    label: '灵感创作',
    desc: '消耗一张灵感卡牌，进行 70/30 的赌博式创作，不占用连载项目。',
    icon: '✨',
    accent: 'brand',
    effects: {
      savings: 0,
      health: -4,
      energy: -18,
      stress: 2, // 创作消耗心智，小幅升压
      influence: 3,
      fans: 5,
    },
  },
  {
    type: 'social',
    label: '运营社交媒体',
    desc: '涨粉、回应评论，应对黑粉，提升影响力与心态波动。',
    icon: '📱',
    accent: 'emerald',
    effects: {
      energy: -8,
      stress: 3, // 社媒互动易焦虑，小幅升压
      influence: 2,
      fans: 18,
    },
  },
  {
    type: 'family',
    label: '敷衍 / 沟通父母',
    desc: '汇报近况，稳住父母满意度，但会消耗心态与精力。',
    icon: '🏠',
    accent: 'amber',
    effects: {
      energy: -5,
      stress: 4, // 父母催问升压
      familyApproval: 12,
    },
  },
  {
    type: 'rest',
    label: '摆烂 / 休息',
    desc: '恢复健康与压力，但消耗房租与伙食费。',
    icon: '🛌',
    accent: 'rose',
    effects: {
      savings: -50,
      health: 10,
      energy: 28,
      stress: -12, // 休息降压
    },
  },
]

/** 应急保命兼职：极简确定性，无事件链，不掉落卡牌 */
export const EMERGENCY_ACTION: ActionDef = {
  type: 'parttime',
  label: '跑外卖 · 保命兼职',
  desc: '40 精力换 180 元，稳赚不赔，但当天无法创作。健康虚弱时不可从事。',
  icon: '🛵',
  accent: 'orange',
  location: 'city',
  effects: {
    savings: 180,
    energy: -40,
    stress: 20, // 体力劳动升压
  },
}

/** 亚文化奇遇兼职：触发事件链，掉落灵感卡牌 */
export const SUBCULTURE_ACTION: ActionDef = {
  type: 'subculture',
  label: '桌游店 DM · 奇遇兼职',
  desc: '触发 3 阶段事件链，分支选择掉落灵感卡牌。占用今日精力，当天无法创作。',
  icon: '🎲',
  accent: 'violet',
  location: 'city',
  effects: {},
}

/** 县城老家帮工：低收益低压力，回老家后替代外卖兼职 */
export const HOMETOWN_PART_TIME_ACTION: ActionDef = {
  type: 'hometown_parttime',
  label: '县城帮工 · 老家零工',
  desc: '帮邻居看店、跟老爸出摊、给亲戚孩子补课。收益低但压力也低。',
  icon: '🏘️',
  accent: 'amber',
  location: 'hometown',
  effects: {
    savings: HOMETOWN_PART_TIME_INCOME,
    energy: HOMETOWN_PART_TIME_ENERGY,
    stress: HOMETOWN_PART_TIME_STRESS,
  },
}

/** 根据当前地点返回对应的应急兼职行动 */
export function getEmergencyAction(location: PlayerLocation): ActionDef {
  return location === 'hometown' ? HOMETOWN_PART_TIME_ACTION : EMERGENCY_ACTION
}
