import type { PlayerLocation, PlayerStats, PathSnapshot } from '../types/game'
import type { CardQuality, InspirationCard } from '../types/event'

interface AttrMeta {
  key: keyof PlayerStats
  label: string
  icon: string
  percent?: boolean
  unit?: string
  color: string
  track: string
  /** 额外等级标签：health 显示健康状态阈值，stress 显示压力等级 */
  badge?: 'health' | 'stress'
}

const ATTRS: AttrMeta[] = [
  { key: 'savings', label: '存款', icon: '💰', unit: '元', color: 'text-emerald-600', track: 'bg-emerald-500' },
  { key: 'health', label: '健康', icon: '❤️', percent: true, badge: 'health', color: 'text-rose-600', track: 'bg-rose-500' },
  { key: 'energy', label: '精力', icon: '⚡', percent: true, color: 'text-amber-600', track: 'bg-amber-400' },
  { key: 'stress', label: '压力', icon: '🧠', badge: 'stress', color: 'text-fuchsia-600', track: 'bg-fuchsia-400' },
  { key: 'familyApproval', label: '父母满意度', icon: '🏠', percent: true, color: 'text-sky-600', track: 'bg-sky-400' },
  { key: 'influence', label: '职业影响力', icon: '📈', percent: true, color: 'text-brand-600', track: 'bg-brand-500' },
  { key: 'fans', label: '粉丝', icon: '👥', unit: '人', color: 'text-violet-600', track: 'bg-violet-400' },
]

const QUALITY_STYLE: Record<CardQuality, { chip: string; dot: string }> = {
  普通: { chip: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  稀有: { chip: 'bg-sky-100 text-sky-600', dot: 'bg-sky-500' },
  史诗: { chip: 'bg-amber-100 text-amber-600', dot: 'bg-amber-500' },
  传说: { chip: 'bg-rose-100 text-rose-600', dot: 'bg-rose-500' },
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, n))
}

/** CK3 健康状态阈值标签（4 阶段） */
function healthBadge(health: number): { label: string; chip: string } {
  if (health >= 80) return { label: '🟢 健步如飞', chip: 'bg-emerald-50 text-emerald-600' }
  if (health >= 50) return { label: '🟡 亚健康', chip: 'bg-amber-50 text-amber-600' }
  if (health >= 20) return { label: '🟠 虚弱抱病', chip: 'bg-orange-50 text-orange-600' }
  return { label: '🔴 危急重病', chip: 'bg-rose-50 text-rose-600' }
}

/** CK3 压力等级标签（0-3 级），颜色与轨道随等级动态变化。
 *  Lv3 边界使用派生 maxStress（受 trait 修正影响） */
function stressBadge(stress: number, maxStress: number): {
  label: string
  chip: string
  track: string
  color: string
} {
  if (stress >= maxStress)
    return { label: '🔴 Lv3 精神崩溃', chip: 'bg-rose-100 text-rose-700', track: 'bg-rose-500', color: 'text-rose-600' }
  if (stress >= 200)
    return { label: '🟠 Lv2 职业倦怠', chip: 'bg-orange-100 text-orange-700', track: 'bg-orange-500', color: 'text-orange-600' }
  if (stress >= 100)
    return { label: '🟡 Lv1 轻度焦虑', chip: 'bg-amber-100 text-amber-700', track: 'bg-amber-400', color: 'text-amber-600' }
  return { label: '🟢 Lv0 正常', chip: 'bg-emerald-50 text-emerald-600', track: 'bg-emerald-400', color: 'text-emerald-600' }
}

function formatValue(attr: AttrMeta, value: number, maxEnergy: number, maxStress: number) {
  if (attr.badge === 'stress') return `${value} / ${maxStress}`
  if (attr.key === 'energy') return `${value} / ${maxEnergy}`
  if (attr.percent) return `${clamp(value)}%`
  const unit = attr.unit ?? ''
  return `${value.toLocaleString('zh-CN')} ${unit}`.trim()
}

interface Props {
  stats: PlayerStats
  day: number
  totalDays: number
  location: PlayerLocation
  pathSnapshot: PathSnapshot
  warningLine: number
  consecutivePartTimeDays: number
  realityPunchThreshold: number
  inventory: InspirationCard[]
  maxEnergy: number
  maxStress: number
}

const PATH_LABEL: Record<keyof PathSnapshot['scores'], string> = {
  BIG_CITY_CREATOR: '一线数字游民',
  HOMETOWN_KOL: '县城下沉',
  SUBCULTURE_GURU: '亚文化硬核',
  REALITY_COMPROMISE: '现实妥协',
  BALANCED: '仍在摸索',
}

const LOCATION_LABEL: Record<PlayerLocation, { label: string; chip: string; icon: string }> = {
  city: { label: '大城市', chip: 'bg-brand-50 text-brand-600', icon: '🏙️' },
  hometown: { label: '老家', chip: 'bg-emerald-50 text-emerald-600', icon: '🏘️' },
}

