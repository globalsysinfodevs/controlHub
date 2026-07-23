import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Pencil, Power, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { paginationOf } from "@/lib/api/client";
import { usersApi, groupsApi, type TeamUser, type UpdateUserRequest } from "@/lib/api/endpoints";
import { timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sigil } from "@/components/ui/Sigil";
import { CenteredLoader, EmptyState } from "@/components/ui/Feedback";
import { toast } from "@/components/ui/Toast";
import { Pagination } from "@/features/platform/PlatformUsersPage";

const PAGE_SIZE = 20;

const ROLE_LABEL: Record<string, string> = {
  tenant_admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};
const STATUS_TONE: Record<string, "ok" | "warn" | "neutral"> = {
  active: "ok",
  invited: "warn",
  inactive: "neutral",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  invited: "Invited",
  inactive: "Inactive",
};

const FIELD =
  "h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder-ink-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

// ── Edit User Modal ────────────────────────────────────────────────────────────

function EditUserModal({
  user,
  onClose,
}: {
  user: TeamUser;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<UpdateUserRequest>({
    name: user.name,
    role: user.role,
    monthly_token_limit: (user as TeamUser & { monthly_token_limit?: number | null }).monthly_token_limit ?? null,
  });

  const save = useMutation({
    mutationFn: () => usersApi.update(user.id, form),
    onSuccess: () => {
      toast.success("User updated");
      qc.invalidateQueries({ queryKey: ["tenant", "users"] });
      onClose();
    },
    onError: (e) => toast.error("Could not update user", (e as Error).message),
  });

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="panel relative z-10 w-full max-w-md p-6">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Edit User</h2>
            <p className="mt-0.5 text-xs text-ink-muted">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-surface-raised"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Full Name</label>
            <input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={FIELD}
              placeholder="Full name"
            />
          </div>

          {/* Role — not editable for tenant_admin */}
          {user.role !== "tenant_admin" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Role</label>
              <select
                value={form.role ?? user.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={FIELD}
              >
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          )}

          {/* Monthly token limit */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-muted">
              Monthly Token Limit
              <span className="ml-1 font-normal text-ink-faint">(leave blank for unlimited)</span>
            </label>
            <input
              type="number"
              min={0}
              value={form.monthly_token_limit ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  monthly_token_limit: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className={FIELD}
              placeholder="e.g. 500000"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={save.isPending}
            disabled={!form.name?.trim()}
            onClick={() => save.mutate()}
          >
            Save changes
          </Button>
        </div>

        {/* API reference note */}
        <p className="mt-3 text-center text-2xs text-ink-faint">
          PUT /api/v1/users/{user.id}
        </p>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function TenantUsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [inviting, setInviting] = useState(false);
  const [editUser, setEditUser] = useState<TeamUser | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "member" as "member" | "viewer", group_id: "" });

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["tenant", "users", page],
    queryFn: () => usersApi.list(page, PAGE_SIZE),
  });

  // Handle both plain array and { items, total } envelope
  const users: TeamUser[] = Array.isArray(data)
    ? (data as TeamUser[])
    : ((data as unknown as { items?: TeamUser[] })?.items ?? []);

  const meta = data ? paginationOf(data) : undefined;
  const totalPages = meta?.total_pages ?? 1;

  const refresh = () => qc.invalidateQueries({ queryKey: ["tenant", "users"] });

  const { data: groupsData } = useQuery({
    queryKey: ["tenant", "groups"],
    queryFn: () => groupsApi.list(),
  });
  const groups = Array.isArray(groupsData) ? groupsData : [];

  const resendInvite = useMutation({
    mutationFn: (id: string) => usersApi.resendInvite(id),
    onSuccess: () => toast.success("Invitation resent"),
    onError: (e) => toast.error("Could not resend invite", (e as Error).message),
  });

  const invite = useMutation({
    mutationFn: () => usersApi.invite({ ...form, group_id: form.group_id || undefined }),
    onSuccess: () => {
      toast.success("Invitation sent", form.email);
      setInviting(false);
      setForm({ name: "", email: "", role: "member", group_id: "" });
      refresh();
    },
    onError: (e) => toast.error("Could not invite user", (e as Error).message),
  });

  const toggleStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) => usersApi.update(v.id, { status: v.status }),
    onSuccess: (_res, v) => {
      toast.success(v.status === "active" ? "User activated" : "User deactivated");
      refresh();
    },
    onError: (e) => toast.error("Could not update status", (e as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => { toast.success("User removed"); refresh(); },
    onError: (e) => toast.error("Could not remove user", (e as Error).message),
  });

  function onInvite() {
    if (!form.name.trim() || !form.email.trim()) return;
    invite.mutate();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Tenant"
        title="Users"
        description="Manage team members — invite, edit, and deactivate accounts."
        actions={
          <Button
            size="sm"
            leftIcon={<UserPlus className="h-3.5 w-3.5" />}
            onClick={() => setInviting((v) => !v)}
          >
            Invite member
          </Button>
        }
      />

      {/* Invite form */}
      {inviting && (
        <div className="panel mb-5 flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-xs font-semibold text-ink-muted">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={FIELD}
              placeholder="Full name"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-semibold text-ink-muted">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={FIELD}
              placeholder="user@company.com"
            />
          </div>
          <div className="min-w-[120px]">
            <label className="mb-1 block text-xs font-semibold text-ink-muted">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as "member" | "viewer" })}
              className={FIELD}
            >
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          {groups.length > 0 && (
            <div className="min-w-[160px]">
              <label className="mb-1 block text-xs font-semibold text-ink-muted">Group (optional)</label>
              <select
                value={form.group_id}
                onChange={(e) => setForm({ ...form, group_id: e.target.value })}
                className={FIELD}
              >
                <option value="">No group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}
          <Button
            size="sm"
            loading={invite.isPending}
            disabled={!form.name.trim() || !form.email.trim()}
            onClick={onInvite}
          >
            Send invitation
          </Button>
          <button
            onClick={() => setInviting(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-surface-raised"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isLoading ? (
        <CenteredLoader label="Loading users…" />
      ) : isError ? (
        <EmptyState title="Could not load users" description={(error as Error)?.message} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-6 w-6" />}
          title="No users yet"
          description="Invite your first team member to get started."
        />
      ) : (
        <>
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-2xs uppercase tracking-wider text-ink-faint">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Last Login</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-ink/[0.02]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Sigil seed={u.id} name={u.name} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium text-ink">{u.name}</span>
                            {(u as TeamUser & { mfa_enabled?: boolean }).mfa_enabled && (
                              <ShieldCheck className="h-3.5 w-3.5 text-ok" aria-label="MFA enabled" />
                            )}
                          </div>
                          <p className="truncate text-2xs text-ink-faint">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={u.role === "tenant_admin" ? "brand" : "neutral"}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONE[u.status] ?? "neutral"} dot>
                        {STATUS_LABEL[u.status] ?? u.status}
                      </Badge>
                    </td>
                    <td className="hidden px-5 py-3 text-ink-muted md:table-cell">
                      {u.last_login ? timeAgo(u.last_login) : "Never"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit button — available for all users */}
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Pencil className="h-3.5 w-3.5" />}
                          onClick={() => setEditUser(u)}
                        >
                          Edit
                        </Button>

                        {/* Activate / Deactivate */}
                        {u.status !== "invited" && u.role !== "tenant_admin" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className={u.status === "active" ? "text-ink-muted" : "text-ok"}
                            leftIcon={<Power className="h-3.5 w-3.5" />}
                            loading={toggleStatus.isPending && toggleStatus.variables?.id === u.id}
                            onClick={() =>
                              toggleStatus.mutate({
                                id: u.id,
                                status: u.status === "active" ? "inactive" : "active",
                              })
                            }
                          >
                            {u.status === "active" ? "Deactivate" : "Activate"}
                          </Button>
                        )}

                        {/* Resend invite — only for invited users */}
                        {u.status === "invited" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Mail className="h-3.5 w-3.5" />}
                            loading={resendInvite.isPending && resendInvite.variables === u.id}
                            onClick={() => resendInvite.mutate(u.id)}
                          >
                            Resend
                          </Button>
                        )}

                        {/* Remove */}
                        {u.role !== "tenant_admin" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-danger hover:text-danger"
                            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                            loading={remove.isPending && remove.variables === u.id}
                            onClick={() => remove.mutate(u.id)}
                          >
                            Remove
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

      {/* Edit User Modal */}
      {editUser && (
        <EditUserModal user={editUser} onClose={() => setEditUser(null)} />
      )}
    </div>
  );
}
