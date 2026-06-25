"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileDrawer } from "@/components/ui/mobile-drawer";
import { signOut } from "../actions";

const LINKS = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/analytics", label: "Analitik", icon: "📈" },
  { href: "/admin/clinics", label: "Klinik", icon: "🏥" },
  { href: "/admin/self-hosted", label: "Self-Hosted", icon: "📦" },
  { href: "/admin/langganan", label: "Langganan", icon: "💳" },
  { href: "/admin/affiliates", label: "Affiliator", icon: "🤝" },
  { href: "/admin/domains", label: "Domain", icon: "🌐" },
  { href: "/admin/audit", label: "Aktivitas", icon: "🧾" },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: "⚙️" },
];

export default function AdminNav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    router.push(`/admin/search?q=${encodeURIComponent(term)}`);
    setQ("");
  }

  const searchForm = (
    <form onSubmit={submitSearch} className="px-3 pb-2 pt-1">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍 Cari klinik / orang…"
        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
      />
    </form>
  );

  // tutup drawer saat pindah halaman
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const links = (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            isActive(l.href)
              ? "bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          <span aria-hidden>{l.icon}</span>
          {l.label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="shrink-0 border-t border-zinc-200 px-3 py-4 dark:border-zinc-800">
      <div className="mb-2 truncate px-2 text-xs text-zinc-500">{name}</div>
      <form action={signOut}>
        <button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          ↩ Keluar
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Sidebar desktop — fixed tinggi penuh, menu scroll, footer menempel bawah */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-zinc-200 bg-white md:flex dark:border-zinc-800 dark:bg-zinc-900">
        <div className="shrink-0 px-5 py-5">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Platform Klinik</div>
          <div className="text-xs text-zinc-500">Super Admin</div>
        </div>
        {searchForm}
        {links}
        {footer}
      </aside>

      {/* Top bar mobile — tombol menu di kiri (drawer geser dari kiri) */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-900/90">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
        <div>
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Platform Klinik</div>
          <div className="text-xs text-zinc-500">Super Admin</div>
        </div>
      </header>

      {/* Drawer mobile — geser halus */}
      <MobileDrawer open={open} onClose={() => setOpen(false)} hiddenFrom="md" widthClass="w-64">
        <div className="flex h-full flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Platform Klinik</div>
              <div className="text-xs text-zinc-500">Super Admin</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup menu"
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>
          {searchForm}
          {links}
          {footer}
        </div>
      </MobileDrawer>
    </>
  );
}
