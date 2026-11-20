# B3-B 自动保存实施前置审查报告

> 只读分析，不修改任何文件。所有结论基于 `src/hooks/useGame.ts`、`src/App.tsx`、`src/save/*`、`src/types/game.ts`、`src/data/legacy.ts` 真实源码。

---

## 1. 当前真实源码结构与调用关系

### 1.1 存档模块分层

```
src/save/
├── saveTypes.ts       # GameSave / SaveEventChainState / 结果类型 / 常量
├── saveValidator.ts   # 结构与类型校验（validateGameSave）
├── saveSerializer.ts  # JSON 序列化/反序列化 + 版本检查
├── saveStorage.ts     # localStorage 读写（两步法写入）
└── index.ts           # 统一出口
```

**底层 API 现状**（B3-A 已接入）：
- `writeSave(save: GameSave): SaveWriteResult` — 两步法写入（临时 key → 回读校验 → 主 key → 删临时）
- `loadSave(): SaveLoadResult` — 主 key → 临时 key 回退策略
- `hasSave(): boolean` — 有效性检查
- `deleteSave(): SaveWriteResult` — 同时删主/临时 key

### 1.2 游戏状态分散现状

`useGame()` hook 内部存在 **9 个独立的 React state 变量** + **2 个模块级计数器**，并非单一状态树：

| 状态变量 | 类型 | 是否在 GameSave 中 | 说明 |
|---|---|---|---|
| `state` | `GameState` | ✅ `state` 字段 | 主游戏状态，86+ 字段 |
| `logs` | `LogEntry[]` | ✅ `logs` 字段 | 游戏日志数组 |
| `pendingEvent` | `GameEvent \| null` | ✅ `pendingEvent` 字段 | 弹窗事件 |
| `ending` | `Ending \| null` | ⚠️ 仅 `endingId` | 结局对象是运行时从静态配置重建 |
| `runId` | `string` | ✅ `runId` 字段 | 本局唯一标识 |
| `bootStatus` | `BootStatus` | ❌ 不保存 | 启动状态（纯运行时） |
| `currentChain` | `EventChain \| null` | ⚠️ 仅 `eventChain.chainId` | 事件链对象是运行时重建 |
| `currentStepId` | `string \| null` | ✅ `eventChain.stepId` | 事件链当前步骤 |
| `stepDepth` | `number` | ✅ `eventChain.stepDepth` | 事件链深度 |
| `logIdSeed` | `number`（模块级） | ✅ `logIdSeed` 字段 | 日志 ID 计数器 |
| `eventIdSeed` | `number`（模块级） | ✅ `eventIdSeed` 字段 | 事件 ID 计数器 |

**模块级变量风险**：`logIdSeed` 和 `eventIdSeed` 定义在 `useGame.ts` 顶层（第 109-110 行），是**模块级可变变量**，不属于 React state。B3-A 启动时通过赋值恢复（第 550-551 行），但它们不是 React 状态，不会触发重渲染，也不参与状态一致性管理。

### 1.3 App.tsx UI 状态（纯前端，不存档）

以下状态仅控制弹窗开关与临时错误显示，**绝对不应写入存档**：

```
creationOpen, writerWorkOpen, debugOpen, achievementOpen, assetStoreOpen
setupOpen, pendingProfession, careerSetupOpen
settleError, restartError, dismissError
```

这些状态均在 `App.tsx` 内部，与游戏逻辑无关。

### 1.4 遗产系统（跨局持久化，独立于本局存档）

`LegacyProfile` 存储在**独立的 localStorage key** 中（由 `saveLegacyProfile` / `loadLegacyProfile` 管理，key 未在本次审查范围内确认）。

关键幂等保护：`settledRunIds` 数组记录已结算的 `runId`，防止重复结算。

---

## 2. 完整存档快照字段清单

### 2.1 GameState 字段逐项核对

以下字段全部在 `GameState` 接口中定义，且均通过 `saveValidator` 的 `validateGameState` 校验：

