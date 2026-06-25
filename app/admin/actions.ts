"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertSuperAdmin } from "@/lib/admin/guard";
import { validateSubdomain } from "@/lib/subdomain";
import { expiresFromPlan } from "@/lib/format";
import { writeAudit } from "@/lib/audit";
import { generateCommission } from "@/lib/commission";
import { sanitizeSpecializations, DEFAULT_DISCIPLINE } from "@/lib/disciplines";
import { ROOT_DOMAIN } from "@/lib/tenant/host";

export type ActionResult = { ok: boolean; error?: string; tempPassword?: string; redirectUrl?: string };

const VALID_PLANS = new Set(["1_month", "3_month", "1_year"]);

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// Generate password sementara yang cukup kuat & terbaca.
function genTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (const b of bytes) out += chars[b % chars.length];
  return out + "#7"; // pastikan ada angka & simbol
}

// ============ TAMBAH KLINIK LANGSUNG (buat owner + temp password) ============
export async function createClinicDirect(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await assertSuperAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const specializations = sanitizeSpecializations(
    String(formData.get("specializations") ?? "").split(","),
  );
  const clinicTypeRaw = String(formData.get("clinic_type") ?? "");
  const clinicType =
    (specializations.includes(clinicTypeRaw) && clinicTypeRaw) ||
    specializations[0] ||
    DEFAULT_DISCIPLINE;
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone_number") ?? "").trim();
  const ownerName = String(formData.get("owner_name") ?? "").trim();
  const ownerEmail = String(formData.get("owner_email") ?? "").trim().toLowerCase();
  const ownerPassword = String(formData.get("owner_password") ?? "");
  const affiliateRaw = String(formData.get("affiliate_id") ?? "").trim();
  const affiliateId = affiliateRaw === "" ? null : affiliateRaw;

  if (!name) return { ok: false, error: "Nama klinik wajib diisi." };
  if (specializations.length === 0) return { ok: false, error: "Pilih minimal satu layanan klinik." };
  if (!ownerName) return { ok: false, error: "Nama owner wajib diisi." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail))
    return { ok: false, error: "Email owner tidak valid." };
  if (ownerPassword.length < 8)
    return { ok: false, error: "Password owner minimal 8 karakter." };

  const admin = createAdminClient();

  // 1) buat klinik (pending_approval) — subdomain di-assign saat approve
  const { data: clinic, error: clinicErr } = await admin
    .from("clinics")
    .insert({
      name,
      clinic_type: clinicType,
      specializations,
      address: address || null,
      phone_number: phone || null,
      status: "pending_approval",
      affiliate_id: affiliateId, // opsional: klinik hasil rujukan affiliator offline
      // subdomain unik & not null: pakai placeholder unik, diganti saat approve
      subdomain: `pending-${crypto.randomUUID().slice(0, 8)}`,
    })
    .select("id")
    .single();

  if (clinicErr || !clinic) {
    return { ok: false, error: `Gagal membuat klinik: ${clinicErr?.message ?? "unknown"}` };
  }

  // 2) buat akun owner di auth (trigger akan buat baris public.users).
  //    Password di-input super admin (bukan generate otomatis).
  const tempPassword = ownerPassword;
  const { data: ownerAuth, error: authErr } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: ownerName, role: "owner", clinic_id: clinic.id },
  });

  if (authErr || !ownerAuth?.user) {
    // rollback klinik agar tidak ada klinik tanpa owner
    await admin.from("clinics").delete().eq("id", clinic.id);
    const msg = authErr && /already|exists|registered/i.test(authErr.message)
      ? "Email owner sudah terpakai akun lain."
      : authErr?.message ?? "unknown";
    return { ok: false, error: `Gagal membuat akun owner: ${msg}` };
  }

  // Kunci login owner sampai super admin approve (klinik masih pending_approval).
  await admin.auth.admin.updateUserById(ownerAuth.user.id, { ban_duration: "876000h" });

  await writeAudit({
    actorUserId: adminId,
    clinicId: clinic.id,
    action: "clinic.create_direct",
    entityType: "clinic",
    entityId: clinic.id,
    metadata: { name, clinic_type: clinicType, specializations, owner_email: ownerEmail },
  });

  revalidatePath("/admin/clinics");
  revalidatePath("/admin");
  return { ok: true, tempPassword };
}

