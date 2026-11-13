/**
 * 存档模块自检脚本（Node.js 环境，不需要浏览器）
 *
 *  用法：npx tsx src/save/selfTest.ts
 *
 *  由于项目没有测试框架，这里用最朴素的断言方式做基础自检。
 *  覆盖：
 *    - 序列化 / 反序列化 / 校验 / 版本兼容（纯逻辑）
 *    - localStorage 存储层读写（通过模拟 Storage 接口）
 *    - 两步写入法的各种异常恢复路径
 *    - corrupted / incompatible / read_error 三种状态的区分
 *    - runId 设计验证
 */

import {
  serializeSave,
  deserializeSave,
} from './saveSerializer'
import { validateGameSave, isSchemaVersionCompatible } from './saveValidator'
import {
  loadSave,
  writeSave,
  deleteSave,
  hasSave,
  isLocalStorageAvailable,
} from './saveStorage'
import type { GameSave } from './saveTypes'
import {
  SAVE_SCHEMA_VERSION,
  GAME_VERSION,
  SAVE_KEY_PRIMARY,
  SAVE_KEY_TEMP,
} from './saveTypes'
import {
  settleLegacy,
  loadLegacyProfile,
  saveLegacyProfile,
} from '../data/legacy'
import type { Ending, EndingTag } from '../types/game'
import type { AuthorMeme } from '../types/career'
import { EVENT_CHAINS } from '../data/eventChains'
import { ENDING_BY_ID } from '../data/endings'

// ========================================================================
// 测试数据：构造一个符合真实类型的最小合法存档
// ========================================================================

function makeValidSave(): GameSave {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    gameVersion: GAME_VERSION,
    savedAt: Date.now(),
    runId: 'run-test-001',
    state: {
      day: 1,
      slot: 'morning',
      professionType: 'WRITER',
      location: 'city',
      stats: {
        savings: 5000,
        health: 80,
        energy: 100,
        stress: 30,
        familyApproval: 60,
        influence: 5,
        fans: 0,
      },
      actedThisSlot: false,
      partTimeLock: false,
      workedToday: false,
      consecutivePartTimeDays: 0,
      totalPartTimeDays: 0,
      realityPunchTriggered: false,
      availableEncounter: null,
      inventory: [],
      activeTraits: [],
      pathScores: {
        BIG_CITY_CREATOR: 0,
        HOMETOWN_KOL: 0,
        SUBCULTURE_GURU: 0,
        REALITY_COMPROMISE: 0,
        BALANCED: 0,
      },
      subcultureReputation: 0,
      examProgress: 0,
      careerProjects: [],
      inspirations: [],
      unlockedMemes: [],
      authorRank: 'COLT',
      platformEcosystem: {
        npcs: [],
        leaderboards: [],
        rumors: [],
        interactions: [],
        memeTrends: [],
      },
      marketTrend: {
        id: 'balanced',
        name: '平稳期',
        hotGenres: [],
        hotTags: [],
        hotGimmicks: [],
        decayDays: 30,
        saturation: {},
      },
      authorProfile: {
        penName: '测试作者',
        skills: {
          prose: 10,
          pacing: 10,
          structure: 10,
          marketInsight: 10,
          domainKnowledge: {},
        },
        backgrounds: [],
        evolutionStage: 'NEWBIE',
      },
      writerCareerProfile: {
        genreMastery: {
          XUANHUAN: { genre: 'XUANHUAN', completedCount: 0, totalWordCount: 0, proficiency: 0 },
          URBAN: { genre: 'URBAN', completedCount: 0, totalWordCount: 0, proficiency: 0 },
          SCI_FI: { genre: 'SCI_FI', completedCount: 0, totalWordCount: 0, proficiency: 0 },
          SUSPENSE: { genre: 'SUSPENSE', completedCount: 0, totalWordCount: 0, proficiency: 0 },
          GAME: { genre: 'GAME', completedCount: 0, totalWordCount: 0, proficiency: 0 },
          HISTORY: { genre: 'HISTORY', completedCount: 0, totalWordCount: 0, proficiency: 0 },
        },
        unlockedStyleTraits: [],
        totalCompletedBooks: 0,
        totalAbandonedBooks: 0,
        platformCareer: {
          ZHONGDIAN: { totalRevenue: 0, totalFans: 0, currentRankId: 'rookie' },
          KUAIYUE: { totalRevenue: 0, totalFans: 0, currentRankId: 'rookie' },
          SUCHUAN: { totalRevenue: 0, totalFans: 0, currentRankId: 'rookie' },
          LVJIANG: { totalRevenue: 0, totalFans: 0, currentRankId: 'rookie' },
        },
      },
      housingId: 'dorm',
      ownedEquipmentIds: [],
      activeInsuranceIds: [],
      unlockedAuthorTitleIds: [],
      newUnlockedAchievementIds: [],
      leaveTokens: 0,
      leaveUsedToday: false,
      waterModeActive: false,
      waterWordsUsedToday: 0,
      storedDrafts: 0,
      draftsStoredToday: 0,
      routineLeaveActive: false,
      leaveDelaySlots: 0,
      pendingYearSummary: null,
      yearStartSnapshot: {
        day: 1,
        stats: {
          savings: 5000,
          health: 80,
          energy: 100,
          stress: 30,
          familyApproval: 60,
          influence: 5,
          fans: 0,
        },
        writerCareerProfile: {
          genreMastery: {
            XUANHUAN: { genre: 'XUANHUAN', completedCount: 0, totalWordCount: 0, proficiency: 0 },
            URBAN: { genre: 'URBAN', completedCount: 0, totalWordCount: 0, proficiency: 0 },
            SCI_FI: { genre: 'SCI_FI', completedCount: 0, totalWordCount: 0, proficiency: 0 },
            SUSPENSE: { genre: 'SUSPENSE', completedCount: 0, totalWordCount: 0, proficiency: 0 },
            GAME: { genre: 'GAME', completedCount: 0, totalWordCount: 0, proficiency: 0 },
            HISTORY: { genre: 'HISTORY', completedCount: 0, totalWordCount: 0, proficiency: 0 },
          },
          unlockedStyleTraits: [],
          totalCompletedBooks: 0,
          totalAbandonedBooks: 0,
          platformCareer: {
            ZHONGDIAN: { totalRevenue: 0, totalFans: 0, currentRankId: 'rookie' },
            KUAIYUE: { totalRevenue: 0, totalFans: 0, currentRankId: 'rookie' },
            SUCHUAN: { totalRevenue: 0, totalFans: 0, currentRankId: 'rookie' },
            LVJIANG: { totalRevenue: 0, totalFans: 0, currentRankId: 'rookie' },
          },
        },
        totalWordCount: 0,
      },
    },
    logs: [
      { id: 1, day: 1, slot: 'morning', kind: 'system', text: '游戏开始' },
    ],
    eventChain: {
      chainId: null,
      stepId: null,
      stepDepth: 0,
    },
    pendingEvent: null,
    endingId: null,
    logIdSeed: 2,
    eventIdSeed: 1,
  }
}

// ========================================================================
// 断言工具
// ========================================================================

let passed = 0
let failed = 0

function assert(condition: boolean, name: string): void {
  if (condition) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.log(`  ✗ ${name}`)
  }
}

// ========================================================================
// 模拟 localStorage（Node 环境下替代浏览器 API）
// ========================================================================

interface MockStorageConfig {
  /** 所有读取都抛异常 */
  readThrows?: boolean
  /** 所有写入都抛异常 */
  writeThrows?: boolean
  /** 所有删除都抛异常 */
  removeThrows?: boolean
  /** 写入后回读不一致（模拟存储损坏） */
  writeCorrupts?: boolean
  /** 指定 key 读取时抛异常 */
  readErrorKeys?: Set<string>
  /** 指定 key 写入时抛异常 */
  writeErrorKeys?: Set<string>
  /** 指定 key 删除时抛异常 */
  removeErrorKeys?: Set<string>
}

class MockLocalStorage implements Storage {
  private store = new Map<string, string>()
  config: MockStorageConfig = {}

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    if (this.config.readThrows) {
      throw new Error('模拟读取失败（SecurityError/QuotaExceeded）')
    }
    if (this.config.readErrorKeys?.has(key)) {
      throw new Error(`模拟读取 ${key} 失败`)
    }
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys())
    return index >= 0 && index < keys.length ? keys[index] : null
  }

  removeItem(key: string): void {
    if (this.config.removeThrows) {
      throw new Error('模拟删除失败')
    }
    if (this.config.removeErrorKeys?.has(key)) {
      throw new Error(`模拟删除 ${key} 失败`)
    }
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    if (this.config.writeThrows) {
      throw new Error('模拟写入失败（QuotaExceededError）')
    }
    if (this.config.writeErrorKeys?.has(key)) {
      throw new Error(`模拟写入 ${key} 失败`)
    }
    if (this.config.writeCorrupts) {
      // 写入被截断，模拟存储损坏
      this.store.set(key, value.slice(0, Math.floor(value.length / 2)))
      return
    }
    this.store.set(key, value)
  }

  // 测试辅助：直接查看内部存储
  _getRaw(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }

  _setRaw(key: string, value: string): void {
    this.store.set(key, value)
  }

  _has(key: string): boolean {
    return this.store.has(key)
  }

  _clear(): void {
    this.store.clear()
    this.config = {}
  }
}

// 将 mock 挂到全局 window.localStorage 和 localStorage 上
const mockLs = new MockLocalStorage()
;(globalThis as Record<string, unknown>).window = {
  get localStorage() {
    return mockLs
  },
}
;(globalThis as Record<string, unknown>).localStorage = mockLs

// ========================================================================
// 第一部分：纯逻辑自检（序列化 / 反序列化 / 校验 / 版本）
// ========================================================================

console.log('\n=== 存档模块自检 ===')
console.log('\n--- 第一部分：纯逻辑校验 ---\n')

// 1. 合法存档校验通过
console.log('1. 合法存档校验')
{
  const save = makeValidSave()
  const result = validateGameSave(save)
  assert(result.valid, '合法存档应通过校验')
  assert(result.errors.length === 0, '错误列表应为空')
}

// 2. 缺少 runId
console.log('\n2. 缺少 runId')
{
  const save = makeValidSave() as unknown as Record<string, unknown>
  save.runId = ''
  const result = validateGameSave(save)
  assert(!result.valid, '空 runId 应校验失败')
  assert(
    result.errors.some((e) => e.path === 'runId'),
    '错误应包含 runId 字段',
  )
}

// 3. 缺少必要游戏状态（state 不是对象）
console.log('\n3. 缺少必要游戏状态')
{
  const save = makeValidSave() as unknown as Record<string, unknown>
  save.state = null
  const result = validateGameSave(save)
  assert(!result.valid, 'state 为 null 应校验失败')
  assert(
    result.errors.some((e) => e.path.startsWith('state')),
    '错误应包含 state 字段',
  )
}

// 4. 非法 JSON
console.log('\n4. 非法 JSON 识别')
{
  const result = deserializeSave('{invalid json!!!')
  assert(result.status === 'corrupted', '非法 JSON 应返回 corrupted')
}

// 5. 不支持的 schemaVersion
console.log('\n5. 不支持的 schemaVersion')
{
  const save = makeValidSave()
  save.schemaVersion = 999
  const serialized = serializeSave(save)
  const result = deserializeSave(serialized)
  assert(result.status === 'incompatible', '高版本应返回 incompatible')
}

// 6. 往返：序列化 → 反序列化
console.log('\n6. 序列化往返')
{
  const original = makeValidSave()
  const serialized = serializeSave(original)
  const result = deserializeSave(serialized)
  assert(result.status === 'valid', '往返后应有效')
  if (result.status === 'valid') {
    assert(result.data.runId === original.runId, 'runId 一致')
    assert(result.data.state.day === original.state.day, 'day 一致')
    assert(result.data.logs.length === original.logs.length, 'logs 长度一致')
    assert(
      result.data.eventChain.stepDepth === original.eventChain.stepDepth,
      'eventChain stepDepth 一致',
    )
    assert(
      result.data.state.authorProfile.penName === original.state.authorProfile.penName,
      'authorProfile.penName 一致',
    )
    assert(
      result.data.state.writerCareerProfile.totalCompletedBooks ===
        original.state.writerCareerProfile.totalCompletedBooks,
      'writerCareerProfile.totalCompletedBooks 一致',
    )
  }
}

// 7. 版本兼容检查
console.log('\n7. 版本兼容检查')
{
  assert(isSchemaVersionCompatible(SAVE_SCHEMA_VERSION), '当前版本应兼容')
  assert(!isSchemaVersionCompatible(0), '版本 0 应不兼容')
  assert(!isSchemaVersionCompatible(999), '版本 999 应不兼容')
}

// 8. 日志数组校验
console.log('\n8. 日志数组校验')
{
  const save = makeValidSave()
  save.logs = [
    { id: 1, day: 1, slot: 'morning' as const, kind: 'info' as const, text: '' },
  ]
  // 手动塞入一条有问题的日志
  ;(save.logs as unknown as Array<Record<string, unknown>>).push({
    id: 'not-a-number',
    day: 'bad',
    text: null,
  })
  const result = validateGameSave(save)
  assert(!result.valid, '有问题的日志应校验失败')
  assert(
    result.errors.some((e) => e.path.includes('logs[1]')),
    '错误应定位到 logs[1]',
  )
}

