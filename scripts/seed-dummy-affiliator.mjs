// ============================================================
// Seed DATA DUMMY pasien fisioterapi — klinik "klinik-affiliator".
// Mengisi: identitas pasien, kunjungan (bookings) 1 bulan penuh, CPPT
// (session_notes S/O/A/P), home program, target terapi (treatment_goals),
// dan anamnesis terstruktur (assessments.data — SK Fisio).
//
// Jalankan:  node --env-file=.env.local scripts/seed-dummy-affiliator.mjs
// Idempoten: data dummy lama (ditandai notes '[DUMMY]') dihapus dulu (cascade).
// ============================================================
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CLINIC_ID = "c0fba03a-cf29-4e9c-8ee5-7e7c53408ef1"; // klinik-affiliator (fisioterapi)
const THERAPISTS = [
  "21e83814-f325-4d44-83ae-73cc6e4e5fbd", // Aff Terapis (aktif)
  "b5da5fae-d8cd-4d60-b658-52b031091047", // Coba (aktif)
];
const MARK = "[DUMMY]";

// ---------- util tanggal (UTC, anti rollover TZ) ----------
const TODAY = new Date();
const base = new Date(Date.UTC(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate()));
function dayStr(offset) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// ---------- bersihkan data dummy lama ----------
async function cleanup() {
  const { data: old } = await db.from("patients").select("id").eq("clinic_id", CLINIC_ID).like("notes", `${MARK}%`);
  const ids = (old ?? []).map((p) => p.id);
  if (ids.length === 0) return;
  // Hapus pasien → cascade ke bookings, session_notes, assessments, treatment_goals.
  const { error } = await db.from("patients").delete().in("id", ids);
  if (error) { console.error("Gagal cleanup:", error.message); process.exit(1); }
  console.log(`🧹 Hapus ${ids.length} pasien dummy lama (cascade).`);
}

// ---------- service types ----------
async function ensureServices() {
  const wanted = [
    { name: "Fisioterapi Umum", description: "Asesmen & terapi fisik umum", duration_min: 60, price: 120000 },
    { name: "Terapi Manual", description: "Mobilisasi & manipulasi manual", duration_min: 45, price: 150000 },
    { name: "Elektroterapi (TENS/US)", description: "TENS, Ultrasound, IR", duration_min: 30, price: 90000 },
  ];
  const { data: existing } = await db.from("service_types").select("id, name").eq("clinic_id", CLINIC_ID);
  const byName = new Map((existing ?? []).map((s) => [s.name, s.id]));
  const out = [];
  for (const w of wanted) {
    if (byName.has(w.name)) { out.push({ id: byName.get(w.name), ...w }); continue; }
    const { data, error } = await db.from("service_types").insert({ clinic_id: CLINIC_ID, ...w, is_active: true }).select("id").single();
    if (error) { console.error("Gagal service_type:", error.message); process.exit(1); }
    out.push({ id: data.id, ...w });
  }
  console.log(`🧾 Service types siap: ${out.length}`);
  return out;
}

