import { useMemo, useState } from 'react'
import { BOOK_TAGS, BOOK_TAG_BY_ID, isTagCompatibleWithGenre } from '../data/bookTags'
import { GENRES, GENRE_BY_ID } from '../data/genres'
import { GIMMICKS, GIMMICK_BY_ID } from '../data/gimmicks'
import { getTrendMatches } from '../data/marketTrends'
import { PLATFORMS } from '../data/platforms'
import {
  NOVEL_STYLE_TRAITS,
  NOVEL_STYLE_TRAIT_BY_ID,
} from '../data/novelStyleTraits'
import {
  WRITER_ACTIONS,
  generateRandomDraft,
  generateTrendFollowingDraft,
  generateWriterTitle,
} from '../data/writer'
import {
  checkExecutionCapacity,
  computeBackgroundBonuses,
  computeExecutionCapacity,
  computeNovelComplexity,
  createAuthorProfile,
  determineGrowthCurve,
} from '../engine/careerEngine'
import { computeAlgorithmMatchScore } from '../engine/platformEngine'
import type {
  AuthorMeme,
  AuthorProfile,
  BackgroundBonus,
  BookCreationDraft,
  MainGenre,
  MarketTrend,
  WriterAction,
  WriterCareerProfile,
  WriterProject,
  WritingInspiration,
} from '../types/career'
import type { NovelPlatform, NovelPlatformId } from '../types/platform'

type SetupMode = 'custom' | 'random' | 'trend'

