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

  /* ============== 居住环境（长期 Buff） ============== */
  {
    id: 'trait_housing_shanty',
    name: '蜗居城中村',
    type: 'DEBUFF',
    description: '隔音差、空间压抑，每日压力自然累积。',
    durationDays: 999,
    effects: {
      stressDeltaPerDay: 2,
    },
  },
  {
    id: 'trait_housing_shared_master',
    name: '合租主卧',
    type: 'BUFF',
    description: '独立卫浴带来基本尊严，精力上限与睡眠恢复都有提升。',
    durationDays: 999,
    effects: {
      energyMaxDelta: 10,
      stressDeltaPerDay: -2,
      healthDeltaPerDay: 1,
    },
  },
  {
    id: 'trait_housing_loft',
    name: 'Loft 创作空间',
    type: 'BUFF',
    description: '独立书房与落地窗让灵感更顺畅，压力增长明显放缓。',
    durationDays: 999,
    effects: {
      energyMaxDelta: 15,
      stressDeltaPerDay: -4,
      healthDeltaPerDay: 1,
    },
  },
  {
    id: 'trait_housing_villa',
    name: '江景创作者独栋',
    type: 'BUFF',
    description: '全职神级作者的终局住所，噪音与催租压力彻底消失。',
    durationDays: 999,
    effects: {
      energyMaxDelta: 25,
      stressDeltaPerDay: -6,
      healthDeltaPerDay: 2,
    },
  },

  /* ============== 生产力装备（一次性购买） ============== */
  {
    id: 'trait_eq_keyboard',
    name: '静音红轴加持',
    type: 'BUFF',
    description: '客制化键盘让夜间码字更顺滑，精力上限微增。',
    durationDays: 999,
    effects: {
      energyMaxDelta: 5,
    },
  },
  {
    id: 'trait_eq_chair',
    name: '人体工学庇护',
    type: 'BUFF',
    description: '专业网椅托住老腰，健康衰减显著放缓。',
    durationDays: 999,
    effects: {
      healthDeltaPerDay: 2,
      stressDeltaPerDay: -1,
    },
  },
  {
    id: 'trait_eq_monitor',
    name: '双屏视野',
    type: 'BUFF',
    description: '查资料、对大纲更从容，长期写作效率提升。',
    durationDays: 999,
    effects: {
      energyMaxDelta: 8,
      stressDeltaPerDay: -1,
    },
  },
  {
    id: 'trait_eq_coffee',
    name: '咖啡机自由',
    type: 'BUFF',
    description: '每天一杯特调，精力上限微增，但咖啡因也会带来轻微焦虑。',
    durationDays: 999,
    effects: {
      energyMaxDelta: 6,
      stressDeltaPerDay: 1,
    },
  },

  /* ============== 培训与保险 ============== */
  {
    id: 'trait_pr_training',
    name: '研修班进修',
    type: 'BUFF',
    description: '系统学习长篇结构，心态更稳，上限更高。',
    durationDays: 999,
    effects: {
      energyMaxDelta: 5,
      stressMaxDelta: 20,
    },
  },
  {
    id: 'trait_insurance_social',
    name: '社保+商保兜底',
    type: 'BUFF',
    description: '每月固定支出换来抗风险能力，住院不再一夜返贫。',
    durationDays: 30,
    effects: {
      healthDeltaPerDay: 1,
      stressDeltaPerDay: -1,
    },
  },

  /* ============== 江湖称号（读者爱称） ============== */
  {
    id: 'trait_title_speed_demon',
    name: '触手怪',
    type: 'BUFF',
    description: '读者怀疑你长了八只手，爆更收益额外提升。',
    durationDays: 999,
    effects: {
      energyMaxDelta: 5,
    },
  },
  {
    id: 'trait_title_cliffhanger_master',
    name: '断章狂魔',
    type: 'BUFF',
    description: '追读率小幅上涨，但读者情绪偶尔掉血。',
    durationDays: 999,
    effects: {
      stressMaxDelta: 15,
    },
  },
  {
    id: 'trait_title_toxic_healer',
    name: '毒奶战神',
    type: 'BUFF',
    description: '硬核读者自来水概率提升，慢热书更容易逆袭。',
    durationDays: 999,
    effects: {
      stressMaxDelta: 10,
      healthDeltaPerDay: 1,
    },
  },
  {
    id: 'trait_title_top_chart_emperor',
    name: '天榜大帝',
    type: 'BUFF',
    description: '曾登顶榜首，新书发布自带关注度。',
    durationDays: 999,
    effects: {
      energyMaxDelta: 10,
    },
  },
  {
    id: 'trait_title_master_of_lore',
    name: '世界观建筑师',
    type: 'BUFF',
    description: 'IP 改编谈判时更有底气。',
    durationDays: 999,
    effects: {
      stressMaxDelta: 20,
      healthDeltaPerDay: 1,
    },
  },
  {
    id: 'trait_title_eunuch_king',
    name: '宫廷总管',
    type: 'DEBUFF',
    description: '太监历史让读者对你又爱又怕。',
    durationDays: 999,
    effects: {
      stressDeltaPerDay: 2,
    },
  },
  {
    id: 'trait_title_sweet_daily',
    name: '治愈系仙人',
    type: 'BUFF',
    description: '日常流写得让读者想住进去，死忠粉粘度极高。',
    durationDays: 999,
    effects: {
      stressDeltaPerDay: -2,
      healthDeltaPerDay: 1,
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
