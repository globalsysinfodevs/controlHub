import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Layers,
  RefreshCw,
  Users,
  UserCheck,
} from "lucide-react";
import { superAdminApi } from "@/lib/api/endpoints";
import { formatInt, formatPercent } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/features/dashboard/StatCard";
import { CenteredLoader, EmptyState } from "@/components/ui/Feedback";

/** Percentage of `part` over `total`, guarding against division by zero. */
function share(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}

export function PlatformOverviewPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["platform", "stats"],
    queryFn: () => superAdminApi.stats(),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma"
        title="Resumen de la plataforma"
        description="Métricas globales de tenants, usuarios e industrias en toda la plataforma."
        actions={
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-60"
          >
            <RefreshCw className={"h-3.5 w-3.5" + (isFetching ? " animate-spin" : "")} />
            Actualizar
          </button>
        }
      />

      {isLoading ? (
        <CenteredLoader label="Cargando métricas…" />
      ) : isError || !data ? (
        <EmptyState
          title="No se pudieron cargar las métricas"
          description={error instanceof Error ? error.message : "Inténtalo de nuevo en unos segundos."}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard
            icon={Building2}
            label="Tenants totales"
            value={formatInt(data.total_tenants)}
            accent="brand"
          />
          <StatCard
            icon={CheckCircle2}
            label={`Tenants activos · ${formatPercent(share(data.active_tenants, data.total_tenants))}`}
            value={formatInt(data.active_tenants)}
            accent="ok"
          />
          <StatCard
            icon={Layers}
            label="Industrias"
            value={formatInt(data.total_industries)}
            accent="telemetry"
          />
          <StatCard
            icon={Users}
            label="Usuarios totales"
            value={formatInt(data.total_users)}
            accent="brand"
          />
          <StatCard
            icon={UserCheck}
            label={`Usuarios activos · ${formatPercent(share(data.active_users, data.total_users))}`}
            value={formatInt(data.active_users)}
            accent="ok"
          />
        </div>
      )}
    </div>
  );
}
