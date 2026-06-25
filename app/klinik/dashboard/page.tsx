import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { format } from 'date-fns'
import { Calendar, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatTime, getStatusLabel, getStatusColor, isUnscheduledTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dashboard Admin' }

export default async function AdminDashboardPage() {
  const ctx = await requireTenantUser(['admin', 'owner'])

  const db = createServiceClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [bookingsTodayRes, pendingPaymentRes, totalPasienRes] = await Promise.all([
    db
      .from('bookings')
      .select('*, patient:patients(full_name), service_type:service_types(name), therapist:therapists(profile:users(full_name))')
      .eq('clinic_id', ctx.clinicId)
      .eq('session_date', today)
      .neq('status', 'cancelled')
      .order('session_time'),
    db
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', ctx.clinicId)
      .eq('payment_status', 'unpaid')
      .neq('status', 'cancelled'),
    db
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', ctx.clinicId)
      .is('deleted_at', null),
  ])

  const bookingsToday = bookingsTodayRes.data ?? []
  const pendingCount = pendingPaymentRes.count ?? 0
  const totalPasien = totalPasienRes.count ?? 0
  const completedToday = bookingsToday.filter(b => b.status === 'completed').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
          <p className="text-sm text-gray-500 mt-1">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Booking Hari Ini" value={bookingsToday.length} icon={Calendar} iconColor="text-blue-600" />
        <StatCard title="Sesi Selesai" value={completedToday} icon={CheckCircle} iconColor="text-green-600" />
        <StatCard title="Pembayaran Pending" value={pendingCount} icon={AlertCircle} iconColor="text-yellow-600" />
        <StatCard title="Total Pasien" value={totalPasien} icon={Users} iconColor="text-teal-600" />
      </div>

      {/* Booking Hari Ini */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Jadwal Hari Ini</h2>
        </div>
        {bookingsToday.length === 0 ? (
          <EmptyState icon={Calendar} title="Tidak ada jadwal hari ini" className="py-10" />
        ) : (
          <div className="divide-y divide-gray-50">
            {bookingsToday.map((booking) => (
              <div key={booking.id} className="px-4 sm:px-6 py-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="w-14 sm:w-16 text-sm font-medium text-gray-700 flex-shrink-0">
                  {isUnscheduledTime(booking.session_time) ? '—:—' : formatTime(booking.session_time)}
                </div>
                <div className="flex-1 min-w-[8rem]">
                  <p className="font-medium text-gray-900 text-sm">{(booking.patient as any)?.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {(booking.service_type as any)?.name} · {(booking.therapist as any)?.profile?.full_name}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={booking.payment_status === 'paid' ? 'green' : 'yellow'}>
                    {booking.payment_status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                  </Badge>
                  <Badge variant={getStatusColor(booking.status) as any}>
                    {getStatusLabel(booking.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
