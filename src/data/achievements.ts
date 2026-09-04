import type { GameAchievement } from '../types/achievement'
import type { CareerProject, WriterProject } from '../types/career'
import type { GameState } from '../types/game'
import { isWriterProject } from '../types/career'

/** 慢热/日常向标签 id */
const SLOW_HEAT_TAG_IDS = new Set(['daily', 'steady_cultivation'])

/** 默认本名，用于判定是否启用马甲 */
const DEFAULT_REAL_NAME = '咸鱼作者'

/** 成就图鉴：按推荐解锁顺序排列 */
export const ACHIEVEMENTS: GameAchievement[] = [
  {
    id: 'first_sign',
    title: '【签约成功】',
    description: '你的作品第一次被平台签下，迈出了职业化写作的第一步。',
    icon: '🖊️',
    hint: '成功签约任意一本网络小说。',
    metaBonus: '下一局初始【掌控力】+3',
    metaBonusValue: { startingSkillDelta: { control: 3 } },
  },
  {
    id: 'first_complete',
    title: '【完本大佬】',
    description: '你第一次把一本书老老实实写到完结，没有太监。',
    icon: '📚',
    hint: '成功完结任意一本网络小说。',
    metaBonus: '下一局初始【结构力】+3',
    metaBonusValue: { startingSkillDelta: { structure: 3 } },
  },
  {
    id: 'first_abandon',
    title: '【太监也是一种习惯】',
    description: '你第一次选择切书/太监。读者在评论区留下了意味深长的省略号。',
    icon: '✂️',
    hint: '首次手动太监一本书。',
  },
  {
    id: 'eunuch_king',
    title: '【太监宫总管】',
    description: '累计太监 3 本书。你的书友群已默认在新书 5 万字时开始下注。',
    icon: '👑',
    hint: '累计太监 3 本书。',
  },
  {
    id: 'alt_pen_name',
    title: '【换个马甲你就不认识我了？】',
    description: '你用新的笔名创建作品并成功签约，旧日的黑历史仿佛不存在。',
    icon: '🎭',
    hint: '使用与本名不同的笔名签约作品。',
    metaBonus: '下一局开局额外携带一张「灵感卡牌」',
    metaBonusValue: { startingCards: ['card_ooc_god'] },
  },
  {
    id: 'touch_demon',
    title: '【触手怪降临】',
    description: '单日码字量突破 30,000 字。键盘上真的有火花迸出来。',
    icon: '⌨️',
    hint: '单日码字超过 3 万字。',
    metaBonus: '下一局初始精力上限 +5',
    metaBonusValue: { startingEnergyMaxDelta: 5 },
  },
  {
    id: 'million_words',
    title: '【百万字长征】',
    description: '累计写作字数突破 100 万。你已经在网文界留下了一座小山。',
    icon: '🏔️',
    hint: '所有作品累计字数达到 100 万。',
    metaBonus: '下一局初始【文笔】+3',
    metaBonusValue: { startingSkillDelta: { prose: 3 } },
  },
  {
    id: 'slow_heat_breakout',
    title: '【自来水破圈】',
    description: '一本慢热书在不被看好的情况下突然触发破圈爆发，口碑逆袭。',
    icon: '🌊',
    hint: '让一本带有日常/稳健流标签的书触发黑马爆款。',
    metaBonus: '下一局初始【节奏感】+3',
    metaBonusValue: { startingSkillDelta: { pacing: 3 } },
  },
  {
    id: 'yellow_robe',
    title: '【黄袍加身】',
    description: '因为稿费不够糊口，你不得不骑上电动车，黄袍加身。',
    icon: '🛵',
    hint: '在职业生涯中选择一次跑外卖兼职。',
  },
  {
    id: 'civil_servant',
    title: '【金榜题名】',
    description: '你考编/求职进度达到 100，手握铁饭碗，江湖再见。',
    icon: '📜',
    hint: '考公/求职进度达到 100。',
    metaBonus: '下一局初始父母满意度 +10',
    metaBonusValue: { startingFamilyApprovalDelta: 10 },
  },
  {
    id: 'bankrupt',
    title: '【弹尽粮绝】',
    description: '存款归零，自由职业的残酷一面彻底展现在你面前。',
    icon: '💸',
    hint: '存款首次跌破 0。',
  },
  {
    id: 'rent_to_villa',
    title: '【从握手楼到江景院】',
    description: '你租下了江景创作者独栋，终于摆脱了城中村的隔音噩梦。',
    icon: '🏡',
    hint: '升级到最高档住房「江景创作者独栋」。',
    metaBonus: '下一局初始压力上限 +10',
    metaBonusValue: { startingStressMaxDelta: 10 },
  },
  {
    id: 'hundred_k',
    title: '【十万订阅】',
    description: '粉丝数突破 10 万。你已经能靠这本书养活自己。',
    icon: '📈',
    hint: '粉丝数达到 10 万。',
    metaBonus: '下一局初始存款 +1000',
    metaBonusValue: { startingSavingsDelta: 1000 },
  },
  {
    id: 'big_v',
    title: '【百万大 V】',
    description: '粉丝数突破 100 万。你站在了大城市创作者金字塔的顶端。',
    icon: '🔥',
    hint: '粉丝数达到 100 万。',
    metaBonus: '下一局初始存款 +3000',
    metaBonusValue: { startingSavingsDelta: 3000 },
  },
]

