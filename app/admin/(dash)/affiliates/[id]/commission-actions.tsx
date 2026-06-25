"use client";

import { useActionState } from "react";
import { setCommissionStatus, type ActionResult } from "../../../actions";

export default function CommissionActions({
  commissionId,
  status,
}: {
  commissionId: string;
  status: string;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    setCommissionStatus,
    null,
  );

  // Tombol bergantung status saat ini.
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="commission_id" value={commissionId} />
      {status === "pending" && (
        <>
          <button
            type="submit"
            name="target"
            value="paid"
            disabled={pending}
            className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Tandai dibayar
          </button>
          <button
            type="submit"
            name="target"
            value="cancelled"
            disabled={pending}
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400"
          >
            Batalkan
          </button>
        </>
      )}
      {status === "paid" && (
        <button
          type="submit"
          name="target"
          value="pending"
          disabled={pending}
          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400"
        >
          Batal bayar
        </button>
      )}
      {status === "cancelled" && (
        <button
          type="submit"
          name="target"
          value="pending"
          disabled={pending}
          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400"
        >
          Aktifkan lagi
        </button>
      )}
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
