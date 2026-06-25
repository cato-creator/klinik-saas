import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getClinicLanding } from "@/lib/tenant/landing";
import FisioHistory from "../_landing-templates/fisioterapi/fisio-history";
import OkupasiHistory from "../_landing-templates/okupasi-terapi/okupasi-history";
import WicaraHistory from "../_landing-templates/terapi-wicara/wicara-history";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const subdomain = (await headers()).get("x-clinic-subdomain");
  if (!subdomain) return { title: "Tentang" };
  const data = await getClinicLanding(subdomain);
  return { title: data ? `Tentang & Riwayat — ${data.clinic.name}` : "Tentang" };
}

// Halaman Riwayat/Tentang klinik. Hanya relevan di subdomain klinik;
// di domain utama platform, arahkan ke beranda.
export default async function TentangPage() {
  const subdomain = (await headers()).get("x-clinic-subdomain");
  if (!subdomain) redirect("/");

  const data = await getClinicLanding(subdomain);
  if (!data) redirect("/");

  switch (data.clinic.clinic_type) {
    case "okupasi_terapi":
      return <OkupasiHistory {...data} />;
    case "terapi_wicara":
      return <WicaraHistory {...data} />;
    case "fisioterapi":
    default:
      return <FisioHistory {...data} />;
  }
}
