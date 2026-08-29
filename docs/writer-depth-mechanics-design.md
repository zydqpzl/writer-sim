# 网络作家深度机制设计稿

## 1. 设计目标

为网络作家职业引入三大核心体验：

1. **作者掌控力 vs 作品复杂度**：好题材不等于好书，作者硬实力决定能否驾驭选题。
2. **偏科神作与文风特质**：允许作品优缺点同样突出，用极致优点覆盖致命缺点。
3. **动态生长曲线**：打破"上线定终身"，支持慢热逆袭、一夜爆火、偏科死忠等多种成长路径。

---

## 2. 类型扩展

### 2.1 作家技能与题材掌握（跨作品持久）

```typescript
// src/types/career.ts

/** 单题材掌握度 */
export interface GenreMastery {
  genre: MainGenre
  /** 完本作品数 */
  completedCount: number
  /** 累计写作字数（万） */
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
```

### 2.2 作品复杂度

```typescript
// src/types/career.ts

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
```

### 2.3 文风特质

```typescript
// src/types/career.ts

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
```

### 2.4 生长曲线

```typescript
// src/types/career.ts

/** 作品生长曲线类型 */
export type GrowthCurveType =
  | 'FAST_FOOD'      // 快餐爆火：前期高热度，后期快速衰减
  | 'SLOW_BURN'      // 慢热逆袭：前期平淡，后期指数爆发
  | 'NICHE_CULT'     // 偏科死忠：流量中等但极度稳定
  | 'STEADY'         // 稳健线性：稳定积累，无大起大落

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
```

### 2.5 口碑池与伏笔蓄力

```typescript
// src/types/career.ts

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
```

### 2.6 WriterProject 扩展

```typescript
// src/types/career.ts

export interface WriterProject extends CareerProject {
  // ... 现有字段 ...

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
}
```

### 2.7 GameState 扩展

```typescript
// src/types/game.ts

export interface GameState {
  // ... 现有字段 ...

  /** 玩家网络作家生涯档案 */
  writerCareerProfile: WriterCareerProfile
}
```

---

## 3. 数据配置扩展

### 3.1 题材复杂度系数

```typescript
// src/data/genres.ts

export interface GenreConfig {
  id: MainGenre
  name: string
  // 现有字段 ...
  /** 题材基础复杂度 0-100 */
  complexityBase: number
}

export const GENRES: GenreConfig[] = [
  {
    id: 'URBAN',
    name: '都市',
    baseCommerciality: 75,
    baseMemePotential: 55,
    qualityWeight: 1.0,
    complexityBase: 25,
    description: '贴近现实，门槛低，容易上手。',
  },
  {
    id: 'XUANHUAN',
    name: '玄幻',
    baseCommerciality: 70,
    baseMemePotential: 65,
    qualityWeight: 1.1,
    complexityBase: 45,
    description: '世界观宏大，需要较强的设定掌控力。',
  },
  {
    id: 'SCI_FI',
    name: '科幻',
    baseCommerciality: 55,
    baseMemePotential: 60,
    qualityWeight: 1.25,
    complexityBase: 60,
    description: '逻辑自洽要求高，对作者知识储备有要求。',
  },
  {
    id: 'HISTORY',
    name: '历史',
    baseCommerciality: 60,
    baseMemePotential: 50,
    qualityWeight: 1.3,
    complexityBase: 65,
    description: '考据与叙事并重，驾驭难度高。',
  },
  {
    id: 'SUSPENSE',
    name: '悬疑',
    baseCommerciality: 50,
    baseMemePotential: 70,
    qualityWeight: 1.35,
    complexityBase: 70,
    description: '伏笔与节奏要求极高，写崩风险大。',
  },
  {
    id: 'GAME',
    name: '游戏',
    baseCommerciality: 65,
    baseMemePotential: 60,
    qualityWeight: 1.05,
    complexityBase: 35,
    description: '规则体系明确，相对容易把控。',
  },
]
```

