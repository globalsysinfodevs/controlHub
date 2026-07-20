import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UsagePoint } from "@/lib/api/types";
import { formatCompact, formatDate } from "@/lib/utils";

const TOOLTIP_STYLE = {
  background: "rgba(255,255,255,0.98)",
  border: "1px solid rgba(15,23,42,0.10)",
  borderRadius: 12,
  fontSize: 12,
  padding: "8px 12px",
  boxShadow: "0 16px 40px -16px rgba(16,24,40,0.28)",
};

/** Inline sparkline for stat cards. */
export function Sparkline({ data, color = "#818CF8" }: { data: number[]; color?: string }) {
  const series = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={series} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.75} fill={`url(#spark-${color})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Main consumption area chart for the dashboard. */
export function UsageAreaChart({ data }: { data: UsagePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity={0.45} />
            <stop offset="60%" stopColor="#6366F1" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={(d) => formatDate(d).replace(/,.*/, "")}
          tick={{ fill: "#5B677E", fontSize: 11, fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
          minTickGap={36}
        />
        <YAxis
          tickFormatter={(v) => formatCompact(v)}
          tick={{ fill: "#5B677E", fontSize: 11, fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: "#475569", marginBottom: 4 }}
          itemStyle={{ color: "#0F172A" }}
          labelFormatter={(d) => formatDate(d as string)}
          formatter={(v: number) => [formatCompact(v) + " tokens", "Usage"]}
          cursor={{ stroke: "rgba(99,102,241,0.4)", strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="tokens"
          stroke="#6366F1"
          strokeWidth={2}
          fill="url(#usageFill)"
          activeDot={{ r: 4, fill: "#6366F1", stroke: "#FFFFFF", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Horizontal-ish bar for "top agents by tokens". */
export function TopAgentsBar({
  data,
}: {
  data: { name: string; tokens: number }[];
}) {
  const palette = ["#818CF8", "#6366F1", "#22D3EE", "#34D399", "#FBBF24"];
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 46)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#94A3B8", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={120}
        />
        <Tooltip
          cursor={{ fill: "rgba(15,23,42,0.04)" }}
          contentStyle={TOOLTIP_STYLE}
          formatter={(v: number) => [formatCompact(v) + " tokens", "30-day"]}
        />
        <Bar dataKey="tokens" radius={[0, 6, 6, 0]} barSize={18}>
          {data.map((_, i) => (
            <Cell key={i} fill={palette[i % palette.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
