'use client'

// ============================================================
// FORM ASESMEN — KHUSUS OKUPASI TERAPI ANAK
// Sumber: "Pemeriksaan Okupasi Terapi pada Perkembangan Anak" (form 13 halaman).
// Karena field-nya SANGAT banyak & heterogen (teks, checklist skill, grid),
// form ini DIDESKRIPSIKAN SECARA DEKLARATIF lewat skema `STEPS` di bawah, lalu
// dirender oleh satu renderer generik (editor) + satu viewer generik. Menambah/
// mengubah field = ubah skema, bukan menulis komponen baru.
//
// Dua mode (mirip fisio, tapi field DISESUAIKAN untuk OT anak):
//  • MODE CEPAT  → input "klik-klik" (pilih kasus OT, chip area perkembangan,
//    tingkat kemandirian, chip intervensi). Cepat untuk harian.
//  • MODE LENGKAP → wizard 7 langkah sesuai form pemeriksaan OT (detail).
// Keduanya disimpan utuh sebagai JSONB di `assessments.data` (endpoint sama dgn fisio).
// Klinik fisioterapi memakai form sendiri (fisio-anamnesis-module.tsx).
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Loader2, X, ChevronLeft, ChevronRight, Check, ClipboardList, Zap, ListChecks,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Assessment } from '@/types'
import { OT_CASES, AREA_TAGS, INTERVENSI_TAGS, KEMANDIRIAN_OPTIONS } from './okupasi-cases'
import { CaseDropdown, ChipMultiAdd, type CaseLike } from './case-templates'

/* ============================================================
   SKEMA FORM
   ============================================================ */

type Item = { key: string; label: string }

type Block =
  | { kind: 'textarea'; key: string; label: string; hint?: string; rows?: number }
  | { kind: 'line'; key: string; label: string; hint?: string }
  // checklist: daftar skill. Tiap item punya 1 input singkat (mis. "+/-", usia, catatan).
  | { kind: 'checklist'; key: string; label: string; hint?: string; items: Item[] }
  // grid: tabel baris×kolom tetap (Vision, Tonus, Posisi dalam ruang).
  | { kind: 'grid'; key: string; label: string; hint?: string; rows: Item[]; cols: Item[] }
  // dyntable: tabel baris dinamis (Program OT).
  | { kind: 'dyntable'; key: string; label: string; hint?: string; cols: Item[] }
  // heading: sub-judul visual di dalam satu step.
  | { kind: 'heading'; label: string }

type Step = { title: string; blocks: Block[] }

const PLUS_MINUS = '+ = mampu · − = tidak mampu (boleh diisi usia tercapai / catatan)'

