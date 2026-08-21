import { useState } from 'react'
import type { CardQuality, InspirationCard } from '../types/event'

interface Props {
  inventory: InspirationCard[]
  onPublish: (cardIndex: number | null) => void
  onClose: () => void
}

const QUALITY_STYLE: Record<CardQuality, string> = {
  普通: 'bg-slate-100 text-slate-600',
  稀有: 'bg-sky-100 text-sky-600',
  史诗: 'bg-amber-100 text-amber-600',
  传说: 'bg-rose-100 text-rose-600',
}

export default function CreationModal({ inventory, onPublish, onClose }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const selectedCard = selected !== null ? inventory[selected] ?? null : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg animate-fade-in rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-brand-200">
        {/* 头部 */}
        <header className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
            ✍️
          </span>
          <div className="min-w-0 flex-1">
            <span className="chip bg-brand-50 text-brand-600">创作工坊</span>
            <h3 className="mt-1.5 text-lg font-semibold text-slate-800">
              发布作品
            </h3>
          </div>
        </header>

        {/* 基础效果预览 */}
        <div className="mb-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          <div className="font-medium text-slate-600">本次创作基础效果</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="chip bg-rose-50 text-rose-500">精力 -18</span>
            <span className="chip bg-rose-50 text-rose-500">健康 -4</span>
            <span className="chip bg-rose-50 text-rose-500">心态 -2</span>
            <span className="chip bg-emerald-50 text-emerald-600">影响力 +3</span>
            <span className="chip bg-emerald-50 text-emerald-600">粉丝 +5</span>
          </div>
        </div>

        {/* 卡牌插槽 */}
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          灵感卡牌插槽
        </div>
        {selectedCard ? (
          <div className="mb-3 flex items-center justify-between rounded-xl border-2 border-brand-300 bg-brand-50/50 p-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-lg">🃏</span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-800">
                  {selectedCard.name}
                </div>
                <div className="text-xs text-slate-500">
                  {selectedCard.quality} · {selectedCard.genre}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="chip shrink-0 bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            >
              ✕ 移除
            </button>
          </div>
        ) : (
          <div className="mb-3 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 text-xs text-slate-400">
            点击下方卡牌放入插槽（可不放，不放则无赌博）
          </div>
        )}

        {/* 赌博概率提示 */}
        {selectedCard && (
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <span className="font-semibold">🎲 转化概率</span>
            <span>{Math.round((1 - (selectedCard.viralRate ?? 0.3)) * 100)}% 平平无奇（卡牌消耗）</span>
            <span>{Math.round((selectedCard.viralRate ?? 0.3) * 100)}% 大爆特爆（粉丝·影响力 ×3 + 流量 +200）</span>
            {selectedCard.familyApprovalCost ? (
              <span className="w-full text-rose-600">
                ⚠️ 若爆火，父母满意度 -{selectedCard.familyApprovalCost}
              </span>
            ) : null}
          </div>
        )}

        {/* 背包选卡 */}
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          背包（{inventory.length}）
        </div>
        {inventory.length === 0 ? (
          <p className="mb-4 rounded-xl bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">
            背包没有灵感卡牌，可直接发布（无赌博）。
          </p>
        ) : (
          <div className="scrollbar-thin mb-4 grid max-h-40 grid-cols-1 gap-2 overflow-y-auto pr-1">
            {inventory.map((card, idx) => {
              const isSelected = selected === idx
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelected(isSelected ? null : idx)}
                  className={[
                    'flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all',
                    isSelected
                      ? 'border-brand-400 bg-brand-50'
                      : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40',
                  ].join(' ')}
                >
                  <span className="text-base">🃏</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">
                      {card.name}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {card.description}
                    </div>
                  </div>
                  <span className={`chip shrink-0 ${QUALITY_STYLE[card.quality]}`}>
                    {card.quality}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-200"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onPublish(selected)}
            className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            {selectedCard ? '放入卡牌并发布' : '直接发布'}
          </button>
        </div>
      </div>
    </div>
  )
}
