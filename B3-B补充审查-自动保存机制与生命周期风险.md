# B3-B 补充审查：自动保存机制与生命周期风险

> 只读分析，不修改任何文件。基于真实源码逐行核查。
> 对应前序报告：`B3-B自动保存实施前置审查报告.md`

---

## 1. 四项问题的源码核查结果

### 问题 1：自动保存触发机制 — useEffect vs 函数末尾调用

#### 1.1 当前 useGame.ts 的状态更新方式

`useGame()` 内部有 **9 个独立的 React state 变量**，分布如下：

| State 变量 | 更新调用方式 | 所在位置 |
|---|---|---|
| `state` (GameState) | 全部使用**直接值**形式：`setState({ ...state, ... })` | 33 处 setState 调用 |
| `logs` | 全部使用**更新器函数**形式：`setLogs((prev) => [...prev, { id: logIdSeed++, ... }])` | 全部经由 `log()` 函数（第 864 行） |
| `pendingEvent` | 直接值形式：`setPendingEvent({ id: eventIdSeed++, ... })` | 经由 `emitEvent()` / `dismissEvent()` |
| `ending` | 直接值形式：`setEnding(ending)` | 4 处 |
| `runId` | 直接值形式 | 2 处（初始化 + restart） |
| `bootStatus` | 直接值形式 | 5 处 |
| `currentChain` | 直接值形式 | 5 处 |
| `currentStepId` | 直接值形式 | 4 处 |
| `stepDepth` | 混合：直接值（4 处）+ 更新器函数（1 处，`setStepDepth((d) => d + 1)` 第 2394 行） | 5 处 |

**关键发现：一个用户动作会触发对多个不同 state 变量的多次 setState 调用。**

以 `advance()` 的日结算路径为例（第 2844-2847 行，触发网文事件链的分支）：

```
setState(nextState)                    // 更新主状态
  ↓ 调用 startWriterEventChain()
log(...)                               // setLogs (updater form)
setCurrentChain(chain)                // 直接值
setCurrentStepId(chain.steps[0].stepId) // 直接值
setStepDepth(0)                       // 直接值
setState(prev => { ... })             // 更新 careerProjects (updater form)
```

同一次 `advance()` 调用内，至少涉及 **3 个 state 变量、6 次 setState 调用**。

#### 1.2 "函数末尾组装快照"方案的核心问题

如果在函数末尾直接组装快照，会遇到以下不可回避的问题：

1. **React state 尚未更新**：所有 `setState` 都是异步批处理的，函数末尾时 React state 变量仍是旧值。不能从 `state` / `logs` / `pendingEvent` 等变量读取最新值。

2. **函数内部持有部分最终值，但不是全部**：
   - `state` 的最终值：函数内部确实计算了 `nextState` 并可以直接使用
   - `logs` 的最终值：**无法获取**。`log()` 调用通过 updater 函数追加，新日志的 id 由 `logIdSeed++` 在 updater 内部分配，函数外部不知道最终 ID
   - `pendingEvent` 的最终值：**无法确定**。`emitEvent()` 可能在 `checkStressBreakdown` 等内部函数中间接调用，不一定在函数末尾能判断
   - 事件链状态：`setCurrentChain` / `setCurrentStepId` 等的值可以从函数上下文推断，但散落在各处

3. **多分支路径增加维护成本**：`advance()` 有 5 个 return 路径，每条路径的 state 变化组合不同。如果在每个 return 前手动组装快照，极易遗漏。

4. **新增动作时容易忘记加保存调用**：函数末尾手动调用依赖开发者自觉，没有强制保障。

#### 1.3 "useEffect 监听"方案的分析

**方案核心**：用一个 ref 标记"需要保存"，在 useEffect 中检查该标记，若为 true 则组装快照并写入。

```
// 伪代码
const saveRequestedRef = useRef(false)

// 动作函数内：
function chooseAction(...) {
  // ... 业务逻辑 ...
  saveRequestedRef.current = true
  // ... 更多 setState ...
}

// 提交后保存：
useEffect(() => {
  if (!saveRequestedRef.current) return
  saveRequestedRef.current = false
  const snapshot = buildSaveSnapshot(state, logs, pendingEvent, ...)
  writeSave(snapshot)
})
```

