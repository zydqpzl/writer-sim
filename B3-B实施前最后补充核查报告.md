# B3-B 实施前最后补充核查报告

> 只读分析，不修改任何文件。所有结论逐行对应真实源码。
> 对应前序报告：`B3-B补充审查-自动保存机制与生命周期风险.md`

---

## 一、ID 种子全部递增位置及风险分类

### 1.1 完整位置清单

`logIdSeed` 共 **10 处**出现：

| 行号 | 代码 | 所在位置 | 分类 | Strict Mode 风险 |
|---|---|---|---|---|
| 109 | `let logIdSeed = 1` | 模块顶层声明 | 声明 | 无 |
| 550 | `logIdSeed = save.logIdSeed` | `useMemo(bootInit)` 内部（赋值） | ④ useMemo 内 | 低（赋相同值两次） |
| 601 | `id: logIdSeed++` | `useState(logs)` 初始化函数内 | ① useState 初始化函数 | ⚠️ 中（双调用双递增） |
| 608 | `id: logIdSeed++` | `useState(logs)` 初始化函数内 | ① useState 初始化函数 | ⚠️ 中（双调用双递增） |
| 618 | `id: logIdSeed++,` | `useState(logs)` 初始化函数内 | ① useState 初始化函数 | ⚠️ 中（双调用双递增） |
| 719 | `logIdSeed = 1` | `restart()` 事件处理函数内（重置） | ③ 事件处理函数 | 无 |
| 726 | `id: logIdSeed++,` | `restart()` 内、`setLogs` 直接值参数 | ③ 事件处理函数 | 无 |
| 749 | `id: logIdSeed++,` | `restart()` 内、`setLogs` 直接值参数 | ③ 事件处理函数 | 无 |
| 804 | `logIdSeed = 1` | `dismissSaveError()` 事件处理函数内（重置） | ③ 事件处理函数 | 无 |
| 864 | `setLogs((prev) => [...prev, { id: logIdSeed++, ... }])` | `log()` 内、`setLogs` updater 函数内 | ② setState updater 内 | ⚠️⚠️ 高（每次 log 都双递增） |

`eventIdSeed` 共 **7 处**出现：

| 行号 | 代码 | 所在位置 | 分类 | Strict Mode 风险 |
|---|---|---|---|---|
| 110 | `let eventIdSeed = 1` | 模块顶层声明 | 声明 | 无 |
| 551 | `eventIdSeed = save.eventIdSeed` | `useMemo(bootInit)` 内部（赋值） | ④ useMemo 内 | 低（赋相同值两次） |
| 628 | `id: eventIdSeed++,` | `useState(pendingEvent)` 初始化函数内 | ① useState 初始化函数 | ⚠️ 中（双调用双递增） |
| 720 | `eventIdSeed = 1` | `restart()` 事件处理函数内（重置） | ③ 事件处理函数 | 无 |
| 759 | `id: eventIdSeed++,` | `restart()` 内、`setPendingEvent` 直接值参数 | ③ 事件处理函数 | 无 |
| 805 | `eventIdSeed = 1` | `dismissSaveError()` 事件处理函数内（重置） | ③ 事件处理函数 | 无 |
| 878 | `id: eventIdSeed++,` | `emitEvent()` 内、`setPendingEvent` 直接值参数 | ③ 事件处理函数 | 无 |

### 1.2 分类说明

**① useState 初始化函数（lazy initializer）**

React 18 Strict Mode 开发环境下会**双调用**状态初始化函数以检测不纯的初始化逻辑。

每次 `logIdSeed++` 都会执行两次，第一次结果被丢弃，第二次结果被保留。

后果：
- 种子值正确（始终 `>= max_id + 1`）
- 但 id 出现跳号（不连续）
- 仅初始化时发生一次，影响范围小
- 生产环境不受影响

**② setState 函数式 updater 内部**

Strict Mode 同样双调用 updater 函数。

`log()` 函数中的 updater 被每次日志调用触发，**每次都双递增**。开发环境下日志 id 全部跳号（每次 +2）。

后果：
- 种子值仍然正确（不会重复）
- 但 id 大规模不连续
- 影响所有游戏内日志，频率高
- 开发环境体验差，生产环境正常

**③ 普通事件处理函数内部**

