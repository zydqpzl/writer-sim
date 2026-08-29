// 网文江湖：平台生态、NPC 同行与排行榜模拟引擎

import { getTrendMatches } from '../data/marketTrends'
import { PLATFORMS } from '../data/platforms'
import type {
  BoardType,
  Leaderboard,
  LeaderboardEntry,
  NPCCreator,
  NPCCreatorStyle,
  NPCDailyResult,
  NPCInteraction,
  NovelPlatform,
  NovelPlatformId,
  PlatformDailyResult,
  PlatformMemeTrend,
  PlatformRumor,
} from '../types/platform'
import type { AuthorMeme, MarketTrend, WriterProject } from '../types/career'

let npcIdSeed = 1
let rumorIdSeed = 1
let interactionIdSeed = 1

/* ============================================================
 * 工具函数
 * ============================================================ */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function randomPick<T>(arr: T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)]
}

function randomRange(
  min: number,
  max: number,
  rng: () => number = Math.random,
): number {
  return min + (max - min) * rng()
}

/* ============================================================
 * NPC 数据池
 * ============================================================ */

const NPC_NAME_POOL = [
  '疯狂触手',
  '键盘侠之王',
  '太监大魔王',
  '咸鱼写手',
  '日更两万',
  '剧情狂魔',
  '烂尾仙人',
  '爆更机器',
  '伏笔之神',
  '水文宗师',
  '绿江鸽子',
  '番茄刀客',
  '龙空战神',
  '扑街二十年',
  '一夜封神',
  '套路批发商',
  '反套路先锋',
  '刀尖舔糖',
  '读者之父',
  '断章狗',
]

const NPC_BOOK_TITLES: Record<NPCCreatorStyle, string[]> = {
  SPEED_RUN: [
    '开局签到十万个金手指',
    '我在修仙界送外卖',
    '重生之我在末日囤物资',
    '全民转职：我召唤师无敌',
  ],
  QUALITY_MONSTER: [
    '赛博朋克育儿经',
    '大魏宫廷起居注',
    '群星熄灭之时',
    '旧日支配者的退休生活',
  ],
  DRAMA_QUEEN: [
    '我的黑粉全是大佬',
    '对线三界：作者不服来战',
    '被挂炉后我成了顶流',
    '评论区逼宫：你们行你们上',
  ],
  SLACKER: [
    '摸鱼写手的成神之路',
    '三天打鱼两天晒网',
    '随缘更新：爱看看不看滚',
    '写不动了就太监',
  ],
  TURTLE: [
    '新书：这次绝对不鸽',
    '开局惊艳然后消失',
    '第三本了一定完本',
    '切书证道',
  ],
}

const NPC_STYLES: NPCCreatorStyle[] = [
  'SPEED_RUN',
  'QUALITY_MONSTER',
  'DRAMA_QUEEN',
  'SLACKER',
  'TURTLE',
]

/* ============================================================
 * NPC 生成
 * ============================================================ */

/** 根据平台风格权重生成一个 NPC 同行 */
export function generateNPC(
  platformId: NovelPlatformId,
  rng: () => number = Math.random,
): NPCCreator {
  const style = randomPick(NPC_STYLES, rng)
  const platform = PLATFORMS[platformId]

  // 根据平台调整初始三维
  const baseQuality = randomRange(30, 70, rng)
  const baseCommerciality = randomRange(30, 80, rng)
  const baseMemeValue = randomRange(10, 60, rng)

  // 平台偏好会让 NPC 在该维度上有所偏向
  const quality = clamp(
    baseQuality + platform.algorithmFocus.quality * 30,
    10,
    95,
  )
  const commerciality = clamp(
    baseCommerciality + platform.algorithmFocus.commerciality * 30,
    10,
    95,
  )
  const memeValue = clamp(
    baseMemeValue + platform.algorithmFocus.memeValue * 30,
    5,
    90,
  )

  return {
    id: `npc_${npcIdSeed++}`,
    name: randomPick(NPC_NAME_POOL, rng),
    style,
    currentBookTitle: randomPick(NPC_BOOK_TITLES[style], rng),
    platformId,
    hype: clamp(randomRange(10, 50, rng) + platform.newBookBoost * 30, 5, 80),
    wordCount: Math.floor(randomRange(10_000, 200_000, rng)),
    quality,
    commerciality,
    memeValue,
    readerRetention: randomRange(0.05, 0.35, rng),
    status: 'ACTIVE',
    consecutiveDailyUpdates: Math.floor(randomRange(0, 30, rng)),
    bookAgeDays: Math.floor(randomRange(1, 60, rng)),
    relationship: 0,
    hasMetPlayer: false,
  }
}

