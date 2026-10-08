import type { ReactNode } from 'react'
import type { ActionDef, GameState, TimeSlot } from '../types/game'
import type { WriterProject } from '../types/career'
import {
  DRAFT_STORE_MAX_PER_DAY,
  WATER_WORDS_MAX_PER_DAY,
} from '../data/gameData'

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
  /** 爆更独立动作 */
  onBurst: () => void
  /** 切换水字数模式 */
  onEnableWater: () => void
  /** 存稿 */
  onStoreDraft: () => void
  /** 使用存稿更新 */
  onUseDraft: () => void
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

function toneClass(key: keyof ActionDef['effects'], v: number): string {
  if (key === 'savings') return v > 0 ? 'text-emerald-600' : 'text-rose-600'
  if (key === 'stress') return v > 0 ? 'text-rose-500' : 'text-emerald-600'
  return v > 0 ? 'text-emerald-600' : 'text-rose-500'
}

function effectTags(action: ActionDef, limit = 3) {
  const entries = Object.entries(action.effects).filter(
    ([, v]) => v !== 0 && v !== undefined,
  ) as [keyof ActionDef['effects'], number][]
  if (entries.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {entries.slice(0, limit).map(([k, v]) => {
        const sign = v > 0 ? '+' : ''
        return (
          <span
            key={k}
            className={`chip bg-slate-50 ${toneClass(k, v)} text-[10px] ring-1 ring-inset ring-slate-200/70`}
          >
            {effectLabel(k)} {sign}
            {v}
          </span>
        )
      })}
    </div>
  )
}