// ---------- anamnesis builder (SK Fisio) ----------
function makeAnamnesis(o) {
  return {
    keluhan_utama: o.keluhan_utama,
    rps: o.rps,
    rpd: o.rpd ?? "Tidak ada riwayat penyakit serupa sebelumnya.",
    rpp: o.rpp ?? "Tidak ada penyakit penyerta.",
    rpk: o.rpk ?? "Tidak ada riwayat penyakit serupa di keluarga.",
    anamnesis_sistem: o.anamnesis_sistem ?? [
      { sistem: "Kepala & Leher", keterangan: "Tidak ada keluhan" },
      { sistem: "Kardiovaskular", keterangan: "Tidak ada keluhan" },
      { sistem: "Respirasi", keterangan: "Tidak ada keluhan" },
      { sistem: "Muskuloskeletal", keterangan: o.sistem_msk ?? "Lihat keluhan utama" },
    ],
    ttv: o.ttv ?? { tekanan_darah: "120/80 mmHg", denyut_nadi: "78 x/menit", suhu: "36.6 °C", pernafasan: "18 x/menit", tinggi_badan: "165 cm", berat_badan: "62 kg" },
    inspeksi: o.inspeksi ?? "Statis: postur dalam batas normal. Dinamis: pola gerak terbatas pada area keluhan.",
    palpasi: o.palpasi ?? "Spasme otot (+), nyeri tekan (+) pada area keluhan, suhu lokal normal.",
    perkusi: o.perkusi ?? "Tidak dilakukan.",
    gerak_aktif: o.gerak_aktif ?? [],
    gerak_pasif: o.gerak_pasif ?? [],
    isometrik: o.isometrik ?? [],
    kognitif: o.kognitif ?? "Baik, orientasi penuh.",
    intrapersonal: o.intrapersonal ?? "Motivasi sembuh tinggi.",
    interpersonal: o.interpersonal ?? "Komunikasi & kooperatif baik.",
    kemampuan_fungsional: o.kemampuan_fungsional ?? "Aktivitas sehari-hari sebagian terganggu akibat keluhan.",
    nyeri_diam: o.nyeri_diam ?? "2/10",
    nyeri_tekan: o.nyeri_tekan ?? "4/10",
    nyeri_gerak: o.nyeri_gerak ?? "6/10",
    antropometri: o.antropometri ?? [],
    lgs: o.lgs ?? "Terbatas pada gerakan ke arah nyeri.",
    mmt: o.mmt ?? "Kekuatan otot area keluhan: 4/5.",
    impairment: o.impairment ?? "Nyeri, keterbatasan LGS, penurunan kekuatan otot.",
    fungsional_limitation: o.fungsional_limitation ?? "Kesulitan melakukan aktivitas fungsional tertentu.",
    disability: o.disability ?? "Pembatasan sementara pada aktivitas pekerjaan/sosial.",
    tujuan_jangka_pendek: o.tujuan_jangka_pendek ?? "Mengurangi nyeri & spasme otot.",
    tujuan_jangka_panjang: o.tujuan_jangka_panjang ?? "Mengembalikan fungsi & aktivitas normal.",
    teknologi_ft: o.teknologi_ft ?? "TENS, Ultrasound, terapi latihan.",
    edukasi: o.edukasi ?? "Edukasi posisi/ergonomi & home program.",
    rencana_evaluasi: o.rencana_evaluasi ?? "Evaluasi nyeri (VDS), LGS, dan kekuatan otot tiap kunjungan.",
  };
}