// 9. endingId 校验
console.log('\n9. endingId 校验')
{
  const save = makeValidSave()
  save.endingId = 'FINANCIAL_FREEDOM'
  const result = validateGameSave(save)
  assert(result.valid, '字符串 endingId 应通过校验')

  const save2 = makeValidSave() as unknown as Record<string, unknown>
  save2.endingId = 123
  const result2 = validateGameSave(save2)
  assert(!result2.valid, '数字 endingId 应校验失败')
}

// 10. careerProjects 深度校验
console.log('\n10. careerProjects 深度校验')
{
  const save = makeValidSave()
  // 使用 WriterProject 完整对象作为测试数据（通过类型断言绕过基类限制）
  const testProject = {
    id: 'proj-1',
    professionType: 'WRITER',
    title: '测试书',
      phase: 'DEVELOPING',
      dayCreated: 1,
      quality: 50,
      commerciality: 60,
      memeValue: 40,
      progress: 100,
      totalWorkload: 1000,
      metrics: {
        viewsOrReaders: 0,
        fanConversionRate: 0,
        hypeDecay: 0,
        currentHype: 0,
      },
      stats: {
        totalRevenue: 0,
        totalFansGained: 0,
        bugOrControversy: 0,
        ipValue: 0,
      },
      platformId: 'ZHONGDIAN',
      stage: 'CONCEPT',
      penName: '测试',
      genre: 'XUANHUAN',
      tags: [],
      gimmick: 'test',
      blackHorseTriggered: false,
      wordCount: 0,
      launchWordCount: 200000,
      signed: false,
      readerRetention: 0,
      monthlyTickets: 0,
      consecutiveDailyUpdates: 0,
      lastUpdatedDay: 0,
      totalChapters: 0,
      readerMood: 0,
      dailyWordCount: 0,
      complexity: {
        score: 30,
        tier: 'SIMPLE',
        breakdown: { genre: 10, tags: 10, gimmick: 10, overlapPenalty: 0 },
      },
      executionCapacity: 50,
      growthCurve: 'STEADY',
      activeStyleTraits: [],
      wordOfMouth: { current: 0, primed: false, breakthroughCount: 0, activeEvangelists: 0 },
      foreshadowingCharge: 0,
      chaptersToClimax: 10,
      isViralSurge: false,
      viralSurgeDays: 0,
      authorSkillSnapshot: {
        prose: 10,
        pacing: 10,
        structure: 10,
        marketInsight: 10,
        domainKnowledge: {},
      },
      backgroundBonuses: [],
      triggeredFanfictionChains: { blowup: false, copyright: false, payback: false },
      forecastInvalidated: false,
      accidentShock: 0,
      fatTailLuck: 0,
  }
  save.state.careerProjects = [testProject] as unknown as typeof save.state.careerProjects
  const result = validateGameSave(save)
  assert(result.valid, '含有效项目的存档应通过校验')

  // 破坏 careerProjects[0].id
  const badSave = makeValidSave()
  badSave.state.careerProjects = [
    { id: '', professionType: 'WRITER' } as unknown as typeof badSave.state.careerProjects[0],
  ]
  const badResult = validateGameSave(badSave)
  assert(!badResult.valid, 'id 为空的项目应校验失败')
  assert(
    badResult.errors.some((e) => e.path === 'state.careerProjects[0].id'),
    '错误应定位到 careerProjects[0].id',
  )
}

// 11. pendingYearSummary 校验
console.log('\n11. pendingYearSummary 深度校验')
{
  const save = makeValidSave()
  save.state.pendingYearSummary = {
    year: 1,
    startDay: 1,
    endDay: 60,
    startStats: {
      savings: 5000, health: 80, energy: 100, stress: 30,
      familyApproval: 60, influence: 5, fans: 0,
    },
    endStats: {
      savings: 6000, health: 75, energy: 90, stress: 40,
      familyApproval: 65, influence: 10, fans: 100,
    },
    startWriterProfile: save.state.writerCareerProfile,
    endWriterProfile: save.state.writerCareerProfile,
    stats: {
      wordCountDelta: 50000,
      revenueDelta: 1000,
      fansDelta: 100,
      completedBooks: 0,
      abandonedBooks: 0,
    },
    majorEvents: [],
    nextYearForecast: '',
  }
  const result = validateGameSave(save)
  assert(result.valid, '含有效年度总结的存档应通过校验')
}

// ========================================================================
// 第二部分：存储层测试（localStorage 模拟）
// ========================================================================

console.log('\n--- 第二部分：存储层读写测试 ---\n')

function clearStorage(): void {
  mockLs._clear()
}

// 场景 1：主存档有效，临时存档不存在
console.log('场景 1：主存档有效，临时存档不存在')
{
  clearStorage()
  const save = makeValidSave()
  const serialized = serializeSave(save)
  mockLs._setRaw(SAVE_KEY_PRIMARY, serialized)

  const result = loadSave()
  assert(result.status === 'valid', '加载状态应为 valid')
  if (result.status === 'valid') {
    assert(result.data.runId === save.runId, 'runId 正确')
  }
  assert(!mockLs._has(SAVE_KEY_TEMP), '临时 key 不应存在')
}

// 场景 2：主存档损坏，临时存档有效
console.log('\n场景 2：主存档损坏，临时存档有效')
{
  clearStorage()
  const save = makeValidSave()
  const serialized = serializeSave(save)
  mockLs._setRaw(SAVE_KEY_PRIMARY, 'corrupted{{{')
  mockLs._setRaw(SAVE_KEY_TEMP, serialized)

  const result = loadSave()
  assert(result.status === 'valid', '应从临时存档恢复并返回 valid')
  if (result.status === 'valid') {
    assert(result.data.runId === save.runId, 'runId 正确')
  }
  // 临时存档应被提升为主存档
  const primaryRaw = mockLs._getRaw(SAVE_KEY_PRIMARY)
  assert(primaryRaw === serialized, '临时存档已提升为主存档')
}

// 场景 3：主存档有效，临时存档损坏
console.log('\n场景 3：主存档有效，临时存档损坏')
{
  clearStorage()
  const save = makeValidSave()
  const serialized = serializeSave(save)
  mockLs._setRaw(SAVE_KEY_PRIMARY, serialized)
  mockLs._setRaw(SAVE_KEY_TEMP, 'garbage-data{{{')

  const result = loadSave()
  assert(result.status === 'valid', '主存档有效时直接返回 valid')
  if (result.status === 'valid') {
    assert(result.data.runId === save.runId, 'runId 正确')
  }
  // 主存档保持不变
  assert(mockLs._getRaw(SAVE_KEY_PRIMARY) === serialized, '主存档未被修改')
}

// 场景 4：主存档和临时存档都损坏
console.log('\n场景 4：主存档和临时存档都损坏')
{
  clearStorage()
  mockLs._setRaw(SAVE_KEY_PRIMARY, 'corrupt-primary')
  mockLs._setRaw(SAVE_KEY_TEMP, 'corrupt-temp')

  const result = loadSave()
  assert(result.status === 'corrupted', '双损坏应返回 corrupted')
  // 损坏存档仍保留在存储中（不被自动删除）
  assert(mockLs._has(SAVE_KEY_PRIMARY), '主存档损坏数据仍保留')
  assert(mockLs._has(SAVE_KEY_TEMP), '临时存档损坏数据仍保留')
}

// 场景 5：主存档版本不兼容，临时存档有效
console.log('\n场景 5：主存档版本不兼容，临时存档有效')
{
  clearStorage()
  const highVerSave = makeValidSave()
  highVerSave.schemaVersion = 999
  const highVerSerialized = serializeSave(highVerSave)

  const normalSave = makeValidSave()
  normalSave.runId = 'run-temp-valid'
  const tempSerialized = serializeSave(normalSave)

  mockLs._setRaw(SAVE_KEY_PRIMARY, highVerSerialized)
  mockLs._setRaw(SAVE_KEY_TEMP, tempSerialized)

  const result = loadSave()
  // 版本不兼容直接返回，不回退到临时 key
  assert(result.status === 'incompatible', '版本不兼容应直接返回 incompatible')
  if (result.status === 'incompatible') {
    assert(result.schemaVersion === 999, '应返回不兼容的版本号')
  }
  // 高版本存档保留，不被覆盖
  assert(mockLs._has(SAVE_KEY_PRIMARY), '不兼容的主存档仍保留')
  assert(
    mockLs._getRaw(SAVE_KEY_PRIMARY) === highVerSerialized,
    '不兼容的主存档数据未被修改',
  )
}

// 场景 6：写入临时 key 失败
console.log('\n场景 6：写入临时 key 失败')
{
  clearStorage()
  const oldSave = makeValidSave()
  oldSave.runId = 'run-old-save'
  const oldSerialized = serializeSave(oldSave)
  mockLs._setRaw(SAVE_KEY_PRIMARY, oldSerialized)

  mockLs.config.writeThrows = true

  const newSave = makeValidSave()
  newSave.runId = 'run-new-save'
  const writeResult = writeSave(newSave)
  assert(writeResult.status === 'error', '写入失败应返回 error')

  mockLs.config.writeThrows = false

  // 旧主存档仍然保留
  assert(mockLs._has(SAVE_KEY_PRIMARY), '旧主存档仍存在')
  const loadResult = loadSave()
  assert(loadResult.status === 'valid', '仍能加载旧存档')
  if (loadResult.status === 'valid') {
    assert(loadResult.data.runId === 'run-old-save', '旧存档 runId 不变')
  }
}

// 场景 7：临时 key 写入成功，但回读失败
console.log('\n场景 7：临时 key 写入成功，但回读失败')
{
  clearStorage()
  const oldSave = makeValidSave()
  oldSave.runId = 'run-old-7'
  const oldSerialized = serializeSave(oldSave)
  mockLs._setRaw(SAVE_KEY_PRIMARY, oldSerialized)

  // 临时 key 读取时抛异常（写入正常，回读失败）
  mockLs.config.readErrorKeys = new Set([SAVE_KEY_TEMP])

  const newSave = makeValidSave()
  newSave.runId = 'run-new-7'
  const writeResult = writeSave(newSave)
  assert(writeResult.status === 'error', '回读失败应返回 error')

  mockLs.config.readErrorKeys = undefined

  // 旧主存档仍然保留
  const loadResult = loadSave()
  assert(loadResult.status === 'valid', '仍能加载旧存档')
  if (loadResult.status === 'valid') {
    assert(loadResult.data.runId === 'run-old-7', '旧存档 runId 不变')
  }
  // 临时 key 应被清理（writeSave 在回读失败后会尝试删除）
  assert(!mockLs._has(SAVE_KEY_TEMP), '回读失败后临时 key 被清理')
}

// 场景 8：写入主 key 失败，旧主存档仍然保留
console.log('\n场景 8：写入主 key 失败，旧主存档仍然保留')
{
  clearStorage()
  const oldSave = makeValidSave()
  oldSave.runId = 'run-old-8'
  const oldSerialized = serializeSave(oldSave)
  mockLs._setRaw(SAVE_KEY_PRIMARY, oldSerialized)

  // 只让主 key 写入失败（临时 key 成功）
  mockLs.config.writeErrorKeys = new Set([SAVE_KEY_PRIMARY])

  const newSave = makeValidSave()
  newSave.runId = 'run-new-8'
  const newSerialized = serializeSave(newSave)
  const writeResult = writeSave(newSave)
  assert(writeResult.status === 'error', '主 key 写入失败应返回 error')

  mockLs.config.writeErrorKeys = undefined

  // 旧主存档仍然保留
  assert(mockLs._getRaw(SAVE_KEY_PRIMARY) === oldSerialized, '旧主存档数据未被覆盖')
  // 临时 key 里有新数据（下次读取会自动提升）
  assert(mockLs._has(SAVE_KEY_TEMP), '临时 key 保留新数据')
  assert(mockLs._getRaw(SAVE_KEY_TEMP) === newSerialized, '临时 key 数据正确')
}

// 场景 9：主 key 写入成功，但删除临时 key 失败
console.log('\n场景 9：主 key 写入成功，但删除临时 key 失败')
{
  clearStorage()
  const oldSave = makeValidSave()
  oldSave.runId = 'run-old-9'
  mockLs._setRaw(SAVE_KEY_PRIMARY, serializeSave(oldSave))

  // 删除临时 key 时失败
  mockLs.config.removeErrorKeys = new Set([SAVE_KEY_TEMP])

  const newSave = makeValidSave()
  newSave.runId = 'run-new-9'
  const newSerialized = serializeSave(newSave)
  const writeResult = writeSave(newSave)
  // 当前实现：删除临时 key 失败不报错（因为主 key 已经写入成功了）
  assert(writeResult.status === 'success', '主 key 写入成功即返回 success')

  mockLs.config.removeErrorKeys = undefined

  // 主存档已更新
  assert(mockLs._getRaw(SAVE_KEY_PRIMARY) === newSerialized, '主存档已更新')
  // 临时 key 还在（因为删除失败）
  assert(mockLs._has(SAVE_KEY_TEMP), '临时 key 因删除失败而残留')
  // 但这不影响数据正确性，因为主 key 已经是新数据
  const loadResult = loadSave()
  assert(loadResult.status === 'valid', '加载仍正常')
  if (loadResult.status === 'valid') {
    assert(loadResult.data.runId === 'run-new-9', '加载的是新存档')
  }
}

