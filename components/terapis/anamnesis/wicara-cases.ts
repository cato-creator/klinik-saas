// ============================================================
// TEMPLATE KASUS — MODE CEPAT TERAPI WICARA (ANAK & DEWASA)
// Kasus yang paling sering ditangani terapis wicara di Indonesia.
// Memilih kasus akan mengisi otomatis: area komunikasi bermasalah,
// rencana intervensi TW, dan kesimpulan problematik. Semua tetap bisa diedit.
// Field di sini DIGABUNG ke `assessments.data` (JSONB) yang sama dengan
// form lengkap (wizard). Struktur identik dengan okupasi-cases.ts (OT),
// hanya ISI-nya yang khusus terapi wicara.
// ============================================================

export type WicaraCase = {
  id: string
  name: string
  emoji: string
  data: Record<string, unknown>
}

// Ranah komunikasi/bicara yang biasa bermasalah (chip multi-pilih).
export const AREA_TAGS = [
  'Bahasa Reseptif (Pemahaman)',
  'Bahasa Ekspresif (Pengucapan)',
  'Artikulasi / Kejelasan Bicara',
  'Fonologi',
  'Kelancaran (Gagap)',
  'Suara & Resonansi',
  'Pragmatik / Komunikasi Sosial',
  'Oral Motor',
  'Makan & Menelan (Disfagia)',
  'Pendengaran',
  'Pra-bicara (Pre-verbal)',
]

// Rencana intervensi / program terapi wicara (chip multi-pilih).
export const INTERVENSI_TAGS = [
  'Latihan Oral Motor',
  'Stimulasi Bahasa Reseptif',
  'Stimulasi Bahasa Ekspresif',
  'Terapi Artikulasi',
  'Terapi Fonologi',
  'Terapi Kelancaran (Gagap)',
  'Terapi Suara',
  'Latihan Pragmatik / Sosial',
  'Komunikasi Augmentatif (AAC)',
  'Terapi Menelan (Disfagia)',
  'Edukasi & Home Program',
]

// Tingkat kejelasan bicara / intelligibility (chip pilih satu).
export const INTELLIGIBILITY_OPTIONS = [
  'Jelas (mudah dipahami)',
  'Cukup jelas',
  'Sulit dipahami',
  'Belum verbal',
]

