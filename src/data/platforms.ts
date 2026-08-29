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
    authorRanks: [
      {
        id: 'zhongdian_lv1',
        name: '见习写手',
        revenueThreshold: 0,
        fanThreshold: 0,
        revenueShareMultiplier: 1,
        newBookBoostBonus: 0,
        contractDifficultyModifier: 0,
        fullAttendanceBonus: 0,
        description: '刚注册的新人，分成最低，曝光靠熬。',
      },
      {
        id: 'zhongdian_lv2',
        name: '签约作者',
        revenueThreshold: 1_000,
        fanThreshold: 50,
        revenueShareMultiplier: 1.15,
        newBookBoostBonus: 0.03,
        contractDifficultyModifier: -5,
        fullAttendanceBonus: 50,
        description: '跨过签约门槛，分成小幅提升，编辑开始关注。',
      },
      {
        id: 'zhongdian_lv3',
        name: '精品作者',
        revenueThreshold: 10_000,
        fanThreshold: 500,
        revenueShareMultiplier: 1.35,
        newBookBoostBonus: 0.06,
        contractDifficultyModifier: -10,
        fullAttendanceBonus: 150,
        description: '作品进入精品频道，享受更高分成与推荐位。',
      },
      {
        id: 'zhongdian_lv4',
        name: '大神作家',
        revenueThreshold: 50_000,
        fanThreshold: 3_000,
        revenueShareMultiplier: 1.6,
        newBookBoostBonus: 0.1,
        contractDifficultyModifier: -15,
        fullAttendanceBonus: 300,
        description: '一书封神，平台资源倾斜，版权部主动找上门。',
      },
      {
        id: 'zhongdian_lv5',
        name: '白金作家',
        revenueThreshold: 200_000,
        fanThreshold: 15_000,
        revenueShareMultiplier: 2,
        newBookBoostBonus: 0.15,
        contractDifficultyModifier: -20,
        fullAttendanceBonus: 600,
        description: '平台的门面招牌，天价合约与 IP 改编信手拈来。',
      },
    ],
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
    authorRanks: [
      {
        id: 'kuaiyue_lv1',
        name: '扑街写手',
        revenueThreshold: 0,
        fanThreshold: 0,
        revenueShareMultiplier: 1,
        newBookBoostBonus: 0,
        contractDifficultyModifier: 0,
        fullAttendanceBonus: 0,
        description: '算法池里的炮灰，一分钱难倒英雄汉。',
      },
      {
        id: 'kuaiyue_lv2',
        name: '算法宠儿',
        revenueThreshold: 800,
        fanThreshold: 100,
        revenueShareMultiplier: 1.12,
        newBookBoostBonus: 0.04,
        contractDifficultyModifier: -3,
        fullAttendanceBonus: 30,
        description: '被算法挑中，流量开始稳定涌入。',
      },
      {
        id: 'kuaiyue_lv3',
        name: '流量主',
        revenueThreshold: 6_000,
        fanThreshold: 800,
        revenueShareMultiplier: 1.3,
        newBookBoostBonus: 0.08,
        contractDifficultyModifier: -8,
        fullAttendanceBonus: 100,
        description: '广告分成可观，日更就是印钞机。',
      },
      {
        id: 'kuaiyue_lv4',
        name: '平台达人',
        revenueThreshold: 30_000,
        fanThreshold: 4_000,
        revenueShareMultiplier: 1.55,
        newBookBoostBonus: 0.12,
        contractDifficultyModifier: -12,
        fullAttendanceBonus: 250,
        description: '站内头部作者，开书自带广告位。',
      },
      {
        id: 'kuaiyue_lv5',
        name: '顶流签约',
        revenueThreshold: 120_000,
        fanThreshold: 20_000,
        revenueShareMultiplier: 1.9,
        newBookBoostBonus: 0.18,
        contractDifficultyModifier: -18,
        fullAttendanceBonus: 500,
        description: '平台死保的流量担当，断更一天算法都为你哭泣。',
      },
    ],
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
    authorRanks: [
      {
        id: 'suchuan_lv1',
        name: '新人试炼',
        revenueThreshold: 0,
        fanThreshold: 0,
        revenueShareMultiplier: 1,
        newBookBoostBonus: 0,
        contractDifficultyModifier: 0,
        fullAttendanceBonus: 0,
        description: '首订扑街概率极高，绝大多数人倒在第一本书。',
      },
      {
        id: 'suchuan_lv2',
        name: '日万狂魔',
        revenueThreshold: 1_200,
        fanThreshold: 80,
        revenueShareMultiplier: 1.1,
        newBookBoostBonus: 0.03,
        contractDifficultyModifier: -4,
        fullAttendanceBonus: 60,
        description: '靠更新量站稳脚跟，编辑看你像看一台打印机。',
      },
      {
        id: 'suchuan_lv3',
        name: '首订战神',
        revenueThreshold: 8_000,
        fanThreshold: 600,
        revenueShareMultiplier: 1.28,
        newBookBoostBonus: 0.07,
        contractDifficultyModifier: -9,
        fullAttendanceBonus: 180,
        description: '首订破纪录，你就是平台的流量发动机。',
      },
      {
        id: 'suchuan_lv4',
        name: '畅销王者',
        revenueThreshold: 40_000,
        fanThreshold: 3_500,
        revenueShareMultiplier: 1.5,
        newBookBoostBonus: 0.11,
        contractDifficultyModifier: -14,
        fullAttendanceBonus: 350,
        description: '月票榜常客，读者追更到凌晨三点。',
      },
      {
        id: 'suchuan_lv5',
        name: '触手之神',
        revenueThreshold: 150_000,
        fanThreshold: 18_000,
        revenueShareMultiplier: 1.85,
        newBookBoostBonus: 0.16,
        contractDifficultyModifier: -20,
        fullAttendanceBonus: 700,
        description: '日更两万如喝水，全站公认的码字永动机。',
      },
    ],
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
    authorRanks: [
      {
        id: 'lvjiang_lv1',
        name: '冷圈自嗨',
        revenueThreshold: 0,
        fanThreshold: 0,
        revenueShareMultiplier: 1,
        newBookBoostBonus: 0,
        contractDifficultyModifier: 0,
        fullAttendanceBonus: 0,
        description: '在小圈子里默默写文，订阅寥若晨星。',
      },
      {
        id: 'lvjiang_lv2',
        name: '榜单常客',
        revenueThreshold: 600,
        fanThreshold: 80,
        revenueShareMultiplier: 1.1,
        newBookBoostBonus: 0.03,
        contractDifficultyModifier: -4,
        fullAttendanceBonus: 40,
        description: '偶尔能挤入分频榜单，开始积累长情读者。',
      },
      {
        id: 'lvjiang_lv3',
        name: '榜单霸王',
        revenueThreshold: 5_000,
        fanThreshold: 600,
        revenueShareMultiplier: 1.25,
        newBookBoostBonus: 0.07,
        contractDifficultyModifier: -8,
        fullAttendanceBonus: 120,
        description: '榜单前排钉子户，评论区画风自成一派。',
      },
      {
        id: 'lvjiang_lv4',
        name: 'IP 储备作者',
        revenueThreshold: 25_000,
        fanThreshold: 3_000,
        revenueShareMultiplier: 1.45,
        newBookBoostBonus: 0.1,
        contractDifficultyModifier: -13,
        fullAttendanceBonus: 280,
        description: '版权部重点关注对象，改编邀约开始出现。',
      },
      {
        id: 'lvjiang_lv5',
        name: '影视改编大神',
        revenueThreshold: 100_000,
        fanThreshold: 12_000,
        revenueShareMultiplier: 1.75,
        newBookBoostBonus: 0.15,
        contractDifficultyModifier: -18,
        fullAttendanceBonus: 550,
        description: '作品频繁售出影视/有声/漫画版权，靠 IP 躺着赚钱。',
      },
    ],
  },
}

