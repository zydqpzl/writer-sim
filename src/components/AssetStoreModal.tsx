import type { ActionDef, GameState } from '../types/game'
import type { WriterProject } from '../types/career'

interface Props {
  isOpen: boolean
  onClose: () => void
  state: GameState
  actions: ActionDef[]
  activeProject?: WriterProject
  onChoose: (action: ActionDef) => void
}

function effectLabel(key: keyof ActionDef['effects']): string {
  switch (key) {
    case 'savings': return '存款'
    case 'health': return '健康'
    case 'energy': return '精力'
    case 'stress': return '压力'
    case 'familyApproval': return '父母'
    case 'influence': return '影响力'
    case 'fans': return '粉丝'
    default: return key
  }
}

const ACCENT_BG: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  sky: 'bg-sky-50 text-sky-600',
  fuchsia: 'bg-fuchsia-50 text-fuchsia-600',
  violet: 'bg-violet-50 text-violet-600',
  teal: 'bg-teal-50 text-teal-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  orange: 'bg-orange-50 text-orange-600',
  brand: 'bg-brand-50 text-brand-600',
}

function groupActions(actions: ActionDef[]) {
  const groups: Record<string, ActionDef[]> = {}
  for (const a of actions) {
    const cat = categorize(a)
    groups[cat] = groups[cat] ?? []
    groups[cat].push(a)
  }
  return groups
}

function categorize(a: ActionDef): string {
  if (a.id?.startsWith('housing_')) return 'housing'
  if (a.id?.startsWith('eq_')) return 'equipment'
  if (a.id?.startsWith('pr_')) return 'pr'
  if (a.id?.startsWith('training_')) return 'training'
  if (a.id?.startsWith('insurance_')) return 'insurance'
  if (a.id?.startsWith('wellness_')) return 'wellness'
  if (a.id === 'retire_financial_freedom') return 'retire'
  return 'other'
}

const CATEGORY_LABEL: Record<string, string> = {
  housing: '🏠 住房升级',
  equipment: '⌨️ 生产力装备',
  pr: '📢 商业推广',
  training: '🎓 培训进修',
  insurance: '🛡️ 保险理财',
  wellness: '💆 身心健康',
  retire: '🏆 功成名就',
  other: '其他',
}

export default function AssetStoreModal({
  isOpen,
  onClose,
  state,
  actions,
  activeProject,
  onChoose,
}: Props) {
  if (!isOpen) return null

  const groups = groupActions(actions)
  const categories = Object.keys(groups).filter((k) => groups[k].length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">资产投资与生活消费</h2>
            <p className="text-xs text-slate-400">低频大额决策：住房、装备、培训、保险、公关推广等</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {actions.length === 0 ? (
            <p className="text-center text-sm text-slate-400">当前没有可购买的资产或服务。</p>
          ) : (
            <div className="space-y-6">
              {categories.map((cat) => (
                <section key={cat}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {CATEGORY_LABEL[cat]}
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {groups[cat].map((action) => {
                      const entries = Object.entries(action.effects).filter(
                        ([, v]) => v !== 0 && v !== undefined,
                      ) as [keyof ActionDef['effects'], number][]
                      const needsProject = action.requirement?.needsActiveWriterProject
                      const projectLocked = needsProject && !activeProject
                      const disabled =
                        projectLocked ||
                        !!action.id &&
                          (action.id === state.housingId ||
                            state.ownedEquipmentIds.includes(action.id) ||
                            state.activeInsuranceIds.includes(action.id))
                      return (
                        <button
                          key={action.id ?? action.label}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            onChoose(action)
                            onClose()
                          }}
                          className={[
                            'flex flex-col rounded-xl border p-3 text-left transition-all',
                            disabled
                              ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md',
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-lg text-base ${
                                ACCENT_BG[action.accent] ?? ACCENT_BG.brand
                              }`}
                            >
                              {action.icon}
                            </span>
                            <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">
                              {action.label}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                            {projectLocked ? '需先开始一本连载作品' : action.desc}
                          </p>
                          {entries.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {entries.map(([k, v]) => {
                                const positive = v > 0
                                const sign = positive ? '+' : ''
                                const tone =
                                  k === 'savings'
                                    ? positive
                                      ? 'text-emerald-600'
                                      : 'text-rose-600'
                                    : k === 'stress'
                                      ? positive
                                        ? 'text-rose-500'
                                        : 'text-emerald-600'
                                      : positive
                                        ? 'text-emerald-600'
                                        : 'text-rose-500'
                                return (
                                  <span
                                    key={k}
                                    className={`chip bg-slate-50 ${tone} ring-1 ring-inset ring-slate-200/70 text-[10px]`}
                                  >
                                    {effectLabel(k)} {sign}{v}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-slate-100 px-5 py-3">
          <p className="text-xs text-slate-400">
            当前存款：{state.stats.savings.toLocaleString('zh-CN')} 元 · 已拥有住房/装备/保险不会重复显示
          </p>
        </footer>
      </div>
    </div>
  )
}