| 字段 | 类型 | 校验覆盖 | 启动恢复 | 备注 |
|---|---|---|---|---|
| `day` | `number` | ✅ 数字校验 | ✅ | 当前天数 |
| `slot` | `TimeSlot` | ✅ 枚举白名单 | ✅ | morning/afternoon/evening |
| `professionType` | `ProfessionType` | ✅ 字符串校验 | ✅ | WRITER/UP_HOST/FILM_CREATOR |
| `location` | `PlayerLocation` | ✅ 字符串校验 | ✅ | city/hometown |
| `stats.savings` | `number` | ✅ 7 字段全校验 | ✅ | 存款 |
| `stats.health` | `number` | ✅ | ✅ | 健康 |
| `stats.energy` | `number` | ✅ | ✅ | 精力 |
| `stats.stress` | `number` | ✅ | ✅ | 压力 |
| `stats.familyApproval` | `number` | ✅ | ✅ | 父母满意度 |
| `stats.influence` | `number` | ✅ | ✅ | 影响力 |
| `stats.fans` | `number` | ✅ | ✅ | 粉丝数 |
| `actedThisSlot` | `boolean` | ✅ | ✅ | 本时段是否已行动 |
| `partTimeLock` | `boolean` | ✅ | ✅ | 今日兼职锁定 |
| `workedToday` | `boolean` | ✅ | ✅ | 今日是否主业创作 |
| `consecutivePartTimeDays` | `number` | ✅ | ✅ | 连续兼职天数 |
| `totalPartTimeDays` | `number` | ✅ | ✅ | 累计兼职天数 |
| `realityPunchTriggered` | `boolean` | ✅ | ✅ | 现实铁拳是否触发 |
| `availableEncounter` | `string \| null` | ✅ 可空字符串 | ✅ | 今日限时奇遇 |
| `inventory` | `InspirationCard[]` | ✅ 数组存在性 | ✅ | 灵感卡牌背包 |
| `activeTraits` | `StatusTrait[]` | ✅ 数组存在性 | ✅ | 状态特质列表 |
| `pathScores` | `Record<LifePath, number>` | ✅ 对象存在性 | ✅ | 人生路线倾向分 |
| `subcultureReputation` | `number` | ✅ | ✅ | 亚文化声望 |
| `examProgress` | `number` | ✅ | ✅ | 考编/求职进度 |
| `careerProjects` | `CareerProject[]` | ✅ 深度校验（id/type/title/phase/三维质量/progress等） | ✅ | 主业项目列表 |
| `inspirations` | `WritingInspiration[]` | ✅ 数组存在性 | ✅ | 写作灵感背包 |
| `unlockedMemes` | `AuthorMeme[]` | ✅ 数组存在性 | ✅ | 已解锁作者梗 |
| `authorRank` | `AuthorRank` | ✅ 字符串校验 | ✅ | 作者等级 |
| `platformEcosystem` | `PlatformEcosystemState` | ✅ 5 个子数组存在性 | ✅ | 平台生态（NPC/榜单/互动/传闻/梗趋势） |
| `marketTrend` | `MarketTrend` | ✅ 对象存在性 | ✅ | 市场流行趋势 |
| `authorProfile` | `AuthorProfile` | ✅ 深度校验（penName/五维技能/背景/进化阶段） | ✅ | 作者档案 |
| `writerCareerProfile` | `WriterCareerProfile` | ✅ 深度校验（完本/太监/题材精通/风格特质/平台生涯） | ✅ | 作家生涯档案 |
| `housingId` | `string` | ✅ 字符串校验 | ✅ | 当前住房 |
| `ownedEquipmentIds` | `string[]` | ✅ 数组存在性 | ✅ | 已拥有装备 |
| `activeInsuranceIds` | `string[]` | ✅ 数组存在性 | ✅ | 生效保险 |
| `unlockedAuthorTitleIds` | `string[]` | ✅ 数组存在性 | ✅ | 已解锁江湖称号 |
| `newUnlockedAchievementIds` | `string[]` | ✅ 数组存在性 | ✅ | 本局新解锁成就 |
| `leaveTokens` | `number` | ✅ | ✅ | 请假券 |
| `leaveUsedToday` | `boolean` | ✅ | ✅ | 今日是否请假 |
| `waterModeActive` | `boolean` | ✅ | ✅ | 水字数模式 |
| `waterWordsUsedToday` | `number` | ✅ | ✅ | 今日水字数次数 |
| `storedDrafts` | `number` | ✅ | ✅ | 存稿数量 |
| `draftsStoredToday` | `number` | ✅ | ✅ | 今日存稿次数 |
| `routineLeaveActive` | `boolean` | ✅ | ✅ | 例行假期生效中 |
| `leaveDelaySlots` | `number` | ✅ | ✅ | 失联请假延迟 |
| `pendingYearSummary` | `YearSummary \| null` | ✅ 深度校验（年份/起止天/属性快照/核心统计/大事件/预告） | ✅ | 待处理年度总结 |
| `yearStartSnapshot` | `{day, stats, writerCareerProfile, totalWordCount}` | ✅ 深度校验 | ✅ | 年初状态快照 |

**结论：GameState 内全部字段均已在存档结构中，且启动时完整恢复。**

### 2.2 GameSave 根级字段

