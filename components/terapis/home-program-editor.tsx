'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { House, Loader2, Save, CheckCircle2, ImagePlus, X, AlertCircle } from 'lucide-react'

interface Props {
  bookingId: string
  /** Catatan yang akan diperbarui home program-nya (latest). Kosong → buat baru. */
  noteId?: string
  initial?: string
  initialImages?: string[]
  dateLabel?: string
}

export function HomeProgramEditor({ bookingId, noteId, initial = '', initialImages = [], dateLabel }: Props) {
  const router = useRouter()
  const [value, setValue] = useState(initial)
  const [images, setImages] = useState<string[]>(initialImages)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // reset agar bisa pilih file sama lagi
    if (files.length === 0) return
    if (images.length + files.length > 12) {
      setError('Maksimal 12 gambar.')
      return
    }
    setError('')
    setUploading(true)
    setSaved(false)
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('folder', 'homeprogram')
        const res = await fetch('/api/terapis/upload-photo', { method: 'POST', body: fd })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) { setError(j.error ?? 'Gagal upload gambar'); break }
        setImages((prev) => [...prev, j.url])
      }
    } finally {
      setUploading(false)
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    setError('')
    const res = await fetch('/api/terapis/home-program', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, note_id: noteId, home_program: value, home_program_images: images }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 1800)
    } else {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Gagal menyimpan.')
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-1 flex items-center gap-2 font-bold text-gray-900">
        <House className="h-4 w-4 text-teal-600" /> Isi Program Latihan di Rumah
      </h3>
      <p className="mb-3 text-xs text-gray-400">
        Untuk kunjungan{dateLabel ? ` ${dateLabel}` : ' aktif'}. Panduan & gambar latihan yang ditunjukkan ke pasien.
      </p>
      <textarea
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false) }}
        rows={4}
        className="w-full resize-y rounded-lg border border-gray-200 bg-green-50/40 px-3 py-2 text-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        placeholder="Mis. Latihan stretching hamstring 3×10 hitungan, 2× sehari…"
      />

      {/* Gambar latihan */}
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-600">Gambar Latihan</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            {uploading ? 'Mengunggah…' : 'Tambah Gambar'}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onPick} />
        </div>
        {images.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-gray-200 px-3 py-3 text-center text-xs text-gray-400">
            Belum ada gambar. Unggah foto/ilustrasi latihan (JPG/PNG/WebP, maks 2MB).
          </p>
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((url) => (
              <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Latihan" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  aria-label="Hapus gambar"
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-end gap-3">
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" /> Tersimpan
          </span>
        )}
        <button
          onClick={save}
          disabled={saving || uploading}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-teal-700 disabled:opacity-60"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</> : <><Save className="h-4 w-4" /> Simpan Home Program</>}
        </button>
      </div>
    </div>
  )
}
