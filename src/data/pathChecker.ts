import type { ActionType, Ending, GameState, LifePath, PathSnapshot, PlayerLocation } from '../types/game'
import { ENDINGS } from './endings'

const PATH_SCORES: LifePath[] = [
  'BIG_CITY_CREATOR',
  'HOMETOWN_KOL',
  'SUBCULTURE_GURU',
  'REALITY_COMPROMISE',
  'BALANCED',
]

/**
 * 根据一次行动更新路线倾向分数。
 * 返回新的 pathScores（不修改入参）。
 */
export function updatePathScores(
  scores: Record<LifePath, number>,
  actionType: ActionType,
  location: PlayerLocation,
): Record<LifePath, number> {
  const next = { ...scores }

  switch (actionType) {
    case 'work':
      // 创作：大城市线占优；在老家则同时滋养县城观察家路线
      next.BIG_CITY_CREATOR += location === 'hometown' ? 1 : 2
      next.HOMETOWN_KOL += location === 'hometown' ? 1 : 0
      break
    case 'social':
      // 社媒运营：大城市顶流路线；回老家也有一点下沉市场意味
      next.BIG_CITY_CREATOR += location === 'hometown' ? 0 : 2
      next.HOMETOWN_KOL += location === 'hometown' ? 1 : 0
      break
    case 'family':
      // 沟通父母：向现实妥协线；回老家时人情路线
      next.REALITY_COMPROMISE += 1
      next.HOMETOWN_KOL += location === 'hometown' ? 1 : 0
      break
    case 'rest':
      // 摆烂：平衡线，避免任何一条路线太快锁死
      next.BALANCED += 1
      break
    case 'parttime':
      // 跑外卖：现实妥协线大幅上涨
      next.REALITY_COMPROMISE += 2
      next.BIG_CITY_CREATOR += 0
      break
    case 'hometown_parttime':
      // 县城帮工：现实妥协 + 县城人情
      next.REALITY_COMPROMISE += 1
      next.HOMETOWN_KOL += 1
      break
    case 'subculture':
      // 亚文化奇遇：亚文化线大幅上涨
      next.SUBCULTURE_GURU += 3
      break
  }

  return next
}

/**
 * 根据事件链选择额外调整路线分数。
 * 用于把事件链的叙事选择也纳入结局判定。
 */
export function bumpPathScore(
  scores: Record<LifePath, number>,
  path: LifePath,
  delta: number,
): Record<LifePath, number> {
  return { ...scores, [path]: scores[path] + delta }
}

/** 获取当前主导路线 */
export function getDominantPath(scores: Record<LifePath, number>): LifePath {
  return PATH_SCORES.reduce((best, p) =>
    scores[p] > scores[best] ? p : best,
  'BALANCED')
}

/** 生成路线快照（供 UI 趋势条使用） */
export function getPathSnapshot(state: GameState): PathSnapshot {
  return {
    dominant: getDominantPath(state.pathScores),
    scores: { ...state.pathScores },
  }
}

/**
 * 判定当前是否触发结局。
 * 按 ENDINGS 数组优先级命中第一条满足条件的结局。
 * 返回 null 表示游戏继续。
 */
export function checkGameEnding(state: GameState): Ending | null {
  const { stats, location, subcultureReputation, examProgress, pathScores } = state
  const dominant = getDominantPath(pathScores)

  for (const ending of ENDINGS) {
    switch (ending.id) {
      case 'BURNOUT_FAIL':
        // 存款耗尽且压力达到上限：燃尽
        if (stats.savings < 0 && stats.stress >= 300) return ending
        break
      case 'CIVIL_SERVANT_SECRET_KOL':
        if (location === 'hometown' && examProgress >= 100) return ending
        break
      case 'BOARDGAME_SHOP_OWNER':
        if (subcultureReputation >= 80) return ending
        break
      case 'TOP_UP_MASTER':
        if (stats.fans >= 1000000) return ending
        break
      case 'HOMETOWN_EMPEROR':
        if (location === 'hometown' && dominant === 'HOMETOWN_KOL') return ending
        break
      case 'HOMETOWN_KOL':
        if (location === 'hometown' && dominant === 'HOMETOWN_KOL' && stats.fans >= 5000) return ending
        break
      case 'SUBCULTURE_COSER':
        if (dominant === 'SUBCULTURE_GURU') return ending
        break
      case 'BIG_CITY_SURVIVOR':
        if (location === 'city' && dominant === 'BIG_CITY_CREATOR') return ending
        break
      case 'OFFICE_WORKER':
        if (dominant === 'REALITY_COMPROMISE' && examProgress >= 40) return ending
        break
      case 'BALANCED_WANDERER':
        // 兜底结局：只要游戏自然结束（60天）就触发
        if (state.day >= 60) return ending
        break
    }
  }

  return null
}

/**
 * 第 60 天强制结局判定。
 * 若已有燃尽等中途结局，本函数不会覆盖；仅用于自然流程结束。
 */
export function resolveFinalEnding(state: GameState): Ending {
  return checkGameEnding(state) ?? ENDINGS[ENDINGS.length - 1]
}