// ---------- definisi pasien ----------
const PATIENTS = [
  {
    full_name: "Budi Santoso", gender: "L", birth_date: "1985-04-12", phone: "081200010001",
    diagnosis: "Low Back Pain ec HNP Lumbal L4-L5", allergies: "Tidak ada", special_alert: null,
    region: "pinggang", baseHour: "08:00", step: 3,
    anamnesis: {
      keluhan_utama: "Nyeri pinggang bawah menjalar ke tungkai kanan sejak 3 minggu lalu.",
      rps: "Nyeri muncul setelah mengangkat beban berat, memberat saat membungkuk & duduk lama.",
      rpd: "Pernah nyeri pinggang ringan 1 tahun lalu, sembuh sendiri.",
      sistem_msk: "Nyeri lumbal menjalar dermatom L5 kanan, spasme paravertebra.",
      gerak_aktif: [
        { bidang_gerak: "Fleksi trunk", full_rom: "Tidak", nyeri: "Ya", bisa_dilakukan: "Terbatas" },
        { bidang_gerak: "Ekstensi trunk", full_rom: "Tidak", nyeri: "Ya", bisa_dilakukan: "Terbatas" },
      ],
      gerak_pasif: [
        { bidang_gerak: "SLR kanan", full_rom: "Tidak", nyeri: "Ya", bisa_dilakukan: "Terbatas", end_feel: "Firm (nyeri)" },
      ],
      lgs: "Fleksi lumbal terbatas 50% disertai nyeri.",
      impairment: "Nyeri lumbal, spasme otot paravertebra, keterbatasan LGS lumbal.",
      fungsional_limitation: "Kesulitan membungkuk, duduk & berdiri lama.",
    },
    goals: [
      { description: "Nyeri pinggang turun dari 6/10 menjadi ≤3/10 dalam 2 minggu", status: "achieved" },
      { description: "Mampu duduk 30 menit tanpa nyeri", status: "in_progress" },
      { description: "Kembali bekerja normal tanpa keluhan", status: "in_progress" },
    ],
    cppt: {
      s: "Pasien mengeluh nyeri pinggang menjalar ke tungkai kanan.",
      o: "Spasme paravertebra (+), SLR kanan positif, nyeri gerak fleksi lumbal.",
      a: "LBP ec HNP lumbal, nyeri & keterbatasan LGS.",
      p: "TENS 15', US, William flexion exercise, core stability.",
      hp: "Pelvic tilt 3x10, knee to chest 3x10, hindari mengangkat beban berat.",
    },
  },
  {
    full_name: "Siti Aminah", gender: "P", birth_date: "1990-09-30", phone: "081200010002",
    diagnosis: "Frozen Shoulder (Adhesive Capsulitis) Dextra", allergies: "Tidak ada", special_alert: null,
    region: "bahu kanan", baseHour: "09:00", step: 4,
    anamnesis: {
      keluhan_utama: "Bahu kanan kaku & nyeri, sulit diangkat sejak 1 bulan.",
      rps: "Kekakuan bertambah perlahan, terutama saat menyisir & mengambil benda di atas.",
      sistem_msk: "Keterbatasan LGS bahu kanan ke segala arah, capsular pattern.",
      gerak_aktif: [
        { bidang_gerak: "Abduksi bahu kanan", full_rom: "Tidak", nyeri: "Ya", bisa_dilakukan: "Terbatas" },
        { bidang_gerak: "Eksorotasi bahu kanan", full_rom: "Tidak", nyeri: "Ya", bisa_dilakukan: "Terbatas" },
      ],
      gerak_pasif: [
        { bidang_gerak: "Abduksi bahu kanan", full_rom: "Tidak", nyeri: "Ya", bisa_dilakukan: "Terbatas", end_feel: "Hard capsular" },
      ],
      antropometri: [],
      lgs: "Abduksi bahu kanan ±90° (capsular pattern).",
      impairment: "Nyeri & kekakuan bahu, keterbatasan LGS bahu.",
      fungsional_limitation: "Sulit menyisir, memakai baju, menjangkau ke atas.",
    },
    goals: [
      { description: "Tingkatkan abduksi bahu kanan ke >120°", status: "in_progress" },
      { description: "Nyeri bahu turun menjadi ≤2/10", status: "in_progress" },
      { description: "Mampu menyisir rambut mandiri", status: "achieved" },
    ],
    cppt: {
      s: "Bahu kanan masih kaku, nyeri saat menjangkau ke atas.",
      o: "LGS abduksi 90°, eksorotasi terbatas, nyeri end range.",
      a: "Frozen shoulder dextra fase frozen.",
      p: "US, mobilisasi sendi grade III, codman & wall climbing exercise.",
      hp: "Codman pendulum 3x10, wall climbing 3x, kompres hangat 10 menit.",
    },
  },
  {
    full_name: "Andi Wijaya", gender: "L", birth_date: "1978-01-22", phone: "081200010003",
    diagnosis: "Osteoarthritis Genu Bilateral", allergies: "Tidak ada", special_alert: "Riwayat hipertensi terkontrol",
    region: "lutut", baseHour: "10:00", step: 3,
    anamnesis: {
      keluhan_utama: "Nyeri kedua lutut saat berjalan & naik tangga sejak 2 bulan.",
      rps: "Nyeri bertambah saat aktivitas, kaku pagi hari <30 menit, kadang krepitasi.",
      rpp: "Hipertensi terkontrol dengan obat.",
      sistem_msk: "Krepitasi genu bilateral, nyeri gerak fleksi penuh.",
      gerak_aktif: [
        { bidang_gerak: "Fleksi knee kanan", full_rom: "Tidak", nyeri: "Ya", bisa_dilakukan: "Terbatas" },
        { bidang_gerak: "Fleksi knee kiri", full_rom: "Tidak", nyeri: "Ya", bisa_dilakukan: "Terbatas" },
      ],
      antropometri: [
        { ukuran: "Lingkar 10cm proks patella", dekstra: "42 cm", sinistra: "41.5 cm", selisih: "0.5 cm" },
      ],
      mmt: "Quadriceps 4/5 bilateral.",
      lgs: "Fleksi knee 0–110° disertai nyeri end range.",
      impairment: "Nyeri genu, penurunan kekuatan quadriceps, keterbatasan LGS.",
      fungsional_limitation: "Kesulitan naik-turun tangga & jongkok.",
    },
    goals: [
      { description: "Kuatkan quadriceps menjadi 5/5", status: "in_progress" },
      { description: "Nyeri lutut saat naik tangga ≤3/10", status: "in_progress" },
    ],
    cppt: {
      s: "Nyeri kedua lutut saat naik tangga.",
      o: "Krepitasi (+), nyeri gerak fleksi, kekuatan quadriceps 4/5.",
      a: "OA genu bilateral grade II.",
      p: "TENS, US, quadriceps strengthening, SLR exercise.",
      hp: "Quad set 3x10, SLR 3x10, hindari jongkok dalam.",
    },
  },
  {
    full_name: "Dewi Lestari", gender: "P", birth_date: "1995-06-18", phone: "081200010004",
    diagnosis: "Cervical Root Syndrome C5-C6", allergies: "Seafood", special_alert: null,
    region: "leher", baseHour: "11:00", step: 4,
    anamnesis: {
      keluhan_utama: "Nyeri leher menjalar ke lengan kanan disertai kesemutan.",
      rps: "Muncul setelah lama bekerja menunduk di depan komputer.",
      sistem_msk: "Spasme upper trapezius, parestesia dermatom C6.",
      gerak_aktif: [
        { bidang_gerak: "Rotasi cervical kanan", full_rom: "Tidak", nyeri: "Ya", bisa_dilakukan: "Terbatas" },
        { bidang_gerak: "Lateral fleksi kiri", full_rom: "Tidak", nyeri: "Ya", bisa_dilakukan: "Terbatas" },
      ],
      lgs: "Rotasi cervical kanan terbatas disertai nyeri.",
      impairment: "Nyeri cervical, spasme, parestesia lengan kanan.",
      fungsional_limitation: "Sulit bekerja di depan komputer lama.",
    },
    goals: [
      { description: "Hilangkan kesemutan lengan kanan", status: "in_progress" },
      { description: "Perbaiki postur kerja & ergonomi", status: "achieved" },
    ],
    cppt: {
      s: "Nyeri leher menjalar ke lengan kanan, kesemutan berkurang.",
      o: "Spasme upper trapezius, rotasi cervical terbatas, Spurling (+) ringan.",
      a: "Cervical root syndrome C5-C6.",
      p: "TENS, traksi cervical, McKenzie cervical, koreksi postur.",
      hp: "Chin tuck 3x10, peregangan upper trapezius, atur tinggi monitor.",
    },
  },
  {
    full_name: "Rizki Pratama", gender: "L", birth_date: "2001-11-05", phone: "081200010005",
    diagnosis: "Post ACL Reconstruction Knee Sinistra", allergies: "Tidak ada", special_alert: "Pasca operasi minggu ke-4",
    region: "lutut kiri", baseHour: "13:00", step: 3,
    anamnesis: {
      keluhan_utama: "Lutut kiri kaku & lemah pasca operasi rekonstruksi ACL.",
      rps: "Operasi 4 minggu lalu akibat cedera olahraga, kini program rehabilitasi.",
      sistem_msk: "Edema ringan lutut kiri, keterbatasan fleksi, kelemahan quadriceps.",
      gerak_aktif: [
        { bidang_gerak: "Fleksi knee kiri", full_rom: "Tidak", nyeri: "Ringan", bisa_dilakukan: "Terbatas" },
        { bidang_gerak: "Ekstensi knee kiri", full_rom: "Ya", nyeri: "Tidak", bisa_dilakukan: "Bisa" },
      ],
      antropometri: [
        { ukuran: "Lingkar mid patella", dekstra: "38 cm", sinistra: "39.5 cm", selisih: "1.5 cm (edema)" },
      ],
      mmt: "Quadriceps kiri 3+/5.",
      lgs: "Fleksi knee kiri 0–95°.",
      impairment: "Edema, kelemahan quadriceps, keterbatasan LGS knee.",
      fungsional_limitation: "Belum mampu jongkok & berlari.",
    },
    goals: [
      { description: "Capai fleksi knee kiri penuh (0–135°)", status: "in_progress" },
      { description: "Kekuatan quadriceps kiri 5/5", status: "in_progress" },
      { description: "Kurangi edema lutut kiri", status: "achieved" },
    ],
    cppt: {
      s: "Lutut kiri membaik, fleksi bertambah, edema berkurang.",
      o: "ROM fleksi 95°, quadriceps 3+/5, edema minimal.",
      a: "Post ACL recon minggu ke-4, progress baik.",
      p: "Cryotherapy, CKC exercise, quadriceps strengthening, ROM.",
      hp: "Heel slide 3x10, quad set 3x15, elevasi tungkai saat istirahat.",
    },
  },
  {
    full_name: "Nur Halimah", gender: "P", birth_date: "1968-03-08", phone: "081200010006",
    diagnosis: "Stroke Non-Hemoragik, Hemiparese Dextra", allergies: "Tidak ada", special_alert: "Riwayat hipertensi, pantau tekanan darah",
    region: "sisi kanan tubuh", baseHour: "14:00", step: 3,
    anamnesis: {
      keluhan_utama: "Kelemahan anggota gerak kanan setelah stroke 6 minggu lalu.",
      rps: "Onset mendadak, kini menjalani fisioterapi untuk pemulihan gerak.",
      rpp: "Hipertensi.",
      sistem_msk: "Kelemahan ekstremitas kanan, tonus meningkat ringan.",
      gerak_aktif: [
        { bidang_gerak: "Fleksi shoulder kanan", full_rom: "Tidak", nyeri: "Tidak", bisa_dilakukan: "Terbatas" },
        { bidang_gerak: "Dorsofleksi ankle kanan", full_rom: "Tidak", nyeri: "Tidak", bisa_dilakukan: "Terbatas" },
      ],
      mmt: "Ekstremitas kanan 3/5.",
      kognitif: "Orientasi baik, komunikasi sedikit melambat.",
      lgs: "LGS pasif penuh, aktif terbatas akibat kelemahan.",
      impairment: "Kelemahan motorik sisi kanan, gangguan keseimbangan.",
      fungsional_limitation: "Berjalan & menggenggam masih terbatas.",
      tujuan_jangka_panjang: "Mandiri dalam aktivitas sehari-hari & berjalan aman.",
    },
    goals: [
      { description: "Tingkatkan kekuatan ekstremitas kanan ke 4/5", status: "in_progress" },
      { description: "Mampu berjalan dengan bantuan minimal", status: "in_progress" },
      { description: "Perbaiki keseimbangan duduk-berdiri", status: "achieved" },
    ],
    cppt: {
      s: "Keluarga melaporkan tangan kanan mulai bisa menggenggam ringan.",
      o: "Kekuatan ekstremitas kanan 3/5, tonus sedikit meningkat, keseimbangan duduk baik.",
      a: "Hemiparese dextra post stroke, perbaikan bertahap.",
      p: "NDT/Bobath, latihan keseimbangan, gait training, PROM/AROM.",
      hp: "Latihan menggenggam bola, AROM bahu-siku, latihan berdiri pegangan.",
    },
  },
  {
    full_name: "Joko Susilo", gender: "L", birth_date: "1982-07-14", phone: "081200010007",
    diagnosis: "Carpal Tunnel Syndrome Dextra", allergies: "Tidak ada", special_alert: null,
    region: "pergelangan tangan", baseHour: "15:00", step: 4,
    anamnesis: {
      keluhan_utama: "Kesemutan & baal pada jari 1-3 tangan kanan, memberat malam hari.",
      rps: "Keluhan muncul setelah pekerjaan berulang menggunakan tangan.",
      sistem_msk: "Parestesia distribusi nervus medianus kanan, Phalen (+).",
      gerak_aktif: [
        { bidang_gerak: "Fleksi wrist kanan", full_rom: "Ya", nyeri: "Ringan", bisa_dilakukan: "Bisa" },
      ],
      lgs: "LGS wrist penuh, provokasi parestesia saat fleksi maksimal.",
      impairment: "Parestesia & penurunan sensasi jari, nyeri ringan.",
      fungsional_limitation: "Sulit menggenggam erat & pekerjaan halus.",
    },
    goals: [
      { description: "Kurangi kesemutan & baal jari tangan kanan", status: "in_progress" },
      { description: "Tingkatkan kekuatan genggaman", status: "in_progress" },
    ],
    cppt: {
      s: "Kesemutan jari tangan kanan berkurang, malam lebih nyaman.",
      o: "Phalen (+) melemah, Tinel (+) ringan, kekuatan genggam membaik.",
      a: "CTS dextra ringan-sedang.",
      p: "US, nerve & tendon gliding exercise, edukasi splint malam.",
      hp: "Median nerve gliding 3x10, tendon gliding, pakai wrist splint saat tidur.",
    },
  },
  {
    full_name: "Maya Sari", gender: "P", birth_date: "1988-12-02", phone: "081200010008",
    diagnosis: "Plantar Fasciitis Sinistra", allergies: "Tidak ada", special_alert: null,
    region: "telapak kaki kiri", baseHour: "16:00", step: 4,
    anamnesis: {
      keluhan_utama: "Nyeri tumit kiri terutama langkah pertama pagi hari.",
      rps: "Nyeri memberat saat berdiri/berjalan lama, membaik dengan istirahat.",
      sistem_msk: "Nyeri tekan tuberositas calcaneus, tightness gastrocnemius.",
      gerak_aktif: [
        { bidang_gerak: "Dorsofleksi ankle kiri", full_rom: "Tidak", nyeri: "Ya", bisa_dilakukan: "Terbatas" },
      ],
      lgs: "Dorsofleksi ankle kiri terbatas akibat tightness.",
      impairment: "Nyeri tumit, tightness plantar fascia & gastrocnemius.",
      fungsional_limitation: "Nyeri saat berjalan & berdiri lama.",
    },
    goals: [
      { description: "Nyeri tumit langkah pertama ≤2/10", status: "in_progress" },
      { description: "Tingkatkan fleksibilitas plantar fascia", status: "achieved" },
    ],
    cppt: {
      s: "Nyeri tumit pagi hari berkurang dibanding sebelumnya.",
      o: "Nyeri tekan calcaneus (+) berkurang, windlass test (+) ringan.",
      a: "Plantar fasciitis sinistra.",
      p: "US, stretching plantar fascia & gastrocnemius, ice massage.",
      hp: "Stretching plantar fascia 3x30 detik, calf stretch, ice bottle roll.",
    },
  },
];

