// 网文圈吃瓜事件链：同行挂炉 / 防盗章节翻车 / 评论区逼宫改剧情

import type { EventChain, InspirationCard } from '../../types/event'

/** 同行挂炉：被嫉妒的精品作者挂到论坛 */
export const WRITER_PEER_ROAST_CHAIN: EventChain = {
  id: 'writer_peer_roast',
  title: '被同行挂到论坛“挂炉”',
  icon: '🍖',
  maxDepth: 2,
  steps: [
    {
      stepId: 'start',
      title: '龙空小黑盒炸了',
      text: '你的书因为融入现实梗突然火了。一个精品作者在小黑盒发帖：“某新人数据异常，疑似融梗刷量，懂的都懂。”评论区开始@你。',
      options: [
        {
          text: 'A. 在单章里写小作文对线',
          effect: {
            stress: 30,
            writerProject: { memeValue: 10, controversy: 20, hype: 25 },
            grantTrait: 'trait_mouth_gun',
          },
          nextStepId: 'duel_result',
        },
        {
          text: 'B. 装死，给盟主/读者群发红包求控评',
          effect: {
            savings: -500,
            stress: 10,
            writerProject: { readerMood: 10, readerRetention: 0.03 },
          },
          nextStepId: 'redpacket_result',
        },
        {
          text: 'C. 给那本书投月票，留言“写得很好，已学习”',
          effect: {
            savings: -50,
            stress: -10,
            writerProject: { memeValue: 8, readerMood: 5 },
          },
          nextStepId: 'green_tea_result',
        },
      ],
    },
    {
      stepId: 'duel_result',
      title: '嘴炮狂人',
      text: '你获得了【嘴炮狂人】特质。评论区变成战场，订阅因撕逼短期暴涨，但隐患值飙升。',
      options: [
        {
          text: '流量到手就是赢',
          effect: {
            writerProject: { hype: 10 },
          },
          nextStepId: null,
        },
      ],
    },
    {
      stepId: 'redpacket_result',
      title: '控评成功',
      text: '盟主和死忠粉下场控评，节奏被压下去了。你花了 500 块，但粉丝忠诚度上升。',
      options: [
        {
          text: '继续低调更新',
          effect: {
            writerProject: { readerRetention: 0.02 },
          },
          nextStepId: null,
        },
      ],
    },
    {
      stepId: 'green_tea_result',
      title: '顶级绿茶',
      text: '你的阴阳怪气评论被截图疯传，读者玩梗“已学习”。对方作者被气到破防，反而给你涨了一波粉。',
      options: [
        {
          text: '看戏',
          effect: {
            fans: 20,
            writerProject: { memeValue: 5 },
          },
          nextStepId: null,
        },
      ],
    },
  ],
}