**优势**：
- ✅ **状态一致性有保证**：useEffect 在 React commit 之后运行，此时所有 state 都是最新值
- ✅ **不依赖 setTimeout / queueMicrotask**：使用 React 生命周期本身的时序
- ✅ **自动批处理合并**：同一事件循环内多次标记保存请求，只会触发一次保存
- ✅ **对现有代码侵入小**：动作函数内只加一行标记，不改动核心逻辑
- ✅ **新增动作函数只需加一行标记**，不容易遗漏

**风险与对策**：

| 风险 | 分析 | 对策 |
|---|---|---|
| 非玩家操作的 state 变化也触发保存？ | `saveRequestedRef` 是手动标记的，只有动作函数才会设置。纯派生的 re-render 不会触发保存。 | 已天然规避 |
| Strict Mode 下 effect 双调用导致重复保存？ | 第一次调用后 ref 已置 false，第二次直接 return。不会重复保存。 | 已天然规避 |
| 初始挂载时 effect 执行？ | `saveRequestedRef.current` 初始为 false，直接跳过。 | 已天然规避 |
| 多个 state 变化跨多次渲染？ | React 18 自动批处理：同一事件循环内的所有 setState 合并为一次渲染。 | 无需额外处理 |

#### 1.4 结论：推荐 useEffect + ref 标记方案

**推荐方案：useEffect + saveRequestedRef 标记**

**具体依据**：

1. **状态一致性**：当前 `useGame` 有 9 个独立 state 变量，一次用户动作可能修改其中多个。函数末尾无法可靠获取所有最新状态，而 useEffect 在 commit 后运行，所有 state 都是最新的。

2. **logIdSeed 在 updater 内**：`log()` 通过 updater 函数追加日志，`logIdSeed++` 在 updater 内部执行。函数末尾时种子值和日志内容都不确定。useEffect 运行时 updater 已全部执行完毕，值是确定的。

3. **多分支路径**：`advance()` 有 5 个 return 分支，每个分支修改的 state 组合不同。手动在每个分支组装快照容易遗漏且维护成本高。用 ref 标记的方式，每个分支只需加一行。

4. **天然合并**：同一事件循环内多次标记只会保存一次，相当于内置的"合并去重"。

5. **时序清晰**：不依赖 setTimeout、queueMicrotask 等 hack，完全走 React 标准生命周期。

---

### 问题 2：同步存储与写入队列

#### 2.1 writeSave() 的同步性确认

**结论：`writeSave()` 是 100% 同步函数。**

核查依据（`src/save/saveStorage.ts`）：
- 全文搜索 `async` / `await` / `Promise` / `setTimeout` / `setInterval`：**零匹配**
- `writeSave()` 的每一步都是同步的：
  - `validateGameSave(save)` — 同步
  - `serializeSave(save)` → `JSON.stringify` — 同步
  - `writeRaw(SAVE_KEY_TEMP, serialized)` → `localStorage.setItem` — 同步
  - `readRaw(SAVE_KEY_TEMP)` → `localStorage.getItem` — 同步
  - 字符串比对 — 同步
  - `deserializeSave(tempReadBack)` → `JSON.parse` — 同步
  - `writeRaw(SAVE_KEY_PRIMARY, serialized)` → `localStorage.setItem` — 同步
  - `removeKey(SAVE_KEY_TEMP)` → `localStorage.removeItem` — 同步
- 返回值是 `SaveWriteResult`（普通对象），不是 Promise

#### 2.2 是否需要 Promise 串行队列？

**结论：完全不需要。**

理由：

1. **JavaScript 单线程模型**：`writeSave` 是同步函数，一旦开始执行就会运行到结束，中间不会被打断。不可能出现"两个 writeSave 同时执行"的情况。

2. **保存请求的合并**：由于使用 useEffect + ref 标记方案，同一渲染周期内多次标记只会触发一次保存。不需要队列来合并请求——React 的批处理机制已经天然做了合并。

3. **不存在"较早的异步写入覆盖较新存档"的风险**：因为写入是同步的，而且每次保存都是从最新的 React state 组装快照，不存在时序混乱。

