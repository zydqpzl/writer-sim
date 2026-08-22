import { useMemo, useState } from 'react'
import { PLATFORMS } from '../data/platforms'
import { WRITER_ACTIONS, WRITER_STRATEGIES } from '../data/writer'
import { computeAlgorithmMatchScore } from '../engine/platformEngine'
import type { AuthorMeme, WriterProject, WritingInspiration } from '../types/career'
import type { NovelPlatform, NovelPlatformId } from '../types/platform'

interface Props {
  isOpen: boolean
  onClose: () => void
  activeProject?: WriterProject
  platforms: NovelPlatform[]
  inspirations: WritingInspiration[]
  unlockedMemes: AuthorMeme[]
  energy: number
  stress: number
  maxEnergy: number
  maxStress: number
  actedThisSlot: boolean
  onStartProject: (platformId: NovelPlatformId) => void
  onApplyStrategy: (actionId: string) => void
  onInjectInspiration: (inspirationId: string) => void
  onHomageMeme: (memeId: string) => void
  onCompleteProject: () => void
  onAbandonProject: () => void
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

const BUSINESS_LABELS: Record<NovelPlatform['businessModel'], string> = {
  SUBSCRIPTION: '订阅制',
  FREE_AD: '免费广告',
  SPONSORSHIP: '打赏制',
  IP_DRIVEN: 'IP 向',
}

function phaseAllowed(action: (typeof WRITER_ACTIONS)[number], project: WriterProject): boolean {
  const required = Array.isArray(action.phaseRequired)
    ? action.phaseRequired
    : [action.phaseRequired]
  return required.includes(project.phase)
}

export default function WriterWorkModal({
  isOpen,
  onClose,
  activeProject,
  platforms,
  inspirations,
  unlockedMemes,
  energy,
  stress,
  maxEnergy,
  maxStress,
  actedThisSlot,
  onStartProject,
  onApplyStrategy,
  onInjectInspiration,
  onHomageMeme,
  onCompleteProject,
  onAbandonProject,
}: Props) {
  const [selectedPlatformId, setSelectedPlatformId] = useState<NovelPlatformId>(platforms[0]?.id ?? 'ZHONGDIAN')

  const matchScore = useMemo(() => {
    if (!activeProject) return 0
    return computeAlgorithmMatchScore(activeProject, PLATFORMS[activeProject.platformId])
  }, [activeProject])

  if (!isOpen) return null

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

      <div className="relative flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-brand-200 animate-fade-in max-h-[85vh]">
        {/* 头部 */}
        <header className="flex items-center gap-3 border-b border-slate-100 p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
            {activeProject ? '✍️' : '📚'}
          </span>
          <div className="min-w-0 flex-1">
            <span className="chip bg-brand-50 text-brand-600">
              {activeProject ? '写作工坊' : '开一本新书'}
            </span>
            <h3 className="mt-1.5 truncate text-lg font-semibold text-slate-800">
              {activeProject ? `《${activeProject.title}》` : '选择平台，开始连载'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </header>

        {actedThisSlot && (
          <div className="mx-5 mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            本时段已行动，无法继续写作。点击右上角关闭，或推进到下一时段。
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {!activeProject ? (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-slate-500">
                不同平台算法偏好、变现模式和签约难度不同，会影响后续曝光与收益。
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => setSelectedPlatformId(platform.id)}
                    className={[
                      'relative rounded-xl border p-3 text-left transition-all',
                      selectedPlatformId === platform.id
                        ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-300'
                        : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/30',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">{platform.name}</span>
                      <span className="chip bg-slate-100 text-slate-500 text-[10px]">
                        {BUSINESS_LABELS[platform.businessModel]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{platform.tagline}</p>
                    <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-slate-400">
                      <span>重质量 {Math.round(platform.algorithmFocus.quality * 100)}%</span>
                      <span>·</span>
                      <span>重商业 {Math.round(platform.algorithmFocus.commerciality * 100)}%</span>
                      <span>·</span>
                      <span>重梗值 {Math.round(platform.algorithmFocus.memeValue * 100)}%</span>
                    </div>
                    <div className="mt-2 flex gap-2 text-[10px]">
                      <span className="rounded bg-white px-1.5 py-0.5 text-slate-500">
                        签约难度 {platform.baseContractDifficulty}
                      </span>
                      <span className="rounded bg-white px-1.5 py-0.5 text-slate-500">
                        新书扶持 {(platform.newBookBoost * 100).toFixed(0)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* 作品概览 */}
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">{PLATFORMS[activeProject.platformId].name}</span>
                  <span className={`chip ${STAGE_CHIP[activeProject.stage]}`}>
                    {STAGE_LABELS[activeProject.stage]}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-slate-500">
                  <span>{(activeProject.wordCount / 10000).toFixed(1)} 万字</span>
                  <span>·</span>
                  <span>{activeProject.totalChapters} 章</span>
                  <span>·</span>
                  <span>追读 {(activeProject.readerRetention * 100).toFixed(1)}%</span>
                  <span>·</span>
                  <span className={matchScore >= 60 ? 'text-emerald-600' : matchScore >= 40 ? 'text-amber-600' : 'text-rose-600'}>
                    算法契合 {Math.round(matchScore)}%
                  </span>
                </div>
              </div>

              {/* 写作策略 */}
              <section>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  写作策略
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {WRITER_ACTIONS.filter((a) => a.strategy !== 'META').map((action) => {
                    const allowed = phaseAllowed(action, activeProject)
                    const energyOk = energy + action.cost.energy >= 0
                    const disabled = actedThisSlot || !allowed || !energyOk
                    const strategy = WRITER_STRATEGIES.find((s) => s.id === action.strategy)
                    return (
                      <button
                        key={action.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          onApplyStrategy(action.id)
                          onClose()
                        }}
                        title={!allowed ? '当前阶段不可用' : !energyOk ? '精力不足' : undefined}
                        className={[
                          'rounded-xl border p-3 text-left transition-all',
                          disabled
                            ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                            : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/30',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-800">{action.name}</span>
                          <span className="text-[10px] text-slate-400">+{action.wordCountAdd.toLocaleString()} 字</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{strategy?.desc ?? action.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="chip bg-rose-50 text-rose-500 text-[10px]">精力 {action.cost.energy}</span>
                          <span className="chip bg-rose-50 text-rose-500 text-[10px]">压力 {action.cost.stress > 0 ? '+' : ''}{action.cost.stress}</span>
                          {action.effects.qualityAdd ? (
                            <span className={`chip text-[10px] ${action.effects.qualityAdd > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                              质量 {action.effects.qualityAdd > 0 ? '+' : ''}{action.effects.qualityAdd}
                            </span>
                          ) : null}
                          {action.effects.commercialityAdd ? (
                            <span className={`chip text-[10px] ${action.effects.commercialityAdd > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                              商业 {action.effects.commercialityAdd > 0 ? '+' : ''}{action.effects.commercialityAdd}
                            </span>
                          ) : null}
                          {action.effects.memeValueAdd ? (
                            <span className={`chip text-[10px] ${action.effects.memeValueAdd > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                              梗值 {action.effects.memeValueAdd > 0 ? '+' : ''}{action.effects.memeValueAdd}
                            </span>
                          ) : null}
                          {action.effects.hypeBoost ? (
                            <span className="chip bg-amber-50 text-amber-600 text-[10px]">热度 +{action.effects.hypeBoost}</span>
                          ) : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* 灵感注入 */}
              {inspirations.length > 0 && (
                <section>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    灵感注入（{inspirations.length}）
                  </div>
                  <div className="flex flex-col gap-2">
                    {inspirations.map((insp) => (
                      <div
                        key={insp.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-800">{insp.name}</div>
                          <div className="text-xs text-slate-500">{insp.description}</div>
                          <div className="mt-1 flex gap-2 text-[10px] text-slate-400">
                            {insp.statBonus.quality ? <span>质量 +{insp.statBonus.quality}</span> : null}
                            {insp.statBonus.commerciality ? <span>商业 +{insp.statBonus.commerciality}</span> : null}
                            {insp.statBonus.memeValue ? <span>梗值 +{insp.statBonus.memeValue}</span> : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={actedThisSlot}
                          onClick={() => {
                            onInjectInspiration(insp.id)
                            onClose()
                          }}
                          className="shrink-0 rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          注入
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 前作梗致敬 */}
              {unlockedMemes.length > 0 && (
                <section>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    致敬前作梗（{unlockedMemes.length}）
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {unlockedMemes.map((meme) => (
                      <button
                        key={meme.id}
                        type="button"
                        disabled={actedThisSlot}
                        onClick={() => {
                          onHomageMeme(meme.id)
                          onClose()
                        }}
                        className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {meme.name}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* 作品管理 */}
              <section className="rounded-xl border border-slate-100 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  作品管理
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actedThisSlot || activeProject.stage !== 'LAUNCHED'}
                    onClick={() => {
                      onCompleteProject()
                      onClose()
                    }}
                    className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    完结本书
                  </button>
                  <button
                    type="button"
                    disabled={actedThisSlot}
                    onClick={() => {
                      onAbandonProject()
                      onClose()
                    }}
                    className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    太监切书
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between border-t border-slate-100 p-5">
          <div className="text-xs text-slate-400">
            精力 {energy} / {maxEnergy} · 压力 {stress} / {maxStress}
          </div>
          {!activeProject ? (
            <button
              type="button"
              disabled={actedThisSlot}
              onClick={() => {
                onStartProject(selectedPlatformId)
                onClose()
              }}
              className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              在 {PLATFORMS[selectedPlatformId].name} 开书
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-100 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
            >
              关闭
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
