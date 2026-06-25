"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createClinicDirect, type ActionResult } from "../../../actions";
import { DisciplinePicker } from "@/components/disciplines/discipline-picker";

const field =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
const label = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

type AffiliateOption = { id: string; full_name: string };

export default function NewClinicForm({ affiliates }: { affiliates: AffiliateOption[] }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createClinicDirect,
    null,
  );

  if (state?.ok && state.tempPassword) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/40">
        <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
          Klinik berhasil dibuat ✓
        </h2>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
          Status klinik: <b>menunggu approval</b>. Sampaikan kredensial berikut ke owner secara manual.
        </p>
        <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-4 font-mono text-sm dark:border-emerald-900 dark:bg-zinc-900">
          <div className="text-zinc-500">Password owner:</div>
          <div className="mt-1 select-all text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {state.tempPassword}
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <Link href="/admin/clinics" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Ke daftar klinik
          </Link>
          <Link href="/admin/clinics/new" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">
            Tambah lagi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">Data Klinik</h2>
        <div className="space-y-4">
          <div>
            <label className={label}>Nama klinik *</label>
            <input name="name" required className={field} placeholder="Klinik Sehat Mandiri" />
          </div>
          <DisciplinePicker label="Layanan klinik *" />
          <div>
            <label className={label}>Alamat</label>
            <input name="address" className={field} placeholder="Jl. ... (opsional)" />
          </div>
          <div>
            <label className={label}>No. HP klinik</label>
            <input name="phone_number" className={field} placeholder="08xx (opsional)" />
          </div>
          {affiliates.length > 0 && (
            <div>
              <label className={label}>Affiliator (opsional)</label>
              <select name="affiliate_id" defaultValue="" className={field}>
                <option value="">— Tanpa affiliator —</option>
                {affiliates.map((a) => (
                  <option key={a.id} value={a.id}>{a.full_name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">Pilih bila klinik ini rujukan affiliator (untuk komisi).</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">Akun Owner</h2>
        <div className="space-y-4">
          <div>
            <label className={label}>Nama owner *</label>
            <input name="owner_name" required className={field} placeholder="Nama lengkap owner" />
          </div>
          <div>
            <label className={label}>Email owner *</label>
            <input name="owner_email" type="email" required className={field} placeholder="owner@contoh.com" />
          </div>
          <div>
            <label className={label}>Password owner *</label>
            <input name="owner_password" type="text" required minLength={8} className={field} placeholder="Minimal 8 karakter" />
            <p className="mt-1 text-xs text-zinc-500">Tentukan password login owner. Sampaikan ke owner secara manual.</p>
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
          {pending ? "Menyimpan…" : "Buat klinik"}
        </button>
        <Link href="/admin/clinics" className="rounded-lg border border-zinc-300 px-5 py-2 text-sm dark:border-zinc-700">
          Batal
        </Link>
      </div>
    </form>
  );
}
