import { useQuery } from "@tanstack/react-query";
import { Boxes, Plus, Users } from "lucide-react";
import { groupsApi, agentsApi } from "@/lib/api/endpoints";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Sigil } from "@/components/ui/Sigil";
import { CenteredLoader } from "@/components/ui/Feedback";
import { toast } from "@/components/ui/Toast";

export function GroupsPage() {
  const { data: groups, isLoading } = useQuery({ queryKey: ["groups"], queryFn: () => groupsApi.list() });
  const { data: agents } = useQuery({ queryKey: ["agents", "all"], queryFn: () => agentsApi.list({ page_size: 100 }) as Promise<import("@/lib/api/types").Agent[]> });

  return (
    <div>
      <PageHeader
        eyebrow="Govern"
        title="Groups"
        description="Bundle users and grant them access to a curated set of agents."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => toast.info("Create group", "Group management ships with the Groups module router.")}>
            New group
          </Button>
        }
      />
      {isLoading ? (
        <CenteredLoader label="Loading groups…" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups?.map((g) => {
            const groupAgents = agents?.filter((a) => g.agent_ids.includes(a.id)) ?? [];
            return (
              <div key={g.id} className="panel flex flex-col p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-raised text-brand-600">
                    <Boxes className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-base font-semibold text-ink">{g.name}</h3>
                    <p className="flex items-center gap-1 text-2xs text-ink-faint">
                      <Users className="h-3 w-3" /> {g.member_count} members
                    </p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-ink-muted">{g.description}</p>
                <div className="mt-4 border-t border-line pt-3">
                  <p className="eyebrow mb-2">Agents</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {groupAgents.map((a) => (
                      <span key={a.id} className="flex items-center gap-1.5 rounded-lg border border-line bg-base/40 py-1 pl-1 pr-2.5 text-xs text-ink-muted">
                        <Sigil seed={a.id} name={a.name} size="xs" />
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
