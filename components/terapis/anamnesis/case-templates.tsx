'use client'

// ============================================================
// KOMPONEN BERSAMA MODE CEPAT (fisio & OT)
//  • CaseDropdown  → pilih kasus via DROPDOWN gabungan (kasus bawaan +
//    template buatan sendiri yang tersimpan di DB per klinik), plus tombol
//    "Simpan isian sebagai template" & kelola/hapus template.
//  • ChipMultiAdd  → chip multi-pilih yang BISA ditambah pilihan sendiri
//    (di luar daftar preset).
// Dipakai oleh fisio-anamnesis-module.tsx & okupasi-anamnesis-module.tsx.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Loader2, Save, X } from 'lucide-react'

/* ---------------- Tipe ---------------- */

// Bentuk kasus yang bisa diterapkan ke form (preset bawaan maupun template DB).
export type CaseLike = { id: string; name: string; data: Record<string, unknown> }
// Kasus bawaan (FISIO_CASES / OT_CASES) — `data` di-cast ke object generik.
export type PresetCase = { id: string; name: string; emoji?: string; data: object }
// Template buatan sendiri dari DB.
export type CustomTemplate = { id: string; name: string; emoji: string | null; data: Record<string, unknown> }

/* ---------------- Styles ---------------- */

const selectCls =
  'w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'
const fieldCls =
  'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

function chipCls(on: boolean) {
  return `rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
    on ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
  }`
}

/* ============================================================
   Hook: muat template kustom (per klinik + disiplin)
   ============================================================ */

export function useCaseTemplates(discipline?: string) {
  const [templates, setTemplates] = useState<CustomTemplate[]>([])

  // Ambil daftar; setState hanya SETELAH await (hindari setState sinkron di effect).
  const reload = useCallback(async () => {
    if (!discipline) return
    try {
      const res = await fetch(`/api/terapis/case-templates?discipline=${encodeURIComponent(discipline)}`)
      if (!res.ok) return
      const j = await res.json()
      setTemplates(Array.isArray(j.templates) ? j.templates : [])
    } catch {
      /* abaikan — dropdown tetap menampilkan kasus bawaan */
    }
  }, [discipline])

  useEffect(() => {
    // setState terjadi setelah await di dalam reload (bukan render sinkron);
    // aturan ini false-positive untuk pola fetch-in-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload()
  }, [reload])

  return { templates, reload }
}

/* ============================================================
   ChipMultiAdd — chip multi-pilih + tambah pilihan sendiri
   ============================================================ */

export function ChipMultiAdd({
  options,
  value,
  onChange,
  placeholder = 'Tulis lalu Enter…',
}: {
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const set = new Set(value)
  // Nilai terpilih yang TIDAK ada di daftar preset = chip kustom (ditambah user).
  const customs = value.filter((v) => !options.includes(v))

  function toggle(o: string) {
    onChange(set.has(o) ? value.filter((v) => v !== o) : [...value, o])
  }
  function commit() {
    const t = text.trim()
    if (t && !set.has(t)) onChange([...value, t])
    setText('')
    setAdding(false)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => toggle(o)} className={chipCls(set.has(o))}>
          {o}
        </button>
      ))}
      {customs.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => toggle(c)}
          title="Klik untuk hapus"
          className={`${chipCls(true)} inline-flex items-center gap-1`}
        >
          {c}
          <X className="h-3 w-3" />
        </button>
      ))}
      {adding ? (
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              setText('')
              setAdding(false)
            }
          }}
          onBlur={commit}
          placeholder={placeholder}
          className="rounded-full border border-teal-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:border-teal-300 hover:text-teal-600"
        >
          <Plus className="h-3.5 w-3.5" /> Tambah
        </button>
      )}
    </div>
  )
}

/* ============================================================
   CaseDropdown — dropdown kasus (bawaan + template sendiri) + simpan/kelola
   ============================================================ */

