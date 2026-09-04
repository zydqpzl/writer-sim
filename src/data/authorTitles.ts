// 江湖称号 / 读者爱称池
// 官方职级之外的民间声誉系统，用于沉淀玩家写作风格、更新习惯与黑历史。

import type { AuthorTitle } from '../types/authorTitle'

export const AUTHOR_TITLES: AuthorTitle[] = [
  {
    id: 'speed_demon',
    name: '触手怪',
    description: '连续 7 天保持日更过万，读者怀疑你长了八只手。',
    unlockCondition: { type: 'consecutive_daily_updates', threshold: 7 },
    traitId: 'trait_title_speed_demon',
  },
  {
    id: 'cliffhanger_master',
    name: '断章狂魔',
    description: '你总把高潮掐在最关键的一行，评论区每天刷“狗贼作者”。',
    unlockCondition: { type: 'style_trait', threshold: 1, styleTraitId: 'cliffhanger_god' },
    traitId: 'trait_title_cliffhanger_master',
  },
  {
    id: 'toxic_healer',
    name: '毒奶战神',
    description: '连续两部慢热/高难度作品逆袭成神，专治“开篇劝退”。',
    unlockCondition: { type: 'manual', threshold: 1 },
    traitId: 'trait_title_toxic_healer',
  },
  {
    id: 'top_chart_emperor',
    name: '天榜大帝',
    description: '曾登顶平台榜首，新书发布首日自带围观群众。',
    unlockCondition: { type: 'manual', threshold: 1 },
    traitId: 'trait_title_top_chart_emperor',
  },
  {
    id: 'master_of_lore',
    name: '世界观建筑师',
    description: '单部作品破百万字且质量过硬，读者开始画地图、写年表。',
    unlockCondition: { type: 'word_count', threshold: 1_000_000 },
    traitId: 'trait_title_master_of_lore',
  },
  {
    id: 'eunuch_king',
    name: '宫廷总管',
    description: '累计太监 3 本以上，读者看到你开新书先问“这本能活多久”。',
    unlockCondition: { type: 'total_abandoned_books', threshold: 3 },
    traitId: 'trait_title_eunuch_king',
  },
  {
    id: 'sweet_daily',
    name: '治愈系仙人',
    description: '把极致日常流写到让读者想住进去，死忠粉粘度极高。',
    unlockCondition: { type: 'style_trait', threshold: 1, styleTraitId: 'cozy_daily' },
    traitId: 'trait_title_sweet_daily',
  },
]

export const AUTHOR_TITLE_BY_ID: Record<string, AuthorTitle> = Object.fromEntries(
  AUTHOR_TITLES.map((t) => [t.id, t]),
)
