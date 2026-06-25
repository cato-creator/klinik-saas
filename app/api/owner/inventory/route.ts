import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { apiTenant } from '@/lib/tenant/api'

// Pengeluaran ke buku kas (keuangan) dibuat OTOMATIS oleh trigger DB
// `sync_inventory_to_keuangan` — route ini cukup CRUD inventory_items.
const SELECT = 'id, name, quantity, unit, unit_price, total_cost, payment, purchased_at, notes, created_at'

function parseBody(body: Record<string, unknown>) {
  const name = String(body.name ?? '').trim()
  const quantity = Number(body.quantity)
  const unit = String(body.unit ?? '').trim() || null
  const unitPrice = Number(body.unit_price)
  const payment = String(body.payment ?? 'non_tunai')
  const purchasedAt = String(body.purchased_at ?? '')
  const notes = String(body.notes ?? '').trim() || null

  if (!name) return { error: 'Nama barang wajib diisi' }
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: 'Jumlah harus lebih dari 0' }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return { error: 'Harga satuan tidak valid' }
  if (!['tunai', 'non_tunai'].includes(payment)) return { error: 'Metode pembayaran tidak valid' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(purchasedAt)) return { error: 'Tanggal tidak valid' }

  const totalCost = Math.round(quantity * unitPrice * 100) / 100
  if (!(totalCost > 0)) return { error: 'Total biaya harus lebih dari 0' }

  return {
    value: { name, quantity, unit, unit_price: unitPrice, total_cost: totalCost, payment, purchased_at: purchasedAt, notes },
  }
}

export async function POST(request: NextRequest) {
  const auth = await apiTenant(['owner'])
  if (!auth.ok) return auth.res

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 }) }
  const parsed = parseBody(body)
  if (parsed.error || !parsed.value) return NextResponse.json({ error: parsed.error ?? 'Data tidak valid' }, { status: 400 })

  const db = createServiceClient()
  const { data, error } = await db
    .from('inventory_items')
    .insert({ clinic_id: auth.clinicId, ...parsed.value })
    .select(SELECT)
    .single()
  if (error) return NextResponse.json({ error: 'Gagal menyimpan barang' }, { status: 500 })
  return NextResponse.json({ success: true, row: data })
}

export async function PATCH(request: NextRequest) {
  const auth = await apiTenant(['owner'])
  if (!auth.ok) return auth.res

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 }) }
  const id = body.id ? String(body.id) : ''
  if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })
  const parsed = parseBody(body)
  if (parsed.error || !parsed.value) return NextResponse.json({ error: parsed.error ?? 'Data tidak valid' }, { status: 400 })

  const db = createServiceClient()
  // Pastikan baris milik klinik ini (service role lepas RLS → filter manual wajib).
  const { data: existing } = await db.from('inventory_items').select('id').eq('id', id).eq('clinic_id', auth.clinicId).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Barang tidak ditemukan' }, { status: 404 })

  const { data, error } = await db
    .from('inventory_items')
    .update(parsed.value)
    .eq('id', id)
    .eq('clinic_id', auth.clinicId)
    .select(SELECT)
    .single()
  if (error) return NextResponse.json({ error: 'Gagal mengubah barang' }, { status: 500 })
  return NextResponse.json({ success: true, row: data })
}

export async function DELETE(request: NextRequest) {
  const auth = await apiTenant(['owner'])
  if (!auth.ok) return auth.res

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 }) }
  const id = body.id ? String(body.id) : ''
  if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

  const db = createServiceClient()
  // Hapus pembelian → baris keuangan tertaut ikut terhapus (FK on delete cascade).
  const { error } = await db.from('inventory_items').delete().eq('id', id).eq('clinic_id', auth.clinicId)
  if (error) return NextResponse.json({ error: 'Gagal menghapus barang' }, { status: 500 })
  return NextResponse.json({ success: true })
}
