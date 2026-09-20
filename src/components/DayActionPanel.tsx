import type { ActionDef, GameState, TimeSlot } from '../types/game'
import type { WriterProject } from '../types/career'

interface Props {
  state: GameState
  actions: ActionDef[]
  /** 应急保命兼职 */
  emergencyAction: ActionDef
  /** 存款警戒线 */
  warningLine: number
  /** 现实的铁拳阈值 */
  realityPunchThreshold: number
  activeProject?: WriterProject
  onChoose: (action: ActionDef) => void
  /** 点击灵感创作卡时打开创作工坊 */
  onStartWork: () => void
  /** 打开写作工坊（开新书 / 更新连载） */
  onOpenWriterWork: () => void
  onEmergency: () => void
  onNext: () => void
}

const SLOT_LABEL: Record<TimeSlot, string> = {
  morning: '上午',
  afternoon: '下午',
  evening: '晚上',
}
const SLOT_ICON: Record<TimeSlot, string> = {
  morning: '☀️',
  afternoon: '🌤️',
  evening: '🌙',
}

const ACCENT_ICON_BG: Record<string, string> = {
  brand: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  orange: 'bg-orange-50 text-orange-600',
  violet: 'bg-violet-50 text-violet-600',
  teal: 'bg-teal-50 text-teal-600',
  sky: 'bg-sky-50 text-sky-600',
  fuchsia: 'bg-fuchsia-50 text-fuchsia-600',
  indigo: 'bg-indigo-50 text-indigo-600',
}

function effectLabel(key: keyof ActionDef['effects']): string {
  switch (key) {
    case 'savings': return '存款'
    case 'health': return '健康'
    case 'energy': return '精力'
    case 'stress': return '压力'
    case 'familyApproval': return '父母'
    case 'influence': return '影响力'
    case 'fans': return '粉丝'
    default: return key
  }
}

