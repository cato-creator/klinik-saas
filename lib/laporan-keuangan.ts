// Builder workbook Laporan Keuangan klinik (multi-sheet + rumus hidup), dipakai
// bersama oleh owner (/api/owner/laporan/export) dan super admin
// (/api/admin/laporan/export). Membangun WorkbookSpec (JSON netral) — perakitan
// jadi .xlsx dilakukan di BROWSER (lib/xlsx-client.ts) supaya `xlsx` tidak ikut ke
// bundle Cloudflare Worker. WAJIB difilter clinic_id.
import type { SupabaseClient } from '@supabase/supabase-js'
import { PENDAPATAN_AKUN, BEBAN_AKUN, BEBAN_LABA, BULAN, EXCLUDE_LABA } from '@/lib/keuangan'
import {
  colName, sStr as S, sNum as N, sFormula as Frm, sBlank as blank,
  type XlsxCell as Cell, type XlsxColInfo, type WorkbookSpec,
} from '@/lib/xlsx-spec'

const RP = '"Rp" #,##0;[Red]-"Rp" #,##0'
const DK = "'Data Keuangan'"

function dstr(d: string | null | undefined): string {
  if (!d) return ''
  const s = String(d).slice(0, 10)
  const [y, m, day] = s.split('-')
  if (!y || !m || !day) return s
  return `${day}/${m}/${y}`
}

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