4. **不需要防抖**：玩家操作频率有限（每次操作后保存一次），localStorage 写入通常 < 5ms，不会有性能问题。

#### 2.3 最小化实现：只需要一个计数器和一个标记 ref

```
// 只需要两个 ref：
const saveRequestedRef = useRef(false)   // 是否需要保存
const saveFailCountRef = useRef(0)       // 连续失败计数
```

**保存流程**：
1. 动作函数设置 `saveRequestedRef.current = true`
2. React 批处理所有 state 更新，渲染，提交
3. useEffect 运行，检查 `saveRequestedRef.current`
4. 若为 true：置为 false → 组装快照 → 同步调用 `writeSave` → 根据结果更新失败计数

这就是全部。没有 Promise、没有队列、没有并发控制。

---

### 问题 3：ID 种子的副作用

#### 3.1 核查结果

**`logIdSeed` — 存在副作用问题**

第 864 行：
```typescript
setLogs((prev) => [...prev, { id: logIdSeed++, day, slot, kind, text }])
```

`logIdSeed++` 位于 `setLogs` 的**更新器函数内部**。更新器函数按约定应该是纯函数，但这里修改了模块级变量 `logIdSeed`，属于副作用。

**`eventIdSeed` — 无副作用问题**

第 877-886 行：
```typescript
setPendingEvent({
  id: eventIdSeed++,
  type,
  ...
})
```

`eventIdSeed++` 位于传入 `setPendingEvent` 的对象字面量中，在 `emitEvent` 函数调用时立即求值，不在更新器函数内。属于事件处理阶段的同步计算，没有问题。

#### 3.2 Strict Mode 下的具体风险

**当前项目确认启用了 Strict Mode**（`src/main.tsx` 第 7 行）：
```tsx
<React.StrictMode>
  <App />
</React.StrictMode>
```

React 18 Strict Mode 对**状态更新器函数**会执行双调用（double-invoke）以检测不纯的更新器。具体行为：

1. React 调用更新器函数两次，使用相同的前一状态
2. 丢弃第一次调用结果，保留第二次
3. 如果更新器有副作用，副作用会执行两次

**对 `logIdSeed` 的影响**：

每次调用 `log()` 时，`setLogs` 的 updater 会被调用两次：
- 第一次：`logIdSeed` 从 N → N+1，返回 `[...prev, {id: N}]`
- 第二次：`logIdSeed` 从 N+1 → N+2，返回 `[...prev, {id: N+1}]`
- React 保留第二次结果：日志条目 id 为 N+1
- `logIdSeed` 最终值为 N+2

**后果**：
- 开发环境下日志 ID 会有间隔（每次 +2 而非 +1）
- `logIdSeed` 的值比"最大日志 id + 1"更大
- 不影响功能唯一性（不会出现重复 id）
- 不影响存档恢复（恢复后种子 >= 实际需要，保证不重复）

**更严重的潜在场景**：如果 React 在某些情况下（如 Suspense 重试、render 中断重试）丢弃渲染结果但更新器副作用已执行，`logIdSeed` 会"提前消耗"，导致 id 不连续。虽然不破坏正确性，但会让种子值和实际日志数量脱节。

#### 3.3 其他使用 logIdSeed 的位置核查

| 位置 | 形式 | 是否在 updater 内 | 风险 |
|---|---|---|---|
| 第 601/608/618 行 | useState initializer | 否（初始化只执行一次） | 无 |
| 第 628 行 | useState initializer (eventIdSeed) | 否 | 无 |
| 第 726/749 行 | restart 中 setLogs(直接数组) | 否（传直接值） | 无 |
| 第 759 行 | restart 中 setPendingEvent(直接值) | 否 | 无 |
| 第 804-805 行 | dismissSaveError 中直接赋值 | 否 | 无 |
| **第 864 行** | **setLogs updater 函数内** | **是** | **有风险** |
| 第 878 行 | emitEvent 中 setPendingEvent(直接值) | 否 | 无 |

**唯一有问题的位置是第 864 行的 `log()` 函数。**

#### 3.4 最小修正建议

将 `logIdSeed++` 从 updater 函数内移到函数体中：