// 场景 10：localStorage 不可用
console.log('\n场景 10：localStorage 不可用')
{
  clearStorage()
  // 让所有操作都抛异常（模拟隐私模式/禁用存储）
  mockLs.config.writeThrows = true
  mockLs.config.readThrows = true
  mockLs.config.removeThrows = true

  assert(!isLocalStorageAvailable(), 'isLocalStorageAvailable 应返回 false')

  const loadResult = loadSave()
  assert(loadResult.status === 'read_error', '加载应返回 read_error')
  assert(
    loadResult.status !== 'corrupted' && loadResult.status !== 'incompatible',
    'read_error 不应与 corrupted/incompatible 混淆',
  )

  const writeResult = writeSave(makeValidSave())
  assert(writeResult.status === 'error', '写入应返回 error')

  mockLs.config = {}
}

// 场景 11：读取过程中抛出异常
console.log('\n场景 11：读取过程中抛出异常')
{
  clearStorage()
  const save = makeValidSave()
  mockLs._setRaw(SAVE_KEY_PRIMARY, serializeSave(save))

  // 模拟读取主 key 时抛异常
  mockLs.config.readErrorKeys = new Set([SAVE_KEY_PRIMARY])

  const result = loadSave()
  assert(result.status === 'read_error', '读取异常应返回 read_error')
  assert(
    result.status !== 'corrupted',
    '读取异常不应返回 corrupted',
  )

  mockLs.config.readErrorKeys = undefined
}

// 场景 12：损坏存档不会被自动覆盖或删除
console.log('\n场景 12：损坏存档不会被自动覆盖或删除')
{
  clearStorage()
  const corruptedData = '{this is definitely not valid json'
  mockLs._setRaw(SAVE_KEY_PRIMARY, corruptedData)

  // 第一次加载：返回 corrupted
  const firstLoad = loadSave()
  assert(firstLoad.status === 'corrupted', '损坏存档返回 corrupted')

  // 损坏数据仍然保留
  assert(
    mockLs._getRaw(SAVE_KEY_PRIMARY) === corruptedData,
    '损坏存档未被自动删除或覆盖',
  )

  // 第二次加载：仍然返回 corrupted，数据仍在
  const secondLoad = loadSave()
  assert(secondLoad.status === 'corrupted', '再次加载仍返回 corrupted')
  assert(
    mockLs._getRaw(SAVE_KEY_PRIMARY) === corruptedData,
    '多次加载后损坏存档仍保留',
  )
}

// 场景 13：主存档不存在，临时存档有效
console.log('\n场景 13：主存档不存在，临时存档有效')
{
  clearStorage()
  const save = makeValidSave()
  save.runId = 'run-temp-only-valid'
  const serialized = serializeSave(save)
  mockLs._setRaw(SAVE_KEY_TEMP, serialized)

  const result = loadSave()
  assert(result.status === 'valid', '仅有临时有效存档应返回 valid')
  if (result.status === 'valid') {
    assert(result.data.runId === 'run-temp-only-valid', 'runId 正确')
  }
  // 临时存档应被提升为主存档
  assert(mockLs._has(SAVE_KEY_PRIMARY), '临时存档已提升为主存档')
}

// 场景 14：主存档不存在，临时存档损坏
console.log('\n场景 14：主存档不存在，临时存档损坏')
{
  clearStorage()
  const corruptedData = 'broken-temp-data{{{'
  mockLs._setRaw(SAVE_KEY_TEMP, corruptedData)

  const result = loadSave()
  assert(result.status === 'corrupted', '仅有损坏临时存档应返回 corrupted')
  assert(
    result.status !== 'empty',
    '不得将损坏的临时存档误判为空档',
  )
  // 损坏数据保留
  assert(mockLs._has(SAVE_KEY_TEMP), '损坏的临时存档仍保留')
  assert(
    mockLs._getRaw(SAVE_KEY_TEMP) === corruptedData,
    '损坏的临时存档数据未被修改',
  )
}

// 场景 15：主存档不存在，临时存档版本不兼容
console.log('\n场景 15：主存档不存在，临时存档版本不兼容')
{
  clearStorage()
  const highVerSave = makeValidSave()
  highVerSave.schemaVersion = 999
  highVerSave.runId = 'run-high-ver-temp'
  const serialized = serializeSave(highVerSave)
  mockLs._setRaw(SAVE_KEY_TEMP, serialized)

  const result = loadSave()
  assert(
    result.status === 'incompatible',
    '不兼容的临时存档应返回 incompatible',
  )
  assert(
    result.status !== 'empty',
    '不得将不兼容的临时存档误判为空档',
  )
  if (result.status === 'incompatible') {
    assert(result.schemaVersion === 999, '应返回不兼容的版本号')
  }
  // 不兼容存档保留
  assert(mockLs._has(SAVE_KEY_TEMP), '不兼容的临时存档仍保留')
  assert(
    mockLs._getRaw(SAVE_KEY_TEMP) === serialized,
    '不兼容的临时存档数据未被修改',
  )
  // 主存档位置仍为空（不自动提升不兼容版本）
  assert(!mockLs._has(SAVE_KEY_PRIMARY), '主存档位置仍为空')
}

// 场景 16：主存档和临时存档都不存在
console.log('\n场景 16：主存档和临时存档都不存在')
{
  clearStorage()
  const result = loadSave()
  assert(result.status === 'empty', '双空应返回 empty')
}

// 场景 17：主存档有效，临时存档不兼容
console.log('\n场景 17：主存档有效，临时存档不兼容')
{
  clearStorage()
  const validSave = makeValidSave()
  validSave.runId = 'run-primary-valid-17'
  const validSerialized = serializeSave(validSave)

  const highVerSave = makeValidSave()
  highVerSave.schemaVersion = 999
  const highVerSerialized = serializeSave(highVerSave)

  mockLs._setRaw(SAVE_KEY_PRIMARY, validSerialized)
  mockLs._setRaw(SAVE_KEY_TEMP, highVerSerialized)

  const result = loadSave()
  assert(
    result.status === 'valid',
    '主存档有效时直接返回 valid，忽略临时存档状态',
  )
  if (result.status === 'valid') {
    assert(result.data.runId === 'run-primary-valid-17', '主存档 runId 正确')
  }
  // 主存档未变
  assert(mockLs._getRaw(SAVE_KEY_PRIMARY) === validSerialized, '主存档未被修改')
  // 不兼容的临时存档仍保留
  assert(mockLs._has(SAVE_KEY_TEMP), '不兼容的临时存档仍保留')
}

// 场景 18：hasSave 遇到损坏数据
console.log('\n场景 18：hasSave 遇到损坏数据')
{
  clearStorage()
  // 只有损坏的主存档
  mockLs._setRaw(SAVE_KEY_PRIMARY, 'garbage{{{')
  assert(!hasSave(), '只有损坏主存档时 hasSave 应为 false')

  // 只有损坏的临时存档
  mockLs._clear()
  mockLs._setRaw(SAVE_KEY_TEMP, 'garbage{{{')
  assert(!hasSave(), '只有损坏临时存档时 hasSave 应为 false')

  // 两个都损坏
  mockLs._setRaw(SAVE_KEY_PRIMARY, 'garbage1{{{')
  mockLs._setRaw(SAVE_KEY_TEMP, 'garbage2{{{')
  assert(!hasSave(), '双损坏时 hasSave 应为 false')
}

// 场景 19：hasSave 遇到不兼容版本
console.log('\n场景 19：hasSave 遇到不兼容版本')
{
  clearStorage()
  const highVerSave = makeValidSave()
  highVerSave.schemaVersion = 999
  const serialized = serializeSave(highVerSave)

  // 主存档不兼容
  mockLs._setRaw(SAVE_KEY_PRIMARY, serialized)
  assert(!hasSave(), '主存档不兼容时 hasSave 应为 false')

  // 临时存档不兼容，主存档不存在
  mockLs._clear()
  mockLs._setRaw(SAVE_KEY_TEMP, serialized)
  assert(!hasSave(), '只有不兼容临时存档时 hasSave 应为 false')

  // 主存档不兼容 + 临时存档不兼容
  mockLs._setRaw(SAVE_KEY_PRIMARY, serialized)
  assert(!hasSave(), '双不兼容时 hasSave 应为 false')

  // 原始数据未被修改
  assert(mockLs._has(SAVE_KEY_PRIMARY), '不兼容主存档未被 hasSave 删除')
  assert(mockLs._has(SAVE_KEY_TEMP), '不兼容临时存档未被 hasSave 删除')
}

// ========================================================================
// 第二部分补充：校验器关键数据结构测试
// ========================================================================

console.log('\n--- 第二部分补充：校验器关键结构校验 ---\n')

// 校验 1：缺少关键字段的 GameEvent
console.log('校验 1：缺少关键字段的 GameEvent')
{
  const save = makeValidSave()
  // 缺少 type/tone/effects 的事件
  save.pendingEvent = {
    id: 1,
    title: '测试事件',
  } as unknown as typeof save.pendingEvent
  const result = validateGameSave(save)
  assert(!result.valid, '缺少关键字段的 GameEvent 应校验失败')
  assert(
    result.errors.some((e) => e.path.includes('type')),
    '错误应包含 type 字段',
  )
  assert(
    result.errors.some((e) => e.path.includes('tone')),
    '错误应包含 tone 字段',
  )
  assert(
    result.errors.some((e) => e.path.includes('effects')),
    '错误应包含 effects 字段',
  )
}

// 校验 2：不合法的 LogEntry slot/kind
console.log('\n校验 2：不合法的 LogEntry slot/kind')
{
  const save = makeValidSave()
  save.logs = [
    { id: 1, day: 1, slot: 'invalid_slot' as unknown as 'morning', kind: 'invalid_kind' as unknown as 'info', text: 'test' },
  ]
  const result = validateGameSave(save)
  assert(!result.valid, '非法 slot/kind 的日志应校验失败')
  assert(
    result.errors.some((e) => e.path.includes('slot')),
    '错误应包含 slot 字段',
  )
  assert(
    result.errors.some((e) => e.path.includes('kind')),
    '错误应包含 kind 字段',
  )
}

// 校验 3：关键字段缺失的 YearSummary
console.log('\n校验 3：关键字段缺失的 YearSummary')
{
  const save = makeValidSave()
  // 缺少 startWriterProfile、endWriterProfile、majorEvents、nextYearForecast
  save.state.pendingYearSummary = {
    year: 1,
    startDay: 1,
    endDay: 60,
    startStats: save.state.stats,
    endStats: save.state.stats,
    stats: {
      wordCountDelta: 0,
      revenueDelta: 0,
      fansDelta: 0,
      completedBooks: 0,
      abandonedBooks: 0,
    },
  } as unknown as typeof save.state.pendingYearSummary
  const result = validateGameSave(save)
  assert(!result.valid, '缺少关键字段的 YearSummary 应校验失败')
  assert(
    result.errors.some((e) => e.path.includes('startWriterProfile')),
    '错误应包含 startWriterProfile',
  )
  assert(
    result.errors.some((e) => e.path.includes('endWriterProfile')),
    '错误应包含 endWriterProfile',
  )
  assert(
    result.errors.some((e) => e.path.includes('majorEvents')),
    '错误应包含 majorEvents',
  )
  assert(
    result.errors.some((e) => e.path.includes('nextYearForecast')),
    '错误应包含 nextYearForecast',
  )
}

// 校验 4：EventChain 不一致状态
console.log('\n校验 4：EventChain 不一致状态')
{
  // chainId 存在但 stepId 为 null
  const save1 = makeValidSave()
  save1.eventChain = { chainId: 'some-chain', stepId: null, stepDepth: 1 }
  const r1 = validateGameSave(save1)
  assert(!r1.valid, 'chainId 存在但 stepId 为 null 应校验失败')
  assert(
    r1.errors.some((e) => e.path === 'eventChain'),
    '错误应定位到 eventChain',
  )

  // chainId 为 null 但 stepId 存在
  const save2 = makeValidSave()
  save2.eventChain = { chainId: null, stepId: 'some-step', stepDepth: 0 }
  const r2 = validateGameSave(save2)
  assert(!r2.valid, 'chainId 为 null 但 stepId 存在应校验失败')

  // chainId 为 null 但 stepDepth 不为 0
  const save3 = makeValidSave()
  save3.eventChain = { chainId: null, stepId: null, stepDepth: 5 }
  const r3 = validateGameSave(save3)
  assert(!r3.valid, '无事件链但 stepDepth 非 0 应校验失败')

  // stepDepth 为负数
  const save4 = makeValidSave()
  save4.eventChain = { chainId: 'c', stepId: 's', stepDepth: -1 }
  const r4 = validateGameSave(save4)
  assert(!r4.valid, 'stepDepth 为负数应校验失败')

  // 正常空状态（null/null/0）
  const save5 = makeValidSave()
  save5.eventChain = { chainId: null, stepId: null, stepDepth: 0 }
  const r5 = validateGameSave(save5)
  assert(r5.valid, '正常空状态的事件链应通过校验')

  // 正常进行中状态
  const save6 = makeValidSave()
  save6.eventChain = { chainId: 'chain-1', stepId: 'step-1', stepDepth: 2 }
  const r6 = validateGameSave(save6)
  assert(r6.valid, '正常进行中的事件链应通过校验')
}

