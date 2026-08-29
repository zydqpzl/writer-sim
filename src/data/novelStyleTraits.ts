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
