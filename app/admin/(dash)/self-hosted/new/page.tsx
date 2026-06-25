import Link from "next/link";
import { requireSuperAdmin } from "@/lib/admin/guard";
import ClinicForm from "../clinic-form";

export const dynamic = "force-dynamic";

export default async function NewSelfHostedPage() {
  await requireSuperAdmin();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/self-hosted" className="text-sm text-zinc-500 hover:underline">
        ← Kembali ke daftar
      </Link>
      <h1 className="mb-1 mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Tambah Klinik Self-Hosted</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Daftarkan klinik dulu. Setelah dibuat, kamu bisa isi brankas secret &amp; checklist provisioning di halaman detailnya.
      </p>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <ClinicForm />
      </div>
    </div>
  );
}
