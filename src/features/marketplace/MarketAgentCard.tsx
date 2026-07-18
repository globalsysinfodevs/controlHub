import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/Toggle";
import type { Agent } from "@/lib/api/types";

/** Format a raw number into a human-readable token string. */
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

export function MarketAgentCard({
  agent,
  index = 0,
  onOpen,
  onToggle,
}: {
  agent: Agent;
  index?: number;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const categoryLabel = agent.category_name ?? "General";
  const modelLabel = agent.model_name ?? agent.template_key;
  const outputLabel = agent.output_types.length > 0 ? agent.output_types.join(" + ") : "Chat";

  // Token budget progress (only shown when monthly_token_limit is set)
  const tokenPct =
    agent.monthly_token_limit && agent.monthly_token_limit > 0
      ? Math.min(100, Math.round((agent.tokens_30d / agent.monthly_token_limit) * 100))
      : null;

  return (
    <div
      onClick={onOpen}
      className={cn("agent-card relative cursor-pointer p-5 animate-fade-up", agent.enabled && "enabled")}
      style={{ animationDelay: `${Math.min(index * 0.04, 0.5)}s` }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary/10">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-primary">{agent.name}</h3>
              {agent.enabled && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
              )}
            </div>
            <span className="mt-0.5 inline-block rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary-600">
              {categoryLabel}
            </span>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Toggle checked={agent.enabled} onChange={onToggle} />
        </div>
      </div>

      <p className="mb-4 line-clamp-3 text-xs leading-relaxed text-g-dark">
        {agent.description ?? "—"}
      </p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {agent.tools.slice(0, 3).map((t) => (
          <span key={t} className="rounded-lg bg-g-light px-2 py-1 text-xs text-g-dark">
            {t}
          </span>
        ))}
      </div>

      {/* Per-agent token budget bar */}
      {tokenPct !== null && (
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-g-dark">Token budget</span>
            <span className="font-semibold text-primary">
              {fmtTokens(agent.tokens_30d)} / {fmtTokens(agent.monthly_token_limit!)}
            </span>
          </div>
          <div className="h-1 rounded-full bg-g-mid">
            <div
              className={cn(
                "h-1 rounded-full transition-all duration-700",
                tokenPct >= 95 ? "bg-error" : tokenPct >= 80 ? "bg-warning" : "bg-secondary"
              )}
              style={{ width: `${tokenPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-g-mid pt-3">
        <span className="flex items-center gap-1 text-xs text-g-dark">
          <LayoutGrid className="h-3 w-3" />
          {outputLabel}
        </span>
        <span className="text-xs font-semibold text-secondary-600">{modelLabel}</span>
      </div>
    </div>
  );
}
