import { clamp } from "@/lib/utils";

/**
 * Signature element: a conic radial gauge that glows as it fills.
 * Used for token consumption against limit on the dashboard and billing.
 */
export function RadialGauge({
  value,
  max,
  size = 200,
  label,
  sublabel,
  tone = "brand",
}: {
  value: number;
  max: number;
  size?: number;
  label: string;
  sublabel?: string;
  tone?: "brand" | "warn" | "danger";
}) {
  const pct = clamp(max > 0 ? (value / max) * 100 : 0, 0, 100);
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const cx = size / 2;

  const colors = {
    brand: { from: "#818CF8", to: "#22D3EE", glow: "rgba(99,102,241,0.55)" },
    warn: { from: "#FBBF24", to: "#F59E0B", glow: "rgba(251,191,36,0.5)" },
    danger: { from: "#FB7185", to: "#F43F5E", glow: "rgba(251,113,133,0.55)" },
  }[tone];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`gauge-${tone}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colors.from} />
            <stop offset="100%" stopColor={colors.to} />
          </linearGradient>
          <filter id={`glow-${tone}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={`url(#gauge-${tone})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          filter={`url(#glow-${tone})`}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="stat-number font-display text-3xl font-semibold text-ink">{pct.toFixed(0)}%</span>
        <span className="mt-0.5 text-2xs uppercase tracking-wider text-ink-faint">{label}</span>
        {sublabel && <span className="mt-1 text-xs text-ink-muted">{sublabel}</span>}
      </div>
    </div>
  );
}
