'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Copy, ChevronDown, ChevronUp, History } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { CpptCard } from './cppt-card'
import { type PreviousNote } from './soap-form'

/**
 * Popup daftar seluruh history CPPT pasien. Menekan "Copy SOAP" pada salah satu
 * item akan menyalin isinya (lewat onCopy) lalu menutup popup.
 */
export function CopyCpptModal({
  notes,
  onCopy,
  onClose,
}: {
  notes: PreviousNote[]
  onCopy: (note: PreviousNote) => void
  onClose: () => void
}) {
  // Portal ke body: lepas dari ancestor ber-transform (<main className="animate-page">)
  // agar `position: fixed` mengacu ke VIEWPORT (muncul di bawah LAYAR), bukan halaman.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Kunci scroll body selama popup terbuka.
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="flex items-center gap-2 font-bold text-gray-900">
            <History className="h-4 w-4 text-teal-600" /> Copy SOAP
          </h3>
          <button onClick={onClose} aria-label="Tutup" className="text-gray-400 transition-colors hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          {notes.length === 0 ? (
            <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              Belum ada SOAP sebelumnya untuk pasien ini.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="px-1 text-xs text-gray-500">Pilih SOAP yang ingin disalin ke catatan baru.</p>
              {notes.map((n) => (
                <Item key={n.id} note={n} onCopy={() => onCopy(n)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Item({ note, onCopy }: { note: PreviousNote; onCopy: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-gray-100 bg-white">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-w-0 items-start gap-2 text-left">
          {open ? <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /> : <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />}
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-gray-800">{formatDate(note.date)}</span>
            <span className="block truncate text-[11px] text-gray-500">Dibuat oleh: {note.therapistName ?? 'Terapis'}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-teal-700"
        >
          <Copy className="h-3.5 w-3.5" /> Copy SOAP
        </button>
      </div>
      {open && (
        <div className="border-t border-gray-50 p-3">
          <CpptCard bare showHeader={false} showSignature={false} note={note} />
        </div>
      )}
    </div>
  )
}
