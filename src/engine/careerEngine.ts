// CareerEngine：通用主业结算与发酵核心

import type {
  AuthorMeme,
  AuthorRank,
  CareerActionResult,
  CareerDailyResult,
  InspirationApplyResult,
  MemeGenerateResult,
  ProjectPhase,
  WriterAction,
  WriterProject,
} from '../types/career'
import { INSPIRATION_BY_ID } from '../data/inspirations'
import { PLATFORMS } from '../data/platforms'
import { computeAlgorithmMatchScore } from './platformEngine'
import type { NovelPlatform, NovelPlatformId } from '../types/platform'
import {
  WRITER_ABANDON_RETENTION_PENALTY,
  WRITER_BASE_HYPE,
  WRITER_COMPLETED_PASSIVE_RATIO,
  WRITER_DEFAULT_HYPE_DECAY,
  WRITER_FULL_ATTENDANCE_DAILY_REWARD,
  WRITER_FULL_ATTENDANCE_DAILY_WORDS,
  WRITER_LAUNCH_WORD_COUNT,
  WRITER_MARKET_RNG_RANGE,
  WRITER_REVENUE_PER_1K_READS,
  WRITER_SIGNING_THRESHOLD_WORDS,
  WRITER_STRATEGIES,
  generateWriterTitle,
} from '../data/writer'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function randomRange(
  range: [number, number],
  rng: () => number = Math.random,
): number {
  return range[0] + rng() * (range[1] - range[0])
}

function randomPick<T>(arr: T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)]
}

/* ============================================================
 * 网络作家（WRITER）
 * ============================================================ */

export interface CreateWriterProjectInput {
  day: number
  platformId: import('../types/platform').NovelPlatformId
  title?: string
  /** 初始三维质量（0-100），不填则随机中等水平 */
  quality?: number
  commerciality?: number
  memeValue?: number
  rng?: () => number
}

export function createWriterProject(
  input: CreateWriterProjectInput,
): WriterProject {
  const rng = input.rng ?? Math.random
  const title = input.title ?? generateWriterTitle(rng)
  const quality = clamp(input.quality ?? 50 + rng() * 10, 0, 100)
  const commerciality = clamp(input.commerciality ?? 50 + rng() * 10, 0, 100)
  const memeValue = clamp(input.memeValue ?? 50 + rng() * 10, 0, 100)

  return {
    id: `writer_${Date.now()}_${Math.floor(rng() * 1000)}`,
    professionType: 'WRITER',
    platformId: input.platformId,
    title,
    phase: 'CONCEPT',
    stage: 'CONCEPT',
    dayCreated: input.day,
    quality,
    commerciality,
    memeValue,
    progress: 0,
    totalWorkload: WRITER_LAUNCH_WORD_COUNT * 1.5,
    metrics: {
      viewsOrReaders: 0,
      fanConversionRate: 0.005 + rng() * 0.005,
      hypeDecay: WRITER_DEFAULT_HYPE_DECAY,
      currentHype: WRITER_BASE_HYPE * 0.3,
    },
    stats: {
      totalRevenue: 0,
      totalFansGained: 0,
      bugOrControversy: 0,
      ipValue: 0,
    },
    wordCount: 0,
    launchWordCount: WRITER_LAUNCH_WORD_COUNT,
    signed: false,
    readerRetention: 0.03,
    monthlyTickets: 0,
    consecutiveDailyUpdates: 0,
    lastUpdatedDay: input.day,
    totalChapters: 0,
    readerMood: 0,
    dailyWordCount: 0,
  }
}

/** 根据字数重新计算网文项目的 progress 与阶段 */
function recalcWriterProgress(p: WriterProject): WriterProject {
  let progress = 0
  switch (p.stage) {
    case 'CONCEPT':
      progress = (p.wordCount / WRITER_SIGNING_THRESHOLD_WORDS) * 100
      break
    case 'SIGNED':
      progress =
        ((p.wordCount - WRITER_SIGNING_THRESHOLD_WORDS) /
          (WRITER_LAUNCH_WORD_COUNT - WRITER_SIGNING_THRESHOLD_WORDS)) *
        100
      break
    case 'LAUNCHED':
    case 'SERIALIZING':
      progress = 100
      break
    default:
      progress = 100
  }
  return { ...p, progress: clamp(progress, 0, 100) }
}

