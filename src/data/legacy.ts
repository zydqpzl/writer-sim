import type { GameState, PlayerStats, LogKind } from '../types/game'
import type { AuthorMeme, MainGenre } from '../types/career'
import type { InspirationCard } from '../types/event'
import { CARD_POOL } from './eventChains'
import { INITIAL_STATE } from './gameData'
import type { Ending, EndingTag } from '../types/game'
import { generateInitialNpcs } from '../engine/platformEngine'
import { aggregateMetaBonuses } from './achievements'
import type { AuthorProfile } from '../types/career'
import { isWriterProject } from '../types/career'

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

/** 上一局的浓缩历史，用于影响下一局开局 */
export interface RunSummary {
  /** 结局 id */
  endingId: string
  /** 结局类型标签 */
  endingTag: EndingTag
  /** 本局最高粉丝数 */
  peakFans: number
  /** 本局累计收益 */
  totalRevenue: number
  /** 完本数 */
  completedBooks: number
  /** 太监数 */
  abandonedBooks: number
  /** 总字数 */
  totalWordCount: number
  /** 最出名作品 */
  famousProject?: {
    title: string
    genre: MainGenre
  }
  /** 黑历史标签：决定下一局开局事件 */
  blackHistory?:
    | 'abandon_king'
    | 'controversy_king'
    | 'one_hit_wonder'
    | 'poverty_master'
    | 'steady_master'
}

/** 遗产档案（跨局持久化） */
export interface LegacyProfile {
  /** 累计获得的人生回响点数 */
  totalLegacyPoints: number
  /** 已解锁的结局 id */
  unlockedEndingIds: string[]
  /** 已解锁的开局身份 id */
  unlockedIdentityIds: string[]
  /** 选择携带到下一局的卡牌 id */
  keptCardIds: string[]
  /** 已解锁的作者梗/名场面（跨局持久化） */
  unlockedMemes: AuthorMeme[]
  /** 已解锁的成就 id（跨局持久化） */
  unlockedAchievementIds: string[]
  /** 上一局总结，为空表示是第一局 */
  lastRunSummary?: RunSummary
  /** 已完成的总局数 */
  totalRuns: number
}

/** 开局身份定义 */
export interface StartingIdentity {
  id: string
  name: string
  desc: string
  /** 解锁所需回响点数 */
  cost: number
  /** 对初始状态的覆盖补丁 */
  patch: Partial<Omit<GameState, 'stats'>> & { stats?: Partial<PlayerStats> }
}

export const STARTING_IDENTITIES: StartingIdentity[] = [
  {
    id: 'default',
    name: '刚毕业应届生',
    desc: '存款 8000，轻度焦虑，普普通通但充满可能。',
    cost: 0,
    patch: {},
  },
  {
    id: 'retired_kol',
    name: '自带 10w 粉丝的退役选手',
    desc: '曾经红过，手头只剩 3000 块，压力拉满，但粉丝还在。',
    cost: 500,
    patch: {
      stats: { fans: 100000, savings: 3000, stress: 150 },
    },
  },
  {
    id: 'hometown_rich',
    name: '家里有房的县城贵公子',
    desc: '开局就在老家，存款 15000，父母满意度 80，少了房租焦虑。',
    cost: 800,
    patch: {
      location: 'hometown',
      stats: { savings: 15000, familyApproval: 80 },
    },
  },
  {
    id: 'otaku_master',
    name: '重度社恐的二次元大触',
    desc: '亚文化圈内声望 30，虽然不擅社交，但懂梗就是生产力。',
    cost: 600,
    patch: {
      subcultureReputation: 30,
    },
  },
]

export const IDENTITY_BY_ID: Record<string, StartingIdentity> =
  STARTING_IDENTITIES.reduce((acc, i) => {
    acc[i.id] = i
    return acc
  }, {} as Record<string, StartingIdentity>)

/** 可携带的卡牌稀有度（史诗/传说） */
export function isCarryableCard(card: InspirationCard): boolean {
  return card.quality === '史诗' || card.quality === '传说'
}

/** 根据结局标签计算获得的人生回响点数 */
export function legacyPointsFor(ending: Ending): number {
  switch (ending.tag) {
    case 'triumph':
      return 300
    case 'compromise':
      return 200
    case 'fail':
      return 100
    case 'open':
      return 150
  }
}

const LEGACY_KEY = 'freelancer-survival-legacy-v1'

