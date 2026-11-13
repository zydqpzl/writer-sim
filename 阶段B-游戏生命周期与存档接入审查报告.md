# 阶段 B：游戏生命周期与存档接入审查报告

**分析范围**：`src/hooks/useGame.ts`、`src/save/`、`src/engine/`、`src/data/`、`src/App.tsx`、`src/types/`
**分析日期**：2026-11-02
**修改状态**：本轮未修改任何源码，纯代码阅读与分析

---

## 一、现有游戏生命周期梳理

### 1.1 新游戏初始化

#### 初始化调用链

```
App.tsx
  └─ useGame(initialSetup?)
       ├─ loadLegacyProfile()          ← 从 localStorage 读遗产档案
       ├─ computeStartState(setup, profile)
       │    ├─ buildInitialState(identity, keptCards, profile)
       │    │    ├─ JSON.parse(JSON.stringify(INITIAL_STATE))  ← 深拷贝初始状态
       │    │    ├─ 应用身份补丁（location / stats / 子文化声望等）
       │    │    ├─ 携带卡牌放入 inventory
       │    │    ├─ 成就元加成（存款/精力上限/压力上限/技能/起始卡牌）
       │    │    └─ generateInitialNpcs(4)  ← 每个平台生成 4 名 NPC 同行
       │    ├─ createAuthorProfile(penName, backgroundIds)  ← 构建作者档案
       │    └─ grantTrait('trait_housing_shanty')  ← 默认入住城中村
       ├─ applyLegacyOpeningEffects(state, lastRunSummary)
       │    ├─ 根据上一局黑历史标签应用属性变化
       │    ├─ 生成开局日志
       │    └─ 可能生成开局弹窗事件（major_branch 类型）
       ├─ useState<GameState>(initialState)  ← 正式挂载游戏状态
       ├─ useState<LogEntry[]>([初始日志 + 开局日志])
       └─ useState<GameEvent | null>(开局弹窗?)
```

#### 两个初始化入口

| 入口 | 触发时机 | 关键操作 |
|---|---|---|
| `useGame(initialSetup)` | 组件首次挂载 | 执行完整初始化链，`logIdSeed`/`eventIdSeed` 沿用模块当前值 |
| `restart(setup?)` | 用户点击重开 | 重置 `logIdSeed=1`、`eventIdSeed=1`，重新执行完整初始化链，清空事件链和结局，消耗已携带卡牌 |

#### 关键发现：初始化有副作用

`buildInitialState` 不是纯函数式的状态构造，它包含以下副作用性质的操作：

1. **`generateInitialNpcs(4)`** — 每次调用都会随机生成一批新的 NPC
2. **成就元加成** — 从 `profile.unlockedAchievementIds` 派生，每局开局都应用一次
3. **携带卡牌进入 inventory** — 每局开局都放入
4. **城中村住房特质授予** — 每局开局都获得

**风险**：如果恢复存档时先执行完整初始化再用存档覆盖状态，以上操作都会重复执行一次。虽然状态会被覆盖，但 `logIdSeed` 和 `eventIdSeed` 的递增、初始日志的生成等不会被回滚。

---

### 1.2 游戏运行过程

#### 状态分布（非常重要）

当前游戏状态**分散在 7 个独立的 useState 中**，并非全部包含在 GameState 里：

| 状态 | 存储位置 | 类型 | 说明 |
|---|---|---|---|
| `state` | `useState<GameState>` | 在 GameState 内 | 核心游戏状态（属性/作品/平台生态等） |
| `logs` | `useState<LogEntry[]>` | **不在 GameState 内** | 独立数组，ID 由模块级 `logIdSeed` 生成 |
| `pendingEvent` | `useState<GameEvent \| null>` | **不在 GameState 内** | 当前弹窗事件 |
| `ending` | `useState<Ending \| null>` | **不在 GameState 内** | 当前结局 |
| `currentChain` | `useState<EventChain \| null>` | **不在 GameState 内** | 当前事件链对象（完整配置，非 ID） |
| `currentStepId` | `useState<string \| null>` | **不在 GameState 内** | 当前步骤 ID |
| `stepDepth` | `useState<number>` | **不在 GameState 内** | 当前步骤深度 |
| `logIdSeed` | **模块级 `let` 变量** | 不在任何 state 内 | 日志 ID 自增种子 |
| `eventIdSeed` | **模块级 `let` 变量** | 不在任何 state 内 | 事件 ID 自增种子 |
| `legacyProfile` | `useState<LegacyProfile>` | 跨局状态 | 从 localStorage 加载的遗产档案 |

#### 状态推进主循环

