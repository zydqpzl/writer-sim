// 网络作家核心危机事件链：拒签 / 黑粉爆破 / 全勤奖危机

import type { EventChain } from '../../types/event'

/** 拒签危机：满字数仍未收到签约站短 */
export const WRITER_REJECTION_CHAIN: EventChain = {
  id: 'writer_rejection_crisis',
  title: '黄金三章被拒签',
  icon: '📧',
  maxDepth: 2,
  steps: [
    {
      stepId: 'start',
      title: '站短来了',
      text: '新书发到 5 万字，终于等来了编辑站短。你颤抖着点开——“非常抱歉，您的作品未达到签约标准，建议调整方向。”',
      options: [
        {
          text: 'A. 改开头重投（消耗 30 精力，压力 +20）',
          effect: {
            energy: -30,
            stress: 20,
            writerProject: { quality: 5, memeValue: 2, readerRetention: 0.03 },
          },
          nextStepId: 'rewrite_result',
        },
        {
          text: 'B. 找 AI 修大纲（金钱 -200，质量提升）',
          effect: {
            savings: -200,
            writerProject: { quality: 8, commerciality: 3, memeValue: -1 },
          },
          nextStepId: 'ai_help',
        },
        {
          text: 'C. 怒而太监切书！',
          effect: {
            stress: -10,
            fans: -5,
          },
          nextStepId: null,
        },
      ],
    },
    {
      stepId: 'rewrite_result',
      title: '重写之后',
      text: '你熬了两个通宵改开头，重新投稿。三天后站短再来：这次编辑留了QQ，愿意给你一次试水推荐。',
      options: [
        {
          text: '抓住推荐位，继续爆更',
          effect: {
            stress: 10,
            writerProject: { quality: 3, memeValue: 4, hype: 10 },
          },
          nextStepId: null,
        },
      ],
    },
    {
      stepId: 'ai_help',
      title: 'AI 大纲',
      text: 'AI 帮你把大纲梳理得跌宕起伏，但套路感略重。编辑回信：可签约，但建议加强个人风格。',
      options: [
        {
          text: '签约，边写边改',
          effect: {
            stress: 5,
            writerProject: { commerciality: 5, readerRetention: 0.05 },
          },
          nextStepId: null,
        },
      ],
    },
  ],
}

/** 黑粉爆破：写死人气配角或争议剧情后读者暴动 */
export const WRITER_BLACKFAN_CHAIN: EventChain = {
  id: 'writer_blackfan_crisis',
  title: '读者群黑粉爆破',
  icon: '🔪',
  maxDepth: 2,
  steps: [
    {
      stepId: 'start',
      title: '书友群炸了',
      text: '你上一章把一个人气配角写死了，书友群炸锅，有人发你真人照片威胁“寄刀片”，有人截图准备挂你。',
      options: [
        {
          text: 'A. 硬刚：“我是作者听我的！”',
          effect: {
            stress: 50,
            fans: -10,
            writerProject: { readerMood: -30, readerRetention: -0.1 },
            grantTrait: 'trait_hardcore_maniac',
          },
          nextStepId: 'hardcore_result',
        },
        {
          text: 'B. 连夜删改剧本：死的是克隆人',
          effect: {
            stress: 15,
            writerProject: { quality: -10, readerMood: 10, memeValue: 5 },
          },
          nextStepId: 'retcon_result',
        },
        {
          text: 'C. 装死关群，今晚爆更 3 章谢罪',
          effect: {
            energy: -40,
            stress: -10,
            writerProject: { readerMood: 15, hype: 15, wordCount: 9000 },
          },
          nextStepId: 'apology_result',
        },
      ],
    },
    {
      stepId: 'hardcore_result',
      title: '硬核狂人的代价',
      text: '你获得了【硬核狂人】特质，黑粉骂得更凶，但死忠粉觉得你有骨气。评论区变成战场。',
      options: [
        {
          text: '继续写，流量也是流量',
          effect: {
            writerProject: { memeValue: 8, controversy: 15, hype: 10 },
          },
          nextStepId: null,
        },
      ],
    },
    {
      stepId: 'retcon_result',
      title: '吃书之后',
      text: '读者一边骂你“没骨气”，一边疯狂玩“克隆人”梗。口碑下滑，但话题度爆了。',
      options: [
        {
          text: '顺水推舟玩梗',
          effect: {
            writerProject: { memeValue: 8, readerRetention: 0.02 },
          },
          nextStepId: null,
        },
      ],
    },
    {
      stepId: 'apology_result',
      title: '爆更谢罪',
      text: '你爆更三章后，黑粉累了，盟主出来打圆场。事情勉强平息，但你快猝死了。',
      options: [
        {
          text: '睡觉保命',
          effect: {
            health: 10,
            stress: -15,
          },
          nextStepId: null,
        },
      ],
    },
  ],
}

/** 全勤奖危机：月末还差字数，身体和精神濒临崩溃 */
export const WRITER_FULLATTENDANCE_CHAIN: EventChain = {
  id: 'writer_fullattendance_crisis',
  title: '全勤奖危机',
  icon: '⏰',
  maxDepth: 2,
  steps: [
    {
      stepId: 'start',
      title: '23:50',
      text: '今晚 23:50，你还差 2000 字就能拿到本月 1500 元全勤奖。但你健康“虚弱抱病”，压力已经 280。',
      options: [
        {
          text: 'A. 拼了！硬写！',
          effect: {
            energy: -30,
            stress: 50,
            health: -20,
            writerProject: { wordCount: 2000, readerMood: 5 },
          },
          nextStepId: 'push_result',
        },
        {
          text: 'B. 放弃全勤，睡觉',
          effect: {
            savings: -1500,
            stress: -30,
            health: 15,
            writerProject: { readerRetention: -0.05 },
          },
          nextStepId: 'giveup_result',
        },
        {
          text: 'C. 水文 2000 字混全勤',
          effect: {
            energy: -10,
            stress: 10,
            writerProject: { wordCount: 2000, quality: -5, readerMood: -10 },
          },
          nextStepId: 'filler_result',
        },
      ],
    },
    {
      stepId: 'push_result',
      title: '极限一更',
      text: '你在 23:59 卡点更新，全勤到手。但眼前一黑，大概率要进医院。',
      options: [
        {
          text: '拿到钱就行',
          effect: {
            savings: 1500,
          },
          nextStepId: null,
        },
      ],
    },
    {
      stepId: 'giveup_result',
      title: '放弃全勤',
      text: '你关掉文档睡觉。全勤没了，但人还活着。次日读者发现断更，追读掉了一截。',
      options: [
        {
          text: '下个月再战',
          effect: {
            stress: -5,
          },
          nextStepId: null,
        },
      ],
    },
    {
      stepId: 'filler_result',
      title: '水文保命',
      text: '你发了 2000 字毫无营养的日常章，全勤保住了，但本章说全是骂声。',
      options: [
        {
          text: '明天补质量',
          effect: {
            savings: 1500,
            writerProject: { quality: 2 },
          },
          nextStepId: null,
        },
      ],
    },
  ],
}
