'use client'

import { useState, type ReactNode } from 'react'
import { IdCard, ClipboardList, NotebookPen, Stethoscope, Activity, CalendarClock, Flag, House } from 'lucide-react'

const ICONS = {
  identitas: IdCard,
  asesmen: ClipboardList,
  cppt: NotebookPen,
  goals: Flag,
  program: House,
  diagnosis: Stethoscope,
  tindakan: Activity,
  riwayat: CalendarClock,
} as const

export interface CaseTab {
  id: keyof typeof ICONS
  label: string
  badge?: number
  content: ReactNode
}

export function CaseTabs({ tabs, initial }: { tabs: CaseTab[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id)
  const current = tabs.find((t) => t.id === active) ?? tabs[0]

  return (
    <div>
      <div className="flex flex-wrap gap-1 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
        {tabs.map((t) => {
          const Icon = ICONS[t.id]
          const on = t.id === active
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                on ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {typeof t.badge === 'number' && t.badge > 0 && (
                <span className={`rounded-full px-1.5 text-[11px] font-bold ${on ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-4">{current?.content}</div>
    </div>
  )
}
