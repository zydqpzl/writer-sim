import type { InspirationCard } from '../types/event'
import type { WriterCareerProfile, WriterProject } from '../types/career'
import type { PathSnapshot, PlayerStats } from '../types/game'
import type { NovelPlatformId } from '../types/platform'
import { PLATFORMS } from '../data/platforms'

interface Props {
  stats: PlayerStats
  activeProject?: WriterProject
  writerCareerProfile: WriterCareerProfile
  pathSnapshot: PathSnapshot
  inventory: InspirationCard[]
  maxEnergy: number
  maxStress: number
  onOpenWriterWork: () => void
}

interface StatItem {
  key: keyof PlayerStats
  label: string
  icon: string
  color: string
  track: string
  max?: number
  unit?: string
  stage?: (v: number, max?: number) => string
}

const CORE_STATS: StatItem[] = [
  {
    key: 'health',
    label: '健康',
    icon: '❤️',
    color: 'text-rose-600',
    track: 'bg-rose-500',
    stage: (v) => (v >= 80 ? '健步如飞' : v >= 50 ? '亚健康' : v >= 20 ? '虚弱' : '危急'),
  },
  {
    key: 'energy',
    label: '精力',
    icon: '⚡',
    color: 'text-amber-600',
    track: 'bg-amber-400',
    max: 100,
    stage: (v, max) => `${v}/${max}`,
  },
  {
    key: 'stress',
    label: '压力',
    icon: '🧠',
    color: 'text-fuchsia-600',
    track: 'bg-fuchsia-400',
    max: 300,
    stage: (v, max) => {
      if (max && v >= max) return '崩溃'
      if (v >= 200) return '倦怠'
      if (v >= 100) return '焦虑'
      return '正常'
    },
  },
  {
    key: 'familyApproval',
    label: '父母满意度',
    icon: '🏠',
    color: 'text-sky-600',
    track: 'bg-sky-400',
    stage: (v) => `${v}%`,
  },
  {
    key: 'influence',
    label: '职业影响力',
    icon: '📈',
    color: 'text-brand-600',
    track: 'bg-brand-500',
    stage: (v) => `${v}%`,
  },
]

