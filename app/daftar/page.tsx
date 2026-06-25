import Link from "next/link";
import type { Metadata } from "next";
import { CalendarCheck, Globe, LayoutDashboard, ShieldCheck, ArrowLeft } from "lucide-react";
import RegisterForm from "./register-form";

export const metadata: Metadata = {
  title: "Daftarkan Klinik — Platform Klinik",
  description:
    "Buka klinik Fisioterapi atau Okupasi Terapi online: landing page, booking, dan dashboard sendiri.",
};

const BENEFITS = [
  { icon: Globe, title: "Landing page & subdomain", desc: "Halaman klinik profesional di alamat sendiri, langsung publik." },
  { icon: CalendarCheck, title: "Booking online", desc: "Pasien pesan jadwal sendiri, anti bentrok slot otomatis." },
  { icon: LayoutDashboard, title: "Dashboard lengkap", desc: "Kelola terapis, pasien, jadwal, dan rekam medis dalam satu tempat." },
  { icon: ShieldCheck, title: "Data aman & terisolasi", desc: "Setiap klinik punya data terpisah dengan keamanan berlapis." },
];

export default function DaftarPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-50/60 via-white to-white">
      {/* Top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white">K</span>
          <span className="text-[15px] font-extrabold tracking-tight text-gray-900">Platform Klinik</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Beranda
        </Link>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-2 lg:gap-16 lg:py-14">
        {/* Kiri — value proposition */}
        <div className="lg:pt-6">
          <span className="inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
            Gratis untuk memulai
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl">
            Buka klinik terapi Anda{" "}
            <span className="text-teal-600">secara online</span>
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-gray-600">
            Daftarkan klinik Fisioterapi atau Okupasi Terapi Anda. Dapatkan landing page,
            sistem booking, dan dashboard operasional — semuanya siap pakai.
          </p>

          <ul className="mt-8 space-y-4">
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <li key={b.title} className="flex items-start gap-3.5">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-teal-600 shadow-sm ring-1 ring-gray-100">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{b.title}</p>
                    <p className="mt-0.5 text-sm text-gray-500">{b.desc}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-8 rounded-2xl bg-white/70 p-4 text-sm text-gray-500 ring-1 ring-gray-100">
            Setelah mendaftar, tim kami meninjau pengajuan Anda lalu mengaktifkan klinik
            beserta subdomain. Prosesnya cepat dan Anda akan dihubungi langsung.
          </p>
        </div>

        {/* Kanan — form */}
        <div className="lg:pt-2">
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
