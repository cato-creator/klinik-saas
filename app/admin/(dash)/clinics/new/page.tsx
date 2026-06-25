import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NewClinicForm from "./new-clinic-form";

export const dynamic = "force-dynamic";

export default async function NewClinicPage() {
  const supabase = await createClient();
  const { data: affiliates } = await supabase
    .from("affiliates")
    .select("id, full_name")
    .eq("status", "active")
    .order("full_name", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/clinics" className="text-sm text-zinc-500 hover:underline">
        ← Kembali ke daftar
      </Link>
      <h1 className="mb-1 mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Tambah Klinik
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        Buat klinik + akun owner. Klinik masuk antrian <b>menunggu approval</b>; assign subdomain &amp;
        langganan saat approve.
      </p>
      <NewClinicForm affiliates={affiliates ?? []} />
    </div>
  );
}
