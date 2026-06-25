import { createServiceClient } from '@/lib/supabase/server'
import { apiTenant } from '@/lib/tenant/api'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Edit harga booking yang SUDAH dikonfirmasi (koreksi kurang/lebih bayar).
// Sinkron ke: bookings.amount, payments.amount, baris keuangan (arus kas &
// "Pendapatan Bulan Ini" di overview membaca tabel keuangan), dan invoices.
const schema = z.object({
  booking_id: z.string().uuid(),
  amount: z.number().positive().max(1_000_000_000),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }

    const auth = await apiTenant(['admin', 'owner'])
    if (!auth.ok) return auth.res

    const { booking_id, amount } = parsed.data
    const db = createServiceClient()

    const { data: booking } = await db
      .from('bookings')
      .select('id, clinic_id, payment_status, payment_method')
      .eq('id', booking_id)
      .eq('clinic_id', auth.clinicId)
      .single()
    if (!booking) {
      return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })
    }

    // Simpan harga baru pada booking.
    await db.from('bookings').update({ amount }).eq('id', booking_id).eq('clinic_id', auth.clinicId)

    // Ambil pembayaran terkait (paling baru). Bila sudah ada → perbarui pembayaran
    // + baris keuangan tertaut. Bila belum ada → buat (trigger DB membuat keuangan).
    const { data: payment } = await db
      .from('payments')
      .select('id')
      .eq('booking_id', booking_id)
      .eq('clinic_id', auth.clinicId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (payment) {
      await db.from('payments').update({ amount }).eq('id', payment.id).eq('clinic_id', auth.clinicId)
      // Baris keuangan auto dari pembayaran ini (tidak ikut ter-update oleh trigger insert).
      await db.from('keuangan').update({ jumlah: amount }).eq('payment_id', payment.id).eq('clinic_id', auth.clinicId)
    } else {
      await db.from('payments').insert({
        clinic_id: auth.clinicId,
        booking_id,
        amount,
        method: booking.payment_method ?? 'transfer',
        confirmed_by: auth.userId,
        confirmed_at: new Date().toISOString(),
      })
    }

    // Selaraskan invoice (bila ada) — tanpa diskon.
    await db
      .from('invoices')
      .update({ amount, total: amount })
      .eq('booking_id', booking_id)
      .eq('clinic_id', auth.clinicId)

    return NextResponse.json({ success: true, message: 'Harga diperbarui' })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
