// Template LANDING untuk klinik bertipe `fisioterapi`.
// Tampilan terinspirasi gaya "Play Kids" — ceria, kaya gambar & ikon warna-warni,
// dengan section Cara Booking + FAQ + tombol WhatsApp mengambang. Tetap 100%
// data-driven dari konten yang diisi owner (fallback ke default bila kosong).
import Link from "next/link";
import {
  Activity, ArrowRight, Star, Check, ShieldCheck, HeartPulse,
  Stethoscope, Dumbbell, Brain, Baby, Accessibility, Wind,
  Clock, Sparkles, Quote, MapPin, Phone, MessageCircle, CalendarCheck,
  ClipboardList, HelpCircle,
} from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { getInitials } from "@/lib/utils";
import type { LandingData } from "@/lib/tenant/landing";
import { joinDisciplineLabels, disciplineLabel, getDiscipline } from "@/lib/disciplines";
import { FisioNav, FisioFooter } from "./chrome";
import { Reveal } from "./reveal";
import { FISIO_IMG } from "./defaults";

const DEFAULT_STATS = [
  { value: "5.000+", label: "Sesi Terapi" },
  { value: "98%", label: "Kepuasan Pasien" },
  { value: "10+", label: "Tahun Pengalaman" },
  { value: "100%", label: "Terapis Bersertifikat" },
];

const FEATURE_ICONS = [ShieldCheck, HeartPulse, Sparkles, Clock, Stethoscope, Dumbbell];
const DEFAULT_FEATURES = [
  { title: "Terapis Bersertifikat", description: "Ditangani fisioterapis profesional ber-STR dan berpengalaman." },
  { title: "Program Personal", description: "Rencana terapi disusun sesuai kondisi dan target pemulihan Anda." },
  { title: "Peralatan Modern", description: "Didukung modalitas dan alat fisioterapi yang mutakhir." },
  { title: "Jadwal Fleksibel", description: "Booking online mudah, pilih jadwal dan terapis sesuai kebutuhan." },
];

const DEFAULT_SERVICES = [
  { name: "Fisioterapi Ortopedi", description: "Pemulihan cedera tulang, sendi, otot, dan pasca-operasi.", icon: Dumbbell },
  { name: "Fisioterapi Neurologi", description: "Rehabilitasi stroke, saraf terjepit, dan gangguan saraf.", icon: Brain },
  { name: "Fisioterapi Pediatri", description: "Stimulasi tumbuh kembang dan terapi gerak anak.", icon: Baby },
  { name: "Fisioterapi Geriatri", description: "Menjaga mobilitas dan kemandirian usia lanjut.", icon: Accessibility },
  { name: "Fisioterapi Olahraga", description: "Cedera olahraga, penguatan, dan pencegahan cedera.", icon: Activity },
  { name: "Fisioterapi Kardiorespirasi", description: "Latihan pernapasan dan pemulihan fungsi paru-jantung.", icon: Wind },
];

const SERVICE_ICONS = [Dumbbell, Brain, Baby, Accessibility, Activity, Wind];
// Warna-warni ala Play Kids untuk ikon layanan (di-rotasi per kartu).
const SERVICE_STYLES = [
  { grad: "from-teal-500 to-emerald-500", tint: "bg-teal-50 text-teal-700" },
  { grad: "from-sky-500 to-blue-500", tint: "bg-sky-50 text-sky-700" },
  { grad: "from-amber-500 to-orange-500", tint: "bg-amber-50 text-amber-700" },
  { grad: "from-fuchsia-500 to-purple-500", tint: "bg-fuchsia-50 text-fuchsia-700" },
  { grad: "from-rose-500 to-pink-500", tint: "bg-rose-50 text-rose-700" },
  { grad: "from-indigo-500 to-violet-500", tint: "bg-indigo-50 text-indigo-700" },
];

