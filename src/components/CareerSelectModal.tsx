import { useMemo, useState } from 'react'
import type { ProfessionType } from '../types/career'

interface Props {
  onSelect: (profession: ProfessionType) => void
}

interface CareerOption {
  id: ProfessionType
  name: string
  tagline: string
  desc: string
  icon: string
  accent: string
  status: 'available' | 'placeholder'
  statusText: string
}

const CAREERS: CareerOption[] = [
  {
    id: 'WRITER',
    name: '网文作家',
    tagline: '在键盘与连载里搏一条出路',
    desc: '选择平台、题材与文风，从新人一步步写到白金。签约、上架、爆更、完本——完整的 CareerEngine 体验。',
    icon: '✍️',
    accent: 'violet',
    status: 'available',
    statusText: '已开放',
  },
  {
    id: 'UP_HOST',
    name: 'UP主',
    tagline: '用镜头与剪辑制造流量',
    desc: '选题、脚本、拍摄、发布，在算法与弹幕之间经营自己的频道。核心玩法正在开发中，当前为占位版本。',
    icon: '🎬',
    accent: 'rose',
    status: 'placeholder',
    statusText: '开发中',
  },
  {
    id: 'FILM_CREATOR',
    name: '影视创作者',
    tagline: '从短片到银幕的漫长征途',
    desc: '写剧本、拉投资、跑剧组，用影像讲述故事。核心玩法正在开发中，当前为占位版本。',
    icon: '🎞️',
    accent: 'amber',
    status: 'placeholder',
    statusText: '开发中',
  },
]

const ACCENT_BG: Record<string, string> = {
  violet: 'bg-violet-100 text-violet-600',
  rose: 'bg-rose-100 text-rose-600',
  amber: 'bg-amber-100 text-amber-600',
}

const ACCENT_RING: Record<string, string> = {
  violet: 'ring-violet-200',
  rose: 'ring-rose-200',
  amber: 'ring-amber-200',
}

const ACCENT_CHIP: Record<string, string> = {
  violet: 'bg-violet-50 text-violet-600',
  rose: 'bg-rose-50 text-rose-600',
  amber: 'bg-amber-50 text-amber-600',
}

const ACCENT_SELECTED_BORDER: Record<string, string> = {
  violet: 'border-violet-400 bg-violet-50/40',
  rose: 'border-rose-400 bg-rose-50/40',
  amber: 'border-amber-400 bg-amber-50/40',
}

export default function CareerSelectModal({ onSelect }: Props) {
  const [selectedId, setSelectedId] = useState<ProfessionType>('WRITER')
  const selected = useMemo(
    () => CAREERS.find((c) => c.id === selectedId) ?? CAREERS[0],
    [selectedId],
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div className="relative max-h-[90vh] w-full max-w-2xl animate-fade-in overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-violet-200">
        {/* 头部 */}
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-2xl">
            🎭
          </span>
          <div className="min-w-0 flex-1">
            <span className="chip bg-violet-50 text-violet-600">
              职业选择
            </span>
            <h2 className="mt-1.5 text-xl font-bold text-slate-800">
              选择你的自由职业路线
            </h2>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          三条路线代表三种创作人生。当前版本以网文作家为主职业完整体验，其余两条路线仅保留最小占位，后续迭代逐步开放。
        </p>

        {/* 职业列表 */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {CAREERS.map((career) => {
            const selected = selectedId === career.id
            return (
              <button
                key={career.id}
                type="button"
                onClick={() => setSelectedId(career.id)}
                className={[
                  'flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all',
                  selected
                    ? `${ACCENT_SELECTED_BORDER[career.accent]} shadow-sm ring-1 ${ACCENT_RING[career.accent]}`
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                ].join(' ')}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${ACCENT_BG[career.accent]}`}
                  >
                    {career.icon}
                  </span>
                  <span
                    className={`chip text-[10px] ${
                      career.status === 'available'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {career.statusText}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    {career.name}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-slate-500">
                    {career.tagline}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* 选中详情 */}
        <div
          className={`mt-5 rounded-xl border p-4 ${ACCENT_RING[selected.accent]} ring-1 bg-slate-50/50`}
        >
          <div className="flex items-center gap-2">
            <span className={`chip text-xs ${ACCENT_CHIP[selected.accent]}`}>
              {selected.name}
            </span>
            <span className="text-xs text-slate-400">
              {selected.statusText}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {selected.desc}
          </p>
        </div>

        {/* 底部按钮 */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => onSelect(selectedId)}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700"
          >
            选择此路线
          </button>
        </div>
      </div>
    </div>
  )
}
