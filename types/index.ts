export type UserRole = 'patient' | 'therapist' | 'admin' | 'owner'

export type Gender = 'L' | 'P'

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

export type PaymentMethod = 'qris' | 'transfer' | 'cash' | 'bpjs'

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  birth_date: string | null
  gender: Gender | null
  address: string | null
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

export interface ServiceType {
  id: string
  name: string
  description: string | null
  duration_min: number
  price: number
  is_active: boolean
  created_at: string
}

export interface Therapist {
  id: string
  profile_id: string
  specialization: string[]
  /** Disiplin terapis (mis. 'fisioterapi'/'okupasi_terapi') — lihat lib/disciplines. */
  discipline: string | null
  str_number: string | null
  bio: string | null
  photo_url: string | null
  signature_url: string | null
  is_active: boolean
  created_at: string
  // joined
  profile?: Profile
}

export interface TherapistSchedule {
  id: string
  therapist_id: string
  day_of_week: number // 0=Minggu..6=Sabtu
  start_time: string
  end_time: string
  is_active: boolean
}

export interface TherapistUnavailable {
  id: string
  therapist_id: string
  date: string
  reason: string | null
  created_at: string
}

export interface Patient {
  id: string
  profile_id: string | null
  full_name: string
  phone: string
  email: string | null
  birth_date: string | null
  gender: Gender | null
  guardian_name: string | null
  diagnosis: string | null
  notes: string | null
  /** Disiplin perawatan pasien (penentu form anamnesis) — lihat lib/disciplines. */
  discipline: string | null
  medical_record_no: string | null
  allergies: string | null
  special_alert: string | null
  session_package: number | null
  created_at: string
}

export type GoalStatus = 'in_progress' | 'achieved'

export interface TreatmentGoal {
  id: string
  patient_id: string
  therapist_id: string | null
  discipline?: string | null
  description: string
  status: GoalStatus
  achieved_at: string | null
  created_at: string
  // joined
  therapist?: Therapist
}

export interface AnamnesisData {
  // ANAMNESIS
  keluhan_utama: string
  rps: string // riwayat penyakit sekarang
  rpd: string // riwayat penyakit dahulu
  rpp: string // riwayat penyakit penyerta
  rpk: string // riwayat penyakit keluarga
  anamnesis_sistem: { sistem: string; keterangan: string }[]
  // PEMERIKSAAN FISIK — tanda vital
  ttv: {
    tekanan_darah: string
    denyut_nadi: string
    suhu: string
    pernafasan: string
    tinggi_badan: string
    berat_badan: string
  }
  inspeksi: string
  palpasi: string
  perkusi: string
  // gerakan dasar
  gerak_aktif: { bidang_gerak: string; full_rom: string; nyeri: string; bisa_dilakukan: string }[]
  gerak_pasif: { bidang_gerak: string; full_rom: string; nyeri: string; bisa_dilakukan: string; end_feel: string }[]
  isometrik: { bidang_gerak: string; full_rom: string; nyeri: string; bisa_dilakukan: string }[]
  // kognitif & personal
  kognitif: string
  intrapersonal: string
  interpersonal: string
  kemampuan_fungsional: string
  // pemeriksaan nyeri & antropometri
  nyeri_diam: string
  nyeri_tekan: string
  nyeri_gerak: string
  antropometri: { ukuran: string; dekstra: string; sinistra: string; selisih: string }[]
  lgs: string
  mmt: string
  // diagnosa fisioterapi
  impairment: string
  fungsional_limitation: string
  disability: string
  // PROGRAM / RENCANA
  tujuan_jangka_pendek: string
  tujuan_jangka_panjang: string
  teknologi_ft: string
  edukasi: string
  rencana_evaluasi: string

