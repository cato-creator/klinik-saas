import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { LayoutList } from 'lucide-react'
import { QueueList, type QueueItem } from '@/components/terapis/queue-list'
import { calculateAge, todayJakarta, nowJakarta } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dashboard Terapis' }

export default async function TerapisDashboardPage() {
  const ctx = await requireTenantUser(['therapist', 'admin', 'owner'])

  const db = createServiceClient()
  const today = todayJakarta()

  // Antrian seluruh klinik hari ini (1 tipe layanan per klinik).
  const bookings = (await db
    .from('bookings')
    .select('*, patient:patients(full_name, birth_date, gender, guardian_name, medical_record_no), service_type:service_types(name)')
    .eq('clinic_id', ctx.clinicId)
    .eq('session_date', today)
    .neq('status', 'cancelled')
    .order('session_time')).data ?? []

  const queueItems: QueueItem[] = bookings.map((b) => {
    const p = b.patient as any
    const service = (b.service_type as any)?.name ?? null
    return {
      id: b.id,
      patientId: b.patient_id,
      time: b.session_time,
      name: p?.full_name ?? 'Pasien',
      age: p?.birth_date ? calculateAge(p.birth_date) : null,
      gender: p?.gender ?? null,
      rm: p?.medical_record_no ?? null,
      service,
      guardian: p?.guardian_name ?? null,
      complaint: b.notes_patient ?? null,
      status: b.status,
      paymentStatus: b.payment_status ?? null,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-sm shadow-sky-500/30">
          <LayoutList className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Antrian Pasien</h1>
          <p className="text-sm text-gray-500">{format(nowJakarta(), "EEEE, d MMMM yyyy", { locale: id })}</p>
        </div>
      </div>

      <QueueList items={queueItems} />
    </div>
  )
}