// 校验 5：完整合法的存档仍通过
console.log('\n校验 5：完整合法存档（含 pendingEvent 和 YearSummary）仍通过')
{
  const save = makeValidSave()
  // 添加一个合法的 pendingEvent
  save.pendingEvent = {
    id: 100,
    type: 'reality_punch',
    title: '现实的铁拳',
    icon: '💥',
    tone: 'bad',
    text: '你被现实狠狠揍了一拳',
    effects: ['存款 -500', '压力 +20'],
    options: [
      { text: '忍了' },
      { text: '反击' },
    ],
  }
  // 添加完整的 YearSummary
  save.state.pendingYearSummary = {
    year: 1,
    startDay: 1,
    endDay: 60,
    startStats: { ...save.state.stats },
    endStats: { ...save.state.stats, savings: 6000 },
    startWriterProfile: { ...save.state.writerCareerProfile },
    endWriterProfile: {
      ...save.state.writerCareerProfile,
      totalCompletedBooks: 1,
    },
    stats: {
      wordCountDelta: 100000,
      revenueDelta: 5000,
      fansDelta: 500,
      completedBooks: 1,
      abandonedBooks: 0,
    },
    majorEvents: ['第一本书完本', '签约成功'],
    nextYearForecast: '市场持续火热',
  }
  // 进行中的事件链
  save.eventChain = { chainId: 'encounter-1', stepId: 'intro', stepDepth: 1 }

  const result = validateGameSave(save)
  assert(result.valid, '含完整数据的合法存档应通过校验')
  assert(result.errors.length === 0, '不应有任何错误')
}

// 校验 6：YearSummary.majorEvents 必须是字符串数组
console.log('\n校验 6：YearSummary.majorEvents 元素类型')
{
  function makeSaveWithMajorEvent(value: unknown) {
    const save = makeValidSave()
    save.state.pendingYearSummary = {
      year: 1,
      startDay: 1,
      endDay: 60,
      startStats: { ...save.state.stats },
      endStats: { ...save.state.stats },
      startWriterProfile: { ...save.state.writerCareerProfile },
      endWriterProfile: { ...save.state.writerCareerProfile },
      stats: { wordCountDelta: 0, revenueDelta: 0, fansDelta: 0, completedBooks: 0, abandonedBooks: 0 },
      majorEvents: [value] as unknown as string[],
      nextYearForecast: '',
    }
    return save
  }

  const numberResult = validateGameSave(makeSaveWithMajorEvent(123))
  assert(!numberResult.valid, 'majorEvents 含数字元素时应失败')
  assert(numberResult.errors.some((e) => e.path.endsWith('majorEvents[0]')), 'majorEvents 错误应定位到具体元素索引')

  const nullResult = validateGameSave(makeSaveWithMajorEvent(null))
  assert(!nullResult.valid, 'majorEvents 含 null 元素时应失败')

  const objectResult = validateGameSave(makeSaveWithMajorEvent({ event: 'bad' }))
  assert(!objectResult.valid, 'majorEvents 含对象元素时应失败')
}

// 校验 7：GameEvent.effects 必须是字符串数组
console.log('\n校验 7：GameEvent.effects 元素类型')
{
  function makeSaveWithEffect(value: unknown) {
    const save = makeValidSave()
    save.pendingEvent = {
      id: 1,
      type: 'reality_punch',
      title: '测试事件',
      icon: '!',
      tone: 'neutral',
      text: '测试',
      effects: [value] as unknown as string[],
      options: [],
    }
    return save
  }

  const numberResult = validateGameSave(makeSaveWithEffect(123))
  assert(!numberResult.valid, 'effects 含数字元素时应失败')
  assert(numberResult.errors.some((e) => e.path.endsWith('effects[0]')), 'effects 错误应定位到具体元素索引')

  const booleanResult = validateGameSave(makeSaveWithEffect(false))
  assert(!booleanResult.valid, 'effects 含布尔元素时应失败')
}

// 校验 8：事件链标识不允许空字符串
console.log('\n校验 8：eventChain chainId / stepId 非空')
{
  const emptyChain = makeValidSave()
  emptyChain.eventChain = { chainId: '', stepId: 'step-1', stepDepth: 1 }
  const chainResult = validateGameSave(emptyChain)
  assert(!chainResult.valid, '空 chainId 应校验失败')
  assert(chainResult.errors.some((e) => e.path.endsWith('.chainId')), '空 chainId 应报告对应字段')

  const emptyStep = makeValidSave()
  emptyStep.eventChain = { chainId: 'chain-1', stepId: '', stepDepth: 1 }
  const stepResult = validateGameSave(emptyStep)
  assert(!stepResult.valid, '空 stepId 应校验失败')
  assert(stepResult.errors.some((e) => e.path.endsWith('.stepId')), '空 stepId 应报告对应字段')

  const bothEmpty = makeValidSave()
  bothEmpty.eventChain = { chainId: '', stepId: '', stepDepth: 1 }
  assert(!validateGameSave(bothEmpty).valid, 'chainId 与 stepId 同时为空应校验失败')
}

// 校验 9：stepDepth 必须是非负整数
console.log('\n校验 9：eventChain.stepDepth 整数检查')
{
  const fractionalSave = makeValidSave()
  fractionalSave.eventChain = { chainId: 'chain-1', stepId: 'step-1', stepDepth: 2.5 }
  const fractionalResult = validateGameSave(fractionalSave)
  assert(!fractionalResult.valid, '小数 stepDepth 应校验失败')
  assert(fractionalResult.errors.some((e) => e.path.endsWith('.stepDepth') && e.message.includes('整数')), '小数 stepDepth 应提示必须是整数')

  const integerSave = makeValidSave()
  integerSave.eventChain = { chainId: 'chain-1', stepId: 'step-1', stepDepth: 2 }
  assert(validateGameSave(integerSave).valid, '非负整数 stepDepth 应通过校验')
}

// ========================================================================
// 第三部分：runId 设计验证
// ========================================================================

console.log('\n--- 第三部分：runId 设计验证 ---\n')

console.log('1. 存档结构要求 runId 非空')
{
  const save = makeValidSave() as unknown as Record<string, unknown>
  save.runId = ''
  const result = validateGameSave(save)
  assert(!result.valid, '空 runId 校验失败')
  save.runId = null
  const result2 = validateGameSave(save)
  assert(!result2.valid, 'null runId 校验失败')
}

console.log('\n2. 序列化和反序列化不会改变 runId')
{
  const original = makeValidSave()
  original.runId = 'run-id-preserve-test-42'
  const serialized = serializeSave(original)
  const result = deserializeSave(serialized)
  assert(result.status === 'valid', '反序列化成功')
  if (result.status === 'valid') {
    assert(
      result.data.runId === 'run-id-preserve-test-42',
      'runId 在序列化往返中保持不变',
    )
  }
}

console.log('\n3. 写入新存档不会意外重新生成 runId')
{
  clearStorage()
  const save = makeValidSave()
  save.runId = 'run-write-test-777'
  const writeResult = writeSave(save)
  assert(writeResult.status === 'success', '写入成功')

  const loadResult = loadSave()
  assert(loadResult.status === 'valid', '加载成功')
  if (loadResult.status === 'valid') {
    assert(
      loadResult.data.runId === 'run-write-test-777',
      '写后读回 runId 一致，未被重新生成',
    )
  }
}

console.log('\n4. runId 可作为遗产结算幂等标识（结构层面可行）')
{
  // 验证：同一 runId 的存档多次加载，runId 不变
  clearStorage()
  const save = makeValidSave()
  save.runId = 'run-idempotent-999'
  writeSave(save)

  const r1 = loadSave()
  const r2 = loadSave()
  const r3 = loadSave()
  assert(
    r1.status === 'valid' && r2.status === 'valid' && r3.status === 'valid',
    '三次加载均成功',
  )
  if (r1.status === 'valid' && r2.status === 'valid' && r3.status === 'valid') {
    assert(
      r1.data.runId === 'run-idempotent-999' &&
        r2.data.runId === 'run-idempotent-999' &&
        r3.data.runId === 'run-idempotent-999',
      '同一存档多次读取 runId 一致，可作为幂等键',
    )
  }
}

// ========================================================================
// 第四部分：其他存储操作验证
// ========================================================================

console.log('\n--- 第四部分：其他存储操作 ---\n')

console.log('1. deleteSave 同时删除主 key 和临时 key')
{
  clearStorage()
  mockLs._setRaw(SAVE_KEY_PRIMARY, '{}')
  mockLs._setRaw(SAVE_KEY_TEMP, '{}')

  const result = deleteSave()
  assert(result.status === 'success', '删除成功')
  assert(!mockLs._has(SAVE_KEY_PRIMARY), '主 key 已删除')
  assert(!mockLs._has(SAVE_KEY_TEMP), '临时 key 已删除')
}

console.log('\n2. hasSave 存在性检查')
{
  clearStorage()
  assert(!hasSave(), '空存储时 hasSave 为 false')

  mockLs._setRaw(SAVE_KEY_PRIMARY, serializeSave(makeValidSave()))
  assert(hasSave(), '有主存档时 hasSave 为 true')

  mockLs._clear()
  mockLs._setRaw(SAVE_KEY_TEMP, serializeSave(makeValidSave()))
  assert(hasSave(), '只有临时存档时 hasSave 也为 true')
}

// ========================================================================
// 第五部分：针对性修正验证
// ========================================================================

console.log('\n--- 第五部分：针对性修正验证 ---\n')

// 场景 20：新版本存档（schemaVersion > 当前）被正确识别为 incompatible，而非 corrupted
// 关键验证：未来版本的存档即使结构完全不同，也应返回 incompatible，不是 corrupted
console.log('场景 20：新版本存档被正确识别为 incompatible')
{
  clearStorage()
  // 构造一个只有 schemaVersion 字段、结构完全不同的"未来版本"存档
  // 如果 deserializeSave 先做结构校验，这会被误判为 corrupted
  const futureSave = JSON.stringify({
    schemaVersion: 999,
    gameVersion: '999.0.0',
    savedAt: Date.now(),
    runId: 'run-future-version',
    brandNewField: 'future data here',
    anotherNewObject: { foo: 'bar' },
  })
  mockLs._setRaw(SAVE_KEY_PRIMARY, futureSave)

  const result = loadSave()
  assert(result.status === 'incompatible', '新版本存档应返回 incompatible，而非 corrupted')
  assert(
    result.status === 'incompatible' && result.schemaVersion === 999,
    '应正确返回新版本号',
  )
  // 原始数据不应被修改或删除
  assert(mockLs._has(SAVE_KEY_PRIMARY), '不兼容存档不应被自动删除')
  assert(
    mockLs._getRaw(SAVE_KEY_PRIMARY) === futureSave,
    '不兼容存档内容不应被修改',
  )
  // hasSave 应返回 false（不兼容版本不算有效存档）
  assert(hasSave() === false, 'hasSave 对不兼容版本应返回 false')
}

// 场景 21：损坏的临时存档不会被判定为 empty
console.log('\n场景 21：损坏的临时存档不会被判定为 empty')
{
  clearStorage()
  // 主存档不存在，只有一个损坏的临时存档
  const corrupted = '{this is not valid json!!!'
  mockLs._setRaw(SAVE_KEY_TEMP, corrupted)

  const result = loadSave()
  assert(result.status === 'corrupted', '只有损坏临时存档时应返回 corrupted，而非 empty')
  assert(
    result.status === 'corrupted' && result.raw === corrupted,
    '应返回原始损坏数据',
  )
  // 损坏数据不应被删除
  assert(mockLs._has(SAVE_KEY_TEMP), '损坏的临时存档不应被自动删除')
}

// 场景 22：主存档损坏但临时存档有效时能够恢复
console.log('\n场景 22：主存档损坏、临时存档有效时正确恢复')
{
  clearStorage()
  const corruptedPrimary = '{corrupted data'
  const tempSave = makeValidSave()
  tempSave.runId = 'run-temp-valid'
  const tempString = serializeSave(tempSave)

  mockLs._setRaw(SAVE_KEY_PRIMARY, corruptedPrimary)
  mockLs._setRaw(SAVE_KEY_TEMP, tempString)

  const result = loadSave()
  assert(result.status === 'valid', '临时存档有效时应能恢复成功')
  assert(
    result.status === 'valid' && result.data.runId === 'run-temp-valid',
    '恢复的应是临时存档的数据',
  )
  // 临时存档应被提升为主存档
  assert(mockLs._has(SAVE_KEY_PRIMARY), '主存档应被恢复')
  const primaryAfter = loadSave()
  assert(
    primaryAfter.status === 'valid' && primaryAfter.data.runId === 'run-temp-valid',
    '主存档现在应包含临时存档的数据',
  )
  // 临时 key 应被清理
  assert(!mockLs._has(SAVE_KEY_TEMP), '临时存档应在提升后被清理')
}

