import type { Gimmick } from '../types/career'

export const GIMMICKS: Gimmick[] = [
  {
    id: 'reverse_gou',
    name: '反向苟道',
    description: '别人越努力越幸运，主角越摆烂越无敌。',
    riskFactor: 80,
    memePotential: 95,
    commercialityModifier: 0.8,
    qualityModifier: 1.05,
    complexityAdd: 30,
  },
  {
    id: 'undercover_heroines',
    name: '女主全是卧底',
    description: '身边的红颜知己，个个都想背刺你。',
    riskFactor: 65,
    memePotential: 85,
    commercialityModifier: 1.0,
    qualityModifier: 1.0,
    complexityAdd: 25,
  },
  {
    id: 'system_gone_mad',
    name: '系统疯了',
    description: '金手指不讲武德，发布的任务越来越离谱。',
    riskFactor: 75,
    memePotential: 90,
    commercialityModifier: 0.9,
    qualityModifier: 0.95,
    complexityAdd: 25,
  },
  {
    id: 'everyone_overthinks',
    name: '全员迪化',
    description: '主角随便说句话，全世界都在分析第 18 层含义。',
    riskFactor: 55,
    memePotential: 88,
    commercialityModifier: 1.1,
    qualityModifier: 1.0,
    complexityAdd: 20,
  },
  {
    id: 'pure_love_scumbag',
    name: '纯爱混账',
    description: '嘴上说着纯爱，操作一个比一个渣，读者又恨又爱。',
    riskFactor: 50,
    memePotential: 70,
    commercialityModifier: 1.0,
    qualityModifier: 1.0,
    complexityAdd: 15,
  },
  {
    id: 'villain_protagonist',
    name: '主角是反派',
    description: '不做圣母，只讲利益，口碑两极分化。',
    riskFactor: 60,
    memePotential: 80,
    commercialityModifier: 0.95,
    qualityModifier: 1.05,
    complexityAdd: 20,
  },
  {
    id: 'death_loop',
    name: '死亡轮回',
    description: '死了就读档，靠信息差逆袭，悬念极强。',
    riskFactor: 45,
    memePotential: 75,
    commercialityModifier: 1.0,
    qualityModifier: 1.1,
    complexityAdd: 20,
  },
  {
    id: 'copy_superpower',
    name: '复制异能',
    description: '你的能力很好，但现在是我的了。',
    riskFactor: 30,
    memePotential: 60,
    commercialityModifier: 1.05,
    qualityModifier: 1.0,
    complexityAdd: 10,
  },
]

export const GIMMICK_BY_ID: Record<string, Gimmick> = GIMMICKS.reduce(
  (acc, g) => {
    acc[g.id] = g
    return acc
  },
  {} as Record<string, Gimmick>,
)
