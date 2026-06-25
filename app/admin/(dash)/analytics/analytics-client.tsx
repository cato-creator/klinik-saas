"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, BarChart, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from "recharts";
import type { Analytics, ClinicMetric, RangeKey } from "@/lib/admin/analytics";
import { formatRupiah, formatRupiahShort, CLINIC_TYPE_LABEL, STATUS_LABEL } from "@/lib/format";

const C_INCOME = "#1D9E75";
const C_EXPENSE = "#E24B4A";
const C_SUB = "#378ADD";
const C_VISIT = "#7F77DD";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "30", label: "30 hari" },
  { key: "90", label: "90 hari" },
  { key: "year", label: "Tahun ini" },
  { key: "all", label: "Semua" },
];

type LeaderMetric = "visits" | "income" | "patients" | "subRevenue";
const LEADER: { key: LeaderMetric; label: string; color: string; money: boolean }[] = [
  { key: "visits", label: "Klinik paling ramai", color: C_VISIT, money: false },
  { key: "income", label: "Pemasukan tertinggi", color: C_INCOME, money: true },
  { key: "patients", label: "Pasien terbanyak", color: C_SUB, money: false },
  { key: "subRevenue", label: "Langganan tertinggi", color: "#EF9F27", money: true },
];

type TrendMetric = "operasional" | "langganan" | "kunjungan";

