// Pengambilan data landing page sebuah klinik (publik, by subdomain).
// Dipakai bersama oleh halaman utama (app/page.tsx) & halaman riwayat
// (app/tentang/page.tsx). Memakai service client (read data publik) dan
// `select('*')` untuk landing_page_content agar TAHAN terhadap urutan migrasi
// (kolom kaya 0006 boleh belum ada — kode fallback ke default).
import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export interface LandingClinic {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone_number: string | null;
  logo_url: string | null;
  status: string;
  clinic_type: string;
  // Semua layanan/disiplin yang dibuka klinik (klinik campuran punya >1).
  // Dipakai template untuk menyusun teks default yang menyebut semua layanan.
  specializations: string[] | null;
  operating_hours: Record<string, string> | null;
}

export interface LandingService {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  duration_min: number | null;
}

export interface LandingTherapist {
  id: string;
  full_name: string;
  specialization: string[];
  bio: string | null;
  photo_url: string | null;
  // Profesi/disiplin terapis — dipakai untuk label & badge per-kartu di landing.
  discipline: string | null;
}

// Konten longgar (kolom bisa null / belum ada). Template yang memberi default.
export type LandingContent = Record<string, unknown> & {
  tagline?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  hero_image_url?: string | null;
  about_image_url?: string | null;
  about_text?: string | null;
  history?: string | null;
  founded_year?: number | null;
  vision?: string | null;
  mission?: string | null;
  stats?: { value?: string; label?: string }[] | null;
  features?: { title?: string; description?: string }[] | null;
  milestones?: { year?: string; title?: string; description?: string }[] | null;
  testimonials?: { name?: string; role?: string; text?: string; avatar?: string }[] | null;
  faqs?: { q?: string; a?: string }[] | null;
  gallery_urls?: string[] | null;
  contact_whatsapp?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  maps_url?: string | null;
  instagram?: string | null;
};

export interface LandingData {
  clinic: LandingClinic;
  content: LandingContent;
  services: LandingService[];
  therapists: LandingTherapist[];
  bookingOpen: boolean;
}

// Pembungkus cache: data landing publik di-cache di edge (Workers KV) per
// subdomain selama 60 dtk → mayoritas kunjungan publik TIDAK menyentuh DB,
// menekan beban SSR/cold-start. Key memuat subdomain → tidak tertukar antar klinik.
// Editor owner membaca DB langsung (selalu fresh); landing publik menyusul ≤60 dtk.
export function getClinicLanding(subdomain: string): Promise<LandingData | null> {
  return unstable_cache(
    () => fetchClinicLanding(subdomain),
    ["clinic-landing", subdomain],
    { tags: [`landing:${subdomain}`], revalidate: 60 },
  )();
}

async function fetchClinicLanding(subdomain: string): Promise<LandingData | null> {
  const db = createServiceClient();

  const { data: clinic } = await db
    .from("clinics")
    .select("id, name, description, address, phone_number, logo_url, status, clinic_type, specializations, operating_hours")
    .eq("subdomain", subdomain)
    .maybeSingle();

  if (!clinic) return null;

  const [contentRes, servicesRes, therapistsRes] = await Promise.all([
    db.from("landing_page_content").select("*").eq("clinic_id", clinic.id).maybeSingle(),
    db
      .from("service_types")
      .select("id, name, description, price, duration_min")
      .eq("clinic_id", clinic.id)
      .eq("is_active", true)
      .order("price", { ascending: true }),
    db
      .from("therapists")
      .select("id, specialization, bio, photo_url, discipline, is_active, user:users(full_name)")
      .eq("clinic_id", clinic.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
  ]);

  const therapists: LandingTherapist[] = (therapistsRes.data ?? []).map((t) => {
    const u = t.user as { full_name?: string } | { full_name?: string }[] | null;
    const full_name = Array.isArray(u) ? u[0]?.full_name : u?.full_name;
    return {
      id: t.id as string,
      full_name: full_name ?? "Terapis",
      specialization: (t.specialization as string[]) ?? [],
      bio: (t.bio as string) ?? null,
      photo_url: (t.photo_url as string) ?? null,
      discipline: (t.discipline as string) ?? null,
    };
  });

  return {
    clinic: clinic as LandingClinic,
    content: (contentRes.data ?? {}) as LandingContent,
    services: (servicesRes.data ?? []) as LandingService[],
    therapists,
    bookingOpen: clinic.status === "active",
  };
}