| 字段 | 类型 | 校验 | 启动恢复 | 备注 |
|---|---|---|---|---|
| `schemaVersion` | `number` | ✅ 正安全整数 | ✅ | 结构版本 |
| `gameVersion` | `string` | ✅ | ✅ | 游戏版本 |
| `savedAt` | `number` | ✅ 有效时间戳 | ✅ | 存档时间 |
| `runId` | `string` | ✅ 非空字符串 | ✅ | 本局唯一 ID |
| `state` | `GameState` | ✅ 深度校验 | ✅ | 主状态 |
| `logs` | `LogEntry[]` | ✅ 全字段校验（id/day/slot/kind/text） | ✅ | 游戏日志 |
| `eventChain` | `SaveEventChainState` | ✅ 一致性校验 | ✅ | 事件链运行态 |
| `pendingEvent` | `GameEvent \| null` | ✅ 非 null 时深度校验 | ✅ | 弹窗事件 |
| `endingId` | `string \| null` | ✅ | ⚠️ 间接恢复 | 结局 ID（运行时查 ENDINGS 表重建对象） |
| `logIdSeed` | `number` | ✅ >=1 | ✅ | 日志 ID 种子 |
| `eventIdSeed` | `number` | ✅ >=1 | ✅ | 事件 ID 种子 |

### 2.3 不保存的运行时状态清单

以下状态**不应**写入存档，属于纯运行时或 UI 状态：

| 状态 | 位置 | 原因 |
|---|---|---|
| `bootStatus` | useGame | 启动时重新计算，不持久化 |
| `startSetup` | useGame | 新局设置参数，不持久化 |
| `legacyProfile` | useGame | 跨局遗产，独立存储（非本局存档范畴） |
| `settleLockRef` | useGame | 结算防重入锁，ref 类型，运行时 |
| `currentChain`（对象） | useGame | 由 chainId 从静态配置重建 |
| `ending`（对象） | useGame | 由 endingId 从静态配置重建 |
| `currentStep`（派生） | useGame | useMemo 派生，由 currentStepId 计算 |
| `pathSnapshot`（派生） | useGame | useMemo 派生 |
| `maxEnergy` / `maxStress`（派生） | useGame | useMemo 派生 |
| `availableEncounterChain`（派生） | useGame | useMemo 派生 |
| 所有弹窗 open 状态 | App.tsx | 纯 UI 状态 |
| `pendingProfession` | App.tsx | UI 流程状态，存独立 localStorage key |
| `settleError` / `restartError` / `dismissError` | App.tsx | 临时错误提示 |

### 2.4 只恢复但不保存的字段？

**结论：未发现只恢复不保存的字段。**

B3-A 的恢复逻辑（`bootInit` useMemo）中：
- `state` ← `save.state`（完整）
- `logs` ← `save.logs`（完整）
- `pendingEvent` ← `save.pendingEvent`（完整）
- `ending` ← `save.endingId` → 查 `ENDING_BY_ID` 重建
- `runId` ← `save.runId`
- `currentChain` / `currentStepId` / `stepDepth` ← `save.eventChain` → 查 `EVENT_CHAINS` 重建
- `logIdSeed` ← `save.logIdSeed`（赋值给模块级变量）
- `eventIdSeed` ← `save.eventIdSeed`（赋值给模块级变量）

所有字段均有对应的保存位置和恢复逻辑。

---

## 3. 推荐的自动保存机制

### 3.1 核心问题分析

当前游戏状态分散在 9 个 React state + 2 个模块级变量中，这给集中式快照带来以下挑战：

1. **状态更新不同步**：一个用户操作可能触发多次 `setState`（如 `advance` 中先 `setState` 再 `setEnding` 再 `log`），如果在中间状态保存，会得到不完整快照。
2. **闭包陈旧状态**：`useCallback` 依赖 `state`，如果在回调内触发保存，读到的是闭包捕获的旧 `state`。
3. **模块级变量风险**：`logIdSeed` / `eventIdSeed` 不是 React state，更新是同步的（`logIdSeed++`），但 React state 更新是异步的（批处理）。可能出现种子已自增但日志还没进 `logs` 数组的情况。
4. **重复写入**：短时间内多次状态变化可能触发多次写入，浪费性能。

### 3.2 方案比较

| 方案 | 思路 | 优点 | 缺点 |
|---|---|---|---|
| **A. 集中式 reducer** | 所有状态合并到一个 useReducer，每次 action 后自动保存 | 状态原子性最好，天然一致 | 改动量极大，几乎重构整个 useGame |
| **B. 关键节点手动调用** | 在 advance / chooseAction 等关键函数末尾手动组装快照并保存 | 控制精确，只在有意义的时刻保存 | 需要修改多处函数，容易遗漏 |
| **C. useEffect 监听 state** | 用 useEffect 监听 state 变化，变化后防抖保存 | 接入简单，自动覆盖所有状态变化 | 可能保存到中间状态；闭包问题导致读到旧的 logs/ending 等 |
| **D. useRef 同步快照 + 防抖** | 维护一个 ref 保存完整快照，每次 setState 后同步更新 ref，防抖写入 | 避免闭包问题；总是最新状态 | 需要确保 ref 更新与 state 更新同步 |

### 3.3 推荐方案：关键节点手动调用 + 串行写入队列

**推荐方案：B（关键节点手动调用）+ 串行写入队列**

**理由**：

