'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { parseISO } from 'date-fns'
import { Loader2, Check, AlertCircle, CalendarPlus } from 'lucide-react'
import { validatePhone } from '@/lib/utils'
import { GENDERS } from '@/lib/constants'
import { DISCIPLINES } from '@/lib/disciplines'
import type { Therapist, Gender } from '@/types'

interface Props {
  therapists: Therapist[]
  clinicSpecializations?: string[]
}

export function ManualBookingForm({ therapists, clinicSpecializations = [] }: Props) {
  const router = useRouter()

  // Layanan/disiplin yang dibuka klinik. Bila >1, admin memilih dulu; terapis
  // ikut difilter sesuai pilihan.
  const disciplineOptions = useMemo(
    () => DISCIPLINES.filter((d) => clinicSpecializations.includes(d.key)),
    [clinicSpecializations],
  )
  const multiDiscipline = disciplineOptions.length > 1
  const [discipline, setDiscipline] = useState<string>(disciplineOptions[0]?.key ?? '')

  const [therapistId, setTherapistId] = useState('')

  // Terapis yang cocok dengan layanan terpilih (saat klinik multi-layanan).
  const shownTherapists = useMemo(
    () => (multiDiscipline ? therapists.filter((t) => t.discipline === discipline) : therapists),
    [therapists, multiDiscipline, discipline],
  )
  const [date, setDate] = useState('')
  const [patient, setPatient] = useState({
    full_name: '',
    phone: '',
    guardian_name: '',
    birth_date: '',
    gender: '' as '' | Gender,
    email: '',
  })
  const [notes, setNotes] = useState('')

  // Pasien baru (isi data) vs pasien lama (cukup No. RM).
  const [patientType, setPatientType] = useState<'new' | 'existing'>('new')
  const [rm, setRm] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const valid =
    !!date &&
    (patientType === 'existing'
      ? rm.trim().length > 0
      : patient.full_name.trim().length >= 2 && validatePhone(patient.phone))

  async function submit() {
    if (!valid) return
    setError('')
    setSubmitting(true)
    try {
      const common = {
        therapist_id: therapistId || undefined,
        session_date: date,
        // Jam belum dijadwalkan — klinik tidak memakai jam.
        session_time: '00:00',
        notes_patient: notes.trim() || undefined,
        discipline: multiDiscipline ? discipline : undefined,
      }
      const body =
        patientType === 'existing'
          ? { ...common, medical_record_no: rm.trim() }
          : {
              ...common,
              patient: {
                full_name: patient.full_name.trim(),
                phone: patient.phone.trim(),
                email: patient.email.trim() || '',
                birth_date: patient.birth_date || undefined,
                gender: patient.gender || undefined,
                guardian_name: patient.guardian_name.trim() || undefined,
              },
            }
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Gagal membuat booking. Coba lagi.')
        setSubmitting(false)
        return
      }
      router.push('/klinik/booking')
      router.refresh()
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.')
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* Layanan — hanya bila klinik melayani lebih dari satu */}
        {multiDiscipline && (
          <Card title="Layanan" subtitle="Pilih layanan untuk booking ini. Terapis difilter sesuai pilihan.">
            <div className="grid gap-3 sm:grid-cols-2">
              {disciplineOptions.map((d) => {
                const Icon = d.icon
                const active = discipline === d.key
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => { setDiscipline(d.key); setTherapistId('') }}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                      active ? 'border-teal-500 bg-teal-50/50' : 'border-gray-100 hover:border-teal-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-gray-900">{d.label}</span>
                      <span className="block text-xs text-gray-500">{d.desc}</span>
                    </span>
                    {active && <Check className="ml-auto h-5 w-5 shrink-0 text-teal-600" strokeWidth={3} />}
                  </button>
                )
              })}
            </div>
          </Card>
        )}

        {/* Terapis */}
        <Card title="Terapis (opsional)" subtitle="Boleh dikosongkan — bisa ditangani semua terapis.">
          {shownTherapists.length === 0 ? (
            <p className="text-sm text-gray-400">{multiDiscipline ? 'Belum ada terapis untuk layanan ini.' : 'Belum ada terapis aktif.'}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTherapistId('')}
                className={`flex items-center justify-between rounded-xl border-2 p-3 text-left transition-all ${
                  therapistId === '' ? 'border-teal-500 bg-teal-50/50' : 'border-gray-100 hover:border-teal-200 hover:bg-gray-50'
                }`}
              >
                <p className="font-semibold text-gray-900">Tanpa preferensi <span className="font-normal text-gray-400">(semua terapis)</span></p>
                {therapistId === '' && <Check className="h-5 w-5 shrink-0 text-teal-600" strokeWidth={3} />}
              </button>
              {shownTherapists.map((t) => {
                const active = therapistId === t.id
                const name = t.profile?.full_name ?? 'Terapis'
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTherapistId(t.id)}
                    className={`flex items-center justify-between rounded-xl border-2 p-3 text-left transition-all ${
                      active ? 'border-teal-500 bg-teal-50/50' : 'border-gray-100 hover:border-teal-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{name}</p>
                      {t.str_number && <p className="text-xs text-teal-600">{t.str_number}</p>}
                    </div>
                    {active && <Check className="h-5 w-5 shrink-0 text-teal-600" strokeWidth={3} />}
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        {/* Data pasien */}
        <Card title="Data Pasien" subtitle="Pasien baru atau pasien lama (cukup No. RM).">
          {/* Pilih: Pasien Baru / Pasien Lama */}
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setPatientType('new')}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${patientType === 'new' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-teal-100' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Pasien Baru
            </button>
            <button
              type="button"
              onClick={() => setPatientType('existing')}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${patientType === 'existing' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-teal-100' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Pasien Lama
            </button>
          </div>

          {patientType === 'existing' ? (
            <Field label="No. Rekam Medis (RM)" required>
              <input
                value={rm}
                onChange={(e) => setRm(e.target.value)}
                placeholder="Cukup ketik angkanya, mis. 1"
                inputMode="numeric"
                className="inp"
              />
              <p className="mt-1 text-xs text-gray-400">Cukup ketik angkanya saja (tanpa &quot;RM-&quot;). Untuk pasien yang sudah pernah terdaftar di klinik ini. Lihat No. RM di menu Data Pasien.</p>
            </Field>
          ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama Pasien" required>
              <input
                value={patient.full_name}
                onChange={(e) => setPatient({ ...patient, full_name: e.target.value })}
                placeholder="Nama lengkap pasien"
                className="inp"
              />
            </Field>
            <Field
              label="No. WhatsApp"
              required
              hint={patient.phone && !validatePhone(patient.phone) ? 'Format nomor tidak valid' : undefined}
            >
              <input
                value={patient.phone}
                onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
                placeholder="08xxxxxxxxxx"
                inputMode="tel"
                className="inp"
              />
            </Field>
            <Field label="Nama Orang Tua / Wali (opsional)">
              <input
                value={patient.guardian_name}
                onChange={(e) => setPatient({ ...patient, guardian_name: e.target.value })}
                placeholder="Nama wali (jika ada)"
                className="inp"
              />
            </Field>
            <Field label="Tanggal Lahir">
              <input
                type="date"
                value={patient.birth_date}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setPatient({ ...patient, birth_date: e.target.value })}
                className="inp"
              />
            </Field>
            <Field label="Jenis Kelamin">
              <div className="flex gap-2">
                {GENDERS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setPatient({ ...patient, gender: g.value })}
                    className={`flex-1 rounded-xl border-2 py-2 text-sm font-semibold transition-all ${
                      patient.gender === g.value ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-100 text-gray-500 hover:border-teal-200'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Email (opsional)">
              <input
                type="email"
                value={patient.email}
                onChange={(e) => setPatient({ ...patient, email: e.target.value })}
                placeholder="email@contoh.com"
                className="inp"
              />
            </Field>
          </div>
          )}
          <div className="mt-4">
            <Field label="Keluhan / Catatan">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Catatan kondisi atau keluhan pasien…"
                className="inp resize-y"
              />
            </Field>
          </div>
        </Card>
      </div>

      {/* Ringkasan + aksi */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div>
            <h2 className="font-bold text-gray-900">Ringkasan</h2>
            <p className="text-xs text-gray-500">Periksa sebelum menyimpan.</p>
          </div>

          <Field label="Tanggal Kunjungan" required>
            <input
              type="date"
              value={date}
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setDate(e.target.value)}
              className="inp"
            />
          </Field>

          <div className="space-y-2 border-t border-gray-100 pt-3 text-sm">
            <Row
              label="Terapis"
              value={therapists.find((t) => t.id === therapistId)?.profile?.full_name ?? '—'}
            />
            <Row
              label="Tanggal"
              value={date ? format(parseISO(date), 'd MMM yyyy', { locale: localeID }) : '—'}
            />
            <Row label="Pasien" value={patientType === 'existing' ? (rm.trim() || '—') : (patient.full_name || '—')} />
          </div>

          <p className="rounded-xl bg-teal-50/60 px-3 py-2 text-xs text-teal-700">
            Booking dibuat tanpa jam. Status awal: menunggu konfirmasi.
          </p>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!valid || submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</>
            ) : (
              <><CalendarPlus className="h-4 w-4" /> Simpan Booking</>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .inp {
          display: block; width: 100%; border-radius: 0.75rem; border: 1px solid #e5e7eb;
          padding: 0.6rem 0.75rem; font-size: 0.875rem; background: #fff; transition: all .15s;
        }
        .inp:focus { outline: none; border-color: #14b8a6; box-shadow: 0 0 0 3px rgba(20,184,166,.18); }
      `}</style>
    </div>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-red-500">{hint}</p>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold text-gray-900">{value}</span>
    </div>
  )
}
