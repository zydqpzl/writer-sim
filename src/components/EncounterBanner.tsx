import type { EventChain } from '../types/event'

interface Props {
  chain: EventChain
  day: number
  /** 是否可点击前往 */
  actionable: boolean
  /** 不可前往时的原因提示 */
  blockHint?: string
  onAccept: () => void
}

export default function EncounterBanner({
  chain,
  day,
  actionable,
  blockHint,
  onAccept,
}: Props) {
  return (
    <div className="card relative animate-fade-in overflow-hidden p-4 ring-1 ring-violet-200">
      {/* 左侧色条 */}
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-violet-400 to-fuchsia-400" />

      <div className="flex items-start gap-3 pl-2">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-2xl">
          📱
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-violet-50 text-violet-600">
              朋友圈 · 限时奇遇
            </span>
            <span className="chip animate-pulse-soft bg-amber-50 text-amber-600">
              ⏳ 今日有效
            </span>
            <span className="text-xs text-slate-400">第 {day} 天</span>
          </div>
          <h3 className="mt-1.5 text-sm font-semibold text-slate-800">
            {chain.icon} {chain.title}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            发小在群里喊人救场，错过今天这个机会就没了。
          </p>
        </div>
        <div className="shrink-0 text-right">
          <button
            type="button"
            disabled={!actionable}
            onClick={onAccept}
            className={[
              'rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
              actionable
                ? 'bg-violet-500 text-white hover:bg-violet-600'
                : 'cursor-not-allowed bg-slate-100 text-slate-400',
            ].join(' ')}
          >
            前往奇遇
          </button>
          {!actionable && blockHint && (
            <div className="mt-1 text-[11px] text-slate-400">{blockHint}</div>
          )}
        </div>
      </div>
    </div>
  )
}
