"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { fetchOverview, type Overview } from "@/lib/admin/overview";
import { formatRupiahShort } from "@/lib/format";

const STATUS_COLORS = ["#1D9E75", "#EF9F27", "#E24B4A", "#888780"];
const TYPE_COLORS = ["#378ADD", "#7F77DD"];

export default function OverviewClient() {
  const [data, setData] = useState<Overview | null>(null);
  const [live, setLive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supabaseRef = useRef(createClient());

  const refetch = useCallback(async () => {
    const d = await fetchOverview(supabaseRef.current);
    setData(d);
  }, []);

  useEffect(() => {
    setMounted(true);
    refetch();

    const supabase = supabaseRef.current;
    const scheduleRefetch = () => {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(refetch, 400);
    };

    const channel = supabase
      .channel("admin-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "clinics" }, scheduleRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, scheduleRefetch)
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  if (!data) {
    return (
      <div>
        <Header live={false} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
        <div className="mt-4 h-64 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      </div>
    );
  }

  const statusData = [
    { name: "Aktif", value: data.counts.active },
    { name: "Pending", value: data.counts.pending },
    { name: "Expired", value: data.counts.expired },
    { name: "Suspended", value: data.counts.suspended },
  ].filter((d) => d.value > 0);

  const typeData = [
    { name: "Fisioterapi", value: data.byType.fisioterapi },
    { name: "Okupasi", value: data.byType.okupasi_terapi },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <Header live={live} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Klinik aktif" value={data.counts.active} tone="emerald" />
        <StatCard label="Menunggu approval" value={data.counts.pending} tone="amber" />
        <StatCard label="Pendapatan bln ini" value={formatRupiahShort(data.revenueThisMonth)} tone="blue" />
        <StatCard label="Expired ≤7 hari" value={data.expiringSoon} tone="red" />
      </div>

      <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Pertumbuhan klinik &amp; pendapatan
          </h2>
          <div className="flex gap-4 text-xs text-zinc-500">
            <Legend color="#378ADD" label="Pendapatan" />
            <Legend color="#1D9E75" label="Klinik baru" line />
          </div>
        </div>
        <div className="h-64 w-full">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.monthly} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9a9a93" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#9a9a93" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => formatRupiahShort(v)} width={64} />
                <YAxis yAxisId="right" orientation="right" allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#9a9a93" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(128,128,128,0.2)" }}
                  formatter={(value, name) =>
                    name === "revenue"
                      ? [formatRupiahShort(Number(value)), "Pendapatan"]
                      : [String(value), "Klinik baru"]
                  }
                />
                <Bar yAxisId="left" dataKey="revenue" fill="#378ADD" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Line yAxisId="right" type="monotone" dataKey="newClinics" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <DonutPanel title="Klinik per status" data={statusData} colors={STATUS_COLORS} mounted={mounted} />
        <DonutPanel title="Klinik per tipe" data={typeData} colors={TYPE_COLORS} mounted={mounted} />
      </div>
    </div>
  );
}

function Header({ live }: { live: boolean }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Overview</h1>
      <span
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${
          live
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-emerald-500" : "bg-zinc-400"}`} />
        {live ? "Live" : "Menghubungkan…"}
      </span>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    blue: "text-blue-600 dark:text-blue-400",
    red: "text-red-600 dark:text-red-400",
  };
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${tones[tone]}`}>{value}</div>
    </div>
  );
}

function Legend({ color, label, line }: { color: string; label: string; line?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block"
        style={{ width: line ? 14 : 10, height: line ? 3 : 10, borderRadius: 2, background: color }}
      />
      {label}
    </span>
  );
}

function DonutPanel({
  title, data, colors, mounted,
}: {
  title: string;
  data: { name: string; value: number }[];
  colors: string[];
  mounted: boolean;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{title}</h2>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
        {data.map((d, i) => (
          <Legend key={d.name} color={colors[i % colors.length]} label={`${d.name} ${d.value}`} />
        ))}
      </div>
      <div className="mt-2 h-44 w-full">
        {mounted && total > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="90%" paddingAngle={2} strokeWidth={0}>
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(128,128,128,0.2)" }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            Belum ada data
          </div>
        )}
      </div>
    </section>
  );
}