  // ——— Tambahan MODE CEPAT (input klik-klik). Semua OPSIONAL agar tetap
  // kompatibel dengan data lama & mode lengkap (wizard SK Fisio). ———
  mode?: 'cepat' | 'lengkap'
  case_template?: string                          // id kasus, mis. 'lbp'
  case_name?: string                              // nama kasus untuk ditampilkan
  pain_regions?: { id: string; label: string }[]  // bagian tubuh yang sakit (body map)
  keluhan_tags?: string[]                         // chip keluhan: Nyeri, Kaku, ...
  onset?: string                                  // Akut / Sub-akut / Kronik
  durasi?: string                                 // mis. "3 hari", "2 minggu"
  nyeri_skala?: number | null                     // skala nyeri 0–10
  modalitas?: string[]                            // chip tindakan/modalitas
}

/**
 * Form Asesmen Okupasi Terapi (anak) — disimpan utuh sebagai JSONB.
 * Strukturnya banyak & heterogen (teks, checklist, grid), jadi dimodelkan
 * sebagai map bebas dan dirender lewat skema deklaratif di
 * `components/terapis/anamnesis/okupasi-anamnesis-module.tsx`.
 */
export type OtAnamnesisData = Record<string, unknown>

export interface Assessment {
  id: string
  patient_id: string
  therapist_id: string | null
  booking_id: string | null
  /** Disiplin/layanan asesmen ini (mis. 'fisioterapi'/'okupasi_terapi'). */
  discipline?: string | null
  // Fisioterapi: AnamnesisData. Okupasi Terapi: OtAnamnesisData (di-cast saat dibaca).
  data: AnamnesisData | null
  chief_complaint: string | null
  history: string | null
  physical_exam: string | null
  rom: string | null
  pain_scale: number | null
  notes: string | null
  created_at: string
  // joined
  therapist?: Therapist
}

export type DiagnosisType = 'primary' | 'secondary'

export interface Diagnosis {
  id: string
  patient_id: string
  therapist_id: string | null
  icd10_code: string | null
  description: string
  dx_type: DiagnosisType
  created_at: string
  // joined
  therapist?: Therapist
}

export interface Treatment {
  id: string
  patient_id: string
  booking_id: string | null
  therapist_id: string | null
  modality: string | null
  description: string | null
  created_at: string
  // joined
  therapist?: Therapist
}

export interface Booking {
  id: string
  booking_code: string
  patient_id: string
  therapist_id: string
  service_type_id: string
  /** Disiplin/layanan kunjungan ini. */
  discipline?: string | null
  session_date: string
  session_time: string
  duration_min: number
  status: BookingStatus
  notes_patient: string | null
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  payment_proof_url: string | null
  amount: number
  /** Tindakan/modalitas yang dikerjakan pada kunjungan ini. */
  modalities?: string[] | null
  created_by_role: string
  created_at: string
  updated_at: string
  // joined
  patient?: Patient
  therapist?: Therapist
  service_type?: ServiceType
}

export interface SessionNote {
  id: string
  booking_id: string
  therapist_id: string
  patient_id: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  home_program: string | null
  home_program_images: string[] | null
  next_session: string | null
  created_at: string
  updated_at: string
  // joined
  booking?: Booking
  therapist?: Therapist
}

export interface Invoice {
  id: string
  invoice_number: string
  booking_id: string
  patient_id: string
  amount: number
  discount: number
  total: number
  issued_at: string
  paid_at: string | null
  pdf_url: string | null
  // joined
  booking?: Booking
  patient?: Patient
}

export interface Payment {
  id: string
  booking_id: string
  invoice_id: string | null
  amount: number
  method: PaymentMethod
  proof_url: string | null
  confirmed_by: string | null
  confirmed_at: string | null
  notes: string | null
  created_at: string
}

// Form types
export interface BookingFormData {
  service_type_id: string
  therapist_id: string
  session_date: string
  session_time: string
  notes_patient: string
  patient: {
    full_name: string
    phone: string
    email: string
    birth_date: string
    gender: Gender
    guardian_name: string
  }
}

export interface SessionNoteFormData {
  subjective: string
  objective: string
  assessment: string
  plan: string
  home_program: string
  next_session: string
}
