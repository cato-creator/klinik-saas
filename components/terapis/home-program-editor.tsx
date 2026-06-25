'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { House, Loader2, Save, CheckCircle2 } from 'lucide-react'

interface Props {
  bookingId: string
  /** Catatan yang akan diperbarui home program-nya (latest). Kosong → buat baru. */
  noteId?: string
  initial?: string
  dateLabel?: string
}

export function HomeProgramEditor({ bookingId, noteId, initial = '', dateLabel }: Props) {
  const router = useRouter()
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/terapis/home-program', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, note_id: noteId, home_program: value }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 1800)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-1 flex items-center gap-2 font-bold text-gray-900">
        <House className="h-4 w-4 text-teal-600" /> Isi Program Latihan di Rumah
      </h3>
      <p className="mb-3 text-xs text-gray-400">
        Untuk kunjungan{dateLabel ? ` ${dateLabel}` : ' aktif'}. Panduan latihan yang diberikan ke orang tua/pasien.
      </p>
      <textarea
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false) }}
        rows={4}
        className="w-full resize-y rounded-lg border border-gray-200 bg-green-50/40 px-3 py-2 text-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        placeholder="Mis. Latihan meniup gelembung 10 menit/hari. Sebutkan nama benda saat bermain…"
      />
      <div className="mt-3 flex items-center justify-end gap-3">
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" /> Tersimpan
          </span>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-teal-700 disabled:opacity-60"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</> : <><Save className="h-4 w-4" /> Simpan Home Program</>}
        </button>
      </div>
    </div>
  )
}
