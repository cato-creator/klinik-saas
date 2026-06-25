'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, Copy } from 'lucide-react'
import { SoapForm, type PreviousNote } from './soap-form'
import { CpptCard } from './cppt-card'
import { CopyCpptModal } from './copy-cppt-modal'

type FormValues = ReturnType<typeof toInitial>

export interface NoteRow {
  id: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  home_program: string | null
  next_session: string | null
  /** Terapis penulis catatan ini (bisa beda antar catatan). */
  therapistName?: string
  signatureUrl?: string | null
}

interface Props {
  bookingId: string
  canComplete: boolean
  notes: NoteRow[]
  therapistName?: string
  signatureUrl?: string | null
  dateLabel?: string
  timeLabel?: string
  previousNotes?: PreviousNote[]
  /** true bila booking belum dikonfirmasi admin/owner — input catatan dikunci. */
  locked?: boolean
}

function toInitial(n?: NoteRow) {
  return {
    subjective: n?.subjective ?? '',
    objective: n?.objective ?? '',
    assessment: n?.assessment ?? '',
    plan: n?.plan ?? '',
    home_program: n?.home_program ?? '',
    next_session: n?.next_session ?? '',
  }
}

function fromPrevious(n: PreviousNote): FormValues {
  return {
    subjective: n.subjective ?? '',
    objective: n.objective ?? '',
    assessment: n.assessment ?? '',
    plan: n.plan ?? '',
    home_program: n.home_program ?? '',
    next_session: '',
  }
}

export function CpptManager({ bookingId, canComplete, notes, therapistName, signatureUrl, dateLabel, timeLabel, previousNotes, locked = false }: Props) {
  const router = useRouter()
  // true = form "buat baru" terbuka. Edit CPPT lama dilakukan inline di kartunya.
  const [creating, setCreating] = useState(false)
  const [showCopy, setShowCopy] = useState(false)
  // Nilai awal form "buat baru" — kosong, atau hasil salin dari CPPT sebelumnya.
  const [newInitial, setNewInitial] = useState<FormValues>(toInitial())
  const [copied, setCopied] = useState(false)
  // Naikkan untuk memaksa SoapForm mount ulang dengan initial baru.
  const [formKey, setFormKey] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)

  function startNew() {
    setNewInitial(toInitial())
    setCopied(false)
    setFormKey((k) => k + 1)
    setCreating(true)
  }

  function applyCopy(n: PreviousNote) {
    setNewInitial(fromPrevious(n))
    setCopied(true)
    setFormKey((k) => k + 1)
    setShowCopy(false)
    setCreating(true)
  }

  async function remove(id: string) {
    if (!confirm('Hapus CPPT ini?')) return
    setDeleting(id)
    await fetch('/api/terapis/note', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDeleting(null)
    router.refresh()
  }

  // Booking belum dikonfirmasi admin/owner → catatan tidak boleh diisi.
  if (locked) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
        <p className="font-semibold">Menunggu konfirmasi admin/owner</p>
        <p className="mt-1">
          Catatan (SOAP) baru bisa diisi setelah booking pasien ini dikonfirmasi (diterima) oleh admin atau owner.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Daftar CPPT yang sudah ada — edit langsung di kartunya (inline). */}
      {notes.length > 0 && (
        <div className="space-y-3">
          {notes.map((n, i) => (
            <div key={n.id} className="relative">
              {deleting === n.id && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60">
                  <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                </div>
              )}
              <CpptCard
                note={n}
                index={i + 1}
                therapistName={n.therapistName ?? therapistName}
                signatureUrl={n.signatureUrl ?? signatureUrl}
                date={dateLabel}
                time={timeLabel}
                collapsible
                defaultOpen={false}
                showSignature={!!(n.signatureUrl ?? signatureUrl)}
                onDelete={() => remove(n.id)}
                renderEditForm={(close) => (
                  <SoapForm
                    bookingId={bookingId}
                    canComplete={canComplete}
                    initial={toInitial(n)}
                    noteId={n.id}
                    onSaved={close}
                  />
                )}
              />
            </div>
          ))}
        </div>
      )}

      {/* Tombol buat baru / form */}
      {creating ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Buat SOAP Baru</h3>
            <button
              onClick={() => setCreating(false)}
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
            >
              <X className="h-4 w-4" /> Tutup
            </button>
          </div>
          <SoapForm
            key={formKey}
            bookingId={bookingId}
            canComplete={canComplete}
            initial={newInitial}
            copiedNotice={copied}
            onSaved={() => setCreating(false)}
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={startNew}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" /> Buat SOAP Baru
          </button>
          <button
            onClick={() => setShowCopy(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-5 py-2.5 text-sm font-bold text-teal-700 transition-all hover:bg-teal-50"
          >
            <Copy className="h-4 w-4" /> Copy SOAP
          </button>
        </div>
      )}

      {showCopy && (
        <CopyCpptModal
          notes={previousNotes ?? []}
          onCopy={applyCopy}
          onClose={() => setShowCopy(false)}
        />
      )}
    </div>
  )
}
