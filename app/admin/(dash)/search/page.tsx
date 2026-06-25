import Link from "next/link";
import { requireSuperAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { SearchBox } from "@/components/admin/search-box";
import { STATUS_LABEL, CLINIC_TYPE_LABEL } from "@/lib/format";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner", admin: "Admin", therapist: "Terapis", affiliate: "Affiliator",
};

function rmStr(v: string | null | undefined): string {
  const d = String(v ?? "").replace(/\D/g, "");
  return d ? d.padStart(6, "0") : "";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSuperAdmin();
  const { q: qRaw } = await searchParams;
  // Bersihkan karakter yang bisa merusak filter PostgREST .or() (koma, %, kurung).
  const q = (qRaw ?? "").replace(/[%,()]/g, " ").trim();
  const enough = q.length >= 2;

  const db = createAdminClient();
  let clinics: Record<string, unknown>[] = [];
  let users: Record<string, unknown>[] = [];
  let patients: Record<string, unknown>[] = [];
  const clinicNames = new Map<string, string>();

  if (enough) {
    const like = `%${q}%`;
    const [cRes, uRes, pRes] = await Promise.all([
      db.from("clinics").select("id, name, subdomain, status, clinic_type")
        .or(`name.ilike.${like},subdomain.ilike.${like}`).limit(20),
      db.from("users").select("id, full_name, email, role, clinic_id, status")
        .in("role", ["owner", "admin", "therapist", "affiliate"])
        .or(`full_name.ilike.${like},email.ilike.${like}`).limit(20),
      db.from("patients").select("id, full_name, phone, medical_record_no, clinic_id")
        .is("deleted_at", null)
        .or(`full_name.ilike.${like},phone.ilike.${like},medical_record_no.ilike.${like}`).limit(20),
    ]);
    clinics = cRes.data ?? [];
    users = uRes.data ?? [];
    patients = pRes.data ?? [];

    // Nama klinik untuk hasil user & pasien.
    const ids = Array.from(new Set([
      ...users.map((u) => u.clinic_id),
      ...patients.map((p) => p.clinic_id),
    ].filter(Boolean))) as string[];
    if (ids.length) {
      const { data } = await db.from("clinics").select("id, name").in("id", ids);
      for (const c of data ?? []) clinicNames.set(c.id as string, c.name as string);
    }
  }

  const total = clinics.length + users.length + patients.length;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Pencarian</h1>
      <p className="mb-4 text-sm text-zinc-500">Cari klinik, owner/staf, atau pasien (nama, No. RM, atau No. HP).</p>

      <div className="mb-5">
        <SearchBox placeholder="Ketik nama klinik / orang / No. RM / No. HP…" />
      </div>

      {!enough ? (
        <p className="text-sm text-zinc-400">Ketik minimal 2 karakter untuk mulai mencari.</p>
      ) : total === 0 ? (
        <p className="text-sm text-zinc-500">Tidak ada hasil untuk &quot;{q}&quot;.</p>
      ) : (
        <div className="space-y-6">
          {clinics.length > 0 && (
            <Group title={`Klinik (${clinics.length})`}>
              {clinics.map((c) => (
                <Item key={c.id as string} href={`/admin/clinics/${c.id}`}
                  title={c.name as string}
                  meta={`${CLINIC_TYPE_LABEL[c.clinic_type as string] ?? c.clinic_type} · ${STATUS_LABEL[c.status as string] ?? c.status}${c.subdomain && !String(c.subdomain).startsWith("pending-") ? ` · ${c.subdomain}` : ""}`}
                />
              ))}
            </Group>
          )}

          {users.length > 0 && (
            <Group title={`Owner / Staf / Affiliator (${users.length})`}>
              {users.map((u) => (
                <Item key={u.id as string}
                  href={u.role === "affiliate" ? "/admin/affiliates" : `/admin/clinics/${u.clinic_id}`}
                  title={(u.full_name as string) || "(tanpa nama)"}
                  meta={`${ROLE_LABEL[u.role as string] ?? u.role}${u.clinic_id ? ` · ${clinicNames.get(u.clinic_id as string) ?? "—"}` : ""}${u.email ? ` · ${u.email}` : ""}`}
                />
              ))}
            </Group>
          )}

          {patients.length > 0 && (
            <Group title={`Pasien (${patients.length})`}>
              {patients.map((p) => (
                <Item key={p.id as string} href={`/admin/clinics/${p.clinic_id}`}
                  title={p.full_name as string}
                  meta={`${rmStr(p.medical_record_no as string) ? `RM ${rmStr(p.medical_record_no as string)} · ` : ""}${p.phone ?? ""} · ${clinicNames.get(p.clinic_id as string) ?? "—"}`}
                />
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</h2>
      <div className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800/60 dark:border-zinc-800 dark:bg-zinc-900">
        {children}
      </div>
    </section>
  );
}

function Item({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
      <div className="min-w-0">
        <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">{title}</div>
        <div className="truncate text-xs text-zinc-500">{meta}</div>
      </div>
      <span className="shrink-0 text-zinc-300">→</span>
    </Link>
  );
}
