// Supabase client untuk komponen CLIENT (browser).
// Memakai anon key — aman di-bundle ke browser, semua akses dibatasi RLS.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
