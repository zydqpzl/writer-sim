import { useMemo } from 'react'
import { PLATFORMS } from '../data/platforms'
import { computeAlgorithmMatchScore } from '../engine/platformEngine'
import type { WriterProject } from '../types/career'
import type { LogEntry } from '../types/game'

interface WriterProjectPanelProps {
  project?: WriterProject
  logs: LogEntry[]
}

const STAGE_LABELS: Record<WriterProject['stage'], string> = {
  CONCEPT: '投稿期',
  SIGNED: '已签约',
  LAUNCHED: '已上架',
  SERIALIZING: '长期连载',
  COMPLETED: '已完结',
  ABANDONED: '已太监',
}

const STAGE_CHIP: Record<WriterProject['stage'], string> = {
  CONCEPT: 'bg-slate-100 text-slate-600',
  SIGNED: 'bg-emerald-100 text-emerald-700',
  LAUNCHED: 'bg-brand-100 text-brand-700',
  SERIALIZING: 'bg-sky-100 text-sky-700',
  COMPLETED: 'bg-amber-100 text-amber-700',
  ABANDONED: 'bg-rose-100 text-rose-700',
}

export default function WriterProjectPanel({
  project,
  logs,
}: WriterProjectPanelProps) {
  const recentComments = useMemo(() => {
    return logs
      .filter((log) => log.text.startsWith('本章说：'))
      .slice(-5)
      .reverse()
  }, [logs])

  if (!project) {
    return (
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-slate-800">当前作品</h2>
        <p className="mt-2 text-xs text-slate-400">暂无进行中的写作项目。</p>
      </div>
    )
  }

  const platform = PLATFORMS[project.platformId]
  const matchScore = computeAlgorithmMatchScore(project, platform)

  return (
    <div className="card flex flex-col gap-4 p-4">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">当前作品</h2>
          <p className="mt-0.5 text-base font-semibold text-slate-900">
            《{project.title}》
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {platform.name} · {(project.wordCount / 10000).toFixed(1)} 万字 ·{' '}
            {project.totalChapters} 章
          </p>
        </div>
        <span className={`chip ${STAGE_CHIP[project.stage]}`}>
          {STAGE_LABELS[project.stage]}
        </span>
      </header>

      {/* 三维 */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '质量', value: project.quality, color: 'bg-emerald-500' },
          { label: '商业', value: project.commerciality, color: 'bg-amber-500' },
          { label: '梗值', value: project.memeValue, color: 'bg-rose-500' },
        ].map((attr) => (
          <div key={attr.label} className="rounded-lg bg-slate-50 p-2 text-center">
            <div className="text-[10px] text-slate-400">{attr.label}</div>
            <div className="text-sm font-semibold text-slate-700">
              {Math.round(attr.value)}
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white">
              <div
                className={`h-full rounded-full ${attr.color}`}
                style={{ width: `${Math.max(0, Math.min(100, attr.value))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-400">追读率</span>
          <span className="ml-2 font-medium text-slate-700">
            {(project.readerRetention * 100).toFixed(1)}%
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-400">读者情绪</span>
          <span
            className={`ml-2 font-medium ${
              project.readerMood > 0
                ? 'text-emerald-600'
                : project.readerMood < 0
                  ? 'text-rose-600'
                  : 'text-slate-700'
            }`}
          >
            {project.readerMood > 0 ? '+' : ''}
            {Math.round(project.readerMood)}
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-400">热度</span>
          <span className="ml-2 font-medium text-slate-700">
            {Math.round(project.metrics.currentHype)}
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-400">累计收益</span>
          <span className="ml-2 font-medium text-slate-700">
            {Math.round(project.stats.totalRevenue).toLocaleString('zh-CN')} 元
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-400">算法契合</span>
          <span
            className={`ml-2 font-medium ${
              matchScore >= 60
                ? 'text-emerald-600'
                : matchScore >= 40
                  ? 'text-amber-600'
                  : 'text-rose-600'
            }`}
          >
            {Math.round(matchScore)}%
          </span>
        </div>
      </div>

      {/* 本章说 */}
      <div>
        <div className="mb-2 text-xs font-semibold text-slate-700">最近本章说</div>
        <div className="flex flex-col gap-1.5">
          {recentComments.length > 0 ? (
            recentComments.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-xs leading-relaxed text-slate-600"
              >
                {log.text.replace('本章说：', '')}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">暂无读者评论，先更新一章吧。</p>
          )}
        </div>
      </div>
    </div>
  )
}