/** 防盗章节翻车：正版读者被误伤 */
export const WRITER_ANTI_PIRACY_CHAIN: EventChain = {
  id: 'writer_anti_piracy',
  title: '防盗章节翻车',
  icon: '🏴‍☠️',
  maxDepth: 2,
  steps: [
    {
      stepId: 'start',
      title: 'TXT 传遍全网',
      text: '你的小说上架了，但防盗版机制没做好，盗版网站几分钟就同步了最新章。正版订阅下滑。',
      options: [
        {
          text: 'A. 半夜发假章节，凌晨改回真内容',
          effect: {
            energy: -20,
            stress: 15,
            writerProject: { readerMood: -20, readerRetention: -0.05, hype: 10 },
          },
          nextStepId: 'fake_chapter_result',
        },
        {
          text: 'B. 章节末尾哭穷卖惨',
          effect: {
            writerProject: { commerciality: 8, readerMood: 5 },
          },
          nextStepId: 'beg_result',
        },
        {
          text: 'C. 在正文里埋雷，让盗版读者看到乱码',
          effect: {
            stress: 10,
            writerProject: { memeValue: 10, readerMood: 5, controversy: 5 },
          },
          nextStepId: 'landmine_result',
        },
      ],
    },
    {
      stepId: 'fake_chapter_result',
      title: '防盗误伤',
      text: '防盗有效，但正版读者被假章节气得骂娘。评论区口碑下滑，订阅短期受挫。',
      options: [
        {
          text: '道歉并加更补偿',
          effect: {
            energy: -15,
            writerProject: { readerMood: 10, wordCount: 6000 },
          },
          nextStepId: null,
        },
      ],
    },
    {
      stepId: 'beg_result',
      title: '卖惨有效',
      text: '你写了一段“老妈生病猫要绝育全家靠这碗饭”的感言。正版转化率提升，但如果之前奢侈消费会被反噬。',
      options: [
        {
          text: '继续哭穷',
          effect: {
            writerProject: { commerciality: 3, readerMood: -5 },
          },
          nextStepId: null,
        },
      ],
    },
    {
      stepId: 'landmine_result',
      title: '盗版地雷',
      text: '盗版读者看到的是乱码和“请支持正版”，正版读者笑疯了。你获得了“防盗斗士”口碑。',
      options: [
        {
          text: '再接再厉',
          effect: {
            writerProject: { readerRetention: 0.03, memeValue: 5 },
          },
          nextStepId: null,
        },
      ],
    },
  ],
}

/** 评论区逼宫：读者集体要求改剧情 */
export const WRITER_COMMENT_REVOLT_CHAIN: EventChain = {
  id: 'writer_comment_revolt',
  title: '评论区逼宫改剧情',
  icon: '📢',
  maxDepth: 2,
  steps: [
    {
      stepId: 'start',
      title: '读者逼宫',
      text: '最近几章读者情绪爆炸，评论区高赞：“女主凭什么原谅男主？”、“作者是不是厌女？”、“不改剧情就弃书！”',
      options: [
        {
          text: 'A. 听从读者，连夜改剧情',
          effect: {
            stress: 10,
            writerProject: { quality: -5, readerMood: 20, readerRetention: 0.05 },
          },
          nextStepId: 'obey_result',
        },
        {
          text: 'B. 硬刚：我的书我做主',
          effect: {
            stress: 30,
            writerProject: { readerMood: -25, readerRetention: -0.1, memeValue: 5 },
          },
          nextStepId: 'resist_result',
        },
        {
          text: 'C. 写一章“元小说”吐槽读者',
          effect: {
            stress: -10,
            writerProject: { memeValue: 12, controversy: 10, hype: 15 },
          },
          nextStepId: 'meta_result',
        },
      ],
    },
    {
      stepId: 'obey_result',
      title: '改剧情之后',
      text: '你按读者意见改了，评论区一片“作者听劝”。但老读者觉得你在讨好大众，质量下滑。',
      options: [
        {
          text: '稳住别崩',
          effect: {
            writerProject: { commerciality: 5 },
          },
          nextStepId: null,
        },
      ],
    },
    {
      stepId: 'resist_result',
      title: '作者主权',
      text: '你坚持原剧情，评论区脱粉一批，但死忠更死忠了。',
      options: [
        {
          text: '时间会证明',
          effect: {
            writerProject: { quality: 3, readerRetention: 0.02 },
          },
          nextStepId: null,
        },
      ],
    },
    {
      stepId: 'meta_result',
      title: '元小说反击',
      text: '你让主角突然吐槽“你们读者真是难伺候”，评论区从骂战变成玩梗。热度暴涨。',
      options: [
        {
          text: '继续Meta',
          effect: {
            writerProject: { memeValue: 5, hype: 10 },
          },
          nextStepId: null,
        },
      ],
    },
  ],
}

/** 嘴炮狂人特质卡（同行挂炉 A 选项产出） */
export const CARD_MOUTH_GUN: InspirationCard = {
  id: 'card_mouth_gun',
  name: '嘴炮狂人的小作文',
  description: '一张写满对线金句的草稿，使用时能极大提升话题度，但会激化争议。',
  quality: '稀有',
  genre: '喜剧',
}
