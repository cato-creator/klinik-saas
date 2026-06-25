import { STATUS_LABEL } from "@/lib/format";

const STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending_approval: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  expired: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  suspended: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  rejected: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status] ?? STYLES.suspended}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