export function loadLegacyProfile(): LegacyProfile {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as LegacyProfile
      return {
    totalLegacyPoints: parsed.totalLegacyPoints ?? 0,
    unlockedEndingIds: parsed.unlockedEndingIds ?? [],
    unlockedIdentityIds: parsed.unlockedIdentityIds ?? ['default'],
    keptCardIds: parsed.keptCardIds ?? [],
    unlockedMemes: parsed.unlockedMemes ?? [],
    unlockedAchievementIds: parsed.unlockedAchievementIds ?? [],
    lastRunSummary: parsed.lastRunSummary,
    totalRuns: parsed.totalRuns ?? 0,
  }
    }
  } catch {
    // ignore
  }
  return {
    totalLegacyPoints: 0,
    unlockedEndingIds: [],
    unlockedIdentityIds: ['default'],
    keptCardIds: [],
    unlockedMemes: [],
    unlockedAchievementIds: [],
    totalRuns: 0,
  }
}

export function saveLegacyProfile(profile: LegacyProfile): void {
  try {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(profile))
  } catch {
    // ignore
  }
}

/** 将身份补丁、携带卡牌与成就元加成合并进初始状态 */
export function buildInitialState(
  identity: StartingIdentity,
  keptCards: InspirationCard[],
  profile?: LegacyProfile,
): GameState {
  const base: GameState = JSON.parse(JSON.stringify(INITIAL_STATE))
  const patched: GameState = { ...base }

  if (identity.patch.location) patched.location = identity.patch.location
  if (identity.patch.subcultureReputation !== undefined)
    patched.subcultureReputation = identity.patch.subcultureReputation
  if (identity.patch.examProgress !== undefined)
    patched.examProgress = identity.patch.examProgress
  if (identity.patch.stats) {
    patched.stats = { ...patched.stats, ...identity.patch.stats }
  }

  // 携带卡牌：最多 1 张，放在开局背包里
  if (keptCards.length > 0) {
    patched.inventory = keptCards.map((c) => ({ ...c }))
  }

  // 跨局继承已解锁的作者梗（每局独立维护 usageCount，从 0 开始累加）
  if (identity.patch.unlockedMemes) {
    patched.unlockedMemes = identity.patch.unlockedMemes.map((m) => ({
      ...m,
      usageCount: 0,
      lastUsedDay: undefined,
    }))
  }

  // 应用成就元加成
  if (profile && profile.unlockedAchievementIds.length > 0) {
    const bonus = aggregateMetaBonuses(profile.unlockedAchievementIds)
    patched.stats.savings += bonus.startingSavingsDelta
    patched.stats.energy += bonus.startingEnergyMaxDelta
    patched.stats.stress += bonus.startingStressMaxDelta
    patched.stats.familyApproval = Math.min(
      100,
      patched.stats.familyApproval + (bonus.startingFamilyApprovalDelta ?? 0),
    )

    if (Object.keys(bonus.startingSkillDelta).length > 0) {
      patched.authorProfile = {
        ...patched.authorProfile,
        skills: {
          ...patched.authorProfile.skills,
          ...Object.fromEntries(
            Object.entries(bonus.startingSkillDelta).map(([k, v]) => [
              k,
              Math.min(
                100,
                (patched.authorProfile.skills as unknown as Record<string, number>)[k] + v,
              ),
            ]),
          ),
        } as AuthorProfile['skills'],
      }
    }

    // 成就奖励的额外灵感卡牌（不占用遗产携带位，可直接获得）
    if (bonus.startingCards && bonus.startingCards.length > 0) {
      const achievementCards = bonus.startingCards
        .map((id) => CARD_POOL[id])
        .filter((c): c is InspirationCard => !!c)
      if (achievementCards.length > 0) {
        patched.inventory = [...patched.inventory, ...achievementCards.map((c) => ({ ...c }))]
      }
    }
  }

  // 初始化网文江湖：每个平台生成 4 名 NPC 同行
  patched.platformEcosystem = {
    ...patched.platformEcosystem,
    npcs: generateInitialNpcs(4),
  }

  return patched
}

/** 从卡牌池解析携带卡牌 */
export function resolveKeptCards(keptCardIds: string[]): InspirationCard[] {
  return keptCardIds
    .map((id) => CARD_POOL[id])
    .filter((c): c is InspirationCard => !!c && isCarryableCard(c))
}

