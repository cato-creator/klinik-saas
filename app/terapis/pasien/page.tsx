import { FileText } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { PatientSearchList, type PatientItem } from '@/components/terapis/patient-search-list'
import { calculateAge } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Rekam Medis — Terapis' }

export default async function TerapisPasienPage() {
  const ctx = await requireTenantUser(['therapist', 'admin', 'owner'])

  const db = createServiceClient()
  const { data: therapist } = await db
    .from('therapists')
    .select('id')
    .eq('user_id', ctx.userId)
    .eq('clinic_id', ctx.clinicId)
    .maybeSingle()

  // Ambil semua booking terapis ini, lalu kelompokkan per pasien (unik).
  const bookings = therapist
    ? (await db
        .from('bookings')
        .select('patient_id, session_date, status, patient:patients(id, full_name, birth_date, gender, guardian_name, phone, medical_record_no)')
        .eq('clinic_id', ctx.clinicId)
        .eq('therapist_id', therapist.id)
        .order('session_date', { ascending: false })).data ?? []
    : []

  const map = new Map<string, { patient: any; sessions: number; completed: number; last: string }>()
  for (const b of bookings) {
    const p = b.patient as any
    if (!p) continue
    const cur = map.get(p.id) ?? { patient: p, sessions: 0, completed: 0, last: b.session_date }
    cur.sessions += 1
    if (b.status === 'completed') cur.completed += 1
    if (b.session_date > cur.last) cur.last = b.session_date
    map.set(p.id, cur)
  }

  const patients: PatientItem[] = Array.from(map.values())
    .sort((a, b) => (a.last < b.last ? 1 : -1))
    .map(({ patient, sessions, completed, last }) => ({
      id: patient.id,
      name: patient.full_name,
      rm: patient.medical_record_no ?? null,
      age: patient.birth_date ? calculateAge(patient.birth_date) : null,
      birthDate: patient.birth_date ?? null,
      gender: patient.gender ?? null,
      guardian: patient.guardian_name ?? null,
      phone: patient.phone ?? null,
      sessions,
      completed,
      last,
    }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/30">
          <FileText className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Rekam Medis</h1>
          <p className="text-sm text-gray-500">Cari & buka rekam medis pasien yang Anda tangani.</p>
        </div>
      </div>

      <PatientSearchList items={patients} />
    </div>
  )
}
