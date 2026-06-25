import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { loadKeuanganRows } from '@/lib/keuangan'
import { PageHero, DownloadExcelButton, TabDataKeuangan, MigrasiBelumJalan } from '@/components/owner/keuangan/shared'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Arus Kas — Owner' }

export default async function ArusKasPage() {
  const ctx = await requireTenantUser(['owner'])
  const db = createServiceClient()
  const { rows, missing } = await loadKeuanganRows(db, ctx.clinicId)

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHero icon="wallet" title="Arus Kas" subtitle="Semua transaksi masuk & keluar dengan saldo berjalan otomatis">
        <DownloadExcelButton />
      </PageHero>
      {missing ? <MigrasiBelumJalan /> : <TabDataKeuangan rows={rows} />}
    </div>
  )
}