/** 结算一局后更新遗产档案 */
export function settleLegacy(
  profile: LegacyProfile,
  ending: Ending,
  carriedCardId: string | null,
  currentMemes: AuthorMeme[] = [],
  newAchievementIds: string[] = [],
  state?: GameState,
): LegacyProfile {
  const points = legacyPointsFor(ending)
  const unlockedEndingIds = profile.unlockedEndingIds.includes(ending.id)
    ? profile.unlockedEndingIds
    : [...profile.unlockedEndingIds, ending.id]

  // 自动解锁点数足够的身份（所有满足 cost <= total 的）
  const newTotal = profile.totalLegacyPoints + points
  const unlockedIdentityIds = Array.from(
    new Set([
      ...profile.unlockedIdentityIds,
      ...STARTING_IDENTITIES.filter((i) => i.cost <= newTotal).map((i) => i.id),
    ]),
  )

  // 合并本局解锁的作者梗（同 id 累加 usageCount）
  const memeMap = new Map<string, AuthorMeme>()
  for (const m of profile.unlockedMemes) {
    memeMap.set(m.id, { ...m })
  }
  for (const m of currentMemes) {
    const existing = memeMap.get(m.id)
    if (existing) {
      existing.usageCount += m.usageCount
    } else {
      memeMap.set(m.id, { ...m })
    }
  }

  // 合并本局新解锁成就
  const unlockedAchievementIds = Array.from(
    new Set([...profile.unlockedAchievementIds, ...newAchievementIds]),
  )

  const lastRunSummary = state ? deriveRunSummary(state, ending) : undefined

  return {
    totalLegacyPoints: newTotal,
    unlockedEndingIds,
    unlockedIdentityIds,
    keptCardIds: carriedCardId ? [carriedCardId] : [],
    unlockedMemes: Array.from(memeMap.values()),
    unlockedAchievementIds,
    lastRunSummary,
    totalRuns: profile.totalRuns + 1,
  }
}

export function deriveRunSummary(state: GameState, ending: Ending): RunSummary {
  const projects = state.careerProjects.filter(isWriterProject)
  const peakFans = Math.max(
    state.stats.fans,
    ...projects.map((p) => p.stats.totalFansGained),
  )
  const totalRevenue = Object.values(state.writerCareerProfile.platformCareer).reduce(
    (s, p) => s + (p.totalRevenue ?? 0),
    0,
  )
  const totalWordCount = projects.reduce((s, p) => s + p.wordCount, 0)
  const completed = state.writerCareerProfile.totalCompletedBooks
  const abandoned = state.writerCareerProfile.totalAbandonedBooks

  const famous = projects.reduce<import('../types/career').WriterProject | undefined>(
    (best, p) => {
      if (!best || p.stats.totalFansGained > best.stats.totalFansGained) return p
      return best
    },
    undefined,
  )

  let blackHistory: RunSummary['blackHistory'] = undefined
  if (abandoned >= 2 && abandoned > completed) blackHistory = 'abandon_king'
  else if (completed >= 2 && abandoned === 0) blackHistory = 'steady_master'
  else if (peakFans >= 1000 && totalRevenue < 1000) blackHistory = 'one_hit_wonder'
  else if (totalRevenue < 500 && state.day >= 30) blackHistory = 'poverty_master'

  return {
    endingId: ending.id,
    endingTag: ending.tag,
    peakFans,
    totalRevenue,
    completedBooks: completed,
    abandonedBooks: abandoned,
    totalWordCount,
    famousProject: famous
      ? { title: famous.title, genre: famous.genre }
      : undefined,
    blackHistory,
  }
}

export interface OpeningEffectResult {
  statDelta: Partial<PlayerStats>
  subcultureReputationDelta: number
  logs: { kind: LogKind; text: string }[]
  popup?: {
    title: string
    text: string
    tone: 'good' | 'bad' | 'neutral' | 'critical'
    effects: string[]
  }
}

