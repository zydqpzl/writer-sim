import { useCallback, useMemo, useState } from 'react'
import type {
  ActionDef,
  ActionType,
  Ending,
  EventPopupOption,
  GameEvent,
  GameEventType,
  GameState,
  HealthStatus,
  LogEntry,
  LogKind,
  PlayerStats,
  StatusTrait,
  StressLevel,
  TimeSlot,
} from '../types/game'
import type { WriterProject } from '../types/career'
import { isWriterProject } from '../types/career'
import type { EventChain, EventOption, EventStep } from '../types/event'
import {
  CARD_POOL,
  EVENT_CHAINS,
} from '../data/eventChains'
import { ENDINGS } from '../data/endings'
import {
  bumpPathScore,
  checkGameEnding,
  getPathSnapshot,
  updatePathScores,
} from '../data/pathChecker'
import { cloneTrait } from '../data/traits'
import {
  ACTIONS,
  CITY_RENT,
  CREATION_VIRAL_RATE,
  ENCOUNTER_CHAIN_IDS,
  ENCOUNTER_SPAWN_RATE,
  HEALTH_THRESHOLDS,
  HOMETOWN_DAILY_STRESS,
  HOMETOWN_RENT,
  NEXT_SLOT,
  REALITY_PUNCH_THRESHOLD,
  STRESS_MAX,
  STRESS_THRESHOLDS,
  TOTAL_DAYS,
  VIRAL_BONUS_SAVINGS,
  getEmergencyAction,
} from '../data/gameData'
import {
  STARTING_IDENTITIES,
  buildInitialState,
  loadLegacyProfile,
  resolveKeptCards,
  saveLegacyProfile,
  settleLegacy,
} from '../data/legacy'
import type { LegacyProfile, StartingIdentity } from '../data/legacy'
import { WRITER_ACTION_BY_ID } from '../data/writer'
import { INSPIRATION_BY_ID } from '../data/inspirations'
import {
  STARTING_IDENTITY_BACKGROUNDS,
} from '../data/backgrounds'
import { PLATFORMS } from '../data/platforms'
import { generateMarketTrend, tickMarketTrend } from '../data/marketTrends'
import { simulatePlatformDaily } from '../engine/platformEngine'
import {
  abandonWriterProject,
  applyInspirationToWriterProject,
  applyMemeHomage,
  applyWriterAction,
  checkAuthorEvolution,
  completeWriterProject,
  computeAuthorRank,
  createAuthorProfile,
  createEmptyWriterCareerProfile,
  createWriterProject,
  dailyTickWriter,
  generateMemeFromProject,
  updateWriterCareerProfile,
} from '../engine/careerEngine'

const SLOT_LABEL: Record<TimeSlot, string> = {
  morning: '上午',
  afternoon: '下午',
  evening: '晚上',
}

let logIdSeed = 1
let eventIdSeed = 1

/** 精力上限基础值 */
const BASE_ENERGY_MAX = 100

function clamp(n: number) {
  return Math.max(0, Math.min(100, n))
}