function ActionCard({
  icon,
  title,
  desc,
  accent = 'brand',
  disabled,
  onClick,
  children,
  footer,
}: {
  icon: string
  title: string
  desc: string
  accent?: string
  disabled?: boolean
  onClick: () => void
  children?: ReactNode
  footer?: ReactNode
}) {
  const iconBg = ACCENT_ICON_BG[accent] ?? ACCENT_ICON_BG.brand
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
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
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold leading-tight text-slate-800">
            {title}
          </div>
          <div className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-slate-500">
            {desc}
          </div>
        </div>
      </div>
      {children}
      {footer}
    </button>
  )
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
  onBurst,
  onEnableWater,
  onStoreDraft,
  onUseDraft,
}: Props) {
  const {
    slot,
    actedThisSlot,
    partTimeLock,
    consecutivePartTimeDays,
    leaveTokens,
    leaveUsedToday,
    waterModeActive,
    waterWordsUsedToday,
    storedDrafts,
    draftsStoredToday,
  } = state
  const canEmergency = state.stats.savings < warningLine
  const emergencyDisabled = actedThisSlot || partTimeLock

  const restAction = actions.find((a) => a.type === 'rest')
  const coffeeAction = actions.find((a) => a.id === 'consume_coffee' || a.label.includes('咖啡'))
  const leaveActions = actions.filter((a) => a.type === 'leave')
  const otherActions = actions.filter(
    (a) =>
      a.type !== 'leave' &&
      a.type !== 'work' &&
      a !== restAction &&
      a !== coffeeAction,
  )

  const baseDisabled = actedThisSlot || partTimeLock

  return (
    <section className="card flex h-full flex-col p-3">
      {/* 时段轴 + 状态 */}
      <header className="mb-3">
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
            {actedThisSlot
              ? '已完成本时段'
              : `${SLOT_ICON[slot]} ${SLOT_LABEL[slot]} · 待选择`}
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
              {consecutivePartTimeDays >= realityPunchThreshold
                ? ' · 现实的铁拳已挥下'
                : ''}
            </span>
          </div>
        )}
      </header>

      {/* 核心 4 列：更新 / 休息 / 咖啡 / 爆更 */}
      <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <ActionCard
          icon="✍️"
          title={activeProject ? '更新连载' : '开新书'}
          desc={
            activeProject
              ? `《${activeProject.title}》· 追读 ${(activeProject.readerRetention * 100).toFixed(1)}%`
              : '选择平台、题材与文风'
          }
          accent="brand"
          disabled={baseDisabled}
          onClick={onOpenWriterWork}
          footer={
            activeProject && activeProject.performanceForecast ? (
              <div className="text-[10px] text-slate-400">
                预估带 {activeProject.performanceForecast.conservative}–
                {activeProject.performanceForecast.median}–
                {activeProject.performanceForecast.optimistic}
              </div>
            ) : null
          }
        />

        {restAction ? (
          <ActionCard
            icon={restAction.icon}
            title={restAction.label}
            desc={restAction.desc}
            accent={restAction.accent}
            disabled={baseDisabled}
            onClick={() => onChoose(restAction)}
            footer={effectTags(restAction)}
          />
        ) : (
          <div />
        )}

        {coffeeAction ? (
          <ActionCard
            icon={coffeeAction.icon}
            title={coffeeAction.label}
            desc={coffeeAction.desc}
            accent={coffeeAction.accent}
            disabled={baseDisabled}
            onClick={() => onChoose(coffeeAction)}
            footer={effectTags(coffeeAction)}
          />
        ) : (
          <div />
        )}

        <ActionCard
          icon="🚀"
          title="爆更"
          desc="高成本高回报：+15000 字，冲榜冲追读"
          accent="rose"
          disabled={baseDisabled || !activeProject}
          onClick={onBurst}
          footer={
            <div className="flex flex-wrap gap-1">
              <span className="chip bg-rose-50 text-rose-600 text-[10px] ring-1 ring-inset ring-rose-100">
                精力 -22
              </span>
              <span className="chip bg-rose-50 text-rose-600 text-[10px] ring-1 ring-inset ring-rose-100">
                压力 +18
              </span>
            </div>
          }
        />
      </div>

      {/* 请假区 */}
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">请假</span>
          <div className="flex items-center gap-1.5">
            <span className="chip bg-sky-50 text-sky-600 text-[10px]">
              请假券 {leaveTokens}
            </span>
            {leaveUsedToday && (
              <span className="chip bg-slate-100 text-slate-500 text-[10px]">
                今日已请假
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {leaveActions.map((action) => {
            const disabled =
              baseDisabled || leaveTokens <= 0 || leaveUsedToday
            return (
              <button
                key={action.id}
                type="button"
                disabled={disabled}
                onClick={() => onChoose(action)}
                className={[
                  'flex flex-col gap-1.5 rounded-xl border p-2.5 text-left transition-all',
                  disabled
                    ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base ${ACCENT_ICON_BG[action.accent] ?? ACCENT_ICON_BG.brand}`}
                  >
                    {action.icon}
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {action.label}
                  </span>
                </div>
                <div className="text-[10px] leading-snug text-slate-500">
                  {action.desc}
                </div>
                {effectTags(action, 2)}
              </button>
            )
          })}
        </div>
      </div>

      {/* 骚操作区 + 其余动作 */}
      <div className="mb-3 grid flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
        {/* 骚操作 */}
        <div className="card flex flex-col gap-2 bg-slate-50/50 p-2.5 ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              骚操作助手
            </span>
            {waterModeActive && (
              <span className="chip bg-sky-100 text-sky-700 text-[10px]">
                水字数生效中
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={
              baseDisabled ||
              waterWordsUsedToday >= WATER_WORDS_MAX_PER_DAY
            }
            onClick={onEnableWater}
            className={[
              'flex items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs transition-all',
              waterModeActive
                ? 'border-sky-300 bg-sky-50 text-sky-700'
                : baseDisabled ||
                    waterWordsUsedToday >= WATER_WORDS_MAX_PER_DAY
                  ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                  : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/50',
            ].join(' ')}
          >
            <span>💧 水字数 {waterModeActive ? '· 已开启' : ''}</span>
            <span className="text-[10px] text-slate-400">
              {waterWordsUsedToday}/{WATER_WORDS_MAX_PER_DAY}
            </span>
          </button>

          <button
            type="button"
            disabled={baseDisabled || draftsStoredToday >= DRAFT_STORE_MAX_PER_DAY}
            onClick={onStoreDraft}
            className={[
              'flex items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs transition-all',
              baseDisabled || draftsStoredToday >= DRAFT_STORE_MAX_PER_DAY
                ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50',
            ].join(' ')}
          >
            <span>📝 存一稿</span>
            <span className="text-[10px] text-slate-400">
              {draftsStoredToday}/{DRAFT_STORE_MAX_PER_DAY}
            </span>
          </button>

          <button
            type="button"
            disabled={baseDisabled || storedDrafts <= 0}
            onClick={onUseDraft}
            className={[
              'flex items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs transition-all',
              baseDisabled || storedDrafts <= 0
                ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50',
            ].join(' ')}
          >
            <span>📤 用存稿更新</span>
            <span className="text-[10px] text-slate-400">存 {storedDrafts}</span>
          </button>
        </div>

        {/* 其余日常动作 */}
        <div className="grid grid-cols-2 gap-2 lg:col-span-2">
          {otherActions.map((action) => {
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
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg ${ACCENT_ICON_BG[action.accent] ?? ACCENT_ICON_BG.brand}`}
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
                {!isWorkLocked && effectTags(action)}
              </button>
            )
          })}
        </div>
      </div>

      {/* 兼职通道 + 推进：底部固定栏 */}
      <div className="mt-auto flex items-stretch gap-2 border-t border-slate-100 pt-3">
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
            {canEmergency
              ? `存款低于 ${warningLine} 元 · 急需回血`
              : '可主动兼职换脑'}
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
