import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  Coins,
  Plus,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { isMock } from "@/lib/api/client";
import {
  groupsApiLive,
  usersApi,
  type GroupUpdate,
  type TeamGroup,
  type TeamUser,
} from "@/lib/api/endpoints";
import { useMarket } from "@/store/marketplace";
import { toast } from "@/components/ui/Toast";

const ROLE_LABEL: Record<string, string> = {
  platform_super_admin: "Super Admin",
  tenant_admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};
const STATUS_LABEL: Record<string, string> = {
  invited: "Invitado",
  active: "Activo",
  inactive: "Inactivo",
};
const STATUS_TONE: Record<string, string> = {
  invited: "bg-warn/15 text-warn",
  active: "bg-ok/15 text-ok",
  inactive: "bg-g-mid text-g-dark",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ── Root tab ──────────────────────────────────────────────────────────────────

export function EquipoTab() {
  const [sub, setSub] = useState<"usuarios" | "grupos">("usuarios");
  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-xl border border-g-mid bg-white p-1">
        {(["usuarios", "grupos"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors " +
              (sub === s ? "bg-primary text-white" : "text-g-dark hover:text-primary")
            }
          >
            {s === "usuarios" ? "Usuarios" : "Grupos"}
          </button>
        ))}
      </div>
      {sub === "usuarios" ? <UsersPanel /> : <GroupsPanel />}
    </div>
  );
}

// ── Users panel ───────────────────────────────────────────────────────────────

