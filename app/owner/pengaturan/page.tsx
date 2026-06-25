import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { PengaturanBooking } from '@/components/owner/pengaturan-booking'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pengaturan Booking — Owner' }

export default async function PengaturanBookingPage() {
  const ctx = await requireTenantUser(['owner'])
  const db = createServiceClient()

  // select('*') agar tetap aman bila migrasi 0016 (kolom rekening) belum dijalankan
  // (kolom yang belum ada cukup absen, tidak melempar error).
  const { data: clinic } = await db
    .from('clinics')
    .select('*')
    .eq('id', ctx.clinicId)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Booking</h1>
        <p className="mt-1 text-sm text-gray-500">Atur biaya komitmen & rekening pembayaran untuk booking lewat website.</p>
      </div>
      <PengaturanBooking
        initialFee={Number(clinic?.online_booking_fee ?? 0)}
        initialBank={(clinic?.payment_bank as string) ?? ''}
        initialAccountName={(clinic?.payment_account_name as string) ?? ''}
        initialAccountNumber={(clinic?.payment_account_number as string) ?? ''}
      />
    </div>
  )
}
