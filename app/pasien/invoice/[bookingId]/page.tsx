import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { InvoiceView, type InvoiceData } from '@/components/pasien/invoice-view'
import { generateInvoiceNumber } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Invoice — Pasien' }

export default async function InvoicePage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params

  const ctx = await requireTenantUser(['patient', 'admin', 'owner'])
  const isStaff = ['admin', 'owner'].includes(ctx.role)

  const db = createServiceClient()
  const { data: booking } = await db
    .from('bookings')
    .select('*, patient:patients(full_name, user_id), service_type:service_types(name), therapist:therapists(profile:users(full_name))')
    .eq('id', bookingId)
    .eq('clinic_id', ctx.clinicId)
    .single()

  if (!booking) notFound()

  // Pasien hanya boleh melihat invoice miliknya (staff bebas).
  if (!isStaff && (booking.patient as any)?.user_id !== ctx.userId) {
    redirect('/pasien/dashboard')
  }

  const [{ data: invoice }, { data: clinic }] = await Promise.all([
    db.from('invoices').select('invoice_number, amount, discount, total, paid_at').eq('booking_id', bookingId).maybeSingle(),
    db.from('clinics').select('name, address, phone_number').eq('id', ctx.clinicId).single(),
  ])

  const inv: InvoiceData = {
    invoiceNumber: invoice?.invoice_number ?? generateInvoiceNumber(new Date(booking.created_at)),
    bookingCode: booking.booking_code,
    patientName: (booking.patient as any)?.full_name ?? 'Pasien',
    serviceName: (booking.service_type as any)?.name ?? 'Layanan',
    therapistName: (booking.therapist as any)?.profile?.full_name ?? 'Terapis',
    sessionDate: booking.session_date,
    amount: invoice?.amount ?? booking.amount,
    discount: invoice?.discount ?? 0,
    total: invoice?.total ?? booking.amount,
    paymentStatus: booking.payment_status,
    paymentMethod: booking.payment_method,
    paidAt: invoice?.paid_at ?? null,
    clinicName: clinic?.name ?? 'Klinik',
    clinicAddress: clinic?.address ?? '-',
    clinicPhone: clinic?.phone_number ?? '-',
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/pasien/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-teal-600">
        <ArrowLeft className="h-4 w-4" /> Kembali ke dashboard
      </Link>
      <InvoiceView inv={inv} />
    </div>
  )
}
