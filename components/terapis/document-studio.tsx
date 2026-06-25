'use client'

// ============================================================
// DOCUMENT STUDIO — panel terapis
// Dua dokumen siap cetak (kop surat atas nama klinik):
//   1. SURAT KETERANGAN SAKIT — input: nama pasien, jumlah hari, tanggal mulai
//      (tanggal selesai dihitung otomatis), + opsional umur/alamat/diagnosa.
//   2. KWITANSI (reimburse) — input: jumlah rupiah (+ opsional pembayar/keterangan).
// Tidak disimpan ke DB — langsung dibuat & dicetak/disimpan PDF lewat window.print().
// ============================================================

import { useMemo, useState } from 'react'
import { FileText, Receipt, Printer, Stethoscope } from 'lucide-react'
import { formatRupiah, terbilang, formatDateLong } from '@/lib/format'

export type DocClinic = {
  name: string
  address: string | null
  phone_number: string | null
  logo_url: string | null
}
export type DocTherapist = {
  full_name: string
  str_number: string | null
  signature_url: string | null
}

type Mode = 'sakit' | 'kwitansi'

const inputCls =
  'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'
const labelCls = 'mb-1 block text-sm font-semibold text-gray-800'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function todayISO(): string {
  const d = new Date()
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return tz.toISOString().slice(0, 10)
}

/* ============================================================
   KOP SURAT (letterhead) — dipakai kedua dokumen
   ============================================================ */
function Letterhead({ clinic }: { clinic: DocClinic }) {
  return (
    <div className="relative border-b-[3px] border-gray-800 pb-3">
      <div className="flex items-center justify-center gap-4">
        {clinic.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clinic.logo_url} alt={clinic.name} className="absolute left-0 top-0 h-16 w-16 rounded object-contain" />
        ) : (
          <span className="absolute left-0 top-0 flex h-16 w-16 items-center justify-center rounded-xl bg-teal-600 text-white">
            <Stethoscope className="h-8 w-8" />
          </span>
        )}
        <div className="px-20 text-center">
          <h2 className="text-xl font-extrabold uppercase tracking-wide text-gray-900 sm:text-2xl">{clinic.name}</h2>
          {clinic.address && <p className="mt-1 text-xs leading-snug text-gray-700">{clinic.address}</p>}
          {clinic.phone_number && <p className="text-xs text-gray-700">Telp/WA: {clinic.phone_number}</p>}
        </div>
      </div>
    </div>
  )
}

function SignatureBlock({
  therapist, place, dateISO, role,
}: { therapist: DocTherapist; place: string; dateISO: string; role: string }) {
  return (
    <div className="mt-8 flex justify-end">
      <div className="w-64 text-center text-sm text-gray-800">
        <p>{place ? `${place}, ` : ''}{formatDateLong(dateISO)}</p>
        <p className="mt-0.5">{role}</p>
        {therapist.signature_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={therapist.signature_url} alt="Tanda tangan" className="mx-auto my-1 h-16 object-contain" />
        ) : (
          <div className="h-16" />
        )}
        <p className="font-bold underline">{therapist.full_name}</p>
        {therapist.str_number && <p className="text-xs text-gray-600">STR: {therapist.str_number}</p>}
      </div>
    </div>
  )
}

/* ============================================================
   DOKUMEN: SURAT KETERANGAN SAKIT
   ============================================================ */
