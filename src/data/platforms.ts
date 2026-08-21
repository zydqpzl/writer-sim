// 网文江湖：四大平台生态配置

import type { NovelPlatform, NovelPlatformId } from '../types/platform'

/**
 * 四大平台不是线性升级关系，而是代表不同的读者群体、变现规则和生存法则。
 * 玩家发书时选择平台，直接决定这一局的玩法流派。
 */
export const PLATFORMS: Record<NovelPlatformId, NovelPlatform> = {
  ZHONGDIAN: {
    id: 'ZHONGDIAN',
    name: '终点中文',
    tagline: '神仙打架的传统订阅战场',
    description:
      '网文界的老牌订阅平台，读者付费意愿强，版权价值高。但签约门槛极高，大神扎堆，新人想出头必须靠质量和更新量双重硬实力。',
    businessModel: 'SUBSCRIPTION',
    algorithmFocus: {
      quality: 0.35,
      commerciality: 0.25,
      memeValue: 0.15,
      hype: 0.25,
    },
    baseContractDifficulty: 75,
    baseDailyReaders: 80_000,
    newBookBoost: 0.15,
    memeSpreadFactor: 0.8,
    eventWeights: {
      blackfan: 0.2,
      peerRoast: 0.35,
      antiPiracy: 0.2,
      commentRevolt: 0.25,
    },
  },
  KUAIYUE: {
    id: 'KUAIYUE',
    name: '快阅小说',
    tagline: '算法冷酷的免费广告流量池',
    description:
      '免费广告分成模式，流量大但算法极其冷酷。书好不一定有人看，追读、完读率决定生死。适合快速起量、赚快钱，但缺乏长期 IP 价值。',
    businessModel: 'FREE_AD',
    algorithmFocus: {
      quality: 0.15,
      commerciality: 0.35,
      memeValue: 0.25,
      hype: 0.25,
    },
    baseContractDifficulty: 30,
    baseDailyReaders: 200_000,
    newBookBoost: 0.35,
    memeSpreadFactor: 1.2,
    eventWeights: {
      blackfan: 0.15,
      peerRoast: 0.2,
      antiPiracy: 0.15,
      commentRevolt: 0.5,
    },
  },
  SUCHUAN: {
    id: 'SUCHUAN',
    name: '速穿中文',
    tagline: '首订定生死的爆更绞肉机',
    description:
      '以"快节奏、强爽点、日更两万"著称。首订决定生死，生命周期极短，停更一天追读就归零。适合人形码字机快速攒首付，但不适合想沉淀口碑的作者。',
    businessModel: 'SUBSCRIPTION',
    algorithmFocus: {
      quality: 0.1,
      commerciality: 0.4,
      memeValue: 0.3,
      hype: 0.2,
    },
    baseContractDifficulty: 40,
    baseDailyReaders: 120_000,
    newBookBoost: 0.25,
    memeSpreadFactor: 1.5,
    eventWeights: {
      blackfan: 0.3,
      peerRoast: 0.3,
      antiPiracy: 0.25,
      commentRevolt: 0.15,
    },
  },
  LVJIANG: {
    id: 'LVJIANG',
    name: '绿江文学',
    tagline: '粉丝发电与 IP 改编的封闭圈子',
    description:
      '以长情读者和强社群著称，订阅收益一般，但版权改编价值极高。圈子相对封闭，黑粉容易抱团，常因道德细节被举报。适合写高质量群像剧的作者。',
    businessModel: 'IP_DRIVEN',
    algorithmFocus: {
      quality: 0.4,
      commerciality: 0.1,
      memeValue: 0.2,
      hype: 0.3,
    },
    baseContractDifficulty: 55,
    baseDailyReaders: 50_000,
    newBookBoost: 0.2,
    memeSpreadFactor: 1.0,
    eventWeights: {
      blackfan: 0.25,
      peerRoast: 0.15,
      antiPiracy: 0.1,
      commentRevolt: 0.5,
    },
  },
}

/** 平台列表（便于 UI 遍历） */
export const PLATFORM_LIST = Object.values(PLATFORMS)