事件处理函数（`restart()`、`dismissSaveError()`、`emitEvent()`、`chooseAction()` 等）**不会**被 Strict Mode 双调用。完全安全。

**④ useMemo 内部**

Strict Mode 下 useMemo 也可能被双调用。但这里是**赋值**（`logIdSeed = save.logIdSeed`），不是递增。两次赋相同的值，最终结果一致。无正确性问题。

### 1.3 初始化阶段的额外 Strict Mode 风险

除了 useState 初始化函数，`bootInit` 这个 `useMemo` 也在渲染阶段执行，且包含：

1. **模块级变量赋值**（第 550-551 行）：`logIdSeed = save.logIdSeed` / `eventIdSeed = save.eventIdSeed`
   - 赋值操作，双调用无影响 ✓

2. **`loadSave()` 调用**（第 513 行）：可能有副作用（临时存档提升为主存档）
   - 第一次调用：提升 temp → primary，删除 temp key
   - 第二次调用：直接读取 primary，返回相同数据
   - 最终 `bootInit` 值一致 ✓
   - 技术上属于 useMemo 副作用，但不影响正确性

3. **`loadLegacyProfile()` 调用**（第 511 行）：纯读取，无副作用 ✓

**结论：初始化阶段有 Strict Mode 双调用，但种子值正确性不受影响。主要问题是 id 不连续。**

---

## 二、最小 ID 修正方案

### 2.1 必须修复：log() 函数的 updater 副作用

**位置**：`src/hooks/useGame.ts` 第 862-867 行

**修改前**：
```typescript
const log = useCallback(
  (day: number, slot: TimeSlot, kind: LogKind, text: string) => {
    setLogs((prev) => [...prev, { id: logIdSeed++, day, slot, kind, text }])
  },
  [],
)
```

**修改后**：
```typescript
const log = useCallback(
  (day: number, slot: TimeSlot, kind: LogKind, text: string) => {
    const id = logIdSeed++
    setLogs((prev) => [...prev, { id, day, slot, kind, text }])
  },
  [],
)
```

**原理**：
- id 在 `log()` 被调用时（事件处理阶段）立即分配
- `setLogs` 的 updater 变为纯函数（只使用传入的 id，不修改外部变量）
- Strict Mode 双调用 updater 时，两次都使用同一个 `id` 值，结果一致
- 不改变任何功能行为，不涉及日志系统重构

### 2.2 useState 初始化函数：可选修复

**位置**：`src/hooks/useGame.ts` 第 594-620 行（logs 初始化）、第 622-640 行（pendingEvent 初始化）

**评估**：
- 初始化只执行一次，影响范围极小（3 个 log id + 1 个 event id 跳号）
- 种子值仍然正确，不影响功能
- 仅开发环境 Strict Mode 下可见
- 修复需要重构初始化逻辑（将 id 计算移出 initializer），改动量相对收益而言过大

**建议：暂不修复。** 如未来需要 id 严格连续，再统一处理。

如果一定要修复，最小方案是将初始日志和初始事件的 id 计算放到 `bootInit` / `newGameInit` 的 useMemo 中，但 useMemo 也会被 Strict Mode 双调用，所以问题依旧。真正彻底修复需要将种子初始化移到 `useEffect` 或事件处理阶段，但这会导致初始渲染时 id 为占位值，引发额外复杂度。

### 2.3 改动量汇总

| 改动 | 行数 | 位置 |
|---|---|---|
| `log()` 函数：将 `logIdSeed++` 移出 updater | 2 行（加 1 行，改 1 行） | useGame.ts 第 863-864 行 |
| 合计 | **约 2 行代码** | 1 个文件 |

---

## 三、自动保存生命周期门控

### 3.1 现有可复用字段

| 字段 | 类型 | 可用于门控的判断 |
|---|---|---|
| `bootStatus` | `'new_game' \| 'restored' \| 'corrupted' \| 'incompatible' \| 'read_error' \| 'already_settled'` | 判断是否处于可游戏状态 |
| `ending` | `Ending \| null` | 判断是否处于结局状态 |
| `saveRequestedRef` | `boolean`（新增 ref） | 判断是否有动作请求保存 |

### 3.2 门控条件逐条对应

