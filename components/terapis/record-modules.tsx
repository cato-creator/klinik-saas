'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, X, ClipboardList, Stethoscope, Activity } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Assessment, Diagnosis, Treatment } from '@/types'

function therapistName(t: any): string {
  return t?.profile?.full_name ?? 'Terapis'
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res
}

async function delJson(url: string, id: string) {
  return fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
}

const inputCls =
  'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

function SectionHeader({ icon: Icon, title, onAdd, adding }: { icon: any; title: string; onAdd: () => void; adding: boolean }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 font-bold text-gray-900">
        <Icon className="h-4 w-4 text-teal-600" /> {title}
      </h2>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-100"
      >
        {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {adding ? 'Tutup' : 'Tambah'}
      </button>
    </div>
  )
}

function EmptyCard({ text }: { text: string }) {
  return <p className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">{text}</p>
}

function DeleteBtn({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button onClick={onClick} disabled={busy} aria-label="Hapus" className="text-gray-300 transition-colors hover:text-red-500 disabled:opacity-50">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  )
}

function SubmitBtn({ saving, label = 'Simpan' }: { saving: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-teal-700 disabled:opacity-60"
    >
      {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</> : label}
    </button>
  )
}

// ============================================================
// ASESMEN AWAL
// ============================================================
export function AssessmentModule({ patientId, items }: { patientId: string; items: Assessment[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [form, setForm] = useState({ chief_complaint: '', history: '', physical_exam: '', rom: '', pain_scale: '', notes: '' })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await postJson('/api/terapis/assessment', {
      patient_id: patientId,
      chief_complaint: form.chief_complaint,
      history: form.history,
      physical_exam: form.physical_exam,
      rom: form.rom,
      pain_scale: form.pain_scale === '' ? null : Number(form.pain_scale),
      notes: form.notes,
    })
    setSaving(false)
    if (res.ok) {
      setForm({ chief_complaint: '', history: '', physical_exam: '', rom: '', pain_scale: '', notes: '' })
      setAdding(false)
      router.refresh()
    }
  }

  async function remove(id: string) {
    setBusyId(id)
    await delJson('/api/terapis/assessment', id)
    setBusyId(null)
    router.refresh()
  }

  return (
    <div>
      <SectionHeader icon={ClipboardList} title="Asesmen Awal" onAdd={() => setAdding((a) => !a)} adding={adding} />

      {adding && (
        <form onSubmit={submit} className="mb-4 space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">Keluhan Utama</label>
            <textarea value={form.chief_complaint} onChange={(e) => setForm({ ...form, chief_complaint: e.target.value })} rows={2} className={inputCls} placeholder="Mis. nyeri lutut kanan saat berjalan…" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">Riwayat</label>
              <textarea value={form.history} onChange={(e) => setForm({ ...form, history: e.target.value })} rows={2} className={inputCls} placeholder="Riwayat penyakit / cedera…" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">Pemeriksaan Fisik</label>
              <textarea value={form.physical_exam} onChange={(e) => setForm({ ...form, physical_exam: e.target.value })} rows={2} className={inputCls} placeholder="Hasil observasi & palpasi…" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">ROM (Range of Motion)</label>
              <input value={form.rom} onChange={(e) => setForm({ ...form, rom: e.target.value })} className={inputCls} placeholder="Mis. fleksi knee 0–110°" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">Skala Nyeri (0–10)</label>
              <input type="number" min={0} max={10} value={form.pain_scale} onChange={(e) => setForm({ ...form, pain_scale: e.target.value })} className={inputCls} placeholder="0–10" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">Catatan</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputCls} placeholder="Catatan tambahan…" />
          </div>
          <div className="flex justify-end"><SubmitBtn saving={saving} /></div>
        </form>
      )}

      {items.length === 0 ? (
        <EmptyCard text="Belum ada asesmen awal." />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-gray-500">{formatDate(a.created_at)} · oleh {therapistName(a.therapist)}</p>
                <DeleteBtn onClick={() => remove(a.id)} busy={busyId === a.id} />
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <Field label="Keluhan Utama" value={a.chief_complaint} />
                <Field label="Riwayat" value={a.history} />
                <Field label="Pemeriksaan Fisik" value={a.physical_exam} />
                <Field label="ROM" value={a.rom} />
                {a.pain_scale != null && (
                  <div>
                    <dt className="text-xs font-semibold text-gray-500">Skala Nyeri</dt>
                    <dd className="mt-0.5"><PainBadge value={a.pain_scale} /></dd>
                  </div>
                )}
                <Field label="Catatan" value={a.notes} />
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-semibold text-gray-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-gray-800">{value}</dd>
    </div>
  )
}

function PainBadge({ value }: { value: number }) {
  const cls = value <= 3 ? 'bg-green-50 text-green-700' : value <= 6 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>{value}/10</span>
}

// ============================================================
// DIAGNOSIS
// ============================================================
export function DiagnosisModule({ patientId, items }: { patientId: string; items: Diagnosis[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [form, setForm] = useState({ icd10_code: '', description: '', dx_type: 'primary' })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description.trim()) return
    setSaving(true)
    const res = await postJson('/api/terapis/diagnosis', { patient_id: patientId, ...form })
    setSaving(false)
    if (res.ok) {
      setForm({ icd10_code: '', description: '', dx_type: 'primary' })
      setAdding(false)
      router.refresh()
    }
  }

  async function remove(id: string) {
    setBusyId(id)
    await delJson('/api/terapis/diagnosis', id)
    setBusyId(null)
    router.refresh()
  }

  return (
    <div>
      <SectionHeader icon={Stethoscope} title="Diagnosis" onAdd={() => setAdding((a) => !a)} adding={adding} />

      {adding && (
        <form onSubmit={submit} className="mb-4 space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">Kode ICD-10</label>
              <input value={form.icd10_code} onChange={(e) => setForm({ ...form, icd10_code: e.target.value })} className={inputCls} placeholder="Mis. M17.0" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-gray-800">Diagnosa <span className="text-red-500">*</span></label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="Mis. OA genu bilateral" required />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">Tipe</label>
            <select value={form.dx_type} onChange={(e) => setForm({ ...form, dx_type: e.target.value })} className={inputCls}>
              <option value="primary">Primer</option>
              <option value="secondary">Sekunder</option>
            </select>
          </div>
          <div className="flex justify-end"><SubmitBtn saving={saving} /></div>
        </form>
      )}

      {items.length === 0 ? (
        <EmptyCard text="Belum ada diagnosis." />
      ) : (
        <div className="space-y-2">
          {items.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                {d.icd10_code && <span className="rounded-lg bg-violet-50 px-2 py-1 font-mono text-xs font-bold text-violet-700">{d.icd10_code}</span>}
                <div>
                  <p className="text-sm font-medium text-gray-900">{d.description}</p>
                  <p className="text-xs text-gray-400">
                    <span className={d.dx_type === 'primary' ? 'text-teal-600' : 'text-gray-500'}>{d.dx_type === 'primary' ? 'Primer' : 'Sekunder'}</span>
                    {' · '}{formatDate(d.created_at)} · {therapistName(d.therapist)}
                  </p>
                </div>
              </div>
              <DeleteBtn onClick={() => remove(d.id)} busy={busyId === d.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// TINDAKAN TERAPI
// ============================================================
export function TreatmentModule({ patientId, items }: { patientId: string; items: Treatment[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [form, setForm] = useState({ modality: '', description: '' })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.modality.trim() && !form.description.trim()) return
    setSaving(true)
    const res = await postJson('/api/terapis/treatment', { patient_id: patientId, ...form })
    setSaving(false)
    if (res.ok) {
      setForm({ modality: '', description: '' })
      setAdding(false)
      router.refresh()
    }
  }

  async function remove(id: string) {
    setBusyId(id)
    await delJson('/api/terapis/treatment', id)
    setBusyId(null)
    router.refresh()
  }

  return (
    <div>
      <SectionHeader icon={Activity} title="Tindakan Terapi" onAdd={() => setAdding((a) => !a)} adding={adding} />

      {adding && (
        <form onSubmit={submit} className="mb-4 space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">Modalitas / Jenis Tindakan</label>
            <input value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value })} className={inputCls} placeholder="Mis. TENS, Ultrasound, Exercise…" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">Detail / Parameter</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={inputCls} placeholder="Mis. TENS 20 menit, intensitas sedang, area genu dx…" />
          </div>
          <div className="flex justify-end"><SubmitBtn saving={saving} /></div>
        </form>
      )}

      {items.length === 0 ? (
        <EmptyCard text="Belum ada tindakan tercatat." />
      ) : (
        <div className="space-y-2">
          {items.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="min-w-0">
                {t.modality && <span className="mb-1 inline-block rounded-lg bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700">{t.modality}</span>}
                {t.description && <p className="whitespace-pre-wrap text-sm text-gray-800">{t.description}</p>}
                <p className="mt-1 text-xs text-gray-400">{formatDate(t.created_at)} · {therapistName(t.therapist)}</p>
              </div>
              <DeleteBtn onClick={() => remove(t.id)} busy={busyId === t.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
