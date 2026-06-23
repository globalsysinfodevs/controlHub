import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";

/**
 * Placeholder for modules whose FastAPI routers are scaffolded but not yet
 * wired up. Shows the planned scope so the roadmap is legible in-product.
 */
export function ComingSoon({
  icon: Icon,
  eyebrow,
  title,
  description,
  capabilities,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  capabilities: string[];
}) {
  return (
    <div>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="panel relative overflow-hidden p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface-raised text-brand-600">
              <Icon className="h-7 w-7" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
                <Badge tone="brand">on the roadmap</Badge>
              </div>
              <p className="mt-1 max-w-md text-sm text-ink-muted">
                The backend module is scaffolded. This screen activates when its router ships.
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-8">
          <p className="eyebrow mb-3">Planned capabilities</p>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {capabilities.map((c) => (
              <li key={c} className="flex items-start gap-2.5 rounded-lg border border-line bg-base/40 p-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-600">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-sm text-ink-muted">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
