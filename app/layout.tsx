import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Platform Klinik — Website & Booking Online Klinik Terapi",
    // Halaman dalam dapat memakai judulnya sendiri; landing klinik memakai
    // judul ABSOLUT (nama klinik) lewat generateMetadata, tanpa imbuhan ini.
    template: "%s · Platform Klinik",
  },
  description:
    "Punya website sendiri, terima booking online 24 jam, dan kelola jadwal, pasien, hingga keuangan dari satu dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
