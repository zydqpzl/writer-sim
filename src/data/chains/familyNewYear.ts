import type { EventChain, InspirationCard } from '../../types/event'

/* ============== 本链专属灵感卡牌 ============== */

/** 日常系吐槽素材：体制内执念的真实切片 */
export const CARD_RELATIVE_OBSESSION: InspirationCard = {
  id: 'card_relative_obsession',
  name: '中年亲戚的体制内执念',
  description:
    "二叔那句'体制内多稳定'的执念，是日常系吐槽里百试百灵的共鸣开关。",
  quality: '稀有',
  genre: '喜剧',
}

/** SSR 级社会观察素材：真实到让全网亲戚以为是偷拍 */
export const CARD_NEW_YEAR_FEAST: InspirationCard = {
  id: 'card_new_year_feast',
  name: '100%还原·年夜饭逼婚逼考大赏',
  description:
    '手机里的录音与亲戚的微表情，构成了一幅当代中国家庭图鉴。用于生活吐槽类创作时爆火概率极高，但代价是父母满意度暴跌。',
  quality: '传说',
  genre: '社会观察',
  viralRate: 0.8,
  familyApprovalCost: 30,
}

/* ============== 过年回家·亲戚大乱斗 · 3 阶段事件链 ============== */
//
// 路径结构：
//   s1 隐忍自嘲 ───────────────────────► 终局（获得 中年亲戚的体制内执念）
//   s1 硬核反驳 ──► s2_argue ──► s3_normal 普通吐槽视频
//   s1 偷偷录音 ──► s2_record ──► s3_viral  小范围出圈（获得 SSR 卡牌保留至创作）
//
// 核心设计：把"长辈催婚/考编/质疑"的家庭压力，转化为可收割的爆款素材。
// SSR 卡牌在后续创作中触发 80% 爆火率，但会额外扣除父母满意度。

export const FAMILY_NEW_YEAR_CHAIN: EventChain = {
  id: 'family_new_year',
  title: '过年回家·亲戚大乱斗',
  icon: '🧧',
  maxDepth: 3,
  steps: [
    // Step 1：年夜饭桌上的'关切'
    {
      stepId: 's1',
      title: "年夜饭桌上的'关切'",
      text:
        "年夜饭上，二叔放下酒杯，拍着你肩膀说：'听说你在家搞自媒体？那不就是打游戏吗？隔壁小张考上税务局了，体制内多稳定啊，你打算混到什么时候？'满桌亲戚的目光齐刷刷投过来。",
      options: [
        {
          text: '隐忍自嘲：笑着附和',
          effect: { stress: 15, familyApproval: 10 },
          getCard: 'card_relative_obsession',
          nextStepId: null,
        },
        {
          text: '硬核反驳：亮出涨粉和合作单',
          effect: { stress: -10, familyApproval: -20 },
          nextStepId: 's2_argue',
        },
        {
          text: '偷偷录音：把对话和表情全录下来',
          effect: { stress: 5 },
          getCard: 'card_new_year_feast',
          nextStepId: 's2_record',
        },
      ],
    },
    // Step 2（分支 A）：亲戚暗讽 —— 仅"硬核反驳"路径进入
    {
      stepId: 's2_argue',
      title: '亲戚暗讽',
      text:
        "晚上回到房间，家族群里已经传开了：'读了这么多年书，怎么连份正经工作都找不到？'还有亲戚私聊你爸妈，说年轻人太浮躁。你盯着屏幕，手指悬在剪辑软件上方。",
      options: [
        {
          text: '连夜剪辑成吐槽视频',
          effect: { energy: -60 },
          nextStepId: 's3_normal',
        },
        {
          text: '深呼吸，洗洗睡',
          effect: { energy: 20, stress: -5 },
          nextStepId: null,
        },
      ],
    },
    // Step 2（分支 B）：录音后的夜晚 —— 仅"偷偷录音"路径进入
    {
      stepId: 's2_record',
      title: '录音后的夜晚',
      text:
        '你戴上耳机回放年夜饭录音，二叔的体制内箴言、大姑的催婚暗语、表弟的炫耀笑声交织成一部荒诞家庭剧。这就是当代中国家庭图鉴的原始素材。',
      options: [
        {
          text: '连夜剪辑成吐槽视频',
          effect: { energy: -60 },
          nextStepId: 's3_viral',
        },
        {
          text: '深呼吸，洗洗睡',
          effect: { energy: 20, stress: -5 },
          nextStepId: null,
        },
      ],
    },
    // Step 3 终局 · 普通吐槽视频
    {
      stepId: 's3_normal',
      title: '终局 · 普通吐槽视频',
      text:
        '你剪了一版吐槽视频，没有放录音，只讲了事情经过。评论区有人共鸣，但流量平平。这场年夜饭给你的最大收获，是让你看清了家庭聚会的表演本质。',
      options: [
        {
          text: '发布并结算',
          effect: { energy: -10, influence: 5, fans: 100 },
          nextStepId: null,
        },
      ],
    },
    // Step 3 终局 · 小范围出圈
    {
      stepId: 's3_viral',
      title: '终局 · 小范围出圈',
      text:
        `你把录音里那句'体制内多稳定'剪成了鬼畜循环，配上亲戚们微妙的表情特写。视频在几个粉丝群小范围传播，已经有人开始@自己的亲戚了。真正的爆款，还要等你在创作中把手里的 SSR 素材彻底引爆。`,
      options: [
        {
          text: '发布并结算',
          effect: { energy: -10, influence: 10, fans: 200 },
          nextStepId: null,
        },
      ],
    },
  ],
}
