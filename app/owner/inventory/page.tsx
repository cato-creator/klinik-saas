import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { InventoryTable, type InventoryItem } from '@/components/owner/inventory'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Barang Habis Pakai — Owner' }

export default async function InventoryPage() {
  const ctx = await requireTenantUser(['owner'])
  const db = createServiceClient()

  const { data, error } = await db
    .from('inventory_items')
    .select('id, name, quantity, unit, unit_price, total_cost, payment, purchased_at, notes, created_at')
    .eq('clinic_id', ctx.clinicId)
    .order('purchased_at', { ascending: false })
    .order('created_at', { ascending: false })

  // Tabel belum ada → migrasi 0014 belum dijalankan.
  const missing = !!error && /relation .* does not exist|could not find the table|schema cache/i.test(error.message)

  const items: InventoryItem[] = (data ?? []).map((r) => ({
    id: r.id as string,
    name: (r.name as string) ?? '',
    quantity: Number(r.quantity ?? 0),
    unit: (r.unit as string) ?? null,
    unit_price: Number(r.unit_price ?? 0),
    total_cost: Number(r.total_cost ?? 0),
    payment: (r.payment as string) ?? 'non_tunai',
    purchased_at: (r.purchased_at as string) ?? '',
    notes: (r.notes as string) ?? null,
    created_at: (r.created_at as string) ?? '',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Barang Habis Pakai</h1>
        <p className="mt-1 text-sm text-gray-500">Catat pembelian barang habis pakai — otomatis masuk sebagai pengeluaran di Arus Kas.</p>
      </div>
      <InventoryTable items={items} missing={missing} />
    </div>
  )
}