| # | 需求 | 判断条件 | 实现方式 |
|---|---|---|---|
| 1 | 初始占位状态不能自动保存 | `bootStatus` 非 `restored` 且非 `new_game` | useEffect 内检查 `bootStatus`，不满足则跳过 |
| 2 | 有效存档恢复成功后允许自动保存 | `bootStatus === 'restored'` | 自然满足，动作函数中设置 saveRequestedRef |
| 3 | 正式新游戏创建完成后才允许自动保存 | 依赖 `saveRequestedRef` 机制：只有动作函数才会设置标记 | 自然满足——`restart()` 之前没有动作，不会触发保存 |
| 4 | 存档损坏/恢复失败时不能覆盖原存档 | `bootStatus` 为 error 状态 | 同 #1，bootStatus 检查直接拦截 |
| 5 | 结局触发后保存包含 endingId 的完整状态 | `ending !== null` 时仍允许保存 | 不拦截——结局状态包含在快照中 |
| 6 | 遗产结算过程中暂停自动保存 | 结算开始时清除 `saveRequestedRef` | 在 `settleEnding()` 开头置 false |
| 7 | 遗产结算成功后删除本局旧存档 | 结算成功路径调用 `deleteSave()` | 在 `settleEnding()` 成功分支增加调用 |
| 8 | 删除失败不回滚，靠 settledRunIds 防重复 | `deleteSave()` 失败不抛异常、不回退 | 两步法保证；settledRunIds 兜底 |

### 3.3 门控核心逻辑

```
// useEffect 内的保存流程（伪代码）
useEffect(() => {
  // 门 1：是否有保存请求
  if (!saveRequestedRef.current) return
  
  // 门 2：是否处于可保存的生命周期阶段
  if (bootStatus !== 'restored' && bootStatus !== 'new_game') return
  
  // 清除请求标记
  saveRequestedRef.current = false
  
  // 组装快照
  const snapshot = buildSaveSnapshot(state, logs, pendingEvent, ending?.id ?? null, ...)
  
  // 写入存档
  const result = writeSave(snapshot)
  
  // 更新失败计数
  if (result.status === 'error') {
    saveFailCountRef.current++
  } else {
    saveFailCountRef.current = 0
  }
  
  // 暴露保存状态给 UI
  setSaveStatus(...)
})
```

**两道门的分工**：
- **门 1（saveRequestedRef）**：主控制。只有玩家动作才会设置标记，天然排除了初始化、结算、UI 变化等非动作场景。
- **门 2（bootStatus 检查）**：纵深防御。即使因代码遗漏误设了标记，bootStatus 检查也能拦住异常状态下的保存。

### 3.4 为什么不需要额外的 "gameStarted" 状态变量

需求 3（"正式新游戏创建完成后才允许自动保存"）的常见直觉是加一个 `gameStarted` 标记。但在当前方案下**不需要**，理由：

1. **新游戏创建前**（初始占位/身份选择阶段）：玩家还没开始游戏，不会调用任何动作函数 → `saveRequestedRef` 始终为 false → 不会触发保存。
2. **`restart()` 执行中**：`restart()` 内部不设置 `saveRequestedRef` → 不触发保存。
3. **新游戏创建后第一次行动**：动作函数设置 `saveRequestedRef = true` → useEffect 运行 → 首次保存。这恰好是"正式创建完成后"的第一个合理保存时机。

结论：`saveRequestedRef` 机制天然满足需求 3，不需要额外状态。

### 3.5 结算过程中暂停保存的实现

不在 useEffect 中加 "isSettling" 门，而是在 `settleEnding()` 开头清除 `saveRequestedRef`：

```typescript
function settleEnding(carriedCardId) {
  // 清除待保存请求：结算过程中及结算后都不保存
  saveRequestedRef.current = false
  
  // ... 原有结算逻辑 ...
  
  // 结算成功后
  if (result.status === 'settled') {
    saveLegacyProfile(result.profile)
    // ... 更新 React state ...
    
    // 清理本局存档
    deleteSave()  // 删除失败不影响结算结果
  }
}
```

**为什么不用 "isSettling" 门**：
- 结算是同步操作，全部在 `settleEnding()` 函数调用内完成
- 结算期间不调用任何动作函数，`saveRequestedRef` 不会被重新设置为 true
- 清除一次就够了，不需要持续跟踪"结算中"状态
- 更简单，更少状态

