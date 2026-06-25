import { createServiceClient } from "@/lib/supabase/server";
import { apiTenant } from "@/lib/tenant/api";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const statItem = z.object({ value: z.string().max(20), label: z.string().max(60) });
const featureItem = z.object({ title: z.string().max(80), description: z.string().max(300) });
const milestoneItem = z.object({ year: z.string().max(20), title: z.string().max(80), description: z.string().max(400) });
const testimonialItem = z.object({
  name: z.string().max(60),
  role: z.string().max(80),
  text: z.string().max(500),
  avatar: z.string().url().or(z.literal("")).optional(),
});
const faqItem = z.object({ q: z.string().max(200), a: z.string().max(1000) });

// Jam operasional: { "mon": "08:00-17:00", ... }. Hanya hari yang DIBUKA dikirim;
// hari tutup tidak punya key. Catatan: di Zod v4, z.record(z.enum(...)) MEWAJIBKAN
// semua key enum hadir → hari tutup yg tidak dikirim membuat validasi gagal
// ("Data tidak valid"). Karena itu pakai object .partial() agar key boleh tidak ada.
const HHMM_RANGE = /^\d{2}:\d{2}-\d{2}:\d{2}$/;
const dayRange = z.string().regex(HHMM_RANGE);
const operatingHours = z
  .object({
    mon: dayRange, tue: dayRange, wed: dayRange, thu: dayRange,
    fri: dayRange, sat: dayRange, sun: dayRange,
  })
  .partial()
  .optional();

const schema = z.object({
  // Identitas klinik (tabel clinics)
  name: z.string().min(3).max(120),
  description: z.string().max(500).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  phone_number: z.string().max(40).optional().nullable(),
  logo_url: z.string().url().optional().or(z.literal("")).nullable(),
  operating_hours: operatingHours,
  // Konten landing (tabel landing_page_content)
  tagline: z.string().max(120).optional().nullable(),
  hero_title: z.string().max(160).optional().nullable(),
  hero_subtitle: z.string().max(400).optional().nullable(),
  hero_image_url: z.string().url().optional().or(z.literal("")).nullable(),
  about_image_url: z.string().url().optional().or(z.literal("")).nullable(),
  about_text: z.string().max(2000).optional().nullable(),
  history: z.string().max(4000).optional().nullable(),
  founded_year: z.number().int().min(1900).max(2100).optional().nullable(),
  vision: z.string().max(1000).optional().nullable(),
  mission: z.string().max(1000).optional().nullable(),
  contact_whatsapp: z.string().max(40).optional().nullable(),
  contact_email: z.string().max(120).optional().nullable(),
  contact_phone: z.string().max(40).optional().nullable(),
  maps_url: z.string().max(500).optional().nullable(),
  instagram: z.string().max(120).optional().nullable(),
  stats: z.array(statItem).max(8).optional(),
  features: z.array(featureItem).max(12).optional(),
  milestones: z.array(milestoneItem).max(20).optional(),
  testimonials: z.array(testimonialItem).max(20).optional(),
  faqs: z.array(faqItem).max(20).optional(),
  gallery_urls: z.array(z.string().url()).max(24).optional(),
});

const clean = (v: string | null | undefined) => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

export async function PATCH(request: NextRequest) {
  try {
    const auth = await apiTenant(["owner"]);
    if (!auth.ok) return auth.res;

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
    }
    const d = parsed.data;
    const db = createServiceClient();

    // 1) Update identitas klinik.
    const { error: clinicErr } = await db
      .from("clinics")
      .update({
        name: d.name.trim(),
        description: clean(d.description),
        address: clean(d.address),
        phone_number: clean(d.phone_number),
        logo_url: clean(d.logo_url),
        // Object kosong = semua hari tutup (disimpan apa adanya).
        operating_hours: d.operating_hours ?? {},
      })
      .eq("id", auth.clinicId);
    if (clinicErr) {
      return NextResponse.json({ error: "Gagal menyimpan data klinik." }, { status: 500 });
    }

    // 2) Upsert konten landing (PK = clinic_id).
    const { error: contentErr } = await db.from("landing_page_content").upsert(
      {
        clinic_id: auth.clinicId,
        tagline: clean(d.tagline),
        hero_title: clean(d.hero_title),
        hero_subtitle: clean(d.hero_subtitle),
        hero_image_url: clean(d.hero_image_url),
        about_image_url: clean(d.about_image_url),
        about_text: clean(d.about_text),
        history: clean(d.history),
        founded_year: d.founded_year ?? null,
        vision: clean(d.vision),
        mission: clean(d.mission),
        contact_whatsapp: clean(d.contact_whatsapp),
        contact_email: clean(d.contact_email),
        contact_phone: clean(d.contact_phone),
        maps_url: clean(d.maps_url),
        instagram: clean(d.instagram),
        stats: d.stats ?? [],
        features: d.features ?? [],
        milestones: d.milestones ?? [],
        testimonials: d.testimonials ?? [],
        faqs: d.faqs ?? [],
        gallery_urls: d.gallery_urls ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "clinic_id" },
    );
    if (contentErr) {
      // Pesan ramah bila migrasi 0006 belum dijalankan.
      const missingCol = /column .* does not exist/i.test(contentErr.message);
      return NextResponse.json(
        {
          error: missingCol
            ? "Kolom konten belum ada. Jalankan migrasi 0006_landing_content.sql & 0022_landing_faqs.sql di Supabase dulu."
            : "Gagal menyimpan konten landing.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
