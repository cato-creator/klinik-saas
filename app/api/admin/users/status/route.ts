import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiSuperAdmin } from "@/lib/admin/api-guard";
import { writeAudit } from "@/lib/audit";

// Super admin aktifkan / nonaktifkan akun user klinik. Nonaktif = status 'inactive'
// + ban login di auth; aktif = 'active' + buka ban. Tidak berlaku untuk super_admin.
const schema = z.object({
  user_id: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
});

export async function POST(request: NextRequest) {
  const auth = await apiSuperAdmin();
  if (!auth.ok) return auth.res;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Body tidak valid" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  const { user_id, status } = parsed.data;

  const db = createAdminClient();
  const { data: target } = await db
    .from("users")
    .select("id, role, clinic_id")
    .eq("id", user_id)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  if (target.role === "super_admin") {
    return NextResponse.json({ error: "Tidak boleh menonaktifkan super admin." }, { status: 403 });
  }

  const { error } = await db.from("users").update({ status }).eq("id", user_id);
  if (error) return NextResponse.json({ error: `Gagal: ${error.message}` }, { status: 500 });

  // Sinkronkan kemampuan login di auth.
  await db.auth.admin.updateUserById(user_id, {
    ban_duration: status === "inactive" ? "876000h" : "none",
  });

  await writeAudit({
    actorUserId: auth.userId,
    actorRole: "super_admin",
    clinicId: (target.clinic_id as string) ?? null,
    action: status === "inactive" ? "user.deactivate" : "user.activate",
    entityType: "user",
    entityId: user_id,
    metadata: { role: target.role },
  });

  return NextResponse.json({ ok: true });
}