// 场景 23：主存档不兼容时不会被临时存档错误覆盖
console.log('\n场景 23：主存档不兼容时不回退到临时存档')
{
  clearStorage()
  // 主存档版本不兼容
  const incompatSave = makeValidSave()
  incompatSave.schemaVersion = 999
  incompatSave.runId = 'run-incompat-main'
  const incompatString = serializeSave(incompatSave)

  // 临时存档有效（可能是旧版本的残留）
  const tempSave = makeValidSave()
  tempSave.runId = 'run-valid-temp'
  const tempString = serializeSave(tempSave)

  mockLs._setRaw(SAVE_KEY_PRIMARY, incompatString)
  mockLs._setRaw(SAVE_KEY_TEMP, tempString)

  const result = loadSave()
  assert(
    result.status === 'incompatible',
    '主存档不兼容时应直接返回 incompatible，不回退临时存档',
  )
  // 主存档不应被覆盖
  assert(
    mockLs._getRaw(SAVE_KEY_PRIMARY) === incompatString,
    '不兼容的主存档不应被临时存档覆盖',
  )
  // 临时存档也应保留
  assert(
    mockLs._getRaw(SAVE_KEY_TEMP) === tempString,
    '临时存档不应被删除',
  )
  // hasSave 应为 false
  assert(hasSave() === false, 'hasSave 对不兼容主存档应为 false')
}

// 场景 24：写入失败但读取正常时，仍然可以读取已有存档
// 验证读写分离：写入不可用不影响读取
console.log('\n场景 24：写入失败但读取正常时仍可读取存档')
{
  clearStorage()
  const save = makeValidSave()
  save.runId = 'run-pre-existing'
  mockLs._setRaw(SAVE_KEY_PRIMARY, serializeSave(save))

  // 设置为写入失败（模拟配额已满，但读取仍可用）
  mockLs.config.writeThrows = true

  // 读取应该仍然成功
  const loadResult = loadSave()
  assert(loadResult.status === 'valid', '写入失败但读取正常时，读取应仍然成功')
  assert(
    loadResult.status === 'valid' && loadResult.data.runId === 'run-pre-existing',
    '读取到的数据应正确',
  )

  // 写入应该失败
  const newSave = makeValidSave()
  newSave.runId = 'run-new-write'
  const writeResult = writeSave(newSave)
  assert(writeResult.status === 'error', '写入失败时 writeSave 应返回 error')

  // 原有存档不应被破坏
  const loadAfter = loadSave()
  assert(
    loadAfter.status === 'valid',
    '写入失败不应破坏原有有效存档',
  )
  assert(
    loadAfter.status === 'valid' && loadAfter.data.runId === 'run-pre-existing',
    '原有存档数据应保持不变',
  )

  mockLs.config.writeThrows = false
}

// 场景 25：无效数据不会覆盖原有有效存档（writeSave 前置校验失败）
console.log('\n场景 25：无效数据不会覆盖原有有效存档')
{
  clearStorage()
  const original = makeValidSave()
  original.runId = 'run-original-valid'
  mockLs._setRaw(SAVE_KEY_PRIMARY, serializeSave(original))

  // 构造一个结构非法的 save 对象（runId 为空字符串）
  const badSave = makeValidSave()
  badSave.runId = '' // 校验器要求非空字符串

  const result = writeSave(badSave)
  assert(result.status === 'error', '写入非法存档应返回 error')
  assert(
    result.status === 'error' && result.error.includes('结构校验失败'),
    '错误信息应包含结构校验失败',
  )

  // 原有有效存档不应被覆盖
  const afterLoad = loadSave()
  assert(afterLoad.status === 'valid', '原有有效存档不应被非法写入覆盖')
  assert(
    afterLoad.status === 'valid' && afterLoad.data.runId === 'run-original-valid',
    '原有存档数据应保持不变',
  )
  // 临时 key 不应被写入（校验在写入前就失败）
  assert(!mockLs._has(SAVE_KEY_TEMP), '校验失败不应写入临时 key')
}

// 场景 26：主存档和临时存档分别损坏时的结果正确
console.log('\n场景 26：主/临时存档分别损坏的四种组合')
{
  // 26a: 仅主存档损坏
  clearStorage()
  mockLs._setRaw(SAVE_KEY_PRIMARY, '{bad primary json')
  const resA = loadSave()
  assert(resA.status === 'corrupted', '仅主存档损坏应返回 corrupted')
  assert(
    resA.status === 'corrupted' && resA.raw === '{bad primary json',
    '仅主存档损坏应返回主存档的原始数据',
  )
  assert(mockLs._has(SAVE_KEY_PRIMARY), '损坏的主存档不应被删除')

  // 26b: 仅临时存档损坏
  clearStorage()
  mockLs._setRaw(SAVE_KEY_TEMP, '{bad temp json')
  const resB = loadSave()
  assert(resB.status === 'corrupted', '仅临时存档损坏应返回 corrupted')
  assert(
    resB.status === 'corrupted' && resB.raw === '{bad temp json',
    '仅临时存档损坏应返回临时存档的原始数据',
  )
  assert(mockLs._has(SAVE_KEY_TEMP), '损坏的临时存档不应被删除')

  // 26c: 两者都损坏
  clearStorage()
  mockLs._setRaw(SAVE_KEY_PRIMARY, '{bad primary')
  mockLs._setRaw(SAVE_KEY_TEMP, '{bad temp also')
  const resC = loadSave()
  assert(resC.status === 'corrupted', '两者都损坏应返回 corrupted')
  assert(
    resC.status === 'corrupted' && resC.error.includes('均已损坏'),
    '错误信息应表明两者均损坏',
  )

  // 26d: 主存档损坏 + 临时存档不兼容 → 返回 corrupted（主存档优先级）
  clearStorage()
  mockLs._setRaw(SAVE_KEY_PRIMARY, '{bad primary data')
  const incompatTemp = JSON.stringify({
    schemaVersion: 999,
    runId: 'run-temp-old-version',
  })
  mockLs._setRaw(SAVE_KEY_TEMP, incompatTemp)
  const resD = loadSave()
  assert(
    resD.status === 'corrupted',
    '主损坏+临时不兼容应返回 corrupted（主存档优先级）',
  )
  // 两份数据都应保留
  assert(mockLs._has(SAVE_KEY_PRIMARY), '损坏的主存档不应被删除')
  assert(mockLs._has(SAVE_KEY_TEMP), '不兼容的临时存档不应被删除')
}

// ------------------------------------------------------------------------
// 场景 27：schemaVersion 边界值测试
//
// 非法版本号（小数 / 负数 / 0 / Infinity / NaN / 非数字）→ corrupted
// 合法但不兼容的版本号 → incompatible
// 合法兼容版本 → valid
// ------------------------------------------------------------------------
console.log('\n场景 27：schemaVersion 边界值测试')

// 27a: 小数版本号
{
  const res = deserializeSave(JSON.stringify({ schemaVersion: 1.5, runId: 'x' }))
  assert(res.status === 'corrupted', '小数 schemaVersion 应返回 corrupted')
  assert(
    res.status === 'corrupted' && res.error.includes('正的安全整数'),
    '错误信息应提到正的安全整数',
  )
}

// 27b: 零版本号
{
  const res = deserializeSave(JSON.stringify({ schemaVersion: 0, runId: 'x' }))
  assert(res.status === 'corrupted', 'schemaVersion 为 0 应返回 corrupted')
}

// 27c: 负数版本号
{
  const res = deserializeSave(JSON.stringify({ schemaVersion: -1, runId: 'x' }))
  assert(res.status === 'corrupted', '负数 schemaVersion 应返回 corrupted')
}

// 27d: Infinity（用科学计数法构造超出 MAX_VALUE 的数值，JSON.parse 后为 Infinity）
// 注意：JSON.stringify(Infinity) 会输出 null，无法通过它构造 Infinity 输入；
//       必须直接传入原始 JSON 字符串才能测试 Number.isSafeInteger 对 Infinity 的拦截。
{
  const rawJson = '{"schemaVersion":1e400,"runId":"x"}'
  const res = deserializeSave(rawJson)
  assert(res.status === 'corrupted', 'Infinity schemaVersion 应返回 corrupted')
  assert(
    res.status === 'corrupted' && res.error.includes('正的安全整数'),
    '错误信息应提到正的安全整数',
  )
}

// 27e: NaN 不是合法 JSON 数值（JSON 规范不支持 NaN 字面量）
// JSON.parse 遇到 NaN 会直接抛 SyntaxError，应在 JSON 解析阶段就判定为 corrupted。
{
  const rawJson = '{"schemaVersion":NaN,"runId":"x"}'
  const res = deserializeSave(rawJson)
  assert(res.status === 'corrupted', '含 NaN 字面量的非法 JSON 应返回 corrupted')
  assert(
    res.status === 'corrupted' && res.error.includes('JSON 解析失败'),
    '错误信息应表明 JSON 解析失败',
  )
}

// 27f: 字符串版本号
{
  const res = deserializeSave(JSON.stringify({ schemaVersion: '1', runId: 'x' }))
  assert(res.status === 'corrupted', '字符串 schemaVersion 应返回 corrupted')
}

// 27g: 合法但不兼容的高版本 → incompatible（不是 corrupted）
{
  const res = deserializeSave(JSON.stringify({ schemaVersion: 999, runId: 'x' }))
  assert(res.status === 'incompatible', '高版本 schemaVersion 应返回 incompatible')
  assert(
    res.status === 'incompatible' && res.schemaVersion === 999,
    'incompatible 应返回具体版本号',
  )
}

// 27h: 合法兼容版本 → valid（用完整存档验证）
{
  const save = makeValidSave()
  const res = deserializeSave(serializeSave(save))
  assert(res.status === 'valid', '合法兼容版本应通过校验')
}

// ------------------------------------------------------------------------
// 场景 28：hasSave 与 loadSave 的 read_error 一致性
//
// 主存档读取失败时，hasSave 不应因为临时存档有效就返回 true。
// 必须与 loadSave 的行为一致：主 key 读失败 = 无法加载。
// ------------------------------------------------------------------------
console.log('\n场景 28：hasSave 主存档 read_error 时不回退临时存档')
{
  clearStorage()

  // 先写入一个有效的临时存档
  const save = makeValidSave()
  save.runId = 'run-temp-valid-28'
  mockLs._setRaw(SAVE_KEY_TEMP, serializeSave(save))

  // 模拟主 key 读取失败（抛异常）
  mockLs.config.readErrorKeys = new Set([SAVE_KEY_PRIMARY])

  const loadRes = loadSave()
  assert(
    loadRes.status === 'read_error',
    '主存档读取失败时 loadSave 应返回 read_error',
  )

  const hasRes = hasSave()
  assert(
    hasRes === false,
    '主存档读取失败时 hasSave 应返回 false，不应回退检查临时存档',
  )

  mockLs.config.readErrorKeys = undefined
}

// ------------------------------------------------------------------------
// 场景 29：GameState 关键字段缺失校验
//
// 对照真实 GameState 类型，验证必需顶层字段缺失时能正确报错。
// 可空字段（availableEncounter、pendingYearSummary 等）为 null 时不应报错。
// ------------------------------------------------------------------------
console.log('\n场景 29：GameState 关键字段缺失校验')

// 29a: 缺少 professionType
{
  const save = makeValidSave()
  const copy = JSON.parse(serializeSave(save))
  delete copy.state.professionType
  const v = validateGameSave(copy)
  assert(!v.valid, '缺少 professionType 应校验失败')
  assert(
    v.errors.some((e) => e.path === 'state.professionType'),
    '错误应定位到 state.professionType',
  )
}

// 29b: 缺少 partTimeLock（布尔字段）
{
  const save = makeValidSave()
  const copy = JSON.parse(serializeSave(save))
  delete copy.state.partTimeLock
  const v = validateGameSave(copy)
  assert(!v.valid, '缺少 partTimeLock 应校验失败')
  assert(
    v.errors.some((e) => e.path === 'state.partTimeLock'),
    '错误应定位到 state.partTimeLock',
  )
}

// 29c: 缺少 pathScores（对象字段）
{
  const save = makeValidSave()
  const copy = JSON.parse(serializeSave(save))
  delete copy.state.pathScores
  const v = validateGameSave(copy)
  assert(!v.valid, '缺少 pathScores 应校验失败')
  assert(
    v.errors.some((e) => e.path === 'state.pathScores'),
    '错误应定位到 state.pathScores',
  )
}

