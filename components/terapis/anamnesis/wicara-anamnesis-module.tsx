'use client'

// ============================================================
// FORM ASESMEN — KHUSUS TERAPI WICARA (ANAK & DEWASA)
// Struktur form IDENTIK dengan Okupasi Terapi (schema-driven: satu renderer
// generik + satu viewer generik), tapi ISI field-nya khusus terapi wicara:
// keluhan & riwayat, pendengaran & organ bicara, bahasa reseptif & ekspresif,
// artikulasi & fonologi, kelancaran/suara/pragmatik, lalu kesimpulan & program.
//
// Dua mode (sama seperti OT):
//  • MODE CEPAT  → input "klik-klik" (pilih kasus TW, chip area komunikasi,
//    tingkat kejelasan bicara, chip intervensi). Cepat untuk harian.
//  • MODE LENGKAP → wizard 7 langkah pemeriksaan terapi wicara (detail).
// Keduanya disimpan utuh sebagai JSONB di `assessments.data` (endpoint sama).
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Loader2, X, ChevronLeft, ChevronRight, Check, ClipboardList, Zap, ListChecks,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Assessment } from '@/types'
import { WICARA_CASES, AREA_TAGS, INTERVENSI_TAGS, INTELLIGIBILITY_OPTIONS } from './wicara-cases'
import { CaseDropdown, ChipMultiAdd, type CaseLike } from './case-templates'

/* ============================================================
   SKEMA FORM
   ============================================================ */

type Item = { key: string; label: string }

type Block =
  | { kind: 'textarea'; key: string; label: string; hint?: string; rows?: number }
  | { kind: 'line'; key: string; label: string; hint?: string }
  // checklist: daftar item. Tiap item punya 1 input singkat (mis. "+/-", usia, catatan).
  | { kind: 'checklist'; key: string; label: string; hint?: string; items: Item[] }
  // grid: tabel baris×kolom tetap (struktur & fungsi organ bicara).
  | { kind: 'grid'; key: string; label: string; hint?: string; rows: Item[]; cols: Item[] }
  // dyntable: tabel baris dinamis (Program Terapi Wicara).
  | { kind: 'dyntable'; key: string; label: string; hint?: string; cols: Item[] }
  // heading: sub-judul visual di dalam satu step.
  | { kind: 'heading'; label: string }

type Step = { title: string; blocks: Block[] }

const PLUS_MINUS = '+ = mampu / muncul · − = tidak / belum (boleh diisi usia tercapai / catatan)'

