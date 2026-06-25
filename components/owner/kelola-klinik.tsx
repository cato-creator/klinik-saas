'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  UserPlus, Stethoscope, ShieldCheck, Loader2, Camera, Check,
  AlertCircle, Pencil, X, Power, Trash2,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { DISCIPLINES, disciplineLabel } from '@/lib/disciplines'

interface TherapistItem {
  id: string
  full_name: string
  specialization: string[]
  discipline: string | null
  str_number: string | null
  bio: string | null
  photo_url: string | null
  is_active: boolean
}
interface AdminItem {
  id: string
  full_name: string
  phone: string | null
  role: string
}

async function uploadPhoto(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/owner/upload-photo', { method: 'POST', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Gagal upload foto')
  return data.url as string
}

const toArray = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

// mode: 'all' = tampilkan keduanya (default); 'therapist' / 'admin' = fokus satu jenis.
export function KelolaKlinik({
  therapists,
  admins,
  mode = 'all',
  clinicSpecializations = [],
}: {
  therapists: TherapistItem[]
  admins: AdminItem[]
  mode?: 'all' | 'therapist' | 'admin'
  /** Disiplin yang dibuka klinik — membatasi pilihan jenis terapis. */
  clinicSpecializations?: string[]
}) {
  const lockRole = mode === 'all' ? undefined : mode
  // Hanya disiplin valid yang dibuka klinik (urut registry). Fallback: semua.
  const disciplineOptions = DISCIPLINES.filter((d) => clinicSpecializations.includes(d.key))
  const options = disciplineOptions.length ? disciplineOptions : DISCIPLINES
  return (
    <div className="space-y-8">
      <AddStaffForm lockRole={lockRole} disciplineOptions={options} />
      {mode !== 'admin' && <TherapistList therapists={therapists} disciplineOptions={options} />}
      {mode !== 'therapist' && <AdminList admins={admins} />}
    </div>
  )
}

type DisciplineOption = (typeof DISCIPLINES)[number]

