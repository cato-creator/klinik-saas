import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { apiTenant } from '@/lib/tenant/api'

const SELECT = 'id, tanggal, keterangan, akun, jenis, payment, jumlah, is_auto, created_at'

function parseBody(body: Record<string, unknown>) {
  const tanggal = String(body.tanggal ?? '')
  const keterangan = String(body.keterangan ?? '').trim()
  const jenis = String(body.jenis ?? '')
  const payment = String(body.payment ?? 'non_tunai')
  const jumlah = Number(body.jumlah)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { error: 'Tanggal tidak valid' }
  if (!keterangan) return { error: 'Keterangan wajib diisi' }
  if (!['masuk', 'keluar'].includes(jenis)) return { error: 'Jenis tidak valid' }
  if (!['tunai', 'non_tunai'].includes(payment)) return { error: 'Metode pembayaran tidak valid' }
  if (!Number.isFinite(jumlah) || jumlah <= 0) return { error: 'Jumlah harus lebih dari 0' }
  // Akun/kategori tidak lagi dipilih owner. Hormati nilai lama yang dikirim (edit),
  // jika kosong default ke "Lain-Lain" sesuai jenis agar tetap terhitung di Laba Rugi.
  const akun = String(body.akun ?? '').trim() || (jenis === 'masuk' ? 'Pendapatan Lain-Lain' : 'Beban Lain-Lain')
  return { value: { tanggal, keterangan, akun, jenis, payment, jumlah } }
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
    .from('keuangan')
    .insert({ clinic_id: auth.clinicId, ...parsed.value, is_auto: false })
    .select(SELECT)
    .single()
  if (error) return NextResponse.json({ error: 'Gagal menyimpan transaksi' }, { status: 500 })
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
  const { data: existing } = await db.from('keuangan').select('id').eq('id', id).eq('clinic_id', auth.clinicId).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })

  const { data, error } = await db
    .from('keuangan')
    .update(parsed.value)
    .eq('id', id)
    .eq('clinic_id', auth.clinicId)
    .select(SELECT)
    .single()
  if (error) return NextResponse.json({ error: 'Gagal mengubah transaksi' }, { status: 500 })
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
  const { error } = await db.from('keuangan').delete().eq('id', id).eq('clinic_id', auth.clinicId)
  if (error) return NextResponse.json({ error: 'Gagal menghapus transaksi' }, { status: 500 })
  return NextResponse.json({ success: true })
}