const STEPS: Step[] = [
  /* ---------- STEP 1 — KELUHAN & RIWAYAT ---------- */
  {
    title: 'Keluhan & Riwayat',
    blocks: [
      { kind: 'heading', label: 'Keluhan' },
      { kind: 'textarea', key: 'keluhan_utama', label: 'Keluhan Utama', hint: 'Mis. belum bisa bicara, bicara tidak jelas, gagap, sulit menelan.' },
      { kind: 'line', key: 'sumber_rujukan', label: 'Sumber / Rujukan', hint: 'Datang sendiri / rujukan dokter (THT, anak, saraf), dll.' },

      { kind: 'heading', label: 'Riwayat Kehamilan & Kelahiran' },
      { kind: 'textarea', key: 'riwayat_prenatal', label: 'Prenatal (kehamilan)', hint: 'Kesehatan ibu, obat, sakit selama hamil.' },
      { kind: 'textarea', key: 'riwayat_natal', label: 'Natal (kelahiran)', hint: 'Spontan/SC, cukup bulan/prematur, berat lahir, asfiksia/biru.' },
      { kind: 'textarea', key: 'riwayat_postnatal', label: 'Postnatal (setelah lahir)', hint: 'Kuning, kejang, dirawat, dll.' },

      { kind: 'heading', label: 'Riwayat Perkembangan Bicara' },
      {
        kind: 'checklist', key: 'milestone_bicara', label: 'Tonggak Perkembangan (isi usia tercapai)', hint: PLUS_MINUS,
        items: [
          { key: 'cooing', label: 'Cooing / mengoceh vokal (±2–4 bln)' },
          { key: 'babbling', label: 'Babbling / mengoceh (mama-baba) (±6–9 bln)' },
          { key: 'kata_pertama', label: 'Kata pertama bermakna (±12 bln)' },
          { key: 'dua_kata', label: 'Gabung 2 kata (±18–24 bln)' },
          { key: 'kalimat', label: 'Kalimat sederhana (±2–3 th)' },
        ],
      },
      { kind: 'textarea', key: 'riwayat_perkembangan_lain', label: 'Perkembangan Lain (motorik, sosial)', hint: 'Duduk, jalan, kontak mata, bermain — bandingkan dengan usia.' },

      { kind: 'heading', label: 'Riwayat Medis & Lingkungan' },
      { kind: 'textarea', key: 'riwayat_medis', label: 'Riwayat Medis', hint: 'Infeksi telinga berulang, ISPA, kejang, operasi, alergi, obat rutin.' },
      { kind: 'line', key: 'lingkungan_bahasa', label: 'Lingkungan Bahasa', hint: 'Satu bahasa / dua bahasa (bilingual), bahasa utama di rumah.' },
      { kind: 'line', key: 'screen_time', label: 'Screen Time (gadget/TV per hari)' },
      { kind: 'textarea', key: 'riwayat_keluarga', label: 'Riwayat Keluarga', hint: 'Ada anggota keluarga dengan keterlambatan bicara/gagap/gangguan dengar?' },
    ],
  },

  /* ---------- STEP 2 — PENDENGARAN & ORGAN BICARA ---------- */
  {
    title: 'Pendengaran & Organ Bicara',
    blocks: [
      { kind: 'heading', label: 'Skrining Pendengaran' },
      {
        kind: 'checklist', key: 'pendengaran', label: 'Respon Pendengaran', hint: PLUS_MINUS,
        items: [
          { key: 'respon_nama', label: 'Menengok saat dipanggil nama' },
          { key: 'respon_suara', label: 'Bereaksi terhadap suara keras' },
          { key: 'cari_sumber', label: 'Mencari arah sumber suara' },
          { key: 'respon_bisik', label: 'Merespon suara pelan / bisikan' },
        ],
      },
      { kind: 'line', key: 'hasil_tes_dengar', label: 'Hasil Tes Pendengaran (bila ada)', hint: 'Mis. OAE, BERA, audiometri — tanggal & hasil.' },
      { kind: 'textarea', key: 'pendengaran_ket', label: 'Catatan Pendengaran' },

      { kind: 'heading', label: 'Pemeriksaan Organ Bicara (Oral Peripheral)' },
      {
        kind: 'grid', key: 'organ_bicara', label: 'Struktur & Fungsi Organ Bicara',
        hint: 'Catat normal / kelainan pada struktur dan gerak tiap organ.',
        rows: [
          { key: 'bibir', label: 'Bibir' },
          { key: 'lidah', label: 'Lidah' },
          { key: 'rahang', label: 'Rahang' },
          { key: 'palatum', label: 'Palatum (langit keras)' },
          { key: 'velum', label: 'Velum (langit lunak)' },
          { key: 'gigi', label: 'Gigi & gigitan' },
          { key: 'pipi', label: 'Pipi' },
        ],
        cols: [
          { key: 'struktur', label: 'Struktur' },
          { key: 'fungsi', label: 'Fungsi / Gerak' },
        ],
      },
      {
        kind: 'checklist', key: 'oral_motor', label: 'Kemampuan Oral Motor', hint: PLUS_MINUS,
        items: [
          { key: 'julur_lidah', label: 'Menjulurkan lidah' },
          { key: 'lidah_samping', label: 'Menggerakkan lidah ke samping' },
          { key: 'angkat_lidah', label: 'Mengangkat lidah ke langit-langit' },
          { key: 'katup_bibir', label: 'Mengatupkan & memonyongkan bibir' },
          { key: 'meniup', label: 'Meniup' },
          { key: 'menghisap', label: 'Menghisap' },
          { key: 'mengunyah', label: 'Mengunyah' },
        ],
      },
      { kind: 'line', key: 'tongue_tie', label: 'Tongue-tie / Ankyloglossia', hint: 'Ada / tidak — perlekatan lidah.' },
      { kind: 'line', key: 'drooling', label: 'Drooling (mengiler)', hint: 'Ada / tidak, derajatnya.' },
      { kind: 'textarea', key: 'oral_ket', label: 'Catatan Oral Motor' },
    ],
  },

  /* ---------- STEP 3 — BAHASA RESEPTIF ---------- */
  {
    title: 'Bahasa Reseptif',
    blocks: [
      { kind: 'textarea', key: 'pemahaman_umum', label: 'Pemahaman Bahasa (umum)', rows: 3 },
      {
        kind: 'checklist', key: 'reseptif', label: 'Kemampuan Reseptif', hint: PLUS_MINUS,
        items: [
          { key: 'respon_nama', label: 'Merespon namanya' },
          { key: 'tunjuk_objek', label: 'Menunjuk objek yang disebut' },
          { key: 'tunjuk_gambar', label: 'Menunjuk gambar yang disebut' },
          { key: 'anggota_tubuh', label: 'Menunjuk anggota tubuh' },
          { key: 'perintah_1', label: 'Mengikuti perintah 1 tahap' },
          { key: 'perintah_2', label: 'Mengikuti perintah 2 tahap' },
          { key: 'perintah_3', label: 'Mengikuti perintah 3 tahap' },
          { key: 'konsep', label: 'Memahami konsep (besar/kecil, warna, dll.)' },
          { key: 'kata_tanya', label: 'Memahami kata tanya (apa/siapa/di mana)' },
        ],
      },
      { kind: 'textarea', key: 'reseptif_ket', label: 'Catatan Bahasa Reseptif' },
    ],
  },

  /* ---------- STEP 4 — BAHASA EKSPRESIF ---------- */
  {
    title: 'Bahasa Ekspresif',
    blocks: [
      { kind: 'line', key: 'jumlah_kosakata', label: 'Perkiraan Jumlah Kosakata' },
      { kind: 'line', key: 'mlu', label: 'Panjang Kalimat Rata-rata (MLU)', hint: 'Jumlah kata per ucapan, mis. 1 kata / 2–3 kata / kalimat.' },
      {
        kind: 'checklist', key: 'ekspresif', label: 'Kemampuan Ekspresif', hint: PLUS_MINUS,
        items: [
          { key: 'meniru_suara', label: 'Meniru suara / kata' },
          { key: 'kata_tunggal', label: 'Mengucap kata tunggal bermakna' },
          { key: 'dua_kata', label: 'Menggabungkan 2 kata' },
          { key: 'tiga_kata', label: 'Menggabungkan 3 kata / lebih' },
          { key: 'kalimat', label: 'Kalimat lengkap' },
          { key: 'kata_tanya', label: 'Menggunakan kata tanya' },
          { key: 'bercerita', label: 'Bercerita / menjawab pertanyaan' },
          { key: 'tata_bahasa', label: 'Tata bahasa (imbuhan, kata sambung)' },
        ],
      },
      { kind: 'line', key: 'gestur', label: 'Penggunaan Gestur / Non-verbal', hint: 'Menunjuk, melambai, bahasa isyarat — sebagai kompensasi.' },
      { kind: 'textarea', key: 'ekspresif_ket', label: 'Catatan Bahasa Ekspresif' },
    ],
  },

  /* ---------- STEP 5 — ARTIKULASI & FONOLOGI ---------- */
  {
    title: 'Artikulasi & Fonologi',
    blocks: [
      {
        kind: 'textarea', key: 'inventori_fonem', label: 'Inventori Bunyi / Fonem', rows: 3,
        hint: 'Bunyi yang SUDAH dikuasai dan yang BELUM (vokal & konsonan).',
      },
      {
        kind: 'checklist', key: 'kesalahan_artikulasi', label: 'Jenis Kesalahan Artikulasi', hint: 'Isi contoh bunyi/kata yang salah.',
        items: [
          { key: 'substitusi', label: 'Substitusi (bunyi diganti, mis. "r"→"l")' },
          { key: 'omisi', label: 'Omisi (bunyi dihilangkan)' },
          { key: 'distorsi', label: 'Distorsi (bunyi tidak tepat/cadel)' },
          { key: 'adisi', label: 'Adisi (bunyi ditambah)' },
        ],
      },
      {
        kind: 'textarea', key: 'proses_fonologi', label: 'Proses Fonologis', rows: 3,
        hint: 'Mis. fronting, stopping, penghilangan konsonan akhir, reduksi gugus konsonan.',
      },
      { kind: 'line', key: 'intelligibility', label: 'Kejelasan Bicara (Intelligibility)', hint: 'Perkiraan % bicara yang dipahami orang asing / catatan.' },
      { kind: 'textarea', key: 'artikulasi_ket', label: 'Catatan Artikulasi & Fonologi' },
    ],
  },

  /* ---------- STEP 6 — KELANCARAN, SUARA & PRAGMATIK ---------- */
  {
    title: 'Kelancaran, Suara & Pragmatik',
    blocks: [
      { kind: 'heading', label: 'Kelancaran (Fluency)' },
      {
        kind: 'checklist', key: 'kelancaran', label: 'Pola Ketidaklancaran', hint: 'Tandai bila ada & beri contoh/frekuensi.',
        items: [
          { key: 'pengulangan_bunyi', label: 'Pengulangan bunyi (b-b-bola)' },
          { key: 'pengulangan_suku', label: 'Pengulangan suku/kata' },
          { key: 'perpanjangan', label: 'Perpanjangan bunyi (mmmama)' },
          { key: 'blocking', label: 'Blocking (tersendat/terhenti)' },
          { key: 'sekunder', label: 'Gerakan penyerta (kedip, tegang)' },
        ],
      },
      { kind: 'line', key: 'tingkat_gagap', label: 'Tingkat Gagap (ringan/sedang/berat)' },

      { kind: 'heading', label: 'Suara & Resonansi' },
      {
        kind: 'checklist', key: 'suara', label: 'Karakteristik Suara',
        items: [
          { key: 'pitch', label: 'Pitch / nada (tinggi/rendah/monoton)' },
          { key: 'kenyaringan', label: 'Kenyaringan (terlalu keras/lemah)' },
          { key: 'kualitas', label: 'Kualitas (serak, breathy, parau)' },
          { key: 'resonansi', label: 'Resonansi (hipernasal/hiponasal)' },
        ],
      },
      { kind: 'textarea', key: 'suara_ket', label: 'Catatan Suara' },

      { kind: 'heading', label: 'Pragmatik / Komunikasi Sosial' },
      {
        kind: 'checklist', key: 'pragmatik', label: 'Kemampuan Pragmatik', hint: PLUS_MINUS,
        items: [
          { key: 'kontak_mata', label: 'Kontak mata' },
          { key: 'joint_attention', label: 'Atensi bersama (joint attention)' },
          { key: 'giliran', label: 'Giliran bicara (turn-taking)' },
          { key: 'inisiasi', label: 'Memulai komunikasi' },
          { key: 'respon', label: 'Merespon komunikasi lawan bicara' },
          { key: 'gestur_sosial', label: 'Gestur sosial (menunjuk, melambai)' },
          { key: 'ekspresi', label: 'Ekspresi wajah & emosi' },
        ],
      },
      { kind: 'textarea', key: 'pragmatik_ket', label: 'Catatan Pragmatik' },
    ],
  },

  /* ---------- STEP 7 — KESIMPULAN & PROGRAM TW ---------- */
  {
    title: 'Kesimpulan & Program',
    blocks: [
      { kind: 'textarea', key: 'ringkasan_kasus', label: 'Ringkasan Kasus', rows: 5 },
      { kind: 'textarea', key: 'kesimpulan_problematik', label: 'Kesimpulan Problematik / Diagnosis Terapi Wicara', rows: 4 },
      {
        kind: 'dyntable', key: 'program_tw', label: 'Program Terapi Wicara',
        cols: [
          { key: 'prioritas', label: 'Prioritas Masalah' },
          { key: 'tujuan', label: 'Tujuan Terapi' },
          { key: 'intervensi', label: 'Intervensi (aktivitas, metode, teknik)' },
          { key: 'frekuensi', label: 'Frekuensi / Durasi' },
          { key: 'ket', label: 'Keterangan' },
        ],
      },
      { kind: 'textarea', key: 'home_program', label: 'Home Program', rows: 4 },
      { kind: 'textarea', key: 'evaluasi', label: 'Evaluasi / Follow-up', rows: 4 },
    ],
  },
]