function SuratSakit({ clinic, therapist }: { clinic: DocClinic; therapist: DocTherapist }) {
  const [nama, setNama] = useState('')
  const [umur, setUmur] = useState('')
  const [alamat, setAlamat] = useState('')
  const [jenisKelamin, setJenisKelamin] = useState('')
  const [diagnosa, setDiagnosa] = useState('')
  const [hari, setHari] = useState('1')
  const [mulai, setMulai] = useState(todayISO())
  const [noSurat, setNoSurat] = useState('')
  const [tempat, setTempat] = useState('')

  const days = Math.max(1, parseInt(hari || '1', 10) || 1)
  const selesaiISO = useMemo(() => {
    if (!mulai) return ''
    return addDays(new Date(mulai), days - 1).toISOString().slice(0, 10)
  }, [mulai, days])

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      {/* FORM */}
      <div className="no-print space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-gray-900">Data Surat Keterangan Sakit</p>
        <div>
          <label className={labelCls}>Nama Pasien <span className="text-red-500">*</span></label>
          <input className={inputCls} value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap pasien" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Umur</label>
            <input className={inputCls} value={umur} onChange={(e) => setUmur(e.target.value)} placeholder="mis. 25 tahun" />
          </div>
          <div>
            <label className={labelCls}>Jenis Kelamin</label>
            <select className={inputCls} value={jenisKelamin} onChange={(e) => setJenisKelamin(e.target.value)}>
              <option value="">—</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Alamat</label>
          <input className={inputCls} value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Opsional" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Istirahat (hari) <span className="text-red-500">*</span></label>
            <input type="number" min={1} className={inputCls} value={hari} onChange={(e) => setHari(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Tanggal mulai <span className="text-red-500">*</span></label>
            <input type="date" className={inputCls} value={mulai} onChange={(e) => setMulai(e.target.value)} />
          </div>
        </div>
        <p className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-medium text-teal-700">
          Sampai dengan: {selesaiISO ? formatDateLong(selesaiISO) : '—'} ({days} hari)
        </p>
        <div>
          <label className={labelCls}>Diagnosa / Keterangan</label>
          <input className={inputCls} value={diagnosa} onChange={(e) => setDiagnosa(e.target.value)} placeholder="Opsional, mis. ISPA" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>No. Surat</label>
            <input className={inputCls} value={noSurat} onChange={(e) => setNoSurat(e.target.value)} placeholder="Opsional" />
          </div>
          <div>
            <label className={labelCls}>Tempat</label>
            <input className={inputCls} value={tempat} onChange={(e) => setTempat(e.target.value)} placeholder="mis. Jakarta" />
          </div>
        </div>
        <button onClick={() => window.print()} disabled={!nama}
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:opacity-50">
          <Printer className="h-4 w-4" /> Cetak / Simpan PDF
        </button>
        {!nama && <p className="text-center text-xs text-gray-400">Isi nama pasien dulu untuk mencetak.</p>}
      </div>

      {/* PREVIEW (area cetak) */}
      <div className="overflow-x-auto">
        <div id="cetak-dokumen" className="mx-auto min-h-[26rem] w-full max-w-[800px] bg-white p-8 font-serif text-gray-900 shadow-lg ring-1 ring-gray-200 sm:p-12">
          <Letterhead clinic={clinic} />

          <h1 className="mt-6 text-center text-lg font-bold uppercase underline">Surat Keterangan Sakit</h1>
          {noSurat && <p className="mt-1 text-center text-sm">No: {noSurat}</p>}

          <div className="mt-6 space-y-3 text-sm leading-relaxed">
            <p>Yang bertanda tangan di bawah ini, terapis pada {clinic.name}, menerangkan bahwa:</p>
            <table className="ml-2">
              <tbody>
                <tr><td className="py-0.5 pr-3 align-top">Nama</td><td className="py-0.5 pr-2 align-top">:</td><td className="py-0.5 font-semibold">{nama || '..............................'}</td></tr>
                {umur && <tr><td className="py-0.5 pr-3 align-top">Umur</td><td className="py-0.5 pr-2 align-top">:</td><td className="py-0.5">{umur}</td></tr>}
                {jenisKelamin && <tr><td className="py-0.5 pr-3 align-top">Jenis Kelamin</td><td className="py-0.5 pr-2 align-top">:</td><td className="py-0.5">{jenisKelamin}</td></tr>}
                {alamat && <tr><td className="py-0.5 pr-3 align-top">Alamat</td><td className="py-0.5 pr-2 align-top">:</td><td className="py-0.5">{alamat}</td></tr>}
              </tbody>
            </table>
            <p>
              Berdasarkan hasil pemeriksaan, pasien tersebut dalam keadaan kurang sehat sehingga dianjurkan untuk
              beristirahat selama <span className="font-bold">{days} ({terbilang(days)}) hari</span>, terhitung mulai
              tanggal <span className="font-bold">{formatDateLong(mulai)}</span> sampai dengan
              tanggal <span className="font-bold">{selesaiISO ? formatDateLong(selesaiISO) : '—'}</span>.
            </p>
            {diagnosa && <p>Diagnosa/keterangan: <span className="font-semibold">{diagnosa}</span>.</p>}
            <p>Demikian surat keterangan ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.</p>
          </div>

          <SignatureBlock therapist={therapist} place={tempat} dateISO={mulai} role="Terapis," />
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   DOKUMEN: KWITANSI (reimburse)
   ============================================================ */
function Kwitansi({ clinic, therapist }: { clinic: DocClinic; therapist: DocTherapist }) {
  const [amountStr, setAmountStr] = useState('')
  const [pembayar, setPembayar] = useState('')
  const [keterangan, setKeterangan] = useState('Layanan terapi')
  const [noKwitansi, setNoKwitansi] = useState('')
  const [tanggal, setTanggal] = useState(todayISO())
  const [tempat, setTempat] = useState('')

  const amount = parseInt(amountStr.replace(/\D/g, '') || '0', 10)
  const amountGrouped = amount ? amount.toLocaleString('id-ID') : ''
  const terbilangText = useMemo(() => {
    const t = terbilang(amount)
    return t.charAt(0).toUpperCase() + t.slice(1) + ' rupiah'
  }, [amount])

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      {/* FORM */}
      <div className="no-print space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-gray-900">Data Kwitansi</p>
        <div>
          <label className={labelCls}>Jumlah (Rp) <span className="text-red-500">*</span></label>
          <input inputMode="numeric" className={inputCls} value={amountGrouped}
            onChange={(e) => setAmountStr(e.target.value)} placeholder="mis. 150.000" />
          {amount > 0 && <p className="mt-1 text-xs italic text-gray-500">{terbilangText}</p>}
        </div>
        <div>
          <label className={labelCls}>Diterima dari</label>
          <input className={inputCls} value={pembayar} onChange={(e) => setPembayar(e.target.value)} placeholder="Opsional, nama pembayar" />
        </div>
        <div>
          <label className={labelCls}>Untuk pembayaran</label>
          <input className={inputCls} value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="mis. Layanan terapi" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>No. Kwitansi</label>
            <input className={inputCls} value={noKwitansi} onChange={(e) => setNoKwitansi(e.target.value)} placeholder="Opsional" />
          </div>
          <div>
            <label className={labelCls}>Tanggal</label>
            <input type="date" className={inputCls} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Tempat</label>
          <input className={inputCls} value={tempat} onChange={(e) => setTempat(e.target.value)} placeholder="mis. Jakarta" />
        </div>
        <button onClick={() => window.print()} disabled={amount <= 0}
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:opacity-50">
          <Printer className="h-4 w-4" /> Cetak / Simpan PDF
        </button>
        {amount <= 0 && <p className="text-center text-xs text-gray-400">Isi jumlah dulu untuk mencetak.</p>}
      </div>

      {/* PREVIEW (area cetak) */}
      <div className="overflow-x-auto">
        <div id="cetak-dokumen" className="mx-auto min-h-[22rem] w-full max-w-[800px] bg-white p-8 font-serif text-gray-900 shadow-lg ring-1 ring-gray-200 sm:p-12">
          <Letterhead clinic={clinic} />

          <div className="mt-5 flex items-center justify-between">
            <h1 className="text-lg font-bold uppercase tracking-wide">Kwitansi</h1>
            {noKwitansi && <p className="text-sm">No: {noKwitansi}</p>}
          </div>

          <div className="mt-5 space-y-3 text-sm leading-relaxed">
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="w-44 py-1 align-top">Telah diterima dari</td>
                  <td className="py-1 pr-2 align-top">:</td>
                  <td className="py-1 font-semibold">{pembayar || '..............................'}</td>
                </tr>
                <tr>
                  <td className="py-1 align-top">Uang sejumlah</td>
                  <td className="py-1 pr-2 align-top">:</td>
                  <td className="py-1 italic">{amount > 0 ? terbilangText : '..............................'}</td>
                </tr>
                <tr>
                  <td className="py-1 align-top">Untuk pembayaran</td>
                  <td className="py-1 pr-2 align-top">:</td>
                  <td className="py-1">{keterangan || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 inline-block rounded-lg border-2 border-gray-800 px-5 py-2 text-lg font-extrabold">
            {formatRupiah(amount)}
          </div>

          <SignatureBlock therapist={therapist} place={tempat} dateISO={tanggal} role="Penerima," />
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   STUDIO (pemilih dokumen + style cetak)
   ============================================================ */
export function DocumentStudio({ clinic, therapist }: { clinic: DocClinic; therapist: DocTherapist }) {
  const [mode, setMode] = useState<Mode>('sakit')

  return (
    <div className="space-y-5">
      {/* CSS cetak: hanya #cetak-dokumen yang tampil saat print. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #cetak-dokumen, #cetak-dokumen * { visibility: visible !important; }
          #cetak-dokumen {
            position: absolute; left: 0; top: 0; width: 100%;
            box-shadow: none !important; --tw-ring-shadow: 0 0 #0000 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          @page { size: A4; margin: 16mm; }
        }
      `}</style>

      <div className="no-print flex flex-wrap gap-2">
        <button onClick={() => setMode('sakit')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${mode === 'sakit' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}>
          <FileText className="h-4 w-4" /> Surat Keterangan Sakit
        </button>
        <button onClick={() => setMode('kwitansi')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${mode === 'kwitansi' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}>
          <Receipt className="h-4 w-4" /> Kwitansi (Reimburse)
        </button>
      </div>

      {mode === 'sakit'
        ? <SuratSakit clinic={clinic} therapist={therapist} />
        : <Kwitansi clinic={clinic} therapist={therapist} />}
    </div>
  )
}