```typescript
// 修改前（有副作用）
const log = useCallback(
  (day: number, slot: TimeSlot, kind: LogKind, text: string) => {
    setLogs((prev) => [...prev, { id: logIdSeed++, day, slot, kind, text }])
  },
  [],
)

// 修改后（无副作用，id 在事件处理阶段分配）
const log = useCallback(
  (day: number, slot: TimeSlot, kind: LogKind, text: string) => {
    const id = logIdSeed++
    setLogs((prev) => [...prev, { id, day, slot, kind, text }])
  },
  [],
)
```

**修正原理**：
- id 在 `log()` 被调用时立即分配（事件处理阶段）
- `setLogs` 的 updater 函数变成纯函数（只使用传入的 `id`，不修改变量）
- Strict Mode 双调用 updater 时，两次都使用同一个 `id` 值，结果一致
- 事件处理函数不会被 Strict Mode 双调用

**影响范围**：只改 `log()` 函数 1 处，共 2 行代码。不涉及日志系统重构。

---

### 问题 4：结算完成后的存档清理

#### 4.1 真实调用关系核查

```
结局触发
  ↓
setEnding(ending)  [自动保存保存结局状态 ← B3-B 新增]
  ↓
玩家点击 EndingModal 的确认按钮
  ↓
settleEnding(carriedCardId)  (useGame.ts 第 812-860 行)
  ├─ 检查 settleLockRef 防重入
  ├─ settleLegacy(...)  (legacy.ts 第 285-348 行)
  │   ├─ 幂等检查：settledRunIds.includes(runId)
  │   └─ 计算新遗产档案
  ├─ saveLegacyProfile(result.profile)  [写入遗产档案]
  ├─ setLegacyProfile(result.profile)
  ├─ setEnding(null)
  └─ setBootStatus('new_game')
```

**关键发现：`settleEnding()` 没有调用 `deleteSave()`。**

`deleteSave()` 只在两个地方被调用：
1. `restart()` 第 693 行 — 新局开始前删除旧存档
2. `dismissSaveError()` 第 797 行 — 存档异常时删除损坏存档

#### 4.2 逐项回答

**Q: 结局触发时是否保存结局状态？**

A: 当前（B3-A）不保存。B3-B 引入自动保存后，**应该保存一次结局状态**。原因：
- 玩家可能在结局弹窗处刷新页面，需要能恢复到结局状态
- 结局状态包含 `endingId`，恢复后会显示结局弹窗
- `settledRunIds` 幂等保护保证不会重复结算

**Q: 遗产结算成功后何时删除本局存档？**

A: **当前不删除。** 结算后存档保留在 localStorage 中，只更新遗产档案的 `settledRunIds`。

下次启动时：
1. `loadSave()` 读到存档
2. 检查 `legacy.settledRunIds.includes(save.runId)` → true
3. 返回 `bootStatus: 'already_settled'`
4. 显示"本局已完成结算"弹窗
5. 玩家点击"开始新游戏" → `dismissSaveError()` → `deleteSave()`

**Q: 删除失败时是否影响已完成的遗产结算？**

A: **不影响。** 遗产档案和本局存档是两个独立的存储。`settleEnding()` 的流程是：
1. 先计算结算结果（内存中）
2. 写入遗产档案（`saveLegacyProfile`）
3. 写入成功才更新内存状态

`deleteSave` 不在结算流程中，所以不存在"删除失败导致结算回退"的问题。

即使将来在结算后加入 `deleteSave`：
- 删除失败也不应该回滚结算（结算已经完成并持久化）
- 只需要提示玩家"旧存档清理失败"，但不影响进入下一局
- `settledRunIds` 保证下次启动时不会错误恢复

**Q: 刷新后如何利用 settledRunIds 防止重复结算？**

A: 双重防护：

**第一层：启动时拦截**（`useGame.ts` 第 518-526 行）
- `bootInit` 中检查 `legacy.settledRunIds.includes(save.runId)`
- 已结算的 runId 直接进入 `already_settled` 状态
- 不恢复游戏状态，不显示游戏界面

