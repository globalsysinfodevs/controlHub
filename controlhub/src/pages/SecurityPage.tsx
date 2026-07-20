import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronDown, ShieldAlert, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { SecurityAlert } from "@/lib/api/types";
import { securityApi, superAdminApi } from "@/lib/api/endpoints";
import { isMock } from "@/lib/api/client";
import { timeAgo } from "@/lib/utils";
import { useAuth, isSuperAdmin } from "@/store/auth";
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
  const user = useAuth((s) => s.user);
  const superAdmin = isSuperAdmin(user?.role);

  // Super admin tenant picker
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantPickerOpen, setTenantPickerOpen] = useState(false);

  // Fetch tenant list for super admin picker
  const { data: tenantList = [] } = useQuery({
    queryKey: ["super-admin", "tenants", "security-picker"],
    queryFn: async () => {
      const res = await superAdminApi.listTenants(1, 100) as unknown;
      if (Array.isArray(res)) return res as { id: string; name: string }[];
      if (res && typeof res === "object" && "items" in (res as object)) {
        return (res as { items: { id: string; name: string }[] }).items ?? [];
      }
      return [];
    },
    enabled: superAdmin && !isMock,
    staleTime: 60_000,
  });

  const selectedTenant = tenantList.find((t) => t.id === selectedTenantId) ?? null;
  const tenantId = superAdmin ? selectedTenantId : null;

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["security", "alerts", tenantId],
    queryFn: () => securityApi.alerts(1, 20, tenantId),
  });

  const open = alerts?.filter((a) => a.status === "open").length ?? 0;
  const critical = alerts?.filter((a) => a.severity === "critical").length ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="Govern"
        title="Security Panel"
        description="PII detected in agent executions, surfaced by the async scan worker for review."
        actions={
          superAdmin && !isMock ? (
            <div className="relative">
              <button
                onClick={() => setTenantPickerOpen((v) => !v)}
                className={
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all " +
                  (selectedTenant
                    ? "border-brand-500/50 bg-brand-500/5 text-ink"
                    : "border-line text-ink-muted hover:text-ink")
                }
              >
                <Building2 className="h-3.5 w-3.5" />
                {selectedTenant ? selectedTenant.name : "Todos los tenants"}
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
              <AnimatePresence>
                {tenantPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setTenantPickerOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.12 }}
                      className="panel absolute right-0 top-10 z-50 max-h-64 w-56 overflow-y-auto p-1"
                    >
                      {/* "All tenants" option */}
                      <button
                        onClick={() => { setSelectedTenantId(null); setTenantPickerOpen(false); }}
                        className={
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-ink/[0.04] " +
                          (!selectedTenantId ? "bg-brand-500/10 font-semibold text-brand-700" : "text-ink")
                        }
                      >
                        <Building2 className="h-3.5 w-3.5 shrink-0 opacity-50" />
                        Todos los tenants
                      </button>
                      {tenantList.length === 0 && (
                        <p className="px-3 py-2 text-xs text-ink-muted">Sin tenants disponibles</p>
                      )}
                      {tenantList.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => { setSelectedTenantId(t.id); setTenantPickerOpen(false); }}
                          className={
                            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-ink/[0.04] " +
                            (selectedTenantId === t.id ? "bg-brand-500/10 font-semibold text-brand-700" : "text-ink")
                          }
                        >
                          <Building2 className="h-3.5 w-3.5 shrink-0 opacity-50" />
                          {t.name}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : undefined
        }
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
                  <p className="mt-1.5 truncate font-mono text-xs text-ink-faint">"{a.excerpt}"</p>
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
