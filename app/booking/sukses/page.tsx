import Link from 'next/link'
import { headers } from 'next/headers'
import { CheckCircle2, CalendarCheck, MessageCircle, Clock } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { toWaNumber } from '@/lib/site'
import { PaymentInfo } from '@/components/booking/payment-info'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Booking Berhasil' }

interface Props {
  searchParams: Promise<{ code?: string; klinik?: string }>
}

export default async function SuksesPage({ searchParams }: Props) {
  const { code, klinik } = await searchParams

  // Resolusi klinik (untuk info pembayaran komitmen fee): subdomain dari middleware,
  // fallback ?klinik=. Aman bila gagal — blok pembayaran sekadar tidak tampil.
  const hdrSub = (await headers()).get('x-clinic-subdomain')
  const subdomain = (hdrSub ?? klinik)?.trim().toLowerCase()
  const svc = createServiceClient()
  const { data: clinic } = subdomain
    ? await svc.from('clinics').select('*').eq('subdomain', subdomain).maybeSingle()
    : { data: null }

  const fee = Number((clinic as any)?.online_booking_fee ?? 0)
  let waNumber = ''
  if (clinic) {
    const { data: lpc } = await svc
      .from('landing_page_content')
      .select('contact_whatsapp')
      .eq('clinic_id', (clinic as any).id)
      .maybeSingle()
    waNumber = toWaNumber((lpc?.contact_whatsapp as string) || (clinic as any).phone_number)
  }

  return (
    <main className="flex min-h-screen flex-col bg-gray-50/60">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 animate-ping rounded-full bg-teal-200 opacity-40" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 shadow-lg shadow-teal-500/30">
            <CheckCircle2 className="h-11 w-11 text-white" strokeWidth={2} />
          </div>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Booking Berhasil! 🎉</h1>
        <p className="mt-3 max-w-md text-gray-600">
          Terima kasih. Booking Anda sudah kami terima dan akan segera diproses.
        </p>

        {code && (
          <div className="mt-6 w-full rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Kode Booking</p>
            <p className="mt-1 text-2xl font-extrabold tracking-wider text-teal-700">{code}</p>
            <p className="mt-2 text-xs text-gray-400">Simpan kode ini untuk pengecekan status booking.</p>
          </div>
        )}

        {/* Info pembayaran komitmen fee — hanya bila klinik mengenakan fee */}
        {fee > 0 && (
          <div className="mt-6 w-full text-left">
            <PaymentInfo
              fee={fee}
              bankName={(clinic as any)?.payment_bank ?? null}
              accountName={(clinic as any)?.payment_account_name ?? null}
              accountNumber={(clinic as any)?.payment_account_number ?? null}
              waNumber={waNumber}
              waText={`Halo, saya sudah booking${code ? ` dengan kode ${code}` : ''}. Berikut saya kirim bukti pembayaran komitmen fee.`}
            />
          </div>
        )}

        <div className="mt-6 w-full rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-gray-100">
          <p className="mb-3 text-sm font-bold text-gray-900">Langkah selanjutnya</p>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
              Admin klinik akan mengonfirmasi jam sesi sesuai jadwal yang Anda pilih.
            </li>
            <li className="flex gap-3">
              <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
              {fee > 0
                ? 'Transfer komitmen fee, lalu kirim bukti via tombol WhatsApp di atas.'
                : 'Anda akan dihubungi untuk konfirmasi jadwal & pembayaran.'}
            </li>
            <li className="flex gap-3">
              <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
              Datang ke klinik sesuai jadwal yang telah dikonfirmasi.
            </li>
          </ul>
        </div>

        <div className="mt-7 flex w-full">
          <Link
            href="/auth/login"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 px-6 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Masuk ke akun
          </Link>
        </div>
      </div>
    </main>
  )
}
