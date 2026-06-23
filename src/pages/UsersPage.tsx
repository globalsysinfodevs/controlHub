import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import type { UserRole, UserStatus } from "@/lib/api/types";
import { usersApi } from "@/lib/api/endpoints";
import { timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sigil } from "@/components/ui/Sigil";
import { CenteredLoader } from "@/components/ui/Feedback";
import { toast } from "@/components/ui/Toast";

const ROLE_TONE: Record<UserRole, "brand" | "telemetry" | "neutral"> = {
  super_admin: "brand",
  admin: "brand",
  member: "telemetry",
  viewer: "neutral",
};
const STATUS_TONE: Record<UserStatus, "ok" | "warn" | "neutral"> = {
  active: "ok",
  invited: "warn",
  inactive: "neutral",
};

export function UsersPage() {
  const { data: users, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => usersApi.list() });

  return (
    <div>
      <PageHeader
        eyebrow="Govern"
        title="Users"
        description="Invite teammates, assign roles, and track who is active across the workspace."
        actions={
          <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => toast.info("Invite flow", "User invitations ship with the Users module router.")}>
            Invite user
          </Button>
        }
      />
      {isLoading ? (
        <CenteredLoader label="Loading users…" />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-2xs uppercase tracking-wider text-ink-faint">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Groups</th>
                <th className="px-5 py-3 text-right font-medium">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users?.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-ink/[0.02]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Sigil seed={u.id} name={u.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{u.name}</p>
                        <p className="truncate text-2xs text-ink-faint">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={ROLE_TONE[u.role]}>{u.role.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[u.status]} dot>
                      {u.status}
                    </Badge>
                  </td>
                  <td className="hidden px-5 py-3 text-ink-muted md:table-cell">{u.group_ids.length}</td>
                  <td className="px-5 py-3 text-right text-2xs text-ink-faint">
                    {u.last_active_at ? timeAgo(u.last_active_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
