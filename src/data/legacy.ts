import type { GameState, PlayerStats } from '../types/game'
import type { AuthorMeme } from '../types/career'
import type { InspirationCard } from '../types/event'
import { CARD_POOL } from './eventChains'
import { INITIAL_STATE } from './gameData'
import type { Ending } from '../types/game'
import { generateInitialNpcs } from '../engine/platformEngine'
import { aggregateMetaBonuses } from './achievements'
import type { AuthorProfile } from '../types/career'

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
                (patched.authorProfile.skills as Record<string, number>)[k] + v,
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

  return {
    totalLegacyPoints: newTotal,
    unlockedEndingIds,
    unlockedIdentityIds,
    keptCardIds: carriedCardId ? [carriedCardId] : [],
    unlockedMemes: Array.from(memeMap.values()),
    unlockedAchievementIds,
  }
}
