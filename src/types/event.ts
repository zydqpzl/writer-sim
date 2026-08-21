// 事件链 + 灵感卡牌系统类型定义

/** 灵感卡牌稀有度 */
export type CardQuality = '普通' | '稀有' | '史诗' | '传说'

/** 灵感卡牌适用题材 */
export type CardGenre = '人物观察' | '喜剧' | '情感' | '世界观' | '哲思' | '社会观察'

/** 灵感卡牌（模板） */
export interface InspirationCard {
  /** 卡牌模板 id */
  id: string
  name: string
  description: string
  quality: CardQuality
  genre: CardGenre
  /**
   * 使用此卡牌进行创作时的爆火概率（0-1）。
   * 若未设置，则使用全局默认 CREATION_VIRAL_RATE。
   */
  viralRate?: number
  /**
   * 作品爆火时额外扣除的父母满意度（黑色幽默代价）。
   * 仅在爆火时生效，平平无奇不触发。
   */
  familyApprovalCost?: number
}

/** 事件选项对玩家属性的影响 */
export interface EventEffect {
  savings?: number
  health?: number
  energy?: number
  stress?: number
  familyApproval?: number
  influence?: number
  fans?: number
  /** 选中后授予的状态特质 id（来自 TRAIT_POOL） */
  grantTrait?: string
  /** 对当前进行中的网文项目的影响（仅对 WRITER 职业生效） */
  writerProject?: {
    quality?: number
    commerciality?: number
    memeValue?: number
    readerRetention?: number
    readerMood?: number
    wordCount?: number
    hype?: number
    controversy?: number
  }
  /** 获得的写作灵感 id（来自 INSPIRATION_POOL） */
  getInspiration?: string
}

/** 事件链中的一个选项 */
export interface EventOption {
  text: string
  effect?: EventEffect
  /** 获得的灵感卡牌 id（来自 CARD_POOL） */
  getCard?: string
  /** 下一阶段 stepId；null 表示事件链结束 */
  nextStepId: string | null
}

/** 事件链中的一个阶段 */
export interface EventStep {
  stepId: string
  title: string
  text: string
  options: EventOption[]
}

/** 事件链 */
export interface EventChain {
  id: string
  title: string
  icon: string
  /** 全部阶段（含分支），按 stepId 索引跳转 */
  steps: EventStep[]
  /** 单次游玩的最大深度（用于进度条展示） */
  maxDepth: number
}