// ============ APPROVE KLINIK ============
export async function approveClinic(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await assertSuperAdmin();

  const clinicId = String(formData.get("clinic_id") ?? "");
  const subdomainRaw = String(formData.get("subdomain") ?? "");
  const planType = String(formData.get("plan_type") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const specializations = sanitizeSpecializations(
    String(formData.get("specializations") ?? "").split(","),
  );
  const clinicTypeRaw = String(formData.get("clinic_type") ?? "");

  if (!clinicId) return { ok: false, error: "Klinik tidak valid." };
  if (!VALID_PLANS.has(planType)) return { ok: false, error: "Plan tidak valid." };
  if (!Number.isFinite(amount) || amount < 0) return { ok: false, error: "Harga tidak valid." };

  const sub = validateSubdomain(subdomainRaw);
  if (!sub.ok) return { ok: false, error: sub.error };

  const admin = createAdminClient();

  // cek subdomain unik
  const { data: existing } = await admin
    .from("clinics")
    .select("id")
    .eq("subdomain", sub.value)
    .maybeSingle();
  if (existing && existing.id !== clinicId) {
    return { ok: false, error: `Subdomain '${sub.value}' sudah dipakai klinik lain.` };
  }

  const now = new Date();
  const expiresAt = expiresFromPlan(planType, now);

  // 1) update klinik
  const clinicUpdate: Record<string, unknown> = {
    status: "active",
    subdomain: sub.value,
    approved_at: now.toISOString(),
    approved_by: adminId,
  };
  // Bila super admin mengubah pilihan layanan saat approve, simpan. Tipe utama =
  // pilihan terpilih (kalau valid) atau layanan pertama.
  if (specializations.length > 0) {
    clinicUpdate.specializations = specializations;
    clinicUpdate.clinic_type =
      (specializations.includes(clinicTypeRaw) && clinicTypeRaw) || specializations[0];
  }

  const { error: upErr } = await admin.from("clinics").update(clinicUpdate).eq("id", clinicId);
  if (upErr) return { ok: false, error: `Gagal update klinik: ${upErr.message}` };

  // 2) buat subscription
  const { data: subscription, error: subErr } = await admin
    .from("subscriptions")
    .insert({
      clinic_id: clinicId,
      plan_type: planType,
      amount,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: "active",
      created_by: adminId,
    })
    .select("id")
    .single();
  if (subErr) return { ok: false, error: `Gagal membuat langganan: ${subErr.message}` };

  // 2b) Bila klinik dibawa affiliator, catat komisi untuk langganan awal ini.
  if (subscription?.id) {
    await generateCommission(admin, { clinicId, subscriptionId: subscription.id, amount });
  }

  // 3) aktifkan owner + BUKA KUNCI login (unban). Akun owner di-ban saat
  //    pendaftaran/pembuatan agar tidak bisa login sebelum disetujui — di sini
  //    dibuka karena klinik sudah aktif.
  const { data: owners } = await admin
    .from("users")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("role", "owner");
  for (const o of owners ?? []) {
    await admin.from("users").update({ status: "active" }).eq("id", o.id);
    await admin.auth.admin.updateUserById(o.id, { ban_duration: "none" });
  }

  await writeAudit({
    actorUserId: adminId,
    clinicId,
    action: "clinic.approve",
    entityType: "clinic",
    entityId: clinicId,
    metadata: { subdomain: sub.value, plan_type: planType, amount, subscription_id: subscription?.id },
  });

  revalidatePath("/admin/clinics");
  revalidatePath(`/admin/clinics/${clinicId}`);
  revalidatePath("/admin");
  return { ok: true };
}

// ============ ARSIPKAN KLINIK + LEPAS SUBDOMAIN (aman, data tetap disimpan) ============
// Menonaktifkan klinik (status 'rejected') dan membebaskan subdomain agar bisa
// dipakai klinik lain — TANPA menghapus data (sesuai kebijakan retensi medis).
export async function archiveClinicReleaseSubdomain(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await assertSuperAdmin();
  const clinicId = String(formData.get("clinic_id") ?? "");
  if (!clinicId) return { ok: false, error: "Klinik tidak valid." };

  const admin = createAdminClient();
  const { data: clinic } = await admin
    .from("clinics")
    .select("subdomain")
    .eq("id", clinicId)
    .maybeSingle();
  if (!clinic) return { ok: false, error: "Klinik tidak ditemukan." };

  // Subdomain dibebaskan dengan mengganti ke placeholder unik.
  const freed = `arsip-${crypto.randomUUID().slice(0, 8)}`;
  const { error } = await admin
    .from("clinics")
    .update({ status: "rejected", subdomain: freed })
    .eq("id", clinicId);
  if (error) return { ok: false, error: error.message };

  await writeAudit({
    actorUserId: adminId,
    clinicId,
    action: "clinic.archive_release_subdomain",
    entityType: "clinic",
    entityId: clinicId,
    metadata: { old_subdomain: clinic.subdomain, new_subdomain: freed },
  });

  revalidatePath("/admin/clinics");
  revalidatePath(`/admin/clinics/${clinicId}`);
  revalidatePath("/admin");
  return { ok: true };
}

// ============ HAPUS KLINIK PERMANEN (cascade — hapus SEMUA data) ============
// PERINGATAN: menghapus klinik + seluruh pasien/booking/rekam medis via FK cascade,
// dan akun auth anggotanya. Hanya untuk klinik test/salah input. Wajib konfirmasi
// dengan mengetik subdomain klinik.
export async function deleteClinicPermanent(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await assertSuperAdmin();
  const clinicId = String(formData.get("clinic_id") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (!clinicId) return { ok: false, error: "Klinik tidak valid." };

  const admin = createAdminClient();
  const { data: clinic } = await admin
    .from("clinics")
    .select("subdomain, name")
    .eq("id", clinicId)
    .maybeSingle();
  if (!clinic) return { ok: false, error: "Klinik tidak ditemukan." };

  if (confirm !== clinic.subdomain) {
    return { ok: false, error: `Konfirmasi tidak cocok. Ketik persis: ${clinic.subdomain}` };
  }

  // Catat audit SEBELUM dihapus (clinic_id akan jadi null karena FK on delete set null).
  await writeAudit({
    actorUserId: adminId,
    clinicId,
    action: "clinic.delete_permanent",
    entityType: "clinic",
    entityId: clinicId,
    metadata: { subdomain: clinic.subdomain, name: clinic.name },
  });

  // Hapus akun auth anggota klinik (agar email bisa dipakai ulang). Baris
  // public.users-nya ikut terhapus via cascade saat klinik dihapus.
  const { data: members } = await admin.from("users").select("id").eq("clinic_id", clinicId);
  const memberIds = (members ?? []).map((m) => m.id as string);

  // FK audit_logs.actor_user_id -> users(id) bersifat NO ACTION, jadi menghapus
  // user yang pernah jadi aktor audit akan diblokir. Lepas referensinya dulu
  // (jejak audit tetap ada, hanya aktornya di-anonim) agar cascade delete lolos.
  if (memberIds.length) {
    await admin.from("audit_logs").update({ actor_user_id: null }).in("actor_user_id", memberIds);
  }

  for (const m of memberIds) {
    try {
      await admin.auth.admin.deleteUser(m);
    } catch {
      // abaikan — lanjutkan menghapus klinik.
    }
  }

  const { error } = await admin.from("clinics").delete().eq("id", clinicId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/clinics");
  revalidatePath("/admin");
  redirect("/admin/clinics");
}

// ============ PERPANJANG LANGGANAN ============
export async function extendSubscription(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await assertSuperAdmin();

  const clinicId = String(formData.get("clinic_id") ?? "");
  const planType = String(formData.get("plan_type") ?? "");
  const amount = Number(formData.get("amount") ?? 0);

  if (!clinicId) return { ok: false, error: "Klinik tidak valid." };
  if (!VALID_PLANS.has(planType)) return { ok: false, error: "Plan tidak valid." };
  if (!Number.isFinite(amount) || amount < 0) return { ok: false, error: "Harga tidak valid." };

  const admin = createAdminClient();
  const now = new Date();

  // perpanjang dari masa aktif tersisa bila masih berlaku
  const { data: latest } = await admin
    .from("subscriptions")
    .select("expires_at")
    .eq("clinic_id", clinicId)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestExp = latest?.expires_at ? new Date(latest.expires_at) : null;
  const base = latestExp && latestExp > now ? latestExp : now;
  const expiresAt = expiresFromPlan(planType, base);

  const { data: renewSub, error: subErr } = await admin
    .from("subscriptions")
    .insert({
      clinic_id: clinicId,
      plan_type: planType,
      amount,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: "active",
      created_by: adminId,
    })
    .select("id")
    .single();
  if (subErr) return { ok: false, error: `Gagal memperpanjang: ${subErr.message}` };

  // Komisi recurring: catat komisi affiliator untuk perpanjangan ini juga.
  if (renewSub?.id) {
    await generateCommission(admin, { clinicId, subscriptionId: renewSub.id, amount });
  }

  // pastikan klinik aktif kembali (jika sebelumnya expired)
  await admin.from("clinics").update({ status: "active" }).eq("id", clinicId).in("status", ["expired", "active"]);

  await writeAudit({
    actorUserId: adminId,
    clinicId,
    action: "subscription.renew",
    entityType: "subscription",
    metadata: { plan_type: planType, amount, expires_at: expiresAt.toISOString() },
  });

  revalidatePath(`/admin/clinics/${clinicId}`);
  revalidatePath("/admin");
  return { ok: true };
}

// ============ REJECT / SUSPEND / REACTIVATE ============
export async function setClinicStatus(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await assertSuperAdmin();
  const clinicId = String(formData.get("clinic_id") ?? "");
  const target = String(formData.get("target") ?? ""); // 'rejected' | 'suspended' | 'active'

  if (!clinicId) return { ok: false, error: "Klinik tidak valid." };
  if (!["rejected", "suspended", "active"].includes(target))
    return { ok: false, error: "Status target tidak valid." };

  const admin = createAdminClient();
  const { error } = await admin.from("clinics").update({ status: target }).eq("id", clinicId);
  if (error) return { ok: false, error: error.message };

  await writeAudit({
    actorUserId: adminId,
    clinicId,
    action: `clinic.${target}`,
    entityType: "clinic",
    entityId: clinicId,
  });

  revalidatePath("/admin/clinics");
  revalidatePath(`/admin/clinics/${clinicId}`);
  revalidatePath("/admin");
  return { ok: true };
}

// ============================================================
// AFFILIATOR (Stage 9) — semua aksi hanya untuk super admin
// ============================================================

// ============ TAMBAH AFFILIATOR (buat akun + temp password) ============
export async function createAffiliate(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await assertSuperAdmin();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone_number") ?? "").trim();
  const payoutInfo = String(formData.get("payout_info") ?? "").trim();
  const ratePercent = Number(formData.get("commission_rate") ?? 0); // dalam persen (mis. 10)

  if (fullName.length < 3) return { ok: false, error: "Nama affiliator minimal 3 karakter." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { ok: false, error: "Email affiliator tidak valid." };
  if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100)
    return { ok: false, error: "Persentase komisi harus 0–100." };

  const rate = Math.round((ratePercent / 100) * 10000) / 10000; // simpan sbg pecahan (0.10)
  const admin = createAdminClient();

  // 1) Buat akun auth affiliator (role 'affiliate', clinic_id null = level platform).
  const tempPassword = genTempPassword();
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "affiliate" },
  });
  if (authErr || !created?.user) {
    const msg = /already|exists|registered/i.test(authErr?.message ?? "")
      ? "Email ini sudah terpakai akun lain."
      : authErr?.message ?? "unknown";
    return { ok: false, error: `Gagal membuat akun affiliator: ${msg}` };
  }

  // Pastikan baris public.users benar (trigger memakai default 'patient' bila
  // metadata tak terbaca) — set eksplisit role 'affiliate', clinic_id null.
  await admin
    .from("users")
    .update({ role: "affiliate", clinic_id: null, full_name: fullName, phone_number: phone || null })
    .eq("id", created.user.id);

  // 2) Buat baris affiliates.
  const { data: aff, error: affErr } = await admin
    .from("affiliates")
    .insert({
      user_id: created.user.id,
      full_name: fullName,
      email,
      phone_number: phone || null,
      commission_rate: rate,
      payout_info: payoutInfo || null,
      status: "active",
      created_by: adminId,
    })
    .select("id")
    .single();

  if (affErr || !aff) {
    // rollback akun auth agar email bisa dipakai ulang.
    try {
      await admin.auth.admin.deleteUser(created.user.id);
    } catch {
      /* abaikan */
    }
    return { ok: false, error: `Gagal membuat affiliator: ${affErr?.message ?? "unknown"}` };
  }

  await writeAudit({
    actorUserId: adminId,
    action: "affiliate.create",
    entityType: "affiliate",
    entityId: aff.id,
    metadata: { full_name: fullName, email, commission_rate: rate },
  });

  revalidatePath("/admin/affiliates");
  return { ok: true, tempPassword };
}

