import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/tenant/auth";

export const dynamic = "force-dynamic";

// Halaman status untuk owner yang kliniknya belum di-approve (atau ditolak).
// Sengaja BERDIRI SENDIRI (tidak memakai layout /owner yang butuh klinik aktif).
export default async function MenungguPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name, clinic_id")
    .eq("id", user.id)
    .single();

  // Bukan owner / tidak ada klinik → arahkan ke dashboard role-nya.
  if (!profile || profile.role !== "owner" || !profile.clinic_id) {
    redirect(dashboardPathForRole(profile?.role ?? "patient"));
  }

  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, status")
    .eq("id", profile.clinic_id)
    .single();

  // Sudah aktif → langsung ke dashboard owner.
  if (clinic && clinic.status !== "pending_approval" && clinic.status !== "rejected") {
    redirect("/owner/dashboard");
  }

  const rejected = clinic?.status === "rejected";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-teal-50/60 via-white to-white px-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-xl shadow-gray-900/5">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
            rejected ? "bg-red-50" : "bg-amber-50"
          }`}
        >
          {rejected ? (
            <XCircle className="h-9 w-9 text-red-500" />
          ) : (
            <Clock className="h-9 w-9 text-amber-500" />
          )}
        </div>

        <h1 className="mt-5 text-xl font-bold text-gray-900">
          {rejected ? "Pendaftaran belum disetujui" : "Sedang ditinjau"}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-600">
          {rejected ? (
            <>Maaf, pendaftaran klinik <b>{clinic?.name}</b> belum dapat disetujui. Silakan hubungi tim kami untuk informasi lebih lanjut.</>
          ) : (
            <>Halo {profile.full_name}, klinik <b>{clinic?.name}</b> sedang ditinjau tim kami. Anda akan dihubungi setelah klinik diaktifkan, lalu bisa langsung masuk ke dashboard.</>
          )}
        </p>

        <form action="/auth/signout" method="post" className="mt-6">
          <button className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50">
            Keluar
          </button>
        </form>
        <Link href="/" className="mt-3 inline-block text-xs text-gray-400 hover:text-gray-600">
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
