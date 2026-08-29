import type { GrowthCurveConfig, GrowthCurveType } from '../types/career'

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

export const GROWTH_CURVE_BY_ID: Record<GrowthCurveType, GrowthCurveConfig> =
  GROWTH_CURVES.reduce((acc, c) => {
    acc[c.id] = c
    return acc
  }, {} as Record<GrowthCurveType, GrowthCurveConfig>)
