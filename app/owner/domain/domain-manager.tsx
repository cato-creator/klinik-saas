"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Globe, CheckCircle2, AlertCircle, ExternalLink, Trash2, RefreshCw, Copy,
} from "lucide-react";
import { addDomain, verifyDomain, removeDomain, type DomainResult } from "./actions";
import { dnsHostLabel, apexDomain } from "@/lib/tenant/host";

type DomainRow = {
  custom_domain: string;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
  cf_status?: string | null;
};

// Label ramah-pengguna untuk status Cloudflare.
function cfStatusLabel(s?: string | null): string | null {
  switch (s) {
    case "active":
      return "Cloudflare: SSL aktif";
    case "pending_validation":
      return "Cloudflare: sedang menerbitkan SSL…";
    case "pending":
      return "Cloudflare: menunggu CNAME";
    case null:
    case undefined:
      return null;
    default:
      return `Cloudflare: ${s}`;
  }
}

function useToasted(state: DomainResult | null) {
  useEffect(() => {
    if (!state) return;
    if (state.error) toast.error(state.error);
    else if (state.info) toast.success(state.info);
  }, [state]);
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="mt-0.5 flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-left font-mono text-sm text-gray-800 hover:bg-gray-100"
      >
        <span className="truncate">{value}</span>
        {copied ? (
          <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-teal-600" />
        ) : (
          <Copy className="ml-auto h-4 w-4 shrink-0 text-gray-400" />
        )}
      </button>
    </div>
  );
}

