import type { PlayerStats, PlayerLocation } from '../types/game'

interface Props {
  day: number
  yearLength: number
  slot: 'morning' | 'afternoon' | 'evening'
  stats: PlayerStats
  location: PlayerLocation
  maxEnergy: number
  maxStress: number
  onEmergency: () => void
  onOpenAssetStore: () => void
  onOpenAchievements: () => void
  onToggleDebug: () => void
  debugOpen: boolean
}

const SLOT_LABEL: Record<Props['slot'], string> = {
  morning: '上午',
  afternoon: '下午',
  evening: '晚上',
}
const SLOT_ICON: Record<Props['slot'], string> = {
  morning: '☀️',
  afternoon: '🌤️',
  evening: '🌙',
}
const LOCATION_LABEL: Record<PlayerLocation, string> = {
  city: '大城市',
  hometown: '老家',
}

export default function TopBar({
  day,
  yearLength,
  slot,
  stats,
  location,
  maxEnergy,
  maxStress,
  onEmergency,
  onOpenAssetStore,
  onOpenAchievements,
  onToggleDebug,
  debugOpen,
}: Props) {
  const year = Math.ceil(day / yearLength)
  const dayOfYear = ((day - 1) % yearLength) + 1

  const statItems = [
    { key: 'savings', label: '存款', icon: '💰', color: 'text-emerald-600', value: `${stats.savings.toLocaleString('zh-CN')} 元` },
    { key: 'health', label: '健康', icon: '❤️', color: 'text-rose-600', value: `${stats.health}%` },
    { key: 'energy', label: '精力', icon: '⚡', color: 'text-amber-600', value: `${stats.energy}/${maxEnergy}` },
    { key: 'stress', label: '压力', icon: '🧠', color: 'text-fuchsia-600', value: `${stats.stress}/${maxStress}` },
    { key: 'fans', label: '粉丝', icon: '👥', color: 'text-violet-600', value: stats.fans.toLocaleString('zh-CN') },
  ] as const

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur">
      {/* 左侧：品牌 + 日期 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-base text-white shadow-soft">
            🐟
          </span>
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold leading-none text-slate-800">毕业咸鱼模拟器</h1>
            <p className="text-[10px] text-slate-400">Freelancer Survival</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="chip bg-slate-100 text-slate-600">
            {LOCATION_LABEL[location]}
          </span>
          <span className="font-medium text-slate-700">
            第 {year} 年 · 第 {dayOfYear} 天
          </span>
          <span className="chip bg-brand-50 text-brand-600">
            {SLOT_ICON[slot]} {SLOT_LABEL[slot]}
          </span>
        </div>
      </div>

      {/* 中间：核心资源条（类似 P社顶部数值） */}
      <div className="hidden flex-1 items-center justify-center gap-1 md:flex lg:gap-3">
        {statItems.map((s) => (
          <div
            key={s.key}
            className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-1.5"
            title={s.label}
          >
            <span className="text-sm">{s.icon}</span>
            <span className="text-[11px] font-medium text-slate-500">{s.label}</span>
            <span className={`text-sm font-semibold ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* 右侧：战略入口 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEmergency}
          className="rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
        >
          🛵 保命兼职
        </button>
        <button
          type="button"
          onClick={onOpenAssetStore}
          className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
        >
          🏢 资产库
        </button>
        <button
          type="button"
          onClick={onOpenAchievements}
          className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
        >
          🏆 成就
        </button>
        <button
          type="button"
          onClick={onToggleDebug}
          className={[
            'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
            debugOpen
              ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
          ].join(' ')}
        >
          🛠
        </button>
      </div>
    </header>
  )
}
