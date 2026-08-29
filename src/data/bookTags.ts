import type { BookTag, MainGenre } from '../types/career'

export const BOOK_TAGS: BookTag[] = [
  {
    id: 'system',
    name: '系统',
    riskFactor: 15,
    memePotential: 50,
    commercialityModifier: 1.2,
    complexityAdd: 10,
    description: '金手指系统，商业化的保险栓。',
  },
  {
    id: 'daily',
    name: '日常',
    riskFactor: 5,
    memePotential: 30,
    commercialityModifier: 0.95,
    complexityAdd: 5,
    description: '慢节奏生活流，稳但难爆。',
  },
  {
    id: 'school',
    name: '学霸/校园',
    riskFactor: 25,
    memePotential: 50,
    commercialityModifier: 1.05,
    complexityAdd: 15,
    description: '考试、科研、青春，有固定受众。',
  },
  {
    id: 'war',
    name: '战争',
    riskFactor: 40,
    memePotential: 50,
    commercialityModifier: 1.0,
    complexityAdd: 25,
    description: '大场面与权谋，质量要求高。',
  },
  {
    id: 'cyberpunk',
    name: '赛博朋克',
    riskFactor: 60,
    memePotential: 85,
    commercialityModifier: 0.85,
    complexityAdd: 25,
    compatibleGenres: ['SCI_FI', 'URBAN', 'XUANHUAN'],
    description: '高科技+低生活，视觉与概念冲击力极强。',
  },
  {
    id: 'cthulhu',
    name: '克苏鲁',
    riskFactor: 85,
    memePotential: 95,
    commercialityModifier: 0.7,
    complexityAdd: 30,
    synergyPenalty: [
      { tagId: 'daily', penalty: 20 },
      { tagId: 'pure_love', penalty: 15 },
    ],
    description: '不可名状+疯狂，小众但爆点上限极高。',
  },
  {
    id: 'kuso',
    name: '恶搞/无厘头',
    riskFactor: 70,
    memePotential: 90,
    commercialityModifier: 0.8,
    complexityAdd: 20,
    synergyPenalty: [
      { tagId: 'black_humor', penalty: 10 },
    ],
    description: '梗密度拉满，容易出圈也容易审美疲劳。',
  },
  {
    id: 'reverse_plot',
    name: '全员迪化',
    riskFactor: 55,
    memePotential: 88,
    commercialityModifier: 1.05,
    complexityAdd: 20,
    description: '主角没想那么多，全世界都在脑补。',
  },
  {
    id: 'pure_love',
    name: '纯爱',
    riskFactor: 20,
    memePotential: 55,
    commercialityModifier: 1.0,
    complexityAdd: 10,
    synergyPenalty: [
      { tagId: 'war', penalty: 12 },
      { tagId: 'black_humor', penalty: 10 },
    ],
    description: '情感主线，虐或甜都能抓人。',
  },
  {
    id: 'workplace',
    name: '职场',
    riskFactor: 30,
    memePotential: 50,
    commercialityModifier: 1.0,
    complexityAdd: 15,
    description: '社畜共鸣，现实主义叙事。',
  },
  {
    id: 'survival',
    name: '求生',
    riskFactor: 35,
    memePotential: 60,
    commercialityModifier: 1.0,
    complexityAdd: 20,
    description: '末日、荒野、规则怪谈，紧张感驱动追读。',
  },
  {
    id: 'black_humor',
    name: '黑色幽默',
    riskFactor: 50,
    memePotential: 80,
    commercialityModifier: 0.85,
    complexityAdd: 20,
    description: '笑着笑着就哭了，容易引发深度讨论。',
  },
]

export const BOOK_TAG_BY_ID: Record<string, BookTag> = BOOK_TAGS.reduce(
  (acc, t) => {
    acc[t.id] = t
    return acc
  },
  {} as Record<string, BookTag>,
)

/** 获取标签与题材的兼容性，用于 UI 灰显/提示 */
export function isTagCompatibleWithGenre(tag: BookTag, genre: MainGenre): boolean {
  if (!tag.compatibleGenres || tag.compatibleGenres.length === 0) return true
  return tag.compatibleGenres.includes(genre)
}
