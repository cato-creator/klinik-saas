"use client";

import { useActionState } from "react";
import { createSelfHostedClinic, updateSelfHostedInfra, type ActionResult } from "./actions";
import type { SelfHostedClinic } from "@/lib/controlplane/self-hosted";
import { DISCIPLINES } from "@/lib/disciplines";

const input =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800";
const label = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

function Field({ name, label: lbl, defaultValue, placeholder, hint, required }: {
  name: string; label: string; defaultValue?: string | null; placeholder?: string; hint?: string; required?: boolean;
}) {
  return (
    <div>
      <label className={label}>
        {lbl} {required && <span className="text-red-500">*</span>}
      </label>
      <input name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} className={input} />
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export default function ClinicForm({ clinic }: { clinic?: SelfHostedClinic }) {
  const isEdit = !!clinic;
  const action = isEdit ? updateSelfHostedInfra : createSelfHostedClinic;
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null);
  // Disiplin terpilih (klinik bisa buka 1, 2, atau semua). Baru → default Fisioterapi.
  const selected = new Set(clinic?.specializations?.length ? clinic.specializations : ["fisioterapi"]);

  return (
    <form action={formAction} className="space-y-6">
      {isEdit && <input type="hidden" name="clinic_id" value={clinic!.id} />}

      {/* Identitas */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Identitas klinik</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field name="name" label="Nama klinik" defaultValue={clinic?.name} required />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Layanan klinik <span className="text-red-500">*</span></label>
            <p className="mt-0.5 mb-2 text-xs text-zinc-500">Pilih satu, dua, atau semua. Disiplin pertama jadi tema utama landing.</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {DISCIPLINES.map((d) => {
                const Icon = d.icon;
                return (
                  <label
                    key={d.key}
                    className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-300 p-3 transition-colors has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 dark:border-zinc-700 dark:has-[:checked]:border-emerald-500 dark:has-[:checked]:bg-emerald-950/30"
                  >
                    <input
                      type="checkbox"
                      name="specializations"
                      value={d.key}
                      defaultChecked={selected.has(d.key)}
                      className="mt-0.5 h-4 w-4 accent-emerald-600"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        <Icon size={15} aria-hidden /> {d.label}
                      </span>
                      <span className="block text-xs text-zinc-500">{d.desc}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <Field name="owner_name" label="Nama owner" defaultValue={clinic?.owner_name} />
          <Field name="owner_email" label="Email owner" defaultValue={clinic?.owner_email} placeholder="owner@klinik.com" />
          <Field name="owner_phone" label="No. HP owner" defaultValue={clinic?.owner_phone} />
          <Field name="target_domain" label="Domain klinik" defaultValue={clinic?.target_domain} placeholder="klinikanda.com" />
        </div>
      </section>

      {/* Infrastruktur non-rahasia */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Infrastruktur (non-rahasia)</h2>
        <p className="text-xs text-zinc-500">
          Hanya URL &amp; ID. Service_role key, password DB, dan token Cloudflare diisi terpisah di brankas
          {isEdit ? " di bawah" : " setelah klinik dibuat"} (terenkripsi).
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="supabase_url" label="Supabase URL" defaultValue={clinic?.supabase_url} placeholder="https://xxxx.supabase.co" />
          <Field name="supabase_project_ref" label="Supabase project ref" defaultValue={clinic?.supabase_project_ref} placeholder="xxxxxxxxxxxx" />
          <div className="sm:col-span-2">
            <Field name="supabase_anon_key" label="Supabase anon key (semi-publik)" defaultValue={clinic?.supabase_anon_key} hint="Boleh disimpan apa adanya — key ini memang ikut ke browser." />
          </div>
          <Field name="cloudflare_account_id" label="Cloudflare account ID" defaultValue={clinic?.cloudflare_account_id} />
          <Field name="cloudflare_pages_project" label="Nama project Worker/Pages" defaultValue={clinic?.cloudflare_pages_project} />
        </div>
      </section>

      {/* Status (hanya saat edit) */}
      {isEdit && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Status</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Status provisioning</label>
              <select name="provisioning_status" defaultValue={clinic?.provisioning_status ?? "draft"} className={input}>
                <option value="draft">Draft</option>
                <option value="provisioning">Provisioning</option>
                <option value="live">Live</option>
                <option value="suspended">Suspended</option>
                <option value="failed">Gagal</option>
              </select>
            </div>
            <div>
              <label className={label}>Status lisensi</label>
              <select name="license_status" defaultValue={clinic?.license_status ?? "active"} className={input}>
                <option value="active">Aktif</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </section>
      )}

      <div>
        <label className={label}>Catatan</label>
        <textarea name="notes" defaultValue={clinic?.notes ?? ""} rows={2} className={input} />
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600 dark:text-emerald-400">Tersimpan ✓</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : isEdit ? "Simpan perubahan" : "Buat klinik"}
      </button>
    </form>
  );
}