```
玩家行动 (chooseAction / publishWork / applyWriterStrategy / ...)
  ↓
setState 更新 GameState + actedThisSlot = true
  ↓
玩家点击"下一阶段" → advance()
  ├─ 如果有 pendingYearSummary → 直接 return（不推进）
  ├─ 如果 !actedThisSlot → 直接 return（不推进）
  ├─ 时段内推进（morning→afternoon, afternoon→evening）
  │    └─ setState({ slot: next, actedThisSlot: false })
  └─ 跨天推进（evening→next-day）
       ├─ newDay = day + 1
       ├─ 每日生活费扣除
       ├─ 特质每日结算（health/stress 变化 + 过期清理）
       ├─ 保险自动续费
       ├─ CareerEngine 每日发酵（dailyTickWriter）
       ├─ 市场趋势推进
       ├─ 平台生态模拟（NPC/榜单/互动/梗/传闻）
       ├─ 作者等级更新
       ├─ 江湖称号解锁检查
       ├─ 限时奇遇刷新（40% 概率）
       ├─ 成就解锁检查
       ├─ 中途结局判定（checkGameEnding）
       ├─ 网文圈事件每日触发检测
       ├─ 第 30 天重大人生分支
       ├─ 年度总结判定（每 YEAR_LENGTH 天）
       └─ setState(nextState)
```

#### 依赖关系图

```
advance() 触发
  ├─ 依赖 state.day / state.slot / state.actedThisSlot
  ├─ 修改 state（大量字段）
  ├─ 修改 logs（每日结算日志）
  ├─ 可能设置 pendingEvent（压力崩溃/重大分支）
  ├─ 可能设置 ending（中途结局）
  ├─ 可能启动事件链（startWriterEventChain）
  └─ 可能设置 pendingYearSummary（年度总结）
```

---

### 1.3 事件系统与事件链

#### 两类事件系统

项目中有**两套完全独立**的事件机制：

**1. 弹窗事件（GameEvent / pendingEvent）**
- 类型：`reality_punch` | `stress_breakdown` | `major_branch`
- 单步弹窗，附带 0~N 个就地结算选项
- 选项效果：属性变化 / 获得灵感卡牌 / 改变地点
- 关闭后消失，不影响事件链状态
- 触发位置：`maybeRealityPunch()`、`checkStressBreakdown()`、`advance()` 第 30 天、开局弹窗

**2. 事件链（EventChain / currentChain / currentStepId / stepDepth）**
- 多步骤分支叙事，每步有多个选项
- 每个选项指向 `nextStepId`（或 null 表示结束）
- 选项效果：属性变化 / 授予特质 / 获得灵感 / 获得卡牌 / 影响网文项目
- 触发方式：
  - `checkWriterEventTriggers()` 检测到条件满足 → `startWriterEventChain(chainId)`
  - 玩家点击奇遇横幅 → `startEncounter(chainId)`
  - 年度总结后 → `determineYearOpeningChain()` → `startWriterEventChain()`

#### 事件链推进机制

```
startWriterEventChain(chainId, day, slot)
  ├─ 从 EVENT_CHAINS[chainId] 查找完整链配置
  ├─ setCurrentChain(chain)      ← 存完整对象
  ├─ setCurrentStepId(steps[0].stepId)
  └─ setStepDepth(0)

selectOption(option)
  ├─ 结算属性效果 / 授予特质 / 获得卡牌 / 影响项目
  ├─ 更新日志
  ├─ if option.nextStepId === null → 结束事件链（全置 null/0）
  └─ else → setCurrentStepId(nextStepId) + setStepDepth(d+1)
```

#### 事件链的存储问题

**当前事件链状态不在 GameState 内**，而是分散在三个独立的 useState 中：
- `currentChain` — 完整的 `EventChain` 对象（含 title/steps/maxDepth 等全部配置）
- `currentStepId` — 当前步骤 ID
- `stepDepth` — 当前深度

**存档结构中的事件链表示**（saveTypes.ts 中 `EventChainState`）：
```ts
eventChain: {
  chainId: string | null    // 只存 ID
  stepId: string | null     // 只存步骤 ID
  stepDepth: number         // 深度
}
```

**不一致点**：
- 运行时存的是完整 EventChain 对象，存档只存 ID
- 恢复时需要根据 chainId 重新从 `EVENT_CHAINS` 配置中查找
- 如果配置版本变动，chainId 可能不存在，stepId 可能不属于该链

#### 事件链中断与恢复的关键问题

1. **游戏中断时完全可能处于事件链中间步骤** — 事件链可以跨多个时段持续（玩家选完选项后不一定立即推进时段）
2. **saveValidator 只做结构校验** — 无法验证 chainId/stepId 是否对应真实存在的配置
3. **如果存档中的 chainId 在当前版本已被删除或重命名** — 恢复后 currentChain 为 null，但 currentStepId 还有值，会导致状态不一致
4. **事件链选项可能有随机结果** — 目前看事件链选项是确定性的（效果固定），但同人衍生事件链的触发本身是随机的，一旦触发并保存了，恢复时不应该重新触发

---

### 1.4 游戏结束与结算

#### 结局触发路径

| 路径 | 触发点 | 调用 |
|---|---|---|
| 中途结局 | `advance()` 每日结算时 | `checkGameEnding(state)` → 命中则 `setEnding(ending)` |
| 主动退休 | `retireNow()` 年度总结时选择封笔 | `resolveFinalEnding(state)` → `setEnding(ending)` |
| 财务自由 | `chooseAction('retire_financial_freedom')` | 直接 `setEnding(ending)` |

