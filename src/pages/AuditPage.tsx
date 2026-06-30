import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import type { AuditEntry } from "@/lib/api/types";
import { auditApi } from "@/lib/api/endpoints";
import { formatInt, timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CenteredLoader } from "@/components/ui/Feedback";
import { toast } from "@/components/ui/Toast";



const STATUS_TONE: Record<AuditEntry["status"], "ok" | "danger" | "warn"> = {
  success: "ok",
  error: "danger",
  blocked: "warn",
};
const FILTERS = ["all", "success", "error", "blocked"] as const;

export function AuditPage() {
  const [status, setStatus] = useState<string>("all");
  const { data: entries, isLoading } = useQuery({
    queryKey: ["audit", status],
    queryFn: () => auditApi.list(status),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Govern"
        title="Audit Logs"
        description="Every prompt execution — user, agent, model, tokens, and outcome — retained for 24 months."
        actions={
          <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={() => toast.success("Export queued", "Your CSV will be emailed when ready.")}>
            Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            className={
              "rounded-full border px-3 py-1 text-2xs font-medium capitalize transition-colors " +
              (status === f ? "border-brand-500/50 bg-brand-500/12 text-brand-700" : "border-line text-ink-muted hover:text-ink")
            }
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <CenteredLoader label="Loading audit log…" />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-2xs uppercase tracking-wider text-ink-faint">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Agent</th>
                <th className="px-5 py-3 font-medium">Model</th>
                <th className="px-5 py-3 text-right font-medium">Tokens</th>
                <th className="px-5 py-3 text-right font-medium">Latency</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries?.map((e) => (
                <tr key={e.id} className="transition-colors hover:bg-ink/[0.02]">
                  <td className="px-5 py-3 font-medium text-ink">{e.user_name}</td>
                  <td className="px-5 py-3 text-ink-muted">{e.agent_name}</td>
                  <td className="px-5 py-3 font-mono text-2xs text-ink-faint">{e.model}</td>
                  <td className="stat-number px-5 py-3 text-right text-ink-muted">{formatInt(e.tokens)}</td>
                  <td className="stat-number px-5 py-3 text-right text-ink-faint">{formatInt(e.latency_ms)} ms</td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[e.status]} dot>
                      {e.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right text-2xs text-ink-faint">{timeAgo(e.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
