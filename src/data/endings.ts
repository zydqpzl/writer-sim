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
    hint: '存款耗尽且压力崩溃时触发。',
  },
  {
    id: 'EUNUCH_PALACE',
    title: '【结局：太监宫总管】',
    tag: 'compromise',
    description:
      '你一生开了无数本书，却几乎没把任何一本写完。读者为你建立了“太监纪念馆”，你虽然不在江湖，但江湖到处都是你未完结的传说。',
    hint: '累计太监 5 本以上且没有任何完本作品时触发。',
  },
  {
    id: 'FINANCIAL_FREEDOM',
    title: '【结局：财务自由 / 封笔隐退】',
    tag: 'triumph',
    description:
      '你买下了江景创作者独栋，银行存款突破千万，最终在读者的不舍中潇洒封笔。网文江湖仍会流传你的名字，但你已不必再证明什么。',
    hint: '购买顶级住房且存款超过 1000 万后主动选择封笔隐退。',
  },
  {
    id: 'COMMERCIAL_TYCOON',
    title: '【结局：商业巨鳄】',
    tag: 'triumph',
    description:
      '老白读者骂你俗不可耐，但你的作品改编的动漫、影视、游戏遍地开花。你站在自家大平层的阳台上，笑看文坛浮沉。',
    hint: '存款突破 500 万且主导路线为大城市创作者时触发。',
  },
  {
    id: 'UNKNOWN_WORDSMITH',
    title: '【结局：默默无闻的码字机】',
    tag: 'compromise',
    description:
      '连载多年，累计字数突破百万，你从未冲上过畅销榜，但收益刚好够中产生活。你没有封神，也没有太监，是无数普通网文作者最真实的缩影。',
    hint: '累计完本且总字数破百万，但粉丝未破 10 万时触发。',
  },
  {
    id: 'NICHE_LEGEND',
    title: '【结局：小众圈内传说】',
    tag: 'triumph',
    description:
      '你的书从来没有冲上过畅销榜，但十几年来一直被读者反复品读。连高校中文系的教授，都在研究你书里的世界观构筑。',
    hint: '完本作品平均质量 80+、粉丝未破 20 万时触发。',
  },
  {
    id: 'SERIOUS_LITERATURE_MASTER',
    title: '【结局：严肃文学大师】',
    tag: 'triumph',
    description:
      '你彻底脱去了“网文写手”的帽子，用沉淀多年的文笔与结构力写出严肃文学作品，走进了高耸的文学殿堂。',
    hint: '文笔与结构力均达到 90+ 且有完本作品时触发。',
  },
  {
    id: 'CIVIL_SERVANT_WRITER',
    title: '【结局：体制内摸鱼大牛】',
    tag: 'compromise',
    description:
      '茶杯里泡着枸杞，办公室里偷偷码字。网文对你来说不再是生存的稻草，而是生活最惬意的调味剂。',
    hint: '考公/求职进度达到 100 且仍有作品在创作时触发。',
  },
  {
    id: 'PHOENIX_RESURRECTION',
    title: '【结局：秽土涅槃】',
    tag: 'triumph',
    description:
      '没人知道当年那个被全网痛骂的烂尾王，就是如今名震天下的白金大神。你用新的名字，洗刷了旧日的屈辱。',
    hint: '曾经太监过作品，后续又以新笔名一书封神时触发。',
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
