import { notFound, redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { isBookingConfirmed } from '@/lib/utils'
import { canTherapistHandleBooking } from '@/lib/disciplines'
import { PatientCaseView } from '@/components/terapis/patient-case-view'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Catatan Sesi — Terapis' }

export default async function CatatanPage({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const { bookingId } = await params

  const ctx = await requireTenantUser(['therapist', 'admin', 'owner'])

  const db = createServiceClient()
  const { data: booking } = await db
    .from('bookings')
    .select('patient_id, therapist_id, status, payment_status, discipline, therapist:therapists(user_id, discipline)')
    .eq('id', bookingId)
    .eq('clinic_id', ctx.clinicId)
    .single()
  if (!booking) notFound()

  // Aturan: setelah booking DIKONFIRMASI admin/owner, terapis bisa mengisi catatan.
  // Terapis PROFESI yang sama saling bantu (fisio↔fisio, OT↔OT) — lihat
  // canTherapistHandleBooking. LINTAS disiplin → ditolak (kembali ke antrian).
  // Booking belum di-assign & SUDAH dikonfirmasi → DIKLAIM oleh terapis ini.
  if (ctx.role === 'therapist') {
    const { data: writer } = await db
      .from('therapists')
      .select('id, discipline')
      .eq('user_id', ctx.userId)
      .eq('clinic_id', ctx.clinicId)
      .single()

    const allowed = canTherapistHandleBooking({
      writerUserId: ctx.userId,
      writerDiscipline: (writer as any)?.discipline,
      bookingTherapistUserId: (booking.therapist as any)?.user_id,
      bookingTherapistId: booking.therapist_id,
      bookingDiscipline: (booking as any).discipline,
    })
    if (!allowed) {
      redirect('/terapis/dashboard')
    }

    if (!booking.therapist_id && writer && isBookingConfirmed(booking.status, booking.payment_status)) {
      // `.is('therapist_id', null)` → aman bila ada terapis lain klaim bersamaan.
      await db
        .from('bookings')
        .update({ therapist_id: writer.id })
        .eq('id', bookingId)
        .eq('clinic_id', ctx.clinicId)
        .is('therapist_id', null)
    }
  }

  return (
    <PatientCaseView
      patientId={booking.patient_id}
      role={ctx.role}
      userId={ctx.userId}
      clinicId={ctx.clinicId}
      focusBookingId={bookingId}
      initialTab="cppt"
      backHref="/terapis/dashboard"
      backLabel="Kembali ke antrian"
    />
  )
}
