import { createServiceClient } from '@/lib/supabase/server'
import { apiTenant } from '@/lib/tenant/api'
import { isBookingConfirmed } from '@/lib/utils'
import { canTherapistHandleBooking } from '@/lib/disciplines'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({ booking_id: z.string().uuid() })

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }

    const auth = await apiTenant(['therapist', 'admin', 'owner'])
    if (!auth.ok) return auth.res

    const db = createServiceClient()

    const { data: booking } = await db
      .from('bookings')
      .select('id, clinic_id, status, payment_status, therapist_id, discipline, therapist:therapists(user_id, discipline)')
      .eq('id', parsed.data.booking_id)
      .eq('clinic_id', auth.clinicId)
      .single()
    if (!booking) return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })

    // Sesi yang belum dikonfirmasi pembayarannya tidak boleh diselesaikan.
    if (!isBookingConfirmed(booking.status, booking.payment_status)) {
      return NextResponse.json({ error: 'Booking belum dikonfirmasi admin/owner.' }, { status: 403 })
    }

    // Terapis PROFESI sama boleh menyelesaikan (fisio↔fisio, OT↔OT); lintas disiplin
    // ditolak. Booking belum di-assign tetap boleh. (Admin/owner bebas.)
    if (auth.role === 'therapist') {
      const { data: writer } = await db
        .from('therapists')
        .select('discipline')
        .eq('user_id', auth.userId)
        .eq('clinic_id', auth.clinicId)
        .single()
      const allowed = canTherapistHandleBooking({
        writerUserId: auth.userId,
        writerDiscipline: (writer as any)?.discipline,
        bookingTherapistUserId: (booking.therapist as any)?.user_id,
        bookingTherapistId: booking.therapist_id,
        bookingDiscipline: (booking as any).discipline,
      })
      if (!allowed) {
        return NextResponse.json({ error: 'Booking ini milik layanan lain.' }, { status: 403 })
      }
    }

    await db
      .from('bookings')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', booking.id)
      .eq('clinic_id', auth.clinicId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
