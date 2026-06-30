'use client'

// ============================================================
// Pemilih "Tindakan Terapi" untuk kunjungan ini (tab Tindakan, di atas Target
// Terapi). Pilih via DROPDOWN (cari + centang); yang terpilih jadi chip yang
// bisa dilepas. Auto-simpan ke bookings.modalities lalu router.refresh() agar
// muncul di TAMPILAN sidebar SOAP. Tombol "Tambah tindakan baru" menyimpan
// permanen per klinik (clinic_modalities) lalu otomatis terpilih.
// ============================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Plus, Loader2, Check, X, ChevronDown, Search } from 'lucide-react'
import { TINDAKAN_OPTIONS } from './anamnesis/fisio-cases'

interface Props {
  bookingId: string
  discipline?: string
  /** Tindakan yang sudah tersimpan untuk kunjungan ini. */
  initial?: string[]
  /** Booking belum dikonfirmasi → kunci. */
  locked?: boolean
}

export function SessionTreatments({ bookingId, discipline, initial = [], locked = false }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>(initial)
  const [custom, setCustom] = useState<string[]>([])      // tindakan custom klinik (dari DB)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(0)

  // Muat daftar tindakan custom milik klinik (per disiplin).
  useEffect(() => {
    if (!discipline) return
    let alive = true
    ;(async () => {
      try {
        const res = await fetch(`/api/terapis/modalities?discipline=${encodeURIComponent(discipline)}`)
        if (!res.ok) return
        const j = await res.json()
        if (alive && Array.isArray(j.modalities)) {
          setCustom(j.modalities.map((m: { name: string }) => m.name))
        }
      } catch { /* abaikan — daftar bawaan tetap tampil */ }
    })()
    return () => { alive = false }
  }, [discipline])

  // Gabungan opsi: bawaan + custom klinik + yang terpilih (jaga yang lama tampil).
  const options = Array.from(new Set([...TINDAKAN_OPTIONS, ...custom, ...selected]))
  const q = query.trim().toLowerCase()
  const filtered = options.filter((o) => !q || o.toLowerCase().includes(q))

  async function persist(next: string[]) {
    setSaving(true)
    try {
      const res = await fetch('/api/terapis/session-treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, modalities: next }),
      })
      if (res.ok) {
        setSavedAt(Date.now())
        router.refresh() // agar tampilan tindakan di sidebar SOAP ikut terupdate
      }
    } finally {
      setSaving(false)
    }
  }

  function toggle(name: string) {
    if (locked) return
    const next = selected.includes(name) ? selected.filter((s) => s !== name) : [...selected, name]
    setSelected(next)
    persist(next)
  }

  async function commitNew() {
    const name = text.trim()
    setText('')
    setAdding(false)
    if (!name) return
    // Simpan permanen ke daftar klinik (kalau belum ada & disiplin diketahui).
    if (discipline && !TINDAKAN_OPTIONS.includes(name) && !custom.includes(name)) {
      try {
        await fetch('/api/terapis/modalities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ discipline, name }),
        })
        setCustom((c) => (c.includes(name) ? c : [...c, name]))
      } catch { /* tetap pilih meski gagal simpan permanen */ }
    }
    if (!selected.includes(name)) {
      const next = [...selected, name]
      setSelected(next)
      persist(next)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <Activity className="h-4 w-4 text-teal-600" /> Tindakan Terapi
        </h4>
        {saving ? (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan…</span>
        ) : savedAt ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600"><Check className="h-3.5 w-3.5" /> Tersimpan</span>
        ) : null}
      </div>

      {locked ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Tindakan bisa dipilih setelah booking dikonfirmasi.
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-gray-400">Pilih tindakan yang dikerjakan pada kunjungan ini.</p>

          {/* Tindakan terpilih (chip, klik untuk lepas) */}
          {selected.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {selected.map((s) => (
                <button key={s} type="button" onClick={() => toggle(s)} title="Klik untuk lepas"
                  className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">
                  {s} <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          {/* Dropdown pemilih */}
          <div className="relative">
            <button type="button" onClick={() => setOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50">
              <span>{selected.length > 0 ? `${selected.length} tindakan dipilih — tambah lagi` : 'Pilih tindakan…'}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  <div className="sticky top-0 bg-white px-2 pb-1.5 pt-1">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari tindakan…"
                        className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                    </div>
                  </div>

                  {filtered.length === 0 && !adding && (
                    <p className="px-3 py-2 text-center text-xs text-gray-400">Tidak ada yang cocok. Tambah tindakan baru di bawah.</p>
                  )}
                  {filtered.map((o) => {
                    const on = selected.includes(o)
                    return (
                      <button key={o} type="button" onClick={() => toggle(o)}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-teal-50 ${on ? 'font-semibold text-teal-700' : 'text-gray-700'}`}>
                        <span className="min-w-0 flex-1 truncate">{o}</span>
                        {on && <Check className="h-4 w-4 shrink-0 text-teal-600" />}
                      </button>
                    )
                  })}

                  <div className="mt-1 border-t border-gray-100 px-2 pt-1.5 pb-1">
                    {adding ? (
                      <input autoFocus value={text} onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commitNew() }
                          else if (e.key === 'Escape') { setText(''); setAdding(false) }
                        }}
                        onBlur={commitNew} placeholder="Nama tindakan baru…"
                        className="w-full rounded-lg border border-teal-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                    ) : (
                      <button type="button" onClick={() => setAdding(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-teal-700 hover:bg-teal-50">
                        <Plus className="h-4 w-4" /> Tambah tindakan baru
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
