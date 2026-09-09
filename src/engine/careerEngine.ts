// CareerEngine：通用主业结算与发酵核心

import type {
  AuthorMeme,
  AuthorProfile,
  AuthorRank,
  AuthorSkills,
  BackgroundBonus,
  BackgroundTag,
  BookCreationDraft,
  CareerActionResult,
  CareerDailyResult,
  ComplexityTier,
  ExecutionCheckResult,
  GenreMastery,
  GrowthCurveType,
  InspirationApplyResult,
  MainGenre,
  MarketTrend,
  MemeGenerateResult,
  NovelComplexity,
  ProjectPhase,
  WordOfMouthPool,
  WriterAction,
  WriterCareerProfile,
  WriterProject,
  WriterStrategy,
} from '../types/career'
import { BOOK_TAG_BY_ID } from '../data/bookTags'
import {
  BACKGROUND_TAGS,
  BACKGROUND_TAG_BY_ID,
  DOMAIN_LABELS,
  findGenreSynergies,
} from '../data/backgrounds'
import { GENRE_BY_ID } from '../data/genres'
import { GIMMICK_BY_ID } from '../data/gimmicks'
import { INSPIRATION_BY_ID } from '../data/inspirations'
import { PLATFORMS, getPlatformAuthorRank } from '../data/platforms'
import { computeAlgorithmMatchScore } from './platformEngine'
import type { NovelPlatform, NovelPlatformId } from '../types/platform'
import { GROWTH_CURVE_BY_ID } from '../data/growthCurves'
import { NOVEL_STYLE_TRAITS, NOVEL_STYLE_TRAIT_BY_ID } from '../data/novelStyleTraits'
import {
  WRITER_ABANDON_RETENTION_PENALTY,
  WRITER_BASE_HYPE,
  WRITER_COMPLETED_PASSIVE_RATIO,
  WRITER_DEFAULT_HYPE_DECAY,
  WRITER_FULL_ATTENDANCE_DAILY_REWARD,
  WRITER_FULL_ATTENDANCE_DAILY_WORDS,
  WRITER_LAUNCH_WORD_COUNT,
  WRITER_MARKET_RNG_RANGE,
  WRITER_REVENUE_PER_1K_READS,
  WRITER_SIGNING_THRESHOLD_WORDS,
  WRITER_STRATEGIES,
  generateRandomDraft,
  generateTrendFollowingDraft,
  generateWriterTitle,
} from '../data/writer'
import type { GameState } from '../types/game'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function randomRange(
  range: [number, number],
  rng: () => number = Math.random,
): number {
  return range[0] + rng() * (range[1] - range[0])
}

function randomPick<T>(arr: T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)]
}

/* ============================================================
 * 网络作家（WRITER）
 * ============================================================ */

export interface CreateWriterProjectInput {
  day: number
  platformId: import('../types/platform').NovelPlatformId
  /** 新书立项方案（含题材/标签/噱头）；不填则随机生成 */
  draft?: import('../types/career').BookCreationDraft
  rng?: () => number
  /** 玩家当前状态，用于计算掌控力 */
  state?: GameState
  /** 玩家作者档案，用于履历加成与技能快照 */
  authorProfile?: AuthorProfile
}

/** 创建空的作家生涯档案 */
export function createEmptyWriterCareerProfile(): WriterCareerProfile {
  const genres: MainGenre[] = ['XUANHUAN', 'URBAN', 'SCI_FI', 'SUSPENSE', 'GAME', 'HISTORY']
  const genreMastery = {} as Record<MainGenre, GenreMastery>
  for (const genre of genres) {
    genreMastery[genre] = {
      genre,
      completedCount: 0,
      totalWordCount: 0,
      proficiency: 0,
    }
  }
  const platformCareer = {} as Record<
    import('../types/platform').NovelPlatformId,
    { totalRevenue: number; totalFans: number; currentRankId: string }
  >
  for (const platformId of ['ZHONGDIAN', 'KUAIYUE', 'SUCHUAN', 'LVJIANG'] as const) {
    platformCareer[platformId] = {
      totalRevenue: 0,
      totalFans: 0,
      currentRankId: PLATFORMS[platformId].authorRanks[0].id,
    }
  }

  return {
    genreMastery,
    unlockedStyleTraits: [],
    totalCompletedBooks: 0,
    totalAbandonedBooks: 0,
    platformCareer,
  }
}

/* ============================================================
 * 多维作者技能进化 & 履历背景矩阵
 * ============================================================ */

/** 创建默认五维技能（全 20，无专精） */
export function createDefaultAuthorSkills(): AuthorSkills {
  return {
    prose: 20,
    pacing: 20,
    structure: 20,
    marketInsight: 20,
    domainKnowledge: {},
  }
}

/** 根据履历标签 id 列表创建作者档案 */
export function createAuthorProfile(
  penName: string,
  backgroundIds: string[] = [],
): AuthorProfile {
  const skills = createDefaultAuthorSkills()
  const backgrounds = backgroundIds
    .map((id) => BACKGROUND_TAG_BY_ID[id])
    .filter((t): t is BackgroundTag => !!t)

  // 应用履历对基础能力的修正
  for (const tag of backgrounds) {
    if (tag.skillModifiers.prose !== undefined) {
      skills.prose = clamp(skills.prose + tag.skillModifiers.prose, 0, 100)
    }
    if (tag.skillModifiers.pacing !== undefined) {
      skills.pacing = clamp(skills.pacing + tag.skillModifiers.pacing, 0, 100)
    }
    if (tag.skillModifiers.structure !== undefined) {
      skills.structure = clamp(skills.structure + tag.skillModifiers.structure, 0, 100)
    }
    if (tag.skillModifiers.marketInsight !== undefined) {
      skills.marketInsight = clamp(
        skills.marketInsight + tag.skillModifiers.marketInsight,
        0,
        100,
      )
    }
    if (tag.skillModifiers.domainKnowledge) {
      for (const [domain, delta] of Object.entries(tag.skillModifiers.domainKnowledge)) {
        skills.domainKnowledge[domain] = clamp(
          (skills.domainKnowledge[domain] ?? 0) + delta,
          0,
          100,
        )
      }
    }
  }

  return {
    penName,
    skills,
    backgrounds,
    evolutionStage: computeAuthorEvolutionStage(skills, 0),
  }
}

/** 根据五维与完本数判定进化阶段 */
export function computeAuthorEvolutionStage(
  skills: AuthorSkills,
  completedBooks: number,
): import('../types/career').AuthorEvolutionStage {
  const avg = (skills.prose + skills.pacing + skills.structure + skills.marketInsight) / 4
  if (avg >= 80 && completedBooks >= 3) return 'LEGEND'
  if (avg >= 65 || completedBooks >= 2) return 'MASTER'
  if (avg >= 45 || completedBooks >= 1) return 'RISING_STAR'
  return 'NEWBIE'
}

/** 计算某作者档案面对特定题材时触发的所有化学反应 */
export function computeBackgroundBonuses(
  profile: AuthorProfile,
  genre: MainGenre,
): BackgroundBonus[] {
  const bonuses: BackgroundBonus[] = []
  for (const tag of profile.backgrounds) {
    const synergies = findGenreSynergies(tag, genre)
    for (const s of synergies) {
      // 检查专精领域门槛
      if (s.requiredDomain) {
        const val = profile.skills.domainKnowledge[s.requiredDomain.domain] ?? 0
        if (val < s.requiredDomain.min) continue
      }
      const comment = randomPick(s.uniqueReaderComments)
      bonuses.push({
        backgroundId: tag.id,
        backgroundName: tag.name,
        synergyName: s.synergyName,
        qualityBonus: s.qualityBonus,
        commercialityBonus: s.commercialityBonus ?? 0,
        retentionBonus: s.retentionBonus ?? 0,
        comment,
      })
    }
  }
  return bonuses
}

/** 将履历化学反应应用到作品初始三维 */
function applyBackgroundBonusesToInitialStats(
  stats: { quality: number; commerciality: number; memeValue: number },
  bonuses: BackgroundBonus[],
): { quality: number; commerciality: number; memeValue: number } {
  let { quality, commerciality, memeValue } = stats
  for (const b of bonuses) {
    quality = clamp(quality * (1 + b.qualityBonus), 0, 100)
    commerciality = clamp(commerciality * (1 + b.commercialityBonus), 0, 100)
    // 商业化加成在一定程度上也会转化为爆点
    memeValue = clamp(memeValue + commerciality * b.commercialityBonus * 0.3, 0, 100)
  }
  return { quality, commerciality, memeValue }
}

