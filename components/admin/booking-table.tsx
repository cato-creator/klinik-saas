'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle, XCircle, Receipt, ImageIcon, MessageCircle, CalendarClock, Pencil,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { EmptyState } from '@/components/ui/empty-state'
import {
  formatDate, formatTime, formatRupiah, formatThousands, parseThousands,
  getBookingStatusLabel, getBookingStatusColor, getPaymentMethodLabel, isUnscheduledTime, formatRM,
} from '@/lib/utils'
import type { Booking, PaymentMethod } from '@/types'

type Row = Booking & {
  patient?: { full_name: string; phone: string; medical_record_no?: string | null } | null
  service_type?: { name: string } | null
  therapist?: { profile?: { full_name: string } | null } | null
  notes_admin?: string | null
}

const PAYMENT_OPTIONS = [
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'qris', label: 'QRIS' },
  { value: 'cash', label: 'Tunai' },
  { value: 'bpjs', label: 'BPJS' },
]

// Bangun link wa.me dari nomor pasien (0xxx → 62xxx). Pesan follow-up dilampirkan.
function buildWaLink(phone: string | null | undefined, text: string): string | null {
  if (!phone) return null
  let d = phone.replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('0')) d = '62' + d.slice(1)
  else if (d.startsWith('8')) d = '62' + d
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`
}

export function BookingTable({
  bookings,
  clinicName = '',
  hoursText = '',
}: {
  bookings: Row[]
  clinicName?: string
  hoursText?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // modal konfirmasi pembayaran
  const [payFor, setPayFor] = useState<Row | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('transfer')
  const [amount, setAmount] = useState('') // string terformat ribuan ("150.000")
  const [notes, setNotes] = useState('')

  // modal edit harga (koreksi setelah pembayaran dikonfirmasi)
  const [editFor, setEditFor] = useState<Row | null>(null)
  const [editAmount, setEditAmount] = useState('')

  // modal konfirmasi pembatalan
  const [cancelFor, setCancelFor] = useState<Row | null>(null)

  // modal jadwalkan ulang (reschedule)
  const [reschedFor, setReschedFor] = useState<Row | null>(null)
  const [reDate, setReDate] = useState('')
  const [reTime, setReTime] = useState('')
  const [reNote, setReNote] = useState('')

  async function confirmPayment() {
    if (!payFor) return
    const amountNum = parseThousands(amount)
    if (amountNum <= 0) {
      setError('Harga harus diisi dan lebih dari 0.')
      return
    }
    setBusy(payFor.id)
    setError(null)
    try {
      const res = await fetch('/api/booking/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: payFor.id, payment_method: method, amount: amountNum, notes: notes || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengonfirmasi')
      setPayFor(null)
      setNotes('')
      setAmount('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan')
    } finally {
      setBusy(null)
    }
  }

  async function saveEditPrice() {
    if (!editFor) return
    const amountNum = parseThousands(editAmount)
    if (amountNum <= 0) {
      setError('Harga harus diisi dan lebih dari 0.')
      return
    }
    setBusy(editFor.id)
    setError(null)
    try {
      const res = await fetch('/api/booking/edit-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: editFor.id, amount: amountNum }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui harga')
      setEditFor(null)
      setEditAmount('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan')
    } finally {
      setBusy(null)
    }
  }

  function openReschedule(b: Row) {
    setReschedFor(b)
    setReDate(b.session_date ?? '')
    setReTime(isUnscheduledTime(b.session_time) ? '' : (b.session_time ?? '').slice(0, 5))
    setReNote(b.notes_admin ?? '')
    setError(null)
  }

  async function reschedule() {
    if (!reschedFor) return
    if (!reDate) {
      setError('Tanggal baru wajib diisi.')
      return
    }
    setBusy(reschedFor.id)
    setError(null)
    try {
      const res = await fetch('/api/admin/booking/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: reschedFor.id,
          session_date: reDate,
          session_time: reTime || undefined,
          notes: reNote || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menjadwalkan ulang')
      setReschedFor(null)
      setReNote('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan')
    } finally {
      setBusy(null)
    }
  }

  async function setStatus(id: string, status: string) {
    setBusy(id)
    setError(null)
    try {
      const res = await fetch('/api/admin/booking/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: id, status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui status')
      setCancelFor(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan')
    } finally {
      setBusy(null)
    }
  }

  // Pesan follow-up WhatsApp: pendaftaran diterima + jam buka klinik.
  function followUpText(b: Row): string {
    const nama = b.patient?.full_name ?? 'Bapak/Ibu'
    const tgl = formatDate(b.session_date, 'EEEE, d MMMM yyyy')
    const jam = isUnscheduledTime(b.session_time) ? '' : ` pukul ${formatTime(b.session_time)} WIB`
    const di = clinicName ? ` di ${clinicName}` : ''
    let msg = `Halo ${nama}, terima kasih telah mendaftar${di}. `
    msg += `Pendaftaran booking Anda${b.booking_code ? ` (${b.booking_code})` : ''} untuk ${tgl}${jam} telah kami TERIMA dan dikonfirmasi.`
    if (hoursText) msg += `\n\nJam buka klinik kami:\n${hoursText}`
    msg += `\n\nMohon hadir tepat waktu. Sampai jumpa, semoga lekas pulih! 🙏`
    return msg
  }

  if (bookings.length === 0) {
    return <EmptyState icon={Receipt} title="Belum ada booking" className="py-16" />
  }

  return (
    <>
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 border-b border-gray-100">
              <th className="px-4 py-3">Pasien / No. RM</th>
              <th className="px-4 py-3">Jadwal</th>
              <th className="px-4 py-3">Layanan / Terapis</th>
              <th className="px-4 py-3">Biaya</th>
              <th className="px-4 py-3">Pembayaran</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{b.patient?.full_name ?? '—'}</p>
                  <p className="text-xs text-gray-400 font-mono">{formatRM(b.patient?.medical_record_no)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="whitespace-nowrap text-gray-700">{formatDate(b.session_date, 'd MMM yyyy')}</p>
                  <p className="whitespace-nowrap text-xs text-gray-400">
                    {isUnscheduledTime(b.session_time) ? 'Jam belum dijadwalkan' : `${formatTime(b.session_time)} WIB`}
                  </p>
                  {b.notes_admin && (
                    <p className="mt-1 flex items-start gap-1 text-xs text-amber-600" title={b.notes_admin}>
                      <CalendarClock className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="line-clamp-2 max-w-[14rem]">{b.notes_admin}</span>
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-700">{b.service_type?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{b.therapist?.profile?.full_name ?? '—'}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatRupiah(b.amount)}</td>
                <td className="px-4 py-3">
                  <Badge variant={getBookingStatusColor(b.status, b.payment_status) as any}>{getBookingStatusLabel(b.status, b.payment_status)}</Badge>
                  {b.payment_method && b.payment_status === 'paid' && (
                    <p className="text-xs text-gray-400 mt-1">{getPaymentMethodLabel(b.payment_method)}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {b.payment_proof_url && (
                      <a
                        href={b.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                        title="Lihat bukti bayar"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </a>
                    )}

                    {/* Follow-up WhatsApp ke pasien */}
                    {(() => {
                      const wa = buildWaLink(b.patient?.phone, followUpText(b))
                      return wa ? (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100"
                          title="Follow up via WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" /> WA
                        </a>
                      ) : null
                    })()}

                    {b.payment_status === 'unpaid' && b.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        loading={busy === b.id}
                        onClick={() => { setPayFor(b); setMethod((b.payment_method as PaymentMethod) ?? 'transfer'); setAmount(b.amount && b.amount > 0 ? formatThousands(b.amount) : ''); setError(null) }}
                      >
                        <CheckCircle className="h-4 w-4" /> Konfirmasi
                      </Button>
                    )}

                    {b.payment_status === 'paid' && (
                      <button
                        onClick={() => { setEditFor(b); setEditAmount(b.amount && b.amount > 0 ? formatThousands(b.amount) : ''); setError(null) }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                        title="Edit harga / koreksi pembayaran"
                      >
                        <Pencil className="h-4 w-4" /> Edit Harga
                      </button>
                    )}

                    {['pending', 'confirmed'].includes(b.status) && (
                      <button
                        onClick={() => openReschedule(b)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                        title="Jadwalkan ulang sesi pasien"
                      >
                        <CalendarClock className="h-4 w-4" /> Jadwal Ulang
                      </button>
                    )}

                    {!['completed', 'cancelled'].includes(b.status) && (
                      <button
                        onClick={() => { setCancelFor(b); setError(null) }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                        title="Batalkan booking"
                      >
                        <XCircle className="h-4 w-4" /> Batalkan
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!payFor} onClose={() => setPayFor(null)} title="Konfirmasi Pembayaran">
        {payFor && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Pasien</span><span className="font-medium">{payFor.patient?.full_name}</span></div>
              {payFor.session_date && (
                <div className="flex justify-between mt-1"><span className="text-gray-500">Tanggal</span><span className="font-medium">{formatDate(payFor.session_date, 'd MMM yyyy')}</span></div>
              )}
            </div>

            {payFor.payment_proof_url && (
              <a href={payFor.payment_proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:underline">
                <ImageIcon className="h-4 w-4" /> Lihat bukti pembayaran
              </a>
            )}

            {/* Harga — wajib, otomatis diberi titik tiap ribuan. Masuk ke laporan keuangan (pemasukan). */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Harga <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center rounded-lg border border-gray-200 px-3 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
                <span className="text-sm font-medium text-gray-400">Rp</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(formatThousands(e.target.value))}
                  inputMode="numeric"
                  placeholder="0"
                  className="w-full bg-transparent px-2 py-2.5 text-sm font-semibold text-gray-900 outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">Nominal ini dicatat sebagai pemasukan di laporan keuangan.</p>
            </div>

            <Select
              label="Metode Pembayaran"
              options={PAYMENT_OPTIONS}
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            />
            <Textarea
              label="Catatan (opsional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan internal pembayaran…"
              rows={2}
            />

            {error && <Alert variant="error">{error}</Alert>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPayFor(null)}>Batal</Button>
              <Button loading={busy === payFor.id} onClick={confirmPayment}>
                Konfirmasi & Lunasi
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!editFor} onClose={() => setEditFor(null)} title="Edit Harga">
        {editFor && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Pasien</span><span className="font-medium">{editFor.patient?.full_name}</span></div>
              <div className="flex justify-between mt-1"><span className="text-gray-500">Harga saat ini</span><span className="font-medium">{formatRupiah(editFor.amount)}</span></div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Harga baru <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center rounded-lg border border-gray-200 px-3 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
                <span className="text-sm font-medium text-gray-400">Rp</span>
                <input
                  value={editAmount}
                  onChange={(e) => setEditAmount(formatThousands(e.target.value))}
                  inputMode="numeric"
                  placeholder="0"
                  className="w-full bg-transparent px-2 py-2.5 text-sm font-semibold text-gray-900 outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">Perubahan langsung tersinkron ke arus kas & pendapatan di overview.</p>
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditFor(null)}>Batal</Button>
              <Button loading={busy === editFor.id} onClick={saveEditPrice}>
                <Pencil className="h-4 w-4" /> Simpan Harga
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!cancelFor} onClose={() => setCancelFor(null)} title="Batalkan Booking">
        {cancelFor && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Yakin membatalkan booking{' '}
              <span className="font-semibold text-gray-900">{cancelFor.patient?.full_name}</span>
              {cancelFor.patient?.medical_record_no && <span className="font-mono text-gray-500"> (RM {formatRM(cancelFor.patient.medical_record_no)})</span>}?
              Slot jadwal akan dilepas dan status menjadi “Dibatalkan”.
            </p>

            {error && <Alert variant="error">{error}</Alert>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCancelFor(null)}>Kembali</Button>
              <Button variant="danger" loading={busy === cancelFor.id} onClick={() => setStatus(cancelFor.id, 'cancelled')}>
                <XCircle className="h-4 w-4" /> Ya, Batalkan
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!reschedFor} onClose={() => setReschedFor(null)} title="Jadwalkan Ulang">
        {reschedFor && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Ubah jadwal sesi{' '}
              <span className="font-semibold text-gray-900">{reschedFor.patient?.full_name}</span>
              {reschedFor.patient?.medical_record_no && <span className="font-mono text-gray-500"> (RM {formatRM(reschedFor.patient.medical_record_no)})</span>}.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tanggal baru <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={reDate}
                  onChange={(e) => setReDate(e.target.value)}
                  className="block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Jam <span className="font-normal text-gray-400">(opsional)</span></label>
                <input
                  type="time"
                  value={reTime}
                  onChange={(e) => setReTime(e.target.value)}
                  className="block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
            <p className="-mt-1 text-xs text-gray-400">Kosongkan jam bila belum dijadwalkan pasti.</p>

            <Textarea
              label="Catatan (mis. atas permintaan pasien, sudah dikonfirmasi)"
              value={reNote}
              onChange={(e) => setReNote(e.target.value)}
              placeholder="Catatan reschedule…"
              rows={2}
            />

            {error && <Alert variant="error">{error}</Alert>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setReschedFor(null)}>Batal</Button>
              <Button loading={busy === reschedFor.id} onClick={reschedule}>
                <CalendarClock className="h-4 w-4" /> Simpan Jadwal
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
