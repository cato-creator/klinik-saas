// ============================================================
// PUSTAKA KASUS & PILIHAN UNTUK MODE CEPAT ANAMNESIS FISIOTERAPI
// Dipakai oleh fisio-anamnesis-module.tsx (input "klik-klik") &
// kartu Tindakan Terapi (session-treatments.tsx).
// Memilih kasus akan mengisi otomatis field-field di bawah; terapis
// tinggal mengoreksi seperlunya. Semua tetap bisa diedit manual.
//
// Kasus dikelompokkan per KATEGORI (muskuloskeletal, neuro, pediatri,
// geriatri, sport injury). Tiap kategori berisi kasus yang sering
// ditangani fisioterapi. Tambah kasus baru = tambah satu objek di sini
// (atau simpan template via UI, tersimpan permanen per klinik).
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

// Modalitas / tindakan fisioterapi (multi-pilih) — daftar BAWAAN.
// Klinik bisa menambah tindakan lain yang tersimpan permanen (clinic_modalities).
export const MODALITAS_OPTIONS = [
  // Elektroterapi & fisikal
  'TENS', 'Ultrasound (US)', 'Infra Red (IR)', 'SWD', 'MWD', 'Laser',
  'Electrical Stimulation', 'Traksi',
  // Manual & latihan
  'Terapi Latihan', 'Manual Therapy', 'Terapi Manipulatif', 'Mobilisasi Sendi',
  'Graston / IASTM', 'Dry Needling', 'Cupping', 'Kinesio Taping',
  'Myofascial Release', 'Massage', 'Stretching', 'Strengthening', 'Core Stability',
  'McKenzie', 'William Flexion', 'Neurodynamic', 'PNF',
  'Gait Training', 'Balance Training', 'Kompres Hangat', 'Kompres Dingin',
]

// Daftar tindakan/modalitas untuk kartu "Tindakan Terapi" (alias supaya jelas
// maksudnya, isinya sama dgn MODALITAS_OPTIONS).
export const TINDAKAN_OPTIONS = MODALITAS_OPTIONS

// Kategori kasus fisioterapi.
export const FISIO_CATEGORIES = [
  { key: 'muskuloskeletal', label: 'Muskuloskeletal' },
  { key: 'neuro', label: 'Neurologi' },
  { key: 'pediatri', label: 'Pediatri' },
  { key: 'geriatri', label: 'Geriatri' },
  { key: 'sport', label: 'Sport Injury' },
] as const

export type FisioCategory = (typeof FISIO_CATEGORIES)[number]['key']

// Template kasus: sebagian field AnamnesisData yang diisi otomatis.
export interface FisioCase {
  id: string
  name: string
  emoji: string
  category: FisioCategory
  data: Partial<AnamnesisData>
}

