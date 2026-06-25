// Label manusiawi + kategori untuk baris audit_logs di viewer super admin.
// Fallback ke string mentah bila action belum dikenal.

export type AuditCategory = "medis" | "keuangan" | "klinik" | "akun" | "affiliator" | "lain";

const MAP: Record<string, { label: string; category: AuditCategory }> = {
  // Klinik
  "clinic.create_direct": { label: "Tambah klinik langsung", category: "klinik" },
  "clinic.approve": { label: "Setujui klinik", category: "klinik" },
  "clinic.archive_release_subdomain": { label: "Arsipkan klinik & lepas subdomain", category: "klinik" },
  "clinic.delete_permanent": { label: "Hapus klinik permanen", category: "klinik" },
  "clinic.rejected": { label: "Tolak klinik", category: "klinik" },
  "clinic.suspended": { label: "Suspend klinik", category: "klinik" },
  "clinic.active": { label: "Aktifkan klinik", category: "klinik" },
  "clinic.assign_affiliate": { label: "Assign affiliator ke klinik", category: "affiliator" },
  // Keuangan / langganan
  "clinic.export_finance": { label: "Export laporan keuangan", category: "keuangan" },
  "subscription.renew": { label: "Perpanjang langganan", category: "keuangan" },
  "commission.paid": { label: "Tandai komisi dibayar", category: "affiliator" },
  "commission.pending": { label: "Komisi → pending", category: "affiliator" },
  "commission.cancelled": { label: "Batalkan komisi", category: "affiliator" },
  // Affiliator
  "affiliate.create": { label: "Tambah affiliator", category: "affiliator" },
  "affiliate.update": { label: "Ubah affiliator", category: "affiliator" },
  // Akun
  "user.reset_password": { label: "Reset password user", category: "akun" },
  "user.activate": { label: "Aktifkan akun user", category: "akun" },
  "user.deactivate": { label: "Nonaktifkan akun user", category: "akun" },
  // Medis (sensitif)
  "patient.export_full": { label: "Export data pasien + rekam medis", category: "medis" },
  "soap.view": { label: "Lihat catatan SOAP", category: "medis" },
  "soap.update": { label: "Ubah catatan SOAP", category: "medis" },
  "soap.delete": { label: "Hapus catatan SOAP", category: "medis" },
};

export function auditLabel(action: string): { label: string; category: AuditCategory } {
  if (MAP[action]) return MAP[action];
  // Heuristik kategori dari prefix.
  if (action.startsWith("soap") || action.startsWith("assessment") || action.startsWith("diagnosis") ||
      action.startsWith("treatment") || action.startsWith("goal") || action.startsWith("home_program") ||
      action.startsWith("patient")) {
    return { label: action, category: "medis" };
  }
  if (action.startsWith("subscription") || action.includes("export_finance")) return { label: action, category: "keuangan" };
  if (action.startsWith("affiliate") || action.startsWith("commission")) return { label: action, category: "affiliator" };
  if (action.startsWith("user")) return { label: action, category: "akun" };
  if (action.startsWith("clinic")) return { label: action, category: "klinik" };
  return { label: action, category: "lain" };
}

export const CATEGORY_STYLE: Record<AuditCategory, string> = {
  medis: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  keuangan: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  klinik: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  akun: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  affiliator: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  lain: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

export const CATEGORY_LABEL: Record<AuditCategory, string> = {
  medis: "Medis", keuangan: "Keuangan", klinik: "Klinik", akun: "Akun", affiliator: "Affiliator", lain: "Lain",
};
