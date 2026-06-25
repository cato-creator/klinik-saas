// ============================================================
// PUSTAKA KASUS & PILIHAN UNTUK MODE CEPAT ANAMNESIS FISIOTERAPI
// Dipakai oleh fisio-anamnesis-module.tsx (input "klik-klik").
// Memilih kasus akan mengisi otomatis field-field di bawah; terapis
// tinggal mengoreksi seperlunya. Semua tetap bisa diedit manual.
// ============================================================

import type { AnamnesisData } from '@/types'

// Chip keluhan (multi-pilih).
export const KELUHAN_TAGS = [
  'Nyeri', 'Kaku', 'Lemah', 'Kesemutan', 'Baal',
  'Bengkak', 'Sulit digerakkan', 'Kaku pagi hari', 'Kram', 'Tidak stabil',
]

// Onset (pilih salah satu).
export const ONSET_OPTIONS = [
  'Akut (<2 minggu)', 'Sub-akut (2–6 minggu)', 'Kronik (>6 minggu)',
]

// Modalitas / tindakan fisioterapi (multi-pilih).
export const MODALITAS_OPTIONS = [
  'TENS', 'Ultrasound (US)', 'Infra Red (IR)', 'Terapi Latihan', 'Manual Therapy',
  'Stretching', 'Strengthening', 'Massage', 'Mobilisasi Sendi', 'Kompres Hangat',
  'Kompres Dingin', 'McKenzie', 'William Flexion', 'Core Stability', 'Neurodynamic',
]

// Template kasus: sebagian field AnamnesisData yang diisi otomatis.
export interface FisioCase {
  id: string
  name: string
  emoji: string
  data: Partial<AnamnesisData>
}

