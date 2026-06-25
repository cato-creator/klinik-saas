"use client";

import { useState } from "react";
import { toast } from "sonner";
import { fetchAndDownloadXlsx } from "@/lib/xlsx-client";

// Tombol unduh Excel generik: ambil spec JSON dari route export lalu rakit .xlsx
// di browser. Pengganti tag <a href> langsung (kini route balas JSON, bukan file).
export default function ExcelDownloadLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try {
      await fetchAndDownloadXlsx(href);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={handle} disabled={loading} className={className}>
      {loading ? "Menyiapkan…" : children}
    </button>
  );
}
