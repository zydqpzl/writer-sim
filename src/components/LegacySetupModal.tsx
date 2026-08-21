import { useMemo, useState } from 'react'
import type { LegacyProfile, StartingIdentity } from '../data/legacy'
import { resolveKeptCards, STARTING_IDENTITIES } from '../data/legacy'

interface Props {
  legacyProfile: LegacyProfile
  onStart: (setup: { identity: StartingIdentity; keptCardIds: string[] }) => void
}

const QUALITY_CHIP: Record<
  '普通' | '稀有' | '史诗' | '传说',
  string
> = {
  普通: 'bg-slate-100 text-slate-600',
  稀有: 'bg-sky-100 text-sky-600',
  史诗: 'bg-amber-100 text-amber-600',
  传说: 'bg-rose-100 text-rose-600',
}

export default function LegacySetupModal({
  legacyProfile,
  onStart,
}: Props) {
  const unlockedSet = useMemo(
    () => new Set(legacyProfile.unlockedIdentityIds),
    [legacyProfile.unlockedIdentityIds],
  )

  const unlockedIdentities = useMemo(
    () =>
      STARTING_IDENTITIES.filter((i) => unlockedSet.has(i.id)).sort(
        (a, b) => a.cost - b.cost,
      ),
    [unlockedSet],
  )

  const [selectedId, setSelectedId] = useState<string>(
    unlockedIdentities[0]?.id ?? 'default',
  )

  const selectedIdentity = useMemo(
    () => unlockedIdentities.find((i) => i.id === selectedId) ?? STARTING_IDENTITIES[0],
    [unlockedIdentities, selectedId],
  )

  const keptCards = useMemo(
    () => resolveKeptCards(legacyProfile.keptCardIds),
    [legacyProfile.keptCardIds],
  )
  const keptCard = keptCards[0]

  const handleStart = () => {
    onStart({
      identity: selectedIdentity,
      keptCardIds: keptCard ? [keptCard.id] : [],
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div className="relative max-h-[90vh] w-full max-w-lg animate-fade-in overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-violet-200">
        {/* 头部 */}
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-2xl">
            ✨
          </span>
          <div className="min-w-0 flex-1">
            <span className="chip bg-violet-50 text-violet-600">
              人生回响 · 二周目
            </span>
            <h2 className="mt-1.5 text-xl font-bold text-slate-800">
              选择下一局开局身份
            </h2>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">累计回响</div>
            <div className="text-sm font-bold text-violet-700">
              {legacyProfile.totalLegacyPoints}
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          上一局的结局已化作人生回响。你可以携带一张史诗/传说灵感卡进入下一局，并选择一个已解锁的开局身份。
        </p>

        {/* 身份列表 */}
        <div className="mt-5 space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            开局身份
          </div>
          {STARTING_IDENTITIES.map((identity) => {
            const unlocked = unlockedSet.has(identity.id)
            const selected = selectedId === identity.id
            return (
              <button
                key={identity.id}
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && setSelectedId(identity.id)}
                className={[
                  'flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
                  !unlocked
                    ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-70'
                    : selected
                      ? 'border-violet-300 bg-violet-50 ring-1 ring-violet-200'
                      : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/30',
                ].join(' ')}
              >
                <span
                  className={[
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    selected
                      ? 'bg-violet-500 text-white'
                      : 'bg-slate-100 text-slate-500',
                  ].join(' ')}
                >
                  {selected ? '✓' : identity.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        'text-sm font-semibold',
                        unlocked ? 'text-slate-800' : 'text-slate-500',
                      ].join(' ')}
                    >
                      {identity.name}
                    </span>
                    {!unlocked && (
                      <span className="chip bg-slate-100 text-slate-500">
                        🔒 {identity.cost} 回响解锁
                      </span>
                    )}
                    {unlocked && identity.cost > 0 && (
                      <span className="chip bg-violet-50 text-violet-600">
                        已解锁
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {identity.desc}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* 携带卡牌 */}
        <div className="mt-5 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            本局携带卡牌
          </div>
          {keptCard ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2.5">
              <span className="mt-0.5 text-base">🃏</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {keptCard.name}
                  </span>
                  <span className={`chip ${QUALITY_CHIP[keptCard.quality]}`}>
                    {keptCard.quality}
                  </span>
                  <span className="chip bg-slate-100 text-slate-500">
                    {keptCard.genre}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {keptCard.description}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">
              上一局未选择携带卡牌，或不符合携带条件（仅史诗/传说可跨局继承）。
            </div>
          )}
        </div>

        {/* 解锁进度提示 */}
        <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          已解锁 {unlockedIdentities.length} / {STARTING_IDENTITIES.length} 个身份
          {unlockedIdentities.length < STARTING_IDENTITIES.length && (
            <>
              {' '}
              · 继续积累回响可解锁更多开局。
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleStart}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
          >
            以【{selectedIdentity.name}】开局 →
          </button>
        </div>
      </div>
    </div>
  )
}