#### 结算流程

```
玩家在结局弹窗中选择携带卡牌 → settleEnding(carriedCardId)
  ├─ if (!ending) return    ← 基础保护：没有结局不结算
  ├─ settleLegacy(profile, ending, carriedCardId, memes, achievements, state)
  │    ├─ 计算回响点数（legacyPointsFor）
  │    ├─ 追加解锁结局 ID
  │    ├─ 自动解锁身份（cost <= 总点数）
  │    ├─ 合并作者梗
  │    ├─ 合并成就
  │    ├─ deriveRunSummary(state, ending)  ← 生成本局总结
  │    └─ totalRuns + 1
  ├─ saveLegacyProfile(next)    ← 写入 localStorage
  ├─ setLegacyProfile(next)
  └─ setEnding(null)            ← 清空结局状态
```

#### 幂等性分析

| 机制 | 防止重复结算的能力 |
|---|---|
| `if (!ending) return` | 弱 — 只在同一组件实例内有效，刷新页面后如果 somehow 恢复了 ending 状态就会重复结算 |
| `endingId` 在 `unlockedEndingIds` 中 | 部分 — 结局解锁不会重复，但 `totalLegacyPoints` 和 `totalRuns` 会重复累加 |
| `runId` | **未实现** — 存档结构中有此字段，但结算逻辑完全没有使用 |

**关键结论**：当前没有可靠的"这一局已经结算过"的幂等标记。
- `ending === null` 不代表已经结算过（也可能是还没触发结局）
- `ending !== null` 不代表没结算过（理论上可以结算后 ending 还在）
- 实际流程是 `settleEnding()` 最后才 `setEnding(null)`，所以"正在展示结局"就是"未结算"的隐式标记
- 但如果存档保存了结局状态（endingId），玩家刷新页面后再次结算，**遗产点数和总局数会重复累加**

#### 结算后的状态

结算完成后：
- `ending` = null（结局弹窗关闭）
- `legacyProfile.lastRunSummary` 有值（上一局总结）
- `legacyProfile.keptCardIds` 有值（携带的卡牌 ID）
- `legacyProfile.totalRuns` + 1
- 游戏状态仍在内存中（玩家可以继续看数据，但 `restart()` 才会开新局）
- App.tsx 中 `setupOpen` 变为 true（因为 keptCardIds.length > 0）

---

## 二、存档接入风险逐项分析

### 风险 1：首次进入游戏时，如何区分新游戏和恢复游戏？

**现状**：`useGame()` 总是执行完整初始化流程。没有任何"检查存档 → 有则恢复，无则新游戏"的分流逻辑。

**App.tsx 启动流程**：
```
App 挂载
  ├─ useGame() → 总是初始化新游戏
  ├─ setupOpen = legacyProfile.keptCardIds.length > 0  ← 遗产携带弹窗
  └─ careerSetupOpen = pendingProfession === null        ← 职业选择弹窗
```

**接入建议**：在 `useGame()` 初始化阶段，先调用 `loadSave()` 检查是否有有效存档。如果有，走恢复分支；如果没有，走新游戏分支。

---

### 风险 2：恢复游戏时，如何避免重新执行新游戏初始化效果？

**这是最关键的风险之一。**

当前 `useGame()` 的初始化顺序：
```
computeStartState → buildInitialState → applyLegacyOpeningEffects → useState
```

如果恢复存档时先执行这套初始化再覆盖，会导致：
1. **初始日志重复** — "游戏开始"日志 + 开局效果日志会先生成，再被存档覆盖（虽然 logs 数组会被覆盖，但如果存档中的日志 ID 从 1 开始，不会冲突，只是浪费）
2. **开局效果重复执行** — `applyLegacyOpeningEffects` 的属性变化会先应用再被覆盖，**实际状态是对的**，因为存档 state 会覆盖初始化 state
3. **成就元加成重复** — 同上，最终状态由存档决定，初始化的会被覆盖
4. **NPC 重新生成** — 初始化会随机生成一批新 NPC，然后被存档中的 NPC 覆盖
5. **logIdSeed / eventIdSeed** — 这两个是**模块级变量**，不会因为覆盖 state 就恢复。必须显式从存档中读取并设置。

**真正的问题**：
- 如果走"先初始化再覆盖"路线，虽然最终 state 是对的，但有多余计算
- `logIdSeed` 和 `eventIdSeed` 必须从存档中恢复，否则新生成的日志/事件 ID 可能冲突
- 开局弹窗事件 `pendingEvent` 会被初始化逻辑生成一个，然后被存档覆盖
- 最大的风险是：**如果恢复逻辑有 bug（比如某个字段漏恢复），初始化产生的值就会"混"进去，造成难以追踪的偏差**

**推荐方案**：新建独立的恢复路径 `restoreFromSave(save)`，不经过 `computeStartState`。