1. **状态一致性最可靠**：只在"一个完整动作结束"时保存，此时所有相关 state 都已更新完成。
2. **改动量可控**：不需要重构 useGame 的状态结构。
3. **语义清晰**：玩家操作 → 状态变化 → 保存存档，这是自然的因果顺序。
4. **避免无效写入**：不会因为调试面板、UI 状态变化等触发不必要的保存。

**保存触发点（建议）**：

| 触发时机 | 所在函数 | 说明 |
|---|---|---|
| 时段推进完成 | `advance` 末尾（每次 setState 后） | 最核心的保存点 |
| 行动执行完成 | `chooseAction` 末尾 | 玩家行动后保存 |
| 事件链选择后 | `selectOption` 末尾 | 事件链分支选择后保存 |
| 弹窗事件选项选择后 | `selectEventOption` 末尾 | 简单事件选择后保存 |
| 写作操作后 | `startWriterProject` / `applyWriterStrategy` 等 | CareerEngine 操作后保存 |
| 年度总结确认后 | `continueToNextYear` / `retireNow` | 跨越年度后保存 |
| 奇遇开始后 | `startEncounter` | 接受奇遇后保存 |

**串行写入队列设计**：

```
// 伪代码，仅说明思路
let saveQueue: Promise<void> = Promise.resolve()
let pendingSave: GameSave | null = null
let isSaving = false

function requestSave(snapshot: GameSave) {
  pendingSave = snapshot  // 总是保留最新快照
  if (isSaving) return    // 正在写入则合并
  flushSaveQueue()
}

async function flushSaveQueue() {
  if (!pendingSave || isSaving) return
  isSaving = true
  const snapshot = pendingSave
  pendingSave = null
  const result = writeSave(snapshot)
  isSaving = false
  if (pendingSave) flushSaveQueue()  // 期间又有新的，继续写
  return result
}
```

**为什么不用防抖（debounce）**：
- 防抖会引入延迟，玩家操作后立即关闭页面可能丢失存档。
- 玩家操作频率不高（最多每秒 1-2 次点击），串行队列 + 合并已足够。
- `writeSave` 本身是同步的（localStorage 同步 API），单次写入耗时 < 5ms。

### 3.4 快照组装函数

需要一个纯函数将分散的状态组装成 `GameSave`：

```typescript
function buildSaveSnapshot(
  state: GameState,
  logs: LogEntry[],
  pendingEvent: GameEvent | null,
  endingId: string | null,
  runId: string,
  currentChain: EventChain | null,
  currentStepId: string | null,
  stepDepth: number,
  logIdSeed: number,
  eventIdSeed: number,
): GameSave {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    gameVersion: GAME_VERSION,
    savedAt: Date.now(),
    runId,
    state,
    logs,
    eventChain: {
      chainId: currentChain?.id ?? null,
      stepId: currentStepId,
      stepDepth,
    },
    pendingEvent,
    endingId,
    logIdSeed,
    eventIdSeed,
  }
}
```

**注意**：`logIdSeed` 和 `eventIdSeed` 是模块级变量，读取时需要小心时序——确保在所有 `log()` / `emitEvent()` 调用完成后再读取。

---

## 4. 游戏生命周期状态表

### 4.1 各阶段自动保存许可

| 阶段 | bootStatus | ending | pendingYearSummary | 允许自动保存 | 说明 |
|---|---|---|---|---|---|
| 1. 初始占位状态 | corrupted/incompatible/read_error/already_settled | - | - | ❌ 禁止 | 存档异常状态，保存会覆盖损坏的原始数据 |
| 2. 选择身份/职业 | new_game | null | null | ❌ 禁止 | 尚未正式开始游戏，没有有效 runId 对应的游戏进度 |
| 3. 正式开始新局 | new_game → 进入游戏 | null | null | ✅ 允许 | `restart()` 完成后，游戏正式开始 |
| 4. 正常游戏过程 | restored / new_game（游戏中） | null | null | ✅ 允许 | 主要保存场景 |
| 5. 重新开始（过渡） | 调用 restart() 期间 | - | - | ❌ 禁止 | `restart()` 先删旧存档，再设置新状态，此过程中不应保存 |
| 6. 结局触发 | restored/new_game | 非 null | - | ⚠️ 谨慎 | 结局后玩家可能还想继续看状态，但保存的是"已结局"状态 |
| 7. 遗产结算中 | 结算流程 | 非 null | - | ❌ 禁止 | 结算涉及 runId 幂等判断，保存会干扰结算状态 |
| 8. 结算完成 | new_game | null | - | ❌ 禁止 | 已切换到 new_game，等待下一局开始 |
| 9. 刷新页面重新进入 | restored | - | - | ✅ 允许 | 恢复后继续游戏，正常保存 |

### 4.2 关键生命周期事件与存档交互

#### 4.2.1 新局开始（`restart()`）

