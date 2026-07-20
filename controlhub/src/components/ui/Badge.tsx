import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "ok" | "warn" | "danger" | "telemetry";

const tones: Record<Tone, string> = {
  neutral: "bg-ink/[0.06] text-ink-muted border-line",
  brand: "bg-brand-500/15 text-brand-600 border-brand-500/30",
  ok: "bg-ok/15 text-ok border-ok/30",
  warn: "bg-warn/15 text-warn border-warn/30",
  danger: "bg-danger/15 text-danger border-danger/30",
  telemetry: "bg-telemetry-500/15 text-telemetry-600 border-telemetry-500/30",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs font-medium",
        tones[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Pulsing status dot used for live/active states. */
export function StatusDot({ tone = "ok", pulse }: { tone?: Tone; pulse?: boolean }) {
  const color: Record<Tone, string> = {
    neutral: "bg-ink-faint",
    brand: "bg-brand-400",
    ok: "bg-ok",
    warn: "bg-warn",
    danger: "bg-danger",
    telemetry: "bg-telemetry-400",
  };
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && (
        <span
          className={cn("absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping", color[tone])}
        />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", color[tone])} />
    </span>
  );
}
