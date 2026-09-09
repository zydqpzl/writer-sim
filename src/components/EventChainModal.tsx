import type { EventChain, EventEffect, EventOption, EventStep } from '../types/event'
import type { PlayerStats } from '../types/game'

interface Props {
  chain: EventChain
  step: EventStep
  /** 已完成阶段数（用于进度条） */
  stepIndex: number
  totalSteps: number
  stats: PlayerStats
  onSelect: (option: EventOption) => void
}

function effectLabel(key: keyof EventEffect): string {
  switch (key) {
    case 'savings':
      return '存款'
    case 'health':
      return '健康'
    case 'energy':
      return '精力'
    case 'stress':
      return '压力'
    case 'familyApproval':
      return '父母'
    case 'influence':
      return '影响力'
    case 'fans':
      return '粉丝'
    case 'writerProject':
      return '作品'
    case 'getInspiration':
      return '灵感'
    case 'grantTrait':
      return '特质'
    default:
      return key as string
  }
}

export default function EventChainModal({
  chain,
  step,
  stepIndex,
  totalSteps,
  onSelect,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* 遮罩：事件链进行中不可点关，必须做出选择 */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" />

      <div className="relative w-full max-w-lg animate-fade-in rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-violet-200">
        {/* 头部：标题 + 进度 */}
        <header className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-2xl">
            {chain.icon}
          </span>
          <div className="min-w-0 flex-1">
            <span className="chip bg-violet-50 text-violet-600">事件链 · 奇遇</span>
            <h3 className="mt-1.5 text-lg font-semibold text-slate-800">
              {chain.title}
            </h3>
          </div>
          <div className="text-right text-xs text-slate-400">
            阶段 {stepIndex + 1} / {totalSteps}
          </div>
        </header>

        {/* 阶段进度条 */}
        <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-500"
            style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* 阶段标题与剧情 */}
        <div className="mb-5 rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-500">
            {step.title}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {step.text}
          </p>
        </div>

        {/* 选项 */}
        <div className="space-y-2.5">
          {step.options.map((opt, i) => {
            const entries = opt.effect
              ? (Object.entries(opt.effect).filter(([, v]) => {
                  if (v === undefined || v === null || v === 0 || v === '') return false
                  if (typeof v === 'object') return Object.keys(v).length > 0
                  return true
                }) as [keyof EventEffect, EventEffect[keyof EventEffect]][])
              : []
            return (
              <button
                key={`${step.stepId}-${i}`}
                type="button"
                onClick={() => onSelect(opt)}
                className="group flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50/40"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-600">
                  {String.fromCharCode(65 + i)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800">
                    {opt.text}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {entries.map(([k, v]) => {
                      if (k === 'writerProject' && typeof v === 'object') {
                        const deltas = Object.entries(v).filter(
                          ([, val]) => typeof val === 'number' && val !== 0,
                        )
                        return deltas.map(([subK, val]) => {
                          const num = val as number
                          const positive = num > 0
                          const sign = positive ? '+' : ''
                          return (
                            <span
                              key={`${k}-${subK}`}
                              className="chip bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200/70"
                            >
                              作品{subK} {sign}{num}
                            </span>
                          )
                        })
                      }
                      if (typeof v !== 'number') {
                        return (
                          <span
                            key={k}
                            className="chip bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200/70"
                          >
                            {effectLabel(k)}
                          </span>
                        )
                      }
                      const positive = v > 0
                      const sign = positive ? '+' : ''
                      const tone =
                        k === 'stress'
                          ? positive
                            ? 'text-rose-500'
                            : 'text-emerald-600'
                          : positive
                            ? 'text-emerald-600'
                            : 'text-rose-500'
                      return (
                        <span
                          key={k}
                          className={`chip bg-slate-50 ${tone} ring-1 ring-inset ring-slate-200/70`}
                        >
                          {effectLabel(k)} {sign}
                          {v}
                        </span>
                      )
                    })}
                    {opt.getCard && (
                      <span className="chip bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200/70">
                        🃏 获得灵感卡牌
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          事件链进行中，须做出选择以推进至下一阶段
        </p>
      </div>
    </div>
  )
}
