// Tulis baris audit log (server-only, service role). Lihat CLAUDE.md §4 audit_logs.
import { createAdminClient } from "@/lib/supabase/admin";

type AuditInput = {
  actorUserId: string;
  actorRole?: string;
  clinicId?: string | null;
  action: string;            // mis. 'clinic.approve', 'subscription.renew'
  entityType?: string;       // 'clinic' | 'subscription' | ...
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAudit(input: AuditInput): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    actor_user_id: input.actorUserId,
    actor_role: input.actorRole ?? "super_admin",
    clinic_id: input.clinicId ?? null,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? null,
  });
  // Audit jangan menggagalkan operasi utama; cukup log ke console bila gagal.
  if (error) console.error("writeAudit gagal:", error.message);
}

// Audit khusus AKSES/UBAH rekam medis (CLAUDE.md §9.1). Wajib mencatat siapa
// (actorUserId + actorRole sebenarnya, bukan default super_admin) membuka/mengubah
// data medis pasien. PENTING: metadata TIDAK boleh memuat isi medis (S/O/A/P) —
// hanya id pasien/entity & flag ringan untuk jejak privasi.
type MedicalAuditInput = {
  actorUserId: string;
  actorRole: string;        // 'therapist' | 'admin' | 'owner'
  clinicId: string;
  action: string;           // 'soap.view' | 'soap.update' | 'soap.delete' | 'assessment.delete' | ...
  entityType: string;       // 'session_note' | 'assessment' | 'diagnosis' | 'treatment' | 'goal' | 'patient'
  entityId?: string | null;
  patientId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logMedicalAccess(input: MedicalAuditInput): Promise<void> {
  await writeAudit({
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    clinicId: input.clinicId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? input.patientId ?? null,
    metadata: {
      ...(input.patientId ? { patient_id: input.patientId } : {}),
      ...(input.metadata ?? {}),
    },
  });
}
