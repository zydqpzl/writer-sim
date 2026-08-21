import { useMemo, useState } from 'react'
import { PLATFORMS } from '../data/platforms'
import type {
  BoardType,
  Leaderboard,
  NPCCreator,
  NPCInteraction,
  PlatformMemeTrend,
} from '../types/platform'
import type { WriterProject } from '../types/career'

interface PlatformEcosystemPanelProps {
  npcs: NPCCreator[]
  leaderboards: Leaderboard[]
  interactions: NPCInteraction[]
  memeTrends: PlatformMemeTrend[]
  activeProject?: WriterProject
}

const BOARD_LABELS: Record<BoardType, string> = {
  NEW_BOOK: '新书榜',
  MONTHLY_TICKET: '月票榜',
  RECOMMEND: '推荐榜',
  READING: '阅读榜',
}

const STYLE_LABELS: Record<NPCCreator['style'], string> = {
  SPEED_RUN: '触手怪',
  QUALITY_MONSTER: '质量怪',
  DRAMA_QUEEN: '键盘侠',
  SLACKER: '咸鱼',
  TURTLE: '太监王',
}

const STATUS_LABELS: Record<NPCCreator['status'], string> = {
  ACTIVE: '连载中',
  HIATUS: '停更',
  COMPLETED: '已完结',
  ABANDONED: '已太监',
}

const INTERACTION_LABELS: Record<NPCInteraction['type'], { label: string; chip: string }> = {
  CHAPTER_REC: { label: '章推', chip: 'bg-emerald-100 text-emerald-700' },
  ROAST: { label: '挂炉', chip: 'bg-rose-100 text-rose-700' },
  PRAISE: { label: '赞美', chip: 'bg-sky-100 text-sky-700' },
}

export default function PlatformEcosystemPanel({
  npcs,
  leaderboards,
  interactions,
  memeTrends,
  activeProject,
}: PlatformEcosystemPanelProps) {
  const [selectedPlatformId, setSelectedPlatformId] = useState(
    activeProject?.platformId ?? 'ZHONGDIAN',
  )

  const platformIds = useMemo(
    () => Object.keys(PLATFORMS) as (keyof typeof PLATFORMS)[],
    [],
  )

  const selectedPlatform = PLATFORMS[selectedPlatformId]
  const platformNpcs = npcs.filter((n) => n.platformId === selectedPlatformId)
  const platformLeaderboards = leaderboards.filter(
    (lb) => lb.platformId === selectedPlatformId,
  )
  const platformInteractions = interactions.filter(
    (i) => i.platformId === selectedPlatformId,
  )
  const platformTrends = memeTrends
    .filter((t) => t.platformId === selectedPlatformId)
    .sort((a, b) => b.heat - a.heat)

  return (
    <div className="card flex flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">网文江湖</h2>
          <p className="text-xs text-slate-500">{selectedPlatform.tagline}</p>
        </div>
        <div className="flex gap-1">
          {platformIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedPlatformId(id)}
              className={[
                'rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
                selectedPlatformId === id
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
              ].join(' ')}
            >
              {PLATFORMS[id].name}
            </button>
          ))}
        </div>
      </header>

      {/* 平台信息 */}
      <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <p className="mb-1 font-medium text-slate-700">{selectedPlatform.name}</p>
        <p className="mb-2 leading-relaxed">{selectedPlatform.description}</p>
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="rounded bg-white px-1.5 py-0.5 text-slate-500">
            签约难度 {selectedPlatform.baseContractDifficulty}
          </span>
          <span className="rounded bg-white px-1.5 py-0.5 text-slate-500">
            日活 {selectedPlatform.baseDailyReaders.toLocaleString()}
          </span>
          <span className="rounded bg-white px-1.5 py-0.5 text-slate-500">
            新书扶持 {(selectedPlatform.newBookBoost * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* NPC 主动互动 */}
      {platformInteractions.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold text-slate-700">江湖互动</div>
          <div className="flex flex-col gap-2">
            {platformInteractions.slice(-3).map((interaction) => {
              const style = INTERACTION_LABELS[interaction.type]
              return (
                <div
                  key={interaction.id}
                  className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-[11px] leading-relaxed text-slate-600"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`chip ${style.chip}`}>{style.label}</span>
                    <span className="text-slate-400">{interaction.npcName}</span>
                  </div>
                  {interaction.text.replace(/【[^】]+】/, '')}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 江湖梗趋势 */}
      {platformTrends.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold text-slate-700">江湖梗趋势</div>
          <div className="flex flex-col gap-1.5">
            {platformTrends.slice(0, 4).map((trend) => (
              <div
                key={trend.memeId}
                className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-[10px]"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-700">
                    {trend.memeName}
                  </div>
                  <div className="text-slate-400">源自《{trend.originBookTitle}》</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-medium text-slate-700">热度 {Math.round(trend.heat)}</div>
                  <div className="text-slate-400">引用 {trend.references} 次</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 排行榜 */}
      <div className="grid grid-cols-2 gap-3">
        {platformLeaderboards.map((lb) => (
          <div
            key={lb.boardType}
            className="rounded-lg border border-slate-100 p-2.5"
          >
            <div className="mb-1.5 text-xs font-medium text-slate-700">
              {BOARD_LABELS[lb.boardType]}
            </div>
            <ul className="space-y-1">
              {lb.entries.slice(0, 5).map((entry) => (
                <li
                  key={`${lb.boardType}-${entry.id}`}
                  className={[
                    'flex items-center justify-between text-[10px]',
                    entry.type === 'player'
                      ? 'font-medium text-brand-600'
                      : 'text-slate-500',
                  ].join(' ')}
                >
                  <span className="truncate">
                    {entry.rank}. {entry.title}
                  </span>
                  <span className="shrink-0 pl-2">{entry.author}</span>
                </li>
              ))}
              {lb.entries.length === 0 && (
                <li className="text-[10px] text-slate-400">暂无数据</li>
              )}
            </ul>
          </div>
        ))}
        {platformLeaderboards.length === 0 && (
          <div className="col-span-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-400">
            排行榜尚未生成，推进一天后可见。
          </div>
        )}
      </div>

      {/* NPC 同行 */}
      <div>
        <div className="mb-2 text-xs font-medium text-slate-700">同行作者</div>
        <div className="flex flex-col gap-2">
          {platformNpcs.slice(0, 6).map((npc) => (
            <div
              key={npc.id}
              className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-[10px]"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-slate-700">{npc.name}</span>
                <span className="text-slate-400">
                  《{npc.currentBookTitle}》 · {STATUS_LABELS[npc.status]}
                </span>
              </div>
              <div className="text-right">
                <span className="rounded bg-white px-1.5 py-0.5 text-slate-500">
                  {STYLE_LABELS[npc.style]}
                </span>
                <div className="mt-1 text-slate-400">
                  热度 {Math.round(npc.hype)} · {(npc.wordCount / 10000).toFixed(1)}万字
                </div>
              </div>
            </div>
          ))}
          {platformNpcs.length === 0 && (
            <div className="text-[10px] text-slate-400">该平台暂无活跃作者</div>
          )}
        </div>
      </div>
    </div>
  )
}
