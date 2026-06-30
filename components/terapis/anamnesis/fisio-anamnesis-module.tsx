'use client'

// ============================================================
// FORM ANAMNESIS & PEMERIKSAAN — KHUSUS FISIOTERAPI (SK Fisio)
// Dua mode:
//  • MODE CEPAT  → input "klik-klik" (pilih kasus, tandai bagian tubuh,
//    pilih chip keluhan/modalitas, skala nyeri tombol). Cepat untuk harian.
//  • MODE LENGKAP → wizard 7 langkah sesuai format SK (lebih detail).
// Keduanya disimpan ke tabel `assessments.data` (JSONB) yang sama.
// Okupasi Terapi memakai form sendiri (lihat patient-case-view).
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Loader2, X, ChevronLeft, ChevronRight, Check, ClipboardList, Zap, ListChecks,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Assessment, AnamnesisData } from '@/types'
import { BodyMap, type PainRegion } from './body-map'
import { FISIO_CASES, FISIO_CATEGORIES, KELUHAN_TAGS, ONSET_OPTIONS, MODALITAS_OPTIONS } from './fisio-cases'
import { CaseDropdown, ChipMultiAdd, type CaseLike } from './case-templates'

/* ---------------- Data model ---------------- */

function emptyData(): AnamnesisData {
  return {
    keluhan_utama: '',
    rps: '', rpd: '', rpp: '', rpk: '',
    anamnesis_sistem: [],
    ttv: { tekanan_darah: '', denyut_nadi: '', suhu: '', pernafasan: '', tinggi_badan: '', berat_badan: '' },
    inspeksi: '', palpasi: '', perkusi: '',
    gerak_aktif: [], gerak_pasif: [], isometrik: [],
    kognitif: '', intrapersonal: '', interpersonal: '',
    kemampuan_fungsional: '',
    nyeri_diam: '', nyeri_tekan: '', nyeri_gerak: '',
    antropometri: [],
    lgs: '', mmt: '',
    impairment: '', fungsional_limitation: '', disability: '',
    tujuan_jangka_pendek: '', tujuan_jangka_panjang: '',
    teknologi_ft: '', edukasi: '', rencana_evaluasi: '',
    // field mode cepat
    pain_regions: [], keluhan_tags: [], modalitas: [], onset: '', durasi: '', nyeri_skala: null,
  }
}

// Lengkapi data lama yang mungkin belum punya semua field (saat menampilkan record lama).
function withDefaults(d: Partial<AnamnesisData> | null | undefined): AnamnesisData {
  return { ...emptyData(), ...(d ?? {}), ttv: { ...emptyData().ttv, ...(d?.ttv ?? {}) } }
}

// Terapkan kasus (bawaan / template tersimpan) ke state (menimpa field relevan).
function applyCaseLike(prev: AnamnesisData, c: CaseLike): AnamnesisData {
  return { ...prev, ...(c.data as Partial<AnamnesisData>), case_template: c.id, case_name: c.name }
}

// Ringkasan keluhan utama (untuk daftar) bila kolom keluhan dikosongkan.
function buildSummary(d: AnamnesisData): string {
  if (d.keluhan_utama?.trim()) return d.keluhan_utama.trim()
  const parts: string[] = []
  if (d.case_name) parts.push(d.case_name)
  if (d.keluhan_tags?.length) parts.push(d.keluhan_tags.join(', '))
  if (d.pain_regions?.length) parts.push('di ' + d.pain_regions.map((r) => r.label).join(', '))
  return parts.join(' — ') || 'Anamnesis fisioterapi'
}

type ColumnDef = { key: string; label: string }

const SISTEM_COLS: ColumnDef[] = [
  { key: 'sistem', label: 'Sistem' },
  { key: 'keterangan', label: 'Keterangan' },
]
const AKTIF_COLS: ColumnDef[] = [
  { key: 'bidang_gerak', label: 'Bidang Gerak' },
  { key: 'full_rom', label: 'Full ROM' },
  { key: 'nyeri', label: 'Nyeri' },
  { key: 'bisa_dilakukan', label: 'Bisa Dilakukan' },
]
const PASIF_COLS: ColumnDef[] = [...AKTIF_COLS, { key: 'end_feel', label: 'End Feel' }]
const ANTRO_COLS: ColumnDef[] = [
  { key: 'ukuran', label: 'Ukuran' },
  { key: 'dekstra', label: 'Dekstra' },
  { key: 'sinistra', label: 'Sinistra' },
  { key: 'selisih', label: 'Selisih' },
]

