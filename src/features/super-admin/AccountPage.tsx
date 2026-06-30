import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { KeyRound, ShieldCheck, AlertTriangle } from "lucide-react";
import { authApi } from "@/lib/api/endpoints";
import type { ChangePasswordRequest } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toast";
import { Panel, LoadingState, ErrorState, errorMessage, statusLabel } from "./parts";

export function AccountPage() {
  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ["super-admin", "profile"],
    queryFn: () => authApi.me(),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Cuenta"
        title="Cuenta y seguridad"
        description="Tu perfil de super admin y contraseña."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel className="p-6">
          <h3 className="mb-4 font-display text-lg font-semibold text-ink">Perfil</h3>
          {isLoading ? (
            <LoadingState />
          ) : error || !profile ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <div className="space-y-1 text-sm">
              <ProfileRow label="Nombre" value={profile.name} />
              <ProfileRow label="Correo" value={profile.email} />
              <ProfileRow
                label="Rol"
                value={<span className="capitalize">{profile.role.replace(/_/g, " ")}</span>}
              />
              <ProfileRow
                label="Estado"
                value={<Badge tone={profile.status === "active" ? "ok" : "warn"} dot>{statusLabel(profile.status)}</Badge>}
              />
              <ProfileRow
                label="Último acceso"
                value={profile.last_login ? formatDate(profile.last_login) : "—"}
              />
              <ProfileRow label="Miembro desde" value={formatDate(profile.created_at)} />
              {profile.using_default_password && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-warn/30 bg-warn/10 p-3 text-sm text-ink">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                  <span>Aún usas la contraseña predeterminada. Cámbiala ahora para proteger la plataforma.</span>
                </div>
              )}
            </div>
          )}
        </Panel>

        <ChangePasswordCard />
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/60 py-2.5 last:border-0">
      <span className="text-xs uppercase tracking-wide text-ink-faint">{label}</span>
      <span className="text-right text-ink">{value}</span>
    </div>
  );
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const mut = useMutation({
    mutationFn: (body: ChangePasswordRequest) => authApi.changePassword(body),
    onSuccess: () => {
      toast.success("Contraseña actualizada");
      setCurrent("");
      setNext("");
      setConfirm("");
    },
    onError: (e) => toast.error("No se pudo cambiar la contraseña", errorMessage(e)),
  });

  const submit = () => {
    if (!current) return toast.error("La contraseña actual es obligatoria");
    if (next.length < 8) return toast.error("La nueva contraseña debe tener al menos 8 caracteres");
    if (next !== confirm) return toast.error("Las contraseñas no coinciden");
    mut.mutate({ current_password: current, new_password: next });
  };

  return (
    <Panel className="p-6">
      <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <KeyRound className="h-4 w-4 text-brand-600" /> Cambiar contraseña
      </h3>
      <p className="mb-4 text-sm text-ink-muted">Usa al menos 8 caracteres.</p>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div>
          <Label htmlFor="pw-current">Contraseña actual</Label>
          <Input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="pw-new">Nueva contraseña</Label>
          <Input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="pw-confirm">Confirmar nueva contraseña</Label>
          <Input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <Button type="submit" loading={mut.isPending} leftIcon={<ShieldCheck className="h-4 w-4" />}>
          Actualizar contraseña
        </Button>
      </form>
    </Panel>
  );
}