### 3.2 Tag 复杂度系数

```typescript
// src/data/bookTags.ts

export interface BookTag {
  id: string
  name: string
  // 现有字段 ...
  /** 标签复杂度加成 0-30 */
  complexityAdd: number
  /** 与哪些标签组合会产生额外复杂度惩罚 */
  synergyPenalty?: { tagId: string; penalty: number }[]
}
```

### 3.3 噱头复杂度系数

```typescript
// src/data/gimmicks.ts

export interface Gimmick {
  id: string
  name: string
  // 现有字段 ...
  /** 噱头复杂度加成 0-40 */
  complexityAdd: number
}
```

### 3.4 文风特质数据

```typescript
// src/data/novelStyleTraits.ts

import type { NovelStyleTrait } from '../types/career'

export const NOVEL_STYLE_TRAITS: NovelStyleTrait[] = [
  {
    id: 'cozy_daily',
    name: '极致日常',
    description: '像《生活系游戏》一样，用日常温情打动读者。',
    buff: {
      fanConversionBoost: 3.0,
      wordOfMouthBoost: 1.5,
      readerMoodRecovery: 1.3,
      longTailBoost: 1.4,
    },
    debuff: {
      earlyRetentionPenalty: -0.30,
      commercialityPenalty: 0.7,
      hypeDecayBoost: 1.2,
      viralChancePenalty: 0.6,
    },
    unlockCondition: {
      consecutiveStrategy: 'SETUP',
      minWordCount: 50_000,
      minQuality: 55,
    },
  },
  {
    id: 'lore_master',
    name: '设定狂魔',
    description: '硬核世界观，伏笔深远，适合慢热逆袭。',
    buff: {
      wordOfMouthBoost: 2.0,
      slowBurnQualityThreshold: -10,
      longTailBoost: 1.3,
    },
    debuff: {
      earlyRetentionPenalty: -0.25,
      commercialityPenalty: 0.85,
      hypeDecayBoost: 1.0,
    },
    unlockCondition: {
      consecutiveStrategy: 'SETUP',
      minWordCount: 80_000,
      minQuality: 65,
    },
  },
  {
    id: 'meme_machine',
    name: '梗图发动机',
    description: '每一章都能产出传播性极强的名场面。',
    buff: {
      fanConversionBoost: 1.5,
      wordOfMouthBoost: 1.8,
    },
    debuff: {
      earlyRetentionPenalty: -0.10,
      commercialityPenalty: 0.9,
      hypeDecayBoost: 1.5,
      viralChancePenalty: -0.2,
    },
    unlockCondition: {
      consecutiveStrategy: 'TROPE_INSERT',
      minWordCount: 30_000,
      minQuality: 40,
    },
  },
  {
    id: 'cliffhanger_god',
    name: '断章狗',
    description: '每一章都断在最关键处，追读率极高但读者骂声也大。',
    buff: {
      fanConversionBoost: 1.3,
    },
    debuff: {
      readerMoodRecovery: 0.7,
      hypeDecayBoost: 1.3,
    },
    unlockCondition: {
      consecutiveStrategy: 'CLIFFHANGER',
      minWordCount: 40_000,
      minQuality: 45,
    },
  },
]

export const NOVEL_STYLE_TRAIT_BY_ID: Record<string, NovelStyleTrait> =
  NOVEL_STYLE_TRAITS.reduce((acc, t) => {
    acc[t.id] = t
    return acc
  }, {} as Record<string, NovelStyleTrait>)
```

### 3.5 生长曲线配置

