'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { formatRupiah, formatDate, getPaymentMethodLabel, getPaymentStatusLabel } from '@/lib/utils'

export interface InvoiceData {
  invoiceNumber: string
  bookingCode: string
  patientName: string
  serviceName: string
  therapistName: string
  sessionDate: string
  amount: number
  discount: number
  total: number
  paymentStatus: string
  paymentMethod: string | null
  paidAt: string | null
  clinicName: string
  clinicAddress: string
  clinicPhone: string
}

export function InvoiceView({ inv }: { inv: InvoiceData }) {
  const [loading, setLoading] = useState(false)

  async function download() {
    setLoading(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const teal: [number, number, number] = [13, 148, 136]
      let y = 20

      doc.setFontSize(20)
      doc.setTextColor(...teal)
      doc.setFont('helvetica', 'bold')
      doc.text(inv.clinicName, 20, y)

      doc.setFontSize(9)
      doc.setTextColor(120)
      doc.setFont('helvetica', 'normal')
      doc.text(inv.clinicAddress, 20, y + 6)
      doc.text(`Telp: ${inv.clinicPhone}`, 20, y + 11)

      doc.setFontSize(22)
      doc.setTextColor(30)
      doc.setFont('helvetica', 'bold')
      doc.text('INVOICE', 190, y, { align: 'right' })
      doc.setFontSize(9)
      doc.setTextColor(120)
      doc.setFont('helvetica', 'normal')
      doc.text(inv.invoiceNumber, 190, y + 6, { align: 'right' })

      y += 22
      doc.setDrawColor(...teal)
      doc.setLineWidth(0.5)
      doc.line(20, y, 190, y)

      y += 10
      doc.setFontSize(10)
      doc.setTextColor(90)
      doc.text('Ditagihkan kepada:', 20, y)
      doc.setTextColor(30)
      doc.setFont('helvetica', 'bold')
      doc.text(inv.patientName, 20, y + 6)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120)
      doc.text(`Kode Booking: ${inv.bookingCode}`, 20, y + 11)

      doc.setTextColor(90)
      doc.text(`Tanggal Sesi: ${formatDate(inv.sessionDate)}`, 190, y + 6, { align: 'right' })
      doc.text(`Status: ${getPaymentStatusLabel(inv.paymentStatus)}`, 190, y + 11, { align: 'right' })

      // Tabel item
      y += 24
      doc.setFillColor(...teal)
      doc.rect(20, y, 170, 9, 'F')
      doc.setTextColor(255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Deskripsi', 24, y + 6)
      doc.text('Jumlah', 186, y + 6, { align: 'right' })

      y += 9
      doc.setTextColor(40)
      doc.setFont('helvetica', 'normal')
      doc.rect(20, y, 170, 12)
      doc.text(`${inv.serviceName}`, 24, y + 5)
      doc.setTextColor(120)
      doc.setFontSize(8)
      doc.text(`Terapis: ${inv.therapistName}`, 24, y + 9)
      doc.setTextColor(40)
      doc.setFontSize(10)
      doc.text(formatRupiah(inv.amount), 186, y + 7, { align: 'right' })

      // Total
      y += 18
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(90)
      if (inv.discount > 0) {
        doc.text('Diskon', 140, y, { align: 'right' })
        doc.text(`- ${formatRupiah(inv.discount)}`, 186, y, { align: 'right' })
        y += 6
      }
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...teal)
      doc.text('TOTAL', 140, y + 2, { align: 'right' })
      doc.text(formatRupiah(inv.total), 186, y + 2, { align: 'right' })

      if (inv.paymentMethod) {
        y += 12
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(120)
        doc.text(`Metode pembayaran: ${getPaymentMethodLabel(inv.paymentMethod)}`, 20, y)
        if (inv.paidAt) doc.text(`Dibayar: ${formatDate(inv.paidAt)}`, 20, y + 5)
      }

      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text('Terima kasih atas kepercayaan Anda. Invoice ini sah tanpa tanda tangan.', 105, 280, { align: 'center' })

      doc.save(`${inv.invoiceNumber.replace(/\//g, '-')}.pdf`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-start justify-between bg-gradient-to-br from-teal-600 to-emerald-600 p-6 text-white">
          <div>
            <p className="text-lg font-extrabold">{inv.clinicName}</p>
            <p className="mt-0.5 text-xs text-teal-100">{inv.clinicAddress}</p>
            <p className="text-xs text-teal-100">Telp: {inv.clinicPhone}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold tracking-wide">INVOICE</p>
            <p className="text-xs text-teal-100">{inv.invoiceNumber}</p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap justify-between gap-4 border-b border-gray-100 pb-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">Ditagihkan kepada</p>
              <p className="font-bold text-gray-900">{inv.patientName}</p>
              <p className="text-xs text-gray-500">Kode: {inv.bookingCode}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Tanggal Sesi</p>
              <p className="font-medium text-gray-900">{formatDate(inv.sessionDate)}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${inv.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {getPaymentStatusLabel(inv.paymentStatus)}
              </span>
            </div>
          </div>

          <div className="py-4">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">{inv.serviceName}</p>
                <p className="text-xs text-gray-500">Terapis: {inv.therapistName}</p>
              </div>
              <p className="font-semibold text-gray-900">{formatRupiah(inv.amount)}</p>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-gray-100 pt-4 text-sm">
            {inv.discount > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Diskon</span><span>- {formatRupiah(inv.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-teal-700">
              <span>TOTAL</span><span>{formatRupiah(inv.total)}</span>
            </div>
            {inv.paymentMethod && (
              <p className="pt-2 text-xs text-gray-400">
                Metode: {getPaymentMethodLabel(inv.paymentMethod)}
                {inv.paidAt && ` · Dibayar ${formatDate(inv.paidAt)}`}
              </p>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={download}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:bg-teal-700 disabled:opacity-60 sm:w-auto"
      >
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan…</> : <><Download className="h-4 w-4" /> Download Invoice PDF</>}
      </button>
    </div>
  )
}
