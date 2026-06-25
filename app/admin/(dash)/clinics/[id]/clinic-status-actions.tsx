"use client";

import { useState } from "react";
import { useActionState } from "react";
import {
  setClinicStatus,
  archiveClinicReleaseSubdomain,
  deleteClinicPermanent,
  type ActionResult,
} from "../../../actions";

export default function ClinicStatusActions({
  clinicId,
  status,
  subdomain,
}: {
  clinicId: string;
  status: string;
  subdomain: string;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    setClinicStatus,
    null,
  );
  const [archState, archAction, archPending] = useActionState<ActionResult | null, FormData>(
    archiveClinicReleaseSubdomain,
    null,
  );
  const [delState, delAction, delPending] = useActionState<ActionResult | null, FormData>(
    deleteClinicPermanent,
    null,
  );

  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const buttons: { target: string; label: string; cls: string }[] = [];
  if (status === "pending_approval") {
    buttons.push({ target: "rejected", label: "Tolak pendaftaran", cls: "text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40" });
  }
  if (status === "active" || status === "expired") {
    buttons.push({ target: "suspended", label: "Suspend klinik", cls: "text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-900 dark:hover:bg-amber-950/40" });
  }
  if (status === "suspended") {
    buttons.push({ target: "active", label: "Aktifkan kembali", cls: "text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950/40" });
  }

  // Subdomain hanya bisa "dilepas" bila sudah ter-assign (bukan placeholder pending).
  const canArchive = ["active", "expired", "suspended", "rejected"].includes(status);

  return (
    <div className="mt-4 space-y-4">
      {/* Aksi status */}
      {buttons.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {buttons.map((b) => (
            <form key={b.target} action={action}>
              <input type="hidden" name="clinic_id" value={clinicId} />
              <input type="hidden" name="target" value={b.target} />
              <button
                type="submit"
                disabled={pending}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${b.cls}`}
              >
                {b.label}
              </button>
            </form>
          ))}
        </div>
      )}
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      {/* Zona berbahaya */}
      <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Zona berbahaya</p>

        <div className="mt-2 flex flex-wrap gap-2">
          {canArchive && (
            <form action={archAction}>
              <input type="hidden" name="clinic_id" value={clinicId} />
              <button
                type="submit"
                disabled={archPending}
                title="Klinik dinonaktifkan & subdomain dibebaskan, tapi semua data tetap tersimpan."
                className="rounded-lg border border-amber-200 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-950/40"
              >
                {archPending ? "Memproses…" : "Lepas subdomain (arsipkan)"}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => setShowDelete((v) => !v)}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Hapus permanen…
          </button>
        </div>

        <p className="mt-2 text-xs text-zinc-500">
          <b>Arsipkan</b>: subdomain bisa dipakai klinik lain, data tetap aman. <b>Hapus permanen</b>:
          menghapus klinik + seluruh pasien, booking, dan rekam medis selamanya.
        </p>

        {archState?.error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{archState.error}</p>}

        {showDelete && (
          <form action={delAction} className="mt-3 rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
            <input type="hidden" name="clinic_id" value={clinicId} />
            <p className="text-sm text-red-700 dark:text-red-300">
              Tindakan ini <b>tidak bisa dibatalkan</b>. Untuk konfirmasi, ketik subdomain klinik:{" "}
              <code className="rounded bg-white px-1 py-0.5 font-mono text-red-700 dark:bg-zinc-900">{subdomain}</code>
            </p>
            <input
              name="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={subdomain}
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-red-500 dark:border-red-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="submit"
                disabled={delPending || confirmText !== subdomain}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {delPending ? "Menghapus…" : "Hapus permanen sekarang"}
              </button>
              <button
                type="button"
                onClick={() => { setShowDelete(false); setConfirmText(""); }}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Batal
              </button>
            </div>
            {delState?.error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{delState.error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