// ============ UPDATE AFFILIATOR (rate / status / payout / kontak) ============
export async function updateAffiliate(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await assertSuperAdmin();

  const affiliateId = String(formData.get("affiliate_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone_number") ?? "").trim();
  const payoutInfo = String(formData.get("payout_info") ?? "").trim();
  const ratePercent = Number(formData.get("commission_rate") ?? 0);
  const status = String(formData.get("status") ?? "active");

  if (!affiliateId) return { ok: false, error: "Affiliator tidak valid." };
  if (fullName.length < 3) return { ok: false, error: "Nama affiliator minimal 3 karakter." };
  if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100)
    return { ok: false, error: "Persentase komisi harus 0–100." };
  if (!["active", "inactive"].includes(status))
    return { ok: false, error: "Status tidak valid." };

  const rate = Math.round((ratePercent / 100) * 10000) / 10000;
  const admin = createAdminClient();

  const { error } = await admin
    .from("affiliates")
    .update({
      full_name: fullName,
      phone_number: phone || null,
      payout_info: payoutInfo || null,
      commission_rate: rate,
      status,
    })
    .eq("id", affiliateId);
  if (error) return { ok: false, error: `Gagal menyimpan: ${error.message}` };

  await writeAudit({
    actorUserId: adminId,
    action: "affiliate.update",
    entityType: "affiliate",
    entityId: affiliateId,
    metadata: { commission_rate: rate, status },
  });

  revalidatePath("/admin/affiliates");
  revalidatePath(`/admin/affiliates/${affiliateId}`);
  return { ok: true };
}

