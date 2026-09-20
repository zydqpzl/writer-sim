import { useState } from 'react'
import CreationModal from './components/CreationModal'
import DayActionPanel from './components/DayActionPanel'
import WriterWorkModal from './components/WriterWorkModal'
import EncounterBanner from './components/EncounterBanner'
import EndingModal from './components/EndingModal'
import EventChainModal from './components/EventChainModal'
import EventModal from './components/EventModal'
import GameLog from './components/GameLog'
import LegacySetupModal from './components/LegacySetupModal'
import PlatformEcosystemPanel from './components/PlatformEcosystemPanel'
import AchievementModal from './components/AchievementModal'
import PlayerStatusPanel from './components/PlayerStatusPanel'
import WriterProjectPanel from './components/WriterProjectPanel'
import TopBar from './components/TopBar'
import AssetStoreModal from './components/AssetStoreModal'
import YearSummaryModal from './components/YearSummaryModal'
import { legacyPointsFor } from './data/legacy'
import type { StartingIdentity } from './data/legacy'
import type { WriterProject } from './types/career'
import { isWriterProject } from './types/career'
import type { ActionDef } from './types/game'
import {
  ACTIONS,
  PART_TIME_WARNING_LINE,
  REALITY_PUNCH_THRESHOLD,
  YEAR_LENGTH,
  getEmergencyAction,
} from './data/gameData'
import { PLATFORM_LIST } from './data/platforms'
import { useGame } from './hooks/useGame'

