import { Phone, IdCard, AlertTriangle, CalendarDays, User, Stethoscope, CircleCheck } from 'lucide-react'
import { getInitials, calculateAge, formatAgeDetailed, formatRM } from '@/lib/utils'
import { CompleteSessionButton } from './complete-session-button'

interface PatientLike {
  full_name: string
  medical_record_no: string | null
  birth_date: string | null
  gender: 'L' | 'P' | null
  guardian_name: string | null
  phone: string | null
  allergies: string | null
  diagnosis: string | null
  special_alert?: string | null
  session_package?: number | null
}

export function PatientHeader({
  patient,
  completed,
  visitDisciplines,
  visitDateLabel,
  completedAtLabel,
  completeBookingId,
  sessionCompleted,
}: {
  patient: PatientLike
  completed?: number
  /** Layanan kunjungan yang dilihat (Fisioterapi/OT). Bisa >1 bila sehari >1 penanganan. */
  visitDisciplines?: string[]
  /** Tanggal kunjungan yang dilihat, mis. "19 Mei 2026". */
  visitDateLabel?: string
  /** Bila kunjungan SUDAH selesai (mode histori): "19 Mei 2026, 14.30 WIB". Tombol disembunyikan. */
  completedAtLabel?: string | null
  /** Bila diberikan & kunjungan masih aktif (belum selesai): tampilkan tombol "Selesai Pelayanan". */
  completeBookingId?: string
  /** Status sesi sudah selesai → tombol tampil sebagai "Selesai" (non-aktif). */
  sessionCompleted?: boolean
}) {
  const genderLabel = patient.gender === 'L' ? 'Laki-laki' : patient.gender === 'P' ? 'Perempuan' : ''
  const showCompleteButton = !!completeBookingId && !completedAtLabel
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Band identitas */}
      <div className="bg-teal-600 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold text-white ring-1 ring-white/25">
            {getInitials(patient.full_name)}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            {/* Nama */}
            <h1 className="text-xl font-bold text-white sm:text-2xl">{patient.full_name}</h1>
            {/* Jenis kelamin & usia */}
            {(genderLabel || patient.birth_date) && (
              <p className="text-sm text-teal-50">
                {genderLabel}
                {genderLabel && patient.birth_date && ' · '}
                {patient.birth_date && formatAgeDetailed(patient.birth_date)}
              </p>
            )}
            {/* No. RM */}
            <p className="flex items-center gap-1.5 text-sm text-teal-50">
              <IdCard className="h-4 w-4" /> No. RM:{' '}
              <span className="font-mono font-semibold text-white">{formatRM(patient.medical_record_no)}</span>
            </p>
            {/* Kunjungan terapi (Fisio/OT — bisa >1 dalam sehari) */}
            {visitDisciplines && visitDisciplines.length > 0 && (
              <p className="flex flex-wrap items-center gap-1.5 text-sm text-teal-50">
                <Stethoscope className="h-4 w-4 shrink-0" /> Kunjungan:{' '}
                <span className="font-semibold text-white">{visitDisciplines.join(' · ')}</span>
                {visitDateLabel && <span className="text-teal-100">· {visitDateLabel}</span>}
              </p>
            )}
            {/* Selesai pelayanan (histori) ATAU tombol selesai (aktif) */}
            {completedAtLabel ? (
              <p className="flex flex-wrap items-center gap-1.5 text-sm text-teal-50">
                <CircleCheck className="h-4 w-4 shrink-0" /> Selesai Pelayanan Poli:{' '}
                <span className="font-semibold text-white">{completedAtLabel}</span>
              </p>
            ) : showCompleteButton ? (
              <div className="pt-2">
                <CompleteSessionButton bookingId={completeBookingId!} completed={sessionCompleted} />
              </div>
            ) : null}
          </div>
          {typeof completed === 'number' && (
            patient.session_package ? (
              <SessionRing completed={completed} total={patient.session_package} />
            ) : (
              <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-0">
                <p className="text-2xl font-bold text-white">{completed}</p>
                <p className="text-xs text-teal-100">sesi selesai</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Body: chips info + alergi */}
      <div className="space-y-3 p-4 sm:p-5">
        {patient.special_alert && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-bold text-amber-800">Perhatian Khusus</p>
              <p className="text-sm text-amber-700">{patient.special_alert}</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <InfoChip icon={Phone} label="No. HP" value={patient.phone || '—'} />
          <InfoChip icon={User} label="Wali" value={patient.guardian_name || '—'} />
          <InfoChip icon={IdCard} label="No. RM" value={formatRM(patient.medical_record_no)} mono />
          <InfoChip icon={CalendarDays} label="Umur" value={patient.birth_date ? `${calculateAge(patient.birth_date)} thn` : '—'} />
        </div>

        <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${patient.allergies ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-400'}`}>
          <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${patient.allergies ? 'text-red-500' : 'text-gray-300'}`} />
          <span><span className="font-semibold">Alergi:</span> {patient.allergies || 'Tidak ada / belum dicatat'}</span>
        </div>
        {patient.diagnosis && (
          <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700"><span className="font-semibold">Diagnosis ringkas:</span> {patient.diagnosis}</p>
        )}
      </div>
    </div>
  )
}

function SessionRing({ completed, total }: { completed: number; total: number }) {
  const pct = Math.min(100, Math.round((completed / total) * 100))
  return (
    <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
      <div className="text-right">
        <p className="text-sm font-bold text-white">Sesi {completed}<span className="font-medium text-teal-100"> / {total}</span></p>
        <p className="text-xs text-teal-100">paket terapi</p>
      </div>
      <div className="relative h-12 w-12 shrink-0">
        <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.5" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 97.4} 97.4`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">{pct}%</span>
      </div>
    </div>
  )
}

function InfoChip({ icon: Icon, label, value, mono = false }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className={`mt-0.5 truncate text-sm font-medium text-gray-800 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}
