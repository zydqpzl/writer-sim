import { useEffect, useRef } from 'react'
import type { LogEntry, LogKind, TimeSlot } from '../types/game'

interface Props {
  logs: LogEntry[]
}

const SLOT_LABEL: Record<TimeSlot, string> = {
  morning: '上午',
  afternoon: '下午',
  evening: '晚上',
}

const KIND_STYLE: Record<
  LogKind,
  { dot: string; label: string; text: string; tag: string }
> = {
  info: {
    dot: 'bg-slate-300',
    label: '信息',
    text: 'text-slate-600',
    tag: 'bg-slate-100 text-slate-500',
  },
  gain: {
    dot: 'bg-emerald-500',
    label: '收益',
    text: 'text-emerald-700',
    tag: 'bg-emerald-50 text-emerald-600',
  },
  loss: {
    dot: 'bg-rose-500',
    label: '损失',
    text: 'text-rose-700',
    tag: 'bg-rose-50 text-rose-600',
  },
  event: {
    dot: 'bg-amber-500',
    label: '事件',
    text: 'text-amber-800',
    tag: 'bg-amber-50 text-amber-700',
  },
  system: {
    dot: 'bg-brand-500',
    label: '系统',
    text: 'text-brand-700',
    tag: 'bg-brand-50 text-brand-600',
  },
  celebrate: {
    dot: 'bg-amber-500',
    label: '大爆',
    text: 'text-amber-700',
    tag: 'bg-amber-100 text-amber-700',
  },
}

export default function GameLog({ logs }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // 新日志自动滚动到底部
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [logs.length])

  return (
    <section className="card flex h-full flex-col p-5">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-sm">
            📜
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-700">游戏日志</h2>
            <p className="text-xs text-slate-400">记录每一次选择与遭遇</p>
          </div>
        </div>
        <span className="chip bg-slate-100 text-slate-500">
          共 {logs.length} 条
        </span>
      </header>

      <div
        ref={scrollRef}
        className="scrollbar-thin -mr-2 flex-1 overflow-y-auto pr-2"
      >
        {logs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center text-sm text-slate-400">
            <span className="mb-2 text-2xl">🫧</span>
            还没有事件发生，选择你的第一个行动吧。
          </div>
        ) : (
          <ol className="space-y-2.5">
            {logs.map((log) => {
              const style = KIND_STYLE[log.kind]
              // 大爆特爆：大字庆祝横幅
              if (log.kind === 'celebrate') {
                return (
                  <li
                    key={log.id}
                    className="animate-fade-in rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎉</span>
                      <span className={`chip ${style.tag}`}>大爆特爆</span>
                      <span className="text-xs font-medium text-amber-600/70">
                        第 {log.day} 天 · {SLOT_LABEL[log.slot]}
                      </span>
                    </div>
                    <p className="mt-1.5 text-base font-bold leading-relaxed text-amber-700">
                      {log.text}
                    </p>
                  </li>
                )
              }
              return (
                <li
                  key={log.id}
                  className="animate-fade-in flex gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
                >
                  <div className="mt-1.5 flex flex-col items-center">
                    <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                    <span className="mt-1 h-full w-px bg-slate-200 last:hidden" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`chip ${style.tag}`}>{style.label}</span>
                      <span className="text-xs font-medium text-slate-400">
                        第 {log.day} 天 · {SLOT_LABEL[log.slot]}
                      </span>
                    </div>
                    <p className={`mt-1 text-sm leading-relaxed ${style.text}`}>
                      {log.text}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