export default function App() {
  const {
    state,
    logs,
    pendingEvent,
    ending,
    pathSnapshot,
    maxEnergy,
    maxStress,
    currentChain,
    currentStep,
    stepDepth,
    availableEncounterChain,
    chooseAction,
    publishWork,
    doEmergencyPartTime,
    startEncounter,
    selectOption,
    advance,
    dismissEvent,
    selectEventOption,
    restart,
    continueToNextYear,
    retireNow,
    legacyProfile,
    settleEnding,
    startWriterProject,
    applyWriterStrategy,
    completeActiveWriterProject,
    abandonActiveWriterProject,
    gainInspiration,
    applyInspirationToActiveProject,
    debugAddStress,
    debugSetStress,
    debugTriggerBreakdown,
    debugStartWriterEventChain,
    debugJumpToYearEnd,
    applyMemeHomageToActiveProject,
    authorProfile,
  } = useGame()

  const activeProject = state.careerProjects.find(
    (p): p is WriterProject =>
      isWriterProject(p) && p.stage !== 'COMPLETED' && p.stage !== 'ABANDONED',
  )

  const [creationOpen, setCreationOpen] = useState(false)
  const [writerWorkOpen, setWriterWorkOpen] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [achievementOpen, setAchievementOpen] = useState(false)
  const [assetStoreOpen, setAssetStoreOpen] = useState(false)
  // 若本地已保存携带卡牌且已有回响，说明上一局已结算但尚未开始新局，优先展示 setup
  const [setupOpen, setSetupOpen] = useState(
    () => legacyProfile.keptCardIds.length > 0 && legacyProfile.totalLegacyPoints > 0,
  )

  // 低频投资/消费动作：住房、装备、培训、保险、公关、身心健康、退休
  const isAssetAction = (a: ActionDef): boolean => {
    if (!a.id) return false
    if (a.id.startsWith('housing_')) return true
    if (a.id.startsWith('eq_')) return true
    if (a.id.startsWith('pr_')) return true
    if (a.id.startsWith('training_')) return true
    if (a.id.startsWith('insurance_')) return true
    if (a.id.startsWith('wellness_')) return true
    if (a.id === 'retire_financial_freedom') return true
    return false
  }

  // 按当前地点、存款条件与已拥有状态过滤主行动
  const availableActions = ACTIONS.filter((a) => {
    const locationOk = !a.location || a.location === state.location
    const savingsOk = !a.requirement?.minSavings || state.stats.savings >= a.requirement.minSavings
    const projectOk =
      !a.requirement?.needsActiveWriterProject || !!activeProject
    // 已拥有的住房、装备、保险不再重复展示（PR 买量可重复）
    const alreadyOwned =
      !!a.id &&
      (a.id === state.housingId ||
        state.ownedEquipmentIds.includes(a.id) ||
        state.activeInsuranceIds.includes(a.id))
    // 封笔隐退仅在拥有顶级住房时出现
    const retireHidden = a.id === 'retire_financial_freedom' && state.housingId !== 'housing_villa'
    // 低频投资动作进资产库，不在主面板展示
    return locationOk && savingsOk && projectOk && !alreadyOwned && !retireHidden && !isAssetAction(a)
  })

  // 资产库动作（含已被过滤掉的已拥有项目，但模态内会再隐藏一次）
  const assetActions = ACTIONS.filter((a) => {
    const locationOk = !a.location || a.location === state.location
    const savingsOk = !a.requirement?.minSavings || state.stats.savings >= a.requirement.minSavings
    const projectOk = !a.requirement?.needsActiveWriterProject || !!activeProject
    const retireHidden = a.id === 'retire_financial_freedom' && state.housingId !== 'housing_villa'
    return isAssetAction(a) && locationOk && savingsOk && projectOk && !retireHidden
  })

  const emergencyAction = getEmergencyAction(state.location)

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200/70">
      <TopBar
        day={state.day}
        yearLength={YEAR_LENGTH}
        slot={state.slot}
        stats={state.stats}
        location={state.location}
        maxEnergy={maxEnergy}
        maxStress={maxStress}
        onEmergency={doEmergencyPartTime}
        onOpenAssetStore={() => setAssetStoreOpen(true)}
        onOpenAchievements={() => setAchievementOpen(true)}
        onToggleDebug={() => setDebugOpen((v) => !v)}
        debugOpen={debugOpen}
      />

      {/* 调试面板：顶栏点🛠展开 */}
      {debugOpen && (
        <div className="mx-auto max-w-6xl px-5 pt-4">
          <div className="card flex flex-col gap-3 p-4 ring-1 ring-rose-200">
            <header className="flex items-center justify-between">
              <div>
                <span className="chip bg-rose-100 text-rose-600">
                  🛠 开发调试面板
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  用于验证压力崩溃事件触发逻辑 & 三选项结算效果。测试完毕可关闭。
                </p>
              </div>
              <div className="text-right text-xs text-slate-400">
                当前 stress:{' '}
                <span className="font-semibold text-slate-700">
                  {state.stats.stress} / 300
                </span>
              </div>
            </header>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => debugAddStress(+50)}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                Stress +50
              </button>
              <button
                type="button"
                onClick={() => debugAddStress(+100)}
                className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200"
              >
                Stress +100
              </button>
              <button
                type="button"
                onClick={() => debugAddStress(+170)}
                className="rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-200"
              >
                Stress +170（从130到300）
              </button>
              <button
                type="button"
                onClick={() => debugSetStress(300)}
                className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-200"
              >
                直接 Stress = 300（触发崩溃）
              </button>
              <button
                type="button"
                onClick={debugTriggerBreakdown}
                className="rounded-lg bg-fuchsia-100 px-3 py-1.5 text-xs font-medium text-fuchsia-700 hover:bg-fuchsia-200"
              >
                🧠 强制弹出崩溃事件（推荐一键测试）
              </button>
              <button
                type="button"
                onClick={() => debugSetStress(0)}
                className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
              >
                Stress 归零（重置）
              </button>
            </div>

            {/* 年度总结调试 */}
            <div className="mt-3 border-t border-slate-200 pt-3">
              <div className="mb-2 text-xs font-semibold text-slate-500">
                📜 年度总结调试
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={debugJumpToYearEnd}
                  className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200"
                >
                  跳至本年末（测试年度总结）
                </button>
              </div>
            </div>

            {/* CareerEngine：网络作家快捷测试 */}
            <div className="mt-3 border-t border-slate-200 pt-3">
              <div className="mb-2 text-xs font-semibold text-slate-500">
                ✍️ CareerEngine / 网络作家测试
              </div>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_LIST.map((platform) => (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => startWriterProject({ platformId: platform.id })}
                    className="rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-200"
                    title={platform.tagline}
                  >
                    在{platform.name}开新书
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => applyWriterStrategy('writer_setup')}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                >
                  爆肝铺垫
                </button>
                <button
                  type="button"
                  onClick={() => applyWriterStrategy('writer_climax')}
                  className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200"
                >
                  爆更发糖
                </button>
                <button
                  type="button"
                  onClick={() => applyWriterStrategy('writer_filler')}
                  className="rounded-lg bg-sky-100 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-200"
                >
                  水字数
                </button>
                <button
                  type="button"
                  onClick={() => applyWriterStrategy('writer_cliffhanger')}
                  className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-200"
                >
                  留钩子
                </button>
                <button
                  type="button"
                  onClick={() => applyWriterStrategy('writer_trope_insert')}
                  className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                >
                  跟风整活
                </button>
                <button
                  type="button"
                  onClick={completeActiveWriterProject}
                  className="rounded-lg bg-brand-100 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-200"
                >
                  完结本书
                </button>
                <button
                  type="button"
                  onClick={abandonActiveWriterProject}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200"
                >
                  太监切书
                </button>
              </div>
            </div>

            {/* 灵感与梗系统测试 */}
            <div className="mt-3 border-t border-slate-200 pt-3">
              <div className="mb-2 text-xs font-semibold text-slate-500">
                💡 灵感与梗系统测试
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => gainInspiration('insp_takeaway_rush')}
                  className="rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-200"
                >
                  +外卖爆单灵感
                </button>
                <button
                  type="button"
                  onClick={() => gainInspiration('insp_dragon_bite')}
                  className="rounded-lg bg-lime-100 px-3 py-1.5 text-xs font-medium text-lime-700 hover:bg-lime-200"
                >
                  +龙猫咬人灵感
                </button>
                <button
                  type="button"
                  onClick={() => gainInspiration('insp_breakdown_vomit')}
                  className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-200"
                >
                  +崩溃吐槽灵感
                </button>
                <button
                  type="button"
                  onClick={() => gainInspiration('insp_hometown_aunt')}
                  className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200"
                >
                  +亲戚逼婚灵感
                </button>
                <button
                  type="button"
                  onClick={() => applyInspirationToActiveProject('insp_takeaway_rush')}
                  className="rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-200"
                >
                  注入：外卖灵感
                </button>
                <button
                  type="button"
                  onClick={() => applyInspirationToActiveProject('insp_dragon_bite')}
                  className="rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-200"
                >
                  注入：龙猫灵感
                </button>
                <button
                  type="button"
                  onClick={() => applyInspirationToActiveProject('insp_breakdown_vomit')}
                  className="rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-200"
                >
                  注入：崩溃灵感
                </button>
              </div>
            </div>

            {/* 网文事件链触发测试 */}
            <div className="mt-3 border-t border-slate-200 pt-3">
              <div className="mb-2 text-xs font-semibold text-slate-500">
                📚 网文事件链触发测试
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => debugStartWriterEventChain('writer_rejection_crisis')}
                  className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-200"
                >
                  触发：拒签危机
                </button>
                <button
                  type="button"
                  onClick={() => debugStartWriterEventChain('writer_blackfan_crisis')}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700"
                >
                  触发：黑粉爆破
                </button>
                <button
                  type="button"
                  onClick={() => debugStartWriterEventChain('writer_fullattendance_crisis')}
                  className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200"
                >
                  触发：全勤危机
                </button>
                <button
                  type="button"
                  onClick={() => debugStartWriterEventChain('writer_peer_roast')}
                  className="rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-200"
                >
                  触发：同行挂炉
                </button>
                <button
                  type="button"
                  onClick={() => debugStartWriterEventChain('writer_anti_piracy')}
                  className="rounded-lg bg-sky-100 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-200"
                >
                  触发：防盗翻车
                </button>
                <button
                  type="button"
                  onClick={() => debugStartWriterEventChain('writer_comment_revolt')}
                  className="rounded-lg bg-fuchsia-100 px-3 py-1.5 text-xs font-medium text-fuchsia-700 hover:bg-fuchsia-200"
                >
                  触发：评论区逼宫
                </button>
              </div>
            </div>

            {/* 跨作品玩梗测试 */}
            <div className="mt-3 border-t border-slate-200 pt-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                🔁 跨作品玩梗测试
                <span className="text-[10px] font-normal text-slate-400">
                  需先完结/太监一本书生成梗
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {state.unlockedMemes.length === 0 ? (
                  <span className="text-xs text-slate-400">暂无已解锁作者梗</span>
                ) : (
                  state.unlockedMemes.map((meme) => (
                    <button
                      key={meme.id}
                      type="button"
                      onClick={() => applyMemeHomageToActiveProject(meme.id)}
                      className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                    >
                      致敬：{meme.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主体：P社式固定视口仪表盘 */}
      <main className="flex-1 overflow-hidden px-4 py-3">
        <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-12">
          {/* 左侧：当前连载（核心面板）+ 作者状态，统一内部滚动 */}
          <aside className="flex h-full flex-col gap-4 overflow-y-auto pr-1 lg:col-span-3">
            <WriterProjectPanel
              project={activeProject}
              logs={logs}
              marketTrend={state.marketTrend}
              authorProfile={authorProfile}
              onOpenWriterWork={() => setWriterWorkOpen(true)}
            />
            <PlayerStatusPanel
              stats={state.stats}
              pathSnapshot={pathSnapshot}
              warningLine={PART_TIME_WARNING_LINE}
              consecutivePartTimeDays={state.consecutivePartTimeDays}
              realityPunchThreshold={REALITY_PUNCH_THRESHOLD}
              inventory={state.inventory}
              maxEnergy={maxEnergy}
              maxStress={maxStress}
            />
          </aside>

          {/* 中间：限时奇遇 + 当前时段核心决策 */}
          <div className="flex h-full flex-col gap-3 overflow-hidden lg:col-span-6">
            {availableEncounterChain && (
              <div className="shrink-0">
                <EncounterBanner
                  chain={availableEncounterChain}
                  day={state.day}
                  actionable={!state.actedThisSlot && !state.partTimeLock}
                  blockHint={
                    state.partTimeLock
                      ? '今日精力被压榨'
                      : state.actedThisSlot
                        ? '本时段已行动'
                        : undefined
                  }
                  onAccept={startEncounter}
                />
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <DayActionPanel
                state={state}
                actions={availableActions}
                emergencyAction={emergencyAction}
                warningLine={PART_TIME_WARNING_LINE}
                realityPunchThreshold={REALITY_PUNCH_THRESHOLD}
                activeProject={activeProject}
                onChoose={chooseAction}
                onStartWork={() => setCreationOpen(true)}
                onOpenWriterWork={() => setWriterWorkOpen(true)}
                onEmergency={doEmergencyPartTime}
                onNext={advance}
              />
            </div>
          </div>

          {/* 右侧：网文江湖 + 游戏日志，内部滚动 */}
          <div className="flex h-full flex-col gap-4 overflow-hidden lg:col-span-3">
            <div className="flex-[55] min-h-0 overflow-hidden">
              <PlatformEcosystemPanel
                npcs={state.platformEcosystem.npcs}
                leaderboards={state.platformEcosystem.leaderboards}
                interactions={state.platformEcosystem.interactions}
                memeTrends={state.platformEcosystem.memeTrends}
                activeProject={activeProject}
              />
            </div>
            <div className="flex-[45] min-h-0 overflow-hidden">
              <GameLog logs={logs} />
            </div>
          </div>
        </div>
      </main>

      {/* 创作工坊弹窗：放入灵感卡牌 + 赌博转化 */}
      {creationOpen && (
        <CreationModal
          inventory={state.inventory}
          onPublish={(idx) => {
            publishWork(idx)
            setCreationOpen(false)
          }}
          onClose={() => setCreationOpen(false)}
        />
      )}

      {/* 网络作家写作工坊：开新书 / 更新连载 / 完本太监 */}
      <WriterWorkModal
        isOpen={writerWorkOpen}
        onClose={() => setWriterWorkOpen(false)}
        activeProject={activeProject}
        platforms={PLATFORM_LIST}
        marketTrend={state.marketTrend}
        inspirations={state.inspirations}
        unlockedMemes={state.unlockedMemes}
        energy={state.stats.energy}
        stress={state.stats.stress}
        maxEnergy={maxEnergy}
        maxStress={maxStress}
        actedThisSlot={state.actedThisSlot}
        writerCareerProfile={state.writerCareerProfile}
        authorProfile={authorProfile}
        onStartProject={(platformId, draft) => {
          startWriterProject({ platformId, draft })
          setWriterWorkOpen(false)
        }}
        onApplyStrategy={(actionId) => {
          applyWriterStrategy(actionId)
          setWriterWorkOpen(false)
        }}
        onInjectInspiration={(inspirationId) => {
          applyInspirationToActiveProject(inspirationId)
          setWriterWorkOpen(false)
        }}
        onHomageMeme={(memeId) => {
          applyMemeHomageToActiveProject(memeId)
          setWriterWorkOpen(false)
        }}
        onCompleteProject={() => {
          completeActiveWriterProject()
          setWriterWorkOpen(false)
        }}
        onAbandonProject={() => {
          abandonActiveWriterProject()
          setWriterWorkOpen(false)
        }}
      />

      {/* 事件链弹窗（进行中） */}
      {currentChain && currentStep && (
        <EventChainModal
          chain={currentChain}
          step={currentStep}
          stepIndex={stepDepth}
          totalSteps={currentChain.maxDepth}
          stats={state.stats}
          onSelect={selectOption}
        />
      )}

      {/* 简单事件弹窗（现实的铁拳 / 精神崩溃等） */}
      <EventModal
        event={pendingEvent}
        onClose={dismissEvent}
        onSelectOption={selectEventOption}
      />

      {/* 成就墙弹窗 */}
      {achievementOpen && (
        <AchievementModal
          unlockedIds={
            new Set([
              ...legacyProfile.unlockedAchievementIds,
              ...state.newUnlockedAchievementIds,
            ])
          }
          onClose={() => setAchievementOpen(false)}
        />
      )}

      {/* 年度总结弹窗 */}
      {state.pendingYearSummary && (
        <YearSummaryModal
          summary={state.pendingYearSummary}
          onContinue={continueToNextYear}
          onRetire={retireNow}
        />
      )}

      {/* 结局弹窗（游戏结束） */}
      {ending && (
        <EndingModal
          ending={ending}
          state={state}
          pathSnapshot={pathSnapshot}
          legacyPointsEarned={legacyPointsFor(ending)}
          totalLegacyPoints={legacyProfile.totalLegacyPoints + legacyPointsFor(ending)}
          onConfirm={(carriedCardId) => {
            settleEnding(carriedCardId)
            setSetupOpen(true)
          }}
        />
      )}

      {/* 低频大额投资面板（住房 / 装备 / 培训 / 保险 / 公关） */}
      <AssetStoreModal
        isOpen={assetStoreOpen}
        onClose={() => setAssetStoreOpen(false)}
        state={state}
        actions={assetActions}
        activeProject={activeProject}
        onChoose={chooseAction}
      />

      {/* 二周目开局设置（结算后或本地有待用携带卡时） */}
      {setupOpen && (
        <LegacySetupModal
          legacyProfile={legacyProfile}
          onStart={({
            identity,
            keptCardIds,
          }: {
            identity: StartingIdentity
            keptCardIds: string[]
          }) => {
            restart({ identity, keptCardIds })
            setSetupOpen(false)
          }}
        />
      )}
    </div>
  )
}