/** 将全局履历效果应用到项目初始状态 */
function applyGlobalBackgroundEffects(
  project: WriterProject,
  backgrounds: BackgroundTag[],
): WriterProject {
  let next = { ...project }
  for (const tag of backgrounds) {
    const effects = tag.globalEffects
    if (!effects) continue
    if (effects.startingFans) {
      next.stats = {
        ...next.stats,
        totalFansGained: next.stats.totalFansGained + effects.startingFans,
      }
    }
    if (effects.retentionModifier) {
      next.readerRetention = clamp(next.readerRetention + effects.retentionModifier, 0, 1)
    }
    if (effects.readerMoodModifier) {
      next.readerMood = clamp(next.readerMood + effects.readerMoodModifier, -100, 100)
    }
    if (effects.initialControversy) {
      next.stats = {
        ...next.stats,
        bugOrControversy: clamp(
          next.stats.bugOrControversy + effects.initialControversy,
          0,
          100,
        ),
      }
    }
  }
  return next
}

/** 根据写作策略增长作者技能 */
export function growAuthorSkills(
  action: WriterAction,
  skills: AuthorSkills,
): AuthorSkills {
  const next: AuthorSkills = {
    ...skills,
    domainKnowledge: { ...skills.domainKnowledge },
  }

  switch (action.strategy) {
    case 'SETUP':
      next.structure = clamp(next.structure + 0.4, 0, 100)
      next.prose = clamp(next.prose + 0.2, 0, 100)
      break
    case 'CLIMAX':
      next.pacing = clamp(next.pacing + 0.6, 0, 100)
      next.marketInsight = clamp(next.marketInsight + 0.1, 0, 100)
      break
    case 'FILLER':
      next.pacing = clamp(next.pacing + 0.1, 0, 100)
      break
    case 'CLIFFHANGER':
      next.pacing = clamp(next.pacing + 0.4, 0, 100)
      next.structure = clamp(next.structure + 0.1, 0, 100)
      break
    case 'TROPE_INSERT':
      next.marketInsight = clamp(next.marketInsight + 0.5, 0, 100)
      next.prose = clamp(next.prose + 0.1, 0, 100)
      break
  }

  // 长期连载会自动磨练结构力
  if (action.wordCountAdd >= 4000) {
    next.structure = clamp(next.structure + 0.05, 0, 100)
  }

  return next
}

/** 更新作者进化阶段并返回日志文本 */
export function checkAuthorEvolution(
  profile: AuthorProfile,
  completedBooks: number,
): { profile: AuthorProfile; log?: string } {
  const nextStage = computeAuthorEvolutionStage(profile.skills, completedBooks)
  if (nextStage === profile.evolutionStage) {
    return { profile }
  }

  const stageNames: Record<import('../types/career').AuthorEvolutionStage, string> = {
    NEWBIE: '萌新期',
    RISING_STAR: '上升期',
    MASTER: '成熟期',
    LEGEND: '传奇期',
  }

  const messages: Record<import('../types/career').AuthorEvolutionStage, string> = {
    NEWBIE: '',
    RISING_STAR: '你逐渐找到了自己的写作节奏，不再是完全懵懂的新人了。',
    MASTER: '你已经成为能驾驭长篇与世界观的成熟作者，读者开始称你为“老作者”。',
    LEGEND: '你的文笔与结构已臻化境，评论区开始出现“大神求带”的呼声。',
  }

  return {
    profile: { ...profile, evolutionStage: nextStage },
    log: `写作境界突破：进入【${stageNames[nextStage]}】！${messages[nextStage]}`,
  }
}

/** 计算作品复杂度：基础题材难度 + 标签修正 + 组合冲突惩罚 */
export function computeNovelComplexity(draft: BookCreationDraft): NovelComplexity {
  const genre = GENRE_BY_ID[draft.genre]
  const tags = draft.tags.map((id) => BOOK_TAG_BY_ID[id]).filter(Boolean)
  const gimmick = GIMMICK_BY_ID[draft.gimmick]

  const genreComplexity = genre.complexityBase
  const gimmickComplexity = gimmick?.complexityModifier ?? 0

  // 标签复杂度：同轴标签不叠罚，取该轴贡献最大的一项
  const axisContributions = new Map<string, number>()
  let noAxisTotal = 0
  for (const tag of tags) {
    const modifier = tag.complexityModifier ?? 0
    if (tag.complexityAxis) {
      const current = axisContributions.get(tag.complexityAxis) ?? 0
      // 保留绝对值最大的贡献（正轴取最高，负轴取最低）
      if (Math.abs(modifier) > Math.abs(current)) {
        axisContributions.set(tag.complexityAxis, modifier)
      }
    } else {
      noAxisTotal += modifier
    }
  }
  const tagComplexityTotal =
    noAxisTotal + Array.from(axisContributions.values()).reduce((s, v) => s + v, 0)

  // 标签间不兼容惩罚
  let synergyPenalty = 0
  for (let i = 0; i < tags.length; i++) {
    for (let j = i + 1; j < tags.length; j++) {
      const penalties = tags[i].synergyPenalty ?? []
      const match = penalties.find((p) => p.tagId === tags[j].id)
      if (match) synergyPenalty += match.penalty
    }
  }

  const rawScore = genreComplexity + gimmickComplexity + tagComplexityTotal + synergyPenalty

  let tier: ComplexityTier = 'SIMPLE'
  if (rawScore >= 80) tier = 'EPIC'
  else if (rawScore >= 60) tier = 'COMPLEX'
  else if (rawScore >= 40) tier = 'MODERATE'

  return {
    score: clamp(rawScore, 0, 100),
    tier,
    breakdown: {
      genre: genreComplexity,
      tags: tagComplexityTotal,
      gimmick: gimmickComplexity,
      overlapPenalty: synergyPenalty,
    },
  }
}

/** 计算作者掌控力 */
export function computeExecutionCapacity(
  draft: BookCreationDraft,
  state: GameState,
): number {
  const profile = state.writerCareerProfile
  const mastery = profile.genreMastery[draft.genre]

  // 基础掌控力：由玩家状态决定
  let base = 35

  // 题材熟练度：每本完本 +10，每写 10 万字 +2
  const masteryBonus = Math.min(
    30,
    mastery.completedCount * 10 + Math.floor(mastery.totalWordCount / 100_000) * 2,
  )

  // 作者等级加成
  const rankBonus: Record<AuthorRank, number> = {
    COLT: 0,
    SIGNED: 5,
    BOUTIQUE: 12,
    GREAT_GOD: 20,
    PLATINUM: 28,
  }

  // 心态加成：心态稳定时掌控力上升
  const moodBonus = clamp((150 - state.stats.stress) / 10, -15, 15)

  // 健康惩罚：虚弱时掉掌控力
  const health = state.stats.health
  const healthPenalty = health < 20 ? -30 : health < 50 ? -15 : 0

  // 太监惩罚：每太监一本书，下一本开局 -3（上限 -15）
  const abandonPenalty = -Math.min(15, profile.totalAbandonedBooks * 3)

  // 作者五维技能加成：基本功越扎实，掌控力越高
  const skills = state.authorProfile.skills
  const skillBonus = Math.min(
    15,
    (skills.prose + skills.pacing + skills.structure + skills.marketInsight) / 16,
  )

  // 履历化学反应加成：与题材匹配的背景提供额外掌控力
  const backgroundBonuses = computeBackgroundBonuses(state.authorProfile, draft.genre)
  const backgroundBonus = Math.min(15, backgroundBonuses.length * 8)

  return clamp(
    base +
      masteryBonus +
      rankBonus[state.authorRank] +
      moodBonus +
      healthPenalty +
      abandonPenalty +
      skillBonus +
      backgroundBonus,
    10,
    100,
  )
}

/** 掌控力校验 */
export function checkExecutionCapacity(
  complexity: NovelComplexity,
  execution: number,
): ExecutionCheckResult {
  const ratio = execution / Math.max(1, complexity.score)

  if (ratio >= 1.1) {
    return {
      ratio,
      tier: 'PERFECT',
      qualityMultiplier: 1.15,
      retentionDelta: 0.03,
      readerComment: '设定严密，作者脑洞真大！',
    }
  }
  if (ratio >= 0.85) {
    return {
      ratio,
      tier: 'SOLID',
      qualityMultiplier: 1.0,
      retentionDelta: 0,
    }
  }
  if (ratio >= 0.65) {
    return {
      ratio,
      tier: 'SHAKY',
      qualityMultiplier: 0.85,
      retentionDelta: -0.04,
      readerComment: '作者想法很好，但节奏有点驾驭不住。',
    }
  }
  return {
    ratio,
    tier: 'LOST',
    qualityMultiplier: 0.65,
    retentionDelta: -0.10,
    readerComment: '毒点暴增，作者完全驾驭不住这个题材。',
  }
}