export default function AnalyticsClient({ data }: { data: Analytics }) {
  const [mounted, setMounted] = useState(false);
  const [leader, setLeader] = useState<LeaderMetric>("visits");
  const [trend, setTrend] = useState<TrendMetric>("operasional");
  useEffect(() => setMounted(true), []);

  const leaderCfg = LEADER.find((l) => l.key === leader)!;
  const leaderData = useMemo(() => {
    return [...data.perClinic]
      .sort((a, b) => (b[leader] as number) - (a[leader] as number))
      .slice(0, 8)
      .map((m) => ({ name: m.name, value: m[leader] as number }))
      .filter((d) => d.value > 0);
  }, [data.perClinic, leader]);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Analitik Platform</h1>
        {/* Selektor rentang (server-side via query ?range) */}
        <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/admin/analytics?range=${r.key}`}
              scroll={false}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                data.range.key === r.key
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>
      <p className="mb-5 text-sm text-zinc-500">
        Periode: <span className="font-medium text-zinc-600 dark:text-zinc-300">{data.range.label}</span> · keuangan operasional & langganan dipisah.
      </p>

      <SectionTitle>Keuangan operasional klinik (buku kas semua klinik)</SectionTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total pemasukan" value={formatRupiah(data.totals.income)} mom={data.totals.incomeMoM} tone="emerald" />
        <StatCard label="Total pengeluaran" value={formatRupiah(data.totals.expense)} tone="red" />
        <StatCard label="Laba operasional" value={formatRupiah(data.totals.profit)} sub="Pemasukan − pengeluaran"
          tone={data.totals.profit >= 0 ? "emerald" : "red"} />
        <StatCard label="Total kunjungan" value={data.totals.visits.toLocaleString("id-ID")} mom={data.totals.visitsMoM}
          sub={`${data.totals.patients.toLocaleString("id-ID")} pasien`} tone="violet" />
      </div>

      <SectionTitle className="mt-6">Langganan ke platform (pendapatanmu)</SectionTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total langganan" value={formatRupiah(data.totals.subRevenue)} mom={data.totals.subMoM} tone="blue" />
        <StatCard label="Klinik aktif" value={data.totals.active} sub={`dari ${data.totals.clinics} klinik`} tone="emerald" />
        <StatCard label="Menunggu approval" value={data.totals.pending} sub="butuh ditinjau" tone="amber" />
        <StatCard label="Rata-rata / klinik aktif"
          value={formatRupiahShort(data.totals.active ? data.totals.subRevenue / data.totals.active : 0)}
          sub="langganan periode ini" tone="blue" />
      </div>
      <p className="mt-2 text-xs text-zinc-400">Chip ↑/↓ = perubahan bulan kalender ini vs bulan lalu (tak terpengaruh filter rentang).</p>

      {/* Tren bulanan */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Tren 12 bulan</h2>
          <Segmented
            options={[
              { key: "operasional", label: "Operasional" },
              { key: "langganan", label: "Langganan" },
              { key: "kunjungan", label: "Kunjungan" },
            ]}
            value={trend}
            onChange={(v) => setTrend(v as TrendMetric)}
          />
        </div>
        <div className="h-64 w-full">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.monthly} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9a9a93" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9a9a93" }} axisLine={false} tickLine={false}
                  width={trend === "kunjungan" ? 32 : 56}
                  tickFormatter={(v) => (trend === "kunjungan" ? String(v) : formatRupiahShort(v))} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(128,128,128,0.2)" }}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      income: "Pemasukan", expense: "Pengeluaran", subRevenue: "Langganan", visits: "Kunjungan",
                    };
                    return [trend === "kunjungan" ? String(value) : formatRupiah(Number(value)), labels[String(name)] ?? String(name)];
                  }}
                />
                {trend === "operasional" && <>
                  <Bar dataKey="income" fill={C_INCOME} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="expense" fill={C_EXPENSE} radius={[4, 4, 0, 0]} maxBarSize={22} />
                </>}
                {trend === "langganan" && <Bar dataKey="subRevenue" fill={C_SUB} radius={[4, 4, 0, 0]} maxBarSize={36} />}
                {trend === "kunjungan" && <Line type="monotone" dataKey="visits" stroke={C_VISIT} strokeWidth={2} dot={{ r: 3 }} />}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
        {trend === "operasional" && (
          <div className="mt-2 flex gap-4 text-xs text-zinc-500">
            <LegendDot color={C_INCOME} label="Pemasukan" />
            <LegendDot color={C_EXPENSE} label="Pengeluaran" />
          </div>
        )}
      </section>

      {/* Leaderboard */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Peringkat klinik <span className="text-xs font-normal text-zinc-400">({data.range.label})</span></h2>
          <Segmented
            options={LEADER.map((l) => ({ key: l.key, label: l.label.replace("Klinik ", "") }))}
            value={leader}
            onChange={(v) => setLeader(v as LeaderMetric)}
          />
        </div>
        <div className="h-72 w-full">
          {mounted && leaderData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaderData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9a9a93" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => (leaderCfg.money ? formatRupiahShort(v) : String(v))} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: "#71717a" }}
                  axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(128,128,128,0.08)" }}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(128,128,128,0.2)" }}
                  formatter={(value) => [leaderCfg.money ? formatRupiah(Number(value)) : String(value), leaderCfg.label]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {leaderData.map((_, i) => (
                    <Cell key={i} fill={leaderCfg.color} fillOpacity={1 - i * 0.07} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">Belum ada data</div>
          )}
        </div>
      </section>

      {/* Tabel semua klinik + export */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">Semua klinik <span className="text-xs font-normal text-zinc-400">({data.range.label})</span></h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                <th className="px-3 py-2 font-medium">Klinik</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Kunjungan</th>
                <th className="px-3 py-2 text-right font-medium">Pasien</th>
                <th className="px-3 py-2 text-right font-medium">Pemasukan</th>
                <th className="px-3 py-2 text-right font-medium">Laba</th>
                <th className="px-3 py-2 text-right font-medium">Langganan</th>
                <th className="px-3 py-2 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {[...data.perClinic].sort((a, b) => b.income - a.income).map((m) => (
                <Row key={m.id} m={m} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Export data pasien (termasuk rekam medis) ada di halaman detail tiap klinik.
        </p>
      </section>
    </div>
  );
}

function Row({ m }: { m: ClinicMetric }) {
  return (
    <tr className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
      <td className="px-3 py-2">
        <Link href={`/admin/clinics/${m.id}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
          {m.name}
        </Link>
        <span className="ml-2 text-xs text-zinc-400">{CLINIC_TYPE_LABEL[m.type] ?? m.type}</span>
      </td>
      <td className="px-3 py-2 text-zinc-500">{STATUS_LABEL[m.status] ?? m.status}</td>
      <td className="px-3 py-2 text-right tabular-nums">{m.visits.toLocaleString("id-ID")}</td>
      <td className="px-3 py-2 text-right tabular-nums">{m.patients.toLocaleString("id-ID")}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatRupiahShort(m.income)}</td>
      <td className={`px-3 py-2 text-right tabular-nums ${m.profit < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
        {formatRupiahShort(m.profit)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{formatRupiahShort(m.subRevenue)}</td>
      <td className="px-3 py-2">
        <a
          href={`/api/admin/laporan/export?clinic_id=${m.id}`}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
        >
          ⬇ Keuangan
        </a>
      </td>
    </tr>
  );
}

function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 ${className}`}>{children}</h2>;
}

function GrowthChip({ mom }: { mom: number | null }) {
  if (mom === null) return null;
  const up = mom >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium ${
      up ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
         : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
    }`}>
      {up ? "↑" : "↓"} {Math.abs(mom).toFixed(0)}%
    </span>
  );
}

function StatCard({
  label, value, sub, tone, mom,
}: { label: string; value: string | number; sub?: string; tone: string; mom?: number | null }) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    blue: "text-blue-600 dark:text-blue-400",
    red: "text-red-600 dark:text-red-400",
    violet: "text-violet-600 dark:text-violet-400",
  };
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${tones[tone]}`}>{value}</div>
      <div className="mt-0.5 flex items-center gap-2">
        {mom !== undefined && <GrowthChip mom={mom ?? null} />}
        {sub && <span className="text-xs text-zinc-400">{sub}</span>}
      </div>
    </div>
  );
}

function Segmented({
  options, value, onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
            value === o.key
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
