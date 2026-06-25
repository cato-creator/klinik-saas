'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { DISCIPLINES } from '@/lib/disciplines'

/**
 * Checklist layanan/disiplin yang dibuka sebuah klinik (bisa pilih lebih dari satu).
 * Dipakai di semua jalur pembuatan klinik: pendaftaran owner, super admin
 * (approve & tambah langsung), dan affiliator.
 *
 * Menulis dua hidden input agar kompatibel dengan form lama:
 *   - `name` (default "specializations"): daftar key dipisah koma, mis. "fisioterapi,okupasi_terapi"
 *   - `typeName` (default "clinic_type"): tipe UTAMA (key pertama menurut urutan registry)
 *
 * Minimal satu layanan harus terpilih.
 */
export function DisciplinePicker({
  defaultSelected,
  name = 'specializations',
  typeName = 'clinic_type',
  label = 'Layanan klinik',
  hint = 'Pilih satu atau lebih. Menentukan template anamnesis yang dipakai terapis.',
}: {
  defaultSelected?: string[]
  name?: string
  typeName?: string
  label?: string
  hint?: string
}) {
  const initial = (defaultSelected ?? []).filter((k) => DISCIPLINES.some((d) => d.key === k))
  const [sel, setSel] = useState<string[]>(initial.length ? initial : [DISCIPLINES[0].key])

  function toggle(key: string) {
    setSel((cur) => {
      if (cur.includes(key)) {
        // Jangan biarkan kosong — minimal satu layanan.
        if (cur.length === 1) return cur
        return cur.filter((k) => k !== key)
      }
      return [...cur, key]
    })
  }

  // Tipe utama = key terpilih pertama menurut urutan registry (deterministik).
  const primary = DISCIPLINES.find((d) => sel.includes(d.key))?.key ?? sel[0]

  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-gray-700">{label}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DISCIPLINES.map((d) => {
          const Icon = d.icon
          const active = sel.includes(d.key)
          return (
            <button
              type="button"
              key={d.key}
              onClick={() => toggle(d.key)}
              aria-pressed={active}
              className={`relative flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                active
                  ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                  active ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 pr-5">
                <span className="block text-sm font-semibold text-gray-900">{d.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-gray-500">{d.desc}</span>
              </span>
              <span
                className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                  active ? 'border-teal-600 bg-teal-600 text-white' : 'border-gray-300 bg-white'
                }`}
              >
                {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            </button>
          )
        })}
      </div>
      {hint && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
      <input type="hidden" name={name} value={sel.join(',')} />
      <input type="hidden" name={typeName} value={primary} />
    </div>
  )
}