/** 尝试自动签约：平台根据算法偏好和签约难度决定是否通过 */
function trySign(
  p: WriterProject,
  platform: NovelPlatform,
  _day: number,
  rng: () => number = Math.random,
): { project: WriterProject; log?: string; signed: boolean } {
  if (p.stage === 'CONCEPT' && p.wordCount >= WRITER_SIGNING_THRESHOLD_WORDS) {
    // 算法分 = 平台偏好的三维加权
    const algorithmScore =
      p.quality * platform.algorithmFocus.quality +
      p.commerciality * platform.algorithmFocus.commerciality +
      p.memeValue * platform.algorithmFocus.memeValue

    // 签约阈值：平台基础难度 - 新书扶持（新书更容易签）
    const threshold =
      platform.baseContractDifficulty * (1 - platform.newBookBoost * 0.5)

    // 随机浮动 ±10%
    const roll = algorithmScore * randomRange([0.9, 1.1], rng)

    if (roll >= threshold) {
      const next: WriterProject = {
        ...p,
        stage: 'SIGNED',
        phase: 'DEVELOPING',
        signed: true,
        readerRetention: clamp(p.readerRetention + 0.05, 0, 1),
      }
      return {
        project: recalcWriterProgress(next),
        log: `《${next.title}》满 ${WRITER_SIGNING_THRESHOLD_WORDS.toLocaleString('zh-CN')} 字，${platform.name} 发来站短：作品已成功签约！`,
        signed: true,
      }
    } else {
      return {
        project: p,
        log: `《${p.title}》满 ${WRITER_SIGNING_THRESHOLD_WORDS.toLocaleString('zh-CN')} 字，但 ${platform.name} 的编辑认为作品风格不太匹配，签约被拒。`,
        signed: false,
      }
    }
  }
  return { project: p, signed: false }
}

/** 尝试上架 */
function tryLaunch(p: WriterProject, day: number): { project: WriterProject; log?: string } {
  if ((p.stage === 'SIGNED' || p.stage === 'CONCEPT') && p.wordCount >= WRITER_LAUNCH_WORD_COUNT) {
    const next: WriterProject = {
      ...p,
      stage: 'LAUNCHED',
      phase: 'LAUNCHED',
      dayLaunched: day,
      metrics: {
        ...p.metrics,
        currentHype: clamp(p.metrics.currentHype + 40, 0, 100),
      },
      readerRetention: clamp(p.readerRetention + 0.1, 0, 1),
    }
    return {
      project: recalcWriterProgress(next),
      log: `《${next.title}》满 ${WRITER_LAUNCH_WORD_COUNT.toLocaleString('zh-CN')} 字，正式上架！首订大战开始。`,
    }
  }
  return { project: p }
}

/** 连载期自动转长期连载 */
function trySerializing(p: WriterProject): WriterProject {
  if (p.stage === 'LAUNCHED' && p.wordCount >= WRITER_LAUNCH_WORD_COUNT + 50_000) {
    return { ...p, stage: 'SERIALIZING' }
  }
  return p
}

/* ============================================================
 * 读者本章说生成器
 * ============================================================ */

