// Helper format tampilan (mata uang, tanggal, plan).

export function formatRupiah(n: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(n ?? 0));
}

export function formatRupiahShort(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}jt`;
  if (v >= 1_000) return `Rp ${Math.round(v / 1_000)}rb`;
  return `Rp ${Math.round(v)}`;
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

export const PLAN_LABEL: Record<string, string> = {
  "1_month": "1 Bulan",
  "3_month": "3 Bulan",
  "1_year": "1 Tahun",
};

export const STATUS_LABEL: Record<string, string> = {
  pending_approval: "Menunggu approval",
  active: "Aktif",
  expired: "Expired",
  suspended: "Suspended",
  rejected: "Ditolak",
};

export const CLINIC_TYPE_LABEL: Record<string, string> = {
  fisioterapi: "Fisioterapi",
  okupasi_terapi: "Okupasi Terapi",
  terapi_wicara: "Terapi Wicara",
};

// Tanggal format panjang Indonesia, mis. "24 Juni 2026". Dipakai di dokumen surat.
export function formatDateLong(d: string | Date | null | undefined): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(d));
}

// Ubah angka rupiah jadi kata-kata Indonesia (untuk "terbilang" di kwitansi).
// Mis. 150000 -> "seratus lima puluh ribu".
export function terbilang(input: number | null | undefined): string {
  const n = Math.floor(Math.abs(Number(input) || 0));
  if (n === 0) return "nol";
  const satuan = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  const toWords = (x: number): string => {
    if (x < 12) return satuan[x];
    if (x < 20) return `${toWords(x - 10)} belas`;
    if (x < 100) return `${toWords(Math.floor(x / 10))} puluh${x % 10 ? ` ${toWords(x % 10)}` : ""}`;
    if (x < 200) return `seratus${x - 100 ? ` ${toWords(x - 100)}` : ""}`;
    if (x < 1000) return `${toWords(Math.floor(x / 100))} ratus${x % 100 ? ` ${toWords(x % 100)}` : ""}`;
    if (x < 2000) return `seribu${x - 1000 ? ` ${toWords(x - 1000)}` : ""}`;
    if (x < 1_000_000) return `${toWords(Math.floor(x / 1000))} ribu${x % 1000 ? ` ${toWords(x % 1000)}` : ""}`;
    if (x < 1_000_000_000) return `${toWords(Math.floor(x / 1_000_000))} juta${x % 1_000_000 ? ` ${toWords(x % 1_000_000)}` : ""}`;
    if (x < 1_000_000_000_000) return `${toWords(Math.floor(x / 1_000_000_000))} miliar${x % 1_000_000_000 ? ` ${toWords(x % 1_000_000_000)}` : ""}`;
    return `${toWords(Math.floor(x / 1_000_000_000_000))} triliun${x % 1_000_000_000_000 ? ` ${toWords(x % 1_000_000_000_000)}` : ""}`;
  };
  return toWords(n).replace(/\s+/g, " ").trim();
}

// commission_rate disimpan sebagai pecahan (0.10) → tampilkan "10%".
export function formatPercent(rate: number | null | undefined): string {
  const v = Number(rate ?? 0) * 100;
  return `${Number.isInteger(v) ? v : v.toFixed(2).replace(/\.?0+$/, "")}%`;
}

// Hitung expires_at dari plan_type.
export function expiresFromPlan(plan: string, from: Date = new Date()): Date {
  const d = new Date(from);
  if (plan === "1_month") d.setMonth(d.getMonth() + 1);
  else if (plan === "3_month") d.setMonth(d.getMonth() + 3);
  else if (plan === "1_year") d.setFullYear(d.getFullYear() + 1);
  return d;
}
