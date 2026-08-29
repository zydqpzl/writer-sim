import { useMemo } from 'react'
import { BOOK_TAG_BY_ID } from '../data/bookTags'
import { GENRE_BY_ID } from '../data/genres'
import { GIMMICK_BY_ID } from '../data/gimmicks'
import { getTrendMatches } from '../data/marketTrends'
import { PLATFORMS } from '../data/platforms'
import { GROWTH_CURVE_BY_ID } from '../data/growthCurves'
import { NOVEL_STYLE_TRAIT_BY_ID } from '../data/novelStyleTraits'
import { DOMAIN_LABELS } from '../data/backgrounds'
import { computeAlgorithmMatchScore } from '../engine/platformEngine'
import type { AuthorProfile, MarketTrend, WriterProject } from '../types/career'
import type { LogEntry } from '../types/game'

interface WriterProjectPanelProps {
  project?: WriterProject
  logs: LogEntry[]
  marketTrend: MarketTrend
  authorProfile: AuthorProfile
}

const STAGE_LABELS: Record<WriterProject['stage'], string> = {
  CONCEPT: '投稿期',
  SIGNED: '已签约',
  LAUNCHED: '已上架',
  SERIALIZING: '长期连载',
  COMPLETED: '已完结',
  ABANDONED: '已太监',
}

const STAGE_CHIP: Record<WriterProject['stage'], string> = {
  CONCEPT: 'bg-slate-100 text-slate-600',
  SIGNED: 'bg-emerald-100 text-emerald-700',
  LAUNCHED: 'bg-brand-100 text-brand-700',
  SERIALIZING: 'bg-sky-100 text-sky-700',
  COMPLETED: 'bg-amber-100 text-amber-700',
  ABANDONED: 'bg-rose-100 text-rose-700',
}

