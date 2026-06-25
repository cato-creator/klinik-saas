// Halaman RIWAYAT / TENTANG untuk klinik bertipe `fisioterapi`.
// Berisi cerita berdiri, visi-misi, timeline perjalanan, dan statistik.
import Link from "next/link";
import {
  ArrowRight, ArrowLeft, Target, Compass, Milestone,
  Quote, CalendarDays,
} from "lucide-react";
import type { LandingData } from "@/lib/tenant/landing";
import { FisioNav, FisioFooter } from "./chrome";
import { Reveal } from "./reveal";
import { FISIO_IMG } from "./defaults";

const DEFAULT_MILESTONES = [
  { year: "Awal", title: "Klinik Didirikan", description: "Berawal dari komitmen menghadirkan layanan fisioterapi yang profesional dan terjangkau." },
  { year: "Berkembang", title: "Menambah Layanan", description: "Memperluas layanan ke berbagai bidang fisioterapi dan menambah tim terapis." },
  { year: "Kini", title: "Dipercaya Masyarakat", description: "Telah mendampingi ribuan sesi pemulihan dengan tingkat kepuasan yang tinggi." },
];

const DEFAULT_STATS = [
  { value: "5.000+", label: "Sesi Terapi" },
  { value: "98%", label: "Kepuasan Pasien" },
  { value: "10+", label: "Tahun Pengalaman" },
  { value: "100%", label: "Terapis Bersertifikat" },
];

export default function FisioHistory({ clinic, content, bookingOpen }: LandingData) {
  const stats = content.stats?.length ? content.stats : DEFAULT_STATS;
  const milestones = content.milestones?.length ? content.milestones : DEFAULT_MILESTONES;

  const story =
    content.history ||
    content.about_text ||
    `${clinic.name} berdiri dari satu keyakinan sederhana: setiap orang berhak kembali bergerak bebas tanpa rasa nyeri. Dimulai dari ruang praktik kecil, kami tumbuh berkat kepercayaan pasien dan dedikasi tim fisioterapis kami. Hingga kini, kami terus berkomitmen memberikan penanganan yang berbasis bukti, personal, dan penuh empati.`;

  const vision = content.vision || "Menjadi klinik fisioterapi rujukan yang dipercaya masyarakat dalam mendampingi pemulihan dan meningkatkan kualitas hidup.";
  const mission = content.mission || "Memberikan layanan fisioterapi yang profesional, personal, dan berbasis bukti, dengan mengutamakan kenyamanan serta hasil terbaik bagi setiap pasien.";
  const storyImg = content.about_image_url || content.hero_image_url || FISIO_IMG.story;

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <FisioNav clinic={clinic} bookingOpen={bookingOpen} />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50 via-emerald-50/40 to-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700">
            <ArrowLeft className="h-4 w-4" /> Kembali ke beranda
          </Link>
          <span className="block text-sm font-bold uppercase tracking-wider text-teal-600">Tentang &amp; Riwayat</span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Perjalanan {clinic.name}
          </h1>
          {content.founded_year && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-semibold text-teal-700 shadow-sm ring-1 ring-teal-100">
              <CalendarDays className="h-4 w-4" /> Melayani sejak {content.founded_year}
            </p>
          )}
        </div>
      </section>

      {/* ===== CERITA ===== */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <span className="text-sm font-bold uppercase tracking-wider text-teal-600">Cerita Kami</span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Bagaimana semua bermula</h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-gray-600 sm:text-base">
              {story.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </Reveal>
          <Reveal delay={120} className="lg:col-span-2">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={storyImg} alt={clinic.name} className="aspect-[4/5] w-full rounded-3xl object-cover shadow-xl shadow-teal-900/10" />
              <Quote className="absolute -left-3 -top-3 h-10 w-10 rounded-xl bg-teal-600 p-2 text-white shadow-lg" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== VISI & MISI ===== */}
      <section className="bg-gradient-to-b from-white to-teal-50/40">
        <div className="mx-auto grid max-w-5xl gap-5 px-4 py-16 sm:grid-cols-2 sm:py-20">
          <Reveal>
            <div className="h-full rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100 transition-all hover:-translate-y-1 hover:shadow-lg">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white"><Compass className="h-6 w-6" /></span>
              <h3 className="mt-5 text-xl font-extrabold text-gray-900">Visi</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{vision}</p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="h-full rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100 transition-all hover:-translate-y-1 hover:shadow-lg">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white"><Target className="h-6 w-6" /></span>
              <h3 className="mt-5 text-xl font-extrabold text-gray-900">Misi</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{mission}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== TIMELINE ===== */}
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-20">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-teal-600">
            <Milestone className="h-4 w-4" /> Perjalanan Kami
          </span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Tonggak penting</h2>
        </div>

        <ol className="relative mt-12 border-l-2 border-teal-100 pl-8">
          {milestones.map((m, i) => (
            <li key={i} className="relative mb-10 last:mb-0">
              <span className="absolute -left-[41px] flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white ring-4 ring-white">
                {i + 1}
              </span>
              <Reveal delay={(i % 4) * 80}>
                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                  {m.year && <span className="text-xs font-bold uppercase tracking-wider text-teal-600">{m.year}</span>}
                  <h3 className="mt-0.5 text-lg font-bold text-gray-900">{m.title}</h3>
                  {m.description && <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{m.description}</p>}
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* ===== STATS ===== */}
      <section className="bg-gradient-to-br from-teal-600 to-emerald-600">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-14 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div key={i} className="text-center text-white">
              <p className="text-3xl font-extrabold sm:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-teal-50">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="mx-auto w-full max-w-4xl px-4 py-16 text-center sm:py-20">
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Ingin tahu lebih lanjut?</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-gray-500 sm:text-base">
          Pelajari layanan kami atau langsung jadwalkan sesi fisioterapi pertama Anda.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {bookingOpen && (
            <Link href="/booking" className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:-translate-y-0.5 hover:bg-teal-700">
              Booking Sekarang <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <Link href="/#layanan" className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50">
            Lihat Layanan
          </Link>
        </div>
      </section>

      <FisioFooter clinic={clinic} content={content} />
    </main>
  );
}
