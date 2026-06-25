"use client";

import { useActionState, useState } from "react";
import { generateDeployBundle, type DeployBundleResult } from "./actions";

type TabKey = "runbook" | "config" | "wrangler";

const TABS: { key: TabKey; label: string; filename: string }[] = [
  { key: "runbook", label: "Panduan", filename: "DEPLOY.md" },
  { key: "config", label: "config", filename: "provision.config.json" },
  { key: "wrangler", label: "wrangler", filename: "wrangler.selfhosted.jsonc" },
];

export default function DeployBundle({ clinicId }: { clinicId: string }) {
  const [state, action, pending] = useActionState<DeployBundleResult | null, FormData>(
    generateDeployBundle,
    null,
  );
  const [tab, setTab] = useState<TabKey>("runbook");
  const [copied, setCopied] = useState(false);

  const content: Record<TabKey, string | undefined> = {
    runbook: state?.runbook,
    config: state?.configJson,
    wrangler: state?.wranglerJson,
  };
  const active = TABS.find((t) => t.key === tab)!;
  const text = content[tab] ?? "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* abaikan */
    }
  }

  function download() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = active.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Merakit paket sekali-pakai (config + wrangler + panduan) untuk men-deploy klinik ini ke
        infrastruktur mereka sendiri. <strong>Berisi secret</strong> — setiap pembuatan dicatat di
        audit.
      </p>

      {!state?.ok ? (
        <form action={action}>
          <input type="hidden" name="clinic_id" value={clinicId} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? "Merakit…" : "⚙️ Buat Paket Deploy"}
          </button>
          {state?.error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{state.error}</p>}
        </form>
      ) : (
        <div className="space-y-3">
          {state.missing && state.missing.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              ⚠️ Paket belum lengkap. Lengkapi dulu: {state.missing.join(", ")}.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    tab === t.key
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-zinc-400">{active.filename}</span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={copy}
                className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {copied ? "Tersalin" : "Salin"}
              </button>
              <button
                type="button"
                onClick={download}
                className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Unduh
              </button>
            </div>
          </div>

          <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-100">
            {text}
          </pre>

          <form action={action}>
            <input type="hidden" name="clinic_id" value={clinicId} />
            <button
              type="submit"
              disabled={pending}
              className="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-60 dark:text-indigo-400"
            >
              {pending ? "Merakit…" : "↻ Buat ulang (password awal baru)"}
            </button>
          </form>

          <p className="text-xs text-zinc-500">
            🔒 Jangan commit file config/wrangler & hapus setelah deploy selesai. Tandai langkah di
            checklist saat tiap tahap beres.
          </p>
        </div>
      )}
    </div>
  );
}