流程（第 687-785 行）：
1. `deleteSave()` — 删除旧存档（**失败则中止，不创建新局**）
2. 计算新局初始状态
3. 消耗携带卡（如有），写入遗产档案
4. 重置 `logIdSeed` / `eventIdSeed` 为 1
5. 设置所有 React state
6. 生成新 `runId`

**自动保存注意点**：
- `restart()` 调用后，新状态设置是异步批处理的，**不应在 restart 内部或紧随其后触发保存**。
- 新局第一回合玩家行动后（第一次 `chooseAction` 或 `advance`），才是首次保存的合理时机。

#### 4.2.2 结局触发

结局有两种触发路径：
1. `advance()` 中 `checkGameEnding()` → `setEnding(midEnding)`（第 2736-2787 行）
2. `chooseAction()` 中退休 → `setEnding(ending)`（第 1206-1218 行）

**结局后自动保存的争议**：
- 保存已结局状态可以防止刷新后丢失结局画面
- 但已结局的存档在刷新后会被恢复为"已结局"状态，玩家需要重新走结算流程
- B3-A 启动恢复逻辑（第 542 行）会恢复 ending，所以**结局状态保存是安全的**

**建议**：结局触发时保存一次，标记为"已结局"存档。

#### 4.2.3 遗产结算（`settleEnding()`）

流程（第 812-860 行）：
1. 检查 `settleLockRef` 防重入
2. 调用 `settleLegacy()` 计算新遗产档案
3. 若已结算（`already_settled`）：关闭弹窗，切换为 `new_game`
4. 若首次结算：写入遗产档案 → 成功则更新内存、关闭弹窗、切换为 `new_game`

**自动保存注意点**：
- 结算完成后 `bootStatus` 变为 `new_game`，此时**不应自动保存**（没有进行中的游戏）。
- 结算前的结局状态已保存，无需担心数据丢失。

#### 4.2.4 旧局被重新恢复的风险

**风险场景**：玩家结算后立即刷新页面，存档中仍是旧局的结局状态。

**现有防护**：
- B3-A 启动时检查 `legacy.settledRunIds.includes(save.runId)`（第 519 行）
- 已结算的 runId 会返回 `already_settled` 状态，不恢复游戏

**结论**：防护机制已存在。但需注意**自动保存不应在结算完成后向存档写入任何内容**，否则可能产生"已结算但存档里还有游戏状态"的混淆（虽然 runId 检查仍能挡住）。

#### 4.2.5 遗产重复结算的风险

**现有防护**：
- `settleLegacy()` 幂等检查：`profile.settledRunIds.includes(runId)`（legacy.ts 第 295 行）
- `settleEnding()` 中的 `settleLockRef` 防重入锁（第 661 行 / 第 822 行）

**结论**：双重防护已到位。自动保存不会影响这个机制，因为结算修改的是遗产档案（独立 key），不是本局存档。

---

## 5. 保存失败处理方案

### 5.1 writeSave() 失败场景分析

`writeSave()` 可能返回 `error` 的情况：

| 失败步骤 | 原因 | 主存档状态 | 临时存档状态 |
|---|---|---|---|
| 结构校验失败 | 数据异常 | 不变 | 无 |
| 序列化失败 | JSON.stringify 抛异常 | 不变 | 无 |
| 临时 key 写入失败 | localStorage 配额满 / 不可用 | 不变 | 无 |
| 回读失败 | 读不到刚写入的数据 | 不变 | 可能有残留 |
| 回读数据不一致 | 存储损坏 | 不变 | 已清理 |
| 回读数据不合法 | 反序列化失败 | 不变 | 已清理 |
| 主 key 写入失败 | 配额满 / 不可用 | 不变（旧的） | 有有效数据 |

**关键设计**：`writeSave` 采用两步法，任何步骤失败都不会破坏已有主存档。

### 5.2 失败后行为设计

| 方面 | 方案 |
|---|---|
| **内存状态** | 完全保留，不回滚。玩家操作已生效，只是没存盘。 |
| **原有存档** | 保留不变（两步法保证）。玩家刷新页面会回到上一次成功保存的状态。 |
| **玩家反馈** | 顶部状态栏显示"⚠️ 保存失败"的提示，hover 显示错误详情。不使用模态弹窗打断游戏。 |
| **重试策略** | 下次有保存请求时自动重试（合并到下一次写入）。不做定时重试（避免连续失败反复写入）。 |
| **连续失败保护** | 维护失败计数：连续 3 次失败后，停止自动保存，改为手动提示。显示"自动保存已暂停，请检查浏览器存储设置"。 |
| **玩家操作提示** | 玩家尝试关闭页面前，若有未保存的进度，使用 `beforeunload` 事件提示（但不强制拦截）。 |

### 5.3 失败计数与恢复机制

```
失败计数规则：
- 每次 writeSave 返回 error → failCount++
- 每次 writeSave 返回 success → failCount = 0
- failCount >= 3 → 暂停自动保存，显示持续警告
- 暂停后，玩家可通过"重试保存"按钮手动触发一次
  - 成功 → 恢复自动保存，failCount = 0
  - 失败 → 保持暂停
```