export function CaseDropdown({
  discipline,
  presets,
  activeId,
  currentData,
  onApply,
  excludeKeys = [],
}: {
  discipline?: string
  presets: readonly PresetCase[]
  activeId?: string
  currentData: Record<string, unknown>
  onApply: (c: CaseLike) => void
  // Key yang TIDAK ikut disimpan saat membuat template dari isian saat ini.
  excludeKeys?: string[]
}) {
  const { templates, reload } = useCaseTemplates(discipline)
  const [showSave, setShowSave] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  function handleSelect(val: string) {
    if (!val) return
    if (val.startsWith('custom:')) {
      const t = templates.find((x) => `custom:${x.id}` === val)
      if (t) onApply({ id: val, name: t.name, data: t.data })
    } else {
      const c = presets.find((x) => x.id === val)
      if (c) onApply({ id: c.id, name: c.name, data: c.data as Record<string, unknown> })
    }
  }

  // Ambil snapshot isian saat ini (buang field pembukuan & nilai kosong).
  function snapshot(): Record<string, unknown> {
    const skip = new Set(['mode', 'case_template', 'case_name', ...excludeKeys])
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(currentData)) {
      if (skip.has(k) || v == null) continue
      if (typeof v === 'string' && v.trim() === '') continue
      if (Array.isArray(v) && v.length === 0) continue
      out[k] = v
    }
    return out
  }

  async function save() {
    const nm = name.trim()
    if (!nm) {
      setErr('Beri nama template dulu.')
      return
    }
    setSaving(true)
    setErr('')
    try {
      const res = await fetch('/api/terapis/case-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discipline, name: nm, emoji: null, data: snapshot() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(j.error ?? 'Gagal menyimpan template.')
        setSaving(false)
        return
      }
      setName('')
      setShowSave(false)
      await reload()
    } catch {
      setErr('Terjadi kesalahan jaringan.')
    }
    setSaving(false)
  }

  async function remove(id: string) {
    setConfirmId(null)
    try {
      await fetch('/api/terapis/case-templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await reload()
    } catch {
      /* abaikan */
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <select value={activeId ?? ''} onChange={(e) => handleSelect(e.target.value)} className={selectCls}>
          <option value="">Pilih kasus</option>
          <optgroup label="Kasus Bawaan">
            {presets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji ? `${c.emoji} ` : ''}
                {c.name}
              </option>
            ))}
          </optgroup>
          {templates.length > 0 && (
            <optgroup label="Template Saya (Klinik)">
              {templates.map((t) => (
                <option key={t.id} value={`custom:${t.id}`}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
      </div>

      {/* Simpan isian saat ini sebagai template */}
      {!showSave ? (
        <button
          type="button"
          onClick={() => {
            setShowSave(true)
            setErr('')
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
        >
          <Save className="h-3.5 w-3.5" /> Tambahkan kasus
        </button>
      ) : (
        <div className="space-y-2 rounded-xl border border-teal-100 bg-teal-50/50 p-3">
          <p className="text-xs font-semibold text-gray-700">Template baru — dipakai bersama semua terapis di klinik ini.</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama kasus, mis. LBP Kronik"
            className={`${fieldCls} w-full`}
          />
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowSave(false)
                setErr('')
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Simpan Template
            </button>
          </div>
        </div>
      )}

      {/* Kelola / hapus template sendiri */}
      {templates.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowManage((v) => !v)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showManage ? 'Tutup' : `Kelola template saya (${templates.length})`}
          </button>
          {showManage && (
            <div className="mt-2 space-y-1.5">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-2.5 py-1.5">
                  <span className="text-sm text-gray-700">
                    {t.name}
                  </span>
                  {confirmId === t.id ? (
                    <span className="flex items-center gap-2">
                      <button type="button" onClick={() => remove(t.id)} className="text-xs font-semibold text-red-600 hover:text-red-700">
                        Hapus
                      </button>
                      <button type="button" onClick={() => setConfirmId(null)} className="text-xs text-gray-400 hover:text-gray-600">
                        Batal
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(t.id)}
                      aria-label="Hapus template"
                      className="text-gray-300 transition-colors hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
