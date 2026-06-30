import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { superAdminApi } from "@/lib/api/endpoints";
import type { Industry, IndustryCreate } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toast";
import { Panel, LoadingState, ErrorState, EmptyState, errorMessage } from "./parts";

export function IndustriesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Industry | "new" | null>(null);
  const [deleting, setDeleting] = useState<Industry | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["super-admin", "industries"],
    queryFn: () => superAdminApi.listIndustries(),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => superAdminApi.deleteIndustry(id),
    onSuccess: () => {
      toast.success("Industria eliminada");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["super-admin", "industries"] });
    },
    onError: (e) => toast.error("No se pudo eliminar", errorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma"
        title="Industrias"
        description="Taxonomía de industrias usada para clasificar inquilinos."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            Nueva industria
          </Button>
        }
      />

      <Panel>
        {isLoading ? (
          <LoadingState label="Cargando industrias…" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="Aún no hay industrias"
            description="Crea la primera industria para empezar a clasificar inquilinos."
            action={
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
                Nueva industria
              </Button>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Icono</th>
                <th className="px-5 py-3 font-medium">Creada</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((ind) => (
                <tr key={ind.id} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">{ind.name}</td>
                  <td className="px-5 py-3 text-ink-muted">{ind.icon ?? "—"}</td>
                  <td className="px-5 py-3 text-ink-muted">{formatDate(ind.created_at)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(ind)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleting(ind)} aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {editing && (
        <IndustryFormModal
          industry={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["super-admin", "industries"] });
          }}
        />
      )}

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Eliminar industria"
        description={deleting ? `Se eliminará “${deleting.name}” de forma permanente.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={removeMut.isPending}
              onClick={() => deleting && removeMut.mutate(deleting.id)}
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Los inquilinos asignados actualmente a esta industria conservarán su referencia, pero ya no
          se resolverá a un nombre.
        </p>
      </Modal>
    </div>
  );
}

function IndustryFormModal({
  industry,
  onClose,
  onSaved,
}: {
  industry: Industry | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!industry;
  const [name, setName] = useState(industry?.name ?? "");
  const [icon, setIcon] = useState(industry?.icon ?? "");

  const mut = useMutation({
    mutationFn: (body: IndustryCreate) =>
      isEdit
        ? superAdminApi.updateIndustry(industry!.id, body)
        : superAdminApi.createIndustry(body),
    onSuccess: () => {
      toast.success(isEdit ? "Industria actualizada" : "Industria creada");
      onSaved();
    },
    onError: (e) => toast.error("No se pudo guardar", errorMessage(e)),
  });

  const submit = () => {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    mut.mutate({ name: name.trim(), icon: icon.trim() || null });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Editar industria" : "Nueva industria"}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={mut.isPending} onClick={submit}>
            {isEdit ? "Guardar cambios" : "Crear industria"}
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
          <Label htmlFor="ind-name">Nombre</Label>
          <Input
            id="ind-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="p. ej. Salud"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="ind-icon" hint="opcional">
            Icono
          </Label>
          <Input
            id="ind-icon"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="p. ej. stethoscope"
          />
        </div>
      </form>
    </Modal>
  );
}