/** 判定作品生长曲线 */
export function determineGrowthCurve(
  draft: BookCreationDraft,
  complexity: NovelComplexity,
  traits: string[] = [],
): GrowthCurveType {
  const genre = GENRE_BY_ID[draft.genre]
  const tags = draft.tags.map((id) => BOOK_TAG_BY_ID[id]).filter(Boolean)
  const gimmick = GIMMICK_BY_ID[draft.gimmick]

  // 计算各曲线倾向分
  let slowBurn = complexity.score * 0.6 + genre.qualityWeight * 15
  let fastFood = genre.baseCommerciality * 0.5 + (gimmick?.memePotential ?? 50) * 0.5
  let nicheCult =
    tags.reduce((s, t) => s + t.riskFactor, 0) / Math.max(1, tags.length)
  let steady = 30

  // 特质修正
  if (traits.includes('cozy_daily')) nicheCult += 40
  if (traits.includes('lore_master')) slowBurn += 35
  if (traits.includes('meme_machine')) fastFood += 40
  if (traits.includes('cliffhanger_god')) fastFood += 20

  const scores = [
    { type: 'SLOW_BURN' as GrowthCurveType, score: slowBurn },
    { type: 'FAST_FOOD' as GrowthCurveType, score: fastFood },
    { type: 'NICHE_CULT' as GrowthCurveType, score: nicheCult },
    { type: 'STEADY' as GrowthCurveType, score: steady },
  ]

  return scores.sort((a, b) => b.score - a.score)[0].type
}

/** 更新口碑池 */
export function updateWordOfMouth(
  project: WriterProject,
  action: WriterAction,
  executionCheck: ExecutionCheckResult,
): WordOfMouthPool {
  const curve = GROWTH_CURVE_BY_ID[project.growthCurve]
  const traits = project.activeStyleTraits.map((id) => NOVEL_STYLE_TRAIT_BY_ID[id])

  let delta = 0

  // 铺垫章节蓄水（质量门槛较低，让掌控力略有不足的作者也能缓慢积累）
  if (action.strategy === 'SETUP') {
    delta += 1
    if (project.quality >= 30) {
      delta += 2 * curve.wordOfMouthEfficiency
    }
  }

  // 高潮章节大量蓄水
  if (action.strategy === 'CLIMAX') {
    delta += 2
    if (project.quality >= 35) {
      delta += 4 * curve.wordOfMouthEfficiency
    }
  }

  // 掌控力加成：完美+2，稳健+1
  if (executionCheck.tier === 'PERFECT') delta += 2
  else if (executionCheck.tier === 'SOLID') delta += 1

  // 特质加成
  for (const trait of traits) {
    if (trait.buff.wordOfMouthBoost) {
      delta *= trait.buff.wordOfMouthBoost
    }
  }

  // 读者情绪高时，自来水增加
  if (project.readerMood > 20) delta += 1.5

  // 水字数和太监风险掉口碑
  if (action.strategy === 'FILLER') delta -= 2

  const next = clamp(project.wordOfMouth.current + delta, 0, 100)
  const primed = next >= curve.breakthroughThreshold

  return {
    ...project.wordOfMouth,
    current: next,
    primed,
    activeEvangelists: Math.floor(next / 10),
  }
}

/** 检测慢热逆袭事件 */
export function checkSlowBurnBreakthrough(
  project: WriterProject,
  rng: () => number = Math.random,
): { triggered: boolean; hypeBoost: number; logs: string[] } {
  if (project.growthCurve !== 'SLOW_BURN') return { triggered: false, hypeBoost: 0, logs: [] }
  if (!project.wordOfMouth.primed) return { triggered: false, hypeBoost: 0, logs: [] }

  const trait = NOVEL_STYLE_TRAIT_BY_ID['lore_master']
  const thresholdQuality = trait && project.activeStyleTraits.includes('lore_master')
    ? 55
    : 65
  if (project.quality < thresholdQuality) return { triggered: false, hypeBoost: 0, logs: [] }

  // 触发概率：口碑池越满越高
  const chance = 0.05 + project.wordOfMouth.current / 500
  if (rng() > chance) return { triggered: false, hypeBoost: 0, logs: [] }

  const hypeBoost = randomRange([25, 55], rng)
  const logs = [
    `《${project.title}》的伏笔终于收回！评论区开始刷屏：“前 50 章忍住，后面直接封神！”`,
    `有 UP 主做了《${project.title}》的安利视频，自来水开始破圈。`,
  ]

  return { triggered: true, hypeBoost, logs }
}

/** 检测一夜爆火事件 */
export function checkOvernightViral(
  project: WriterProject,
  action: WriterAction,
  rng: () => number = Math.random,
): { triggered: boolean; hypeBoost: number; logs: string[]; durationDays: number } {
  let baseChance = 0.0

  // 高 memeValue + 整活策略 = 爆火概率
  if (project.memeValue >= 60 && action.strategy === 'TROPE_INSERT') baseChance += 0.04
  if (project.memeValue >= 70 && action.strategy === 'CLIMAX') baseChance += 0.03

  // 偏科死忠书也有小概率出梗
  if (project.growthCurve === 'NICHE_CULT' && project.memeValue >= 55) baseChance += 0.02

  // 特质修正
  if (project.activeStyleTraits.includes('meme_machine')) baseChance += 0.03

  if (rng() > baseChance) return { triggered: false, hypeBoost: 0, logs: [], durationDays: 0 }

  const hypeBoost = randomRange([30, 70], rng)
  const durationDays = Math.floor(randomRange([3, 8], rng))
  const logs = [
    `《${project.title}》的某段剧情被做成梗图，在社交媒体上病毒式传播！`,
    `大量路人涌进评论区：“慕名而来，这就是那本神书？”`,
  ]

  return { triggered: true, hypeBoost, logs, durationDays }
}

/** 应用生长曲线到曝光量 */
export function applyGrowthCurve(
  project: WriterProject,
  baseExposure: number,
  bookAgeDays: number,
): number {
  const curve = GROWTH_CURVE_BY_ID[project.growthCurve]

  // 根据书龄判断处于前期还是后期
  const isLateStage = bookAgeDays > 20 || project.wordCount > 200_000
  const stageMultiplier = isLateStage ? curve.lateHypeMultiplier : curve.earlyHypeMultiplier

  // 爆火状态加成
  const viralMultiplier = project.isViralSurge ? 1.8 : 1.0

  return baseExposure * stageMultiplier * viralMultiplier
}

/** 应用文风特质效果到留存与转化 */
export function applyStyleTraitEffects(
  project: WriterProject,
  baseRetention: number,
  baseFanConversion: number,
): { retention: number; fanConversion: number } {
  const traits = project.activeStyleTraits.map((id) => NOVEL_STYLE_TRAIT_BY_ID[id])

  let retention = baseRetention
  let fanConversion = baseFanConversion

  for (const trait of traits) {
    if (trait.debuff.earlyRetentionPenalty) {
      retention += trait.debuff.earlyRetentionPenalty
    }
    if (trait.buff.fanConversionBoost) {
      fanConversion *= trait.buff.fanConversionBoost
    }
  }

  // 字数越过前期后，日常流的留存惩罚逐渐消失
  if (project.activeStyleTraits.includes('cozy_daily') && project.wordCount > 100_000) {
    retention += 0.15
  }

  return {
    retention: clamp(retention, 0.01, 0.95),
    fanConversion: clamp(fanConversion, 0.001, 0.5),
  }
}

/** 尝试涌现式觉醒文风特质 */
export function tryAwakenStyleTrait(
  project: WriterProject,
  profile: WriterCareerProfile,
  rng: () => number = Math.random,
): NovelStyleTrait | null {
  const candidates = NOVEL_STYLE_TRAITS.filter((trait) => {
    if (project.activeStyleTraits.includes(trait.id)) return false
    if (profile.unlockedStyleTraits.includes(trait.id)) return false
    const cond = trait.unlockCondition
    if (!cond) return false
    if (cond.minWordCount && project.wordCount < cond.minWordCount) return false
    if (cond.minQuality && project.quality < cond.minQuality) return false
    return true
  })

  if (candidates.length === 0) return null
  if (rng() > 0.15) return null

  return randomPick(candidates, rng)
}

