import type { ActionDef, GameState, TimeSlot } from '../types/game'
import type { WriterProject } from '../types/career'

interface Props {
  state: GameState
  totalDays: number
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

/** 行动强调色 -> tailwind 类映射 */
const ACCENT_MAP: Record<
  string,
  { ring: string; iconBg: string }
> = {
  brand: {
    ring: 'hover:border-brand-300 hover:shadow-[0_8px_24px_rgba(59,98,246,0.12)]',
    iconBg: 'bg-brand-50 text-brand-600',
  },
  emerald: {
    ring: 'hover:border-emerald-300 hover:shadow-[0_8px_24px_rgba(16,185,129,0.12)]',
    iconBg: 'bg-emerald-50 text-emerald-600',
  },
  amber: {
    ring: 'hover:border-amber-300 hover:shadow-[0_8px_24px_rgba(245,158,11,0.12)]',
    iconBg: 'bg-amber-50 text-amber-600',
  },
  rose: {
    ring: 'hover:border-rose-300 hover:shadow-[0_8px_24px_rgba(244,63,94,0.12)]',
    iconBg: 'bg-rose-50 text-rose-600',
  },
  orange: {
    ring: 'hover:border-orange-300 hover:shadow-[0_8px_24px_rgba(249,115,22,0.12)]',
    iconBg: 'bg-orange-50 text-orange-600',
  },
  violet: {
    ring: 'hover:border-violet-300 hover:shadow-[0_8px_24px_rgba(139,92,246,0.12)]',
    iconBg: 'bg-violet-50 text-violet-600',
  },
}

function effectLabel(key: keyof ActionDef['effects']): string {
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
    default:
      return key
  }
}

