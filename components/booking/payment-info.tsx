'use client'

// Info pembayaran komitmen fee untuk pasien: nominal + rekening yang bisa
// DI-COPY, plus tombol kirim bukti via WhatsApp ke klinik. Dipakai di langkah
// konfirmasi booking dan di halaman sukses. Tidak tampil bila fee = 0.

import { useState } from 'react'
import { Copy, Check, MessageCircle } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

interface Props {
  fee: number
  bankName?: string | null
  accountName?: string | null
  accountNumber?: string | null
  waNumber?: string | null      // format wa.me ("62…")
  waText?: string
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard tidak tersedia — abaikan */
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-teal-100">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <p className="truncate text-sm font-bold text-gray-900">{value}</p>
      </div>
      <button type="button" onClick={copy}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100">
        {copied ? <><Check className="h-3.5 w-3.5" /> Tersalin</> : <><Copy className="h-3.5 w-3.5" /> Salin</>}
      </button>
    </div>
  )
}

export function PaymentInfo({ fee, bankName, accountName, accountNumber, waNumber, waText }: Props) {
  if (fee <= 0) return null
  const hasBank = !!(bankName || accountName || accountNumber)
  const waHref = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(waText ?? 'Halo, saya ingin mengirim bukti pembayaran komitmen fee booking.')}`
    : null

  return (
    <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-gray-900">Pembayaran Komitmen Fee</p>
        <span className="text-base font-extrabold text-teal-700">{formatRupiah(fee)}</span>
      </div>

      {hasBank ? (
        <div className="mt-3 space-y-2">
          {bankName && <CopyRow label="Bank / E-wallet" value={bankName} />}
          {accountNumber && <CopyRow label="No. Rekening" value={accountNumber} />}
          {accountName && <CopyRow label="Atas Nama" value={accountName} />}
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-500">Detail rekening akan diinformasikan admin via WhatsApp.</p>
      )}

      {waHref && (
        <a href={waHref} target="_blank" rel="noopener noreferrer"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-green-700">
          <MessageCircle className="h-4 w-4" /> Kirim bukti via WhatsApp
        </a>
      )}
    </div>
  )
}