/* ---------------- Tambah Staf ---------------- */
function AddStaffForm({ lockRole, disciplineOptions }: { lockRole?: 'admin' | 'therapist'; disciplineOptions: DisciplineOption[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [role, setRole] = useState<'admin' | 'therapist'>(lockRole ?? 'therapist')
  const [discipline, setDiscipline] = useState<string>(disciplineOptions[0]?.key ?? '')
  const [f, setF] = useState({
    full_name: '', email: '', phone: '', password: 'Klinik#2026',
    specialization: '', str_number: '', bio: '',
  })
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const valid = f.full_name.trim().length >= 2 && /\S+@\S+\.\S+/.test(f.email) && f.password.length >= 8

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setUploading(true)
    try {
      setPhotoUrl(await uploadPhoto(file))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function submit() {
    setError(''); setOk(''); setSaving(true)
    try {
      const res = await fetch('/api/owner/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          full_name: f.full_name.trim(),
          email: f.email.trim(),
          phone: f.phone.trim() || undefined,
          password: f.password,
          ...(role === 'therapist' ? {
            discipline: discipline || undefined,
            specialization: toArray(f.specialization),
            str_number: f.str_number.trim() || undefined,
            bio: f.bio.trim() || undefined,
            photo_url: photoUrl || undefined,
          } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal menyimpan.'); setSaving(false); return }
      setOk(`${role === 'admin' ? 'Admin' : 'Terapis'} "${f.full_name}" berhasil dibuat.`)
      setF({ full_name: '', email: '', phone: '', password: 'Klinik#2026', specialization: '', str_number: '', bio: '' })
      setPhotoUrl('')
      router.refresh()
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
        <UserPlus className="h-5 w-5 text-teal-600" /> Tambah Staf
      </h2>
      <p className="mt-0.5 text-sm text-gray-500">Buat akun admin atau terapis baru. Email langsung aktif (tanpa konfirmasi).</p>

      {/* Role toggle — disembunyikan bila role dikunci (halaman khusus Terapis/Admin) */}
      {!lockRole && (
        <div className="mt-5 grid max-w-md grid-cols-2 gap-3">
          {([
            { key: 'therapist', label: 'Terapis', icon: Stethoscope },
            { key: 'admin', label: 'Admin', icon: ShieldCheck },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setRole(key)}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                role === key ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-100 text-gray-500 hover:border-teal-200'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Nama Lengkap" required>
          <input className="inp" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} placeholder="Nama staf" />
        </Field>
        <Field label="Email" required>
          <input className="inp" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="email@klinik.id" />
        </Field>
        <Field label="No. HP">
          <input className="inp" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="08xxxxxxxxxx" inputMode="tel" />
        </Field>
        <Field label="Password Awal" required hint="Minimal 8 karakter. Staf bisa ganti nanti.">
          <input className="inp" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </Field>
      </div>

      {role === 'therapist' && (
        <div className="mt-4 space-y-4 rounded-xl bg-teal-50/40 p-4">
          {/* Jenis terapis (disiplin) — menentukan template anamnesis pasiennya. */}
          <Field label="Jenis terapis" required hint={disciplineOptions.length > 1 ? 'Pilih satu jenis sesuai kompetensi terapis.' : undefined}>
            {disciplineOptions.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {disciplineOptions.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDiscipline(d.key)}
                    className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-all ${
                      discipline === d.key ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-100 text-gray-500 hover:border-teal-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-100">
                {disciplineLabel(disciplineOptions[0]?.key)}
              </p>
            )}
          </Field>
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-teal-100">
              {photoUrl ? (
                <Image src={photoUrl} alt="foto" fill className="object-cover" sizes="80px" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-teal-600"><Camera className="h-6 w-6" /></span>
              )}
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Mengunggah…</> : <><Camera className="h-4 w-4" /> Upload Foto</>}
              </button>
              <p className="mt-1 text-xs text-gray-400">JPG/PNG/WebP, maks 2MB. Tampil di landing page.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Spesialisasi" hint="Pisahkan dengan koma.">
              <input className="inp" value={f.specialization} onChange={(e) => setF({ ...f, specialization: e.target.value })} placeholder="" />
            </Field>
            <Field label="No. STR">
              <input className="inp" value={f.str_number} onChange={(e) => setF({ ...f, str_number: e.target.value })} placeholder="STR-XXX-00X" />
            </Field>
          </div>
          <Field label="Bio Singkat">
            <textarea className="inp resize-y" rows={2} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} placeholder="Pengalaman & pendekatan terapis…" />
          </Field>
        </div>
      )}

      {error && <Msg type="error">{error}</Msg>}
      {ok && <Msg type="ok">{ok}</Msg>}

      <div className="mt-5">
        <button onClick={submit} disabled={!valid || saving || uploading}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:bg-teal-700 disabled:opacity-40">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</> : <><UserPlus className="h-4 w-4" /> Buat Akun {role === 'admin' ? 'Admin' : 'Terapis'}</>}
        </button>
      </div>

      <FormStyle />
    </section>
  )
}

/* ---------------- Daftar & Edit Terapis ---------------- */
function TherapistList({ therapists, disciplineOptions }: { therapists: TherapistItem[]; disciplineOptions: DisciplineOption[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-gray-900">Terapis ({therapists.length})</h2>
      {therapists.length === 0 ? (
        <p className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">Belum ada terapis.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {therapists.map((t) => <TherapistCard key={t.id} t={t} disciplineOptions={disciplineOptions} />)}
        </div>
      )}
    </section>
  )
}

function TherapistCard({ t, disciplineOptions }: { t: TherapistItem; disciplineOptions: DisciplineOption[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: t.full_name,
    discipline: t.discipline ?? disciplineOptions[0]?.key ?? '',
    specialization: t.specialization.join(', '),
    str_number: t.str_number ?? '',
    bio: t.bio ?? '',
    photo_url: t.photo_url ?? '',
  })

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setBusy(true)
    try {
      const url = await uploadPhoto(file)
      setForm((s) => ({ ...s, photo_url: url }))
    }
    catch (err: any) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function save(extra?: { is_active?: boolean }) {
    setError(''); setBusy(true)
    try {
      const res = await fetch('/api/owner/therapist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: t.id,
          full_name: form.full_name.trim(),
          discipline: form.discipline || undefined,
          specialization: toArray(form.specialization),
          str_number: form.str_number.trim() || undefined,
          bio: form.bio.trim() || undefined,
          photo_url: form.photo_url || undefined,
          ...extra,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal menyimpan.'); setBusy(false); return }
      setEditing(false)
      router.refresh()
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm(`Hapus terapis "${t.full_name}"? Tindakan ini tidak bisa dibatalkan.`)) return
    setError(''); setBusy(true)
    try {
      const res = await fetch('/api/owner/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'therapist', id: t.id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal menghapus.'); setBusy(false); return }
      router.refresh()
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${t.is_active ? 'border-gray-100' : 'border-gray-200 bg-gray-50/60'}`}>
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-teal-100">
          {(editing ? form.photo_url : t.photo_url) ? (
            <Image src={editing ? form.photo_url : (t.photo_url as string)} alt={t.full_name} fill className="object-cover" sizes="64px" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-base font-bold text-teal-700">{getInitials(t.full_name)}</span>
          )}
        </div>

        {!editing ? (
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-bold text-gray-900">{t.full_name}</p>
              {!t.is_active && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">nonaktif</span>}
            </div>
            {t.str_number && <p className="text-xs text-teal-600">{t.str_number}</p>}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {t.discipline && (
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-700">{disciplineLabel(t.discipline)}</span>
              )}
              {t.specialization.map((s) => (
                <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">{s}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1 space-y-2">
            <input className="inp" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nama" />
            {disciplineOptions.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {disciplineOptions.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setForm({ ...form, discipline: d.key })}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      form.discipline === d.key ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:border-teal-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
            <input className="inp" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Spesialisasi (pisah koma)" />
            <input className="inp" value={form.str_number} onChange={(e) => setForm({ ...form, str_number: e.target.value })} placeholder="No. STR" />
            <textarea className="inp resize-y" rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Bio" />
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              <Camera className="h-3.5 w-3.5" /> Ganti Foto
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-gray-50 pt-3">
        {!editing ? (
          <>
            <button onClick={remove} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" /> Hapus
            </button>
            <button onClick={() => save({ is_active: !t.is_active })} disabled={busy}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${t.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}>
              <Power className="h-3.5 w-3.5" /> {t.is_active ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
            <button onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-teal-600 hover:bg-teal-50">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </>
        ) : (
          <>
            <button onClick={() => { setEditing(false); setError('') }} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50">
              <X className="h-3.5 w-3.5" /> Batal
            </button>
            <button onClick={() => save()} disabled={busy || form.full_name.trim().length < 2}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Simpan
            </button>
          </>
        )}
      </div>
      <FormStyle />
    </div>
  )
}

/* ---------------- Daftar Admin ---------------- */
function AdminList({ admins }: { admins: AdminItem[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-gray-900">Admin ({admins.length})</h2>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {admins.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">Belum ada admin.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {admins.map((a) => <AdminRow key={a.id} a={a} />)}
          </div>
        )}
      </div>
    </section>
  )
}

function AdminRow({ a }: { a: AdminItem }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function remove() {
    if (!confirm(`Hapus admin "${a.full_name}"? Tindakan ini tidak bisa dibatalkan.`)) return
    setError(''); setBusy(true)
    try {
      const res = await fetch('/api/owner/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin', id: a.id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal menghapus.'); setBusy(false); return }
      router.refresh()
    } catch {
      setError('Terjadi kesalahan jaringan.'); setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">{getInitials(a.full_name)}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{a.full_name}</p>
        <p className="text-xs text-gray-400">{error ? <span className="text-red-600">{error}</span> : (a.phone ?? 'No. HP belum diisi')}</p>
      </div>
      <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium capitalize text-teal-700">{a.role}</span>
      <button onClick={remove} disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Hapus
      </button>
    </div>
  )
}

/* ---------------- Util kecil ---------------- */
function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}{required && <span className="ml-1 text-red-500">*</span>}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function Msg({ type, children }: { type: 'error' | 'ok'; children: React.ReactNode }) {
  return (
    <div className={`mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
      {type === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" />}
      {children}
    </div>
  )
}

function FormStyle() {
  return (
    <style>{`
      .inp { display:block; width:100%; border-radius:0.75rem; border:1px solid #e5e7eb; padding:0.55rem 0.7rem; font-size:0.875rem; background:#fff; transition:all .15s; }
      .inp:focus { outline:none; border-color:#14b8a6; box-shadow:0 0 0 3px rgba(20,184,166,.18); }
    `}</style>
  )
}
