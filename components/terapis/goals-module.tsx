'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, Trash2, Flag, CheckCircle2, Circle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { TreatmentGoal } from '@/types'

const inputCls =
  'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

export function GoalsModule({ patientId, items }: { patientId: string; items: TreatmentGoal[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [desc, setDesc] = useState('')

  const achieved = items.filter((g) => g.status === 'achieved').length
  const pct = items.length ? Math.round((achieved / items.length) * 100) : 0

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!desc.trim()) return
    setSaving(true)
    const res = await fetch('/api/terapis/goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, description: desc.trim() }),
    })
    setSaving(false)
    if (res.ok) {
      setDesc('')
      setAdding(false)
      router.refresh()
    }
  }

  async function toggle(g: TreatmentGoal) {
    setBusyId(g.id)
    await fetch('/api/terapis/goal', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: g.id, status: g.status === 'achieved' ? 'in_progress' : 'achieved' }),
    })
    setBusyId(null)
    router.refresh()
  }

  async function remove(id: string) {
    if (!confirm('Hapus target ini?')) return
    setBusyId(id)
    await fetch('/api/terapis/goal', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setBusyId(null)
    router.refresh()
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-gray-900">
          <Flag className="h-4 w-4 text-teal-600" /> Target Terapi
        </h2>
        <button
          onClick={() => setAdding((a) => !a)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-100"
        >
          {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {adding ? 'Tutup' : 'Tambah'}
        </button>
      </div>

      {/* Ringkasan progress */}
      {items.length > 0 && (
        <div className="mb-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">{achieved} dari {items.length} tercapai</span>
            <span className="font-bold text-teal-700">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {adding && (
        <form onSubmit={add} className="mb-4 space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">Deskripsi Target</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="Mis. Mampu duduk fokus menyelesaikan puzzle 10 menit tanpa bantuan."
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-teal-700 disabled:opacity-60"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</> : 'Simpan'}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">Belum ada target terapi.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((g) => {
            const done = g.status === 'achieved'
            return (
              <li key={g.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <button
                  onClick={() => toggle(g)}
                  disabled={busyId === g.id}
                  aria-label={done ? 'Tandai belum tercapai' : 'Tandai tercapai'}
                  className="mt-0.5 shrink-0 disabled:opacity-50"
                >
                  {busyId === g.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                  ) : done ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 transition-colors hover:text-teal-500" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{g.description}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {done && g.achieved_at ? `Tercapai ${formatDate(g.achieved_at)}` : `Dibuat ${formatDate(g.created_at)}`}
                  </p>
                </div>
                <button
                  onClick={() => remove(g.id)}
                  disabled={busyId === g.id}
                  aria-label="Hapus"
                  className="text-gray-300 transition-colors hover:text-red-500 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
