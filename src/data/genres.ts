import type { GenreConfig, MainGenre } from '../types/career'

export const GENRES: GenreConfig[] = [
  {
    id: 'XUANHUAN',
    name: '玄幻',
    baseCommerciality: 70,
    baseMemePotential: 55,
    qualityWeight: 1.0,
    complexityBase: 45,
    description: '修炼、宗门、天道，长青的大众题材。下限稳定，竞争也最惨烈。',
  },
  {
    id: 'URBAN',
    name: '都市',
    baseCommerciality: 78,
    baseMemePotential: 45,
    qualityWeight: 0.9,
    complexityBase: 25,
    description: '贴近现实的爽文主战场，战神、赘婿、神豪层出不穷。',
  },
  {
    id: 'SCI_FI',
    name: '科幻',
    baseCommerciality: 48,
    baseMemePotential: 72,
    qualityWeight: 1.15,
    complexityBase: 60,
    description: '设定门槛高，读者挑剔，但一旦写活极易封神。',
  },
  {
    id: 'SUSPENSE',
    name: '悬疑',
    baseCommerciality: 46,
    baseMemePotential: 65,
    qualityWeight: 1.1,
    complexityBase: 70,
    description: '节奏与逻辑双重考验，伏笔回收高能时口碑炸裂。',
  },
  {
    id: 'GAME',
    name: '游戏',
    baseCommerciality: 65,
    baseMemePotential: 68,
    qualityWeight: 0.95,
    complexityBase: 35,
    description: '网游、电竞、第四天灾，天然带梗，更新压力大。',
  },
  {
    id: 'HISTORY',
    name: '历史',
    baseCommerciality: 56,
    baseMemePotential: 42,
    qualityWeight: 1.2,
    complexityBase: 65,
    description: '考据与演义平衡，读者长情，但出圈难度大。',
  },
]

export const GENRE_BY_ID: Record<MainGenre, GenreConfig> = GENRES.reduce(
  (acc, g) => {
    acc[g.id] = g
    return acc
  },
  {} as Record<MainGenre, GenreConfig>,
)