---

## 四、最终建议修改的文件清单

| 文件 | 修改内容 | 改动量估计 |
|---|---|---|
| `src/hooks/useGame.ts` | 1. 修复 `log()` 中 `logIdSeed++` 位置（2 行）<br>2. 引入 `writeSave` / `deleteSave` / `GameSave` 等类型<br>3. 添加 `saveRequestedRef`、`saveFailCountRef`<br>4. 添加 `buildSaveSnapshot()` 辅助函数<br>5. 添加保存 useEffect（含 bootStatus 门控）<br>6. 在 ~10 个动作函数末尾加 `saveRequestedRef.current = true`<br>7. `settleEnding()` 开头清除 saveRequestedRef + 成功后 deleteSave()<br>8. 暴露 `saveStatus` 状态给 UI | 约 100-130 行新增 |
| `src/components/TopBar.tsx` | 添加保存状态指示器（成功/失败/暂停） | 约 30-40 行 |

**不需要修改的文件**：
- `src/save/*` — 底层 API 完备
- `src/types/game.ts` — 状态定义完整
- `src/save/saveTypes.ts` — 存档类型定义完整
- `src/data/legacy.ts` — 遗产系统独立运作
- `src/App.tsx` — 通过 TopBar 展示状态即可

---

## 五、是否具备进入 B3-B 实施阶段的条件

**结论：已具备实施条件。**

### 前置条件核查

| 条件 | 状态 | 说明 |
|---|---|---|
| B3-A 启动恢复功能稳定 | ✅ 已确认 | 存档读写、校验、恢复均正常工作 |
| 存档结构完整（含所有必要字段） | ✅ 已确认 | GameState 86+ 字段全覆盖 |
| 幂等保护机制（settledRunIds） | ✅ 已确认 | 双重防护有效 |
| 自动保存方案明确 | ✅ 已确认 | useEffect + ref 标记，改动最小 |
| ID 种子风险已定位 | ✅ 已确认 | 仅 log() 一处需修复，改动 2 行 |
| 生命周期门控清晰 | ✅ 已确认 | 复用 bootStatus + saveRequestedRef，无需新状态变量 |
| 失败处理策略明确 | ✅ 已确认 | 保留内存状态 + 连续失败暂停 + UI 提示 |
| 结算后清理方案明确 | ✅ 已确认 | 结算成功后 deleteSave，失败不回滚 |

### 实施前最后一项准备

在开始 B3-B 实施前，建议**先单独提交 `log()` 函数的 2 行修复**（将 `logIdSeed++` 移出 updater）。

原因：
- 这是一个独立的 Strict Mode 正确性修复，与自动保存功能无关
- 修复后，Strict Mode 下日志 id 行为正常，便于后续验证自动保存的快照一致性
- 即使 B3-B 实施中途暂停，这个修复本身也是有价值的
- 改动极小（2 行），风险极低

之后再开始自动保存的主体实现。

---

## 附录：关键代码行号索引

| 内容 | 文件 | 行号 |
|---|---|---|
| `logIdSeed` / `eventIdSeed` 模块级声明 | useGame.ts | 109-110 |
| `bootInit` useMemo 内种子赋值 | useGame.ts | 549-551 |
| `useState(logs)` 初始化函数（3 处 ++） | useGame.ts | 594-620 |
| `useState(pendingEvent)` 初始化函数（1 处 ++） | useGame.ts | 622-640 |
| `restart()` 内种子重置与分配 | useGame.ts | 719-720, 726, 749, 759 |
| `dismissSaveError()` 内种子重置 | useGame.ts | 804-805 |
| `log()` 函数（updater 内有副作用 ⚠️） | useGame.ts | 862-867 |
| `emitEvent()` 函数（直接值，无副作用 ✓） | useGame.ts | 869-888 |
| `settleEnding()` 结算函数 | useGame.ts | 812-860 |
| `selectOption()` 事件链选择 | useGame.ts | 2216-2398 |
| `advance()` 时段推进 | useGame.ts | 2401-2898 |
| Strict Mode 启用 | main.tsx | 6-9 |
| `writeSave()` 同步实现 | saveStorage.ts | 263-337 |
| `deleteSave()` 同步实现 | saveStorage.ts | 349-369 |
