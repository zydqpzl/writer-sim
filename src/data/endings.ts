import type { Ending } from '../types/game'

/**
 * 结局图鉴。
 * 按优先级从高到低排列：特殊阈值结局 > 主导路线结局 > 破产/开放结局。
 * resolveEnding() 会按此顺序命中第一条满足条件的结局。
 */
export const ENDINGS: Ending[] = [
  {
    id: 'BURNOUT_FAIL',
    title: '【结局 00：燃尽】',
    tag: 'fail',
    description:
      '存款见底，压力爆表，你终于在某天凌晨对着空白文档崩溃大哭。自由职业这场豪赌，你all in了所有筹码，却连底裤都没保住。',
    hint: '在存款耗尽且压力崩溃时触发。',
  },
  {
    id: 'CIVIL_SERVANT_SECRET_KOL',
    title: '【结局 07：体制内的隐秘大鳄】',
    tag: 'triumph',
    description:
      '你听从父母回老家考上了税务局，但暗地里把体制内的荒诞日常写成小说、做成匿名视频。白天在窗口给群众盖章，晚上在灯下给粉丝签名。二叔至今以为你一个月只拿3500块工资。',
    hint: '回老家并且考编/求职进度达到100时触发。',
  },
  {
    id: 'BOARDGAME_SHOP_OWNER',
    title: '【结局 13：桌游店的传奇店长】',
    tag: 'triumph',
    description:
      '你的网文没写火，但因为在桌游店当DM积累了无数好评，最后和老板合伙开店，成了当地亚文化圣地。"我没能写出流芳百世的小说，但我亲手带出了几百个勇者。"',
    hint: '亚文化圈内声望达到80以上时触发。',
  },
  {
    id: 'TOP_UP_MASTER',
    title: '【结局 01：百大UP主 / 顶流作家】',
    tag: 'triumph',
    description:
      '你在大城市咬牙坚持，终于等来了那个爆款。粉丝破百万的那天，你看着后台数据，发现房租、外卖、父母的叹息，忽然都变得可以忍受了。',
    hint: '粉丝数突破100万时触发。',
  },
  {
    id: 'HOMETOWN_EMPEROR',
    title: '【结局 21：老家皇位继承人】',
    tag: 'compromise',
    description:
      '你放弃了创作，全盘接受人情世故，接手了家里的小超市。大城市的霓虹灯远了，但县城茶馆里的第一把交椅，是你的了。',
    hint: '回老家且走下沉/人情路线成为主导时触发。',
  },
  {
    id: 'HOMETOWN_KOL',
    title: '【结局 12：县城观察家】',
    tag: 'triumph',
    description:
      '你把老家的荒诞日常剪成视频，意外走通了下沉市场爆款路线。县城不大，但你的粉丝遍布每一个返乡青年的手机屏幕。',
    hint: '回老家且以生活/三农/黑色幽默为主时触发。',
  },
  {
    id: 'SUBCULTURE_COSER',
    title: '【结局 14：圈内知名NPC】',
    tag: 'triumph',
    description:
      '你没有成为传统意义上的"大V"，但在亚文化小圈里，你是那个所有人都认识的传奇DM/Coser/活动策划。圈子很小，但足够真实。',
    hint: '亚文化路线主导且未开店时触发。',
  },
  {
    id: 'BIG_CITY_SURVIVOR',
    title: '【结局 03：大城市幸存者】',
    tag: 'compromise',
    description:
      '60天过去，你没有爆红，但也没有倒下。粉丝不多，收入刚好够付房租和外卖。自由职业这条路，你还在继续走——只是不知道还能走多久。',
    hint: '留在大城市但粉丝未破百万时触发。',
  },
  {
    id: 'OFFICE_WORKER',
    title: '【结局 05：上岸/大厂螺丝钉】',
    tag: 'compromise',
    description:
      '你向现实妥协，把创作变成了周末的业余爱好。工资稳定了，父母笑了，但你偶尔半夜醒来，会想起那个曾经想靠笔杆子闯出一片天的自己。',
    hint: '兼职时间远超创作，且考编/求职进度较高时触发。',
  },
  {
    id: 'BALANCED_WANDERER',
    title: '【结局 30：仍在路上的咸鱼】',
    tag: 'open',
    description:
      '60天结束，你没有走上任何一条明显的轨线。也许你只是还需要更多时间——毕竟，谁规定咸鱼不能慢慢翻身呢？',
    hint: '没有明显路线倾向时触发。',
  },
]

/** 按 id 快速索引结局 */
export const ENDING_BY_ID: Record<string, Ending> = ENDINGS.reduce(
  (acc, e) => {
    acc[e.id] = e
    return acc
  },
  {} as Record<string, Ending>,
)