/** 生成初始 NPC 生态：每个平台若干名活跃作者 */
export function generateInitialNpcs(
  countPerPlatform: number = 4,
  rng: () => number = Math.random,
): NPCCreator[] {
  const npcs: NPCCreator[] = []
  for (const platformId of Object.keys(PLATFORMS) as NovelPlatformId[]) {
    for (let i = 0; i < countPerPlatform; i++) {
      npcs.push(generateNPC(platformId, rng))
    }
  }
  return npcs
}

/* ============================================================
 * NPC 每日模拟
 * ============================================================ */

function getStyleDailyWords(style: NPCCreatorStyle): number {
  switch (style) {
    case 'SPEED_RUN':
      return randomRange(8_000, 25_000)
    case 'QUALITY_MONSTER':
      return randomRange(2_000, 6_000)
    case 'DRAMA_QUEEN':
      return randomRange(3_000, 10_000)
    case 'SLACKER':
      return Math.random() < 0.25 ? 0 : randomRange(1_000, 5_000)
    case 'TURTLE':
      return Math.random() < 0.4 ? 0 : randomRange(2_000, 8_000)
  }
}

function getStyleQualityDelta(style: NPCCreatorStyle): number {
  switch (style) {
    case 'SPEED_RUN':
      return randomRange(-2, 0.5)
    case 'QUALITY_MONSTER':
      return randomRange(-0.5, 2)
    case 'DRAMA_QUEEN':
      return randomRange(-1, 1)
    case 'SLACKER':
      return randomRange(-1, 0.5)
    case 'TURTLE':
      return randomRange(-1, 1)
  }
}

/** 模拟一个 NPC 的一天，返回更新后的 NPC 和日志 */
export function simulateNPCDaily(
  npc: NPCCreator,
  platform: NovelPlatform,
  rng: () => number = Math.random,
): NPCDailyResult {
  const logs: string[] = []
  let next: NPCCreator = { ...npc }

  // 不同风格更新量不同
  const dailyWords = getStyleDailyWords(next.style)

  // 太监大魔王：数据不好直接切书
  if (
    next.style === 'TURTLE' &&
    next.bookAgeDays > 10 &&
    next.hype < 35 &&
    rng() < 0.15
  ) {
    next.status = 'ABANDONED'
    next.consecutiveDailyUpdates = 0
    logs.push(
      `【${platform.name}】NPC 作者「${next.name}」的新书《${next.currentBookTitle}》数据不佳，已经太监切书。`,
    )
    return { npc: next, logs }
  }

  // 质量怪/咸鱼：数据好可能完结
  if (
    (next.style === 'QUALITY_MONSTER' || next.style === 'SLACKER') &&
    next.wordCount > 300_000 &&
    next.hype > 60 &&
    rng() < 0.05
  ) {
    next.status = 'COMPLETED'
    logs.push(
      `【${platform.name}】NPC 作者「${next.name}」的《${next.currentBookTitle}》正式完结，读者在评论区排队撒花。`,
    )
    return { npc: next, logs }
  }

  // 正常更新
  next.wordCount += Math.floor(dailyWords)
  next.bookAgeDays += 1

  if (dailyWords > 0) {
    next.consecutiveDailyUpdates += 1
  } else {
    next.consecutiveDailyUpdates = 0
    next.readerRetention = clamp(next.readerRetention - 0.02, 0.01, 0.95)
  }

  // 质量波动
  next.quality = clamp(
    next.quality + getStyleQualityDelta(next.style),
    10,
    98,
  )
  next.commerciality = clamp(
    next.commerciality + randomRange(-1, 1.5, rng),
    10,
    98,
  )
  next.memeValue = clamp(
    next.memeValue + randomRange(-1, 2, rng),
    5,
    95,
  )

  // 热度自然衰减 + 更新带来的回升
  const decay = 0.92 + platform.algorithmFocus.hype * 0.05
  const updateBoost = dailyWords > 0 ? Math.min(5, dailyWords / 5000) : -2
  next.hype = clamp(next.hype * decay + updateBoost, 5, 98)

  // 追读率波动
  const retentionDelta =
    dailyWords > 0
      ? randomRange(-0.005, 0.015, rng)
      : randomRange(-0.03, -0.01, rng)
  next.readerRetention = clamp(next.readerRetention + retentionDelta, 0.01, 0.95)

  return { npc: next, logs }
}

