import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageSquare, Wrench, Zap } from "lucide-react";
import type { Agent } from "@/lib/api/types";
import { formatCompact, formatPercent } from "@/lib/utils";
import { Badge, StatusDot } from "@/components/ui/Badge";
import { Sigil } from "@/components/ui/Sigil";
import { CATEGORY_META } from "./meta";

const STATUS_TONE = {
  active: "ok",
  inactive: "neutral",
  draft: "warn",
} as const;

export function AgentCard({ agent, onOpen, index = 0 }: { agent: Agent; onOpen: () => void; index?: number }) {
  const cat = CATEGORY_META[agent.category ?? "automation"];
  return (
    <motion.button
      onClick={onOpen}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
      className="panel interactive group relative flex flex-col overflow-hidden p-5 text-left"
    >
      {/* category hue glow */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-15 blur-2xl transition-opacity group-hover:opacity-30"
        style={{ background: cat.hue }}
      />

      <div className="flex items-start justify-between">
        <Sigil seed={agent.id} name={agent.name} size="lg" />
        <Badge tone={STATUS_TONE[agent.status]} dot>
          {agent.status}
        </Badge>
      </div>

      <h3 className="mt-4 font-display text-base font-semibold tracking-tight text-ink">{agent.name}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{agent.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs font-medium"
          style={{ borderColor: cat.hue + "55", color: cat.hue, background: cat.hue + "12" }}
        >
          <cat.icon className="h-3 w-3" />
          {cat.label}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-line bg-ink/[0.04] px-2 py-0.5 font-mono text-2xs text-ink-muted">
          {agent.model}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
        <Metric icon={Zap} value={formatCompact(agent.tokens_30d)} label="tokens" />
        <Metric icon={MessageSquare} value={formatCompact(agent.invocations_30d)} label="runs" />
        <Metric
          icon={Wrench}
          value={agent.status === "draft" ? "—" : formatPercent(agent.success_rate, 0)}
          label="success"
        />
      </div>
    </motion.button>
  );
}

function Metric({ icon: Icon, value, label }: { icon: typeof Zap; value: string; label: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-ink-faint">
        <Icon className="h-3 w-3" />
        <span className="text-2xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="stat-number mt-0.5 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

/** Compact row used in the dashboard's quick-access and other lists. */
export function AgentRow({ agent }: { agent: Agent }) {
  return (
    <Link
      to={`/agents?focus=${agent.id}`}
      className="interactive flex items-center gap-3 rounded-xl border border-line bg-surface-raised/60 p-3"
    >
      <Sigil seed={agent.id} name={agent.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{agent.name}</p>
        <p className="text-2xs text-ink-faint">{CATEGORY_META[agent.category ?? "automation"].label}</p>
      </div>
      <StatusDot tone={agent.status === "active" ? "ok" : "neutral"} />
    </Link>
  );
}