export default function WriterProjectPanel({
  project,
  logs,
  marketTrend,
  authorProfile,
}: WriterProjectPanelProps) {
  const recentComments = useMemo(() => {
    return logs
      .filter((log) => log.text.startsWith('本章说：'))
      .slice(-5)
      .reverse()
  }, [logs])

  if (!project) {
    return (
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-slate-800">当前作品</h2>
        <p className="mt-2 text-xs text-slate-400">暂无进行中的写作项目。</p>
      </div>
    )
  }

  const platform = PLATFORMS[project.platformId]
  const matchScore = computeAlgorithmMatchScore(project, platform, marketTrend)
  const trendMatches = getTrendMatches(project, marketTrend)
  const trendMatchCount =
    trendMatches.genres.length + trendMatches.tags.length + trendMatches.gimmicks.length

  return (
    <div className="card flex flex-col gap-4 p-4">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">当前作品</h2>
          <p className="mt-0.5 text-base font-semibold text-slate-900">
            《{project.title}》
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {platform.name} · {(project.wordCount / 10000).toFixed(1)} 万字 ·{' '}
            {project.totalChapters} 章
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="chip bg-slate-100 text-slate-600">
              {GENRE_BY_ID[project.genre].name}
            </span>
            {project.tags.map((t) => (
              <span key={t} className="chip bg-violet-50 text-violet-700">
                {BOOK_TAG_BY_ID[t].name}
              </span>
            ))}
            <span className="chip bg-amber-50 text-amber-700">
              {GIMMICK_BY_ID[project.gimmick].name}
            </span>
            {trendMatchCount > 0 && (
              <span className="chip bg-sky-50 text-sky-700">
                蹭到 {trendMatchCount} 个风向
              </span>
            )}
            {project.blackHorseTriggered && (
              <span className="chip bg-fuchsia-50 text-fuchsia-700">黑马潜能</span>
            )}
          </div>
        </div>
        <span className={`chip ${STAGE_CHIP[project.stage]}`}>
          {STAGE_LABELS[project.stage]}
        </span>
      </header>

      {/* 作者档案：五维技能 + 履历背景 */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">
              {authorProfile.penName}
            </span>
            <span className="chip bg-violet-100 text-violet-700">
              {{
                NEWBIE: '萌新期',
                RISING_STAR: '上升期',
                MASTER: '成熟期',
                LEGEND: '传奇期',
              }[authorProfile.evolutionStage]}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">作者五维</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'prose', label: '文笔力', color: 'bg-emerald-500' },
            { key: 'pacing', label: '节奏感', color: 'bg-amber-500' },
            { key: 'structure', label: '结构力', color: 'bg-sky-500' },
            { key: 'marketInsight', label: '敏锐度', color: 'bg-rose-500' },
          ].map((attr) => {
            const value = authorProfile.skills[attr.key as keyof typeof authorProfile.skills] as number
            return (
              <div key={attr.key} className="flex items-center gap-2">
                <span className="w-12 text-[10px] text-slate-500">{attr.label}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span></span>
                    <span className="font-medium text-slate-700">{Math.round(value)}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white">
                    <div
                      className={`h-full rounded-full ${attr.color}`}
                      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {Object.keys(authorProfile.skills.domainKnowledge).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(authorProfile.skills.domainKnowledge).map(([domain, value]) => (
              <span
                key={domain}
                className="chip bg-slate-100 text-slate-600 text-[10px]"
                title={`${DOMAIN_LABELS[domain] ?? domain} 专精 ${Math.round(value)}`}
              >
                {DOMAIN_LABELS[domain] ?? domain} {Math.round(value)}
              </span>
            ))}
          </div>
        )}

        {authorProfile.backgrounds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {authorProfile.backgrounds.map((bg) => (
              <span
                key={bg.id}
                className="chip bg-amber-50 text-amber-700 text-[10px]"
                title={bg.description}
              >
                {bg.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 三维 */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '质量', value: project.quality, color: 'bg-emerald-500' },
          { label: '商业', value: project.commerciality, color: 'bg-amber-500' },
          { label: '梗值', value: project.memeValue, color: 'bg-rose-500' },
        ].map((attr) => (
          <div key={attr.label} className="rounded-lg bg-slate-50 p-2 text-center">
            <div className="text-[10px] text-slate-400">{attr.label}</div>
            <div className="text-sm font-semibold text-slate-700">
              {Math.round(attr.value)}
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white">
              <div
                className={`h-full rounded-full ${attr.color}`}
                style={{ width: `${Math.max(0, Math.min(100, attr.value))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-400">追读率</span>
          <span className="ml-2 font-medium text-slate-700">
            {(project.readerRetention * 100).toFixed(1)}%
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-400">读者情绪</span>
          <span
            className={`ml-2 font-medium ${
              project.readerMood > 0
                ? 'text-emerald-600'
                : project.readerMood < 0
                  ? 'text-rose-600'
                  : 'text-slate-700'
            }`}
          >
            {project.readerMood > 0 ? '+' : ''}
            {Math.round(project.readerMood)}
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-400">热度</span>
          <span className="ml-2 font-medium text-slate-700">
            {Math.round(project.metrics.currentHype)}
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-400">累计收益</span>
          <span className="ml-2 font-medium text-slate-700">
            {Math.round(project.stats.totalRevenue).toLocaleString('zh-CN')} 元
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-400">算法契合</span>
          <span
            className={`ml-2 font-medium ${
              matchScore >= 60
                ? 'text-emerald-600'
                : matchScore >= 40
                  ? 'text-amber-600'
                  : 'text-rose-600'
            }`}
          >
            {Math.round(matchScore)}%
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-400">生长曲线</span>
          <span className="ml-2 font-medium text-violet-700">
            {GROWTH_CURVE_BY_ID[project.growthCurve].name}
          </span>
        </div>
      </div>

      {/* 复杂度 vs 掌控力 */}
      <div className="rounded-xl bg-slate-50 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600">作品复杂度</span>
          <span className="font-semibold text-slate-800">
            {Math.round(project.complexity.score)}/100
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-rose-400"
            style={{ width: `${Math.min(100, project.complexity.score)}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600">作者掌控力</span>
          <span className="font-semibold text-slate-800">
            {Math.round(project.executionCapacity)}/100
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className={[
              'h-full rounded-full',
              project.executionCapacity >= project.complexity.score
                ? 'bg-emerald-500'
                : 'bg-amber-500',
            ].join(' ')}
            style={{ width: `${Math.min(100, project.executionCapacity)}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          {project.executionCapacity >= project.complexity.score
            ? '掌控力充足，设定能够完美落地。'
            : project.executionCapacity >= project.complexity.score * 0.85
              ? '基本能驾驭，但偶有瑕疵。'
              : project.executionCapacity >= project.complexity.score * 0.65
                ? '掌控力略显不足，读者可能会吐槽节奏。'
                : '严重驾驭不住，毒点风险极高！'}
        </p>
      </div>

      {/* 慢热书：伏笔蓄力条 */}
      {project.growthCurve === 'SLOW_BURN' && (
        <div className="rounded-xl bg-amber-50/70 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-amber-800">伏笔蓄力</span>
            <span className="font-semibold text-amber-900">
              {Math.round(project.wordOfMouth.current)}%
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-amber-200/60">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${Math.min(100, project.wordOfMouth.current)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-amber-700">
            {project.wordOfMouth.primed
              ? '口碑蓄力已满，大高潮随时可能引爆自来水！'
              : `距离口碑爆发还差 ${Math.round(100 - project.wordOfMouth.current)} 点蓄力。继续高质量铺垫。`}
          </p>
          {project.wordOfMouth.activeEvangelists > 0 && (
            <p className="mt-1 text-[11px] text-amber-600">
              已有 {project.wordOfMouth.activeEvangelists} 个自来水在暗流涌动地安利你的书……
            </p>
          )}
        </div>
      )}

      {/* 爆火状态 */}
      {project.isViralSurge && (
        <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
          <span className="font-semibold">🔥 爆火进行中</span>
          <span className="ml-2">剩余 {project.viralSurgeDays} 天。抓紧维稳，否则热度会快速滑落。</span>
        </div>
      )}

      {/* 履历化学反应 */}
      {project.backgroundBonuses.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold text-slate-700">履历化学反应</div>
          <div className="flex flex-col gap-1.5">
            {project.backgroundBonuses.map((b) => (
              <div
                key={`${b.backgroundId}-${b.synergyName}`}
                className="rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-amber-800">{b.synergyName}</span>
                  <span className="text-[10px] text-amber-600">来自 {b.backgroundName}</span>
                </div>
                <p className="mt-1 text-[11px] italic text-amber-700">“{b.comment}”</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 文风特质 */}
      {project.activeStyleTraits.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold text-slate-700">文风特质</div>
          <div className="flex flex-wrap gap-1.5">
            {project.activeStyleTraits.map((id) => {
              const trait = NOVEL_STYLE_TRAIT_BY_ID[id]
              return (
                <span
                  key={id}
                  className="chip bg-sky-50 text-sky-700"
                  title={trait.description}
                >
                  {trait.name}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* 本章说 */}
      <div>
        <div className="mb-2 text-xs font-semibold text-slate-700">最近本章说</div>
        <div className="flex flex-col gap-1.5">
          {recentComments.length > 0 ? (
            recentComments.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-xs leading-relaxed text-slate-600"
              >
                {log.text.replace('本章说：', '')}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">暂无读者评论，先更新一章吧。</p>
          )}
        </div>
      </div>
    </div>
  )
}