const PLATFORM_COMMENTS: Record<NovelPlatformId, Record<string, string[]>> = {
  ZHONGDIAN: {
    positive: [
      '终点这书名居然不是标题党，有点东西。',
      '老牌平台就需要这种质量稳定的书，月票投了。',
      '这章节奏很舒服，不像某些榜单书那么赶。',
    ],
    negative: [
      '在终点写这种文，怕不是要被大神们按在地上摩擦。',
      '签约都过不了，这质量在终点活不下去。',
      '终点读者可不好糊弄，作者还得再打磨。',
    ],
    meme: [
      '这梗怎么有点像隔壁那本《赛博痔疮患者》？',
      '作者是不是终点老书虫，这味儿太正了。',
    ],
  },
  KUAIYUE: {
    positive: [
      '快阅算法总算给我推了本能看的，追了。',
      '节奏快、爽点密，这书适合快阅。',
      '免费章节看着不心疼，先养着。',
    ],
    negative: [
      '快阅这种书一抓一大把，没两天就凉了。',
      '算法推荐这种质量，我的完读率不要了？',
      '在快阅不爆更就是死。',
    ],
    meme: [
      '这梗在快阅能火，评论区已经准备二创了。',
      '快阅读者就爱看这个，作者懂流量。',
    ],
  },
  SUCHUAN: {
    positive: [
      '爆更！日更两万！速穿就需要你这种作者！',
      '爽！不拖沓！这才叫速穿风！',
      '首订我预定了，作者别太监。',
    ],
    negative: [
      '速穿你还敢铺垫？读者早跑了。',
      '更新这么慢，在速穿就是找死。',
      '节奏太慢，速穿不适合你。',
    ],
    meme: [
      '这梗节奏够快，速穿读者就吃这套。',
      '速穿区最近流行这种整活，作者赶上了。',
    ],
  },
  LVJIANG: {
    positive: [
      '绿江就需要这种群像剧，人物刻画绝了。',
      '这章的情感张力，完全可以影视化。',
      '长情读者表示终于等到一本好书。',
    ],
    negative: [
      '绿江读者很挑的，这种设定容易被举报。',
      '圈子很小，作者注意别踩雷。',
      '绿江不适合这种商业化写法。',
    ],
    meme: [
      '绿江评论区已经开始写同人梗了。',
      '这梗在绿江能养活一堆二创太太。',
    ],
  },
}

const MEME_COMMENTS: string[] = [
  '这个梗我笑了一分钟，作者冲浪强度可以。',
  '梗是好梗，但别玩脱了。',
  '本章含梗量过高，建议搭配降压药服用。',
  '这个梗callback得妙，老粉狂喜。',
]

const CONTROVERSY_COMMENTS: string[] = [
  '评论区怎么吵起来了？作者你管管。',
  '这段有争议，但我支持作者这么写。',
  '有人开始带节奏了，读者大战预定。',
  '这章能引发讨论，说明作者写到点子上了。',
]

/** 生成一条读者本章说 */
function generateReaderComment(
  project: WriterProject,
  platform: NovelPlatform,
  strategyId: string,
  rng: () => number = Math.random,
): string {
  const buckets: string[] = []

  // 1. 策略基础评论
  const strategy = WRITER_STRATEGIES.find((s) => s.id === strategyId)
  if (strategy) {
    buckets.push(randomPick(strategy.readerComments, rng))
  }

  // 2. 平台特色评论
  const platformBucket = PLATFORM_COMMENTS[platform.id]
  if (platformBucket) {
    const tone = project.readerMood > 10 ? 'positive' : project.readerMood < -10 ? 'negative' : 'positive'
    buckets.push(randomPick(platformBucket[tone] ?? platformBucket.positive, rng))
  }

  // 3. 梗值高时触发玩梗评论
  if (project.memeValue > 60 && rng() < 0.5) {
    buckets.push(randomPick(MEME_COMMENTS, rng))
  }

  // 4. 争议值/隐患高时
  if ((project.stats.bugOrControversy ?? 0) > 30 && rng() < 0.4) {
    buckets.push(randomPick(CONTROVERSY_COMMENTS, rng))
  }

  // 5. 未签约时的催签焦虑
  if (project.stage === 'CONCEPT' && project.wordCount > 20_000 && rng() < 0.3) {
    buckets.push(`都${(project.wordCount / 10000).toFixed(1)}万字了还没签约，作者要不要换平台试试？`)
  }

  return randomPick(buckets, rng)
}

