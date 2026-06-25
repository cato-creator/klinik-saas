import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { getClinicLanding } from "@/lib/tenant/landing";
import FisioLanding from "./_landing-templates/fisioterapi/fisio-landing";
import OkupasiLanding from "./_landing-templates/okupasi-terapi/okupasi-landing";
import WicaraLanding from "./_landing-templates/terapi-wicara/wicara-landing";

export const dynamic = "force-dynamic";

// Judul tab & favicon dinamis. Di subdomain/custom domain klinik → pakai NAMA
// KLINIK (judul absolut, tanpa imbuhan "· Platform Klinik") + logo klinik sebagai
// favicon bila ada. Di apex platform → pakai default root layout.
export async function generateMetadata(): Promise<Metadata> {
  const subdomain = (await headers()).get("x-clinic-subdomain");
  if (!subdomain) return {};

  const data = await getClinicLanding(subdomain); // ter-cache, sama dgn render
  if (!data) return { title: { absolute: "Klinik tidak ditemukan" } };

  const { clinic, content } = data;
  const tagline =
    (typeof content.tagline === "string" && content.tagline) ||
    clinic.description ||
    undefined;

  return {
    title: { absolute: tagline ? `${clinic.name} — ${tagline}` : clinic.name },
    description: clinic.description ?? undefined,
    icons: clinic.logo_url ? { icon: clinic.logo_url } : undefined,
    openGraph: {
      title: clinic.name,
      description: clinic.description ?? undefined,
      images: clinic.logo_url ? [clinic.logo_url] : undefined,
    },
  };
}

export default async function Home() {
  const subdomain = (await headers()).get("x-clinic-subdomain");

  // ── Domain utama (platform) ──
  if (!subdomain) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 px-6 text-center">
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
          Platform Klinik Membership
        </span>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Kelola klinik terapi Anda, semua dalam satu platform
        </h1>
        <p className="max-w-lg text-zinc-600">
          Punya website sendiri, terima booking online 24 jam, dan kelola jadwal,
          pasien, hingga keuangan dari satu dashboard — dirancang khusus untuk
          elektronik rehab medik.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/daftar" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            Daftarkan Klinik
          </Link>
          <Link href="/auth/login" className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100">
            Masuk Klinik
          </Link>
        </div>
      </main>
    );
  }

  // ── Subdomain klinik → landing klinik (pilih template per clinic_type) ──
  const data = await getClinicLanding(subdomain);

  if (!data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Klinik tidak ditemukan</h1>
        <p className="text-sm text-gray-500">Subdomain &ldquo;{subdomain}&rdquo; belum terdaftar.</p>
      </main>
    );
  }

  // Pilih template sesuai tipe klinik. Tambah tipe baru = tambah satu cabang.
  switch (data.clinic.clinic_type) {
    case "okupasi_terapi":
      return <OkupasiLanding {...data} />;
    case "terapi_wicara":
      return <WicaraLanding {...data} />;
    case "fisioterapi":
    default:
      return <FisioLanding {...data} />;
  }
}