/* ============================================================
 * 排行榜计算
 * ============================================================ */

/** 计算单本书的榜单分数（平台算法 + 榜单类型偏好） */
function computeBookScore(
  platform: NovelPlatform,
  boardType: BoardType,
  quality: number,
  commerciality: number,
  memeValue: number,
  hype: number,
  readerRetention: number,
  wordCount: number,
  bookAgeDays: number,
): number {
  const af = platform.algorithmFocus

  // 基础算法分
  let score =
    quality * af.quality +
    commerciality * af.commerciality +
    memeValue * af.memeValue +
    hype * af.hype

  // 榜单类型加成
  switch (boardType) {
    case 'NEW_BOOK':
      // 新书榜偏好书龄短、有新书扶持的书
      score += platform.newBookBoost * 30
      score *= Math.max(0.3, 1 - bookAgeDays / 60)
      break
    case 'MONTHLY_TICKET':
      // 月票榜偏好追读高、更新稳定的书
      score += readerRetention * 40
      break
    case 'RECOMMEND':
      // 推荐榜偏好商业性和梗值
      score += commerciality * 0.2 + memeValue * 0.2
      break
    case 'READING':
      // 阅读榜偏好字数多、热度高的书
      score += Math.min(20, wordCount / 50_000)
      break
  }

  return score
}

/** 计算某个平台的某个榜单 */
export function computeLeaderboard(
  platformId: NovelPlatformId,
  boardType: BoardType,
  day: number,
  npcs: NPCCreator[],
  playerProject?: WriterProject,
): Leaderboard {
  const platform = PLATFORMS[platformId]
  const entries: LeaderboardEntry[] = []

  // 加入该平台的 NPC 书籍
  for (const npc of npcs.filter(
    (n) => n.platformId === platformId && n.status === 'ACTIVE',
  )) {
    entries.push({
      type: 'npc',
      id: npc.id,
      rank: 0,
      score: computeBookScore(
        platform,
        boardType,
        npc.quality,
        npc.commerciality,
        npc.memeValue,
        npc.hype,
        npc.readerRetention,
        npc.wordCount,
        npc.bookAgeDays,
      ),
      title: npc.currentBookTitle,
      author: npc.name,
    })
  }

  // 加入玩家书籍（如果存在且在该平台）
  if (
    playerProject &&
    playerProject.platformId === platformId &&
    playerProject.stage !== 'ABANDONED'
  ) {
    entries.push({
      type: 'player',
      id: playerProject.id,
      rank: 0,
      score: computeBookScore(
        platform,
        boardType,
        playerProject.quality,
        playerProject.commerciality,
        playerProject.memeValue,
        playerProject.metrics.currentHype,
        playerProject.readerRetention,
        playerProject.wordCount,
        day - playerProject.dayCreated,
      ),
      title: playerProject.title,
      author: '你',
    })
  }

  // 按分数降序排列并赋值排名
  entries.sort((a, b) => b.score - a.score)
  entries.forEach((entry, index) => {
    entry.rank = index + 1
  })

  return {
    platformId,
    boardType,
    entries,
    updatedDay: day,
  }
}

/** 计算某个平台的所有榜单 */
export function computePlatformLeaderboards(
  platformId: NovelPlatformId,
  day: number,
  npcs: NPCCreator[],
  playerProject?: WriterProject,
): Leaderboard[] {
  const boardTypes: BoardType[] = [
    'NEW_BOOK',
    'MONTHLY_TICKET',
    'RECOMMEND',
    'READING',
  ]
  return boardTypes.map((boardType) =>
    computeLeaderboard(platformId, boardType, day, npcs, playerProject),
  )
}

/* ============================================================
 * 平台每日结算
 * ============================================================ */

/** 补充因太监/完结而空出的生态位（随机生成新 NPC） */
function respawnNPCs(
  npcs: NPCCreator[],
  platformId: NovelPlatformId,
  targetCount: number,
  rng: () => number = Math.random,
): NPCCreator[] {
  const activeCount = npcs.filter(
    (n) => n.platformId === platformId && n.status === 'ACTIVE',
  ).length
  const newNpcs: NPCCreator[] = []
  for (let i = activeCount; i < targetCount; i++) {
    newNpcs.push(generateNPC(platformId, rng))
  }
  return [...npcs, ...newNpcs]
}

