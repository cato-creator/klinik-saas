"use client";

import { useActionState } from "react";
import { triggerAutoDeploy, type AutoDeployResult } from "./actions";

export default function AutoDeploy({ clinicId }: { clinicId: string }) {
  const [state, action, pending] = useActionState<AutoDeployResult | null, FormData>(
    triggerAutoDeploy,
    null,
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Memicu pipeline GitLab di runner kamu: migrasi DB + seed akun otomatis, lalu (bila
        diaktifkan) build &amp; deploy Cloudflare. Status tiap langkah masuk ke checklist sendiri.
      </p>

      <form action={action}>
        <input type="hidden" name="clinic_id" value={clinicId} />
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
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          ✓ Pipeline dipicu. Pantau progres di checklist (terisi otomatis) atau di GitLab.
          {state.pipelineUrl && (
            <>
              {" "}
              <a
                href={state.pipelineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                Buka pipeline ↗
              </a>
            </>
          )}
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Pastikan runner GitLab kamu online & PC menyala. Tahap Cloudflare aktif bila CI/CD variable
        <code className="mx-1 rounded bg-zinc-100 px-1 dark:bg-zinc-800">DEPLOY_CLOUDFLARE=1</code>
        diset di GitLab.
      </p>
    </div>
  );
}