```typescript
// src/data/growthCurves.ts

import type { GrowthCurveConfig } from '../types/career'

export const GROWTH_CURVES: GrowthCurveConfig[] = [
  {
    id: 'FAST_FOOD',
    name: '快餐爆火',
    description: '前期热度高，但衰减快，需要持续整活维持。',
    earlyHypeMultiplier: 1.5,
    lateHypeMultiplier: 0.6,
    decayFactor: 1.4,
    wordOfMouthEfficiency: 0.6,
    breakthroughThreshold: 100,
  },
  {
    id: 'SLOW_BURN',
    name: '慢热逆袭',
    description: '前期平淡，口碑积累到一定程度后指数爆发。',
    earlyHypeMultiplier: 0.5,
    lateHypeMultiplier: 2.5,
    decayFactor: 0.8,
    wordOfMouthEfficiency: 1.5,
    breakthroughThreshold: 100,
  },
  {
    id: 'NICHE_CULT',
    name: '偏科死忠',
    description: '流量中等，但读者粘性极高，收益稳定。',
    earlyHypeMultiplier: 0.8,
    lateHypeMultiplier: 1.1,
    decayFactor: 0.6,
    wordOfMouthEfficiency: 1.2,
    breakthroughThreshold: 100,
  },
  {
    id: 'STEADY',
    name: '稳健线性',
    description: '稳定积累，没有大起大落。',
    earlyHypeMultiplier: 1.0,
    lateHypeMultiplier: 1.0,
    decayFactor: 1.0,
    wordOfMouthEfficiency: 1.0,
    breakthroughThreshold: 100,
  },
]
```

---

## 4. 核心算法

### 4.1 作品复杂度计算

```typescript
// src/engine/careerEngine.ts

function computeNovelComplexity(draft: BookCreationDraft): NovelComplexity {
  const genre = GENRE_BY_ID[draft.genre]
  const tags = draft.tags.map((id) => BOOK_TAG_BY_ID[id]).filter(Boolean)
  const gimmick = GIMMICK_BY_ID[draft.gimmick]

  const genreComplexity = genre.complexityBase
  const gimmickComplexity = gimmick?.complexityAdd ?? 15

  // 标签复杂度：取平均值，但数量越多惩罚越高
  const tagComplexityBase =
    tags.reduce((s, t) => s + (t.complexityAdd ?? 10), 0) / Math.max(1, tags.length)
  const tagCountPenalty = Math.max(0, tags.length - 2) * 8

  // 标签间不兼容惩罚
  let synergyPenalty = 0
  for (let i = 0; i < tags.length; i++) {
    for (let j = i + 1; j < tags.length; j++) {
      const penalties = tags[i].synergyPenalty ?? []
      const match = penalties.find((p) => p.tagId === tags[j].id)
      if (match) synergyPenalty += match.penalty
    }
  }

  const overlapPenalty = tagCountPenalty + synergyPenalty
  const rawScore = genreComplexity + gimmickComplexity + tagComplexityBase + overlapPenalty

  let tier: ComplexityTier = 'SIMPLE'
  if (rawScore >= 80) tier = 'EPIC'
  else if (rawScore >= 60) tier = 'COMPLEX'
  else if (rawScore >= 40) tier = 'MODERATE'

  return {
    score: clamp(rawScore, 0, 100),
    tier,
    breakdown: {
      genre: genreComplexity,
      tags: tagComplexityBase + tagCountPenalty,
      gimmick: gimmickComplexity,
      overlapPenalty: synergyPenalty,
    },
  }
}
```

### 4.2 作者掌控力计算

```typescript
// src/engine/careerEngine.ts

function computeExecutionCapacity(
  draft: BookCreationDraft,
  state: GameState,
): number {
  const genre = GENRE_BY_ID[draft.genre]
  const profile = state.writerCareerProfile
  const mastery = profile.genreMastery[draft.genre]

  // 基础掌控力：由玩家状态决定
  let base = 35

  // 题材熟练度：每本完本 +10，每写 10 万字 +2
  const masteryBonus = Math.min(30,
    mastery.completedCount * 10 +
    Math.floor(mastery.totalWordCount / 100_000) * 2
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
  const moodBonus = Math.max(-15, Math.min(15, (100 - state.stats.stress) / 10))

  // 健康惩罚：虚弱时掉掌控力
  const healthStatus = getHealthStatus(state.stats.health)
  const healthPenalty = healthStatus === 'SICK' ? -15 : healthStatus === 'CRITICAL' ? -30 : 0

  // 太监惩罚：每太监一本书，下一本开局 -3（上限 -15）
  const abandonPenalty = -Math.min(15, profile.totalAbandonedBooks * 3)

  return clamp(
    base + masteryBonus + rankBonus[state.authorRank] + moodBonus + healthPenalty + abandonPenalty,
    10,
    100,
  )
}
```

