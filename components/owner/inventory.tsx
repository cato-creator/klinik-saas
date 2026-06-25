'use client'

// Inventory Barang Habis Pakai — daftar pembelian consumables klinik. Setiap
// pembelian otomatis tercatat sebagai PENGELUARAN di Arus Kas (trigger DB).
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Plus, X, Loader2, Trash2, Pencil, AlertTriangle, Search, Package, ShoppingCart,
} from 'lucide-react'
import { formatRupiah, formatTanggalPendek, formatThousands, parseThousands, cn } from '@/lib/utils'

export interface InventoryItem {
  id: string
  name: string
  quantity: number
  unit: string | null
  unit_price: number
  total_cost: number
  payment: string
  purchased_at: string
  notes: string | null
  created_at: string
}

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5'
const TH = 'sticky top-0 z-10 bg-slate-50/95 backdrop-blur px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200 whitespace-nowrap text-left'
const TD = 'px-3 py-2.5 text-sm text-slate-700 whitespace-nowrap'
const TROW = 'border-b border-slate-100 even:bg-slate-50/40 hover:bg-emerald-50/40 transition-colors'

function fmtTgl(s: string | null) { return s ? formatTanggalPendek(s) : '-' }

export function InventoryTable({ items: initialItems, missing }: { items: InventoryItem[]; missing: boolean }) {
  const [items, setItems] = useState(initialItems)
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter((i) => i.name.toLowerCase().includes(s) || (i.notes ?? '').toLowerCase().includes(s))
  }, [items, q])

  const totalBelanja = useMemo(() => filtered.reduce((sum, i) => sum + i.total_cost, 0), [filtered])

  function applySaved(row: InventoryItem) {
    setItems((prev) => {
      const exists = prev.some((r) => r.id === row.id)
      const next = exists ? prev.map((r) => (r.id === row.id ? row : r)) : [row, ...prev]
      return [...next].sort((a, b) => (a.purchased_at < b.purchased_at ? 1 : a.purchased_at > b.purchased_at ? -1 : (a.created_at < b.created_at ? 1 : -1)))
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch('/api/owner/inventory', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Gagal menghapus'); return }
      toast.success('Barang dihapus — pengeluaran terkait ikut dihapus dari Arus Kas')
      setItems((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch { toast.error('Gagal terhubung ke server') }
  }

  if (missing) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-800">
        <p className="font-semibold">Fitur inventory belum aktif.</p>
        <p className="mt-1">Jalankan migrasi <b>0014_inventory.sql</b> di Supabase SQL Editor untuk mengaktifkan pencatatan barang habis pakai.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-5 sm:max-w-md">
        <div className="rounded-2xl p-4 text-white bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/80">Jenis Barang</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">{filtered.length.toLocaleString('id-ID')}</p>
        </div>
        <div className="rounded-2xl p-4 text-white bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/25">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/80">Total Belanja</p>
          <p className="text-xl font-bold mt-1 tabular-nums break-words leading-tight">{formatRupiah(totalBelanja)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama barang…"
            className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400 w-full sm:w-60" />
        </div>
        <span className="text-xs text-slate-400">{filtered.length.toLocaleString('id-ID')} barang</span>
        <div className="flex-1" />
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition"><Plus size={16} /> Tambah Barang</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[64vh]">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={TH}>Tanggal</th>
                <th className={cn(TH, 'w-full')}>Nama Barang</th>
                <th className={cn(TH, 'text-right')}>Jumlah</th>
                <th className={cn(TH, 'text-right')}>Harga Satuan</th>
                <th className={cn(TH, 'text-right')}>Total</th>
                <th className={TH}>Bayar</th>
                <th className={cn(TH, 'pr-5')}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td className={cn(TD, 'text-center text-slate-400 py-12')} colSpan={7}>
                  <Package size={28} className="mx-auto mb-2 text-slate-300" />
                  Belum ada barang. Klik “Tambah Barang” untuk mencatat pembelian.
                </td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className={TROW}>
                  <td className={TD}>{fmtTgl(r.purchased_at)}</td>
                  <td className={cn(TD, 'whitespace-normal')}>
                    {r.name}
                    {r.notes && <span className="block text-xs text-slate-400">{r.notes}</span>}
                  </td>
                  <td className={cn(TD, 'text-right')}>{String(r.quantity)}{r.unit ? ` ${r.unit}` : ''}</td>
                  <td className={cn(TD, 'text-right')}>{formatRupiah(r.unit_price)}</td>
                  <td className={cn(TD, 'text-right font-semibold text-rose-600')}>{formatRupiah(r.total_cost)}</td>
                  <td className={TD}>{r.payment === 'tunai' ? 'Tunai' : 'Non Tunai'}</td>
                  <td className={cn(TD, 'text-center pr-5')}>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditTarget(r)} className="p-1 text-slate-300 hover:text-emerald-600 rounded" title="Edit"><Pencil size={14} /></button>
                      <button onClick={() => setDeleteTarget(r)} className="p-1 text-slate-300 hover:text-rose-500 rounded" title="Hapus"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
        <ShoppingCart size={13} /> Setiap barang yang ditambahkan otomatis tercatat sebagai pengeluaran “Beban Perlengkapan” di Arus Kas.
      </p>

      {showForm && <FormModal onClose={() => setShowForm(false)} onSaved={(row) => { applySaved(row); setShowForm(false) }} />}
      {editTarget && <FormModal edit={editTarget} onClose={() => setEditTarget(null)} onSaved={(row) => { applySaved(row); setEditTarget(null) }} />}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <p className="font-bold text-slate-900 mb-2">Hapus Barang?</p>
            <p className="text-sm text-slate-600 mb-5">{deleteTarget.name} — {formatRupiah(deleteTarget.total_cost)}. Pengeluaran terkait di Arus Kas juga akan dihapus.</p>
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

function FormModal({ edit, onClose, onSaved }: { edit?: InventoryItem; onClose: () => void; onSaved: (row: InventoryItem) => void }) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const [tanggal, setTanggal] = useState(edit?.purchased_at ?? today)
  const [name, setName] = useState(edit?.name ?? '')
  const [quantity, setQuantity] = useState(edit ? String(edit.quantity) : '1')
  const [unit, setUnit] = useState(edit?.unit ?? '')
  const [unitPrice, setUnitPrice] = useState(edit && edit.unit_price > 0 ? formatThousands(edit.unit_price) : '')
  const [payment, setPayment] = useState(edit?.payment ?? 'non_tunai')
  const [notes, setNotes] = useState(edit?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const qtyNum = Number(quantity.replace(',', '.')) || 0
  const priceNum = parseThousands(unitPrice)
  const total = Math.round(qtyNum * priceNum * 100) / 100

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!name.trim()) { setError('Nama barang wajib diisi'); return }
    if (!(qtyNum > 0)) { setError('Jumlah harus lebih dari 0'); return }
    if (!(priceNum > 0)) { setError('Harga satuan harus lebih dari 0'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/owner/inventory', {
        method: edit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: edit?.id, name: name.trim(), quantity: qtyNum, unit: unit.trim(),
          unit_price: priceNum, payment, purchased_at: tanggal, notes: notes.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal menyimpan'); return }
      toast.success(edit ? 'Barang diperbarui' : 'Barang ditambahkan & tercatat di Arus Kas')
      onSaved({ ...data.row, quantity: Number(data.row.quantity), unit_price: Number(data.row.unit_price), total_cost: Number(data.row.total_cost) } as InventoryItem)
    } catch { setError('Gagal terhubung ke server') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-900">{edit ? 'Edit Barang' : 'Tambah Barang'}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="flex items-start gap-2 px-3 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm"><AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />{error}</div>}
          <div><label className={labelCls}>Nama Barang</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Handscoon" className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Jumlah</label><input inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1" className={inputCls} /></div>
            <div><label className={labelCls}>Satuan</label><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pcs / box / botol" className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Harga Satuan</label>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp</span>
              <input inputMode="numeric" value={unitPrice} onChange={(e) => setUnitPrice(formatThousands(e.target.value))} placeholder="0" className={cn(inputCls, 'pl-9')} /></div></div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
            <span className="text-sm text-slate-500">Total Biaya</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">{formatRupiah(total)}</span>
          </div>
          <div><label className={labelCls}>Tanggal</label><input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Pembayaran</label>
            <select value={payment} onChange={(e) => setPayment(e.target.value)} className={inputCls}>
              <option value="non_tunai">Non-Tunai</option><option value="tunai">Tunai</option>
            </select></div>
          <div><label className={labelCls}>Catatan <span className="text-slate-400 font-normal">(opsional)</span></label><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mis. beli di apotek X" className={inputCls} /></div>
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