export function applyLegacyOpeningEffects(
  state: GameState,
  summary?: RunSummary,
): { state: GameState; result: OpeningEffectResult } {
  if (!summary) {
    return {
      state,
      result: { statDelta: {}, subcultureReputationDelta: 0, logs: [] },
    }
  }

  const delta: Partial<PlayerStats> = {}
  let subcultureDelta = 0
  const logs: OpeningEffectResult['logs'] = []
  const effects: string[] = []

  const {
    completedBooks,
    abandonedBooks,
    peakFans,
    totalRevenue,
    famousProject,
    blackHistory,
    endingTag,
  } = summary

  if (famousProject && peakFans >= 500) {
    const fanBonus = Math.min(50, Math.floor(peakFans * 0.02))
    delta.fans = (delta.fans ?? 0) + fanBonus
    delta.influence = (delta.influence ?? 0) + Math.min(10, Math.floor(fanBonus / 5))
    logs.push({
      kind: 'celebrate',
      text: `老读者还记得你上本《${famousProject.title}》，开局时已有 ${fanBonus} 人闻讯而来。`,
    })
    effects.push(`粉丝 +${fanBonus}`)
  }

  if (completedBooks >= 1) {
    delta.stress = (delta.stress ?? 0) - 3
    logs.push({ kind: 'gain', text: '完本经历让你心态更稳，开局压力降低。' })
    effects.push('压力 -3')
  }

  if (abandonedBooks >= 1) {
    const famPenalty = Math.min(10, abandonedBooks * 3)
    delta.familyApproval = (delta.familyApproval ?? 0) - famPenalty
    delta.stress = (delta.stress ?? 0) + 2
    logs.push({
      kind: 'loss',
      text: `论坛里有人扒出你太监了 ${abandonedBooks} 本书，父母看你的眼神更复杂了。`,
    })
    effects.push(`父母 -${famPenalty}`)
  }

  if (blackHistory === 'abandon_king') {
    delta.familyApproval = (delta.familyApproval ?? 0) - 5
    delta.stress = (delta.stress ?? 0) + 5
    logs.push({
      kind: 'loss',
      text: '“切书狂魔”的名号还在江湖流传，读者对你新书的第一反应是先看会不会太监。',
    })
    effects.push('压力 +5')
  }

  if (blackHistory === 'one_hit_wonder') {
    delta.fans = (delta.fans ?? 0) + 20
    delta.stress = (delta.stress ?? 0) + 5
    logs.push({
      kind: 'event',
      text: '上本红了但没怎么变现，这次你既兴奋又焦虑。',
    })
    effects.push('粉丝 +20，压力 +5')
  }

  if (blackHistory === 'steady_master') {
    delta.energy = (delta.energy ?? 0) + 5
    delta.stress = (delta.stress ?? 0) - 2
    logs.push({
      kind: 'gain',
      text: '你是有完本记录的靠谱作者，编辑愿意多给你一点耐心。',
    })
    effects.push('精力 +5，压力 -2')
  }

  if (blackHistory === 'poverty_master') {
    delta.savings = (delta.savings ?? 0) - 500
    delta.stress = (delta.stress ?? 0) + 3
    logs.push({ kind: 'loss', text: '上一局穷到吃土，你发誓这一局必须先活下去。' })
    effects.push('存款 -500')
  }

  if (totalRevenue >= 10000) {
    const moneyBonus = Math.min(3000, Math.floor(totalRevenue * 0.1))
    delta.savings = (delta.savings ?? 0) + moneyBonus
    logs.push({
      kind: 'gain',
      text: `上一局存下的稿费让你开局多了 ${moneyBonus} 块存款。`,
    })
    effects.push(`存款 +${moneyBonus}`)
  }

  if (endingTag === 'fail') {
    delta.stress = (delta.stress ?? 0) + 5
    delta.energy = (delta.energy ?? 0) + 5
    logs.push({
      kind: 'system',
      text: '失败的上一局让你憋着一股劲，但也睡得不太安稳。',
    })
    effects.push('压力 +5，精力 +5')
  }

  const nextStats = { ...state.stats }
  for (const [k, v] of Object.entries(delta)) {
    if (v === undefined) continue
    const key = k as keyof PlayerStats
    if (key === 'fans') nextStats.fans = clamp(nextStats.fans + v, 0, 999_999)
    else if (key === 'savings') nextStats.savings = clamp(nextStats.savings + v, -5000, 999_999)
    else nextStats[key] = clamp(nextStats[key] + v, 0, 200)
  }

  const popup =
    logs.length > 0
      ? {
          title: '上一局的回响',
          text: '你带着上一局的痕迹重新开始，江湖还没忘记你。',
          tone: 'neutral' as const,
          effects,
        }
      : undefined

  return {
    state: {
      ...state,
      stats: nextStats,
      subcultureReputation: clamp(state.subcultureReputation + subcultureDelta, 0, 100),
    },
    result: { statDelta: delta, subcultureReputationDelta: subcultureDelta, logs, popup },
  }
}
