import { createServiceClient } from '@/lib/supabase/server'
import { apiTenant } from '@/lib/tenant/api'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  booking_id: z.string().uuid(),
  payment_method: z.enum(['qris', 'transfer', 'cash', 'bpjs']),
  amount: z.number().positive().max(1_000_000_000),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }

    const auth = await apiTenant(['admin', 'owner'])
    if (!auth.ok) return auth.res

    const { booking_id, payment_method, amount, notes } = parsed.data

    const db = createServiceClient()

    // Ambil booking (pastikan milik klinik ini).
    const { data: booking } = await db
      .from('bookings')
      .select('id, amount, patient_id, clinic_id')
      .eq('id', booking_id)
      .eq('clinic_id', auth.clinicId)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })
    }

    // Update booking — simpan harga yang diinput admin/owner saat konfirmasi.
    await db
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        payment_method,
        amount,
      })
      .eq('id', booking_id)
      .eq('clinic_id', auth.clinicId)

    // Insert ke payments — trigger DB membuat baris keuangan (pemasukan) otomatis.
    await db.from('payments').insert({
      clinic_id: auth.clinicId,
      booking_id,
      amount,
      method: payment_method,
      confirmed_by: auth.userId,
      confirmed_at: new Date().toISOString(),
      notes: notes ?? null,
    })

    // Generate nomor invoice
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const rand = Math.floor(Math.random() * 9000) + 1000
    const invoiceNumber = `INV/${year}/${month}/${rand}`

    // Insert invoice
    await db.from('invoices').insert({
      clinic_id: auth.clinicId,
      invoice_number: invoiceNumber,
      booking_id,
      patient_id: booking.patient_id,
      amount,
      discount: 0,
      total: amount,
      paid_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, message: 'Pembayaran dikonfirmasi' })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
