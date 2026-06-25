import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { format, startOfMonth, subMonths } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { TrendingUp, FileText } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { MonthlyRevenueChart } from '@/components/owner/charts'
import { formatRupiah } from '@/lib/utils'
import { fetchPayments, monthlyRevenueSeries } from '@/lib/reports'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Laporan Keuangan — Owner' }

export default async function LaporanPage() {
  const ctx = await requireTenantUser(['owner'])

  const db = createServiceClient()
  const now = new Date()
  const from = startOfMonth(subMonths(now, 11)) // 12 bulan
  const payments = await fetchPayments(db, ctx.clinicId, from.toISOString())
  const series = monthlyRevenueSeries(payments, 12)

  // Hitung jumlah transaksi per bulan untuk tabel.
  const countByMonth = new Map<string, number>()
  for (const p of payments) {
    const key = p.confirmedAt?.slice(0, 7)
    if (key) countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1)
  }

  const totalSetahun = series.reduce((s, m) => s + m.revenue, 0)
  const bulanIni = series[series.length - 1]?.revenue ?? 0
  const bulanLalu = series[series.length - 2]?.revenue ?? 0
  const growth = bulanLalu > 0 ? Math.round(((bulanIni - bulanLalu) / bulanLalu) * 100) : 0
  const rataRata = Math.round(totalSetahun / series.filter((m) => m.revenue > 0).length || 0) || 0

  // Tampilkan tabel dari bulan terbaru ke terlama.
  const rows = [...series].reverse()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laporan Keuangan</h1>
        <p className="mt-1 text-sm text-gray-500">Rekap pendapatan 12 bulan terakhir.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Pendapatan Bulan Ini" value={formatRupiah(bulanIni)} icon={TrendingUp} iconColor="text-green-600"
          trend={bulanLalu > 0 ? { value: growth, label: 'vs bulan lalu' } : undefined} />
        <StatCard title="Total 12 Bulan" value={formatRupiah(totalSetahun)} icon={FileText} iconColor="text-teal-600" />
        <StatCard title="Rata-rata / Bulan" value={formatRupiah(rataRata)} icon={TrendingUp} iconColor="text-blue-600" />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-900">Grafik Pendapatan Bulanan</h3>
        <MonthlyRevenueChart data={series} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="font-semibold text-gray-900">Rincian per Bulan</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
              <th className="px-6 py-3 font-medium">Bulan</th>
              <th className="px-6 py-3 text-right font-medium">Transaksi</th>
              <th className="px-6 py-3 text-right font-medium">Pendapatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((m) => (
              <tr key={m.key} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">
                  {format(new Date(m.key + '-01'), 'MMMM yyyy', { locale: localeID })}
                </td>
                <td className="px-6 py-3 text-right text-gray-500">{countByMonth.get(m.key) ?? 0}</td>
                <td className="px-6 py-3 text-right font-semibold text-gray-900">{formatRupiah(m.revenue)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-100 bg-gray-50/60">
              <td className="px-6 py-3 font-bold text-gray-900">Total</td>
              <td className="px-6 py-3 text-right font-medium text-gray-500">{payments.length}</td>
              <td className="px-6 py-3 text-right font-bold text-teal-700">{formatRupiah(totalSetahun)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
