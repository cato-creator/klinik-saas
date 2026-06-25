import Link from 'next/link'
import { headers } from 'next/headers'
import { AlertCircle } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { toWaNumber } from '@/lib/site'
import { BookingFlow } from '@/components/booking/booking-flow'
import type { Therapist } from '@/types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Booking Sesi Terapi',
  description: 'Jadwalkan sesi terapi Anda — pilih tanggal dan isi data Anda.',
}

interface PageProps {
  // ?klinik=<subdomain> menentukan klinik tujuan booking.
  searchParams: Promise<{ therapist?: string; klinik?: string }>
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen flex-col bg-gray-50/60">{children}</main>
}

export default async function BookingPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const svc = createServiceClient()

  // Resolusi klinik: utamakan subdomain (header dari middleware), fallback ?klinik=.
  const hdrSub = (await headers()).get('x-clinic-subdomain')
  const subdomain = (hdrSub ?? sp.klinik)?.trim().toLowerCase()
  // select('*') agar aman bila migrasi 0016 (kolom rekening) belum dijalankan.
  const { data: clinic } = subdomain
    ? await svc
        .from('clinics')
        .select('*')
        .eq('subdomain', subdomain)
        .maybeSingle()
    : { data: null }

  if (!clinic) {
    return (
      <Shell>
        <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-20 text-center">
          <AlertCircle className="h-10 w-10 text-amber-500" />
          <h1 className="text-xl font-bold text-gray-900">Klinik tidak ditemukan</h1>
          <p className="text-sm text-gray-500">
            Pastikan tautan booking benar (mis. <code>/booking?klinik=nama-klinik</code>).
          </p>
        </div>
      </Shell>
    )
  }

  if (clinic.status === 'expired' || clinic.status !== 'active') {
    return (
      <Shell>
        <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-20 text-center">
          <AlertCircle className="h-10 w-10 text-amber-500" />
          <h1 className="text-xl font-bold text-gray-900">Booking online sedang tidak tersedia</h1>
          <p className="text-sm text-gray-500">
            Silakan hubungi {clinic.name} langsung untuk menjadwalkan sesi.
          </p>
        </div>
      </Shell>
    )
  }

  const { data: therapistsData } = await svc
    .from('therapists')
    .select('*, profile:users(full_name)')
    .eq('clinic_id', clinic.id)
    .eq('is_active', true)

  // Prefill bila pasien sudah login.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let initialPatient = { full_name: '', phone: '' }
  let profileId: string | undefined
  if (user) {
    profileId = user.id
    const { data: profile } = await supabase
      .from('users')
      .select('full_name, phone_number')
      .eq('id', user.id)
      .maybeSingle()
    if (profile) {
      initialPatient = { full_name: profile.full_name ?? '', phone: profile.phone_number ?? '' }
    }
  }

  const therapists = (therapistsData ?? []) as Therapist[]

  // Nomor WA klinik untuk "kirim bukti pembayaran" (utamakan kontak WA landing).
  const { data: lpc } = await svc
    .from('landing_page_content')
    .select('contact_whatsapp')
    .eq('clinic_id', clinic.id)
    .maybeSingle()
  const waNumber = toWaNumber((lpc?.contact_whatsapp as string) || (clinic as any).phone_number)

  return (
    <Shell>
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white">
              {clinic.name?.[0]?.toUpperCase() ?? 'K'}
            </div>
            <span className="text-[15px] font-extrabold tracking-tight text-gray-900">{clinic.name}</span>
          </div>
          <Link href="/auth/login" className="text-sm font-semibold text-gray-600 hover:text-teal-600">
            Masuk
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 md:py-14">
        <BookingFlow
          therapists={therapists}
          clinicId={clinic.id}
          clinicName={clinic.name}
          clinicSpecializations={
            ((clinic as any).specializations as string[] | null)?.length
              ? ((clinic as any).specializations as string[])
              : clinic.clinic_type ? [clinic.clinic_type] : []
          }
          bookingFee={Number(clinic.online_booking_fee ?? 0)}
          bankName={(clinic as any).payment_bank ?? null}
          accountName={(clinic as any).payment_account_name ?? null}
          accountNumber={(clinic as any).payment_account_number ?? null}
          waNumber={waNumber}
          initialTherapistId={sp.therapist}
          initialPatient={initialPatient}
          profileId={profileId}
        />
      </div>
    </Shell>
  )
}
