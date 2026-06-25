"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createAffiliate, type ActionResult } from "../../../actions";

const field =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
const label = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export default function NewAffiliateForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createAffiliate,
    null,
  );

  if (state?.ok && state.tempPassword) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/40">
        <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
          Affiliator berhasil dibuat ✓
        </h2>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
          Sampaikan kredensial berikut ke affiliator secara manual — password ini hanya
          ditampilkan <b>sekali</b>. Affiliator login lewat halaman <b>/auth/login</b>.
        </p>
        <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-4 font-mono text-sm dark:border-emerald-900 dark:bg-zinc-900">
          <div className="text-zinc-500">Password sementara:</div>
          <div className="mt-1 select-all text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {state.tempPassword}
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <Link href="/admin/affiliates" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Ke daftar affiliator
          </Link>
          <Link href="/admin/affiliates/new" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">
            Tambah lagi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-4">
          <div>
            <label className={label}>Nama affiliator *</label>
            <input name="full_name" required className={field} placeholder="Nama lengkap" />
          </div>
          <div>
            <label className={label}>Email *</label>
            <input name="email" type="email" required className={field} placeholder="affiliator@contoh.com" />
            <p className="mt-1 text-xs text-zinc-500">Dipakai untuk login. Password sementara dibuat otomatis.</p>
          </div>
          <div>
            <label className={label}>No. HP</label>
            <input name="phone_number" className={field} placeholder="08xx (opsional)" />
          </div>
          <div>
            <label className={label}>Persentase komisi (%) *</label>
            <input
              name="commission_rate"
              type="number"
              min="0"
              max="100"
              step="0.5"
              defaultValue={10}
              required
              className={field}
            />
            <p className="mt-1 text-xs text-zinc-500">Mis. 10 = 10% dari harga langganan klinik yang dibawa.</p>
          </div>
          <div>
            <label className={label}>Info pembayaran komisi</label>
            <textarea
              name="payout_info"
              rows={2}
              className={field}
              placeholder="Mis. BCA 1234567890 a.n. Nama (opsional)"
            />
          </div>
        </div>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Buat affiliator"}
        </button>
        <Link href="/admin/affiliates" className="rounded-lg border border-zinc-300 px-5 py-2 text-sm dark:border-zinc-700">
          Batal
        </Link>
      </div>
    </form>
  );
}
