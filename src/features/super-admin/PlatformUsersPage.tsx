import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { superAdminApi } from "@/lib/api/endpoints";
import type { PlatformUser } from "@/lib/api/endpoints";
import { paginationOf } from "@/lib/api/client";
import { formatDate, formatInt, initials } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { Panel, LoadingState, ErrorState, EmptyState, errorMessage, statusLabel } from "./parts";

const PAGE_SIZE = 20;

function statusTone(u: PlatformUser): "ok" | "warn" | "danger" | "neutral" {
  if (u.is_deleted) return "danger";
  if (u.status === "active") return "ok";
  if (u.status === "invited") return "neutral";
  return "warn";
}

export function PlatformUsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [detail, setDetail] = useState<PlatformUser | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["super-admin", "users", page, includeDeleted],
    queryFn: () => superAdminApi.listUsers(page, PAGE_SIZE, undefined, includeDeleted),
  });

  const pagination = data ? paginationOf(data) : undefined;

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "inactive" }) =>
      superAdminApi.updateUserStatus(id, { status }),
    onSuccess: (updated) => {
      toast.success(`Usuario ${updated.status === "active" ? "activado" : "desactivado"}`);
      setDetail((d) => (d && d.id === updated.id ? updated : d));
      qc.invalidateQueries({ queryKey: ["super-admin", "users"] });
    },
    onError: (e) => toast.error("No se pudo actualizar el estado", errorMessage(e)),
  });

  const toggleStatus = (u: PlatformUser) =>
    statusMut.mutate({ id: u.id, status: u.status === "active" ? "inactive" : "active" });

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma"
        title="Usuarios"
        description="Todos los usuarios de todos los inquilinos. Activa o desactiva el acceso a la plataforma."
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
          Mostrar eliminados
        </label>
        {pagination && (
          <p className="text-xs text-ink-faint">
            {formatInt(pagination.total)} usuario{pagination.total === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <Panel>
        {isLoading ? (
          <LoadingState label="Cargando usuarios…" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState title="No se encontraron usuarios" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3 font-medium">Usuario</th>
                <th className="px-5 py-3 font-medium">Rol</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Último acceso</th>
                <th className="px-5 py-3 text-right font-medium">Activo</th>
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-line/60 transition-colors last:border-0 hover:bg-ink/[0.02]"
                >
                  <td className="px-5 py-3">
                    <button onClick={() => setDetail(u)} className="flex items-center gap-3 text-left">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-sheen text-xs font-bold text-white">
                        {initials(u.name)}
                      </span>
                      <span>
                        <span className="block font-medium text-ink">{u.name}</span>
                        <span className="block text-xs text-ink-faint">{u.email}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-5 py-3 capitalize text-ink-muted">{u.role.replace(/_/g, " ")}</td>
                  <td className="px-5 py-3">
                    <Badge tone={statusTone(u)} dot>
                      {u.is_deleted ? "eliminado" : statusLabel(u.status)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">
                    {u.last_login ? formatDate(u.last_login) : "Nunca"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end">
                      <Toggle
                        checked={u.status === "active"}
                        onChange={() => toggleStatus(u)}
                      />
                    </div>
                  </td>
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

      <Modal open={!!detail} onClose={() => setDetail(null)} variant="right" title={detail?.name ?? "Usuario"}>
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-sheen text-base font-bold text-white">
                {initials(detail.name)}
              </span>
              <div>
                <p className="font-medium text-ink">{detail.name}</p>
                <p className="text-sm text-ink-muted">{detail.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge tone={statusTone(detail)} dot>
                {detail.is_deleted ? "eliminado" : statusLabel(detail.status)}
              </Badge>
              <Badge tone="brand" className="capitalize">
                {detail.role.replace(/_/g, " ")}
              </Badge>
              {detail.mfa_enabled && (
                <Badge tone="ok">
                  <ShieldCheck className="h-3 w-3" /> MFA
                </Badge>
              )}
            </div>

            <div className="text-sm">
              <DetailRow label="Proveedor de autenticación" value={detail.auth_provider} />
              <DetailRow label="ID del inquilino" value={detail.tenant_id ? <code className="text-xs">{detail.tenant_id}</code> : "Plataforma"} />
              <DetailRow label="Último acceso" value={detail.last_login ? formatDate(detail.last_login) : "Nunca"} />
              <DetailRow label="Creado" value={formatDate(detail.created_at)} />
              <DetailRow label="ID de usuario" value={<code className="text-xs">{detail.id}</code>} />
            </div>

            <Button
              variant={detail.status === "active" ? "danger" : "primary"}
              loading={statusMut.isPending}
              onClick={() => toggleStatus(detail)}
            >
              {detail.status === "active" ? "Desactivar usuario" : "Activar usuario"}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/60 py-2.5 last:border-0">
      <span className="text-xs uppercase tracking-wide text-ink-faint">{label}</span>
      <span className="text-right text-ink">{value}</span>
    </div>
  );
}