/** 对 WriterProject 执行一个写作动作 */
export function applyWriterAction(
  project: WriterProject,
  action: WriterAction,
  currentDay: number,
  platform: NovelPlatform = PLATFORMS[project.platformId],
  rng: () => number = Math.random,
): CareerActionResult {
  // 阶段检查
  const required = Array.isArray(action.phaseRequired)
    ? action.phaseRequired
    : [action.phaseRequired]
  if (!required.includes(project.phase as ProjectPhase)) {
    return {
      project,
      playerDelta: {},
      logs: [`《${project.title}》当前阶段无法使用【${action.name}】。`],
    }
  }

  const logs: string[] = []
  let next: WriterProject = { ...project }

  // 1. 字数与章节
  next.wordCount += action.wordCountAdd
  next.totalChapters += 1
  next.dailyWordCount += action.wordCountAdd

  // 2. 三维质量变化
  next.quality = clamp(next.quality + (action.effects.qualityAdd ?? 0), 0, 100)
  next.commerciality = clamp(
    next.commerciality + (action.effects.commercialityAdd ?? 0),
    0,
    100,
  )
  next.memeValue = clamp(next.memeValue + (action.effects.memeValueAdd ?? 0), 0, 100)

  // 3. 热度助推
  if (action.effects.hypeBoost) {
    next.metrics = {
      ...next.metrics,
      currentHype: clamp(
        next.metrics.currentHype + action.effects.hypeBoost,
        0,
        100,
      ),
    }
  }

  // 4. 追读率与读者情绪
  next.readerRetention = clamp(
    next.readerRetention + action.retentionDelta,
    0,
    1,
  )
  next.readerMood = clamp(next.readerMood + action.readerMoodDelta, -100, 100)

  // 5. 日更连续性
  if (action.countsAsDailyUpdate) {
    if (currentDay - next.lastUpdatedDay <= 1) {
      next.consecutiveDailyUpdates += 1
    } else {
      next.consecutiveDailyUpdates = 1
    }
    next.lastUpdatedDay = currentDay
  }

  // 6. 阶段流转（签约 / 上架）
  const signResult = trySign(next, platform, currentDay, rng)
  if (signResult.log) logs.push(signResult.log)
  next = signResult.project

  const launchResult = tryLaunch(next, currentDay)
  if (launchResult.log) logs.push(launchResult.log)
  next = launchResult.project

  next = trySerializing(next)

  // 7. 重新计算进度
  next = recalcWriterProgress(next)

  // 8. 读者本章说（平台 + 策略 + 梗 + 状态驱动）
  if (action.strategy !== 'META') {
    const comment = generateReaderComment(next, platform, action.strategy, rng)
    logs.push(`本章说：${comment}`)
  }

  // 9. 玩家属性消耗
  const playerDelta: CareerActionResult['playerDelta'] = {
    energy: action.cost.energy,
    stress: action.cost.stress,
  }
  if (action.cost.money) {
    playerDelta.savings = -action.cost.money
  }

  return { project: next, playerDelta, logs }
}

