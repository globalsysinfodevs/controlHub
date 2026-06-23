import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  CircuitBoard,
  Coins,
  Gauge,
  ShieldAlert,
  Timer,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { dashboardApi } from "@/lib/api/endpoints";
import {
  formatCompact,
  formatCurrency,
  formatInt,
  formatPercent,
} from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Feedback";
import { Badge } from "@/components/ui/Badge";
import { Sigil } from "@/components/ui/Sigil";
import { RadialGauge } from "@/components/charts/RadialGauge";
import { TopAgentsBar, UsageAreaChart } from "@/components/charts/Charts";
import { StatCard } from "./StatCard";

const RANGES = [
  { v: 7, label: "7d" },
  { v: 30, label: "30d" },
  { v: 90, label: "90d" },
] as const;

export function DashboardPage() {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", range],
    queryFn: () => dashboardApi.summary(range),
  });

  const spark = data?.series.map((p) => p.tokens) ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Operations overview"
        title="Dashboard"
        description="Real-time consumption, agent health, and security signals across the workspace."
        actions={
          <div className="flex items-center rounded-lg border border-line-strong bg-surface p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.v}
                onClick={() => setRange(r.v)}
                className={
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                  (range === r.v ? "bg-brand-500/15 text-brand-700" : "text-ink-muted hover:text-ink")
                }
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-5">
          {/* Stat row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={Coins}
              label="Tokens used (MTD)"
              value={formatCompact(data.tokens_used)}
              delta={data.tokens_delta_pct}
              spark={spark}
              sparkColor="#818CF8"
            />
            <StatCard
              icon={CircuitBoard}
              label="Invocations today"
              value={formatInt(data.invocations_today)}
              delta={data.invocations_delta_pct}
              accent="telemetry"
              spark={spark.map((v) => v / 320)}
              sparkColor="#22D3EE"
            />
            <StatCard
              icon={Coins}
              label="Est. cost (MTD)"
              value={formatCurrency(data.est_cost_mtd)}
              delta={data.cost_delta_pct}
              accent="warn"
            />
            <StatCard
              icon={Users}
              label="Active users"
              value={formatInt(data.active_users)}
              accent="ok"
            />
          </div>

          {/* Main grid: usage chart + token gauge */}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="panel p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="eyebrow">Token consumption</p>
                  <h3 className="mt-1 font-display text-base font-semibold">Usage over {range} days</h3>
                </div>
                <Badge tone="brand" dot>
                  live
                </Badge>
              </div>
              <UsageAreaChart data={data.series} />
            </div>

            <div className="panel flex flex-col items-center justify-center p-5">
              <p className="eyebrow mb-4 self-start">Monthly allotment</p>
              <RadialGauge
                value={data.tokens_used}
                max={data.tokens_limit}
                label="of limit"
                tone={data.tokens_used / data.tokens_limit > 0.85 ? "warn" : "brand"}
              />
              <div className="mt-5 grid w-full grid-cols-2 gap-3 text-center">
                <div className="rounded-lg border border-line bg-base/40 p-3">
                  <p className="stat-number font-display text-lg font-semibold text-ink">
                    {formatCompact(data.tokens_used)}
                  </p>
                  <p className="text-2xs text-ink-faint">used</p>
                </div>
                <div className="rounded-lg border border-line bg-base/40 p-3">
                  <p className="stat-number font-display text-lg font-semibold text-ink">
                    {formatCompact(data.tokens_limit)}
                  </p>
                  <p className="text-2xs text-ink-faint">limit</p>
                </div>
              </div>
            </div>
          </div>

          {/* Health strip */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MiniMetric icon={Bot} label="Active agents" value={`${data.active_agents} / ${data.total_agents}`} />
            <MiniMetric icon={Activity} label="Success rate" value={formatPercent(data.success_rate, 1)} tone="ok" />
            <MiniMetric icon={Timer} label="Avg latency" value={`${formatInt(data.avg_latency_ms)} ms`} />
            <MiniMetric
              icon={ShieldAlert}
              label="Open PII alerts"
              value={String(data.open_security_alerts)}
              tone={data.open_security_alerts > 0 ? "danger" : "ok"}
              to="/security"
            />
          </div>

          {/* Bottom grid: top agents + model split */}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="panel p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="eyebrow">Leaderboard</p>
                  <h3 className="mt-1 font-display text-base font-semibold">Top agents by tokens</h3>
                </div>
                <Link to="/agents" className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700">
                  All agents <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <TopAgentsBar data={data.top_agents.map((a) => ({ name: a.name, tokens: a.tokens }))} />
            </div>

            <div className="panel p-5">
              <p className="eyebrow">Distribution</p>
              <h3 className="mt-1 font-display text-base font-semibold">By model</h3>
              <ul className="mt-4 space-y-3">
                {data.model_split
                  .sort((a, b) => b.tokens - a.tokens)
                  .map((m) => {
                    const pct = (m.tokens / data.tokens_used) * 100;
                    return (
                      <li key={m.model}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="font-mono text-ink-muted">{m.model}</span>
                          <span className="stat-number text-ink-faint">{formatPercent(pct)}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.05]">
                          <div
                            className="h-full rounded-full bg-brand-sheen"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>

          {/* Top agents quick links */}
          <div className="panel p-5">
            <p className="eyebrow mb-4">Quick access</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.top_agents.map((a) => (
                <Link
                  key={a.id}
                  to={`/agents?focus=${a.id}`}
                  className="interactive flex items-center gap-3 rounded-xl border border-line bg-surface-raised/60 p-3"
                >
                  <Sigil seed={a.id} name={a.name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{a.name}</p>
                    <p className="stat-number text-2xs text-ink-faint">{formatCompact(a.tokens)} tokens · 30d</p>
                  </div>
                  <Gauge className="ml-auto h-4 w-4 text-ink-faint" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
  tone = "brand",
  to,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
  tone?: "brand" | "ok" | "danger";
  to?: string;
}) {
  const tones = {
    brand: "text-brand-600",
    ok: "text-ok",
    danger: "text-danger",
  };
  const body = (
    <div className="panel flex items-center gap-3 p-4">
      <Icon className={"h-5 w-5 " + tones[tone]} />
      <div>
        <p className="text-2xs text-ink-faint">{label}</p>
        <p className="stat-number font-display text-lg font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="block transition-transform hover:-translate-y-0.5">
      {body}
    </Link>
  ) : (
    body
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="panel h-32 p-5">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="mt-5 h-3 w-20" />
            <Skeleton className="mt-2 h-6 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="panel h-80 lg:col-span-2" />
        <div className="panel h-80" />
      </div>
    </div>
  );
}