---

### 风险 3：存档中的 pendingEvent 是否可以直接恢复？

**可以，但需要验证。**

GameEvent 的结构（types/game.ts）：
```ts
interface GameEvent {
  id: number
  type: GameEventType        // 'reality_punch' | 'stress_breakdown' | 'major_branch'
  title: string
  icon: string
  tone: EventTone            // 'good' | 'bad' | 'neutral' | 'critical'
  text: string
  effects: string[]
  options?: EventPopupOption[]
}
```

**可直接恢复的理由**：
- 所有数据都是自包含的，不依赖外部配置查找
- `options` 是内嵌的，就地结算属性/卡牌，不需要外部引用
- `type` 只有 3 种枚举值，校验器已覆盖

**需要注意**：
- `options[].getCard` 引用的是 `CARD_POOL` 中的卡牌 ID。如果卡牌 ID 在新版本中被删除，恢复后选择该选项会找不到卡牌（但代码中有 `if (card)` 保护，只是不获得卡牌）
- `pendingEvent.id` 是数字 ID，由 `eventIdSeed` 生成，恢复时不需要校验连续性

---

### 风险 4：事件链如何恢复？是否需要额外检查静态配置？

**必须额外检查。** 这是存档恢复中最复杂的部分。

**恢复时的校验步骤**（按优先级）：

1. **chainId 是否存在** — `EVENT_CHAINS[chainId] !== undefined`
2. **stepId 是否属于该链** — `chain.steps.some(s => s.stepId === stepId)`
3. **stepDepth 是否合理** — 不应为负，不应超过链的 `maxDepth` 太多

**如果校验失败的处理策略**：

| 失败情况 | 推荐处理 | 理由 |
|---|---|---|
| chainId 不存在 | 清空事件链（置 null/null/0），加一条系统日志 | 配置已删除，无法继续剧情，安全降级 |
| stepId 不在链中 | 同上 | 步骤配置已变更，可能是旧版本存档 |
| chain 存在但 step 选项引用的卡牌/特质已删除 | 可以恢复，选项点击时会失败（但有保护） | 属于边缘情况，降级处理 |

**关键发现**：`currentChain` 在运行时存的是完整 `EventChain` 对象，但存档只存 ID。恢复时需要根据 ID 重新查找配置。这意味着：
- 存档恢复后 `currentChain` 指向的是**当前版本**的配置，不是存档时的版本
- 如果事件链内容在版本间发生了变化，玩家可能会看到不同的选项文本
- 但只要 stepId 还存在，游戏逻辑就能正常推进

---

### 风险 5：日志 ID 和事件 ID 如何避免恢复后重复？

**这是一个隐藏较深的问题。**

`logIdSeed` 和 `eventIdSeed` 是**模块级 `let` 变量**（useGame.ts 第 107-108 行），不在任何 useState 或 GameState 中。

```ts
let logIdSeed = 1
let eventIdSeed = 1
```

每次 `log()` 或 `emitEvent()` 调用时，这些种子会递增。`restart()` 时会重置为 1。

**存档结构中已经有这两个字段**：`logIdSeed` 和 `eventIdSeed`（均为 `>= 1` 的数字）。

**恢复时必须做的事**：
1. 从存档读取 `logIdSeed` 和 `eventIdSeed`
2. 将模块级变量设置为对应的值
3. 否则新生成的日志/事件 ID 会从 1 开始，与存档中的 ID 重复

**潜在冲突场景**：
- 存档中日志 ID 到 500，恢复后 `logIdSeed` 仍为 1 → 新日志 ID 从 1 开始 → 与已有日志 ID 重复 → 可能导致以 ID 为 key 的列表渲染问题
- 同理 `eventIdSeed`

---

### 风险 6：自动保存应该放在哪些状态变化节点？

基于对 `advance()` 和各行动函数的分析，推荐以下自动保存节点：

| 节点 | 触发时机 | 重要性 | 理由 |
|---|---|---|---|
| `advance()` 完成后 | 推进到下一时段/下一天 | 最高 | 玩家最自然的"回合结束"点，状态最稳定 |
| 事件链选项选择后 | `selectOption()` 完成后 | 高 | 事件链推进后状态变化大 |
| 弹窗事件选项选择后 | `selectEventOption()` 完成后 | 中 | 属性变化后保存 |
| 年度总结生成时 | `pendingYearSummary` 设置后 | 高 | 年度总结是重要里程碑 |
| 作品完本/太监后 | `completeActiveWriterProject()` / `abandonActiveWriterProject()` | 中 | 重大职业进展 |
| 结局触发时 | `setEnding()` 时 | 最高 | 结局是最终状态，必须保存 |

**不建议保存的节点**：
- 每次 `setState` 都保存 — 过于频繁且状态可能不一致（比如刚改了一半）
- 特质过期过程中 — 属于中间状态

**保存时机的原则**：在一个完整的"玩家操作 → 状态更新"闭环之后保存。避免在操作中间保存。

