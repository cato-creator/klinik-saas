import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { format, subDays } from 'date-fns'
import { id } from 'date-fns/locale'
import { CalendarClock, CheckCircle2, Users, Activity, Sparkles } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { WeeklySessionsChart, StatusDonut } from '@/components/terapis/overview-charts'
import { todayJakarta, nowJakarta } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Overview — Terapis' }

function greeting(hour: number): string {
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

export default async function TerapisOverviewPage() {
  const ctx = await requireTenantUser(['therapist', 'admin', 'owner'])

  const db = createServiceClient()
  const { data: therapist } = await db
    .from('therapists')
    .select('id')
    .eq('user_id', ctx.userId)
    .eq('clinic_id', ctx.clinicId)
    .maybeSingle()

  const today = todayJakarta()

  // Antrian klinik hari ini (untuk ringkasan banner).
  const { count: antrianHariIni } = await db
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', ctx.clinicId)
    .eq('session_date', today)
    .neq('status', 'cancelled')

  // Seluruh booking terapis ini untuk statistik & diagram.
  const myBookings = therapist
    ? (await db.from('bookings').select('session_date, status, patient_id').eq('clinic_id', ctx.clinicId).eq('therapist_id', therapist.id)).data ?? []
    : []

  // ---- Statistik ----
  const monthPrefix = today.slice(0, 7) // yyyy-MM
  const selesaiHariIni = myBookings.filter((b) => b.session_date === today && b.status === 'completed').length
  const totalPasien = new Set(myBookings.map((b) => b.patient_id)).size
  const sesiBulanIni = myBookings.filter((b) => (b.session_date ?? '').startsWith(monthPrefix)).length
  const selesaiTotal = myBookings.filter((b) => b.status === 'completed').length

  // ---- Diagram: sesi 7 hari terakhir ----
  const weekly = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(nowJakarta(), 6 - i)
    const key = format(d, 'yyyy-MM-dd')
    return {
      label: format(d, 'EEE', { locale: id }),
      sessions: myBookings.filter((b) => b.session_date === key).length,
    }
  })

  // ---- Diagram: distribusi status ----
  const statusMap: Record<string, string> = {
    completed: 'Selesai', in_progress: 'Dikonfirmasi', confirmed: 'Dikonfirmasi', pending: 'Menunggu Verifikasi',
  }
  const statusCount = new Map<string, number>()
  for (const b of myBookings) {
    const label = statusMap[b.status]
    if (label) statusCount.set(label, (statusCount.get(label) ?? 0) + 1)
  }
  const statusData = Array.from(statusCount.entries()).map(([name, value]) => ({ name, value }))

  const firstName = (ctx.fullName ?? 'Terapis').split(' ').slice(0, 2).join(' ')
  const hour = nowJakarta().getHours()
  const queueCount = antrianHariIni ?? 0

  const rise = (i: number) => ({ className: 'animate-rise', style: { animationDelay: `${i * 90}ms` } as const })

  return (
    <div className="space-y-6">
      {/* ===== Banner sambutan ===== */}
      <div {...rise(0)} className="animate-rise relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-600 to-emerald-500 p-6 text-white shadow-lg shadow-teal-600/25 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-amber-300/20 blur-2xl" />
        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" /> {format(nowJakarta(), 'EEEE, d MMMM yyyy', { locale: id })}
          </p>
          <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">
            {greeting(hour)}, {firstName}! 👋
          </h1>
          <p className="mt-1.5 max-w-lg text-sm text-teal-50/90">
            {queueCount > 0
              ? `Ada ${queueCount} pasien dalam antrian hari ini. Semangat memberikan terapi terbaik!`
              : 'Belum ada antrian hari ini. Selamat beristirahat & menyiapkan sesi berikutnya.'}
          </p>
        </div>
      </div>

      {/* ===== Statistik ===== */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div {...rise(1)}><StatCard title="Antrian Hari Ini" value={queueCount} icon={CalendarClock} accent="teal" /></div>
        <div {...rise(2)}><StatCard title="Selesai Hari Ini" value={selesaiHariIni} icon={CheckCircle2} accent="emerald" /></div>
        <div {...rise(3)}><StatCard title="Total Pasien" value={totalPasien} subtitle="pasien Anda tangani" icon={Users} accent="sky" /></div>
        <div {...rise(4)}><StatCard title="Sesi Bulan Ini" value={sesiBulanIni} subtitle={`${selesaiTotal} selesai total`} icon={Activity} accent="violet" /></div>
      </div>

      {/* ===== Diagram ===== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div {...rise(5)} className="animate-rise rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-sm">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-gray-900">Sesi 7 Hari Terakhir</h3>
              <p className="text-xs text-gray-400">Jumlah sesi terjadwal per hari.</p>
            </div>
          </div>
          <WeeklySessionsChart data={weekly} />
        </div>
        <div {...rise(6)} className="animate-rise rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-gray-900">Distribusi Status</h3>
              <p className="text-xs text-gray-400">Seluruh booking Anda.</p>
            </div>
          </div>
          {statusData.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">Belum ada data booking.</p>
          ) : (
            <StatusDonut data={statusData} />
          )}
        </div>
      </div>
    </div>
  )
}
