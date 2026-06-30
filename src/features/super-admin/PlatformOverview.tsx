import { useQuery } from "@tanstack/react-query";
import { Building2, Users, CheckCircle2, Layers, Factory } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { superAdminApi } from "@/lib/api/endpoints";
import { formatInt } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel, LoadingState, ErrorState } from "./parts";

interface Tile {
  key: string;
  label: string;
  icon: LucideIcon;
  value: number;
  sub?: string;
}

export function PlatformOverview() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["super-admin", "stats"],
    queryFn: () => superAdminApi.stats(),
  });

  const tiles: Tile[] = data
    ? [
        { key: "tenants", label: "Inquilinos totales", icon: Building2, value: data.total_tenants },
        {
          key: "active-tenants",
          label: "Inquilinos activos",
          icon: CheckCircle2,
          value: data.active_tenants,
          sub: `${data.total_tenants - data.active_tenants} inactivos`,
        },
        { key: "users", label: "Usuarios totales", icon: Users, value: data.total_users },
        {
          key: "active-users",
          label: "Usuarios activos",
          icon: Layers,
          value: data.active_users,
          sub: `${data.total_users - data.active_users} inactivos`,
        },
        { key: "industries", label: "Industrias", icon: Factory, value: data.total_industries },
      ]
    : [];

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma"
        title="Resumen"
        description="Conteos de toda la plataforma en cada inquilino de iAlestra."
      />

      {isLoading ? (
        <Panel>
          <LoadingState label="Cargando estadísticas…" />
        </Panel>
      ) : error ? (
        <Panel>
          <ErrorState error={error} onRetry={() => refetch()} />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => (
            <Panel key={t.key} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                    {t.label}
                  </p>
                  <p className="mt-2 font-display text-3xl font-semibold text-ink">
                    {formatInt(t.value)}
                  </p>
                  {t.sub && <p className="mt-1 text-xs text-ink-muted">{t.sub}</p>}
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/12">
                  <t.icon className="h-5 w-5 text-brand-600" />
                </span>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
