'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, CheckCircle2, AlertCircle } from 'lucide-react'

export interface PreviousNote {
  id: string
  date: string
  therapistName?: string
  subjective: string
  objective: string
  assessment: string
  plan: string
  home_program: string
}

interface Props {
  bookingId: string
  initial: {
    subjective: string
    objective: string
    assessment: string
    plan: string
    home_program: string
    next_session: string
  }
  /** true bila sesi belum 'completed' — tampilkan opsi "selesaikan sesi". */
  canComplete: boolean
  /** Bila mengedit CPPT tertentu (bukan membuat baru). */
  noteId?: string
  /** Dipanggil setelah simpan berhasil (mis. untuk menutup form). */
  onSaved?: () => void
  /** Sembunyikan opsi "tandai sesi selesai". */
  hideComplete?: boolean
  /** Tampilkan banner "disalin dari CPPT sebelumnya" (mis. setelah Copy CPPT). */
  copiedNotice?: boolean
}

const FIELDS = [
  { key: 'subjective', label: 'Subjective', hint: 'Keluhan / laporan pasien.', accent: 'border-blue-400 bg-blue-50', labelCls: 'text-blue-700' },
  { key: 'objective', label: 'Objective', hint: 'Hasil observasi & pengukuran.', accent: 'border-teal-500 bg-teal-50', labelCls: 'text-teal-700' },
  { key: 'assessment', label: 'Assessment', hint: 'Analisis & perkembangan.', accent: 'border-amber-500 bg-amber-50', labelCls: 'text-amber-700' },
  { key: 'plan', label: 'Plan', hint: 'Rencana terapi.', accent: 'border-violet-500 bg-violet-50', labelCls: 'text-violet-700' },
] as const

const textareaCls =
  'w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

export function SoapForm({ bookingId, initial, canComplete, noteId, onSaved, hideComplete = false, copiedNotice = false }: Props) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function submit() {
    setError('')
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/terapis/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          note_id: noteId,
          ...form,
          next_session: form.next_session || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Gagal menyimpan catatan.')
        setSaving(false)
        return
      }
      setSaved(true)
      onSaved?.()
      router.refresh()
      setSaving(false)
    } catch {
      setError('Terjadi kesalahan jaringan.')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Banner setelah copy */}
      {copiedNotice && (
        <div className="flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800">
          <CheckCircle2 className="h-4 w-4 text-teal-600" /> Isi disalin dari SOAP sebelumnya. Periksa lalu tekan <span className="font-semibold">Simpan Catatan</span>.
        </div>
      )}

      {/* SOAP berwarna */}
      <div className="grid gap-3">
        {FIELDS.map((f) => (
          <div key={f.key} className={`rounded-r-lg border-l-[3px] ${f.accent} p-3`}>
            <label className={`mb-0.5 block text-xs font-bold uppercase tracking-wide ${f.labelCls}`}>{f.label}</label>
            <p className="mb-1.5 text-[11px] text-gray-400">{f.hint}</p>
            <textarea
              value={(form as any)[f.key]}
              onChange={(e) => set(f.key as any, e.target.value)}
              rows={4}
              className={textareaCls}
              placeholder="Tulis di sini…"
            />
          </div>
        ))}
      </div>

      <div className="grid gap-3">
        <div className="rounded-r-lg border-l-[3px] border-green-500 bg-green-50 p-3">
          <label className="mb-0.5 block text-xs font-bold uppercase tracking-wide text-green-700">Program Latihan di Rumah</label>
          <p className="mb-1.5 text-[11px] text-gray-400">Panduan latihan untuk pasien.</p>
          <textarea
            value={form.home_program}
            onChange={(e) => set('home_program', e.target.value)}
            rows={3}
            className={textareaCls}
            placeholder="Latihan yang dianjurkan…"
          />
        </div>
        <div className="rounded-r-lg border-l-[3px] border-gray-300 bg-gray-50 p-3">
          <label className="mb-0.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Rekomendasi Sesi Berikutnya</label>
          <p className="mb-1.5 text-[11px] text-gray-400">Tanggal anjuran kunjungan berikutnya.</p>
          <input
            type="date"
            value={form.next_session}
            onChange={(e) => set('next_session', e.target.value)}
            className={textareaCls}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {saved && !error && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" /> Catatan tersimpan.
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:bg-teal-700 disabled:opacity-60"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</> : <><Save className="h-4 w-4" /> Simpan Catatan</>}
        </button>
      </div>
    </div>
  )
}
