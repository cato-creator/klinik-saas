'use client'

import { useEffect, useRef, useState, useActionState } from 'react'
import { Modal } from '@/components/ui/modal'
import { impersonateOwner, type ActionResult } from '@/app/admin/actions'

// Tombol "Login sebagai owner" (super admin). Server action menyiapkan sesi &
// mengembalikan URL verifikasi di host klinik. Sesi owner dibuka di TAB BARU agar
// tab/sesi super admin (di domain utama) tidak terganggu — cookie pun host-scoped
// jadi sesi super admin di apex tetap utuh.
export default function ImpersonateButton({ clinicId, ownerName }: { clinicId: string; ownerName: string }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(impersonateOwner, null)
  // Tab baru dibuka SAAT KLIK (gesture user) agar tidak diblokir popup blocker,
  // lalu URL-nya diisi setelah server action selesai.
  const tabRef = useRef<Window | null>(null)

  useEffect(() => {
    if (!state) return
    if (state.ok && state.redirectUrl) {
      if (tabRef.current && !tabRef.current.closed) {
        tabRef.current.location.href = state.redirectUrl
      } else {
        // Popup diblokir → fallback: buka di tab yang sama (sesi super admin di
        // apex tetap aman karena cookie host-scoped).
        window.location.href = state.redirectUrl
      }
      tabRef.current = null
      setOpen(false)
    } else if (state.error && tabRef.current) {
      tabRef.current.close()
      tabRef.current = null
    }
  }, [state])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        👤 Login sebagai owner
      </button>

      <Modal open={open} onClose={() => !pending && setOpen(false)} title="Login sebagai owner" size="md">
        <div className="space-y-4 text-sm">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
            <p className="font-medium">Masuk sebagai owner {ownerName}</p>
            <p className="mt-1 text-xs">
              Dashboard owner akan dibuka di <span className="font-medium">tab baru</span>. Tab & sesi super admin ini
              tetap aktif. Aktivitas ini dicatat di audit log.
            </p>
          </div>

          {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

          <form action={action} className="flex justify-end gap-2">
            <input type="hidden" name="clinic_id" value={clinicId} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Batal
            </button>
            <button
              type="submit"
              onClick={() => { tabRef.current = window.open('about:blank', '_blank') }}
              disabled={pending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {pending ? 'Menyiapkan…' : 'Buka tab owner'}
            </button>
          </form>
        </div>
      </Modal>
    </>
  )
}