---

### 风险 7：如果写入存档失败，是否会影响当前游戏运行？

**不影响。**

当前 `writeSave()` 是纯存储操作，只返回成功/失败状态，不修改内存中的游戏状态。

- 写入失败时，旧存档仍然保留（两步写入法保证）
- 内存中的游戏状态完全不受影响
- 玩家可以继续游戏，下次推进时再次尝试保存

**需要增加的**：写入失败时的 UI 提示（但这是后续阶段的事）。

---

### 风险 8：如果玩家在结局展示期间关闭游戏，下一次进入时应该恢复到什么状态？

**应该恢复到"结局已触发但尚未结算"的状态。**

即：
- `state` 恢复到结局触发时的状态
- `ending` 恢复（通过 `endingId` 从 `ENDINGS` 查找）
- 显示结局弹窗，等待玩家选择携带卡牌并结算

**关键点**：
- 存档中保存 `endingId`（字符串），不保存完整 Ending 对象
- 恢复时通过 `ENDINGS.find(e => e.id === endingId)` 查找
- 如果 `endingId` 不存在（版本变更删除了结局）... 这种情况较极端，可降级为不显示结局
- 结算完成后 `endingId` 应被清空（设为 null）

---

### 风险 9：如果玩家已经完成结算，但尚未开始下一局，如何防止再次结算？

**当前没有可靠的幂等保护机制。**

当前流程：
```
settleEnding()
  ├─ settleLegacy()  → totalRuns + 1, totalLegacyPoints + points
  ├─ saveLegacyProfile()
  └─ setEnding(null)  ← 仅靠这个防止重复
```

**问题场景**：如果存档保存了结局状态（endingId 非空），玩家在结局展示时关闭页面，再次打开时：
1. 恢复存档 → endingId 非空 → 显示结局弹窗
2. 玩家点击结算 → `settleEnding()` → `totalRuns` 再加 1

**但实际上**，如果 `settleEnding()` 已经执行过并保存了遗产档案，那 `endingId` 应该已经被设为 null 并保存了。所以正常情况下不会出现"结算过但 endingId 还在"的情况。

**真正的风险场景**：
1. 玩家达到结局 → 自动保存了 endingId
2. 玩家点击结算 → `settleLegacy()` 执行 → `saveLegacyProfile()` 成功
3. 但 `setEnding(null)` 后的**游戏状态保存失败了**
4. 下次进入游戏 → 恢复到有 endingId 的状态 → 玩家可以再次结算

**解决方案**：`settleLegacy` 中引入 `runId` 作为幂等键。每次结算前检查 `legacyProfile` 中是否已经存在该 `runId` 的结算记录。

---

### 风险 10：旧版存档如何与新存档系统共存？

当前 localStorage 中有 3 个 key：

| Key | 内容 | 存储位置 | 状态 |
|---|---|---|---|
| `freelancer-survival-legacy-v1` | 遗产档案（跨局） | `data/legacy.ts` | 继续使用 |
| `fs-current-profession` | 当前职业选择 | `App.tsx` 第 94 行 | 继续使用 |
| `freelancer-survival-save-v1` | 本局存档（新增） | `save/saveTypes.ts` | 新增 |

**共存策略**：
- 遗产档案（legacy）和本局存档（save）是两个不同层面的持久化，互不干扰
- `fs-current-profession` 是 UI 层的偏好设置，与游戏存档无关
- 新增的 `SAVE_KEY_PRIMARY` / `SAVE_KEY_TEMP` 使用独立的 key 名，不会覆盖旧数据
- 三者可以长期共存

---

## 三、建议的生命周期模型

### 3.1 七种游戏生命周期状态

```
┌─────────────────────────────────────────────────────────────┐
│                    跨局：遗产档案状态                        │
│  (LegacyProfile，始终存在，从 localStorage 加载)             │
└─────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌───────────────────┐             ┌───────────────────┐
│  职业选择中        │             │  遗产携带设置中    │
│  (careerSetup)    │             │  (legacySetup)    │
└─────────┬─────────┘             └─────────┬─────────┘
          │  选择职业后                      │  选择携带后
          ▼                                ▼
┌─────────────────────────────────────────────────────────┐
│                    新游戏初始化                          │
│  (new_game_init)                                       │
│  buildInitialState + applyLegacyOpeningEffects          │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    正常游戏中                            │
│  (playing)                                             │
│  推进时段 / 执行行动 / 事件链进行中 / 弹窗事件中        │
│  pendingEvent / currentChain 都属于"游戏中"的子状态      │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────┐     ┌──────────────────────┐
│  年度总结待确认       │     │  结局展示中           │
│  (year_summary)      │     │  (ending_display)    │
│  继续 / 封笔退休      │     │  选择携带卡牌并结算   │
└──────────┬───────────┘     └──────────┬───────────┘
           │ 继续游戏                    │ 结算完成
           ▼                            ▼
     回到正常游戏中            ┌──────────────────────┐
                             │  已结算，等待下一局    │
                             │  (settled_waiting)    │
                             │  setupOpen = true     │
                             └──────────┬───────────┘
                                        │ 点击重开
                                        ▼
                                   回到职业选择/遗产设置
```

