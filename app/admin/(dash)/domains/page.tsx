import Link from "next/link";
import { requireSuperAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DomainsPage() {
  await requireSuperAdmin();
  const db = createAdminClient();

  const { data: domains } = await db
    .from("domains")
    .select("id, clinic_id, custom_domain, verified, verified_at, cf_status, created_at")
    .order("created_at", { ascending: false });

  const list = domains ?? [];
  const clinicIds = Array.from(new Set(list.map((d) => d.clinic_id).filter(Boolean))) as string[];
  const { data: clinics } = clinicIds.length
    ? await db.from("clinics").select("id, name, subdomain").in("id", clinicIds)
    : { data: [] };
  const clinicMap = new Map((clinics ?? []).map((c) => [c.id, c]));

  const verifiedCount = list.filter((d) => d.verified).length;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Domain Custom</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Semua domain custom (tier premium) lintas klinik beserta status verifikasi Cloudflare.
        {list.length > 0 && <> {verifiedCount}/{list.length} terverifikasi.</>}
      </p>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {list.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-500">
            Belum ada klinik yang memasang domain custom.
          </div>
        ) : (
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium">Domain</th>
                <th className="px-4 py-3 font-medium">Klinik</th>
                <th className="px-4 py-3 font-medium">Verifikasi</th>
                <th className="px-4 py-3 font-medium">Status SSL/CF</th>
                <th className="px-4 py-3 font-medium">Ditambahkan</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => {
                const c = clinicMap.get(d.clinic_id as string);
                return (
                  <tr key={d.id as string} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{d.custom_domain as string}</td>
                    <td className="px-4 py-3">
                      {c ? (
                        <Link href={`/admin/clinics/${d.clinic_id}`} className="text-emerald-600 hover:underline dark:text-emerald-400">
                          {c.name as string}
                        </Link>
                      ) : <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {d.verified ? (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          ✓ Terverifikasi
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          Menunggu
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{(d.cf_status as string) ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-500">{formatDate(d.created_at as string)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
