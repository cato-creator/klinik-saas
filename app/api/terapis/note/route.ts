import { createServiceClient } from '@/lib/supabase/server'
import { apiTenant } from '@/lib/tenant/api'
import { isBookingConfirmed } from '@/lib/utils'
import { canTherapistHandleBooking } from '@/lib/disciplines'
import { logMedicalAccess } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  booking_id: z.string().uuid(),
  note_id: z.string().uuid().optional(),
  // Admin/owner: terapis yang dipilih untuk ditugaskan ke booking yang belum ber-terapis.
  therapist_id: z.string().uuid().optional(),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  home_program: z.string().optional(),
  next_session: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  complete: z.boolean().optional(),
})

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
      .select('id, patient_id, therapist_id, clinic_id, status, payment_status, discipline, therapist:therapists(user_id, discipline)')
      .eq('id', parsed.data.booking_id)
      .eq('clinic_id', auth.clinicId)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })
    }

    // Booking yang belum diterima/dikonfirmasi admin/owner (masih 'pending') atau
    // dibatalkan tidak boleh diisi catatan. Pembayaran bukan syarat (lihat
    // isBookingConfirmed) — pasien manual/jadwalkan ulang bisa diisi sebelum bayar.
    if (!isBookingConfirmed(booking.status, booking.payment_status)) {
      return NextResponse.json(
        { error: 'Booking belum dikonfirmasi admin/owner.' },
        { status: 403 },
      )
    }

    // Terapis penulis (bila peran terapis). Catatan diatribusikan ke PENULIS asli,
    // bukan terapis yang ditugaskan — agar jelas siapa yang benar-benar mengisi.
    let writerTherapistId: string | null = null
    let writerDiscipline: string | null = null
    if (auth.role === 'therapist') {
      const { data: writer } = await db
        .from('therapists')
        .select('id, discipline')
        .eq('user_id', auth.userId)
        .eq('clinic_id', auth.clinicId)
        .single()
      writerTherapistId = writer?.id ?? null
      writerDiscipline = (writer as any)?.discipline ?? null
    }

    // Aturan akses: terapis PROFESI sama boleh saling mengisi (fisio↔fisio, OT↔OT);
    // lintas disiplin DITOLAK. (Admin/owner bebas.)
    if (
      auth.role === 'therapist' &&
      !canTherapistHandleBooking({
        writerUserId: auth.userId,
        writerDiscipline,
        bookingTherapistUserId: (booking.therapist as any)?.user_id,
        bookingTherapistId: booking.therapist_id,
        bookingDiscipline: (booking as any).discipline,
      })
    ) {
      return NextResponse.json({ error: 'Catatan ini milik layanan lain.' }, { status: 403 })
    }

    // session_notes.therapist_id WAJIB terisi (NOT NULL).
    //  - Terapis  → catatan diatribusikan ke dirinya (penulis asli).
    //  - Admin/owner → pakai terapis yang ditugaskan ke booking.
    let effectiveTherapistId = auth.role === 'therapist' ? writerTherapistId : (booking.therapist_id as string | null)

    // Admin/owner: bila booking belum punya terapis, mereka memilih terapis di form.
    // Validasi terapis itu milik klinik ini, lalu tugaskan ke booking (hanya bila
    // masih null — aman terhadap balapan).
    if (!effectiveTherapistId && auth.role !== 'therapist' && parsed.data.therapist_id) {
      const { data: chosen } = await db
        .from('therapists')
        .select('id')
        .eq('id', parsed.data.therapist_id)
        .eq('clinic_id', auth.clinicId)
        .single()
      if (chosen) {
        effectiveTherapistId = chosen.id
        await db
          .from('bookings')
          .update({ therapist_id: chosen.id })
          .eq('id', booking.id)
          .eq('clinic_id', auth.clinicId)
          .is('therapist_id', null)
      }
    }

    if (!effectiveTherapistId) {
      return NextResponse.json({ error: 'Tetapkan terapis untuk booking ini terlebih dahulu.' }, { status: 400 })
    }
    // Klaim booking yang belum di-assign agar muncul di jadwal terapis penulis.
    if (!booking.therapist_id && auth.role === 'therapist' && writerTherapistId) {
      await db
        .from('bookings')
        .update({ therapist_id: writerTherapistId })
        .eq('id', booking.id)
        .eq('clinic_id', auth.clinicId)
        .is('therapist_id', null)
    }

    const payload = {
      clinic_id: auth.clinicId,
      booking_id: booking.id,
      therapist_id: effectiveTherapistId,
      patient_id: booking.patient_id,
      subjective: parsed.data.subjective || null,
      objective: parsed.data.objective || null,
      assessment: parsed.data.assessment || null,
      plan: parsed.data.plan || null,
      home_program: parsed.data.home_program || null,
      next_session: parsed.data.next_session || null,
      updated_at: new Date().toISOString(),
    }

    if (parsed.data.note_id) {
      await db.from('session_notes').update(payload).eq('id', parsed.data.note_id).eq('booking_id', booking.id).eq('clinic_id', auth.clinicId)
    } else {
      await db.from('session_notes').insert(payload)
    }

    if (parsed.data.complete) {
      await db
        .from('bookings')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', booking.id)
        .eq('clinic_id', auth.clinicId)
    }

    // Audit ubah rekam medis (tanpa isi S/O/A/P — hanya jejak siapa & pasien mana).
    await logMedicalAccess({
      actorUserId: auth.userId,
      actorRole: auth.role,
      clinicId: auth.clinicId,
      action: 'soap.update',
      entityType: 'session_note',
      entityId: parsed.data.note_id ?? null,
      patientId: booking.patient_id,
      metadata: { booking_id: booking.id, completed: !!parsed.data.complete },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await apiTenant(['therapist', 'admin', 'owner'])
    if (!auth.ok) return auth.res

    const { id } = await request.json()
    if (typeof id !== 'string') return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })

    const db = createServiceClient()
    // SOFT DELETE (retensi data medis §9.1) — jangan hard-delete.
    const { data: note } = await db
      .from('session_notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('clinic_id', auth.clinicId)
      .is('deleted_at', null)
      .select('id, patient_id')
      .maybeSingle()

    if (note) {
      await logMedicalAccess({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clinicId: auth.clinicId,
        action: 'soap.delete',
        entityType: 'session_note',
        entityId: note.id,
        patientId: note.patient_id,
      })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
