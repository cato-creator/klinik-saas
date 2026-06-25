"use client";

import { useActionState, useState } from "react";
import { saveSelfHostedSecret, revealSelfHostedSecret, type ActionResult } from "./actions";
import { SECRET_LABELS, type SecretType } from "@/lib/controlplane/self-hosted";

const SECRET_HINTS: Record<SecretType, string> = {
  supabase_service_role: "Project Settings → API → service_role (RAHASIA, bypass RLS).",
  supabase_db_password: "Password database project Supabase mereka (untuk migrasi).",
  cloudflare_token: "API token dengan izin Edit Workers + DNS untuk akun mereka.",
};

function SecretRow({ clinicId, type, present }: { clinicId: string; type: SecretType; present: boolean }) {
  const [saveState, saveAction, saving] = useActionState<ActionResult | null, FormData>(saveSelfHostedSecret, null);
  const [revealState, revealAction, revealing] = useActionState<ActionResult | null, FormData>(revealSelfHostedSecret, null);
  const [copied, setCopied] = useState(false);
  const isSet = present || saveState?.ok;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* abaikan */
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{SECRET_LABELS[type]}</div>
          <div className="text-xs text-zinc-500">{SECRET_HINTS[type]}</div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isSet
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          {isSet ? "Tersimpan ✓" : "Belum diatur"}
        </span>
      </div>

      {/* Form simpan / ganti */}
      <form action={saveAction} className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="clinic_id" value={clinicId} />
        <input type="hidden" name="secret_type" value={type} />
        <input
          name="value"
          type="password"
          autoComplete="off"
          placeholder={isSet ? "Masukkan nilai baru untuk mengganti…" : "Tempel nilai secret…"}
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? "Menyimpan…" : isSet ? "Ganti" : "Simpan"}
        </button>
      </form>
      {saveState?.error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{saveState.error}</p>}
      {saveState?.ok && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Secret tersimpan ✓</p>}

      {/* Reveal (dicatat di audit) */}
      {isSet && (
        <div className="mt-2">
          {!revealState?.value ? (
            <form action={revealAction}>
              <input type="hidden" name="clinic_id" value={clinicId} />
              <input type="hidden" name="secret_type" value={type} />
              <button
                type="submit"
                disabled={revealing}
                className="text-xs font-medium text-amber-700 hover:underline disabled:opacity-60 dark:text-amber-400"
              >
                {revealing ? "Membuka…" : "👁 Tampilkan nilai (dicatat di audit)"}
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                {revealState.value}
              </code>
              <button
                type="button"
                onClick={() => copy(revealState.value!)}
                className="shrink-0 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {copied ? "Tersalin" : "Salin"}
              </button>
            </div>
          )}
          {revealState?.error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{revealState.error}</p>}
        </div>
      )}
    </div>
  );
}

export default function SecretVault({
  clinicId,
  presence,
}: {
  clinicId: string;
  presence: Record<SecretType, boolean>;
}) {
  const types: SecretType[] = ["supabase_service_role", "supabase_db_password", "cloudflare_token"];
  return (
    <div className="space-y-3">
      {types.map((t) => (
        <SecretRow key={t} clinicId={clinicId} type={t} present={presence[t]} />
      ))}
      <p className="text-xs text-zinc-500">
        🔒 Secret disimpan terenkripsi (AES-256-GCM). Master key ada di env Worker, bukan di database.
        Nilai hanya muncul saat kamu klik &quot;Tampilkan&quot; — dan setiap pembukaan dicatat di audit.
      </p>
    </div>
  );
}