const STEPS: Step[] = [
  /* ---------- STEP 1 — PEMERIKSAAN FISIK & SISTEM SENSORI ---------- */
  {
    title: 'Fisik & Sensori',
    blocks: [
      { kind: 'heading', label: 'Pemeriksaan Fisik' },
      { kind: 'textarea', key: 'penampilan', label: 'Penampilan' },
      { kind: 'textarea', key: 'postur_simetri', label: 'Postur dan Simetri' },

      { kind: 'heading', label: 'Sistem Sensori' },
      {
        kind: 'grid', key: 'vision', label: 'Vision (Penglihatan)',
        rows: [
          { key: 'focus', label: 'Focus' },
          { key: 'alignment', label: 'Alignment' },
          { key: 'pursuit_h', label: 'Pursuit Horizontal' },
          { key: 'pursuit_v', label: 'Pursuit Vertical' },
          { key: 'pursuit_d', label: 'Pursuit Diagonal' },
          { key: 'konvergen', label: 'Konvergen' },
        ],
        cols: [{ key: 'kanan', label: 'Kanan' }, { key: 'kiri', label: 'Kiri' }],
      },
      { kind: 'textarea', key: 'vision_ket', label: 'Gangguan penglihatan / Kompensasi skill / Kacamata?' },
      {
        kind: 'checklist', key: 'tactile', label: 'Tactile (Perabaan)', hint: PLUS_MINUS,
        items: [
          { key: 'mau_dipeluk', label: 'Mau dipeluk' },
          { key: 'menengok', label: 'Menengok saat disentuh dari belakang' },
          { key: 'sensitif', label: 'Ada hipo-/hipersensitif' },
          { key: 'tekstur', label: 'Tidak menyukai aktifitas bertekstur' },
        ],
      },
      { kind: 'textarea', key: 'vestibular', label: 'Vestibular / Keseimbangan' },
      {
        kind: 'checklist', key: 'auditori', label: 'Auditori (Pendengaran)', hint: PLUS_MINUS,
        items: [
          { key: 'sensitif', label: 'Hiper-/hiposensitif terhadap suara' },
          { key: 'takut_suara', label: 'Takut suara tertentu' },
          { key: 'respon_nama', label: 'Merespon panggilan nama' },
          { key: 'respon_instruksi', label: 'Merespon instruksi terapis' },
          { key: 'respon_lihat', label: 'Merespon instruksi "lihat"' },
        ],
      },
      { kind: 'textarea', key: 'olfaktori', label: 'Olfaktori (Penciuman)' },
      { kind: 'textarea', key: 'gustatori', label: 'Gustatori (Pengecapan)' },
      {
        kind: 'checklist', key: 'stereognosis', label: 'Stereognosis', hint: PLUS_MINUS,
        items: [
          { key: 'nonverbal', label: 'Mengambil benda di box (non verbal)' },
          { key: 'verbal', label: 'Menyebutkan benda di box (verbal)' },
        ],
      },
      { kind: 'textarea', key: 'finger_location', label: 'Finger Location' },
      {
        kind: 'checklist', key: 'diskriminasi', label: 'Diskriminasi Kanan/Kiri', hint: PLUS_MINUS,
        items: [
          { key: 'sepatu', label: 'Memakai sepatu sesuai kanan/kirinya' },
          { key: 'angkat_tangan', label: 'Mengangkat tangan kanan/kiri saat diinstruksikan' },
          { key: 'sebut_tubuh', label: 'Menyebutkan bagian tubuh kanan/kiri' },
          { key: 'dua_tahap', label: '2 tahap perintah kanan/kiri (mis. pegang kuping kanan dgn tangan kiri)' },
        ],
      },
      {
        kind: 'grid', key: 'posisi_ruang', label: 'Posisi Dalam Ruang',
        rows: [
          { key: 'di_atas', label: 'Di atas' },
          { key: 'di_bawah', label: 'Di bawah' },
          { key: 'di_dalam', label: 'Di dalam' },
          { key: 'di_luar', label: 'Di luar' },
          { key: 'di_depan', label: 'Di depan' },
          { key: 'di_belakang', label: 'Di belakang' },
          { key: 'di_samping', label: 'Di samping (kanan/kiri)' },
          { key: 'di_tengah', label: 'Di tengah' },
          { key: 'di_antara', label: 'Di antara' },
          { key: 'di_pinggir', label: 'Di pinggir' },
        ],
        cols: [
          { key: 'meletakkan', label: 'Meletakkan benda' },
          { key: 'menyebutkan', label: 'Menyebutkan' },
          { key: 'generalisasi', label: 'Generalisasi' },
        ],
      },
      {
        kind: 'checklist', key: 'visual_closure', label: 'Visual Closure', hint: PLUS_MINUS,
        items: [
          { key: 'sebut_sebagian', label: 'Menyebutkan benda yg ditunjukkan sebagian' },
          { key: 'cari_kekurangan', label: 'Mencari kekurangan sebuah gambar/benda' },
          { key: 'cari_beda', label: 'Mencari perbedaan 2 gambar/benda' },
        ],
      },
      {
        kind: 'checklist', key: 'figure_ground', label: 'Figure Ground', hint: PLUS_MINUS,
        items: [
          { key: 'kertas_warna', label: 'Mengambil kertas warna berbeda di atas kertas lain' },
          { key: 'ambil_depan_belakang', label: 'Mengambil benda di depan/belakang benda lain' },
          { key: 'sebut_depan_belakang', label: 'Menyebutkan benda di depan/belakang benda lain' },
        ],
      },
      {
        kind: 'checklist', key: 'depth_perception', label: 'Depth Perception', hint: PLUS_MINUS,
        items: [
          { key: 'duduk_kursi', label: 'Memperkirakan saat duduk di kursi yang berbeda' },
          { key: 'kedalaman_gelas', label: 'Menyebutkan tingkat kedalaman/penuh-kosong gelas berisi air' },
        ],
      },
    ],
  },

  /* ---------- STEP 2 — SISTEM MOTORIK & REFLEKS ---------- */
  {
    title: 'Motorik & Refleks',
    blocks: [
      {
        kind: 'grid', key: 'tonus', label: 'Tonus', hint: 'AGA = Anggota Gerak Atas · AGB = Anggota Gerak Bawah',
        rows: [
          { key: 'wajah', label: 'Wajah' },
          { key: 'aga_kanan', label: 'AGA Kanan' },
          { key: 'aga_kiri', label: 'AGA Kiri' },
          { key: 'trunk', label: 'Trunk' },
          { key: 'agb_kanan', label: 'AGB Kanan' },
          { key: 'agb_kiri', label: 'AGB Kiri' },
        ],
        cols: [
          { key: 'normal', label: 'Normal' },
          { key: 'tinggi', label: 'Tinggi' },
          { key: 'rendah', label: 'Rendah' },
          { key: 'fluktuasi', label: 'Fluktuasi' },
        ],
      },
      {
        kind: 'checklist', key: 'endurance', label: 'Endurance (aktifitas & tonus otot)',
        items: [
          { key: 'duduk_bersimpuh', label: 'Duduk bersimpuh lama' },
          { key: 'berlutut', label: 'Berlutut' },
          { key: 'berdiri', label: 'Berdiri' },
          { key: 'reflek_respon', label: 'Reflek / respon' },
          { key: 'alat_bantu', label: 'Alat bantu (adaptive devices, seating, splinting)' },
        ],
      },
      {
        kind: 'checklist', key: 'koordinasi', label: 'Gangguan Koordinasi',
        items: [
          { key: 'tremor', label: 'Tremor (ringan/kasar/persisten/intermitten/intension)' },
          { key: 'dysdiadochokinesia', label: 'Dysdiadochokinesia' },
          { key: 'dysmetria', label: 'Dysmetria' },
          { key: 'dysinergia', label: 'Dysinergia' },
          { key: 'rebound', label: 'Rebound Phenomenon of Holmes' },
          { key: 'hipotonia', label: 'Hipotonia' },
          { key: 'ataxia', label: 'Ataxia' },
          { key: 'athetoid', label: 'Athetoid' },
          { key: 'hemibalismus', label: 'Hemibalismus' },
          { key: 'khorea', label: 'Khorea' },
          { key: 'bradikinesia', label: 'Bradikinesia' },
          { key: 'dystonia', label: 'Dystonia' },
          { key: 'romberg', label: 'Romberg sign' },
          { key: 'equilibrium', label: 'Equilibrium Reactions' },
        ],
      },
      {
        kind: 'checklist', key: 'primitive_reflex', label: 'Primitive Reflex',
        hint: 'Catat ada/tidak & apakah masih menetap di luar rentang usia normal.',
        items: [
          { key: 'stepping', label: 'Stepping reflex (0–3 bln)' },
          { key: 'grasp', label: 'Grasp reflex (0–3/4 bln)' },
          { key: 'placing', label: 'Placing reaction (0–2 bln)' },
          { key: 'sucking', label: 'Sucking reflex (0–2 bln)' },
          { key: 'rooting', label: 'Rooting reflex (0–4 bln)' },
          { key: 'moro', label: 'Moro reflex (0–5 bln)' },
          { key: 'landau', label: 'Landau reflex (4–12 bln)' },
          { key: 'protective', label: 'Protective ekstensor thrust (6 bln ke atas)' },
        ],
      },
      {
        kind: 'checklist', key: 'spinal_reflex', label: 'Spinal Reflex',
        items: [
          { key: 'flexor', label: 'Flexor withdrawal (0–2 bln)' },
          { key: 'extensor', label: 'Extensor thrust (0–2 bln)' },
          { key: 'crossed', label: 'Crossed extension (0–2 bln)' },
        ],
      },
      {
        kind: 'checklist', key: 'brainstem_reflex', label: 'Brainstem Reflex',
        items: [
          { key: 'atnr', label: 'ATNR (0–4/6 bln)' },
          { key: 'stnr', label: 'STNR (0–4/6 bln)' },
          { key: 'tlr_prone', label: 'TLR – prone (0–4 bln)' },
          { key: 'tlr_supine', label: 'TLR – supine (0–4 bln)' },
          { key: 'positive_support', label: 'Positive supporting reaction (0–6 bln)' },
          { key: 'assosiated', label: 'Assosiated reaction (0 bln ke atas)' },
        ],
      },
    ],
  },

  /* ---------- STEP 3 — MOTORIK HALUS ---------- */
  {
    title: 'Motorik Halus',
    blocks: [
      { kind: 'textarea', key: 'fungsi_aga', label: 'Fungsi Anggota Gerak Atas' },
      { kind: 'line', key: 'sisi_dominan_halus', label: 'Sisi Dominan' },
      {
        kind: 'textarea', key: 'meraih_menggenggam',
        label: 'Meraih / Menggenggam / Melepas / Menempatkan Benda',
        hint: 'Tipe menggenggam (benda kecil, balok, pensil), cross midline, melempar atas/bawah, level meraih, kontrol melepas & menempatkan, manipulasi tangan.',
        rows: 3,
      },
      {
        kind: 'line', key: 'blok_menara', label: 'Blok — membuat menara (jumlah blok tertinggi)',
        hint: '±1th: 1–2 · 1,5th: 3 · 2th: 4–6 · 3th: 7–8 · 4th: 9–10 · 5th: 11–12',
      },
      {
        kind: 'checklist', key: 'pegs', label: 'Pegs',
        items: [
          { key: 'besar', label: 'Pegs besar (3 biji, 1,5 th)' },
          { key: 'kecil', label: 'Pegs kecil' },
        ],
      },
      {
        kind: 'checklist', key: 'puzzle', label: 'Puzzle',
        items: [
          { key: 'sederhana', label: 'Sederhana' },
          { key: 'keping', label: '2/4/6 keping dan seterusnya' },
          { key: 'pegangan', label: 'Dengan / tanpa pegangan' },
        ],
      },

      { kind: 'heading', label: 'Bilateral Skill' },
      {
        kind: 'checklist', key: 'meronce', label: 'Meronce manik-manik',
        items: [
          { key: 'tipe_benang', label: 'Tipe benang (gilig / pipih)' },
          { key: 'besar', label: 'Manik besar 1 inchi (2,5 th)' },
          { key: 'sedang', label: 'Manik sedang 0,5 inchi (3 th)' },
          { key: 'kecil', label: 'Manik kecil' },
        ],
      },
      {
        kind: 'checklist', key: 'melepas_manik', label: 'Melepas manik-manik',
        items: [
          { key: 'besar', label: 'Besar (2–2,5 th)' },
          { key: 'kecil', label: 'Kecil' },
        ],
      },
      { kind: 'line', key: 'menarik_kertas', label: 'Menarik kertas (1,5–2 th)' },
      {
        kind: 'checklist', key: 'membalik_buku', label: 'Membalik halaman buku',
        items: [
          { key: 'dua_lembar', label: 'Dua lembar/lebih sekali membalik (1 th)' },
          { key: 'satu', label: 'Satu halaman (1,5–2 th)' },
        ],
      },
      {
        kind: 'checklist', key: 'menisik', label: 'Menisik',
        items: [
          { key: 'pegangan', label: 'Pola pegangan alat tisik' },
          { key: 'titik', label: 'Pola titik-titiknya' },
          { key: 'ketebalan', label: 'Ketebalan kertas' },
        ],
      },

      { kind: 'heading', label: 'Menggunting' },
      {
        kind: 'textarea', key: 'menggunting', label: 'Menggunting — observasi',
        hint: 'Cara memegang kertas, kemampuan & kontrol gerakan, perencanaan, adaptasi, kontrol arah, kemampuan sebelumnya.',
      },
      { kind: 'line', key: 'tipe_menggunting', label: 'Tipe menggunting' },
      { kind: 'line', key: 'pola_gunting', label: 'Pola buka tutup gunting' },
      { kind: 'line', key: 'bilateral_handused', label: 'Fungsi bilateral hand used' },
      {
        kind: 'checklist', key: 'menggunting_skill', label: 'Kemampuan menggunting',
        items: [
          { key: 'tanpa_pola', label: 'Tanpa pola (1,5–2 th)' },
          { key: 'menyilang', label: 'Menyilang kertas (2,5–3 th)' },
          { key: 'garis', label: 'Pada sebuah garis (3–3,5 th)' },
          { key: 'zigzag', label: 'Zig-zag (3,5–4 th)' },
          { key: 'ombak', label: 'Ombak (3,5–4 th)' },
          { key: 'lingkaran', label: 'Lingkaran (3,5–4 th)' },
          { key: 'kotak', label: 'Kotak (4–5 th)' },
        ],
      },
      { kind: 'textarea', key: 'menjelujur', label: 'Menjelujur / Menjahit' },

      { kind: 'heading', label: 'Pre-Writing Skill' },
      { kind: 'line', key: 'tipe_pensil', label: 'Tipe memegang pensil' },
      { kind: 'line', key: 'scribble', label: 'Scribble / menulis spontan (1,5 th)' },
      {
        kind: 'checklist', key: 'mewarnai', label: 'Mewarnai',
        items: [
          { key: 'arah', label: 'Horizontal / vertikal' },
          { key: 'pergelangan', label: 'Gerakan pergelangan tangan' },
          { key: 'arsiran', label: 'Arah arsiran' },
          { key: 'batas', label: 'Ketepatan batas' },
        ],
      },
      {
        kind: 'checklist', key: 'menjodohkan', label: 'Menjodohkan gambar',
        items: [
          { key: 'horizontal', label: 'Horizontal' },
          { key: 'vertikal', label: 'Vertikal' },
          { key: 'diagonal_bawah', label: 'Diagonal ke bawah' },
          { key: 'diagonal_atas', label: 'Diagonal ke atas' },
        ],
      },
      {
        kind: 'textarea', key: 'menebalkan', label: 'Menebalkan / Imitasi / Mengkopi bentuk',
        hint: 'Garis I, —, O, +, /, \\, X, △; angka 1–10; huruf kecil a–z; huruf besar A–Z. Catat bentuk yg mampu ditebalkan/imitasi/kopi & usianya.',
        rows: 3,
      },
      { kind: 'line', key: 'menulis_spontan', label: 'Menulis spontan / dikte' },
      { kind: 'line', key: 'menulis_nama', label: 'Menulis nama' },
      {
        kind: 'textarea', key: 'komentar_halus', label: 'Komentar',
        hint: 'Kualitas garis, kontrol saat memulai/menghentikan, perencanaan & kontrol arah gerakan, mewarnai, penggunaan adaptasi.',
      },
    ],
  },

  /* ---------- STEP 4 — MOTORIK KASAR ---------- */
  {
    title: 'Motorik Kasar',
    blocks: [
      { kind: 'textarea', key: 'fungsi_agb', label: 'Fungsi Anggota Gerak Bawah' },
      { kind: 'line', key: 'sisi_dominan_kasar', label: 'Sisi Dominan' },
      {
        kind: 'checklist', key: 'berjalan', label: 'Berjalan',
        items: [
          { key: 'belakang', label: 'Ke belakang — 3 m tanpa garis (2–2,5 th); 6 langkah pada garis' },
          { key: 'depan', label: 'Ke depan — obstacle kecil (1,5–2 th); garis lurus & 3 langkah (3–4 th); 2 m pada garis (4–5 th)' },
          { key: 'meniti', label: 'Meniti / titian (<1 m) — dgn bantuan (2–3 th); independen 2 lengan (3–4 th)' },
        ],
      },
      { kind: 'textarea', key: 'komentar_jalan', label: 'Komentar berjalan (kaku, pola flatfoot, dll)' },
      {
        kind: 'checklist', key: 'berlari', label: 'Berlari',
        items: [
          { key: 'tanpa_jatuh', label: 'Berlari tanpa jatuh (1,5–2 th)' },
          { key: 'perubahan', label: 'Perlahan dgn perubahan kecepatan (3–4 th)' },
          { key: 'lengan', label: 'Lengan bergerak bergantian dgn tungkai (4–4,5 th)' },
        ],
      },
      {
        kind: 'checklist', key: 'meloncat', label: 'Meloncat',
        items: [
          { key: 'lima', label: '5 kali, kaki sama (3–3,5 th)' },
          { key: 'delapan', label: '8–10 kali, lengan & tungkai bergantian (4,5–5 th)' },
          { key: 'satu_meter', label: '1 meter berirama (5–6 th)' },
        ],
      },
      {
        kind: 'checklist', key: 'berdiri_satu_kaki', label: 'Berdiri pada satu kaki',
        items: [
          { key: 's1', label: '1 detik, ganti kaki (2–2,5 th)' },
          { key: 's3', label: '3 detik, ganti kaki (2,5–3 th)' },
          { key: 's5', label: '5 detik, ganti kaki (3–3,5 th)' },
          { key: 's6', label: '6 detik kanan & 6 detik kiri (3,5–4 th)' },
          { key: 's10', label: '10 detik kanan & 10 detik kiri (4,5–5 th)' },
        ],
      },
      {
        kind: 'checklist', key: 'melompat_satu_kaki', label: 'Melompat dengan satu kaki',
        items: [
          { key: 'tiga', label: '3 kali di tempat, ganti kaki (2,5–3 th)' },
          { key: 'lima', label: '5 kali ke depan tiap kaki (3–3,5 th)' },
          { key: 'delapan', label: '8 kali ke depan tiap kaki (3,5–4 th)' },
        ],
      },
      {
        kind: 'checklist', key: 'naik_tangga', label: 'Naik tangga',
        items: [
          { key: 'bantuan', label: 'Kaki bergantian dgn bantuan (2–2,5 th)' },
          { key: 'mandiri', label: 'Kaki bergantian tanpa bantuan (3–3,5 th)' },
        ],
      },
      {
        kind: 'checklist', key: 'turun_tangga', label: 'Turun tangga',
        items: [
          { key: 'dua_dibantu', label: 'Dua kaki tiap langkah, dibantu (2–2,5 th)' },
          { key: 'dua_mandiri', label: 'Dua kaki tiap langkah, tanpa bantuan (2,5–3 th)' },
          { key: 'bergantian', label: 'Kedua kaki bergantian tanpa bantuan (3–3,5 th)' },
        ],
      },

      { kind: 'heading', label: 'Ketrampilan Main Bola' },
      {
        kind: 'checklist', key: 'melempar', label: 'Melempar (bola tenis)',
        items: [
          { key: 'gagal', label: '5–7 kali gagal melempar akurat (2–2,5 th)' },
          { key: 'kotak', label: 'Melempar ke kotak ½ m² dari 1,5 m (3,5–4 th)' },
        ],
      },
      {
        kind: 'checklist', key: 'menangkap', label: 'Menangkap bola',
        items: [
          { key: 'lurus', label: 'Bola 12 cm dari 1,5 m, lengan lurus (2,5–3 th)' },
          { key: 'siku_tekuk', label: 'Bola 12 cm dari 1,5 m, siku menekuk (3–3,5 th)' },
          { key: 'tenis', label: 'Bola tenis dari 1,5 m, siku menekuk (3,5–4 th)' },
          { key: 'tenis_2m', label: 'Bola tenis dari 2 m, siku di samping tubuh' },
        ],
      },
      {
        kind: 'checklist', key: 'menendang', label: 'Menendang bola (12 cm)',
        items: [
          { key: 'seimbang', label: 'Tanpa kehilangan keseimbangan (1,5–2 th)' },
          { key: 'depan', label: 'Ke depan dari 1,5 m (2,5–3 th)' },
          { key: 'atas', label: 'Ke atas dari 3 m (5–5,5 th)' },
          { key: 'memutar', label: 'Memutar bola dgn telapak kaki 2,5 m (6–7 th)' },
          { key: 'tumit', label: 'Menendang dgn tumit 1,5 m (6–7 th)' },
        ],
      },
    ],
  },

  /* ---------- STEP 5 — KONSEP, PERSEPSI & KOGNISI ---------- */
  {
    title: 'Konsep & Kognisi',
    blocks: [
      { kind: 'textarea', key: 'konsentrasi_atensi', label: 'Konsentrasi dan Atensi', rows: 3 },
      {
        kind: 'checklist', key: 'mengikuti_perintah', label: 'Mengikuti Perintah',
        items: [
          { key: 'satu', label: '1 tahap perintah' },
          { key: 'dua', label: '2 tahap perintah' },
          { key: 'tiga', label: '3 tahap perintah' },
        ],
      },
      {
        kind: 'checklist', key: 'imitasi_blok', label: 'Imitasi Desain Blok',
        hint: 'Desain: kereta, jembatan, robot, pagar, 3 langkah, piramid (rentang 2,5–6 th).',
        items: [
          { key: 'tiga_d', label: '3 Dimensi → 3 Dimensi' },
          { key: 'dua_d', label: '2 Dimensi → 3 Dimensi' },
        ],
      },
      {
        kind: 'checklist', key: 'problem_solving', label: 'Problem Solving (Puzzles)',
        items: [
          { key: 'form_board', label: 'Form board (2–2,5 th)' },
          { key: 'interlocking', label: 'Interlocking puzzles (5/8/12/18 biji; 3–6 th)' },
        ],
      },
      {
        kind: 'checklist', key: 'pemahaman_ukuran', label: 'Pemahaman Perbedaan Ukuran', hint: PLUS_MINUS,
        items: [
          { key: 'besar_kecil', label: 'Menunjukkan ukuran besar/kecil (2–2,5 th)' },
          { key: 'lebih_besar', label: 'Menunjukkan mana yg lebih besar (2,5–3 th)' },
          { key: 'banyak_sedikit', label: 'Menunjukkan banyak/sedikit cangkir (2–2,5 th)' },
          { key: 'panjang_pendek', label: 'Menunjukkan lebih panjang/pendek (3–3,5 th)' },
        ],
      },
      {
        kind: 'checklist', key: 'menghitung', label: 'Menghitung',
        items: [
          { key: 'berhitung_sampai', label: 'Berhitung sampai (2–3 s/d 30; <3 th → 5–6 th)' },
          { key: 'menghitung_benda', label: 'Menghitung benda (2 s/d 20; 2,5 → 6 th)' },
          { key: 'mundur', label: 'Menghitung mundur (2–1, 3–1, … 20–1)' },
          { key: 'memberi_benda', label: 'Memberi sejumlah benda yg diminta (3/6/10/16/20 benda)' },
        ],
      },
      {
        kind: 'checklist', key: 'konsep_warna', label: 'Konsep Warna',
        items: [
          { key: 'menyamakan', label: 'Menyamakan (1 → 11 warna; 2–4 th)' },
          { key: 'menunjukkan', label: 'Menunjukkan (4 → 11 warna; 3–6 th)' },
          { key: 'menyebutkan', label: 'Menyebutkan (1 → 10 warna; 2,5–7 th)' },
        ],
      },
      {
        kind: 'checklist', key: 'konsep_bentuk', label: 'Konsep Bentuk',
        items: [
          { key: 'menyamakan', label: 'Menyamakan (1 → 11 bentuk; 2–4 th)' },
          { key: 'menunjukkan', label: 'Menunjukkan (4 → 11 bentuk; 3–6 th)' },
          { key: 'menyebutkan', label: 'Menyebutkan (1 → 10 bentuk; 2,5–7 th)' },
        ],
      },
      {
        kind: 'textarea', key: 'pemahaman_benda_angka_huruf',
        label: 'Pemahaman Benda Sekitar / Angka / Huruf',
        hint: 'Menyamakan (identik/non-identik), menunjuk, menyebutkan — untuk benda sekitar, angka, dan huruf kecil/besar.',
      },

      { kind: 'heading', label: 'Body Awareness (Kesadaran Tubuh)' },
      {
        kind: 'checklist', key: 'bagian_tubuh', label: 'Mengetahui bagian tubuh',
        hint: 'Jumlah bagian: 4 / 12 / 22 / 25 sesuai usia.',
        items: [
          { key: 'menunjukkan', label: 'Menunjukkan bagian tubuh (1,5 → 5 th)' },
          { key: 'memberi_nama', label: 'Memberi nama bagian tubuh (2 → 6 th)' },
        ],
      },
      { kind: 'line', key: 'menggambar_sederhana', label: 'Menggambar sederhana' },
      {
        kind: 'line', key: 'menggambar_orang', label: 'Menggambar orang',
        hint: '2–5 bagian (3–4 th) · 5–9 (4–5 th) · 9–12 (5–6 th) · 12+ (6+ th)',
      },
      {
        kind: 'checklist', key: 'orientasi_orang', label: 'Orientasi Orang',
        items: [
          { key: 'menyamakan_foto', label: 'Menyamakan foto (identik / non-identik)' },
          { key: 'menunjuk_foto', label: 'Menunjuk foto' },
          { key: 'sebut_foto', label: 'Menyebutkan nama foto' },
        ],
      },
      {
        kind: 'checklist', key: 'orientasi_tempat', label: 'Orientasi Tempat',
        items: [
          { key: 'pergi', label: 'Pergi ke tempat yg dimaksud' },
          { key: 'gambar', label: 'Menyebutkan tempat dari gambar' },
          { key: 'aplikasi', label: 'Menyebutkan tempat aplikasi' },
        ],
      },
      {
        kind: 'checklist', key: 'orientasi_waktu', label: 'Orientasi Waktu',
        items: [
          { key: 'siang_malam', label: 'Mengetahui siang/malam' },
          { key: 'hari', label: 'Mengetahui nama hari' },
          { key: 'tanggal', label: 'Mengetahui tanggal/bulan/tahun' },
          { key: 'jam', label: 'Mengetahui jam' },
        ],
      },
      {
        kind: 'checklist', key: 'kategorisasi', label: 'Kategorisasi',
        items: [
          { key: 'mengelompokkan', label: 'Mengelompokkan' },
          { key: 'nama_kelompok', label: 'Menyebutkan nama kelompok pada kelompok' },
          { key: 'nama_bagian', label: 'Menyebutkan nama kelompok pada bagian' },
          { key: 'anggota', label: 'Menyebutkan anggota kelompok' },
        ],
      },
      {
        kind: 'checklist', key: 'sequencing', label: 'Urutan (Sequencing)',
        items: [
          { key: 'ketukan', label: 'Ketukan' },
          { key: 'gerakan', label: 'Gerakan' },
          { key: 'benda_pola', label: 'Benda / pola' },
          { key: 'kartu', label: 'Kartu (angka, huruf, cerita)' },
        ],
      },
    ],
  },

  /* ---------- STEP 6 — AKTIFITAS KEHIDUPAN SEHARI-HARI (AKS) ---------- */
  {
    title: 'AKS (ADL)',
    blocks: [
      { kind: 'heading', label: 'Aktifitas Kehidupan Sehari-hari (AKS / ADL)' },
      {
        kind: 'textarea', key: 'aks_makan', label: 'Makan', rows: 4,
        hint: '18bln–2th: lepas botol→cangkir, makan di meja, mengunyah mulut tertutup • 2–2,5th: tak ada cairan tumpah, mengunyah rotasi, minum sedotan • 2,5–3th: makan sendiri, pakai garpu, menuang air • 3–4th: motorik oral lengkap, etika makan • 4–5th: siapkan makan sendiri • 5–6th: buat makanan ringan, potong pakai pisau',
      },
      {
        kind: 'textarea', key: 'aks_berpakaian', label: 'Berpakaian', rows: 4,
        hint: '2–2,5th: lepas kaos/celana, resleting • 2,5–3th: coba tali sepatu, pakai kaos/jaket, kaus kaki • 3–4th: pakai sepatu mandiri, kancing 1cm • 4–5th: kancing sesuai lubang, bedakan depan/belakang, tali sepatu • 5–6th: resleting bawah & tali sepatu mandiri',
      },
      {
        kind: 'textarea', key: 'aks_toileting', label: 'Toileting', rows: 4,
        hint: '15–18bln: identifikasi celana basah • 18bln–2th: memberitahu mau BAB/BAK • 2–2,5th: antisipasi verbal • 2,5–3th: kontrol BAB/BAK • 3–4th: ke toilet & lepas celana sendiri • 4–5th: kontrol malam, bersihkan sendiri, mandiri',
      },
      {
        kind: 'textarea', key: 'aks_mandi', label: 'Berdandan / Mencuci Muka / Mandi', rows: 4,
        hint: '2–3th: cuci & keringkan tangan, bedakan lap panas/dingin • 3–4th: bersihkan & keringkan wajah, bersihkan hidung • 4–5th: atur suhu air, sisir rambut • 5–6th: gosok gigi & mandi mandiri',
      },
    ],
  },

  /* ---------- STEP 7 — RINGKASAN & PROGRAM OT ---------- */
  {
    title: 'Ringkasan & Program',
    blocks: [
      { kind: 'textarea', key: 'ringkasan_kasus', label: 'Ringkasan Kasus', rows: 5 },
      { kind: 'textarea', key: 'kesimpulan_problematik', label: 'Kesimpulan Problematik Okupasi Terapi', rows: 4 },
      {
        kind: 'dyntable', key: 'program_ot', label: 'Program Okupasi Terapi',
        cols: [
          { key: 'prioritas', label: 'Prioritas Masalah' },
          { key: 'tujuan', label: 'Tujuan OT' },
          { key: 'intervensi', label: 'Intervensi OT (aktivitas, metode, teknik, durasi, frekuensi)' },
          { key: 'tgl', label: 'Tgl pelaksanaan / Keterangan' },
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
   MODE CEPAT — helper komponen (klik-klik) untuk OT anak
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

// Ringkasan untuk daftar/preview asesmen OT.
function buildOtSummary(d: Data): string {
  const s =
    (typeof d.keluhan_utama === 'string' && d.keluhan_utama.trim()) ||
    (typeof d.case_name === 'string' && d.case_name.trim()) ||
    (typeof d.ringkasan_kasus === 'string' && d.ringkasan_kasus.trim()) ||
    (typeof d.kesimpulan_problematik === 'string' && d.kesimpulan_problematik.trim()) ||
    (typeof d.penampilan === 'string' && d.penampilan.trim()) ||
    ''
  return s ? s.slice(0, 160) : ''
}

async function saveOtAssessment(patientId: string, d: Data, discipline?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const summary = buildOtSummary(d)
    const res = await fetch('/api/terapis/assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patientId,
        data: { ...d, form_type: 'okupasi' },
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

/* ---------------- MODE CEPAT (form klik-klik OT) ---------------- */

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
    const r = await saveOtAssessment(patientId, { ...d, mode: 'cepat' }, discipline)
    if (!r.ok) { setError(r.error ?? 'Gagal menyimpan.'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  return (
    <div className="mb-4 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bold text-gray-900">
          <ClipboardList className="h-4 w-4 text-teal-600" /> Asesmen OT Cepat
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
          <CaseDropdown discipline={discipline} presets={OT_CASES}
            activeId={typeof d.case_template === 'string' ? d.case_template : undefined}
            currentData={d} onApply={pickCase} />
        </QuickSection>

        <QuickSection title="2. Keluhan Orang Tua / Rujukan">
          <QuickLineField label="Keluhan utama" value={(d.keluhan_utama as string) ?? ''} onChange={(v) => set('keluhan_utama', v)}
            placeholder="Contoh: Belum bisa bicara, sulit fokus, sering tantrum" />
        </QuickSection>

        <QuickSection title="3. Area Perkembangan Bermasalah" hint="Pilih semua ranah yang terganggu.">
          <ChipMultiAdd options={AREA_TAGS} value={(d.area_tags as string[]) ?? []} onChange={(v) => set('area_tags', v)} />
        </QuickSection>

        <QuickSection title="4. Tingkat Kemandirian (AKS)">
          <ChipSingle options={KEMANDIRIAN_OPTIONS} value={(d.kemandirian as string) ?? ''} onChange={(v) => set('kemandirian', v)} />
        </QuickSection>

        <QuickSection title="5. Kesimpulan Problematik OT" hint="Terisi dari kasus — koreksi seperlunya.">
          <QuickTextField label="Kesimpulan problematik" value={(d.kesimpulan_problematik as string) ?? ''} onChange={(v) => set('kesimpulan_problematik', v)} />
        </QuickSection>

        <QuickSection title="6. Rencana Intervensi OT">
          <ChipMultiAdd options={INTERVENSI_TAGS} value={(d.intervensi_tags as string[]) ?? []} onChange={(v) => set('intervensi_tags', v)} />
        </QuickSection>

        <QuickSection title="7. Home Program">
          <QuickTextField label="Program di rumah / edukasi orang tua" value={(d.home_program as string) ?? ''} onChange={(v) => set('home_program', v)}
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
    const r = await saveOtAssessment(patientId, { ...d, mode: 'lengkap' }, discipline)
    if (!r.ok) { setError(r.error ?? 'Gagal menyimpan.'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  return (
    <div className="mb-4 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold text-gray-900">
          <ClipboardList className="h-4 w-4 text-teal-600" /> Form Asesmen Okupasi Terapi
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

// Ringkasan mode cepat (ditampilkan bila ada field cepat OT).
function QuickSummary({ d }: { d: Data }) {
  const area = Array.isArray(d.area_tags) ? (d.area_tags as string[]) : []
  const intervensi = Array.isArray(d.intervensi_tags) ? (d.intervensi_tags as string[]) : []
  const caseName = typeof d.case_name === 'string' ? d.case_name : ''
  const keluhan = typeof d.keluhan_utama === 'string' ? d.keluhan_utama : ''
  const kemandirian = typeof d.kemandirian === 'string' ? d.kemandirian : ''
  const has = caseName || keluhan || kemandirian || area.length > 0 || intervensi.length > 0
  if (!has) return null
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-teal-700">Ringkasan</p>
      {caseName && <span className="inline-block rounded-full bg-teal-600 px-2.5 py-1 text-xs font-bold text-white">{caseName}</span>}
      {keluhan && (
        <div><p className="text-xs font-semibold text-gray-500">Keluhan Orang Tua</p><p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-800">{keluhan}</p></div>
      )}
      {area.length > 0 && (
        <div><p className="text-xs font-semibold text-gray-500">Area Bermasalah</p><QuickPills items={area} /></div>
      )}
      {kemandirian && (
        <div><p className="text-xs font-semibold text-gray-500">Tingkat Kemandirian (AKS)</p><p className="mt-0.5 text-sm font-medium text-gray-800">{kemandirian}</p></div>
      )}
      {intervensi.length > 0 && (
        <div><p className="text-xs font-semibold text-gray-500">Rencana Intervensi OT</p><QuickPills items={intervensi} /></div>
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

export function OkupasiAnamnesisModule({ patientId, items, readOnly = false, discipline }: { patientId: string; items: Assessment[]; readOnly?: boolean; discipline?: string }) {
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
          <ClipboardList className="h-4 w-4 text-teal-600" /> Asesmen Okupasi Terapi
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
              'Asesmen Okupasi Terapi'
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
