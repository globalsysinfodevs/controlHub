import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Mail, Pencil, Plus, RotateCcw, Power, UserPlus } from "lucide-react";
import { paginationOf } from "@/lib/api/client";
import {
  superAdminApi,
  type PlatformTenant,
  type TenantCreate,
} from "@/lib/api/endpoints";
import { formatCompact, formatCurrency, timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Select } from "@/components/ui/Field";
import { CenteredLoader, EmptyState } from "@/components/ui/Feedback";
import { toast } from "@/components/ui/Toast";
import { Pagination } from "./PlatformUsersPage";

const PAGE_SIZE = 20;

const STATUS_TONE: Record<string, "ok" | "warn" | "neutral"> = {
  active: "ok",
  suspended: "warn",
  inactive: "neutral",
};

interface TenantForm {
  name: string;
  billing_email: string;
  rfc: string;
  industry_id: string;
  timezone: string;
  plan_name: string;
  monthly_token_limit: string;
  monthly_cost: string;
}

const EMPTY_FORM: TenantForm = {
  name: "",
  billing_email: "",
  rfc: "",
  industry_id: "",
  timezone: "UTC",
  plan_name: "",
  monthly_token_limit: "",
  monthly_cost: "",
};

function toBody(f: TenantForm): TenantCreate {
  return {
    name: f.name.trim(),
    billing_email: f.billing_email.trim(),
    rfc: f.rfc.trim() || null,
    industry_id: f.industry_id || null,
    timezone: f.timezone.trim() || "UTC",
    plan_name: f.plan_name.trim() || null,
    monthly_token_limit: f.monthly_token_limit === "" ? null : Number(f.monthly_token_limit),
    monthly_cost: f.monthly_cost === "" ? null : Number(f.monthly_cost),
  };
}