/* ============================================================
 * NPC 主动互动系统（章推 / 挂炉 / 赞美）
 * ============================================================ */

const CHAPTER_REC_TEXTS: string[] = [
  '“兄弟，加个好友，明天互个章推？”',
  '“你这书节奏不错，我在章节末尾给你挂个推荐位。”',
  '“一起冲新书榜，互惠互利。”',
]

const ROAST_TEXTS: string[] = [
  '“最近冒出不少数据异常的‘新人’，懂的都懂。”',
  '“这书也能上榜，现在的榜单水分真大。”',
  '“写得不怎么样，营销倒是挺会。”',
]

const PRAISE_TEXTS: string[] = [
  '“这新人有点东西，老手看了都点头。”',
  '“难得一见的潜力股，先加个关注。”',
  '“这章写法很特别，继续保持。”',
]

/** 处理 NPC 对玩家的主动互动 */
export function processNPCInteractions(
  playerProject: WriterProject,
  npcs: NPCCreator[],
  leaderboards: Leaderboard[],
  day: number,
  rng: () => number = Math.random,
): { updatedNpcs: NPCCreator[]; interactions: NPCInteraction[]; logs: string[] } {
  const interactions: NPCInteraction[] = []
  const logs: string[] = []
  let updatedNpcs = npcs

  // 只看玩家所在平台的榜单
  const playerRankings = leaderboards
    .filter(
      (lb) =>
        lb.platformId === playerProject.platformId &&
        lb.entries.some((e) => e.type === 'player'),
    )
    .map((lb) => ({
      boardType: lb.boardType,
      rank: lb.entries.find((e) => e.type === 'player')!.rank,
    }))

  if (playerRankings.length === 0) return { updatedNpcs, interactions, logs }

  const bestRank = Math.min(...playerRankings.map((r) => r.rank))

  // 只有冲进前 15 名才会触发互动
  if (bestRank > 15) return { updatedNpcs, interactions, logs }

  // 候选 NPC：同平台、活跃、未互动过或关系中性
  const candidates = npcs.filter(
    (n) =>
      n.platformId === playerProject.platformId &&
      n.status === 'ACTIVE' &&
      (!n.hasMetPlayer || Math.abs(n.relationship) < 20),
  )
  if (candidates.length === 0) return { updatedNpcs, interactions, logs }

  // 最多触发 1-2 个互动
  const interactionCount = rng() < 0.7 ? 1 : 2
  const shuffled = [...candidates].sort(() => rng() - 0.5)

  for (let i = 0; i < Math.min(interactionCount, shuffled.length); i++) {
    const npc = shuffled[i]
    const platform = PLATFORMS[playerProject.platformId]

    // 关系/排名决定互动类型
    let type: NPCInteraction['type'] = 'PRAISE'
    if (npc.relationship < -10 || (bestRank <= 3 && rng() < 0.35)) {
      type = 'ROAST'
    } else if (npc.relationship > 10 || rng() < 0.5) {
      type = 'CHAPTER_REC'
    }

    let text = ''
    let effect: NPCInteraction['effect'] = {}
    switch (type) {
      case 'CHAPTER_REC':
        text = `【${platform.name}】作者「${npc.name}」主动私信你：${randomPick(CHAPTER_REC_TEXTS, rng)}`
        effect = { hype: 8, retention: 0.02, relationshipDelta: 10 }
        break
      case 'ROAST':
        text = `【${platform.name}】大神「${npc.name}」在论坛开帖：${randomPick(ROAST_TEXTS, rng)}`
        effect = { controversy: 12, relationshipDelta: -15 }
        break
      case 'PRAISE':
        text = `【${platform.name}】作者「${npc.name}」在评论区公开 praise：${randomPick(PRAISE_TEXTS, rng)}`
        effect = { hype: 4, retention: 0.01, relationshipDelta: 5 }
        break
    }

    interactions.push({
      id: `interaction_${interactionIdSeed++}`,
      day,
      platformId: playerProject.platformId,
      npcId: npc.id,
      npcName: npc.name,
      type,
      text,
      effect,
    })
    logs.push(text)

    // 更新 NPC 关系与见面标记
    updatedNpcs = updatedNpcs.map((n) =>
      n.id === npc.id
        ? {
            ...n,
            hasMetPlayer: true,
            relationship: clamp(
              n.relationship + (effect.relationshipDelta ?? 0),
              -100,
              100,
            ),
          }
        : n,
    )
  }

  return { updatedNpcs, interactions, logs }
}