function UsersPanel() {
  const qc = useQueryClient();
  const { data: usersRaw } = useQuery({
    queryKey: ["team", "users"],
    queryFn: () => usersApi.list(),
    retry: false,
  });

  // Handle both plain array and { items, total } envelope
  const users: TeamUser[] = Array.isArray(usersRaw)
    ? (usersRaw as TeamUser[])
    : ((usersRaw as unknown as { items?: TeamUser[] })?.items ?? []);

  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "member" as "member" | "viewer" });

  const refresh = () => qc.invalidateQueries({ queryKey: ["team", "users"] });

  const invite = useMutation({
    mutationFn: () => usersApi.invite(form),
    onSuccess: () => {
      toast.success("Invitación enviada", form.email);
      setInviting(false);
      setForm({ name: "", email: "", role: "member" });
      refresh();
    },
    onError: (e) => toast.error("No se pudo invitar", (e as Error).message),
  });
  const changeRole = useMutation({
    mutationFn: (v: { id: string; role: string }) => usersApi.update(v.id, { role: v.role }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      toast.success("Usuario eliminado");
      refresh();
    },
    onError: (e) => toast.error("No se pudo eliminar", (e as Error).message),
  });

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
          <p className="text-xs text-g-dark">{users.length} miembros</p>
        </div>
        <button
          onClick={() => setInviting((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600"
        >
          <UserPlus className="h-3.5 w-3.5" /> Invitar miembro
        </button>
      </div>

      {inviting && (
        <div className="flex flex-wrap items-end gap-3 border-b border-g-mid bg-g-light/60 p-4">
          <Mini label="Nombre">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={INPUT}
              placeholder="Nombre del empleado"
            />
          </Mini>
          <Mini label="Correo">
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={INPUT}
              placeholder="correo@empresa.com"
            />
          </Mini>
          <Mini label="Acceso">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as "member" | "viewer" })}
              className={INPUT}
            >
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </Mini>
          <button
            onClick={onInvite}
            className="h-9 rounded-xl bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-600"
          >
            Enviar invitación
          </button>
          <button
            onClick={() => setInviting(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-g-mid text-g-dark hover:bg-g-mid"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="divide-y divide-g-mid">
        {users.map((u: TeamUser) => (
          <div key={u.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-sheen text-xs font-bold text-white">
                {initials(u.name)}
              </span>
              <div>
                <p className="text-sm font-medium text-primary">{u.name}</p>
                <p className="text-xs text-g-dark">{u.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={
                  "rounded-full px-2.5 py-0.5 text-2xs font-medium " +
                  (STATUS_TONE[u.status] ?? "bg-g-mid text-g-dark")
                }
              >
                {STATUS_LABEL[u.status] ?? u.status}
              </span>
              {u.role === "tenant_admin" || u.role === "platform_super_admin" ? (
                <span className="text-xs font-medium text-primary">{ROLE_LABEL[u.role]}</span>
              ) : (
                <select
                  value={u.role}
                  onChange={(e) =>
                    isMock
                      ? toast.info("Modo demo")
                      : changeRole.mutate({ id: u.id, role: e.target.value })
                  }
                  className="rounded-lg border border-g-mid bg-white px-2 py-1 text-xs text-primary focus:border-secondary focus:outline-none"
                >
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              )}
              {u.role !== "tenant_admin" && u.role !== "platform_super_admin" && (
                <button
                  onClick={() => (isMock ? toast.info("Modo demo") : remove.mutate(u.id))}
                  className="text-danger hover:text-danger/70"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {!users.length && (
          <p className="p-6 text-sm text-g-dark">Aún no hay miembros. Invita al primero.</p>
        )}
      </div>
    </div>
  );
}

// ── Groups panel ──────────────────────────────────────────────────────────────

function GroupsPanel() {
  const qc = useQueryClient();
  const { data: groups = [] } = useQuery({
    queryKey: ["team", "groups"],
    queryFn: () => groupsApiLive.list(),
    retry: false,
  });
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["team", "groups"] });

  const create = useMutation({
    mutationFn: () =>
      groupsApiLive.create({
        name: newName.trim(),
        monthly_token_limit: newLimit ? Number(newLimit) : null,
      }),
    onSuccess: () => {
      toast.success("Grupo creado", newName);
      setCreating(false);
      setNewName("");
      setNewLimit("");
      refresh();
    },
    onError: (e) => toast.error("No se pudo crear", (e as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => groupsApiLive.remove(id),
    onSuccess: () => {
      toast.success("Grupo eliminado");
      refresh();
    },
    onError: (e) => toast.error("No se pudo eliminar", (e as Error).message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-g-dark">
          <span className="font-semibold text-primary">{groups.length}</span> grupos
        </p>
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600"
        >
          <Plus className="h-3.5 w-3.5" /> Nuevo grupo
        </button>
      </div>

      {creating && (
        <div className="panel flex flex-wrap items-end gap-3 p-4">
          <Mini label="Nombre del grupo">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={INPUT}
              placeholder="Operaciones, Finanzas…"
            />
          </Mini>
          <Mini label="Límite mensual de tokens (opcional)">
            <input
              type="number"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              className={INPUT}
              placeholder="p.ej. 500000"
              min={0}
            />
          </Mini>
          <button
            onClick={() => (isMock ? toast.info("Modo demo") : newName.trim() && create.mutate())}
            className="h-9 rounded-xl bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-600"
          >
            Crear
          </button>
          <button
            onClick={() => setCreating(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-g-mid text-g-dark hover:bg-g-mid"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="space-y-3">
        {(groups as TeamGroup[]).map((g: TeamGroup) => (
          <GroupCard
            key={g.id}
            group={g}
            expanded={expandedId === g.id}
            onToggle={() => setExpandedId(expandedId === g.id ? null : g.id)}
            onDelete={() => (isMock ? toast.info("Modo demo") : remove.mutate(g.id))}
            onRefresh={refresh}
          />
        ))}
        {!groups.length && <p className="text-sm text-g-dark">Aún no hay grupos.</p>}
      </div>
    </div>
  );
}

// ── Group card with expandable detail ─────────────────────────────────────────

function GroupCard({
  group,
  expanded,
  onToggle,
  onDelete,
  onRefresh,
}: {
  group: TeamGroup;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="panel overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-g-mid bg-g-light text-primary">
            <Boxes className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-primary">{group.name}</h4>
            <div className="flex items-center gap-3 text-2xs text-g-dark">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {group.member_count ?? 0} miembros
              </span>
              <span>{group.agent_ids?.length ?? 0} agentes</span>
              {group.monthly_token_limit != null && (
                <span className="flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  {group.monthly_token_limit.toLocaleString()} tokens/mes
                </span>
              )}
            </div>
          </div>
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-g-dark" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-g-dark" />
          )}
        </button>
        <button
          onClick={onDelete}
          className="ml-3 text-g-dark hover:text-danger"
          title="Eliminar grupo"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-g-mid bg-g-light/40 p-4 space-y-5">
          <GroupSettings group={group} onRefresh={onRefresh} />
          <GroupMembers group={group} onRefresh={onRefresh} />
          <GroupAgents group={group} onRefresh={onRefresh} />
        </div>
      )}
    </div>
  );
}

// ── Group settings (token limit) ──────────────────────────────────────────────

function GroupSettings({ group, onRefresh }: { group: TeamGroup; onRefresh: () => void }) {
  const [limit, setLimit] = useState(String(group.monthly_token_limit ?? ""));
  const [editing, setEditing] = useState(false);

  const update = useMutation({
    mutationFn: (body: GroupUpdate) => groupsApiLive.update(group.id, body),
    onSuccess: () => {
      toast.success("Grupo actualizado");
      setEditing(false);
      onRefresh();
    },
    onError: (e) => toast.error("No se pudo actualizar", (e as Error).message),
  });

  return (
    <div>
      <h5 className="mb-2 text-xs font-semibold text-g-dark uppercase tracking-wide">
        Configuración
      </h5>
      <div className="flex items-end gap-3">
        <Mini label="Límite mensual de tokens">
          <input
            type="number"
            value={limit}
            onChange={(e) => { setLimit(e.target.value); setEditing(true); }}
            className={INPUT}
            placeholder="Sin límite"
            min={0}
            disabled={isMock}
          />
        </Mini>
        {editing && (
          <>
            <button
              onClick={() =>
                update.mutate({ monthly_token_limit: limit ? Number(limit) : null })
              }
              className="h-9 rounded-xl bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-600"
            >
              Guardar
            </button>
            <button
              onClick={() => { setLimit(String(group.monthly_token_limit ?? "")); setEditing(false); }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-g-mid text-g-dark hover:bg-g-mid"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Group members management ──────────────────────────────────────────────────

function GroupMembers({ group, onRefresh }: { group: TeamGroup; onRefresh: () => void }) {
  const qc = useQueryClient();
  const { data: allUsersRaw } = useQuery({
    queryKey: ["team", "users"],
    queryFn: () => usersApi.list(),
    retry: false,
  });
  const allUsers: TeamUser[] = Array.isArray(allUsersRaw)
    ? (allUsersRaw as TeamUser[])
    : ((allUsersRaw as unknown as { items?: TeamUser[] })?.items ?? []);

  const [addingUser, setAddingUser] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  const memberIds = new Set<string>(
    (group as unknown as { user_ids?: string[] }).user_ids ?? []
  );
  const nonMembers = allUsers.filter((u) => !memberIds.has(u.id));

  const addUser = useMutation({
    mutationFn: (userId: string) => groupsApiLive.addUsers(group.id, [userId]),
    onSuccess: () => {
      toast.success("Usuario añadido al grupo");
      setAddingUser(false);
      setSelectedUserId("");
      onRefresh();
      qc.invalidateQueries({ queryKey: ["team", "groups"] });
    },
    onError: (e) => toast.error("No se pudo añadir", (e as Error).message),
  });

  const removeUser = useMutation({
    mutationFn: (userId: string) => groupsApiLive.removeUser(group.id, userId),
    onSuccess: () => {
      toast.success("Usuario eliminado del grupo");
      onRefresh();
      qc.invalidateQueries({ queryKey: ["team", "groups"] });
    },
    onError: (e) => toast.error("No se pudo eliminar", (e as Error).message),
  });

  // Members = users whose id is in memberIds
  const members = allUsers.filter((u) => memberIds.has(u.id));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h5 className="text-xs font-semibold text-g-dark uppercase tracking-wide">
          Miembros ({members.length})
        </h5>
        {!addingUser && (
          <button
            onClick={() => setAddingUser(true)}
            className="flex items-center gap-1 text-xs text-secondary hover:underline"
          >
            <UserPlus className="h-3.5 w-3.5" /> Añadir
          </button>
        )}
      </div>

      {addingUser && (
        <div className="mb-3 flex items-center gap-2">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className={INPUT + " flex-1"}
          >
            <option value="">Seleccionar usuario…</option>
            {nonMembers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              isMock
                ? toast.info("Modo demo")
                : selectedUserId && addUser.mutate(selectedUserId)
            }
            disabled={!selectedUserId}
            className="h-9 rounded-xl bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            Añadir
          </button>
          <button
            onClick={() => { setAddingUser(false); setSelectedUserId(""); }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-g-mid text-g-dark hover:bg-g-mid"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {members.length > 0 ? (
        <div className="divide-y divide-g-mid rounded-xl border border-g-mid bg-white">
          {members.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-sheen text-2xs font-bold text-white">
                  {initials(u.name)}
                </span>
                <div>
                  <p className="text-xs font-medium text-primary">{u.name}</p>
                  <p className="text-2xs text-g-dark">{u.email}</p>
                </div>
              </div>
              <button
                onClick={() =>
                  isMock ? toast.info("Modo demo") : removeUser.mutate(u.id)
                }
                className="text-g-dark hover:text-danger"
                title="Quitar del grupo"
              >
                <UserMinus className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-g-dark">Sin miembros en este grupo.</p>
      )}
    </div>
  );
}

// ── Group agents management ───────────────────────────────────────────────────

function GroupAgents({ group, onRefresh }: { group: TeamGroup; onRefresh: () => void }) {
  const qc = useQueryClient();
  const allAgents = useMarket((s) => s.agents);
  const [addingAgent, setAddingAgent] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");

  const assignedIds = new Set<string>(group.agent_ids ?? []);
  const unassigned = allAgents.filter((a) => !assignedIds.has(a.id));
  const assigned = allAgents.filter((a) => assignedIds.has(a.id));

  const addAgent = useMutation({
    mutationFn: (agentId: string) => groupsApiLive.addAgents(group.id, [agentId]),
    onSuccess: () => {
      toast.success("Agente asignado al grupo");
      setAddingAgent(false);
      setSelectedAgentId("");
      onRefresh();
      qc.invalidateQueries({ queryKey: ["team", "groups"] });
    },
    onError: (e) => toast.error("No se pudo asignar", (e as Error).message),
  });

  const removeAgent = useMutation({
    mutationFn: (agentId: string) => groupsApiLive.removeAgent(group.id, agentId),
    onSuccess: () => {
      toast.success("Agente desasignado");
      onRefresh();
      qc.invalidateQueries({ queryKey: ["team", "groups"] });
    },
    onError: (e) => toast.error("No se pudo desasignar", (e as Error).message),
  });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h5 className="text-xs font-semibold text-g-dark uppercase tracking-wide">
          Agentes asignados ({assigned.length})
        </h5>
        {!addingAgent && (
          <button
            onClick={() => setAddingAgent(true)}
            className="flex items-center gap-1 text-xs text-secondary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Asignar
          </button>
        )}
      </div>

      {addingAgent && (
        <div className="mb-3 flex items-center gap-2">
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className={INPUT + " flex-1"}
          >
            <option value="">Seleccionar agente…</option>
            {unassigned.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon} {a.name}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              isMock
                ? toast.info("Modo demo")
                : selectedAgentId && addAgent.mutate(selectedAgentId)
            }
            disabled={!selectedAgentId}
            className="h-9 rounded-xl bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            Asignar
          </button>
          <button
            onClick={() => { setAddingAgent(false); setSelectedAgentId(""); }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-g-mid text-g-dark hover:bg-g-mid"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {assigned.length > 0 ? (
        <div className="divide-y divide-g-mid rounded-xl border border-g-mid bg-white">
          {assigned.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{a.icon}</span>
                <p className="text-xs font-medium text-primary">{a.name}</p>
              </div>
              <button
                onClick={() =>
                  isMock ? toast.info("Modo demo") : removeAgent.mutate(a.id)
                }
                className="text-g-dark hover:text-danger"
                title="Desasignar agente"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-g-dark">Sin agentes asignados.</p>
      )}
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const INPUT =
  "h-9 w-full rounded-xl border border-g-mid bg-white px-3 text-sm text-primary placeholder-g-dark focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20";

function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-[160px] flex-1">
      <label className="mb-1 block text-2xs font-semibold text-g-dark">{label}</label>
      {children}
    </div>
  );
}
