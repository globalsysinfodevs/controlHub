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
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  ChevronDown,
  Clock,
  Coins,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  MessagesSquare,
  RefreshCw,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMarket } from "@/store/marketplace";
import { useAuth, isSuperAdmin } from "@/store/auth";
import { analyticsApi, superAdminApi } from "@/lib/api/endpoints";
import { isMock } from "@/lib/api/client";
import { toast } from "@/components/ui/Toast";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Constants ─────────────────────────────────────────────────────────────────

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtInt = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n));

const PERIODS = [
  { key: "7d",  label: "7 días",  days: 7  },
  { key: "30d", label: "30 días", days: 30 },
  { key: "90d", label: "90 días", days: 90 },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

const TOOLTIP_STYLE = {
  background: "#fff",
  border: "1px solid #E3E4E8",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 16px 40px -16px rgba(26,33,81,0.2)",
};

const DONUT_COLORS = ["#00B8FF", "#9E00BE", "#1A2151", "#22C55E", "#5C5B5F"];

// ── Component ─────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const agents = useMarket((s) => s.agents);
  const user = useAuth((s) => s.user);
  const superAdmin = isSuperAdmin(user?.role);

  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Super admin tenant picker
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantPickerOpen, setTenantPickerOpen] = useState(false);

  const days = PERIODS.find((p) => p.key === period)?.days ?? 30;

  // Fetch tenant list for super admin picker
  const { data: tenantList = [] } = useQuery({
    queryKey: ["super-admin", "tenants", "analytics-picker"],
    queryFn: async () => {
      const res = await superAdminApi.listTenants(1, 100) as unknown;
      if (Array.isArray(res)) return res as { id: string; name: string }[];
      // Handle { items, total } envelope
      if (res && typeof res === "object" && "items" in (res as object)) {
        return (res as { items: { id: string; name: string }[] }).items ?? [];
      }
      return [];
    },
    enabled: superAdmin && !isMock,
    staleTime: 60_000,
  });

  const selectedTenant = tenantList.find((t) => t.id === selectedTenantId) ?? null;

  // Super admins must pass tenant_id — the backend requires it.
  // Tenant users never pass tenant_id; the backend infers it from the JWT.
  const tenantId = superAdmin ? selectedTenantId : null;
  const superAdminNoTenant = superAdmin && !selectedTenantId;

  // ── Live data ──────────────────────────────────────────────────────────────
  const {
    data: live,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["analytics", "dashboard", days, tenantId],
    queryFn: () =>
      analyticsApi.dashboard(days as 7 | 30 | 90, tenantId) as unknown as Promise<LiveDashboard>,
    // Super admin must have a scoped tenant; tenant users always have one via JWT.
    enabled: !isMock && !superAdminNoTenant,
    retry: 1,
    staleTime: 60_000,
  });

  // ── Icon lookup ────────────────────────────────────────────────────────────
  const iconOf = useMemo(() => {
    const map = new Map(agents.map((a) => [a.name, a.icon]));
    return (name: string) => map.get(name) ?? "🤖";
  }, [agents]);

  // ── Mock fallback ──────────────────────────────────────────────────────────
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
      donut: ranked.slice(0, 5).map((a, i) => ({ name: a.name, value: parseInt(a.tokens) || 50, color: DONUT_COLORS[i % DONUT_COLORS.length] })),
      queriesRows: ranked.map((a) => ({ icon: a.icon, name: a.name, queries: a.queries })),
      latencyRows: ranked.map((a) => ({ icon: a.icon, name: a.name, latency_ms: (parseFloat(a.latency) || 0) * 1000 })),
    };
  }, [agents, days]);

  // ── Unified view ───────────────────────────────────────────────────────────
  const view = useMemo(() => {
    if (!live) return mock;
    const k = live.kpis ?? {};
    const safe = (n: unknown) => (typeof n === "number" && isFinite(n) ? n : 0);
    const sign = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(1) + "% vs mes anterior";
    return {
      kpis: {
        tokens: fmtCompact(safe(k.tokens_total)),
        tokensDelta: sign(safe(k.tokens_delta_pct)),
        tokensUp: safe(k.tokens_delta_pct) >= 0,
        cost: fmtCurrency(safe(k.cost_estimated)),
        costDelta: sign(safe(k.cost_delta_pct)),
        costUp: safe(k.cost_delta_pct) <= 0,
        queries: fmtInt(safe(k.total_queries)),
        queriesDelta: sign(safe(k.queries_delta_pct)),
        queriesUp: safe(k.queries_delta_pct) >= 0,
        latency: (safe(k.avg_latency_ms) / 1000).toFixed(2) + "s",
        latencyDelta: `últimos ${days} días`,
        latencyUp: true,
      },
      series: (live.series ?? []).map((p, i) => ({ d: `${i}`, tokens: p.tokens ?? 0, consultas: p.queries ?? 0 })),
      donut: (live.cost_by_agent ?? []).slice(0, 5).map((a, i) => ({
        name: a.name,
        value: a.cost || 1,
        color: DONUT_COLORS[i % DONUT_COLORS.length],
      })),
      queriesRows: (live.queries_by_agent ?? []).map((a) => ({
        icon: iconOf(a.name),
        name: a.name,
        queries: a.queries ?? 0,
      })),
      latencyRows: (live.latency_by_agent ?? []).map((a) => ({
        icon: iconOf(a.name),
        name: a.name,
        latency_ms: a.latency_ms ?? 0,
      })),
    };
  }, [live, mock, days, iconOf]);

  const { kpis, series, donut, queriesRows, latencyRows } = view;
  const maxQ = Math.max(1, ...queriesRows.map((a) => a.queries));
  const maxLat = Math.max(1, ...latencyRows.map((a) => a.latency_ms));

  // ── Export handler ─────────────────────────────────────────────────────────
  async function handleExport(format: "csv" | "xlsx") {
    setExportOpen(false);
    if (isMock) {
      toast.info("Modo demo", "Conéctate al backend para exportar datos reales.");
      return;
    }
    setExporting(true);
    try {
      await analyticsApi.export(days as 7 | 30 | 90, format, tenantId);
      toast.success("Exportación completada", `analytics-${days}d.${format}`);
    } catch (e) {
      toast.error("No se pudo exportar", (e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 border-b border-g-mid bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <h1 className="text-xl font-bold text-primary">Analytics</h1>
          <p className="mt-0.5 text-xs text-g-dark">
            Consumo, rendimiento y costos de tus agentes
            {isMock && <span className="ml-2 rounded-full bg-warn/15 px-2 py-0.5 text-2xs font-medium text-warn">Modo demo</span>}
            {!isMock && isError && <span className="ml-2 rounded-full bg-danger/15 px-2 py-0.5 text-2xs font-medium text-danger">Error al cargar datos</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Super admin: tenant picker */}
          {superAdmin && !isMock && (
            <div className="relative">
              <button
                onClick={() => setTenantPickerOpen((v) => !v)}
                className={
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all " +
                  (selectedTenant
                    ? "border-secondary bg-secondary/5 text-primary"
                    : "border-warn bg-warn/5 text-warn")
                }
              >
                <Building2 className="h-3.5 w-3.5" />
                {selectedTenant ? selectedTenant.name : "Seleccionar tenant"}
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
              <AnimatePresence>
                {tenantPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setTenantPickerOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.12 }}
                      className="panel absolute left-0 top-10 z-50 max-h-64 w-56 overflow-y-auto p-1"
                    >
                      {tenantList.length === 0 && (
                        <p className="px-3 py-2 text-xs text-g-dark">Sin tenants disponibles</p>
                      )}
                      {tenantList.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => { setSelectedTenantId(t.id); setTenantPickerOpen(false); }}
                          className={
                            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-g-light " +
                            (selectedTenantId === t.id ? "bg-secondary/10 font-semibold text-secondary" : "text-primary")
                          }
                        >
                          <Building2 className="h-3.5 w-3.5 shrink-0 opacity-50" />
                          {t.name}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Period selector */}
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={
                "rounded-lg border px-3 py-1.5 text-xs transition-all " +
                (period === p.key
                  ? "border-primary bg-primary text-white"
                  : "border-g-mid bg-white text-g-dark hover:border-secondary")
              }
            >
              {p.label}
            </button>
          ))}

          {/* Refresh */}
          {!isMock && (
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-g-mid bg-white text-g-dark transition-colors hover:border-secondary disabled:opacity-50"
              title="Actualizar datos"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          )}

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen((v) => !v)}
              disabled={exporting}
              className="ml-1 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
            >
              {/*
                Stable <span> wrapper prevents browser-extension DOM injection
                (e.g. Adobe Acrobat) from causing React's insertBefore
                reconciliation to crash when the icon swaps between states.
              */}
              <span className="flex h-3 w-3 shrink-0 items-center justify-center">
                {exporting
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Download className="h-3 w-3" />}
              </span>
              Exportar
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>

            <AnimatePresence>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="panel absolute right-0 top-10 z-50 w-44 overflow-hidden p-1"
                  >
                    <button
                      onClick={() => handleExport("csv")}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-primary transition-colors hover:bg-g-light"
                    >
                      <FileText className="h-4 w-4 text-ok" />
                      Descargar CSV
                    </button>
                    <button
                      onClick={() => handleExport("xlsx")}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-primary transition-colors hover:bg-g-light"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-secondary" />
                      Descargar Excel
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Super admin: no tenant selected warning ── */}
      {superAdmin && superAdminNoTenant && !isMock && (
        <div className="mx-5 mt-6 flex items-center gap-3 rounded-xl border border-warn/30 bg-warn/8 px-4 py-3 sm:mx-8">
          <Building2 className="h-4 w-4 shrink-0 text-warn" />
          <p className="text-sm text-warn">
            Selecciona un tenant en el selector de arriba para ver y exportar sus analytics.
          </p>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {!isMock && isLoading && (
        <div className="flex items-center justify-center gap-3 py-24 text-g-dark">
          <Loader2 className="h-5 w-5 animate-spin text-secondary" />
          <span className="text-sm">Cargando datos del dashboard…</span>
        </div>
      )}

      {/* ── Content ── */}
      {(!isLoading || isMock) && (
        <div className="space-y-6 p-5 sm:p-8">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi
              icon={<Zap className="h-3.5 w-3.5 text-secondary" />}
              tint="bg-secondary/10"
              label="Tokens totales"
              value={kpis.tokens}
              delta={kpis.tokensDelta}
              up={kpis.tokensUp}
            />
            <Kpi
              icon={<Coins className="h-3.5 w-3.5 text-tertiary" />}
              tint="bg-tertiary/10"
              label="Costo estimado"
              value={kpis.cost}
              delta={kpis.costDelta}
              up={kpis.costUp}
            />
            <Kpi
              icon={<MessagesSquare className="h-3.5 w-3.5 text-primary" />}
              tint="bg-primary/10"
              label="Total consultas"
              value={kpis.queries}
              delta={kpis.queriesDelta}
              up={kpis.queriesUp}
            />
            <Kpi
              icon={<Clock className="h-3.5 w-3.5 text-ok" />}
              tint="bg-ok/10"
              label="Latencia promedio"
              value={kpis.latency}
              delta={kpis.latencyDelta}
              up={kpis.latencyUp}
            />
          </div>

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Token consumption area chart */}
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
                  <YAxis
                    tick={{ fill: "#9A9CA6", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number, n) => [
                      n === "tokens" ? v.toLocaleString() + " tokens" : v + " consultas",
                      "",
                    ]}
                    labelFormatter={() => ""}
                  />
                  <Area type="monotone" dataKey="tokens" stroke="#00B8FF" strokeWidth={2} fill="url(#tk)" />
                  <Area type="monotone" dataKey="consultas" stroke="#9E00BE" strokeWidth={1.5} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Cost by agent donut */}
            <div className="panel p-5">
              <h3 className="text-sm font-semibold text-primary">Costo por agente</h3>
              <p className="mb-2 text-xs text-g-dark">Distribución del periodo</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={donut}
                    dataKey="value"
                    innerRadius={42}
                    outerRadius={64}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {donut.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {donut.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-g-dark">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    {typeof d.value === "number" && d.value > 1 && (
                      <span className="font-medium text-primary">{fmtCurrency(d.value)}</span>
                    )}
                  </div>
                ))}
                {donut.length === 0 && (
                  <p className="text-xs text-g-dark">Sin datos en este periodo.</p>
                )}
              </div>
            </div>
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="panel p-5">
              <h3 className="text-sm font-semibold text-primary">Consultas por agente</h3>
              <p className="mb-5 text-xs text-g-dark">Agentes habilitados en el periodo</p>
              <div className="space-y-3">
                {queriesRows.map((a, i) => (
                  <RankRow
                    key={a.name + i}
                    icon={a.icon}
                    name={a.name}
                    value={a.queries}
                    pct={(a.queries / maxQ) * 100}
                    suffix=" consultas"
                    color="#00B8FF"
                  />
                ))}
                {queriesRows.length === 0 && (
                  <p className="text-xs text-g-dark">Sin actividad en este periodo.</p>
                )}
              </div>
            </div>

            <div className="panel p-5">
              <h3 className="text-sm font-semibold text-primary">Latencia por agente</h3>
              <p className="mb-5 text-xs text-g-dark">Tiempo de respuesta promedio</p>
              <div className="space-y-3">
                {latencyRows.map((a, i) => (
                  <RankRow
                    key={a.name + i}
                    icon={a.icon}
                    name={a.name}
                    value={`${(a.latency_ms / 1000).toFixed(1)}s`}
                    pct={(a.latency_ms / maxLat) * 100}
                    suffix=""
                    color="#9E00BE"
                  />
                ))}
                {latencyRows.length === 0 && (
                  <p className="text-xs text-g-dark">Sin actividad en este periodo.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Kpi({
  icon, tint, label, value, delta, up,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: string;
  delta: string;
  up: boolean;
}) {
  return (
    <div className="panel p-5 transition-transform hover:-translate-y-0.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-g-dark">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${tint}`}>{icon}</div>
      </div>
      <p className="stat-number text-2xl font-bold text-primary">{value}</p>
      <p className={`mt-1 flex items-center gap-1 text-xs ${up ? "text-ok" : "text-danger"}`}>
        {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {delta}
      </p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function RankRow({
  icon, name, value, pct, suffix, color,
}: {
  icon: string;
  name: string;
  value: string | number;
  pct: number;
  suffix: string;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 text-primary">
          <span>{icon}</span> {name}
        </span>
        <span className="stat-number font-semibold text-g-dark">
          {value}{suffix}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-g-mid">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${Math.max(pct, 3)}%`, background: color }}
        />
      </div>
    </div>
  );
}