/** 完结/太监时更新生涯档案 */
export function updateWriterCareerProfile(
  profile: WriterCareerProfile,
  project: WriterProject,
  completed: boolean,
): WriterCareerProfile {
  const mastery = profile.genreMastery[project.genre]
  const nextProfile: WriterCareerProfile = {
    genreMastery: { ...profile.genreMastery },
    unlockedStyleTraits: [...profile.unlockedStyleTraits],
    totalCompletedBooks: profile.totalCompletedBooks,
    totalAbandonedBooks: profile.totalAbandonedBooks,
  }

  nextProfile.genreMastery[project.genre] = {
    ...mastery,
    totalWordCount: mastery.totalWordCount + project.wordCount,
    completedCount: completed ? mastery.completedCount + 1 : mastery.completedCount,
    proficiency: clamp(
      mastery.proficiency + (completed ? 10 : 2) + Math.floor(project.wordCount / 100_000),
      0,
      100,
    ),
  }

  if (completed) nextProfile.totalCompletedBooks += 1
  else nextProfile.totalAbandonedBooks += 1

  // 解锁本书激活过的特质
  for (const traitId of project.activeStyleTraits) {
    if (!nextProfile.unlockedStyleTraits.includes(traitId)) {
      nextProfile.unlockedStyleTraits.push(traitId)
    }
  }

  return nextProfile
}

/** 根据题材+标签+噱头计算初始三维 */
function computeInitialStats(
  draft: BookCreationDraft,
  rng: () => number,
): { quality: number; commerciality: number; memeValue: number; isBlackHorseTarget: boolean } {
  const genre = GENRE_BY_ID[draft.genre]
  const tags = draft.tags.map((id) => BOOK_TAG_BY_ID[id]).filter(Boolean)
  const gimmick = GIMMICK_BY_ID[draft.gimmick]

  const avgTagCommercialityMod =
    tags.reduce((s, t) => s + t.commercialityModifier, 0) / Math.max(1, tags.length)
  const avgTagMeme =
    tags.reduce((s, t) => s + t.memePotential, 0) / Math.max(1, tags.length)
  const avgTagRisk =
    tags.reduce((s, t) => s + t.riskFactor, 0) / Math.max(1, tags.length)
  const risk = (avgTagRisk + (gimmick?.riskFactor ?? 30)) / 2

  const quality = clamp(
    42 +
      (genre.qualityWeight - 1) * 25 +
      ((gimmick?.qualityModifier ?? 1) - 1) * 20 +
      rng() * 12,
    0,
    100,
  )
  const commerciality = clamp(
    genre.baseCommerciality *
      (avgTagCommercialityMod || 1) *
      (gimmick?.commercialityModifier ?? 1) *
      (1 - risk / 250) +
      rng() * 10,
    0,
    100,
  )
  const memeValue = clamp(
    genre.baseMemePotential * 0.55 +
      avgTagMeme * 0.55 +
      (gimmick?.memePotential ?? 50) * 0.5 +
      rng() * 10,
    0,
    100,
  )

  // 小众高风险 + 高爆点 = 黑马潜能
  const isBlackHorseTarget = risk >= 50 && memeValue >= 60

  return { quality, commerciality, memeValue, isBlackHorseTarget }
}

export function createWriterProject(
  input: CreateWriterProjectInput,
): WriterProject {
  const rng = input.rng ?? Math.random
  const draft = input.draft ?? generateRandomDraft(rng)
  const title = generateWriterTitle(draft, rng)
  let { quality, commerciality, memeValue, isBlackHorseTarget } = computeInitialStats(
    draft,
    rng,
  )

  // 计算并应用履历化学反应
  const authorProfile = input.authorProfile ?? createAuthorProfile(draft.penName)
  const backgroundBonuses = computeBackgroundBonuses(authorProfile, draft.genre)
  const boosted = applyBackgroundBonusesToInitialStats(
    { quality, commerciality, memeValue },
    backgroundBonuses,
  )
  quality = boosted.quality
  commerciality = boosted.commerciality
  memeValue = boosted.memeValue

  const complexity = computeNovelComplexity(draft)
  const executionCapacity = input.state
    ? computeExecutionCapacity(draft, input.state)
    : 35
  const growthCurve = determineGrowthCurve(draft, complexity, draft.styleTraits)

  let project: WriterProject = {
    id: `writer_${Date.now()}_${Math.floor(rng() * 1000)}`,
    professionType: 'WRITER',
    platformId: input.platformId,
    title,
    penName: draft.penName || '咸鱼作者',
    genre: draft.genre,
    tags: draft.tags,
    gimmick: draft.gimmick,
    blackHorseTriggered: isBlackHorseTarget,
    phase: 'CONCEPT',
    stage: 'CONCEPT',
    dayCreated: input.day,
    quality,
    commerciality,
    memeValue,
    progress: 0,
    totalWorkload: WRITER_LAUNCH_WORD_COUNT * 1.5,
    metrics: {
      viewsOrReaders: 0,
      fanConversionRate: 0.005 + rng() * 0.005,
      hypeDecay: WRITER_DEFAULT_HYPE_DECAY,
      currentHype: WRITER_BASE_HYPE * 0.3,
    },
    stats: {
      totalRevenue: 0,
      totalFansGained: 0,
      bugOrControversy: 0,
      ipValue: 0,
    },
    wordCount: 0,
    launchWordCount: WRITER_LAUNCH_WORD_COUNT,
    signed: false,
    readerRetention: 0.03,
    monthlyTickets: 0,
    consecutiveDailyUpdates: 0,
    lastUpdatedDay: input.day,
    totalChapters: 0,
    readerMood: 0,
    dailyWordCount: 0,
    complexity,
    executionCapacity,
    growthCurve,
    activeStyleTraits: draft.styleTraits ?? [],
    wordOfMouth: {
      current: 0,
      primed: false,
      breakthroughCount: 0,
      activeEvangelists: 0,
    },
    foreshadowingCharge: 0,
    chaptersToClimax: 5,
    isViralSurge: false,
    viralSurgeDays: 0,
    authorSkillSnapshot: authorProfile.skills,
    backgroundBonuses,
    triggeredFanfictionChains: {
      blowup: false,
      copyright: false,
      payback: false,
    },
  }

  // 应用全局履历效果（初始粉丝、追读修正、隐患等）
  project = applyGlobalBackgroundEffects(project, authorProfile.backgrounds)

  return project
}

/** 根据字数重新计算网文项目的 progress 与阶段 */
function recalcWriterProgress(p: WriterProject): WriterProject {
  let progress = 0
  switch (p.stage) {
    case 'CONCEPT':
      progress = (p.wordCount / WRITER_SIGNING_THRESHOLD_WORDS) * 100
      break
    case 'SIGNED':
      progress =
        ((p.wordCount - WRITER_SIGNING_THRESHOLD_WORDS) /
          (WRITER_LAUNCH_WORD_COUNT - WRITER_SIGNING_THRESHOLD_WORDS)) *
        100
      break
    case 'LAUNCHED':
    case 'SERIALIZING':
      progress = 100
      break
    default:
      progress = 100
  }
  return { ...p, progress: clamp(progress, 0, 100) }
}

/** 尝试自动签约：平台根据算法偏好和签约难度决定是否通过 */
function trySign(
  p: WriterProject,
  platform: NovelPlatform,
  _day: number,
  rng: () => number = Math.random,
  contractDifficultyModifier: number = 0,
): { project: WriterProject; log?: string; signed: boolean } {
  if (p.stage === 'CONCEPT' && p.wordCount >= WRITER_SIGNING_THRESHOLD_WORDS) {
    // 算法分 = 平台偏好的三维加权
    const algorithmScore =
      p.quality * platform.algorithmFocus.quality +
      p.commerciality * platform.algorithmFocus.commerciality +
      p.memeValue * platform.algorithmFocus.memeValue

    // 签约阈值：平台基础难度 - 新书扶持（新书更容易签）- 作家等级修正
    const threshold = clamp(
      platform.baseContractDifficulty * (1 - platform.newBookBoost * 0.5) - contractDifficultyModifier,
      10,
      100,
    )

    // 随机浮动 ±10%
    const roll = algorithmScore * randomRange([0.9, 1.1], rng)

    if (roll >= threshold) {
      const next: WriterProject = {
        ...p,
        stage: 'SIGNED',
        phase: 'DEVELOPING',
        signed: true,
        readerRetention: clamp(p.readerRetention + 0.05, 0, 1),
      }
      return {
        project: recalcWriterProgress(next),
        log: `《${next.title}》满 ${WRITER_SIGNING_THRESHOLD_WORDS.toLocaleString('zh-CN')} 字，${platform.name} 发来站短：作品已成功签约！`,
        signed: true,
      }
    } else {
      return {
        project: p,
        log: `《${p.title}》满 ${WRITER_SIGNING_THRESHOLD_WORDS.toLocaleString('zh-CN')} 字，但 ${platform.name} 的编辑认为作品风格不太匹配，签约被拒。`,
        signed: false,
      }
    }
  }
  return { project: p, signed: false }
}

