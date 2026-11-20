import { test, expect, type Page } from '@playwright/test'
import type { StatusTrait } from '../src/types/game'

// ============================================================================
// 存档持久化 E2E 测试 · 最小闭环
// 流程：新局 → 初始存档 → 休息操作 → 存档更新 → 刷新恢复
// ============================================================================

const SAVE_KEY = 'freelancer-survival-save-v1'

interface GameSave {
  schemaVersion: number
  runId: string
  savedAt: number
  state: {
    day: number
    slot: string
    actedThisSlot: boolean
    stats: {
      savings: number
      health: number
      energy: number
      stress: number
    }
    activeTraits: StatusTrait[]
  }
  logs: Array<{ text: string; day?: number; slot?: string }>
}

// ---------------------------------------------------------------------------
// Helper：从 localStorage 读取并解析主存档
// ---------------------------------------------------------------------------
async function readSave(page: Page): Promise<GameSave | null> {
  const raw = await page.evaluate((key) => {
    return window.localStorage.getItem(key)
  }, SAVE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as GameSave
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Helper：轮询等待存档满足条件，满足后返回存档对象
// ---------------------------------------------------------------------------
async function waitForSave(
  page: Page,
  predicate: (save: GameSave) => boolean,
  timeoutMs = 10000,
): Promise<GameSave> {
  // 先用 expect.poll 等待条件满足
  await expect
    .poll(
      async () => {
        const save = await readSave(page)
        return save ? predicate(save) : false
      },
      {
        timeout: timeoutMs,
        message: '等待存档满足条件',
      },
    )
    .toBe(true)

  // 条件满足后，读取完整存档对象返回
  const save = await readSave(page)
  if (!save) {
    throw new Error('存档条件已满足但读取失败')
  }
  return save
}

// ---------------------------------------------------------------------------
// 计算精力上限（考虑特质修正）
// 派生规则：基础上限 100 + Σ effects.energyMaxDelta
// ---------------------------------------------------------------------------
function computeMaxEnergy(activeTraits: StatusTrait[]): number {
  const BASE_ENERGY_MAX = 100
  return (
    BASE_ENERGY_MAX +
    activeTraits.reduce((sum, t) => sum + (t.effects.energyMaxDelta ?? 0), 0)
  )
}

// ---------------------------------------------------------------------------
// 计算压力上限（考虑特质修正）
// 派生规则：基础上限 300 + Σ effects.stressMaxDelta
// ---------------------------------------------------------------------------
function computeMaxStress(activeTraits: StatusTrait[]): number {
  const STRESS_MAX = 300
  return (
    STRESS_MAX +
    activeTraits.reduce((sum, t) => sum + (t.effects.stressMaxDelta ?? 0), 0)
  )
}

// ---------------------------------------------------------------------------
// 钳制函数
// ---------------------------------------------------------------------------
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// ============================================================================
// 测试用例
// ============================================================================

test('新局 → 休息 → 存档更新 → 刷新恢复', async ({ page }) => {
  // -----------------------------------------------------------------------
  // Step 1: 加载页面，等待职业选择弹窗
  // -----------------------------------------------------------------------
  await page.goto('/')

  const careerDialog = page.getByRole('dialog').filter({ hasText: '选择你的自由职业路线' })
  await careerDialog.waitFor({ state: 'visible', timeout: 15000 })

  // 确认网文作家选项存在
  const writerCard = careerDialog.getByRole('button', { name: /网文作家/ })
  await expect(writerCard).toBeVisible()

  // 确认网文作家为当前选中职业：底部选中详情区的 chip 显示「网文作家」
  // （职业卡片中 chip 显示的是状态文本「已开放」，名称在普通 div 中，不会冲突）
  const selectedCareerChip = careerDialog.locator('.chip', { hasText: '网文作家' })
  await expect(selectedCareerChip).toBeVisible()

  // -----------------------------------------------------------------------
  // Step 2: 点击确认按钮，启动新局
  // -----------------------------------------------------------------------
  const confirmBtn = careerDialog.getByRole('button', { name: '选择此路线' })
  await expect(confirmBtn).toBeVisible()

  // 确认匹配数量为 1
  const confirmCount = await confirmBtn.count()
  expect(confirmCount).toBe(1)

  await confirmBtn.click()

  // 等待职业选择弹窗消失
  await careerDialog.waitFor({ state: 'hidden', timeout: 10000 })

  // 等待主界面出现（今日行动标题）
  await page.getByText('今日行动').waitFor({ state: 'visible', timeout: 15000 })

  // -----------------------------------------------------------------------
  // Step 3: 等待初始存档写入，读取基线
  // -----------------------------------------------------------------------
  const baseline = await waitForSave(page, (s) => {
    return (
      s.runId !== undefined &&
      s.runId.length > 0 &&
      s.state.actedThisSlot === false
    )
  }, 15000)

  // 基线断言：初始状态的基本特征
  expect(baseline.schemaVersion).toBe(1)
  expect(baseline.state.day).toBe(1)
  expect(baseline.state.slot).toBe('morning')
  expect(baseline.state.actedThisSlot).toBe(false)
  expect(typeof baseline.state.stats.savings).toBe('number')
  expect(typeof baseline.state.stats.energy).toBe('number')
  expect(typeof baseline.state.stats.stress).toBe('number')
  expect(typeof baseline.state.stats.health).toBe('number')
  expect(Array.isArray(baseline.logs)).toBe(true)

  const baselineLogCount = baseline.logs.length

  // -----------------------------------------------------------------------
  // Step 4: 定位并点击「摆烂 / 休息」行动卡片
  // -----------------------------------------------------------------------
  const restButton = page.getByRole('button', { name: /摆烂\s*\/\s*休息/ })

  // 确认匹配数量为 1
  const restCount = await restButton.count()
  expect(restCount).toBe(1)

  await expect(restButton).toBeVisible()
  await expect(restButton).toBeEnabled()

  await restButton.click()

  // -----------------------------------------------------------------------
  // Step 5: 等待自动保存完成（actedThisSlot 变为 true，日志 +1）
  // -----------------------------------------------------------------------
  const afterAction = await waitForSave(page, (s) => {
    return (
      s.state.actedThisSlot === true &&
      s.logs.length === baselineLogCount + 1
    )
  }, 15000)

  // -----------------------------------------------------------------------
  // Step 6: 验证操作后的存档属性变化
  // -----------------------------------------------------------------------
  const traits = baseline.state.activeTraits || []
  const maxEnergy = computeMaxEnergy(traits)
  const maxStress = computeMaxStress(traits)

  // 预期变化
  const expectedSavings = baseline.state.stats.savings - 50
  const expectedHealth = clamp(baseline.state.stats.health + 10, 0, 100)
  const expectedEnergy = clamp(baseline.state.stats.energy + 28, 0, maxEnergy)
  const expectedStress = clamp(baseline.state.stats.stress - 12, 0, maxStress)

  // 数值断言
  expect(afterAction.state.stats.savings).toBe(expectedSavings)
  expect(afterAction.state.stats.health).toBe(expectedHealth)
  expect(afterAction.state.stats.energy).toBe(expectedEnergy)
  expect(afterAction.state.stats.stress).toBe(expectedStress)

  // 行动状态断言
  expect(afterAction.state.actedThisSlot).toBe(true)
  expect(afterAction.state.day).toBe(baseline.state.day)
  expect(afterAction.state.slot).toBe(baseline.state.slot)

  // runId 不变
  expect(afterAction.runId).toBe(baseline.runId)

  // 日志断言
  expect(afterAction.logs.length).toBe(baselineLogCount + 1)
  const lastLog = afterAction.logs[afterAction.logs.length - 1]
  expect(lastLog.text).toContain('摆烂 / 休息')

  // -----------------------------------------------------------------------
  // Step 7: 刷新页面
  // -----------------------------------------------------------------------
  await page.reload()

  // 等待主界面重新出现（不应出现职业选择弹窗）
  await page.getByText('今日行动').waitFor({ state: 'visible', timeout: 15000 })

  // 确认职业选择弹窗未出现
  const careerDialogAfterReload = page
    .getByRole('dialog')
    .filter({ hasText: '选择你的自由职业路线' })
  await expect(careerDialogAfterReload).toHaveCount(0)

  // -----------------------------------------------------------------------
  // Step 8: 验证恢复后的存档与刷新前一致
  // -----------------------------------------------------------------------
  const afterReload = await waitForSave(page, (s) => {
    return s.state.actedThisSlot === true && s.runId === afterAction.runId
  }, 15000)

  // runId 不变
  expect(afterReload.runId).toBe(afterAction.runId)

  // 状态一致
  expect(afterReload.state.actedThisSlot).toBe(true)
  expect(afterReload.state.day).toBe(afterAction.state.day)
  expect(afterReload.state.slot).toBe(afterAction.state.slot)
  expect(afterReload.state.stats.savings).toBe(afterAction.state.stats.savings)
  expect(afterReload.state.stats.health).toBe(afterAction.state.stats.health)
  expect(afterReload.state.stats.energy).toBe(afterAction.state.stats.energy)
  expect(afterReload.state.stats.stress).toBe(afterAction.state.stats.stress)

  // 日志一致
  expect(afterReload.logs.length).toBe(afterAction.logs.length)
  expect(afterReload.logs[afterReload.logs.length - 1].text).toBe(
    afterAction.logs[afterAction.logs.length - 1].text,
  )

  // -----------------------------------------------------------------------
  // Step 9: 验证休息行动卡片在本时段已行动后处于禁用状态
  // -----------------------------------------------------------------------
  const restButtonAfter = page.getByRole('button', { name: /摆烂\s*\/\s*休息/ })
  await expect(restButtonAfter).toBeVisible()

  // 检查 disabled 状态（仅在 UI 确实通过 disabled 属性表达时断言）
  const isDisabled = await restButtonAfter.evaluate((el) =>
    el.hasAttribute('disabled'),
  )
  expect(isDisabled).toBe(true)
})
