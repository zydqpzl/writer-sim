// 玩家消费/生活系统类型定义
// 稿费变现后，玩家可在居住环境、生产力装备、商业推广与抗风险之间做选择。

export type LifestyleCategory =
  | 'housing'
  | 'equipment'
  | 'pr'
  | 'insurance'
  | 'training'
  | 'wellness'

export interface LifestyleItem {
  id: string
  category: LifestyleCategory
  /** 显示名 */
  name: string
  /** 详细说明 */
  description: string
  /** 一次性购买/首付成本 */
  cost: number
  /** 仅用于住房/保险：月度持续支出 */
  monthlyCost?: number
  /** 仅用于住房：押几付几的“几”个月（首付成本 = cost * depositMonths） */
  depositMonths?: number
  /**
   * 对应状态特质 id。
   * 购买后授予该特质，长期生效其效果（精力/压力上限、每日 health/stress 修正等）。
   */
  traitId?: string
  /** 是否需要存在进行中的网文项目（PR 买量类） */
  needsActiveWriterProject?: boolean
  /** 是否替换同类别旧项（如住房只能同时住一套） */
  replacesCategory?: boolean
}

/** 住房单独列表：决定每日房租与居住 Buff */
export interface HousingTier extends LifestyleItem {
  category: 'housing'
  monthlyCost: number
  depositMonths: number
}
