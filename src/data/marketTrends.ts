import type { MainGenre, MarketTrend, WriterProject } from '../types/career'
import { BOOK_TAGS } from './bookTags'
import { GENRES } from './genres'
import { GIMMICKS } from './gimmicks'

const TREND_NAMES = [
  '废土求生热',
  '赛博文旅潮',
  '反派逆袭月',
  '老兵归位季',
  '全员迪化风',
  '克系修仙夜',
  '重生2008',
  '规则怪谈周',
  '国运争霸赛',
  '种田基建流',
  '无限流复兴',
  '心声泄露潮',
]

function randomPick<T>(arr: T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)]
}

/** 生成一个新的市场流行趋势 */
export function generateMarketTrend(
  day: number,
  rng: () => number = Math.random,
): MarketTrend {
  const hotGenres: MainGenre[] = [randomPick(GENRES, rng).id]
  if (rng() < 0.35) {
    const remaining = GENRES.filter((g) => g.id !== hotGenres[0])
    hotGenres.push(randomPick(remaining, rng).id)
  }

  const shuffledTags = [...BOOK_TAGS].sort(() => rng() - 0.5)
  const hotTags = shuffledTags.slice(0, 1 + Math.floor(rng() * 2)).map((t) => t.id)

  const hotGimmicks: string[] = []
  if (rng() < 0.5) {
    hotGimmicks.push(randomPick(GIMMICKS, rng).id)
  }

  return {
    id: `trend_${day}_${Math.floor(rng() * 10000)}`,
    name: randomPick(TREND_NAMES, rng),
    hotGenres,
    hotTags,
    hotGimmicks,
    decayDays: 5 + Math.floor(rng() * 6), // 5-10 天
    saturation: {},
  }
}

/** 每日推进趋势：衰减、统计饱和度 */
export function tickMarketTrend(
  trend: MarketTrend,
  projects: WriterProject[],
): MarketTrend {
  const next: MarketTrend = {
    ...trend,
    saturation: { ...trend.saturation },
  }
  for (const p of projects) {
    for (const tagId of p.tags) {
      next.saturation[tagId] = (next.saturation[tagId] ?? 0) + 1
    }
    next.saturation[p.gimmick] = (next.saturation[p.gimmick] ?? 0) + 1
  }
  next.decayDays -= 1
  return next
}

/** 判断作品是否蹭到当前趋势 */
export function getTrendMatches(
  project: WriterProject,
  trend: MarketTrend,
): { genres: MainGenre[]; tags: string[]; gimmicks: string[] } {
  return {
    genres: trend.hotGenres.filter((g) => g === project.genre),
    tags: trend.hotTags.filter((t) => project.tags.includes(t)),
    gimmicks: trend.hotGimmicks.filter((g) => g === project.gimmick),
  }
}

export function getTrendMatchCount(project: WriterProject, trend: MarketTrend): number {
  const m = getTrendMatches(project, trend)
  return m.genres.length + m.tags.length + m.gimmicks.length
}
