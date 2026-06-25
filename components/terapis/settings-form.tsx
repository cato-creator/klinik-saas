'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, CheckCircle2, Upload, User, PenLine } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface Props {
  initialName: string
  initialPhotoUrl: string | null
  initialSignatureUrl: string | null
}

export function SettingsForm({ initialName, initialPhotoUrl, initialSignatureUrl }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhotoUrl)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(initialSignatureUrl)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const photoInput = useRef<HTMLInputElement>(null)
  const signatureInput = useRef<HTMLInputElement>(null)

  function pick(
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void,
  ) {
    const file = e.target.files?.[0] ?? null
    setError(null)
    setSaved(false)
    setFile(file)
    setPreview(file ? URL.createObjectURL(file) : null)
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    setError(null)

    const fd = new FormData()
    fd.append('full_name', name)
    if (photoFile) fd.append('photo', photoFile)
    if (signatureFile) fd.append('signature', signatureFile)

    const res = await fetch('/api/terapis/profile', { method: 'POST', body: fd })
    const data = await res.json().catch(() => ({}))
    setSaving(false)

    if (res.ok) {
      setSaved(true)
      setPhotoFile(null)
      setSignatureFile(null)
      if (data.photo_url) setPhotoPreview(data.photo_url)
      if (data.signature_url) setSignaturePreview(data.signature_url)
      router.refresh()
      setTimeout(() => setSaved(false), 2200)
    } else {
      setError(data.error ?? 'Gagal menyimpan perubahan')
    }
  }

  return (
    <div className="space-y-6">
      {/* Nama */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 font-bold text-gray-900">
          <User className="h-4 w-4 text-teal-600" /> Nama Lengkap
        </h2>
        <p className="mt-1 text-xs text-gray-400">Nama ini tampil di landing page, dashboard, dan setiap SOAP.</p>
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setSaved(false) }}
          className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          placeholder="Mis. Ns. Anita Sari, S.Kep"
        />
      </section>

      {/* Foto profil */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 font-bold text-gray-900">
          <Upload className="h-4 w-4 text-teal-600" /> Foto Profil
        </h2>
        <p className="mt-1 text-xs text-gray-400">Tampil di halaman Terapis pada landing page. JPG/PNG/WebP, maks 2MB.</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-teal-50 ring-1 ring-gray-100">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Foto profil" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-extrabold text-teal-600">
                {getInitials(name)}
              </div>
            )}
          </div>
          <div>
            <input
              ref={photoInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => pick(e, setPhotoFile, setPhotoPreview)}
            />
            <button
              onClick={() => photoInput.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" /> Pilih Foto
            </button>
            {photoFile && <p className="mt-1.5 truncate text-xs text-gray-500">{photoFile.name}</p>}
          </div>
        </div>
      </section>

      {/* Tanda tangan */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 font-bold text-gray-900">
          <PenLine className="h-4 w-4 text-teal-600" /> Tanda Tangan
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          Muncul di bawah setiap SOAP dan pada hasil cetak rekam medis. Unggah gambar TTD berlatar putih/transparan.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-20 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-200 bg-gray-50">
            {signaturePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signaturePreview} alt="Tanda tangan" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-gray-400">Belum ada TTD</span>
            )}
          </div>
          <div>
            <input
              ref={signatureInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => pick(e, setSignatureFile, setSignaturePreview)}
            />
            <button
              onClick={() => signatureInput.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" /> Pilih Tanda Tangan
            </button>
            {signatureFile && <p className="mt-1.5 truncate text-xs text-gray-500">{signatureFile.name}</p>}
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" /> Perubahan tersimpan
          </span>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:bg-teal-700 disabled:opacity-60"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</> : <><Save className="h-4 w-4" /> Simpan Perubahan</>}
        </button>
      </div>
    </div>
  )
}
