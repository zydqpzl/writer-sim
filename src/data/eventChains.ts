import type { EventChain, InspirationCard } from '../types/event'
import {
  BOARDGAME_DM_CHAIN,
  CARD_CONTRAST_COMEDY,
  CARD_SCRIPTURE_LOGIC_FLAW,
} from './chains/boardGameDM'
import {
  CARD_NEW_YEAR_FEAST,
  CARD_RELATIVE_OBSESSION,
  FAMILY_NEW_YEAR_CHAIN,
} from './chains/familyNewYear'
import {
  CARD_HOMETOWN_HUMANITY,
  CARD_HOMETOWN_IRONY,
  CARD_HOMETOWN_PEACE,
  HOMETOWN_CHAIN,
} from './chains/hometown'
import {
  CARD_OOC_GOD,
  FANFICTION_BLOWUP_CHAIN,
  FANFICTION_COPYRIGHT_CHAIN,
  FANFICTION_PAYBACK_CHAIN,
} from './chains/fanfictionDrama'
import {
  WRITER_BLACKFAN_CHAIN,
  WRITER_FULLATTENDANCE_CHAIN,
  WRITER_REJECTION_CHAIN,
} from './chains/writerCrisis'
import {
  CARD_MOUTH_GUN,
  WRITER_ANTI_PIRACY_CHAIN,
  WRITER_COMMENT_REVOLT_CHAIN,
  WRITER_PEER_ROAST_CHAIN,
} from './chains/writerDrama'

/** 崩溃时刻 SSR 卡：精神崩溃时产出的顶级自传式槽点卡（发疯创作选项） */
export const CARD_BREAKDOWN_VOMIT: InspirationCard = {
  id: 'card_breakdown_vomit',
  name: '崩溃式吐槽文',
  description: '把压力值 300 的那一刻的所有痛苦写出来——读者会在真实的崩溃里找到共鸣，这是顶级自传体素材。',
  quality: '史诗',
  genre: '哲思',
}

/**
 * 灵感卡牌池：按 id 索引。
 * 各事件链的专属卡牌由其所在文件定义，在此统一注册。
 */
export const CARD_POOL: Record<string, InspirationCard> = {
  card_contrast_comedy: CARD_CONTRAST_COMEDY,
  card_scripture_logic_flaw: CARD_SCRIPTURE_LOGIC_FLAW,
  card_breakdown_vomit: CARD_BREAKDOWN_VOMIT,
  card_relative_obsession: CARD_RELATIVE_OBSESSION,
  card_new_year_feast: CARD_NEW_YEAR_FEAST,
  card_hometown_humanity: CARD_HOMETOWN_HUMANITY,
  card_hometown_irony: CARD_HOMETOWN_IRONY,
  card_hometown_peace: CARD_HOMETOWN_PEACE,
  card_mouth_gun: CARD_MOUTH_GUN,
  card_ooc_god: CARD_OOC_GOD,
}

/**
 * 所有可用事件链（按 id 索引）。
 * 每条链独立存放于 data/chains/<name>.ts，在此聚合注册。
 */
export const EVENT_CHAINS: Record<string, EventChain> = {
  boardgame_dm: BOARDGAME_DM_CHAIN,
  family_new_year: FAMILY_NEW_YEAR_CHAIN,
  hometown: HOMETOWN_CHAIN,
  writer_rejection_crisis: WRITER_REJECTION_CHAIN,
  writer_blackfan_crisis: WRITER_BLACKFAN_CHAIN,
  writer_fullattendance_crisis: WRITER_FULLATTENDANCE_CHAIN,
  writer_peer_roast: WRITER_PEER_ROAST_CHAIN,
  writer_anti_piracy: WRITER_ANTI_PIRACY_CHAIN,
  writer_comment_revolt: WRITER_COMMENT_REVOLT_CHAIN,
  fanfiction_blowup: FANFICTION_BLOWUP_CHAIN,
  fanfiction_copyright: FANFICTION_COPYRIGHT_CHAIN,
  fanfiction_payback: FANFICTION_PAYBACK_CHAIN,
}
