import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { ManualBookingForm } from '@/components/admin/manual-booking-form'
import type { Therapist } from '@/types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Booking Manual — Admin' }

export default async function AdminTambahBookingPage() {
  const ctx = await requireTenantUser(['admin', 'owner'])

  const db = createServiceClient()

  const [{ data: therapistsData }, { data: clinic }] = await Promise.all([
    db.from('therapists')
      .select('*, profile:users(full_name)')
      .eq('clinic_id', ctx.clinicId)
      .eq('is_active', true),
    db.from('clinics').select('specializations, clinic_type').eq('id', ctx.clinicId).maybeSingle(),
  ])

  const therapists = (therapistsData ?? []) as Therapist[]
  const clinicSpecializations = (clinic?.specializations as string[] | null)?.length
    ? (clinic!.specializations as string[])
    : clinic?.clinic_type ? [clinic.clinic_type] : []

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/klinik/booking"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-teal-600"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke daftar booking
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Booking Manual</h1>
        <p className="text-sm text-gray-500">Buat booking atas nama pasien yang mendaftar via telepon / datang langsung.</p>
      </div>

      <ManualBookingForm therapists={therapists} clinicSpecializations={clinicSpecializations} />
    </div>
  )
}