export default function DayActionPanel({
  state,
  totalDays,
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
  const { day, slot, actedThisSlot, partTimeLock, consecutivePartTimeDays } =
    state
  const accent = ACCENT_MAP

  const canEmergency = state.stats.savings < warningLine
  // 兼职解禁：任何时候都可选择（不再受存款警戒线硬性限制）。
  // 健康虚弱时由 useGame 拦截并提示；UI 仅在已行动/兼职锁定时禁用。
  const emergencyDisabled = actedThisSlot || partTimeLock

  return (
    <section className="card flex flex-col p-5">
      {/* 顶部：日期 + 时段轴 */}
      <header className="mb-5">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-slate-500">
              今日行动
            </h2>
            <p className="mt-0.5 text-lg font-semibold text-slate-800">
              第 {day} 天 · {SLOT_LABEL[slot]} {SLOT_ICON[slot]}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="chip bg-slate-100 text-slate-500">
              {actedThisSlot ? '已完成本时段' : '待选择行动'}
            </span>
            {partTimeLock && (
              <span className="chip bg-orange-50 text-orange-600">
                今日精力被压榨
              </span>
            )}
          </div>
        </div>

        {/* 时段进度轴 */}
        <div className="mt-4 flex items-center gap-2">
          {(['morning', 'afternoon', 'evening'] as TimeSlot[]).map((s, i) => {
            const order = ['morning', 'afternoon', 'evening'].indexOf(slot)
            const isDone = i < order
            const isActive = i === order
            return (
              <div key={s} className="flex flex-1 items-center gap-2">
                <div
                  className={[
                    'flex h-7 flex-1 items-center justify-center rounded-lg text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-brand-500 text-white shadow-soft'
                      : isDone
                        ? 'bg-brand-50 text-brand-600'
                        : 'bg-slate-100 text-slate-400',
                  ].join(' ')}
                >
                  {SLOT_ICON[s]} {SLOT_LABEL[s]}
                </div>
                {i < 2 && <div className="h-px w-3 bg-slate-200" />}
              </div>
            )
          })}
        </div>

        {/* 连续兼职警告条 */}
        {consecutivePartTimeDays > 0 && (
          <div
            className={[
              'mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
              consecutivePartTimeDays >= realityPunchThreshold
                ? 'bg-amber-50 text-amber-700'
                : 'bg-orange-50/70 text-orange-700',
            ].join(' ')}
          >
            <span>⚠️</span>
            <span>
              连续靠兼职生存 {consecutivePartTimeDays} / {realityPunchThreshold} 天
              （主业进度为 0）
              {consecutivePartTimeDays >= realityPunchThreshold
                ? '· 现实的铁拳已挥下'
                : ''}
            </span>
          </div>
        )}
      </header>

      {/* 主行动卡片网格 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((action) => {
          const a = accent[action.accent] ?? accent.brand
          const entries = Object.entries(action.effects).filter(
            ([, v]) => v !== 0 && v !== undefined,
          ) as [keyof ActionDef['effects'], number][]
          const isWorkLocked = action.type === 'work' && partTimeLock
          const disabled = actedThisSlot || isWorkLocked
          return (
            <button
              key={action.type}
              type="button"
              disabled={disabled}
              onClick={() =>
                action.type === 'work' ? onStartWork() : onChoose(action)
              }
              className={[
                'group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all',
                a.ring,
                disabled
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:-translate-y-0.5',
              ].join(' ')}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${a.iconBg}`}
                >
                  {action.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    {action.label}
                    {isWorkLocked && (
                      <span className="chip bg-orange-50 text-orange-600">
                        🔒 已锁定
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {isWorkLocked
                      ? '今日精力被兼职压榨，无法专注创作。'
                      : action.desc}
                  </div>
                </div>
              </div>
              {!isWorkLocked && entries.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {entries.map(([k, v]) => {
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
                        className={`chip bg-slate-50 ${tone} ring-1 ring-inset ring-slate-200/70`}
                      >
                        {effectLabel(k)} {sign}
                        {v}
                      </span>
                    )
                  })}
                </div>
              )}
            </button>
          )
        })}

        {/* 网络作家主入口：开新书 / 更新连载 */}
        <button
          type="button"
          disabled={actedThisSlot}
          onClick={onOpenWriterWork}
          className={[
            'group relative mt-3 flex flex-col rounded-2xl border p-4 text-left transition-all',
            actedThisSlot
              ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
              : 'border-brand-200 bg-brand-50/30 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/50',
          ].join(' ')}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-xl text-brand-600">
              ✍️
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-800">
                {activeProject ? '写作 / 更新' : '开一本新书'}
              </div>
              <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                {activeProject
                  ? `推进《${activeProject.title}》进度，选择写作策略或注入灵感。`
                  : '选择平台开始连载网络小说，签约、上架、赚取稿费。'}
              </div>
            </div>
          </div>
          {activeProject && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="chip bg-white text-brand-600 text-[10px] ring-1 ring-inset ring-brand-200/70">
                {(activeProject.wordCount / 10000).toFixed(1)} 万字
              </span>
              <span className="chip bg-white text-brand-600 text-[10px] ring-1 ring-inset ring-brand-200/70">
                {activeProject.totalChapters} 章
              </span>
              <span className="chip bg-white text-brand-600 text-[10px] ring-1 ring-inset ring-brand-200/70">
                {activeProject.stage === 'CONCEPT'
                  ? '投稿签约期'
                  : activeProject.stage === 'SIGNED'
                    ? '已签约'
                    : activeProject.stage === 'LAUNCHED'
                      ? '已上架'
                      : '连载中'}
              </span>
            </div>
          )}
        </button>
      </div>

      {/* 兼职通道：保命 + 奇遇 */}
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            兼职通道
          </span>
          <div className="h-px flex-1 bg-slate-100" />
          {canEmergency ? (
            <span className="chip bg-rose-50 text-rose-600">
              存款低于 {warningLine} 元 · 急需回血
            </span>
          ) : (
            <span className="chip bg-emerald-50 text-emerald-600">
              存款充裕 · 可主动兼职换脑
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {/* 应急保命兼职（常驻底线；奇遇改为顶部动态刷新） */}
          <button
            type="button"
            disabled={emergencyDisabled}
            onClick={onEmergency}
            className={[
              'group relative flex flex-col rounded-2xl border-2 border-dashed p-4 text-left transition-all',
              partTimeLock
                ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70'
                : emergencyDisabled
                  ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                  : 'border-orange-300 bg-orange-50/40 hover:-translate-y-0.5 hover:border-orange-400 hover:bg-orange-50/70',
            ].join(' ')}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-xl text-orange-600">
                {emergencyAction.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-800">
                  {emergencyAction.label}
                </div>
                <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                  {emergencyAction.desc}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(emergencyAction.effects)
                .filter(([, v]) => v !== 0 && v !== undefined)
                .map(([k, v]) => {
                  const key = k as keyof ActionDef['effects']
                  const positive = (v as number) > 0
                  const sign = positive ? '+' : ''
                  const tone =
                    key === 'savings'
                      ? positive
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                      : key === 'stress'
                        ? positive
                          ? 'text-rose-500'
                          : 'text-emerald-600'
                        : positive
                          ? 'text-emerald-600'
                          : 'text-rose-500'
                  return (
                    <span
                      key={key}
                      className={`chip bg-slate-50 ${tone} ring-1 ring-inset ring-slate-200/70`}
                    >
                      {effectLabel(key)} {sign}
                      {v}
                    </span>
                  )
                })}
              <span className="chip bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200/70">
                不掉卡牌
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 推进按钮 */}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-400">
          选择行动后，推进至下一时段；晚上结束将结算当日事件。
        </p>
        <button
          type="button"
          onClick={onNext}
          disabled={!actedThisSlot && day < totalDays}
          className={[
            'rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
            actedThisSlot
              ? 'bg-slate-800 text-white hover:bg-slate-900'
              : 'bg-slate-200 text-slate-500',
          ].join(' ')}
        >
          {slot === 'evening'
            ? '结束今日 →'
            : `进入${SLOT_LABEL[nextSlot(slot)]} →`}
        </button>
      </div>
    </section>
  )
}

function nextSlot(slot: TimeSlot): TimeSlot {
  return slot === 'morning' ? 'afternoon' : 'evening'
}
