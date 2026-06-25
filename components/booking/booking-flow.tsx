'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, isSameMonth, isSameDay, isBefore, startOfDay,
} from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import {
  Check,
  Clock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  HeartHandshake,
  UserPlus,
  IdCard,
} from 'lucide-react'
import { validatePhone, formatRupiah } from '@/lib/utils'
import { waLink } from '@/lib/site'
import { PaymentInfo } from '@/components/booking/payment-info'
import { GENDERS } from '@/lib/constants'
import { DISCIPLINES } from '@/lib/disciplines'
import type { Therapist, Gender } from '@/types'

interface Props {
  therapists: Therapist[]
  clinicId: string
  clinicName?: string
  clinicSpecializations?: string[]
  bookingFee?: number
  bankName?: string | null
  accountName?: string | null
  accountNumber?: string | null
  waNumber?: string | null
  initialTherapistId?: string
  initialPatient: { full_name: string; phone: string }
  profileId?: string
}

const STEPS = ['Pasien', 'Jadwal', 'Konfirmasi']
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export function BookingFlow({
  therapists,
  clinicId,
  clinicName,
  clinicSpecializations = [],
  bookingFee = 0,
  bankName,
  accountName,
  accountNumber,
  waNumber,
  initialTherapistId,
  initialPatient,
  profileId,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Layanan/disiplin yang dibuka klinik (urut registry). Pasien memilih bila >1.
  const disciplineOptions = useMemo(
    () => DISCIPLINES.filter((d) => clinicSpecializations.includes(d.key)),
    [clinicSpecializations],
  )
  const multiDiscipline = disciplineOptions.length > 1
  const [discipline, setDiscipline] = useState<string>(disciplineOptions[0]?.key ?? '')

  // Terapis opsional — hanya terisi bila ada deep-link.
  const therapistId = initialTherapistId ?? ''
  const [date, setDate] = useState('')
  const [month, setMonth] = useState(() => startOfMonth(new Date()))

  // Slot jam — mengikuti jam operasional klinik (WIB). Diambil per tanggal terpilih.
  const [time, setTime] = useState('')
  const [slots, setSlots] = useState<{ time: string; booked: boolean; past: boolean }[]>([])
  const [slotState, setSlotState] = useState<'idle' | 'loading' | 'ready' | 'closed' | 'error'>('idle')

  // Pasien baru (isi data) vs pasien lama (No. RM + verifikasi No. HP).
  const [patientType, setPatientType] = useState<'new' | 'existing'>('new')
  const [rm, setRm] = useState('')
  const [rmPhone, setRmPhone] = useState('')

  const [patient, setPatient] = useState({
    full_name: initialPatient.full_name ?? '',
    phone: initialPatient.phone ?? '',
    guardian_name: '',
    birth_date: '',
    gender: '' as '' | Gender,
    email: '',
  })
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Verifikasi pasien lama (RM + HP) sebelum boleh lanjut.
  const [verifying, setVerifying] = useState(false)
  const [verifiedName, setVerifiedName] = useState<string | null>(null)

  const selectedTherapist = useMemo(() => therapists.find((t) => t.id === therapistId), [therapists, therapistId])

  const today = useMemo(() => startOfDay(new Date()), [])

  // Ambil ketersediaan slot setiap kali tanggal berganti. Reset jam yang dipilih.
  useEffect(() => {
    if (!date) {
      setSlots([])
      setSlotState('idle')
      return
    }
    setTime('')
    setSlotState('loading')
    let aborted = false
    fetch(`/api/booking/availability?clinic_id=${encodeURIComponent(clinicId)}&date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        if (aborted) return
        if (d?.closed) {
          setSlots([])
          setSlotState('closed')
        } else if (Array.isArray(d?.slots)) {
          setSlots(d.slots)
          setSlotState('ready')
        } else {
          setSlots([])
          setSlotState('error')
        }
      })
      .catch(() => {
        if (!aborted) setSlotState('error')
      })
    return () => {
      aborted = true
    }
  }, [date, clinicId])

  // Grid kalender (Senin–Minggu) untuk bulan terpilih
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    const out: Date[] = []
    let cur = start
    while (cur <= end) {
      out.push(cur)
      cur = addDays(cur, 1)
    }
    return out
  }, [month])

  const canPrevMonth = isBefore(startOfMonth(today), month)

  const canNext = useMemo(() => {
    if (step === 0) {
      if (patientType === 'existing') return rm.trim().length > 0 && validatePhone(rmPhone)
      return patient.full_name.trim().length >= 2 && validatePhone(patient.phone)
    }
    if (step === 1) return !!date && !!time
    return true
  }, [step, date, time, patient, patientType, rm, rmPhone])

  // Verifikasi pasien lama ke server. Return true bila cocok (RM + HP).
  async function verifyExisting(): Promise<boolean> {
    setVerifying(true)
    setError('')
    try {
      const res = await fetch('/api/booking/verify-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id: clinicId,
          medical_record_no: rm.trim(),
          verify_phone: rmPhone.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'No. RM atau No. HP tidak cocok.')
        setVerifiedName(null)
        return false
      }
      setVerifiedName(data.name ?? null)
      return true
    } catch {
      setError('Gagal memverifikasi. Coba lagi.')
      return false
    } finally {
      setVerifying(false)
    }
  }

  async function next() {
    setError('')
    // Pasien lama: WAJIB verifikasi RM+HP cocok dulu sebelum lanjut ke tanggal.
    if (step === 0 && patientType === 'existing' && !verifiedName) {
      const ok = await verifyExisting()
      if (!ok) return
    }
    if (step < STEPS.length - 1) setStep((s) => s + 1)
  }
  function back() {
    setError('')
    if (step > 0) setStep((s) => s - 1)
  }

  async function submit() {
    setError('')
    setSubmitting(true)
    try {
      const common = {
        therapist_id: therapistId || undefined,
        session_date: date,
        // Jam dipilih pasien dari slot jam operasional klinik (WIB).
        session_time: time,
        notes_patient: notes.trim() || undefined,
        profile_id: profileId,
        clinic_id: clinicId,
        discipline: multiDiscipline ? discipline : undefined,
      }
      const body =
        patientType === 'existing'
          ? { ...common, medical_record_no: rm.trim(), verify_phone: rmPhone.trim() }
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

      router.push(`/booking/sukses?code=${encodeURIComponent(data.booking_code)}`)
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Booking Sesi Terapi</h1>
        <p className="mt-1.5 text-sm text-gray-500">Beberapa langkah mudah untuk menjadwalkan sesi terapi Anda.</p>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    i < step
                      ? 'bg-teal-600 text-white'
                      : i === step
                        ? 'bg-teal-600 text-white ring-4 ring-teal-100'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </div>
                <span className={`mt-1.5 hidden text-xs font-medium sm:block ${i <= step ? 'text-teal-700' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-1 h-0.5 flex-1 rounded sm:mx-2 ${i < step ? 'bg-teal-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
        {/* STEP 1 — Tanggal (kalender) */}
        {step === 1 && (
          <Section title="Pilih Tanggal & Jam" subtitle="Pilih tanggal, lalu pilih jam yang tersedia mengikuti jam buka klinik (WIB).">
            <div className="mx-auto max-w-sm">
              {/* Header navigasi bulan */}
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => canPrevMonth && setMonth((m) => addMonths(m, -1))}
                  disabled={!canPrevMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-30"
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <p className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <CalendarDays className="h-4 w-4 text-teal-600" />
                  {format(month, 'MMMM yyyy', { locale: localeID })}
                </p>
                <button
                  type="button"
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 text-gray-500 transition-colors hover:bg-gray-50"
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Nama hari */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEKDAYS.map((w) => (
                  <span key={w} className="py-1 text-[11px] font-semibold text-gray-400">{w}</span>
                ))}
              </div>

              {/* Tanggal */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((d) => {
                  const value = format(d, 'yyyy-MM-dd')
                  const inMonth = isSameMonth(d, month)
                  const past = isBefore(d, today)
                  const isToday = isSameDay(d, today)
                  const active = date === value
                  const disabled = past || !inMonth
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={disabled}
                      onClick={() => setDate(value)}
                      className={`relative flex aspect-square items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                        active
                          ? 'bg-teal-600 text-white shadow-md'
                          : disabled
                            ? 'cursor-not-allowed text-gray-300'
                            : 'text-gray-700 hover:bg-teal-50'
                      } ${!inMonth ? 'invisible' : ''}`}
                    >
                      {format(d, 'd')}
                      {isToday && !active && (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-teal-500" />
                      )}
                    </button>
                  )
                })}
              </div>

              {date && (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-700">
                  <Check className="h-4 w-4" strokeWidth={3} />
                  {format(parseISO(date), 'EEEE, d MMMM yyyy', { locale: localeID })}
                </div>
              )}
            </div>

            {/* Pilih jam — hanya muncul setelah tanggal dipilih */}
            {date && (
              <div className="mx-auto mt-6 max-w-sm">
                <p className="mb-2.5 flex items-center gap-1.5 text-sm font-bold text-gray-800">
                  <Clock className="h-4 w-4 text-teal-600" /> Pilih Jam <span className="font-normal text-gray-400">(WIB)</span>
                </p>

                {slotState === 'loading' && (
                  <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat jam tersedia…
                  </div>
                )}

                {slotState === 'closed' && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> Klinik tutup pada hari ini. Silakan pilih tanggal lain.
                  </div>
                )}

                {slotState === 'error' && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> Gagal memuat jam. Coba pilih ulang tanggalnya.
                  </div>
                )}

                {slotState === 'ready' && slots.every((s) => s.booked || s.past) && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> Tidak ada jam tersisa di tanggal ini. Silakan pilih tanggal lain.
                  </div>
                )}

                {slotState === 'ready' && slots.some((s) => !s.booked && !s.past) && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((s) => {
                      const disabled = s.booked || s.past
                      const active = time === s.time
                      return (
                        <button
                          key={s.time}
                          type="button"
                          disabled={disabled}
                          onClick={() => setTime(s.time)}
                          title={s.booked ? 'Sudah dibooking' : s.past ? 'Jam sudah lewat' : undefined}
                          className={`rounded-xl border-2 py-2 text-sm font-semibold transition-all ${
                            active
                              ? 'border-teal-500 bg-teal-600 text-white shadow-md'
                              : disabled
                                ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 line-through'
                                : 'border-gray-100 text-gray-700 hover:border-teal-300 hover:bg-teal-50'
                          }`}
                        >
                          {s.time}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </Section>
        )}

        {/* STEP 0 — Pasien (pilih jenis dulu, lalu isi datanya) */}
        {step === 0 && (
          <Section title="Pasien" subtitle="Pilih dulu: pasien baru atau pasien lama, lalu isi datanya.">
            {/* Pilih layanan — hanya muncul bila klinik melayani lebih dari satu. */}
            {multiDiscipline && (
              <div className="mb-6">
                <p className="mb-1.5 block text-sm font-medium text-gray-700">Layanan</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {disciplineOptions.map((d) => {
                    const Icon = d.icon
                    const active = discipline === d.key
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setDiscipline(d.key)}
                        className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                          active ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-100' : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-bold text-gray-900">{d.label}</span>
                          <span className="block text-xs text-gray-500">{d.desc}</span>
                        </span>
                        {active && <Check className="ml-auto h-5 w-5 shrink-0 text-teal-600" strokeWidth={3} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Dua pilihan jelas */}
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceCard
                active={patientType === 'new'}
                onClick={() => setPatientType('new')}
                icon={<UserPlus className="h-5 w-5" />}
                title="Pasien Baru"
                desc="Belum pernah berobat di sini"
              />
              <ChoiceCard
                active={patientType === 'existing'}
                onClick={() => setPatientType('existing')}
                icon={<IdCard className="h-5 w-5" />}
                title="Pasien Lama"
                desc="Sudah punya No. RM"
              />
            </div>

            <div className="mt-6">
            {patientType === 'existing' ? (
              <div className="space-y-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="No. Rekam Medis (RM)" required>
                    <input
                      value={rm}
                      onChange={(e) => { setRm(e.target.value); setVerifiedName(null) }}
                      placeholder="Cukup ketik angkanya, mis. 1"
                      inputMode="numeric"
                      className="inp"
                    />
                  </Field>
                  <Field label="No. WhatsApp" required hint={rmPhone && !validatePhone(rmPhone) ? 'Format nomor tidak valid' : undefined}>
                    <input
                      value={rmPhone}
                      onChange={(e) => { setRmPhone(e.target.value); setVerifiedName(null) }}
                      placeholder="08xxxxxxxxxx"
                      inputMode="tel"
                      className="inp"
                    />
                  </Field>
                </div>
                <p className="text-xs text-gray-400">
                  Masukkan No. RM (cukup angkanya saja, tanpa &quot;RM-&quot;) beserta No. WhatsApp yang terdaftar.
                  Sistem akan memverifikasi sebelum lanjut — khusus pasien yang sudah pernah berobat di klinik ini.
                </p>
                {verifiedName && (
                  <p className="flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700">
                    <Check className="h-4 w-4" strokeWidth={3} /> Terverifikasi: {verifiedName}
                  </p>
                )}
              </div>
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
              <Field label="No. WhatsApp" required hint={patient.phone && !validatePhone(patient.phone) ? 'Format nomor tidak valid' : undefined}>
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
              <Field label="Tanggal Lahir (opsional)">
                <input
                  type="date"
                  value={patient.birth_date}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setPatient({ ...patient, birth_date: e.target.value })}
                  className="inp"
                />
              </Field>
              <Field label="Jenis Kelamin (opsional)">
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
            </div>
            <div className="mt-4">
              <Field label="Keluhan (opsional)">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Ceritakan singkat kondisi atau keluhan Anda… (boleh dikosongkan)"
                  className="inp resize-y"
                />
              </Field>
            </div>
          </Section>
        )}

        {/* STEP 2 — Konfirmasi */}
        {step === 2 && (
          <Section title="Konfirmasi Booking" subtitle="Periksa kembali detail booking Anda sebelum mengirim.">
            <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 p-5 ring-1 ring-teal-100">
              <div className="space-y-2.5 text-sm">
                {multiDiscipline && (
                  <SummaryRow label="Layanan" value={disciplineOptions.find((d) => d.key === discipline)?.label ?? '-'} />
                )}
                <SummaryRow
                  label="Tanggal"
                  value={date ? format(parseISO(date), 'EEEE, d MMMM yyyy', { locale: localeID }) : '-'}
                />
                <SummaryRow label="Jam" value={time ? `${time} WIB` : '-'} />
                {selectedTherapist && <SummaryRow label="Terapis" value={selectedTherapist.profile?.full_name ?? '-'} />}
                {patientType === 'existing' ? (
                  <>
                    {verifiedName && <SummaryRow label="Atas Nama" value={verifiedName} />}
                    <SummaryRow label="No. RM" value={rm.trim() || '-'} />
                    <SummaryRow label="No. WhatsApp" value={rmPhone.trim() || '-'} />
                  </>
                ) : (
                  <>
                    <SummaryRow label="Atas Nama" value={patient.full_name || '-'} />
                    <SummaryRow label="No. WhatsApp" value={patient.phone || '-'} />
                  </>
                )}
                {notes.trim() && <SummaryRow label="Keluhan" value={notes.trim()} />}
                {bookingFee > 0 && (
                  <div className="mt-1 flex items-start justify-between gap-4 border-t border-teal-100 pt-2.5">
                    <span className="font-semibold text-gray-700">Komitmen Fee</span>
                    <span className="text-right font-extrabold text-teal-700">{formatRupiah(bookingFee)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-teal-100 bg-teal-50/50 px-4 py-3 text-sm text-teal-800">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
              <span>
                {bookingFee > 0
                  ? `Booking ini dikenakan komitmen fee ${formatRupiah(bookingFee)}. Jam sesi yang Anda pilih akan dikonfirmasi admin kami via WhatsApp, beserta cara pembayaran.`
                  : 'Jam sesi yang Anda pilih akan dikonfirmasi oleh admin kami via WhatsApp setelah booking dibuat. Tidak perlu membayar sekarang.'}
              </span>
            </div>

            {bookingFee > 0 && (
              <div className="mt-4">
                <PaymentInfo
                  fee={bookingFee}
                  bankName={bankName}
                  accountName={accountName}
                  accountNumber={accountNumber}
                  waNumber={waNumber}
                  waText={`Halo${clinicName ? ' ' + clinicName : ''}, saya baru saja booking lewat website dan ingin mengirim bukti pembayaran komitmen fee.`}
                />
              </div>
            )}

            <p className="mt-4 flex items-start gap-2 text-xs text-gray-400">
              <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
              Dengan menekan tombol di bawah, Anda akan mendapatkan kode booking untuk dikonfirmasikan ke klinik.
            </p>
          </Section>
        )}

        {/* Error */}
        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Nav buttons */}
        <div className="mt-7 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button
              onClick={back}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali
            </button>
          ) : (
            <a href={waLink()} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-400 hover:text-teal-600">
              Butuh bantuan?
            </a>
          )}

          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              disabled={!canNext || verifying}
              className="group inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:-translate-y-0.5 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {verifying ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Memverifikasi…</>
              ) : (
                <>Lanjut <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
              )}
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses…</> : <>Selesaikan Booking <Check className="h-4 w-4" strokeWidth={3} /></>}
            </button>
          )}
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

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-extrabold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
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

function ChoiceCard({
  active, onClick, icon, title, desc,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
        active ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-100' : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-bold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500">{desc}</span>
      </span>
      {active && <Check className="ml-auto h-5 w-5 shrink-0 text-teal-600" strokeWidth={3} />}
    </button>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold text-gray-900">{value}</span>
    </div>
  )
}
