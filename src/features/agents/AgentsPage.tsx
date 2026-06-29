import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bot, Plus, Search, SlidersHorizontal } from "lucide-react";
import type { Agent } from "@/lib/api/types";
import { agentsApi } from "@/lib/api/endpoints";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { CATEGORIES, CATEGORY_META } from "./meta";
import { AgentCard } from "./AgentCard";
import { AgentDrawer } from "./AgentDrawer";

const STATUS_FILTERS = ["all", "active", "inactive", "draft"] as const;

export function AgentsPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [drawer, setDrawer] = useState<{ mode: "view" | "create"; agent: Agent | null } | null>(null);

  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents", { search, category, status }],
    queryFn: () => agentsApi.list({ search, category, status, page_size: 100 }) as Promise<Agent[]>,
  });

  // Deep-link: /agents?focus=<id> opens the drawer.
  const focusId = params.get("focus");
  useEffect(() => {
    if (focusId && agents) {
      const a = agents.find((x) => x.id === focusId);
      if (a) setDrawer({ mode: "view", agent: a });
    }
  }, [focusId, agents]);

  function closeDrawer() {
    setDrawer(null);
    if (params.has("focus")) {
      params.delete("focus");
      setParams(params, { replace: true });
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: agents?.length ?? 0 };
    for (const a of agents ?? []) c[a.category] = (c[a.category] ?? 0) + 1;
    return c;
  }, [agents]);

  return (
    <div>
      <PageHeader
        eyebrow="Marketplace"
        title="Agents"
        description="Every agent is configuration — prompt, model, tools, and access — versioned on each change."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setDrawer({ mode: "create", agent: null })}>
            New agent
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full max-w-sm">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents…"
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-ink-faint" />
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={
                  "rounded-full border px-3 py-1 text-2xs font-medium capitalize transition-colors " +
                  (status === s
                    ? "border-brand-500/50 bg-brand-500/12 text-brand-700"
                    : "border-line text-ink-muted hover:text-ink")
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        <CategoryChip active={category === "all"} onClick={() => setCategory("all")} label="All" count={counts.all} />
        {CATEGORIES.map((c) => (
          <CategoryChip
            key={c}
            active={category === c}
            onClick={() => setCategory(c)}
            label={CATEGORY_META[c].label}
            count={counts[c] ?? 0}
            hue={CATEGORY_META[c].hue}
          />
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="panel h-56 p-5">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="mt-4 h-4 w-32" />
              <Skeleton className="mt-2 h-3 w-full" />
            </div>
          ))}
        </div>
      ) : agents && agents.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a, i) => (
            <AgentCard key={a.id} agent={a} index={i} onOpen={() => setDrawer({ mode: "view", agent: a })} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Bot className="h-6 w-6" />}
          title="No agents match your filters"
          description="Adjust the search or category, or create a new agent from a blank configuration."
          action={
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setDrawer({ mode: "create", agent: null })}>
              New agent
            </Button>
          }
        />
      )}

      <AgentDrawer
        open={!!drawer}
        mode={drawer?.mode ?? "view"}
        agent={drawer?.agent ?? null}
        onClose={closeDrawer}
      />
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  count,
  hue,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  hue?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all " +
        (active ? "border-brand-500/50 bg-brand-500/10 text-ink" : "border-line bg-surface/50 text-ink-muted hover:text-ink")
      }
    >
      {hue && <span className="h-2 w-2 rounded-full" style={{ background: hue }} />}
      {label}
      <span className="stat-number rounded-full bg-ink/[0.06] px-1.5 text-2xs text-ink-faint">{count}</span>
    </button>
  );
}
