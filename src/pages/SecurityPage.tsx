import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { SecurityAlert } from "@/lib/api/types";
import { securityApi } from "@/lib/api/endpoints";
import { timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Sigil } from "@/components/ui/Sigil";
import { CenteredLoader, EmptyState } from "@/components/ui/Feedback";

const SEVERITY_TONE: Record<SecurityAlert["severity"], "danger" | "warn" | "telemetry" | "neutral"> = {
  critical: "danger",
  high: "danger",
  medium: "warn",
  low: "neutral",
};
const STATUS_TONE: Record<SecurityAlert["status"], "danger" | "telemetry" | "neutral"> = {
  open: "danger",
  reviewed: "telemetry",
  dismissed: "neutral",
};

export function SecurityPage() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ["security", "alerts"],
    queryFn: () => securityApi.alerts(),
  });

  const open = alerts?.filter((a) => a.status === "open").length ?? 0;
  const critical = alerts?.filter((a) => a.severity === "critical").length ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="Govern"
        title="Security Panel"
        description="PII detected in agent executions, surfaced by the async scan worker for review."
      />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <SummaryStat icon={ShieldAlert} label="Open alerts" value={open} tone="danger" />
        <SummaryStat icon={ShieldAlert} label="Critical" value={critical} tone="warn" />
        <SummaryStat icon={ShieldCheck} label="Total detected" value={alerts?.length ?? 0} tone="ok" />
      </div>

      {isLoading ? (
        <CenteredLoader label="Loading alerts…" />
      ) : !alerts?.length ? (
        <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="No PII detected" description="The scan worker has flagged nothing for review." />
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3">
                <Sigil seed={a.user_name} name={a.user_name} size="sm" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={SEVERITY_TONE[a.severity]} dot>
                      {a.severity}
                    </Badge>
                    {a.pii_types.map((p) => (
                      <span key={p} className="rounded-full border border-line bg-base/40 px-2 py-0.5 text-2xs text-ink-muted">
                        {p.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1.5 truncate font-mono text-xs text-ink-faint">“{a.excerpt}”</p>
                  <p className="mt-1 text-2xs text-ink-faint">
                    {a.user_name} · {a.agent_name} · {timeAgo(a.detected_at)}
                  </p>
                </div>
              </div>
              <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ShieldAlert;
  label: string;
  value: number;
  tone: "danger" | "warn" | "ok";
}) {
  const tones = { danger: "text-danger", warn: "text-warn", ok: "text-ok" };
  return (
    <div className="panel flex items-center gap-3 p-4">
      <Icon className={"h-6 w-6 " + tones[tone]} />
      <div>
        <p className="text-2xs text-ink-faint">{label}</p>
        <p className="stat-number font-display text-xl font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}
