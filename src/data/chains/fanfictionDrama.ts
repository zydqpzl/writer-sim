// 同人衍生生态事件链：同人爆火、原作作者反应、版权风险

import type { EventChain, InspirationCard } from '../../types/event'

/** 同人爆火后被原作作者/粉丝盯上 */
export const FANFICTION_BLOWUP_CHAIN: EventChain = {
  id: 'fanfiction_blowup',
  title: '同人大爆，原作作者盯上你了',
  icon: '📖',
  maxDepth: 2,
  steps: [
    {
      stepId: 'start',
      title: '同人反超原作',
      text: '你写的同人《关于我转生成为顶流反派白月光这件事》热度竟然隐隐超过了原作。原作作者深夜发了条动态：“有些人吃相别太难看。”书友群瞬间分裂成两派。',
      options: [
        {
          text: 'A. 公开致敬原作者，态度谦卑',
          effect: {
            stress: 10,
            fans: 5,
            writerProject: { readerMood: 10, readerRetention: 0.03 },
          },
          nextStepId: 'humble_result',
        },
        {
          text: 'B. 直接对线：写得差还不让人改？',
          effect: {
            stress: 20,
            fans: 15,
            writerProject: { memeValue: 5, readerMood: -20, readerRetention: -0.05 },
          },
          nextStepId: 'confront_result',
        },
        {
          text: 'C. 火速改设定，把同人改成原创',
          effect: {
            energy: -30,
            stress: 15,
            savings: -100,
            writerProject: { quality: -5, readerRetention: -0.1 },
          },
          nextStepId: 'original_result',
        },
      ],
    },
    {
      stepId: 'humble_result',
      title: '高情商化解',
      text: '你在章节末尾写了长评感谢原作，并主动@原作者。原作粉丝怒气平息，甚至有一部分被你圈成了新读者。',
      options: [
        {
          text: '继续稳定更新，巩固口碑',
          effect: {
            stress: -5,
            fans: 10,
            writerProject: { quality: 3, readerMood: 10 },
          },
          nextStepId: null,
        },
      ],
    },
    {
      stepId: 'confront_result',
      title: '战火升级',
      text: '你的对线动态被截图传播，#同人作者怒怼原作# 登上平台热搜。爆点暴涨的同时，平台客服发来了“涉嫌违规引战”的警告信。',
      options: [
        {
          text: '删文道歉，息事宁人',
          effect: {
            stress: 10,
            fans: -10,
            writerProject: { hype: -15, readerMood: -10 },
          },
          nextStepId: null,
        },
        {
          text: '硬刚到底，继续爆更',
          effect: {
            stress: 30,
            fans: 25,
            writerProject: { memeValue: 10, hype: 20, readerRetention: -0.08 },
          },
          nextStepId: null,
        },
      ],
    },
    {
      stepId: 'original_result',
      title: '脱胎成原创',
      text: '你熬夜把原作设定全部替换，人名、宗门、世界观都改了一遍。老读者有些流失，但你也彻底摆脱了被举报的风险。',
      options: [
        {
          text: '开新书预告，主打“原创逆袭”',
          effect: {
            stress: -10,
            fans: 5,
            writerProject: { commerciality: 5, readerMood: 5 },
          },
          nextStepId: null,
        },
      ],
    },
  ],
}

/** 同人收到版权封禁警告 */
export const FANFICTION_COPYRIGHT_CHAIN: EventChain = {
  id: 'fanfiction_copyright',
  title: '同人收到版权警告',
  icon: '⚠️',
  maxDepth: 2,
  steps: [
    {
      stepId: 'start',
      title: '站短来了，但不是签约',
      text: '你收到平台站内信：“您的作品涉嫌侵犯《万界第一苟仙》版权，请在 72 小时内整改，否则将下架处理。”',
      options: [
        {
          text: 'A. 紧急删改，把原作元素全部替换',
          effect: {
            energy: -40,
            stress: 25,
            writerProject: { quality: -8, readerRetention: -0.12 },
          },
          nextStepId: 'rewrite_safe',
        },
        {
          text: 'B. 转投对同人更宽容的轻小说站',
          effect: {
            savings: -200,
            stress: 15,
            writerProject: { commerciality: -5, readerMood: 10 },
          },
          nextStepId: 'migrate_site',
        },
        {
          text: 'C. 硬扛：我没收钱，凭什么封？',
          effect: {
            stress: 35,
            writerProject: { memeValue: 8, readerMood: -25, readerRetention: -0.15 },
          },
          nextStepId: 'ban_risk',
        },
      ],
    },
    {
      stepId: 'rewrite_safe',
      title: '艰难脱身',
      text: '你把主角名字、宗门设定、核心功法全改了一遍，勉强通过平台审核。读者骂你“换皮文”，但至少书还在。',
      options: [
        {
          text: '吸取教训，以后写原创',
          effect: {
            stress: -5,
            fans: 3,
          },
          nextStepId: null,
        },
      ],
    },
    {
      stepId: 'migrate_site',
      title: '转战同人站',
      text: '你联系了一家以同人文化为主的轻小说站。虽然订阅单价低，但读者氛围更宽容，评论区开始回暖。',
      options: [
        {
          text: '在新站稳定更新',
          effect: {
            stress: -10,
            fans: 8,
            writerProject: { readerMood: 15, readerRetention: 0.05 },
          },
          nextStepId: null,
        },
      ],
    },
    {
      stepId: 'ban_risk',
      title: '书被封了',
      text: '平台没有手软，你的书被直接下架，粉丝群哀嚎一片。你上了平台的“重点关注名单”，新书签约难度提升。',
      options: [
        {
          text: '开小号重来',
          effect: {
            stress: 20,
            fans: -15,
            writerProject: { readerRetention: -0.2 },
          },
          nextStepId: null,
        },
      ],
    },
  ],
}

/** 同人爆火后收到原作粉丝的“自来水”反哺 */
export const FANFICTION_PAYBACK_CHAIN: EventChain = {
  id: 'fanfiction_payback',
  title: '原作粉丝为你发电',
  icon: '💝',
  maxDepth: 1,
  steps: [
    {
      stepId: 'start',
      title: '同人反哺原作',
      text: '有读者在原作评论区安利你的同人：“看完这本同人才get到原作埋的伏笔，快去看！”你的同人新增了一批死忠粉，原作者也默默点赞了你的动态。',
      options: [
        {
          text: '继续产出高质量番外',
          effect: {
            stress: -10,
            fans: 15,
            writerProject: { quality: 3, readerMood: 15, readerRetention: 0.05 },
          },
          nextStepId: null,
        },
        {
          text: '借机开付费番外专辑',
          effect: {
            savings: 500,
            stress: 5,
            writerProject: { commerciality: 5, readerMood: -5 },
          },
          nextStepId: null,
        },
      ],
    },
  ],
}

/** 同人衍生专属灵感卡牌：OOC 之神 */
export const CARD_OOC_GOD: InspirationCard = {
  id: 'card_ooc_god',
  name: 'OOC 之神',
  description: '你故意把原作角色写崩，却意外引爆话题——读者一边骂一边追，热度疯狂上涨。',
  quality: '稀有',
  genre: '同人',
}