/** 网文项目每日发酵结算 */
export function dailyTickWriter(
  project: WriterProject,
  currentDay: number,
  platform: NovelPlatform = PLATFORMS[project.platformId],
  rng: () => number = Math.random,
): CareerDailyResult {
  // 完结/太监项目不再主动发酵，只保留余热或惩罚
  if (project.stage === 'COMPLETED') {
    const passiveRevenue =
      project.stats.totalRevenue * WRITER_COMPLETED_PASSIVE_RATIO / 30
    const completedProject: WriterProject = {
      ...project,
      stats: {
        ...project.stats,
        totalRevenue: project.stats.totalRevenue + passiveRevenue,
      },
      dailyWordCount: 0,
    }
    return {
      project: completedProject,
      playerDelta: { savings: passiveRevenue },
      logs: [
        `《${project.title}》完结余热：+${Math.round(passiveRevenue).toLocaleString('zh-CN')} 元。`,
      ],
    }
  }

  if (project.stage === 'ABANDONED') {
    const abandonedProject: WriterProject = {
      ...project,
      dailyWordCount: 0,
    }
    return {
      project: abandonedProject,
      playerDelta: {},
      logs: [`《${project.title}》已太监，不再产生收益。`],
    }
  }

  const logs: string[] = []
  let next: WriterProject = { ...project }

  // 1. 市场随机波动
  const marketRng = randomRange(WRITER_MARKET_RNG_RANGE, rng)

  // 2. 平台算法匹配度：越契合平台算法，曝光和收益越高
  const algorithmMatchScore = computeAlgorithmMatchScore(next, platform)
  const matchMultiplier = 0.5 + algorithmMatchScore / 100

  // 3. 每日曝光/阅读量
  const baseHype = WRITER_BASE_HYPE + next.metrics.currentHype
  const score =
    next.commerciality * 0.4 + next.memeValue * 0.4 + next.quality * 0.2
  const exposure = Math.max(
    0,
    baseHype * (score / 100) * marketRng * matchMultiplier,
  )
  next.metrics = {
    ...next.metrics,
    viewsOrReaders: next.metrics.viewsOrReaders + exposure,
  }

  // 4. 收益计算：按平台变现模型差异化 × 算法匹配度加成
  let revenue = 0
  if (next.signed) {
    const effectiveReads = exposure * next.readerRetention
    switch (platform.businessModel) {
      case 'SUBSCRIPTION':
        // 订阅制：追读越高，收益越高
        revenue =
          (effectiveReads / 1000) *
          WRITER_REVENUE_PER_1K_READS *
          1.5 *
          matchMultiplier
        break
      case 'FREE_AD':
        // 免费广告：靠曝光和完读，单价低但流量大
        revenue =
          (exposure / 1000) * WRITER_REVENUE_PER_1K_READS * 0.4 * matchMultiplier
        break
      case 'SPONSORSHIP':
        // 打赏制：追读和读者情绪共同决定
        revenue =
          (effectiveReads / 1000) *
          WRITER_REVENUE_PER_1K_READS *
          (1 + Math.max(0, next.readerMood) / 100) *
          matchMultiplier
        break
      case 'IP_DRIVEN':
        // IP 向：订阅收益一般，但字数/热度积累 IP 价值
        revenue =
          (effectiveReads / 1000) *
          WRITER_REVENUE_PER_1K_READS *
          0.8 *
          matchMultiplier
        next.stats.ipValue = clamp(
          (next.stats.ipValue ?? 0) + exposure * 0.001 * matchMultiplier,
          0,
          1000,
        )
        break
    }
  }

  // 刚上架的作品有首订加成
  if (next.stage === 'LAUNCHED' && next.dayLaunched === currentDay - 1) {
    revenue *= 2
    logs.push(`《${next.title}》上架首日首订结算！`)
  }

  // 5. 粉丝转化
  const newFans = exposure * next.metrics.fanConversionRate
  next.stats = {
    ...next.stats,
    totalRevenue: next.stats.totalRevenue + revenue,
    totalFansGained: next.stats.totalFansGained + newFans,
  }

  // 6. 热度衰减：质量高衰减慢，爆点高衰减快
  const decayRate =
    WRITER_DEFAULT_HYPE_DECAY *
    (1 + next.memeValue / 100) *
    (1 - next.quality / 200)
  next.metrics = {
    ...next.metrics,
    currentHype: clamp(next.metrics.currentHype * (1 - decayRate), 0, 100),
    hypeDecay: decayRate,
  }

  // 7. 读者情绪自然回归
  next.readerMood = clamp(next.readerMood * 0.9, -100, 100)

  // 8. 追读率自然衰减（长期不更新会大幅下滑）
  if (currentDay - next.lastUpdatedDay > 1) {
    next.readerRetention = clamp(next.readerRetention - 0.05, 0, 1)
    next.consecutiveDailyUpdates = 0
    logs.push(`《${next.title}》断更一天，追读率下滑。`)
  }

  // 9. 全勤奖
  let fullAttendanceReward = 0
  if (
    next.stage !== 'CONCEPT' &&
    next.dailyWordCount >= WRITER_FULL_ATTENDANCE_DAILY_WORDS
  ) {
    fullAttendanceReward = WRITER_FULL_ATTENDANCE_DAILY_REWARD
    logs.push(
      `《${next.title}》日更 ${next.dailyWordCount.toLocaleString('zh-CN')} 字，获得全勤奖励 +${fullAttendanceReward} 元。`,
    )
  }

  // 10. 重置今日字数
  next.dailyWordCount = 0

  const playerDelta: CareerDailyResult['playerDelta'] = {
    savings: revenue + fullAttendanceReward,
    fans: newFans,
  }

  // 11. 隐患爆发（概率性， memeValue 高/quality 低时更容易）
  const controversyRisk = (next.memeValue / 100) * 0.02 + ((100 - next.quality) / 100) * 0.01
  if (rng() < controversyRisk && next.stage !== 'CONCEPT') {
    next.stats.bugOrControversy = clamp(next.stats.bugOrControversy + 10, 0, 100)
    logs.push(`《${next.title}》引发读者争议，隐患值 +10。`)
  }

  return { project: next, playerDelta, logs }
}

