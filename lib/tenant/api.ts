// Guard untuk Route Handlers tenant (API). Mengembalikan konteks tenant
// (userId, clinicId, role) atau response error siap-kirim.
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { TenantRole } from "@/lib/tenant/auth";

export type ApiTenant =
  | { ok: true; userId: string; clinicId: string; role: TenantRole }
  | { ok: false; res: NextResponse };

export async function apiTenant(allowed: TenantRole[]): Promise<ApiTenant> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("clinic_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !allowed.includes(profile.role as TenantRole)) {
    return { ok: false, res: NextResponse.json({ error: "Akses ditolak" }, { status: 403 }) };
  }
  if (!profile.clinic_id) {
    return { ok: false, res: NextResponse.json({ error: "Klinik tidak ditemukan" }, { status: 403 }) };
  }

  return {
    ok: true,
    userId: user.id,
    clinicId: profile.clinic_id as string,
    role: profile.role as TenantRole,
  };
}

export type ApiTherapist =
  | {
      ok: true;
      db: SupabaseClient;
      therapistId: string | null;
      therapistDiscipline: string | null;
      clinicId: string;
      role: TenantRole;
      userId: string;
    }
  | { ok: false; res: NextResponse };

// Guard khusus modul rekam medis: izinkan therapist/admin/owner, sediakan
// service client + therapistId (baris therapists milik user, bila ada).
export async function apiTherapist(): Promise<ApiTherapist> {
  const auth = await apiTenant(["therapist", "admin", "owner"]);
  if (!auth.ok) return auth;

  const db = createServiceClient();
  const { data: therapist } = await db
    .from("therapists")
    .select("id, discipline")
    .eq("user_id", auth.userId)
    .eq("clinic_id", auth.clinicId)
    .maybeSingle();

  return {
    ok: true,
    db,
    therapistId: therapist?.id ?? null,
    therapistDiscipline: (therapist?.discipline as string | null) ?? null,
    clinicId: auth.clinicId,
    role: auth.role,
    userId: auth.userId,
  };
}
