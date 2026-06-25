import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiSuperAdmin } from "@/lib/admin/api-guard";
import { writeAudit } from "@/lib/audit";
import { sStr as S, sNum as N, type XlsxCell as Cell } from "@/lib/xlsx-spec";

// Export semua komisi affiliator (super admin). Server kirim spec JSON; browser
// merakit .xlsx (lib/xlsx-client.ts) agar `xlsx` tidak ikut ke bundle Worker.
const RP = '"Rp" #,##0';

function dstr(d: string | null | undefined): string {
  if (!d) return "";
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split("-");
  return y && m && day ? `${day}/${m}/${y}` : s;
}

export async function GET() {
  const auth = await apiSuperAdmin();
  if (!auth.ok) return auth.res;

  const db = createAdminClient();
  const { data: rows } = await db
    .from("affiliate_commissions")
    .select("affiliate_id, clinic_id, rate, amount, status, paid_at, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  const list = rows ?? [];

  const affIds = Array.from(new Set(list.map((r) => r.affiliate_id).filter(Boolean))) as string[];
  const clinicIds = Array.from(new Set(list.map((r) => r.clinic_id).filter(Boolean))) as string[];
  const [{ data: affs }, { data: clinics }] = await Promise.all([
    affIds.length ? db.from("affiliates").select("id, full_name").in("id", affIds) : Promise.resolve({ data: [] }),
    clinicIds.length ? db.from("clinics").select("id, name").in("id", clinicIds) : Promise.resolve({ data: [] }),
  ]);
  const affMap = new Map((affs ?? []).map((a) => [a.id, a.full_name as string]));
  const clinicMap = new Map((clinics ?? []).map((c) => [c.id, c.name as string]));

  const head = ["No", "Tanggal", "Affiliator", "Klinik", "Rate (%)", "Jumlah", "Status", "Dibayar"];
  const out: Cell[][] = [head.map(S)];
  list.forEach((r, i) => {
    out.push([
      N(i + 1),
      S(dstr(r.created_at as string)),
      S(affMap.get(r.affiliate_id as string) ?? ""),
      S(clinicMap.get(r.clinic_id as string) ?? ""),
      N(Math.round(Number(r.rate ?? 0) * 10000) / 100),
      N(Number(r.amount ?? 0), RP),
      S(String(r.status ?? "")),
      S(dstr(r.paid_at as string)),
    ]);
  });

  await writeAudit({
    actorUserId: auth.userId,
    actorRole: "super_admin",
    action: "commission.export",
    entityType: "affiliate_commission",
    metadata: { count: list.length },
  });

  return NextResponse.json({
    filename: `Komisi-Affiliator-${new Date().toISOString().slice(0, 10)}.xlsx`,
    spec: {
      sheets: [{
        name: "Komisi Affiliator",
        rows: out,
        cols: [{ wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 24 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 12 }],
      }],
    },
  });
}
