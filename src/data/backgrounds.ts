import type { BackgroundTag, MainGenre } from '../types/career'

/* ============== 专精领域 key 常量 ============== */

export const DOMAIN = {
  MEDICAL: 'medical',
  FINANCE: 'finance',
  HISTORY: 'history',
  LITERATURE: 'literature',
  OTAKU: 'otaku',
  LUXURY: 'luxury',
  SOCIAL_MEDIA: 'social_media',
  CYBER: 'cyber',
  MILITARY: 'military',
  LAW: 'law',
} as const

/* ============== 学业与专业背景 ============== */

const medicalStudent: BackgroundTag = {
  id: 'medical_student',
  name: '医学生/医生',
  category: 'EDUCATION',
  description: '扎实的临床与解剖知识，写悬疑、医学、科幻题材时自带硬核滤镜。',
  skillModifiers: {
    prose: 5,
    structure: 8,
    domainKnowledge: { [DOMAIN.MEDICAL]: 80 },
  },
  genreSynergies: [
    {
      targetGenre: 'SUSPENSE',
      qualityBonus: 0.25,
      commercialityBonus: 0.10,
      synergyName: '硬核解剖',
      uniqueReaderComments: [
        '作者绝对是现役主刀医师，这缝合步骤太真实了！',
        '别的作者写尸体叫恐怖，这个作者写尸体像在写病历，毛骨悚然的真实感。',
        '医学生写悬疑就是降维打击，服了。',
      ],
    },
    {
      targetGenre: 'SCI_FI',
      qualityBonus: 0.20,
      commercialityBonus: 0.08,
      synergyName: '废土人体改造',
      requiredDomain: { domain: DOMAIN.MEDICAL, min: 60 },
      uniqueReaderComments: [
        '别的作者写基因突变叫魔法，这个作者写基因突变像在做临床报告！',
        '这基因编辑的设定太硬核了，跪了跪了，正版订阅奉上！',
        '医学生写硬科幻，真的不是一个次元。',
      ],
    },
    {
      targetGenre: 'URBAN',
      qualityBonus: 0.12,
      synergyName: '急诊室人间观察',
      uniqueReaderComments: [
        '医院走廊里的众生相写得扎心，作者真的见过生死。',
        '这段医患对话太真实了，没有经历过写不出来。',
      ],
    },
  ],
}

const historyScholar: BackgroundTag = {
  id: 'history_scholar',
  name: '历史系/考据党',
  category: 'EDUCATION',
  description: '史海钩沉，写历史题材时不易被挑刺，且能吸引高质量老白读者。',
  skillModifiers: {
    prose: 8,
    structure: 5,
    domainKnowledge: { [DOMAIN.HISTORY]: 85 },
  },
  genreSynergies: [
    {
      targetGenre: 'HISTORY',
      qualityBonus: 0.30,
      commercialityBonus: 0.05,
      synergyName: '考据狂魔',
      uniqueReaderComments: [
        '这官职、服饰、礼仪考据得太细了，历史老白狂喜。',
        '作者明显翻过《资治通鉴》，不是架空随便套皮。',
        '就冲这份考据，月票投了。',
      ],
    },
    {
      targetGenre: 'XUANHUAN',
      qualityBonus: 0.10,
      synergyName: '神话原型重构',
      uniqueReaderComments: [
        '这设定明显参考了山海经和道教典籍，有内味。',
        '作者是不是历史系出来的？世界观很有厚度。',
      ],
    },
  ],
}

const chineseMajor: BackgroundTag = {
  id: 'chinese_major',
  name: '中文系/实体书出过出版物',
  category: 'EDUCATION',
  description: '文笔细腻，但初入网文时节奏感偏弱，需要经历“脱去文青架子”的阵痛。',
  skillModifiers: {
    prose: 40,
    pacing: -20,
    structure: 10,
    domainKnowledge: { [DOMAIN.LITERATURE]: 70 },
  },
  genreSynergies: [
    {
      targetGenre: 'HISTORY',
      qualityBonus: 0.15,
      synergyName: '文学性叙事',
      uniqueReaderComments: [
        '这文笔在网文里太奢侈了，像是在看严肃文学。',
        '散文式历史文，老白读者一本满足。',
      ],
    },
    {
      targetGenre: 'URBAN',
      qualityBonus: 0.10,
      synergyName: '细腻情感流',
      uniqueReaderComments: [
        '人物心理写得真细，像在看实体书。',
        '节奏慢是慢，但文字有味道。',
      ],
    },
  ],
}