/** 完结一本书 */
export function completeWriterProject(
  project: WriterProject,
  _currentDay: number,
): { project: WriterProject; log: string } {
  const next: WriterProject = {
    ...project,
    stage: 'COMPLETED',
    phase: 'COMPLETED',
    readerMood: clamp(project.readerMood + 20, -100, 100),
  }
  return {
    project: next,
    log: `《${next.title}》正式完结！读者含泪告别，作品进入长尾余热阶段。`,
  }
}

/** 太监一本书 */
export function abandonWriterProject(
  project: WriterProject,
  _currentDay: number,
): { project: WriterProject; log: string; stressDelta: number } {
  const next: WriterProject = {
    ...project,
    stage: 'ABANDONED',
    phase: 'ABANDONED',
    readerRetention: clamp(project.readerRetention + WRITER_ABANDON_RETENTION_PENALTY, 0, 1),
    readerMood: -80,
    consecutiveDailyUpdates: 0,
  }
  return {
    project: next,
    log: `《${next.title}》被你残忍太监，评论区哀嚎遍野。`,
    stressDelta: -15,
  }
}

/* ============================================================
 * 灵感注入与作者梗系统
 * ============================================================ */

/** 根据特殊标签生成的专属读者评论池 */
const TAG_COMMENTS: Record<string, string[]> = {
  社畜共鸣: [
    '这段外卖爆单的描写太真实了，作者是不是真去跑过？',
    '我半夜点外卖时也见过这种场景，代入感极强。',
    '社会观察类网文，作者有生活。',
  ],
  荒诞生物: [
    '草，这异界魔兽怎么长得这么像龙猫，还咬人屁股，作者夹带私货是吧？',
    '龙猫：我招谁惹谁了？',
    '这章的萌宠描写笑死我了，建议多写。',
  ],
  亚文化: [
    '女仆咖啡厅那段写得有内味，作者懂二次元。',
    '御宅族的社交仪式被你写活了。',
    '这段是不是作者亲身经历？',
  ],
  家庭修罗场: [
    '三姑六婆逼婚这段，我已经开始窒息了。',
    '作者是不是刚过年回家？太真实了。',
    '县城家庭的压抑感拉满。',
  ],
  黑色幽默: [
    '人生与肛肠的辩证关系，作者是懂黑色幽默的。',
    '笑着笑着就哭了，写稿人共勉。',
    '这章健康警示意义大于文学意义。',
  ],
  情绪核弹: [
    '这段崩溃吐槽太真实了，作者精神状态还好吗？',
    '情绪冲击力极强，给我看破防了。',
    '建议作者去看看心理医生（认真）。',
  ],
  叙事诡计: [
    '跑团神展开！作者是不是资深 KP？',
    '这章的叙事结构爱了，建议改编成模组。',
    'TRPG 玩家狂喜。',
  ],
  代际冲突: [
    '我妈也给我发过这种文章，作者监视我？',
    '父母转发养生文，全国统一。',
    '这段代际冲突写得既好笑又心酸。',
  ],
}

const DEFAULT_TAG_COMMENTS = [
  '这章明显感觉作者加了私货，但意外的带感。',
  '熟悉的现实味道，作者又在取材生活了。',
  '这段写法很特别，评论区有没有人同感？',
]

/** 将一个灵感注入当前章节 */
export function applyInspirationToWriterProject(
  project: WriterProject,
  inspirationId: string,
  _currentDay: number,
  rng: () => number = Math.random,
): InspirationApplyResult | null {
  const inspiration = INSPIRATION_BY_ID[inspirationId]
  if (!inspiration) return null

  let next: WriterProject = { ...project }

  // 1. 三维加成
  next.quality = clamp(
    next.quality + (inspiration.statBonus.quality ?? 0),
    0,
    100,
  )
  next.commerciality = clamp(
    next.commerciality + (inspiration.statBonus.commerciality ?? 0),
    0,
    100,
  )
  next.memeValue = clamp(
    next.memeValue + (inspiration.statBonus.memeValue ?? 0),
    0,
    100,
  )

  // 2. 热度加成（memeValue 加成越高，读者越容易玩梗传播）
  const extraHype = (inspiration.statBonus.memeValue ?? 0) * 1.5
  next.metrics = {
    ...next.metrics,
    currentHype: clamp(next.metrics.currentHype + extraHype, 0, 100),
  }

  // 3. 读者专属评论
  const comments = inspiration.specialTag
    ? TAG_COMMENTS[inspiration.specialTag] ?? DEFAULT_TAG_COMMENTS
    : DEFAULT_TAG_COMMENTS
  const pickedComment = randomPick(comments, rng)

  // 4. 追读与情绪小幅提升（读者喜欢有生活气息的素材）
  next.readerRetention = clamp(next.readerRetention + 0.02, 0, 1)
  next.readerMood = clamp(next.readerMood + 5, -100, 100)

  return {
    project: next,
    consumedInspirationId: inspiration.id,
    readerComments: [
      `注入灵感【${inspiration.name}】：${inspiration.description}`,
      `本章说：${pickedComment}`,
    ],
    extraHype,
  }
}