**第二层：结算时幂等**（`legacy.ts` 第 295-297 行）
- `settleLegacy()` 函数开头检查 `profile.settledRunIds.includes(runId)`
- 已结算则直接返回 `{ status: 'already_settled', profile }`
- 不重复计算遗产点数，不重复累加

即使玩家通过某种方式绕过第一层（比如在结局弹窗刷新后直接恢复了游戏），第二层也会挡住重复结算。

**Q: 是否存在旧结局存档长期残留的情况？**

A: **存在。** 以下场景会导致旧存档残留：

1. 玩家结算后直接关闭游戏/标签页 → 存档保留
2. 玩家结算后进入新局设置界面但没点开始 → 存档保留
3. 玩家在 `already_settled` 弹窗上关闭页面 → 存档保留

残留的存档在下一次启动时会触发 `already_settled` 状态，玩家需要点击"开始新游戏"才会删除。

**影响评估**：
- 功能上安全（有 `settledRunIds` 保护）
- 体验上略差（每次启动都弹"已结算"提示）
- 存储占用小（单份存档 ~200KB）

---

## 2. 是否需要调整原 B3-B 方案

**需要调整，主要有 3 处：**

| 原方案 | 调整后 | 原因 |
|---|---|---|
| 关键节点手动调用 + 串行 Promise 队列 | useEffect + ref 标记 + 同步写入 | 9 个 state 变量分散，函数末尾拿不到完整最新状态；writeSave 完全同步不需要 Promise 队列 |
| 未提及 ID 种子修正 | 新增：先修正 `log()` 函数的 updater 副作用 | Strict Mode 下 id 种子异常递增，影响存档一致性 |
| 未提及结算后存档清理 | 新增：结算成功后删除本局存档 | 避免旧结局存档长期残留，减少 `already_settled` 弹窗出现频率 |

**不需要调整的部分**：
- 存档快照字段清单（GameState 全覆盖结论不变）
- 游戏生命周期保存许可表（9 个阶段的判断不变）
- 保存失败处理策略（保留内存状态 + 顶部提示 + 连续失败暂停）
- B3-A 兼容性结论（无阻塞性问题）

---

## 3. 推荐的最小修改方案

### 步骤 0（前置修正）：修复 log() 的 updater 副作用

将 `logIdSeed++` 从 `setLogs` updater 函数内移到函数体中。

**原因**：
- Strict Mode 下 updater 双调用导致 `logIdSeed` 额外递增
- 影响存档中 `logIdSeed` 与日志实际 id 的对应关系
- 修复后 id 分配更可预测，便于自动保存的快照组装

### 步骤 1：添加保存基础设施（useEffect + 双 ref）

在 `useGame()` 中添加：

```typescript
// 保存请求标记：动作函数设置为 true，useEffect 消费后重置为 false
const saveRequestedRef = useRef(false)
// 连续失败计数：用于失败降级
const saveFailCountRef = useRef(0)
```

添加 `buildSaveSnapshot()` 辅助函数，从所有 9 个 state 变量 + 2 个种子变量组装 `GameSave` 对象。

添加无依赖的 `useEffect`：
- 检查 `saveRequestedRef.current`
- 若为 true：置为 false → 组装快照 → 调用 `writeSave` → 更新失败计数 → 失败超过阈值则停止自动保存

### 步骤 2：在关键动作函数中标记保存请求

在以下函数末尾（或所有 setState 调用之后）添加 `saveRequestedRef.current = true`：

1. `advance()` — 每个 return 分支之前
2. `chooseAction()` — 函数末尾
3. `selectOption()` — 事件链选择后
4. `selectEventOption()` — 简单事件选择后
5. `startEncounter()` — 接受奇遇后
6. `continueToNextYear()` — 年度总结继续后
7. `retireNow()` — 年度总结退休后（触发结局）
8. `startWriterProject()` — 开新书后
9. `applyWriterStrategy()` — 写作策略后
10. `completeActiveWriterProject()` — 完本后
11. `abandonActiveWriterProject()` — 太监后
12. 结局触发后（`setEnding` 之后的路径）

### 步骤 3：禁止保存的场景

在以下场景中**不设置** `saveRequestedRef`，或在保存前检查 gate 条件：

