"use client";

import { useActionState, useState } from "react";
import { extendSubscription, type ActionResult } from "../../../actions";

const field =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
const label = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export default function SubscriptionManager({
  clinicId,
  planPrices = {},
}: {
  clinicId: string;
  planPrices?: Record<string, number>;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    extendSubscription,
    null,
  );
  const [amount, setAmount] = useState<number>(planPrices["1_month"] ?? 0);

  return (
    <form action={action} className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
      <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Perpanjang langganan</h3>
      <input type="hidden" name="clinic_id" value={clinicId} />
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <label className={label}>Plan</label>
          <select
            name="plan_type"
            defaultValue="1_month"
            onChange={(e) => setAmount(planPrices[e.target.value] ?? 0)}
            className={field}
          >
            <option value="1_month">1 Bulan</option>
            <option value="3_month">3 Bulan</option>
            <option value="1_year">1 Tahun</option>
          </select>
        </div>
        <div>
          <label className={label}>Harga (Rp)</label>
          <input
            name="amount"
            type="number"
            min="0"
            step="1000"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className={field}
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "…" : "Perpanjang"}
          </button>
        </div>
      </div>
      {state?.error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {state?.ok && (
        <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">Langganan diperpanjang ✓</p>
      )}
      <p className="mt-2 text-xs text-zinc-500">
        Jika masih aktif, perpanjangan ditambahkan dari sisa masa aktif.
      </p>
    </form>
  );
}