---

## 6. 潜在风险及其规避方式

### 6.1 风险：状态不同步导致保存不完整

**描述**：一个玩家操作触发多次 `setState`，如果在中间状态保存，快照不完整。

**示例**：`advance()` 中的日结算流程会先 `setState(nextState)`，如果检测到网文事件，再 `startWriterEventChain()` 内部调用 `setCurrentChain()` / `setCurrentStepId()` / `setStepDepth()` / 又一次 `setState()`（修改 careerProjects）。如果自动保存在第一次 `setState` 后触发，事件链状态就没保存上。

**规避**：
- 采用"关键节点手动调用"方案，只在函数执行末尾、所有 setState 都已调用后才触发保存。
- 对于 React 批处理的情况（同一事件循环内多次 setState），使用 `setTimeout(..., 0)` 或 `queueMicrotask` 延迟到微任务末尾，确保所有 state 更新都已提交。
- **更稳妥的方式**：直接在函数内部用已经计算好的最终状态值组装快照，不依赖 React state 的最新值。例如 `advance()` 中 `nextState` 已经是完整的最终状态，可以直接用它来构建存档。

### 6.2 风险：闭包读取旧状态

**描述**：`useCallback` 捕获的 `state` / `logs` 等是创建时的值，不是最新值。

**规避**：
- 使用 `useRef` 保存最新的完整快照引用，每次 state 变化时同步更新 ref。
- 保存时从 ref 读取，不从闭包读取。
- 或者：保存触发点总是在已经拥有最新状态的代码路径中（如 `advance` 末尾，`nextState` 是刚计算好的）。

### 6.3 风险：较早的异步写入覆盖较新的存档

**描述**：如果写入是异步的（虽然 localStorage 本身是同步的，但如果加了防抖/延迟），可能出现后发起的写入先完成，先发起的写入后完成，导致旧数据覆盖新数据。

**规避**：
- 使用**串行写入队列**（见 3.3 节），保证写入按顺序执行。
- 合并策略：队列中只有一个"待写入"位置，总是保留最新快照，丢弃中间状态。

### 6.4 风险：模块级变量与 React state 不一致

**描述**：`logIdSeed` 和 `eventIdSeed` 是模块级变量，同步自增。而 `logs` 和 `pendingEvent` 是 React state，异步批处理更新。可能出现种子已经 +1 但 state 还没更新的情况。

**示例**：
```
log() 被调用 → logIdSeed 立即+1 → setLogs([...prev, { id: logIdSeed-1 }])
如果此时保存快照，logIdSeed 已经是新值，但 logs 数组还没包含新条目
```

**实际分析**：
- `log()` 函数（第 862-867 行）：`setLogs((prev) => [...prev, { id: logIdSeed++, ... }])`
- `logIdSeed++` 是在 `setLogs` 的 updater 函数内部执行的，**不是在外部**。
- 等等，让我再看一下...实际上第 864 行：`setLogs((prev) => [...prev, { id: logIdSeed++, day, slot, kind, text }])`
- 这里 `logIdSeed++` 在 updater 函数内，而 updater 是 React 批处理时同步调用的。
- 但如果保存是在 `setLogs` 之后、但 React 还没执行 updater 之前触发的，就会有问题。

**实际上**：React 18 的自动批处理意味着 `setState` 不会立即更新 state，而是进入队列。updater 函数在渲染时执行。

**规避**：
- 保存快照时，`logIdSeed` 的值应该是 `logs` 数组中最大 id + 1（即下一个可用 id）。
- 可以从 `logs` 数组推算：`Math.max(...logs.map(l => l.id), 0) + 1`。
- 但 saveTypes.ts 第 68-70 行说明了显式保存的原因："避免极端情况下的重复"、"日志裁剪后种子丢失"。
- **建议**：构建快照时，以 `Math.max(logIdSeed, maxLogId + 1)` 作为最终种子值，取两者较大值，确保单调递增。

### 6.5 风险：结局后重复结算

**描述**：如果结局状态被自动保存，玩家刷新页面后会恢复到"已结局"状态，可能再次走结算流程。

**规避**：
- 现有机制已防护：`settledRunIds` 幂等检查。
- 但需注意：恢复后的 `ending` 状态会显示结局弹窗，玩家点击确认后调用 `settleEnding()`，`settleLegacy()` 会返回 `already_settled`，然后切换为 `new_game`。
- 这个流程是安全的，不会重复发放遗产。
- **优化建议**：如果恢复时发现 `endingId` 非空且 `runId` 已结算，可以直接切换为 `new_game`，不显示结局弹窗。

### 6.6 风险：存档体积膨胀

**描述**：`logs` 数组会持续增长，`platformEcosystem.rumors` 和 `interactions` 虽然有裁剪（`.slice(-20)` / `.slice(-30)`），但日志没有裁剪机制。

