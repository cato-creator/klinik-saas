'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, Pencil, X, Check } from 'lucide-react'

interface Props {
  patientId: string
  specialAlert: string | null
  sessionPackage: number | null
}

export function ClinicalEdit({ patientId, specialAlert, sessionPackage }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(specialAlert ?? '')
  const [pkg, setPkg] = useState(sessionPackage != null ? String(sessionPackage) : '')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/terapis/patient-clinical', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patientId,
        special_alert: alert.trim() || null,
        session_package: pkg === '' ? null : Number(pkg),
      }),
    })
    setSaving(false)
    if (res.ok) {
      setEditing(false)
      router.refresh()
    }
  }

  if (!editing) {
    return (
      <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Data Klinis
          </h3>
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-100"
          >
            <Pencil className="h-3.5 w-3.5" /> Ubah
          </button>
        </div>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-gray-500">Perhatian Khusus</dt>
            <dd className="mt-0.5 text-sm text-gray-800">{specialAlert || <span className="text-gray-400">— belum dicatat</span>}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500">Target Paket Sesi</dt>
            <dd className="mt-0.5 text-sm text-gray-800">{sessionPackage ? `${sessionPackage} sesi` : <span className="text-gray-400">— tidak ditentukan</span>}</dd>
          </div>
        </dl>
      </div>
    )
  }

  return (
    <form onSubmit={save} className="mb-4 space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Ubah Data Klinis
        </h3>
        <button type="button" onClick={() => setEditing(false)} className="text-gray-400 transition-colors hover:text-gray-700">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-800">Perhatian Khusus / Safety Flag</label>
        <textarea
          value={alert}
          onChange={(e) => setAlert(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          placeholder="Mis. Risiko tantrum & sensori defensif. Pendekatan perlahan sebelum aktivitas sentuhan."
        />
        <p className="mt-1 text-xs text-gray-400">Tampil sebagai banner peringatan di kartu pasien.</p>
      </div>
      <div className="max-w-[200px]">
        <label className="mb-1 block text-sm font-semibold text-gray-800">Target Paket Sesi</label>
        <input
          type="number"
          min={0}
          max={999}
          value={pkg}
          onChange={(e) => setPkg(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          placeholder="Mis. 8"
        />
      </div>
      <div className="flex justify-end">
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