const DEFAULT_TESTIMONIALS = [
  { name: "Rina W.", role: "Pasien nyeri punggung", text: "Setelah beberapa sesi, nyeri punggung saya jauh berkurang. Terapisnya sabar dan menjelaskan setiap latihan." },
  { name: "Budi S.", role: "Pemulihan pasca-operasi lutut", text: "Programnya terukur dan progresnya terasa nyata. Sekarang sudah bisa beraktivitas normal lagi." },
  { name: "Dewi A.", role: "Orang tua pasien anak", text: "Penanganan untuk anak saya sangat telaten. Suasana kliniknya nyaman dan ramah anak." },
];

const DEFAULT_FAQS = [
  { q: "Apakah perlu rujukan dokter terlebih dahulu?", a: "Tidak wajib. Anda bisa langsung booking sesi konsultasi awal. Bila ada hasil pemeriksaan atau rujukan sebelumnya, silakan dibawa agar asesmen lebih akurat." },
  { q: "Berapa lama satu sesi terapi berlangsung?", a: "Umumnya sekitar 45–60 menit per sesi, tergantung jenis penanganan dan kondisi Anda." },
  { q: "Berapa kali sesi terapi yang dibutuhkan?", a: "Bergantung pada kondisi masing-masing. Setelah asesmen awal, terapis akan menyusun program dengan jumlah sesi yang direkomendasikan." },
  { q: "Bagaimana cara melakukan booking?", a: "Cukup klik tombol Booking, pilih layanan, terapis, dan jadwal yang tersedia, lalu lengkapi data Anda. Konfirmasi akan diberikan oleh tim kami." },
];

const BOOKING_STEPS = [
  { step: "1", title: "Pilih Layanan & Jadwal", desc: "Tentukan jenis terapi, terapis, dan slot waktu yang paling pas untuk Anda.", icon: ClipboardList },
  { step: "2", title: "Isi Data Diri", desc: "Lengkapi data dan keluhan Anda lewat formulir booking online yang singkat.", icon: CalendarCheck },
  { step: "3", title: "Datang ke Klinik", desc: "Terima konfirmasi dari tim kami, lalu datang sesuai jadwal. Selesai!", icon: Check },
];