function clampTo(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/** 压力值钳制（0-maxStress，默认 STRESS_MAX=300） */
function clampStress(n: number, maxStress: number = STRESS_MAX) {
  return Math.max(0, Math.min(maxStress, n))
}

/* ============== 特质派生量：精力上限 / 压力上限 ============== */

/** 派生当前精力上限 = 100 + Σ energyMaxDelta */
export function computeMaxEnergy(state: GameState): number {
  return (
    BASE_ENERGY_MAX +
    state.activeTraits.reduce(
      (sum, t) => sum + (t.effects.energyMaxDelta ?? 0),
      0,
    )
  )
}

/** 派生当前压力上限 = STRESS_MAX + Σ stressMaxDelta */
export function computeMaxStress(state: GameState): number {
  return (
    STRESS_MAX +
    state.activeTraits.reduce(
      (sum, t) => sum + (t.effects.stressMaxDelta ?? 0),
      0,
    )
  )
}

/**
 * 授予状态特质：同 id 已存在则刷新持续天数，否则追加。
 * 返回新的 activeTraits 数组（不修改入参）。
 */
export function grantTrait(
  activeTraits: StatusTrait[],
  traitId: string,
): { traits: StatusTrait[]; trait: StatusTrait | null } {
  const tpl = cloneTrait(traitId)
  if (!tpl) return { traits: activeTraits, trait: null }
  // 同 id 刷新：替换为新的拷贝（durationDays 重置为模板默认值）
  const filtered = activeTraits.filter((t) => t.id !== traitId)
  return {
    traits: [...filtered, tpl],
    trait: tpl,
  }
}

/**
 * 每日结算特质效果：应用 healthDeltaPerDay / stressDeltaPerDay，
 * 然后 durationDays - 1，移除已过期的特质。
 *
 * 注意：daily effect 是"昨日留存特质的累积作用"，应在推进至新一天时执行。
 * 返回新的 stats 与 activeTraits（以及被移除的特质列表，用于日志）。
 */
function applyTraitDailyEffects(
  state: GameState,
  maxStress: number,
): {
  stats: PlayerStats
  traits: StatusTrait[]
  expired: StatusTrait[]
  dailyHealthDelta: number
  dailyStressDelta: number
} {
  const stats = { ...state.stats }
  let healthDelta = 0
  let stressDelta = 0
  const surviving: StatusTrait[] = []
  const expired: StatusTrait[] = []

  for (const trait of state.activeTraits) {
    healthDelta += trait.effects.healthDeltaPerDay ?? 0
    stressDelta += trait.effects.stressDeltaPerDay ?? 0
    const nextDuration = trait.durationDays - 1
    if (nextDuration > 0) {
      surviving.push({ ...trait, durationDays: nextDuration })
    } else {
      expired.push(trait)
    }
  }

  stats.health = clamp(stats.health + healthDelta)
  stats.stress = clampStress(stats.stress + stressDelta, maxStress)

  return {
    stats,
    traits: surviving,
    expired,
    dailyHealthDelta: healthDelta,
    dailyStressDelta: stressDelta,
  }
}

/** 由 health 派生健康状态阈值（CK3 风格 4 阶段） */
export function getHealthStatus(health: number): HealthStatus {
  if (health >= HEALTH_THRESHOLDS.EXCELLENT) return 'EXCELLENT'
  if (health >= HEALTH_THRESHOLDS.SUB_HEALTH) return 'SUB_HEALTH'
  if (health >= HEALTH_THRESHOLDS.SICK) return 'SICK'
  return 'CRITICAL'
}

/** 由 stress 派生压力等级（CK3 风格 0-3 级） */
export function getStressLevel(stress: number): StressLevel {
  if (stress >= STRESS_THRESHOLDS.LEVEL_3) return 3
  if (stress >= STRESS_THRESHOLDS.LEVEL_2) return 2
  if (stress >= STRESS_THRESHOLDS.LEVEL_1) return 1
  return 0
}

/** 健康虚弱（SICK 及以下）时禁止高强度体力兼职 */
export function isTooSickForLabor(health: number): boolean {
  return getHealthStatus(health) === 'SICK' || getHealthStatus(health) === 'CRITICAL'
}

/** 当前是否有任意 active trait 禁用指定行动类型 */
export function isActionDisabled(state: GameState, actionType: ActionType): boolean {
  return state.activeTraits.some((t) =>
    t.effects.disableActions?.includes(actionType),
  )
}

type EffectShape = ActionDef['effects']

/**
 * 应用属性效果。
 * - maxEnergy / maxStress 由调用方根据当前 activeTraits 派生后传入，
 *   保证精力/压力钳制到正确的上限（基础 100 / STRESS_MAX，加上 trait 修正）。
 */
function applyEffects(
  stats: PlayerStats,
  effects: EffectShape,
  maxEnergy: number = BASE_ENERGY_MAX,
  maxStress: number = STRESS_MAX,
): PlayerStats {
  const next: PlayerStats = { ...stats }
  if (effects.savings !== undefined) next.savings += effects.savings
  if (effects.health !== undefined) next.health = clamp(next.health + effects.health)
  if (effects.energy !== undefined)
    next.energy = clampTo(next.energy + effects.energy, 0, maxEnergy)
  if (effects.stress !== undefined)
    next.stress = clampStress(next.stress + effects.stress, maxStress)
  if (effects.familyApproval !== undefined)
    next.familyApproval = clamp(next.familyApproval + effects.familyApproval)
  if (effects.influence !== undefined)
    next.influence = clamp(next.influence + effects.influence)
  if (effects.fans !== undefined) next.fans += effects.fans
  return next
}

/** 重大人生分支触发天数 */
const MAJOR_BRANCH_DAY = 30

const EVENT_META: Record<
  GameEventType,
  { title: string; icon: string; tone: GameEvent['tone'] }
> = {
  reality_punch: { title: '现实的铁拳', icon: '🥊', tone: 'critical' },
  stress_breakdown: { title: '精神崩溃', icon: '🧠', tone: 'critical' },
  major_branch: { title: '人生岔路口', icon: '🛤️', tone: 'critical' },
}

export interface StartSetup {
  identity?: StartingIdentity
  keptCardIds?: string[]
}

function computeStartState(setup?: StartSetup): GameState {
  const identity = setup?.identity ?? STARTING_IDENTITIES[0]
  const keptCards = resolveKeptCards(setup?.keptCardIds ?? [])
  const state = buildInitialState(identity, keptCards)
  // 根据开局身份映射默认履历标签
  const backgroundIds = STARTING_IDENTITY_BACKGROUNDS[identity.id] ?? []
  return {
    ...state,
    authorProfile: createAuthorProfile(
      state.authorProfile.penName,
      backgroundIds,
    ),
  }
}

export function useGame(initialSetup?: StartSetup) {
  const [startSetup, setStartSetup] = useState<StartSetup | undefined>(initialSetup)
  const [state, setState] = useState<GameState>(() => computeStartState(startSetup))
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: logIdSeed++,
      day: 1,
      slot: 'morning',
      kind: 'system',
      text: '毕业两个月试用期开始，你的自由职业生存挑战正式启动。',
    },
  ])
  const [pendingEvent, setPendingEvent] = useState<GameEvent | null>(null)

  // 结局运行态
  const [ending, setEnding] = useState<Ending | null>(null)

  // Roguelite 遗产档案（跨局持久化）
  const [legacyProfile, setLegacyProfile] = useState<LegacyProfile>(() =>
    loadLegacyProfile(),
  )

  // 事件链运行态
  const [currentChain, setCurrentChain] = useState<EventChain | null>(null)
  const [currentStepId, setCurrentStepId] = useState<string | null>(null)
  const [stepDepth, setStepDepth] = useState(0)

  /** 重新开始一局（可更换开局身份与携带卡牌） */
  const restart = useCallback(
    (setup?: StartSetup) => {
      logIdSeed = 1
      eventIdSeed = 1
      const nextSetup = setup ?? startSetup
      setStartSetup(nextSetup)
      setState(computeStartState(nextSetup))
      setLogs([
        {
          id: logIdSeed++,
          day: 1,
          slot: 'morning',
          kind: 'system',
          text: nextSetup?.identity
            ? `以【${nextSetup.identity.name}】身份开局，新的一局开始。`
            : '新的一局开始。这次，你想活出怎样的人生？',
        },
      ])
      setPendingEvent(null)
      setEnding(null)
      setCurrentChain(null)
      setCurrentStepId(null)
      setStepDepth(0)

      // 消耗本局已使用的携带卡牌，避免刷新后重复进入 setup
      if (legacyProfile.keptCardIds.length > 0) {
        const consumed = { ...legacyProfile, keptCardIds: [] }
        saveLegacyProfile(consumed)
        setLegacyProfile(consumed)
      }
    },
    [startSetup, legacyProfile],
  )

  /** 结算本局结局到遗产档案，并关闭结局弹窗 */
  const settleEnding = useCallback(
    (carriedCardId: string | null) => {
      if (!ending) return
      const next = settleLegacy(
        legacyProfile,
        ending,
        carriedCardId,
        state.unlockedMemes,
      )
      saveLegacyProfile(next)
      setLegacyProfile(next)
      setEnding(null)
    },
    [ending, legacyProfile, state.unlockedMemes],
  )

  const log = useCallback(
    (day: number, slot: TimeSlot, kind: LogKind, text: string) => {
      setLogs((prev) => [...prev, { id: logIdSeed++, day, slot, kind, text }])
    },
    [],
  )

  const emitEvent = useCallback(
    (
      type: GameEventType,
      text: string,
      effects: string[],
      options?: EventPopupOption[],
    ) => {
      const meta = EVENT_META[type]
      setPendingEvent({
        id: eventIdSeed++,
        type,
        title: meta.title,
        icon: meta.icon,
        tone: meta.tone,
        text,
        effects,
        options,
      })
    },
    [],
  )

  const dismissEvent = useCallback(() => setPendingEvent(null), [])

  /** 启动一个网文事件链 */
  const startWriterEventChain = useCallback(
    (chainId: string, day: number, slot: TimeSlot) => {
      const chain = EVENT_CHAINS[chainId]
      if (!chain) return
      log(day, slot, 'system', `网文圈事件触发：${chain.title}。`)
      setCurrentChain(chain)
      setCurrentStepId(chain.steps[0].stepId)
      setStepDepth(0)
    },
    [log],
  )

  /** 选择弹窗事件的内嵌选项（用于 stress_breakdown 等非事件链的一步选择） */
  const selectEventOption = useCallback(
    (index: number) => {
      if (!pendingEvent || !pendingEvent.options) return
      const option = pendingEvent.options[index]
      if (!option) return

      const maxE = computeMaxEnergy(state)
      const maxS = computeMaxStress(state)

      let newStats = state.stats
      let newInventory = state.inventory

      // 结算属性
      if (option.effects) {
        newStats = applyEffects(state.stats, option.effects as Partial<PlayerStats>, maxE, maxS)
      }
      // 授予卡牌
      let newInspirations = state.inspirations
      if (option.getCard) {
        const card = CARD_POOL[option.getCard]
        if (card) {
          newInventory = [...newInventory, { ...card }]
          log(
            state.day,
            state.slot,
            'gain',
            `获得灵感卡牌【${card.name}】（${card.quality}·${card.genre}）。`,
          )
        }
        // 崩溃式吐槽文同时掉落写作素材灵感
        if (option.getCard === 'card_breakdown_vomit') {
          const insp = INSPIRATION_BY_ID['insp_breakdown_vomit']
          if (insp && !newInspirations.some((i) => i.id === insp.id)) {
            newInspirations = [...newInspirations, insp]
            log(
              state.day,
              state.slot,
              'gain',
              `崩溃经历化作写作灵感【${insp.name}】。`,
            )
          }
        }
      }
      // 处理重大分支：改变地点 + 路线分数大幅偏移
      let newLocation = state.location
      let newEncounter = state.availableEncounter
      let newPathScores = state.pathScores
      if (option.setLocation) {
        newLocation = option.setLocation
        if (newLocation === 'hometown') {
          // 回老家后立即刷出返乡事件链，让玩家体验专属剧情
          newEncounter = 'hometown'
          newPathScores = bumpPathScore(newPathScores, 'HOMETOWN_KOL', 10)
          log(
            state.day,
            state.slot,
            'system',
            '你决定回老家。县城的人情世故与慢生活正在前方等待。',
          )
        } else {
          newPathScores = bumpPathScore(newPathScores, 'BIG_CITY_CREATOR', 10)
          log(
            state.day,
            state.slot,
            'system',
            '你选择留在大城市，继续这场自由职业的硬仗。',
          )
        }
      }

      // 写日志
      if (option.outcomeLog) {
        log(state.day, state.slot, 'event', option.outcomeLog)
      }

      // 关闭弹窗
      setPendingEvent(null)

      // 选完后做一次保险检测（理论上不会再次崩溃，均为大幅降压）
      checkStressBreakdown(newStats.stress, state.day, state.slot, maxS)

      setState({
        ...state,
        location: newLocation,
        availableEncounter: newEncounter,
        pathScores: newPathScores,
        stats: newStats,
        inventory: newInventory,
        inspirations: newInspirations,
      })
    },
    [pendingEvent, state, log],
  )

  /** 触发现实的铁拳检测，返回新的 realityPunchTriggered */
  function maybeRealityPunch(
    consecutive: number,
    alreadyTriggered: boolean,
    day: number,
    slot: TimeSlot,
  ): boolean {
    if (
      consecutive >= REALITY_PUNCH_THRESHOLD &&
      !alreadyTriggered
    ) {
      log(
        day,
        slot,
        'system',
        `现实的铁拳：连续 ${REALITY_PUNCH_THRESHOLD} 天靠兼职生存，主业毫无进展。`,
      )
      emitEvent(
        'reality_punch',
        `连续 ${REALITY_PUNCH_THRESHOLD} 天靠兼职续命，主业进度为零。房租催缴、父母叹气、同行起飞……现实轻轻给了你一拳：要不要干脆去找份全职 996？`,
        ['触发败北预警：放弃幻想'],
      )
      return true
    }
    return alreadyTriggered
  }

  /** 压力崩溃检测（CK3 Level 3）：stress 达到上限时弹出 CK3 式应对事件三选项 */
  function checkStressBreakdown(
    stress: number,
    day: number,
    slot: TimeSlot,
    maxStress: number = STRESS_MAX,
  ) {
    // 派生上限可能因 trait 修正高于/低于 STRESS_MAX；以派生值为准
    if (stress < maxStress) return
    if (pendingEvent && pendingEvent.type === 'stress_breakdown') return // 已弹窗，避免重复

    log(
      day,
      slot,
      'system',
      `精神崩溃：压力值达到 ${stress}/${maxStress}，必须做出应对。`,
    )

    const options: EventPopupOption[] = [
      {
        text: 'A. 报复性消费（破财消灾）',
        effects: {
          savings: -1000,
          stress: -150,
        },
        outcomeLog: '应对崩溃：报复性消费 1000 元，压力 -150。购物车清空的瞬间，你感觉世界终于安静了。',
      },
      {
        text: 'B. 发疯写吐槽文 / 剪发泄视频（变素材）',
        effects: {
          stress: -100,
          health: -20,
        },
        getCard: 'card_breakdown_vomit',
        outcomeLog: '应对崩溃：一口气把崩溃写出来，压力 -100，健康 -20，获得【崩溃式吐槽文】史诗灵感卡。',
      },
      {
        text: 'C. 彻底沉沦（什么也不在乎了）',
        effects: {
          stress: -200,
          health: -50,
          familyApproval: -50,
        },
        outcomeLog: '应对崩溃：彻底沉沦了一天，压力 -200，健康 -50，父母 -50。手机被刷爆，父母的电话一个没接。',
      },
    ]

    emitEvent(
      'stress_breakdown',
      `压力值爆表（${stress}/${maxStress}）。你已经撑不下去了——必须立刻选一种方式应对这次精神崩溃。`,
      ['压力等级 3 · 精神崩溃', '必须选择应对方式'],
      options,
    )
  }

  /** 选择普通行动（社媒/父母/休息）。创作走 publishWork，兼职走专用入口。 */
  const chooseAction = useCallback(
    (action: ActionDef) => {
      if (state.actedThisSlot) return
      if (
        action.type === 'work' ||
        action.type === 'parttime' ||
        action.type === 'subculture'
      )
        return
      // 特质禁用行动检查
      if (isActionDisabled(state, action.type)) {
        log(
          state.day,
          state.slot,
          'loss',
          `当前状态特质禁止执行此行动。`,
        )
        return
      }

      const maxE = computeMaxEnergy(state)
      const maxS = computeMaxStress(state)
      const newStats = applyEffects(state.stats, action.effects, maxE, maxS)
      const newPathScores = updatePathScores(
        state.pathScores,
        action.type,
        state.location,
      )
      log(state.day, state.slot, 'info', `${action.label}：${effectsToParts(action.effects)}。`)

      setState({
        ...state,
        stats: newStats,
        pathScores: newPathScores,
        actedThisSlot: true,
      })
    },
    [state, log],
  )

  /** 发布作品：可放入 1 张灵感卡牌，触发 70/30 赌博转化 */
  const publishWork = useCallback(
    (cardIndex: number | null) => {
      if (state.actedThisSlot) return
      if (state.partTimeLock) return // 兼职压榨后当天无法创作
      // 特质禁用行动检查
      if (isActionDisabled(state, 'work')) {
        log(
          state.day,
          state.slot,
          'loss',
          `当前状态特质禁止执行此行动。`,
        )
        return
      }

      const maxE = computeMaxEnergy(state)
      const maxS = computeMaxStress(state)
      const workAction = ACTIONS.find((a) => a.type === 'work')!
      const base = workAction.effects
      let newStats = applyEffects(state.stats, base, maxE, maxS)
      let newInventory = state.inventory
      let kind: LogKind = 'info'
      let msg = `${workAction.label}：${effectsToParts(base)}。`

      if (cardIndex !== null && state.inventory[cardIndex]) {
        const card = state.inventory[cardIndex]
        newInventory = state.inventory.filter((_, i) => i !== cardIndex)
        const viralRate = card.viralRate ?? CREATION_VIRAL_RATE
        const viral = Math.random() < viralRate
        if (viral) {
          // 大爆特爆：粉丝·影响力 ×3（额外 +2 倍），叠加流量收益
          const extraFans = (base.fans ?? 0) * 2
          const extraInfluence = (base.influence ?? 0) * 2
          newStats = applyEffects(
            newStats,
            {
              fans: extraFans,
              influence: extraInfluence,
              savings: VIRAL_BONUS_SAVINGS,
            },
            maxE,
            maxS,
          )
          // 黑色幽默代价：某些社会观察类素材爆火会刺痛家人
          if (card.familyApprovalCost) {
            newStats = applyEffects(
              newStats,
              { familyApproval: -card.familyApprovalCost },
              maxE,
              maxS,
            )
          }
          kind = 'celebrate'
          const costText = card.familyApprovalCost
            ? `，父母满意度 -${card.familyApprovalCost}`
            : ''
          msg = `🎉 大爆特爆！放入灵感卡牌【${card.name}】，作品引爆全场：粉丝 +${(base.fans ?? 0) + extraFans}，影响力 +${(base.influence ?? 0) + extraInfluence}，流量收益 +${VIRAL_BONUS_SAVINGS}${costText}！`
        } else {
          // 平平无奇：卡牌消耗，按正常收益结算
          kind = 'loss'
          msg = `平平无奇：放入灵感卡牌【${card.name}】，但读者不买账，按正常收益结算，卡牌已消耗。`
        }
      }

      const newPathScores = updatePathScores(state.pathScores, 'work', state.location)

      log(state.day, state.slot, kind, msg)
      setState({
        ...state,
        stats: newStats,
        inventory: newInventory,
        pathScores: newPathScores,
        actedThisSlot: true,
        workedToday: true,
        consecutivePartTimeDays: 0,
      })
    },
    [state, log],
  )

  /* ============== CareerEngine：网络作家 ============== */

  /** 查找当前第一个进行中的网文项目 */
  const getActiveWriterProject = useCallback((): WriterProject | null => {
    return (
      (state.careerProjects.find(
        (p): p is WriterProject =>
          isWriterProject(p) && p.stage !== 'COMPLETED' && p.stage !== 'ABANDONED',
      ) as WriterProject | undefined) ?? null
    )
  }, [state.careerProjects])

  /** 开一本新小说 */
  const startWriterProject = useCallback(
    (input?: {
      platformId?: import('../types/platform').NovelPlatformId
      draft?: import('../types/career').BookCreationDraft
    }) => {
      if (state.actedThisSlot) return
      const platformId =
        input?.platformId ??
        (Object.keys(PLATFORMS)[0] as import('../types/platform').NovelPlatformId)
      const project = createWriterProject({
        day: state.day,
        platformId,
        draft: input?.draft,
        state,
        authorProfile: state.authorProfile,
      })
      // 如果新书使用了新笔名，同步更新作者档案
      const penName = input?.draft?.penName ?? state.authorProfile.penName
      const nextAuthorProfile =
        penName !== state.authorProfile.penName
          ? { ...state.authorProfile, penName }
          : state.authorProfile
      setState({
        ...state,
        authorProfile: nextAuthorProfile,
        careerProjects: [...state.careerProjects, project],
        actedThisSlot: true,
        workedToday: true,
        consecutivePartTimeDays: 0,
      })
      log(
        state.day,
        state.slot,
        'system',
        `新书立项：${project.title}（${PLATFORMS[platformId].name}），复杂度 ${Math.round(project.complexity.score)} / 掌控力 ${Math.round(project.executionCapacity)} / 生长曲线 ${project.growthCurve}。`,
      )
    },
    [state, log],
  )

  /** 对当前进行中的小说执行一个写作策略动作 */
  const applyWriterStrategy = useCallback(
    (actionId: string) => {
      if (state.actedThisSlot) return
      const project = getActiveWriterProject()
      if (!project) {
        log(state.day, state.slot, 'loss', '当前没有进行中的小说，先去“开新书”。')
        return
      }

      const action = WRITER_ACTION_BY_ID[actionId]
      if (!action) return

      const maxE = computeMaxEnergy(state)
      const maxS = computeMaxStress(state)

      // 精力/压力预检查（温和提示，不硬性禁止，保留“硬撑”可能性）
      if (state.stats.energy + action.cost.energy < 0) {
        log(
          state.day,
          state.slot,
          'loss',
          `精力不足以执行【${action.name}】，建议先休息。`,
        )
        return
      }

      const result = applyWriterAction(project, action, state.day, undefined, undefined, state)
      const newStats = applyEffects(
        state.stats,
        {
          energy: result.playerDelta.energy ?? 0,
          stress: result.playerDelta.stress ?? 0,
          savings: result.playerDelta.savings ?? 0,
        },
        maxE,
        maxS,
      )

      const newProjects = state.careerProjects.map((p) =>
        p.id === result.project.id ? result.project : p,
      )

      result.logs.forEach((text) =>
        log(state.day, state.slot, 'info', text),
      )

      setState({
        ...state,
        stats: newStats,
        careerProjects: newProjects,
        authorProfile: result.authorProfile ?? state.authorProfile,
        actedThisSlot: true,
        workedToday: true,
        consecutivePartTimeDays: 0,
      })

      // 写作动作后检测网文圈事件
      const projectedState: GameState = {
        ...state,
        stats: newStats,
        careerProjects: newProjects,
      }
      const triggeredChainId = checkWriterEventTriggers(
        projectedState,
        state.day,
        state.slot,
        'after_action',
      )
      if (triggeredChainId) {
        startWriterEventChain(triggeredChainId, state.day, state.slot)
      }

      checkStressBreakdown(newStats.stress, state.day, state.slot, maxS)
    },
    [state, log, getActiveWriterProject, startWriterEventChain],
  )

  /** 完结当前小说 */
  const completeActiveWriterProject = useCallback(() => {
    const project = getActiveWriterProject()
    if (!project) return
    const { project: next, log: logText } = completeWriterProject(
      project,
      state.day,
    )
    const { meme, log: memeLog } = generateMemeFromProject(next, state.day)
    const newMemes = meme
      ? state.unlockedMemes.some((m) => m.id === meme.id)
        ? state.unlockedMemes
        : [...state.unlockedMemes, meme]
      : state.unlockedMemes
    const nextProfile = updateWriterCareerProfile(
      state.writerCareerProfile,
      next,
      true,
    )
    // 完结后再次检查进化阶段（完本数是重要分水岭）
    const evolved = checkAuthorEvolution(
      state.authorProfile,
      nextProfile.totalCompletedBooks,
    )
    if (evolved.log) log(state.day, state.slot, 'celebrate', evolved.log)
    setState({
      ...state,
      careerProjects: state.careerProjects.map((p) =>
        p.id === next.id ? next : p,
      ),
      unlockedMemes: newMemes,
      writerCareerProfile: nextProfile,
      authorProfile: evolved.profile,
    })
    log(state.day, state.slot, 'celebrate', logText)
    if (memeLog) log(state.day, state.slot, 'celebrate', memeLog)
  }, [state, log, getActiveWriterProject])

  /** 太监当前小说 */
  const abandonActiveWriterProject = useCallback(() => {
    const project = getActiveWriterProject()
    if (!project) return
    const { project: next, log: logText, stressDelta } = abandonWriterProject(
      project,
      state.day,
    )
    const { meme, log: memeLog } = generateMemeFromProject(next, state.day)
    const newMemes = meme
      ? state.unlockedMemes.some((m) => m.id === meme.id)
        ? state.unlockedMemes
        : [...state.unlockedMemes, meme]
      : state.unlockedMemes
    const nextProfile = updateWriterCareerProfile(
      state.writerCareerProfile,
      next,
      false,
    )
    const maxS = computeMaxStress(state)
    const newStats = applyEffects(
      state.stats,
      { stress: stressDelta },
      computeMaxEnergy(state),
      maxS,
    )
    setState({
      ...state,
      stats: newStats,
      careerProjects: state.careerProjects.map((p) =>
        p.id === next.id ? next : p,
      ),
      unlockedMemes: newMemes,
      writerCareerProfile: nextProfile,
    })
    log(state.day, state.slot, 'event', logText)
    if (memeLog) log(state.day, state.slot, 'event', memeLog)
    checkStressBreakdown(newStats.stress, state.day, state.slot, maxS)
  }, [state, log, getActiveWriterProject])

  /** 获得一个写作灵感 */
  const gainInspiration = useCallback(
    (inspirationId: string) => {
      const inspiration = INSPIRATION_BY_ID[inspirationId]
      if (!inspiration) return
      if (state.inspirations.some((i) => i.id === inspirationId)) {
        log(
          state.day,
          state.slot,
          'info',
          `灵感【${inspiration.name}】已经记录过了，没有新增。`,
        )
        return
      }
      setState({
        ...state,
        inspirations: [...state.inspirations, inspiration],
      })
      log(
        state.day,
        state.slot,
        'gain',
        `获得写作灵感【${inspiration.name}】（${inspiration.source}）。`,
      )
    },
    [state, log],
  )

  /** 对当前小说注入一个灵感 */
  const applyInspirationToActiveProject = useCallback(
    (inspirationId: string) => {
      if (state.actedThisSlot) return
      const project = getActiveWriterProject()
      if (!project) {
        log(
          state.day,
          state.slot,
          'loss',
          '当前没有进行中的小说，无法注入灵感。',
        )
        return
      }
      const inspirationIndex = state.inspirations.findIndex(
        (i) => i.id === inspirationId,
      )
      if (inspirationIndex < 0) {
        log(state.day, state.slot, 'loss', '你没有这个灵感。')
        return
      }

      const result = applyInspirationToWriterProject(
        project,
        inspirationId,
        state.day,
      )
      if (!result) return

      const newInspirations = state.inspirations.filter(
        (i) => i.id !== inspirationId,
      )
      const newProjects = state.careerProjects.map((p) =>
        p.id === result.project.id ? result.project : p,
      )

      result.readerComments.forEach((text) =>
        log(state.day, state.slot, 'info', text),
      )

      setState({
        ...state,
        inspirations: newInspirations,
        careerProjects: newProjects,
        actedThisSlot: true,
        workedToday: true,
        consecutivePartTimeDays: 0,
      })
    },
    [state, log, getActiveWriterProject],
  )

  /** 对当前小说致敬一个已解锁的作者梗 */
  const applyMemeHomageToActiveProject = useCallback(
    (memeId: string) => {
      if (state.actedThisSlot) return
      const project = getActiveWriterProject()
      if (!project) {
        log(
          state.day,
          state.slot,
          'loss',
          '当前没有进行中的小说，无法致敬前作梗。',
        )
        return
      }
      const memeIndex = state.unlockedMemes.findIndex((m) => m.id === memeId)
      if (memeIndex < 0) {
        log(state.day, state.slot, 'loss', '你还没有解锁这个梗。')
        return
      }

      const meme = state.unlockedMemes[memeIndex]
      const result = applyMemeHomage(project, meme, state.day)
      const newMemes = state.unlockedMemes.map((m) =>
        m.id === memeId ? result.meme : m,
      )
      const newProjects = state.careerProjects.map((p) =>
        p.id === result.project.id ? result.project : p,
      )

      result.logs.forEach((text) =>
        log(state.day, state.slot, 'info', text),
      )

      setState({
        ...state,
        unlockedMemes: newMemes,
        careerProjects: newProjects,
        actedThisSlot: true,
        workedToday: true,
        consecutivePartTimeDays: 0,
      })
    },
    [state, log, getActiveWriterProject],
  )

  /** 应急保命兼职 */
  const doEmergencyPartTime = useCallback(() => {
    if (state.actedThisSlot) return
    if (state.partTimeLock) return

    const action = getEmergencyAction(state.location)

    // 特质禁用行动检查（如【被咬伤】禁用 parttime）
    if (isActionDisabled(state, action.type)) {
      log(
        state.day,
        state.slot,
        'loss',
        `伤势未愈，干不了零工——等状态特质消失后再试。`,
      )
      return
    }
    // 健康虚弱（SICK/CRITICAL）时禁止高强度体力兼职
    if (isTooSickForLabor(state.stats.health)) {
      log(
        state.day,
        state.slot,
        'loss',
        `身体抱病，干不了零工——先把健康养回来。`,
      )
      return
    }

    const maxE = computeMaxEnergy(state)
    const maxS = computeMaxStress(state)
    const newStats = applyEffects(state.stats, action.effects, maxE, maxS)
    const newPathScores = updatePathScores(
      state.pathScores,
      action.type,
      state.location,
    )
    // 兼职也是“向现实妥协”的过程，缓慢推进考编/求职进度
    const examDelta = action.type === 'hometown_parttime' ? 2 : 3
    log(
      state.day,
      state.slot,
      'gain',
      `${action.label}：${effectsToParts(action.effects)}，今日无法创作。`,
    )

    const consecutive = state.consecutivePartTimeDays + 1
    const realityPunchTriggered = maybeRealityPunch(
      consecutive,
      state.realityPunchTriggered,
      state.day,
      state.slot,
    )

    // 兼职有概率获得现实素材灵感
    let newInspirations = state.inspirations
    if (action.type === 'parttime' && Math.random() < 0.35) {
      if (!state.inspirations.some((i) => i.id === 'insp_takeaway_rush')) {
        const insp = INSPIRATION_BY_ID['insp_takeaway_rush']
        if (insp) {
          newInspirations = [...newInspirations, insp]
          log(
            state.day,
            state.slot,
            'gain',
            `兼职见闻获得灵感【${insp.name}】。`,
          )
        }
      }
    } else if (action.type === 'hometown_parttime' && Math.random() < 0.3) {
      if (!state.inspirations.some((i) => i.id === 'insp_hometown_aunt')) {
        const insp = INSPIRATION_BY_ID['insp_hometown_aunt']
        if (insp) {
          newInspirations = [...newInspirations, insp]
          log(
            state.day,
            state.slot,
            'gain',
            `老家见闻获得灵感【${insp.name}】。`,
          )
        }
      }
    }

    // 压力崩溃检测（CK3 Level 3）
    checkStressBreakdown(newStats.stress, state.day, state.slot, maxS)

    setState({
      ...state,
      stats: newStats,
      pathScores: newPathScores,
      examProgress: Math.min(100, state.examProgress + examDelta),
      inspirations: newInspirations,
      actedThisSlot: true,
      partTimeLock: true,
      consecutivePartTimeDays: consecutive,
      realityPunchTriggered,
    })
  }, [state, log, emitEvent])

  /** 前往今日限时奇遇：消耗奇遇并开启事件链 */
  const startEncounter = useCallback(() => {
    if (state.actedThisSlot) return
    if (state.partTimeLock) return
    if (!state.availableEncounter) return
    // 特质禁用行动检查（subculture 也是兼职体验，被禁用时同样不可触发）
    if (isActionDisabled(state, 'subculture')) {
      log(
        state.day,
        state.slot,
        'loss',
        `当前状态特质禁止从事奇遇兼职。`,
      )
      return
    }
    const chain = EVENT_CHAINS[state.availableEncounter]
    if (!chain) return

    log(
      state.day,
      state.slot,
      'info',
      `前往限时奇遇：${chain.title}，事件链启动。`,
    )
    // 亚文化奇遇提升圈内声望
    const reputationDelta = chain.id === 'boardgame_dm' ? 8 : chain.id === 'hometown' ? 3 : 5
    const newPathScores = updatePathScores(state.pathScores, 'subculture', state.location)
    // 消耗今日奇遇
    setState({
      ...state,
      availableEncounter: null,
      pathScores: newPathScores,
      subcultureReputation: Math.min(100, state.subcultureReputation + reputationDelta),
    })
    setCurrentChain(chain)
    setCurrentStepId(chain.steps[0].stepId)
    setStepDepth(0)
  }, [state, log])

  /** 根据网文状态检测是否有危机/吃瓜事件链可触发，返回 chainId */
  function checkWriterEventTriggers(
    snapshot: GameState,
    day: number,
    _slot: TimeSlot,
    reason: 'after_action' | 'daily_tick',
  ): string | null {
    if (currentChain || pendingEvent) return null
    const project = snapshot.careerProjects.find(
      (p): p is WriterProject =>
        isWriterProject(p) &&
        p.stage !== 'COMPLETED' &&
        p.stage !== 'ABANDONED',
    )
    if (!project) return null

    // 拒签危机：试水期字数达标但仍未签约
    if (
      project.stage === 'CONCEPT' &&
      project.wordCount >= 30_000 &&
      Math.random() < 0.4
    ) {
      return 'writer_rejection_crisis'
    }
    // 黑粉爆破：读者情绪极差或隐患值高
    if (project.readerMood < -30 || project.stats.bugOrControversy >= 30) {
      return 'writer_blackfan_crisis'
    }
    // 全勤危机：每月末，字数不够，身体或精神濒临崩溃
    if (
      reason === 'daily_tick' &&
      day % 30 >= 25 &&
      project.dailyWordCount < 4_000 &&
      project.stage !== 'CONCEPT' &&
      (snapshot.stats.health < 40 || snapshot.stats.stress > 200)
    ) {
      return 'writer_fullattendance_crisis'
    }
    // 同行挂炉：热度高，树大招风
    if (project.metrics.currentHype >= 60 && Math.random() < 0.25) {
      return 'writer_peer_roast'
    }
    // 防盗翻车：上架后收益达到一定水平
    if (
      (project.stage === 'LAUNCHED' || project.stage === 'SERIALIZING') &&
      project.stats.totalRevenue > 5_000 &&
      Math.random() < 0.2
    ) {
      return 'writer_anti_piracy'
    }
    // 评论区逼宫：读者情绪负面或质量下滑
    if (project.readerMood < -20 || project.quality < 40) {
      return 'writer_comment_revolt'
    }

    return null
  }

  /** 事件链选项选择：结算效果 → 授予卡牌/特质 → 推进/结束 */
  const selectOption = useCallback(
    (option: EventOption) => {
      if (!currentChain || !currentStepId) return
      const step = currentChain.steps.find((s) => s.stepId === currentStepId)
      if (!step) return

      // 1. 先授予特质（若 effect.grantTrait 存在）：影响后续 maxEnergy/maxStress
      let newTraits = state.activeTraits
      let grantedTraitName: string | null = null
      if (option.effect?.grantTrait) {
        const result = grantTrait(state.activeTraits, option.effect.grantTrait)
        newTraits = result.traits
        if (result.trait) {
          grantedTraitName = result.trait.name
          log(
            state.day,
            state.slot,
            'gain',
            `获得状态特质【${result.trait.name}】（${result.trait.type === 'BUFF' ? '增益' : '减益'}，${result.trait.durationDays} 天）。`,
          )
        }
      }

      // 2. 用新 activeTraits 派生 maxes，结算属性效果
      const derivedState: GameState = { ...state, activeTraits: newTraits }
      const maxE = computeMaxEnergy(derivedState)
      const maxS = computeMaxStress(derivedState)

      let newStats = state.stats
      if (option.effect) {
        newStats = applyEffects(state.stats, option.effect, maxE, maxS)
      }

      // 3. 事件链对网文项目的影响
      let newProjects = state.careerProjects
      const activeWriterProject = getActiveWriterProject()
      if (activeWriterProject && option.effect?.writerProject) {
        const wp = option.effect.writerProject
        const updated: WriterProject = {
          ...activeWriterProject,
          quality: clampTo(
            activeWriterProject.quality + (wp.quality ?? 0),
            0,
            100,
          ),
          commerciality: clampTo(
            activeWriterProject.commerciality + (wp.commerciality ?? 0),
            0,
            100,
          ),
          memeValue: clampTo(
            activeWriterProject.memeValue + (wp.memeValue ?? 0),
            0,
            100,
          ),
          readerRetention: clampTo(
            activeWriterProject.readerRetention + (wp.readerRetention ?? 0),
            0,
            1,
          ),
          readerMood: clampTo(
            activeWriterProject.readerMood + (wp.readerMood ?? 0),
            -100,
            100,
          ),
          wordCount: activeWriterProject.wordCount + (wp.wordCount ?? 0),
          stats: {
            ...activeWriterProject.stats,
            bugOrControversy: clampTo(
              activeWriterProject.stats.bugOrControversy + (wp.controversy ?? 0),
              0,
              100,
            ),
          },
          metrics: {
            ...activeWriterProject.metrics,
            currentHype: clampTo(
              activeWriterProject.metrics.currentHype + (wp.hype ?? 0),
              0,
              100,
            ),
          },
        }
        newProjects = state.careerProjects.map((p) =>
          p.id === updated.id ? updated : p,
        )
      }

      // 4. 事件链获得写作灵感
      let newInspirations = state.inspirations
      if (option.effect?.getInspiration) {
        const insp = INSPIRATION_BY_ID[option.effect.getInspiration]
        if (insp && !newInspirations.some((i) => i.id === insp.id)) {
          newInspirations = [...newInspirations, insp]
          log(
            state.day,
            state.slot,
            'gain',
            `事件获得写作灵感【${insp.name}】。`,
          )
        }
      }

      // 5. 授予灵感卡牌
      let newInventory = state.inventory
      if (option.getCard) {
        const card = CARD_POOL[option.getCard]
        if (card) {
          newInventory = [...newInventory, { ...card }]
          log(
            state.day,
            state.slot,
            'gain',
            `获得灵感卡牌【${card.name}】（${card.quality}·${card.genre}）。`,
          )
        }
      }

      log(
        state.day,
        state.slot,
        'event',
        `${currentChain.title}·${step.title}：选择「${option.text}」。` +
          (grantedTraitName ? ` 触发特质【${grantedTraitName}】。` : ''),
      )

      // 事件链选择也影响路线倾向（按链的主题归类）
      let newPathScores = state.pathScores
      if (currentChain.id === 'boardgame_dm') {
        newPathScores = bumpPathScore(newPathScores, 'SUBCULTURE_GURU', 2)
      } else if (currentChain.id === 'family_new_year') {
        newPathScores = bumpPathScore(newPathScores, 'HOMETOWN_KOL', 2)
      } else if (currentChain.id === 'hometown') {
        newPathScores = bumpPathScore(newPathScores, 'HOMETOWN_KOL', 3)
      } else if (currentChain.id.startsWith('writer_')) {
        newPathScores = bumpPathScore(newPathScores, 'BIG_CITY_CREATOR', 2)
      }

      if (option.nextStepId === null) {
        // 事件链结束：占用本时段、锁定创作、计入连续兼职
        const consecutive = state.consecutivePartTimeDays + 1
        const realityPunchTriggered = maybeRealityPunch(
          consecutive,
          state.realityPunchTriggered,
          state.day,
          state.slot,
        )
        // 事件链选项可能大幅升降压，检测压力崩溃（用新 maxS）
        checkStressBreakdown(newStats.stress, state.day, state.slot, maxS)
        setState({
          ...state,
          stats: newStats,
          inventory: newInventory,
          inspirations: newInspirations,
          careerProjects: newProjects,
          activeTraits: newTraits,
          pathScores: newPathScores,
          actedThisSlot: true,
          partTimeLock: true,
          consecutivePartTimeDays: consecutive,
          realityPunchTriggered,
        })
        setCurrentChain(null)
        setCurrentStepId(null)
        setStepDepth(0)
      } else {
        // 推进至下一阶段
        setState({
          ...state,
          stats: newStats,
          inventory: newInventory,
          inspirations: newInspirations,
          careerProjects: newProjects,
          activeTraits: newTraits,
          pathScores: newPathScores,
        })
        setCurrentStepId(option.nextStepId)
        setStepDepth((d) => d + 1)
      }
    },
    [state, currentChain, currentStepId, log, emitEvent],
  )

  /** 推进至下一时段 / 次日 */
  const advance = useCallback(() => {
    if (!state.actedThisSlot) return
    const next = NEXT_SLOT[state.slot]

    if (next === 'next-day') {
      const newDay = state.day + 1
      if (newDay > TOTAL_DAYS) {
        // 游戏自然结束，根据最终状态判定结局
        const finalEnding = checkGameEnding(state) ?? ENDINGS[ENDINGS.length - 1]
        setEnding(finalEnding)
        log(state.day, state.slot, 'celebrate', `结局解锁：${finalEnding.title}`)
        return
      }

      // 地点相关每日开销
      const dailyRent = state.location === 'hometown' ? HOMETOWN_RENT : CITY_RENT
      const dailyStress =
        state.location === 'hometown' ? HOMETOWN_DAILY_STRESS : 0
      const locationLabel = state.location === 'hometown' ? '老家' : '大城市'
      log(
        newDay,
        'morning',
        'system',
        `第 ${newDay} 天开始（${locationLabel}）：扣除生活费 ${dailyRent} 元${
          dailyStress > 0 ? `，家庭碎碎念压力 +${dailyStress}` : ''
        }。`,
      )

      // 状态特质每日结算：
      //   - 应用 healthDeltaPerDay / stressDeltaPerDay
      //   - durationDays - 1，移除已过期特质
      //   - 用"结算前"的派生 maxStress 钳制当日 stress 变化
      const maxS = computeMaxStress(state)
      const traitResult = applyTraitDailyEffects(state, maxS)
      if (traitResult.dailyHealthDelta !== 0 || traitResult.dailyStressDelta !== 0) {
        const parts: string[] = []
        if (traitResult.dailyHealthDelta !== 0) {
          parts.push(`健康 ${traitResult.dailyHealthDelta > 0 ? '+' : ''}${traitResult.dailyHealthDelta}`)
        }
        if (traitResult.dailyStressDelta !== 0) {
          parts.push(`压力 ${traitResult.dailyStressDelta > 0 ? '+' : ''}${traitResult.dailyStressDelta}`)
        }
        log(
          newDay,
          'morning',
          'system',
          `状态特质结算：${parts.join('，')}。`,
        )
      }
      for (const t of traitResult.expired) {
        log(
          newDay,
          'morning',
          'system',
          `状态特质【${t.name}】已过期失效。`,
        )
      }

      // CareerEngine 每日发酵结算
      let careerProjectsTicked = state.careerProjects
      let careerSavingsDelta = 0
      let careerFansDelta = 0
      let careerStressDelta = 0
      if (state.careerProjects.length > 0) {
        const ticked: typeof state.careerProjects = []
        for (const project of state.careerProjects) {
          if (isWriterProject(project)) {
            const result = dailyTickWriter(project, newDay, undefined, state.marketTrend)
            ticked.push(result.project)
            careerSavingsDelta += result.playerDelta.savings ?? 0
            careerFansDelta += result.playerDelta.fans ?? 0
            careerStressDelta += result.playerDelta.stress ?? 0
            result.logs.forEach((text) =>
              log(newDay, 'morning', 'info', text),
            )
          } else {
            ticked.push(project)
          }
        }
        careerProjectsTicked = ticked
      }

      // 市场趋势每日推进：衰减 + 饱和度统计
      let marketTrend = tickMarketTrend(
        state.marketTrend,
        careerProjectsTicked.filter((p): p is WriterProject => isWriterProject(p)),
      )
      if (marketTrend.decayDays <= 0) {
        marketTrend = generateMarketTrend(newDay)
        log(
          newDay,
          'morning',
          'system',
          `网文圈风向变了：本月流行【${marketTrend.name}】，相关题材与标签更容易获得流量扶持。`,
        )
      }

      // 网文江湖每日模拟：NPC 更新 + 排行榜 + 互动 + 梗传播 + 传闻
      let activeWriterProject = careerProjectsTicked.find(
        (p): p is WriterProject =>
          isWriterProject(p) &&
          p.stage !== 'COMPLETED' &&
          p.stage !== 'ABANDONED',
      )
      const platformResult = simulatePlatformDaily(
        state.platformEcosystem.npcs,
        activeWriterProject,
        state.unlockedMemes,
        state.platformEcosystem.memeTrends,
        newDay,
      )

      // 把 NPC 互动和梗传播效果应用到玩家当前作品
      if (activeWriterProject) {
        let wp = { ...activeWriterProject }
        for (const interaction of platformResult.interactions) {
          if (interaction.effect?.hype) {
            wp.metrics.currentHype = clampTo(
              wp.metrics.currentHype + interaction.effect.hype,
              0,
              100,
            )
          }
          if (interaction.effect?.retention) {
            wp.readerRetention = clampTo(
              wp.readerRetention + interaction.effect.retention,
              0,
              1,
            )
          }
          if (interaction.effect?.controversy) {
            wp.stats.bugOrControversy = clampTo(
              wp.stats.bugOrControversy + interaction.effect.controversy,
              0,
              100,
            )
          }
        }
        // 梗传播带来的热度加成
        const memeHypeBoost = platformResult.memeTrends
          .filter((t) => t.platformId === wp.platformId)
          .reduce((sum, t) => sum + t.heat * 0.05, 0)
        if (memeHypeBoost > 0) {
          wp.metrics.currentHype = clampTo(
            wp.metrics.currentHype + memeHypeBoost,
            0,
            100,
          )
        }
        activeWriterProject = wp
        careerProjectsTicked = careerProjectsTicked.map((p) =>
          p.id === wp.id ? wp : p,
        )
      }

      platformResult.logs.forEach((text) =>
        log(newDay, 'morning', 'info', text),
      )
      platformResult.interactions.forEach((interaction) =>
        log(newDay, 'morning', 'event', interaction.text),
      )
      platformResult.rumors.forEach((rumor) =>
        log(newDay, 'morning', rumor.involvesPlayer ? 'event' : 'info', rumor.text),
      )

      // 每日更新作者等级
      const totalCareerRevenue = careerProjectsTicked.reduce(
        (sum, p) => sum + p.stats.totalRevenue,
        0,
      )
      const hasSignedBook = careerProjectsTicked.some(
        (p) => isWriterProject(p) && p.signed,
      )
      const newAuthorRank = computeAuthorRank(
        totalCareerRevenue,
        state.stats.fans + careerFansDelta,
        hasSignedBook,
      )
      if (newAuthorRank !== state.authorRank) {
        log(
          newDay,
          'morning',
          'celebrate',
          `作者等级提升：${state.authorRank} → ${newAuthorRank}！`,
        )
      }

      // 限时奇遇刷新：40% 概率刷出一条今日有效的奇遇
      // 回老家后加入专属返乡链，城市奇遇在老家也可用（手机接单/亲戚串门）
      const encounterCandidates =
        state.location === 'hometown'
          ? [...ENCOUNTER_CHAIN_IDS, 'hometown']
          : ENCOUNTER_CHAIN_IDS
      let newEncounter: string | null = null
      if (
        Math.random() < ENCOUNTER_SPAWN_RATE &&
        encounterCandidates.length > 0
      ) {
        newEncounter =
          encounterCandidates[
            Math.floor(Math.random() * encounterCandidates.length)
          ]
      }
      if (newEncounter && EVENT_CHAINS[newEncounter]) {
        log(
          newDay,
          'morning',
          'event',
          `📱 刷手机时刷到一条限时奇遇：${EVENT_CHAINS[newEncounter].title}（今日有效，错过即失效）。`,
        )
      }

      // 合成新 stats：先 trait 结算，再扣生活费 + 地点日常压力 + CareerEngine 收益
      const finalStats: PlayerStats = {
        ...traitResult.stats,
        savings:
          traitResult.stats.savings - dailyRent + careerSavingsDelta,
        fans: traitResult.stats.fans + careerFansDelta,
        stress: clampStress(
          traitResult.stats.stress + dailyStress + careerStressDelta,
          maxS,
        ),
      }

      // 特质结算可能让压力到顶，触发崩溃检测（用结算后的 maxS）
      checkStressBreakdown(finalStats.stress, newDay, 'morning', maxS)

      // 中途结局判定：燃尽（存款<0 且 压力满）
      const midEnding = checkGameEnding({
        ...state,
        day: newDay,
        stats: finalStats,
        activeTraits: traitResult.traits,
      })
      if (midEnding) {
        setState({
          ...state,
          day: newDay,
          slot: 'morning',
          actedThisSlot: false,
          partTimeLock: false,
          workedToday: false,
          availableEncounter: newEncounter,
          stats: finalStats,
          activeTraits: traitResult.traits,
          careerProjects: careerProjectsTicked,
          authorRank: newAuthorRank,
          platformEcosystem: {
            npcs: platformResult.updatedNpcs,
            leaderboards: platformResult.updatedLeaderboards,
            rumors: [
              ...state.platformEcosystem.rumors,
              ...platformResult.rumors,
            ].slice(-20),
            interactions: [
              ...state.platformEcosystem.interactions,
              ...platformResult.interactions,
            ].slice(-30),
            memeTrends: platformResult.memeTrends,
          },
          marketTrend,
        })
        setEnding(midEnding)
        log(newDay, 'morning', 'celebrate', `结局解锁：${midEnding.title}`)
        return
      }

      const nextState: GameState = {
        ...state,
        day: newDay,
        slot: 'morning',
        actedThisSlot: false,
        partTimeLock: false,
        workedToday: false,
        availableEncounter: newEncounter,
        stats: finalStats,
        activeTraits: traitResult.traits,
        careerProjects: careerProjectsTicked,
        authorRank: newAuthorRank,
        platformEcosystem: {
          npcs: platformResult.updatedNpcs,
          leaderboards: platformResult.updatedLeaderboards,
          rumors: [
            ...state.platformEcosystem.rumors,
            ...platformResult.rumors,
          ].slice(-20),
          interactions: [
            ...state.platformEcosystem.interactions,
            ...platformResult.interactions,
          ].slice(-30),
          memeTrends: platformResult.memeTrends,
        },
        marketTrend,
      }

      // 每日检测网文圈危机/吃瓜事件
      const dailyTriggeredChainId = checkWriterEventTriggers(
        nextState,
        newDay,
        'morning',
        'daily_tick',
      )
      if (dailyTriggeredChainId) {
        setState(nextState)
        startWriterEventChain(dailyTriggeredChainId, newDay, 'morning')
        return
      }

      // 第 30 天早晨触发重大人生分支（仅当还在大城市漂泊时）
      if (newDay === MAJOR_BRANCH_DAY && state.location === 'city') {
        setState(nextState)
        log(
          newDay,
          'morning',
          'event',
          '人生的岔路口出现：是继续在城市硬撑，还是听从父母召唤回老家？',
        )
        emitEvent(
          'major_branch',
          `第 ${MAJOR_BRANCH_DAY} 天，房租又涨了，父母的电话也越来越频繁。\n你站在人生的岔路口：继续留在大城市追逐自由职业梦想，还是回老家过安稳日子？`,
          ['重大分支：地点选择', '将影响后续房租、兼职与事件链'],
          [
            {
              text: 'A. 咬牙留在大城市',
              effects: { stress: 20, familyApproval: -10 },
              setLocation: 'city',
              outcomeLog:
                '你选择留下。房租、外卖、孤独——大城市的自由职业继续。',
            },
            {
              text: 'B. 回老家，听父母的安排先歇歇',
              effects: { stress: -30, familyApproval: 20 },
              setLocation: 'hometown',
              outcomeLog:
                '你拖着行李箱回到老家。房租归零，但亲戚们的关心才刚刚开始。',
            },
            {
              text: 'C. 两边都想要，先回家办公试试',
              effects: { stress: -10, familyApproval: 5, influence: -5 },
              setLocation: 'hometown',
              outcomeLog:
                '你决定回老家"远程办公"，试图兼顾安稳与自由。',
            },
          ],
        )
        return
      }

      setState(nextState)
      return
    }

    log(state.day, next, 'info', `进入${SLOT_LABEL[next]}时段。`)
    setState({ ...state, slot: next, actedThisSlot: false })
  }, [state, log])

  // 当前阶段（解析后）
  const currentStep: EventStep | null = useMemo(() => {
    if (!currentChain || !currentStepId) return null
    return currentChain.steps.find((s) => s.stepId === currentStepId) ?? null
  }, [currentChain, currentStepId])

  // 今日限时奇遇（解析后）
  const availableEncounterChain = useMemo<EventChain | null>(
    () =>
      state.availableEncounter
        ? EVENT_CHAINS[state.availableEncounter] ?? null
        : null,
    [state.availableEncounter],
  )

  /* ============== 调试 API（仅用于手动触发压力崩溃等场景测试） ============== */

  /** 直接增加指定压力（正数加、负数减），同时触发崩溃检测 */
  const debugAddStress = useCallback(
    (delta: number) => {
      const maxS = computeMaxStress(state)
      const newStress = clampStress(state.stats.stress + delta, maxS)
      const newStats = { ...state.stats, stress: newStress }
      log(
        state.day,
        state.slot,
        'system',
        `【调试】压力变化 ${delta > 0 ? '+' : ''}${delta}，当前 ${newStress}/${maxS}。`,
      )
      setState({ ...state, stats: newStats })
      checkStressBreakdown(newStress, state.day, state.slot, maxS)
    },
    [state, log],
  )

  /** 直接设置 stress 数值（0-派生上限），同时触发崩溃检测 */
  const debugSetStress = useCallback(
    (value: number) => {
      const maxS = computeMaxStress(state)
      const newStress = clampStress(value, maxS)
      const newStats = { ...state.stats, stress: newStress }
      log(
        state.day,
        state.slot,
        'system',
        `【调试】设置压力 = ${newStress}/${maxS}。`,
      )
      setState({ ...state, stats: newStats })
      checkStressBreakdown(newStress, state.day, state.slot, maxS)
    },
    [state, log],
  )

  /** 直接触发 stress_breakdown 弹窗（不管当前 stress 值） */
  const debugTriggerBreakdown = useCallback(() => {
    const maxS = computeMaxStress(state)
    const forceStress = maxS // 直接拉满到当前派生上限
    const newStats = { ...state.stats, stress: forceStress }
    log(
      state.day,
      state.slot,
      'system',
      `【调试】强制触发精神崩溃事件（stress 设为 ${forceStress}/${maxS}）。`,
    )
    setState({ ...state, stats: newStats })
    checkStressBreakdown(forceStress, state.day, state.slot, maxS)
  }, [state, log])

  /** 【调试】直接授予一个状态特质（用于验证 trait 系统效果） */
  const debugGrantTrait = useCallback(
    (traitId: string) => {
      const result = grantTrait(state.activeTraits, traitId)
      if (!result.trait) {
        log(
          state.day,
          state.slot,
          'system',
          `【调试】未找到特质模板：${traitId}。`,
        )
        return
      }
      log(
        state.day,
        state.slot,
        'system',
        `【调试】授予特质【${result.trait.name}】（${result.trait.durationDays} 天）。`,
      )
      setState({ ...state, activeTraits: result.traits })
    },
    [state, log],
  )

  /** 【调试】强制启动指定网文事件链（用于验证事件链分支与结算） */
  const debugStartWriterEventChain = useCallback(
    (chainId: string) => {
      const chain = EVENT_CHAINS[chainId]
      if (!chain) {
        log(
          state.day,
          state.slot,
          'system',
          `【调试】未找到事件链：${chainId}。`,
        )
        return
      }
      if (currentChain) {
        log(
          state.day,
          state.slot,
          'system',
          `【调试】当前已有进行中的事件链，请先处理完。`,
        )
        return
      }
      log(
        state.day,
        state.slot,
        'system',
        `【调试】强制触发网文事件链：${chain.title}。`,
      )
      startWriterEventChain(chainId, state.day, state.slot)
    },
    [state, log, currentChain, startWriterEventChain],
  )

  // 派生量（供 UI 显示精力/压力的实际上限）
  const maxEnergy = useMemo(() => computeMaxEnergy(state), [state])
  const maxStress = useMemo(() => computeMaxStress(state), [state])

  // 路线趋势快照（供状态面板展示）
  const pathSnapshot = useMemo(() => getPathSnapshot(state), [state])

  return {
    state,
    logs,
    pendingEvent,
    ending,
    pathSnapshot,
    authorProfile: state.authorProfile,
    // 派生上限
    maxEnergy,
    maxStress,
    // 事件链
    currentChain,
    currentStep,
    stepDepth,
    availableEncounterChain,
    // 行动
    chooseAction,
    publishWork,
    doEmergencyPartTime,
    startEncounter,
    selectOption,
    advance,
    dismissEvent,
    selectEventOption,
    restart,
    // Roguelite 遗产
    legacyProfile,
    settleEnding,
    // CareerEngine：网络作家
    startWriterProject,
    applyWriterStrategy,
    completeActiveWriterProject,
    abandonActiveWriterProject,
    // 灵感与梗系统
    gainInspiration,
    applyInspirationToActiveProject,
    applyMemeHomageToActiveProject,
    // 调试
    debugAddStress,
    debugSetStress,
    debugTriggerBreakdown,
    debugGrantTrait,
    debugStartWriterEventChain,
  }
}

/** 将 effects 对象转为可读片段 */
function effectsToParts(e: EffectShape): string {
  const parts: string[] = []
  if (e.savings) parts.push(`存款 ${e.savings > 0 ? '+' : ''}${e.savings}`)
  if (e.health) parts.push(`健康 ${e.health > 0 ? '+' : ''}${e.health}`)
  if (e.energy) parts.push(`精力 ${e.energy > 0 ? '+' : ''}${e.energy}`)
  if (e.stress) parts.push(`压力 ${e.stress > 0 ? '+' : ''}${e.stress}`)
  if (e.familyApproval)
    parts.push(`父母 ${e.familyApproval > 0 ? '+' : ''}${e.familyApproval}`)
  if (e.influence)
    parts.push(`影响力 ${e.influence > 0 ? '+' : ''}${e.influence}`)
  if (e.fans) parts.push(`粉丝 ${e.fans > 0 ? '+' : ''}${e.fans}`)
  return parts.join('，') || '没有属性变化'
}