export const FISIO_CASES: FisioCase[] = [
  {
    id: 'lbp', name: 'Low Back Pain', emoji: '🦴',
    data: {
      keluhan_utama: 'Nyeri pinggang bawah',
      keluhan_tags: ['Nyeri', 'Kaku'],
      impairment: 'Nyeri & spasme otot paravertebra lumbal, keterbatasan LGS trunk',
      fungsional_limitation: 'Kesulitan membungkuk, duduk/berdiri lama, dan mengangkat beban',
      disability: 'Terganggu aktivitas kerja & ibadah',
      modalitas: ['TENS', 'Ultrasound (US)', 'Terapi Latihan', 'McKenzie'],
      edukasi: 'Hindari mengangkat beban berat & posisi statis lama, perbaiki postur duduk',
      tujuan_jangka_pendek: 'Mengurangi nyeri & spasme otot',
      tujuan_jangka_panjang: 'Mengembalikan fungsi gerak trunk & aktivitas sehari-hari',
    },
  },
  {
    id: 'frozen_shoulder', name: 'Frozen Shoulder', emoji: '💪',
    data: {
      keluhan_utama: 'Nyeri & kaku pada bahu',
      keluhan_tags: ['Nyeri', 'Kaku', 'Sulit digerakkan'],
      impairment: 'Keterbatasan LGS bahu (abduksi & eksorotasi) disertai nyeri',
      fungsional_limitation: 'Sulit menyisir, mengambil dompet di saku belakang, memakai baju',
      disability: 'Terganggu aktivitas berpakaian & pekerjaan',
      modalitas: ['Ultrasound (US)', 'Manual Therapy', 'Mobilisasi Sendi', 'Stretching', 'Terapi Latihan'],
      edukasi: 'Latihan pendulum & stretching bahu rutin di rumah',
      tujuan_jangka_pendek: 'Mengurangi nyeri & menambah LGS bahu',
      tujuan_jangka_panjang: 'Memulihkan LGS penuh & fungsi bahu',
    },
  },
  {
    id: 'stroke', name: 'Stroke', emoji: '🧠',
    data: {
      keluhan_utama: 'Kelemahan separuh badan',
      keluhan_tags: ['Lemah', 'Baal'],
      impairment: 'Hemiparese, penurunan kekuatan otot & tonus abnormal',
      fungsional_limitation: 'Gangguan keseimbangan, transfer, dan berjalan',
      disability: 'Ketergantungan dalam aktivitas sehari-hari (ADL)',
      modalitas: ['Terapi Latihan', 'Strengthening', 'Manual Therapy', 'Mobilisasi Sendi'],
      edukasi: 'Latihan fungsional & positioning yang benar, libatkan dukungan keluarga',
      tujuan_jangka_pendek: 'Meningkatkan kekuatan & kontrol motorik',
      tujuan_jangka_panjang: 'Meningkatkan kemandirian ADL & kemampuan berjalan',
    },
  },
  {
    id: 'cervical', name: 'Cervical Syndrome', emoji: '🧎',
    data: {
      keluhan_utama: 'Nyeri leher menjalar',
      keluhan_tags: ['Nyeri', 'Kaku', 'Kesemutan'],
      impairment: 'Nyeri & spasme otot cervical, keterbatasan LGS leher',
      fungsional_limitation: 'Sulit menoleh, nyeri saat menunduk/menengadah',
      disability: 'Terganggu pekerjaan di depan komputer',
      modalitas: ['TENS', 'Ultrasound (US)', 'Manual Therapy', 'Stretching', 'Terapi Latihan'],
      edukasi: 'Perbaiki postur & ergonomi kerja, hindari menunduk terlalu lama',
      tujuan_jangka_pendek: 'Mengurangi nyeri leher',
      tujuan_jangka_panjang: 'Memulihkan LGS leher & fungsi',
    },
  },
  {
    id: 'oa_knee', name: 'OA Lutut', emoji: '🦵',
    data: {
      keluhan_utama: 'Nyeri pada lutut',
      keluhan_tags: ['Nyeri', 'Kaku', 'Bengkak'],
      impairment: 'Nyeri, krepitasi, keterbatasan LGS & kelemahan otot quadriceps',
      fungsional_limitation: 'Sulit jongkok, naik-turun tangga, dan berjalan jauh',
      disability: 'Terganggu mobilitas & ibadah',
      modalitas: ['TENS', 'Ultrasound (US)', 'Terapi Latihan', 'Strengthening', 'Kompres Hangat'],
      edukasi: 'Turunkan berat badan, latihan penguatan quadriceps, hindari jongkok berlebih',
      tujuan_jangka_pendek: 'Mengurangi nyeri & bengkak lutut',
      tujuan_jangka_panjang: 'Meningkatkan kekuatan & fungsi lutut',
    },
  },
  {
    id: 'bells_palsy', name: "Bell's Palsy", emoji: '😐',
    data: {
      keluhan_utama: 'Wajah perot sebelah',
      keluhan_tags: ['Lemah', 'Baal'],
      impairment: 'Kelemahan otot wajah unilateral (gangguan n. VII)',
      fungsional_limitation: 'Sulit menutup mata, tersenyum, dan berkumur',
      disability: 'Terganggu komunikasi & makan',
      modalitas: ['Terapi Latihan', 'Massage', 'Infra Red (IR)', 'Stretching'],
      edukasi: 'Latihan otot wajah di depan cermin & proteksi mata yang sulit menutup',
      tujuan_jangka_pendek: 'Menstimulasi & menjaga tonus otot wajah',
      tujuan_jangka_panjang: 'Memulihkan simetri & fungsi otot wajah',
    },
  },
  {
    id: 'cts', name: 'CTS (Carpal Tunnel)', emoji: '✋',
    data: {
      keluhan_utama: 'Kesemutan pada tangan',
      keluhan_tags: ['Kesemutan', 'Baal', 'Nyeri'],
      impairment: 'Parestesia jari 1–3, nyeri pergelangan tangan, kelemahan grip',
      fungsional_limitation: 'Sulit menggenggam, sering terbangun malam karena kesemutan',
      disability: 'Terganggu pekerjaan yang menggunakan tangan',
      modalitas: ['TENS', 'Ultrasound (US)', 'Neurodynamic', 'Stretching', 'Terapi Latihan'],
      edukasi: 'Hindari gerakan repetitif pergelangan, gunakan wrist splint saat malam',
      tujuan_jangka_pendek: 'Mengurangi parestesia & nyeri',
      tujuan_jangka_panjang: 'Memulihkan fungsi tangan & mencegah kekambuhan',
    },
  },
  {
    id: 'post_op', name: 'Post-op (Pasca Operasi)', emoji: '🩹',
    data: {
      keluhan_utama: 'Nyeri & kaku pasca operasi',
      keluhan_tags: ['Nyeri', 'Kaku', 'Bengkak'],
      impairment: 'Nyeri luka operasi, oedem, keterbatasan LGS & kelemahan otot',
      fungsional_limitation: 'Keterbatasan gerak & mobilitas pada area operasi',
      disability: 'Terganggu aktivitas sehari-hari untuk sementara',
      modalitas: ['Terapi Latihan', 'Mobilisasi Sendi', 'Strengthening', 'Kompres Dingin'],
      edukasi: 'Latihan bertahap sesuai toleransi, rawat luka, hindari gerakan berlebihan',
      tujuan_jangka_pendek: 'Mengurangi nyeri & oedem, menjaga LGS',
      tujuan_jangka_panjang: 'Memulihkan kekuatan, LGS & fungsi penuh',
    },
  },
  {
    id: 'plantar_fasciitis', name: 'Plantar Fasciitis', emoji: '🦶',
    data: {
      keluhan_utama: 'Nyeri pada tumit',
      keluhan_tags: ['Nyeri', 'Kaku pagi hari'],
      impairment: 'Nyeri tekan plantar tumit, tightness gastrocnemius & plantar fascia',
      fungsional_limitation: 'Nyeri pada langkah pertama pagi hari, berdiri/berjalan lama',
      disability: 'Terganggu aktivitas berdiri & berjalan',
      modalitas: ['Ultrasound (US)', 'Stretching', 'Manual Therapy', 'TENS', 'Terapi Latihan'],
      edukasi: 'Stretching plantar & betis, gunakan alas kaki empuk, hindari bertelanjang kaki',
      tujuan_jangka_pendek: 'Mengurangi nyeri tumit',
      tujuan_jangka_panjang: 'Memulihkan fleksibilitas & fungsi berjalan',
    },
  },
  {
    id: 'trigger_finger', name: 'Trigger Finger', emoji: '👆',
    data: {
      keluhan_utama: 'Jari macet/terkunci',
      keluhan_tags: ['Nyeri', 'Kaku', 'Sulit digerakkan'],
      impairment: 'Nyeri & catching/locking jari, nodul pada tendon fleksor',
      fungsional_limitation: 'Sulit menekuk/meluruskan jari dan menggenggam',
      disability: 'Terganggu aktivitas yang menggunakan tangan',
      modalitas: ['Ultrasound (US)', 'Manual Therapy', 'Stretching', 'Terapi Latihan', 'Kompres Hangat'],
      edukasi: 'Hindari menggenggam kuat berulang, lakukan latihan tendon gliding',
      tujuan_jangka_pendek: 'Mengurangi nyeri & locking jari',
      tujuan_jangka_panjang: 'Memulihkan gerak jari & fungsi tangan',
    },
  },
]
