"use server";

import { revalidatePath } from "next/cache";
import { requireTenantUser } from "@/lib/tenant/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROOT_DOMAIN } from "@/lib/tenant/host";
import { verifyDomainDns } from "@/lib/tenant/domains";
import {
  cloudflareSaasEnabled,
  createCustomHostname,
  findCustomHostname,
  getCustomHostname,
  deleteCustomHostname,
} from "@/lib/cloudflare/saas";
import { writeAudit } from "@/lib/audit";

export type DomainResult = { ok: boolean; error?: string; info?: string };

// Validasi format hostname (FQDN). Tolak apex platform & subdomain platform
// (tidak boleh membajak domain platform), tolak format tidak valid / terlalu panjang.
function validateDomain(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const d = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
  if (!d) return { ok: false, error: "Domain wajib diisi." };
  if (d.length > 253) return { ok: false, error: "Domain terlalu panjang." };
  // Minimal ada satu titik (punya TLD), label valid, total host valid.
  const labelRe = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
  const labels = d.split(".");
  if (labels.length < 2 || !labels.every((l) => labelRe.test(l))) {
    return { ok: false, error: "Format domain tidak valid. Contoh: klinik.domainanda.com" };
  }
  const root = ROOT_DOMAIN.toLowerCase();
  if (root && (d === root || d.endsWith("." + root))) {
    return { ok: false, error: "Tidak boleh memakai domain platform. Gunakan domain milik Anda sendiri." };
  }
  return { ok: true, value: d };
}

// ============ TAMBAH / GANTI DOMAIN ============
export async function addDomain(_prev: DomainResult | null, formData: FormData): Promise<DomainResult> {
  const ctx = await requireTenantUser(["owner"]);
  if (ctx.clinicStatus !== "active") {
    return { ok: false, error: "Langganan klinik harus aktif untuk memakai domain sendiri." };
  }

  const v = validateDomain(String(formData.get("custom_domain") ?? ""));
  if (!v.ok) return { ok: false, error: v.error };

  const admin = createAdminClient();

  // Domain harus unik lintas klinik.
  const { data: taken } = await admin
    .from("domains")
    .select("clinic_id")
    .eq("custom_domain", v.value)
    .maybeSingle();
  if (taken && taken.clinic_id !== ctx.clinicId) {
    return { ok: false, error: "Domain ini sudah dipakai klinik lain." };
  }

  // Satu klinik = satu custom domain (MVP). Ganti = hapus lama (termasuk di
  // Cloudflare) lalu buat baru.
  const { data: old } = await admin
    .from("domains")
    .select("cf_hostname_id")
    .eq("clinic_id", ctx.clinicId)
    .maybeSingle();
  if (old?.cf_hostname_id && cloudflareSaasEnabled()) {
    await deleteCustomHostname(old.cf_hostname_id as string);
  }
  await admin.from("domains").delete().eq("clinic_id", ctx.clinicId);

  // Daftarkan ke Cloudflare for SaaS (otomatis). Bila env API belum di-set,
  // fitur jatuh ke mode manual (domain tetap tersimpan; daftar hostname manual).
  let cfHostnameId: string | null = null;
  let cfStatus: string | null = null;
  if (cloudflareSaasEnabled()) {
    const created = await createCustomHostname(v.value);
    if (created.ok) {
      cfHostnameId = created.data.id;
      cfStatus = created.data.status;
    } else {
      // Mungkin sudah pernah terdaftar di Cloudflare → ambil id-nya.
      const found = await findCustomHostname(v.value);
      if (found.ok && found.data) {
        cfHostnameId = found.data.id;
        cfStatus = found.data.status;
      } else {
        return { ok: false, error: `Gagal mendaftarkan ke Cloudflare: ${created.error}` };
      }
    }
  }

  const { error } = await admin.from("domains").insert({
    clinic_id: ctx.clinicId,
    custom_domain: v.value,
    verified: false,
    cf_hostname_id: cfHostnameId,
    cf_status: cfStatus,
  });
  if (error) return { ok: false, error: `Gagal menyimpan domain: ${error.message}` };

  await writeAudit({
    actorUserId: ctx.userId,
    actorRole: ctx.role,
    clinicId: ctx.clinicId,
    action: "domain.add",
    entityType: "domain",
    metadata: { custom_domain: v.value, cf_hostname_id: cfHostnameId },
  });

  revalidatePath("/owner/domain");
  return { ok: true, info: "Domain disimpan. Arahkan DNS (CNAME) lalu klik Verifikasi." };
}

