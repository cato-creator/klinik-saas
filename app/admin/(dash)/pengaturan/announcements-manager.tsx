"use client";

import { useActionState } from "react";
import {
  createAnnouncement, toggleAnnouncement, deleteAnnouncement, type ActionResult,
} from "../../actions";

export type Announcement = {
  id: string;
  message: string;
  level: string;
  is_active: boolean;
  created_at: string;
};

const LEVEL_STYLE: Record<string, string> = {
  info: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export default function AnnouncementsManager({ items }: { items: Announcement[] }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createAnnouncement, null);

  return (
    <div>
      <form action={action} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Pesan pengumuman</label>
          <textarea
            name="message"
            rows={2}
            placeholder="Contoh: Maintenance terjadwal Minggu 22 Jun pukul 23.00–24.00 WIB."
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Jenis</label>
            <select name="level" defaultValue="info"
              className="mt-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800">
              <option value="info">Info (biru)</option>
              <option value="warning">Peringatan (kuning)</option>
              <option value="success">Sukses (hijau)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? "Menyimpan…" : "Terbitkan"}
          </button>
        </div>
        {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      </form>

      <div className="mt-5 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">Belum ada pengumuman.</p>
        ) : items.map((a) => <Item key={a.id} a={a} />)}
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Pengumuman yang aktif tampil sebagai banner di dashboard semua owner.
      </p>
    </div>
  );
}

function Item({ a }: { a: Announcement }) {
  const [, toggle, tPending] = useActionState<ActionResult | null, FormData>(toggleAnnouncement, null);
  const [, del, dPending] = useActionState<ActionResult | null, FormData>(deleteAnnouncement, null);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${LEVEL_STYLE[a.level] ?? LEVEL_STYLE.info}`}>{a.level}</span>
          {!a.is_active && <span className="text-xs text-zinc-400">(nonaktif)</span>}
        </div>
        <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">{a.message}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <form action={toggle}>
          <input type="hidden" name="id" value={a.id} />
          <input type="hidden" name="is_active" value={(!a.is_active).toString()} />
          <button type="submit" disabled={tPending}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
            {a.is_active ? "Nonaktifkan" : "Aktifkan"}
          </button>
        </form>
        <form action={del}>
          <input type="hidden" name="id" value={a.id} />
          <button type="submit" disabled={dPending}
            className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:bg-red-950/40 dark:text-red-300">
            Hapus
          </button>
        </form>
      </div>
    </div>
  );
}
