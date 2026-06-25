'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type StaffMember = {
  id: string
  full_name: string
  role: string
  email: string | null
  status: string
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', therapist: 'Terapis', patient: 'Pasien', affiliate: 'Affiliator',
}

// Panel kelola akun staf klinik (super admin): reset password (tampil sekali) &
// aktif/nonaktif. Memanggil API /api/admin/users/*.
export default function ClinicStaff({ staff }: { staff: StaffMember[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tempPw, setTempPw] = useState<Record<string, string>>({})

  async function resetPassword(id: string) {
    setError(null); setBusy(id)
    try {
      const res = await fetch('/api/admin/users/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: id }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Gagal reset.')
      setTempPw((m) => ({ ...m, [id]: j.password }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal reset.')
    } finally { setBusy(null) }
  }

  async function toggleStatus(id: string, current: string) {
    setError(null); setBusy(id)
    const next = current === 'active' ? 'inactive' : 'active'
    try {
      const res = await fetch('/api/admin/users/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: id, status: next }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Gagal mengubah status.')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengubah status.')
    } finally { setBusy(null) }
  }

  if (staff.length === 0) {
    return <p className="text-sm text-zinc-500">Belum ada staf (owner/admin/terapis) di klinik ini.</p>
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
              <th className="px-3 py-2 font-medium">Nama</th>
              <th className="px-3 py-2 font-medium">Peran</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-zinc-100 align-top last:border-0 dark:border-zinc-800/60">
                <td className="px-3 py-2">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{s.full_name}</div>
                  {s.email && <div className="text-xs text-zinc-400">{s.email}</div>}
                  {tempPw[s.id] && (
                    <div className="mt-1 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Password baru: <span className="font-mono font-semibold">{tempPw[s.id]}</span>
                      <span className="ml-1 text-emerald-600/70">— catat & sampaikan, hanya tampil sekali.</span>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{ROLE_LABEL[s.role] ?? s.role}</td>
                <td className="px-3 py-2">
                  <span className={s.status === 'active'
                    ? 'rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800'}>
                    {s.status === 'active' ? 'Aktif' : s.status === 'pending' ? 'Pending' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => resetPassword(s.id)}
                      disabled={busy === s.id}
                      className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {busy === s.id ? '…' : 'Reset password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleStatus(s.id, s.status)}
                      disabled={busy === s.id}
                      className={s.status === 'active'
                        ? 'rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:bg-red-950/40 dark:text-red-300'
                        : 'rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-950/50 dark:text-emerald-300'}
                    >
                      {s.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
