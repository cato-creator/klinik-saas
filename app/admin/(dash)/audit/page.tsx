import Link from "next/link";
import { requireSuperAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { auditLabel, CATEGORY_STYLE, CATEGORY_LABEL, type AuditCategory } from "@/lib/admin/audit-labels";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const CATS: { key: string; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "medis", label: "Medis" },
  { key: "keuangan", label: "Keuangan" },
  { key: "klinik", label: "Klinik" },
  { key: "akun", label: "Akun" },
  { key: "affiliator", label: "Affiliator" },
];

function fmtWaktu(d: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}

// Ringkas metadata jadi teks pendek yang aman dibaca (alasan, subdomain, dll).
function metaSummary(action: string, meta: Record<string, unknown> | null): string {
  if (!meta) return "";
  const parts: string[] = [];
  if (typeof meta.reason === "string") parts.push(`Alasan: ${meta.reason}`);
  if (typeof meta.patient_count === "number") parts.push(`${meta.patient_count} pasien`);
  if (typeof meta.subdomain === "string") parts.push(`@${meta.subdomain}`);
  if (typeof meta.plan_type === "string") parts.push(String(meta.plan_type));
  if (typeof meta.amount === "number") parts.push(`Rp${Number(meta.amount).toLocaleString("id-ID")}`);
  if (typeof meta.owner_email === "string") parts.push(String(meta.owner_email));
  if (typeof meta.name === "string") parts.push(String(meta.name));
  return parts.join(" · ");
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; page?: string }>;
}) {
  await requireSuperAdmin();
  const { cat, page } = await searchParams;
  const activeCat = cat && CATS.some((c) => c.key === cat) ? cat : "all";
  const pageNum = Math.max(1, Number(page ?? 1) || 1);

  const db = createAdminClient();

  // Ambil lebih banyak lalu filter kategori di app (kategori = turunan dari action,
  // bukan kolom DB). Untuk skala saat ini cukup; bisa dioptimasi nanti.
  const { data: rawLogs } = await db
    .from("audit_logs")
    .select("id, actor_user_id, actor_role, clinic_id, action, entity_type, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  const all = (rawLogs ?? []).map((l) => ({
    ...l,
    ...auditLabel(l.action as string),
  }));
  const filtered = activeCat === "all" ? all : all.filter((l) => l.category === activeCat);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(pageNum, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Peta nama actor & klinik.
  const actorIds = Array.from(new Set(pageRows.map((l) => l.actor_user_id).filter(Boolean))) as string[];
  const clinicIds = Array.from(new Set(pageRows.map((l) => l.clinic_id).filter(Boolean))) as string[];
  const [{ data: users }, { data: clinics }] = await Promise.all([
    actorIds.length ? db.from("users").select("id, full_name").in("id", actorIds) : Promise.resolve({ data: [] }),
    clinicIds.length ? db.from("clinics").select("id, name").in("id", clinicIds) : Promise.resolve({ data: [] }),
  ]);
  const userMap = new Map((users ?? []).map((u) => [u.id, u.full_name as string]));
  const clinicMap = new Map((clinics ?? []).map((c) => [c.id, c.name as string]));

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Aktivitas (Audit Log)</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Jejak aksi sensitif: approval, langganan, export keuangan & data pasien, perubahan akun.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {CATS.map((c) => (
          <Link
            key={c.key}
            href={c.key === "all" ? "/admin/audit" : `/admin/audit?cat=${c.key}`}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              activeCat === c.key
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {pageRows.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-500">Belum ada aktivitas tercatat.</div>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium">Waktu</th>
                <th className="px-4 py-3 font-medium">Aksi</th>
                <th className="px-4 py-3 font-medium">Oleh</th>
                <th className="px-4 py-3 font-medium">Klinik</th>
                <th className="px-4 py-3 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((l) => (
                <tr key={String(l.id)} className="border-b border-zinc-100 align-top last:border-0 dark:border-zinc-800/60">
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{fmtWaktu(l.created_at as string)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLE[l.category as AuditCategory]}`}>
                      {CATEGORY_LABEL[l.category as AuditCategory]}
                    </span>
                    <div className="mt-1 text-zinc-800 dark:text-zinc-200">{l.label}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {l.actor_user_id ? (userMap.get(l.actor_user_id as string) ?? "—") : "Sistem"}
                    {l.actor_role ? <div className="text-xs text-zinc-400">{l.actor_role as string}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {l.clinic_id ? (clinicMap.get(l.clinic_id as string) ?? "—") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {metaSummary(l.action as string, l.metadata as Record<string, unknown> | null)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-zinc-500">Halaman {safePage} dari {totalPages}</span>
          <div className="flex gap-2">
            <PageLink cat={activeCat} page={safePage - 1} disabled={safePage <= 1} label="← Sebelumnya" />
            <PageLink cat={activeCat} page={safePage + 1} disabled={safePage >= totalPages} label="Berikutnya →" />
          </div>
        </div>
      )}
    </div>
  );
}

function PageLink({ cat, page, disabled, label }: { cat: string; page: number; disabled: boolean; label: string }) {
  if (disabled) {
    return <span className="cursor-not-allowed rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-300 dark:border-zinc-800 dark:text-zinc-700">{label}</span>;
  }
  const params = new URLSearchParams();
  if (cat !== "all") params.set("cat", cat);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return (
    <Link
      href={`/admin/audit${qs ? `?${qs}` : ""}`}
      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {label}
    </Link>
  );
}