// Bangun workbook keuangan untuk satu klinik. `supabase` HARUS service client.
export async function buildKeuanganWorkbook(supabase: SupabaseClient, clinicId: string): Promise<WorkbookSpec> {
  const [keuangan, payments] = await Promise.all([
    fetchAll<Record<string, unknown>>((from, to) =>
      supabase.from('keuangan')
        .select('tanggal, keterangan, akun, jenis, payment, jumlah')
        .eq('clinic_id', clinicId)
        .order('tanggal', { ascending: true })
        .order('created_at', { ascending: true })
        .range(from, to)),
    fetchAll<Record<string, unknown>>((from, to) =>
      supabase.from('payments')
        .select('amount, method, confirmed_at, created_at, booking:bookings(booking_code, patient:patients(full_name), service_type:service_types(name), therapist:therapists(user:users(full_name)))')
        .eq('clinic_id', clinicId)
        .order('confirmed_at', { ascending: true })
        .range(from, to)),
  ])

  const sheets: WorkbookSpec['sheets'] = []

  // ── Sheet 1: Data Pembayaran ──
  const payHead = ['No', 'Tanggal', 'Kode Booking', 'Pasien', 'Terapis', 'Layanan', 'Metode', 'Jumlah']
  const payRows: Cell[][] = [payHead.map(S)]
  payments.forEach((p, i) => {
    const b = p.booking as Record<string, unknown> | null
    const patient = b?.patient as { full_name?: string } | null
    const service = b?.service_type as { name?: string } | null
    const ther = b?.therapist as { user?: { full_name?: string } } | null
    payRows.push([
      N(i + 1),
      S(dstr((p.confirmed_at as string) ?? (p.created_at as string))),
      S(String(b?.booking_code ?? '')),
      S(patient?.full_name ?? ''),
      S(ther?.user?.full_name ?? ''),
      S(service?.name ?? ''),
      S(String(p.method ?? '')),
      N(Number(p.amount ?? 0), RP),
    ])
  })
  sheets.push({ name: 'Data Pembayaran', rows: payRows, cols: [
    { wch: 5 }, { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 16 },
  ] })

  // ── Sheet 2: Data Keuangan (buku kas) + kolom bantu Bulan(K)/Tahun(L) tersembunyi ──
  const dkHead = ['No', 'Tanggal', 'Keterangan', 'Akun', 'Payment', 'Masuk', 'Keluar', 'Saldo', '', '', 'Bulan', 'Tahun']
  const dkRows: Cell[][] = [dkHead.map(S)]
  let saldo = 0
  keuangan.forEach((k, i) => {
    const masuk = k.jenis === 'masuk' ? Number(k.jumlah) : 0
    const keluar = k.jenis === 'keluar' ? Number(k.jumlah) : 0
    saldo += masuk - keluar
    const tgl = String(k.tanggal ?? '')
    dkRows.push([
      N(i + 1), S(dstr(tgl)), S((k.keterangan as string) ?? ''), S((k.akun as string) ?? ''),
      S(k.payment === 'tunai' ? 'Tunai' : 'Non Tunai'),
      masuk ? N(masuk, RP) : S(''), keluar ? N(keluar, RP) : S(''), N(saldo, RP),
      blank, blank, N(Number(tgl.slice(5, 7))), N(Number(tgl.slice(0, 4))),
    ])
  })
  sheets.push({ name: 'Data Keuangan', rows: dkRows, cols: [
    { wch: 5 }, { wch: 12 }, { wch: 34 }, { wch: 18 }, { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
    { wch: 2 }, { wch: 2 }, { wch: 8, hidden: true }, { wch: 8, hidden: true },
  ] })

  const C_MASUK = 'F', C_KELUAR = 'G', C_AKUN = 'D', C_BLN = 'K', C_THN = 'L'
  const sumifs = (col: string, akun: string, blnRef: string, thnRef: string) =>
    `SUMIFS(${DK}!$${col}:$${col},${DK}!$${C_AKUN}:$${C_AKUN},"${akun}",${DK}!$${C_BLN}:$${C_BLN},${blnRef},${DK}!$${C_THN}:$${C_THN},${thnRef})`

  const tahunSet = new Set<number>()
  keuangan.forEach((k) => tahunSet.add(Number(String(k.tanggal).slice(0, 4))))
  const tahunArr = Array.from(tahunSet).sort()
  const tahunUtama = tahunArr[tahunArr.length - 1] ?? new Date().getFullYear()

  const monthAkun: Record<string, number[]> = {}
  ;[...PENDAPATAN_AKUN, ...BEBAN_AKUN].forEach((a) => (monthAkun[a] = Array(12).fill(0)))
  let lastMonth = -1
  keuangan.forEach((k) => {
    const tgl = String(k.tanggal ?? '')
    if (Number(tgl.slice(0, 4)) !== tahunUtama) return
    const akun = k.akun as string
    if (EXCLUDE_LABA.includes(akun)) return
    const m = Number(tgl.slice(5, 7)) - 1
    if (m < 0 || m > 11) return
    if (m > lastMonth) lastMonth = m
    if (k.jenis === 'masuk') { if (PENDAPATAN_AKUN.includes(akun)) monthAkun[akun][m] += Number(k.jumlah) }
    else if (BEBAN_AKUN.includes(akun)) monthAkun[akun][m] += Number(k.jumlah)
  })
  const totAkun = (a: string) => monthAkun[a].reduce((x, y) => x + y, 0)
  const mPendArr = Array.from({ length: 12 }, (_, m) => PENDAPATAN_AKUN.reduce((s, a) => s + monthAkun[a][m], 0))
  const mBebArr = Array.from({ length: 12 }, (_, m) => BEBAN_LABA.reduce((s, a) => s + monthAkun[a][m], 0))
  const grandP = mPendArr.reduce((x, y) => x + y, 0)
  const grandB = mBebArr.reduce((x, y) => x + y, 0)
  const targetM = lastMonth >= 0 ? lastMonth : new Date().getMonth()
  const BLN = '$B$1', THN = '$B$2'

  // ── Sheet 3: Laporan Laba ──
  const ll: Cell[][] = []
  ll.push([S('Bulan'), N(targetM + 1)])
  ll.push([S('Tahun'), N(tahunUtama)])
  ll.push([blank])
  ll.push([S('Laporan Laba')])
  ll.push([blank])
  ll.push([S('Pendapatan')])
  const pStartRow = ll.length + 1
  PENDAPATAN_AKUN.forEach((a) => ll.push([S(a), Frm(sumifs(C_MASUK, a, BLN, THN), monthAkun[a][targetM], RP)]))
  const pEndRow = ll.length
  const totPv = PENDAPATAN_AKUN.reduce((s, a) => s + monthAkun[a][targetM], 0)
  ll.push([S('Total Pendapatan'), Frm(`SUM(B${pStartRow}:B${pEndRow})`, totPv, RP)])
  const totPRow = ll.length
  ll.push([blank])
  ll.push([S('Beban')])
  const bStartRow = ll.length + 1
  BEBAN_LABA.forEach((a) => ll.push([S(a), Frm(sumifs(C_KELUAR, a, BLN, THN), monthAkun[a][targetM], RP)]))
  const bEndRow = ll.length
  const totBv = BEBAN_LABA.reduce((s, a) => s + monthAkun[a][targetM], 0)
  ll.push([S('Total Beban'), Frm(`SUM(B${bStartRow}:B${bEndRow})`, totBv, RP)])
  const totBRow = ll.length
  ll.push([blank])
  const labaM = totPv - totBv
  ll.push([S('LABA/RUGI USAHA'), Frm(`B${totPRow}-B${totBRow}`, labaM, RP)])
  const labaRow = ll.length
  ll.push([S('Zakat 2.5%'), Frm(`IF(B${labaRow}>0,B${labaRow}*0.025,0)`, labaM > 0 ? labaM * 0.025 : 0, RP)])
  ll.push([blank])
  ll.push([S('Prive (di luar laba)'), Frm(sumifs(C_KELUAR, 'Prive', BLN, THN), monthAkun['Prive'][targetM], RP)])
  sheets.push({ name: 'Laporan Laba', rows: ll, cols: [{ wch: 26 }, { wch: 20 }] })

  // ── Sheet 4: Dashboard Tahunan ──
  const dt: Cell[][] = []
  dt.push([S('Dashboard Tahunan')])
  dt.push([S('Tahun'), N(tahunUtama)])
  const YR = '$B$2'
  dt.push([blank])
  dt.push([S('Total Pendapatan'), S('Total Beban'), S('Laba/Rugi Tahunan')])
  const sumRow = dt.length + 1
  const pendIncl = PENDAPATAN_AKUN.map((a) => `SUMIFS(${DK}!$${C_MASUK}:$${C_MASUK},${DK}!$${C_AKUN}:$${C_AKUN},"${a}",${DK}!$${C_THN}:$${C_THN},${YR})`).join('+')
  const bebIncl = BEBAN_LABA.map((a) => `SUMIFS(${DK}!$${C_KELUAR}:$${C_KELUAR},${DK}!$${C_AKUN}:$${C_AKUN},"${a}",${DK}!$${C_THN}:$${C_THN},${YR})`).join('+')
  dt.push([
    Frm(pendIncl, grandP, RP),
    Frm(bebIncl, grandB, RP),
    Frm(`A${sumRow}-B${sumRow}`, grandP - grandB, RP),
  ])
  dt.push([blank])

  dt.push([S('Pendapatan'), ...PENDAPATAN_AKUN.map(S)])
  const pendGridStart = dt.length + 1
  BULAN.forEach((b, m) => {
    dt.push([S(b), ...PENDAPATAN_AKUN.map((a) => Frm(sumifs(C_MASUK, a, String(m + 1), YR), monthAkun[a][m], RP))])
  })
  const pendGridEnd = dt.length
  dt.push([S('Total'), ...PENDAPATAN_AKUN.map((a, i) => {
    const col = colName(1 + i)
    return Frm(`SUM(${col}${pendGridStart}:${col}${pendGridEnd})`, totAkun(a), RP)
  })])
  dt.push([blank])

  dt.push([S('Beban'), ...BEBAN_AKUN.map(S)])
  const bebGridStart = dt.length + 1
  BULAN.forEach((b, m) => {
    dt.push([S(b), ...BEBAN_AKUN.map((a) => Frm(sumifs(C_KELUAR, a, String(m + 1), YR), monthAkun[a][m], RP))])
  })
  const bebGridEnd = dt.length
  dt.push([S('Total'), ...BEBAN_AKUN.map((a, i) => {
    const col = colName(1 + i)
    return Frm(`SUM(${col}${bebGridStart}:${col}${bebGridEnd})`, totAkun(a), RP)
  })])
  dt.push([blank])

  dt.push([S('Bulan'), S('Laba'), S('2.5%')])
  const pLastCol = colName(PENDAPATAN_AKUN.length)
  const bLastLabaCol = colName(BEBAN_LABA.length)
  let sumZak = 0
  const labaStart = dt.length + 1
  BULAN.forEach((b, m) => {
    const pr = pendGridStart + m
    const br = bebGridStart + m
    const labaVal = mPendArr[m] - mBebArr[m]
    const zak = labaVal > 0 ? labaVal * 0.025 : 0
    sumZak += zak
    const rowIdx = dt.length + 1
    dt.push([
      S(b),
      Frm(`SUM(B${pr}:${pLastCol}${pr})-SUM(B${br}:${bLastLabaCol}${br})`, labaVal, RP),
      Frm(`IF(B${rowIdx}>0,B${rowIdx}*0.025,0)`, zak, RP),
    ])
  })
  const labaEnd = dt.length
  dt.push([
    S('Total'),
    Frm(`SUM(B${labaStart}:B${labaEnd})`, grandP - grandB, RP),
    Frm(`SUM(C${labaStart}:C${labaEnd})`, sumZak, RP),
  ])
  const dtCols: XlsxColInfo[] = [{ wch: 14 }]
  for (let i = 0; i < Math.max(PENDAPATAN_AKUN.length, BEBAN_AKUN.length); i++) dtCols.push({ wch: 16 })
  sheets.push({ name: 'Dashboard Tahunan', rows: dt, cols: dtCols })

  return { sheets, calcOnLoad: true }
}
