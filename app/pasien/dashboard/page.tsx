import { createClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import Link from 'next/link'
import { Calendar, Clock, CheckCircle } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate, formatTime, formatRupiah, getStatusLabel, getStatusColor } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dashboard Pasien' }

export default async function PasienDashboardPage() {
  const ctx = await requireTenantUser(['patient', 'admin', 'owner'])
  const supabase = await createClient()

  // Ambil data pasien linked ke akun ini (RLS membatasi ke milik sendiri).
  const { data: patient } = await supabase
    .from('patients')
    .select('id, full_name')
    .eq('user_id', ctx.userId)
    .is('deleted_at', null)
    .maybeSingle()

  const bookings = patient ? (await supabase
    .from('bookings')
    .select('*, service_type:service_types(name), therapist:therapists(profile:users(full_name))')
    .eq('patient_id', patient.id)
    .order('session_date', { ascending: false })
    .limit(10)).data ?? [] : []

  const totalSesi = bookings.filter(b => b.status === 'completed').length
  const bookingAktif = bookings.filter(b => ['pending', 'confirmed'].includes(b.status)).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Pasien</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola booking dan riwayat sesi terapi Anda</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Booking Aktif" value={bookingAktif} icon={Calendar} iconColor="text-blue-600" />
        <StatCard title="Total Sesi Selesai" value={totalSesi} icon={CheckCircle} iconColor="text-green-600" />
        <StatCard title="Total Booking" value={bookings.length} icon={Clock} iconColor="text-teal-600" />
      </div>

      {/* CTA Booking */}
      <div className="bg-teal-600 rounded-2xl p-6 text-white flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Jadwalkan Sesi Baru</h2>
          <p className="text-teal-100 text-sm mt-0.5">Pilih layanan dan terapis sesuai kebutuhan</p>
        </div>
        <Link
          href="/booking"
          className="bg-white text-teal-700 font-medium text-sm px-5 py-2.5 rounded-lg hover:bg-teal-50 transition-colors"
        >
          Booking Sekarang
        </Link>
      </div>

      {/* Riwayat Booking */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Riwayat Booking</h2>
        </div>
        {bookings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Belum ada booking"
            description="Buat booking pertama Anda sekarang"
            action={
              <Link href="/booking" className="bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-teal-700">
                Booking Sekarang
              </Link>
            }
            className="py-10"
          />
        ) : (
          <div className="divide-y divide-gray-50">
            {bookings.map((booking) => (
              <div key={booking.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{(booking.service_type as any)?.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDate(booking.session_date)} · {formatTime(booking.session_time)} ·{' '}
                    {(booking.therapist as any)?.profile?.full_name ?? 'Terapis'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{booking.booking_code}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusColor(booking.status) as any}>
                    {getStatusLabel(booking.status)}
                  </Badge>
                  <span className="text-sm font-medium text-gray-700">{formatRupiah(booking.amount)}</span>
                  {(booking.payment_status === 'paid' || booking.status === 'completed') && (
                    <Link href={`/pasien/invoice/${booking.id}`} className="text-xs text-teal-600 hover:underline">
                      Invoice
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
