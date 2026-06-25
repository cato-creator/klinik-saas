// Runner (PC kita) mengambil config deploy terdekripsi via token job sekali-pakai.
// Diautentikasi DENGAN token job (bukan sesi super admin) — runner bukan user login.
// Token diverifikasi terhadap control-plane; config berisi secret → akses ter-audit.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyDeployJob } from "@/lib/controlplane/deploy-jobs";
import { assembleBundleForClinic } from "@/lib/controlplane/provision";
import { logSelfHostedAudit } from "@/lib/controlplane/self-hosted";

const schema = z.object({
  clinicId: z.string().uuid(),
  jobToken: z.string().min(16),
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
  const { clinicId, jobToken } = parsed.data;

  const job = await verifyDeployJob(clinicId, jobToken);
  if (!job.ok) return NextResponse.json({ error: "Token tidak valid / kedaluwarsa" }, { status: 401 });

  const assembled = await assembleBundleForClinic(clinicId, job.seedPassword);
  if (!assembled.ok) return NextResponse.json({ error: assembled.error }, { status: 400 });

  await logSelfHostedAudit({
    action: "deploy.config_fetch",
    clinicId,
    metadata: { job_id: job.jobId, missing: assembled.bundle.missing },
    ip: request.headers.get("cf-connecting-ip"),
  });

  return NextResponse.json({
    configJson: assembled.bundle.configJson,
    wranglerJson: assembled.bundle.wranglerJson,
    workerName: assembled.bundle.workerName,
    missing: assembled.bundle.missing,
  });
}
