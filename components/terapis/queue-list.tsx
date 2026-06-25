'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Calendar, IdCard, CheckCircle, Clock, ListChecks } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { formatTime, getBookingStatusLabel, getBookingStatusColor, isBookingConfirmed, matchRM, formatRM, cn } from '@/lib/utils'

export interface QueueItem {
  id: string
  patientId: string
  time: string
  name: string
  age: number | null
  gender: string | null
  rm: string | null
  service: string | null
  guardian: string | null
  complaint: string | null
  status: string
  paymentStatus: string | null
}

// Palet gradien lembut untuk avatar inisial — beragam tapi serasi.
const AVATAR_GRADIENTS = [
  'from-teal-500 to-emerald-500',
  'from-sky-500 to-cyan-500',
  'from-violet-500 to-fuchsia-500',
  'from-amber-400 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-500',
]
function avatarGradient(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}

export function QueueList({ items }: { items: QueueItem[] }) {
  const [q, setQ] = useState('')

  const total = items.length
  const selesai = items.filter((i) => i.status === 'completed').length
  const aktif = items.filter((i) => ['confirmed', 'pending', 'in_progress'].includes(i.status)).length

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return items
    // Cari by nama (teks) ATAU No. RM (ketik angkanya saja, mis. "1" → RM-000001).
    return items.filter((i) => i.name.toLowerCase().includes(t) || matchRM(i.rm, q))
  }, [q, items])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total Antrian" value={total} icon={ListChecks} accent="teal" />
        <StatCard title="Aktif / Menunggu" value={aktif} icon={Clock} accent="sky" />
        <StatCard title="Selesai" value={selesai} icon={CheckCircle} accent="emerald" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-teal-50/60 to-transparent px-5 py-4 sm:px-6">
          <h2 className="flex items-center gap-2 font-bold text-gray-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 text-white">
              <Calendar className="h-4 w-4" />
            </span>
            Antrian Hari Ini
          </h2>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama / No. RM…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 sm:w-60"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-gray-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
              <Calendar className="h-6 w-6" />
            </div>
            <p className="text-sm">
              {items.length === 0 ? 'Tidak ada antrian hari ini' : 'Tidak ada hasil pencarian'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((b) => {
              const confirmed = isBookingConfirmed(b.status, b.paymentStatus)
              return (
                <div key={b.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                  {/* Waktu + avatar */}
                  <div className="flex items-center gap-3">
                    <div className="flex w-14 shrink-0 flex-col items-center">
                      <span className="rounded-lg bg-teal-50 px-2 py-1 text-xs font-bold text-teal-700">{formatTime(b.time)}</span>
                    </div>
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-sm', avatarGradient(b.name))}>
                      {b.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1 sm:hidden">
                      <PatientMeta b={b} />
                    </div>
                  </div>

                  {/* Detail (desktop) */}
                  <div className="hidden min-w-0 flex-1 sm:block">
                    <PatientMeta b={b} />
                  </div>

                  {/* Aksi */}
                  <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                    <Badge variant={getBookingStatusColor(b.status, b.paymentStatus) as any}>{getBookingStatusLabel(b.status, b.paymentStatus)}</Badge>
                    {b.status === 'completed' ? (
                      <Link href={`/terapis/catatan/${b.id}`}>
                        <Button size="sm" variant="secondary">Lihat Sesi</Button>
                      </Link>
                    ) : confirmed ? (
                      <Link href={`/terapis/catatan/${b.id}`}>
                        <Button size="sm">Isi Catatan</Button>
                      </Link>
                    ) : (
                      <Button size="sm" disabled title="Menunggu admin/owner mengonfirmasi booking ini sebelum catatan bisa diisi">
                        Isi Catatan
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function PatientMeta({ b }: { b: QueueItem }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-sm font-semibold text-gray-900">{b.name}</p>
        <span className="text-xs text-gray-400">
          {b.age != null && `${b.age} thn`}
          {b.gender && ` · ${b.gender === 'L' ? 'L' : 'P'}`}
        </span>
        {b.rm && (
          <span className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-gray-500">
            <IdCard className="h-3 w-3" /> {formatRM(b.rm)}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-gray-500">
        {b.service}
        {b.guardian && ` · Wali: ${b.guardian}`}
      </p>
      {b.complaint && <p className="mt-0.5 text-xs italic text-amber-600">{b.complaint}</p>}
    </>
  )
}
