'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { HandCoins, Loader2, Landmark } from 'lucide-react'
import { formatThousands } from '@/lib/utils'
import { saveBookingFee, type PengaturanResult } from '@/app/owner/pengaturan/actions'

export function PengaturanBooking({
  initialFee,
  initialBank = '',
  initialAccountName = '',
  initialAccountNumber = '',
}: {
  initialFee: number
  initialBank?: string
  initialAccountName?: string
  initialAccountNumber?: string
}) {
  const [state, action, saving] = useActionState<PengaturanResult | null, FormData>(saveBookingFee, null)
  const [fee, setFee] = useState(initialFee > 0 ? formatThousands(initialFee) : '')
  const [bank, setBank] = useState(initialBank)
  const [accName, setAccName] = useState(initialAccountName)
  const [accNo, setAccNo] = useState(initialAccountNumber)

  useEffect(() => {
    if (!state) return
    if (state.error) toast.error(state.error)
    else if (state.info) toast.success(state.info)
  }, [state])

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
          <HandCoins className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">Komitmen Fee Booking Online</h2>
          <p className="text-xs text-gray-500">Biaya komitmen yang berlaku untuk booking lewat website.</p>
        </div>
      </div>

      <form action={action} className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Nominal</label>
        <div className="flex max-w-xs items-center rounded-xl border border-gray-200 px-3 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
          <span className="text-sm font-medium text-gray-400">Rp</span>
          <input
            name="online_booking_fee"
            value={fee}
            onChange={(e) => setFee(formatThousands(e.target.value))}
            inputMode="numeric"
            placeholder="0"
            className="w-full bg-transparent px-2 py-2.5 text-sm font-semibold text-gray-900 outline-none"
          />
        </div>
        <p className="text-xs text-gray-400">
          Saat pasien booking lewat website, nominal ini tercatat pada booking. Setelah Anda/admin
          mengonfirmasi, nominal masuk ke laporan keuangan sebagai pemasukan. Isi <span className="font-mono">0</span> untuk
          menonaktifkan (booking online tanpa biaya komitmen).
        </p>

        {/* Rekening pembayaran — ditampilkan ke pasien saat booking (bisa di-copy). */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="mb-3 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-teal-600" />
            <p className="text-sm font-bold text-gray-900">Rekening Pembayaran</p>
          </div>
          <p className="mb-3 text-xs text-gray-400">
            Ditampilkan ke pasien saat booking (bisa disalin) untuk transfer komitmen fee. Kosongkan bila tidak dipakai.
          </p>
          <div className="grid max-w-xl gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Bank / E-wallet</span>
              <input name="payment_bank" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="BCA"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Nama Pemilik</span>
              <input name="payment_account_name" value={accName} onChange={(e) => setAccName(e.target.value)} placeholder="Klinik Sehat"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">No. Rekening</span>
              <input name="payment_account_number" value={accNo} onChange={(e) => setAccNo(e.target.value)} inputMode="numeric" placeholder="1234567890"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:bg-teal-700 disabled:opacity-60"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</> : 'Simpan'}
        </button>
      </form>
    </div>
  )
}