/** 尝试上架 */
function tryLaunch(p: WriterProject, day: number): { project: WriterProject; log?: string } {
  if ((p.stage === 'SIGNED' || p.stage === 'CONCEPT') && p.wordCount >= WRITER_LAUNCH_WORD_COUNT) {
    const next: WriterProject = {
      ...p,
      stage: 'LAUNCHED',
      phase: 'LAUNCHED',
      dayLaunched: day,
      metrics: {
        ...p.metrics,
        currentHype: clamp(p.metrics.currentHype + 40, 0, 100),
      },
      readerRetention: clamp(p.readerRetention + 0.1, 0, 1),
    }
    return {
      project: recalcWriterProgress(next),
      log: `《${next.title}》满 ${WRITER_LAUNCH_WORD_COUNT.toLocaleString('zh-CN')} 字，正式上架！首订大战开始。`,
    }
  }
  return { project: p }
}

/** 连载期自动转长期连载 */
function trySerializing(p: WriterProject): WriterProject {
  if (p.stage === 'LAUNCHED' && p.wordCount >= WRITER_LAUNCH_WORD_COUNT + 50_000) {
    return { ...p, stage: 'SERIALIZING' }
  }
  return p
}

/* ============================================================
 * 读者本章说生成器
 * ============================================================ */

const PLATFORM_COMMENTS: Record<NovelPlatformId, Record<string, string[]>> = {
  ZHONGDIAN: {
    positive: [
      '终点这书名居然不是标题党，有点东西。',
      '老牌平台就需要这种质量稳定的书，月票投了。',
      '这章节奏很舒服，不像某些榜单书那么赶。',
    ],
    negative: [
      '在终点写这种文，怕不是要被大神们按在地上摩擦。',
      '签约都过不了，这质量在终点活不下去。',
      '终点读者可不好糊弄，作者还得再打磨。',
    ],
    meme: [
      '这梗怎么有点像隔壁那本《赛博痔疮患者》？',
      '作者是不是终点老书虫，这味儿太正了。',
    ],
  },
  KUAIYUE: {
    positive: [
      '快阅算法总算给我推了本能看的，追了。',
      '节奏快、爽点密，这书适合快阅。',
      '免费章节看着不心疼，先养着。',
    ],
    negative: [
      '快阅这种书一抓一大把，没两天就凉了。',
      '算法推荐这种质量，我的完读率不要了？',
      '在快阅不爆更就是死。',
    ],
    meme: [
      '这梗在快阅能火，评论区已经准备二创了。',
      '快阅读者就爱看这个，作者懂流量。',
    ],
  },
  SUCHUAN: {
    positive: [
      '爆更！日更两万！速穿就需要你这种作者！',
      '爽！不拖沓！这才叫速穿风！',
      '首订我预定了，作者别太监。',
    ],
    negative: [
      '速穿你还敢铺垫？读者早跑了。',
      '更新这么慢，在速穿就是找死。',
      '节奏太慢，速穿不适合你。',
    ],
    meme: [
      '这梗节奏够快，速穿读者就吃这套。',
      '速穿区最近流行这种整活，作者赶上了。',
    ],
  },
  LVJIANG: {
    positive: [
      '绿江就需要这种群像剧，人物刻画绝了。',
      '这章的情感张力，完全可以影视化。',
      '长情读者表示终于等到一本好书。',
    ],
    negative: [
      '绿江读者很挑的，这种设定容易被举报。',
      '圈子很小，作者注意别踩雷。',
      '绿江不适合这种商业化写法。',
    ],
    meme: [
      '绿江评论区已经开始写同人梗了。',
      '这梗在绿江能养活一堆二创太太。',
    ],
  },
}

const MEME_COMMENTS: string[] = [
  '这个梗我笑了一分钟，作者冲浪强度可以。',
  '梗是好梗，但别玩脱了。',
  '本章含梗量过高，建议搭配降压药服用。',
  '这个梗callback得妙，老粉狂喜。',
]

const CONTROVERSY_COMMENTS: string[] = [
  '评论区怎么吵起来了？作者你管管。',
  '这段有争议，但我支持作者这么写。',
  '有人开始带节奏了，读者大战预定。',
  '这章能引发讨论，说明作者写到点子上了。',
]

/** 生成一条读者本章说 */
function generateReaderComment(
  project: WriterProject,
  platform: NovelPlatform,
  strategyId: string,
  rng: () => number = Math.random,
): string {
  const buckets: string[] = []

  // 1. 策略基础评论
  const strategy = WRITER_STRATEGIES.find((s) => s.id === strategyId)
  if (strategy) {
    buckets.push(randomPick(strategy.readerComments, rng))
  }

  // 2. 平台特色评论
  const platformBucket = PLATFORM_COMMENTS[platform.id]
  if (platformBucket) {
    const tone = project.readerMood > 10 ? 'positive' : project.readerMood < -10 ? 'negative' : 'positive'
    buckets.push(randomPick(platformBucket[tone] ?? platformBucket.positive, rng))
  }

  // 3. 梗值高时触发玩梗评论
  if (project.memeValue > 60 && rng() < 0.5) {
    buckets.push(randomPick(MEME_COMMENTS, rng))
  }

  // 4. 争议值/隐患高时
  if ((project.stats.bugOrControversy ?? 0) > 30 && rng() < 0.4) {
    buckets.push(randomPick(CONTROVERSY_COMMENTS, rng))
  }

  // 5. 未签约时的催签焦虑
  if (project.stage === 'CONCEPT' && project.wordCount > 20_000 && rng() < 0.3) {
    buckets.push(`都${(project.wordCount / 10000).toFixed(1)}万字了还没签约，作者要不要换平台试试？`)
  }

  return randomPick(buckets, rng)
}

