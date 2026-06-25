"use client";

import { useActionState, useState } from "react";
import { approveClinic, type ActionResult } from "../../../actions";
import { DisciplinePicker } from "@/components/disciplines/discipline-picker";

const field =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
const label = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export default function ApproveForm({
  clinicId,
  specializations,
  suggestedSubdomain,
  planPrices = {},
}: {
  clinicId: string;
  specializations: string[];
  suggestedSubdomain: string;
  planPrices?: Record<string, number>;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    approveClinic,
    null,
  );
  const [amount, setAmount] = useState<number>(planPrices["1_month"] ?? 0);

  return (
    <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/50 p-5 dark:border-emerald-800 dark:bg-emerald-950/20">
      <h2 className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
        Approve &amp; aktifkan klinik
      </h2>
      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="clinic_id" value={clinicId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Subdomain *</label>
            <div className="mt-1 flex items-center">
              <input
                name="subdomain"
                required
                defaultValue={suggestedSubdomain}
                className="w-full rounded-l-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="namaklinik"
              />
              <span className="rounded-r-lg border border-l-0 border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">
                .{process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "platformlo.com"}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">huruf kecil, angka, dan '-'. 3–63 karakter.</p>
          </div>
          <div className="sm:col-span-2">
            <DisciplinePicker label="Layanan klinik" defaultSelected={specializations} />
          </div>
          <div>
            <label className={label}>Plan *</label>
            <select
              name="plan_type"
              required
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
            <label className={label}>Harga dibayar (Rp) *</label>
            <input
              name="amount"
              type="number"
              min="0"
              step="1000"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className={field}
            />
            <p className="mt-1 text-xs text-zinc-500">Terisi dari harga acuan plan · dasar komisi affiliator.</p>
          </div>
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Memproses…" : "Approve klinik"}
        </button>
      </form>
    </div>
  );
}
