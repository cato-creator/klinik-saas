"use client";

import { useActionState } from "react";
import { updatePlanPrices, type ActionResult } from "../../actions";

const PLANS: { key: string; label: string }[] = [
  { key: "1_month", label: "1 Bulan" },
  { key: "3_month", label: "3 Bulan" },
  { key: "1_year", label: "1 Tahun" },
];

export default function PlanPricesForm({ prices }: { prices: Record<string, number> }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updatePlanPrices, null);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((p) => (
          <div key={p.key}>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{p.label} (Rp)</label>
            <input
              name={`price_${p.key}`}
              type="number"
              min="0"
              step="1000"
              defaultValue={prices[p.key] ?? 0}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
        ))}
      </div>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600 dark:text-emerald-400">Harga tersimpan ✓</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : "Simpan harga"}
      </button>
      <p className="text-xs text-zinc-500">
        Harga ini menjadi nilai default saat approve / perpanjang langganan — tetap bisa diubah per transaksi.
      </p>
    </form>
  );
}
