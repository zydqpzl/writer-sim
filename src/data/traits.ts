import type { StatusTrait } from '../types/game'

/**
 * 状态特质模板池：按 id 索引。
 * 模板里 durationDays 为默认时长；运行时通过 grantTrait 复制并独立计数。
 *
 * 设计约定：
 * - BUFF 多为减压/增上限；DEBUFF 多为掉健康/升压
 * - durationDays 不宜过长（2-4 天），保证玩家能感知到状态流转
 * - effects 内的字段都是"每日"或"持续修正"，不是一次性结算
 */
const TRAIT_TEMPLATES: StatusTrait[] = [
  {
    id: 'trait_calm_reptile',
    name: '冷血动物般平静',
    type: 'BUFF',
    description: '异宠店的守宫陪了你一下午，那种缓慢冷漠的气质传染给了你。压力上限提升，每日自然降压。',
    durationDays: 3,
    effects: {
      stressMaxDelta: 50, // 压力上限 +50（更抗崩）
      stressDeltaPerDay: -5, // 每日 -5 压力
    },
  },
  {
    id: 'trait_bitten',
    name: '被咬伤',
    type: 'DEBUFF',
    description: '被暴走守宫一口咬穿了指节，伤口红肿。健康持续下滑，重活儿干不了。',
    durationDays: 2,
    effects: {
      healthDeltaPerDay: -5, // 每日 -5 健康
      stressDeltaPerDay: 3, // 伤口隐隐作痛，每日 +3 压力
      disableActions: ['parttime'], // 伤手期间禁止跑外卖
    },
  },
  {
    id: 'trait_hardcore_maniac',
    name: '硬核狂人',
    type: 'BUFF',
    description: '对黑粉硬刚到底，死忠粉觉得你够爷们。压力上限提升，但每日压力也更高。',
    durationDays: 4,
    effects: {
      stressMaxDelta: 40,
      stressDeltaPerDay: 5,
    },
  },
  {
    id: 'trait_mouth_gun',
    name: '嘴炮狂人',
    type: 'BUFF',
    description: '你在单章里写小作文对线，话题度拉满。写作时爆点提升，但争议隐患同步增加。',
    durationDays: 3,
    effects: {
      energyMaxDelta: -10,
      stressDeltaPerDay: -3, // 骂爽了，每日降压
    },
  },
]

/** 按 id 索引的特质模板池（运行时复制使用，不直接持有引用） */
export const TRAIT_POOL: Record<string, StatusTrait> = Object.fromEntries(
  TRAIT_TEMPLATES.map((t) => [t.id, t]),
)

/**
 * 取一份特质模板的拷贝（避免运行时直接修改常量）。
 * 同 id 特质再次授予时刷新持续天数（取较新值）。
 */
export function cloneTrait(traitId: string): StatusTrait | null {
  const tpl = TRAIT_POOL[traitId]
  if (!tpl) return null
  const effectsCopy: StatusTrait['effects'] = { ...tpl.effects }
  if (tpl.effects.disableActions) {
    effectsCopy.disableActions = [...tpl.effects.disableActions]
  }
  return {
    ...tpl,
    effects: effectsCopy,
  }
}
