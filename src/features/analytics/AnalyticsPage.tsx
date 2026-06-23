import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Download, Clock, Coins, MessagesSquare, Zap } from "lucide-react";
import { useMarket } from "@/store/marketplace";
import { analyticsApi } from "@/lib/api/endpoints";
import { isMock } from "@/lib/api/client";

interface LiveDashboard {
  kpis: {
    tokens_total: number;
    tokens_delta_pct: number;
    cost_estimated: number;
    cost_delta_pct: number;
    total_queries: number;
    queries_delta_pct: number;
    avg_latency_ms: number;
  };
  series: { date: string; tokens: number; queries: number }[];
  cost_by_agent: { name: string; cost: number; pct: number }[];
  queries_by_agent: { name: string; queries: number }[];
  latency_by_agent: { name: string; latency_ms: number }[];
}

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtInt = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n));

const PERIODS = [
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "90d", label: "90 días" },
] as const;

const TOOLTIP = {
  background: "#fff",
  border: "1px solid #E3E4E8",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 16px 40px -16px rgba(26,33,81,0.2)",
};

const DONUT = ["#00B8FF", "#9E00BE", "#1A2151", "#22C55E", "#5C5B5F"];

export function AnalyticsPage() {
  const agents = useMarket((s) => s.agents);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("30d");
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;

  // Live dashboard (real backend). Disabled in mock mode; falls back below.
  const { data: live } = useQuery({
    queryKey: ["analytics", "dashboard", days],
    queryFn: () => analyticsApi.dashboard(days as 7 | 30 | 90) as Promise<LiveDashboard>,
    enabled: !isMock,
    retry: false,
  });

  const iconOf = useMemo(() => {
    const map = new Map(agents.map((a) => [a.name, a.icon]));
    return (name: string) => map.get(name) ?? "🤖";
  }, [agents]);

  // Deterministic mock fallback (used in mock mode or before live data loads).
  const mock = useMemo(() => {
    const series: { d: string; tokens: number; consultas: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const wave = Math.sin((i / days) * Math.PI * 3) * 0.22 + 0.78;
      const weekend = i % 7 === 0 || i % 7 === 6 ? 0.6 : 1;
      const tokens = Math.round(42000 * wave * weekend + 9000);
      series.push({ d: `${i}`, tokens, consultas: Math.round(tokens / 280) });
    }
    const ranked = agents.filter((a) => a.enabled && a.queries > 0).sort((a, b) => b.queries - a.queries);
    return {
      kpis: {
        tokens: "1.24M", tokensDelta: "+12% vs mes anterior", tokensUp: true,
        cost: "$38.40", costDelta: "+8% vs mes anterior", costUp: false,
        queries: "4,831", queriesDelta: "+23% vs mes anterior", queriesUp: true,
        latency: "1.76s", latencyDelta: "−0.3s vs mes anterior", latencyUp: true,
      },
      series,
      donut: ranked.slice(0, 5).map((a, i) => ({ name: a.name, value: parseInt(a.tokens) || 50, color: DONUT[i % DONUT.length] })),
      queriesRows: ranked.map((a) => ({ icon: a.icon, name: a.name, queries: a.queries })),
      latencyRows: ranked.map((a) => ({ icon: a.icon, name: a.name, latency_ms: (parseFloat(a.latency) || 0) * 1000 })),
    };
  }, [agents, days]);

  // Unified view — prefer live data when available.
  const view = useMemo(() => {
    if (!live) return mock;
    const k = live.kpis;
    const sign = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(1) + "% vs mes anterior";
    return {
      kpis: {
        tokens: fmtCompact(k.tokens_total), tokensDelta: sign(k.tokens_delta_pct), tokensUp: k.tokens_delta_pct >= 0,
        cost: fmtCurrency(k.cost_estimated), costDelta: sign(k.cost_delta_pct), costUp: k.cost_delta_pct <= 0,
        queries: fmtInt(k.total_queries), queriesDelta: sign(k.queries_delta_pct), queriesUp: k.queries_delta_pct >= 0,
        latency: (k.avg_latency_ms / 1000).toFixed(2) + "s", latencyDelta: "últimos " + days + " días", latencyUp: true,
      },
      series: live.series.map((p, i) => ({ d: `${i}`, tokens: p.tokens, consultas: p.queries })),
      donut: live.cost_by_agent.slice(0, 5).map((a, i) => ({ name: a.name, value: a.cost || 1, color: DONUT[i % DONUT.length] })),
      queriesRows: live.queries_by_agent.map((a) => ({ icon: iconOf(a.name), name: a.name, queries: a.queries })),
      latencyRows: live.latency_by_agent.map((a) => ({ icon: iconOf(a.name), name: a.name, latency_ms: a.latency_ms })),
    };
  }, [live, mock, days, iconOf]);

  const { kpis, series, donut, queriesRows, latencyRows } = view;
  const maxQ = Math.max(1, ...queriesRows.map((a) => a.queries));
  const maxLat = Math.max(1, ...latencyRows.map((a) => a.latency_ms));

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-g-mid bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <h1 className="text-xl font-bold text-primary">Analytics</h1>
          <p className="mt-0.5 text-xs text-g-dark">Consumo, rendimiento y costos de tus agentes · Mayo 2025</p>
        </div>
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={
                "rounded-lg border px-3 py-1.5 text-xs transition-all " +
                (period === p.key ? "border-primary bg-primary text-white" : "border-g-mid bg-white text-g-dark hover:border-secondary")
              }
            >
              {p.label}
            </button>
          ))}
          <button className="ml-2 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs text-white transition-colors hover:bg-primary-600">
            <Download className="h-3 w-3" /> Exportar reporte
          </button>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-8">
        {/* KPI row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi icon={<Zap className="h-3.5 w-3.5 text-secondary" />} tint="bg-secondary/10" label="Tokens totales" value={kpis.tokens} delta={kpis.tokensDelta} up={kpis.tokensUp} />
          <Kpi icon={<Coins className="h-3.5 w-3.5 text-tertiary" />} tint="bg-tertiary/10" label="Costo estimado" value={kpis.cost} delta={kpis.costDelta} up={kpis.costUp} />
          <Kpi icon={<MessagesSquare className="h-3.5 w-3.5 text-primary" />} tint="bg-primary/10" label="Total consultas" value={kpis.queries} delta={kpis.queriesDelta} up={kpis.queriesUp} />
          <Kpi icon={<Clock className="h-3.5 w-3.5 text-ok" />} tint="bg-ok/10" label="Latencia promedio" value={kpis.latency} delta={kpis.latencyDelta} up={kpis.latencyUp} />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="panel p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-primary">Consumo de tokens por día</h3>
                <p className="mt-0.5 text-xs text-g-dark">Últimos {days} días</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-g-dark">
                <Legend color="bg-secondary" label="Tokens" />
                <Legend color="bg-tertiary" label="Consultas" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={series} margin={{ top: 8, right: 6, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="tk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00B8FF" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#00B8FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" hide />
                <YAxis tick={{ fill: "#9A9CA6", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: number, n) => [n === "tokens" ? v.toLocaleString() + " tokens" : v + " consultas", ""]} labelFormatter={() => ""} />
                <Area type="monotone" dataKey="tokens" stroke="#00B8FF" strokeWidth={2} fill="url(#tk)" />
                <Area type="monotone" dataKey="consultas" stroke="#9E00BE" strokeWidth={1.5} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-primary">Costo por agente</h3>
            <p className="mb-2 text-xs text-g-dark">Distribución del mes</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={donut} dataKey="value" innerRadius={42} outerRadius={64} paddingAngle={2} stroke="none">
                  {donut.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {donut.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-g-dark">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-primary">Consultas por agente</h3>
            <p className="mb-5 text-xs text-g-dark">Agentes habilitados este mes</p>
            <div className="space-y-3">
              {queriesRows.map((a, i) => (
                <RankRow key={a.name + i} icon={a.icon} name={a.name} value={a.queries} pct={(a.queries / maxQ) * 100} suffix=" consultas" color="#00B8FF" />
              ))}
              {queriesRows.length === 0 && <p className="text-xs text-g-dark">Sin actividad en este periodo.</p>}
            </div>
          </div>
          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-primary">Latencia por agente</h3>
            <p className="mb-5 text-xs text-g-dark">Tiempo de respuesta promedio</p>
            <div className="space-y-3">
              {latencyRows.map((a, i) => (
                <RankRow key={a.name + i} icon={a.icon} name={a.name} value={`${(a.latency_ms / 1000).toFixed(1)}s`} pct={(a.latency_ms / maxLat) * 100} suffix="" color="#9E00BE" />
              ))}
              {latencyRows.length === 0 && <p className="text-xs text-g-dark">Sin actividad en este periodo.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, tint, label, value, delta, up }: { icon: React.ReactNode; tint: string; label: string; value: string; delta: string; up: boolean }) {
  return (
    <div className="panel p-5 transition-transform hover:-translate-y-0.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-g-dark">{label}</span>
        <div className={"flex h-8 w-8 items-center justify-center rounded-xl " + tint}>{icon}</div>
      </div>
      <p className="stat-number text-2xl font-bold text-primary">{value}</p>
      <p className={"mt-1 flex items-center gap-1 text-xs " + (up ? "text-ok" : "text-danger")}>
        {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {delta}
      </p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={"inline-block h-2.5 w-2.5 rounded-full " + color} />
      {label}
    </span>
  );
}

function RankRow({ icon, name, value, pct, suffix, color }: { icon: string; name: string; value: string | number; pct: number; suffix: string; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 text-primary">
          <span>{icon}</span> {name}
        </span>
        <span className="stat-number font-semibold text-g-dark">{value}{suffix}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-g-mid">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.max(pct, 3)}%`, background: color }} />
      </div>
    </div>
  );
}