/* ============== 作者梗（Meme）生成 ============== */

const MEME_NAME_POOLS: Record<
  'LEGEND' | 'INFAMOUS' | 'FUNNY',
  string[]
> = {
  LEGEND: [
    '封神名场面',
    '史诗级反转',
    '全文最高光',
    '读者集体破防章',
    '载入网文史册',
  ],
  INFAMOUS: [
    '太空后空翻',
    '女主突然变成史莱姆',
    '倒赞狂魔',
    '烂尾防坡堤',
    '作者又发疯了',
  ],
  FUNNY: [
    '龙猫咬屁股',
    '痛腚思痛',
    '肛肠医院悟道',
    '亲戚逼婚大逃亡',
    '养生文战争',
  ],
}

/** 根据项目表现生成一个作者梗 */
export function generateMemeFromProject(
  project: WriterProject,
  _currentDay: number,
  rng: () => number = Math.random,
): MemeGenerateResult {
  if (project.stage === 'ABANDONED') {
    const name = randomPick(MEME_NAME_POOLS.INFAMOUS, rng)
    const meme: AuthorMeme = {
      id: `meme_${project.id}_abandon`,
      name,
      originBookTitle: project.title,
      reputation: 'INFAMOUS',
      usageCount: 0,
    }
    return {
      meme,
      log: `《${project.title}》太监后诞生了黑历史梗【${name}】，读者仍在玩梗鞭尸。`,
    }
  }

  if (project.stage === 'COMPLETED') {
    // 根据累计收益和三维判定口碑
    let reputation: 'LEGEND' | 'FUNNY' = 'FUNNY'
    if (project.stats.totalRevenue >= 100_000 && project.quality >= 70) {
      reputation = 'LEGEND'
    } else if (project.memeValue >= 70) {
      reputation = 'FUNNY'
    }

    const name = randomPick(MEME_NAME_POOLS[reputation], rng)
    const meme: AuthorMeme = {
      id: `meme_${project.id}_complete`,
      name,
      originBookTitle: project.title,
      reputation,
      usageCount: 0,
    }
    return {
      meme,
      log:
        reputation === 'LEGEND'
          ? `《${project.title}》完结封神，诞生了传说级名梗【${name}】。`
          : `《${project.title}》完结，留下了搞笑名梗【${name}】供读者回味。`,
    }
  }

  // 连载中因热度爆表也可能诞生梗
  if (project.metrics.currentHype >= 80) {
    const name = randomPick(MEME_NAME_POOLS.FUNNY, rng)
    const meme: AuthorMeme = {
      id: `meme_${project.id}_viral`,
      name,
      originBookTitle: project.title,
      reputation: 'FUNNY',
      usageCount: 0,
    }
    return {
      meme,
      log: `《${project.title}》热度爆表，读者围绕【${name}】开始二创玩梗。`,
    }
  }

  return { meme: null, log: '' }
}

/* ============== 作者等级 ============== */

const RANK_THRESHOLDS: {
  rank: AuthorRank
  minRevenue: number
  minFans: number
}[] = [
  { rank: 'PLATINUM', minRevenue: 1_000_000, minFans: 200_000 },
  { rank: 'GREAT_GOD', minRevenue: 200_000, minFans: 50_000 },
  { rank: 'BOUTIQUE', minRevenue: 50_000, minFans: 10_000 },
  { rank: 'SIGNED', minRevenue: 0, minFans: 0 },
]

