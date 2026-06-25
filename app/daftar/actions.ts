"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { sanitizeSpecializations } from "@/lib/disciplines";

// Hasil aksi pendaftaran publik (self-signup owner klinik).
export type RegisterResult = { ok: boolean; error?: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Pendaftaran mandiri owner klinik (publik, TANPA login).
 *
 * Alur (CLAUDE.md §3.1):
 *  1. Insert `clinics` status 'pending_approval' (subdomain placeholder; subdomain
 *     final di-assign super admin saat approve).
 *  2. Buat akun auth owner dengan password pilihan owner sendiri (email_confirm true
 *     — konsisten kebijakan notifikasi manual MVP). Trigger DB membuat baris
 *     public.users; status di-set 'pending' sampai super admin approve.
 *  3. Klinik otomatis muncul di dashboard super admin (filter "Pending").
 *
 * Endpoint publik → dilakukan via service role di server (bukan insert dari client),
 * dengan validasi + honeypot anti-bot.
 */
export async function registerClinic(
  _prev: RegisterResult | null,
  formData: FormData,
): Promise<RegisterResult> {
  // Honeypot: field tersembunyi yang hanya diisi bot. Bila terisi, pura-pura sukses
  // (jangan beri sinyal ke bot) tanpa membuat data apa pun.
  if (String(formData.get("website") ?? "").trim() !== "") {
    return { ok: true };
  }

  const name = String(formData.get("name") ?? "").trim();
  // Layanan klinik (boleh lebih dari satu). `clinic_type` = tipe utama (template landing).
  const specializations = sanitizeSpecializations(
    String(formData.get("specializations") ?? "").split(","),
  );
  const clinicType = String(formData.get("clinic_type") ?? "") || specializations[0] || "";
  const address = String(formData.get("address") ?? "").trim();
  const ownerName = String(formData.get("owner_name") ?? "").trim();
  const ownerEmail = String(formData.get("owner_email") ?? "").trim().toLowerCase();
  const ownerPhone = String(formData.get("owner_phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  // ── Validasi server-side ──
  if (name.length < 3) return { ok: false, error: "Nama klinik minimal 3 karakter." };
  if (specializations.length === 0) return { ok: false, error: "Pilih minimal satu layanan klinik." };
  if (ownerName.length < 3) return { ok: false, error: "Nama owner minimal 3 karakter." };
  if (!EMAIL_RE.test(ownerEmail)) return { ok: false, error: "Format email tidak valid." };
  if (ownerPhone.replace(/\D/g, "").length < 8)
    return { ok: false, error: "Nomor WhatsApp tidak valid." };
  if (password.length < 8) return { ok: false, error: "Password minimal 8 karakter." };
  if (password !== passwordConfirm) return { ok: false, error: "Konfirmasi password tidak cocok." };

  const admin = createAdminClient();

  // 1) Buat klinik (pending_approval). Subdomain unik wajib → placeholder,
  //    diganti super admin saat approve.
  const { data: clinic, error: clinicErr } = await admin
    .from("clinics")
    .insert({
      name,
      clinic_type: clinicType,
      specializations,
      address: address || null,
      phone_number: ownerPhone,
      status: "pending_approval",
      subdomain: `pending-${crypto.randomUUID().slice(0, 8)}`,
    })
    .select("id")
    .single();

  if (clinicErr || !clinic) {
    return { ok: false, error: "Gagal menyimpan data klinik. Coba lagi sebentar." };
  }

  // 2) Buat akun auth owner (password pilihan owner). Trigger DB membuat baris
  //    public.users dari user_metadata.
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: ownerName, role: "owner", clinic_id: clinic.id },
  });

  if (authErr || !created?.user) {
    // Rollback klinik agar tidak ada klinik tanpa owner.
    await admin.from("clinics").delete().eq("id", clinic.id);
    const msg = /already|exists|registered/i.test(authErr?.message ?? "")
      ? "Email ini sudah terdaftar. Gunakan email lain atau masuk ke akun Anda."
      : "Gagal membuat akun. Coba lagi sebentar.";
    return { ok: false, error: msg };
  }

  // 3) Set status owner 'pending' (trigger default 'active') + simpan no HP.
  await admin
    .from("users")
    .update({ status: "pending", phone_number: ownerPhone })
    .eq("id", created.user.id);

  // 4) KUNCI login sampai disetujui super admin. Akun di-ban supaya tidak bisa
  //    login dengan email+password pendaftaran sebelum klinik dikonfirmasi.
  //    Dibuka kembali (unban) saat approval (lihat approveClinic).
  await admin.auth.admin.updateUserById(created.user.id, { ban_duration: "876000h" });

  await writeAudit({
    actorUserId: created.user.id,
    actorRole: "owner",
    clinicId: clinic.id,
    action: "clinic.self_signup",
    entityType: "clinic",
    entityId: clinic.id,
    metadata: { name, clinic_type: clinicType, specializations, owner_email: ownerEmail },
  });

  // Klinik baru langsung tampil di panel super admin.
  revalidatePath("/admin/clinics");
  revalidatePath("/admin");

  return { ok: true };
}
