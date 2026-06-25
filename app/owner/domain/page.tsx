import { requireTenantUser } from "@/lib/tenant/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ROOT_DOMAIN } from "@/lib/tenant/host";
import DomainManager from "./domain-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Domain Sendiri — Owner" };

export default async function OwnerDomainPage() {
  const ctx = await requireTenantUser(["owner"]);
  const db = createServiceClient();

  const [{ data: clinic }, { data: domain }] = await Promise.all([
    db.from("clinics").select("subdomain, status").eq("id", ctx.clinicId).single(),
    db
      .from("domains")
      .select("custom_domain, verified, verified_at, created_at, cf_status")
      .eq("clinic_id", ctx.clinicId)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Domain Sendiri</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pakai domain milik Anda sendiri (misal{" "}
          <span className="font-medium text-gray-700">www.domainanda.com</span>) sebagai
          alamat landing page &amp; booking, menggantikan subdomain bawaan.
        </p>
      </div>

      <DomainManager
        domain={domain ?? null}
        rootDomain={ROOT_DOMAIN}
        clinicActive={clinic?.status === "active"}
      />
    </div>
  );
}