### 3.2 各状态的存档策略

| 状态 | 是否应该保存 | 保存内容 | 说明 |
|---|---|---|---|
| 职业选择中 | 否 | — | 还没进入游戏 |
| 遗产携带设置中 | 否 | — | 属于开局配置阶段 |
| 新游戏初始化 | 否 | — | 状态尚未稳定 |
| 正常游戏中 | **是** | 完整 GameSave | 行动结束/推进时段后保存 |
| 年度总结待确认 | **是** | 含 pendingYearSummary | 年度总结是重要里程碑 |
| 结局展示中 | **是** | 含 endingId | 确保玩家刷新后仍能看到结局 |
| 已结算，等待下一局 | 否 | — | 本局已结束，存档应被删除或标记为已结算 |

### 3.3 只能执行一次的操作

| 操作 | 幂等保护机制 | 当前状态 |
|---|---|---|
| 开局效果应用 | `lastRunSummary` 存在性判断 | 已有（每局只应用一次） |
| 成就解锁 | `unlockedAchievementIds` 集合 | 已有（Set 去重） |
| 结局解锁 | `unlockedEndingIds` 集合 | 已有（Set 去重） |
| 遗产点数累计 | **runId 幂等检查** | **缺失** |
| 总局数累计 | **runId 幂等检查** | **缺失** |
| 携带卡牌消耗 | `restart()` 中清空 keptCardIds | 已有 |

### 3.4 可以重复执行的操作

- 每日结算（特质效果/市场推进/平台模拟等）— 每次 `advance()` 都执行，正常游戏循环的一部分
- 事件链推进 — 按 stepId 推进，状态自包含
- 弹窗事件处理 — 一次性事件，处理后 pendingEvent 置空

### 3.5 runId 的使用方式

```
新游戏开始 → 生成唯一 runId → 写入 GameSave
  │
  ├─ 每次自动保存 → runId 不变（原样保存）
  │
  └─ 结算时 → settleLegacy() 检查 legacyProfile 中是否已有该 runId 的结算记录
       ├─ 已存在 → 跳过结算（幂等保护）
       └─ 不存在 → 执行结算，并在 legacyProfile 中记录 settledRunIds
```

**建议在 LegacyProfile 中新增**：
```ts
interface LegacyProfile {
  // ... 现有字段
  /** 已结算的 runId 列表，用于防止重复结算 */
  settledRunIds: string[]
}
```

---

## 四、分阶段实施方案

### B1：生命周期状态与结算标记设计

**目标**：在不改动游戏逻辑的前提下，为接入存档做数据结构准备。

**涉及文件**：
- `src/save/saveTypes.ts` — 确认 GameSave 结构完整覆盖所有需要持久化的状态
- `src/data/legacy.ts` — LegacyProfile 增加 `settledRunIds` 字段（可选，向后兼容）
- `src/types/event.ts` / `src/types/game.ts` — 类型确认，不修改

**预计修改**：
- `saveTypes.ts`：补充 `endingId` 字段（如尚未包含）
- `legacy.ts`：`loadLegacyProfile` 中对 `settledRunIds` 做默认值处理（`?? []`）
- `settleLegacy`：增加 runId 参数，增加幂等检查逻辑

**影响现有玩法**：无。新增字段均为可选，默认值向后兼容。

**潜在风险**：
- `settledRunIds` 可能无限增长 — 可限制长度（保留最近 100 个）
- 旧版 legacyProfile 没有此字段 — 已通过默认值处理

**测试方式**：
- 验证加载没有 `settledRunIds` 的旧档案不会报错
- 验证 `settleLegacy` 对同一 runId 调用两次只结算一次

---

### B2：新游戏与存档恢复初始化分流

**目标**：在 `useGame` 中增加"有存档则恢复，无存档则新游戏"的初始化分支。

**涉及文件**：
- `src/hooks/useGame.ts` — 新增 `loadGameFromSave()` 函数，修改初始化逻辑

**预计修改**：
- 新增 `loadGameFromSave(saveData: GameSave)`：从存档数据恢复所有 7 个 useState + 2 个模块级种子
- 修改 `useGame()` 初始化：先调 `loadSave()`，根据结果走不同分支
- 新增 `restoreCurrentChain(chainId, stepId, stepDepth)`：从 ID 恢复事件链，包含配置校验
- 新增 `restoreEnding(endingId)`：从 ID 恢复结局对象

**影响现有玩法**：无。没有存档时行为完全不变。

**潜在风险**：
- 恢复不完整导致部分状态沿用初始化值 → 必须确保每个 state 都有对应的恢复赋值
- 事件链配置校验失败 → 定义降级策略（清空 + 日志）
- `logIdSeed` / `eventIdSeed` 是模块级变量，多实例情况下可能冲突 → 当前是单实例游戏，不影响

