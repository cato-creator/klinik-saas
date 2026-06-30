// ============================================================
// Tindakan/modalitas yang dikerjakan pada SATU kunjungan (booking).
// Kartu chip "Tindakan Terapi" di sidebar SOAP. Disimpan ke bookings.modalities.
// Aturan akses sama dengan pengisian SOAP (note route): terapis profesi sama
// boleh saling mengisi; lintas disiplin ditolak; admin/owner bebas.
// ============================================================
import { createServiceClient } from '@/lib/supabase/server'
import { apiTenant } from '@/lib/tenant/api'
import { isBookingConfirmed } from '@/lib/utils'
import { canTherapistHandleBooking } from '@/lib/disciplines'
import { logMedicalAccess } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  booking_id: z.string().uuid(),
  modalities: z.array(z.string().trim().min(1).max(60)).max(40),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })

    const auth = await apiTenant(['therapist', 'admin', 'owner'])
    if (!auth.ok) return auth.res

    const db = createServiceClient()
    const { data: booking } = await db
      .from('bookings')
      .select('id, patient_id, therapist_id, clinic_id, status, payment_status, discipline, therapist:therapists(user_id, discipline)')
      .eq('id', parsed.data.booking_id)
      .eq('clinic_id', auth.clinicId)
      .single()
    if (!booking) return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })

    if (!isBookingConfirmed(booking.status, (booking as any).payment_status)) {
      return NextResponse.json({ error: 'Booking belum dikonfirmasi admin/owner.' }, { status: 403 })
    }

    if (auth.role === 'therapist') {
      const { data: writer } = await db
        .from('therapists')
        .select('id, discipline')
        .eq('user_id', auth.userId)
        .eq('clinic_id', auth.clinicId)
        .single()
      const ok = canTherapistHandleBooking({
        writerUserId: auth.userId,
        writerDiscipline: (writer as any)?.discipline ?? null,
        bookingTherapistUserId: (booking.therapist as any)?.user_id,
        bookingTherapistId: booking.therapist_id,
        bookingDiscipline: (booking as any).discipline,
      })
      if (!ok) return NextResponse.json({ error: 'Booking ini milik layanan lain.' }, { status: 403 })
    }

    // Normalisasi: buang duplikat & nilai kosong, jaga urutan.
    const seen = new Set<string>()
    const modalities = parsed.data.modalities
      .map((m) => m.trim())
      .filter((m) => m && !seen.has(m) && (seen.add(m), true))

    const { error } = await db
      .from('bookings')
      .update({ modalities })
      .eq('id', booking.id)
      .eq('clinic_id', auth.clinicId)
    if (error) return NextResponse.json({ error: 'Gagal menyimpan tindakan' }, { status: 500 })

    await logMedicalAccess({
      actorUserId: auth.userId,
      actorRole: auth.role,
      clinicId: auth.clinicId,
      action: 'soap.update',
      entityType: 'booking',
      entityId: booking.id,
      patientId: booking.patient_id,
      metadata: { field: 'modalities', count: modalities.length },
    })

    return NextResponse.json({ success: true, modalities })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
