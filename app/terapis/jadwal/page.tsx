import Link from 'next/link'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { CalendarDays, NotebookPen, CalendarRange } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { getStatusLabel, getStatusColor, isUnscheduledTime, formatTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Jadwal — Terapis' }

export default async function TerapisJadwalPage() {
  const ctx = await requireTenantUser(['therapist', 'admin', 'owner'])

  const db = createServiceClient()
  const { data: therapist } = await db
    .from('therapists')
    .select('id')
    .eq('user_id', ctx.userId)
    .eq('clinic_id', ctx.clinicId)
    .maybeSingle()

  const today = format(new Date(), 'yyyy-MM-dd')
  const bookings = therapist
    ? (await db
        .from('bookings')
        .select('*, patient:patients(full_name), service_type:service_types(name)')
        .eq('clinic_id', ctx.clinicId)
        .eq('therapist_id', therapist.id)
        .gte('session_date', today)
        .neq('status', 'cancelled')
        .order('session_date')
        .order('session_time')).data ?? []
    : []

  // Kelompokkan per tanggal.
  const byDate = new Map<string, typeof bookings>()
  for (const b of bookings) {
    const arr = byDate.get(b.session_date) ?? []
    arr.push(b)
    byDate.set(b.session_date, arr)
  }
  const dates = Array.from(byDate.keys())

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-violet-500/30">
          <CalendarRange className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Jadwal Mendatang</h1>
          <p className="text-sm text-gray-500">Sesi terapi yang dijadwalkan untuk Anda.</p>
        </div>
      </div>

      {dates.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <EmptyState icon={CalendarDays} title="Tidak ada jadwal mendatang" className="py-12" />
        </div>
      ) : (
        <div className="space-y-5">
          {dates.map((date, di) => (
            <div key={date} style={{ animationDelay: `${di * 80}ms` }} className="animate-rise">
              <div className="mb-2.5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-50 to-fuchsia-50 px-3.5 py-1.5 text-sm font-semibold text-violet-700 ring-1 ring-violet-100">
                <CalendarDays className="h-4 w-4" />
                {format(new Date(date), 'EEEE, d MMMM yyyy', { locale: localeID })}
                <span className="ml-1 rounded-full bg-white/80 px-2 text-xs text-violet-600">{byDate.get(date)!.length} sesi</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
                {byDate.get(date)!.map((b) => {
                  const name = (b.patient as any)?.full_name ?? 'Pasien'
                  return (
                    <div key={b.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/70 sm:gap-4 sm:px-5">
                      <div className="w-14 shrink-0 text-center">
                        <span className="inline-block rounded-lg bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700">
                          {isUnscheduledTime(b.session_time) ? '—' : formatTime(b.session_time)}
                        </span>
                      </div>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white shadow-sm">
                        {name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                        <p className="truncate text-xs text-gray-500">{(b.service_type as any)?.name}</p>
                      </div>
                      <Badge variant={getStatusColor(b.status) as any}>{getStatusLabel(b.status)}</Badge>
                      <Link href={`/terapis/catatan/${b.id}`} className="hidden items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-600 transition-colors hover:bg-violet-50 sm:inline-flex">
                        <NotebookPen className="h-3.5 w-3.5" /> Catatan
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
