// Route Handler: affiliator menambah klinik baru (klinik + akun owner).
// Dilakukan via service role (validasi server-side), klinik dibuat dengan
// status 'pending_approval' & affiliate_id = affiliator yang menambahkan.
// Super admin tetap yang approve + assign subdomain + set plan (CLAUDE.md §3.6).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiAffiliate } from "@/lib/affiliate/guard";
import { writeAudit } from "@/lib/audit";
import { sanitizeSpecializations, DEFAULT_DISCIPLINE } from "@/lib/disciplines";

const schema = z.object({
  name: z.string().trim().min(3, "Nama klinik minimal 3 karakter.").max(120),
  // Tipe utama (template landing) + daftar layanan. Divalidasi lewat registry.
  clinic_type: z.string().trim().optional(),
  specializations: z.array(z.string()).optional().default([]),
  address: z.string().trim().max(300).optional().default(""),
  phone_number: z.string().trim().max(40).optional().default(""),
  owner_name: z.string().trim().min(3, "Nama owner minimal 3 karakter.").max(120),
  owner_email: z.string().trim().toLowerCase().email("Email owner tidak valid."),
  owner_password: z.string().min(8, "Password owner minimal 8 karakter.").max(72),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await apiAffiliate();
    if (!auth.ok) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }
    if (auth.status !== "active") {
      return NextResponse.json(
        { error: "Akun affiliator Anda nonaktif. Hubungi admin platform." },
        { status: 403 },
      );
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Data tidak valid.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const d = parsed.data;

    const specializations = sanitizeSpecializations(d.specializations);
    if (specializations.length === 0) {
      return NextResponse.json({ error: "Pilih minimal satu layanan klinik." }, { status: 400 });
    }
    const clinicType =
      (d.clinic_type && specializations.includes(d.clinic_type) && d.clinic_type) ||
      specializations[0] ||
      DEFAULT_DISCIPLINE;

    const admin = createAdminClient();

    // 1) Buat klinik (pending_approval) + atribusi affiliate_id.
    const { data: clinic, error: clinicErr } = await admin
      .from("clinics")
      .insert({
        name: d.name,
        clinic_type: clinicType,
        specializations,
        address: d.address || null,
        phone_number: d.phone_number || null,
        status: "pending_approval",
        affiliate_id: auth.affiliateId,
        subdomain: `pending-${crypto.randomUUID().slice(0, 8)}`,
      })
      .select("id")
      .single();

    if (clinicErr || !clinic) {
      return NextResponse.json({ error: "Gagal menyimpan data klinik." }, { status: 500 });
    }

    // 2) Buat akun owner (password di-input affiliator). Trigger DB membuat baris public.users.
    const tempPassword = d.owner_password;
    const { data: ownerAuth, error: authErr } = await admin.auth.admin.createUser({
      email: d.owner_email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: d.owner_name, role: "owner", clinic_id: clinic.id },
    });

    if (authErr || !ownerAuth?.user) {
      await admin.from("clinics").delete().eq("id", clinic.id);
      const msg = /already|exists|registered/i.test(authErr?.message ?? "")
        ? "Email owner sudah terpakai akun lain."
        : "Gagal membuat akun owner.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // 3) Set owner pending + kunci login sampai super admin approve.
    await admin.from("users").update({ status: "pending" }).eq("id", ownerAuth.user.id);
    await admin.auth.admin.updateUserById(ownerAuth.user.id, { ban_duration: "876000h" });

    await writeAudit({
      actorUserId: auth.userId,
      actorRole: "affiliate",
      clinicId: clinic.id,
      action: "clinic.affiliate_add",
      entityType: "clinic",
      entityId: clinic.id,
      metadata: { name: d.name, clinic_type: clinicType, specializations, affiliate_id: auth.affiliateId },
    });

    return NextResponse.json({ success: true, tempPassword });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
