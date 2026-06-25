'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  CalendarDays, Clock, ChevronDown, ChevronUp, CircleCheck, NotebookPen, Copy, Check, Trash,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'

export interface CpptNote {
  subjective?: string | null
  objective?: string | null
  assessment?: string | null
  plan?: string | null
  home_program?: string | null
  next_session?: string | null
}

interface Props {
  note: CpptNote
  /** Nomor urut kunjungan, mis. "CPPT 3". Opsional. */
  index?: number
  therapistName?: string
  /** URL gambar tanda tangan terapis, ditampilkan di footer kartu. */
  signatureUrl?: string | null
  /** Tanggal & jam yang sudah diformat. */
  date?: string
  time?: string
  /** Tampilkan header (avatar + tanggal). Matikan bila kartu dibungkus header lain. */
  showHeader?: boolean
  /** Tampilkan footer tanda tangan terapis. */
  showSignature?: boolean
  /** Kartu bisa dilipat (collapse). */
  collapsible?: boolean
  defaultOpen?: boolean
  /** Link tombol "Edit catatan". */
  editHref?: string
  /** Aksi edit inline (mengganti editHref). */
  onEdit?: () => void
  /**
   * Form edit yang ditampilkan langsung di dalam kartu (menggantikan tampilan baca).
   * `close` menutup mode edit. Bila diberikan, tombol edit mengaktifkan form ini
   * alih-alih memanggil `onEdit`.
   */
  renderEditForm?: (close: () => void) => ReactNode
  /** Aksi hapus inline. */
  onDelete?: () => void
  /** Tanpa border/background luar — untuk disisipkan di dalam kartu lain. */
  bare?: boolean
}

const SECTIONS = [
  { key: 'subjective', label: 'Subjective', box: 'border-blue-400 bg-blue-50', labelCls: 'text-blue-700', textCls: 'text-blue-900' },
  { key: 'objective', label: 'Objective', box: 'border-teal-500 bg-teal-50', labelCls: 'text-teal-700', textCls: 'text-teal-900' },
  { key: 'assessment', label: 'Assessment', box: 'border-amber-500 bg-amber-50', labelCls: 'text-amber-700', textCls: 'text-amber-900' },
  { key: 'plan', label: 'Plan', box: 'border-violet-500 bg-violet-50', labelCls: 'text-violet-700', textCls: 'text-violet-900' },
] as const

export function CpptCard({
  note,
  index,
  therapistName,
  signatureUrl,
  date,
  time,
  showHeader = true,
  showSignature = true,
  collapsible = false,
  defaultOpen = true,
  editHref,
  onEdit,
  renderEditForm,
  onDelete,
  bare = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)

  function copyText() {
    const parts = [
      note.subjective && `S: ${note.subjective}`,
      note.objective && `O: ${note.objective}`,
      note.assessment && `A: ${note.assessment}`,
      note.plan && `P: ${note.plan}`,
      note.home_program && `Program rumah: ${note.home_program}`,
    ].filter(Boolean)
    navigator.clipboard?.writeText(parts.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className={bare ? '' : 'overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm'}>
      {showHeader && (
        <div className="flex items-start justify-between gap-3 border-b border-gray-50 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
              {therapistName ? getInitials(therapistName) : 'FT'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900">
                {index ? `SOAP ${index}` : 'Catatan Sesi'}
              </p>
              {therapistName && <p className="truncate text-xs text-gray-500">{therapistName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              {date && (
                <p className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <CalendarDays className="h-3.5 w-3.5" /> {date}
                </p>
              )}
              {time && (
                <p className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                  <Clock className="h-3 w-3" /> {time}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-gray-300">
              <button onClick={copyText} aria-label="Salin catatan" className="transition-colors hover:text-teal-600">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
              {editHref && (
                <Link href={editHref} aria-label="Edit catatan" className="transition-colors hover:text-teal-600">
                  <NotebookPen className="h-4 w-4" />
                </Link>
              )}
              {renderEditForm ? (
                <button
                  onClick={() => { setEditing((e) => !e); setOpen(true) }}
                  aria-label={editing ? 'Batal edit' : 'Edit catatan'}
                  className={`transition-colors hover:text-teal-600 ${editing ? 'text-teal-600' : ''}`}
                >
                  <NotebookPen className="h-4 w-4" />
                </button>
              ) : onEdit && (
                <button onClick={onEdit} aria-label="Edit catatan" className="transition-colors hover:text-teal-600">
                  <NotebookPen className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button onClick={onDelete} aria-label="Hapus catatan" className="transition-colors hover:text-red-500">
                  <Trash className="h-4 w-4" />
                </button>
              )}
              {collapsible && (
                <button onClick={() => setOpen((o) => !o)} aria-label={open ? 'Lipat' : 'Buka'} className="transition-colors hover:text-teal-600">
                  {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {open && editing && renderEditForm ? (
        <div className={bare ? '' : 'p-4 sm:p-5'}>
          {renderEditForm(() => setEditing(false))}
        </div>
      ) : open && (
        <div className={bare ? 'space-y-3' : 'space-y-3 p-4 sm:p-5'}>
          {SECTIONS.map((s) => {
            const value = (note as any)[s.key] as string | null | undefined
            return (
              <div key={s.key} className={`rounded-r-lg border-l-[3px] ${s.box} px-4 py-2.5`}>
                <p className={`mb-1 text-[11px] font-bold uppercase tracking-wide ${s.labelCls}`}>{s.label}</p>
                <p className={`whitespace-pre-wrap text-sm leading-relaxed ${value ? s.textCls : 'italic text-gray-400'}`}>
                  {value || '—'}
                </p>
              </div>
            )
          })}

          {note.home_program && (
            <div className="rounded-r-lg border-l-[3px] border-green-500 bg-green-50 px-4 py-2.5">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-green-700">Program Latihan di Rumah</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-green-900">{note.home_program}</p>
            </div>
          )}

          {note.next_session && (
            <div className="rounded-r-lg border-l-[3px] border-gray-300 bg-gray-50 px-4 py-2.5">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">Rekomendasi Sesi Berikutnya</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{note.next_session}</p>
            </div>
          )}

          {showSignature && therapistName && (
            <div className="flex flex-col items-end gap-1 border-t border-gray-50 pt-3">
              {signatureUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signatureUrl} alt={`Tanda tangan ${therapistName}`} className="h-14 object-contain" />
              )}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CircleCheck className="h-4 w-4 text-green-600" />
                Ditandatangani oleh <span className="font-semibold text-gray-700">{therapistName}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