export default function DomainManager({
  domain,
  rootDomain,
  clinicActive,
}: {
  domain: DomainRow | null;
  rootDomain: string;
  clinicActive: boolean;
}) {
  const [addState, addAction, adding] = useActionState<DomainResult | null, FormData>(addDomain, null);
  const [verifyState, verifyAction, verifying] = useActionState<DomainResult | null, FormData>(verifyDomain, null);
  const [removeState, removeAction, removing] = useActionState<DomainResult | null, FormData>(removeDomain, null);
  useToasted(addState);
  useToasted(verifyState);
  useToasted(removeState);

  // ── Belum ada domain → form tambah ──
  if (!domain) {
    return (
      <div className="space-y-4">
        {!clinicActive && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Langganan klinik harus aktif untuk memakai domain sendiri.
          </div>
        )}
        <form action={addAction} className="rounded-2xl border border-gray-100 bg-white p-5">
          <label className="text-sm font-semibold text-gray-900">Domain Anda</label>
          <p className="mb-2 text-xs text-gray-500">
            Disarankan pakai <span className="font-mono">www.domainanda.com</span> (atau subdomain lain
            seperti <span className="font-mono">klinik.domainanda.com</span>). Hindari domain polos tanpa
            awalan (<span className="font-mono">domainanda.com</span>) — lihat catatan apex di bawah.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 items-center rounded-xl border border-gray-200 px-3">
              <Globe className="h-4 w-4 text-gray-400" />
              <input
                name="custom_domain"
                placeholder="www.domainanda.com"
                required
                disabled={!clinicActive}
                className="w-full bg-transparent px-2 py-2.5 text-sm outline-none disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={adding || !clinicActive}
              className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {adding ? "Menyimpan…" : "Simpan Domain"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Sudah ada domain ──
  const liveUrl = `https://${domain.custom_domain}`;
  return (
    <div className="space-y-4">
      {/* Status domain */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
              <Globe className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{domain.custom_domain}</p>
              {domain.verified ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Terverifikasi &amp; aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                  <AlertCircle className="h-3.5 w-3.5" /> Menunggu pengaturan DNS
                </span>
              )}
              {!domain.verified && cfStatusLabel(domain.cf_status) && (
                <p className="text-[11px] text-gray-400">{cfStatusLabel(domain.cf_status)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {domain.verified && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-teal-700 hover:bg-teal-50"
              >
                <ExternalLink className="h-4 w-4" /> Buka
              </a>
            )}
            <form action={removeAction}>
              <button
                type="submit"
                disabled={removing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" /> Hapus
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Instruksi DNS — selalu tampil agar owner bisa rujuk ulang */}
      {!domain.verified && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Langkah pengaturan DNS</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-gray-600">
            <li>Masuk ke pengelola DNS domain Anda (tempat domain dibeli/dikelola).</li>
            <li>Buat <span className="font-semibold">satu record CNAME</span> dengan nilai berikut:</li>
          </ol>

          <div className="mt-3 grid gap-3 rounded-xl bg-gray-50 p-3 sm:grid-cols-3">
            <CopyField label="Type" value="CNAME" />
            <CopyField label="Name / Host" value={dnsHostLabel(domain.custom_domain)} />
            <CopyField label="Target / Value" value={rootDomain} />
          </div>

          <p className="mt-3 text-xs text-gray-500">
            <span className="font-semibold">Name / Host</span> diisi hanya bagian depannya saja (mis.{" "}
            <span className="font-mono">{dnsHostLabel(domain.custom_domain)}</span>) — JANGAN tempel
            domain lengkap, nanti jadi record ganda.
          </p>

          <form action={verifyAction} className="mt-4">
            <button
              type="submit"
              disabled={verifying}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${verifying ? "animate-spin" : ""}`} />
              {verifying ? "Mengecek DNS…" : "Sudah saya atur — Verifikasi"}
            </button>
          </form>
          <p className="mt-2 text-xs text-gray-400">
            Propagasi DNS bisa butuh beberapa menit hingga 1 jam. Jika belum terdeteksi, tunggu lalu coba lagi.
          </p>
        </div>
      )}

      {/* Catatan apex → www — kenapa domain polos perlu pengalihan terpisah.
          Hanya relevan bila domain punya awalan (apex ≠ domain itu sendiri). */}
      {apexDomain(domain.custom_domain) !== domain.custom_domain && (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold">
              Agar <span className="font-mono">{apexDomain(domain.custom_domain)}</span> (tanpa awalan) juga terbuka
            </p>
            <p className="mt-1 text-amber-800">
              Domain polos tanpa awalan (disebut <span className="font-medium">apex</span>) <span className="font-medium">tidak
              bisa</span> diarahkan dengan CNAME — ini batasan aturan DNS, bukan kesalahan klinik. Karena itu, kalau orang
              mengetik <span className="font-mono">{apexDomain(domain.custom_domain)}</span> langsung, halaman tidak terbuka
              (error 522). Solusinya: buat <span className="font-medium">pengalihan (redirect)</span> apex ke{" "}
              <span className="font-mono">{domain.custom_domain}</span> di tempat Anda mengelola domain.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
              <li>
                <span className="font-medium">Jika domain dikelola di Cloudflare:</span> buat{" "}
                <span className="font-mono">Redirect Rule</span> →{" "}
                <span className="font-mono">{apexDomain(domain.custom_domain)}/*</span> diarahkan ke{" "}
                <span className="font-mono">https://{domain.custom_domain}/$1</span> (tipe 301).
              </li>
              <li>
                <span className="font-medium">Jika di registrar lain</span> (Niagahoster, Hostinger, GoDaddy, dll): cari
                fitur <span className="font-mono">URL Forwarding</span> / <span className="font-mono">Domain Redirect</span>,
                arahkan <span className="font-mono">{apexDomain(domain.custom_domain)}</span> ke{" "}
                <span className="font-mono">https://{domain.custom_domain}</span>.
              </li>
            </ul>
            <p className="mt-2 text-xs text-amber-700">
              Catatan: ini hanya perlu kalau Anda ingin versi tanpa awalan ikut terbuka. Versi{" "}
              <span className="font-mono">{domain.custom_domain}</span> sendiri sudah cukup untuk dipromosikan ke pasien.
            </p>
          </div>
        </div>
      </div>
      )}

      {/* Catatan SSL / Cloudflare for SaaS */}
      {!domain.verified && (
        <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Sertifikat HTTPS untuk domain Anda diaktifkan oleh tim platform setelah DNS terhubung
            (Cloudflare for SaaS). Bila domain sudah verified tapi belum bisa dibuka via HTTPS,
            hubungi admin platform.
          </span>
        </div>
      )}

    </div>
  );
}
