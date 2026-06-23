import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/Toggle";
import { CAT_ACCENT, CAT_LABEL, type Accent, type CatalogAgent } from "./data";

const ACCENT_TILE: Record<Accent, string> = {
  secondary: "linear-gradient(135deg,rgba(0,184,255,.18),rgba(0,184,255,.05))",
  tertiary: "linear-gradient(135deg,rgba(158,0,190,.18),rgba(158,0,190,.05))",
  primary: "linear-gradient(135deg,rgba(26,33,81,.16),rgba(26,33,81,.04))",
};
const ACCENT_PILL: Record<Accent, string> = {
  secondary: "bg-secondary/10 text-secondary-600",
  tertiary: "bg-tertiary/10 text-tertiary",
  primary: "bg-primary/10 text-primary",
};

export function MarketAgentCard({
  agent,
  index = 0,
  onOpen,
  onToggle,
}: {
  agent: CatalogAgent;
  index?: number;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const accent = CAT_ACCENT[agent.cat];
  return (
    <div
      onClick={onOpen}
      className={cn("agent-card relative cursor-pointer p-5 animate-fade-up", agent.enabled && "enabled")}
      style={{ animationDelay: `${Math.min(index * 0.04, 0.5)}s` }}
    >
      {agent.isNew && (
        <span className="badge-new absolute -right-2 -top-2 animate-badge-pop rounded-full bg-tertiary px-2 py-0.5 text-2xs font-bold text-white shadow">
          ✨ Nuevo
        </span>
      )}

      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ background: ACCENT_TILE[accent] }}
          >
            <span className="text-2xl">{agent.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-primary">{agent.name}</h3>
              {agent.enabled && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />}
            </div>
            <span
              className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium", ACCENT_PILL[accent])}
            >
              {CAT_LABEL[agent.cat]}
            </span>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Toggle checked={agent.enabled} onChange={onToggle} />
        </div>
      </div>

      <p className="mb-4 line-clamp-3 text-xs leading-relaxed text-g-dark">{agent.desc}</p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {agent.tools.slice(0, 3).map((t) => (
          <span key={t} className="rounded-lg bg-g-light px-2 py-1 text-xs text-g-dark">
            {t}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-g-mid pt-3">
        <span className="flex items-center gap-1 text-xs text-g-dark">
          <LayoutGrid className="h-3 w-3" />
          {agent.output}
        </span>
        <span className="text-xs font-semibold text-secondary-600">{agent.model}</span>
      </div>
    </div>
  );
}