/* ============== 职业与社会履历 ============== */

const financeAnalyst: BackgroundTag = {
  id: 'finance_analyst',
  name: '证券分析师/金融狗',
  category: 'PROFESSION',
  description: '对社会运行逻辑与利益链条有深刻理解，写商战、修仙社会学时逻辑自洽。',
  skillModifiers: {
    prose: 0,
    pacing: 5,
    structure: 12,
    domainKnowledge: { [DOMAIN.FINANCE]: 90 },
  },
  genreSynergies: [
    {
      targetGenre: 'URBAN',
      qualityBonus: 0.25,
      commercialityBonus: 0.20,
      synergyName: '严密利益链',
      uniqueReaderComments: [
        '这商战写得像在看财经新闻，每一步都有利益考量。',
        '作者绝对是金融圈出来的，这并购逻辑太真实了。',
        '不是无脑打脸，而是利益交换，高级！',
      ],
    },
    {
      targetGenre: 'XUANHUAN',
      qualityBonus: 0.20,
      commercialityBonus: 0.10,
      synergyName: '修仙宗门经济学',
      requiredDomain: { domain: DOMAIN.FINANCE, min: 70 },
      uniqueReaderComments: [
        '灵石通胀、宗门资产负债表，作者是把修仙当公司写啊。',
        '这资源拉扯比正邪大战还好看，金融狗写玄幻就是降维打击。',
        '第一次见有人把修真界的经济体系写得这么自洽。',
      ],
    },
    {
      targetGenre: 'SCI_FI',
      qualityBonus: 0.12,
      synergyName: '星际资本博弈',
      uniqueReaderComments: [
        '这星际公司之间的股权战争写得过于真实。',
        '作者是不是在投行干过？',
      ],
    },
  ],
}

const otakuPartTimer: BackgroundTag = {
  id: 'otaku_part_timer',
  name: '二次元女仆店/异宠店兼职',
  category: 'PROFESSION',
  description: '积累了大量搞笑日常与二次元梗，写轻小说/日常文时爆点积累极快。',
  skillModifiers: {
    prose: 3,
    pacing: 8,
    marketInsight: 10,
    domainKnowledge: { [DOMAIN.OTAKU]: 75 },
  },
  genreSynergies: [
    {
      targetGenre: 'GAME',
      qualityBonus: 0.15,
      commercialityBonus: 0.15,
      synergyName: '梗浓度超标',
      uniqueReaderComments: [
        '这梗密度，作者绝对是个老二次元。',
        '女仆店那段写得太有内味了，笑死。',
        '御宅族的社交仪式被你写活了。',
      ],
    },
    {
      targetGenre: 'URBAN',
      qualityBonus: 0.12,
      commercialityBonus: 0.10,
      synergyName: '荒诞日常流',
      uniqueReaderComments: [
        '异宠店日常比主线还好笑，建议单开一本。',
        '这种离谱又真实的日常，只有真干过的人才写得出来。',
      ],
    },
  ],
}

const richSecondGen: BackgroundTag = {
  id: 'rich_second_gen',
  name: '真·富二代/豪门背景',
  category: 'FAMILY',
  description: '写都市豪门、奢华生活时不会被骂“土味炫富”，反而让读者膜拜。',
  skillModifiers: {
    prose: 5,
    marketInsight: 5,
    domainKnowledge: { [DOMAIN.LUXURY]: 80 },
  },
  genreSynergies: [
    {
      targetGenre: 'URBAN',
      qualityBonus: 0.20,
      commercialityBonus: 0.18,
      synergyName: '无痛炫富',
      uniqueReaderComments: [
        '这才是真富豪日常，作者家里绝对有矿！',
        '别的神豪文是装富，这本感觉是作者真在写日记。',
        '从豪车到私人飞机的细节都对得上，不是编的。',
      ],
    },
  ],
  globalEffects: {
    startingFans: 500,
    readerMoodModifier: 5,
  },
}