/** 对 WriterProject 执行一个写作动作 */
export function applyWriterAction(
  project: WriterProject,
  action: WriterAction,
  currentDay: number,
  platform: NovelPlatform = PLATFORMS[project.platformId],
  rng: () => number = Math.random,
  state?: GameState,
): CareerActionResult {
  // 阶段检查
  const required = Array.isArray(action.phaseRequired)
    ? action.phaseRequired
    : [action.phaseRequired]
  if (!required.includes(project.phase as ProjectPhase)) {
    return {
      project,
      playerDelta: {},
      logs: [`《${project.title}》当前阶段无法使用【${action.name}】。`],
    }
  }

  const logs: string[] = []
  let next: WriterProject = { ...project }

  // 1. 字数与章节
  next.wordCount += action.wordCountAdd
  next.totalChapters += 1
  next.dailyWordCount += action.wordCountAdd

  // 2. 三维质量变化
  next.quality = clamp(next.quality + (action.effects.qualityAdd ?? 0), 0, 100)
  next.commerciality = clamp(
    next.commerciality + (action.effects.commercialityAdd ?? 0),
    0,
    100,
  )
  next.memeValue = clamp(next.memeValue + (action.effects.memeValueAdd ?? 0), 0, 100)

  // 3. 掌控力校验（题材/Tag/噱头越复杂，越考验作者硬实力）
  const executionCheck = checkExecutionCapacity(next.complexity, next.executionCapacity)
  next.quality = clamp(next.quality * executionCheck.qualityMultiplier, 0, 100)
  next.readerRetention = clamp(next.readerRetention + executionCheck.retentionDelta, 0, 1)
  if (executionCheck.readerComment && rng() < 0.5) {
    logs.push(`本章说：${executionCheck.readerComment}`)
  }

  // 4. 热度助推
  if (action.effects.hypeBoost) {
    next.metrics = {
      ...next.metrics,
      currentHype: clamp(
        next.metrics.currentHype + action.effects.hypeBoost,
        0,
        100,
      ),
    }
  }

  // 5. 口碑池更新（为慢热逆袭蓄水）
  next.wordOfMouth = updateWordOfMouth(next, action, executionCheck)

  // 6. 慢热逆袭检测
  const breakthrough = checkSlowBurnBreakthrough(next, rng)
  if (breakthrough.triggered) {
    next.metrics = {
      ...next.metrics,
      currentHype: clamp(next.metrics.currentHype + breakthrough.hypeBoost, 0, 100),
    }
    next.wordOfMouth = {
      ...next.wordOfMouth,
      current: 0,
      primed: false,
      breakthroughCount: next.wordOfMouth.breakthroughCount + 1,
      lastBreakthroughChapter: next.totalChapters,
    }
    logs.push(...breakthrough.logs)
  }

  // 7. 一夜爆火检测
  const viral = checkOvernightViral(next, action, rng)
  if (viral.triggered) {
    next.isViralSurge = true
    next.viralSurgeDays = viral.durationDays
    next.metrics = {
      ...next.metrics,
      currentHype: clamp(next.metrics.currentHype + viral.hypeBoost, 0, 100),
    }
    logs.push(...viral.logs)
  }

  // 8. 追读率与读者情绪
  next.readerRetention = clamp(
    next.readerRetention + action.retentionDelta,
    0,
    1,
  )
  next.readerMood = clamp(next.readerMood + action.readerMoodDelta, -100, 100)

  // 9. 日更连续性
  if (action.countsAsDailyUpdate) {
    if (currentDay - next.lastUpdatedDay <= 1) {
      next.consecutiveDailyUpdates += 1
    } else {
      next.consecutiveDailyUpdates = 1
    }
    next.lastUpdatedDay = currentDay
  }

  // 10. 阶段流转（签约 / 上架）
  const rankEffects = state
    ? getPlatformAuthorRank(
        project.platformId,
        state.writerCareerProfile.platformCareer[project.platformId].totalRevenue,
        state.writerCareerProfile.platformCareer[project.platformId].totalFans,
      ).currentRank
    : undefined
  const signResult = trySign(next, platform, currentDay, rng, rankEffects?.contractDifficultyModifier)
  if (signResult.log) logs.push(signResult.log)
  next = signResult.project

  const launchResult = tryLaunch(next, currentDay)
  if (launchResult.log) logs.push(launchResult.log)
  next = launchResult.project

  next = trySerializing(next)

  // 11. 重新计算进度
  next = recalcWriterProgress(next)

  // 12. 文风特质涌现式觉醒
  if (state) {
    const newTrait = tryAwakenStyleTrait(next, state.writerCareerProfile, rng)
    if (newTrait) {
      next.activeStyleTraits = [...next.activeStyleTraits, newTrait.id]
      logs.push(
        `《${next.title}》逐渐形成了独特的【${newTrait.name}】文风：${newTrait.description}`,
      )
    }
  }

  // 13. 读者本章说（平台 + 策略 + 梗 + 状态驱动）
  if (action.strategy !== 'META') {
    const comment = generateReaderComment(next, platform, action.strategy, rng)
    logs.push(`本章说：${comment}`)
  }

  // 14. 作者五维技能成长（履历决定文风，写作淬炼进化）
  let authorProfile: AuthorProfile | undefined
  if (action.strategy !== 'META' && state?.authorProfile) {
    const grownSkills = growAuthorSkills(action, state.authorProfile.skills)
    const completedBooks = state.writerCareerProfile?.totalCompletedBooks ?? 0
    const evolved = checkAuthorEvolution(
      { ...state.authorProfile, skills: grownSkills },
      completedBooks,
    )
    authorProfile = evolved.profile
    if (evolved.log) {
      logs.push(evolved.log)
    }
  }

  // 15. 玩家属性消耗
  const playerDelta: CareerActionResult['playerDelta'] = {
    energy: action.cost.energy,
    stress: action.cost.stress,
  }
  if (action.cost.money) {
    playerDelta.savings = -action.cost.money
  }

  return { project: next, playerDelta, logs, authorProfile }
}

/** 网文项目每日发酵结算 */
export function dailyTickWriter(
  project: WriterProject,
  currentDay: number,
  platform: NovelPlatform = PLATFORMS[project.platformId],
  trend?: import('../types/career').MarketTrend,
  rng: () => number = Math.random,
  rankEffects: {
    revenueShareMultiplier?: number
    newBookBoostBonus?: number
    fullAttendanceBonus?: number
    contractDifficultyModifier?: number
  } = {},
): CareerDailyResult {
  // 完结/太监项目不再主动发酵，只保留余热或惩罚
  if (project.stage === 'COMPLETED') {
    const passiveRevenue =
      project.stats.totalRevenue * WRITER_COMPLETED_PASSIVE_RATIO / 30
    const completedProject: WriterProject = {
      ...project,
      stats: {
        ...project.stats,
        totalRevenue: project.stats.totalRevenue + passiveRevenue,
      },
      dailyWordCount: 0,
    }
    return {
      project: completedProject,
      playerDelta: { savings: passiveRevenue },
      logs: [
        `《${project.title}》完结余热：+${Math.round(passiveRevenue).toLocaleString('zh-CN')} 元。`,
      ],
    }
  }

  if (project.stage === 'ABANDONED') {
    const abandonedProject: WriterProject = {
      ...project,
      dailyWordCount: 0,
    }
    return {
      project: abandonedProject,
      playerDelta: {},
      logs: [`《${project.title}》已太监，不再产生收益。`],
    }
  }

  const logs: string[] = []
  let next: WriterProject = { ...project }

  // 1. 市场随机波动
  const marketRng = randomRange(WRITER_MARKET_RNG_RANGE, rng)

  // 2. 平台算法匹配度：越契合平台算法，曝光和收益越高
  const algorithmMatchScore = computeAlgorithmMatchScore(next, platform, trend)
  const matchMultiplier = 0.5 + algorithmMatchScore / 100

  // 2.5 黑马爆款触发：高风险脑洞+质量/爆点达标时，某日突然出圈
  if (
    next.blackHorseTriggered &&
    (next.quality + next.memeValue) / 2 >= 65 &&
    rng() < 0.12
  ) {
    const blackHorseHype = randomRange([20, 40], rng)
    next.metrics = {
      ...next.metrics,
      currentHype: clamp(next.metrics.currentHype + blackHorseHype, 0, 100),
    }
    logs.push(
      `《${next.title}》的邪门组合意外被读者玩成梗，热度暴涨 ${Math.round(blackHorseHype)}！`,
    )
  }

  // 3. 每日曝光/阅读量
  const baseHype = WRITER_BASE_HYPE + next.metrics.currentHype
  const score =
    next.commerciality * 0.4 + next.memeValue * 0.4 + next.quality * 0.2
  const rawExposure = Math.max(
    0,
    baseHype * (score / 100) * marketRng * matchMultiplier,
  )

  // 应用生长曲线（前期/后期系数、爆火状态）
  const bookAgeDays = currentDay - next.dayCreated
  let exposure = applyGrowthCurve(next, rawExposure, bookAgeDays)

  // 应用作家等级带来的新书流量扶持
  exposure *= 1 + (rankEffects.newBookBoostBonus ?? 0)
  next.metrics = {
    ...next.metrics,
    viewsOrReaders: next.metrics.viewsOrReaders + exposure,
  }

  // 4. 收益计算：按平台变现模型差异化 × 算法匹配度加成
  let revenue = 0
  if (next.signed) {
    const effectiveReads = exposure * next.readerRetention
    switch (platform.businessModel) {
      case 'SUBSCRIPTION':
        // 订阅制：追读越高，收益越高
        revenue =
          (effectiveReads / 1000) *
          WRITER_REVENUE_PER_1K_READS *
          1.5 *
          matchMultiplier
        break
      case 'FREE_AD':
        // 免费广告：靠曝光和完读，单价低但流量大
        revenue =
          (exposure / 1000) * WRITER_REVENUE_PER_1K_READS * 0.4 * matchMultiplier
        break
      case 'SPONSORSHIP':
        // 打赏制：追读和读者情绪共同决定
        revenue =
          (effectiveReads / 1000) *
          WRITER_REVENUE_PER_1K_READS *
          (1 + Math.max(0, next.readerMood) / 100) *
          matchMultiplier
        break
      case 'IP_DRIVEN':
        // IP 向：订阅收益一般，但字数/热度积累 IP 价值
        revenue =
          (effectiveReads / 1000) *
          WRITER_REVENUE_PER_1K_READS *
          0.8 *
          matchMultiplier
        next.stats.ipValue = clamp(
          (next.stats.ipValue ?? 0) + exposure * 0.001 * matchMultiplier,
          0,
          1000,
        )
        break
    }
  }

  // 应用作家等级分成倍率
  revenue *= rankEffects.revenueShareMultiplier ?? 1

  // 刚上架的作品有首订加成
  if (next.stage === 'LAUNCHED' && next.dayLaunched === currentDay - 1) {
    revenue *= 2
    logs.push(`《${next.title}》上架首日首订结算！`)
  }

  // 5. 文风特质影响留存与转化
  const traitEffects = applyStyleTraitEffects(
    next,
    next.readerRetention,
    next.metrics.fanConversionRate,
  )
  next.readerRetention = traitEffects.retention
  next.metrics = {
    ...next.metrics,
    fanConversionRate: traitEffects.fanConversion,
  }

  // 6. 粉丝转化
  const newFans = exposure * next.metrics.fanConversionRate
  next.stats = {
    ...next.stats,
    totalRevenue: next.stats.totalRevenue + revenue,
    totalFansGained: next.stats.totalFansGained + newFans,
  }

  // 7. 热度衰减：质量高衰减慢，爆点高衰减快
  const traits = next.activeStyleTraits.map((id) => NOVEL_STYLE_TRAIT_BY_ID[id])
  let decayRate =
    WRITER_DEFAULT_HYPE_DECAY *
    (1 + next.memeValue / 100) *
    (1 - next.quality / 200)
  for (const trait of traits) {
    if (trait.debuff.hypeDecayBoost) {
      decayRate *= trait.debuff.hypeDecayBoost
    }
  }
  next.metrics = {
    ...next.metrics,
    currentHype: clamp(next.metrics.currentHype * (1 - decayRate), 0, 100),
    hypeDecay: decayRate,
  }

  // 8. 读者情绪自然回归（受特质影响）
  let moodRecovery = 0.9
  for (const trait of traits) {
    if (trait.buff.readerMoodRecovery) {
      moodRecovery /= trait.buff.readerMoodRecovery
    }
  }
  next.readerMood = clamp(next.readerMood * moodRecovery, -100, 100)

  // 9. 口碑自然发酵（慢热书熬过前期后每日微量蓄水）
  if (next.growthCurve === 'SLOW_BURN' && next.wordCount > 50_000) {
    const curve = GROWTH_CURVE_BY_ID[next.growthCurve]
    const wordOfMouthDelta = 0.5 * curve.wordOfMouthEfficiency
    next.wordOfMouth = {
      ...next.wordOfMouth,
      current: clamp(next.wordOfMouth.current + wordOfMouthDelta, 0, 100),
      activeEvangelists: Math.floor(clamp(next.wordOfMouth.current + wordOfMouthDelta, 0, 100) / 10),
    }
    next.wordOfMouth.primed = next.wordOfMouth.current >= curve.breakthroughThreshold
  }

  // 10. 爆火状态倒计时
  if (next.isViralSurge) {
    next.viralSurgeDays -= 1
    if (next.viralSurgeDays <= 0) {
      next.isViralSurge = false
      logs.push(`《${next.title}》的爆火热度开始回落，读者开始用放大镜审视后续质量。`)
    }
  }

  // 11. 追读率自然衰减（长期不更新会大幅下滑）
  if (currentDay - next.lastUpdatedDay > 1) {
    next.readerRetention = clamp(next.readerRetention - 0.05, 0, 1)
    next.consecutiveDailyUpdates = 0
    logs.push(`《${next.title}》断更一天，追读率下滑。`)
  }

  // 13. 全勤奖
  let fullAttendanceReward = 0
  if (
    next.stage !== 'CONCEPT' &&
    next.dailyWordCount >= WRITER_FULL_ATTENDANCE_DAILY_WORDS
  ) {
    fullAttendanceReward = WRITER_FULL_ATTENDANCE_DAILY_REWARD + (rankEffects.fullAttendanceBonus ?? 0)
    logs.push(
      `《${next.title}》日更 ${next.dailyWordCount.toLocaleString('zh-CN')} 字，获得全勤奖励 +${fullAttendanceReward} 元。`,
    )
  }

  // 14. 重置今日字数
  next.dailyWordCount = 0

  const playerDelta: CareerDailyResult['playerDelta'] = {
    savings: revenue + fullAttendanceReward,
    fans: newFans,
  }

  // 15. 隐患爆发（概率性， memeValue 高/quality 低时更容易）
  const controversyRisk = (next.memeValue / 100) * 0.02 + ((100 - next.quality) / 100) * 0.01
  if (rng() < controversyRisk && next.stage !== 'CONCEPT') {
    next.stats.bugOrControversy = clamp(next.stats.bugOrControversy + 10, 0, 100)
    logs.push(`《${next.title}》引发读者争议，隐患值 +10。`)
  }

  return { project: next, playerDelta, logs }
}