// ============ VERIFIKASI DNS ============
export async function verifyDomain(_prev: DomainResult | null, _formData: FormData): Promise<DomainResult> {
  const ctx = await requireTenantUser(["owner"]);
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("domains")
    .select("id, custom_domain, verified, cf_hostname_id")
    .eq("clinic_id", ctx.clinicId)
    .maybeSingle();
  if (!row) return { ok: false, error: "Belum ada domain untuk diverifikasi." };

  let detail: string;

  if (cloudflareSaasEnabled() && row.cf_hostname_id) {
    // Mode otomatis: status SSL/hostname dari Cloudflare adalah sumber kebenaran.
    const st = await getCustomHostname(row.cf_hostname_id as string);
    if (!st.ok) return { ok: false, error: `Gagal cek status Cloudflare: ${st.error}` };

    await admin.from("domains").update({ cf_status: st.data.status }).eq("id", row.id);

    if (st.data.status !== "active") {
      const hint =
        st.data.status === "pending_validation"
          ? "Cloudflare sedang menerbitkan SSL. Pastikan CNAME sudah dibuat, lalu coba lagi beberapa menit."
          : "Domain belum aktif di Cloudflare. Pastikan CNAME sudah mengarah ke apkfun.eu.org, tunggu propagasi, lalu coba lagi.";
      return { ok: false, error: hint };
    }
    detail = "Cloudflare: SSL aktif";
  } else {
    // Mode manual (env API belum di-set): verifikasi cukup via cek DNS.
    const result = await verifyDomainDns(row.custom_domain as string);
    if (!result.ok) return { ok: false, error: result.detail };
    detail = result.detail;
  }

  const { error } = await admin
    .from("domains")
    .update({ verified: true, verified_at: new Date().toISOString() })
    .eq("id", row.id);
  if (error) return { ok: false, error: `Gagal menyimpan status: ${error.message}` };

  await writeAudit({
    actorUserId: ctx.userId,
    actorRole: ctx.role,
    clinicId: ctx.clinicId,
    action: "domain.verify",
    entityType: "domain",
    entityId: row.id as string,
    metadata: { custom_domain: row.custom_domain, detail },
  });

  revalidatePath("/owner/domain");
  return { ok: true, info: `Domain terverifikasi (${detail}).` };
}

// ============ HAPUS DOMAIN ============
export async function removeDomain(_prev: DomainResult | null, _formData: FormData): Promise<DomainResult> {
  const ctx = await requireTenantUser(["owner"]);
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("domains")
    .select("id, custom_domain, cf_hostname_id")
    .eq("clinic_id", ctx.clinicId)
    .maybeSingle();
  if (!row) return { ok: true };

  // Lepas juga dari Cloudflare for SaaS agar slot hostname bebas.
  if (row.cf_hostname_id && cloudflareSaasEnabled()) {
    await deleteCustomHostname(row.cf_hostname_id as string);
  }

  const { error } = await admin.from("domains").delete().eq("id", row.id);
  if (error) return { ok: false, error: error.message };

  await writeAudit({
    actorUserId: ctx.userId,
    actorRole: ctx.role,
    clinicId: ctx.clinicId,
    action: "domain.remove",
    entityType: "domain",
    metadata: { custom_domain: row.custom_domain },
  });

  revalidatePath("/owner/domain");
  return { ok: true, info: "Domain dihapus." };
}