// ---------- generator kunjungan ----------
// Buat hingga ~8 kunjungan tersebar 1 bulan; visit terakhir today/upcoming.
function buildVisits(p, idx) {
  const visits = [];
  let off = -28 + (idx % 4); // mulai stagger antar pasien
  for (let k = 0; k < 8; k++) {
    if (off > 6) break;
    visits.push(off);
    off += p.step;
  }
  // Pastikan ada sesi "hari ini" / "akan datang" agar dashboard ramai.
  if (idx % 3 === 0 && !visits.includes(0)) visits.push(0);          // in_progress hari ini
  else if (idx % 3 === 1 && !visits.some((v) => v > 0)) visits.push(2); // confirmed upcoming
  return [...new Set(visits)].sort((a, b) => a - b);
}

function statusFor(off) {
  if (off < 0) return "completed";
  if (off === 0) return "in_progress";
  return "confirmed";
}

let codeSeq = 1;
function nextCode() { return `DUM-${String(Date.now()).slice(-6)}-${codeSeq++}`; }

// ---------- main ----------
await cleanup();
const services = await ensureServices();

let totPatients = 0, totBookings = 0, totNotes = 0, totGoals = 0, totAssess = 0;

for (let i = 0; i < PATIENTS.length; i++) {
  const p = PATIENTS[i];
  const therapistId = THERAPISTS[i % THERAPISTS.length];
  const svc = services[i % services.length];

  // 1) IDENTITAS
  const { data: patient, error: pErr } = await db.from("patients").insert({
    clinic_id: CLINIC_ID,
    full_name: p.full_name,
    phone: p.phone,
    gender: p.gender,
    birth_date: p.birth_date,
    diagnosis: p.diagnosis,
    allergies: p.allergies,
    special_alert: p.special_alert,
    guardian_name: null,
    session_package: 12,
    source: "manual_admin",
    notes: `${MARK} data uji coba fisioterapi`,
  }).select("id, medical_record_no").single();
  if (pErr) { console.error(`Gagal pasien ${p.full_name}:`, pErr.message); continue; }
  totPatients++;

  // 2) ANAMNESIS (assessments.data)
  const { error: aErr } = await db.from("assessments").insert({
    clinic_id: CLINIC_ID,
    patient_id: patient.id,
    therapist_id: therapistId,
    data: makeAnamnesis(p.anamnesis),
    chief_complaint: p.anamnesis.keluhan_utama,
  });
  if (!aErr) totAssess++;
  else console.error(`  anamnesis ${p.full_name}:`, aErr.message);

  // 3) TARGET TERAPI
  for (const g of p.goals) {
    const { error } = await db.from("treatment_goals").insert({
      clinic_id: CLINIC_ID, patient_id: patient.id, therapist_id: therapistId,
      description: g.description, status: g.status,
      achieved_at: g.status === "achieved" ? new Date().toISOString() : null,
    });
    if (!error) totGoals++;
  }

  // 4) KUNJUNGAN + CPPT + HOME PROGRAM
  const offsets = buildVisits(p, i);
  for (let v = 0; v < offsets.length; v++) {
    const off = offsets[v];
    const status = statusFor(off);
    const isDone = status === "completed";
    const nextOff = offsets[v + 1];

    const { data: booking, error: bErr } = await db.from("bookings").insert({
      clinic_id: CLINIC_ID,
      booking_code: nextCode(),
      patient_id: patient.id,
      therapist_id: therapistId,
      service_type_id: svc.id,
      session_date: dayStr(off),
      session_time: p.baseHour,
      duration_min: svc.duration_min,
      status,
      amount: svc.price,
      payment_status: isDone ? "paid" : "unpaid",
      payment_method: isDone ? "cash" : null,
      notes_patient: v === 0 ? p.anamnesis.keluhan_utama : null,
      created_by_role: "admin",
    }).select("id").single();
    if (bErr) { console.error(`  booking ${p.full_name} @${dayStr(off)}:`, bErr.message); continue; }
    totBookings++;

    // CPPT untuk sesi completed & in_progress (sesi aktif sudah ada catatan awal).
    if (isDone || status === "in_progress") {
      const visitNo = v + 1;
      const painStart = 6, pain = Math.max(2, painStart - v); // nyeri menurun tiap kunjungan
      const { error: nErr } = await db.from("session_notes").insert({
        clinic_id: CLINIC_ID,
        booking_id: booking.id,
        therapist_id: therapistId,
        patient_id: patient.id,
        subjective: `Kunjungan ke-${visitNo}. ${p.cppt.s}`,
        objective: `${p.cppt.o} Skala nyeri (VDS) gerak ${pain}/10.`,
        assessment: p.cppt.a,
        plan: p.cppt.p,
        home_program: (v % 2 === 0 || status === "in_progress") ? p.cppt.hp : null,
        next_session: nextOff !== undefined ? dayStr(nextOff) : null,
      });
      if (!nErr) totNotes++;
      else console.error(`  cppt ${p.full_name} v${visitNo}:`, nErr.message);
    }
  }
  console.log(`✅ ${p.full_name} (${patient.medical_record_no}) — ${offsets.length} kunjungan`);
}

console.log("\n=========== RINGKASAN ===========");
console.log(`Pasien      : ${totPatients}`);
console.log(`Kunjungan   : ${totBookings}`);
console.log(`CPPT        : ${totNotes}`);
console.log(`Target      : ${totGoals}`);
console.log(`Anamnesis   : ${totAssess}`);
console.log("Klinik      : klinik-affiliator (fisioterapi)");
console.log("Selesai. Jalankan lagi = data dummy lama diganti (idempoten).");
