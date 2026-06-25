// Generate komisi affiliator saat sebuah langganan (subscription) tercatat.
// Model RECURRING (default CLAUDE.md §3.6): komisi dibuat saat approval awal
// DAN setiap perpanjangan/renewal. Nominal = commission_rate (snapshot) × amount.
//
// WAJIB dijalankan SERVER-SIDE (service role). Jangan pernah dari client.
// Idempoten: tabel affiliate_commissions punya unique(subscription_id), jadi
// pemanggilan ganda untuk subscription yang sama tidak menggandakan komisi.
import type { SupabaseClient } from "@supabase/supabase-js";

type GenInput = {
  clinicId: string;
  subscriptionId: string;
  amount: number;
};

/**
 * Buat baris komisi untuk subscription bila klinik punya affiliate aktif.
 * Mengembalikan id komisi yang dibuat, atau null bila tidak ada affiliate /
 * affiliate tidak aktif / amount 0.
 *
 * Tidak melempar error — komisi tidak boleh menggagalkan approval/renewal.
 * Kegagalan cukup di-log ke console.
 */
export async function generateCommission(
  admin: SupabaseClient,
  { clinicId, subscriptionId, amount }: GenInput,
): Promise<string | null> {
  try {
    if (!Number.isFinite(amount) || amount <= 0) return null;

    // 1) Ambil affiliate_id klinik.
    const { data: clinic } = await admin
      .from("clinics")
      .select("affiliate_id")
      .eq("id", clinicId)
      .maybeSingle();
    const affiliateId = clinic?.affiliate_id as string | null | undefined;
    if (!affiliateId) return null;

    // 2) Ambil rate & status affiliate. Affiliate non-aktif tidak dapat komisi.
    const { data: aff } = await admin
      .from("affiliates")
      .select("commission_rate, status")
      .eq("id", affiliateId)
      .maybeSingle();
    if (!aff || aff.status !== "active") return null;

    const rate = Number(aff.commission_rate ?? 0);
    if (!Number.isFinite(rate) || rate <= 0) return null;

    const commissionAmount = Math.round(rate * amount * 100) / 100;

    // 3) Insert komisi (snapshot rate). Unique(subscription_id) menjaga idempoten.
    const { data, error } = await admin
      .from("affiliate_commissions")
      .insert({
        affiliate_id: affiliateId,
        clinic_id: clinicId,
        subscription_id: subscriptionId,
        rate,
        amount: commissionAmount,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      // 23505 = unique violation (komisi sudah ada untuk subscription ini) → aman.
      if ((error as { code?: string }).code !== "23505") {
        console.error("generateCommission gagal:", error.message);
      }
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.error("generateCommission exception:", e);
    return null;
  }
}
