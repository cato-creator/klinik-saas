"use client";

import { useActionState } from "react";
import { updateProvisioningStep, type ActionResult } from "./actions";
import { PROVISIONING_STEPS, type ProvisioningStep } from "@/lib/controlplane/self-hosted";

const STATUS_OPTS: { value: string; label: string }[] = [
  { value: "pending", label: "Belum" },
  { value: "done", label: "Selesai" },
  { value: "skipped", label: "Dilewati" },
  { value: "failed", label: "Gagal" },
];

const DOT: Record<string, string> = {
  pending: "bg-zinc-300 dark:bg-zinc-600",
  done: "bg-emerald-500",
  skipped: "bg-zinc-400",
  failed: "bg-red-500",
};

function StepRow({ clinicId, step, current }: { clinicId: string; step: { key: string; label: string; hint: string }; current?: ProvisioningStep }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateProvisioningStep, null);
  const status = current?.status ?? "pending";

  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[status] ?? DOT.pending}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{step.label}</div>
        <div className="truncate text-xs text-zinc-500">{step.hint}</div>
        {state?.error && <div className="text-xs text-red-600 dark:text-red-400">{state.error}</div>}
      </div>
      <form action={action} className="shrink-0">
        <input type="hidden" name="clinic_id" value={clinicId} />
        <input type="hidden" name="step_key" value={step.key} />
        <select
          name="status"
          defaultValue={status}
          disabled={pending}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </form>
    </div>
  );
}

export default function StepsChecklist({ clinicId, steps }: { clinicId: string; steps: ProvisioningStep[] }) {
  const byKey = new Map(steps.map((s) => [s.step_key, s]));
  const doneCount = PROVISIONING_STEPS.filter((s) => byKey.get(s.key)?.status === "done").length;

  return (
    <div>
      <div className="mb-2 text-xs text-zinc-500">{doneCount}/{PROVISIONING_STEPS.length} langkah selesai</div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {PROVISIONING_STEPS.map((s) => (
          <StepRow key={s.key} clinicId={clinicId} step={s} current={byKey.get(s.key)} />
        ))}
      </div>
    </div>
  );
}
