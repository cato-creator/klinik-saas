'use client'

import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts'

const TEAL = '#14b8a6'
const STATUS_COLORS: Record<string, string> = {
  Selesai: '#22c55e',
  Dikonfirmasi: '#0ea5e9',
  'Menunggu Verifikasi': '#f59e0b',
}

/** Sesi 7 hari terakhir (bar). */
export function WeeklySessionsChart({ data }: { data: { label: string; sessions: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
        <Tooltip formatter={(v: any) => [v, 'Sesi']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} cursor={{ fill: '#f0fdfa' }} />
        <Bar dataKey="sessions" fill={TEAL} radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Distribusi status booking (donut). */
export function StatusDonut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={3}>
          {data.map((d, i) => (
            <Cell key={i} fill={STATUS_COLORS[d.name] ?? '#cbd5e1'} />
          ))}
        </Pie>
        <Tooltip formatter={(v: any) => [v, 'Booking']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