const QUALITY_STYLE: Record<InspirationCard['quality'], { chip: string; dot: string }> = {
  普通: { chip: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  稀有: { chip: 'bg-sky-100 text-sky-600', dot: 'bg-sky-500' },
  史诗: { chip: 'bg-amber-100 text-amber-600', dot: 'bg-amber-500' },
  传说: { chip: 'bg-rose-100 text-rose-600', dot: 'bg-rose-500' },
}

function clamp(n: number, max = 100) {
  return Math.max(0, Math.min(max, n))
}

function formatValue(key: keyof PlayerStats, value: number, max?: number) {
  if (key === 'savings') return `${value.toLocaleString('zh-CN')} 元`
  if (key === 'fans') return `${value.toLocaleString('zh-CN')} 人`
  if (max) return `${Math.round(value)} / ${max}`
  return `${Math.round(value)}%`
}

function riskLevel(project: WriterProject): { label: string; tone: string } {
  const ratio = project.executionCapacity / Math.max(1, project.complexity.score)
  if (project.readerMood < -30) return { label: '🔥 读者暴动', tone: 'text-rose-600' }
  if (ratio < 0.65) return { label: '⚠️ 崩盘高风险', tone: 'text-rose-600' }
  if (ratio < 0.85) return { label: '🔶 略有失控', tone: 'text-amber-600' }
  return { label: '✅ 掌控良好', tone: 'text-emerald-600' }
}

const PATH_LABEL: Record<string, string> = {
  BIG_CITY_CREATOR: '一线数字游民',
  HOMETOWN_KOL: '县城下沉',
  SUBCULTURE_GURU: '亚文化硬核',
  REALITY_COMPROMISE: '现实妥协',
  BALANCED: '仍在摸索',
}

export default function AuthorArchivePanel({
  stats,
  activeProject,
  writerCareerProfile,
  pathSnapshot,
  inventory,
  maxEnergy,
  maxStress,
  onOpenWriterWork,
}: Props) {
  const energyMax = maxEnergy
  const stressMax = maxStress

  // 按卡牌名聚合计数
  const grouped = inventory.reduce<
    Record<string, { card: InspirationCard; count: number }>
  >((acc, card) => {
    if (!acc[card.id]) acc[card.id] = { card, count: 0 }
    acc[card.id].count += 1
    return acc
  }, {})
  const cardList = Object.values(grouped)

  // 生涯累计
  const totalRevenue = Object.values(writerCareerProfile.platformCareer).reduce(
    (sum, p) => sum + p.totalRevenue,
    0,
  )
  const totalFans = Object.values(writerCareerProfile.platformCareer).reduce(
    (sum, p) => sum + p.totalFans,
    0,
  )

  return (
    <div className="flex flex-col gap-3">
      {/* 作者核心状态：图标 + 数值 + 阶段 */}
      <section className="card p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          作者核心状态
        </h2>
        <div className="space-y-2">
          {CORE_STATS.map((stat) => {
            const value = stats[stat.key]
            const max = stat.key === 'energy' ? energyMax : stat.key === 'stress' ? stressMax : stat.max
            const fill = clamp((value / (max ?? 100)) * 100)
            const stage = stat.stage?.(value, max)
            return (
              <div key={stat.key} className="flex items-center gap-2.5">
                <span className="text-base" title={stat.label}>
                  {stat.icon}
                </span>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500">{stat.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold ${stat.color}`}>
                        {formatValue(stat.key, value, max)}
                      </span>
                      {stage && (
                        <span className="text-[10px] text-slate-400">· {stage}</span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${stat.track}`}
                      style={{ width: `${fill}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 当前作品档案 */}
      <section className="card p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            当前作品档案
          </h2>
          {activeProject && (
            <span className="chip bg-slate-100 text-slate-600 text-[10px]">
              {PLATFORMS[activeProject.platformId]?.name ?? activeProject.platformId}
            </span>
          )}
        </div>

        {!activeProject ? (
          <button
            type="button"
            onClick={onOpenWriterWork}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/50 px-4 py-5 transition-colors hover:border-brand-400 hover:bg-brand-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xl text-brand-600">
              +
            </span>
            <div className="text-center">
              <div className="text-sm font-semibold text-brand-700">开启全新商业连载</div>
              <div className="mt-0.5 text-[11px] text-brand-600/80">
                选择平台、题材与文风，开始你的网文之路
              </div>
            </div>
          </button>
        ) : (
          <div className="space-y-2.5">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                《{activeProject.title}》
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                <span>{(activeProject.wordCount / 10000).toFixed(1)} 万字</span>
                <span>·</span>
                <span>{activeProject.totalChapters} 章</span>
                <span>·</span>
                <span>追读 {(activeProject.readerRetention * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                <span className="text-slate-400">粉丝</span>
                <span className="ml-1.5 font-semibold text-violet-600">
                  {stats.fans.toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                <span className="text-slate-400">累计收益</span>
                <span className="ml-1.5 font-semibold text-emerald-600">
                  {Math.round(activeProject.stats.totalRevenue).toLocaleString('zh-CN')} 元
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs">
              <span className="text-slate-500">作品风险度</span>
              <span className={`font-semibold ${riskLevel(activeProject).tone}`}>
                {riskLevel(activeProject).label}
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenWriterWork}
              className="w-full rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-600"
            >
              ✍️ 写作 / 更新 / 完本
            </button>
          </div>
        )}
      </section>

      {/* 人生路线倾向 */}
      <section className="card p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          人生路线倾向
        </h2>
        <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs">
          <span className="text-slate-500">当前主导</span>
          <span className="font-semibold text-brand-600">
            {PATH_LABEL[pathSnapshot.dominant] ?? pathSnapshot.dominant}
          </span>
        </div>
        <div className="space-y-1.5">
          {Object.entries(pathSnapshot.scores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([key, score]) => {
              const fill = clamp(score, 100)
              return (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className="w-20 truncate text-slate-500">
                    {PATH_LABEL[key] ?? key}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-400"
                      style={{ width: `${fill}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-slate-400">{score}</span>
                </div>
              )
            })}
        </div>
      </section>

      {/* 生涯数据 */}
      <section className="card p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          生涯数据
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-center">
            <div className="text-[10px] text-slate-400">完本</div>
            <div className="text-sm font-semibold text-emerald-600">
              {writerCareerProfile.totalCompletedBooks}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-center">
            <div className="text-[10px] text-slate-400">太监</div>
            <div className="text-sm font-semibold text-rose-500">
              {writerCareerProfile.totalAbandonedBooks}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-center">
            <div className="text-[10px] text-slate-400">累计收入</div>
            <div className="text-sm font-semibold text-emerald-600">
              {Math.round(totalRevenue).toLocaleString('zh-CN')}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-center">
            <div className="text-[10px] text-slate-400">累计粉丝</div>
            <div className="text-sm font-semibold text-violet-600">
              {totalFans.toLocaleString('zh-CN')}
            </div>
          </div>
        </div>

        {/* 平台履历 */}
        {Object.entries(writerCareerProfile.platformCareer).some(
          ([, p]) => p.totalRevenue > 0 || p.totalFans > 0,
        ) && (
          <div className="mt-2 space-y-1.5">
            {Object.entries(writerCareerProfile.platformCareer)
              .filter(([, p]) => p.totalRevenue > 0 || p.totalFans > 0)
              .map(([platformId, p]) => (
                <div
                  key={platformId}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs"
                >
                  <span className="text-slate-500">
                    {PLATFORMS[platformId as NovelPlatformId]?.name ?? platformId}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600">
                      {Math.round(p.totalRevenue).toLocaleString('zh-CN')} 元
                    </span>
                    <span className="text-violet-600">
                      {p.totalFans.toLocaleString('zh-CN')} 粉
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* 灵感卡牌背包 */}
      {cardList.length > 0 && (
        <section className="card p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              灵感卡牌
            </h2>
            <span className="chip bg-slate-100 text-slate-500 text-[10px]">
              共 {inventory.length} 张
            </span>
          </div>
          <ul className="max-h-40 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
            {cardList.map(({ card, count }) => {
              const q = QUALITY_STYLE[card.quality]
              return (
                <li
                  key={card.id}
                  className="rounded-lg border border-slate-100 bg-white px-2.5 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${q.dot}`} />
                      <span className="truncate text-xs font-medium text-slate-800">
                        {card.name}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className={`chip ${q.chip} text-[10px]`}>{card.quality}</span>
                      {count > 1 && (
                        <span className="chip bg-slate-100 text-slate-500 text-[10px]">
                          ×{count}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