/* ============================================================
 * 跨作品梗传播机制
 * ============================================================ */

/** 计算作品与平台算法的匹配度（0-100）
 *  流体公式：平台偏好 × 三维 + 市场趋势加成 - 趋势饱和度 + 黑马突破
 */
export function computeAlgorithmMatchScore(
  project: WriterProject,
  platform: NovelPlatform,
  trend?: MarketTrend,
): number {
  const af = platform.algorithmFocus
  let score =
    project.quality * af.quality +
    project.commerciality * af.commerciality +
    project.memeValue * af.memeValue

  if (trend) {
    const matches = getTrendMatches(project, trend)
    const matchCount =
      matches.genres.length + matches.tags.length + matches.gimmicks.length
    // 每个匹配提供基础加成，但饱和度会削弱
    const saturation =
      [...matches.genres, ...matches.tags, ...matches.gimmicks].reduce(
        (sum, key) => sum + (trend.saturation[key] ?? 0),
        0,
      ) / Math.max(1, matchCount)
    const trendBonus = Math.min(22, matchCount * 8) * (1 - Math.min(0.7, saturation * 0.08))
    score += trendBonus
  }

  // 黑马突破：高风险脑洞组合 + 质量/爆点过硬 = 额外爆发
  if (
    project.blackHorseTriggered &&
    (project.quality + project.memeValue) / 2 >= 60
  ) {
    score += 12
  }

  return clamp(score, 0, 100)
}

/** 模拟梗在平台生态中的传播 */
export function processMemeSpread(
  playerProject: WriterProject | undefined,
  npcs: NPCCreator[],
  currentTrends: PlatformMemeTrend[],
  unlockedMemes: AuthorMeme[],
  _day: number,
  rng: () => number = Math.random,
): { updatedTrends: PlatformMemeTrend[]; playerHypeBoost: number; logs: string[] } {
  const updatedTrends: PlatformMemeTrend[] = [...currentTrends]
  const logs: string[] = []
  let playerHypeBoost = 0

  // 没有已解锁梗则不传播
  if (unlockedMemes.length === 0) return { updatedTrends, playerHypeBoost, logs }

  // 1. 已存在的梗趋势自然衰减
  for (const trend of updatedTrends) {
    trend.heat = clamp(trend.heat * 0.95, 0, 100)
  }

  // 2. NPC 可能引用玩家已解锁的梗
  for (const meme of unlockedMemes) {
    // 找出适合玩梗的 NPC（键盘侠、触手怪、质量怪都有可能）
    const memeFriendlyNpcs = npcs.filter(
      (n) =>
        n.status === 'ACTIVE' &&
        (n.style === 'DRAMA_QUEEN' || n.style === 'SPEED_RUN' || n.style === 'QUALITY_MONSTER'),
    )
    if (memeFriendlyNpcs.length === 0) continue

    // 每个梗每天有概率被某个 NPC 引用
    const referenceCount = Math.floor(rng() * memeFriendlyNpcs.length * 0.3)
    for (let i = 0; i < referenceCount; i++) {
      const npc = randomPick(memeFriendlyNpcs, rng)
      const platform = PLATFORMS[npc.platformId]

      // 找到或创建该梗在该平台的趋势
      let trend = updatedTrends.find(
        (t) => t.memeId === meme.id && t.platformId === npc.platformId,
      )
      if (!trend) {
        trend = {
          memeId: meme.id,
          memeName: meme.name,
          originBookTitle: meme.originBookTitle,
          heat: 0,
          references: 0,
          platformId: npc.platformId,
        }
        updatedTrends.push(trend)
      }

      trend.references += 1
      trend.heat = clamp(
        trend.heat + 3 * platform.memeSpreadFactor,
        0,
        100,
      )

      // 如果该 NPC 和玩家同平台，给玩家作品带来热度
      if (playerProject && npc.platformId === playerProject.platformId) {
        playerHypeBoost += 2 * platform.memeSpreadFactor
        if (logs.length < 3) {
          logs.push(
            `【${platform.name}】NPC 作者「${npc.name}」在新章里玩了你的梗「${meme.name}」，读者纷纷跑来围观你的书。`,
          )
        }
      }
    }
  }

  // 3. 玩家当前作品的梗值高时，可能诞生新平台热梗
  if (
    playerProject &&
    playerProject.memeValue >= 60 &&
    rng() < 0.05 * (playerProject.metrics.currentHype / 100)
  ) {
    const platform = PLATFORMS[playerProject.platformId]
    const newMemeName = `《${playerProject.title}》式名场面`
    let trend = updatedTrends.find(
      (t) => t.memeId === `trend_${playerProject.id}` && t.platformId === playerProject.platformId,
    )
    if (!trend) {
      trend = {
        memeId: `trend_${playerProject.id}`,
        memeName: newMemeName,
        originBookTitle: playerProject.title,
        heat: 10,
        references: 1,
        platformId: playerProject.platformId,
      }
      updatedTrends.push(trend)
    }
    trend.heat = clamp(trend.heat + 5, 0, 100)
    trend.references += 1
    logs.push(
      `【${platform.name}】你的书《${playerProject.title}》诞生了新梗「${newMemeName}」，正在被读者传播。`,
    )
  }

  // 只保留热度 > 1 的趋势，避免数组无限增长
  const filteredTrends = updatedTrends.filter((t) => t.heat > 1)

  return {
    updatedTrends: filteredTrends,
    playerHypeBoost,
    logs,
  }
}

