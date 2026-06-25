import { requireSuperAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAnalytics, type RangeKey } from "@/lib/admin/analytics";
import AnalyticsClient from "./analytics-client";

export const dynamic = "force-dynamic";

const VALID: RangeKey[] = ["30", "90", "year", "all"];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireSuperAdmin();
  const { range } = await searchParams;
  const rangeKey: RangeKey = VALID.includes(range as RangeKey) ? (range as RangeKey) : "all";
  const db = createAdminClient();
  const data = await fetchAnalytics(db, rangeKey);
  return <AnalyticsClient data={data} />;
}
