import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { format, startOfMonth, subMonths } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { DollarSign, Receipt } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PaymentMethodPie } from '@/components/owner/charts'
import { formatRupiah, getPaymentMethodLabel } from '@/lib/utils'
import { fetchPayments, revenueByMethod } from '@/lib/reports'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Arus Kas — Owner' }

const methodVariant: Record<string, any> = { qris: 'purple', transfer: 'blue', cash: 'green', bpjs: 'teal' }

export default async function PendapatanPage() {
  const ctx = await requireTenantUser(['owner'])

  const db = createServiceClient()
  const now = new Date()
  const from = startOfMonth(subMonths(now, 2)) // 3 bulan transaksi
  const payments = await fetchPayments(db, ctx.clinicId, from.toISOString())

  const monthStartISO = startOfMonth(now).toISOString()
  const totalBulanIni = payments.filter((p) => p.confirmedAt >= monthStartISO).reduce((s, p) => s + p.amount, 0)
  const total3Bulan = payments.reduce((s, p) => s + p.amount, 0)
  const pie = revenueByMethod(payments)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Arus Kas & Transaksi</h1>
        <p className="mt-1 text-sm text-gray-500">Riwayat pembayaran yang masuk (3 bulan terakhir).</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Masuk Bulan Ini" value={formatRupiah(totalBulanIni)} icon={DollarSign} iconColor="text-green-600" />
        <StatCard title="Total 3 Bulan" value={formatRupiah(total3Bulan)} icon={Receipt} iconColor="text-teal-600" />
        <StatCard title="Jumlah Transaksi" value={payments.length} icon={Receipt} iconColor="text-blue-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Komposisi Metode</h3>
          {pie.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">Belum ada transaksi.</p>
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

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="font-semibold text-gray-900">Transaksi Terbaru</h3>
          </div>
          {payments.length === 0 ? (
            <EmptyState icon={Receipt} title="Belum ada transaksi" className="py-12" />
          ) : (
            <div className="divide-y divide-gray-50">
              {payments.slice(0, 50).map((p, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{p.patientName}</p>
                    <p className="text-xs text-gray-500">
                      {p.serviceName} · {p.therapistName}
                      {p.confirmedAt && ` · ${format(new Date(p.confirmedAt), 'd MMM yyyy', { locale: localeID })}`}
                    </p>
                  </div>
                  <Badge variant={methodVariant[p.method] ?? 'gray'}>{getPaymentMethodLabel(p.method)}</Badge>
                  <span className="w-28 text-right text-sm font-semibold text-gray-900">{formatRupiah(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