**估算**：假设 60 天 × 3 时段 × 平均 5 条日志 = 900 条，每条约 100 字符 ≈ 90KB JSON。加上其他状态，总存档约 150-200KB。localStorage 通常有 5MB 限制，足够。

**长期风险**：如果游戏支持多年度（如 5 年 = 300 天），日志可能达到 4500 条 ≈ 450KB。仍在可接受范围内。

**建议**：B3-B 阶段不需要处理日志裁剪，但可预留裁剪接口。

---

## 7. B3-B 最小修改文件清单

| 文件 | 修改内容 | 改动量估计 |
|---|---|---|
| `src/hooks/useGame.ts` | 1. 引入 `writeSave` 和相关类型<br>2. 添加保存队列 ref 和失败计数 ref<br>3. 添加 `requestSave()` 内部函数<br>4. 添加 `buildSaveSnapshot()` 辅助函数<br>5. 在关键节点调用 `requestSave()`<br>6. 暴露保存状态（失败计数、是否暂停）给 UI | 中（约 80-120 行新增） |
| `src/App.tsx` 或 `src/components/TopBar.tsx` | 添加保存状态指示器（成功/失败/暂停） | 小（约 20-30 行） |
| `src/save/saveStorage.ts` | 可能不需要修改 | 无 |
| `src/save/saveTypes.ts` | 可能不需要修改 | 无 |
| `src/save/saveValidator.ts` | 可能不需要修改 | 无 |

**不需要修改的文件**：
- 所有 `src/save/*` 文件 — 底层 API 已完备
- `src/types/game.ts` — 状态定义已完整
- `src/data/legacy.ts` — 遗产系统独立运作
- 所有 `src/components/*` — 仅可能修改 TopBar 的提示显示

---

## 8. 修改顺序与每一步的验收标准

### 步骤 1：添加快照组装函数与保存队列基础设施

**修改文件**：`src/hooks/useGame.ts`

**内容**：
- 引入 `writeSave`、`GameSave`、`SAVE_SCHEMA_VERSION`、`GAME_VERSION`
- 添加 `saveQueueRef` / `pendingSaveRef` / `isSavingRef` / `saveFailCountRef`
- 添加 `buildSaveSnapshot()` 函数
- 添加 `requestSave()` 内部函数

**验收标准**：
- [ ] `buildSaveSnapshot` 能正确组装所有字段
- [ ] `requestSave` 串行写入，合并重复请求
- [ ] 连续失败 3 次后暂停自动保存
- [ ] 保存成功后失败计数清零
- [ ] 不影响现有游戏逻辑

### 步骤 2：在核心保存点接入自动保存

**修改文件**：`src/hooks/useGame.ts`

**优先级顺序**：

1. **`advance` 函数末尾**（最核心，覆盖每日/每时段推进）
2. **`chooseAction` 函数末尾**（玩家主动行动）
3. **`selectOption` 函数末尾**（事件链选择）
4. **`selectEventOption` 函数末尾**（简单事件选择）
5. **`startEncounter` 函数末尾**（接受奇遇）
6. **`continueToNextYear` / `retireNow`**（年度总结后）
7. **写作相关函数**（`startWriterProject` / `applyWriterStrategy` / `completeActiveWriterProject` / `abandonActiveWriterProject`）
8. **结局触发时**（`setEnding` 之后保存一次）

**验收标准**：
- [ ] 每次时段推进后，localStorage 中有最新存档
- [ ] 每次行动后，存档已更新
- [ ] 事件链选择后，chainId/stepId/stepDepth 已保存
- [ ] 结局触发后，endingId 已保存
- [ ] 刷新页面后能正确恢复到保存时的状态
- [ ] 关闭页面后重新打开能正确恢复

### 步骤 3：添加保存状态 UI 提示

**修改文件**：`src/components/TopBar.tsx` 或 `src/App.tsx`

**内容**：
- 显示保存状态图标（保存中 / 成功 / 失败 / 暂停）
- 失败时 hover 显示错误信息
- 暂停时提供"重试保存"按钮

**验收标准**：
- [ ] 正常保存时不显示干扰性提示
- [ ] 保存失败时醒目提示
- [ ] 连续失败后显示暂停状态和重试按钮
- [ ] 不影响游戏主界面布局

### 步骤 4：边界情况处理

**修改文件**：`src/hooks/useGame.ts`

**内容**：
- `restart()` 期间禁止保存（重置失败计数）
- `dismissSaveError()` 后不自动保存
- `settleEnding()` 结算完成后不自动保存
- `bootStatus` 为异常状态时不自动保存

**验收标准**：
- [ ] 新局开始时旧存档已被删除，新存档在第一次行动后才创建
- [ ] 结算完成后不会写入新的存档
- [ ] 存档异常状态下不会覆盖原始损坏数据

### 步骤 5：集成测试

