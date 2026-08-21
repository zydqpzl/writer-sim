import type { EventChain, InspirationCard } from '../../types/event'

/* ============== 本链专属灵感卡牌 ============== */

/** 极致的反差笑料：把攻击变成笑料的荒诞喜剧内核 */
export const CARD_CONTRAST_COMEDY: InspirationCard = {
  id: 'card_contrast_comedy',
  name: '极致的反差笑料',
  description: '把千字差评挂墙上当笑话——这是顶级荒诞喜剧的内核。',
  quality: '稀有',
  genre: '喜剧',
}

/** 剧本杀逻辑破绽：较真时暴露的推理漏洞，创作可规避的陷阱 */
export const CARD_SCRIPTURE_LOGIC_FLAW: InspirationCard = {
  id: 'card_scripture_logic_flaw',
  name: '剧本杀逻辑破绽',
  description: '逻辑怪较真时暴露的推理漏洞，恰是小说里"反转失灵"的病因诊断。',
  quality: '普通',
  genre: '世界观',
}

/* ============== 桌游店 DM 兼职 · 3 阶段事件链 ============== */
//
// 路径结构：
//   s1 严谨控场 ───────────────────────► s3_control   → 剧本杀逻辑破绽
//   s1 偷偷使绊子 ─► s2 千字差评 ─► s2a 据理力争 ───► s3_argue  → 剧本杀逻辑破绽
//                                  └─ s2b 打印挂墙上 ► s3_frame  → 极致的反差笑料
//   s1 摆烂 ───────────────────────────► s3_slack    → 剧本杀逻辑破绽
//
// 兼职收益统一在 Step 3 终局结算；Step 1/2 仅产生精力/心态波动。

export const BOARDGAME_DM_CHAIN: EventChain = {
  id: 'boardgame_dm',
  title: '桌游店 DM 兼职',
  icon: '🎲',
  maxDepth: 3,
  steps: [
    // Step 1：拉片与组局
    {
      stepId: 's1',
      title: '拉片与组局',
      text:
        "你接下一场硬核推理本的主持活。桌上坐着一位自称'逻辑怪'的老玩家，和一位连规则都看不懂的纯新手。剧本才翻开两页，两人已经为一条线索的解读争执起来，空气凝住了。",
      options: [
        {
          text: '严谨控场，耐心帮新手梳理逻辑链',
          effect: { energy: -30 },
          nextStepId: 's3_control',
        },
        {
          text: "偷偷给'逻辑怪'使绊子，看他吃瘪",
          effect: { stress: -10, energy: -10 },
          nextStepId: 's2',
        },
        {
          text: '摆烂，任由他们自己吵',
          effect: { energy: -10, stress: 5 },
          nextStepId: 's3_slack',
        },
      ],
    },
    // Step 2（分支）：千字长文差评 —— 仅"使绊子"路径进入
    {
      stepId: 's2',
      title: '千字长文差评',
      text:
        "第二天，'逻辑怪'在平台上挂你，写了千字长文差评，说你主持不专业、暗箱操作。老板把你叫过去，要扣你这场的工资。",
      options: [
        {
          text: '据理力争，把当时的剧本记录甩出来',
          effect: { stress: 15, energy: -10 },
          nextStepId: 's3_argue',
        },
        {
          text: '把差评打印出来贴在收银台当笑话',
          effect: { stress: -15 },
          nextStepId: 's3_frame',
        },
      ],
    },
    // Step 3 终局 · 严谨控场
    {
      stepId: 's3_control',
      title: '终局 · 好评收场',
      text:
        '你耐心帮新手梳理完整条逻辑链，散场时他连声道谢，还在群里发了长评夸你功底扎实。老板按高标准给你结了账。复盘时你忽然察觉——这个推理本的真凶揭露存在一处逻辑破绽，恰是你小说里反复犯的"反转失灵"。',
      options: [
        {
          text: '结算今日兼职收益',
          effect: { savings: 150 },
          getCard: 'card_scripture_logic_flaw',
          nextStepId: null,
        },
      ],
    },
    // Step 3 终局 · 据理力争
    {
      stepId: 's3_argue',
      title: '终局 · 记录在此',
      text:
        '你把剧本记录、线索流转逐条甩出来反驳。逻辑怪的长文里本身就藏着对规则的误读——你边反驳边意识到，这种"看似严密实则漏风"的推理结构，正是你创作时该规避的陷阱。老板看了记录，扣了一小部分工资了事。',
      options: [
        {
          text: '结算今日兼职收益',
          effect: { savings: 100 },
          getCard: 'card_scripture_logic_flaw',
          nextStepId: null,
        },
      ],
    },
    // Step 3 终局 · 打印挂墙上
    {
      stepId: 's3_frame',
      title: '终局 · 活招牌',
      text:
        '你把那篇千字差评打印出来，工工整整贴在收银台上方，旁边配了句"本店 DM 已获逻辑怪认证"。来店的客人争相合影，差评反倒成了活招牌，老板笑着没扣钱还多给了点。这种"把攻击变成笑料"的荒诞反差，是顶级喜剧的内核。',
      options: [
        {
          text: '结算今日兼职收益',
          effect: { savings: 120 },
          getCard: 'card_contrast_comedy',
          nextStepId: null,
        },
      ],
    },
    // Step 3 终局 · 摆烂
    {
      stepId: 's3_slack',
      title: '终局 · 冷眼旁观',
      text:
        '你摆烂到底，任由新手和逻辑怪吵完整场，两人不欢而散，老板脸色难看，只给了最低的辛苦费。但冷眼旁观的整场里，你反而看穿了剧本本身的漏洞——两人争执的根源，正是真凶线设计的逻辑破绽。',
      options: [
        {
          text: '结算今日兼职收益',
          effect: { savings: 60 },
          getCard: 'card_scripture_logic_flaw',
          nextStepId: null,
        },
      ],
    },
  ],
}