export default function DayActionPanel({
  state,
  actions,
  emergencyAction,
  warningLine,
  realityPunchThreshold,
  activeProject,
  onChoose,
  onStartWork,
  onOpenWriterWork,
  onEmergency,
  onNext,
}: Props) {
  const { slot, actedThisSlot, partTimeLock, consecutivePartTimeDays } = state
  const canEmergency = state.stats.savings < warningLine
  const emergencyDisabled = actedThisSlot || partTimeLock

  return (
    <section className="card flex flex-col p-4">
      {/* 时段轴 + 状态 */}
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-slate-500">
            今日行动
          </h2>
          <span
            className={[
              'chip text-xs',
              actedThisSlot
                ? 'bg-slate-100 text-slate-500'
                : 'bg-brand-50 text-brand-600',
            ].join(' ')}
          >
            {actedThisSlot ? '已完成本时段' : `${SLOT_ICON[slot]} ${SLOT_LABEL[slot]} · 待选择`}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {(['morning', 'afternoon', 'evening'] as TimeSlot[]).map((s, i) => {
            const order = ['morning', 'afternoon', 'evening'].indexOf(slot)
            const isDone = i < order
            const isActive = i === order
            return (
              <div key={s} className="flex flex-1 items-center gap-1.5">
                <div
                  className={[
                    'flex h-6 flex-1 items-center justify-center rounded-md text-[11px] font-medium transition-colors',
                    isActive
                      ? 'bg-brand-500 text-white'
                      : isDone
                        ? 'bg-brand-50 text-brand-600'
                        : 'bg-slate-100 text-slate-400',
                  ].join(' ')}
                >
                  {SLOT_LABEL[s]}
                </div>
                {i < 2 && <div className="h-px w-2 bg-slate-200" />}
              </div>
            )
          })}
        </div>
        {consecutivePartTimeDays > 0 && (
          <div
            className={[
              'mt-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px]',
              consecutivePartTimeDays >= realityPunchThreshold
                ? 'bg-amber-50 text-amber-700'
                : 'bg-orange-50/70 text-orange-700',
            ].join(' ')}
          >
            <span>⚠️</span>
            <span>
              连续兼职 {consecutivePartTimeDays}/{realityPunchThreshold} 天
              {consecutivePartTimeDays >= realityPunchThreshold ? ' · 现实的铁拳已挥下' : ''}
            </span>
          </div>
        )}
      </header>

      {/* 高频日常动作：紧凑 3 列网格 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {actions.map((action) => {
          const iconBg = ACCENT_ICON_BG[action.accent] ?? ACCENT_ICON_BG.brand
          const entries = Object.entries(action.effects).filter(
            ([, v]) => v !== 0 && v !== undefined,
          ) as [keyof ActionDef['effects'], number][]
          const isWorkLocked = action.type === 'work' && partTimeLock
          const disabled = actedThisSlot || isWorkLocked
          return (
            <button
              key={action.id ?? `${action.type}-${action.label}`}
              type="button"
              disabled={disabled}
              onClick={() =>
                action.type === 'work' ? onStartWork() : onChoose(action)
              }
              className={[
                'flex flex-col gap-2 rounded-xl border p-3 text-left transition-all',
                disabled
                  ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg ${iconBg}`}
                >
                  {action.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold leading-tight text-slate-800">
                    {action.label}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-slate-500">
                    {isWorkLocked ? '精力被兼职压榨，无法创作' : action.desc}
                  </div>
                </div>
              </div>
              {!isWorkLocked && entries.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entries.slice(0, 3).map(([k, v]) => {
                    const positive = v > 0
                    const sign = positive ? '+' : ''
                    const tone =
                      k === 'savings'
                        ? positive
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                        : k === 'stress'
                          ? positive
                            ? 'text-rose-500'
                            : 'text-emerald-600'
                          : positive
                            ? 'text-emerald-600'
                            : 'text-rose-500'
                    return (
                      <span
                        key={k}
                        className={`chip bg-slate-50 ${tone} text-[10px] ring-1 ring-inset ring-slate-200/70`}
                      >
                        {effectLabel(k)} {sign}{v}
                      </span>
                    )
                  })}
                </div>
              )}
            </button>
          )
        })}

        {/* 写作/开书核心入口 */}
        <button
          type="button"
          disabled={actedThisSlot}
          onClick={onOpenWriterWork}
          className={[
            'group relative flex flex-col gap-2 rounded-xl border p-3 text-left transition-all',
            actedThisSlot
              ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
              : 'border-brand-200 bg-brand-50/40 hover:border-brand-300 hover:bg-brand-50/70',
          ].join(' ')}
        >
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-lg text-brand-600">
              ✍️
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold leading-tight text-slate-800">
                {activeProject ? '写作 / 更新' : '开一本新书'}
              </div>
              <div className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-slate-500">
                {activeProject
                  ? `推进《${activeProject.title}》`
                  : '选择平台开始连载'}
              </div>
            </div>
          </div>
          {activeProject && (
            <div className="flex flex-wrap gap-1">
              <span className="chip bg-white text-brand-600 text-[10px] ring-1 ring-inset ring-brand-200/70">
                {(activeProject.wordCount / 10000).toFixed(1)} 万字
              </span>
              <span className="chip bg-white text-brand-600 text-[10px] ring-1 ring-inset ring-brand-200/70">
                {activeProject.totalChapters} 章
              </span>
            </div>
          )}
        </button>
      </div>

      {/* 兼职通道 + 推进：底部固定栏 */}
      <div className="mt-4 flex items-stretch gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          disabled={emergencyDisabled}
          onClick={onEmergency}
          className={[
            'flex flex-1 flex-col justify-center rounded-xl border-2 border-dashed px-3 py-2 text-left transition-all',
            partTimeLock || emergencyDisabled
              ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
              : 'border-orange-300 bg-orange-50/40 hover:border-orange-400 hover:bg-orange-50/70',
          ].join(' ')}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{emergencyAction.icon}</span>
            <span className="text-xs font-semibold text-slate-800">
              {emergencyAction.label}
            </span>
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            {canEmergency ? `存款低于 ${warningLine} 元 · 急需回血` : '可主动兼职换脑'}
          </div>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!actedThisSlot}
          className={[
            'flex items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors',
            actedThisSlot
              ? 'bg-slate-800 text-white hover:bg-slate-900'
              : 'bg-slate-200 text-slate-500',
          ].join(' ')}
        >
          {slot === 'evening' ? '结束今日 →' : `进入${SLOT_LABEL[nextSlot(slot)]} →`}
        </button>
      </div>
    </section>
  )
}

function nextSlot(slot: TimeSlot): TimeSlot {
  return slot === 'morning' ? 'afternoon' : 'evening'
}
