'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IdCard, Loader2, Pencil, X, Check, AlertCircle } from 'lucide-react'
import { formatDate, calculateAge, formatRM } from '@/lib/utils'

interface PatientIdentity {
  id: string
  medical_record_no: string | null
  full_name: string
  birth_date: string | null
  gender: 'L' | 'P' | null
  phone: string | null
  guardian_name: string | null
  email: string | null
  notes: string | null
}

// Kartu Identitas pasien — bisa diubah terapis/admin/owner (kecuali No. RM).
export function IdentityEdit({ patient }: { patient: PatientIdentity }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [f, setF] = useState({
    full_name: patient.full_name ?? '',
    birth_date: patient.birth_date ?? '',
    gender: (patient.gender ?? '') as '' | 'L' | 'P',
    phone: patient.phone ?? '',
    guardian_name: patient.guardian_name ?? '',
    email: patient.email ?? '',
    notes: patient.notes ?? '',
  })

  function cancel() {
    setF({
      full_name: patient.full_name ?? '',
      birth_date: patient.birth_date ?? '',
      gender: (patient.gender ?? '') as '' | 'L' | 'P',
      phone: patient.phone ?? '',
      guardian_name: patient.guardian_name ?? '',
      email: patient.email ?? '',
      notes: patient.notes ?? '',
    })
    setError(null)
    setEditing(false)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (f.full_name.trim().length < 2) {
      setError('Nama pasien wajib diisi (min. 2 huruf).')
      return
    }
    if (f.phone.trim().length < 5) {
      setError('No. HP wajib diisi.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/terapis/patient-clinical', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patient.id,
          full_name: f.full_name.trim(),
          phone: f.phone.trim(),
          email: f.email.trim() || null,
          birth_date: f.birth_date || null,
          gender: f.gender || null,
          guardian_name: f.guardian_name.trim() || null,
          notes: f.notes.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')
      setEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Identitas Pasien</h3>
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-100"
          >
            <Pencil className="h-3.5 w-3.5" /> Ubah Identitas
          </button>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="No. Rekam Medis" value={formatRM(patient.medical_record_no)} mono />
          <Detail label="Nama Lengkap" value={patient.full_name} />
          <Detail
            label="Tanggal Lahir"
            value={patient.birth_date ? `${formatDate(patient.birth_date)} (${calculateAge(patient.birth_date)} thn)` : '—'}
          />
          <Detail label="Jenis Kelamin" value={patient.gender === 'L' ? 'Laki-laki' : patient.gender === 'P' ? 'Perempuan' : '—'} />
          <Detail label="No. HP" value={patient.phone ?? '—'} />
          <Detail label="Wali" value={patient.guardian_name ?? '—'} />
          <Detail label="Email" value={patient.email ?? '—'} />
          <Detail label="Catatan" value={patient.notes ?? '—'} />
        </dl>
      </div>
    )
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Ubah Identitas Pasien</h3>
        <button type="button" onClick={cancel} className="text-gray-400 transition-colors hover:text-gray-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* No. RM read-only — identitas permanen, tidak bisa diubah. */}
      <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
        <IdCard className="h-4 w-4 text-gray-400" />
        No. Rekam Medis: <span className="font-mono font-bold text-gray-800">{formatRM(patient.medical_record_no)}</span>
        <span className="ml-auto text-xs text-gray-400">tidak bisa diubah</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama Lengkap" required>
          <input className={inp} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} placeholder="Nama lengkap" />
        </Field>
        <Field label="No. HP / WhatsApp" required>
          <input className={inp} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" placeholder="08xxxxxxxxxx" />
        </Field>
        <Field label="Tanggal Lahir">
          <input type="date" className={inp} value={f.birth_date} onChange={(e) => setF({ ...f, birth_date: e.target.value })} />
        </Field>
        <Field label="Jenis Kelamin">
          <div className="flex gap-2">
            {([['L', 'Laki-laki'], ['P', 'Perempuan']] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setF({ ...f, gender: f.gender === val ? '' : val })}
                className={`flex-1 rounded-xl border-2 py-2 text-sm font-semibold transition-all ${
                  f.gender === val ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-100 text-gray-500 hover:border-teal-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Nama Orang Tua / Wali">
          <input className={inp} value={f.guardian_name} onChange={(e) => setF({ ...f, guardian_name: e.target.value })} placeholder="Nama wali (jika ada)" />
        </Field>
        <Field label="Email">
          <input type="email" className={inp} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="email@contoh.com" />
        </Field>
      </div>

      <Field label="Catatan">
        <textarea className={`${inp} resize-y`} rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Catatan umum tentang pasien…" />
      </Field>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={cancel} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50">
          Batal
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-teal-700 disabled:opacity-60"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</> : <><Check className="h-4 w-4" /> Simpan</>}
        </button>
      </div>
    </form>
  )
}

const inp =
  'block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-gray-500">{label}</dt>
      <dd className={`mt-0.5 whitespace-pre-wrap text-sm text-gray-800 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}
