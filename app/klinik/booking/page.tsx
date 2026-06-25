import Link from 'next/link'
import { Plus, CalendarDays } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { BookingTable } from '@/components/admin/booking-table'
import { cn, todayJakarta } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Semua Booking — Admin' }

const FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'perlu_konfirmasi', label: 'Perlu Konfirmasi' },
  { key: 'dikonfirmasi', label: 'Dikonfirmasi' },
  { key: 'completed', label: 'Selesai' },
  { key: 'cancelled', label: 'Dibatalkan' },
]

// Bangun querystring filter sambil mempertahankan parameter lain.
function filterHref(status: string, today: boolean): string {
  const params = new URLSearchParams()
  if (status !== 'all') params.set('status', status)
  if (today) params.set('today', '1')
  const qs = params.toString()
  return qs ? `/klinik/booking?${qs}` : '/klinik/booking'
}

const DAY_LABEL: Record<string, string> = {
  mon: 'Senin', tue: 'Selasa', wed: 'Rabu', thu: 'Kamis', fri: 'Jumat', sat: 'Sabtu', sun: 'Minggu',
}
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function formatHours(h: Record<string, string> | null | undefined): string {
  if (!h) return ''
  return DAY_ORDER.filter((d) => h[d]).map((d) => `${DAY_LABEL[d]}: ${h[d]}`).join('\n')
}

export default async function AdminBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; today?: string }>
}) {
  const { status = 'all', today: todayParam } = await searchParams
  const onlyToday = todayParam === '1'
  const ctx = await requireTenantUser(['admin', 'owner'])

  const db = createServiceClient()
  let query = db
    .from('bookings')
    .select('*, patient:patients(full_name, phone, medical_record_no), service_type:service_types(name), therapist:therapists(profile:users(full_name))')
    .eq('clinic_id', ctx.clinicId)
    .order('session_date', { ascending: false })
    .order('session_time', { ascending: false })
    .limit(200)

  // Filter status berbasis pembayaran (konsisten dengan label yang ditampilkan):
  // "Perlu Konfirmasi" = belum dibayar (termasuk booking manual yang auto-confirmed
  // tapi belum dibayar), "Dikonfirmasi" = sudah dibayar & belum selesai.
  if (status === 'perlu_konfirmasi') {
    query = query.eq('payment_status', 'unpaid').neq('status', 'cancelled').neq('status', 'completed')
  } else if (status === 'dikonfirmasi') {
    query = query.eq('payment_status', 'paid').eq('status', 'confirmed')
  } else if (status === 'completed') {
    query = query.eq('status', 'completed')
  } else if (status === 'cancelled') {
    query = query.eq('status', 'cancelled')
  }
  if (onlyToday) {
    query = query.eq('session_date', todayJakarta())
  }

  const [{ data: bookings }, { data: clinic }] = await Promise.all([
    query,
    db.from('clinics').select('name, operating_hours').eq('id', ctx.clinicId).single(),
  ])

  const hoursText = formatHours(clinic?.operating_hours as Record<string, string> | null)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Semua Booking</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola jadwal, konfirmasi pembayaran, dan status sesi.</p>
        </div>
        <Link
          href="/klinik/booking/tambah"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Booking Manual
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={filterHref(f.key, onlyToday)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              status === f.key
                ? 'bg-teal-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            {f.label}
          </Link>
        ))}

        <span className="mx-1 hidden h-5 w-px bg-gray-200 sm:inline-block" />

        {/* Toggle "Hari Ini" — bisa digabung dengan filter status di atas. */}
        <Link
          href={filterHref(status, !onlyToday)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            onlyToday
              ? 'bg-teal-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          )}
        >
          <CalendarDays className="h-4 w-4" /> Hari Ini
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <BookingTable
          bookings={(bookings ?? []) as any}
          clinicName={clinic?.name ?? ''}
          hoursText={hoursText}
        />
      </div>
    </div>
  )
}