/* ---------------- Styles ---------------- */

const inputCls =
  'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

/* ---------------- Field helpers ---------------- */

function TextField({ label, value, onChange, rows = 2, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={`${inputCls} resize-y`} placeholder={placeholder} />
    </div>
  )
}

function LineField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} placeholder={placeholder} />
    </div>
  )
}

/* ---------------- Click helpers (mode cepat) ---------------- */

function chipCls(on: boolean) {
  return `rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
    on ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
  }`
}

function ChipSingle({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(value === o ? '' : o)} className={chipCls(value === o)}>
          {o}
        </button>
      ))}
    </div>
  )
}

function PainScale({ value, onChange }: { value: number | null | undefined; onChange: (v: number | null) => void }) {
  const color = (n: number, on: boolean) => {
    if (!on) return 'bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50'
    if (n <= 3) return 'bg-green-500 text-white'
    if (n <= 6) return 'bg-amber-500 text-white'
    return 'bg-red-500 text-white'
  }
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">Skala Nyeri (0–10)</label>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 11 }, (_, i) => i).map((n) => (
          <button key={n} type="button" onClick={() => onChange(value === n ? null : n)}
            className={`h-9 w-9 rounded-lg text-sm font-bold transition-colors ${color(n, value === n)}`}>
            {n}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-gray-400">0 = tidak nyeri · 10 = nyeri sangat berat</p>
    </div>
  )
}

function QuickSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-gray-900">{title}</p>
      {hint && <p className="mb-2 mt-0.5 text-xs text-gray-400">{hint}</p>}
      <div className={hint ? '' : 'mt-2'}>{children}</div>
    </div>
  )
}

