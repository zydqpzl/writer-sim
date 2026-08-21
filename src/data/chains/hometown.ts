import type { EventChain, InspirationCard } from '../../types/event'

/* ============== 本链专属灵感卡牌 ============== */

/** 县城人情观察：走亲访友时的微表情与潜台词 */
export const CARD_HOMETOWN_HUMANITY: InspirationCard = {
  id: 'card_hometown_humanity',
  name: '县城人情世故',
  description:
    '三姑六婆的寒暄、邻居打探的目光、酒桌上的人情债——小县城的关系网是人物观察的富矿。',
  quality: '稀有',
  genre: '人物观察',
}

/** 反讽喜剧素材：面对"考公结婚买房"三连击时的内心吐槽 */
export const CARD_HOMETOWN_IRONY: InspirationCard = {
  id: 'card_hometown_irony',
  name: '咱老家是有皇位要继承吗？',
  description:
    "亲戚们把考公、结婚、买房说得像祖传圣旨。这句吐槽一旦写成段子，共鸣率高得惊人，但父母满意度会小幅下降。",
  quality: '史诗',
  genre: '喜剧',
  viralRate: 0.6,
  familyApprovalCost: 15,
}

/** 情感系日常：老家慢节奏里难得的治愈瞬间 */
export const CARD_HOMETOWN_PEACE: InspirationCard = {
  id: 'card_hometown_peace',
  name: '老家的慢生活切片',
  description:
    '清晨的豆浆摊、傍晚的广场舞、爸妈看电视时的小拌嘴——这些平淡日常是情感类创作的温暖底色。',
  quality: '普通',
  genre: '情感',
}

/* ============== 回老家 · 返乡初体验 · 2 阶段事件链 ============== */
//
// 触发条件：玩家选择回老家后，次日刷出的限时奇遇。
// 核心设计：把老家的"人情压力"与"慢生活素材"都转化为可收集的灵感卡牌。
//
// 路径结构：
//   s1 帮家里看店/干活 ──► 终局（获得 县城人情世故 / 老家的慢生活切片）
//   s1 假装在大城市忙 ──► s2_normal 县城人情世故
//   s1 把荒诞拍成素材 ──► s2_irony  咱老家是有皇位要继承吗？

export const HOMETOWN_CHAIN: EventChain = {
  id: 'hometown',
  title: '回老家 · 返乡初体验',
  icon: '🏘️',
  maxDepth: 2,
  steps: [
    // Step 1：返乡第一天
    {
      stepId: 's1_return',
      title: '返乡第一天',
      text:
        '你拖着行李箱回到老家。县城的空气比大城市慢半拍，但父母的目光却快得很——"回来就好，隔壁王阿姨说她侄子考上公务员了，你要不要也试试？"',
      options: [
        {
          text: '帮家里看店/干点活',
          effect: { energy: -25, familyApproval: 15, stress: 5 },
          getCard: 'card_hometown_humanity',
          nextStepId: null,
        },
        {
          text: '假装还在大城市忙碌',
          effect: { energy: -10, familyApproval: -10, stress: -10 },
          nextStepId: 's2_normal',
        },
        {
          text: '把老家的荒诞拍成素材',
          effect: { energy: -15, familyApproval: -5, stress: 10 },
          getCard: 'card_hometown_irony',
          nextStepId: 's2_irony',
        },
      ],
    },
    // Step 2（分支 A）：县城人情世故
    {
      stepId: 's2_normal',
      title: '县城人情世故',
      text:
        '你在房间里打开电脑，假装处理"重要工作"。门外传来妈妈跟邻居的对话："我们家孩子在大城市做新媒体，可忙了。"你听着既心酸又好笑。',
      options: [
        {
          text: '出门陪妈妈串门，笑脸相迎',
          effect: { energy: -15, familyApproval: 20, stress: 15 },
          getCard: 'card_hometown_humanity',
          nextStepId: null,
        },
        {
          text: '戴上耳机，剪一条县城观察视频',
          effect: { energy: -30, influence: 3, fans: 40 },
          getCard: 'card_hometown_peace',
          nextStepId: null,
        },
      ],
    },
    // Step 2（分支 B）：咱老家是有皇位要继承吗？
    {
      stepId: 's2_irony',
      title: '亲戚们的"关心"',
      text:
        '你举着手机拍下亲戚们围坐的场景：考公、结婚、买房、稳定、体面……这些词像弹幕一样在客厅里飞来飞去。你突然意识到，这就是最原生态的喜剧素材。',
      options: [
        {
          text: '连夜写成吐槽段子',
          effect: { energy: -35, influence: 5, fans: 80, stress: -15 },
          getCard: 'card_hometown_irony',
          nextStepId: null,
        },
        {
          text: '算了，陪爸妈看会儿电视',
          effect: { energy: 15, familyApproval: 10, stress: -10 },
          getCard: 'card_hometown_peace',
          nextStepId: null,
        },
      ],
    },
  ],
}
