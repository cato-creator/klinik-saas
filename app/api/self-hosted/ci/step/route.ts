// Runner melaporkan status tiap langkah provisioning (checklist) + hasil akhir job.
// Diautentikasi dengan token job (sama seperti /ci/config).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createControlPlaneClient } from "@/lib/controlplane/client";
import { verifyDeployJob, setDeployJobStatus } from "@/lib/controlplane/deploy-jobs";
import { logSelfHostedAudit, PROVISIONING_STEPS } from "@/lib/controlplane/self-hosted";

const STEP_KEYS = PROVISIONING_STEPS.map((s) => s.key) as [string, ...string[]];

const schema = z.object({
  clinicId: z.string().uuid(),
  jobToken: z.string().min(16),
  stepKey: z.enum(STEP_KEYS),
  status: z.enum(["pending", "done", "skipped", "failed"]),
  notes: z.string().max(500).optional(),
  // opsional: tandai hasil keseluruhan job saat langkah terakhir/gagal
  jobStatus: z.enum(["succeeded", "failed"]).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  const { clinicId, jobToken, stepKey, status, notes, jobStatus } = parsed.data;

  const job = await verifyDeployJob(clinicId, jobToken);
  if (!job.ok) return NextResponse.json({ error: "Token tidak valid / kedaluwarsa" }, { status: 401 });

  const db = createControlPlaneClient();
  const { error } = await db.from("selfhosted_provisioning_steps").upsert(
    {
      clinic_id: clinicId,
      step_key: stepKey,
      status,
      notes: notes ?? null,
      done_at: status === "done" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clinic_id,step_key" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (jobStatus) {
    await setDeployJobStatus(job.jobId, jobStatus);
    // Refleksikan ke status provisioning klinik (live bila sukses, failed bila gagal).
    await db
      .from("selfhosted_clinics")
      .update({
        provisioning_status: jobStatus === "succeeded" ? "live" : "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", clinicId);
  }

  await logSelfHostedAudit({
    action: "deploy.step",
    clinicId,
    metadata: { job_id: job.jobId, step_key: stepKey, status, job_status: jobStatus ?? null },
    ip: request.headers.get("cf-connecting-ip"),
  });

  return NextResponse.json({ ok: true });
}
