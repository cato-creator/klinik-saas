import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { apiTenant } from '@/lib/tenant/api'
import { sStr as S, sNum as N, type XlsxCell as Cell } from '@/lib/xlsx-spec'

// Export Excel "Data Pasien" = daftar KUNJUNGAN terkonfirmasi (1 baris per booking).
// Kolom: No, No. RM, Nama, Tgl Kunjungan, Diagnosa (dari field Assessment pada CPPT
// = session_notes.assessment kunjungan tsb). Diurut dari tanggal terkecil.
// HANYA booking aktif/terkonfirmasi (confirmed/in_progress/completed) — booking
// 'pending' belum dikonfirmasi & 'cancelled' (batal) TIDAK dimasukkan. Reschedule
// memindah session_date di tempat, jadi otomatis muncul di tanggal barunya saja.
// Server kirim spec JSON; browser merakit .xlsx (lib/xlsx-client.ts).

function dstr(d: string | null | undefined): string {
  if (!d) return ''
  const s = String(d).slice(0, 10)
  const [y, m, day] = s.split('-')
  if (!y || !m || !day) return s
  return `${day}/${m}/${y}`
}

export async function GET() {
  const auth = await apiTenant(['admin', 'owner'])
  if (!auth.ok) return auth.res
  const clinicId = auth.clinicId
  const db = createServiceClient()

  async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
    const size = 1000
    const all: T[] = []
    for (let from = 0; ; from += size) {
      const { data } = await build(from, from + size - 1)
      if (data?.length) all.push(...data)
      if (!data || data.length < size) break
    }
    return all
  }

  const bookings = await fetchAll<Record<string, unknown>>((from, to) =>
    db.from('bookings')
      .select('session_date, session_time, status, patient:patients(medical_record_no, full_name), session_notes(assessment, created_at, deleted_at)')
      .eq('clinic_id', clinicId)
      .in('status', ['confirmed', 'in_progress', 'completed'])
      .order('session_date', { ascending: true })
      .order('session_time', { ascending: true })
      .range(from, to))

  // Urutkan dari tanggal terkecil (jaminan, walau query sudah ascending).
  bookings.sort((a, b) => {
    const da = String(a.session_date ?? ''), db2 = String(b.session_date ?? '')
    if (da !== db2) return da < db2 ? -1 : 1
    return String(a.session_time ?? '') < String(b.session_time ?? '') ? -1 : 1
  })

  const head = ['No', 'No. RM', 'Nama Pasien', 'Tgl Kunjungan', 'Diagnosa']
  const rows: Cell[][] = [head.map(S)]
  bookings.forEach((b, i) => {
    const patient = b.patient as { medical_record_no?: string; full_name?: string } | null
    // Diagnosa = Assessment (A) pada CPPT kunjungan ini. Ambil catatan TERBARU
    // (belum dihapus) yang punya isi assessment.
    const notes = (b.session_notes as Array<{ assessment?: string | null; created_at?: string; deleted_at?: string | null }> | null) ?? []
    const diag = notes
      .filter((n) => !n.deleted_at && (n.assessment ?? '').trim())
      .sort((x, y) => (String(x.created_at ?? '') < String(y.created_at ?? '') ? 1 : -1))[0]?.assessment ?? ''
    // No. RM tampil berpadding nol (mis. 000001), TANPA prefix "RM-". Sebagai
    // teks agar nol depan tidak hilang di Excel.
    const rmDigits = String(patient?.medical_record_no ?? '').replace(/\D/g, '')
    rows.push([
      N(i + 1),
      S(rmDigits ? rmDigits.padStart(6, '0') : ''),
      S(patient?.full_name ?? ''),
      S(dstr(b.session_date as string)),
      S(diag),
    ])
  })

  return NextResponse.json({
    filename: `Data-Pasien-${new Date().toISOString().slice(0, 10)}.xlsx`,
    spec: {
      sheets: [{
        name: 'Data Pasien',
        rows,
        cols: [{ wch: 5 }, { wch: 14 }, { wch: 26 }, { wch: 14 }, { wch: 48 }],
      }],
    },
  })
}
