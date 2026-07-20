import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/charts/Charts";

export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  spark,
  sparkColor,
  accent = "brand",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: number;
  spark?: number[];
  sparkColor?: string;
  accent?: "brand" | "telemetry" | "ok" | "warn";
}) {
  const up = (delta ?? 0) >= 0;
  const accents = {
    brand: "text-brand-600 bg-brand-500/12",
    telemetry: "text-telemetry-600 bg-telemetry-500/12",
    ok: "text-ok bg-ok/12",
    warn: "text-warn bg-warn/12",
  };
  return (
    <div className="panel group relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", accents[accent])}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        {delta !== undefined && (
          <span
            className={cn(
              "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-2xs font-medium",
              up ? "bg-ok/12 text-ok" : "bg-danger/12 text-danger"
            )}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-xs text-ink-muted">{label}</p>
      <p className="stat-number mt-1 font-display text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {spark && (
        <div className="mt-2 -mx-1">
          <Sparkline data={spark} color={sparkColor} />
        </div>
      )}
    </div>
  );
}