export default function PlayerStatusPanel({
  stats,
  day,
  totalDays,
  location,
  pathSnapshot,
  warningLine,
  consecutivePartTimeDays,
  realityPunchThreshold,
  inventory,
  maxEnergy,
  maxStress,
}: Props) {
  const progress = Math.round((day / totalDays) * 100)
  const isWarning = stats.savings < warningLine

  // 按卡牌名聚合计数
  const grouped = inventory.reduce<
    Record<string, { card: InspirationCard; count: number }>
  >((acc, card) => {
    if (!acc[card.id]) acc[card.id] = { card, count: 0 }
    acc[card.id].count += 1
    return acc
  }, {})
  const cardList = Object.values(grouped)

  return (
    <section className="card p-5">
      {/* 头部：标题 + 生存进度 */}
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-500">
            玩家状态
          </h2>
          <p className="mt-0.5 text-lg font-semibold text-slate-800">
            自由职业生存档案
          </p>
        </div>
        <div className="text-right">
          <span className={`chip ${LOCATION_LABEL[location].chip}`}>
            {LOCATION_LABEL[location].icon} {LOCATION_LABEL[location].label}
          </span>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">
              第 {day} / {totalDays} 天
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* 存款警戒提示 */}
      {isWarning && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <span className="animate-pulse-soft">🚨</span>
          <span>存款跌破警戒线（{warningLine} 元），可前往兼职通道跑外卖保命。</span>
        </div>
      )}

      {/* 连续兼职提示 */}
      {consecutivePartTimeDays > 0 && (
        <div
          className={[
            'mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs',
            consecutivePartTimeDays >= realityPunchThreshold
              ? 'border border-amber-200 bg-amber-50 text-amber-700'
              : 'border border-orange-200 bg-orange-50 text-orange-700',
          ].join(' ')}
        >
          <span>🥊</span>
          <span>
            连续兼职 {consecutivePartTimeDays} / {realityPunchThreshold} 天，主业停滞
            {consecutivePartTimeDays >= realityPunchThreshold ? '，现实的铁拳已挥下' : ''}
          </span>
        </div>
      )}

      {/* 属性网格 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {ATTRS.map((attr) => {
          const value = stats[attr.key]
          const isPercent = !!attr.percent
          const isSavings = attr.key === 'savings'

          // CK3 等级标签
          const hBadge = attr.badge === 'health' ? healthBadge(value) : null
          const sBadge = attr.badge === 'stress' ? stressBadge(value, maxStress) : null

          // 进度条填充：stress 按 0-300 映射，其余 0-100
          const fill =
            attr.badge === 'stress'
              ? Math.min(100, (value / 300) * 100)
              : isPercent
                ? clamp(value)
                : clamp(Math.min(100, value / 10))

          // 颜色与轨道：stress 随等级动态变化
          const color =
            sBadge?.color ??
            (isSavings && isWarning ? 'text-rose-600' : attr.color)
          const track =
            sBadge?.track ??
            (isSavings && isWarning ? 'bg-rose-500' : attr.track)

          return (
            <div
              key={attr.key}
              className={[
                'group rounded-xl border bg-slate-50/60 px-3.5 py-2.5 transition-colors hover:bg-white',
                isSavings && isWarning ? 'border-rose-300 bg-rose-50/40' : 'border-slate-100',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-base">{attr.icon}</span>
                  <span className="text-sm font-medium text-slate-600">{attr.label}</span>
                  {isSavings && isWarning && (
                    <span className="chip bg-rose-100 text-rose-600">警戒</span>
                  )}
                  {hBadge && (
                    <span className={`chip ${hBadge.chip}`}>{hBadge.label}</span>
                  )}
                  {sBadge && (
                    <span className={`chip ${sBadge.chip}`}>{sBadge.label}</span>
                  )}
                </div>
                <span className={`shrink-0 text-sm font-semibold ${color}`}>
                  {formatValue(attr, value, maxEnergy, maxStress)}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white ring-1 ring-slate-200/70">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${track}`}
                  style={{ width: `${fill}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* 人生路线趋势 */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-base">🛤️</span>
          <h3 className="text-sm font-semibold text-slate-700">人生路线倾向</h3>
        </div>
        <div className="space-y-1.5">
          {(
            [
              'BIG_CITY_CREATOR',
              'HOMETOWN_KOL',
              'SUBCULTURE_GURU',
              'REALITY_COMPROMISE',
              'BALANCED',
            ] as const
          ).map((key) => {
            const score = pathSnapshot.scores[key]
            const total = Object.values(pathSnapshot.scores).reduce((a, b) => a + b, 0) || 1
            const pct = Math.round((score / total) * 100)
            const isDominant = pathSnapshot.dominant === key
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[11px] text-slate-500">
                  {PATH_LABEL[key]}
                </span>
                <div className="flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={[
                      'h-1.5 rounded-full transition-all',
                      isDominant ? 'bg-brand-500' : 'bg-slate-300',
                    ].join(' ')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-right text-[11px] text-slate-500">{score}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 灵感卡牌背包 */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🃏</span>
            <h3 className="text-sm font-semibold text-slate-700">灵感卡牌</h3>
          </div>
          <span className="chip bg-slate-100 text-slate-500">
            共 {inventory.length} 张
          </span>
        </div>

        {cardList.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">
            尚未收集灵感卡牌。试试「桌游店 DM · 奇遇兼职」触发事件链。
          </p>
        ) : (
          <ul className="space-y-2">
            {cardList.map(({ card, count }) => {
              const q = QUALITY_STYLE[card.quality]
              return (
                <li
                  key={card.id}
                  className="rounded-xl border border-slate-100 bg-white px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${q.dot}`} />
                      <span className="truncate text-sm font-medium text-slate-800">
                        {card.name}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={`chip ${q.chip}`}>{card.quality}</span>
                      {count > 1 && (
                        <span className="chip bg-slate-100 text-slate-500">
                          ×{count}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {card.description}
                  </p>
                  <div className="mt-1.5 text-[11px] text-slate-400">
                    题材 · {card.genre}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