export const WICARA_CASES: WicaraCase[] = [
  // ---------------- ANAK ----------------
  {
    id: 'speech_delay',
    name: 'Keterlambatan Bicara (Speech Delay)',
    emoji: '🗣️',
    data: {
      area_tags: ['Bahasa Ekspresif (Pengucapan)', 'Bahasa Reseptif (Pemahaman)', 'Pra-bicara (Pre-verbal)', 'Oral Motor'],
      intervensi_tags: ['Stimulasi Bahasa Ekspresif', 'Stimulasi Bahasa Reseptif', 'Latihan Oral Motor', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Kemampuan bicara/bahasa berada di bawah usia kronologis sehingga komunikasi fungsional belum optimal, sering disertai keterbatasan kosakata dan motorik oral.',
    },
  },
  {
    id: 'language_delay',
    name: 'Keterlambatan Bahasa',
    emoji: '💬',
    data: {
      area_tags: ['Bahasa Reseptif (Pemahaman)', 'Bahasa Ekspresif (Pengucapan)', 'Pragmatik / Komunikasi Sosial'],
      intervensi_tags: ['Stimulasi Bahasa Reseptif', 'Stimulasi Bahasa Ekspresif', 'Latihan Pragmatik / Sosial', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Hambatan pada pemahaman dan/atau penggunaan bahasa (kosakata, tata bahasa, menyusun kalimat) yang memengaruhi kemampuan berkomunikasi sesuai usia.',
    },
  },
  {
    id: 'articulation',
    name: 'Gangguan Artikulasi',
    emoji: '👅',
    data: {
      area_tags: ['Artikulasi / Kejelasan Bicara', 'Oral Motor'],
      intervensi_tags: ['Terapi Artikulasi', 'Latihan Oral Motor', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Kesalahan pengucapan bunyi tertentu (substitusi/omisi/distorsi) yang menurunkan kejelasan bicara, sementara pemahaman dan bahasa relatif sesuai usia.',
    },
  },
  {
    id: 'phonology',
    name: 'Gangguan Fonologi',
    emoji: '🔤',
    data: {
      area_tags: ['Fonologi', 'Artikulasi / Kejelasan Bicara'],
      intervensi_tags: ['Terapi Fonologi', 'Terapi Artikulasi', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Pola kesalahan bunyi yang sistematis (mis. fronting, stopping, penghilangan konsonan akhir) sehingga banyak kata menjadi sulit dipahami pendengar.',
    },
  },
  {
    id: 'stuttering',
    name: 'Gagap (Stuttering)',
    emoji: '🔁',
    data: {
      area_tags: ['Kelancaran (Gagap)'],
      intervensi_tags: ['Terapi Kelancaran (Gagap)', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Gangguan kelancaran bicara berupa pengulangan bunyi/suku kata, perpanjangan, atau blocking yang dapat disertai gerakan penyerta dan memengaruhi rasa percaya diri.',
    },
  },
  {
    id: 'asd_comm',
    name: 'Autisme — Hambatan Komunikasi',
    emoji: '🧩',
    data: {
      area_tags: ['Pragmatik / Komunikasi Sosial', 'Bahasa Reseptif (Pemahaman)', 'Bahasa Ekspresif (Pengucapan)', 'Pra-bicara (Pre-verbal)'],
      intervensi_tags: ['Latihan Pragmatik / Sosial', 'Stimulasi Bahasa Reseptif', 'Stimulasi Bahasa Ekspresif', 'Komunikasi Augmentatif (AAC)', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Hambatan komunikasi sosial (kontak mata, atensi bersama, giliran bicara) disertai keterbatasan bahasa reseptif-ekspresif yang memengaruhi interaksi fungsional.',
    },
  },
  {
    id: 'cleft',
    name: 'Bibir/Langit Sumbing (Cleft Palate)',
    emoji: '👄',
    data: {
      area_tags: ['Artikulasi / Kejelasan Bicara', 'Suara & Resonansi', 'Oral Motor'],
      intervensi_tags: ['Terapi Artikulasi', 'Terapi Suara', 'Latihan Oral Motor', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Gangguan artikulasi dan resonansi (sering hipernasal) akibat kelainan struktur palatum, memengaruhi kejelasan bicara meski sudah/akan menjalani operasi.',
    },
  },
  {
    id: 'hearing_impair',
    name: 'Gangguan Pendengaran',
    emoji: '👂',
    data: {
      area_tags: ['Pendengaran', 'Bahasa Reseptif (Pemahaman)', 'Bahasa Ekspresif (Pengucapan)', 'Artikulasi / Kejelasan Bicara'],
      intervensi_tags: ['Stimulasi Bahasa Reseptif', 'Stimulasi Bahasa Ekspresif', 'Terapi Artikulasi', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Keterlambatan bahasa dan bicara yang berakar dari gangguan pendengaran, sehingga perlu stimulasi auditori-verbal yang intensif dan terstruktur.',
    },
  },
  {
    id: 'childhood_apraxia',
    name: 'Apraksia Bicara Anak (CAS)',
    emoji: '🧠',
    data: {
      area_tags: ['Artikulasi / Kejelasan Bicara', 'Oral Motor', 'Bahasa Ekspresif (Pengucapan)'],
      intervensi_tags: ['Terapi Artikulasi', 'Latihan Oral Motor', 'Stimulasi Bahasa Ekspresif', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Hambatan perencanaan dan pemrograman gerak bicara (motor speech) sehingga pengucapan tidak konsisten dan kejelasan bicara rendah meski pemahaman baik.',
    },
  },
  // ---------------- DEWASA ----------------
  {
    id: 'aphasia',
    name: 'Afasia (Pasca Stroke)',
    emoji: '🧓',
    data: {
      area_tags: ['Bahasa Reseptif (Pemahaman)', 'Bahasa Ekspresif (Pengucapan)'],
      intervensi_tags: ['Stimulasi Bahasa Reseptif', 'Stimulasi Bahasa Ekspresif', 'Komunikasi Augmentatif (AAC)', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Gangguan berbahasa akibat lesi otak (umumnya pasca stroke) yang memengaruhi pemahaman, pengucapan, membaca, dan/atau menulis, sehingga membatasi komunikasi sehari-hari.',
    },
  },
  {
    id: 'dysarthria',
    name: 'Disartria',
    emoji: '🗨️',
    data: {
      area_tags: ['Artikulasi / Kejelasan Bicara', 'Suara & Resonansi', 'Oral Motor'],
      intervensi_tags: ['Terapi Artikulasi', 'Latihan Oral Motor', 'Terapi Suara', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Kelemahan/gangguan koordinasi otot bicara akibat gangguan neurologis yang membuat bicara menjadi pelo, lambat, atau tidak jelas dengan suara melemah.',
    },
  },
  {
    id: 'voice_disorder',
    name: 'Gangguan Suara (Disfonia)',
    emoji: '🎙️',
    data: {
      area_tags: ['Suara & Resonansi'],
      intervensi_tags: ['Terapi Suara', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Perubahan kualitas suara (serak, melemah, atau hilang) akibat penggunaan suara berlebih atau kelainan pita suara, memengaruhi komunikasi dan/atau pekerjaan.',
    },
  },
  {
    id: 'dysphagia',
    name: 'Gangguan Menelan (Disfagia)',
    emoji: '🥄',
    data: {
      area_tags: ['Makan & Menelan (Disfagia)', 'Oral Motor'],
      intervensi_tags: ['Terapi Menelan (Disfagia)', 'Latihan Oral Motor', 'Edukasi & Home Program'],
      kesimpulan_problematik:
        'Kesulitan mengunyah dan/atau menelan yang berisiko tersedak/aspirasi, memerlukan latihan oral-motor dan strategi menelan yang aman.',
    },
  },
]