/* Editor tabel responsif: tiap baris = kartu dengan grid input berlabel. */
function TableEditor({ title, hint, columns, rows, onChange }: {
  title: string; hint?: string; columns: ColumnDef[]; rows: Record<string, string>[]; onChange: (rows: Record<string, string>[]) => void
}) {
  function addRow() {
    const blank: Record<string, string> = {}
    columns.forEach((c) => (blank[c.key] = ''))
    onChange([...rows, blank])
  }
  function setCell(i: number, key: string, val: string) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)))
  }
  function removeRow(i: number) {
    onChange(rows.filter((_, idx) => idx !== i))
  }
  // Kelas grid statis (Tailwind JIT tidak mendeteksi kelas hasil concat dinamis).
  const gridCls =
    columns.length >= 5 ? 'sm:grid-cols-2 lg:grid-cols-5'
      : columns.length === 4 ? 'sm:grid-cols-2 lg:grid-cols-4'
      : columns.length === 3 ? 'sm:grid-cols-3'
      : 'sm:grid-cols-2'
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-gray-800">{title}</p>
          {hint && <p className="text-xs text-gray-400">{hint}</p>}
        </div>
        <button type="button" onClick={addRow}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100">
          <Plus className="h-3.5 w-3.5" /> Tambah baris
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-4 text-center text-xs text-gray-400">Belum ada baris. Klik “Tambah baris”.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="relative rounded-xl border border-gray-200 bg-white p-3 pr-9">
              <div className={`grid gap-2 ${gridCls}`}>
                {columns.map((c) => (
                  <div key={c.key}>
                    <label className="mb-0.5 block text-[11px] font-medium text-gray-500">{c.label}</label>
                    <input value={row[c.key] ?? ''} onChange={(e) => setCell(i, c.key, e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => removeRow(i)} aria-label="Hapus baris"
                className="absolute right-2 top-2 text-gray-300 transition-colors hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GroupCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <h4 className="mb-3 text-sm font-bold text-teal-700">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

/* ---------------- Shell (header + tombol simpan/tutup) ---------------- */

function FormShell({ title, onClose, onSave, saving, error, switchLabel, onSwitch, children }: {
  title: string; onClose: () => void; onSave: () => void; saving: boolean; error: string
  switchLabel: string; onSwitch: () => void; children: React.ReactNode
}) {
  return (
    <div className="mb-4 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bold text-gray-900">
          <ClipboardList className="h-4 w-4 text-teal-600" /> {title}
        </h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onSwitch} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50">
            {switchLabel}
          </button>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {children}

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
        <button type="button" onClick={onClose} disabled={saving}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40">
          Batal
        </button>
        <button type="button" onClick={onSave} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:opacity-60">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</> : <><Check className="h-4 w-4" /> Simpan Anamnesis</>}
        </button>
      </div>
    </div>
  )
}

async function saveAssessment(patientId: string, d: AnamnesisData, discipline?: string): Promise<{ ok: boolean; error?: string }> {
  // Selaraskan teknologi_ft (SK) dengan modalitas yang dipilih bila belum diisi.
  const data: AnamnesisData = {
    ...d,
    teknologi_ft: d.teknologi_ft?.trim() ? d.teknologi_ft : (d.modalitas ?? []).join(', '),
  }
  const res = await fetch('/api/terapis/assessment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_id: patientId, data, chief_complaint: buildSummary(data), discipline }),
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    return { ok: false, error: j.error ?? 'Gagal menyimpan.' }
  }
  return { ok: true }
}

/* ---------------- MODE CEPAT ---------------- */

function QuickForm({ patientId, discipline, onClose, onSwitch }: { patientId: string; discipline?: string; onClose: () => void; onSwitch: () => void }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [d, setD] = useState<AnamnesisData>(() => ({ ...emptyData(), mode: 'cepat' }))

  function set<K extends keyof AnamnesisData>(key: K, value: AnamnesisData[K]) {
    setD((prev) => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true); setError('')
    const r = await saveAssessment(patientId, { ...d, mode: 'cepat' }, discipline)
    if (!r.ok) { setError(r.error ?? 'Gagal menyimpan.'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  return (
    <FormShell title="Anamnesis Cepat" onClose={onClose} onSave={save} saving={saving} error={error}
      switchLabel="Mode Lengkap →" onSwitch={onSwitch}>
      <div className="space-y-4">
        <QuickSection title="1. Pilih Kasus" hint="Cari/pilih kasus per kategori atau tambah kasus baru">
          <CaseDropdown discipline={discipline} presets={FISIO_CASES} categories={FISIO_CATEGORIES} activeId={d.case_template}
            currentData={d as unknown as Record<string, unknown>} onApply={(c) => setD((prev) => applyCaseLike(prev, c))} />
        </QuickSection>

        <BodyMap value={d.pain_regions ?? []} onChange={(v: PainRegion[]) => set('pain_regions', v)} />

        <QuickSection title="2. Keluhan">
          <ChipMultiAdd options={KELUHAN_TAGS} value={d.keluhan_tags ?? []} onChange={(v) => set('keluhan_tags', v)} />
          <div className="mt-3">
            <LineField label="Keluhan utama (boleh diedit)" value={d.keluhan_utama} onChange={(v) => set('keluhan_utama', v)} placeholder="Contoh: Nyeri pinggang bawah sejak 3 hari" />
          </div>
        </QuickSection>

        <QuickSection title="3. Onset & Durasi">
          <ChipSingle options={ONSET_OPTIONS} value={d.onset ?? ''} onChange={(v) => set('onset', v)} />
          <div className="mt-3">
            <LineField label="Durasi / sejak kapan" value={d.durasi ?? ''} onChange={(v) => set('durasi', v)} placeholder="Contoh: 3 hari, 2 minggu, 1 bulan" />
          </div>
        </QuickSection>

        <QuickSection title="4. Skala Nyeri">
          <PainScale value={d.nyeri_skala} onChange={(v) => set('nyeri_skala', v)} />
        </QuickSection>

        <QuickSection title="5. Diagnosa Fisioterapi" hint="Terisi dari kasus — koreksi seperlunya.">
          <div className="space-y-3">
            <LineField label="Impairment" value={d.impairment} onChange={(v) => set('impairment', v)} />
            <LineField label="Functional Limitation" value={d.fungsional_limitation} onChange={(v) => set('fungsional_limitation', v)} />
            <LineField label="Disability" value={d.disability} onChange={(v) => set('disability', v)} />
          </div>
        </QuickSection>

        <QuickSection title="6. Tindakan / Modalitas">
          <ChipMultiAdd options={MODALITAS_OPTIONS} value={d.modalitas ?? []} onChange={(v) => set('modalitas', v)} />
          <div className="mt-3">
            <LineField label="Edukasi" value={d.edukasi} onChange={(v) => set('edukasi', v)} placeholder="Saran/edukasi untuk pasien" />
          </div>
        </QuickSection>

        <QuickSection title="7. Tujuan Terapi">
          <div className="grid gap-3 sm:grid-cols-2">
            <LineField label="Jangka pendek" value={d.tujuan_jangka_pendek} onChange={(v) => set('tujuan_jangka_pendek', v)} />
            <LineField label="Jangka panjang" value={d.tujuan_jangka_panjang} onChange={(v) => set('tujuan_jangka_panjang', v)} />
          </div>
        </QuickSection>
      </div>
    </FormShell>
  )
}

/* ---------------- MODE LENGKAP (wizard) ---------------- */

const STEP_TITLES = [
  'Anamnesis',
  'Tanda Vital & Inspeksi',
  'Gerakan Dasar',
  'Kognitif & Fungsional',
  'Nyeri & Antropometri',
  'Diagnosa Fisioterapi',
  'Program / Rencana',
]

function Stepper({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  const total = STEP_TITLES.length
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900">
          <span className="text-teal-600">Langkah {step + 1}</span> dari {total}
          <span className="ml-2 font-medium text-gray-500">· {STEP_TITLES[step]}</span>
        </p>
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-teal-500 transition-all duration-300" style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {STEP_TITLES.map((t, i) => {
          const state = i === step ? 'current' : i < step ? 'done' : 'todo'
          return (
            <button key={t} type="button" onClick={() => onJump(i)} title={t}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                state === 'current' ? 'bg-teal-600 text-white'
                  : state === 'done' ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}>
              {state === 'done' ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AnamnesisWizard({ patientId, discipline, onClose, onSwitch }: { patientId: string; discipline?: string; onClose: () => void; onSwitch: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [d, setD] = useState<AnamnesisData>(() => ({ ...emptyData(), mode: 'lengkap' }))

  function set<K extends keyof AnamnesisData>(key: K, value: AnamnesisData[K]) {
    setD((prev) => ({ ...prev, [key]: value }))
  }
  function setTtv(key: keyof AnamnesisData['ttv'], value: string) {
    setD((prev) => ({ ...prev, ttv: { ...prev.ttv, [key]: value } }))
  }

  const last = STEP_TITLES.length - 1

  async function save() {
    setSaving(true); setError('')
    const r = await saveAssessment(patientId, { ...d, mode: 'lengkap' }, discipline)
    if (!r.ok) { setError(r.error ?? 'Gagal menyimpan.'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  return (
    <div className="mb-4 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bold text-gray-900">
          <ClipboardList className="h-4 w-4 text-teal-600" /> Anamnesis Lengkap
        </h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onSwitch} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50">
            ← Mode Cepat
          </button>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Stepper step={step} onJump={setStep} />

      <div className="space-y-4">
        {/* STEP 1 — ANAMNESIS */}
        {step === 0 && (
          <>
            <QuickSection title="Pilih Kasus (opsional)" hint="Cari/pilih kasus per kategori atau tambah kasus baru">
              <CaseDropdown discipline={discipline} presets={FISIO_CASES} categories={FISIO_CATEGORIES} activeId={d.case_template}
                currentData={d as unknown as Record<string, unknown>} onApply={(c) => setD((prev) => applyCaseLike(prev, c))} />
            </QuickSection>
            <BodyMap value={d.pain_regions ?? []} onChange={(v) => set('pain_regions', v)} />
            <TextField label="1. Keluhan Utama" value={d.keluhan_utama} onChange={(v) => set('keluhan_utama', v)} placeholder="Keluhan utama pasien…" />
            <TextField label="2. Riwayat Penyakit Sekarang" value={d.rps} onChange={(v) => set('rps', v)} />
            <TextField label="3. Riwayat Penyakit Dahulu" value={d.rpd} onChange={(v) => set('rpd', v)} />
            <TextField label="4. Riwayat Penyakit Penyerta" value={d.rpp} onChange={(v) => set('rpp', v)} />
            <TextField label="5. Riwayat Penyakit Keluarga" value={d.rpk} onChange={(v) => set('rpk', v)} />
            <div>
              <p className="mb-2 text-sm font-semibold text-gray-800">6. Anamnesis Sistem</p>
              <TableEditor title="Anamnesis Sistem" columns={SISTEM_COLS} rows={d.anamnesis_sistem} onChange={(r) => set('anamnesis_sistem', r as AnamnesisData['anamnesis_sistem'])} />
            </div>
          </>
        )}

        {/* STEP 2 — TTV & INSPEKSI/PALPASI/PERKUSI */}
        {step === 1 && (
          <>
            <GroupCard title="1.1 Tanda-tanda Vital">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <LineField label="Tekanan Darah" value={d.ttv.tekanan_darah} onChange={(v) => setTtv('tekanan_darah', v)} placeholder="mmHg" />
                <LineField label="Denyut Nadi" value={d.ttv.denyut_nadi} onChange={(v) => setTtv('denyut_nadi', v)} placeholder="x/menit" />
                <LineField label="Suhu" value={d.ttv.suhu} onChange={(v) => setTtv('suhu', v)} placeholder="°C" />
                <LineField label="Pernafasan" value={d.ttv.pernafasan} onChange={(v) => setTtv('pernafasan', v)} placeholder="x/menit" />
                <LineField label="Tinggi Badan" value={d.ttv.tinggi_badan} onChange={(v) => setTtv('tinggi_badan', v)} placeholder="cm" />
                <LineField label="Berat Badan" value={d.ttv.berat_badan} onChange={(v) => setTtv('berat_badan', v)} placeholder="kg" />
              </div>
            </GroupCard>
            <TextField label="1.2 Inspeksi" value={d.inspeksi} onChange={(v) => set('inspeksi', v)} />
            <TextField label="1.3 Palpasi" value={d.palpasi} onChange={(v) => set('palpasi', v)} />
            <TextField label="1.4 Perkusi" value={d.perkusi} onChange={(v) => set('perkusi', v)} />
          </>
        )}

        {/* STEP 3 — GERAKAN DASAR */}
        {step === 2 && (
          <>
            <p className="text-sm font-semibold text-gray-800">1.5 Gerakan Dasar</p>
            <TableEditor title="a. Gerak Aktif" columns={AKTIF_COLS} rows={d.gerak_aktif} onChange={(r) => set('gerak_aktif', r as AnamnesisData['gerak_aktif'])} />
            <TableEditor title="b. Gerak Pasif" columns={PASIF_COLS} rows={d.gerak_pasif} onChange={(r) => set('gerak_pasif', r as AnamnesisData['gerak_pasif'])} />
            <TableEditor title="c. Isometrik" columns={AKTIF_COLS} rows={d.isometrik} onChange={(r) => set('isometrik', r as AnamnesisData['isometrik'])} />
          </>
        )}

        {/* STEP 4 — KOGNITIF & FUNGSIONAL */}
        {step === 3 && (
          <>
            <GroupCard title="1.6 Kognitif, Intra Personal & Inter Personal">
              <TextField label="Kognitif" value={d.kognitif} onChange={(v) => set('kognitif', v)} />
              <TextField label="Intrapersonal" value={d.intrapersonal} onChange={(v) => set('intrapersonal', v)} />
              <TextField label="Interpersonal" value={d.interpersonal} onChange={(v) => set('interpersonal', v)} />
            </GroupCard>
            <TextField label="1.7 Kemampuan Fungsional Dasar & Lingkungan (Aktifitas)" value={d.kemampuan_fungsional} onChange={(v) => set('kemampuan_fungsional', v)} rows={3} />
          </>
        )}

        {/* STEP 5 — NYERI & ANTROPOMETRI */}
        {step === 4 && (
          <>
            <GroupCard title="1.8 Pemeriksaan Nyeri (VDS)">
              <div className="grid gap-3 sm:grid-cols-3">
                <LineField label="Nyeri Diam" value={d.nyeri_diam} onChange={(v) => set('nyeri_diam', v)} />
                <LineField label="Nyeri Tekan" value={d.nyeri_tekan} onChange={(v) => set('nyeri_tekan', v)} />
                <LineField label="Nyeri Gerak" value={d.nyeri_gerak} onChange={(v) => set('nyeri_gerak', v)} />
              </div>
            </GroupCard>
            <TableEditor title="Antropometri" columns={ANTRO_COLS} rows={d.antropometri} onChange={(r) => set('antropometri', r as AnamnesisData['antropometri'])} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="LGS (Lingkup Gerak Sendi)" value={d.lgs} onChange={(v) => set('lgs', v)} />
              <TextField label="MMT (Manual Muscle Testing)" value={d.mmt} onChange={(v) => set('mmt', v)} />
            </div>
          </>
        )}

        {/* STEP 6 — DIAGNOSA FT */}
        {step === 5 && (
          <GroupCard title="1.9 Diagnosa Fisioterapi">
            <TextField label="a. Impairment" value={d.impairment} onChange={(v) => set('impairment', v)} />
            <TextField label="b. Functional Limitation" value={d.fungsional_limitation} onChange={(v) => set('fungsional_limitation', v)} />
            <TextField label="c. Disability" value={d.disability} onChange={(v) => set('disability', v)} />
          </GroupCard>
        )}

        {/* STEP 7 — PROGRAM */}
        {step === 6 && (
          <>
            <GroupCard title="1. Tujuan">
              <TextField label="a. Jangka Pendek" value={d.tujuan_jangka_pendek} onChange={(v) => set('tujuan_jangka_pendek', v)} />
              <TextField label="b. Jangka Panjang" value={d.tujuan_jangka_panjang} onChange={(v) => set('tujuan_jangka_panjang', v)} />
            </GroupCard>
            <GroupCard title="2. Tindakan Fisioterapi">
              <TextField label="a. Teknologi Fisioterapi" value={d.teknologi_ft} onChange={(v) => set('teknologi_ft', v)} />
              <TextField label="b. Edukasi" value={d.edukasi} onChange={(v) => set('edukasi', v)} />
              <TextField label="c. Rencana Evaluasi" value={d.rencana_evaluasi} onChange={(v) => set('rencana_evaluasi', v)} />
            </GroupCard>
          </>
        )}
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
        <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </button>
        {step < last ? (
          <button type="button" onClick={() => setStep((s) => Math.min(last, s + 1))} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:opacity-60">
            Lanjut <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:opacity-60">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</> : <><Check className="h-4 w-4" /> Simpan Anamnesis</>}
          </button>
        )}
      </div>
    </div>
  )
}

/* ---------------- Read-only viewer ---------------- */

function ReadTable({ columns, rows }: { columns: ColumnDef[]; rows: Record<string, string>[] }) {
  if (!rows || rows.length === 0) return null
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead className="bg-gray-50 text-xs font-semibold text-gray-600">
          <tr>{columns.map((c) => <th key={c.key} className="px-3 py-2">{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r, i) => (
            <tr key={i}>{columns.map((c) => <td key={c.key} className="px-3 py-2 text-gray-700">{r[c.key] || '—'}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReadField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-800">{value}</p>
    </div>
  )
}

function ReadSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-teal-700">{title}</p>
      {children}
    </div>
  )
}

function Pills({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span key={t} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">{t}</span>
      ))}
    </div>
  )
}

function AnamnesisDetail({ raw }: { raw: AnamnesisData }) {
  const d = withDefaults(raw)
  const ttvParts = [
    d.ttv.tekanan_darah && `TD ${d.ttv.tekanan_darah}`,
    d.ttv.denyut_nadi && `Nadi ${d.ttv.denyut_nadi}`,
    d.ttv.suhu && `Suhu ${d.ttv.suhu}`,
    d.ttv.pernafasan && `RR ${d.ttv.pernafasan}`,
    d.ttv.tinggi_badan && `TB ${d.ttv.tinggi_badan}`,
    d.ttv.berat_badan && `BB ${d.ttv.berat_badan}`,
  ].filter(Boolean).join(' · ')

  const hasQuick = d.case_name || (d.pain_regions?.length ?? 0) > 0 || (d.keluhan_tags?.length ?? 0) > 0 ||
    d.onset || d.durasi || d.nyeri_skala != null || (d.modalitas?.length ?? 0) > 0

  return (
    <div className="space-y-5">
      {hasQuick && (
        <ReadSection title="Ringkasan">
          {d.case_name && (
            <span className="inline-block rounded-full bg-teal-600 px-2.5 py-1 text-xs font-bold text-white">{d.case_name}</span>
          )}
          {(d.pain_regions?.length ?? 0) > 0 && (
            <div><p className="text-xs font-semibold text-gray-500">Lokasi Keluhan</p><Pills items={d.pain_regions!.map((r) => r.label)} /></div>
          )}
          {(d.keluhan_tags?.length ?? 0) > 0 && (
            <div><p className="text-xs font-semibold text-gray-500">Keluhan</p><Pills items={d.keluhan_tags!} /></div>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            <ReadField label="Onset" value={d.onset} />
            <ReadField label="Durasi" value={d.durasi} />
            {d.nyeri_skala != null && <ReadField label="Skala Nyeri" value={`${d.nyeri_skala}/10`} />}
          </div>
          {(d.modalitas?.length ?? 0) > 0 && (
            <div><p className="text-xs font-semibold text-gray-500">Modalitas / Tindakan</p><Pills items={d.modalitas!} /></div>
          )}
        </ReadSection>
      )}

      <ReadSection title="Anamnesis">
        <div className="grid gap-2 sm:grid-cols-2">
          <ReadField label="Keluhan Utama" value={d.keluhan_utama} />
          <ReadField label="Riwayat Penyakit Sekarang" value={d.rps} />
          <ReadField label="Riwayat Penyakit Dahulu" value={d.rpd} />
          <ReadField label="Riwayat Penyakit Penyerta" value={d.rpp} />
          <ReadField label="Riwayat Penyakit Keluarga" value={d.rpk} />
        </div>
        <ReadTable columns={SISTEM_COLS} rows={d.anamnesis_sistem} />
      </ReadSection>

      {(ttvParts || d.inspeksi || d.palpasi || d.perkusi || d.gerak_aktif.length > 0 || d.gerak_pasif.length > 0 || d.isometrik.length > 0) && (
        <ReadSection title="Pemeriksaan Fisik">
          {ttvParts && <ReadField label="Tanda-tanda Vital" value={ttvParts} />}
          <div className="grid gap-2 sm:grid-cols-3">
            <ReadField label="Inspeksi" value={d.inspeksi} />
            <ReadField label="Palpasi" value={d.palpasi} />
            <ReadField label="Perkusi" value={d.perkusi} />
          </div>
          {d.gerak_aktif.length > 0 && <p className="text-xs font-semibold text-gray-500">Gerak Aktif</p>}
          <ReadTable columns={AKTIF_COLS} rows={d.gerak_aktif} />
          {d.gerak_pasif.length > 0 && <p className="text-xs font-semibold text-gray-500">Gerak Pasif</p>}
          <ReadTable columns={PASIF_COLS} rows={d.gerak_pasif} />
          {d.isometrik.length > 0 && <p className="text-xs font-semibold text-gray-500">Isometrik</p>}
          <ReadTable columns={AKTIF_COLS} rows={d.isometrik} />
        </ReadSection>
      )}

      {(d.kognitif || d.intrapersonal || d.interpersonal || d.kemampuan_fungsional) && (
        <ReadSection title="Kognitif & Fungsional">
          <div className="grid gap-2 sm:grid-cols-3">
            <ReadField label="Kognitif" value={d.kognitif} />
            <ReadField label="Intrapersonal" value={d.intrapersonal} />
            <ReadField label="Interpersonal" value={d.interpersonal} />
          </div>
          <ReadField label="Kemampuan Fungsional Dasar & Lingkungan" value={d.kemampuan_fungsional} />
        </ReadSection>
      )}

      {(d.nyeri_diam || d.nyeri_tekan || d.nyeri_gerak || d.antropometri.length > 0 || d.lgs || d.mmt) && (
        <ReadSection title="Nyeri & Antropometri">
          {(d.nyeri_diam || d.nyeri_tekan || d.nyeri_gerak) && (
            <div className="grid gap-2 sm:grid-cols-3">
              <ReadField label="Nyeri Diam" value={d.nyeri_diam} />
              <ReadField label="Nyeri Tekan" value={d.nyeri_tekan} />
              <ReadField label="Nyeri Gerak" value={d.nyeri_gerak} />
            </div>
          )}
          <ReadTable columns={ANTRO_COLS} rows={d.antropometri} />
          <div className="grid gap-2 sm:grid-cols-2">
            <ReadField label="LGS" value={d.lgs} />
            <ReadField label="MMT" value={d.mmt} />
          </div>
        </ReadSection>
      )}

      {(d.impairment || d.fungsional_limitation || d.disability) && (
        <ReadSection title="Diagnosa Fisioterapi">
          <ReadField label="Impairment" value={d.impairment} />
          <ReadField label="Functional Limitation" value={d.fungsional_limitation} />
          <ReadField label="Disability" value={d.disability} />
        </ReadSection>
      )}

      {(d.tujuan_jangka_pendek || d.tujuan_jangka_panjang || d.teknologi_ft || d.edukasi || d.rencana_evaluasi) && (
        <ReadSection title="Program / Rencana Fisioterapi">
          <div className="grid gap-2 sm:grid-cols-2">
            <ReadField label="Tujuan Jangka Pendek" value={d.tujuan_jangka_pendek} />
            <ReadField label="Tujuan Jangka Panjang" value={d.tujuan_jangka_panjang} />
          </div>
          <ReadField label="Teknologi Fisioterapi" value={d.teknologi_ft} />
          <ReadField label="Edukasi" value={d.edukasi} />
          <ReadField label="Rencana Evaluasi" value={d.rencana_evaluasi} />
        </ReadSection>
      )}
    </div>
  )
}

/* ---------------- Module (list + add) ---------------- */

function therapistName(t: unknown): string {
  return (t as { profile?: { full_name?: string } })?.profile?.full_name ?? 'Terapis'
}

export function FisioAnamnesisModule({ patientId, items, readOnly = false, discipline }: { patientId: string; items: Assessment[]; readOnly?: boolean; discipline?: string }) {
  const router = useRouter()
  // null = tidak sedang menambah. 'cepat' | 'lengkap' = mode form yang terbuka.
  const [adding, setAdding] = useState<null | 'cepat' | 'lengkap'>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  async function remove(id: string) {
    if (!confirm('Hapus anamnesis ini?')) return
    setBusyId(id)
    await fetch('/api/terapis/assessment', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    })
    setBusyId(null)
    router.refresh()
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-gray-900">
          <ClipboardList className="h-4 w-4 text-teal-600" /> Anamnesis
        </h2>
        {!adding && !readOnly && (
          <div className="flex items-center gap-2">
            <button onClick={() => setAdding('cepat')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-teal-700">
              <Zap className="h-4 w-4" /> Tambah (Cepat)
            </button>
            <button onClick={() => setAdding('lengkap')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-100">
              <ListChecks className="h-4 w-4" /> Lengkap
            </button>
          </div>
        )}
      </div>

      {!readOnly && adding === 'cepat' && <QuickForm patientId={patientId} discipline={discipline} onClose={() => setAdding(null)} onSwitch={() => setAdding('lengkap')} />}
      {!readOnly && adding === 'lengkap' && <AnamnesisWizard patientId={patientId} discipline={discipline} onClose={() => setAdding(null)} onSwitch={() => setAdding('cepat')} />}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">Belum ada anamnesis.</p>
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const open = openId === a.id
            const mode = (a.data as AnamnesisData | null)?.mode
            return (
              <div key={a.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => setOpenId(open ? null : a.id)} className="min-w-0 flex-1 text-left">
                    <p className="text-xs text-gray-500">
                      {formatDate(a.created_at)} · oleh {therapistName(a.therapist)}
                      {mode === 'cepat' && <span className="ml-2 rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-600">CEPAT</span>}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">
                      {a.data?.keluhan_utama || a.chief_complaint || 'Anamnesis fisioterapi'}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-teal-600">{open ? 'Sembunyikan detail ▲' : 'Lihat detail ▼'}</p>
                  </button>
                  {!readOnly && (
                    <button onClick={() => remove(a.id)} disabled={busyId === a.id} aria-label="Hapus"
                      className="shrink-0 text-gray-300 transition-colors hover:text-red-500 disabled:opacity-50">
                      {busyId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  )}
                </div>

                {open && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    {a.data
                      ? <AnamnesisDetail raw={a.data} />
                      : (
                        <dl className="grid gap-2 text-sm sm:grid-cols-2">
                          <ReadField label="Keluhan Utama" value={a.chief_complaint} />
                          <ReadField label="Riwayat" value={a.history} />
                          <ReadField label="Pemeriksaan Fisik" value={a.physical_exam} />
                          <ReadField label="ROM" value={a.rom} />
                          {a.pain_scale != null && <ReadField label="Skala Nyeri" value={`${a.pain_scale}/10`} />}
                          <ReadField label="Catatan" value={a.notes} />
                        </dl>
                      )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
