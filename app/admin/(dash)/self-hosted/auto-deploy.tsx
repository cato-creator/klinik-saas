"use client";

import { useActionState, useState } from "react";
import { triggerAutoDeploy, type AutoDeployResult } from "./actions";

export default function AutoDeploy({ clinicId }: { clinicId: string }) {
  const [state, action, pending] = useActionState<AutoDeployResult | null, FormData>(
    triggerAutoDeploy,
    null,
  );
  const [copied, setCopied] = useState(false);

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
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Memicu pipeline CI di runner kamu: migrasi DB + seed akun otomatis, lalu (bila dicentang)
        build &amp; deploy web ke Cloudflare. Status tiap langkah masuk ke checklist sendiri.
      </p>

      <form action={action} className="space-y-3">
        <input type="hidden" name="clinic_id" value={clinicId} />
        <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" name="deploy_cloudflare" value="1" className="h-4 w-4 accent-violet-600" />
          Sekalian deploy web ke Cloudflare (butuh token + account ID Cloudflare klinik terisi)
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? "Memicu…" : "🚀 Deploy otomatis"}
        </button>
      </form>

      {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.ok && (
        <div className="space-y-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div>
            ✓ Pipeline dipicu{state.withCloudflare ? " (termasuk deploy Cloudflare)" : ""}. Pantau di
            checklist (terisi otomatis) atau di CI.
            {state.pipelineUrl && (
              <>
                {" "}
                <a
                  href={state.pipelineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  Buka CI ↗
                </a>
              </>
            )}
          </div>

          {state.ownerPassword && (
            <div className="rounded-md border border-emerald-300 bg-white/60 p-2 dark:border-emerald-800/60 dark:bg-zinc-900/40">
              <div className="mb-1 font-medium">🔑 Login owner (sampaikan ke klinik, tampil sekali):</div>
              <div>Email: <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{state.ownerEmail ?? "—"}</code></div>
              <div className="flex items-center gap-2">
                <span>Password awal:</span>
                <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{state.ownerPassword}</code>
                <button
                  type="button"
                  onClick={() => copy(state.ownerPassword!)}
                  className="rounded border border-zinc-300 px-1.5 py-0.5 text-[11px] hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  {copied ? "Tersalin" : "Salin"}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-300/70">
                Berlaku setelah job sukses. Owner sebaiknya ganti password setelah login pertama.
              </p>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Pastikan runner CI kamu online & PC menyala. Tahap Cloudflare juga butuh DNS/route diarahkan
        manual setelah deploy (langkah terakhir di checklist).
      </p>
    </div>
  );
}
