// Supabase client untuk project CONTROL-PLANE (terpisah dari project membership).
// Pakai SERVICE ROLE → mem-bypass RLS. HANYA dipakai di server (Server Action /
// Route Handler), TIDAK PERNAH di client. Auth super admin tetap di project
// membership (cookies); project ini diakses murni server-side via service role.
import { createClient } from "@supabase/supabase-js";

const BOM = String.fromCharCode(0xfeff);
function cleanEnv(value?: string): string {
  return (value ?? "").split(BOM).join("").trim();
}

export function createControlPlaneClient() {
  const url = cleanEnv(process.env.CONTROLPLANE_SUPABASE_URL);
  const serviceKey = cleanEnv(process.env.CONTROLPLANE_SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceKey) {
    throw new Error(
      "CONTROLPLANE_SUPABASE_URL / CONTROLPLANE_SUPABASE_SERVICE_ROLE_KEY belum di-set (server-only).",
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Deteksi tabel control-plane belum ada (migrasi 0001 belum dijalankan).
export function isControlPlaneMissing(message?: string | null): boolean {
  return /relation .* does not exist|could not find the table|schema cache/i.test(message ?? "");
}