- `bootStatus` 不是 `restored` 也不是 `new_game`（游戏中）时 → 跳过
- `bootStatus` 为 `new_game` 但第一天上午尚未行动时 → 跳过（新局还没正式开始）
- `restart()` 执行过程中 → 跳过（先删存档，新状态设置后不应立即保存）
- `settleEnding()` 结算完成后 → 跳过（并且主动删除存档）
- `dismissSaveError()` 后 → 跳过

### 步骤 4：结算后删除存档

在 `settleEnding()` 成功路径中，遗产档案写入成功后，增加 `deleteSave()` 调用。

删除失败不影响结算结果（结算已完成），只记录日志即可。

### 步骤 5：UI 保存状态提示

在 `TopBar` 中添加保存状态指示器（成功/失败/暂停），失败时提供手动重试。

---

## 4. 需要修改的文件

| 文件 | 修改内容 | 改动量估计 |
|---|---|---|
| `src/hooks/useGame.ts` | 1. 修复 `log()` 函数的 updater 副作用（2 行）<br>2. 引入 `writeSave` 和相关类型<br>3. 添加 `saveRequestedRef` / `saveFailCountRef`<br>4. 添加 `buildSaveSnapshot()` 辅助函数<br>5. 添加保存 useEffect<br>6. 在 ~12 个动作函数中加标记<br>7. `settleEnding()` 成功后调用 `deleteSave()`<br>8. 添加 `saveStatus` 暴露给 UI | 中（约 100-130 行新增） |
| `src/components/TopBar.tsx` | 添加保存状态指示器（保存中/成功/失败/暂停） | 小（约 30-40 行） |

**不需要修改的文件**：
- `src/save/*` — 底层 API 完备，无需改动
- `src/types/game.ts` — 状态定义完整
- `src/data/legacy.ts` — 遗产系统独立运作
- `src/App.tsx` — 可通过 TopBar 传递保存状态，或直接从 useGame 取

---

## 5. 实施顺序与验收标准

### 第 1 步：修复 log() 的 updater 副作用

**修改**：`src/hooks/useGame.ts` `log()` 函数

**验收标准**：
- [ ] `logIdSeed++` 移到 `setLogs` 调用之前，`id` 作为变量传入
- [ ] Strict Mode 开发环境下，单条日志的 id 增量为 1（而非 2）
- [ ] 所有日志 id 连续递增，无间隔
- [ ] `logIdSeed` 的值始终等于 `logs.length + 初始值`（正常流程下）
- [ ] 不影响日志的显示和功能

### 第 2 步：添加保存基础设施

**修改**：`src/hooks/useGame.ts`

**验收标准**：
- [ ] `buildSaveSnapshot()` 能正确组装 GameSave 的所有字段
- [ ] 快照包含正确的 state / logs / pendingEvent / endingId / eventChain / runId / logIdSeed / eventIdSeed
- [ ] `saveRequestedRef` 初始为 false，useEffect 首次运行不触发保存
- [ ] 设置 `saveRequestedRef.current = true` 后，下一次 useEffect 运行会执行保存
- [ ] 保存成功后 `saveFailCountRef` 归零
- [ ] 连续失败 3 次后，`saveRequestedRef = true` 不再触发实际写入（暂停自动保存）
- [ ] 暂停后手动调用"重试保存"可重置失败计数并恢复

### 第 3 步：接入核心保存点（按优先级）

**修改**：`src/hooks/useGame.ts`

**优先级 1（必须）**：
- [ ] `advance()` 所有分支 — 时段/日期推进后保存
- [ ] `chooseAction()` — 玩家行动后保存

**优先级 2（应该）**：
- [ ] `selectOption()` — 事件链选择后保存
- [ ] `selectEventOption()` — 简单事件选择后保存
- [ ] `startEncounter()` — 接受奇遇后保存
- [ ] 结局触发时保存（`setEnding` 之后标记）

**优先级 3（可以）**：
- [ ] `continueToNextYear()` / `retireNow()` — 年度总结后保存
- [ ] `startWriterProject()` / `applyWriterStrategy()` / `completeActiveWriterProject()` / `abandonActiveWriterProject()` — 写作操作后保存