// ============ TANDAI KOMISI DIBAYAR / BATAL BAYAR ============
export async function setCommissionStatus(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await assertSuperAdmin();
  const commissionId = String(formData.get("commission_id") ?? "");
  const target = String(formData.get("target") ?? ""); // 'paid' | 'pending' | 'cancelled'

  if (!commissionId) return { ok: false, error: "Komisi tidak valid." };
  if (!["paid", "pending", "cancelled"].includes(target))
    return { ok: false, error: "Status komisi tidak valid." };

  const admin = createAdminClient();
  const { data: comm, error } = await admin
    .from("affiliate_commissions")
    .update({ status: target, paid_at: target === "paid" ? new Date().toISOString() : null })
    .eq("id", commissionId)
    .select("affiliate_id")
    .single();
  if (error) return { ok: false, error: error.message };

  await writeAudit({
    actorUserId: adminId,
    action: `commission.${target}`,
    entityType: "affiliate_commission",
    entityId: commissionId,
  });

  revalidatePath("/admin/affiliates");
  if (comm?.affiliate_id) revalidatePath(`/admin/affiliates/${comm.affiliate_id}`);
  return { ok: true };
}

// ============ ASSIGN / UBAH AFFILIATOR SEBUAH KLINIK ============
export async function assignClinicAffiliate(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await assertSuperAdmin();
  const clinicId = String(formData.get("clinic_id") ?? "");
  const affiliateRaw = String(formData.get("affiliate_id") ?? "").trim();
  const affiliateId = affiliateRaw === "" ? null : affiliateRaw;

  if (!clinicId) return { ok: false, error: "Klinik tidak valid." };

  const admin = createAdminClient();
  if (affiliateId) {
    const { data: aff } = await admin
      .from("affiliates")
      .select("id")
      .eq("id", affiliateId)
      .maybeSingle();
    if (!aff) return { ok: false, error: "Affiliator tidak ditemukan." };
  }

  const { error } = await admin
    .from("clinics")
    .update({ affiliate_id: affiliateId })
    .eq("id", clinicId);
  if (error) return { ok: false, error: error.message };

  await writeAudit({
    actorUserId: adminId,
    clinicId,
    action: "clinic.assign_affiliate",
    entityType: "clinic",
    entityId: clinicId,
    metadata: { affiliate_id: affiliateId },
  });

  revalidatePath(`/admin/clinics/${clinicId}`);
  revalidatePath("/admin/affiliates");
  return { ok: true };
}

