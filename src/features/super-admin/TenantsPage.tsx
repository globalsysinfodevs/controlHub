import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { superAdminApi } from "@/lib/api/endpoints";
import type { TenantRecord } from "@/lib/api/endpoints";
import { paginationOf } from "@/lib/api/client";
import { formatDate, formatInt } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import { Panel, LoadingState, ErrorState, EmptyState, statusLabel } from "./parts";
import { TenantFormModal } from "./TenantFormModal";
import { TenantDetailDrawer } from "./TenantDetailDrawer";

const PAGE_SIZE = 20;

function statusTone(t: TenantRecord): "ok" | "warn" | "danger" | "neutral" {
  if (t.is_deleted) return "danger";
  if (t.status === "active") return "ok";
  if (t.status === "inactive") return "warn";
  return "neutral";
}

export function TenantsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["super-admin", "tenants", page, includeDeleted],
    queryFn: () => superAdminApi.listTenants(page, PAGE_SIZE, includeDeleted),
  });

  const pagination = data ? paginationOf(data) : undefined;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["super-admin", "tenants"] });

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma"
        title="Inquilinos"
        description="Todas las organizaciones aprovisionadas en la plataforma."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            Nuevo inquilino
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-muted">
          <Toggle
            checked={includeDeleted}
            onChange={(v) => {
              setIncludeDeleted(v);
              setPage(1);
            }}
          />
          Mostrar desactivados
        </label>
        {pagination && (
          <p className="text-xs text-ink-faint">
            {formatInt(pagination.total)} inquilino{pagination.total === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <Panel>
        {isLoading ? (
          <LoadingState label="Cargando inquilinos…" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="No se encontraron inquilinos"
            description="Aprovisiona el primer inquilino para comenzar."
            action={
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                Nuevo inquilino
              </Button>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3 font-medium">Inquilino</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Creado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setDetailId(t.id)}
                  className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-ink/[0.02]"
                >
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{t.name}</p>
                    <p className="text-xs text-ink-faint">{t.billing_email}</p>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{t.plan_name ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge tone={statusTone(t)} dot>
                      {t.is_deleted ? "desactivado" : statusLabel(t.status)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{formatDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {pagination && pagination.total_pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-ink-faint">
            Página {pagination.page} de {pagination.total_pages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={!pagination.has_previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!pagination.has_next}
              onClick={() => setPage((p) => p + 1)}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {creating && (
        <TenantFormModal
          tenant={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            invalidate();
          }}
        />
      )}

      {detailId && (
        <TenantDetailDrawer
          tenantId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={invalidate}
        />
      )}
    </div>
  );
}