### 4.3 掌控力校验

```typescript
// src/engine/careerEngine.ts

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

function checkExecutionCapacity(
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
```

### 4.4 生长曲线判定

```typescript
// src/engine/careerEngine.ts

function determineGrowthCurve(
  draft: BookCreationDraft,
  complexity: NovelComplexity,
  traits: string[],
): GrowthCurveType {
  const genre = GENRE_BY_ID[draft.genre]
  const tags = draft.tags.map((id) => BOOK_TAG_BY_ID[id]).filter(Boolean)
  const gimmick = GIMMICK_BY_ID[draft.gimmick]

  // 计算各曲线倾向分
  let slowBurn = complexity.score * 0.6 + genre.qualityWeight * 15
  let fastFood = genre.baseCommerciality * 0.5 + (gimmick?.memePotential ?? 50) * 0.5
  let nicheCult = tags.reduce((s, t) => s + t.riskFactor, 0) / Math.max(1, tags.length)
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
```

### 4.5 口碑池更新（每章更新时）

```typescript
// src/engine/careerEngine.ts

function updateWordOfMouth(
  project: WriterProject,
  action: WriterAction,
  executionCheck: ExecutionCheckResult,
): WordOfMouthPool {
  const curve = GROWTH_CURVE_BY_ID[project.growthCurve]
  const traits = project.activeStyleTraits.map((id) => NOVEL_STYLE_TRAIT_BY_ID[id])

  let delta = 0

  // 高质量铺垫章节蓄水
  if (action.strategy === 'SETUP' && project.quality >= 50) {
    delta += 3 * curve.wordOfMouthEfficiency
  }

  // 高潮章节大量蓄水
  if (action.strategy === 'CLIMAX' && project.quality >= 55) {
    delta += 6 * curve.wordOfMouthEfficiency
  }

  // 掌控力完美时加成
  if (executionCheck.tier === 'PERFECT') delta += 2

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
```

### 4.6 慢热逆袭事件触发

```typescript
// src/engine/careerEngine.ts

function checkSlowBurnBreakthrough(
  project: WriterProject,
  rng: () => number = Math.random,
): { triggered: boolean; hypeBoost: number; logs: string[] } {
  if (project.growthCurve !== 'SLOW_BURN') return { triggered: false, hypeBoost: 0, logs: [] }
  if (!project.wordOfMouth.primed) return { triggered: false, hypeBoost: 0, logs: [] }

  const thresholdQuality = project.activeStyleTraits.includes('lore_master') ? 55 : 65
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
```

### 4.7 一夜爆火事件触发

```typescript
// src/engine/careerEngine.ts

function checkOvernightViral(
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
```

### 4.8 每日发酵中的生长曲线应用

```typescript
// src/engine/careerEngine.ts

function applyGrowthCurve(
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
```

### 4.9 读者留存与死忠粉转化

```typescript
// src/engine/careerEngine.ts

function applyStyleTraitEffects(
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
```

---

## 5. 与现有系统的衔接

### 5.1 修改 createWriterProject

```typescript
export function createWriterProject(input: CreateWriterProjectInput): WriterProject {
  // ... 现有代码 ...

  const complexity = computeNovelComplexity(draft)
  const executionCapacity = computeExecutionCapacity(draft, state)
  const growthCurve = determineGrowthCurve(draft, complexity, draft.styleTraits ?? [])

  return {
    // ... 现有字段 ...
    complexity,
    executionCapacity,
    growthCurve,
    activeStyleTraits: draft.styleTraits ?? [],
    wordOfMouth: { current: 0, primed: false, breakthroughCount: 0, activeEvangelists: 0 },
    foreshadowingCharge: 0,
    chaptersToClimax: 5,
    isViralSurge: false,
    viralSurgeDays: 0,
  }
}
```

