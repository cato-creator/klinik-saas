// Model buku kas (keuangan) klinik — diadaptasi dari "Villa Melting".
// Sumber tunggal Arus Kas, Laba Rugi, dan Laporan Tahunan. Pemasukan otomatis dari
// `payments` (trigger DB), pengeluaran/pemasukan lain diinput owner. Semua query
// memakai service client → WAJIB difilter clinic_id agar tidak bocor lintas klinik.
import type { SupabaseClient } from '@supabase/supabase-js'

export interface KeuanganRowLap {
  no: number
  id: string
  tanggal: string
  keterangan: string
  akun: string
  jenis: 'masuk' | 'keluar'
  payment: string | null
  jumlah: number
  saldo: number
  is_auto: boolean
  created_at: string
}

// Akun pendapatan & beban (sama dengan sheet klien Villa Melting — generik & cukup
// untuk klinik). 'Pendapatan Jasa' = pemasukan dari sesi terapi (auto dari payments).
export const PENDAPATAN_AKUN = ['Pendapatan Jasa', 'Pendapatan Bunga', 'Pendapatan Lain-Lain']
export const BEBAN_AKUN = [
  'Beban Gaji', 'Beban Utilitas', 'Beban Peralatan', 'Beban Perawatan',
  'Beban Perlengkapan', 'Beban Iklan', 'Beban Lain-Lain', 'Beban Administrasi', 'Prive',
]
// Dicatat di arus kas tapi DIKECUALIKAN dari Laba: Saldo Awal (pembuka), Zakat (dihitung terpisah).
export const EXCLUDE_LABA = ['Saldo Awal', 'Zakat']
// Prive (penarikan pribadi owner) BUKAN beban usaha → dikecualikan dari Total Beban & Laba,
// tetap ditampilkan terpisah untuk transparansi.
export const BEBAN_LABA = BEBAN_AKUN.filter((a) => a !== 'Prive')
// Daftar akun untuk dropdown form.
export const AKUN_KATEGORI = [...PENDAPATAN_AKUN, ...BEBAN_AKUN]

export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// Ambil SEMUA baris buku kas 1 klinik (pagination batch — PostgREST max 1000/req),
// kronologis (tanggal lalu created_at), dengan saldo berjalan dihitung lintas waktu.
// `missing` = true bila tabel belum ada (migrasi 0008 belum dijalankan).
export async function loadKeuanganRows(
  db: SupabaseClient,
  clinicId: string,
): Promise<{ rows: KeuanganRowLap[]; missing: boolean }> {
  const size = 1000
  const all: Array<Record<string, unknown>> = []
  for (let from = 0; ; from += size) {
    const { data, error } = await db
      .from('keuangan')
      .select('id, tanggal, keterangan, akun, jenis, payment, jumlah, is_auto, created_at')
      .eq('clinic_id', clinicId)
      .order('tanggal', { ascending: true })
      .order('created_at', { ascending: true })
      .range(from, from + size - 1)
    if (error) {
      if (/relation .* does not exist|could not find the table|schema cache/i.test(error.message)) {
        return { rows: [], missing: true }
      }
      throw error
    }
    if (data?.length) all.push(...data)
    if (!data || data.length < size) break
  }

  let saldo = 0
  const rows = all.map((k, i) => {
    const jumlah = Number(k.jumlah ?? 0)
    saldo += k.jenis === 'masuk' ? jumlah : -jumlah
    return {
      no: i + 1,
      id: k.id as string,
      tanggal: k.tanggal as string,
      keterangan: (k.keterangan as string) ?? '',
      akun: (k.akun as string) ?? '',
      jenis: k.jenis as 'masuk' | 'keluar',
      payment: (k.payment as string) ?? null,
      jumlah,
      saldo,
      is_auto: Boolean(k.is_auto),
      created_at: (k.created_at as string) ?? '',
    }
  })
  return { rows, missing: false }
}
