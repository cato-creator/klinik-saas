// Guard untuk Route Handlers super admin (API). Mirip apiTenant, tapi khusus
// role 'super_admin' (clinic_id = null). Mengembalikan userId atau response 4xx.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type ApiSuperAdmin =
  | { ok: true; userId: string }
  | { ok: false; res: NextResponse };

export async function apiSuperAdmin(): Promise<ApiSuperAdmin> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    return { ok: false, res: NextResponse.json({ error: "Akses ditolak" }, { status: 403 }) };
  }

  return { ok: true, userId: user.id };
}
