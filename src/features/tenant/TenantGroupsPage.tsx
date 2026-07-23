/**
 * TenantGroupsPage — full group management for tenant_admin.
 *
 * Workflow:
 *  1. Create a group (name + optional token limit)
 *  2. Assign agents to the group  → POST /api/v1/groups/{id}/agents
 *  3. Add users to the group      → POST /api/v1/groups/{id}/users
 *  4. Remove agents / users       → DELETE /api/v1/groups/{id}/agents/{aid}
 *                                   DELETE /api/v1/groups/{id}/users/{uid}
 *  5. Edit group name / limit     → PUT  /api/v1/groups/{id}
 *  6. Delete group                → DELETE /api/v1/groups/{id}
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
  Bot,
  Check,
} from "lucide-react";
import { groupsApi, usersApi, agentsApi } from "@/lib/api/endpoints";
import type { Group } from "@/lib/api/types";
import type { TeamUser } from "@/lib/api/endpoints";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sigil } from "@/components/ui/Sigil";
import { CenteredLoader, EmptyState } from "@/components/ui/Feedback";
import { toast } from "@/components/ui/Toast";

const FIELD =
  "h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder-ink-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

// ── helpers ───────────────────────────────────────────────────────────────────

function normalizeGroups(data: unknown): Group[] {
  if (Array.isArray(data)) return data as Group[];
  if (data && typeof data === "object" && "items" in (data as object))
    return ((data as { items: Group[] }).items) ?? [];
  return [];
}

function normalizeUsers(data: unknown): TeamUser[] {
  if (Array.isArray(data)) return data as TeamUser[];
  if (data && typeof data === "object" && "items" in (data as object))
    return ((data as { items: TeamUser[] }).items) ?? [];
  return [];
}

function normalizeAgents(data: unknown): { id: string; name: string }[] {
  if (Array.isArray(data)) return data as { id: string; name: string }[];
  if (data && typeof data === "object" && "items" in (data as object))
    return ((data as { items: { id: string; name: string }[] }).items) ?? [];
  return [];
}

// ── Create / Edit Group Modal ─────────────────────────────────────────────────

function GroupFormModal({
  group,
  onClose,
}: {
  group?: Group;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!group;
  const [name, setName] = useState(group?.name ?? "");
  const [limit, setLimit] = useState<string>(
    group?.monthly_token_limit != null ? String(group.monthly_token_limit) : ""
  );

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        monthly_token_limit: limit === "" ? null : Number(limit),
      };
      return isEdit
        ? groupsApi.update(group!.id, body)
        : groupsApi.create(body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Group updated" : "Group created");
      qc.invalidateQueries({ queryKey: ["tenant", "groups"] });
      onClose();
    },
    onError: (e) => toast.error("Could not save group", (e as Error).message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="panel relative z-10 w-full max-w-sm p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink">
            {isEdit ? "Edit Group" : "New Group"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-surface-raised"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Group Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={FIELD}
              placeholder="e.g. Sales Team"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-muted">
              Monthly Token Limit
              <span className="ml-1 font-normal text-ink-faint">(blank = unlimited)</span>
            </label>
            <input
              type="number"
              min={0}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className={FIELD}
              placeholder="e.g. 1000000"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={save.isPending}
            disabled={!name.trim()}
            onClick={() => save.mutate()}
          >
            {isEdit ? "Save changes" : "Create group"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Assign Agents Modal ───────────────────────────────────────────────────────

function AssignAgentsModal({
  group,
  onClose,
}: {
  group: Group;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set(group.agent_ids));

  const { data: agentsRaw, isLoading } = useQuery({
    queryKey: ["agents", "all"],
    queryFn: () => agentsApi.list({ page_size: 100 }),
  });
  const agents = normalizeAgents(agentsRaw);

  const save = useMutation({
    mutationFn: async () => {
      const current = new Set(group.agent_ids);
      const toAdd = [...selected].filter((id) => !current.has(id));
      const toRemove = [...current].filter((id) => !selected.has(id));
      await Promise.all([
        ...toAdd.map((id) => groupsApi.addAgents(group.id, [id])),
        ...toRemove.map((id) => groupsApi.removeAgent(group.id, id)),
      ]);
    },
    onSuccess: () => {
      toast.success("Agents updated", group.name);
      qc.invalidateQueries({ queryKey: ["tenant", "groups"] });
      onClose();
    },
    onError: (e) => toast.error("Could not update agents", (e as Error).message),
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="panel relative z-10 flex w-full max-w-md flex-col p-6" style={{ maxHeight: "80vh" }}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Assign Agents</h2>
            <p className="mt-0.5 text-xs text-ink-muted">{group.name}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-surface-raised"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-ink-muted">Loading agents…</p>
          ) : agents.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">No agents available.</p>
          ) : (
            <ul className="space-y-1">
              {agents.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => toggle(a.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-raised"
                  >
                    <div
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                        selected.has(a.id)
                          ? "border-brand-500 bg-brand-500 text-white"
                          : "border-line bg-surface"
                      }`}
                    >
                      {selected.has(a.id) && <Check className="h-3 w-3" />}
                    </div>
                    <Sigil seed={a.id} name={a.name} size="sm" />
                    <span className="text-sm font-medium text-ink">{a.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <span className="text-xs text-ink-muted">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={save.isPending}>
              Cancel
            </Button>
            <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Manage Users Modal ────────────────────────────────────────────────────────

function ManageUsersModal({
  group,
  onClose,
}: {
  group: Group;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set(group.user_ids ?? []));

  const { data: usersRaw, isLoading } = useQuery({
    queryKey: ["tenant", "users", 1],
    queryFn: () => usersApi.list(1, 100),
  });
  const users = normalizeUsers(usersRaw);

  const save = useMutation({
    mutationFn: async () => {
      const current = new Set(group.user_ids ?? []);
      const toAdd = [...selected].filter((id) => !current.has(id));
      const toRemove = [...current].filter((id) => !selected.has(id));
      await Promise.all([
        toAdd.length > 0 ? groupsApi.addUsers(group.id, toAdd) : Promise.resolve(),
        ...toRemove.map((id) => groupsApi.removeUser(group.id, id)),
      ]);
    },
    onSuccess: () => {
      toast.success("Members updated", group.name);
      qc.invalidateQueries({ queryKey: ["tenant", "groups"] });
      onClose();
    },
    onError: (e) => toast.error("Could not update members", (e as Error).message),
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="panel relative z-10 flex w-full max-w-md flex-col p-6" style={{ maxHeight: "80vh" }}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Manage Members</h2>
            <p className="mt-0.5 text-xs text-ink-muted">{group.name}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-surface-raised"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-ink-muted">Loading users…</p>
          ) : users.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">No users found.</p>
          ) : (
            <ul className="space-y-1">
              {users.map((u) => (
                <li key={u.id}>
                  <button
                    onClick={() => toggle(u.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-raised"
                  >
                    <div
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                        selected.has(u.id)
                          ? "border-brand-500 bg-brand-500 text-white"
                          : "border-line bg-surface"
                      }`}
                    >
                      {selected.has(u.id) && <Check className="h-3 w-3" />}
                    </div>
                    <Sigil seed={u.id} name={u.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{u.name}</p>
                      <p className="truncate text-2xs text-ink-faint">{u.email}</p>
                    </div>
                    <Badge tone={u.status === "active" ? "ok" : "neutral"} className="ml-auto flex-shrink-0">
                      {u.status}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <span className="text-xs text-ink-muted">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={save.isPending}>
              Cancel
            </Button>
            <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Group Card ────────────────────────────────────────────────────────────────

function GroupCard({
  group,
  agents,
  onEdit,
  onDelete,
  onAssignAgents,
  onManageUsers,
}: {
  group: Group;
  agents: { id: string; name: string }[];
  onEdit: () => void;
  onDelete: () => void;
  onAssignAgents: () => void;
  onManageUsers: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const groupAgents = agents.filter((a) => group.agent_ids.includes(a.id));

  return (
    <div className="panel overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-5">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-line bg-surface-raised text-brand-500">
          <Boxes className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-base font-semibold text-ink">{group.name}</h3>
            {group.monthly_token_limit != null && (
              <Badge tone="neutral" className="flex-shrink-0 text-2xs">
                {(group.monthly_token_limit / 1000).toFixed(0)}K tokens/mo
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-2xs text-ink-faint">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {group.member_count} member{group.member_count !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Bot className="h-3 w-3" />
              {group.agent_ids.length} agent{group.agent_ids.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-1">
          <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-danger hover:text-danger"
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Agents preview */}
      {groupAgents.length > 0 && (
        <div className="border-t border-line px-5 py-3">
          <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-ink-faint">Agents</p>
          <div className="flex flex-wrap gap-1.5">
            {groupAgents.slice(0, expanded ? undefined : 4).map((a) => (
              <span
                key={a.id}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink-muted"
              >
                <Sigil seed={a.id} name={a.name} size="xs" />
                {a.name}
              </span>
            ))}
            {!expanded && groupAgents.length > 4 && (
              <button
                onClick={() => setExpanded(true)}
                className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink-muted hover:bg-surface-raised"
              >
                +{groupAgents.length - 4} more
                <ChevronDown className="h-3 w-3" />
              </button>
            )}
            {expanded && groupAgents.length > 4 && (
              <button
                onClick={() => setExpanded(false)}
                className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink-muted hover:bg-surface-raised"
              >
                Show less
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-2 border-t border-line px-5 py-3">
        <Button
          size="sm"
          variant="ghost"
          leftIcon={<Bot className="h-3.5 w-3.5" />}
          onClick={onAssignAgents}
        >
          Assign agents
        </Button>
        <Button
          size="sm"
          variant="ghost"
          leftIcon={<UserPlus className="h-3.5 w-3.5" />}
          onClick={onManageUsers}
        >
          Manage members
        </Button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function TenantGroupsPage() {
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [assignAgentsGroup, setAssignAgentsGroup] = useState<Group | null>(null);
  const [manageUsersGroup, setManageUsersGroup] = useState<Group | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [deleteGroupName, setDeleteGroupName] = useState("");

  const { data: groupsRaw, isLoading, isError, error } = useQuery({
    queryKey: ["tenant", "groups"],
    queryFn: () => groupsApi.list(),
  });
  const groups = normalizeGroups(groupsRaw);

  const { data: agentsRaw } = useQuery({
    queryKey: ["agents", "all"],
    queryFn: () => agentsApi.list({ page_size: 100 }),
  });
  const agents = normalizeAgents(agentsRaw);

  const deleteGroup = useMutation({
    mutationFn: (id: string) => groupsApi.remove(id),
    onSuccess: () => {
      toast.success("Group deleted", deleteGroupName);
      setDeleteGroupId(null);
      setDeleteGroupName("");
      qc.invalidateQueries({ queryKey: ["tenant", "groups"] });
    },
    onError: (e) => toast.error("Could not delete group", (e as Error).message),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Tenant"
        title="Groups"
        description="Bundle users and grant them access to a curated set of agents."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setShowCreate(true)}
          >
            New group
          </Button>
        }
      />

      {isLoading ? (
        <CenteredLoader label="Loading groups…" />
      ) : isError ? (
        <EmptyState title="Could not load groups" description={(error as Error)?.message} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-6 w-6" />}
          title="No groups yet"
          description="Create a group, assign agents to it, then add users."
          action={
            <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowCreate(true)}>
              New group
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              agents={agents}
              onEdit={() => setEditGroup(g)}
              onDelete={() => { setDeleteGroupId(g.id); setDeleteGroupName(g.name); }}
              onAssignAgents={() => setAssignAgentsGroup(g)}
              onManageUsers={() => setManageUsersGroup(g)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && <GroupFormModal onClose={() => setShowCreate(false)} />}
      {editGroup && <GroupFormModal group={editGroup} onClose={() => setEditGroup(null)} />}
      {assignAgentsGroup && (
        <AssignAgentsModal group={assignAgentsGroup} onClose={() => setAssignAgentsGroup(null)} />
      )}
      {manageUsersGroup && (
        <ManageUsersModal group={manageUsersGroup} onClose={() => setManageUsersGroup(null)} />
      )}

      {/* Delete confirmation */}
      {deleteGroupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setDeleteGroupId(null)} />
          <div className="panel relative z-10 w-full max-w-sm p-6">
            <h3 className="font-display text-base font-semibold text-ink">Delete group?</h3>
            <p className="mt-1.5 text-sm text-ink-muted">
              <span className="font-semibold">"{deleteGroupName}"</span> and all its memberships will be
              permanently removed. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteGroupId(null)}
                disabled={deleteGroup.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-danger text-white hover:bg-danger/90"
                loading={deleteGroup.isPending}
                onClick={() => deleteGroup.mutate(deleteGroupId)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
