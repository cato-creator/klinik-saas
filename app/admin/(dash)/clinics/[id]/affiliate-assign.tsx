"use client";

import { useActionState } from "react";
import { assignClinicAffiliate, type ActionResult } from "../../../actions";

const field =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";

type AffiliateOption = { id: string; full_name: string };

export default function AffiliateAssign({
  clinicId,
  current,
  affiliates,
}: {
  clinicId: string;
  current: string;
  affiliates: AffiliateOption[];
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    assignClinicAffiliate,
    null,
  );

  return (
    <form action={action} className="mt-3 flex flex-wrap items-center gap-3">
      <input type="hidden" name="clinic_id" value={clinicId} />
      <select name="affiliate_id" defaultValue={current} className={`${field} max-w-xs`}>
        <option value="">— Tanpa affiliator —</option>
        {affiliates.map((a) => (
          <option key={a.id} value={a.id}>{a.full_name}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "…" : "Simpan"}
      </button>
      {state?.error && <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>}
      {state?.ok && <span className="text-sm text-emerald-600 dark:text-emerald-400">Tersimpan ✓</span>}
    </form>
  );
}
