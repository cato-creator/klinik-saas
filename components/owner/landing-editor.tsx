"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Image as ImageIcon, BookOpen, BarChart3, Sparkles, Milestone,
  Quote, GalleryHorizontal, Phone, Clock, Loader2, Check, AlertCircle, Plus, Trash2, Camera, X, HelpCircle,
} from "lucide-react";
import { FISIO_IMG } from "@/app/_landing-templates/fisioterapi/defaults";

type Stat = { value: string; label: string };
type Feature = { title: string; description: string };
type MilestoneT = { year: string; title: string; description: string };
type Testimonial = { name: string; role: string; text: string; avatar?: string };
type Faq = { q: string; a: string };

// Jam operasional disimpan di clinics.operating_hours sebagai { "mon": "08:00-17:00", ... }.
// Di editor kita pecah jadi { open, start, end } per hari agar mudah diatur.
type DayRow = { open: boolean; start: string; end: string };
const DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Senin" },
  { key: "tue", label: "Selasa" },
  { key: "wed", label: "Rabu" },
  { key: "thu", label: "Kamis" },
  { key: "fri", label: "Jumat" },
  { key: "sat", label: "Sabtu" },
  { key: "sun", label: "Minggu" },
];

interface Props {
  clinic: {
    name?: string | null;
    description?: string | null;
    address?: string | null;
    phone_number?: string | null;
    operating_hours?: Record<string, string> | null;
    logo_url?: string | null;
  } | null;
  content: Record<string, unknown>;
}

const asStr = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const asArr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

// Bangun state baris hari dari operating_hours tersimpan ("08:00-17:00").
function buildHours(saved?: Record<string, string> | null): Record<string, DayRow> {
  const out: Record<string, DayRow> = {};
  for (const { key } of DAYS) {
    const v = saved?.[key];
    const m = typeof v === "string" ? v.match(/^\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*$/) : null;
    out[key] = m
      ? { open: true, start: m[1].padStart(5, "0"), end: m[2].padStart(5, "0") }
      : { open: false, start: "08:00", end: "17:00" };
  }
  return out;
}

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", "landing");
  const res = await fetch("/api/owner/upload-photo", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Gagal upload");
  return data.url as string;
}