export const FISIO_CASES: FisioCase[] = [
  // ==========================================================
  // MUSKULOSKELETAL
  // ==========================================================
  {
    id: 'msk_lbp', name: 'Low Back Pain (LBP)', emoji: '🦴', category: 'muskuloskeletal',
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
    id: 'msk_hnp', name: 'HNP Lumbal', emoji: '🦴', category: 'muskuloskeletal',
    data: {
      keluhan_utama: 'Nyeri pinggang menjalar ke tungkai',
      keluhan_tags: ['Nyeri', 'Kesemutan', 'Baal'],
      impairment: 'Nyeri radikular L4–S1, spasme paravertebra, penurunan LGS lumbal',
      fungsional_limitation: 'Sulit membungkuk, duduk lama, & berjalan jauh',
      disability: 'Terganggu pekerjaan & aktivitas sehari-hari',
      modalitas: ['TENS', 'Traksi', 'McKenzie', 'Neurodynamic', 'Terapi Latihan'],
      edukasi: 'Hindari membungkuk-mengangkat, jaga postur netral, latihan core',
      tujuan_jangka_pendek: 'Mengurangi nyeri radikular & spasme',
      tujuan_jangka_panjang: 'Memulihkan fungsi gerak & mencegah kekambuhan',
    },
  },
  {
    id: 'msk_frozen', name: 'Frozen Shoulder', emoji: '💪', category: 'muskuloskeletal',
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
    id: 'msk_oa_knee', name: 'OA Lutut', emoji: '🦵', category: 'muskuloskeletal',
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
    id: 'msk_cervical', name: 'Cervical Syndrome', emoji: '🧎', category: 'muskuloskeletal',
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
    id: 'msk_cts', name: 'CTS (Carpal Tunnel)', emoji: '✋', category: 'muskuloskeletal',
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
    id: 'msk_plantar', name: 'Plantar Fasciitis', emoji: '🦶', category: 'muskuloskeletal',
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
    id: 'msk_trigger', name: 'Trigger Finger', emoji: '👆', category: 'muskuloskeletal',
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
  {
    id: 'msk_dequervain', name: "De Quervain Syndrome", emoji: '🤚', category: 'muskuloskeletal',
    data: {
      keluhan_utama: 'Nyeri pergelangan tangan sisi ibu jari',
      keluhan_tags: ['Nyeri', 'Bengkak', 'Sulit digerakkan'],
      impairment: 'Nyeri tekan prosesus styloideus radius, tenosinovitis APL & EPB',
      fungsional_limitation: 'Nyeri saat menggenggam, memutar, & mengangkat dengan ibu jari',
      disability: 'Terganggu pekerjaan & merawat bayi (menggendong)',
      modalitas: ['Ultrasound (US)', 'TENS', 'Manual Therapy', 'Stretching', 'Kinesio Taping'],
      edukasi: 'Istirahatkan ibu jari, hindari gerakan repetitif, gunakan thumb spica splint',
      tujuan_jangka_pendek: 'Mengurangi nyeri & inflamasi',
      tujuan_jangka_panjang: 'Memulihkan fungsi ibu jari & pergelangan tangan',
    },
  },
  {
    id: 'msk_tennis_elbow', name: 'Tennis Elbow (Epikondilitis Lateral)', emoji: '💪', category: 'muskuloskeletal',
    data: {
      keluhan_utama: 'Nyeri pada siku sisi luar',
      keluhan_tags: ['Nyeri', 'Lemah'],
      impairment: 'Nyeri tekan epikondilus lateral, kelemahan otot ekstensor pergelangan',
      fungsional_limitation: 'Nyeri saat menggenggam, mengangkat, & memutar lengan',
      disability: 'Terganggu pekerjaan & aktivitas dengan tangan',
      modalitas: ['Ultrasound (US)', 'TENS', 'Graston / IASTM', 'Stretching', 'Strengthening'],
      edukasi: 'Hindari gerakan ekstensi pergelangan berulang, gunakan epicondylitis brace',
      tujuan_jangka_pendek: 'Mengurangi nyeri siku',
      tujuan_jangka_panjang: 'Memulihkan kekuatan & fungsi lengan',
    },
  },

  // ==========================================================
  // NEUROLOGI
  // ==========================================================
  {
    id: 'neuro_stroke', name: 'Stroke (Hemiparese)', emoji: '🧠', category: 'neuro',
    data: {
      keluhan_utama: 'Kelemahan separuh badan',
      keluhan_tags: ['Lemah', 'Baal'],
      impairment: 'Hemiparese, penurunan kekuatan otot & tonus abnormal',
      fungsional_limitation: 'Gangguan keseimbangan, transfer, dan berjalan',
      disability: 'Ketergantungan dalam aktivitas sehari-hari (ADL)',
      modalitas: ['Terapi Latihan', 'PNF', 'Strengthening', 'Gait Training', 'Balance Training'],
      edukasi: 'Latihan fungsional & positioning yang benar, libatkan dukungan keluarga',
      tujuan_jangka_pendek: 'Meningkatkan kekuatan & kontrol motorik',
      tujuan_jangka_panjang: 'Meningkatkan kemandirian ADL & kemampuan berjalan',
    },
  },
  {
    id: 'neuro_bells', name: "Bell's Palsy", emoji: '😐', category: 'neuro',
    data: {
      keluhan_utama: 'Wajah perot sebelah',
      keluhan_tags: ['Lemah', 'Baal'],
      impairment: 'Kelemahan otot wajah unilateral (gangguan n. VII)',
      fungsional_limitation: 'Sulit menutup mata, tersenyum, dan berkumur',
      disability: 'Terganggu komunikasi & makan',
      modalitas: ['Terapi Latihan', 'Massage', 'Infra Red (IR)', 'Electrical Stimulation', 'Stretching'],
      edukasi: 'Latihan otot wajah di depan cermin & proteksi mata yang sulit menutup',
      tujuan_jangka_pendek: 'Menstimulasi & menjaga tonus otot wajah',
      tujuan_jangka_panjang: 'Memulihkan simetri & fungsi otot wajah',
    },
  },
  {
    id: 'neuro_parkinson', name: 'Parkinson', emoji: '🧠', category: 'neuro',
    data: {
      keluhan_utama: 'Gerakan melambat & tremor',
      keluhan_tags: ['Kaku', 'Lemah', 'Tidak stabil'],
      impairment: 'Rigiditas, bradikinesia, tremor, gangguan postur & keseimbangan',
      fungsional_limitation: 'Sulit memulai gerak, langkah kecil, mudah jatuh',
      disability: 'Terganggu mobilitas & kemandirian ADL',
      modalitas: ['Terapi Latihan', 'Stretching', 'Gait Training', 'Balance Training', 'PNF'],
      edukasi: 'Latihan berjalan dengan irama/aba-aba, latihan postur & keseimbangan rutin',
      tujuan_jangka_pendek: 'Mempertahankan LGS & memperbaiki pola jalan',
      tujuan_jangka_panjang: 'Mempertahankan kemandirian & mencegah jatuh',
    },
  },
  {
    id: 'neuro_sci', name: 'Cedera Medula Spinalis (Paraplegia)', emoji: '🦽', category: 'neuro',
    data: {
      keluhan_utama: 'Kelemahan/kelumpuhan kedua tungkai',
      keluhan_tags: ['Lemah', 'Baal', 'Kaku'],
      impairment: 'Paraparese/paraplegia, gangguan sensorik & tonus, risiko kontraktur',
      fungsional_limitation: 'Gangguan transfer, mobilitas, & keseimbangan duduk',
      disability: 'Ketergantungan tinggi dalam ADL & mobilitas',
      modalitas: ['Terapi Latihan', 'Strengthening', 'Mobilisasi Sendi', 'Stretching', 'Balance Training'],
      edukasi: 'Cegah dekubitus & kontraktur, latihan kekuatan ekstremitas atas untuk transfer',
      tujuan_jangka_pendek: 'Mencegah komplikasi & menjaga LGS',
      tujuan_jangka_panjang: 'Meningkatkan kemandirian transfer & mobilitas',
    },
  },
  {
    id: 'neuro_gbs', name: 'Guillain-Barré Syndrome (GBS)', emoji: '🧠', category: 'neuro',
    data: {
      keluhan_utama: 'Kelemahan menjalar dari kaki ke atas',
      keluhan_tags: ['Lemah', 'Baal', 'Kesemutan'],
      impairment: 'Kelemahan otot simetris asendens, hiporefleksia, gangguan sensorik',
      fungsional_limitation: 'Gangguan berjalan, berdiri, & aktivitas ekstremitas',
      disability: 'Ketergantungan ADL pada fase akut',
      modalitas: ['Terapi Latihan', 'Strengthening', 'Stretching', 'Mobilisasi Sendi', 'Balance Training'],
      edukasi: 'Latihan bertahap sesuai kelelahan, hindari overwork pada otot lemah',
      tujuan_jangka_pendek: 'Menjaga LGS & mencegah kontraktur/atrofi',
      tujuan_jangka_panjang: 'Memulihkan kekuatan & kemandirian fungsional',
    },
  },
  {
    id: 'neuro_dropfoot', name: 'Drop Foot (Peroneal Palsy)', emoji: '🦶', category: 'neuro',
    data: {
      keluhan_utama: 'Sulit mengangkat ujung kaki',
      keluhan_tags: ['Lemah', 'Baal', 'Kesemutan'],
      impairment: 'Kelemahan dorsofleksi pergelangan kaki (n. peroneus), foot drop',
      fungsional_limitation: 'Langkah menyeret/steppage gait, mudah tersandung',
      disability: 'Terganggu pola jalan & risiko jatuh',
      modalitas: ['Electrical Stimulation', 'Terapi Latihan', 'Strengthening', 'Neurodynamic', 'Gait Training'],
      edukasi: 'Gunakan AFO bila perlu, latihan penguatan dorsofleksor, hati-hati medan',
      tujuan_jangka_pendek: 'Menstimulasi & menguatkan otot dorsofleksor',
      tujuan_jangka_panjang: 'Memperbaiki pola jalan & mencegah jatuh',
    },
  },
  {
    id: 'neuro_bppv', name: 'Vertigo (BPPV)', emoji: '💫', category: 'neuro',
    data: {
      keluhan_utama: 'Pusing berputar saat perubahan posisi kepala',
      keluhan_tags: ['Tidak stabil'],
      impairment: 'Vertigo posisional, gangguan keseimbangan, nistagmus',
      fungsional_limitation: 'Gangguan saat bangun tidur, menunduk, & menengadah',
      disability: 'Terganggu aktivitas sehari-hari & risiko jatuh',
      modalitas: ['Balance Training', 'Terapi Latihan'],
      edukasi: 'Manuver reposisi (Epley/Brandt-Daroff), gerakan kepala perlahan',
      tujuan_jangka_pendek: 'Mengurangi vertigo & memperbaiki keseimbangan',
      tujuan_jangka_panjang: 'Memulihkan keseimbangan & mencegah kekambuhan',
    },
  },
  {
    id: 'neuro_ischialgia', name: 'Ischialgia (Sciatica)', emoji: '⚡', category: 'neuro',
    data: {
      keluhan_utama: 'Nyeri menjalar dari bokong ke tungkai',
      keluhan_tags: ['Nyeri', 'Kesemutan', 'Baal'],
      impairment: 'Nyeri sepanjang n. ischiadicus, ketegangan otot, SLR positif',
      fungsional_limitation: 'Nyeri saat duduk lama, membungkuk, & berjalan',
      disability: 'Terganggu pekerjaan & aktivitas sehari-hari',
      modalitas: ['TENS', 'Neurodynamic', 'Terapi Latihan', 'Stretching', 'McKenzie'],
      edukasi: 'Hindari duduk lama & membungkuk, latihan neural mobilization',
      tujuan_jangka_pendek: 'Mengurangi nyeri menjalar',
      tujuan_jangka_panjang: 'Memulihkan fungsi gerak & mencegah kekambuhan',
    },
  },
  {
    id: 'neuro_ms', name: 'Multiple Sclerosis (MS)', emoji: '🧠', category: 'neuro',
    data: {
      keluhan_utama: 'Kelemahan & mudah lelah',
      keluhan_tags: ['Lemah', 'Baal', 'Tidak stabil'],
      impairment: 'Kelemahan otot, spastisitas, ataksia, fatigue, gangguan keseimbangan',
      fungsional_limitation: 'Gangguan berjalan, keseimbangan, & koordinasi',
      disability: 'Terganggu mobilitas & kemandirian (fluktuatif)',
      modalitas: ['Terapi Latihan', 'Stretching', 'Strengthening', 'Balance Training', 'Gait Training'],
      edukasi: 'Atur energi (energy conservation), hindari overheat & kelelahan berlebih',
      tujuan_jangka_pendek: 'Menjaga LGS, kekuatan, & keseimbangan',
      tujuan_jangka_panjang: 'Mempertahankan mobilitas & kemandirian',
    },
  },
  {
    id: 'neuro_tbi', name: 'Pasca Cedera Kepala', emoji: '🧠', category: 'neuro',
    data: {
      keluhan_utama: 'Gangguan gerak & keseimbangan pasca cedera kepala',
      keluhan_tags: ['Lemah', 'Tidak stabil', 'Kaku'],
      impairment: 'Gangguan motorik, tonus abnormal, gangguan koordinasi & keseimbangan',
      fungsional_limitation: 'Gangguan transfer, berdiri, & berjalan',
      disability: 'Ketergantungan ADL bervariasi sesuai berat cedera',
      modalitas: ['Terapi Latihan', 'PNF', 'Strengthening', 'Balance Training', 'Gait Training'],
      edukasi: 'Latihan bertahap & berulang, libatkan keluarga, jaga keamanan lingkungan',
      tujuan_jangka_pendek: 'Meningkatkan kontrol motorik & keseimbangan',
      tujuan_jangka_panjang: 'Meningkatkan kemandirian fungsional & mobilitas',
    },
  },

  // ==========================================================
  // PEDIATRI
  // ==========================================================
  {
    id: 'ped_cp', name: 'Cerebral Palsy (CP)', emoji: '🧒', category: 'pediatri',
    data: {
      keluhan_utama: 'Keterlambatan gerak & kekakuan otot',
      keluhan_tags: ['Kaku', 'Lemah', 'Tidak stabil'],
      impairment: 'Spastisitas/tonus abnormal, gangguan kontrol postur & motorik kasar',
      fungsional_limitation: 'Keterlambatan duduk, merangkak, berdiri, & berjalan',
      disability: 'Ketergantungan dalam aktivitas sesuai usia',
      modalitas: ['Terapi Latihan', 'Stretching', 'PNF', 'Mobilisasi Sendi', 'Balance Training'],
      edukasi: 'Stimulasi motorik & positioning di rumah, cegah kontraktur, libatkan orang tua',
      tujuan_jangka_pendek: 'Menurunkan tonus & meningkatkan kontrol postur',
      tujuan_jangka_panjang: 'Meningkatkan kemampuan motorik & kemandirian',
    },
  },
  {
    id: 'ped_gdd', name: 'Keterlambatan Tumbuh Kembang (GDD)', emoji: '🧸', category: 'pediatri',
    data: {
      keluhan_utama: 'Belum mampu sesuai milestone usia',
      keluhan_tags: ['Lemah', 'Tidak stabil'],
      impairment: 'Keterlambatan motorik kasar/halus, tonus & keseimbangan kurang optimal',
      fungsional_limitation: 'Terlambat duduk/berdiri/berjalan dibanding usia',
      disability: 'Keterbatasan partisipasi & bermain sesuai usia',
      modalitas: ['Terapi Latihan', 'Balance Training', 'Stretching', 'PNF'],
      edukasi: 'Stimulasi bermain terstruktur di rumah, dorong eksplorasi gerak',
      tujuan_jangka_pendek: 'Menstimulasi pencapaian milestone berikutnya',
      tujuan_jangka_panjang: 'Mengejar perkembangan motorik sesuai usia',
    },
  },
  {
    id: 'ped_torticollis', name: 'Torticollis (CMT)', emoji: '👶', category: 'pediatri',
    data: {
      keluhan_utama: 'Kepala bayi miring ke satu sisi',
      keluhan_tags: ['Kaku', 'Sulit digerakkan'],
      impairment: 'Pemendekan otot SCM unilateral, keterbatasan LGS leher',
      fungsional_limitation: 'Keterbatasan menoleh, postur kepala asimetris',
      disability: 'Risiko plagiocephaly & asimetri perkembangan',
      modalitas: ['Stretching', 'Manual Therapy', 'Terapi Latihan', 'Mobilisasi Sendi'],
      edukasi: 'Stretching SCM lembut, positioning & tummy time, stimulasi menoleh ke sisi terbatas',
      tujuan_jangka_pendek: 'Menambah LGS leher & mengurangi pemendekan otot',
      tujuan_jangka_panjang: 'Memulihkan simetri postur kepala & leher',
    },
  },
  {
    id: 'ped_ctev', name: 'CTEV (Clubfoot)', emoji: '🦶', category: 'pediatri',
    data: {
      keluhan_utama: 'Kelainan bentuk kaki sejak lahir',
      keluhan_tags: ['Kaku', 'Sulit digerakkan'],
      impairment: 'Deformitas equinovarus, keterbatasan LGS pergelangan kaki',
      fungsional_limitation: 'Hambatan tumpuan & pola jalan saat anak mulai berjalan',
      disability: 'Risiko gangguan berjalan bila tidak dikoreksi',
      modalitas: ['Stretching', 'Manual Therapy', 'Mobilisasi Sendi', 'Terapi Latihan'],
      edukasi: 'Latihan peregangan & koreksi posisi, patuhi program (mis. pasca Ponseti/serial cast)',
      tujuan_jangka_pendek: 'Menambah fleksibilitas & koreksi posisi kaki',
      tujuan_jangka_panjang: 'Mencapai kaki plantigrade & pola jalan normal',
    },
  },
  {
    id: 'ped_erb', name: "Erb's Palsy (Cedera Pleksus Brakialis)", emoji: '👶', category: 'pediatri',
    data: {
      keluhan_utama: 'Lengan bayi lemah/tidak bergerak sejak lahir',
      keluhan_tags: ['Lemah', 'Sulit digerakkan'],
      impairment: 'Kelemahan otot bahu & lengan atas (C5–C6), risiko kontraktur',
      fungsional_limitation: 'Keterbatasan mengangkat & menggunakan lengan',
      disability: 'Hambatan perkembangan fungsi tangan',
      modalitas: ['Terapi Latihan', 'Stretching', 'Mobilisasi Sendi', 'Electrical Stimulation'],
      edukasi: 'Latihan LGS lembut & stimulasi gerak, cegah kontraktur, positioning',
      tujuan_jangka_pendek: 'Menjaga LGS & menstimulasi otot lemah',
      tujuan_jangka_panjang: 'Memulihkan fungsi lengan semaksimal mungkin',
    },
  },
  {
    id: 'ped_down', name: 'Down Syndrome (Hipotonia)', emoji: '🧒', category: 'pediatri',
    data: {
      keluhan_utama: 'Otot lemas & keterlambatan gerak',
      keluhan_tags: ['Lemah', 'Tidak stabil'],
      impairment: 'Hipotonia, hipermobilitas sendi, keterlambatan motorik & keseimbangan',
      fungsional_limitation: 'Terlambat duduk, berdiri, & berjalan',
      disability: 'Keterbatasan aktivitas & partisipasi sesuai usia',
      modalitas: ['Terapi Latihan', 'Strengthening', 'Balance Training', 'PNF'],
      edukasi: 'Stimulasi penguatan & keseimbangan via bermain, dukungan keluarga',
      tujuan_jangka_pendek: 'Meningkatkan tonus & kontrol postur',
      tujuan_jangka_panjang: 'Meningkatkan kemampuan motorik & kemandirian',
    },
  },
  {
    id: 'ped_dmd', name: 'Distrofi Muskular (DMD)', emoji: '🧒', category: 'pediatri',
    data: {
      keluhan_utama: 'Kelemahan otot yang makin bertambah',
      keluhan_tags: ['Lemah', 'Kaku'],
      impairment: 'Kelemahan otot proksimal progresif, risiko kontraktur',
      fungsional_limitation: 'Sulit bangkit dari lantai, naik tangga, & berjalan jauh',
      disability: 'Penurunan mobilitas progresif',
      modalitas: ['Terapi Latihan', 'Stretching', 'Mobilisasi Sendi', 'Balance Training'],
      edukasi: 'Latihan ringan (hindari overwork), peregangan rutin cegah kontraktur',
      tujuan_jangka_pendek: 'Mempertahankan LGS & mencegah kontraktur',
      tujuan_jangka_panjang: 'Mempertahankan fungsi & mobilitas selama mungkin',
    },
  },
  {
    id: 'ped_scoliosis', name: 'Skoliosis', emoji: '🩻', category: 'pediatri',
    data: {
      keluhan_utama: 'Tulang belakang melengkung',
      keluhan_tags: ['Nyeri', 'Kaku'],
      impairment: 'Deviasi lateral tulang belakang, ketidakseimbangan otot trunk',
      fungsional_limitation: 'Postur asimetris, mudah lelah saat duduk/berdiri lama',
      disability: 'Risiko progresi kurva & gangguan postur',
      modalitas: ['Terapi Latihan', 'Stretching', 'Strengthening', 'Core Stability'],
      edukasi: 'Latihan koreksi postur & penguatan asimetris, kontrol kurva berkala',
      tujuan_jangka_pendek: 'Memperbaiki postur & keseimbangan otot trunk',
      tujuan_jangka_panjang: 'Memperlambat progresi kurva & menjaga fungsi',
    },
  },
  {
    id: 'ped_flatfoot', name: 'Flat Foot (Pes Planus)', emoji: '🦶', category: 'pediatri',
    data: {
      keluhan_utama: 'Telapak kaki rata & mudah lelah',
      keluhan_tags: ['Nyeri', 'Lemah'],
      impairment: 'Penurunan arkus longitudinal medial, kelemahan otot intrinsik kaki',
      fungsional_limitation: 'Mudah lelah saat berjalan/berlari, pola jalan kurang stabil',
      disability: 'Keterbatasan aktivitas fisik berkepanjangan',
      modalitas: ['Terapi Latihan', 'Strengthening', 'Stretching', 'Balance Training'],
      edukasi: 'Latihan penguatan arkus (mis. towel curl, foot doming), alas kaki sesuai',
      tujuan_jangka_pendek: 'Menguatkan otot kaki & memperbaiki arkus',
      tujuan_jangka_panjang: 'Memperbaiki pola jalan & mengurangi keluhan',
    },
  },
  {
    id: 'ped_spina_bifida', name: 'Spina Bifida', emoji: '🧒', category: 'pediatri',
    data: {
      keluhan_utama: 'Kelemahan tungkai sejak lahir',
      keluhan_tags: ['Lemah', 'Baal', 'Kaku'],
      impairment: 'Kelemahan/kelumpuhan tungkai, gangguan sensorik, risiko kontraktur',
      fungsional_limitation: 'Gangguan duduk, berdiri, & mobilitas',
      disability: 'Ketergantungan mobilitas bervariasi',
      modalitas: ['Terapi Latihan', 'Strengthening', 'Stretching', 'Mobilisasi Sendi', 'Balance Training'],
      edukasi: 'Cegah kontraktur & dekubitus, latihan kekuatan & positioning, libatkan keluarga',
      tujuan_jangka_pendek: 'Menjaga LGS & menstimulasi gerak',
      tujuan_jangka_panjang: 'Meningkatkan mobilitas & kemandirian semaksimal mungkin',
    },
  },

  // ==========================================================
  // GERIATRI
  // ==========================================================
  {
    id: 'ger_osteoporosis', name: 'Osteoporosis', emoji: '🧓', category: 'geriatri',
    data: {
      keluhan_utama: 'Nyeri punggung & postur membungkuk',
      keluhan_tags: ['Nyeri', 'Lemah', 'Kaku'],
      impairment: 'Penurunan densitas tulang, kelemahan otot, postur kifotik',
      fungsional_limitation: 'Mudah lelah, nyeri saat berdiri lama, risiko fraktur',
      disability: 'Pembatasan aktivitas karena takut jatuh/patah',
      modalitas: ['Terapi Latihan', 'Strengthening', 'Balance Training', 'Stretching'],
      edukasi: 'Latihan beban ringan & keseimbangan, cegah jatuh, asupan kalsium/vit D',
      tujuan_jangka_pendek: 'Mengurangi nyeri & meningkatkan kekuatan otot',
      tujuan_jangka_panjang: 'Mencegah jatuh & mempertahankan kemandirian',
    },
  },
  {
    id: 'ger_oa_generalisata', name: 'OA Generalisata', emoji: '🦴', category: 'geriatri',
    data: {
      keluhan_utama: 'Nyeri & kaku banyak sendi',
      keluhan_tags: ['Nyeri', 'Kaku', 'Bengkak'],
      impairment: 'Nyeri & keterbatasan LGS multipel, kelemahan otot',
      fungsional_limitation: 'Sulit berjalan, naik tangga, & aktivitas sehari-hari',
      disability: 'Penurunan mobilitas & kemandirian',
      modalitas: ['TENS', 'Infra Red (IR)', 'Terapi Latihan', 'Strengthening', 'Kompres Hangat'],
      edukasi: 'Latihan sendi rutin tanpa overload, kelola berat badan & nyeri',
      tujuan_jangka_pendek: 'Mengurangi nyeri & kekakuan sendi',
      tujuan_jangka_panjang: 'Mempertahankan mobilitas & kemandirian',
    },
  },
  {
    id: 'ger_post_stroke', name: 'Rehabilitasi Pasca Stroke (Lansia)', emoji: '🧓', category: 'geriatri',
    data: {
      keluhan_utama: 'Kelemahan badan sebelah pada lansia',
      keluhan_tags: ['Lemah', 'Kaku', 'Tidak stabil'],
      impairment: 'Hemiparese, gangguan keseimbangan & tonus, deconditioning',
      fungsional_limitation: 'Gangguan transfer, berdiri, & berjalan',
      disability: 'Ketergantungan ADL',
      modalitas: ['Terapi Latihan', 'Strengthening', 'Balance Training', 'Gait Training', 'PNF'],
      edukasi: 'Latihan fungsional & keamanan lingkungan, cegah jatuh, dukungan keluarga',
      tujuan_jangka_pendek: 'Meningkatkan kekuatan & keseimbangan',
      tujuan_jangka_panjang: 'Meningkatkan kemandirian ADL & mobilitas',
    },
  },
  {
    id: 'ger_balance', name: 'Gangguan Keseimbangan / Risiko Jatuh', emoji: '🧓', category: 'geriatri',
    data: {
      keluhan_utama: 'Sering oleng & takut jatuh',
      keluhan_tags: ['Tidak stabil', 'Lemah'],
      impairment: 'Gangguan keseimbangan statis & dinamis, kelemahan ekstremitas bawah',
      fungsional_limitation: 'Tidak stabil saat berdiri, berbalik, & berjalan',
      disability: 'Pembatasan aktivitas karena takut jatuh',
      modalitas: ['Balance Training', 'Strengthening', 'Terapi Latihan', 'Gait Training'],
      edukasi: 'Latihan keseimbangan bertahap, modifikasi rumah, gunakan alat bantu bila perlu',
      tujuan_jangka_pendek: 'Meningkatkan keseimbangan & kekuatan tungkai',
      tujuan_jangka_panjang: 'Menurunkan risiko jatuh & meningkatkan kepercayaan diri',
    },
  },
  {
    id: 'ger_post_hip', name: 'Pasca Fraktur Panggul/Femur', emoji: '🦴', category: 'geriatri',
    data: {
      keluhan_utama: 'Nyeri & sulit berjalan pasca patah tulang panggul',
      keluhan_tags: ['Nyeri', 'Lemah', 'Kaku'],
      impairment: 'Nyeri, keterbatasan LGS hip, kelemahan otot, gangguan tumpuan',
      fungsional_limitation: 'Gangguan transfer, berdiri, & berjalan',
      disability: 'Ketergantungan mobilitas sementara',
      modalitas: ['Terapi Latihan', 'Strengthening', 'Mobilisasi Sendi', 'Gait Training', 'Balance Training'],
      edukasi: 'Latihan tumpuan bertahap sesuai izin dokter, latihan jalan dgn alat bantu',
      tujuan_jangka_pendek: 'Mengurangi nyeri & memulihkan LGS serta kekuatan',
      tujuan_jangka_panjang: 'Memulihkan kemampuan berjalan & kemandirian',
    },
  },
  {
    id: 'ger_tkr', name: 'Pasca Operasi Ganti Sendi Lutut (TKR)', emoji: '🦵', category: 'geriatri',
    data: {
      keluhan_utama: 'Nyeri & kaku pasca operasi lutut',
      keluhan_tags: ['Nyeri', 'Kaku', 'Bengkak'],
      impairment: 'Nyeri & oedem pasca operasi, keterbatasan LGS lutut, kelemahan quadriceps',
      fungsional_limitation: 'Sulit menekuk/meluruskan lutut, berjalan, & naik tangga',
      disability: 'Keterbatasan mobilitas sementara',
      modalitas: ['Terapi Latihan', 'Strengthening', 'Mobilisasi Sendi', 'Kompres Dingin', 'Gait Training'],
      edukasi: 'Latihan LGS & penguatan quadriceps bertahap, elevasi & kompres untuk oedem',
      tujuan_jangka_pendek: 'Mengurangi nyeri/oedem & menambah LGS lutut',
      tujuan_jangka_panjang: 'Memulihkan kekuatan, LGS, & pola jalan normal',
    },
  },
  {
    id: 'ger_spondylosis', name: 'Spondylosis (Nyeri Punggung Kronik)', emoji: '🧓', category: 'geriatri',
    data: {
      keluhan_utama: 'Nyeri & kaku punggung menahun',
      keluhan_tags: ['Nyeri', 'Kaku'],
      impairment: 'Degenerasi tulang belakang, kekakuan & nyeri, kelemahan otot trunk',
      fungsional_limitation: 'Sulit membungkuk, berdiri/duduk lama',
      disability: 'Terganggu aktivitas sehari-hari',
      modalitas: ['TENS', 'Infra Red (IR)', 'Terapi Latihan', 'Stretching', 'Core Stability'],
      edukasi: 'Latihan postur & penguatan core, hindari posisi statis lama',
      tujuan_jangka_pendek: 'Mengurangi nyeri & kekakuan',
      tujuan_jangka_panjang: 'Mempertahankan mobilitas & fungsi tulang belakang',
    },
  },
  {
    id: 'ger_sarcopenia', name: 'Kelemahan Umum / Sarkopenia', emoji: '🧓', category: 'geriatri',
    data: {
      keluhan_utama: 'Badan lemah & mudah lelah',
      keluhan_tags: ['Lemah', 'Tidak stabil'],
      impairment: 'Penurunan massa & kekuatan otot, penurunan daya tahan',
      fungsional_limitation: 'Sulit bangkit dari kursi, berjalan jauh, & beraktivitas',
      disability: 'Penurunan kemandirian & risiko jatuh',
      modalitas: ['Strengthening', 'Terapi Latihan', 'Balance Training', 'Gait Training'],
      edukasi: 'Latihan penguatan progresif & aktivitas rutin, asupan protein cukup',
      tujuan_jangka_pendek: 'Meningkatkan kekuatan & daya tahan otot',
      tujuan_jangka_panjang: 'Memulihkan kemandirian & menurunkan risiko jatuh',
    },
  },
  {
    id: 'ger_copd', name: 'Rehabilitasi Paru (COPD)', emoji: '🫁', category: 'geriatri',
    data: {
      keluhan_utama: 'Sesak napas saat beraktivitas',
      keluhan_tags: ['Lemah'],
      impairment: 'Penurunan kapasitas paru, kelemahan otot pernapasan, deconditioning',
      fungsional_limitation: 'Mudah sesak & lelah saat berjalan/aktivitas',
      disability: 'Pembatasan aktivitas karena sesak',
      modalitas: ['Terapi Latihan', 'Strengthening'],
      edukasi: 'Latihan napas (pursed-lip/diafragma), latihan endurance bertahap, hemat energi',
      tujuan_jangka_pendek: 'Memperbaiki pola napas & mengurangi sesak',
      tujuan_jangka_panjang: 'Meningkatkan toleransi aktivitas & kualitas hidup',
    },
  },
  {
    id: 'ger_immobilization', name: 'Sindrom Imobilisasi (Tirah Baring Lama)', emoji: '🛏️', category: 'geriatri',
    data: {
      keluhan_utama: 'Lemah & kaku setelah lama berbaring',
      keluhan_tags: ['Lemah', 'Kaku', 'Tidak stabil'],
      impairment: 'Atrofi & kelemahan otot, kekakuan sendi, risiko kontraktur & dekubitus',
      fungsional_limitation: 'Gangguan transfer, duduk, berdiri, & berjalan',
      disability: 'Ketergantungan tinggi dalam ADL',
      modalitas: ['Terapi Latihan', 'Mobilisasi Sendi', 'Strengthening', 'Stretching', 'Balance Training'],
      edukasi: 'Mobilisasi bertahap & alih baring, cegah dekubitus & kontraktur',
      tujuan_jangka_pendek: 'Menjaga LGS & mencegah komplikasi imobilisasi',
      tujuan_jangka_panjang: 'Memulihkan kekuatan, mobilitas, & kemandirian',
    },
  },

  // ==========================================================
  // SPORT INJURY
  // ==========================================================
  {
    id: 'sport_acl', name: 'Cedera ACL / Pasca Rekonstruksi', emoji: '🏃', category: 'sport',
    data: {
      keluhan_utama: 'Lutut tidak stabil pasca cedera',
      keluhan_tags: ['Nyeri', 'Bengkak', 'Tidak stabil', 'Lemah'],
      impairment: 'Instabilitas lutut, kelemahan quadriceps/hamstring, oedem, keterbatasan LGS',
      fungsional_limitation: 'Sulit berlari, melompat, berputar, & menumpu',
      disability: 'Terganggu aktivitas olahraga & sehari-hari',
      modalitas: ['Terapi Latihan', 'Strengthening', 'Balance Training', 'Kompres Dingin', 'Mobilisasi Sendi'],
      edukasi: 'Latihan progresif sesuai fase rehab, hindari pivoting dini, latihan proprioseptif',
      tujuan_jangka_pendek: 'Mengurangi oedem/nyeri & memulihkan LGS serta kekuatan',
      tujuan_jangka_panjang: 'Memulihkan stabilitas lutut & kembali berolahraga (return to sport)',
    },
  },
  {
    id: 'sport_ankle', name: 'Ankle Sprain', emoji: '🦶', category: 'sport',
    data: {
      keluhan_utama: 'Nyeri & bengkak pergelangan kaki setelah terkilir',
      keluhan_tags: ['Nyeri', 'Bengkak', 'Tidak stabil'],
      impairment: 'Cedera ligamen lateral, oedem, nyeri, instabilitas & kelemahan',
      fungsional_limitation: 'Nyeri saat menumpu, berjalan, & berlari',
      disability: 'Terganggu aktivitas & olahraga',
      modalitas: ['Kompres Dingin', 'TENS', 'Terapi Latihan', 'Balance Training', 'Strengthening'],
      edukasi: 'RICE fase akut, latihan proprioseptif & penguatan peroneus cegah kekambuhan',
      tujuan_jangka_pendek: 'Mengurangi nyeri & oedem',
      tujuan_jangka_panjang: 'Memulihkan stabilitas & fungsi pergelangan kaki',
    },
  },
  {
    id: 'sport_hamstring', name: 'Hamstring Strain', emoji: '🏃', category: 'sport',
    data: {
      keluhan_utama: 'Nyeri paha belakang setelah sprint',
      keluhan_tags: ['Nyeri', 'Kaku', 'Lemah'],
      impairment: 'Cedera/robekan otot hamstring, nyeri, kelemahan & pemendekan',
      fungsional_limitation: 'Nyeri saat berlari, menekuk lutut, & sprint',
      disability: 'Terganggu performa olahraga',
      modalitas: ['Kompres Dingin', 'Ultrasound (US)', 'Stretching', 'Strengthening', 'Terapi Latihan'],
      edukasi: 'Pemulihan bertahap, eccentric strengthening, pemanasan sebelum olahraga',
      tujuan_jangka_pendek: 'Mengurangi nyeri & memulihkan fleksibilitas',
      tujuan_jangka_panjang: 'Memulihkan kekuatan & mencegah cedera ulang',
    },
  },
  {
    id: 'sport_meniscus', name: 'Cedera Meniscus', emoji: '🦵', category: 'sport',
    data: {
      keluhan_utama: 'Nyeri lutut & kadang terkunci',
      keluhan_tags: ['Nyeri', 'Bengkak', 'Sulit digerakkan'],
      impairment: 'Nyeri sendi lutut, oedem, locking/clicking, kelemahan quadriceps',
      fungsional_limitation: 'Sulit jongkok, berputar, & menumpu penuh',
      disability: 'Terganggu olahraga & aktivitas sehari-hari',
      modalitas: ['Terapi Latihan', 'Strengthening', 'Mobilisasi Sendi', 'Kompres Dingin', 'Balance Training'],
      edukasi: 'Hindari jongkok dalam & memutar lutut, latihan penguatan quadriceps',
      tujuan_jangka_pendek: 'Mengurangi nyeri/oedem & memulihkan LGS',
      tujuan_jangka_panjang: 'Memulihkan kekuatan & fungsi lutut',
    },
  },
  {
    id: 'sport_rotator', name: 'Cedera Rotator Cuff', emoji: '💪', category: 'sport',
    data: {
      keluhan_utama: 'Nyeri bahu saat mengangkat lengan',
      keluhan_tags: ['Nyeri', 'Lemah', 'Sulit digerakkan'],
      impairment: 'Cedera/tendinopati rotator cuff, kelemahan & nyeri saat elevasi',
      fungsional_limitation: 'Sulit mengangkat & memutar lengan, nyeri malam hari',
      disability: 'Terganggu olahraga overhead & aktivitas',
      modalitas: ['Ultrasound (US)', 'TENS', 'Manual Therapy', 'Strengthening', 'Terapi Latihan'],
      edukasi: 'Hindari gerakan overhead nyeri, latihan penguatan rotator cuff & scapular',
      tujuan_jangka_pendek: 'Mengurangi nyeri bahu',
      tujuan_jangka_panjang: 'Memulihkan kekuatan & fungsi bahu',
    },
  },
  {
    id: 'sport_pfps', name: "Patellofemoral Pain (Runner's Knee)", emoji: '🏃', category: 'sport',
    data: {
      keluhan_utama: 'Nyeri depan lutut saat aktivitas',
      keluhan_tags: ['Nyeri', 'Lemah'],
      impairment: 'Nyeri anterior lutut, maltracking patella, kelemahan quadriceps/glutes',
      fungsional_limitation: 'Nyeri saat naik-turun tangga, jongkok, & berlari',
      disability: 'Terganggu olahraga & aktivitas',
      modalitas: ['Terapi Latihan', 'Strengthening', 'Stretching', 'Kinesio Taping', 'Mobilisasi Sendi'],
      edukasi: 'Latihan penguatan quadriceps & gluteus, koreksi pola latihan/lari',
      tujuan_jangka_pendek: 'Mengurangi nyeri anterior lutut',
      tujuan_jangka_panjang: 'Memperbaiki tracking patella & fungsi lutut',
    },
  },
  {
    id: 'sport_achilles', name: 'Achilles Tendinopathy', emoji: '🦶', category: 'sport',
    data: {
      keluhan_utama: 'Nyeri & kaku tendon Achilles',
      keluhan_tags: ['Nyeri', 'Kaku', 'Kaku pagi hari'],
      impairment: 'Nyeri & penebalan tendon Achilles, tightness betis, kelemahan plantarfleksi',
      fungsional_limitation: 'Nyeri saat berjalan, berlari, & berjinjit',
      disability: 'Terganggu olahraga & aktivitas',
      modalitas: ['Ultrasound (US)', 'Stretching', 'Strengthening', 'Graston / IASTM', 'Terapi Latihan'],
      edukasi: 'Eccentric heel-drop, peregangan betis, beban latihan bertahap',
      tujuan_jangka_pendek: 'Mengurangi nyeri tendon',
      tujuan_jangka_panjang: 'Memulihkan kekuatan tendon & kembali berolahraga',
    },
  },
  {
    id: 'sport_shin', name: 'Shin Splints (MTSS)', emoji: '🦵', category: 'sport',
    data: {
      keluhan_utama: 'Nyeri tulang kering saat berlari',
      keluhan_tags: ['Nyeri'],
      impairment: 'Nyeri sepanjang tibia medial, tightness & overuse otot tungkai bawah',
      fungsional_limitation: 'Nyeri saat berlari & melompat',
      disability: 'Terganggu latihan & olahraga',
      modalitas: ['Kompres Dingin', 'Ultrasound (US)', 'Stretching', 'Strengthening', 'Terapi Latihan'],
      edukasi: 'Kurangi beban lari sementara, perbaiki alas kaki & teknik, peregangan betis',
      tujuan_jangka_pendek: 'Mengurangi nyeri tulang kering',
      tujuan_jangka_panjang: 'Kembali berlari bertahap tanpa nyeri',
    },
  },
  {
    id: 'sport_groin', name: 'Groin Strain (Cedera Selangkangan)', emoji: '🏃', category: 'sport',
    data: {
      keluhan_utama: 'Nyeri selangkangan/paha dalam',
      keluhan_tags: ['Nyeri', 'Kaku', 'Lemah'],
      impairment: 'Cedera otot adduktor, nyeri & kelemahan saat adduksi',
      fungsional_limitation: 'Nyeri saat berlari, menendang, & berputar',
      disability: 'Terganggu performa olahraga',
      modalitas: ['Kompres Dingin', 'Ultrasound (US)', 'Stretching', 'Strengthening', 'Terapi Latihan'],
      edukasi: 'Pemulihan bertahap, penguatan adduktor & core, pemanasan adekuat',
      tujuan_jangka_pendek: 'Mengurangi nyeri & memulihkan fleksibilitas',
      tujuan_jangka_panjang: 'Memulihkan kekuatan & mencegah cedera ulang',
    },
  },
  {
    id: 'sport_calf', name: 'Calf Strain (Cedera Betis)', emoji: '🦵', category: 'sport',
    data: {
      keluhan_utama: 'Nyeri betis mendadak saat olahraga',
      keluhan_tags: ['Nyeri', 'Kaku', 'Bengkak'],
      impairment: 'Cedera otot gastrocnemius/soleus, nyeri & kelemahan plantarfleksi',
      fungsional_limitation: 'Nyeri saat berjalan, berjinjit, & berlari',
      disability: 'Terganggu olahraga & aktivitas',
      modalitas: ['Kompres Dingin', 'Ultrasound (US)', 'Stretching', 'Strengthening', 'Terapi Latihan'],
      edukasi: 'RICE fase akut, peregangan & penguatan betis bertahap, pemanasan sebelum olahraga',
      tujuan_jangka_pendek: 'Mengurangi nyeri & oedem betis',
      tujuan_jangka_panjang: 'Memulihkan kekuatan betis & kembali berolahraga',
    },
  },
]
