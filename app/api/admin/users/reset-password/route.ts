import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiSuperAdmin } from "@/lib/admin/api-guard";
import { genTempPassword } from "@/lib/admin/temp-password";
import { writeAudit } from "@/lib/audit";

// Super admin reset password user klinik (owner/admin/terapis/affiliate/pasien).
// Tidak boleh me-reset sesama super_admin (hindari abuse/lockout). Password
// sementara dikembalikan SEKALI untuk disampaikan manual ke user.
const schema = z.object({ user_id: z.string().uuid() });

export async function POST(request: NextRequest) {
  const auth = await apiSuperAdmin();
  if (!auth.ok) return auth.res;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Body tidak valid" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  const db = createAdminClient();
  const { data: target } = await db
    .from("users")
    .select("id, role, clinic_id, full_name")
    .eq("id", parsed.data.user_id)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  if (target.role === "super_admin") {
    return NextResponse.json({ error: "Tidak boleh mereset password super admin lain." }, { status: 403 });
  }

  const password = genTempPassword();
  const { error } = await db.auth.admin.updateUserById(target.id as string, { password });
  if (error) return NextResponse.json({ error: `Gagal reset: ${error.message}` }, { status: 500 });

  await writeAudit({
    actorUserId: auth.userId,
    actorRole: "super_admin",
    clinicId: (target.clinic_id as string) ?? null,
    action: "user.reset_password",
    entityType: "user",
    entityId: target.id as string,
    metadata: { role: target.role },
  });

  return NextResponse.json({ password });
}
