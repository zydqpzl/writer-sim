// 江湖称号 / 读者爱称系统类型定义

import type { WriterStrategy } from './career'

export type AuthorTitleMetric =
  | 'consecutive_daily_updates'
  | 'total_completed_books'
  | 'total_abandoned_books'
  | 'peak_rank'
  | 'word_count'
  | 'quality'
  | 'style_trait'
  | 'manual'

export interface AuthorTitleUnlockCondition {
  type: AuthorTitleMetric
  /** 判定阈值（不同 metric 含义不同） */
  threshold: number
  /** 当 type 为 style_trait 时，指定文风特质 id */
  styleTraitId?: string
}

export interface AuthorTitle {
  id: string
  /** 称号显示名 */
  name: string
  /** 称号说明：获得条件与江湖意义 */
  description: string
  /** 解锁条件 */
  unlockCondition: AuthorTitleUnlockCondition
  /**
   * 对应状态特质 id。
   * 获得称号时自动授予该特质，持续生效其效果（精力/压力上限、每日 health/stress 修正等）。
   */
  traitId: string
  /** 是否允许同时装备多个称号效果（默认 true，通过 activeTraits 自然叠加） */
  stackable?: boolean
}