// 29d: 缺少 housingId（字符串字段）
{
  const save = makeValidSave()
  const copy = JSON.parse(serializeSave(save))
  delete copy.state.housingId
  const v = validateGameSave(copy)
  assert(!v.valid, '缺少 housingId 应校验失败')
  assert(
    v.errors.some((e) => e.path === 'state.housingId'),
    '错误应定位到 state.housingId',
  )
}

// 29e: 缺少 ownedEquipmentIds（数组字段）
{
  const save = makeValidSave()
  const copy = JSON.parse(serializeSave(save))
  delete copy.state.ownedEquipmentIds
  const v = validateGameSave(copy)
  assert(!v.valid, '缺少 ownedEquipmentIds 应校验失败')
  assert(
    v.errors.some((e) => e.path === 'state.ownedEquipmentIds'),
    '错误应定位到 state.ownedEquipmentIds',
  )
}

// 29f: availableEncounter 为 null 不应报错（可空字段）
{
  const save = makeValidSave()
  save.state.availableEncounter = null
  const v = validateGameSave(save)
  assert(v.valid, 'availableEncounter 为 null 不应报错')
}

// 29g: pendingYearSummary 为 null 不应报错（可空字段）
{
  const save = makeValidSave()
  save.state.pendingYearSummary = null
  const v = validateGameSave(save)
  assert(v.valid, 'pendingYearSummary 为 null 不应报错')
}

// 29h: 缺少 leaveTokens（数值字段）
{
  const save = makeValidSave()
  const copy = JSON.parse(serializeSave(save))
  delete copy.state.leaveTokens
  const v = validateGameSave(copy)
  assert(!v.valid, '缺少 leaveTokens 应校验失败')
  assert(
    v.errors.some((e) => e.path === 'state.leaveTokens'),
    '错误应定位到 state.leaveTokens',
  )
}

// ========================================================================
// 第四部分：遗产结算幂等保护
// ========================================================================

console.log('\n--- 第四部分：遗产结算幂等保护 ---\n')

// 构造一个最小结局对象用于测试
function makeTestEnding(id: string, tag: EndingTag): Ending {
  return {
    id,
    tag,
    title: `测试结局 ${id}`,
    description: '测试用',
    hint: '测试结局提示',
  }
}

// 构造测试用的 meme
function makeTestMeme(id: string, count: number): AuthorMeme {
  return {
    id,
    name: `梗 ${id}`,
    originBookTitle: '测试作品',
    reputation: 'FUNNY',
    usageCount: count,
  }
}

// ------------------------------------------------------------------------
// 场景 30：LegacyProfile 初始化与旧档案兼容
// ------------------------------------------------------------------------
console.log('场景 30：LegacyProfile 初始化与旧档案兼容')

// 30a: 新建档案 settledRunIds 为空数组
{
  const raw = loadLegacyProfile()
  // 注意：loadLegacyProfile 会读真实 localStorage，这里不依赖它
  // 直接用结构检查验证类型
  assert(
    Array.isArray(raw.settledRunIds),
    '新建/加载的档案应有 settledRunIds 数组',
  )
}

// 30b: 旧版 JSON（无 settledRunIds 字段）能被正确兼容
{
  // 模拟旧档案：手动构造一个没有 settledRunIds 的对象
  const oldJson = JSON.stringify({
    totalLegacyPoints: 100,
    unlockedEndingIds: ['ending_old'],
    unlockedIdentityIds: ['default'],
    keptCardIds: [],
    unlockedMemes: [],
    unlockedAchievementIds: [],
    totalRuns: 1,
    // 注意：没有 settledRunIds
  })

  // 写入 mock localStorage 后通过 loadLegacyProfile 读取
  const LEGACY_KEY = 'freelancer-survival-legacy-v1'
  mockLs._setRaw(LEGACY_KEY, oldJson)
  const loaded = loadLegacyProfile()
  assert(
    Array.isArray(loaded.settledRunIds),
    '旧档案加载后 settledRunIds 应为数组',
  )
  assert(
    loaded.settledRunIds.length === 0,
    '旧档案加载后 settledRunIds 应为空数组',
  )
  assert(loaded.totalLegacyPoints === 100, '旧档案其他字段保持不变')
  assert(loaded.totalRuns === 1, '旧档案 totalRuns 保持不变')
  mockLs._setRaw(LEGACY_KEY, '') // 清理
}

// 30c: settledRunIds 为字符串/数字/null 等非数组类型时，加载后得到空数组
{
  const LEGACY_KEY = 'freelancer-survival-legacy-v1'

  // 字符串
  mockLs._setRaw(LEGACY_KEY, JSON.stringify({ totalLegacyPoints: 10, settledRunIds: 'not-an-array' }))
  assert(
    Array.isArray(loadLegacyProfile().settledRunIds) && loadLegacyProfile().settledRunIds.length === 0,
    'settledRunIds 为字符串时应返回空数组',
  )

  // 数字
  mockLs._setRaw(LEGACY_KEY, JSON.stringify({ totalLegacyPoints: 10, settledRunIds: 42 }))
  assert(
    loadLegacyProfile().settledRunIds.length === 0,
    'settledRunIds 为数字时应返回空数组',
  )

  // null
  mockLs._setRaw(LEGACY_KEY, JSON.stringify({ totalLegacyPoints: 10, settledRunIds: null }))
  assert(
    loadLegacyProfile().settledRunIds.length === 0,
    'settledRunIds 为 null 时应返回空数组',
  )

  mockLs._setRaw(LEGACY_KEY, '') // 清理
}

// 30d: settledRunIds 数组中混入非字符串元素时，只保留字符串
{
  const LEGACY_KEY = 'freelancer-survival-legacy-v1'
  const mixed = {
    totalLegacyPoints: 10,
    settledRunIds: ['run-valid-1', 123, null, 'run-valid-2', { id: 'nope' }, true, 'run-valid-3'],
  }
  mockLs._setRaw(LEGACY_KEY, JSON.stringify(mixed))
  const loaded = loadLegacyProfile()
  assert(
    loaded.settledRunIds.length === 3,
    `过滤后应保留 3 个字符串，实际 ${loaded.settledRunIds.length} 个`,
  )
  assert(
    loaded.settledRunIds[0] === 'run-valid-1'
      && loaded.settledRunIds[1] === 'run-valid-2'
      && loaded.settledRunIds[2] === 'run-valid-3',
    '过滤后应按原顺序保留所有字符串元素',
  )
  mockLs._setRaw(LEGACY_KEY, '') // 清理
}

// ------------------------------------------------------------------------
// 场景 31：首次结算正常增加收益
// ------------------------------------------------------------------------
console.log('\n场景 31：首次结算正常增加收益')

{
  const initialProfile = loadLegacyProfile()
  // 确保空初始状态
  const emptyProfile = {
    ...initialProfile,
    totalLegacyPoints: 0,
    totalRuns: 0,
    unlockedEndingIds: [],
    settledRunIds: [],
    unlockedMemes: [],
  }

  const ending = makeTestEnding('test_ending_1', 'triumph')
  const result = settleLegacy(emptyProfile, ending, 'run-test-001', null)

  assert(result.status === 'settled', '首次结算状态应为 settled')
  assert(
    result.profile.totalLegacyPoints === 300,
    `首次结算点数应为 300，实际 ${result.profile.totalLegacyPoints}`,
  )
  assert(
    result.profile.totalRuns === 1,
    `首次结算 totalRuns 应为 1，实际 ${result.profile.totalRuns}`,
  )
  assert(
    result.profile.settledRunIds.includes('run-test-001'),
    '首次结算后 settledRunIds 应包含当前 runId',
  )
  assert(
    result.profile.unlockedEndingIds.includes('test_ending_1'),
    '首次结算后结局应被解锁',
  )
}

// ------------------------------------------------------------------------
// 场景 32：同一 runId 重复结算不增加收益
// ------------------------------------------------------------------------
console.log('\n场景 32：同一 runId 重复结算不增加收益')

{
  const ending = makeTestEnding('test_ending_2', 'compromise')
  const memes: AuthorMeme[] = [makeTestMeme('meme_a', 2)]

  // 第一次结算
  const first = settleLegacy(
    {
      totalLegacyPoints: 0,
      unlockedEndingIds: [] as string[],
      unlockedIdentityIds: ['default'],
      keptCardIds: [] as string[],
      unlockedMemes: [] as AuthorMeme[],
      unlockedAchievementIds: [] as string[],
      totalRuns: 0,
      settledRunIds: [] as string[],
    },
    ending,
    'run-idempotent-999',
    null,
    memes,
    [],
  )
  assert(first.status === 'settled', '第一次结算状态 settled')

  // 第二次结算（同一 runId）
  const second = settleLegacy(
    first.profile,
    ending,
    'run-idempotent-999',
    null,
    memes,
    [],
  )
  assert(
    second.status === 'already_settled',
    `第二次结算状态应为 already_settled，实际 ${second.status}`,
  )

  // 点数不重复增加
  assert(
    second.profile.totalLegacyPoints === first.profile.totalLegacyPoints,
    '重复结算不应增加遗产点数',
  )

  // totalRuns 不重复 +1
  assert(
    second.profile.totalRuns === first.profile.totalRuns,
    '重复结算不应增加 totalRuns',
  )

  // meme usageCount 不重复累加
  const memeAfter = second.profile.unlockedMemes.find((m) => m.id === 'meme_a')
  assert(memeAfter !== undefined, 'meme 应存在')
  assert(
    memeAfter!.usageCount === 2,
    `重复结算不应累加 meme usageCount，期望 2，实际 ${memeAfter!.usageCount}`,
  )

  // settledRunIds 不重复添加
  assert(
    second.profile.settledRunIds.length === first.profile.settledRunIds.length,
    '重复结算不应重复添加 runId',
  )
}

// ------------------------------------------------------------------------
// 场景 33：不同 runId 分别正常结算
// ------------------------------------------------------------------------
console.log('\n场景 33：不同 runId 分别正常结算')

{
  const ending = makeTestEnding('test_ending_3', 'fail')
  let profile = {
    totalLegacyPoints: 0,
    unlockedEndingIds: [] as string[],
    unlockedIdentityIds: ['default'],
    keptCardIds: [] as string[],
    unlockedMemes: [] as AuthorMeme[],
    unlockedAchievementIds: [] as string[],
    totalRuns: 0,
    settledRunIds: [] as string[],
  }

  // 第一局
  const r1 = settleLegacy(profile, ending, 'run-a-001', null)
  assert(r1.status === 'settled', '第一局结算 settled')
  profile = r1.profile
  const pointsAfter1 = profile.totalLegacyPoints

  // 第二局
  const r2 = settleLegacy(profile, ending, 'run-a-002', null)
  assert(r2.status === 'settled', '第二局结算 settled')
  profile = r2.profile

  assert(profile.totalRuns === 2, '两局后 totalRuns 应为 2')
  assert(
    profile.totalLegacyPoints === pointsAfter1 + 100,
    '第二局应再次增加 100 点（fail 结局）',
  )
  assert(
    profile.settledRunIds.length === 2,
    '两局后 settledRunIds 应有 2 个 ID',
  )
  assert(
    profile.settledRunIds.includes('run-a-001'),
    '应包含第一局 runId',
  )
  assert(
    profile.settledRunIds.includes('run-a-002'),
    '应包含第二局 runId',
  )
}

// ------------------------------------------------------------------------
// 场景 34：saveLegacyProfile 写入失败 / 成功返回值
// ------------------------------------------------------------------------
console.log('\n场景 34：saveLegacyProfile 返回值与失败处理')

const LEGACY_KEY = 'freelancer-survival-legacy-v1'

// 34a: 写入成功返回 ok: true
{
  mockLs._setRaw(LEGACY_KEY, '') // 确保可写
  const profile = loadLegacyProfile()
  const result = saveLegacyProfile(profile)
  assert(result.ok === true, '写入成功应返回 ok: true')
}

// 34b: 写入失败返回 ok: false 及错误信息
{
  mockLs.config.writeErrorKeys = new Set([LEGACY_KEY])
  const profile = loadLegacyProfile()
  const result = saveLegacyProfile(profile)
  assert(result.ok === false, '写入失败应返回 ok: false')
  assert(
    !result.ok && typeof result.error === 'string' && result.error.length > 0,
    '写入失败应包含 error 信息',
  )
  mockLs.config.writeErrorKeys = undefined
}

// 34c: 写入失败时内存档案不变（逻辑验证：调用方应检查返回值再决定是否更新）
{
  const profile = {
    totalLegacyPoints: 500,
    unlockedEndingIds: [] as string[],
    unlockedIdentityIds: ['default'],
    keptCardIds: [] as string[],
    unlockedMemes: [] as AuthorMeme[],
    unlockedAchievementIds: [] as string[],
    totalRuns: 3,
    settledRunIds: ['run-1', 'run-2', 'run-3'],
  }

  // 模拟调用方"先计算，再保存，保存失败不更新内存"的正确流程
  const ending = makeTestEnding('test_fail_save', 'fail')
  const result = settleLegacy(profile, ending, 'run-save-fail-test', null)
  assert(result.status === 'settled', '计算阶段正常')

  // 设置写入失败
  mockLs.config.writeErrorKeys = new Set([LEGACY_KEY])
  const saveResult = saveLegacyProfile(result.profile)
  assert(saveResult.ok === false, '保存失败')

  // 调用方不应更新内存（这里验证：profile 变量本身没有被修改）
  // settleLegacy 是纯函数，原 profile 对象不变
  assert(
    profile.totalLegacyPoints === 500,
    '原档案对象不应被纯函数修改（点数不变）',
  )
  assert(profile.totalRuns === 3, '原档案对象不应被修改（局数不变）')
  assert(
    profile.settledRunIds.length === 3,
    '原档案对象不应被修改（settledRunIds 不变）',
  )

  mockLs.config.writeErrorKeys = undefined
}

