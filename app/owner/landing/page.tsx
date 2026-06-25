import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { requireTenantUser } from "@/lib/tenant/auth";
import { ROOT_DOMAIN } from "@/lib/tenant/host";
import { LandingEditor } from "@/components/owner/landing-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Landing Page — Owner" };

export default async function OwnerLandingPage() {
  const ctx = await requireTenantUser(["owner"]);
  const db = createServiceClient();

  const [clinicRes, contentRes] = await Promise.all([
    db
      .from("clinics")
      .select("name, description, address, phone_number, subdomain, clinic_type, status, operating_hours, logo_url")
      .eq("id", ctx.clinicId)
      .single(),
    db.from("landing_page_content").select("*").eq("clinic_id", ctx.clinicId).maybeSingle(),
  ]);

  const clinic = clinicRes.data;
  const content = contentRes.data ?? {};

  const liveUrl =
    clinic?.subdomain && ROOT_DOMAIN && !clinic.subdomain.startsWith("pending-")
      ? `https://${clinic.subdomain}.${ROOT_DOMAIN}`
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Landing Page</h1>
          <p className="mt-1 text-sm text-gray-500">
            Atur nama klinik dan seluruh isi halaman publik klinik Anda.
          </p>
        </div>
        {liveUrl && (
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
          >
            <ExternalLink className="h-4 w-4" /> Lihat Landing
          </a>
        )}
      </div>

      <LandingEditor clinic={clinic} content={content} />

      <p className="text-xs text-gray-400">
        Perubahan langsung tampil di landing page.{" "}
        <Link href="/owner/dashboard" className="text-teal-600 hover:underline">Kembali ke dashboard</Link>
      </p>
    </div>
  );
}
