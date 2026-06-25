"use client";

import { useActionState } from "react";
import { updateAffiliate, type ActionResult } from "../../../actions";

const field =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
const label = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

type Affiliate = {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  payout_info: string | null;
  commission_rate: number;
  status: string;
};

export default function AffiliateEditForm({ affiliate }: { affiliate: Affiliate }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    updateAffiliate,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="affiliate_id" value={affiliate.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Nama</label>
          <input name="full_name" required defaultValue={affiliate.full_name} className={field} />
        </div>
        <div>
          <label className={label}>Email (login)</label>
          <input value={affiliate.email ?? "-"} disabled className={`${field} opacity-60`} />
        </div>
        <div>
          <label className={label}>No. HP</label>
          <input name="phone_number" defaultValue={affiliate.phone_number ?? ""} className={field} />
        </div>
        <div>
          <label className={label}>Persentase komisi (%)</label>
          <input
            name="commission_rate"
            type="number"
            min="0"
            max="100"
            step="0.5"
            defaultValue={Math.round(affiliate.commission_rate * 10000) / 100}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Status</label>
          <select name="status" defaultValue={affiliate.status} className={field}>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
      </div>
      <div>
        <label className={label}>Info pembayaran komisi</label>
        <textarea name="payout_info" rows={2} defaultValue={affiliate.payout_info ?? ""} className={field} />
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600 dark:text-emerald-400">Tersimpan ✓</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Menyimpan…" : "Simpan perubahan"}
      </button>
      <p className="text-xs text-zinc-500">
        Mengubah persentase komisi hanya memengaruhi komisi <b>baru</b> ke depan (komisi lama pakai rate saat dibuat).
      </p>
    </form>
  );
}