/** 完结一本书 */
export function completeWriterProject(
  project: WriterProject,
  _currentDay: number,
): { project: WriterProject; log: string } {
  const next: WriterProject = {
    ...project,
    stage: 'COMPLETED',
    phase: 'COMPLETED',
    readerMood: clamp(project.readerMood + 20, -100, 100),
  }
  return {
    project: next,
    log: `《${next.title}》正式完结！读者含泪告别，作品进入长尾余热阶段。`,
  }
}

/** 太监一本书 */
export function abandonWriterProject(
  project: WriterProject,
  _currentDay: number,
): { project: WriterProject; log: string; stressDelta: number } {
  const next: WriterProject = {
    ...project,
    stage: 'ABANDONED',
    phase: 'ABANDONED',
    readerRetention: clamp(project.readerRetention + WRITER_ABANDON_RETENTION_PENALTY, 0, 1),
    readerMood: -80,
    consecutiveDailyUpdates: 0,
  }
  return {
    project: next,
    log: `《${next.title}》被你残忍太监，评论区哀嚎遍野。`,
    stressDelta: -15,
  }
}

/* ============================================================
 * 灵感注入与作者梗系统
 * ============================================================ */

/** 根据特殊标签生成的专属读者评论池 */
const TAG_COMMENTS: Record<string, string[]> = {
  社畜共鸣: [
    '这段外卖爆单的描写太真实了，作者是不是真去跑过？',
    '我半夜点外卖时也见过这种场景，代入感极强。',
    '社会观察类网文，作者有生活。',
  ],
  荒诞生物: [
    '草，这异界魔兽怎么长得这么像龙猫，还咬人屁股，作者夹带私货是吧？',
    '龙猫：我招谁惹谁了？',
    '这章的萌宠描写笑死我了，建议多写。',
  ],
  亚文化: [
    '女仆咖啡厅那段写得有内味，作者懂二次元。',
    '御宅族的社交仪式被你写活了。',
    '这段是不是作者亲身经历？',
  ],
  家庭修罗场: [
    '三姑六婆逼婚这段，我已经开始窒息了。',
    '作者是不是刚过年回家？太真实了。',
    '县城家庭的压抑感拉满。',
  ],
  黑色幽默: [
    '人生与肛肠的辩证关系，作者是懂黑色幽默的。',
    '笑着笑着就哭了，写稿人共勉。',
    '这章健康警示意义大于文学意义。',
  ],
  情绪核弹: [
    '这段崩溃吐槽太真实了，作者精神状态还好吗？',
    '情绪冲击力极强，给我看破防了。',
    '建议作者去看看心理医生（认真）。',
  ],
  叙事诡计: [
    '跑团神展开！作者是不是资深 KP？',
    '这章的叙事结构爱了，建议改编成模组。',
    'TRPG 玩家狂喜。',
  ],
  代际冲突: [
    '我妈也给我发过这种文章，作者监视我？',
    '父母转发养生文，全国统一。',
    '这段代际冲突写得既好笑又心酸。',
  ],
}

const DEFAULT_TAG_COMMENTS = [
  '这章明显感觉作者加了私货，但意外的带感。',
  '熟悉的现实味道，作者又在取材生活了。',
  '这段写法很特别，评论区有没有人同感？',
]

