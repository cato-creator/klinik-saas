import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { loadKeuanganRows } from '@/lib/keuangan'
import { PageHero, DownloadExcelButton, TabLaporanLaba, MigrasiBelumJalan } from '@/components/owner/keuangan/shared'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Laba Rugi — Owner' }

export default async function LabaRugiPage() {
  const ctx = await requireTenantUser(['owner'])
  const db = createServiceClient()
  const { rows, missing } = await loadKeuanganRows(db, ctx.clinicId)

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHero icon="trending" title="Laba Rugi" subtitle="Pendapatan, beban, dan laba/rugi usaha per bulan">
        <DownloadExcelButton />
      </PageHero>
      {missing ? <MigrasiBelumJalan /> : <TabLaporanLaba rows={rows} />}
    </div>
  )
}
