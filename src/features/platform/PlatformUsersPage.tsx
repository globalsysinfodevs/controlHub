import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronDown, Power, ShieldCheck, Users } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { paginationOf } from "@/lib/api/client";
import { superAdminApi, type PlatformUser } from "@/lib/api/endpoints";
import { timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sigil } from "@/components/ui/Sigil";
import { CenteredLoader, EmptyState } from "@/components/ui/Feedback";
import { toast } from "@/components/ui/Toast";

const PAGE_SIZE = 20;

const ROLE_LABEL: Record<string, string> = {
  platform_super_admin: "Super Admin",
  tenant_admin: "Admin",
  member: "Miembro",
  viewer: "Lector",
};
const STATUS_TONE: Record<string, "ok" | "warn" | "neutral"> = {
  active: "ok",
  invited: "warn",
  inactive: "neutral",
};
const STATUS_LABEL: Record<string, string> = { active: "Activo", invited: "Invitado", inactive: "Inactivo" };

export function PlatformUsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  // Tenant filter picker
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantPickerOpen, setTenantPickerOpen] = useState(false);

  // Fetch tenant list for the picker
  const { data: tenantList = [] } = useQuery({
    queryKey: ["super-admin", "tenants", "users-picker"],
    queryFn: async () => {
      const res = await superAdminApi.listTenants(1, 100) as unknown;
      if (Array.isArray(res)) return res as { id: string; name: string }[];
      if (res && typeof res === "object" && "items" in (res as object)) {
        return (res as { items: { id: string; name: string }[] }).items ?? [];
      }
      return [];
    },
    staleTime: 60_000,
  });

  const selectedTenant = tenantList.find((t) => t.id === selectedTenantId) ?? null;

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["platform", "users", page, includeDeleted, selectedTenantId],
    queryFn: () =>
      superAdminApi.listUsers(page, PAGE_SIZE, {
        include_deleted: includeDeleted,
        tenant_id: selectedTenantId ?? undefined,
      }),
  });

  const meta = data ? paginationOf(data) : undefined;
  const totalPages = meta?.total_pages ?? 1;

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: "active" | "inactive" }) =>
      superAdminApi.updateUserStatus(v.id, { status: v.status }),
    onSuccess: (_res, v) => {
      toast.success(v.status === "active" ? "Usuario activado" : "Usuario desactivado");
      qc.invalidateQueries({ queryKey: ["platform", "users"] });
    },
    onError: (e) => toast.error("No se pudo actualizar", (e as Error).message),
  });

  function toggle(u: PlatformUser) {
    const next = u.status === "active" ? "inactive" : "active";
    setStatus.mutate({ id: u.id, status: next });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma"
        title="Usuarios"
        description="Todos los usuarios de la plataforma, en todos los tenants."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* Tenant filter picker */}
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
                      <button
                        onClick={() => { setSelectedTenantId(null); setPage(1); setTenantPickerOpen(false); }}
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
                          onClick={() => { setSelectedTenantId(t.id); setPage(1); setTenantPickerOpen(false); }}
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

            <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => {
                  setIncludeDeleted(e.target.checked);
                  setPage(1);
                }}
                className="h-3.5 w-3.5 rounded border-line-strong"
              />
              Incluir eliminados
            </label>
          </div>
        }
      />

      {isLoading ? (
        <CenteredLoader label="Cargando usuarios…" />
      ) : isError ? (
        <EmptyState title="No se pudieron cargar los usuarios" description={(error as Error)?.message} />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="Sin usuarios" description="Aún no hay usuarios registrados." />
      ) : (
        <>
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-2xs uppercase tracking-wider text-ink-faint">
                  <th className="px-5 py-3 font-medium">Usuario</th>
                  <th className="px-5 py-3 font-medium">Rol</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Último acceso</th>
                  <th className="px-5 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-ink/[0.02]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Sigil seed={u.id} name={u.name} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium text-ink">{u.name}</span>
                            {u.mfa_enabled && <ShieldCheck className="h-3.5 w-3.5 text-ok" aria-label="MFA activo" />}
                          </div>
                          <p className="truncate text-2xs text-ink-faint">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={u.role === "platform_super_admin" ? "brand" : "neutral"}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={u.is_deleted ? "danger" : STATUS_TONE[u.status] ?? "neutral"} dot>
                        {u.is_deleted ? "Eliminado" : STATUS_LABEL[u.status] ?? u.status}
                      </Badge>
                    </td>
                    <td className="hidden px-5 py-3 text-ink-muted md:table-cell">
                      {u.last_login ? timeAgo(u.last_login) : "Nunca"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        {u.status === "invited" || u.is_deleted ? (
                          <span className="text-2xs text-ink-faint">—</span>
                        ) : (
                          <Button
                            size="sm"
                            variant={u.status === "active" ? "ghost" : "secondary"}
                            className={u.status === "active" ? "text-danger hover:text-danger" : ""}
                            leftIcon={<Power className="h-3.5 w-3.5" />}
                            loading={setStatus.isPending && setStatus.variables?.id === u.id}
                            onClick={() => toggle(u)}
                          >
                            {u.status === "active" ? "Desactivar" : "Activar"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={meta?.total}
            busy={isFetching}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        </>
      )}
    </div>
  );
}

/** Simple prev/next pager shared by the platform tables. */
export function Pagination({
  page,
  totalPages,
  total,
  busy,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total?: number;
  busy?: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-xs text-ink-muted">
      <span>
        Página {page} de {totalPages}
        {total !== undefined ? ` · ${total} en total` : ""}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1 || busy} onClick={onPrev}>
          Anterior
        </Button>
        <Button size="sm" variant="outline" disabled={page >= totalPages || busy} onClick={onNext}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
