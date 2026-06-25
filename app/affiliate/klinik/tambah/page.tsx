import Link from "next/link";
import { requireAffiliate } from "@/lib/affiliate/guard";
import AddClinicForm from "./add-clinic-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tambah Klinik — Affiliator" };

export default async function AffiliateAddClinicPage() {
  await requireAffiliate();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/affiliate/klinik" className="text-sm text-gray-500 hover:underline">
        ← Kembali ke Klinik Saya
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tambah Klinik</h1>
        <p className="mt-1 text-sm text-gray-500">
          Isi data klinik &amp; owner. Klinik masuk antrian <b>menunggu approval</b> super admin.
          Komisi Anda tercatat otomatis setelah klinik disetujui &amp; berlangganan.
        </p>
      </div>
      <AddClinicForm />
    </div>
  );
}
