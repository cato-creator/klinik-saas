// ============================================================
// REGISTRY DISIPLIN KLINIK (extensible)
// ============================================================
// Satu sumber kebenaran untuk semua jenis layanan/disiplin terapi yang didukung
// platform. Setiap klinik MEMBUKA satu atau lebih disiplin (kolom
// `clinics.specializations`). Setiap pasien & terapis menempel ke SATU disiplin
// (kolom `patients.discipline` / `therapists.discipline`) yang menentukan form
// anamnesis/asesmen yang dipakai.
//
// MENAMBAH JENIS BARU (mis. Terapi Wicara, dokter gigi, RO) cukup:
//   1) tambah satu entri di DISCIPLINES di bawah, dan
//   2) (kalau formnya beda) buat modul anamnesis-nya lalu petakan lewat `anamnesis`.
// Tidak perlu mengubah form pendaftaran/booking/terapis — semuanya membaca registry ini.
//
// Catatan: nilai `key` disimpan di DB (clinic_type / specializations / discipline)
// jadi JANGAN mengganti key yang sudah dipakai. `clinic_type` tidak lagi dibatasi
// CHECK constraint di DB (migrasi 0017) — validasi nilai dilakukan di sini.

import { Activity, Brain, MessageCircle, type LucideIcon } from 'lucide-react'

/** Modul form anamnesis/asesmen yang dirender untuk sebuah disiplin. */
export type AnamnesisKind = 'fisio' | 'okupasi' | 'wicara' | 'generic'

export interface Discipline {
  /** Kunci stabil yang disimpan di DB. JANGAN diubah setelah dipakai. */
  key: string
  /** Nama lengkap untuk ditampilkan. */
  label: string
  /** Singkatan/chip pendek. */
  short: string
  /** Deskripsi singkat untuk kartu pilihan. */
  desc: string
  /** Ikon (lucide-react). */
  icon: LucideIcon
  /** Form anamnesis yang dipakai. Jenis baru tanpa form khusus → 'generic'. */
  anamnesis: AnamnesisKind
  /**
   * Warna aksen (kelas Tailwind literal) untuk badge disiplin — dipakai di landing
   * klinik CAMPURAN agar tiap terapis menampilkan profesinya dengan warna sendiri.
   */
  accent: { badge: string; dot: string }
}

/**
 * Daftar disiplin yang AKTIF (bisa dipilih) saat ini. Tambahkan entri baru di sini
 * untuk membuka jenis klinik baru (TW, dokter gigi, RO, dll).
 */
export const DISCIPLINES: Discipline[] = [
  {
    key: 'fisioterapi',
    label: 'Fisioterapi',
    short: 'Fisio',
    desc: 'Rehabilitasi gerak, nyeri, & pemulihan cedera',
    icon: Activity,
    anamnesis: 'fisio',
    accent: { badge: 'bg-teal-50 text-teal-700', dot: 'bg-teal-500' },
  },
  {
    key: 'okupasi_terapi',
    label: 'Okupasi Terapi',
    short: 'OT',
    desc: 'Terapi aktivitas & kemandirian fungsional',
    icon: Brain,
    anamnesis: 'okupasi',
    accent: { badge: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  },
  {
    key: 'terapi_wicara',
    label: 'Terapi Wicara',
    short: 'TW',
    desc: 'Terapi bicara, bahasa, & komunikasi',
    icon: MessageCircle,
    anamnesis: 'wicara',
    accent: { badge: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
  },
]

/** Disiplin default bila tidak ada informasi (klinik/pasien lama). */
export const DEFAULT_DISCIPLINE = 'fisioterapi'

/** Semua key yang valid — dipakai untuk validasi server-side. */
export const DISCIPLINE_KEYS = DISCIPLINES.map((d) => d.key)

const BY_KEY = new Map(DISCIPLINES.map((d) => [d.key, d]))

export function getDiscipline(key?: string | null): Discipline | undefined {
  return key ? BY_KEY.get(key) : undefined
}

export function isValidDiscipline(key?: string | null): boolean {
  return !!key && BY_KEY.has(key)
}

/** Label tampilan; fallback ke key mentah bila tak dikenal. */
export function disciplineLabel(key?: string | null): string {
  return getDiscipline(key)?.label ?? key ?? '—'
}

/**
 * Rangkai beberapa key disiplin jadi frasa natural Bahasa Indonesia, mis.
 * "Fisioterapi, Okupasi Terapi & Terapi Wicara". Dipakai landing klinik CAMPURAN
 * (buka >1 layanan) agar teks default menyebut semua layanan yang dibuka.
 * Label diurut sesuai registry & di-dedup; key tak dikenal dipakai apa adanya.
 */
export function joinDisciplineLabels(keys: Array<string | null | undefined>): string {
  const labels = keys
    .map((k) => (k ? getDiscipline(k)?.label ?? k : ''))
    .filter((l): l is string => !!l)
  const uniq = [...new Set(labels)]
  if (uniq.length <= 1) return uniq[0] ?? ''
  return `${uniq.slice(0, -1).join(', ')} & ${uniq[uniq.length - 1]}`
}

/**
 * Filter daftar key agar hanya yang valid & unik, mempertahankan urutan registry.
 * Dipakai saat menyimpan `clinics.specializations` dari input form.
 */
export function sanitizeSpecializations(keys: unknown): string[] {
  const set = new Set(Array.isArray(keys) ? keys.map(String) : [])
  return DISCIPLINE_KEYS.filter((k) => set.has(k))
}

/**
 * Disiplin efektif sebuah pasien untuk memilih form anamnesis:
 * pakai `patient.discipline`, jika kosong fallback ke tipe utama klinik.
 */
export function resolvePatientDiscipline(
  patientDiscipline?: string | null,
  clinicPrimaryType?: string | null,
): string {
  return (
    (isValidDiscipline(patientDiscipline) && patientDiscipline) ||
    (isValidDiscipline(clinicPrimaryType) && clinicPrimaryType) ||
    DEFAULT_DISCIPLINE
  )
}

/** Modul anamnesis yang harus dirender untuk sebuah disiplin. */
export function anamnesisKindFor(key?: string | null): AnamnesisKind {
  return getDiscipline(key)?.anamnesis ?? 'generic'
}

/**
 * Boleh-kah seorang terapis (writer) mengisi catatan / menyelesaikan sebuah booking?
 * Aturan (keputusan klinik): satu PROFESI/disiplin saling bantu — terapis boleh
 * menangani booking PROFESI YANG SAMA (mis. semua terapis fisio boleh mengisi
 * booking fisio, semua terapis OT boleh booking OT). LINTAS disiplin TIDAK boleh.
 *  - Booking belum di-assign → boleh (akan diklaim).
 *  - Writer adalah terapis yang ditugaskan → boleh.
 *  - Disiplin sama → boleh.
 *  - Salah satu disiplin tak diketahui (data lama) → boleh (dalam 1 klinik).
 */
export function canTherapistHandleBooking(opts: {
  writerUserId: string
  writerDiscipline?: string | null
  bookingTherapistUserId?: string | null
  bookingTherapistId?: string | null
  bookingDiscipline?: string | null
}): boolean {
  if (!opts.bookingTherapistId) return true
  if (opts.bookingTherapistUserId && opts.bookingTherapistUserId === opts.writerUserId) return true
  const bd = opts.bookingDiscipline ?? null
  const wd = opts.writerDiscipline ?? null
  if (!bd || !wd) return true
  return bd === wd
}