/** 按 id 索引成就 */
export const ACHIEVEMENT_BY_ID: Record<string, GameAchievement> = ACHIEVEMENTS.reduce(
  (acc, a) => {
    acc[a.id] = a
    return acc
  },
  {} as Record<string, GameAchievement>,
)

/** 提取所有网文项目 */
function getWriterProjects(projects: CareerProject[]): WriterProject[] {
  return projects.filter(isWriterProject)
}

/** 计算所有网文项目累计字数 */
function getTotalWordCount(projects: CareerProject[]): number {
  return getWriterProjects(projects).reduce((sum, p) => sum + (p.wordCount ?? 0), 0)
}

/** 计算历史出现过的不同笔名（含当前项目） */
function getUsedPenNames(state: GameState): Set<string> {
  const names = new Set<string>()
  getWriterProjects(state.careerProjects).forEach((p) => {
    if (p.penName) names.add(p.penName)
  })
  return names
}

/**
 * 检查并返回本局新解锁的成就 id 列表。
 * @param state 当前游戏状态
 * @param alreadyUnlocked 已解锁成就 id（跨局）
 */
export function checkNewAchievements(
  state: GameState,
  alreadyUnlocked: Set<string>,
): string[] {
  const unlocked: string[] = []

  const grantIf = (id: string, condition: boolean) => {
    if (condition && !alreadyUnlocked.has(id) && !state.newUnlockedAchievementIds.includes(id)) {
      unlocked.push(id)
    }
  }

  const writerProjects = getWriterProjects(state.careerProjects)
  const totalWords = getTotalWordCount(state.careerProjects)
  const maxDailyWords = writerProjects.reduce(
    (max, p) => Math.max(max, p.dailyWordCount ?? 0),
    0,
  )
  const signedProjects = writerProjects.filter((p) => p.signed)
  const penNames = getUsedPenNames(state)

  grantIf('first_sign', signedProjects.length >= 1)
  grantIf('first_complete', state.writerCareerProfile.totalCompletedBooks >= 1)
  grantIf('first_abandon', state.writerCareerProfile.totalAbandonedBooks >= 1)
  grantIf('eunuch_king', state.writerCareerProfile.totalAbandonedBooks >= 3)
  grantIf(
    'alt_pen_name',
    signedProjects.some((p) => p.penName && p.penName !== DEFAULT_REAL_NAME),
  )
  grantIf('touch_demon', maxDailyWords >= 30_000)
  grantIf('million_words', totalWords >= 1_000_000)
  grantIf(
    'slow_heat_breakout',
    writerProjects.some(
      (p) =>
        p.blackHorseTriggered &&
        p.tags.some((t) => SLOW_HEAT_TAG_IDS.has(t)),
    ),
  )
  grantIf('yellow_robe', (state.totalPartTimeDays ?? 0) >= 1)
  grantIf('civil_servant', state.examProgress >= 100)
  grantIf('bankrupt', state.stats.savings < 0)
  grantIf('rent_to_villa', state.housingId === 'housing_villa')
  grantIf('hundred_k', state.stats.fans >= 100_000)
  grantIf('big_v', state.stats.fans >= 1_000_000)

  return unlocked
}

/**
 * 汇总元加成效果（用于开局时应用）。
 */
export function aggregateMetaBonuses(unlockedIds: string[]) {
  const bonus = {
    startingSavingsDelta: 0,
    startingEnergyMaxDelta: 0,
    startingStressMaxDelta: 0,
    startingFamilyApprovalDelta: 0,
    startingSkillDelta: {} as Record<string, number>,
    startingCards: [] as string[],
  }

  for (const id of unlockedIds) {
    const ach = ACHIEVEMENT_BY_ID[id]
    if (!ach?.metaBonusValue) continue

    if (ach.metaBonusValue.startingSavingsDelta) {
      bonus.startingSavingsDelta += ach.metaBonusValue.startingSavingsDelta
    }
    if (ach.metaBonusValue.startingEnergyMaxDelta) {
      bonus.startingEnergyMaxDelta += ach.metaBonusValue.startingEnergyMaxDelta
    }
    if (ach.metaBonusValue.startingStressMaxDelta) {
      bonus.startingStressMaxDelta += ach.metaBonusValue.startingStressMaxDelta
    }
    if (ach.metaBonusValue.startingFamilyApprovalDelta) {
      bonus.startingFamilyApprovalDelta += ach.metaBonusValue.startingFamilyApprovalDelta
    }
    if (ach.metaBonusValue.startingSkillDelta) {
      for (const [k, v] of Object.entries(ach.metaBonusValue.startingSkillDelta)) {
        bonus.startingSkillDelta[k] = (bonus.startingSkillDelta[k] ?? 0) + (v ?? 0)
      }
    }
    if (ach.metaBonusValue.startingCards) {
      bonus.startingCards.push(...ach.metaBonusValue.startingCards)
    }
  }

  return bonus
}
