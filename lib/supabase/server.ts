// Supabase client untuk SERVER (Server Components, Server Actions, Route Handlers).
// - createClient(): anon key + sesi user dari cookie. Tetap tunduk pada RLS.
// - createServiceClient(): SERVICE ROLE (bypass RLS). HANYA di server, untuk
//   operasi terkontrol (guest booking, generate invoice/komisi, dsb).
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Bersihkan BOM (U+FEFF) & whitespace yang kadang menempel pada env var
// (mis. saat di-set di dashboard host). BOM pada apikey memicu
// "Cannot convert argument to a ByteString".
const BOM = String.fromCharCode(0xfeff);
function cleanEnv(value?: string): string {
  return (value ?? "").split(BOM).join("").trim();
}

const SUPABASE_URL = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_ANON_KEY = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const SUPABASE_SERVICE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Dipanggil dari Server Component (read-only cookies) — aman diabaikan
          // selama refresh sesi ditangani di middleware.
        }
      },
    },
  });
}

// Service role client — HANYA untuk server (API routes / server actions).
// Mem-bypass RLS, jadi WAJIB selalu memfilter clinic_id secara manual.
export function createServiceClient() {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum di-set (server-only).",
    );
  }
  return createServerClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}