### 5.2 修改 applyWriterAction

```typescript
export function applyWriterAction(
  project: WriterProject,
  action: WriterAction,
  currentDay: number,
  state: GameState, // 新增参数
  platform: NovelPlatform = PLATFORMS[project.platformId],
  rng: () => number = Math.random,
): CareerActionResult {
  // ... 现有代码 ...

  // 新增：掌控力校验
  const executionCheck = checkExecutionCapacity(project.complexity, project.executionCapacity)
  next.quality = clamp(next.quality * executionCheck.qualityMultiplier, 0, 100)
  next.readerRetention = clamp(next.readerRetention + executionCheck.retentionDelta, 0, 1)
  if (executionCheck.readerComment && rng() < 0.5) {
    logs.push(`本章说：${executionCheck.readerComment}`)
  }

  // 新增：口碑池更新
  next.wordOfMouth = updateWordOfMouth(next, action, executionCheck)

  // 新增：慢热逆袭检测
  const breakthrough = checkSlowBurnBreakthrough(next, rng)
  if (breakthrough.triggered) {
    next.metrics.currentHype = clamp(
      next.metrics.currentHype + breakthrough.hypeBoost,
      0,
      100,
    )
    next.wordOfMouth = { ...next.wordOfMouth, current: 0, primed: false, breakthroughCount: next.wordOfMouth.breakthroughCount + 1 }
    logs.push(...breakthrough.logs)
  }

  // 新增：一夜爆火检测
  const viral = checkOvernightViral(next, action, rng)
  if (viral.triggered) {
    next.isViralSurge = true
    next.viralSurgeDays = viral.durationDays
    next.metrics.currentHype = clamp(next.metrics.currentHype + viral.hypeBoost, 0, 100)
    logs.push(...viral.logs)
  }

  // 新增：文风特质涌现式觉醒
  const newTrait = tryAwakenStyleTrait(next, state.writerCareerProfile)
  if (newTrait) {
    next.activeStyleTraits = [...next.activeStyleTraits, newTrait.id]
    logs.push(`《${next.title}》逐渐形成了独特的【${newTrait.name}】文风：${newTrait.description}`)
  }

  // ... 现有后续代码 ...
}
```

### 5.3 修改 dailyTickWriter

```typescript
export function dailyTickWriter(
  project: WriterProject,
  currentDay: number,
  platform: NovelPlatform = PLATFORMS[project.platformId],
  trend?: MarketTrend,
  rng: () => number = Math.random,
): CareerDailyResult {
  // ... 现有代码 ...

  // 应用生长曲线
  const bookAgeDays = currentDay - project.dayCreated
  const exposure = applyGrowthCurve(next, baseExposure, bookAgeDays)

  // 应用特质效果
  const traitEffects = applyStyleTraitEffects(next, next.readerRetention, next.metrics.fanConversionRate)
  next.readerRetention = traitEffects.retention
  next.metrics.fanConversionRate = traitEffects.fanConversion

  // 爆火状态倒计时
  if (next.isViralSurge) {
    next.viralSurgeDays -= 1
    if (next.viralSurgeDays <= 0) {
      next.isViralSurge = false
      logs.push(`《${next.title}》的爆火热度开始回落，读者开始用放大镜审视后续质量。`)
    }
  }

  // 口碑自然发酵（每日微量）
  if (next.growthCurve === 'SLOW_BURN' && next.wordCount > 50_000) {
    const curve = GROWTH_CURVE_BY_ID[next.growthCurve]
    next.wordOfMouth.current = clamp(next.wordOfMouth.current + 0.5 * curve.wordOfMouthEfficiency, 0, 100)
    next.wordOfMouth.primed = next.wordOfMouth.current >= curve.breakthroughThreshold
  }

  // ... 现有后续代码 ...
}
```

