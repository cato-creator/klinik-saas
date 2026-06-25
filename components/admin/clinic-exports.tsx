'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { downloadXlsx } from '@/lib/xlsx-client'
import type { ExportResponse } from '@/lib/xlsx-spec'
import ExcelDownloadLink from '@/components/ui/excel-download-link'

// Tombol export untuk super admin di detail klinik:
//  - Laporan keuangan: unduhan langsung (GET).
//  - Data pasien + rekam medis: butuh ALASAN (modal) lalu POST → blob, karena
//    menembus default privasi & SELALU dicatat ke audit_logs di server.
export default function ClinicExports({ clinicId, clinicName }: { clinicId: string; clinicName: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function downloadPatients() {
    setError(null)
    if (reason.trim().length < 3) {
      setError('Tulis alasan singkat dulu (mis. "Permintaan owner untuk pindah sistem").')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/pasien/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: clinicId, reason: reason.trim() }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Gagal mengunduh.')
      }
      // Server balas spec JSON; browser merakit .xlsx (lib/xlsx-client.ts).
      const data = (await res.json()) as ExportResponse
      await downloadXlsx(data.spec, data.filename)
      setOpen(false)
      setReason('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengunduh.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <ExcelDownloadLink
          href={`/api/admin/laporan/export?clinic_id=${clinicId}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          ⬇ Laporan keuangan (Excel)
        </ExcelDownloadLink>
        <button
          type="button"
          onClick={() => { setError(null); setOpen(true) }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          ⬇ Data pasien + rekam medis
        </button>
      </div>

      <Modal open={open} onClose={() => !loading && setOpen(false)} title="Export data pasien + rekam medis" size="md">
        <div className="space-y-4 text-sm">
          <div className="rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <p className="font-medium">Akses data sensitif</p>
            <p className="mt-1 text-xs">
              File berisi identitas pasien beserta catatan medis (SOAP & anamnesis) klinik
              <span className="font-medium"> {clinicName}</span>. Hanya untuk serah-terima data
              atas permintaan pemilik klinik. Aktivitas ini dicatat (audit log).
            </p>
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-200">
              Alasan export <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Contoh: Permintaan owner Klinik X untuk migrasi ke sistem lain (WA 21 Jun)."
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={downloadPatients}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? 'Menyiapkan…' : 'Unduh Excel'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
