import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { superAdminApi, type Industry } from "@/lib/api/endpoints";
import { timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Input } from "@/components/ui/Field";
import { CenteredLoader, EmptyState } from "@/components/ui/Feedback";
import { toast } from "@/components/ui/Toast";

interface FormState {
  name: string;
  icon: string;
}

const EMPTY: FormState = { name: "", icon: "" };

export function IndustriesPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["platform", "industries"],
    queryFn: () => superAdminApi.listIndustries(),
  });

  const [editing, setEditing] = useState<Industry | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const refresh = () => qc.invalidateQueries({ queryKey: ["platform", "industries"] });

  const save = useMutation({
    mutationFn: () => {
      const body = { name: form.name.trim(), icon: form.icon.trim() || null };
      return editing
        ? superAdminApi.updateIndustry(editing.id, body)
        : superAdminApi.createIndustry(body);
    },
    onSuccess: () => {
      toast.success(editing ? "Industria actualizada" : "Industria creada", form.name);
      close();
      refresh();
    },
    onError: (e) => toast.error("No se pudo guardar", (e as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => superAdminApi.deleteIndustry(id),
    onSuccess: () => {
      toast.success("Industria eliminada");
      refresh();
    },
    onError: (e) => toast.error("No se pudo eliminar", (e as Error).message),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setCreating(true);
  }
  function openEdit(ind: Industry) {
    setEditing(ind);
    setForm({ name: ind.name, icon: ind.icon ?? "" });
    setCreating(true);
  }
  function close() {
    setCreating(false);
    setEditing(null);
    setForm(EMPTY);
  }
  function onDelete(ind: Industry) {
    if (!window.confirm(`¿Eliminar la industria "${ind.name}"?`)) return;
    remove.mutate(ind.id);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma"
        title="Industrias"
        description="Catálogo de industrias que se asignan a los inquilinos."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Nueva industria
          </Button>
        }
      />

      {isLoading ? (
        <CenteredLoader label="Cargando industrias…" />
      ) : isError ? (
        <EmptyState title="No se pudieron cargar las industrias" description={(error as Error)?.message} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-6 w-6" />}
          title="Sin industrias"
          description="Crea la primera industria para poder clasificar a los inquilinos."
          action={
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Nueva industria
            </Button>
          }
        />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-2xs uppercase tracking-wider text-ink-faint">
                <th className="px-5 py-3 font-medium">Industria</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Creada</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Actualizada</th>
                <th className="px-5 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((ind) => (
                <tr key={ind.id} className="transition-colors hover:bg-ink/[0.02]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/12 text-base">
                        {ind.icon || "🏢"}
                      </span>
                      <span className="font-medium text-ink">{ind.name}</span>
                    </div>
                  </td>
                  <td className="hidden px-5 py-3 text-ink-muted sm:table-cell">{timeAgo(ind.created_at)}</td>
                  <td className="hidden px-5 py-3 text-ink-muted sm:table-cell">{timeAgo(ind.updated_at)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => openEdit(ind)}>
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger hover:text-danger"
                        leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={() => onDelete(ind)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={creating}
        onClose={close}
        title={editing ? "Editar industria" : "Nueva industria"}
        description="El icono es opcional — usa un emoji para identificarla."
        footer={
          <>
            <Button variant="ghost" onClick={close}>Cancelar</Button>
            <Button
              onClick={() => form.name.trim() && save.mutate()}
              loading={save.isPending}
              disabled={!form.name.trim()}
            >
              {editing ? "Guardar cambios" : "Crear industria"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="ind-name">Nombre</Label>
            <Input
              id="ind-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Manufactura"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="ind-icon" hint="opcional">Icono</Label>
            <Input
              id="ind-icon"
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              placeholder="🏭"
              maxLength={50}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