function SectionTitle({ kicker, icon: Icon, title, desc }: { kicker: string; icon: React.ElementType; title: string; desc?: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1 text-sm font-semibold text-teal-700">
        <Icon className="h-4 w-4" /> {kicker}
      </span>
      <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">{title}</h2>
      {desc && <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-500 sm:text-base">{desc}</p>}
    </Reveal>
  );
}

export default function FisioLanding({ clinic, content, services, therapists, bookingOpen }: LandingData) {
  // Layanan yang dibuka klinik. Klinik CAMPURAN (>1) → teks default menyebut semua.
  const specs = (clinic.specializations?.length ? clinic.specializations : [clinic.clinic_type]).filter(Boolean);
  const isMulti = specs.length > 1;
  const svcList = joinDisciplineLabels(specs);

  const heroTitle = content.hero_title || clinic.name;
  const heroSubtitle =
    content.hero_subtitle ||
    (isMulti
      ? `Layanan ${svcList} dalam satu klinik — penanganan yang profesional, personal, dan terukur untuk setiap kebutuhan Anda dan keluarga.`
      : "Pemulihan cedera, nyeri, dan gangguan gerak dengan penanganan fisioterapi yang profesional, personal, dan terukur.");
  const tagline = content.tagline || (isMulti ? `Klinik ${svcList}` : "Klinik Fisioterapi Terpercaya");

  const heroImg = content.hero_image_url || FISIO_IMG.hero;
  const aboutImg = content.about_image_url || FISIO_IMG.about;

  const stats = content.stats?.length ? content.stats : DEFAULT_STATS;
  const features = content.features?.length ? content.features : DEFAULT_FEATURES;
  const usingDefaultTesti = !content.testimonials?.length;
  const testimonials = usingDefaultTesti ? DEFAULT_TESTIMONIALS : content.testimonials!;
  const faqs = content.faqs?.filter((f) => f.q || f.a)?.length ? content.faqs!.filter((f) => f.q || f.a) : DEFAULT_FAQS;
  const gallery = content.gallery_urls?.filter(Boolean)?.length ? content.gallery_urls!.filter(Boolean) : FISIO_IMG.gallery;
  const collage = [aboutImg, gallery[0], gallery[1]].filter(Boolean) as string[];
  const hasRealServices = services.length > 0;

  const waRaw = (content.contact_whatsapp || clinic.phone_number || "").replace(/\D/g, "");
  const waLink = waRaw ? `https://wa.me/${waRaw.replace(/^0/, "62")}` : null;

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <FisioNav clinic={clinic} bookingOpen={bookingOpen} />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-24 -top-24 h-96 w-96 animate-blob rounded-full bg-teal-200/50 blur-3xl" />
          <div className="absolute right-0 top-10 h-80 w-80 animate-blob rounded-full bg-amber-200/40 blur-3xl" style={{ animationDelay: "3s" }} />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 animate-blob rounded-full bg-sky-200/40 blur-3xl" style={{ animationDelay: "6s" }} />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <Reveal>
            {bookingOpen ? (
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-4 py-1.5 text-sm font-semibold text-teal-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
                </span>
                Buka &amp; Menerima Pasien Baru
              </div>
            ) : (
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-4 py-1.5 text-sm font-semibold text-teal-700">
                <HeartPulse className="h-4 w-4" /> {tagline}
              </div>
            )}

            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl lg:text-[3.2rem]">
              {heroTitle}
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-gray-600 sm:text-lg">{heroSubtitle}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {bookingOpen ? (
                <Link href="/booking" className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-7 py-4 text-base font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:-translate-y-0.5 hover:bg-teal-700">
                  Booking Sesi Terapi <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <span className="inline-flex items-center justify-center rounded-2xl bg-amber-50 px-6 py-4 text-sm font-medium text-amber-700">Booking online sedang tidak tersedia</span>
              )}
              {waLink ? (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 px-7 py-4 text-base font-semibold text-gray-700 transition-all hover:border-teal-300 hover:bg-teal-50">
                  <Phone className="h-5 w-5" /> Tanya via WhatsApp
                </a>
              ) : (
                <Link href="/#layanan" className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 px-7 py-4 text-base font-semibold text-gray-700 transition-all hover:border-teal-300 hover:bg-teal-50">
                  Lihat Layanan
                </Link>
              )}
            </div>

            {/* Trust row */}
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-gray-600"><ShieldCheck className="h-5 w-5 text-teal-600" /> Terapis ber-STR</div>
              <div className="flex items-center gap-2 font-medium text-gray-600"><Star className="h-5 w-5 fill-amber-400 text-amber-400" /> Rating {stats[1]?.value ?? "98%"}</div>
              <div className="flex items-center gap-2 font-medium text-gray-600"><HeartPulse className="h-5 w-5 text-rose-500" /> {stats[0]?.value ?? "5.000+"} sesi terapi</div>
            </div>
          </Reveal>

          {/* Visual */}
          <Reveal delay={120} className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="pointer-events-none absolute -inset-4 -z-10 animate-blob rounded-[2.5rem] bg-gradient-to-tr from-teal-200 via-amber-100 to-sky-200" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] shadow-2xl shadow-teal-900/20 ring-8 ring-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImg} alt={clinic.name} className="h-full w-full object-cover" />
            </div>

            {/* Floating card: rating */}
            <div className="absolute -left-4 top-10 animate-float-slow rounded-2xl bg-white p-3.5 shadow-xl ring-1 ring-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100"><Star className="h-5 w-5 fill-amber-400 text-amber-400" /></span>
                <div>
                  <p className="text-lg font-extrabold leading-none text-gray-900">{stats[1]?.value ?? "98%"}</p>
                  <p className="text-xs text-gray-500">{stats[1]?.label ?? "Kepuasan pasien"}</p>
                </div>
              </div>
            </div>

            {/* Floating card: certified */}
            <div className="absolute -right-3 bottom-8 animate-float-slower rounded-2xl bg-white p-3.5 shadow-xl ring-1 ring-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600"><ShieldCheck className="h-5 w-5" /></span>
                <div>
                  <p className="text-sm font-bold leading-none text-gray-900">Ber-STR</p>
                  <p className="mt-1 text-xs text-gray-500">Terapis tersertifikasi</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="border-y border-gray-100 bg-gray-50/70">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={i} delay={i * 70} className="text-center">
              <p className="bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm font-medium text-gray-500">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== LAYANAN ===== */}
      <section id="layanan" className="mx-auto w-full max-w-6xl px-4 py-20">
        <SectionTitle kicker="Layanan Kami" icon={Sparkles} title={isMulti ? "Layanan Terapi Lengkap" : "Penanganan Fisioterapi Lengkap"} desc={isMulti ? `Klinik kami melayani ${svcList} untuk membantu pemulihan dan perkembangan Anda serta keluarga.` : "Berbagai layanan terapi untuk membantu pemulihan dan meningkatkan kualitas gerak Anda."} />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(hasRealServices ? services : DEFAULT_SERVICES).map((s, i) => {
            const Icon = hasRealServices ? SERVICE_ICONS[i % SERVICE_ICONS.length] : (s as typeof DEFAULT_SERVICES[number]).icon;
            const st = SERVICE_STYLES[i % SERVICE_STYLES.length];
            const real = hasRealServices ? (s as typeof services[number]) : null;
            return (
              <Reveal key={real?.id ?? s.name} delay={(i % 3) * 90}>
                <div className="group h-full overflow-hidden rounded-3xl border border-gray-100 bg-white p-7 shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-xl hover:shadow-gray-200/60">
                  <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${st.grad} text-white shadow-lg`}>
                    <Icon className="h-7 w-7" strokeWidth={2.2} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{s.name}</h3>
                  {s.description && <p className="mt-2 text-sm leading-relaxed text-gray-500">{s.description}</p>}
                  {real && (
                    <div className="mt-6 flex items-center justify-between border-t border-dashed border-gray-100 pt-4">
                      <span className={`rounded-lg px-2.5 py-1 text-sm font-bold ${st.tint}`}>{real.price ? formatRupiah(real.price) : "Hubungi kami"}</span>
                      {real.duration_min ? <span className="flex items-center gap-1 text-xs font-medium text-gray-400"><Clock className="h-3.5 w-3.5" /> {real.duration_min} menit</span> : null}
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
        {bookingOpen && (
          <Reveal className="mt-10 text-center">
            <Link href="/booking" className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:-translate-y-0.5 hover:bg-teal-700">
              Jadwalkan Sesi <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        )}
      </section>

      {/* ===== KEUNGGULAN / ABOUT (collage) ===== */}
      <section id="keunggulan" className="bg-gradient-to-b from-teal-50/60 to-white py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 lg:grid-cols-2">
          {/* image collage */}
          <Reveal className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-[3/4] overflow-hidden rounded-3xl shadow-lg ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={collage[0]} alt={`Suasana ${clinic.name}`} className="h-full w-full object-cover" />
              </div>
              <div className="mt-8 grid gap-4">
                {[collage[1], collage[2]].filter(Boolean).map((url, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-3xl shadow-lg ring-1 ring-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Galeri ${i + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-5 left-6 flex items-center gap-3 rounded-2xl bg-white px-5 py-3.5 shadow-xl ring-1 ring-gray-100">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-100 text-teal-600"><Stethoscope className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-bold leading-none text-gray-900">Pendekatan Personal</p>
                <p className="mt-1 text-xs text-gray-500">Program untuk tiap pasien</p>
              </div>
            </div>
          </Reveal>

          {/* text + features */}
          <Reveal delay={120}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1 text-sm font-semibold text-amber-700">
              <HeartPulse className="h-4 w-4" /> Kenapa Memilih Kami
            </span>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              {content.founded_year ? `Mendampingi pemulihan Anda sejak ${content.founded_year}` : "Pemulihan yang aman, nyaman & bisa diandalkan"}
            </h2>
            <p className="mt-4 text-gray-600">
              {content.about_text ||
                (isMulti
                  ? `${clinic.name} menghadirkan layanan ${svcList} dalam satu tempat. Dengan tim terapis profesional dan pendekatan yang personal, kami mendampingi setiap proses pemulihan dan perkembangan Anda serta keluarga secara menyeluruh.`
                  : `${clinic.name} hadir untuk membantu Anda kembali bergerak bebas tanpa nyeri. Dengan tim fisioterapis profesional dan pendekatan yang personal, kami mendampingi setiap proses pemulihan Anda secara menyeluruh.`)}
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {features.map((f, i) => {
                const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
                return (
                  <div key={i} className="flex gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700"><Icon className="h-5 w-5" strokeWidth={2.2} /></span>
                    <div>
                      <h3 className="font-bold text-gray-900">{f.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-500">{f.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Link href="/tentang" className="mt-8 inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-5 py-2.5 text-sm font-bold text-teal-700 transition-colors hover:bg-teal-50">
              Riwayat &amp; Cerita Kami <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ===== CARA BOOKING ===== */}
      {bookingOpen && (
        <section className="mx-auto w-full max-w-5xl px-4 py-20">
          <SectionTitle kicker="Cara Booking" icon={CalendarCheck} title="Hanya 3 langkah mudah" />
          <div className="relative mt-14 grid gap-8 md:grid-cols-3">
            <div className="absolute left-0 right-0 top-7 hidden h-0.5 bg-gradient-to-r from-teal-200 via-amber-200 to-sky-200 md:block" />
            {BOOKING_STEPS.map((item, i) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.step} delay={i * 90} className="relative text-center">
                  <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-lg ring-1 ring-gray-100">
                    <Icon className="h-7 w-7" strokeWidth={2.2} />
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">{item.step}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-gray-900">{item.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-gray-500">{item.desc}</p>
                </Reveal>
              );
            })}
          </div>
          <Reveal className="mt-12 text-center">
            <Link href="/booking" className="group inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:-translate-y-0.5 hover:bg-teal-700">
              Mulai Booking Sekarang <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </section>
      )}

      {/* ===== TERAPIS ===== */}
      {therapists.length > 0 && (
        <section id="terapis" className="bg-gray-50/70 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle kicker="Tim Profesional" icon={ShieldCheck} title={isMulti ? "Ditangani Terapis Bersertifikat" : "Ditangani Fisioterapis Bersertifikat"} desc="Tim kami berpengalaman mendampingi pemulihan Anda dengan penuh kesabaran." />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {therapists.map((t, i) => (
                <Reveal key={t.id} delay={(i % 4) * 80}>
                  <div className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100 transition-all hover:-translate-y-1.5 hover:shadow-xl">
                    <div className="relative aspect-[4/5] overflow-hidden">
                      {t.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.photo_url} alt={t.full_name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-100 to-emerald-100 text-4xl font-extrabold text-teal-600">{getInitials(t.full_name)}</div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-gray-900">{t.full_name}</h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {isMulti && t.discipline && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${getDiscipline(t.discipline)?.accent.badge ?? "bg-gray-100 text-gray-600"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${getDiscipline(t.discipline)?.accent.dot ?? "bg-gray-400"}`} />
                            {disciplineLabel(t.discipline)}
                          </span>
                        )}
                        <p className="text-sm font-medium text-teal-600">
                          {t.specialization.length > 0 ? t.specialization.join(" · ") : disciplineLabel(t.discipline ?? clinic.clinic_type)}
                        </p>
                      </div>
                      {t.bio && <p className="mt-2.5 text-sm leading-relaxed text-gray-500 line-clamp-3">{t.bio}</p>}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== GALERI ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20">
        <SectionTitle kicker="Galeri" icon={Sparkles} title="Suasana Klinik Kami" />
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {gallery.map((url, i) => (
            <Reveal key={i} delay={(i % 4) * 70}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Galeri ${i + 1}`} className="aspect-square w-full rounded-2xl object-cover shadow-sm transition-transform duration-500 hover:scale-[1.03]" />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== TESTIMONI ===== */}
      <section id="testimoni" className="bg-gray-50/70 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle kicker="Kata Pasien" icon={Star} title="Dipercaya Pasien Kami" />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t: { name?: string; role?: string; text?: string; avatar?: string }, i) => {
              const avatar = t.avatar || (usingDefaultTesti ? FISIO_IMG.avatars[i % FISIO_IMG.avatars.length] : "");
              return (
                <Reveal key={i} delay={(i % 3) * 90}>
                  <div className="relative h-full rounded-3xl border border-gray-100 bg-white p-7 shadow-sm">
                    <Quote className="absolute right-6 top-6 h-9 w-9 text-teal-100" />
                    <div className="mb-4 flex gap-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, k) => <Star key={k} className="h-4 w-4 fill-current" />)}
                    </div>
                    <p className="relative text-[15px] leading-relaxed text-gray-600">&ldquo;{t.text}&rdquo;</p>
                    <div className="mt-6 flex items-center gap-3">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatar} alt={t.name ?? "Pasien"} className="h-11 w-11 rounded-full object-cover ring-2 ring-teal-100" />
                      ) : (
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{getInitials(t.name ?? "P")}</span>
                      )}
                      <div>
                        <p className="text-sm font-bold text-gray-900">{t.name}</p>
                        {t.role && <p className="text-xs text-gray-500">{t.role}</p>}
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="mx-auto w-full max-w-3xl px-4 py-20">
        <SectionTitle kicker="FAQ" icon={HelpCircle} title="Pertanyaan yang Sering Ditanyakan" />
        <div className="mt-10 space-y-3">
          {faqs.map((f, i) => (
            <Reveal key={i} delay={(i % 4) * 60}>
              <details className="group rounded-2xl border border-gray-100 bg-white px-5 py-1 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-gray-900 marker:hidden">
                  {f.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600 transition-transform group-open:rotate-45">
                    <span className="text-lg leading-none">+</span>
                  </span>
                </summary>
                <p className="pb-5 pr-10 text-sm leading-relaxed text-gray-600">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-teal-600 to-emerald-600 px-8 py-14 shadow-2xl shadow-teal-900/30 animate-gradient md:px-14">
            <div className="pointer-events-none absolute -right-10 -top-10 h-60 w-60 animate-float-slow rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-10 h-72 w-72 animate-float-slower rounded-full bg-amber-300/20 blur-2xl" />
            <div className="relative grid items-center gap-10 md:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                  <CalendarCheck className="h-3.5 w-3.5" /> Booking mudah &amp; cepat
                </span>
                <h2 className="mt-4 text-2xl font-extrabold leading-tight text-white sm:text-3xl">Siap memulai pemulihan Anda?</h2>
                <p className="mt-4 max-w-md text-sm text-teal-50/90 sm:text-base">
                  Jangan tunda. Jadwalkan sesi fisioterapi pertama Anda sekarang. Tim kami siap membantu Anda kembali bergerak bebas.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  {bookingOpen && (
                    <Link href="/booking" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-base font-bold text-teal-700 shadow-lg transition-transform hover:-translate-y-0.5">
                      Booking Sekarang <ArrowRight className="h-5 w-5" />
                    </Link>
                  )}
                  {waLink && (
                    <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white/40 px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10">
                      <MessageCircle className="h-5 w-5" /> Chat WhatsApp
                    </a>
                  )}
                </div>
                <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-teal-50">
                  {["Tanpa rujukan", "Jadwal fleksibel", "Terapis ber-STR"].map((x) => (
                    <li key={x} className="flex items-center gap-1.5"><Check className="h-4 w-4" /> {x}</li>
                  ))}
                </ul>
                {(clinic.address || clinic.phone_number) && (
                  <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-teal-50/90">
                    {clinic.address && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {clinic.address}</span>}
                    {clinic.phone_number && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {clinic.phone_number}</span>}
                  </div>
                )}
              </div>
              <div className="relative mx-auto hidden w-full max-w-sm md:block">
                <div className="relative aspect-[5/4] overflow-hidden rounded-3xl ring-8 ring-white/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={collage[1] ?? aboutImg} alt={clinic.name} className="h-full w-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <FisioFooter clinic={clinic} content={content} />

      {/* ===== Floating WhatsApp ===== */}
      {waLink && (
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat WhatsApp"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-xl shadow-green-500/40 transition-transform hover:scale-110"
        >
          <MessageCircle className="h-7 w-7" fill="currentColor" strokeWidth={0} />
        </a>
      )}
    </main>
  );
}
