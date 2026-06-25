// Buat bucket Storage yang dibutuhkan aplikasi (idempoten).
// Jalankan: node --env-file=.env.local scripts/seed-storage.mjs
//
// - clinic-public : PUBLIC. Logo, foto galeri, foto profil terapis, tanda tangan.
//   Path selalu diawali {clinic_id}/ untuk isolasi antar klinik (CLAUDE.md §8).
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum di-set.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const buckets = [
  {
    name: "clinic-public",
    options: {
      public: true,
      fileSizeLimit: 2 * 1024 * 1024, // 2MB (selaras MAX_FILE_SIZE)
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
  },
];

for (const b of buckets) {
  const { error } = await db.storage.createBucket(b.name, b.options);
  if (error) {
    if (/already exists|exists/i.test(error.message)) {
      // Sudah ada → pastikan setelan publik & limit benar.
      const upd = await db.storage.updateBucket(b.name, b.options);
      console.log(`= ${b.name}: sudah ada${upd.error ? " (update gagal: " + upd.error.message + ")" : " (disinkronkan)"}`);
    } else {
      console.log(`x ${b.name}: ERROR ${error.message}`);
    }
  } else {
    console.log(`+ ${b.name}: dibuat (public)`);
  }
}

const { data } = await db.storage.listBuckets();
console.log("Bucket sekarang:", JSON.stringify((data ?? []).map((x) => ({ name: x.name, public: x.public }))));
