'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Users, Eye, RotateCcw } from 'lucide-react'
import { formatDate, matchRM, formatRM, cn } from '@/lib/utils'

export interface PatientItem {
  id: string
  name: string
  rm: string | null
  age: number | null
  birthDate: string | null
  gender: 'L' | 'P' | null
  guardian: string | null
  phone: string | null
  sessions: number
  completed: number
  last: string
}

const EMPTY = { rm: '', name: '', birth: '' }

const fieldCls =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

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

export function PatientSearchList({ items }: { items: PatientItem[] }) {
  const [draft, setDraft] = useState(EMPTY)
  const [applied, setApplied] = useState(EMPTY)

  const filtered = useMemo(() => {
    const rm = applied.rm.trim()
    const name = applied.name.trim().toLowerCase()
    const birth = applied.birth.trim()
    return items.filter((p) => {
      // No. RM: ketik angkanya saja, mis. "1" → RM-000001 (abaikan prefix & nol depan).
      if (rm && !matchRM(p.rm, rm)) return false
      if (name && !p.name.toLowerCase().includes(name)) return false
      if (birth && !(p.birthDate ?? '').includes(birth)) return false
      return true
    })
  }, [applied, items])

  function search(e: React.FormEvent) {
    e.preventDefault()
    setApplied(draft)
  }

  function reset() {
    setDraft(EMPTY)
    setApplied(EMPTY)
  }

  return (
    <div className="space-y-5">
      {/* Form filter */}
      <form onSubmit={search} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600">No. RM</label>
            <input value={draft.rm} onChange={(e) => setDraft({ ...draft, rm: e.target.value })} className={fieldCls} placeholder="Cukup ketik angkanya, mis. 1" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600">Nama Pasien</label>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={fieldCls} placeholder="Nama pasien…" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600">Tanggal Lahir</label>
            <input type="date" value={draft.birth} onChange={(e) => setDraft({ ...draft, birth: e.target.value })} className={fieldCls} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md">
            <Search className="h-4 w-4" /> Cari Pasien
          </button>
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </form>

      {/* Hasil */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-amber-50/60 to-transparent px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold text-gray-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <Users className="h-4 w-4" />
            </span>
            Daftar Pasien
          </h2>
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">{filtered.length} pasien</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-gray-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-sm">{items.length === 0 ? 'Belum ada pasien' : 'Tidak ada hasil pencarian'}</p>
          </div>
        ) : (
          <>
            {/* Kartu (mobile) */}
            <div className="divide-y divide-gray-50 lg:hidden">
              {filtered.map((p) => (
                <Link key={p.id} href={`/terapis/pasien/${p.id}`} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70">
                  <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-sm', avatarGradient(p.name))}>
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-gray-900">{p.name}</p>
                      {p.rm && <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-gray-500">{formatRM(p.rm)}</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {p.gender === 'L' ? 'Laki-laki' : p.gender === 'P' ? 'Perempuan' : '—'}
                      {p.age != null && ` · ${p.age} thn`}
                      {p.guardian && ` · Wali: ${p.guardian}`}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      <span className="font-semibold text-teal-700">{p.completed}</span>/{p.sessions} sesi · Terakhir {formatDate(p.last)}
                    </p>
                  </div>
                  <Eye className="h-4 w-4 shrink-0 text-amber-500" />
                </Link>
              ))}
            </div>

            {/* Tabel (desktop) */}
            <div className="hidden lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="whitespace-nowrap px-5 py-3">No. RM</th>
                    <th className="whitespace-nowrap px-5 py-3">Nama</th>
                    <th className="whitespace-nowrap px-5 py-3">Wali</th>
                    <th className="whitespace-nowrap px-5 py-3">Kontak</th>
                    <th className="whitespace-nowrap px-5 py-3">Sesi</th>
                    <th className="whitespace-nowrap px-5 py-3 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-xs font-bold text-gray-500">{formatRM(p.rm)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-bold text-white', avatarGradient(p.name))}>
                            {p.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-500">
                              {p.gender === 'L' ? 'Laki-laki' : p.gender === 'P' ? 'Perempuan' : '—'}
                              {p.age != null && ` · ${p.age} thn`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-gray-700">{p.guardian ?? '—'}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-gray-700">{p.phone ?? '—'}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-gray-700">
                        <span className="font-semibold text-gray-900">{p.completed}</span>/{p.sessions}
                        <span className="block text-xs text-gray-400">Terakhir {formatDate(p.last)}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <Link
                          href={`/terapis/pasien/${p.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md"
                        >
                          <Eye className="h-3.5 w-3.5" /> Lihat
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