// ============================================================
// IMPERSONATE OWNER (login sebagai owner — untuk support)
// ============================================================
// Menukar sesi browser super admin menjadi sesi owner klinik, lewat magic-link
// token (generateLink) yang langsung di-verifyOtp di server (token tak lewat URL).
// PERINGATAN: super admin akan keluar dari akunnya & masuk sebagai owner; login
// ulang setelah selesai. Selalu dicatat di audit (user.impersonate).
export async function impersonateOwner(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await assertSuperAdmin();
  const clinicId = String(formData.get("clinic_id") ?? "");
  if (!clinicId) return { ok: false, error: "Klinik tidak valid." };

  const admin = createAdminClient();
  const [{ data: owner }, { data: clinic }] = await Promise.all([
    admin.from("users").select("id, email").eq("clinic_id", clinicId).eq("role", "owner")
      .not("email", "is", null).limit(1).maybeSingle(),
    admin.from("clinics").select("subdomain").eq("id", clinicId).maybeSingle(),
  ]);
  if (!owner?.email) return { ok: false, error: "Owner klinik tidak punya email untuk login." };

  // Dashboard owner hanya bisa diakses di subdomain kliniknya (cookie host-scoped),
  // jadi verifikasi sesi harus dijalankan DI subdomain itu — bukan di apex.
  const subdomain = clinic?.subdomain as string | undefined;
  if (!subdomain || subdomain.startsWith("pending-") || subdomain.startsWith("arsip-")) {
    return { ok: false, error: "Klinik belum punya subdomain aktif." };
  }
  if (!ROOT_DOMAIN) return { ok: false, error: "ROOT_DOMAIN belum dikonfigurasi." };

  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: owner.email as string,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (error || !tokenHash) {
    return { ok: false, error: `Gagal menyiapkan sesi: ${error?.message ?? "unknown"}` };
  }

  // Audit (aktor = super admin) sebelum sesi owner dibuat di subdomain.
  await writeAudit({
    actorUserId: adminId,
    clinicId,
    action: "user.impersonate",
    entityType: "user",
    entityId: owner.id as string,
    metadata: { email: owner.email },
  });

  // Host tujuan = host tempat dashboard owner sebenarnya hidup, agar cookie sesi
  // ter-set di host yang benar (cookie host-scoped). Bila klinik punya custom
  // domain terverifikasi, dashboard dikanonikalisasi ke sana → verifikasi di situ.
  const { data: dom } = await admin
    .from("domains")
    .select("custom_domain")
    .eq("clinic_id", clinicId)
    .eq("verified", true)
    .limit(1)
    .maybeSingle();
  const host = (dom?.custom_domain as string | undefined) || `${subdomain}.${ROOT_DOMAIN}`;

  // Token magic-link sekali-pakai diverifikasi di host tujuan (set cookie di sana).
  const url = `https://${host}/api/auth/impersonate?token_hash=${encodeURIComponent(tokenHash)}&next=${encodeURIComponent("/owner/dashboard")}`;
  return { ok: true, redirectUrl: url };
}