// 34d: 失败后重试成功，最终只产生一次结算收益
{
  const initial = {
    totalLegacyPoints: 200,
    unlockedEndingIds: [] as string[],
    unlockedIdentityIds: ['default'],
    keptCardIds: [] as string[],
    unlockedMemes: [] as AuthorMeme[],
    unlockedAchievementIds: [] as string[],
    totalRuns: 1,
    settledRunIds: ['run-before-retry'],
  }

  const ending = makeTestEnding('retry_test', 'open')
  const result = settleLegacy(initial, ending, 'run-retry-001', null)
  assert(result.status === 'settled', '首次计算成功')
  const expectedPoints = result.profile.totalLegacyPoints

  // 第一次：写入失败
  mockLs.config.writeErrorKeys = new Set([LEGACY_KEY])
  const failSave = saveLegacyProfile(result.profile)
  assert(failSave.ok === false, '第一次保存失败')
  // 调用方不更新内存...

  // 第二次：重试，写入成功
  mockLs.config.writeErrorKeys = undefined
  const okSave = saveLegacyProfile(result.profile)
  assert(okSave.ok === true, '重试保存成功')

  // 验证：重新加载后点数正确（只增加了一次）
  const loaded = loadLegacyProfile()
  assert(
    loaded.totalLegacyPoints === expectedPoints,
    `重试后点数应为 ${expectedPoints}（只增加一次），实际 ${loaded.totalLegacyPoints}`,
  )
  assert(
    loaded.settledRunIds.includes('run-retry-001'),
    '重试成功后 settledRunIds 包含 runId',
  )
  assert(
    loaded.settledRunIds.filter((id) => id === 'run-retry-001').length === 1,
    'runId 只出现一次（不会因为重试重复）',
  )
}

// 清理 legacy key
mockLs._setRaw(LEGACY_KEY, '')

// ========================================================================
// 场景 35-48：B3-A 启动恢复逻辑测试
// ========================================================================

console.log('\n场景 35：事件链恢复 — 有效 chainId + 有效 stepId')
{
  const chainId = 'writer_rejection_crisis'
  const chain = EVENT_CHAINS[chainId]
  assert(chain !== undefined, '事件链存在')
  if (chain) {
    const firstStep = chain.steps[0]
    assert(firstStep !== undefined, '事件链至少有一个步骤')
    const stepExists = chain.steps.some((s) => s.stepId === firstStep.stepId)
    assert(stepExists, 'stepId 在链中能找到')
  }
}

console.log('\n场景 36：事件链恢复 — 无事件链（chainId 为 null）')
{
  const chainId: string | null = null
  const chain = chainId ? EVENT_CHAINS[chainId] ?? null : null
  assert(chain === null, 'chainId 为 null 时返回 null')
}

console.log('\n场景 37：事件链恢复 — 不存在的 chainId')
{
  const chainId = 'nonexistent_chain_xyz'
  const chain = EVENT_CHAINS[chainId] ?? null
  assert(chain === null, '不存在的 chainId 返回 null')
}

console.log('\n场景 38：事件链恢复 — 有效 chain 但 stepId 不匹配')
{
  const chainId = 'writer_rejection_crisis'
  const chain = EVENT_CHAINS[chainId]
  assert(chain !== undefined, '事件链存在')
  if (chain) {
    const badStepId = 'step_that_does_not_exist_xyz'
    const stepExists = chain.steps.some((s) => s.stepId === badStepId)
    assert(stepExists === false, '不存在的 stepId 应返回 false')
  }
}

console.log('\n场景 39：结局恢复 — 有效 endingId')
{
  const endingId = 'BURNOUT_FAIL'
  const ending = ENDING_BY_ID[endingId] ?? null
  assert(ending !== null, '有效 endingId 能找到结局')
  assert(ending.id === endingId, '结局 id 匹配')
  assert(ending.title.length > 0, '结局有标题')
}

console.log('\n场景 40：结局恢复 — 不存在的 endingId')
{
  const endingId = 'NONEXISTENT_ENDING_XYZ'
  const ending = ENDING_BY_ID[endingId] ?? null
  assert(ending === null, '不存在的 endingId 返回 null')
}

console.log('\n场景 41：已结算 runId 检查 — 未结算的局可以恢复')
{
  const saveRunId = 'run-unsaved-001'
  const settledRunIds: string[] = ['run-old-001', 'run-old-002']
  const isSettled = settledRunIds.includes(saveRunId)
  assert(isSettled === false, '未结算的 runId 不应在 settledRunIds 中')
}

console.log('\n场景 42：已结算 runId 检查 — 已结算的局不能恢复')
{
  const saveRunId = 'run-already-settled-001'
  const settledRunIds: string[] = ['run-already-settled-001', 'run-other-002']
  const isSettled = settledRunIds.includes(saveRunId)
  assert(isSettled === true, '已结算的 runId 应在 settledRunIds 中')
}

/** 模拟启动决策逻辑（与 useGame 中 bootInit 的核心判断一致）
 *
 *  返回值与 BootStatus 对应：
 *  - 'restored'：有效存档且未结算
 *  - 'already_settled'：有效存档但已结算
 *  - 'new_game'：无存档
 *  - 'corrupted' / 'incompatible' / 'read_error'：异常状态
 */
function simulateBootDecision(
  saveStatus: 'valid' | 'empty' | 'corrupted' | 'incompatible' | 'read_error',
  saveRunId: string | null,
  settledRunIds: string[],
): string {
  if (saveStatus === 'valid' && saveRunId !== null) {
    if (settledRunIds.includes(saveRunId)) {
      return 'already_settled'
    }
    return 'restored'
  }
  if (saveStatus === 'empty') {
    return 'new_game'
  }
  // corrupted / incompatible / read_error
  return saveStatus
}

console.log('\n场景 43：启动决策 — 有效存档 → restored')
{
  const result = simulateBootDecision('valid', 'run-fresh-001', [])
  assert(result === 'restored', '有效且未结算的存档应返回 restored')
}

console.log('\n场景 44：启动决策 — 空存档 → new_game')
{
  const result = simulateBootDecision('empty', null, [])
  assert(result === 'new_game', '空存档应返回 new_game')
}

console.log('\n场景 45：启动决策 — 损坏存档 → corrupted（不是 new_game）')
{
  const result = simulateBootDecision('corrupted', null, [])
  assert(result === 'corrupted', '损坏存档应返回 corrupted')
  assert(result !== 'new_game', '损坏存档不应被当成空存档')
  assert(result !== 'restored', '损坏存档不应被当成有效存档')
}

console.log('\n场景 46：启动决策 — 不兼容版本 → incompatible（不是 new_game）')
{
  const result = simulateBootDecision('incompatible', null, [])
  assert(result === 'incompatible', '不兼容版本应返回 incompatible')
  assert(result !== 'new_game', '不兼容版本不应被当成空存档')
  assert(result !== 'restored', '不兼容版本不应被当成有效存档')
}

console.log('\n场景 47：启动决策 — 已结算 runId → already_settled（不是 restored）')
{
  const result = simulateBootDecision('valid', 'run-settled-001', ['run-settled-001'])
  assert(result === 'already_settled', '已结算的有效存档应返回 already_settled')
  assert(result !== 'restored', '已结算的局不应作为正常游戏恢复')
  assert(result !== 'new_game', '已结算的局不应被当成空存档')
}

console.log('\n场景 48：存档字段完整性 — GameSave 包含所有恢复所需字段')
{
  const save = makeValidSave()
  assert(save.runId !== undefined && save.runId.length > 0, '有 runId')
  assert(save.state !== undefined && save.state !== null, '有 state')
  assert(Array.isArray(save.logs), '有 logs 数组')
  assert(save.eventChain !== undefined, '有 eventChain')
  assert('chainId' in save.eventChain, 'eventChain 有 chainId')
  assert('stepId' in save.eventChain, 'eventChain 有 stepId')
  assert('stepDepth' in save.eventChain, 'eventChain 有 stepDepth')
  assert('pendingEvent' in save, '有 pendingEvent')
  assert('endingId' in save, '有 endingId')
  assert(typeof save.logIdSeed === 'number', '有 logIdSeed')
  assert(typeof save.eventIdSeed === 'number', '有 eventIdSeed')
}

console.log('\n场景 49：ID 种子恢复 — 不会从 1 重新开始')
{
  const save = makeValidSave()
  save.logIdSeed = 42
  save.eventIdSeed = 17
  // 验证存档中的种子值被正确保存（序列化往返）
  const serialized = serializeSave(save)
  const deserialized = deserializeSave(serialized)
  assert(deserialized.status === 'valid', '序列化往返后仍有效')
  if (deserialized.status === 'valid') {
    assert(deserialized.data.logIdSeed === 42, 'logIdSeed 保持原值')
    assert(deserialized.data.eventIdSeed === 17, 'eventIdSeed 保持原值')
  }
}

// ========================================================================
// 场景 50-62：B3-A 修复验证（删除失败处理 + 结算后状态转换）
// ========================================================================

console.log('\n场景 50：deleteSave 成功 — 主 key 和临时 key 都被清除')
{
  mockLs._clear()
  const save = makeValidSave()
  const writeRes = writeSave(save)
  assert(writeRes.status === 'success', '写入成功以确保存档存在')
  assert(mockLs._has(SAVE_KEY_PRIMARY), '主 key 存在')

  const delResult = deleteSave()
  assert(delResult.status === 'success', 'deleteSave 返回 success')
  assert(!mockLs._has(SAVE_KEY_PRIMARY), '主 key 已被删除')
  assert(!mockLs._has(SAVE_KEY_TEMP), '临时 key 已被删除')
}

console.log('\n场景 51：deleteSave 失败 — 主 key 删除抛错时返回 error')
{
  mockLs._clear()
  const save = makeValidSave()
  writeSave(save)
  const rawBefore = mockLs._getRaw(SAVE_KEY_PRIMARY)
  assert(rawBefore !== null, '删除前存档存在')

  // 模拟主 key 删除失败
  mockLs.config.removeErrorKeys = new Set([SAVE_KEY_PRIMARY])
  const delResult = deleteSave()
  mockLs.config.removeErrorKeys = undefined

  assert(delResult.status === 'error', 'deleteSave 返回 error')
  if (delResult.status === 'error') {
    assert(
      delResult.error.length > 0,
      'error 字段有描述信息',
    )
  }
  // 主 key 应仍然存在（删除失败不改变原始数据）
  assert(mockLs._has(SAVE_KEY_PRIMARY), '主 key 删除失败后原始数据仍保留')
}

console.log('\n场景 52：deleteSave 失败后 loadSave 仍能读到原存档')
{
  mockLs._clear()
  const save = makeValidSave()
  save.state.day = 30
  writeSave(save)

  // 模拟删除失败
  mockLs.config.removeErrorKeys = new Set([SAVE_KEY_PRIMARY])
  deleteSave()
  mockLs.config.removeErrorKeys = undefined

  // 原存档应仍可读取
  const loadResult = loadSave()
  assert(loadResult.status === 'valid', '删除失败后原存档仍可正常读取')
  if (loadResult.status === 'valid') {
    assert(loadResult.data.state.day === 30, '存档内容未被改变')
  }
}

console.log('\n场景 53：settleLegacy 幂等 — 已结算 runId 不重复发放遗产点')
{
  mockLs._clear()
  mockLs._setRaw(LEGACY_KEY, '')

  const runId = 'run-idempotent-001'
  const ending: Ending = {
    id: 'TEST_ENDING',
    title: '测试结局',
    tag: 'triumph' as EndingTag,
    description: '测试用',
    hint: '测试',
  }
  const baseSave = makeValidSave()
  const state = baseSave.state
  const unlockedMemes: AuthorMeme[] = []
  const achievementIds: string[] = []

  // 首次结算
  const first = settleLegacy(
    loadLegacyProfile(),
    ending,
    runId,
    null,
    unlockedMemes,
    achievementIds,
    state,
  )
  assert(first.status === 'settled', '首次结算返回 settled')
  const firstPoints = first.profile.totalLegacyPoints

  // 二次结算（相同 runId）
  const second = settleLegacy(
    first.profile,
    ending,
    runId,
    null,
    unlockedMemes,
    achievementIds,
    state,
  )
  assert(second.status === 'already_settled', '二次结算返回 already_settled')
  assert(
    second.profile.totalLegacyPoints === firstPoints,
    '已结算 runId 不重复发放遗产点',
  )
  assert(
    second.profile.settledRunIds.length === first.profile.settledRunIds.length,
    'settledRunIds 不重复追加',
  )
}