**测试方式**：
- 保存 → 刷新 → 读取，验证所有状态字段一致
- 构造各种异常存档（损坏/不兼容），验证降级行为
- 验证恢复后新生成的日志 ID 不与已有日志冲突

---

### B3：存档恢复与事件链上下文验证

**目标**：完善事件链恢复的配置校验与降级策略。

**涉及文件**：
- `src/hooks/useGame.ts` — `restoreCurrentChain` 详细实现
- 可能需要在 `src/save/` 中新增事件链校验工具函数（或直接放在 useGame 中）

**预计修改**：
- `validateEventChainAgainstConfig(chainId, stepId, stepDepth)`：检查配置存在性 + 步骤归属 + 深度范围
- 校验失败时：清空事件链状态 + 追加一条系统日志（"事件链数据异常，已重置"）
- 校验成功时：从 `EVENT_CHAINS[chainId]` 获取完整 chain 对象并设置

**影响现有玩法**：无。只影响存档恢复路径。

**潜在风险**：
- 事件链版本变更导致 stepId 失效 → 玩家丢失当前事件链进度（但比崩溃好）
- 同人衍生等有状态标记的事件链（`triggeredFanfictionChains`）→ 标记在 careerProjects 中，已保存，不会重复触发

**测试方式**：
- 构造 chainId 不存在的存档 → 验证降级为无事件链
- 构造 stepId 不存在的存档 → 验证降级
- 构造正常事件链存档 → 验证正确恢复

---

### B4：自动保存接入

**目标**：在关键状态变化节点自动保存游戏。

**涉及文件**：
- `src/hooks/useGame.ts` — 各行动/推进函数中增加保存调用
- `src/save/saveStorage.ts` — 可能需要增加保存失败的回调/状态（可选）

**预计修改**：
- 在 `advance()` 完成后调用 `writeSave()`
- 在 `selectOption()`（事件链选项）完成后调用
- 在 `selectEventOption()`（弹窗事件选项）完成后调用
- 在 `setEnding()` 时调用
- 在 `settleEnding()` 结算完成后删除存档（或标记为已结算）
- 在 `restart()` 时删除旧存档

**影响现有玩法**：低。保存是后台操作，不阻塞玩家操作。

**潜在风险**：
- 保存过于频繁 → 限制保存频率（至少 1 秒间隔）或只在关键节点保存
- 保存失败玩家不知道 → 后续阶段加 UI 提示
- 保存操作有性能开销 → 存档大小估计约 20-50KB，JSON 序列化很快，可忽略

**测试方式**：
- 正常游戏流程中验证存档正确保存
- 模拟写入失败（用 MockLocalStorage），验证游戏继续正常运行
- 验证多频次操作不会导致保存风暴

---

### B5：结算幂等保护

**目标**：确保同一局游戏不会被重复结算。

**涉及文件**：
- `src/hooks/useGame.ts` — `settleEnding` 中增加 runId 幂等检查
- `src/data/legacy.ts` — `settleLegacy` 增加 runId 参数和幂等逻辑

**预计修改**：
- `settleLegacy(profile, ending, carriedCardId, memes, achievements, state, runId)`
- 检查 `runId` 是否在 `profile.settledRunIds` 中
- 已存在则直接返回原 profile（或只更新 lastRunSummary？需要讨论）
- 不存在则正常结算并追加 runId
- `settleEnding` 调用时传入 `state.runId`（需要从 state 中获取 runId... 等等，runId 不在 state 里！）

**重要发现**：`runId` 目前在 `GameSave` 结构中定义，但 `GameState` 中没有这个字段。`useGame` 的 state 是 `GameState` 类型。

**需要先解决的问题**：`runId` 应该放在哪里？
- 选项 A：放入 `GameState` — 侵入式但统一
- 选项 B：作为独立的 useState — 与 ending/eventChain 同级别
- 选项 C：不放入 state，只在保存时生成和读取 — 但结算时需要访问

**推荐**：放入 `GameState`（顶层增加 `runId: string` 字段），这样最统一。

**影响现有玩法**：低。只增加一个字符串字段。

**潜在风险**：
- 修改 GameState 类型影响面广 → 实际上很小，只是加一个字段
- 旧存档没有 runId → 恢复时生成一个新的（或标记为 unknown）

**测试方式**：
- 同一 runId 调用 settleLegacy 两次 → 只结算一次
- 不同 runId → 正常累计
- 旧档案没有 settledRunIds → 默认为空数组，正常结算

---

### B6：存档 UI 与异常处理

**目标**：增加存档相关的用户界面和错误处理。

**涉及文件**：
- `src/components/` — 可能新增存档状态提示组件
- `src/App.tsx` — 集成存档 UI
- `src/hooks/useGame.ts` — 保存失败状态暴露

**预计修改**：
- 保存失败时的视觉提示（顶部小警告条）
- 存档损坏/版本不兼容时的处理界面（显示错误 + 新游戏选项）
- "手动保存"按钮（可选，调试用）

