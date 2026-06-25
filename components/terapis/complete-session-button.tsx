'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, Loader2, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/modal'

export function CompleteSessionButton({ bookingId, completed = false }: { bookingId: string; completed?: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(completed)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function complete() {
    if (done || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/booking/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Gagal menyelesaikan pelayanan. Coba lagi.')
        setLoading(false)
        return
      }
      setDone(true)
      setLoading(false)
      setConfirmOpen(false)
      router.refresh()
    } catch {
      setLoading(false)
      setError('Terjadi kesalahan jaringan.')
    }
  }

  if (done) {
    return (
      <button
        disabled
        className="inline-flex cursor-default items-center gap-2 rounded-xl bg-green-100 px-4 py-2 text-sm font-bold text-green-700"
      >
        <CircleCheck className="h-4 w-4" /> Selesai
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => { setError(null); setConfirmOpen(true) }}
        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-teal-700 shadow-sm transition-all hover:bg-teal-50"
      >
        <CircleCheck className="h-4 w-4" /> Selesai Pelayanan
      </button>

      <Modal open={confirmOpen} onClose={() => !loading && setConfirmOpen(false)} size="sm" className="rounded-3xl">
        <div className="flex flex-col items-center text-center">
          {/* Ikon utama */}
          <div className="relative mb-4">
            <div className="absolute inset-0 animate-ping rounded-full bg-teal-400/30" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30">
              <CircleCheck className="h-8 w-8" strokeWidth={2.2} />
            </div>
          </div>

          <h3 className="text-lg font-bold text-gray-900">Selesaikan pelayanan?</h3>
          <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-gray-500">
            Sesi ini akan ditandai <span className="font-semibold text-gray-700">selesai</span> dan ditutup.
            Pastikan catatan SOAP sudah diisi sebelum menyelesaikan.
          </p>

          {error && (
            <div className="mt-4 flex w-full items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-left text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {/* Aksi — full width di HP, sejajar di layar lebih besar */}
          <div className="mt-6 flex w-full flex-col-reverse gap-2.5 sm:flex-row sm:justify-center">
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={loading}
              className="w-full rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60 sm:w-auto"
            >
              Batal
            </button>
            <button
              onClick={complete}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:shadow-md disabled:opacity-60 sm:w-auto"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyelesaikan…</> : <><CircleCheck className="h-4 w-4" /> Ya, Selesaikan</>}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
