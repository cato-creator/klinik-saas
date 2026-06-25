// Navbar & footer bersama template Fisioterapi (dipakai landing & halaman riwayat).
// Server component murni (tanpa state) → ringan & cacheable.
import Link from "next/link";
import { Activity, MapPin, Phone, Mail, AtSign, Clock } from "lucide-react";
import type { LandingClinic, LandingContent } from "@/lib/tenant/landing";

const DAY_LABEL: Record<string, string> = {
  mon: "Senin", tue: "Selasa", wed: "Rabu", thu: "Kamis",
  fri: "Jumat", sat: "Sabtu", sun: "Minggu",
};
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function FisioNav({
  clinic,
  bookingOpen,
}: {
  clinic: LandingClinic;
  bookingOpen: boolean;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-teal-50 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          {clinic.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clinic.logo_url} alt={clinic.name} className="h-9 w-9 rounded-xl object-cover shadow-sm" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm">
              <Activity className="h-5 w-5" />
            </span>
          )}
          <span className="text-[15px] font-extrabold tracking-tight text-gray-900">{clinic.name}</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-gray-600 md:flex">
          <Link href="/" className="transition-colors hover:text-teal-600">Beranda</Link>
          <Link href="/#layanan" className="transition-colors hover:text-teal-600">Layanan</Link>
          <Link href="/#terapis" className="transition-colors hover:text-teal-600">Terapis</Link>
          <Link href="/tentang" className="transition-colors hover:text-teal-600">Tentang</Link>
          <Link href="/#kontak" className="transition-colors hover:text-teal-600">Kontak</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/auth/login" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-gray-500 hover:text-teal-600 sm:block">
            Masuk
          </Link>
          {bookingOpen && (
            <Link
              href="/booking"
              className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-teal-600/20 transition-all hover:-translate-y-0.5 hover:bg-teal-700"
            >
              Booking
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function FisioFooter({
  clinic,
  content,
}: {
  clinic: LandingClinic;
  content: LandingContent;
}) {
  const wa = content.contact_whatsapp || clinic.phone_number;
  const hours = clinic.operating_hours ?? null;

  return (
    <footer id="kontak" className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
              <Activity className="h-5 w-5" />
            </span>
            <span className="text-base font-extrabold text-gray-900">{clinic.name}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            {clinic.description || "Layanan fisioterapi profesional untuk pemulihan optimal Anda."}
          </p>
        </div>

        {/* Kontak */}
        <div>
          <h4 className="text-sm font-bold text-gray-900">Kontak</h4>
          <ul className="mt-4 space-y-3 text-sm text-gray-600">
            {clinic.address && (
              <li className="flex gap-2.5"><MapPin className="h-4 w-4 flex-shrink-0 text-teal-600" /> <span>{clinic.address}</span></li>
            )}
            {wa && (
              <li className="flex gap-2.5"><Phone className="h-4 w-4 flex-shrink-0 text-teal-600" /> <span>{wa}</span></li>
            )}
            {content.contact_email && (
              <li className="flex gap-2.5"><Mail className="h-4 w-4 flex-shrink-0 text-teal-600" /> <span>{content.contact_email}</span></li>
            )}
            {content.instagram && (
              <li className="flex gap-2.5"><AtSign className="h-4 w-4 flex-shrink-0 text-teal-600" /> <span>{content.instagram}</span></li>
            )}
          </ul>
        </div>

        {/* Jam operasional */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Clock className="h-4 w-4 text-teal-600" /> Jam Operasional
          </h4>
          <ul className="mt-4 space-y-1.5 text-sm text-gray-600">
            {hours && Object.keys(hours).length > 0 ? (
              DAY_ORDER.filter((d) => hours[d]).map((d) => (
                <li key={d} className="flex justify-between gap-4">
                  <span className="text-gray-500">{DAY_LABEL[d]}</span>
                  <span className="font-medium text-gray-700">{hours[d]}</span>
                </li>
              ))
            ) : (
              <li className="text-gray-400">Senin–Sabtu, 08.00–20.00</li>
            )}
          </ul>
        </div>

        {/* Tautan */}
        <div>
          <h4 className="text-sm font-bold text-gray-900">Tautan</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-gray-600">
            <li><Link href="/" className="hover:text-teal-600">Beranda</Link></li>
            <li><Link href="/#layanan" className="hover:text-teal-600">Layanan</Link></li>
            <li><Link href="/tentang" className="hover:text-teal-600">Tentang & Riwayat</Link></li>
            <li><Link href="/booking" className="hover:text-teal-600">Booking Online</Link></li>
            <li><Link href="/auth/login" className="hover:text-teal-600">Masuk Akun</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-100 py-5 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} {clinic.name}. Seluruh hak cipta dilindungi.
      </div>
    </footer>
  );
}
