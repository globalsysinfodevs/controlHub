import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, UserPlus, Power, RotateCcw, Mail } from "lucide-react";
import { superAdminApi } from "@/lib/api/endpoints";
import type { InviteTenantAdminRequest } from "@/lib/api/endpoints";
import { formatDate, formatInt } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toast";
import { LoadingState, ErrorState, errorMessage, statusLabel } from "./parts";
import { TenantFormModal } from "./TenantFormModal";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/60 py-2.5 last:border-0">
      <span className="text-xs uppercase tracking-wide text-ink-faint">{label}</span>
      <span className="text-right text-sm text-ink">{value}</span>
    </div>
  );
}

export function TenantDetailDrawer({
  tenantId,
  onClose,
  onChanged,
}: {
  tenantId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "deactivate" | "restore">(null);

  const { data: tenant, isLoading, error, refetch } = useQuery({
    queryKey: ["super-admin", "tenant", tenantId],
    queryFn: () => superAdminApi.getTenant(tenantId),
  });

  const refresh = () => {
    refetch();
    onChanged();
  };

  const deactivateMut = useMutation({
    mutationFn: () => superAdminApi.deleteTenant(tenantId),
    onSuccess: () => {
      toast.success("Inquilino desactivado");
      setConfirmAction(null);
      refresh();
    },
    onError: (e) => toast.error("No se pudo desactivar", errorMessage(e)),
  });

  const restoreMut = useMutation({
    mutationFn: () => superAdminApi.restoreTenant(tenantId),
    onSuccess: () => {
      toast.success("Inquilino restaurado");
      setConfirmAction(null);
      refresh();
    },
    onError: (e) => toast.error("No se pudo restaurar", errorMessage(e)),
  });

  return (
    <>
      <Modal open onClose={onClose} variant="right" title={tenant?.name ?? "Inquilino"}>
        {isLoading ? (
          <LoadingState label="Cargando inquilino…" />
        ) : error || !tenant ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={tenant.is_deleted ? "danger" : tenant.status === "active" ? "ok" : "warn"} dot>
                {tenant.is_deleted ? "desactivado" : statusLabel(tenant.status)}
              </Badge>
              {tenant.plan_name && <Badge tone="brand">{tenant.plan_name}</Badge>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line bg-base/50 p-4">
                <p className="text-xs uppercase tracking-wide text-ink-faint">Usuarios</p>
                <p className="mt-1 font-display text-2xl font-semibold text-ink">
                  {formatInt(tenant.user_count)}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-base/50 p-4">
                <p className="text-xs uppercase tracking-wide text-ink-faint">Usuarios activos</p>
                <p className="mt-1 font-display text-2xl font-semibold text-ink">
                  {formatInt(tenant.active_user_count)}
                </p>
              </div>
            </div>

            <div>
              <Row label="Correo de facturación" value={tenant.billing_email} />
              <Row label="RFC" value={tenant.rfc ?? "—"} />
              <Row label="Zona horaria" value={tenant.timezone} />
              <Row
                label="Tokens mensuales"
                value={tenant.monthly_token_limit != null ? formatInt(tenant.monthly_token_limit) : "—"}
              />
              <Row
                label="Costo mensual"
                value={tenant.monthly_cost != null ? `$${tenant.monthly_cost}` : "—"}
              />
              <Row label="Creado" value={formatDate(tenant.created_at)} />
              <Row label="Actualizado" value={formatDate(tenant.updated_at)} />
              <Row label="ID del inquilino" value={<code className="text-xs">{tenant.id}</code>} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>
                Editar
              </Button>
              <Button
                variant="secondary"
                leftIcon={<UserPlus className="h-4 w-4" />}
                onClick={() => setInviting(true)}
              >
                Invitar admin
              </Button>
              {tenant.is_deleted ? (
                <Button
                  variant="secondary"
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                  onClick={() => setConfirmAction("restore")}
                >
                  Restaurar
                </Button>
              ) : (
                <Button
                  variant="danger"
                  leftIcon={<Power className="h-4 w-4" />}
                  onClick={() => setConfirmAction("deactivate")}
                >
                  Desactivar
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {editing && tenant && (
        <TenantFormModal
          tenant={tenant}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            qc.invalidateQueries({ queryKey: ["super-admin", "tenant", tenantId] });
            onChanged();
          }}
        />
      )}

      {inviting && <InviteAdminModal tenantId={tenantId} onClose={() => setInviting(false)} />}

      <Modal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === "restore" ? "Restaurar inquilino" : "Desactivar inquilino"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>
              Cancelar
            </Button>
            {confirmAction === "restore" ? (
              <Button loading={restoreMut.isPending} onClick={() => restoreMut.mutate()}>
                Restaurar
              </Button>
            ) : (
              <Button variant="danger" loading={deactivateMut.isPending} onClick={() => deactivateMut.mutate()}>
                Desactivar
              </Button>
            )}
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          {confirmAction === "restore"
            ? "El inquilino y sus usuarios recuperarán el acceso a la plataforma."
            : "El inquilino se eliminará de forma temporal. Sus usuarios pierden el acceso hasta que se restaure."}
        </p>
      </Modal>
    </>
  );
}

function InviteAdminModal({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const mut = useMutation({
    mutationFn: (body: InviteTenantAdminRequest) => superAdminApi.inviteTenantAdmin(tenantId, body),
    onSuccess: (inv) => {
      toast.success("Invitación enviada", `Expira ${formatDate(inv.expires_at)}`);
      onClose();
    },
    onError: (e) => toast.error("No se pudo enviar la invitación", errorMessage(e)),
  });

  const submit = () => {
    if (!name.trim()) return toast.error("El nombre es obligatorio");
    if (!email.trim()) return toast.error("El correo es obligatorio");
    mut.mutate({ name: name.trim(), email: email.trim() });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Invitar administrador del inquilino"
      description="Crea un usuario administrador (estado invitado) y envía por correo un enlace de incorporación válido por 72 horas."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={mut.isPending} leftIcon={<Mail className="h-4 w-4" />} onClick={submit}>
            Enviar invitación
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div>
          <Label htmlFor="inv-name">Nombre completo</Label>
          <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <Label htmlFor="inv-email">Correo</Label>
          <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </form>
    </Modal>
  );
}
