import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { format, startOfMonth, subMonths } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { TrendingUp, Users, Calendar, DollarSign } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { MonthlyRevenueChart, PaymentMethodPie } from '@/components/owner/charts'
import { formatRupiah } from '@/lib/utils'
import { fetchPayments, monthlyRevenueSeries, revenueByMethod } from '@/lib/reports'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dashboard Owner' }

export default async function OwnerDashboardPage() {
  const ctx = await requireTenantUser(['owner'])

  const db = createServiceClient()
  const now = new Date()
  const sixMonthsAgo = format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthStartISO = startOfMonth(now).toISOString()

  const [payments, bookingsMonthRes, totalPasienRes, totalTerapisRes, keuanganMasukRes] = await Promise.all([
    fetchPayments(db, ctx.clinicId, new Date(sixMonthsAgo).toISOString()),
    db.from('bookings').select('status').eq('clinic_id', ctx.clinicId).gte('session_date', monthStart),
    db.from('patients').select('id', { count: 'exact', head: true }).eq('clinic_id', ctx.clinicId).is('deleted_at', null),
    db.from('therapists').select('id', { count: 'exact', head: true }).eq('clinic_id', ctx.clinicId).eq('is_active', true),
    // Pemasukan bulan ini diambil dari buku kas (keuangan): mencakup pemasukan
    // otomatis dari pembayaran + transaksi pemasukan manual yang diinput owner.
    db.from('keuangan').select('jumlah').eq('clinic_id', ctx.clinicId).eq('jenis', 'masuk').gte('tanggal', monthStart),
  ])

  const series = monthlyRevenueSeries(payments, 6)
  const pie = revenueByMethod(payments.filter((p) => p.confirmedAt >= monthStartISO))
  // Jika tabel keuangan belum ada (migrasi belum jalan), fallback ke pembayaran saja.
  const pendapatanBulan = keuanganMasukRes.error
    ? payments.filter((p) => p.confirmedAt >= monthStartISO).reduce((s, p) => s + p.amount, 0)
    : (keuanganMasukRes.data ?? []).reduce((s, r) => s + Number(r.jumlah ?? 0), 0)
  const bookingsMonth = bookingsMonthRes.data ?? []
  const sesiSelesai = bookingsMonth.filter((b) => b.status === 'completed').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Owner</h1>
        <p className="mt-1 text-sm text-gray-500">{format(now, 'MMMM yyyy', { locale: localeID })}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pendapatan Bulan Ini" value={formatRupiah(pendapatanBulan)} icon={DollarSign} iconColor="text-green-600" />
        <StatCard title="Sesi Selesai Bulan Ini" value={sesiSelesai} icon={Calendar} iconColor="text-blue-600" />
        <StatCard title="Total Pasien" value={totalPasienRes.count ?? 0} icon={Users} iconColor="text-teal-600" />
        <StatCard title="Terapis Aktif" value={totalTerapisRes.count ?? 0} icon={TrendingUp} iconColor="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-4 font-semibold text-gray-900">Tren Pendapatan (6 Bulan)</h3>
          <MonthlyRevenueChart data={series} />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Metode Bayar Bulan Ini</h3>
          {pie.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">Belum ada pembayaran bulan ini.</p>
          ) : (
            <>
              <PaymentMethodPie data={pie} />
              <div className="mt-3 space-y-1">
                {pie.map((m) => (
                  <div key={m.name} className="flex justify-between text-xs text-gray-500">
                    <span>{m.name}</span>
                    <span className="font-medium text-gray-700">{formatRupiah(m.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
