import { useQuery } from "@tanstack/react-query";
import { Database, Globe, FileText, Plug, KeyRound, Plus } from "lucide-react";
import type { Tool } from "@/lib/api/types";
import { toolsApi } from "@/lib/api/endpoints";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CenteredLoader } from "@/components/ui/Feedback";
import { toast } from "@/components/ui/Toast";

const TYPE_META: Record<Tool["type"], { icon: typeof Database; label: string }> = {
  sql_query: { icon: Database, label: "SQL Query" },
  api_call: { icon: Plug, label: "API Call" },
  document_reader: { icon: FileText, label: "Document Reader" },
  web_search: { icon: Globe, label: "Web Search" },
};

const STATUS_TONE = { connected: "ok", error: "danger", disabled: "neutral" } as const;

export function ToolsPage() {
  const { data: tools, isLoading } = useQuery({ queryKey: ["tools"], queryFn: () => toolsApi.list() });

  return (
    <div>
      <PageHeader
        eyebrow="Build"
        title="Tools"
        description="The tool registry agents draw on for grounded context — databases, APIs, documents, and search."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => toast.info("Register tool", "Tool registration ships with the Tools module router.")}>
            Register tool
          </Button>
        }
      />
      {isLoading ? (
        <CenteredLoader label="Loading tools…" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tools?.map((t) => {
            const meta = TYPE_META[t.type];
            return (
              <div key={t.id} className="panel flex items-start gap-4 p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-raised text-telemetry-600">
                  <meta.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base font-semibold text-ink">{t.name}</h3>
                    <Badge tone={STATUS_TONE[t.status]} dot>
                      {t.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{t.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-2xs text-ink-faint">
                    <span className="rounded-full border border-line bg-base/40 px-2 py-0.5">{meta.label}</span>
                    <span>{t.used_by_agents} agents</span>
                    {t.secret_ref && (
                      <span className="flex items-center gap-1 font-mono">
                        <KeyRound className="h-3 w-3" /> {t.secret_ref}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
