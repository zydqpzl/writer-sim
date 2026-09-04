// 玩家消费/生活系统数据配置
// 稿费到账后，玩家可选择升级生活、装备、公关或抗风险能力。

import type { HousingTier, LifestyleItem } from '../types/lifestyle'

/** 居住环境：决定月度房租与每日被动 Buff */
export const HOUSING_TIERS: HousingTier[] = [
  {
    id: 'housing_shanty',
    category: 'housing',
    name: '城中村握手楼',
    description: '隔音差、光线暗，但胜在便宜。每日压力自然微增。',
    cost: 800,
    monthlyCost: 800,
    depositMonths: 1,
    traitId: 'trait_housing_shanty',
    replacesCategory: true,
  },
  {
    id: 'housing_shared_master',
    category: 'housing',
    name: '合租独卫主卧',
    description: '终于有了独立卫生间，睡眠和精力上限都提升了。',
    cost: 2_200,
    monthlyCost: 2_200,
    depositMonths: 1,
    traitId: 'trait_housing_shared_master',
    replacesCategory: true,
  },
  {
    id: 'housing_loft',
    category: 'housing',
    name: '精装 Loft 公寓',
    description: '独立书房+落地窗，写作灵感更容易被触发，压力增长放缓。',
    cost: 4_800,
    monthlyCost: 4_800,
    depositMonths: 1,
    traitId: 'trait_housing_loft',
    replacesCategory: true,
  },
  {
    id: 'housing_villa',
    category: 'housing',
    name: '江景创作者独栋',
    description: '全职神级作者的终局住所，彻底免疫噪音与催租压力。',
    cost: 15_000,
    monthlyCost: 15_000,
    depositMonths: 1,
    traitId: 'trait_housing_villa',
    replacesCategory: true,
  },
]

export const HOUSING_BY_ID: Record<string, HousingTier> = Object.fromEntries(
  HOUSING_TIERS.map((h) => [h.id, h]),
)

/** 生产力装备：一次性购买，长期生效 */
export const EQUIPMENT_ITEMS: LifestyleItem[] = [
  {
    id: 'eq_keyboard',
    category: 'equipment',
    name: '客制化静音机械键盘',
    description: '码字手感顺滑，夜间码字也不易累。',
    cost: 1_299,
    traitId: 'trait_eq_keyboard',
  },
  {
    id: 'eq_chair',
    category: 'equipment',
    name: '专业级人体工学网椅',
    description: '久坐不累，有效延缓健康衰减。',
    cost: 2_499,
    traitId: 'trait_eq_chair',
  },
  {
    id: 'eq_monitor',
    category: 'equipment',
    name: '双屏 4K 护眼显示器',
    description: '查资料、对大纲更从容，长篇结构掌控力提升。',
    cost: 3_200,
    traitId: 'trait_eq_monitor',
  },
  {
    id: 'eq_coffee',
    category: 'equipment',
    name: '半自动意式浓缩咖啡机',
    description: '每天一杯特调，精力上限微增，但咖啡因也会让人更焦虑。',
    cost: 899,
    traitId: 'trait_eq_coffee',
  },
]

/** 商业推广与公关：一次性投入，作用于当前作品 */
export const PR_SERVICES: LifestyleItem[] = [
  {
    id: 'pr_silver_alliance',
    category: 'pr',
    name: '自费白银盟',
    description: '自己给自己打赏一个白银盟，瞬间拉高作品热度。',
    cost: 1_000,
    needsActiveWriterProject: true,
  },
  {
    id: 'pr_gold_alliance',
    category: 'pr',
    name: '自费黄金盟',
    description: '豪掷千金冲榜，热度直接爆炸。',
    cost: 10_000,
    needsActiveWriterProject: true,
  },
  {
    id: 'pr_crisis_control',
    category: 'pr',
    name: '危机公关：净化评论区',
    description: '雇佣专业团队控评，平息争议、拉回读者情绪。',
    cost: 600,
    needsActiveWriterProject: true,
  },
]

/** 培训与进修：一次性投入，长期提升作者硬实力 */
export const TRAINING_ITEMS: LifestyleItem[] = [
  {
    id: 'pr_training',
    category: 'training',
    name: '职业作家进修培训班',
    description: '系统学习长篇结构与节奏，作者五维得到长期滋润。',
    cost: 3_800,
    traitId: 'trait_pr_training',
  },
]

/** 保险与抗风险：月度支出，降低突发事件打击 */
export const INSURANCE_ITEMS: LifestyleItem[] = [
  {
    id: 'insurance_social',
    category: 'insurance',
    name: '社保代缴+商业医疗险',
    description: '每月固定支出，生病住院不再一夜返贫。',
    cost: 1_500,
    monthlyCost: 1_500,
    traitId: 'trait_insurance_social',
    replacesCategory: true,
  },
]

/** 身心健康消费：一次性恢复状态 */
export const WELLNESS_ITEMS: LifestyleItem[] = [
  {
    id: 'wellness_physio',
    category: 'wellness',
    name: '深度颈椎理疗',
    description: '专业理疗师把你僵硬的颈椎按回原位，健康大幅恢复。',
    cost: 600,
  },
]

/** 所有生活方式商品（不含住房，住房单独管理） */
export const LIFESTYLE_ITEMS: LifestyleItem[] = [
  ...EQUIPMENT_ITEMS,
  ...PR_SERVICES,
  ...TRAINING_ITEMS,
  ...INSURANCE_ITEMS,
  ...WELLNESS_ITEMS,
]

export const LIFESTYLE_ITEM_BY_ID: Record<string, LifestyleItem> = Object.fromEntries(
  LIFESTYLE_ITEMS.map((i) => [i.id, i]),
)

/** 计算住房的每日房租（按 30 天/月折算） */
export function getDailyRent(housingId: string): number {
  const housing = HOUSING_BY_ID[housingId]
  if (!housing) return 0
  return Math.round(housing.monthlyCost / 30)
}

/** 计算住房的首次入住成本（押金 + 首月/首付） */
export function getHousingMoveInCost(housing: HousingTier): number {
  return housing.monthlyCost * (housing.depositMonths + 1)
}