/* ============================================================
 * 平台每日结算（聚合 NPC、榜单、互动、梗传播）
 * ============================================================ */

/** 模拟整个平台生态的一天 */
export function simulatePlatformDaily(
  currentNpcs: NPCCreator[],
  playerProject: WriterProject | undefined,
  unlockedMemes: AuthorMeme[],
  currentTrends: PlatformMemeTrend[],
  day: number,
  rng: () => number = Math.random,
): PlatformDailyResult {
  let npcs = currentNpcs

  // 1. 补充各平台生态位
  for (const platformId of Object.keys(PLATFORMS) as NovelPlatformId[]) {
    npcs = respawnNPCs(npcs, platformId, 4, rng)
  }

  // 2. 模拟每个活跃 NPC
  const logs: string[] = []
  const updatedNpcs = npcs.map((npc) => {
    if (npc.status !== 'ACTIVE') return npc
    const platform = PLATFORMS[npc.platformId]
    const result = simulateNPCDaily(npc, platform, rng)
    logs.push(...result.logs)
    return result.npc
  })

  // 3. 计算所有榜单
  const updatedLeaderboards: Leaderboard[] = []
  for (const platformId of Object.keys(PLATFORMS) as NovelPlatformId[]) {
    const platformNpcs = updatedNpcs.filter((n) => n.platformId === platformId)
    updatedLeaderboards.push(
      ...computePlatformLeaderboards(
        platformId,
        day,
        platformNpcs,
        playerProject,
      ),
    )
  }

  // 4. NPC 主动互动（仅玩家有作品时）
  let interactedNpcs = updatedNpcs
  const interactions: NPCInteraction[] = []
  if (playerProject) {
    const interactionResult = processNPCInteractions(
      playerProject,
      updatedNpcs,
      updatedLeaderboards,
      day,
      rng,
    )
    interactedNpcs = interactionResult.updatedNpcs
    interactions.push(...interactionResult.interactions)
    logs.push(...interactionResult.logs)
  }

  // 5. 跨作品梗传播
  const memeResult = processMemeSpread(
    playerProject,
    interactedNpcs,
    currentTrends,
    unlockedMemes,
    day,
    rng,
  )
  logs.push(...memeResult.logs)

  // 6. 生成江湖传闻（从日志里挑最劲爆的 1-3 条）
  const rumors: PlatformRumor[] = logs
    .filter((text) => text.includes('【'))
    .slice(0, 3)
    .map((text) => ({
      id: `rumor_${rumorIdSeed++}`,
      day,
      platformId: (
        Object.keys(PLATFORMS).find((pid) =>
          text.includes(PLATFORMS[pid as NovelPlatformId].name),
        ) ?? 'ZHONGDIAN'
      ) as NovelPlatformId,
      text,
      involvesPlayer:
        playerProject !== undefined &&
        (text.includes('你') ||
          text.includes(playerProject.title) ||
          text.includes('你的')),
    }))

  return {
    updatedNpcs: interactedNpcs,
    updatedLeaderboards,
    logs,
    rumors,
    interactions,
    memeTrends: memeResult.updatedTrends,
  }
}
