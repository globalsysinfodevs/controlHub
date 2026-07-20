import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronDown, Download } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { AuditEntry } from "@/lib/api/types";
import { auditApi, superAdminApi } from "@/lib/api/endpoints";
import { isMock } from "@/lib/api/client";
import { formatInt, timeAgo } from "@/lib/utils";
import { useAuth, isSuperAdmin } from "@/store/auth";
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
  const user = useAuth((s) => s.user);
  const superAdmin = isSuperAdmin(user?.role);

  const [status, setStatus] = useState<string>("all");
  // Super admin tenant picker
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantPickerOpen, setTenantPickerOpen] = useState(false);

  // Fetch tenant list for super admin picker
  const { data: tenantList = [] } = useQuery({
    queryKey: ["super-admin", "tenants", "audit-picker"],
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

  const { data: entries, isLoading } = useQuery({
    queryKey: ["audit", status, tenantId],
    queryFn: () => auditApi.list(status === "all" ? undefined : status, 1, 20, tenantId),
  });

  function handleExport() {
    if (isMock) {
      toast.success("Export queued", "Your CSV will be emailed when ready.");
      return;
    }
    auditApi.export(tenantId)
      .then(() => toast.success("Export queued", "Your CSV will be emailed when ready."))
      .catch((e) => toast.error("Export failed", (e as Error).message));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Govern"
        title="Audit Logs"
        description="Every prompt execution — user, agent, model, tokens, and outcome — retained for 24 months."
        actions={
          <div className="flex items-center gap-2">
            {/* Super admin: tenant picker */}
            {superAdmin && !isMock && (
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
            )}

            <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport}>
              Export CSV
            </Button>
          </div>
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
              {!entries?.length && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-ink-muted">
                    No audit entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
