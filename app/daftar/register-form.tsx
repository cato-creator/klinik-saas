"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  Eye, EyeOff, CheckCircle2, ArrowRight, Loader2,
} from "lucide-react";
import { registerClinic, type RegisterResult } from "./actions";
import { DisciplinePicker } from "@/components/disciplines/discipline-picker";

const fieldCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";
const labelCls = "mb-1.5 block text-sm font-medium text-gray-700";

export default function RegisterForm() {
  const [state, action, pending] = useActionState<RegisterResult | null, FormData>(
    registerClinic,
    null,
  );
  const [showPass, setShowPass] = useState(false);

  // ── Layar sukses ──
  if (state?.ok) {
    return (
      <div className="rounded-3xl border border-teal-100 bg-white p-8 text-center shadow-xl shadow-teal-900/5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50">
          <CheckCircle2 className="h-9 w-9 text-teal-600" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-gray-900">Pendaftaran terkirim!</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-600">
          Terima kasih. Pendaftaran klinik Anda sedang <b>ditinjau oleh tim kami</b>.
          Akun Anda belum aktif untuk sementara.
        </p>
        <div className="mx-auto mt-4 max-w-sm rounded-2xl bg-teal-50 px-4 py-3 text-left text-sm text-teal-800 ring-1 ring-teal-100">
          Setelah disetujui, kami akan <b>menghubungi Anda</b> beserta tautan untuk masuk ke
          dashboard klinik. Anda baru bisa login setelah klinik dikonfirmasi.
        </div>
        <div className="mt-6 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-900/5 sm:p-8"
    >
      {/* Honeypot anti-bot — disembunyikan dari user & screen reader */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {/* Layanan klinik (boleh lebih dari satu) */}
      <DisciplinePicker label="Layanan klinik" />

      {/* Data klinik */}
      <div className="mt-6 space-y-4">
        <div>
          <label className={labelCls} htmlFor="name">Nama klinik</label>
          <input id="name" name="name" required className={fieldCls} placeholder="Klinik Sehat Mandiri" />
        </div>
        <div>
          <label className={labelCls} htmlFor="address">Alamat klinik <span className="font-normal text-gray-400">(opsional)</span></label>
          <input id="address" name="address" className={fieldCls} placeholder="Jl. Melati No. 10, Surabaya" />
        </div>
      </div>

      {/* Akun owner */}
      <div className="mt-6 border-t border-gray-100 pt-6">
        <p className="mb-4 text-sm font-semibold text-gray-900">Akun pemilik (owner)</p>
        <div className="space-y-4">
          <div>
            <label className={labelCls} htmlFor="owner_name">Nama lengkap</label>
            <input id="owner_name" name="owner_name" required className={fieldCls} placeholder="Nama lengkap Anda" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="owner_email">Email</label>
              <input id="owner_email" name="owner_email" type="email" required className={fieldCls} placeholder="email@contoh.com" />
            </div>
            <div>
              <label className={labelCls} htmlFor="owner_phone">No. WhatsApp</label>
              <input id="owner_phone" name="owner_phone" type="tel" required className={fieldCls} placeholder="0812xxxxxxx" />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPass ? "text" : "password"}
                required
                minLength={8}
                className={`${fieldCls} pr-11`}
                placeholder="Minimal 8 karakter"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="password_confirm">Ulangi password</label>
            <input
              id="password_confirm"
              name="password_confirm"
              type={showPass ? "text" : "password"}
              required
              minLength={8}
              className={fieldCls}
              placeholder="Ketik ulang password"
            />
          </div>
        </div>
      </div>

      {state?.error && (
        <p className="mt-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:-translate-y-0.5 hover:bg-teal-700 disabled:translate-y-0 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Mengirim…
          </>
        ) : (
          <>
            Daftarkan klinik <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="mt-4 text-center text-xs text-gray-500">
        Sudah punya akun?{" "}
        <Link href="/auth/login" className="font-semibold text-teal-600 hover:underline">
          Masuk di sini
        </Link>
      </p>
    </form>
  );
}