interface Props {
  isOpen: boolean
  onClose: () => void
  activeProject?: WriterProject
  platforms: NovelPlatform[]
  marketTrend: MarketTrend
  inspirations: WritingInspiration[]
  unlockedMemes: AuthorMeme[]
  energy: number
  stress: number
  maxEnergy: number
  maxStress: number
  actedThisSlot: boolean
  defaultPenName?: string
  writerCareerProfile: WriterCareerProfile
  authorProfile: AuthorProfile
  onStartProject: (platformId: NovelPlatformId, draft: BookCreationDraft) => void
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

function phaseAllowed(action: WriterAction, project: WriterProject): boolean {
  const required = Array.isArray(action.phaseRequired)
    ? action.phaseRequired
    : [action.phaseRequired]
  return required.includes(project.phase)
}

function computeDraftPreview(draft: BookCreationDraft): {
  quality: number
  commerciality: number
  memeValue: number
  risk: number
  isBlackHorseTarget: boolean
} {
  const genre = GENRE_BY_ID[draft.genre]
  const tags = draft.tags.map((id) => BOOK_TAG_BY_ID[id]).filter(Boolean)
  const gimmick = GIMMICK_BY_ID[draft.gimmick]

  const avgTagCommercialityMod =
    tags.reduce((s, t) => s + t.commercialityModifier, 0) / Math.max(1, tags.length)
  const avgTagMeme =
    tags.reduce((s, t) => s + t.memePotential, 0) / Math.max(1, tags.length)
  const avgTagRisk =
    tags.reduce((s, t) => s + t.riskFactor, 0) / Math.max(1, tags.length)
  const risk = (avgTagRisk + (gimmick?.riskFactor ?? 30)) / 2

  const quality = Math.round(
    42 + (genre.qualityWeight - 1) * 25 + ((gimmick?.qualityModifier ?? 1) - 1) * 20,
  )
  const commerciality = Math.round(
    genre.baseCommerciality *
      (avgTagCommercialityMod || 1) *
      (gimmick?.commercialityModifier ?? 1) *
      (1 - risk / 250),
  )
  const memeValue = Math.round(
    genre.baseMemePotential * 0.55 + avgTagMeme * 0.55 + (gimmick?.memePotential ?? 50) * 0.5,
  )

  return {
    quality: Math.max(0, Math.min(100, quality)),
    commerciality: Math.max(0, Math.min(100, commerciality)),
    memeValue: Math.max(0, Math.min(100, memeValue)),
    risk,
    isBlackHorseTarget: risk >= 50 && memeValue >= 60,
  }
}

/** 预览当前草稿会触发哪些履历化学反应 */
function computeDraftBackgroundBonuses(
  draft: BookCreationDraft,
  authorProfile: AuthorProfile,
): BackgroundBonus[] {
  const previewProfile =
    draft.penName !== authorProfile.penName
      ? { ...authorProfile, penName: draft.penName }
      : authorProfile
  return computeBackgroundBonuses(previewProfile, draft.genre)
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export default function WriterWorkModal({
  isOpen,
  onClose,
  activeProject,
  platforms,
  marketTrend,
  inspirations,
  unlockedMemes,
  energy,
  stress,
  maxEnergy,
  maxStress,
  actedThisSlot,
  defaultPenName = '咸鱼作者',
  writerCareerProfile,
  authorProfile,
  onStartProject,
  onApplyStrategy,
  onInjectInspiration,
  onHomageMeme,
  onCompleteProject,
  onAbandonProject,
}: Props) {
  const [selectedPlatformId, setSelectedPlatformId] = useState<NovelPlatformId>(platforms[0]?.id ?? 'ZHONGDIAN')
  const [setupMode, setSetupMode] = useState<SetupMode>('custom')
  const [draft, setDraft] = useState<BookCreationDraft>(() => ({
    penName: defaultPenName,
    title: '',
    genre: 'XUANHUAN',
    tags: ['system'],
    gimmick: 'everyone_overthinks',
    isBlackHorseTarget: false,
    styleTraits: [],
  }))

  const selectedPlatform = PLATFORMS[selectedPlatformId]
  const projectPlatform = activeProject ? PLATFORMS[activeProject.platformId] : selectedPlatform

  const preview = useMemo(() => computeDraftPreview(draft), [draft])
  const complexityPreview = useMemo(() => computeNovelComplexity(draft), [draft])
  const executionPreview = useMemo(
    () =>
      computeExecutionCapacity(draft, {
        writerCareerProfile,
        authorRank: 'COLT',
        stats: { stress: 130, health: 80 },
      } as unknown as import('../types/game').GameState),
    [draft, writerCareerProfile],
  )
  const executionCheckPreview = useMemo(
    () => checkExecutionCapacity(complexityPreview, executionPreview),
    [complexityPreview, executionPreview],
  )
  const growthCurvePreview = useMemo(
    () => determineGrowthCurve(draft, complexityPreview, draft.styleTraits),
    [draft, complexityPreview],
  )

  const backgroundBonuses = useMemo(
    () => computeDraftBackgroundBonuses(draft, authorProfile),
    [draft, authorProfile],
  )

  const boostedPreview = useMemo(() => {
    let { quality, commerciality, memeValue } = preview
    for (const b of backgroundBonuses) {
      quality = clamp(quality * (1 + b.qualityBonus), 0, 100)
      commerciality = clamp(commerciality * (1 + b.commercialityBonus), 0, 100)
      memeValue = clamp(memeValue + commerciality * b.commercialityBonus * 0.3, 0, 100)
    }
    return {
      ...preview,
      quality: Math.round(quality),
      commerciality: Math.round(commerciality),
      memeValue: Math.round(memeValue),
      isBlackHorseTarget: preview.risk >= 50 && memeValue >= 60,
    }
  }, [preview, backgroundBonuses])

  const trendMatches = useMemo(
    () => getTrendMatches(draft as unknown as WriterProject, marketTrend),
    [draft, marketTrend],
  )
  const trendMatchCount =
    trendMatches.genres.length + trendMatches.tags.length + trendMatches.gimmicks.length

  const matchScore = useMemo(() => {
    if (!activeProject) {
      // 用预览数据估算平台契合度
      const fakeProject = {
        ...boostedPreview,
        blackHorseTriggered: boostedPreview.isBlackHorseTarget,
        genre: draft.genre,
        tags: draft.tags,
        gimmick: draft.gimmick,
      } as unknown as WriterProject
      return computeAlgorithmMatchScore(fakeProject, selectedPlatform, marketTrend)
    }
    return computeAlgorithmMatchScore(activeProject, projectPlatform, marketTrend)
  }, [activeProject, draft, marketTrend, boostedPreview, selectedPlatform, projectPlatform])

  const activeTrendMatches = useMemo(
    () =>
      activeProject
        ? getTrendMatches(activeProject, marketTrend)
        : { genres: [], tags: [], gimmicks: [] },
    [activeProject, marketTrend],
  )
  const activeTrendMatchCount =
    activeTrendMatches.genres.length +
    activeTrendMatches.tags.length +
    activeTrendMatches.gimmicks.length

  const projectMatchScore = activeProject
    ? computeAlgorithmMatchScore(activeProject, projectPlatform, marketTrend)
    : matchScore

  if (!isOpen) return null

  const handleRandomize = () => setDraft((d) => ({ ...generateRandomDraft(), penName: d.penName }))
  const handleFollowTrend = () => setDraft((d) => ({ ...generateTrendFollowingDraft(marketTrend), penName: d.penName }))

  const handleStart = () => {
    const finalDraft = { ...draft, isBlackHorseTarget: boostedPreview.isBlackHorseTarget }
    if (!finalDraft.title.trim()) {
      finalDraft.title = generateWriterTitle(finalDraft)
    }
    onStartProject(selectedPlatformId, finalDraft)
  }

  const toggleTag = (tagId: string) => {
    setDraft((d) => {
      if (d.tags.includes(tagId)) {
        return { ...d, tags: d.tags.filter((t) => t !== tagId) }
      }
      if (d.tags.length >= 3) return d
      return { ...d, tags: [...d.tags, tagId] }
    })
  }

  const toggleStyleTrait = (traitId: string) => {
    setDraft((d) => {
      const current = d.styleTraits ?? []
      if (current.includes(traitId)) {
        return { ...d, styleTraits: current.filter((id) => id !== traitId) }
      }
      return { ...d, styleTraits: [...current, traitId] }
    })
  }

  const setGenre = (genre: MainGenre) => {
    setDraft((d) => ({
      ...d,
      genre,
      tags: d.tags.filter((t) => isTagCompatibleWithGenre(BOOK_TAG_BY_ID[t], genre)),
    }))
  }

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

      <div className="relative flex w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-brand-200 animate-fade-in max-h-[90vh]">
        {/* 头部 */}
        <header className="flex items-center gap-3 border-b border-slate-100 p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
            {activeProject ? '✍️' : '📚'}
          </span>
          <div className="min-w-0 flex-1">
            <span className="chip bg-brand-50 text-brand-600">
              {activeProject ? '写作工坊' : '新书立项'}
            </span>
            <h3 className="mt-1.5 truncate text-lg font-semibold text-slate-800">
              {activeProject ? `《${activeProject.title}》` : '选择平台，设计你的作品'}
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
            <div className="flex flex-col gap-5">
              {/* 平台选择 */}
              <section>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  选择发布平台
                </div>
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
                    </button>
                  ))}
                </div>
              </section>

              {/* 立项模式切换 */}
              <div className="flex gap-2">
                {[
                  { id: 'custom', label: '深度自定义' },
                  { id: 'random', label: '🎲 一键灵感' },
                  { id: 'trend', label: '🔥 一键跟风' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSetupMode(m.id as SetupMode)
                      if (m.id === 'random') handleRandomize()
                      if (m.id === 'trend') handleFollowTrend()
                    }}
                    className={[
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                      setupMode === m.id
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                    ].join(' ')}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* 自定义模式 */}
              {setupMode === 'custom' && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">笔名</label>
                      <input
                        type="text"
                        value={draft.penName}
                        onChange={(e) => setDraft((d) => ({ ...d, penName: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                        placeholder="你的笔名"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">书名</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={draft.title}
                          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                          placeholder="输入书名，留空则随机生成"
                        />
                        <button
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, title: generateWriterTitle(undefined) }))}
                          className="rounded-lg bg-slate-100 px-3 text-sm text-slate-600 hover:bg-slate-200"
                        >
                          🎲
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">主题材</label>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setGenre(g.id)}
                          className={[
                            'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                            draft.genre === g.id
                              ? 'bg-brand-100 text-brand-700'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                          ].join(' ')}
                        >
                          {g.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      融合标签（{draft.tags.length}/3）
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {BOOK_TAGS.map((tag) => {
                        const compatible = isTagCompatibleWithGenre(tag, draft.genre)
                        const selected = draft.tags.includes(tag.id)
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            disabled={!compatible && !selected}
                            onClick={() => toggleTag(tag.id)}
                            title={tag.description}
                            className={[
                              'rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors',
                              selected
                                ? 'bg-violet-100 text-violet-700'
                                : compatible
                                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  : 'cursor-not-allowed bg-slate-50 text-slate-300 line-through',
                            ].join(' ')}
                          >
                            {tag.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">核心噱头</label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {GIMMICKS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, gimmick: g.id }))}
                          className={[
                            'rounded-xl border p-2.5 text-left transition-all',
                            draft.gimmick === g.id
                              ? 'border-brand-300 bg-brand-50'
                              : 'border-slate-200 bg-white hover:border-brand-200',
                          ].join(' ')}
                        >
                          <div className="text-xs font-semibold text-slate-800">{g.name}</div>
                          <div className="text-[10px] text-slate-500">{g.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-700">文风倾向（可选）</label>
                      <span className="text-[10px] text-slate-400">
                        已解锁 {writerCareerProfile.unlockedStyleTraits.length} 个
                      </span>
                    </div>
                    {writerCareerProfile.unlockedStyleTraits.length === 0 ? (
                      <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
                        还没有解锁任何文风特质。在写作过程中会逐渐形成，解锁后可带入新书。
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {NOVEL_STYLE_TRAITS.filter((t) =>
                          writerCareerProfile.unlockedStyleTraits.includes(t.id),
                        ).map((trait) => (
                          <button
                            key={trait.id}
                            type="button"
                            onClick={() => toggleStyleTrait(trait.id)}
                            className={[
                              'rounded-xl border p-2.5 text-left transition-all',
                              (draft.styleTraits ?? []).includes(trait.id)
                                ? 'border-brand-300 bg-brand-50'
                                : 'border-slate-200 bg-white hover:border-brand-200',
                            ].join(' ')}
                          >
                            <div className="text-xs font-semibold text-slate-800">
                              {trait.name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {trait.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 随机 / 跟风模式 */}
              {(setupMode === 'random' || setupMode === 'trend') && (
                <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">
                      {setupMode === 'trend' ? `跟随风向：${marketTrend.name}` : '随机灵感'}
                    </span>
                    <button
                      type="button"
                      onClick={setupMode === 'trend' ? handleFollowTrend : handleRandomize}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                    >
                      🎲 换一组
                    </button>
                  </div>
                  <div className="text-sm text-slate-700">
                    <span className="font-medium">《{draft.title || generateWriterTitle(draft)}》</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded bg-white px-2 py-1">{GENRE_BY_ID[draft.genre].name}</span>
                    {draft.tags.map((t) => (
                      <span key={t} className="rounded bg-white px-2 py-1">
                        {BOOK_TAG_BY_ID[t].name}
                      </span>
                    ))}
                    <span className="rounded bg-white px-2 py-1">{GIMMICK_BY_ID[draft.gimmick].name}</span>
                  </div>
                  {setupMode === 'trend' && trendMatchCount === 0 && (
                    <div className="text-xs text-amber-600">当前方案与市场风向不完全匹配，已自动补充相关标签。</div>
                  )}
                </div>
              )}

              {/* 方案预览 */}
              <section className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  方案预览
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-white p-2">
                    <div className="text-xs text-slate-400">预估质量</div>
                    <div className="text-sm font-semibold text-slate-700">
                      {boostedPreview.quality}
                      {boostedPreview.quality !== preview.quality && (
                        <span className="ml-1 text-[10px] text-emerald-600">
                          +{boostedPreview.quality - preview.quality}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-2">
                    <div className="text-xs text-slate-400">预估商业</div>
                    <div className="text-sm font-semibold text-slate-700">
                      {boostedPreview.commerciality}
                      {boostedPreview.commerciality !== preview.commerciality && (
                        <span className="ml-1 text-[10px] text-emerald-600">
                          +{boostedPreview.commerciality - preview.commerciality}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-2">
                    <div className="text-xs text-slate-400">预估爆点</div>
                    <div className="text-sm font-semibold text-slate-700">
                      {boostedPreview.memeValue}
                      {boostedPreview.memeValue !== preview.memeValue && (
                        <span className="ml-1 text-[10px] text-emerald-600">
                          +{boostedPreview.memeValue - preview.memeValue}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 履历与题材化学反应 */}
                <div className="mt-3 rounded-lg bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">作者履历</span>
                    <span className="text-[10px] text-slate-400">
                      {authorProfile.backgrounds.length} 个身份标签
                    </span>
                  </div>
                  {authorProfile.backgrounds.length === 0 ? (
                    <p className="text-[11px] text-slate-400">当前暂无特殊履历标签。</p>
                  ) : (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {authorProfile.backgrounds.map((bg) => (
                        <span
                          key={bg.id}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
                          title={bg.description}
                        >
                          {bg.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-2">
                    <div className="mb-1.5 text-[11px] font-medium text-slate-700">
                      与「{GENRE_BY_ID[draft.genre].name}」题材的化学反应
                    </div>
                    {backgroundBonuses.length === 0 ? (
                      <p className="text-[11px] text-slate-400">
                        当前履历与所选题材暂无特殊化学反应，但基础属性仍会生效。
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {backgroundBonuses.map((b, idx) => (
                          <div
                            key={`${b.backgroundId}-${idx}`}
                            className="rounded-lg border border-amber-100 bg-amber-50/60 p-2.5"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-amber-800">
                                {b.synergyName}
                              </span>
                              <span className="text-[10px] text-amber-600/80">
                                · {b.backgroundName}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                              “{b.comment}”
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-2 text-[10px]">
                              {b.qualityBonus > 0 && (
                                <span className="text-emerald-600">
                                  质量 +{Math.round(b.qualityBonus * 100)}%
                                </span>
                              )}
                              {b.commercialityBonus > 0 && (
                                <span className="text-emerald-600">
                                  商业 +{Math.round(b.commercialityBonus * 100)}%
                                </span>
                              )}
                              {b.retentionBonus > 0 && (
                                <span className="text-emerald-600">
                                  追读 +{Math.round(b.retentionBonus * 100)}%
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 复杂度 / 掌控力 / 生长曲线 */}
                <div className="mt-3 rounded-lg bg-white p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">作品复杂度</span>
                    <span className="font-medium text-slate-700">
                      {Math.round(complexityPreview.score)}/100
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-rose-400"
                      style={{ width: `${Math.min(100, complexityPreview.score)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500">作者掌控力</span>
                    <span
                      className={`font-medium ${
                        executionPreview >= complexityPreview.score
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {Math.round(executionPreview)}/100
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={[
                        'h-full rounded-full',
                        executionPreview >= complexityPreview.score
                          ? 'bg-emerald-500'
                          : 'bg-amber-500',
                      ].join(' ')}
                      style={{ width: `${Math.min(100, executionPreview)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500">生长曲线</span>
                    <span className="font-medium text-violet-700">
                      {growthCurvePreview}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    {executionCheckPreview.tier === 'PERFECT'
                      ? '掌控力溢出：这个题材你能完美驾驭，质量有额外加成。'
                      : executionCheckPreview.tier === 'SOLID'
                        ? '掌控力足够：正常发挥，设定能够落地。'
                        : executionCheckPreview.tier === 'SHAKY'
                          ? '掌控力不足：读者可能会感到节奏崩坏，质量下降。'
                          : '严重驾驭不住：硬写高难度题材，毒点风险极高！'}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={[
                      'chip',
                      preview.risk < 40
                        ? 'bg-emerald-50 text-emerald-600'
                        : preview.risk < 70
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-rose-50 text-rose-600',
                    ].join(' ')}
                  >
                    风险指数 {Math.round(preview.risk)}
                  </span>
                  {boostedPreview.isBlackHorseTarget && (
                    <span className="chip bg-violet-50 text-violet-700">黑马潜能</span>
                  )}
                  {trendMatchCount > 0 && (
                    <span className="chip bg-sky-50 text-sky-700">蹭到 {trendMatchCount} 个风向</span>
                  )}
                  <span
                    className={[
                      'chip',
                      matchScore >= 60 ? 'bg-emerald-50 text-emerald-600' : matchScore >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600',
                    ].join(' ')}
                  >
                    {selectedPlatform.name} 契合 {Math.round(matchScore)}%
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  {preview.risk < 40
                    ? '稳健配方：商业化下限高，但很难一书封神。'
                    : boostedPreview.isBlackHorseTarget
                      ? '邪门脑洞：基础商业化低，一旦质量/爆点拉满就可能触发黑马爆款！'
                      : '平衡搭配：有一定风险，也有机会出圈。'}
                </p>
              </section>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* 作品概览 */}
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">{projectPlatform.name}</span>
                  <span className={`chip ${STAGE_CHIP[activeProject.stage]}`}>
                    {STAGE_LABELS[activeProject.stage]}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-slate-500">
                  <span>{GENRE_BY_ID[activeProject.genre].name}</span>
                  {activeProject.tags.map((t) => (
                    <span key={t}>· {BOOK_TAG_BY_ID[t].name}</span>
                  ))}
                  <span>· {GIMMICK_BY_ID[activeProject.gimmick].name}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-slate-500">
                  <span>{(activeProject.wordCount / 10000).toFixed(1)} 万字</span>
                  <span>·</span>
                  <span>{activeProject.totalChapters} 章</span>
                  <span>·</span>
                  <span>追读 {(activeProject.readerRetention * 100).toFixed(1)}%</span>
                  <span>·</span>
                  <span
                    className={
                      projectMatchScore >= 60
                        ? 'text-emerald-600'
                        : projectMatchScore >= 40
                          ? 'text-amber-600'
                          : 'text-rose-600'
                    }
                  >
                    算法契合 {Math.round(projectMatchScore)}%
                  </span>
                  {activeTrendMatchCount > 0 && (
                    <span className="chip bg-sky-50 text-sky-700">
                      蹭到 {activeTrendMatchCount} 个风向
                    </span>
                  )}
                  {activeProject.blackHorseTriggered && (
                    <span className="chip bg-violet-50 text-violet-700">黑马潜能</span>
                  )}
                </div>
              </div>

              {/* 作品操作 */}
              <section>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  作品操作
                </div>
                <div className="flex flex-wrap gap-2">
                  {(activeProject.stage === 'LAUNCHED' || activeProject.stage === 'SERIALIZING') && (
                    <button
                      type="button"
                      onClick={onCompleteProject}
                      className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                    >
                      完结本书
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onAbandonProject}
                    className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-200"
                  >
                    太监切书
                  </button>
                </div>
              </section>

              {/* 写作策略 */}
              <section>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  写作策略
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {WRITER_ACTIONS.filter(
                    (a) => a.strategy !== 'META' && phaseAllowed(a, activeProject),
                  ).map((action) => {
                    const energyAfter = energy + action.cost.energy
                    const stressAfter = stress + action.cost.stress
                    const disabled = actedThisSlot || energyAfter < 0 || stressAfter > maxStress
                    return (
                      <button
                        key={action.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => onApplyStrategy(action.id)}
                        className={[
                          'rounded-xl border p-3 text-left transition-all',
                          disabled
                            ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                            : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/30',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-800">
                            {action.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            精力{action.cost.energy > 0 ? '+' : ''}
                            {action.cost.energy} 压力
                            {action.cost.stress > 0 ? '+' : ''}
                            {action.cost.stress}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">{action.description}</p>
                      </button>
                    )
                  })}
                </div>
                {!actedThisSlot && energy < 15 && (
                  <p className="mt-2 text-[11px] text-amber-600">
                    精力较低，部分策略可能无法执行。
                  </p>
                )}
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
              onClick={handleStart}
              className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              在 {selectedPlatform.name} 开书
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