### 5.4 修改 GameState 初始化

```typescript
// src/data/gameData.ts

export const INITIAL_STATE: GameState = {
  // ... 现有字段 ...
  writerCareerProfile: {
    genreMastery: {
      XUANHUAN: { genre: 'XUANHUAN', completedCount: 0, totalWordCount: 0, proficiency: 0 },
      URBAN: { genre: 'URBAN', completedCount: 0, totalWordCount: 0, proficiency: 0 },
      SCI_FI: { genre: 'SCI_FI', completedCount: 0, totalWordCount: 0, proficiency: 0 },
      SUSPENSE: { genre: 'SUSPENSE', completedCount: 0, totalWordCount: 0, proficiency: 0 },
      GAME: { genre: 'GAME', completedCount: 0, totalWordCount: 0, proficiency: 0 },
      HISTORY: { genre: 'HISTORY', completedCount: 0, totalWordCount: 0, proficiency: 0 },
    },
    unlockedStyleTraits: [],
    totalCompletedBooks: 0,
    totalAbandonedBooks: 0,
  },
}
```

### 5.5 完结/太监时更新生涯档案

```typescript
function updateWriterCareerProfile(
  profile: WriterCareerProfile,
  project: WriterProject,
  completed: boolean,
): WriterCareerProfile {
  const mastery = profile.genreMastery[project.genre]
  const nextProfile = { ...profile }

  nextProfile.genreMastery[project.genre] = {
    ...mastery,
    totalWordCount: mastery.totalWordCount + project.wordCount,
    completedCount: completed ? mastery.completedCount + 1 : mastery.completedCount,
    proficiency: clamp(
      mastery.proficiency +
        (completed ? 10 : 2) +
        Math.floor(project.wordCount / 100_000),
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
```

---

## 6. UI 反馈设计

### 6.1 WriterProjectPanel 新增展示区域

```tsx
// src/components/WriterProjectPanel.tsx

<section className="space-y-3">
  {/* 复杂度 vs 掌控力 */}
  <div className="rounded-xl bg-slate-50 p-3">
    <div className="flex items-center justify-between text-xs">
      <span className="font-medium text-slate-600">作品复杂度</span>
      <span className="font-semibold text-slate-800">{project.complexity.score}/100</span>
    </div>
    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-rose-400"
        style={{ width: `${project.complexity.score}%` }}
      />
    </div>
    <div className="mt-2 flex items-center justify-between text-xs">
      <span className="font-medium text-slate-600">作者掌控力</span>
      <span className="font-semibold text-slate-800">{project.executionCapacity}/100</span>
    </div>
    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
      <div
        className={[
          'h-full rounded-full',
          project.executionCapacity >= project.complexity.score ? 'bg-emerald-500' : 'bg-amber-500',
        ].join(' ')}
        style={{ width: `${project.executionCapacity}%` }}
      />
    </div>
    <p className="mt-2 text-[11px] text-slate-500">
      {project.executionCapacity >= project.complexity.score
        ? '掌控力充足，设定能够完美落地。'
        : project.executionCapacity >= project.complexity.score * 0.8
          ? '基本能驾驭，但偶有瑕疵。'
          : project.executionCapacity >= project.complexity.score * 0.65
            ? '掌控力略显不足，读者可能会吐槽节奏。'
            : '严重驾驭不住，毒点风险极高！'}
    </p>
  </div>

  {/* 生长曲线 */}
  <div className="flex items-center gap-2">
    <span className="chip bg-violet-50 text-violet-700">
      {GROWTH_CURVE_BY_ID[project.growthCurve].name}
    </span>
    <span className="text-[11px] text-slate-500">
      {GROWTH_CURVE_BY_ID[project.growthCurve].description}
    </span>
  </div>

  {/* 口碑池 / 伏笔蓄力 */}
  {project.growthCurve === 'SLOW_BURN' && (
    <div className="rounded-xl bg-amber-50/70 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-amber-800">伏笔蓄力</span>
        <span className="font-semibold text-amber-900">
          {Math.round(project.wordOfMouth.current)}%
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-amber-200/60">
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{ width: `${project.wordOfMouth.current}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-amber-700">
        {project.wordOfMouth.primed
          ? '口碑蓄力已满，大高潮随时可能引爆自来水！'
          : `距离口碑爆发还差 ${Math.round(100 - project.wordOfMouth.current)} 点蓄力。继续高质量铺垫。`}
      </p>
    </div>
  )}

  {/* 爆火状态 */}
  {project.isViralSurge && (
    <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
      <span className="font-semibold">🔥 爆火进行中</span>
      <span className="ml-2">剩余 {project.viralSurgeDays} 天。抓紧维稳，否则热度会快速滑落。</span>
    </div>
  )}

  {/* 文风特质 */}
  {project.activeStyleTraits.length > 0 && (
    <div className="flex flex-wrap gap-1.5">
      {project.activeStyleTraits.map((id) => {
        const trait = NOVEL_STYLE_TRAIT_BY_ID[id]
        return (
          <span key={id} className="chip bg-sky-50 text-sky-700" title={trait.description}>
            {trait.name}
          </span>
        )
      })}
    </div>
  )}