**影响现有玩法**：纯 UI 层，不影响游戏逻辑。

**潜在风险**：
- 警告提示过于频繁打扰玩家 → 设计为静默 + 偶尔提示

**测试方式**：
- 模拟各种异常场景，验证 UI 正确显示
- 验证损坏存档时玩家可以选择开始新游戏

---

### 实施顺序建议

```
B1（数据结构准备）
  ↓
B2（初始化分流 + 恢复）
  ↓
B3（事件链配置校验）     ← 可以与 B2 并行或紧随其后
  ↓
B5（结算幂等保护）       ← 先于自动保存，因为自动保存后刷新可能导致重复结算
  ↓
B4（自动保存接入）
  ↓
B6（存档 UI）
```

---

## 五、其他发现与注意事项

### 5.1 模块级变量的风险

`logIdSeed` 和 `eventIdSeed` 是模块级 `let` 变量（不在 hook 内，不在 state 内）。这意味着：

1. **热重载时不会重置** — 开发模式下 HMR 可能导致 ID 继续增长
2. **多个 useGame 实例共享** — 如果有两个组件同时调用 useGame，会共享同一份 seed
3. **测试时需要手动重置** — selfTest 中的测试用例之间可能互相影响

当前只有一个 useGame 实例，问题不大。但存档恢复时必须正确设置这两个变量。

### 5.2 存档结构与运行时状态的不对等

| 运行时 | 存档中 | 差异 |
|---|---|---|
| `state: GameState` | `state: GameState` | 一致 |
| `logs: LogEntry[]` | `logs: LogEntry[]` | 一致 |
| `pendingEvent: GameEvent \| null` | `pendingEvent: GameEvent \| null` | 一致 |
| `currentChain: EventChain`（完整对象） | `eventChain.chainId`（仅 ID） | **运行时存对象，存档存 ID** |
| `currentStepId: string \| null` | `eventChain.stepId` | 一致 |
| `stepDepth: number` | `eventChain.stepDepth` | 一致 |
| `ending: Ending`（完整对象） | `endingId`（仅 ID） | **运行时存对象，存档存 ID** |
| `logIdSeed`（模块级变量） | `logIdSeed`（存档字段） | 一致但存储位置不同 |
| `eventIdSeed`（模块级变量） | `eventIdSeed`（存档字段） | 一致但存储位置不同 |
| `runId` — **当前未使用** | `runId`（存档字段） | **存档有此字段，但运行时 GameState 中没有** |

### 5.3 关于 runId 的最终定位

`runId` 当前只存在于存档结构 `GameSave` 中，`GameState` 类型里没有这个字段。

**建议**：在 `GameState` 顶层增加 `runId: string` 字段。理由：
1. 结算时需要访问 runId 做幂等检查，而结算函数 `settleEnding` 是通过 `state` 获取数据的
2. 存档结构 GameSave 中已经有 runId，它应该是从 GameState 中提取的
3. 放在 GameState 中比放在独立 useState 更统一

这需要修改 `src/types/game.ts` 中的 `GameState` 接口，以及所有创建初始状态的地方（`INITIAL_STATE`、`buildInitialState` 等）。

---

## 六、总结

### 核心发现

1. **状态分散** — 游戏状态分布在 7 个 useState + 2 个模块级变量中，存档恢复需要逐一处理
2. **初始化有副作用** — `buildInitialState` 包含 NPC 随机生成等操作，恢复存档不能走初始化路径
3. **事件链存的是对象，存档存的是 ID** — 恢复时需要重新查找配置，并有配置校验降级策略
4. **结算没有幂等保护** — 目前靠 `ending === null` 隐式判断，需要引入 runId 机制
5. **runId 未接入运行时** — 存档结构中有此字段，但 GameState 中没有，结算逻辑也没用上
6. **旧版存档（legacy）与新存档不冲突** — 使用不同的 localStorage key

### 最优先解决的三个问题

1. **runId 放入 GameState** — 后续幂等保护的基础
2. **初始化分流（新游戏 vs 恢复）** — 存档接入的骨架
3. **结算幂等保护** — 防止遗产点数重复累加的安全底线

### 未确认事项

| 事项 | 状态 | 需要继续检查的位置 |
|---|---|---|
| INITIAL_STATE 的完整字段列表 | 部分确认 | `src/data/gameData.ts` 中后段 |
| 完整的 GameState 接口定义 | 部分确认 | `src/types/game.ts` 第 149 行起 |
| 所有 careerProjects 子类型 | 尚未确认 | `src/types/career.ts` |
| 平台生态各子数组的完整结构 | 尚未确认 | `src/types/platform.ts` |
| checkGameEnding / resolveFinalEnding 逻辑 | 尚未深入 | `src/data/pathChecker.ts` |
| generateYearSummary 具体字段 | 尚未深入 | `src/data/yearSummary.ts` |

以上未确认事项主要影响"校验器是否需要进一步扩展校验深度"的决策，不影响本阶段对生命周期和接入方案的整体判断。
