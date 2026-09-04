import type { GameState, LogEntry, YearSummary } from '../types/game'
import type { CareerProject, WriterProject } from '../types/career'
import { isWriterProject } from '../types/career'

/** 计算所有网文项目累计字数 */
function getTotalWordCount(projects: CareerProject[]): number {
  return projects
    .filter(isWriterProject)
    .reduce((sum, p) => sum + (p.wordCount ?? 0), 0)
}

/** 计算生涯档案累计收益（各平台收益之和） */
function getTotalRevenue(profile: GameState['writerCareerProfile']): number {
  return Object.values(profile.platformCareer).reduce(
    (sum, p) => sum + (p.totalRevenue ?? 0),
    0,
  )
}

/** 计算本年度的完本 / 太监数 */
function getBookChanges(
  startProfile: GameState['writerCareerProfile'],
  endProfile: GameState['writerCareerProfile'],
): { completed: number; abandoned: number } {
  return {
    completed: endProfile.totalCompletedBooks - startProfile.totalCompletedBooks,
    abandoned: endProfile.totalAbandonedBooks - startProfile.totalAbandonedBooks,
  }
}

/** 从日志中提取本年度大事件 */
function extractMajorEvents(
  logs: LogEntry[],
  startDay: number,
  endDay: number,
): string[] {
  const events: string[] = []
  const seen = new Set<string>()

  for (const entry of logs) {
    if (entry.day < startDay || entry.day > endDay) continue
    // 只提取 celebratory / system / event 类型的关键节点
    if (entry.kind === 'celebrate' || entry.kind === 'event') {
      const text = entry.text.replace(/^[^\u4e00-\u9fa5a-zA-Z]*/, '').slice(0, 40)
      const key = `${entry.day}-${text}`
      if (!seen.has(key)) {
        seen.add(key)
        events.push(`第 ${entry.day} 天：${text}`)
      }
    }
  }

  // 最多保留 5 条，避免信息过载
  return events.slice(0, 5)
}

/** 根据当前市场趋势生成下一年环境预告 */
function generateForecast(state: GameState): string {
  const { marketTrend } = state
  const genre = marketTrend.favoredGenre ?? '混合题材'
  const tone = marketTrend.tone ?? '稳健'

  const forecasts = [
    `下一年 ${genre} 仍受平台算法青睐，${tone}型作品更容易获得稳定推荐。`,
    `读者对 ${genre} 的付费意愿上升，但编辑部开始收紧 ${tone} 作品的签约门槛。`,
    `短视频改编风潮持续，${genre} 的 IP 价值被重新评估，适合布局系列化。`,
    `平台流量向 ${genre} 倾斜，但社区对 ${tone} 套路的容忍度正在降低。`,
  ]

  // 用日期做简单伪随机，保证同一局内稳定但不同局有变化
  const index = (state.day + state.stats.fans) % forecasts.length
  return forecasts[index]
}

/**
 * 根据当前游戏状态生成本年度总结报告。
 * @param state 当前游戏状态（应已更新到本年末）
 * @param logs 本局日志列表
 */
export function generateYearSummary(
  state: GameState,
  logs: LogEntry[],
): YearSummary | null {
  const snapshot = state.yearStartSnapshot
  if (!snapshot) return null

  const year = Math.ceil(snapshot.day / 60)
  const startDay = snapshot.day
  const endDay = state.day

  const startRevenue = getTotalRevenue(snapshot.writerCareerProfile)
  const endRevenue = getTotalRevenue(state.writerCareerProfile)
  const endWords = getTotalWordCount(state.careerProjects)
  const wordCountDelta = Math.max(0, endWords - snapshot.totalWordCount)

  const bookChanges = getBookChanges(
    snapshot.writerCareerProfile,
    state.writerCareerProfile,
  )

  return {
    year,
    startDay,
    endDay,
    startStats: snapshot.stats,
    endStats: state.stats,
    startWriterProfile: snapshot.writerCareerProfile,
    endWriterProfile: state.writerCareerProfile,
    stats: {
      wordCountDelta,
      revenueDelta: endRevenue - startRevenue,
      fansDelta: state.stats.fans - snapshot.stats.fans,
      completedBooks: bookChanges.completed,
      abandonedBooks: bookChanges.abandoned,
    },
    majorEvents: extractMajorEvents(logs, startDay, endDay),
    nextYearForecast: generateForecast(state),
  }
}

/**
 * 为下一年创建新的年初快照。
 */
export function createYearStartSnapshot(state: GameState): GameState['yearStartSnapshot'] {
  return {
    day: state.day,
    stats: { ...state.stats },
    writerCareerProfile: JSON.parse(JSON.stringify(state.writerCareerProfile)),
    totalWordCount: getTotalWordCount(state.careerProjects),
  }
}