/** 根据累计收益和粉丝量计算作者等级 */
export function computeAuthorRank(
  totalRevenue: number,
  totalFans: number,
  hasSignedBook: boolean,
): AuthorRank {
  if (!hasSignedBook) return 'COLT'
  for (const { rank, minRevenue, minFans } of RANK_THRESHOLDS) {
    if (totalRevenue >= minRevenue || totalFans >= minFans) {
      return rank
    }
  }
  return 'COLT'
}

export function getAuthorRankLabel(rank: AuthorRank): string {
  const labels: Record<AuthorRank, string> = {
    COLT: '新人',
    SIGNED: '签约',
    BOUTIQUE: '精品',
    GREAT_GOD: '大神',
    PLATINUM: '白金',
  }
  return labels[rank]
}

/* ============== 跨作品玩梗（Meme Homage）============== */

export interface MemeHomageResult {
  project: WriterProject
  /** 更新后的梗（usageCount 已增加） */
  meme: AuthorMeme
  logs: string[]
  /** 读者骂街警告（usageCount 过高时触发） */
  backlash: boolean
}

/** 将已解锁的作者梗致敬进当前章节 */
export function applyMemeHomage(
  project: WriterProject,
  meme: AuthorMeme,
  currentDay: number,
): MemeHomageResult {
  const usage = meme.usageCount
  let next: WriterProject = { ...project }
  const logs: string[] = []
  let backlash = false

  // 基础：致敬前作本身就带来老粉情怀
  next.wordCount += 3_000
  next.totalChapters += 1
  next.dailyWordCount += 3_000
  next.lastUpdatedDay = currentDay

  if (usage === 0) {
    // 第一次：情怀拉满，订阅暴增
    next.quality = clamp(next.quality + 1, 0, 100)
    next.commerciality = clamp(next.commerciality + 5, 0, 100)
    next.memeValue = clamp(next.memeValue + 10, 0, 100)
    next.readerRetention = clamp(next.readerRetention + 0.08, 0, 1)
    next.readerMood = clamp(next.readerMood + 10, -100, 100)
    next.metrics = {
      ...next.metrics,
      currentHype: clamp(next.metrics.currentHype + 20, 0, 100),
    }
    logs.push(
      `本章致敬前作梗【${meme.name}】，老粉集体泪目，评论区刷屏“文艺复兴”！`,
    )
  } else if (usage === 1) {
    // 第二次：效果减半，但仍正向
    next.commerciality = clamp(next.commerciality + 3, 0, 100)
    next.memeValue = clamp(next.memeValue + 5, 0, 100)
    next.readerRetention = clamp(next.readerRetention + 0.04, 0, 1)
    logs.push(
      `再次致敬【${meme.name}】，部分读者开始嘀咕“是不是没新梗了”。`,
    )
  } else if (usage === 2) {
    // 第三次：边际效应，基本持平
    next.memeValue = clamp(next.memeValue + 2, 0, 100)
    next.readerMood = clamp(next.readerMood - 5, -100, 100)
    logs.push(
      `三度致敬【${meme.name}】，评论区出现“作者是不是只会炒冷饭”的声音。`,
    )
  } else {
    // 第四次及以上：反噬
    next.quality = clamp(next.quality - 3, 0, 100)
    next.memeValue = clamp(next.memeValue + 1, 0, 100)
    next.readerRetention = clamp(next.readerRetention - 0.05, 0, 1)
    next.readerMood = clamp(next.readerMood - 20, -100, 100)
    backlash = true
    logs.push(
      `又双叒叕致敬【${meme.name}】，读者暴怒：“没活了可以咬打火机，别炒冷饭！”`,
    )
  }

  // 更新梗的使用记录
  const updatedMeme: AuthorMeme = {
    ...meme,
    usageCount: meme.usageCount + 1,
    lastUsedDay: currentDay,
  }

  return { project: next, meme: updatedMeme, logs, backlash }
}

/* ============================================================
 * 通用入口（未来扩展其他职业时在此分发）
 * ============================================================ */

export function createProject(
  professionType: 'WRITER',
  input: CreateWriterProjectInput,
): WriterProject {
  if (professionType === 'WRITER') return createWriterProject(input)
  throw new Error(`Unsupported profession type: ${professionType}`)
}
