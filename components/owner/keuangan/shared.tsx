'use client'

// Komponen keuangan owner (Arus Kas, Laba Rugi, Laporan Tahunan) — diadaptasi dari
// "Villa Melting" ke model klinik (clinic_id, sumber pemasukan = payments). Tampilan
// modern: kartu KPI gradient, tabel sticky, donut/area chart SVG, modal tambah transaksi.
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { fetchAndDownloadXlsx } from '@/lib/xlsx-client'
import {
  Download, Plus, X, Loader2, Trash2, Pencil, AlertTriangle, Search,
  ArrowDownCircle, ArrowUpCircle, Wallet, PiggyBank,
  TrendingUp, TrendingDown, Scale, Percent, BarChart3, type LucideIcon,
  ChevronLeft, ChevronRight, ChevronDown,
} from 'lucide-react'
import { formatRupiah, formatTanggalPendek, cn } from '@/lib/utils'
import {
  type KeuanganRowLap, PENDAPATAN_AKUN, BEBAN_AKUN, BEBAN_LABA, BULAN, EXCLUDE_LABA,
} from '@/lib/keuangan'

// ── kelas tabel MODERN — header lengket, baris zebra, border tipis ──
const TH = 'sticky top-0 z-10 bg-slate-50/95 backdrop-blur px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200 whitespace-nowrap text-left'
const TD = 'px-3 py-2.5 text-sm text-slate-700 whitespace-nowrap'
const TROW = 'border-b border-slate-100 even:bg-slate-50/40 hover:bg-emerald-50/40 transition-colors'
const TTOTAL = 'px-3 py-2.5 text-sm font-bold text-slate-800 whitespace-nowrap bg-emerald-50/70'

// ═══════════════ KOMPONEN VISUAL BERSAMA ═══════════════
type Tone = 'emerald' | 'rose' | 'indigo' | 'amber' | 'slate'
const TONE_CARD: Record<Tone, string> = {
  emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
  rose: 'from-rose-500 to-red-600 shadow-rose-500/25',
  indigo: 'from-indigo-500 to-violet-600 shadow-indigo-500/25',
  amber: 'from-amber-500 to-orange-500 shadow-amber-500/25',
  slate: 'from-slate-700 to-slate-900 shadow-slate-500/25',
}

export function StatCard({ label, value, icon: Icon, tone = 'emerald', sub, spark }: {
  label: string; value: number; icon: LucideIcon; tone?: Tone; sub?: string; spark?: number[]
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl p-4 sm:p-5 text-white bg-gradient-to-br shadow-lg', TONE_CARD[tone])}>
      <div className="absolute -right-5 -top-5 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-2 bottom-2 w-16 h-16 rounded-full bg-white/5" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-white/80">{label}</p>
          <p className="text-base sm:text-xl lg:text-2xl font-bold tabular-nums mt-1 break-words leading-tight">{formatRupiah(value)}</p>
          {sub && <p className="text-[11px] text-white/75 mt-1">{sub}</p>}
        </div>
        <div className="p-1.5 sm:p-2 rounded-xl bg-white/15 backdrop-blur flex-shrink-0"><Icon size={18} /></div>
      </div>
      {spark && spark.length > 1 && <Sparkline values={spark} />}
    </div>
  )
}

