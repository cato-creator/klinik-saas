// Badge status — server component murni (tanpa "use client").

const PROV: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  provisioning: { label: "Provisioning", cls: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" },
  live: { label: "Live", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
  suspended: { label: "Suspended", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
  failed: { label: "Gagal", cls: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" },
};

export function ProvBadge({ status }: { status: string }) {
  const s = PROV[status] ?? PROV.draft;
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

export function LicenseBadge({ status }: { status: string }) {
  const ok = status === "active";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        ok
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
      }`}
    >
      {ok ? "Aktif" : "Suspended"}
    </span>
  );
}
