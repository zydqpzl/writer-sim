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
    metaBonus: '下一局初始【结构力】+3',
    metaBonusValue: { startingSkillDelta: { structure: 3 } },
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

  // ===== 评测偏差成就 =====
  {
    id: 'forecast_overtime',
    title: '【评测组加班】',
    description: '单本实绩 ≥ 开书乐观预估 × 1.5。开书面板那三个数，建议当天气看。',
    icon: '📊',
    hint: '让一本书的实绩飞出乐观预估带 50% 以上。',
  },
  {
    id: 'i_am_the_variable',
    title: '【我是变量】',
    description: '单局累计 3 本书飞出预估带（上或下都算）。模型里没你这个人。',
    icon: '🎲',
    hint: '单局内 3 本书实绩落在预估带外。',
    metaBonus: '下一局隐藏运气微幅 +',
    metaBonusValue: { startingSkillDelta: { marketInsight: 2 } },
  },
  {
    id: 'should_not_fire',
    title: '【这本不该火】',
    description: 'executionGap ≥ 25 的硬开超纲书，却签约且实绩 > 中位预估。读者不读公式。',
    icon: '🐉',
    hint: '高难度硬开的书最终超过中位预估。',
    metaBonus: '下一局该题材掌握度开局 +2',
    metaBonusValue: { startingSkillDelta: { structure: 2 } },
  },
  {
    id: 'bronze_king',
    title: '【青铜面板，王者结算】',
    description: '开书中位预估偏低，结书进入当月前 10%。系统给 underestimated 这个词加了注释。',
    icon: '🥉',
    hint: '低预估书最终进入头部 10%。',
  },
  {
    id: 'illegal_breakthrough',
    title: '【开窍速度违规】',
    description: '单本内主题材掌握度 +≥12，且实绩 > 开书乐观预估。学习曲线被你踩断了。',
    icon: '💡',
    hint: '一本书连载期间掌握度大幅跃升并飞出乐观带。',
    metaBonus: '下一局读书/查资料收益 +10%',
    metaBonusValue: { startingSkillDelta: { marketInsight: 2, prose: 1 } },
  },
  {
    id: 'stable_jpg',
    title: '【稳了.jpg】',
    description: '开书乐观预估进入爆款档，最终太监或实绩 < 保守预估。乐观预估 100 不是承诺函。',
    icon: '📉',
    hint: '高预估书最终崩盘或太监。',
  },
  {
    id: 'theory_rich',
    title: '【理论很丰满】',
    description: 'authorControl 高于复杂度 ≥ 15，仍扑街/太监。掌握度很好，成绩很差。',
    icon: '🧪',
    hint: '舒适区硬实力碾压却最终扑街。',
  },
  {
    id: 'full_gear_white_ending',
    title: '【满配开局，白板结局】',
    description: '舒适区 + 系统/爽文（客观不难），中途崩盘。三个标签不该难，人可以自己难。',
    icon: '⚪',
    hint: '低难度舒适区书最终崩盘。',
  },
  {
    id: 'editor_was_wrong',
    title: '【编辑看走眼】',
    description: '系统判定过审概率低却签约，或稳过被卡后仍靠别的路活下来。审稿也是随机变量。',
    icon: '👓',
    hint: '签约结果与系统预判相反。',
  },
  {
    id: 'black_red_is_red',
    title: '【黑红也是红】',
    description: '因负面事件流量暴涨，成绩 > 乐观预估，但名声另计。公式只算点击，不算体面。',
    icon: '🎭',
    hint: '靠黑红争议飞出乐观预估带。',
    metaBonus: '下一局黑粉回响（有代价）',
    metaBonusValue: { startingSkillDelta: { marketInsight: 3 } },
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

  // ===== 评测偏差成就判定 =====
  const finishedProjects = writerProjects.filter(
    (p) => (p.stage === 'COMPLETED' || p.stage === 'ABANDONED') && p.performanceForecast,
  )

  grantIf(
    'forecast_overtime',
    finishedProjects.some(
      (p) =>
        p.actualPerformance !== undefined &&
        p.actualPerformance >= p.performanceForecast!.optimistic * 1.5,
    ),
  )

  grantIf(
    'i_am_the_variable',
    finishedProjects.filter((p) => p.forecastDeviation?.outcome !== 'within').length >= 3,
  )

  grantIf(
    'should_not_fire',
    finishedProjects.some(
      (p) =>
        p.performanceForecast!.executionGap >= 25 &&
        p.signed &&
        (p.actualPerformance ?? 0) > p.performanceForecast!.median,
    ),
  )

  grantIf(
    'bronze_king',
    finishedProjects.some(
      (p) =>
        p.performanceForecast!.median <= 50 &&
        (p.actualPerformance ?? 0) >= 80,
    ),
  )

  grantIf(
    'illegal_breakthrough',
    finishedProjects.some(
      (p) =>
        p.forecastInvalidated &&
        (p.actualPerformance ?? 0) > p.performanceForecast!.optimistic,
    ),
  )

  grantIf(
    'stable_jpg',
    finishedProjects.some(
      (p) =>
        p.performanceForecast!.optimistic >= 80 &&
        (p.stage === 'ABANDONED' ||
          (p.actualPerformance ?? 0) < p.performanceForecast!.conservative),
    ),
  )

  grantIf(
    'theory_rich',
    finishedProjects.some(
      (p) =>
        p.performanceForecast!.initialExecution >= p.complexity.score + 15 &&
        (p.stage === 'ABANDONED' ||
          (p.actualPerformance ?? 0) < p.performanceForecast!.conservative),
    ),
  )

  grantIf(
    'full_gear_white_ending',
    finishedProjects.some(
      (p) =>
        p.performanceForecast!.executionGap <= 10 &&
        p.tags.some((t) => t === 'system' || t === 'cool_story') &&
        (p.stage === 'ABANDONED' ||
          (p.actualPerformance ?? 0) < p.performanceForecast!.conservative),
    ),
  )

  grantIf(
    'editor_was_wrong',
    writerProjects.some(
      (p) =>
        p.performanceForecast &&
        ((p.performanceForecast.baselineScore < 50 && p.signed) ||
          (p.performanceForecast.baselineScore >= 70 && !p.signed && p.wordCount >= 50_000)),
    ),
  )

  grantIf(
    'black_red_is_red',
    finishedProjects.some(
      (p) =>
        (p.accidentShock ?? 0) < -0.1 &&
        (p.actualPerformance ?? 0) > p.performanceForecast!.optimistic,
    ),
  )

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
        const delta = typeof v === 'number' ? v : 0
        bonus.startingSkillDelta[k] = (bonus.startingSkillDelta[k] ?? 0) + delta
      }
    }
    if (ach.metaBonusValue.startingCards) {
      bonus.startingCards.push(...ach.metaBonusValue.startingCards)
    }
  }

  return bonus
}
