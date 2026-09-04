import type { YearSummary } from '../types/game'

interface Props {
  summary: YearSummary
  onContinue: () => void
  onRetire: () => void
}

export default function YearSummaryModal({ summary, onContinue, onRetire }: Props) {
  const { year, stats, majorEvents, nextYearForecast } = summary

  const formatNumber = (n: number) =>
    n >= 10_000 ? `${(n / 10_000).toFixed(1)} 万` : n.toLocaleString('zh-CN')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 text-center">
          <div className="text-4xl">📜</div>
          <h2 className="mt-2 text-xl font-bold text-slate-800">第 {year} 年度总结</h2>
          <p className="text-sm text-slate-500">
            第 {summary.startDay} - {summary.endDay} 天 · 你可以选择继续，或在此封笔
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="新增字数" value={`${formatNumber(stats.wordCountDelta)} 字`} />
          <StatCard label="年度收益" value={`${formatNumber(stats.revenueDelta)} 元`} />
          <StatCard label="新增粉丝" value={`${formatNumber(stats.fansDelta)} 人`} />
          <StatCard label="作品变动" value={`完本 ${stats.completedBooks} / 太监 ${stats.abandonedBooks}`} />
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">本年度大事件</h3>
          {majorEvents.length > 0 ? (
            <ul className="space-y-2">
              {majorEvents.map((e, i) => (
                <li key={i} className="text-sm text-slate-600">
                  {e}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">这一年平平淡淡，没有特别值得铭记的大事。</p>
          )}
        </div>

        <div className="mt-4 rounded-xl bg-amber-50 p-4">
          <h3 className="mb-1 text-sm font-semibold text-amber-800">下一年环境预告</h3>
          <p className="text-sm text-amber-700">{nextYearForecast}</p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-900"
          >
            继续写下去
          </button>
          <button
            type="button"
            onClick={onRetire}
            className="flex-1 rounded-xl bg-amber-100 py-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-200"
          >
            封笔退休
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-base font-bold text-slate-800">{value}</div>
    </div>
  )
}
