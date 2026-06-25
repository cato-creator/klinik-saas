// Supabase ADMIN client — SERVICE ROLE (mem-bypass RLS).
// HANYA boleh dipakai di server (Route Handler / Server Action), TIDAK PERNAH di client.
// Dipakai untuk operasi terkontrol: guest booking, affiliator tambah klinik,
// generate komisi, tulis audit log, seed. Lihat CLAUDE.md §5 & §9.4.
//
// CATATAN: jangan pernah memberi prefix NEXT_PUBLIC_ pada service role key.
import { createClient } from "@supabase/supabase-js";

// Bersihkan BOM (U+FEFF) & whitespace/newline yang bisa menempel saat env di-set
// (mis. `wrangler secret put` via pipe menambah newline) — newline/spasi pada
// apikey menyebabkan "Invalid API key".
const BOM = String.fromCharCode(0xfeff);
function cleanEnv(value?: string): string {
  return (value ?? "").split(BOM).join("").trim();
}

export function createAdminClient() {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL belum di-set (server-only).",
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