export function LandingEditor({ clinic, content }: Props) {
  const router = useRouter();
  const [f, setF] = useState({
    // identitas
    name: asStr(clinic?.name),
    description: asStr(clinic?.description),
    address: asStr(clinic?.address),
    phone_number: asStr(clinic?.phone_number),
    logo_url: asStr(clinic?.logo_url),
    // hero
    tagline: asStr(content.tagline),
    hero_title: asStr(content.hero_title),
    hero_subtitle: asStr(content.hero_subtitle),
    hero_image_url: asStr(content.hero_image_url),
    about_image_url: asStr(content.about_image_url),
    // tentang & sejarah
    about_text: asStr(content.about_text),
    history: asStr(content.history),
    founded_year: asStr(content.founded_year),
    vision: asStr(content.vision),
    mission: asStr(content.mission),
    // kontak
    contact_whatsapp: asStr(content.contact_whatsapp),
    contact_email: asStr(content.contact_email),
    contact_phone: asStr(content.contact_phone),
    maps_url: asStr(content.maps_url),
    instagram: asStr(content.instagram),
  });
  const [stats, setStats] = useState<Stat[]>(asArr<Stat>(content.stats));
  const [features, setFeatures] = useState<Feature[]>(asArr<Feature>(content.features));
  const [milestones, setMilestones] = useState<MilestoneT[]>(asArr<MilestoneT>(content.milestones));
  const [testimonials, setTestimonials] = useState<Testimonial[]>(asArr<Testimonial>(content.testimonials));
  const [faqs, setFaqs] = useState<Faq[]>(asArr<Faq>(content.faqs));
  const [gallery, setGallery] = useState<string[]>(asArr<string>(content.gallery_urls));
  const [hours, setHours] = useState<Record<string, DayRow>>(buildHours(clinic?.operating_hours));

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function save() {
    setMsg(null);
    if (f.name.trim().length < 3) {
      setMsg({ type: "error", text: "Nama klinik minimal 3 karakter." });
      return;
    }
    setSaving(true);
    try {
      const yearNum = f.founded_year.trim() ? Number(f.founded_year.trim()) : null;
      // Serialisasi jam operasional: hanya hari yang dibuka & jamnya valid.
      const operating_hours: Record<string, string> = {};
      for (const { key } of DAYS) {
        const r = hours[key];
        if (r?.open && r.start && r.end) operating_hours[key] = `${r.start}-${r.end}`;
      }
      const payload = {
        ...f,
        founded_year: Number.isFinite(yearNum as number) ? yearNum : null,
        operating_hours,
        stats: stats.filter((s) => s.value || s.label),
        features: features.filter((x) => x.title || x.description),
        milestones: milestones.filter((x) => x.year || x.title || x.description),
        testimonials: testimonials.filter((x) => x.name || x.text),
        faqs: faqs.filter((x) => x.q || x.a),
        gallery_urls: gallery.filter(Boolean),
      };
      const res = await fetch("/api/owner/landing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: data.error ?? "Gagal menyimpan." });
        return;
      }
      setMsg({ type: "ok", text: "Tersimpan! Perubahan sudah tampil di landing page." });
      router.refresh();
    } catch {
      setMsg({ type: "error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-24">
      {/* IDENTITAS */}
      <Section icon={Building2} title="Identitas Klinik" desc="Nama, deskripsi singkat, alamat, dan kontak utama.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama klinik" required>
            <input className="inp" value={f.name} onChange={set("name")} placeholder="Klinik Fisioterapi Sehat" />
          </Field>
          <Field label="No. HP / WhatsApp utama">
            <input className="inp" value={f.phone_number} onChange={set("phone_number")} placeholder="0812xxxxxxx" />
          </Field>
        </div>
        <Field label="Deskripsi singkat" hint="Tampil di footer & meta. 1–2 kalimat.">
          <textarea className="inp resize-y" rows={2} value={f.description} onChange={set("description")} placeholder="Klinik fisioterapi profesional untuk pemulihan optimal." />
        </Field>
        <Field label="Alamat">
          <input className="inp" value={f.address} onChange={set("address")} placeholder="Jl. Melati No. 10, Surabaya" />
        </Field>
        <ImageField
          label="Logo Klinik"
          hint="Tampil di header landing page. Rasio persegi (1:1) ideal. PNG transparan lebih bagus."
          value={f.logo_url}
          onChange={(url) => setF((s) => ({ ...s, logo_url: url }))}
        />
      </Section>

      {/* HERO */}
      <Section icon={ImageIcon} title="Bagian Hero (Atas)" desc="Bagian pertama yang dilihat pengunjung.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tagline" hint="Teks kecil di atas judul.">
            <input className="inp" value={f.tagline} onChange={set("tagline")} placeholder="Klinik Fisioterapi Terpercaya" />
          </Field>
          <Field label="Judul utama" hint="Kosongkan = pakai nama klinik.">
            <input className="inp" value={f.hero_title} onChange={set("hero_title")} placeholder="Kembali bergerak tanpa nyeri" />
          </Field>
        </div>
        <Field label="Sub-judul">
          <textarea className="inp resize-y" rows={2} value={f.hero_subtitle} onChange={set("hero_subtitle")} placeholder="Pemulihan cedera & nyeri dengan penanganan fisioterapi profesional." />
        </Field>
        <ImageField
          label="Gambar hero"
          hint="Rasio potret (4:5) ideal. Kosong = pakai gambar default di bawah."
          value={f.hero_image_url}
          fallback={FISIO_IMG.hero}
          onChange={(url) => setF((s) => ({ ...s, hero_image_url: url }))}
        />
      </Section>

      {/* TENTANG & SEJARAH */}
      <Section icon={BookOpen} title="Tentang & Riwayat" desc="Cerita klinik, visi-misi, dan tahun berdiri. Tampil di halaman Tentang.">
        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <Field label="Tahun berdiri">
            <input className="inp" value={f.founded_year} onChange={set("founded_year")} placeholder="2018" inputMode="numeric" />
          </Field>
          <Field label="Tentang (ringkas)" hint="Tampil di beranda bagian Tentang.">
            <textarea className="inp resize-y" rows={2} value={f.about_text} onChange={set("about_text")} placeholder="Klinik kami hadir untuk membantu Anda kembali bergerak bebas…" />
          </Field>
        </div>
        <Field label="Cerita / sejarah lengkap" hint="Paragraf perjalanan klinik. Pisahkan paragraf dengan baris baru.">
          <textarea className="inp resize-y" rows={5} value={f.history} onChange={set("history")} placeholder="Berawal dari ruang praktik kecil…" />
        </Field>
        <ImageField
          label="Gambar bagian Tentang"
          hint="Tampil di beranda & halaman Tentang. Kosong = pakai gambar default."
          value={f.about_image_url}
          fallback={FISIO_IMG.about}
          onChange={(url) => setF((s) => ({ ...s, about_image_url: url }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Visi">
            <textarea className="inp resize-y" rows={3} value={f.vision} onChange={set("vision")} placeholder="Menjadi klinik fisioterapi rujukan…" />
          </Field>
          <Field label="Misi">
            <textarea className="inp resize-y" rows={3} value={f.mission} onChange={set("mission")} placeholder="Memberikan layanan fisioterapi profesional…" />
          </Field>
        </div>
      </Section>

      {/* STATISTIK */}
      <Section icon={BarChart3} title="Statistik" desc="Angka pencapaian (mis. 5.000+ Sesi Terapi). Kosong = pakai default.">
        <RepeatList
          items={stats}
          onChange={setStats}
          empty={{ value: "", label: "" }}
          addLabel="Tambah statistik"
          render={(it, upd) => (
            <div className="grid flex-1 gap-2 sm:grid-cols-2">
              <input className="inp" value={it.value} onChange={(e) => upd({ ...it, value: e.target.value })} placeholder="500+" />
              <input className="inp" value={it.label} onChange={(e) => upd({ ...it, label: e.target.value })} placeholder="Pasien Ditangani" />
            </div>
          )}
        />
      </Section>

      {/* KEUNGGULAN */}
      <Section icon={Sparkles} title="Keunggulan" desc="Alasan memilih klinik Anda. Kosong = pakai default.">
        <RepeatList
          items={features}
          onChange={setFeatures}
          empty={{ title: "", description: "" }}
          addLabel="Tambah keunggulan"
          render={(it, upd) => (
            <div className="flex-1 space-y-2">
              <input className="inp" value={it.title} onChange={(e) => upd({ ...it, title: e.target.value })} placeholder="Terapis Bersertifikat" />
              <textarea className="inp resize-y" rows={2} value={it.description} onChange={(e) => upd({ ...it, description: e.target.value })} placeholder="Ditangani fisioterapis profesional ber-STR." />
            </div>
          )}
        />
      </Section>

      {/* MILESTONE */}
      <Section icon={Milestone} title="Perjalanan / Milestone" desc="Tonggak penting klinik (timeline di halaman Tentang).">
        <RepeatList
          items={milestones}
          onChange={setMilestones}
          empty={{ year: "", title: "", description: "" }}
          addLabel="Tambah milestone"
          render={(it, upd) => (
            <div className="flex-1 space-y-2">
              <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
                <input className="inp" value={it.year} onChange={(e) => upd({ ...it, year: e.target.value })} placeholder="2018" />
                <input className="inp" value={it.title} onChange={(e) => upd({ ...it, title: e.target.value })} placeholder="Klinik didirikan" />
              </div>
              <textarea className="inp resize-y" rows={2} value={it.description} onChange={(e) => upd({ ...it, description: e.target.value })} placeholder="Deskripsi singkat tonggak ini." />
            </div>
          )}
        />
      </Section>

      {/* TESTIMONI */}
      <Section icon={Quote} title="Testimoni" desc="Ulasan pasien. Kosong = pakai contoh default.">
        <RepeatList
          items={testimonials}
          onChange={setTestimonials}
          empty={{ name: "", role: "", text: "", avatar: "" }}
          addLabel="Tambah testimoni"
          render={(it, upd) => <TestimonialRow it={it} upd={upd} />}
        />
      </Section>

      {/* FAQ */}
      <Section icon={HelpCircle} title="FAQ (Tanya Jawab)" desc="Pertanyaan yang sering ditanyakan pengunjung. Kosong = pakai contoh default.">
        <RepeatList
          items={faqs}
          onChange={setFaqs}
          empty={{ q: "", a: "" }}
          addLabel="Tambah pertanyaan"
          render={(it, upd) => (
            <div className="flex-1 space-y-2">
              <input className="inp" value={it.q} onChange={(e) => upd({ ...it, q: e.target.value })} placeholder="Apakah perlu rujukan dokter?" />
              <textarea className="inp resize-y" rows={2} value={it.a} onChange={(e) => upd({ ...it, a: e.target.value })} placeholder="Tidak wajib. Anda bisa langsung booking sesi konsultasi awal." />
            </div>
          )}
        />
      </Section>

      {/* GALERI */}
      <Section icon={GalleryHorizontal} title="Galeri Foto" desc="Foto suasana klinik. Maks 2MB per foto.">
        <GalleryField gallery={gallery} onChange={setGallery} />
      </Section>

      {/* KONTAK */}
      <Section icon={Phone} title="Kontak & Media Sosial" desc="Ditampilkan di footer & tombol kontak.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp" hint="Untuk tombol Chat WhatsApp. Kosong = pakai No. HP utama.">
            <input className="inp" value={f.contact_whatsapp} onChange={set("contact_whatsapp")} placeholder="0812xxxxxxx" />
          </Field>
          <Field label="Telepon">
            <input className="inp" value={f.contact_phone} onChange={set("contact_phone")} placeholder="(031) xxxxxxx" />
          </Field>
          <Field label="Email">
            <input className="inp" value={f.contact_email} onChange={set("contact_email")} placeholder="klinik@email.com" />
          </Field>
          <Field label="Instagram">
            <input className="inp" value={f.instagram} onChange={set("instagram")} placeholder="@kliniksehat" />
          </Field>
          <Field label="Link Google Maps">
            <input className="inp" value={f.maps_url} onChange={set("maps_url")} placeholder="https://maps.google.com/…" />
          </Field>
        </div>
      </Section>

      {/* JAM OPERASIONAL */}
      <Section icon={Clock} title="Jam Operasional" desc="Tampil di footer landing page. Centang hari buka, lalu atur jamnya. Hari tanpa centang dianggap tutup.">
        <div className="space-y-2">
          {DAYS.map(({ key, label }) => {
            const r = hours[key];
            const upd = (next: Partial<DayRow>) =>
              setHours((s) => ({ ...s, [key]: { ...s[key], ...next } }));
            return (
              <div key={key} className="flex flex-wrap items-center gap-3 rounded-xl bg-gray-50/70 p-3">
                <label className="flex w-28 shrink-0 cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={r.open}
                    onChange={(e) => upd({ open: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  {label}
                </label>
                {r.open ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={r.start}
                      onChange={(e) => upd({ start: e.target.value })}
                      className="inp !w-auto"
                    />
                    <span className="text-gray-400">–</span>
                    <input
                      type="time"
                      value={r.end}
                      onChange={(e) => upd({ end: e.target.value })}
                      className="inp !w-auto"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Tutup</span>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* BAR SIMPAN (sticky) */}
      <div className="sticky bottom-0 -mx-6 border-t border-gray-100 bg-white/90 px-6 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          {msg ? (
            <span className={`flex items-center gap-2 text-sm ${msg.type === "error" ? "text-red-600" : "text-green-600"}`}>
              {msg.type === "error" ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />} {msg.text}
            </span>
          ) : (
            <span className="text-sm text-gray-400">Klik simpan untuk menerapkan perubahan.</span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</> : <><Check className="h-4 w-4" /> Simpan Perubahan</>}
          </button>
        </div>
      </div>

      <FormStyle />
    </div>
  );
}

/* ---------------- sub-komponen ---------------- */

function Section({ icon: Icon, title, desc, children }: { icon: React.ElementType; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><Icon className="h-5 w-5" /></span>
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          {desc && <p className="mt-0.5 text-sm text-gray-500">{desc}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}{required && <span className="ml-1 text-red-500">*</span>}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function RepeatList<T>({ items, onChange, empty, addLabel, render }: {
  items: T[];
  onChange: (v: T[]) => void;
  empty: T;
  addLabel: string;
  render: (item: T, update: (next: T) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2 rounded-xl bg-gray-50/70 p-3">
          {render(it, (next) => onChange(items.map((x, j) => (j === i ? next : x))))}
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="mt-1 shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Hapus"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { ...empty }])}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-500 hover:border-teal-400 hover:text-teal-600"
      >
        <Plus className="h-4 w-4" /> {addLabel}
      </button>
    </div>
  );
}

function ImageField({ label, hint, value, fallback, onChange }: { label: string; hint?: string; value: string; fallback?: string; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(""); setBusy(true);
    try { onChange(await uploadImage(file)); }
    catch (x) { setErr(x instanceof Error ? x.message : "Gagal upload"); }
    finally { setBusy(false); }
  }

  const preview = value || fallback || "";
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-teal-50">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="pratinjau" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-teal-300"><ImageIcon className="h-7 w-7" /></span>
          )}
          {!value && fallback && (
            <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">Default</span>
          )}
          {value && (
            <button type="button" onClick={() => onChange("")} className="absolute right-1 top-1 rounded-md bg-black/50 p-1 text-white hover:bg-black/70" aria-label="Hapus gambar">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div>
          <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
          <button type="button" onClick={() => ref.current?.click()} disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Mengunggah…</> : <><Camera className="h-4 w-4" /> Pilih Gambar</>}
          </button>
          {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
          {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
        </div>
      </div>
    </div>
  );
}

function GalleryField({ gallery, onChange }: { gallery: string[]; onChange: (v: string[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setErr(""); setBusy(true);
    try {
      const urls: string[] = [];
      for (const file of files) urls.push(await uploadImage(file));
      onChange([...gallery, ...urls]);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Gagal upload");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {gallery.map((url, i) => (
          <div key={i} className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
            <button type="button" onClick={() => onChange(gallery.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 rounded-md bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100" aria-label="Hapus">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => ref.current?.click()} disabled={busy}
          className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-teal-400 hover:text-teal-600 disabled:opacity-50">
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={pick} />
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </div>
  );
}

function TestimonialRow({ it, upd }: { it: Testimonial; upd: (next: Testimonial) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { upd({ ...it, avatar: await uploadImage(file) }); }
    catch { /* abaikan */ }
    finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  }

  return (
    <div className="flex flex-1 gap-3">
      {/* Avatar */}
      <div className="shrink-0">
        <button type="button" onClick={() => ref.current?.click()} disabled={busy}
          className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-teal-50 text-teal-400 ring-1 ring-gray-200 hover:ring-teal-300 disabled:opacity-50"
          aria-label="Upload foto testimoni" title="Upload foto">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : it.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.avatar} alt={it.name || "foto"} className="h-full w-full object-cover" />
          ) : <Camera className="h-4 w-4" />}
        </button>
        {it.avatar && (
          <button type="button" onClick={() => upd({ ...it, avatar: "" })} className="mt-1 block w-full text-center text-[10px] text-gray-400 hover:text-red-500">hapus</button>
        )}
        <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
      </div>
      {/* Teks */}
      <div className="flex-1 space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="inp" value={it.name} onChange={(e) => upd({ ...it, name: e.target.value })} placeholder="Nama pasien" />
          <input className="inp" value={it.role} onChange={(e) => upd({ ...it, role: e.target.value })} placeholder="Pasien nyeri punggung" />
        </div>
        <textarea className="inp resize-y" rows={2} value={it.text} onChange={(e) => upd({ ...it, text: e.target.value })} placeholder="Pelayanannya sangat baik…" />
      </div>
    </div>
  );
}

function FormStyle() {
  return (
    <style>{`
      .inp { display:block; width:100%; border-radius:0.75rem; border:1px solid #e5e7eb; padding:0.55rem 0.7rem; font-size:0.875rem; background:#fff; transition:all .15s; }
      .inp:focus { outline:none; border-color:#14b8a6; box-shadow:0 0 0 3px rgba(20,184,166,.18); }
    `}</style>
  );
}