const countyFamily: BackgroundTag = {
  id: 'county_family',
  name: '县城普通家庭',
  category: 'FAMILY',
  description: '没有显赫背景，但接地气的生活体验让日常流与真实向作品更有共鸣。',
  skillModifiers: {
    prose: 5,
    domainKnowledge: { [DOMAIN.LITERATURE]: 10 },
  },
  genreSynergies: [
    {
      targetGenre: 'URBAN',
      qualityBonus: 0.08,
      synergyName: '人间烟火气',
      uniqueReaderComments: [
        '这家庭氛围太真实了，像是我家监控。',
        '没有金手指，但就是好看，因为真实。',
      ],
    },
  ],
}

/* ============== 创作马甲历史 ============== */

const veteranAuthor: BackgroundTag = {
  id: 'veteran_author',
  name: '老油条马甲',
  category: 'PAST_WRITING',
  description: '之前切过书，新书自带“防坑警惕读者”debuff，但节奏感极高。',
  skillModifiers: {
    pacing: 25,
    marketInsight: 15,
    structure: -5,
  },
  genreSynergies: [],
  globalEffects: {
    retentionModifier: -0.05,
    initialControversy: 15,
  },
}

const kolTurnedWriter: BackgroundTag = {
  id: 'kol_turned_writer',
  name: '某站大V/主播转行',
  category: 'PAST_WRITING',
  description: '开书自带基础粉丝，但会被黑粉盯上进行“道德审查”。',
  skillModifiers: {
    marketInsight: 20,
    pacing: 10,
  },
  genreSynergies: [
    {
      targetGenre: 'GAME',
      qualityBonus: 0.08,
      commercialityBonus: 0.12,
      synergyName: '主播懂哥',
      uniqueReaderComments: [
        '这主播转行写书，确实懂观众想看什么。',
        '黑粉别来沾边，书好看就行。',
      ],
    },
  ],
  globalEffects: {
    startingFans: 5000,
    initialControversy: 20,
  },
}

/* ============== 导出 ============== */

export const BACKGROUND_TAGS: BackgroundTag[] = [
  medicalStudent,
  historyScholar,
  chineseMajor,
  financeAnalyst,
  otakuPartTimer,
  richSecondGen,
  countyFamily,
  veteranAuthor,
  kolTurnedWriter,
]

export const BACKGROUND_TAG_BY_ID: Record<string, BackgroundTag> =
  BACKGROUND_TAGS.reduce((acc, tag) => {
    acc[tag.id] = tag
    return acc
  }, {} as Record<string, BackgroundTag>)

/** 根据开局身份 id 映射默认履历标签 */
export const STARTING_IDENTITY_BACKGROUNDS: Record<string, string[]> = {
  default: ['county_family'],
  retired_kol: ['kol_turned_writer'],
  hometown_rich: ['rich_second_gen'],
  otaku_master: ['otaku_part_timer'],
}

/** 所有可用的专精领域名称（用于 UI 展示） */
export const DOMAIN_LABELS: Record<string, string> = {
  [DOMAIN.MEDICAL]: '医学',
  [DOMAIN.FINANCE]: '金融',
  [DOMAIN.HISTORY]: '历史',
  [DOMAIN.LITERATURE]: '文学',
  [DOMAIN.OTAKU]: '二次元',
  [DOMAIN.LUXURY]: '豪门生活',
  [DOMAIN.SOCIAL_MEDIA]: '社交媒体',
  [DOMAIN.CYBER]: '网络安全',
  [DOMAIN.MILITARY]: '军事',
  [DOMAIN.LAW]: '法律',
}

/** 判断某背景是否对某题材有化学反应 */
export function findGenreSynergies(
  tag: BackgroundTag,
  genre: MainGenre,
): BackgroundTag['genreSynergies'] {
  return tag.genreSynergies.filter((s) => s.targetGenre === genre)
}
