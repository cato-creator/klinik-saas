import Link from "next/link";
import NewAffiliateForm from "./new-affiliate-form";

export const metadata = { title: "Tambah Affiliator — Super Admin" };

export default function NewAffiliatePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/affiliates" className="text-sm text-zinc-500 hover:underline">
        ← Kembali ke daftar affiliator
      </Link>
      <h1 className="mb-1 mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Tambah Affiliator
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        Akun affiliator dibuat dengan password sementara. Sampaikan kredensial ke affiliator
        secara manual (konsisten dengan kebijakan notifikasi manual).
      </p>
      <NewAffiliateForm />
    </div>
  );
}
