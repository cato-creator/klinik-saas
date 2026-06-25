import { createServiceClient } from '@/lib/supabase/server'
import { apiTenant } from '@/lib/tenant/api'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Admin/owner menjadwalkan ulang sesi pasien (mis. pasien minta ganti jadwal).
// Tanggal wajib; jam opsional ('' → '00:00' = belum dijadwalkan). Catatan tersimpan
// di notes_admin. Booking yang sudah selesai/batal tidak boleh dijadwalkan ulang.
const schema = z.object({
  booking_id: z.string().uuid(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  session_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }

    const auth = await apiTenant(['admin', 'owner'])
    if (!auth.ok) return auth.res

    const { booking_id, session_date, session_time, notes } = parsed.data
    const db = createServiceClient()

    // Pastikan booking milik klinik ini & masih bisa dijadwalkan ulang.
    const { data: booking } = await db
      .from('bookings')
      .select('id, status')
      .eq('id', booking_id)
      .eq('clinic_id', auth.clinicId)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })
    }
    if (['completed', 'cancelled'].includes(booking.status)) {
      return NextResponse.json({ error: 'Booking yang sudah selesai/dibatalkan tidak bisa dijadwalkan ulang.' }, { status: 409 })
    }

    const { error } = await db
      .from('bookings')
      .update({
        session_date,
        session_time: (session_time || '00:00') + ':00',
        notes_admin: notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .eq('clinic_id', auth.clinicId)

    if (error) {
      // 23P01 = exclusion constraint (slot terapis bentrok di jam yang sama).
      if (error.code === '23P01') {
        return NextResponse.json({ error: 'Jadwal baru bentrok dengan booking lain pada terapis & jam yang sama.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Gagal menjadwalkan ulang' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Jadwal diperbarui' })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
