import type { AuthorSkills } from './career'

/**
 * 成就元加成：解锁后永久生效，影响下一局开局状态。
 */
export interface AchievementMetaBonus {
  /** 初始存款加成（元） */
  startingSavingsDelta?: number
  /** 初始精力上限加成 */
  startingEnergyMaxDelta?: number
  /** 初始压力上限加成 */
  startingStressMaxDelta?: number
  /** 作者五维技能初始加成 */
  startingSkillDelta?: Partial<AuthorSkills>
  /** 开局额外携带的灵感卡牌 id */
  startingCards?: string[]
  /** 父母满意度初始加成 */
  startingFamilyApprovalDelta?: number
}

/**
 * 成就（Medal）：单局旅途中解锁的里程碑/名场面。
 * 解锁后永久保存在成就墙，部分成就带有跨局元加成。
 */
export interface GameAchievement {
  id: string
  title: string
  description: string
  icon: string
  /** 未解锁时的提示文本 */
  hint: string
  /** 是否为隐藏成就（未解锁时不显示详情） */
  hidden?: boolean
  /** 元加成说明（展示用） */
  metaBonus?: string
  /** 具体元加成数值 */
  metaBonusValue?: AchievementMetaBonus
}
