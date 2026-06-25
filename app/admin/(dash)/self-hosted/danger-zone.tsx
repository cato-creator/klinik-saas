"use client";

import { useActionState, useState } from "react";
import { deleteSelfHostedClinic, type ActionResult } from "./actions";

export default function DangerZone({ clinicId, clinicName }: { clinicId: string; clinicName: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(deleteSelfHostedClinic, null);
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/50 dark:bg-red-950/20">
      <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Hapus dari daftar</h2>
      <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">
        Menghapus catatan klinik ini + secret-nya dari control-plane kita. <strong>Tidak</strong> menyentuh
        Supabase/Cloudflare milik klinik. Untuk klinik salah input / test.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          Hapus klinik…
        </button>
      ) : (
        <form action={action} className="mt-3 space-y-2">
          <input type="hidden" name="clinic_id" value={clinicId} />
          <p className="text-xs text-red-600 dark:text-red-400">
            Ketik nama klinik untuk konfirmasi: <strong>{clinicName}</strong>
          </p>
          <input
            name="confirm"
            placeholder={clinicName}
            className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-red-800 dark:bg-zinc-900"
          />
          {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {pending ? "Menghapus…" : "Hapus permanen"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Batal
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
