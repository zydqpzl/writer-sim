// 年度循环 C 阶段：跨年开局事件链
// 根据上一年总结在 continueToNextYear 时触发，影响下一年开局状态

import type { EventChain } from '../../types/event'

/** 上一年太监带来的信任阴影 */
export const YEAR_OPENING_ABANDON_SHADOW_CHAIN: EventChain = {
  id: 'year_opening_abandon_shadow',
  title: '太监后遗症',
  icon: '✂️',
  maxDepth: 1,
  steps: [
    {
      stepId: 'start',
      title: '评论区的不信任',
      text: '去年你太监过作品，老读者在新书评论区刷着"这次能写完吗"。开局信任度受到影响，你必须做出回应。',
      options: [
        {
          text: 'A. 换马甲重新出发（损失 15 粉丝，但甩掉黑历史）',
          effect: { fans: -15, stress: -5 },
          nextStepId: null,
        },
        {
          text: 'B. 直面质疑，在第一章发誓完本（压力 +20，读者情绪 +15）',
          effect: { stress: 20 },
          nextStepId: null,
        },
        {
          text: 'C. 写一段番外补偿老书读者（精力 -20，粉丝 +5，家庭满意度 +5）',
          effect: { energy: -20, fans: 5, familyApproval: 5 },
          nextStepId: null,
        },
      ],
    },
  ],
}

/** 上一年完本带来的读者红利 */
export const YEAR_OPENING_COMPLETE_BONUS_CHAIN: EventChain = {
  id: 'year_opening_complete_bonus',
  title: '完本红利',
  icon: '📚',
  maxDepth: 1,
  steps: [
    {
      stepId: 'start',
      title: '老读者的期待',
      text: '去年你完本了一部作品，读者群还在讨论结局。新书开局自带一波关注，你要怎么利用这份红利？',
      options: [
        {
          text: 'A. 趁热打铁官宣新书（粉丝 +30，压力 +15）',
          effect: { fans: 30, stress: 15 },
          nextStepId: null,
        },
        {
          text: 'B. 沉淀一个月再动笔（健康 +10，压力 -10，粉丝 +10）',
          effect: { health: 10, stress: -10, fans: 10 },
          nextStepId: null,
        },
        {
          text: 'C. 挑战一个全新题材（影响力 +5，亚文化声望 +5，压力 +10）',
          effect: { influence: 5, fans: 10, stress: 10 },
          nextStepId: null,
        },
      ],
    },
  ],
}

/** 上一年作品爆红带来的平台关注 */
export const YEAR_OPENING_ONE_HIT_CHAIN: EventChain = {
  id: 'year_opening_one_hit',
  title: '一书封神余波',
  icon: '🔥',
  maxDepth: 1,
  steps: [
    {
      stepId: 'start',
      title: '编辑的私信',
      text: '去年那本爆款还在长尾发酵，编辑私信问你愿不愿意签长约、做 IP 衍生。名声是压力也是资源。',
      options: [
        {
          text: 'A. 接受平台长约（存款 +2000，压力 +25，获得【长约压力】debuff）',
          effect: { savings: 2000, stress: 25, grantTrait: 'trait_long_contract_pressure' },
          nextStepId: null,
        },
        {
          text: 'B. 按自己节奏写（粉丝 +25，压力 +5）',
          effect: { fans: 25, stress: 5 },
          nextStepId: null,
        },
        {
          text: 'C. 蹭热度跨界做短视频（影响力 +15，健康 -10，存款 +800）',
          effect: { influence: 15, health: -10, savings: 800 },
          nextStepId: null,
        },
      ],
    },
  ],
}

/** 上一年存款见底的经济危机 */
export const YEAR_OPENING_POVERTY_CHAIN: EventChain = {
  id: 'year_opening_poverty',
  title: '新年经济危机',
  icon: '💸',
  maxDepth: 1,
  steps: [
    {
      stepId: 'start',
      title: '账户余额归零',
      text: '去年结束时许你的存款已经见底，新的一年房租和外卖都在催命。你必须先解决生存问题。',
      options: [
        {
          text: 'A. 接商业定制文（存款 +3000，压力 +25，获得【创作束缚】debuff）',
          effect: { savings: 3000, stress: 25, grantTrait: 'trait_commercial_shackle' },
          nextStepId: null,
        },
        {
          text: 'B. 借钱再赌一本爆款（存款 +1000，压力 +15，家庭满意度 -10）',
          effect: { savings: 1000, stress: 15, familyApproval: -10 },
          nextStepId: null,
        },
        {
          text: 'C. 先找份兼职过渡（存款 +1500，压力 -10，精力上限受压制）',
          effect: { savings: 1500, stress: -10, grantTrait: 'trait_part_time_fatigue' },
          nextStepId: null,
        },
      ],
    },
  ],
}

/** 上一年健康透支的身体警告 */
export const YEAR_OPENING_BURNOUT_CHAIN: EventChain = {
  id: 'year_opening_burnout',
  title: '身体发出的警告',
  icon: '🏥',
  maxDepth: 1,
  steps: [
    {
      stepId: 'start',
      title: '跨年进医院',
      text: '去年你熬得太狠，跨年夜是在医院输液度过的。医生警告你再这么写会出事。',
      options: [
        {
          text: 'A. 强制休养一周（健康 +20，本年度首日跳过创作时段）',
          effect: { health: 20, grantTrait: 'trait_forced_rest' },
          nextStepId: null,
        },
        {
          text: 'B. 硬撑，新年继续爆更（健康 -15，压力 +20，粉丝 +10）',
          effect: { health: -15, stress: 20, fans: 10 },
          nextStepId: null,
        },
        {
          text: 'C. 调整作息，每天只写半天（健康 +10，压力 -5，影响力 -5）',
          effect: { health: 10, stress: -5, influence: -5 },
          nextStepId: null,
        },
      ],
    },
  ],
}

/** 平淡一年的自我拷问 */
export const YEAR_OPENING_MIDDLING_CHAIN: EventChain = {
  id: 'year_opening_middling',
  title: '新年的自我拷问',
  icon: '🪞',
  maxDepth: 1,
  steps: [
    {
      stepId: 'start',
      title: '原地踏步的一年',
      text: '去年不算失败，也没什么水花。新年第一天，你盯着空白的文档问自己：今年还要这样写下去吗？',
      options: [
        {
          text: 'A. 今年一定要出爆款（压力 +20，获得【孤注一掷】buff）',
          effect: { stress: 20, grantTrait: 'trait_all_or_nothing' },
          nextStepId: null,
        },
        {
          text: 'B. 稳扎稳打，先保证完本（压力 -10，健康 +5）',
          effect: { stress: -10, health: 5 },
          nextStepId: null,
        },
        {
          text: 'C. 去社交平台上哭惨换关注（影响力 +10，压力 +5，家庭满意度 -5）',
          effect: { influence: 10, stress: 5, familyApproval: -5 },
          nextStepId: null,
        },
      ],
    },
  ],
}