export function TenantsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["platform", "tenants", page, includeDeleted],
    queryFn: () => superAdminApi.listTenants(page, PAGE_SIZE, includeDeleted),
  });
  const { data: industries } = useQuery({
    queryKey: ["platform", "industries"],
    queryFn: () => superAdminApi.listIndustries(),
  });
  const industryName = (id: string | null) =>
    (id && industries?.find((i) => i.id === id)?.name) || "—";

  const meta = data ? paginationOf(data) : undefined;
  const totalPages = meta?.total_pages ?? 1;

  // ── Create / edit form ──────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformTenant | null>(null);
  const [form, setForm] = useState<TenantForm>(EMPTY_FORM);

  const refresh = () => qc.invalidateQueries({ queryKey: ["platform", "tenants"] });

  const save = useMutation({
    mutationFn: () =>
      editing
        ? superAdminApi.updateTenant(editing.id, toBody(form))
        : superAdminApi.createTenant(toBody(form)),
    onSuccess: () => {
      toast.success(editing ? "Inquilino actualizado" : "Inquilino creado", form.name);
      setFormOpen(false);
      refresh();
    },
    onError: (e) => toast.error("No se pudo guardar", (e as Error).message),
  });

  const setActive = useMutation({
    mutationFn: (v: { t: PlatformTenant; restore: boolean }) =>
      v.restore ? superAdminApi.restoreTenant(v.t.id) : superAdminApi.deleteTenant(v.t.id),
    onSuccess: (_r, v) => {
      toast.success(v.restore ? "Inquilino restaurado" : "Inquilino desactivado", v.t.name);
      refresh();
    },
    onError: (e) => toast.error("No se pudo actualizar", (e as Error).message),
  });

  // ── Invite admin ────────────────────────────────────────────────────────
  const [inviteFor, setInviteFor] = useState<PlatformTenant | null>(null);
  const [invite, setInvite] = useState({ name: "", email: "" });
  const inviteAdmin = useMutation({
    mutationFn: () => superAdminApi.inviteTenantAdmin(inviteFor!.id, { name: invite.name.trim(), email: invite.email.trim() }),
    onSuccess: () => {
      toast.success("Invitación enviada", invite.email);
      setInviteFor(null);
      setInvite({ name: "", email: "" });
    },
    onError: (e) => toast.error("No se pudo invitar", (e as Error).message),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }
  function openEdit(t: PlatformTenant) {
    setEditing(t);
    setForm({
      name: t.name,
      billing_email: t.billing_email,
      rfc: t.rfc ?? "",
      industry_id: t.industry_id ?? "",
      timezone: t.timezone,
      plan_name: t.plan_name ?? "",
      monthly_token_limit: t.monthly_token_limit?.toString() ?? "",
      monthly_cost: t.monthly_cost?.toString() ?? "",
    });
    setFormOpen(true);
  }
  function onToggleActive(t: PlatformTenant) {
    if (!t.is_deleted && !window.confirm(`¿Desactivar el inquilino "${t.name}"?`)) return;
    setActive.mutate({ t, restore: t.is_deleted });
  }

  const canSave = form.name.trim() !== "" && form.billing_email.trim() !== "";

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma"
        title="Inquilinos"
        description="Crea y administra las organizaciones (inquilinos) de la plataforma."
        actions={
          <div className="flex items-center gap-3">
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
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Nuevo inquilino
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <CenteredLoader label="Cargando inquilinos…" />
      ) : isError ? (
        <EmptyState title="No se pudieron cargar los inquilinos" description={(error as Error)?.message} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="Sin inquilinos"
          description="Crea el primer inquilino para empezar a incorporar organizaciones."
          action={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>Nuevo inquilino</Button>}
        />
      ) : (
        <>
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-2xs uppercase tracking-wider text-ink-faint">
                  <th className="px-5 py-3 font-medium">Inquilino</th>
                  <th className="px-5 py-3 font-medium">Industria</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Tokens / mes</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-ink/[0.02]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/12 text-brand-600">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{t.name}</p>
                          <p className="truncate text-2xs text-ink-faint">{t.billing_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{industryName(t.industry_id)}</td>
                    <td className="px-5 py-3 text-ink-muted">
                      <div className="flex flex-col">
                        <span>{t.plan_name || "—"}</span>
                        {t.monthly_cost != null && (
                          <span className="text-2xs text-ink-faint">{formatCurrency(t.monthly_cost)}/mes</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {t.monthly_token_limit != null ? formatCompact(t.monthly_token_limit) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={t.is_deleted ? "danger" : STATUS_TONE[t.status] ?? "neutral"} dot>
                        {t.is_deleted ? "Eliminado" : t.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" leftIcon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setInviteFor(t)}>
                          Invitar admin
                        </Button>
                        <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => openEdit(t)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={t.is_deleted ? "text-ok hover:text-ok" : "text-danger hover:text-danger"}
                          leftIcon={t.is_deleted ? <RotateCcw className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                          loading={setActive.isPending && setActive.variables?.t.id === t.id}
                          onClick={() => onToggleActive(t)}
                        >
                          {t.is_deleted ? "Restaurar" : "Desactivar"}
                        </Button>
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

      {/* Create / edit tenant */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        size="lg"
        title={editing ? "Editar inquilino" : "Nuevo inquilino"}
        description="Los campos de facturación e industria son opcionales salvo el nombre y el correo."
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={() => canSave && save.mutate()} loading={save.isPending} disabled={!canSave}>
              {editing ? "Guardar cambios" : "Crear inquilino"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="t-name">Nombre</Label>
            <Input id="t-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Acme S.A. de C.V." autoFocus />
          </div>
          <div>
            <Label htmlFor="t-email">Correo de facturación</Label>
            <Input id="t-email" type="email" value={form.billing_email} onChange={(e) => setForm((f) => ({ ...f, billing_email: e.target.value }))} placeholder="facturacion@acme.mx" />
          </div>
          <div>
            <Label htmlFor="t-rfc" hint="opcional">RFC</Label>
            <Input id="t-rfc" value={form.rfc} onChange={(e) => setForm((f) => ({ ...f, rfc: e.target.value }))} placeholder="ACM010101AAA" maxLength={20} />
          </div>
          <div>
            <Label htmlFor="t-industry" hint="opcional">Industria</Label>
            <Select id="t-industry" value={form.industry_id} onChange={(e) => setForm((f) => ({ ...f, industry_id: e.target.value }))}>
              <option value="">— Sin industria —</option>
              {industries?.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="t-tz">Zona horaria</Label>
            <Input id="t-tz" value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} placeholder="America/Mexico_City" />
          </div>
          <div>
            <Label htmlFor="t-plan" hint="opcional">Plan</Label>
            <Input id="t-plan" value={form.plan_name} onChange={(e) => setForm((f) => ({ ...f, plan_name: e.target.value }))} placeholder="Enterprise" />
          </div>
          <div>
            <Label htmlFor="t-tokens" hint="opcional">Límite de tokens / mes</Label>
            <Input id="t-tokens" type="number" min={0} value={form.monthly_token_limit} onChange={(e) => setForm((f) => ({ ...f, monthly_token_limit: e.target.value }))} placeholder="25000000" />
          </div>
          <div>
            <Label htmlFor="t-cost" hint="opcional">Costo mensual</Label>
            <Input id="t-cost" type="number" min={0} step="0.01" value={form.monthly_cost} onChange={(e) => setForm((f) => ({ ...f, monthly_cost: e.target.value }))} placeholder="4999.00" />
          </div>
        </div>
      </Modal>

      {/* Invite tenant admin */}
      <Modal
        open={inviteFor !== null}
        onClose={() => setInviteFor(null)}
        title="Invitar administrador"
        description={inviteFor ? `Se enviará una invitación para administrar "${inviteFor.name}".` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteFor(null)}>Cancelar</Button>
            <Button
              leftIcon={<Mail className="h-4 w-4" />}
              onClick={() => invite.name.trim() && invite.email.trim() && inviteAdmin.mutate()}
              loading={inviteAdmin.isPending}
              disabled={!invite.name.trim() || !invite.email.trim()}
            >
              Enviar invitación
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="inv-name">Nombre</Label>
            <Input id="inv-name" value={invite.name} onChange={(e) => setInvite((v) => ({ ...v, name: e.target.value }))} placeholder="María López" autoFocus />
          </div>
          <div>
            <Label htmlFor="inv-email">Correo</Label>
            <Input id="inv-email" type="email" value={invite.email} onChange={(e) => setInvite((v) => ({ ...v, email: e.target.value }))} placeholder="maria@acme.mx" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
