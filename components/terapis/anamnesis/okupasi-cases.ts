// ============================================================
// TEMPLATE KASUS — MODE CEPAT OKUPASI TERAPI (ANAK)
// 10 kasus yang paling sering ditangani OT anak di Indonesia.
// Memilih kasus akan mengisi otomatis: area perkembangan bermasalah,
// rencana intervensi OT, dan kesimpulan problematik. Semua tetap bisa diedit.
// Field di sini DIGABUNG ke `assessments.data` (JSONB) yang sama dengan
// form lengkap (wizard). Klinik fisioterapi memakai fisio-cases.ts.
// ============================================================

export type OtCase = {
  id: string
  name: string
  emoji: string
  data: Record<string, unknown>
}

// Area perkembangan yang biasa bermasalah pada anak (chip multi-pilih).
export const AREA_TAGS = [
  'Sensori Integrasi',
  'Motorik Halus',
  'Motorik Kasar',
  'Atensi & Konsentrasi',
  'Kognitif / Konsep',
  'Komunikasi / Bahasa',
  'Interaksi Sosial',
  'Perilaku / Emosi',
  'Kemandirian (AKS)',
  'Koordinasi',
  'Pra-tulis (Pre-writing)',
]

// Rencana intervensi / program OT (chip multi-pilih).
export const INTERVENSI_TAGS = [
  'Terapi Sensori Integrasi',
  'Latihan Motorik Halus',
  'Latihan Motorik Kasar',
  'Latihan Atensi & Konsentrasi',
  'Latihan Kognitif',
  'Latihan AKS / Kemandirian',
  'Oral Motor',
  'Manajemen Perilaku',
  'Latihan Pra-tulis',
  'Latihan Koordinasi Bilateral',
  'Edukasi & Home Program',
]

// Tingkat kemandirian aktivitas sehari-hari (chip pilih satu).
export const KEMANDIRIAN_OPTIONS = [
  'Mandiri',
  'Bantuan Minimal',
  'Bantuan Sedang',
  'Bantuan Penuh',
]

