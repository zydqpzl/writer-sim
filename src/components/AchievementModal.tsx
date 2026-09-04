import type { GameAchievement } from '../types/achievement'

interface AchievementModalProps {
  unlockedIds: Set<string>
  onClose: () => void
}

import { ACHIEVEMENTS } from '../data/achievements'

export default function AchievementModal({
  unlockedIds,
  onClose,
}: AchievementModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">🏆 成就墙</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            关闭
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          成就可在单局中不断解锁，并永久保存。部分成就还会为下一局提供开局加成。
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = unlockedIds.has(ach.id)
            return (
              <AchievementCard
                key={ach.id}
                achievement={ach}
                unlocked={unlocked}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AchievementCard({
  achievement,
  unlocked,
}: {
  achievement: GameAchievement
  unlocked: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-opacity ${
        unlocked
          ? 'border-amber-200 bg-amber-50/60'
          : 'border-slate-200 bg-slate-50 opacity-70'
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-2xl">{achievement.icon}</span>
        <h3 className="font-bold text-slate-800">{achievement.title}</h3>
        {unlocked && (
          <span className="ml-auto rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-white">
            已解锁
          </span>
        )}
      </div>
      <p className="mb-2 text-sm text-slate-600">
        {unlocked ? achievement.description : achievement.hint}
      </p>
      {achievement.metaBonus && (
        <p className="text-xs font-medium text-amber-700">
          元加成：{achievement.metaBonus}
        </p>
      )}
    </div>
  )
}
