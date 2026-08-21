import { useState } from 'react'
import type { Ending, EndingTag, GameState, PathSnapshot } from '../types/game'
import type { InspirationCard } from '../types/event'
import { isCarryableCard, legacyPointsFor } from '../data/legacy'

interface Props {
  ending: Ending
  state: GameState
  pathSnapshot: PathSnapshot
  /** 本局获得的人生回响点数（已计入累计） */
  legacyPointsEarned: number
  /** 累计人生回响点数 */
  totalLegacyPoints: number
  /** 确认携带一张 SSR/史诗 灵感卡进入下一局；null 表示不携带 */
  onConfirm: (carriedCardId: string | null) => void
}

const TAG_STYLE: Record<EndingTag, { chip: string; icon: string; headline: string }> = {
  triumph: {
    chip: 'bg-amber-100 text-amber-700',
    icon: '🏆',
    headline: 'text-amber-700',
  },
  compromise: {
    chip: 'bg-slate-100 text-slate-600',
    icon: '⚖️',
    headline: 'text-slate-700',
  },
  fail: {
    chip: 'bg-rose-100 text-rose-700',
    icon: '💀',
    headline: 'text-rose-700',
  },
  open: {
    chip: 'bg-sky-100 text-sky-700',
    icon: '🌅',
    headline: 'text-sky-700',
  },
}

const TAG_LABEL: Record<EndingTag, string> = {
  triumph: ' triumph 结局',
  compromise: ' compromise 结局',
  fail: ' fail 结局',
  open: ' to be continued',
}

const PATH_LABEL: Record<keyof PathSnapshot['scores'], string> = {
  BIG_CITY_CREATOR: '一线数字游民',
  HOMETOWN_KOL: '县城下沉',
  SUBCULTURE_GURU: '亚文化硬核',
  REALITY_COMPROMISE: '现实妥协',
  BALANCED: '仍在摸索',
}

const QUALITY_CHIP: Record<InspirationCard['quality'], string> = {
  普通: 'bg-slate-100 text-slate-600',
  稀有: 'bg-sky-100 text-sky-600',
  史诗: 'bg-amber-100 text-amber-600',
  传说: 'bg-rose-100 text-rose-600',
}

export default function EndingModal({
  ending,
  state,
  pathSnapshot,
  legacyPointsEarned,
  totalLegacyPoints,
  onConfirm,
}: Props) {
  const style = TAG_STYLE[ending.tag]
  const points = legacyPointsFor(ending)

  // 可选携带卡牌：本局获得的史诗/传说灵感卡
  const carryableCards = state.inventory.filter(isCarryableCard)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    carryableCards[0]?.id ?? null,
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div className="relative max-h-[90vh] w-full max-w-lg animate-fade-in overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
            {style.icon}
          </span>
          <div className="min-w-0 flex-1">
            <span className={`chip ${style.chip}`}>{TAG_LABEL[ending.tag]}</span>
            <h2 className={`mt-1.5 text-xl font-bold ${style.headline}`}>
              {ending.title}
            </h2>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          {ending.description}
        </p>

        {/* 遗产奖励 */}
        <div className="mt-5 rounded-xl bg-violet-50 p-4 ring-1 ring-inset ring-violet-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <span className="text-sm font-semibold text-violet-800">
              人生回响 +{points}
            </span>
          </div>
          <p className="mt-1 text-xs text-violet-700">
            累计回响点数：{totalLegacyPoints - legacyPointsEarned} → {totalLegacyPoints}
          </p>
          <p className="mt-1 text-xs text-violet-600">
            达到足够点数可解锁新的开局身份。下一局开始时可以选择更带感的初始身份。
          </p>
        </div>

        {/* 最终数据摘要 */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
            <div className="text-xs text-slate-400">最终存款</div>
            <div className="text-sm font-semibold text-slate-700">
              {state.stats.savings.toLocaleString('zh-CN')} 元
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
            <div className="text-xs text-slate-400">粉丝</div>
            <div className="text-sm font-semibold text-slate-700">
              {state.stats.fans.toLocaleString('zh-CN')}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
            <div className="text-xs text-slate-400">地点</div>
            <div className="text-sm font-semibold text-slate-700">
              {state.location === 'hometown' ? '老家' : '大城市'}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
            <div className="text-xs text-slate-400">主导路线</div>
            <div className="text-sm font-semibold text-slate-700">
              {PATH_LABEL[pathSnapshot.dominant]}
            </div>
          </div>
        </div>

        {/* 路线分数条 */}
        <div className="mt-5 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            人生路线倾向
          </div>
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
              <div key={key} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-slate-500">
                  {PATH_LABEL[key]}
                </span>
                <div className="flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={[
                      'h-2 rounded-full transition-all',
                      isDominant ? 'bg-brand-500' : 'bg-slate-300',
                    ].join(' ')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs text-slate-500">{score}</span>
              </div>
            )
          })}
        </div>

        {/* 携带 SSR/史诗 卡牌 */}
        {carryableCards.length > 0 && (
          <div className="mt-5 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              选择一张灵感卡牌带入下一局
            </div>
            <div className="space-y-2">
              {carryableCards.map((card) => {
                const selected = selectedCardId === card.id
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedCardId(selected ? null : card.id)}
                    className={[
                      'flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
                      selected
                        ? 'border-violet-300 bg-violet-50 ring-1 ring-violet-200'
                        : 'border-slate-200 bg-white hover:border-violet-200',
                    ].join(' ')}
                  >
                    <span className="mt-0.5 text-base">🃏</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          {card.name}
                        </span>
                        <span className={`chip ${QUALITY_CHIP[card.quality]}`}>
                          {card.quality}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                        {card.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => onConfirm(selectedCardId)}
            className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-900"
          >
            确认遗产，进入下一局 →
          </button>
        </div>
      </div>
    </div>
  )
}
