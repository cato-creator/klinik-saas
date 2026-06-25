"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Building2, Wallet, KeyRound, LogOut } from "lucide-react";
import { MobileDrawer } from "@/components/ui/mobile-drawer";

const iconCls = "h-4 w-4";
const LINKS = [
  { href: "/affiliate", label: "Ringkasan", icon: <LayoutDashboard className={iconCls} /> },
  { href: "/affiliate/klinik", label: "Klinik Saya", icon: <Building2 className={iconCls} /> },
  { href: "/affiliate/komisi", label: "Komisi", icon: <Wallet className={iconCls} /> },
  { href: "/affiliate/akun", label: "Ganti Password", icon: <KeyRound className={iconCls} /> },
];

export default function AffiliateNav({ name }: { name: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Tutup drawer saat pindah halaman.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Ringkasan (/affiliate) adalah index → cocokkan PERSIS, jangan startsWith,
  // supaya tidak ikut menyala saat membuka /affiliate/klinik atau /affiliate/komisi.
  function isActive(href: string) {
    if (href === "/affiliate") return pathname === "/affiliate";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const links = (
    <nav className="flex-1 space-y-1 px-3">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
            isActive(l.href)
              ? "bg-indigo-50 font-medium text-indigo-700"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <span className="flex-shrink-0" aria-hidden>{l.icon}</span>
          {l.label}
        </Link>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
        <span className="text-sm font-bold text-white">A</span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900">Affiliator</p>
        <p className="text-xs text-gray-400">Platform Klinik</p>
      </div>
    </div>
  );

  const footer = (
    <div className="shrink-0 border-t border-gray-100 p-4">
      <div className="mb-1 flex items-center gap-3 px-3 py-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100">
          <span className="text-xs font-semibold text-indigo-700">{name?.[0]?.toUpperCase()}</span>
        </div>
        <span className="truncate text-sm font-medium text-gray-700">{name}</span>
      </div>
      <form action="/auth/signout" method="post">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50">
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Sidebar desktop — fixed tinggi penuh, menu scroll, footer menempel bawah */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gray-100 bg-white md:flex">
        <div className="shrink-0 border-b border-gray-100 p-5">{brand}</div>
        <div className="flex-1 overflow-y-auto py-4">{links}</div>
        {footer}
      </aside>

      {/* Top bar mobile — tombol menu di kiri (drawer geser dari kiri) */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-100"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
        {brand}
      </header>

      {/* Drawer mobile — geser halus */}
      <MobileDrawer open={open} onClose={() => setOpen(false)} hiddenFrom="md" widthClass="w-64">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          {brand}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4">{links}</div>
        {footer}
      </MobileDrawer>
    </>
  );
}