/** 平台列表（便于 UI 遍历） */
export const PLATFORM_LIST = Object.values(PLATFORMS)

/** 根据累计收益与粉丝，计算在某平台的当前作家等级与下一级信息 */
export function getPlatformAuthorRank(
  platformId: NovelPlatformId,
  totalRevenue: number,
  totalFans: number,
): {
  currentRank: PlatformAuthorRank
  nextRank: PlatformAuthorRank | null
  progressToNext: number
} {
  const platform = PLATFORMS[platformId]
  const ranks = platform.authorRanks
  let currentRank = ranks[0]
  let nextRank: PlatformAuthorRank | null = null

  for (let i = 0; i < ranks.length; i++) {
    const rank = ranks[i]
    if (totalRevenue >= rank.revenueThreshold && totalFans >= rank.fanThreshold) {
      currentRank = rank
      nextRank = ranks[i + 1] ?? null
    } else {
      break
    }
  }

  let progressToNext = 0
  if (nextRank) {
    const revenueProgress = Math.min(
      1,
      Math.max(0, (totalRevenue - currentRank.revenueThreshold) / (nextRank.revenueThreshold - currentRank.revenueThreshold)),
    )
    const fanProgress = Math.min(
      1,
      Math.max(0, (totalFans - currentRank.fanThreshold) / (nextRank.fanThreshold - currentRank.fanThreshold)),
    )
    progressToNext = Math.min(revenueProgress, fanProgress)
  }

  return { currentRank, nextRank, progressToNext }
}