// ============================================================
// PENGATURAN PLATFORM (item 9 & 10)
// ============================================================

// ---- Harga acuan plan ----
export async function updatePlanPrices(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await assertSuperAdmin();
  const admin = createAdminClient();
  const plans = ["1_month", "3_month", "1_year"];
  for (const p of plans) {
    const price = Number(formData.get(`price_${p}`) ?? 0);
    if (!Number.isFinite(price) || price < 0) return { ok: false, error: "Harga tidak valid." };
    const { error } = await admin
      .from("plan_prices")
      .upsert({ plan_type: p, price, updated_at: new Date().toISOString() }, { onConflict: "plan_type" });
    if (error) return { ok: false, error: error.message };
  }
  await writeAudit({ actorUserId: adminId, action: "plan_prices.update", entityType: "plan_price" });
  revalidatePath("/admin/pengaturan");
  return { ok: true };
}

// ---- Pengumuman broadcast ----
export async function createAnnouncement(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await assertSuperAdmin();
  const message = String(formData.get("message") ?? "").trim();
  const level = String(formData.get("level") ?? "info");
  if (message.length < 3) return { ok: false, error: "Pesan minimal 3 karakter." };
  if (!["info", "warning", "success"].includes(level)) return { ok: false, error: "Level tidak valid." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_announcements")
    .insert({ message, level, is_active: true, created_by: adminId });
  if (error) return { ok: false, error: error.message };

  await writeAudit({ actorUserId: adminId, action: "announcement.create", entityType: "announcement" });
  revalidatePath("/admin/pengaturan");
  return { ok: true };
}

export async function toggleAnnouncement(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await assertSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("is_active") ?? "") === "true";
  if (!id) return { ok: false, error: "Tidak valid." };

  const admin = createAdminClient();
  const { error } = await admin.from("platform_announcements").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await writeAudit({
    actorUserId: adminId,
    action: active ? "announcement.activate" : "announcement.deactivate",
    entityType: "announcement",
    entityId: id,
  });
  revalidatePath("/admin/pengaturan");
  return { ok: true };
}

export async function deleteAnnouncement(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await assertSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Tidak valid." };

  const admin = createAdminClient();
  const { error } = await admin.from("platform_announcements").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await writeAudit({ actorUserId: adminId, action: "announcement.delete", entityType: "announcement", entityId: id });
  revalidatePath("/admin/pengaturan");
  return { ok: true };
}
