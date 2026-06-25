import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/admin/guard";
import { createControlPlaneClient } from "@/lib/controlplane/client";
import {
  getSecretPresence,
  type SelfHostedClinic,
  type ProvisioningStep,
  type AuditEntry,
} from "@/lib/controlplane/self-hosted";
import { formatDatetime } from "@/lib/utils";
import ClinicForm from "../clinic-form";
import SecretVault from "../secret-vault";
import StepsChecklist from "../steps-checklist";
import DeployBundle from "../deploy-bundle";
import AutoDeploy from "../auto-deploy";
import DangerZone from "../danger-zone";
import { ProvBadge, LicenseBadge } from "../badges";

export const dynamic = "force-dynamic";

const AUDIT_LABEL: Record<string, string> = {
  "clinic.create": "Klinik dibuat",
  "clinic.update": "Klinik diubah",
  "clinic.delete": "Klinik dihapus",
  "secret.create": "Secret ditambahkan",
  "secret.update": "Secret diganti",
  "secret.reveal": "Secret ditampilkan",
  "bundle.generate": "Paket deploy dibuat",
  "deploy.trigger": "Deploy otomatis dipicu",
  "deploy.config_fetch": "Runner mengambil config",
  "deploy.step": "Langkah deploy dilaporkan",
  "step.update": "Langkah diperbarui",
};

const card = "rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";

export default async function SelfHostedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const db = createControlPlaneClient();
  const [clinicRes, stepsRes, auditRes, presence] = await Promise.all([
    db.from("selfhosted_clinics").select("*").eq("id", id).maybeSingle(),
    db.from("selfhosted_provisioning_steps").select("step_key, status, notes, done_at").eq("clinic_id", id),
    db
      .from("selfhosted_audit_logs")
      .select("id, actor_email, action, secret_type, metadata, created_at")
      .eq("clinic_id", id)
      .order("created_at", { ascending: false })
      .limit(25),
    getSecretPresence(id),
  ]);

  const clinic = clinicRes.data as SelfHostedClinic | null;
  if (!clinic) notFound();

  const steps = (stepsRes.data ?? []) as ProvisioningStep[];
  const audit = (auditRes.data ?? []) as AuditEntry[];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/self-hosted" className="text-sm text-zinc-500 hover:underline">
          ← Kembali ke daftar
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{clinic.name}</h1>
          <ProvBadge status={clinic.provisioning_status} />
          <LicenseBadge status={clinic.license_status} />
        </div>
        {clinic.target_domain && (
          <a
            href={`https://${clinic.target_domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
          >
            {clinic.target_domain} ↗
          </a>
        )}
      </div>

      {/* Brankas secret */}
      <section className={card}>
        <h2 className="mb-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">🔒 Brankas secret</h2>
        <p className="mb-3 text-xs text-zinc-500">Kredensial infrastruktur klinik — terenkripsi.</p>
        <SecretVault clinicId={clinic.id} presence={presence} />
      </section>

      {/* Deploy otomatis (Fase 2B — pipeline GitLab) */}
      <section className={card}>
        <h2 className="mb-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">🚀 Deploy otomatis</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Picu pipeline GitLab di runner sendiri untuk provisioning otomatis.
        </p>
        <AutoDeploy clinicId={clinic.id} />
      </section>

      {/* Paket deploy (Fase 2A — semi-otomatis / cadangan manual) */}
      <section className={card}>
        <h2 className="mb-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">⚙️ Paket deploy (manual)</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Cadangan: rakit config + perintah siap-jalankan untuk provisioning manual.
        </p>
        <DeployBundle clinicId={clinic.id} />
      </section>

      {/* Checklist provisioning */}
      <section className={card}>
        <h2 className="mb-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">📋 Checklist provisioning</h2>
        <p className="mb-2 text-xs text-zinc-500">
          Tandai tiap langkah deploy sesuai panduan di paket deploy.
        </p>
        <StepsChecklist clinicId={clinic.id} steps={steps} />
      </section>

      {/* Data klinik & infra */}
      <section className={card}>
        <h2 className="mb-4 text-sm font-semibold text-zinc-800 dark:text-zinc-200">Data klinik &amp; infrastruktur</h2>
        <ClinicForm clinic={clinic} />
      </section>

      {/* Audit */}
      <section className={card}>
        <h2 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">🧾 Riwayat aktivitas</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-zinc-500">Belum ada aktivitas.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            {audit.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <span className="text-zinc-800 dark:text-zinc-200">{AUDIT_LABEL[a.action] ?? a.action}</span>
                  {a.secret_type && <span className="ml-1 text-xs text-zinc-500">({a.secret_type})</span>}
                  <div className="text-xs text-zinc-500">{a.actor_email ?? "—"}</div>
                </div>
                <time className="shrink-0 text-xs text-zinc-400">{formatDatetime(a.created_at)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DangerZone clinicId={clinic.id} clinicName={clinic.name} />
    </div>
  );
}
