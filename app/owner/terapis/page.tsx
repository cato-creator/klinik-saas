import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { UserCog, Award } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { SessionsBarChart, TherapistRevenueChart } from '@/components/owner/charts'
import { formatRupiah, getInitials } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Performa Terapis — Owner' }

export default async function PerformaTerapisPage() {
  const ctx = await requireTenantUser(['owner'])

  const db = createServiceClient()

  const [therapistsRes, bookingsRes] = await Promise.all([
    db.from('therapists').select('id, is_active, user:users(full_name)').eq('clinic_id', ctx.clinicId),
    db.from('bookings').select('therapist_id, amount, status, payment_status').eq('clinic_id', ctx.clinicId),
  ])

  const therapists = therapistsRes.data ?? []
  const bookings = bookingsRes.data ?? []

  const stats = therapists.map((t: any) => {
    const own = bookings.filter((b) => b.therapist_id === t.id)
    const completed = own.filter((b) => b.status === 'completed').length
    const revenue = own.filter((b) => b.payment_status === 'paid').reduce((s, b) => s + (b.amount ?? 0), 0)
    const total = own.length
    return {
      id: t.id,
      name: t.user?.full_name ?? 'Terapis',
      active: t.is_active,
      completed,
      total,
      revenue,
    }
  }).sort((a, b) => b.revenue - a.revenue)

  const totalSesi = stats.reduce((s, t) => s + t.completed, 0)
  const totalRevenue = stats.reduce((s, t) => s + t.revenue, 0)
  const top = stats[0]

  const barData = stats.filter((t) => t.completed > 0).map((t) => ({ label: t.name.split(' ')[0], sessions: t.completed }))
  const revData = stats.filter((t) => t.revenue > 0).map((t) => ({ name: t.name.split(' ').slice(0, 2).join(' '), revenue: t.revenue }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Performa Terapis</h1>
        <p className="mt-1 text-sm text-gray-500">Sesi selesai & kontribusi pendapatan per terapis.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total Sesi Selesai" value={totalSesi} icon={Award} iconColor="text-blue-600" />
        <StatCard title="Total Pendapatan" value={formatRupiah(totalRevenue)} icon={UserCog} iconColor="text-green-600" />
        <StatCard title="Terapis Terproduktif" value={top?.name ?? '—'} subtitle={top ? `${top.completed} sesi` : undefined} icon={Award} iconColor="text-amber-600" />
      </div>

      {stats.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <EmptyState icon={UserCog} title="Belum ada data terapis" className="py-12" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-semibold text-gray-900">Sesi Selesai per Terapis</h3>
              {barData.length === 0 ? <p className="py-16 text-center text-sm text-gray-400">Belum ada sesi selesai.</p> : <SessionsBarChart data={barData} />}
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-semibold text-gray-900">Pendapatan per Terapis</h3>
              {revData.length === 0 ? <p className="py-16 text-center text-sm text-gray-400">Belum ada pendapatan.</p> : <TherapistRevenueChart data={revData} />}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="font-semibold text-gray-900">Rincian Terapis</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {stats.map((t) => (
                <div key={t.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                    {getInitials(t.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.completed} selesai · {t.total} total booking{!t.active && ' · nonaktif'}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatRupiah(t.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