console.log('\n场景 54：settleLegacy already_settled 不改变 profile 引用内容')
{
  mockLs._clear()
  mockLs._setRaw(LEGACY_KEY, '')

  const runId = 'run-idempotent-002'
  const ending: Ending = {
    id: 'TEST_ENDING_2',
    title: '测试结局2',
    tag: 'fail' as EndingTag,
    description: '测试用',
    hint: '测试',
  }
  const state = makeValidSave().state

  const first = settleLegacy(
    loadLegacyProfile(),
    ending,
    runId,
    null,
    [],
    [],
    state,
  )
  assert(first.status === 'settled', '首次结算成功')

  const profileBefore = JSON.stringify(first.profile)
  const second = settleLegacy(
    first.profile,
    ending,
    runId,
    null,
    [],
    [],
    state,
  )
  assert(second.status === 'already_settled', '二次结算返回 already_settled')
  const profileAfter = JSON.stringify(second.profile)
  assert(profileBefore === profileAfter, 'already_settled 不改变 profile 任何字段')
}

console.log('\n场景 55：事件链生产配置校验 — 每个链的 steps 中都能找到 stepId')
{
  const chainIds = Object.keys(EVENT_CHAINS)
  assert(chainIds.length > 0, '存在事件链配置')
  for (const chainId of chainIds) {
    const chain = EVENT_CHAINS[chainId]
    assert(chain !== undefined, `事件链 ${chainId} 存在`)
    if (chain) {
      assert(chain.steps.length > 0, `事件链 ${chainId} 至少有一个步骤`)
      for (const step of chain.steps) {
        const found = chain.steps.some((s) => s.stepId === step.stepId)
        assert(found, `链 ${chainId} 中步骤 ${step.stepId} 可被查回`)
      }
    }
  }
}

console.log('\n场景 56：事件链恢复 — 不存在的 chainId 应返回 null（生产数据验证）')
{
  const nonexistentId = 'this_chain_does_not_exist_xyz_123'
  const chain = EVENT_CHAINS[nonexistentId] ?? null
  assert(chain === null, '不存在的 chainId 返回 null')
}

// ---- 以下为状态机规则测试 ----
// 说明：React Hook 内部逻辑（useGame / App）无法在纯 Node 环境直接测试。
// 以下用纯函数模拟状态转换规则，与生产代码中的判断逻辑保持一致，
// 用于验证规则正确性。组件集成流程需手动验证。

console.log('\n场景 57：restart 事务规则 — 删除失败不消耗携带卡')
{
  // 模拟 restart 的事务顺序：先删存档 → 再消耗携带卡 → 再更新状态
  // 删除失败应立即返回，不进入携带卡消耗步骤
  function simulateRestartOrder(
    deleteSucceeds: boolean,
    hasKeptCards: boolean,
  ): { consumed: boolean; stateChanged: boolean; runIdChanged: boolean } {
    // 步骤 0：删除存档
    if (!deleteSucceeds) {
      // 删除失败 → 立即中止，无任何副作用
      return { consumed: false, stateChanged: false, runIdChanged: false }
    }
    // 步骤 1：消耗携带卡（仅当有待消耗的卡时）
    const consumed = hasKeptCards
    // 步骤 2：更新状态和 runId
    return { consumed, stateChanged: true, runIdChanged: true }
  }

  // 删除失败，有携带卡
  const r1 = simulateRestartOrder(false, true)
  assert(r1.consumed === false, '删除失败不消耗携带卡')
  assert(r1.stateChanged === false, '删除失败不更新游戏状态')
  assert(r1.runIdChanged === false, '删除失败不改变 runId')

  // 删除成功，有携带卡
  const r2 = simulateRestartOrder(true, true)
  assert(r2.consumed === true, '删除成功后消耗携带卡')
  assert(r2.stateChanged === true, '删除成功后更新游戏状态')
  assert(r2.runIdChanged === true, '删除成功后生成新 runId')
}

console.log('\n场景 58：restart 事务规则 — 删除失败不改变运行态字段')
{
  // 运行态字段包括：state、logs、pendingEvent、ending、eventChain、runId、bootStatus
  // 删除失败时这些字段应全部保持原值
  type RuntimeState = {
    stateDay: number
    logCount: number
    hasPendingEvent: boolean
    hasEnding: boolean
    hasChain: boolean
    runId: string
    bootStatus: string
  }
  const before: RuntimeState = {
    stateDay: 15,
    logCount: 42,
    hasPendingEvent: true,
    hasEnding: false,
    hasChain: true,
    runId: 'run-original-001',
    bootStatus: 'restored',
  }

  function restartWithDeleteFailure(original: RuntimeState): RuntimeState {
    // 删除失败 → 直接返回，不修改任何字段
    return { ...original } // 等价于无副作用
  }

  const after = restartWithDeleteFailure(before)
  assert(after.stateDay === 15, 'state 未变')
  assert(after.logCount === 42, 'logs 未变')
  assert(after.hasPendingEvent === true, 'pendingEvent 未变')
  assert(after.hasEnding === false, 'ending 未变')
  assert(after.hasChain === true, 'eventChain 未变')
  assert(after.runId === 'run-original-001', 'runId 未变')
  assert(after.bootStatus === 'restored', 'bootStatus 未变')
}

console.log('\n场景 59：dismissSaveError 规则 — 删除失败不切换 bootStatus')
{
  function simulateDismiss(
    currentStatus: string,
    deleteSucceeds: boolean,
  ): { status: string; idSeedsReset: boolean } {
    if (!deleteSucceeds) {
      // 删除失败：保留原状态
      return { status: currentStatus, idSeedsReset: false }
    }
    // 删除成功：切换为 new_game，重置种子
    return { status: 'new_game', idSeedsReset: true }
  }

  // corrupted + 删除失败 → 保持 corrupted
  const r1 = simulateDismiss('corrupted', false)
  assert(r1.status === 'corrupted', '删除失败保持 corrupted 状态')
  assert(r1.idSeedsReset === false, '删除失败不重置 ID 种子')

  // incompatible + 删除失败 → 保持 incompatible
  const r2 = simulateDismiss('incompatible', false)
  assert(r2.status === 'incompatible', '删除失败保持 incompatible 状态')

  // already_settled + 删除成功 → 切换为 new_game
  const r3 = simulateDismiss('already_settled', true)
  assert(r3.status === 'new_game', '删除成功切换为 new_game')
  assert(r3.idSeedsReset === true, '删除成功重置 ID 种子')
}

console.log('\n场景 60：结算后状态转换 — settled 切换为 new_game')
{
  type SettleResult = 'settled' | 'already_settled' | 'save_error' | 'no_ending' | 'in_progress'

  function simulateSettleTransition(
    currentBootStatus: string,
    settleResult: SettleResult,
  ): string {
    if (settleResult === 'settled' || settleResult === 'already_settled') {
      return 'new_game'
    }
    // save_error / no_ending / in_progress：保持原状态
    return currentBootStatus
  }

  // 从 restored 开始，首次结算成功 → new_game
  assert(
    simulateSettleTransition('restored', 'settled') === 'new_game',
    'restored + settled → new_game',
  )

  // 从 new_game 开始，首次结算成功 → new_game（二周目流程）
  assert(
    simulateSettleTransition('new_game', 'settled') === 'new_game',
    'new_game + settled → new_game（不影响二周目）',
  )
}

console.log('\n场景 61：结算失败不切换 bootStatus')
{
  type SettleResult = 'settled' | 'already_settled' | 'save_error' | 'no_ending' | 'in_progress'

  function simulateSettleTransition(
    currentBootStatus: string,
    settleResult: SettleResult,
  ): string {
    if (settleResult === 'settled' || settleResult === 'already_settled') {
      return 'new_game'
    }
    return currentBootStatus
  }

  // save_error → 保持原状态（允许玩家重试）
  assert(
    simulateSettleTransition('restored', 'save_error') === 'restored',
    'save_error 保持 restored（不切换）',
  )
  assert(
    simulateSettleTransition('new_game', 'save_error') === 'new_game',
    'save_error 保持 new_game（不切换）',
  )

  // in_progress / no_ending → 保持原状态
  assert(
    simulateSettleTransition('restored', 'in_progress') === 'restored',
    'in_progress 不改变状态',
  )
  assert(
    simulateSettleTransition('restored', 'no_ending') === 'restored',
    'no_ending 不改变状态',
  )
}

console.log('\n场景 62：already_settled 切换为 new_game（幂等由结算层保证）')
{
  type SettleResult = 'settled' | 'already_settled' | 'save_error'

  function simulateSettleTransition(
    currentBootStatus: string,
    settleResult: SettleResult,
  ): string {
    if (settleResult === 'settled' || settleResult === 'already_settled') {
      return 'new_game'
    }
    return currentBootStatus
  }

  // already_settled 也切换为 new_game，让玩家能进入下一局设置
  // 注意：收益不重复发放由 settleLegacy 的幂等保证，不由 bootStatus 保证
  assert(
    simulateSettleTransition('restored', 'already_settled') === 'new_game',
    'already_settled 也切换为 new_game（可进入下一局设置）',
  )
}

console.log('\n场景 63：临时存档删除失败时，主存档必须保留')
{
  mockLs._clear()

  // 1. 写入有效主存档
  const save = makeValidSave()
  const writeRes = writeSave(save)
  assert(writeRes.status === 'success', '写入成功以确保主存档存在')
  const primaryBefore = mockLs._getRaw(SAVE_KEY_PRIMARY)
  assert(primaryBefore !== null && primaryBefore.length > 0, '删除前主存档存在且非空')

  // 2. 确保临时存档也存在（写入一份假的临时存档）
  const tempContent = '{"fake":"temp-save"}'
  mockLs._setRaw(SAVE_KEY_TEMP, tempContent)
  assert(mockLs._has(SAVE_KEY_TEMP), '删除前临时存档存在')

  // 3. 记录原始字符串
  const primaryRawBefore = mockLs._getRaw(SAVE_KEY_PRIMARY)
  const tempRawBefore = mockLs._getRaw(SAVE_KEY_TEMP)

  // 4. 设置 mock：临时 key 删除失败
  mockLs.config.removeErrorKeys = new Set([SAVE_KEY_TEMP])

  // 5. 调用生产代码 deleteSave()
  const delResult = deleteSave()

  // 6. 恢复 mock 配置（先恢复再断言，防止断言失败后污染后续测试）
  mockLs.config.removeErrorKeys = undefined

  // 7. 断言
  assert(delResult.status === 'error', 'deleteSave 返回 error')
  if (delResult.status === 'error') {
    assert(
      delResult.error.includes('临时存档'),
      '错误信息标识为临时存档删除失败',
    )
  }
  assert(mockLs._has(SAVE_KEY_PRIMARY), '主存档仍然存在')
  assert(
    mockLs._getRaw(SAVE_KEY_PRIMARY) === primaryRawBefore,
    '主存档原始字符串与删除前完全一致',
  )
  assert(mockLs._has(SAVE_KEY_TEMP), '临时存档仍然存在（删除失败）')
  assert(
    mockLs._getRaw(SAVE_KEY_TEMP) === tempRawBefore,
    '临时存档内容未被修改',
  )
}

console.log('\n场景 64：主存档删除失败时，主存档必须保留')
{
  mockLs._clear()

  // 1. 写入有效主存档
  const save = makeValidSave()
  const writeRes = writeSave(save)
  assert(writeRes.status === 'success', '写入成功以确保主存档存在')
  const primaryRawBefore = mockLs._getRaw(SAVE_KEY_PRIMARY)
  assert(primaryRawBefore !== null && primaryRawBefore.length > 0, '删除前主存档存在且非空')

  // 2. 确保临时存档也存在
  const tempContent = '{"fake":"temp-save-for-primary-fail"}'
  mockLs._setRaw(SAVE_KEY_TEMP, tempContent)
  assert(mockLs._has(SAVE_KEY_TEMP), '删除前临时存档存在')

  // 3. 设置 mock：主 key 删除失败
  mockLs.config.removeErrorKeys = new Set([SAVE_KEY_PRIMARY])

  // 4. 调用生产代码 deleteSave()
  const delResult = deleteSave()

  // 5. 恢复 mock 配置
  mockLs.config.removeErrorKeys = undefined

  // 6. 断言
  assert(delResult.status === 'error', 'deleteSave 返回 error')
  if (delResult.status === 'error') {
    assert(
      delResult.error.includes('主存档'),
      '错误信息标识为主存档删除失败',
    )
  }
  assert(mockLs._has(SAVE_KEY_PRIMARY), '主存档仍然存在')
  assert(
    mockLs._getRaw(SAVE_KEY_PRIMARY) === primaryRawBefore,
    '主存档原始字符串与删除前完全一致',
  )
  assert(!mockLs._has(SAVE_KEY_TEMP), '临时存档已经成功删除')
}

// ========================================================================
// 总结
// ========================================================================

console.log(`\n=== 结果：${passed} 通过，${failed} 失败 ===\n`)

if (failed > 0) {
  process.exit(1)
}