function Sparkline({ values }: { values: number[] }) {
  const W = 200, H = 30
  const min = Math.min(...values, 0), max = Math.max(...values, 1)
  const range = max - min || 1
  const x = (i: number) => (i / (values.length - 1)) * W
  const y = (v: number) => H - 2 - ((v - min) / range) * (H - 4)
  const path = values.map((v, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${path} L ${W} ${H} L 0 ${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="relative w-full h-7 mt-3" preserveAspectRatio="none">
      <path d={area} fill="white" fillOpacity={0.12} />
      <path d={path} fill="none" stroke="white" strokeOpacity={0.85} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function Pagination({ page, totalPages, total, onPage }: {
  page: number; totalPages: number; total: number; onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null
  const from = (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)
  const btn = 'p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition'
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/60">
      <span className="text-xs text-slate-500">{from}–{to} dari {total.toLocaleString('id-ID')}</span>
      <div className="flex items-center gap-1.5">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className={btn}><ChevronLeft size={16} /></button>
        <span className="text-xs font-medium text-slate-600 px-2 tabular-nums">Hal {page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className={btn}><ChevronRight size={16} /></button>
      </div>
    </div>
  )
}

const HERO_ICON: Record<string, LucideIcon> = { wallet: Wallet, trending: TrendingUp, chart: BarChart3 }
export function PageHero({ icon, title, subtitle, children }: {
  icon: keyof typeof HERO_ICON; title: string; subtitle: string; children?: React.ReactNode
}) {
  const Icon = HERO_ICON[icon] ?? Wallet
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 px-5 sm:px-7 py-6 mb-6 shadow-lg shadow-emerald-500/20">
      <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10" />
      <div className="absolute right-24 -bottom-8 w-28 h-28 rounded-full bg-white/5" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-white/15 backdrop-blur flex-shrink-0"><Icon size={26} className="text-white" /></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">{title}</h1>
            <p className="text-emerald-50/90 text-sm mt-0.5">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

// ═══════════════ DOWNLOAD EXCEL (5 sheet, rumus hidup) ═══════════════
export function DownloadExcelButton() {
  const [downloading, setDownloading] = useState(false)
  async function downloadExcel() {
    setDownloading(true)
    try {
      // Server balas spec JSON; browser yang merakit .xlsx (lib/xlsx-client.ts).
      await fetchAndDownloadXlsx('/api/owner/laporan/export')
      toast.success('Laporan Excel berhasil diunduh')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal terhubung ke server')
    } finally {
      setDownloading(false)
    }
  }
  return (
    <button onClick={downloadExcel} disabled={downloading}
      className="flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-700 hover:bg-emerald-50 text-sm font-semibold rounded-xl transition shadow-sm disabled:opacity-60">
      {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
      Download Excel
    </button>
  )
}

// ═══════════════ ARUS KAS (Data Keuangan) ═══════════════
const PAGE_SIZE = 50

// Tampilan keterangan di Arus Kas: sembunyikan kode booking/invoice pada baris
// pembayaran otomatis biar lebih rapi. Data di DB tetap utuh (kode tidak dihapus).
function tampilKeterangan(r: KeuanganRowLap): string {
  if (r.is_auto && r.keterangan.startsWith('Pembayaran')) {
    const i = r.keterangan.indexOf(' — ')
    return i >= 0 ? `Pembayaran${r.keterangan.slice(i)}` : 'Pembayaran'
  }
  return r.keterangan
}
function recomputeKeuangan(list: KeuanganRowLap[]): KeuanganRowLap[] {
  const sorted = [...list].sort((a, b) =>
    a.tanggal !== b.tanggal
      ? (a.tanggal < b.tanggal ? -1 : 1)
      : (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0))
  let saldo = 0
  return sorted.map((r, i) => {
    saldo += r.jenis === 'masuk' ? r.jumlah : -r.jumlah
    return { ...r, no: i + 1, saldo }
  })
}

export function TabDataKeuangan({ rows: initialRows }: { rows: KeuanganRowLap[] }) {
  const [rows, setRows] = useState(initialRows)
  const [editTarget, setEditTarget] = useState<KeuanganRowLap | null>(null)
  const [q, setQ] = useState('')

  function applySaved(row: KeuanganRowLap) {
    setRows((prev) => {
      const exists = prev.some((r) => r.id === row.id)
      const next = exists ? prev.map((r) => (r.id === row.id ? row : r)) : [...prev, row]
      return recomputeKeuangan(next)
    })
  }
  const years = useMemo(() => {
    const s = new Set<string>()
    initialRows.forEach((r) => s.add(r.tanggal.slice(0, 4)))
    return Array.from(s).sort().reverse()
  }, [initialRows])
  const latestYM = useMemo(() => {
    let ym = ''
    for (const r of initialRows) { const v = r.tanggal.slice(0, 7); if (v > ym) ym = v }
    return ym || new Date().toISOString().slice(0, 7)
  }, [initialRows])
  const [tahun, setTahun] = useState(latestYM.slice(0, 4))
  const [bulan, setBulan] = useState(latestYM.slice(5, 7))
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<KeuanganRowLap | null>(null)

  const periode = !tahun ? '' : bulan ? `${tahun}-${bulan}` : tahun
  const saldoAwalDate = periode.length === 4 ? `${periode}-01-01` : `${periode}-01`

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (periode && !r.tanggal.startsWith(periode)) return false
      if (s && !(r.keterangan.toLowerCase().includes(s) || r.akun.toLowerCase().includes(s))) return false
      return true
    })
  }, [rows, periode, q])

  const saldoAwal = useMemo(() => {
    if (!periode) return null
    let s = 0
    for (const r of rows) { if (r.tanggal < saldoAwalDate) s = r.saldo; else break }
    return s
  }, [rows, periode, saldoAwalDate])

  const summary = useMemo(() => {
    let masuk = 0, keluar = 0
    filtered.forEach((r) => { if (r.jenis === 'masuk') masuk += r.jumlah; else keluar += r.jumlah })
    const saldoAkhir = filtered.length > 0 ? filtered[filtered.length - 1].saldo : (saldoAwal ?? 0)
    return { masuk, keluar, saldoAkhir }
  }, [filtered, saldoAwal])

  const display = useMemo(() => filtered.map((r, i) => ({ ...r, no: i + 1 })).reverse(), [filtered])
  const totalPages = Math.max(1, Math.ceil(display.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = useMemo(() => display.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [display, safePage])

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch('/api/owner/keuangan', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Gagal menghapus'); return }
      toast.success('Transaksi dihapus')
      setRows((prev) => recomputeKeuangan(prev.filter((r) => r.id !== deleteTarget.id)))
      setDeleteTarget(null)
    } catch { toast.error('Gagal terhubung ke server') }
  }

  return (
    <div>
      <div className={cn('grid grid-cols-2 gap-3 mb-5', saldoAwal !== null ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
        {saldoAwal !== null && <StatCard label="Saldo Awal" value={saldoAwal} icon={PiggyBank} tone="slate" />}
        <StatCard label="Total Masuk" value={summary.masuk} icon={ArrowDownCircle} tone="emerald" />
        <StatCard label="Total Keluar" value={summary.keluar} icon={ArrowUpCircle} tone="rose" />
        <StatCard label="Saldo Akhir" value={summary.saldoAkhir} icon={Wallet} tone="indigo" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Cari keterangan / akun…"
            className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400 w-full sm:w-60" />
        </div>
        <select value={tahun} onChange={(e) => { setTahun(e.target.value); setPage(1) }} className={inputSm}>
          <option value="">Semua tahun</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={bulan} onChange={(e) => { setBulan(e.target.value); setPage(1) }} disabled={!tahun}
          className={cn(inputSm, !tahun && 'opacity-50 cursor-not-allowed')}>
          <option value="">Semua bulan</option>
          {BULAN.map((b, i) => <option key={b} value={String(i + 1).padStart(2, '0')}>{b}</option>)}
        </select>
        <span className="text-xs text-slate-400">{filtered.length.toLocaleString('id-ID')} transaksi</span>
        <div className="flex-1" />
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition"><Plus size={16} /> Tambah Transaksi</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[62vh]">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={cn(TH, 'text-center')}>No</th>
                <th className={TH}>Tanggal</th>
                <th className={cn(TH, 'w-full')}>Keterangan</th>
                <th className={TH}>Akun</th>
                <th className={TH}>Payment</th>
                <th className={cn(TH, 'text-right')}>Masuk</th>
                <th className={cn(TH, 'text-right')}>Keluar</th>
                <th className={cn(TH, 'text-right')}>Saldo</th>
                <th className={cn(TH, 'pr-5')}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td className={cn(TD, 'text-center text-slate-400 py-10')} colSpan={9}>Belum ada transaksi di periode ini</td></tr>
              ) : paged.map((r) => (
                <tr key={r.id} className={TROW}>
                  <td className={cn(TD, 'text-center text-slate-400')}>{r.no}</td>
                  <td className={TD}>{fmtTgl(r.tanggal)}</td>
                  <td className={cn(TD, 'whitespace-normal')}>
                    {tampilKeterangan(r)}
                    {r.is_auto && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded-full font-medium">Auto</span>}
                  </td>
                  <td className={TD}>{r.akun}</td>
                  <td className={TD}>{r.payment === 'tunai' ? 'Tunai' : 'Non Tunai'}</td>
                  <td className={cn(TD, 'text-right text-emerald-600 font-medium')}>{r.jenis === 'masuk' ? formatRupiah(r.jumlah) : '-'}</td>
                  <td className={cn(TD, 'text-right text-rose-500 font-medium')}>{r.jenis === 'keluar' ? formatRupiah(r.jumlah) : '-'}</td>
                  <td className={cn(TD, 'text-right font-semibold')}>{formatRupiah(r.saldo)}</td>
                  <td className={cn(TD, 'text-center pr-5')}>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditTarget(r)} className="p-1 text-slate-300 hover:text-emerald-600 rounded" title="Edit"><Pencil size={14} /></button>
                      <button onClick={() => setDeleteTarget(r)} className="p-1 text-slate-300 hover:text-rose-500 rounded" title="Hapus"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {saldoAwal !== null && safePage === totalPages && (
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <td className={cn(TD, 'text-center text-slate-300')}>—</td>
                  <td className={TD}>{fmtTgl(saldoAwalDate)}</td>
                  <td className={cn(TD, 'italic text-slate-400')}>Saldo awal periode sebelumnya</td>
                  <td className={TD}>Saldo Awal</td>
                  <td className={TD}></td>
                  <td className={cn(TD, 'text-right text-slate-300')}>-</td>
                  <td className={cn(TD, 'text-right text-slate-300')}>-</td>
                  <td className={cn(TD, 'text-right font-semibold')}>{formatRupiah(saldoAwal)}</td>
                  <td className={TD}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={safePage} totalPages={totalPages} total={display.length} onPage={setPage} />
      </div>

      {showForm && <FormModal onClose={() => setShowForm(false)} onSaved={(row) => { applySaved(row); setShowForm(false) }} />}
      {editTarget && <FormModal edit={editTarget} onClose={() => setEditTarget(null)} onSaved={(row) => { applySaved(row); setEditTarget(null) }} />}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <p className="font-bold text-slate-900 mb-2">Hapus Transaksi?</p>
            <p className="text-sm text-slate-600 mb-5">{deleteTarget.keterangan} — {formatRupiah(deleteTarget.jumlah)}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Batal</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════ LABA RUGI (bulanan) ═══════════════
export function TabLaporanLaba({ rows }: { rows: KeuanganRowLap[] }) {
  const now = new Date()
  const tahunList = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => set.add(r.tanggal.slice(0, 4)))
    set.add(now.getFullYear().toString())
    return Array.from(set).sort().reverse()
  }, [rows]) // eslint-disable-line react-hooks/exhaustive-deps
  const [bulan, setBulan] = useState((now.getMonth() + 1).toString())
  const [tahun, setTahun] = useState(tahunList[0] ?? now.getFullYear().toString())

  const d = useMemo(() => {
    const prefix = `${tahun}-${bulan.padStart(2, '0')}`
    const pend: Record<string, number> = {}; const beb: Record<string, number> = {}
    PENDAPATAN_AKUN.forEach((a) => (pend[a] = 0)); BEBAN_AKUN.forEach((a) => (beb[a] = 0))
    for (const r of rows) {
      if (!r.tanggal.startsWith(prefix)) continue
      if (EXCLUDE_LABA.includes(r.akun)) continue
      if (r.jenis === 'masuk') { if (PENDAPATAN_AKUN.includes(r.akun)) pend[r.akun] += r.jumlah }
      else if (BEBAN_AKUN.includes(r.akun)) beb[r.akun] += r.jumlah
    }
    const totP = Object.values(pend).reduce((a, b) => a + b, 0)
    const totB = BEBAN_LABA.reduce((s, a) => s + beb[a], 0)
    const laba = totP - totB
    return { pend, beb, totP, totB, laba, prive: beb['Prive'] ?? 0, zakat: laba > 0 ? laba * 0.025 : 0 }
  }, [rows, bulan, tahun])

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div><label className="block text-xs text-slate-500 mb-1">Bulan</label>
          <select value={bulan} onChange={(e) => setBulan(e.target.value)} className={inputSm}>
            {BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
          </select></div>
        <div><label className="block text-xs text-slate-500 mb-1">Tahun</label>
          <select value={tahun} onChange={(e) => setTahun(e.target.value)} className={inputSm}>
            {tahunList.map((y) => <option key={y} value={y}>{y}</option>)}
          </select></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Pendapatan" value={d.totP} icon={TrendingUp} tone="emerald" />
        <StatCard label="Total Beban" value={d.totB} icon={TrendingDown} tone="rose" />
        <StatCard label="Laba / Rugi Usaha" value={d.laba} icon={Scale} tone={d.laba >= 0 ? 'indigo' : 'rose'} />
        <StatCard label="Zakat 2.5%" value={d.zakat} icon={Percent} tone="amber" />
      </div>

      <p className="text-sm font-medium text-slate-500 mb-3">Rincian — {BULAN[Number(bulan) - 1]} {tahun}</p>
      <div className="grid lg:grid-cols-2 gap-4">
        <PnlPanel title="Pendapatan" tone="emerald" accounts={PENDAPATAN_AKUN} values={d.pend} total={d.totP} />
        <PnlPanel title="Beban" tone="rose" accounts={BEBAN_LABA} values={d.beb} total={d.totB} />
      </div>

      <p className="mt-3 text-xs text-slate-400">
        <span className="font-semibold text-slate-600">Prive (di luar laba): {formatRupiah(d.prive)}</span>
        {' '}— penarikan pribadi owner, tidak dihitung sebagai beban usaha.
      </p>
    </div>
  )
}

function PnlPanel({ title, tone, accounts, values, total }: {
  title: string; tone: 'emerald' | 'rose'; accounts: string[]; values: Record<string, number>; total: number
}) {
  const dot = tone === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'
  const bar = tone === 'emerald' ? 'bg-emerald-400' : 'bg-rose-400'
  const totalText = tone === 'emerald' ? 'text-emerald-700' : 'text-rose-600'
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className={cn('w-2.5 h-2.5 rounded-full', dot)} />
          <h3 className="font-semibold text-slate-800">{title}</h3>
        </div>
        <span className={cn('font-bold tabular-nums', totalText)}>{formatRupiah(total)}</span>
      </div>
      <div className="divide-y divide-slate-50">
        {accounts.map((a) => {
          const v = values[a] ?? 0
          const pct = total > 0 ? (v / total) * 100 : 0
          return (
            <div key={a} className="px-5 py-2.5">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="text-sm text-slate-600">{a.replace(/^Pendapatan |^Beban /, '')}</span>
                <span className="text-sm text-slate-700 tabular-nums">{v > 0 ? formatRupiah(v) : '-'}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', bar)} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════ LAPORAN TAHUNAN ═══════════════
export function TabDashboardTahunan({ rows }: { rows: KeuanganRowLap[] }) {
  const tahunList = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => set.add(r.tanggal.slice(0, 4)))
    set.add(new Date().getFullYear().toString())
    return Array.from(set).sort().reverse()
  }, [rows])
  const [tahun, setTahun] = useState(tahunList[0] ?? new Date().getFullYear().toString())

  const d = useMemo(() => {
    const pend: Record<string, number[]> = {}; const beb: Record<string, number[]> = {}
    PENDAPATAN_AKUN.forEach((a) => (pend[a] = Array(12).fill(0)))
    BEBAN_AKUN.forEach((a) => (beb[a] = Array(12).fill(0)))
    for (const r of rows) {
      if (!r.tanggal.startsWith(tahun)) continue
      if (EXCLUDE_LABA.includes(r.akun)) continue
      const m = Number(r.tanggal.slice(5, 7)) - 1
      if (m < 0 || m > 11) continue
      if (r.jenis === 'masuk') { if (PENDAPATAN_AKUN.includes(r.akun)) pend[r.akun][m] += r.jumlah }
      else if (BEBAN_AKUN.includes(r.akun)) beb[r.akun][m] += r.jumlah
    }
    const totP: Record<string, number> = {}; PENDAPATAN_AKUN.forEach((a) => (totP[a] = sum(pend[a])))
    const totB: Record<string, number> = {}; BEBAN_AKUN.forEach((a) => (totB[a] = sum(beb[a])))
    const mPend = arr12((m) => PENDAPATAN_AKUN.reduce((s, a) => s + pend[a][m], 0))
    const mBeb = arr12((m) => BEBAN_LABA.reduce((s, a) => s + beb[a][m], 0))
    const grandP = sum(mPend), grandB = sum(mBeb)
    return { pend, beb, totP, totB, mPend, mBeb, grandP, grandB, laba: grandP - grandB }
  }, [rows, tahun])

  const maxBeb = Math.max(...BEBAN_LABA.map((a) => d.totB[a]), 1)

  return (
    <div>
      <div className="flex items-end gap-3 mb-4">
        <div><label className="block text-xs text-slate-500 mb-1">Tahun</label>
          <select value={tahun} onChange={(e) => setTahun(e.target.value)} className={inputSm}>
            {tahunList.map((y) => <option key={y} value={y}>{y}</option>)}
          </select></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Total Pendapatan" value={d.grandP} icon={TrendingUp} tone="emerald" spark={d.mPend} />
        <StatCard label="Total Beban" value={d.grandB} icon={TrendingDown} tone="rose" spark={d.mBeb} />
        <StatCard label="Laba / Rugi Tahunan" value={d.laba} icon={Scale} tone={d.laba >= 0 ? 'indigo' : 'rose'} spark={d.mPend.map((p, m) => p - d.mBeb[m])} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-3 text-center text-sm">Pendapatan Tahunan</h3>
          <Donut data={PENDAPATAN_AKUN.map((a, i) => ({ label: a, value: d.totP[a], color: DONUT[i] }))} total={d.grandP} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-3 text-center text-sm">Beban Tahunan</h3>
          <div className="space-y-2">
            {BEBAN_LABA.map((a) => <Bar key={a} label={a} value={d.totB[a]} max={maxBeb} />)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
        <h3 className="font-bold text-slate-800 mb-3 text-center text-sm">Laba/Rugi Tahunan</h3>
        <AreaChart values={d.mPend.map((p, m) => p - d.mBeb[m])} />
      </div>

      <Accordion title="Rincian per Bulan" subtitle="Tabel pendapatan, beban & laba untuk 12 bulan">
        <YearGrid title="Pendapatan per Bulan" akun={PENDAPATAN_AKUN} matrix={d.pend} totals={d.totP} />
        <YearGrid title="Beban per Bulan" akun={BEBAN_AKUN} matrix={d.beb} totals={d.totB} />
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-w-md">
          <p className="px-4 py-2.5 font-semibold text-slate-700 text-sm border-b border-slate-100 bg-slate-50/60">Laba & Zakat per Bulan</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className={TH}>Bulan</th><th className={cn(TH, 'text-right')}>Laba</th><th className={cn(TH, 'text-right')}>2.5%</th></tr></thead>
              <tbody>
                {BULAN.map((b, i) => {
                  const laba = d.mPend[i] - d.mBeb[i]
                  const zakat = laba > 0 ? laba * 0.025 : 0
                  return (
                    <tr key={b} className={TROW}>
                      <td className={TD}>{b}</td>
                      <td className={cn(TD, 'text-right', laba > 0 ? 'text-emerald-600' : laba < 0 ? 'text-rose-500' : 'text-slate-400')}>{laba !== 0 ? formatRupiah(laba) : '-'}</td>
                      <td className={cn(TD, 'text-right text-amber-600')}>{zakat > 0 ? formatRupiah(zakat) : '-'}</td>
                    </tr>
                  )
                })}
                <tr>
                  <td className={TTOTAL}>Total</td>
                  <td className={cn(TTOTAL, 'text-right')}>{formatRupiah(d.laba)}</td>
                  <td className={cn(TTOTAL, 'text-right')}>{formatRupiah(d.laba > 0 ? d.laba * 0.025 : 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Accordion>
    </div>
  )
}

function Accordion({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50/60 transition">
        <div className="text-left">
          <p className="font-semibold text-slate-800 text-sm">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          {open ? 'Sembunyikan' : 'Lihat'}
          <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      {open && <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100">{children}</div>}
    </div>
  )
}

function YearGrid({ title, akun, matrix, totals }: { title: string; akun: string[]; matrix: Record<string, number[]>; totals: Record<string, number> }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <p className="px-4 py-2.5 font-semibold text-slate-700 text-sm border-b border-slate-100 bg-slate-50/60">{title}</p>
      <div className="overflow-auto max-h-[60vh]">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={TH}>Bulan</th>
              {akun.map((a) => <th key={a} className={cn(TH, 'text-right')}>{a.replace(/^Pendapatan |^Beban /, '')}</th>)}
            </tr>
          </thead>
          <tbody>
            {BULAN.map((b, m) => (
              <tr key={b} className={TROW}>
                <td className={TD}>{b}</td>
                {akun.map((a) => <td key={a} className={cn(TD, 'text-right')}>{matrix[a][m] > 0 ? formatRupiah(matrix[a][m]) : '-'}</td>)}
              </tr>
            ))}
            <tr>
              <td className={TTOTAL}>Total</td>
              {akun.map((a) => <td key={a} className={cn(TTOTAL, 'text-right')}>{totals[a] > 0 ? formatRupiah(totals[a]) : '-'}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────── shared bits ───────────
const DONUT = ['#84cc16', '#f472b6', '#fb923c']
const inputSm = 'text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400 bg-white text-slate-700'
const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5'

function fmtTgl(s: string | null) { return s ? formatTanggalPendek(s) : '-' }
function sum(a: number[]) { return a.reduce((x, y) => x + y, 0) }
function arr12(fn: (m: number) => number) { return Array.from({ length: 12 }, (_, m) => fn(m)) }

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-slate-600 text-right flex-shrink-0 truncate">{label.replace('Beban ', '')}</span>
      <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden"><div className="h-full bg-[#84cc16]" style={{ width: `${pct}%` }} /></div>
      <span className="w-20 text-slate-700 tabular-nums flex-shrink-0">{value > 0 ? formatRupiah(value) : '-'}</span>
    </div>
  )
}

function Donut({ data, total }: { data: { label: string; value: number; color: string }[]; total: number }) {
  const size = 170, stroke = 30, r = (size - stroke) / 2, c = 2 * Math.PI * r
  let offset = 0
  const segs = total > 0 ? data.filter((x) => x.value > 0).map((x) => {
    const frac = x.value / total; const s = { ...x, dash: frac * c, offset }; offset += frac * c; return s
  }) : []
  return (
    <div className="flex items-center gap-5 justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
          {segs.map((s, i) => <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeDasharray={`${s.dash} ${c - s.dash}`} strokeDashoffset={-s.offset} />)}
        </g>
      </svg>
      <div className="space-y-1.5">
        {data.map((x) => (
          <div key={x.label} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: x.color }} />
            <span className="text-slate-600">{x.label.replace('Pendapatan ', '')}</span>
            <span className="text-slate-400">{total > 0 ? Math.round((x.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AreaChart({ values }: { values: number[] }) {
  const W = 900, H = 240
  const padL = 88, padR = 20, padT = 16, padB = 34
  const iw = W - padL - padR, ih = H - padT - padB
  const rawMax = Math.max(...values, 0)
  const rawMin = Math.min(...values, 0)
  const niceMax = niceNum(rawMax <= 0 ? 1 : rawMax * 1.1)
  const niceMin = rawMin < 0 ? -niceNum(-rawMin * 1.1) : 0
  const range = niceMax - niceMin || 1
  const x = (i: number) => padL + (i / (values.length - 1)) * iw
  const y = (v: number) => padT + ih - ((v - niceMin) / range) * ih
  const yZero = y(0)
  const pts = values.map((v, i) => [x(i), y(v)] as [number, number])
  const linePath = smoothPath(pts)
  const areaPath = `${linePath} L ${x(values.length - 1)} ${yZero} L ${x(0)} ${yZero} Z`
  const steps = 5
  const gridVals = Array.from({ length: steps + 1 }, (_, i) => niceMin + (range / steps) * i)
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px]" style={{ height: 'auto' }}>
        <defs>
          <linearGradient id="labaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a9cf8e" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a9cf8e" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        {gridVals.map((gv, i) => {
          const gy = y(gv)
          return (
            <g key={i}>
              <line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke="#eef2f0" strokeWidth={1} />
              <text x={padL - 8} y={gy + 3} textAnchor="end" className="fill-slate-400" fontSize={11}>{rpShort(gv)}</text>
            </g>
          )
        })}
        <line x1={padL} y1={padT} x2={padL} y2={padT + ih} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={padL} y1={yZero} x2={W - padR} y2={yZero} stroke="#cbd5e1" strokeWidth={1} />
        <path d={areaPath} fill="url(#labaFill)" />
        <path d={linePath} fill="none" stroke="#7fae5c" strokeWidth={2} />
        {BULAN.map((b, i) => (
          <text key={b} x={x(i)} y={H - 12} textAnchor="middle" className="fill-slate-500" fontSize={10}>{b.slice(0, 3)}</text>
        ))}
      </svg>
    </div>
  )
}

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`
  }
  return d
}

function niceNum(v: number): number {
  if (v <= 0) return 0
  const exp = Math.floor(Math.log10(v))
  const base = Math.pow(10, exp)
  const f = v / base
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return nf * base
}
function rpShort(v: number): string {
  const abs = Math.abs(v); const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(abs % 1_000_000_000 ? 1 : 0)}M`
  if (abs >= 1_000_000) return `${sign}Rp ${Math.round(abs / 1_000_000)}jt`
  if (abs >= 1_000) return `${sign}Rp ${Math.round(abs / 1_000)}rb`
  return `${sign}Rp ${abs}`
}

// Form tambah / edit transaksi
function FormModal({ edit, onClose, onSaved }: { edit?: KeuanganRowLap; onClose: () => void; onSaved: (row: KeuanganRowLap) => void }) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const [tanggal, setTanggal] = useState(edit?.tanggal ?? today)
  const [jenis, setJenis] = useState<'masuk' | 'keluar'>(edit?.jenis ?? 'keluar')
  const [keterangan, setKeterangan] = useState(edit?.keterangan ?? '')
  const [jumlah, setJumlah] = useState(edit ? String(edit.jumlah) : '')
  const [payment, setPayment] = useState(edit?.payment ?? 'non_tunai')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!keterangan.trim()) { setError('Keterangan wajib diisi'); return }
    if (!(Number(jumlah) > 0)) { setError('Jumlah harus lebih dari 0'); return }
    // Akun/kategori tidak lagi dipilih owner. Pertahankan nilai lama saat edit
    // (mis. baris auto 'Pendapatan Jasa'); untuk transaksi baru pakai "Lain-Lain"
    // sesuai jenis supaya tetap masuk Laba Rugi & Laporan Tahunan.
    const akun = edit?.akun || (jenis === 'masuk' ? 'Pendapatan Lain-Lain' : 'Beban Lain-Lain')
    setSaving(true)
    try {
      const res = await fetch('/api/owner/keuangan', {
        method: edit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: edit?.id, tanggal, jenis, akun, keterangan: keterangan.trim(), jumlah: Number(jumlah), payment }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal menyimpan'); return }
      toast.success(edit ? 'Transaksi diperbarui' : 'Transaksi ditambahkan')
      onSaved({ ...data.row, jumlah: Number(data.row.jumlah) } as KeuanganRowLap)
    } catch { setError('Gagal terhubung ke server') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-900">{edit ? 'Edit Transaksi' : 'Tambah Transaksi'}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="flex items-start gap-2 px-3 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm"><AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />{error}</div>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setJenis('keluar')} className={cn('py-2.5 rounded-xl text-sm font-semibold border', jenis === 'keluar' ? 'bg-red-50 border-red-200 text-red-600' : 'border-slate-200 text-slate-500')}>Pengeluaran</button>
            <button type="button" onClick={() => setJenis('masuk')} className={cn('py-2.5 rounded-xl text-sm font-semibold border', jenis === 'masuk' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'border-slate-200 text-slate-500')}>Pemasukan</button>
          </div>
          <div><label className={labelCls}>Tanggal</label><input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Keterangan</label><input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Contoh: Bayar listrik" className={inputCls} /></div>
          <div><label className={labelCls}>Jumlah</label>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp</span>
              <input type="number" min={0} value={jumlah} onChange={(e) => setJumlah(e.target.value)} placeholder="0" className={cn(inputCls, 'pl-9')} /></div></div>
          <div><label className={labelCls}>Pembayaran</label>
            <select value={payment} onChange={(e) => setPayment(e.target.value)} className={inputCls}>
              <option value="non_tunai">Non-Tunai</option><option value="tunai">Tunai</option>
            </select></div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">Batal</button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? <><Loader2 size={15} className="animate-spin" />Menyimpan…</> : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Pesan bila tabel keuangan belum ada (migrasi 0008 belum dijalankan).
export function MigrasiBelumJalan() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-800">
      <p className="font-semibold">Modul keuangan belum aktif.</p>
      <p className="mt-1">Jalankan migrasi <b>0008_keuangan_diskon.sql</b> di Supabase SQL Editor untuk mengaktifkan buku kas, laba rugi, laporan tahunan & diskon.</p>
    </div>
  )
}
