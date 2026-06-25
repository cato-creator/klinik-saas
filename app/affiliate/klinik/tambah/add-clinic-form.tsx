"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Check } from "lucide-react";
import { DisciplinePicker } from "@/components/disciplines/discipline-picker";
import { sanitizeSpecializations } from "@/lib/disciplines";

const inp =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";
const lbl = "block text-sm font-medium text-gray-700";

export default function AddClinicForm() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const specializations = sanitizeSpecializations(String(fd.get("specializations") ?? "").split(","));
    if (specializations.length === 0) {
      setError("Pilih minimal satu layanan klinik.");
      setSaving(false);
      return;
    }
    const payload = {
      name: String(fd.get("name") ?? ""),
      clinic_type: String(fd.get("clinic_type") ?? "") || specializations[0],
      specializations,
      address: String(fd.get("address") ?? ""),
      phone_number: String(fd.get("phone_number") ?? ""),
      owner_name: String(fd.get("owner_name") ?? ""),
      owner_email: String(fd.get("owner_email") ?? ""),
      owner_password: String(fd.get("owner_password") ?? ""),
    };
    try {
      const res = await fetch("/api/affiliate/clinic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan.");
        return;
      }
      setTempPassword(data.tempPassword ?? "");
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  }

  if (tempPassword !== null) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-emerald-800">
          <Check className="h-5 w-5" /> Klinik berhasil ditambahkan
        </h2>
        <p className="mt-1 text-sm text-emerald-700">
          Status klinik: <b>menunggu approval</b>. Sampaikan kredensial berikut ke owner secara manual.
          Owner baru bisa login setelah klinik disetujui.
        </p>
        {tempPassword && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-4 font-mono text-sm">
            <div className="text-gray-500">Password owner:</div>
            <div className="mt-1 select-all text-lg font-semibold text-gray-900">{tempPassword}</div>
          </div>
        )}
        <div className="mt-5 flex gap-3">
          <Link href="/affiliate/klinik" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Ke Klinik Saya
          </Link>
          <button
            onClick={() => setTempPassword(null)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Tambah lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-800">Data Klinik</h2>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Nama klinik *</label>
            <input name="name" required minLength={3} className={inp} placeholder="Klinik Sehat Mandiri" />
          </div>
          <DisciplinePicker label="Layanan klinik *" />
          <div>
            <label className={lbl}>Alamat</label>
            <input name="address" className={inp} placeholder="Jl. ... (opsional)" />
          </div>
          <div>
            <label className={lbl}>No. HP klinik</label>
            <input name="phone_number" className={inp} placeholder="08xx (opsional)" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-800">Akun Owner</h2>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Nama owner *</label>
            <input name="owner_name" required minLength={3} className={inp} placeholder="Nama lengkap owner" />
          </div>
          <div>
            <label className={lbl}>Email owner *</label>
            <input name="owner_email" type="email" required className={inp} placeholder="owner@contoh.com" />
          </div>
          <div>
            <label className={lbl}>Password owner *</label>
            <input name="owner_password" type="text" required minLength={8} className={inp} placeholder="Minimal 8 karakter" />
            <p className="mt-1 text-xs text-gray-500">Tentukan password login owner. Sampaikan ke owner secara manual.</p>
          </div>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</> : "Tambah klinik"}
        </button>
        <Link href="/affiliate/klinik" className="rounded-lg border border-gray-300 px-5 py-2 text-sm text-gray-700 hover:bg-gray-50">
          Batal
        </Link>
      </div>
    </form>
  );
}
