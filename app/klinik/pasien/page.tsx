import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { Users, Phone, FileSpreadsheet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { SearchBox } from '@/components/admin/search-box'
import ExcelDownloadLink from '@/components/ui/excel-download-link'
import { calculateAge, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Data Pasien — Admin' }

export default async function AdminPasienPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const ctx = await requireTenantUser(['admin', 'owner'])

  const db = createServiceClient()
  let query = db
    .from('patients')
    .select('*, bookings(count)')
    .eq('clinic_id', ctx.clinicId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(300)

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
  }

  const { data: patients } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Pasien</h1>
          <p className="text-sm text-gray-500 mt-1">{patients?.length ?? 0} pasien terdaftar</p>
        </div>
        <div className="flex items-center gap-2">
          <ExcelDownloadLink
            href="/api/klinik/pasien/export"
            className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-bold text-green-700 transition-colors hover:bg-green-100 disabled:opacity-60"
          >
            <FileSpreadsheet className="h-4 w-4" /> Download Excel
          </ExcelDownloadLink>
          <SearchBox placeholder="Cari nama / no. HP…" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {!patients || patients.length === 0 ? (
          <EmptyState icon={Users} title={q ? 'Pasien tidak ditemukan' : 'Belum ada pasien'} className="py-16" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3">Nama Pasien</th>
                  <th className="px-4 py-3">Kontak</th>
                  <th className="px-4 py-3">Usia / JK</th>
                  <th className="px-4 py-3">Diagnosis</th>
                  <th className="px-4 py-3">Sesi</th>
                  <th className="px-4 py-3">Terdaftar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {patients.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.full_name}</p>
                      {p.guardian_name && <p className="text-xs text-gray-400">Wali: {p.guardian_name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <Phone className="h-3.5 w-3.5 text-gray-400" /> {p.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.birth_date ? `${calculateAge(p.birth_date)} th` : '—'}
                      {p.gender && ` · ${p.gender === 'L' ? 'L' : 'P'}`}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{p.diagnosis ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="teal">{p.bookings?.[0]?.count ?? 0}x</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(p.created_at, 'd MMM yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
