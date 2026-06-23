import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Plus, Trash2, UserPlus, Users, X } from "lucide-react";
import { isMock } from "@/lib/api/client";
import { groupsApiLive, usersApi, type TeamGroup, type TeamUser } from "@/lib/api/endpoints";
import { toast } from "@/components/ui/Toast";

const ROLE_LABEL: Record<string, string> = { platform_super_admin: "Super Admin", tenant_admin: "Admin", member: "Member", viewer: "Viewer" };
const STATUS_LABEL: Record<string, string> = { invited: "Invitado", active: "Activo", inactive: "Inactivo" };
const STATUS_TONE: Record<string, string> = { invited: "bg-warn/15 text-warn", active: "bg-ok/15 text-ok", inactive: "bg-g-mid text-g-dark" };

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export function EquipoTab() {
  const [sub, setSub] = useState<"usuarios" | "grupos">("usuarios");
  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-xl border border-g-mid bg-white p-1">
        {(["usuarios", "grupos"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={"flex-1 rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors " + (sub === s ? "bg-primary text-white" : "text-g-dark hover:text-primary")}
          >
            {s === "usuarios" ? "Usuarios" : "Grupos"}
          </button>
        ))}
      </div>
      {sub === "usuarios" ? <UsersPanel /> : <GroupsPanel />}
    </div>
  );
}

function UsersPanel() {
  const qc = useQueryClient();
  const { data: users } = useQuery({ queryKey: ["team", "users"], queryFn: () => usersApi.list(), retry: false });
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "member" as "member" | "viewer" });

  const refresh = () => qc.invalidateQueries({ queryKey: ["team", "users"] });

  const invite = useMutation({
    mutationFn: () => usersApi.invite(form),
    onSuccess: () => { toast.success("Invitación enviada", form.email); setInviting(false); setForm({ name: "", email: "", role: "member" }); refresh(); },
    onError: (e) => toast.error("No se pudo invitar", (e as Error).message),
  });
  const changeRole = useMutation({ mutationFn: (v: { id: string; role: string }) => usersApi.update(v.id, { role: v.role }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id: string) => usersApi.remove(id), onSuccess: () => { toast.success("Usuario eliminado"); refresh(); }, onError: (e) => toast.error("No se pudo eliminar", (e as Error).message) });

  function onInvite() {
    if (isMock) return toast.info("Modo demo", "Conéctate al backend para invitar usuarios.");
    if (!form.name.trim() || !form.email.trim()) return;
    invite.mutate();
  }

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-g-mid p-4">
        <div>
          <h3 className="text-sm font-semibold text-primary">Miembros del equipo</h3>
          <p className="text-xs text-g-dark">{users?.length ?? 0} miembros</p>
        </div>
        <button onClick={() => setInviting((v) => !v)} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600">
          <UserPlus className="h-3.5 w-3.5" /> Invitar miembro
        </button>
      </div>

      {inviting && (
        <div className="flex flex-wrap items-end gap-3 border-b border-g-mid bg-g-light/60 p-4">
          <Mini label="Nombre"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INPUT} placeholder="Nombre del empleado" /></Mini>
          <Mini label="Correo"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={INPUT} placeholder="correo@empresa.com" /></Mini>
          <Mini label="Acceso">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "member" | "viewer" })} className={INPUT}>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </Mini>
          <button onClick={onInvite} className="h-9 rounded-xl bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-600">Enviar invitación</button>
          <button onClick={() => setInviting(false)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-g-mid text-g-dark hover:bg-g-mid"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="divide-y divide-g-mid">
        {users?.map((u: TeamUser) => (
          <div key={u.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-sheen text-xs font-bold text-white">{initials(u.name)}</span>
              <div>
                <p className="text-sm font-medium text-primary">{u.name}</p>
                <p className="text-xs text-g-dark">{u.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={"rounded-full px-2.5 py-0.5 text-2xs font-medium " + (STATUS_TONE[u.status] ?? "bg-g-mid text-g-dark")}>{STATUS_LABEL[u.status] ?? u.status}</span>
              {u.role === "tenant_admin" || u.role === "platform_super_admin" ? (
                <span className="text-xs font-medium text-primary">{ROLE_LABEL[u.role]}</span>
              ) : (
                <select
                  value={u.role}
                  onChange={(e) => isMock ? toast.info("Modo demo") : changeRole.mutate({ id: u.id, role: e.target.value })}
                  className="rounded-lg border border-g-mid bg-white px-2 py-1 text-xs text-primary focus:border-secondary focus:outline-none"
                >
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              )}
              {u.role !== "tenant_admin" && u.role !== "platform_super_admin" && (
                <button onClick={() => isMock ? toast.info("Modo demo") : remove.mutate(u.id)} className="text-danger hover:text-danger/70" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          </div>
        ))}
        {!users?.length && <p className="p-6 text-sm text-g-dark">Aún no hay miembros. Invita al primero.</p>}
      </div>
    </div>
  );
}

function GroupsPanel() {
  const qc = useQueryClient();
  const { data: groups } = useQuery({ queryKey: ["team", "groups"], queryFn: () => groupsApiLive.list(), retry: false });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["team", "groups"] });

  const create = useMutation({
    mutationFn: () => groupsApiLive.create({ name }),
    onSuccess: () => { toast.success("Grupo creado", name); setCreating(false); setName(""); refresh(); },
    onError: (e) => toast.error("No se pudo crear", (e as Error).message),
  });
  const remove = useMutation({ mutationFn: (id: string) => groupsApiLive.remove(id), onSuccess: () => { toast.success("Grupo eliminado"); refresh(); }, onError: (e) => toast.error("No se pudo eliminar", (e as Error).message) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-g-dark"><span className="font-semibold text-primary">{groups?.length ?? 0}</span> grupos</p>
        <button onClick={() => setCreating((v) => !v)} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600">
          <Plus className="h-3.5 w-3.5" /> Nuevo grupo
        </button>
      </div>

      {creating && (
        <div className="panel flex items-end gap-3 p-4">
          <Mini label="Nombre del grupo"><input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} placeholder="Operaciones, Finanzas…" /></Mini>
          <button onClick={() => (isMock ? toast.info("Modo demo") : name.trim() && create.mutate())} className="h-9 rounded-xl bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-600">Crear</button>
          <button onClick={() => setCreating(false)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-g-mid text-g-dark hover:bg-g-mid"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups?.map((g: TeamGroup) => (
          <div key={g.id} className="panel p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-g-mid bg-g-light text-primary"><Boxes className="h-5 w-5" /></span>
                <div>
                  <h4 className="text-sm font-semibold text-primary">{g.name}</h4>
                  <p className="flex items-center gap-1 text-2xs text-g-dark"><Users className="h-3 w-3" /> {g.member_count} miembros</p>
                </div>
              </div>
              <button onClick={() => isMock ? toast.info("Modo demo") : remove.mutate(g.id)} className="text-g-dark hover:text-danger" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 border-t border-g-mid pt-3">
              <p className="text-2xs text-g-dark">{g.agent_ids?.length ?? 0} agentes asignados</p>
            </div>
          </div>
        ))}
        {!groups?.length && <p className="text-sm text-g-dark">Aún no hay grupos.</p>}
      </div>
    </div>
  );
}

const INPUT = "h-9 w-full rounded-xl border border-g-mid bg-white px-3 text-sm text-primary placeholder-g-dark focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20";

function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-[160px] flex-1">
      <label className="mb-1 block text-2xs font-semibold text-g-dark">{label}</label>
      {children}
    </div>
  );
}
