import { createServiceClient } from '@/lib/supabase/server'
import { apiTenant } from '@/lib/tenant/api'
import { logMedicalAccess } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  booking_id: z.string().uuid(),
  note_id: z.string().uuid().optional(),
  home_program: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await apiTenant(['therapist', 'admin', 'owner'])
    if (!auth.ok) return auth.res

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })

    const db = createServiceClient()
    const { data: booking } = await db
      .from('bookings')
      .select('id, patient_id, therapist_id, clinic_id, therapist:therapists(user_id)')
      .eq('id', parsed.data.booking_id)
      .eq('clinic_id', auth.clinicId)
      .single()
    if (!booking) return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })

    if (auth.role === 'therapist' && (booking.therapist as any)?.user_id !== auth.userId) {
      return NextResponse.json({ error: 'Bukan pasien Anda' }, { status: 403 })
    }

    const value = parsed.data.home_program?.trim() || null

    if (parsed.data.note_id) {
      await db.from('session_notes')
        .update({ home_program: value, updated_at: new Date().toISOString() })
        .eq('id', parsed.data.note_id)
        .eq('booking_id', booking.id)
        .eq('clinic_id', auth.clinicId)
    } else {
      await db.from('session_notes').insert({
        clinic_id: auth.clinicId,
        booking_id: booking.id,
        therapist_id: booking.therapist_id,
        patient_id: booking.patient_id,
        home_program: value,
      })
    }

    await logMedicalAccess({
      actorUserId: auth.userId,
      actorRole: auth.role,
      clinicId: auth.clinicId,
      action: 'soap.update',
      entityType: 'session_note',
      entityId: parsed.data.note_id ?? null,
      patientId: booking.patient_id,
      metadata: { booking_id: booking.id, field: 'home_program' },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