**验收标准（每类）**：
- [ ] 执行动作后，localStorage 中有最新存档
- [ ] 存档中的 state / logs / 事件链状态 与 UI 显示一致
- [ ] 刷新页面后能正确恢复到动作后的状态
- [ ] 快速连续操作（如连续点休息）不会报错
- [ ] 保存不会打断游戏流程（同步写入 < 10ms）

### 第 4 步：禁止保存的场景防护

**修改**：`src/hooks/useGame.ts`

**验收标准**：
- [ ] `bootStatus` 为 corrupted / incompatible / read_error / already_settled 时，不触发自动保存
- [ ] `restart()` 调用后第一次渲染不自动保存（新局尚未行动）
- [ ] `settleEnding()` 结算完成后不自动保存（且删除存档）
- [ ] `dismissSaveError()` 后不自动保存
- [ ] 调试面板操作（debugAddStress 等）是否保存？建议保存（调试也是状态变化），但可讨论

### 第 5 步：结算后删除存档

**修改**：`src/hooks/useGame.ts` `settleEnding()` 函数

**验收标准**：
- [ ] 结算成功后，本局存档被删除
- [ ] 删除失败不影响结算结果（遗产档案已更新）
- [ ] 删除失败时不报错中断，记录日志即可
- [ ] `already_settled` 场景仍然存在（极端情况下删除失败时的兜底）
- [ ] 刷新页面后不出现 `already_settled` 弹窗（因为存档已被删除）
- [ ] 新局开始流程不受影响

### 第 6 步：UI 保存状态提示

**修改**：`src/components/TopBar.tsx`（或新建小型组件）

**验收标准**：
- [ ] 正常保存成功时不显示干扰性提示（或短暂显示后消失）
- [ ] 保存失败时醒目提示（图标 + tooltip 显示错误信息）
- [ ] 连续失败暂停后显示"保存已暂停"状态和重试按钮
- [ ] 不影响 TopBar 现有布局和功能
- [ ] 移动端适配正常

### 第 7 步：集成测试

**验收标准**：
- [ ] 正常游戏流程：行动 → 推进 → 事件链 → 结局，每步保存正确
- [ ] 结局 → 结算 → 新局：存档正确删除，不会重复结算
- [ ] 快速操作：短时间内多次点击行动，保存不会报错
- [ ] 保存失败模拟：localStorage 配额满时正确降级，失败提示可见
- [ ] Strict Mode 开发环境：日志 id 连续，无跳号
- [ ] 刷新恢复：任意时刻刷新都能恢复到最近保存的状态
- [ ] 已结算存档：结算后刷新不会出现 already_settled 弹窗（因为已删除）

---

## 附录：关键代码行号索引

| 内容 | 文件 | 行号 |
|---|---|---|
| `log()` 函数定义（updater 内有副作用） | useGame.ts | 862-867 |
| `emitEvent()` 函数定义（直接值，无副作用） | useGame.ts | 869-889 |
| `logIdSeed` / `eventIdSeed` 模块级变量 | useGame.ts | 109-110 |
| `advance()` 函数起始 | useGame.ts | 2401 |
| advance 中触发事件链分支（多次 setState） | useGame.ts | 2844-2847 |
| advance 中重大分支分支 | useGame.ts | 2851-2888 |
| advance 中年度总结分支 | useGame.ts | 2891-2898 |
| `selectOption()` 事件链选择函数 | useGame.ts | 2216-2398 |
| `selectEventOption()` 简单事件选择 | useGame.ts | 962-1055 |
| `settleEnding()` 结算函数 | useGame.ts | 812-860 |
| `restart()` 重新开始函数 | useGame.ts | 687-785 |
| `deleteSave()` 调用位置（restart 内） | useGame.ts | 693 |
| `deleteSave()` 调用位置（dismissSaveError 内） | useGame.ts | 797 |
| `settleLegacy()` 幂等检查 | legacy.ts | 295-297 |
| `bootInit` 中 settledRunIds 检查 | useGame.ts | 518-526 |
| Strict Mode 启用 | main.tsx | 6-9 |
| `writeSave()` 完整实现 | saveStorage.ts | 263-337 |