export const OT_CASES: OtCase[] = [
  {
    id: 'asd',
    name: 'Autisme (ASD)',
    emoji: '🧩',
    data: {
      area_tags: ['Sensori Integrasi', 'Interaksi Sosial', 'Komunikasi / Bahasa', 'Perilaku / Emosi', 'Atensi & Konsentrasi'],
      intervensi_tags: ['Terapi Sensori Integrasi', 'Latihan Atensi & Konsentrasi', 'Manajemen Perilaku', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Gangguan interaksi sosial dan komunikasi disertai gangguan pemrosesan sensori serta perilaku repetitif, sehingga memengaruhi atensi, kemandirian, dan partisipasi anak dalam aktivitas sehari-hari.',
    },
  },
  {
    id: 'adhd',
    name: 'ADHD / GPPH',
    emoji: '⚡',
    data: {
      area_tags: ['Atensi & Konsentrasi', 'Perilaku / Emosi', 'Sensori Integrasi', 'Koordinasi'],
      intervensi_tags: ['Latihan Atensi & Konsentrasi', 'Terapi Sensori Integrasi', 'Manajemen Perilaku', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Gangguan pemusatan perhatian, hiperaktivitas, dan impulsivitas yang menurunkan kemampuan fokus, regulasi diri, serta penyelesaian tugas terstruktur.',
    },
  },
  {
    id: 'speech_delay',
    name: 'Speech Delay',
    emoji: '🗣️',
    data: {
      area_tags: ['Komunikasi / Bahasa', 'Atensi & Konsentrasi', 'Kognitif / Konsep', 'Sensori Integrasi'],
      intervensi_tags: ['Oral Motor', 'Latihan Atensi & Konsentrasi', 'Latihan Kognitif', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Keterlambatan kemampuan bicara/bahasa yang memengaruhi komunikasi fungsional, sering disertai keterbatasan atensi bersama (joint attention) dan motorik oral.',
    },
  },
  {
    id: 'gdd',
    name: 'Keterlambatan Perkembangan Global (GDD)',
    emoji: '🌱',
    data: {
      area_tags: ['Motorik Halus', 'Motorik Kasar', 'Kognitif / Konsep', 'Komunikasi / Bahasa', 'Kemandirian (AKS)'],
      intervensi_tags: ['Latihan Motorik Halus', 'Latihan Motorik Kasar', 'Latihan Kognitif', 'Latihan AKS / Kemandirian', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Keterlambatan pada dua atau lebih ranah perkembangan (motorik, kognitif, bahasa, sosial-emosi) sehingga kemampuan anak berada di bawah usia kronologisnya.',
    },
  },
  {
    id: 'cp',
    name: 'Cerebral Palsy',
    emoji: '♿',
    data: {
      area_tags: ['Motorik Kasar', 'Motorik Halus', 'Koordinasi', 'Kemandirian (AKS)', 'Sensori Integrasi'],
      intervensi_tags: ['Latihan Motorik Kasar', 'Latihan Motorik Halus', 'Latihan Koordinasi Bilateral', 'Latihan AKS / Kemandirian', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Gangguan tonus dan kontrol motorik akibat lesi otak non-progresif yang membatasi postur, mobilitas, koordinasi, serta kemandirian dalam aktivitas sehari-hari.',
    },
  },
  {
    id: 'down',
    name: 'Down Syndrome',
    emoji: '💙',
    data: {
      area_tags: ['Motorik Halus', 'Motorik Kasar', 'Kognitif / Konsep', 'Kemandirian (AKS)', 'Komunikasi / Bahasa'],
      intervensi_tags: ['Latihan Motorik Halus', 'Latihan Motorik Kasar', 'Latihan Kognitif', 'Latihan AKS / Kemandirian', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Hipotonia dengan keterlambatan motorik halus & kasar, serta hambatan kognitif dan bahasa yang memengaruhi kemandirian dan partisipasi anak.',
    },
  },
  {
    id: 'spd',
    name: 'Gangguan Pemrosesan Sensori (SPD)',
    emoji: '🌀',
    data: {
      area_tags: ['Sensori Integrasi', 'Atensi & Konsentrasi', 'Perilaku / Emosi', 'Koordinasi'],
      intervensi_tags: ['Terapi Sensori Integrasi', 'Latihan Koordinasi Bilateral', 'Manajemen Perilaku', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Disfungsi modulasi dan diskriminasi sensori (hipo-/hipersensitif) yang memengaruhi regulasi diri, atensi, koordinasi, dan respon terhadap lingkungan.',
    },
  },
  {
    id: 'fine_motor',
    name: 'Gangguan Motorik Halus',
    emoji: '✍️',
    data: {
      area_tags: ['Motorik Halus', 'Pra-tulis (Pre-writing)', 'Koordinasi', 'Atensi & Konsentrasi'],
      intervensi_tags: ['Latihan Motorik Halus', 'Latihan Pra-tulis', 'Latihan Koordinasi Bilateral', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Keterbatasan kekuatan dan koordinasi tangan, pola pegang, serta kontrol gerak halus yang memengaruhi kemampuan pra-tulis, menggunting, dan manipulasi benda.',
    },
  },
  {
    id: 'dcd',
    name: 'Gangguan Koordinasi (DCD / Dyspraxia)',
    emoji: '🤸',
    data: {
      area_tags: ['Koordinasi', 'Motorik Kasar', 'Motorik Halus', 'Pra-tulis (Pre-writing)'],
      intervensi_tags: ['Latihan Koordinasi Bilateral', 'Latihan Motorik Kasar', 'Latihan Motorik Halus', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Hambatan perencanaan motorik (motor planning/praxis) dan koordinasi yang membuat gerakan tampak canggung serta menyulitkan keterampilan motorik baru.',
    },
  },
  {
    id: 'learning',
    name: 'Kesulitan Belajar (Disleksia/Disgrafia)',
    emoji: '📚',
    data: {
      area_tags: ['Kognitif / Konsep', 'Pra-tulis (Pre-writing)', 'Atensi & Konsentrasi', 'Motorik Halus'],
      intervensi_tags: ['Latihan Kognitif', 'Latihan Pra-tulis', 'Latihan Atensi & Konsentrasi', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Kesulitan belajar spesifik (membaca/menulis/berhitung) yang sering disertai hambatan persepsi visual, atensi, dan keterampilan motorik halus untuk menulis.',
    },
  },
]