/** 将一个灵感注入当前章节 */
export function applyInspirationToWriterProject(
  project: WriterProject,
  inspirationId: string,
  _currentDay: number,
  rng: () => number = Math.random,
): InspirationApplyResult | null {
  const inspiration = INSPIRATION_BY_ID[inspirationId]
  if (!inspiration) return null

  let next: WriterProject = { ...project }

  // 1. 三维加成
  next.quality = clamp(
    next.quality + (inspiration.statBonus.quality ?? 0),
    0,
    100,
  )
  next.commerciality = clamp(
    next.commerciality + (inspiration.statBonus.commerciality ?? 0),
    0,
    100,
  )
  next.memeValue = clamp(
    next.memeValue + (inspiration.statBonus.memeValue ?? 0),
    0,
    100,
  )

  // 2. 热度加成（memeValue 加成越高，读者越容易玩梗传播）
  const extraHype = (inspiration.statBonus.memeValue ?? 0) * 1.5
  next.metrics = {
    ...next.metrics,
    currentHype: clamp(next.metrics.currentHype + extraHype, 0, 100),
  }

  // 3. 读者专属评论
  const comments = inspiration.specialTag
    ? TAG_COMMENTS[inspiration.specialTag] ?? DEFAULT_TAG_COMMENTS
    : DEFAULT_TAG_COMMENTS
  const pickedComment = randomPick(comments, rng)

  // 4. 追读与情绪小幅提升（读者喜欢有生活气息的素材）
  next.readerRetention = clamp(next.readerRetention + 0.02, 0, 1)
  next.readerMood = clamp(next.readerMood + 5, -100, 100)

  return {
    project: next,
    consumedInspirationId: inspiration.id,
    readerComments: [
      `注入灵感【${inspiration.name}】：${inspiration.description}`,
      `本章说：${pickedComment}`,
    ],
    extraHype,
  }
}

/* ============== 作者梗（Meme）生成 ============== */

const MEME_NAME_POOLS: Record<
  'LEGEND' | 'INFAMOUS' | 'FUNNY',
  string[]
> = {
  LEGEND: [
    '封神名场面',
    '史诗级反转',
    '全文最高光',
    '读者集体破防章',
    '载入网文史册',
  ],
  INFAMOUS: [
    '太空后空翻',
    '女主突然变成史莱姆',
    '倒赞狂魔',
    '烂尾防坡堤',
    '作者又发疯了',
  ],
  FUNNY: [
    '龙猫咬屁股',
    '痛腚思痛',
    '肛肠医院悟道',
    '亲戚逼婚大逃亡',
    '养生文战争',
  ],
}

/** 根据项目表现生成一个作者梗 */
export function generateMemeFromProject(
  project: WriterProject,
  _currentDay: number,
  rng: () => number = Math.random,
): MemeGenerateResult {
  if (project.stage === 'ABANDONED') {
    const name = randomPick(MEME_NAME_POOLS.INFAMOUS, rng)
    const meme: AuthorMeme = {
      id: `meme_${project.id}_abandon`,
      name,
      originBookTitle: project.title,
      reputation: 'INFAMOUS',
      usageCount: 0,
    }
    return {
      meme,
      log: `《${project.title}》太监后诞生了黑历史梗【${name}】，读者仍在玩梗鞭尸。`,
    }
  }

  if (project.stage === 'COMPLETED') {
    // 根据累计收益和三维判定口碑
    let reputation: 'LEGEND' | 'FUNNY' = 'FUNNY'
    if (project.stats.totalRevenue >= 100_000 && project.quality >= 70) {
      reputation = 'LEGEND'
    } else if (project.memeValue >= 70) {
      reputation = 'FUNNY'
    }

    const name = randomPick(MEME_NAME_POOLS[reputation], rng)
    const meme: AuthorMeme = {
      id: `meme_${project.id}_complete`,
      name,
      originBookTitle: project.title,
      reputation,
      usageCount: 0,
    }
    return {
      meme,
      log:
        reputation === 'LEGEND'
          ? `《${project.title}》完结封神，诞生了传说级名梗【${name}】。`
          : `《${project.title}》完结，留下了搞笑名梗【${name}】供读者回味。`,
    }
  }

  // 连载中因热度爆表也可能诞生梗
  if (project.metrics.currentHype >= 80) {
    const name = randomPick(MEME_NAME_POOLS.FUNNY, rng)
    const meme: AuthorMeme = {
      id: `meme_${project.id}_viral`,
      name,
      originBookTitle: project.title,
      reputation: 'FUNNY',
      usageCount: 0,
    }
    return {
      meme,
      log: `《${project.title}》热度爆表，读者围绕【${name}】开始二创玩梗。`,
    }
  }

  return { meme: null, log: '' }
}

/* ============== 作者等级 ============== */

const RANK_THRESHOLDS: {
  rank: AuthorRank
  minRevenue: number
  minFans: number
}[] = [
  { rank: 'PLATINUM', minRevenue: 1_000_000, minFans: 200_000 },
  { rank: 'GREAT_GOD', minRevenue: 200_000, minFans: 50_000 },
  { rank: 'BOUTIQUE', minRevenue: 50_000, minFans: 10_000 },
  { rank: 'SIGNED', minRevenue: 0, minFans: 0 },
]

/** 根据累计收益和粉丝量计算作者等级 */
export function computeAuthorRank(
  totalRevenue: number,
  totalFans: number,
  hasSignedBook: boolean,
): AuthorRank {
  if (!hasSignedBook) return 'COLT'
  for (const { rank, minRevenue, minFans } of RANK_THRESHOLDS) {
    if (totalRevenue >= minRevenue || totalFans >= minFans) {
      return rank
    }
  }
  return 'COLT'
}

export function getAuthorRankLabel(rank: AuthorRank): string {
  const labels: Record<AuthorRank, string> = {
    COLT: '新人',
    SIGNED: '签约',
    BOUTIQUE: '精品',
    GREAT_GOD: '大神',
    PLATINUM: '白金',
  }
  return labels[rank]
}

/* ============== 跨作品玩梗（Meme Homage）============== */

export interface MemeHomageResult {
  project: WriterProject
  /** 更新后的梗（usageCount 已增加） */
  meme: AuthorMeme
  logs: string[]
  /** 读者骂街警告（usageCount 过高时触发） */
  backlash: boolean
}

/** 将已解锁的作者梗致敬进当前章节 */
export function applyMemeHomage(
  project: WriterProject,
  meme: AuthorMeme,
  currentDay: number,
): MemeHomageResult {
  const usage = meme.usageCount
  let next: WriterProject = { ...project }
  const logs: string[] = []
  let backlash = false

  // 基础：致敬前作本身就带来老粉情怀
  next.wordCount += 3_000
  next.totalChapters += 1
  next.dailyWordCount += 3_000
  next.lastUpdatedDay = currentDay

  if (usage === 0) {
    // 第一次：情怀拉满，订阅暴增
    next.quality = clamp(next.quality + 1, 0, 100)
    next.commerciality = clamp(next.commerciality + 5, 0, 100)
    next.memeValue = clamp(next.memeValue + 10, 0, 100)
    next.readerRetention = clamp(next.readerRetention + 0.08, 0, 1)
    next.readerMood = clamp(next.readerMood + 10, -100, 100)
    next.metrics = {
      ...next.metrics,
      currentHype: clamp(next.metrics.currentHype + 20, 0, 100),
    }
    logs.push(
      `本章致敬前作梗【${meme.name}】，老粉集体泪目，评论区刷屏“文艺复兴”！`,
    )
  } else if (usage === 1) {
    // 第二次：效果减半，但仍正向
    next.commerciality = clamp(next.commerciality + 3, 0, 100)
    next.memeValue = clamp(next.memeValue + 5, 0, 100)
    next.readerRetention = clamp(next.readerRetention + 0.04, 0, 1)
    logs.push(
      `再次致敬【${meme.name}】，部分读者开始嘀咕“是不是没新梗了”。`,
    )
  } else if (usage === 2) {
    // 第三次：边际效应，基本持平
    next.memeValue = clamp(next.memeValue + 2, 0, 100)
    next.readerMood = clamp(next.readerMood - 5, -100, 100)
    logs.push(
      `三度致敬【${meme.name}】，评论区出现“作者是不是只会炒冷饭”的声音。`,
    )
  } else {
    // 第四次及以上：反噬
    next.quality = clamp(next.quality - 3, 0, 100)
    next.memeValue = clamp(next.memeValue + 1, 0, 100)
    next.readerRetention = clamp(next.readerRetention - 0.05, 0, 1)
    next.readerMood = clamp(next.readerMood - 20, -100, 100)
    backlash = true
    logs.push(
      `又双叒叕致敬【${meme.name}】，读者暴怒：“没活了可以咬打火机，别炒冷饭！”`,
    )
  }

  // 更新梗的使用记录
  const updatedMeme: AuthorMeme = {
    ...meme,
    usageCount: meme.usageCount + 1,
    lastUsedDay: currentDay,
  }

  return { project: next, meme: updatedMeme, logs, backlash }
}

/* ============================================================
 * 通用入口（未来扩展其他职业时在此分发）
 * ============================================================ */

export function createProject(
  professionType: 'WRITER',
  input: CreateWriterProjectInput,
): WriterProject {
  if (professionType === 'WRITER') return createWriterProject(input)
  throw new Error(`Unsupported profession type: ${professionType}`)
}
