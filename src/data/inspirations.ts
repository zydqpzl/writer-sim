// 写作灵感池：从现实生活事件中萃取的素材

import type { WritingInspiration } from '../types/career'

export const INSPIRATION_POOL: WritingInspiration[] = [
  {
    id: 'insp_takeaway_rush',
    name: '深夜外卖爆单',
    description: '你在深夜送餐时亲历了暴雨中的爆单 chaos，城市霓虹与狼狈外卖员形成强烈反差。',
    source: '跑外卖兼职',
    statBonus: { commerciality: 4, memeValue: 2 },
    specialTag: '社畜共鸣',
  },
  {
    id: 'insp_dragon_bite',
    name: '疯狂龙猫',
    description: '你在异宠店兼职时被一只龙猫咬伤屁股，疼痛中带着荒诞。',
    source: '异宠店兼职',
    statBonus: { memeValue: 6, quality: 1 },
    specialTag: '荒诞生物',
  },
  {
    id: 'insp_maid_cafe',
    name: '二次元女仆店见闻',
    description: '你在女仆咖啡厅打工，见识了御宅族的社交仪式与隐秘温柔。',
    source: '亚文化奇遇兼职',
    statBonus: { memeValue: 5, commerciality: 2 },
    specialTag: '亚文化',
  },
  {
    id: 'insp_hometown_aunt',
    name: '县城亲戚逼婚现场',
    description: '回老家过年，三姑六婆围着你问工资、对象、房子，窒息但真实。',
    source: '回老家事件',
    statBonus: { commerciality: 3, memeValue: 4 },
    specialTag: '家庭修罗场',
  },
  {
    id: 'insp_hospital_hemorrhoid',
    name: '痔疮手术的痛觉',
    description: '久坐写稿引发痔疮，手术台上你悟到了人生与肛肠的辩证关系。',
    source: '健康恶化事件',
    statBonus: { quality: 3, memeValue: 3 },
    specialTag: '黑色幽默',
  },
  {
    id: 'insp_breakdown_vomit',
    name: '崩溃式吐槽文',
    description: '你在压力崩溃后写下的一篇歇斯底里吐槽，读者直呼“太真实了”。',
    source: '精神崩溃事件',
    statBonus: { quality: 4, memeValue: 5 },
    specialTag: '情绪核弹',
  },
  {
    id: 'insp_dm_story',
    name: '桌游店跑团神展开',
    description: '你带的一车 COC 跑团意外神展开，玩家集体破防。',
    source: '桌游店 DM 兼职',
    statBonus: { quality: 5, memeValue: 3 },
    specialTag: '叙事诡计',
  },
  {
    id: 'insp_parents_wechat',
    name: '父母转发养生文',
    description: '你妈连续给你发了三十条“年轻人要稳定”的公众号文章。',
    source: '敷衍父母',
    statBonus: { commerciality: 2, memeValue: 3 },
    specialTag: '代际冲突',
  },
]

export const INSPIRATION_BY_ID: Record<string, WritingInspiration> =
  INSPIRATION_POOL.reduce((acc, insp) => {
    acc[insp.id] = insp
    return acc
  }, {} as Record<string, WritingInspiration>)

/** 根据特殊标签随机获取一个灵感（用于事件链奖励） */
export function getInspirationsByTag(tag: string): WritingInspiration[] {
  return INSPIRATION_POOL.filter((i) => i.specialTag === tag)
}

/** 根据来源说明随机获取一个灵感 */
export function getInspirationsBySource(source: string): WritingInspiration[] {
  return INSPIRATION_POOL.filter((i) => i.source === source)
}