</section>
```

### 6.2 WriterWorkModal 开书时新增选择

```tsx
// src/components/WriterWorkModal.tsx

<section>
  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
    文风倾向（可选）
  </div>
  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
    {NOVEL_STYLE_TRAITS.filter((t) => state.writerCareerProfile.unlockedStyleTraits.includes(t.id))
      .map((trait) => (
        <button
          key={trait.id}
          type="button"
          onClick={() => toggleStyleTrait(trait.id)}
          className={[
            'rounded-xl border p-3 text-left text-xs',
            draft.styleTraits?.includes(trait.id)
              ? 'border-brand-300 bg-brand-50'
              : 'border-slate-200 bg-white',
          ].join(' ')}
        >
          <div className="font-semibold text-slate-800">{trait.name}</div>
          <p className="mt-1 text-[10px] text-slate-500">{trait.description}</p>
        </button>
      ))}
  </div>
  {state.writerCareerProfile.unlockedStyleTraits.length === 0 && (
    <p className="mt-2 text-[11px] text-slate-400">
      还没有解锁任何文风特质。在写作过程中会逐渐形成。
    </p>
  )}
</section>
```

---

## 7. 实现步骤建议

1. **类型层**：扩展 `src/types/career.ts` 和 `src/types/game.ts`。
2. **数据层**：新增 `src/data/novelStyleTraits.ts`、`src/data/growthCurves.ts`，扩展 `genres.ts`/`bookTags.ts`/`gimmicks.ts` 的复杂度字段。
3. **引擎层**：在 `src/engine/careerEngine.ts` 中实现复杂度、掌控力、生长曲线、口碑池、事件触发算法。
4. **状态层**：修改 `src/data/gameData.ts` 的 `INITIAL_STATE` 和 `useGame.ts` 中的项目创建/动作/每日结算逻辑。
5. **UI 层**：更新 `WriterProjectPanel` 和 `WriterWorkModal`。
6. **测试层**：运行构建并用浏览器验证开书、策略执行、时段推进、慢热逆袭/一夜爆火事件触发。

---

## 8. 预期游戏体验变化

- **快餐爆更流**：选择低复杂度 + 高商业性 + 梗图发动机，前期赚快钱，但长期可能陷入热度衰减。
- **匠人慢热流**：选择高复杂度 + 设定狂魔，忍受前期清苦，押宝后期一书封神。
- **偏科死忠流**：选择日常流/温馨治愈，订阅不高但死忠粉打赏稳定，完结后长尾收益可观。
- **邪门黑马流**：选择高风险 tag + 高难度题材，掌控不住就崩，掌控住了就是神作。