const STEP_TITLES = STEPS.map((s) => s.title)

/* ============================================================
   STYLES
   ============================================================ */

const inputCls =
  'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'
const cellCls =
  'w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

// Kelas grid statis (Tailwind JIT tidak mendeteksi kelas hasil concat dinamis).
function colGridCls(n: number) {
  return n >= 4 ? 'grid-cols-2 sm:grid-cols-4'
    : n === 3 ? 'grid-cols-1 sm:grid-cols-3'
      : n === 2 ? 'grid-cols-2'
        : 'grid-cols-1'
}

/* ============================================================
   MODE CEPAT — helper komponen (klik-klik) untuk terapi wicara
   ============================================================ */

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

function QuickLineField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} placeholder={placeholder} />
    </div>
  )
}

function QuickTextField({ label, value, onChange, rows = 3, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={`${inputCls} resize-y`} placeholder={placeholder} />
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

/* ---------------- Save helper (dipakai cepat & lengkap) ---------------- */

// Ringkasan untuk daftar/preview asesmen TW.
function buildTwSummary(d: Data): string {
  const s =
    (typeof d.keluhan_utama === 'string' && d.keluhan_utama.trim()) ||
    (typeof d.case_name === 'string' && d.case_name.trim()) ||
    (typeof d.ringkasan_kasus === 'string' && d.ringkasan_kasus.trim()) ||
    (typeof d.kesimpulan_problematik === 'string' && d.kesimpulan_problematik.trim()) ||
    ''
  return s ? s.slice(0, 160) : ''
}

async function saveTwAssessment(patientId: string, d: Data, discipline?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const summary = buildTwSummary(d)
    const res = await fetch('/api/terapis/assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patientId,
        data: { ...d, form_type: 'wicara' },
        chief_complaint: summary || undefined,
        discipline,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      return { ok: false, error: j.error ?? 'Gagal menyimpan.' }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Terjadi kesalahan jaringan.' }
  }
}

/* ---------------- MODE CEPAT (form klik-klik TW) ---------------- */

function QuickForm({ patientId, discipline, onClose, onSwitch }: { patientId: string; discipline?: string; onClose: () => void; onSwitch: () => void }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [d, setD] = useState<Data>({ mode: 'cepat', area_tags: [], intervensi_tags: [] })

  function set(key: string, val: unknown) {
    setD((prev) => ({ ...prev, [key]: val }))
  }
  function pickCase(c: CaseLike) {
    setD((prev) => ({ ...prev, ...c.data, case_template: c.id, case_name: c.name }))
  }

  async function save() {
    setSaving(true); setError('')
    const r = await saveTwAssessment(patientId, { ...d, mode: 'cepat' }, discipline)
    if (!r.ok) { setError(r.error ?? 'Gagal menyimpan.'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  return (
    <div className="mb-4 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bold text-gray-900">
          <ClipboardList className="h-4 w-4 text-teal-600" /> Asesmen TW Cepat
        </h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onSwitch} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50">
            Mode Lengkap →
          </button>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <QuickSection title="1. Pilih Kasus" hint="Pilih kasus atau tambah kasus baru">
          <CaseDropdown discipline={discipline} presets={WICARA_CASES}
            activeId={typeof d.case_template === 'string' ? d.case_template : undefined}
            currentData={d} onApply={pickCase} />
        </QuickSection>

        <QuickSection title="2. Keluhan Orang Tua / Pasien / Rujukan">
          <QuickLineField label="Keluhan utama" value={(d.keluhan_utama as string) ?? ''} onChange={(v) => set('keluhan_utama', v)}
            placeholder="Contoh: Belum bisa bicara, bicara tidak jelas, gagap" />
        </QuickSection>

        <QuickSection title="3. Area Komunikasi Bermasalah" hint="Pilih semua ranah yang terganggu.">
          <ChipMultiAdd options={AREA_TAGS} value={(d.area_tags as string[]) ?? []} onChange={(v) => set('area_tags', v)} />
        </QuickSection>

        <QuickSection title="4. Tingkat Kejelasan Bicara">
          <ChipSingle options={INTELLIGIBILITY_OPTIONS} value={(d.intelligibility as string) ?? ''} onChange={(v) => set('intelligibility', v)} />
        </QuickSection>

        <QuickSection title="5. Kesimpulan / Diagnosis TW" hint="Terisi dari kasus — koreksi seperlunya.">
          <QuickTextField label="Kesimpulan problematik" value={(d.kesimpulan_problematik as string) ?? ''} onChange={(v) => set('kesimpulan_problematik', v)} />
        </QuickSection>

        <QuickSection title="6. Rencana Intervensi TW">
          <ChipMultiAdd options={INTERVENSI_TAGS} value={(d.intervensi_tags as string[]) ?? []} onChange={(v) => set('intervensi_tags', v)} />
        </QuickSection>

        <QuickSection title="7. Home Program">
          <QuickTextField label="Program di rumah / edukasi keluarga" value={(d.home_program as string) ?? ''} onChange={(v) => set('home_program', v)}
            placeholder="Saran latihan & aktivitas yang dilakukan di rumah" />
        </QuickSection>
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
        <button type="button" onClick={onClose} disabled={saving}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40">
          Batal
        </button>
        <button type="button" onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:opacity-60">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</> : <><Check className="h-4 w-4" /> Simpan Asesmen</>}
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   EDITOR (generik, schema-driven)
   ============================================================ */

type Data = Record<string, any>

function BlockEditor({ block, d, set }: { block: Block; d: Data; set: (key: string, val: any) => void }) {
  if (block.kind === 'heading') {
    return <h4 className="border-b border-gray-100 pb-1.5 pt-2 text-sm font-bold text-teal-700">{block.label}</h4>
  }

  if (block.kind === 'textarea') {
    return (
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-800">{block.label}</label>
        {block.hint && <p className="mb-1 text-xs text-gray-400">{block.hint}</p>}
        <textarea value={d[block.key] ?? ''} onChange={(e) => set(block.key, e.target.value)}
          rows={block.rows ?? 2} className={`${inputCls} resize-y`} />
      </div>
    )
  }

  if (block.kind === 'line') {
    return (
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-800">{block.label}</label>
        {block.hint && <p className="mb-1 text-xs text-gray-400">{block.hint}</p>}
        <input value={d[block.key] ?? ''} onChange={(e) => set(block.key, e.target.value)} className={inputCls} />
      </div>
    )
  }

  if (block.kind === 'checklist') {
    const vals: Record<string, string> = d[block.key] ?? {}
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 sm:p-4">
        <p className="text-sm font-bold text-gray-800">{block.label}</p>
        {block.hint && <p className="mb-1 text-xs text-gray-400">{block.hint}</p>}
        <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
          {block.items.map((it) => (
            <div key={it.key}>
              <label className="mb-0.5 block text-[11px] font-medium text-gray-500">{it.label}</label>
              <input value={vals[it.key] ?? ''}
                onChange={(e) => set(block.key, { ...vals, [it.key]: e.target.value })}
                className={cellCls} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (block.kind === 'grid') {
    const vals: Record<string, Record<string, string>> = d[block.key] ?? {}
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 sm:p-4">
        <p className="text-sm font-bold text-gray-800">{block.label}</p>
        {block.hint && <p className="mb-1 text-xs text-gray-400">{block.hint}</p>}
        <div className="mt-2 space-y-2.5">
          {block.rows.map((r) => {
            const row = vals[r.key] ?? {}
            return (
              <div key={r.key} className="rounded-xl border border-gray-200 bg-white p-2.5">
                <p className="mb-1.5 text-xs font-semibold text-gray-700">{r.label}</p>
                <div className={`grid gap-2 ${colGridCls(block.cols.length)}`}>
                  {block.cols.map((c) => (
                    <div key={c.key}>
                      <label className="mb-0.5 block text-[11px] font-medium text-gray-500">{c.label}</label>
                      <input value={row[c.key] ?? ''}
                        onChange={(e) => set(block.key, { ...vals, [r.key]: { ...row, [c.key]: e.target.value } })}
                        className={cellCls} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // dyntable. Tangkap field ter-narrow ke const dulu — TS kehilangan narrowing
  // discriminated-union `block` di dalam closure (addRow) bila diakses langsung.
  const dynKey = block.key
  const dynCols = block.cols
  const rows: Record<string, string>[] = d[dynKey] ?? []
  function addRow() {
    const blank: Record<string, string> = {}
    dynCols.forEach((c) => (blank[c.key] = ''))
    set(dynKey, [...rows, blank])
  }
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-gray-800">{block.label}</p>
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
              <div className="grid gap-2 sm:grid-cols-2">
                {block.cols.map((c) => (
                  <div key={c.key}>
                    <label className="mb-0.5 block text-[11px] font-medium text-gray-500">{c.label}</label>
                    <input value={row[c.key] ?? ''}
                      onChange={(e) => set(block.key, rows.map((rr, idx) => (idx === i ? { ...rr, [c.key]: e.target.value } : rr)))}
                      className={cellCls} />
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => set(block.key, rows.filter((_, idx) => idx !== i))} aria-label="Hapus baris"
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

/* ---------------- Stepper ---------------- */

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

/* ---------------- Wizard ---------------- */

function AssessmentWizard({ patientId, discipline, onClose, onSwitch }: { patientId: string; discipline?: string; onClose: () => void; onSwitch: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [d, setD] = useState<Data>({ mode: 'lengkap' })

  function set(key: string, val: any) {
    setD((prev) => ({ ...prev, [key]: val }))
  }

  const last = STEPS.length - 1

  async function save() {
    setSaving(true); setError('')
    const r = await saveTwAssessment(patientId, { ...d, mode: 'lengkap' }, discipline)
    if (!r.ok) { setError(r.error ?? 'Gagal menyimpan.'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  return (
    <div className="mb-4 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold text-gray-900">
          <ClipboardList className="h-4 w-4 text-teal-600" /> Form Asesmen Terapi Wicara
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
        {STEPS[step].blocks.map((block, i) => (
          <BlockEditor key={block.kind === 'heading' ? `h${i}` : (block as any).key} block={block} d={d} set={set} />
        ))}
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
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</> : <><Check className="h-4 w-4" /> Simpan Asesmen</>}
          </button>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   VIEWER (read-only, generik)
   ============================================================ */

function nonEmpty(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0
}

function BlockView({ block, d }: { block: Block; d: Data }) {
  if (block.kind === 'heading') return null

  if (block.kind === 'textarea' || block.kind === 'line') {
    const v = d[block.key]
    if (!nonEmpty(v)) return null
    return (
      <div>
        <p className="text-xs font-semibold text-gray-500">{block.label}</p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-800">{v}</p>
      </div>
    )
  }

  if (block.kind === 'checklist') {
    const vals: Record<string, string> = d[block.key] ?? {}
    const filled = block.items.filter((it) => nonEmpty(vals[it.key]))
    if (filled.length === 0) return null
    return (
      <div>
        <p className="text-xs font-semibold text-gray-500">{block.label}</p>
        <dl className="mt-0.5 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
          {filled.map((it) => (
            <div key={it.key} className="flex gap-1.5 text-sm">
              <dt className="text-gray-500">{it.label}:</dt>
              <dd className="font-medium text-gray-800">{vals[it.key]}</dd>
            </div>
          ))}
        </dl>
      </div>
    )
  }

  if (block.kind === 'grid') {
    const vals: Record<string, Record<string, string>> = d[block.key] ?? {}
    const filledRows = block.rows.filter((r) => block.cols.some((c) => nonEmpty(vals[r.key]?.[c.key])))
    if (filledRows.length === 0) return null
    return (
      <div>
        <p className="mb-1 text-xs font-semibold text-gray-500">{block.label}</p>
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full min-w-[20rem] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-600">
              <tr>
                <th className="px-3 py-2"></th>
                {block.cols.map((c) => <th key={c.key} className="px-3 py-2">{c.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filledRows.map((r) => (
                <tr key={r.key}>
                  <td className="px-3 py-2 font-medium text-gray-700">{r.label}</td>
                  {block.cols.map((c) => <td key={c.key} className="px-3 py-2 text-gray-700">{vals[r.key]?.[c.key] || '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // dyntable
  const rows: Record<string, string>[] = d[block.key] ?? []
  const filled = rows.filter((row) => block.cols.some((c) => nonEmpty(row[c.key])))
  if (filled.length === 0) return null
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-gray-500">{block.label}</p>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-600">
            <tr>{block.cols.map((c) => <th key={c.key} className="px-3 py-2">{c.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filled.map((row, i) => (
              <tr key={i}>{block.cols.map((c) => <td key={c.key} className="px-3 py-2 text-gray-700">{row[c.key] || '—'}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function QuickPills({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span key={t} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">{t}</span>
      ))}
    </div>
  )
}

// Ringkasan mode cepat (ditampilkan bila ada field cepat TW).
function QuickSummary({ d }: { d: Data }) {
  const area = Array.isArray(d.area_tags) ? (d.area_tags as string[]) : []
  const intervensi = Array.isArray(d.intervensi_tags) ? (d.intervensi_tags as string[]) : []
  const caseName = typeof d.case_name === 'string' ? d.case_name : ''
  const keluhan = typeof d.keluhan_utama === 'string' ? d.keluhan_utama : ''
  const intelligibility = typeof d.intelligibility === 'string' ? d.intelligibility : ''
  const has = caseName || keluhan || intelligibility || area.length > 0 || intervensi.length > 0
  if (!has) return null
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-teal-700">Ringkasan</p>
      {caseName && <span className="inline-block rounded-full bg-teal-600 px-2.5 py-1 text-xs font-bold text-white">{caseName}</span>}
      {keluhan && (
        <div><p className="text-xs font-semibold text-gray-500">Keluhan</p><p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-800">{keluhan}</p></div>
      )}
      {area.length > 0 && (
        <div><p className="text-xs font-semibold text-gray-500">Area Bermasalah</p><QuickPills items={area} /></div>
      )}
      {intelligibility && (
        <div><p className="text-xs font-semibold text-gray-500">Tingkat Kejelasan Bicara</p><p className="mt-0.5 text-sm font-medium text-gray-800">{intelligibility}</p></div>
      )}
      {intervensi.length > 0 && (
        <div><p className="text-xs font-semibold text-gray-500">Rencana Intervensi TW</p><QuickPills items={intervensi} /></div>
      )}
    </div>
  )
}

function AssessmentDetail({ raw }: { raw: Data }) {
  return (
    <div className="space-y-5">
      <QuickSummary d={raw} />
      {STEPS.map((s) => {
        // Tampilkan section hanya bila ada minimal satu block berisi.
        const hasAny = s.blocks.some((b) => {
          if (b.kind === 'heading') return false
          const v = raw[b.key]
          if (b.kind === 'textarea' || b.kind === 'line') return nonEmpty(v)
          if (b.kind === 'checklist') return b.items.some((it) => nonEmpty((v as any)?.[it.key]))
          if (b.kind === 'grid') return b.rows.some((r) => b.cols.some((c) => nonEmpty((v as any)?.[r.key]?.[c.key])))
          return Array.isArray(v) && v.some((row: any) => b.cols.some((c) => nonEmpty(row?.[c.key])))
        })
        if (!hasAny) return null
        return (
          <div key={s.title} className="space-y-2">
            <p className="text-sm font-bold text-teal-700">{s.title}</p>
            {s.blocks.map((b, i) => <BlockView key={b.kind === 'heading' ? `h${i}` : (b as any).key} block={b} d={raw} />)}
          </div>
        )
      })}
    </div>
  )
}

/* ============================================================
   MODULE (list + add + delete)
   ============================================================ */

function therapistName(t: unknown): string {
  return (t as { profile?: { full_name?: string } })?.profile?.full_name ?? 'Terapis'
}

export function WicaraAnamnesisModule({ patientId, items, readOnly = false, discipline }: { patientId: string; items: Assessment[]; readOnly?: boolean; discipline?: string }) {
  const router = useRouter()
  // null = tidak sedang menambah. 'cepat' | 'lengkap' = mode form yang terbuka.
  const [adding, setAdding] = useState<null | 'cepat' | 'lengkap'>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  async function remove(id: string) {
    if (!confirm('Hapus asesmen ini?')) return
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
          <ClipboardList className="h-4 w-4 text-teal-600" /> Asesmen Terapi Wicara
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
      {!readOnly && adding === 'lengkap' && <AssessmentWizard patientId={patientId} discipline={discipline} onClose={() => setAdding(null)} onSwitch={() => setAdding('cepat')} />}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">Belum ada asesmen.</p>
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const open = openId === a.id
            const data = (a.data as Data | null) ?? null
            const isQuick = data?.mode === 'cepat'
            const title =
              (typeof data?.keluhan_utama === 'string' && data.keluhan_utama) ||
              a.chief_complaint ||
              (typeof data?.case_name === 'string' && data.case_name) ||
              'Asesmen Terapi Wicara'
            return (
              <div key={a.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => setOpenId(open ? null : a.id)} className="min-w-0 flex-1 text-left">
                    <p className="text-xs text-gray-500">
                      {formatDate(a.created_at)} · oleh {therapistName(a.therapist)}
                      {isQuick && <span className="ml-2 rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-600">CEPAT</span>}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">
                      {title}
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
                    {data
                      ? <AssessmentDetail raw={data} />
                      : (
                        <dl className="grid gap-2 text-sm sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold text-gray-500">Keluhan / Ringkasan</p>
                            <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-800">{a.chief_complaint || '—'}</p>
                          </div>
                          {a.notes && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500">Catatan</p>
                              <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-800">{a.notes}</p>
                            </div>
                          )}
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
