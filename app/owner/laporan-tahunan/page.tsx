import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { loadKeuanganRows } from '@/lib/keuangan'
import { PageHero, DownloadExcelButton, TabDashboardTahunan, MigrasiBelumJalan } from '@/components/owner/keuangan/shared'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Laporan Tahunan — Owner' }

export default async function LaporanTahunanPage() {
  const ctx = await requireTenantUser(['owner'])
  const db = createServiceClient()
  const { rows, missing } = await loadKeuanganRows(db, ctx.clinicId)

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHero icon="chart" title="Laporan Tahunan" subtitle="Ringkasan pendapatan, beban & laba sepanjang tahun">
        <DownloadExcelButton />
      </PageHero>
      {missing ? <MigrasiBelumJalan /> : <TabDashboardTahunan rows={rows} />}
    </div>
  )
}
