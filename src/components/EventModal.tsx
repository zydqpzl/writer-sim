import type {
  EventPopupOption,
  GameEvent,
  EventTone,
  PlayerStats,
} from '../types/game'

interface Props {
  event: GameEvent | null
  onClose: () => void
  /** 选中内嵌选项的回调；若事件有 options，则必须提供 */
  onSelectOption?: (index: number) => void
}

const TONE_STYLE: Record<
  EventTone,
  { ring: string; iconBg: string; title: string; chip: string; btn: string }
> = {
  good: {
    ring: 'ring-emerald-200',
    iconBg: 'bg-emerald-50 text-emerald-600',
    title: 'text-emerald-700',
    chip: 'bg-emerald-50 text-emerald-600',
    btn: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  },
  bad: {
    ring: 'ring-rose-200',
    iconBg: 'bg-rose-50 text-rose-600',
    title: 'text-rose-700',
    chip: 'bg-rose-50 text-rose-600',
    btn: 'bg-rose-500 hover:bg-rose-600 text-white',
  },
  neutral: {
    ring: 'ring-slate-200',
    iconBg: 'bg-slate-100 text-slate-600',
    title: 'text-slate-700',
    chip: 'bg-slate-100 text-slate-500',
    btn: 'bg-slate-700 hover:bg-slate-800 text-white',
  },
  critical: {
    ring: 'ring-amber-300',
    iconBg: 'bg-amber-50 text-amber-600',
    title: 'text-amber-700',
    chip: 'bg-amber-50 text-amber-700',
    btn: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
}

const TONE_LABEL: Record<EventTone, string> = {
  good: '正向事件',
  bad: '负面事件',
  neutral: '事件',
  critical: '关键事件',
}

function labelFor(key: keyof PlayerStats): string {
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
  }
}

function colorFor(
  key: keyof PlayerStats,
  value: number,
): string {
  const positive = value > 0
  if (key === 'stress') {
    // stress：升压是坏事=红，降压是好事=绿
    return positive ? 'text-rose-500' : 'text-emerald-600'
  }
  if (key === 'savings') {
    return positive ? 'text-emerald-600' : 'text-rose-600'
  }
  return positive ? 'text-emerald-600' : 'text-rose-500'
}

export default function EventModal({
  event,
  onClose,
  onSelectOption,
}: Props) {
  if (!event) return null
  const style = TONE_STYLE[event.tone]
  const hasOptions = !!event.options && event.options.length > 0

  function renderOptionChips(option: EventPopupOption) {
    if (!option.effects) return null
    const entries = Object.entries(option.effects).filter(
      ([, v]) => v !== 0 && v !== undefined,
    ) as [keyof PlayerStats, number][]
    if (entries.length === 0 && !option.getCard) return null
    return (
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {entries.map(([k, v]) => {
          const sign = v > 0 ? '+' : ''
          return (
            <span
              key={k}
              className={`chip bg-slate-50 ${colorFor(k, v)} ring-1 ring-inset ring-slate-200/70`}
            >
              {labelFor(k)} {sign}
              {v}
            </span>
          )
        })}
        {option.getCard && (
          <span className="chip bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200/70">
            🃏 灵感卡牌
          </span>
        )}
        {option.setLocation && (
          <span className="chip bg-violet-50 text-violet-600 ring-1 ring-inset ring-violet-200/70">
            📍 {option.setLocation === 'hometown' ? '回老家' : '留大城市'}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* 遮罩：有选项时不可点关，必须做出选择 */}
      <div
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in ${
          hasOptions ? 'cursor-not-allowed' : ''
        }`}
        onClick={hasOptions ? undefined : onClose}
      />

      {/* 弹窗主体 */}
      <div
        className={`relative w-full max-w-md animate-fade-in rounded-2xl bg-white p-6 shadow-2xl ring-1 ${style.ring}`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${style.iconBg}`}
          >
            {event.icon}
          </span>
          <div className="min-w-0 flex-1">
            <span className={`chip ${style.chip}`}>{TONE_LABEL[event.tone]}</span>
            <h3 className={`mt-1.5 text-lg font-semibold ${style.title}`}>
              {event.title}
            </h3>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          {event.text}
        </p>

        {event.effects.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {event.effects.map((e, i) => (
              <span
                key={`${e}-${i}`}
                className="chip bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200/70"
              >
                {e}
              </span>
            ))}
          </div>
        )}

        {hasOptions ? (
          <div className="mt-5 space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              选择应对方式
            </div>
            {event.options!.map((opt, i) => (
              <button
                key={`${event.id}-${i}`}
                type="button"
                onClick={() => onSelectOption?.(i)}
                className={[
                  'flex w-full flex-col rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-all',
                  'hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50/40',
                ].join(' ')}
              >
                <div className="text-sm font-semibold text-slate-800">
                  {opt.text}
                </div>
                {renderOptionChips(opt)}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl px-5 py-2 text-sm font-semibold transition-colors ${style.btn}`}
            >
              {event.type === 'reality_punch' ? '咬牙再撑撑' : '知道了'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
