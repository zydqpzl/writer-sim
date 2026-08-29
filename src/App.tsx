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
import PlayerStatusPanel from './components/PlayerStatusPanel'
import WriterProjectPanel from './components/WriterProjectPanel'
import { legacyPointsFor } from './data/legacy'
import type { StartingIdentity } from './data/legacy'
import type { WriterProject } from './types/career'
import { isWriterProject } from './types/career'
import {
  ACTIONS,
  PART_TIME_WARNING_LINE,
  REALITY_PUNCH_THRESHOLD,
  TOTAL_DAYS,
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
    debugGrantTrait,
    debugStartWriterEventChain,
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
  // 若本地已保存携带卡牌且已有回响，说明上一局已结算但尚未开始新局，优先展示 setup
  const [setupOpen, setSetupOpen] = useState(
    () => legacyProfile.keptCardIds.length > 0 && legacyProfile.totalLegacyPoints > 0,
  )

  // 按当前地点过滤主行动（城市/老家专属行动不混用）
  const availableActions = ACTIONS.filter(
    (a) => !a.location || a.location === state.location,
  )
  const emergencyAction = getEmergencyAction(state.location)

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-100 to-slate-200/70">
      {/* 顶栏 */}
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-lg text-white shadow-soft">
              🐟
            </span>
            <div>
              <h1 className="text-base font-semibold text-slate-800">
                毕业咸鱼模拟器
              </h1>
              <p className="text-xs text-slate-400">
                Freelancer Survival Simulator
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="chip bg-brand-50 text-brand-600">60 天试用</span>
            <span className="chip bg-orange-50 text-orange-600">保命兼职</span>
            <span className="chip bg-violet-50 text-violet-600">事件链奇遇</span>
            <button
              type="button"
              onClick={() => setDebugOpen((v) => !v)}
              className={[
                'chip transition-colors',
                debugOpen
                  ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
              ].join(' ')}
            >
              {debugOpen ? '🛠 Debug ON' : '🛠 Debug'}
            </button>
          </div>
        </div>
      </header>

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

      {/* 主体 */}
      <main className="mx-auto max-w-6xl px-5 py-6">
        {availableEncounterChain && (
          <div className="mb-5">
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
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* 左侧：玩家状态栏 + 灵感卡牌背包 + 当前作品 */}
          <aside className="flex flex-col gap-5 lg:col-span-3">
            <PlayerStatusPanel
              stats={state.stats}
              day={state.day}
              totalDays={TOTAL_DAYS}
              location={state.location}
              pathSnapshot={pathSnapshot}
              warningLine={PART_TIME_WARNING_LINE}
              consecutivePartTimeDays={state.consecutivePartTimeDays}
              realityPunchThreshold={REALITY_PUNCH_THRESHOLD}
              inventory={state.inventory}
              maxEnergy={maxEnergy}
              maxStress={maxStress}
            />
            <WriterProjectPanel
              project={activeProject}
              logs={logs}
              marketTrend={state.marketTrend}
              authorProfile={authorProfile}
            />
          </aside>

          {/* 中间：每日行动选择 */}
          <div className="lg:col-span-6">
            <DayActionPanel
              state={state}
              totalDays={TOTAL_DAYS}
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

          {/* 右侧：游戏日志 + 网文江湖，桌面固定高度内部滚动，避免与主内容重叠 */}
          <div className="flex flex-col gap-5 lg:col-span-3 lg:sticky lg:top-20 lg:h-[calc(100vh-9rem)] lg:min-h-[480px] lg:overflow-hidden">
            <div className="h-[420px] lg:h-auto lg:flex-[45] lg:min-h-0">
              <GameLog logs={logs} />
            </div>
            <div className="min-h-[360px] lg:flex-[55] lg:min-h-0">
              <PlatformEcosystemPanel
                npcs={state.platformEcosystem.npcs}
                leaderboards={state.platformEcosystem.leaderboards}
                interactions={state.platformEcosystem.interactions}
                memeTrends={state.platformEcosystem.memeTrends}
                activeProject={activeProject}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="mx-auto max-w-6xl px-5 pb-8 pt-2 text-center text-xs text-slate-400">
        框架演示 · React + Tailwind CSS · 事件链 + 灵感卡牌
      </footer>

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