**验收标准**：
- [ ] 正常游戏流程：行动 → 推进 → 事件链 → 结局，每一步都能正确保存和恢复
- [ ] 快速连续操作：短时间内多次行动，不会产生写入竞态
- [ ] 保存失败模拟：localStorage 配额满时正确降级
- [ ] 新局开始：旧存档被正确删除，新局进度不会被旧存档覆盖
- [ ] 结局结算：结算后刷新页面不会重复结算
- [ ] 事件链中断：事件链进行中刷新，能正确恢复到当前步骤

---

## 9. 是否存在需要先修复的 B3-A 问题

### 9.1 已确认的问题

**问题 1：`logIdSeed` / `eventIdSeed` 是模块级变量，多实例不安全**

- **位置**：`useGame.ts` 第 109-110 行
- **描述**：这两个变量定义在模块顶层，不属于任何 hook 实例。如果同一页面有多个 `useGame` 实例（理论上不会，但技术上可能），它们会共享计数器。
- **影响**：当前只有一个 App 实例，实际不影响功能。但从架构上讲不够干净。
- **严重程度**：低。不影响 B3-B 实施。
- **建议**：B3-B 不需要修复，但可考虑未来改为 `useRef` 存储。

### 9.2 潜在问题（需进一步验证）

**问题 2：`bootInit` 使用 `useMemo` 而非 `useState` 初始化，依赖空数组**

- **位置**：`useGame.ts` 第 509-572 行
- **描述**：`bootInit` 是 `useMemo(() => {...}, [])`，在首次渲染时同步计算。这没问题，但严格来说 `useMemo` 的语义是"缓存计算结果"，不是"只执行一次的副作用"。React 未来版本可能在某些情况下重新执行 memo。
- **影响**：当前 React 18 稳定版本行为可靠。B3-A 已正常工作。
- **严重程度**：极低。不影响 B3-B。

**问题 3：`advance` 中 `isYearEnd` 判断使用 `logs` 作为参数，但 `logs` 是闭包捕获的旧值**

- **位置**：`advance` 函数第 2893 行：`const summary = generateYearSummary(nextState, logs)`
- **描述**：`advance` 是 `useCallback`，依赖 `[state, log, logs]`。当调用 `advance` 时，`logs` 是闭包捕获的值。但在 `advance` 执行过程中，已经通过 `log()` 函数添加了多条新日志（这些日志进入了 `setLogs` 的队列，但 `logs` 变量本身还是旧值）。
- **影响**：`generateYearSummary` 生成年度总结时，使用的是"当天开始前"的日志列表，不包含当天新增的日志。这可能是有意设计（年度总结统计上一年的数据，不含刚结束的那天早上的日志？），也可能是 bug。
- **验证方法**：检查 `generateYearSummary` 函数的实现和预期行为。
- **严重程度**：待确认。如果是设计如此，则不影响 B3-B。如果是 bug，也不阻塞 B3-B，属于游戏逻辑问题。

### 9.3 结论

**没有必须先修复的 B3-A 阻塞性问题。**

B3-A 的启动恢复逻辑、存档读写、幂等保护都已正确实现，可以作为 B3-B 的稳定基础。

B3-B 实施过程中需要注意的兼容性要点：
- 保持 `GameSave` 结构不变（`schemaVersion` 仍为 1）
- 保持 `runId` 的生成和使用方式不变
- 保持 `eventChain` 的三字段结构（`chainId` / `stepId` / `stepDepth`）不变
- 保持 `endingId` 的语义不变（只存 ID，不存完整 Ending 对象）
- 保持 `logIdSeed` / `eventIdSeed` 的递增语义不变
- 保持 `settledRunIds` 的幂等保护机制不变

---

## 附录：关键代码位置索引

| 内容 | 文件 | 行号 |
|---|---|---|
| `logIdSeed` / `eventIdSeed` 模块级变量 | useGame.ts | 109-110 |
| `bootInit` 启动恢复逻辑 | useGame.ts | 509-572 |
| 状态初始化（state/logs/pendingEvent/ending/runId/chain 等） | useGame.ts | 582-681 |
| `restart()` 重新开始 | useGame.ts | 687-785 |
| `dismissSaveError()` | useGame.ts | 794-807 |
| `settleEnding()` 结算结局 | useGame.ts | 812-860 |
| `advance()` 时段推进 | useGame.ts | 2401-2907 |
| `chooseAction()` 选择行动 | useGame.ts | 1140+ |
| `writeSave()` 两步法写入 | saveStorage.ts | 263-337 |
| `loadSave()` 主→临时回退读取 | saveStorage.ts | 155-248 |
| `deleteSave()` 先删临时再删主 | saveStorage.ts | 349-369 |
| `validateGameSave()` 结构校验 | saveValidator.ts | 792-850 |
| `GameSave` 接口定义 | saveTypes.ts | 37-80 |
| `GameState` 接口定义 | types/game.ts | 149-235 |
| `settleLegacy()` 幂等结算 | legacy.ts | 285-348 |
