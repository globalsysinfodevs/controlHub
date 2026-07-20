import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Globe,
  FileText,
  Plug,
  KeyRound,
  Plus,
  ChevronDown,
  Wrench,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Bot,
  Link2,
} from "lucide-react";
import type { Tool } from "@/lib/api/types";
import { toolsApi, agentsApi } from "@/lib/api/endpoints";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CenteredLoader } from "@/components/ui/Feedback";
import { toast } from "@/components/ui/Toast";

// ── Type meta ────────────────────────────────────────────────────────────────

const TYPE_META: Record<Tool["type"], { icon: typeof Database; label: string; color: string }> = {
  sql_query:       { icon: Database, label: "SQL Query",       color: "text-blue-500" },
  api_call:        { icon: Plug,     label: "API Call",        color: "text-violet-500" },
  document_reader: { icon: FileText, label: "Document Reader", color: "text-amber-500" },
  web_search:      { icon: Globe,    label: "Web Search",      color: "text-emerald-500" },
};

const STATUS_TONE = { connected: "ok", error: "danger", disabled: "neutral" } as const;

const STATUS_ICON = {
  connected: CheckCircle2,
  error:     XCircle,
  disabled:  MinusCircle,
} as const;

// ── Assign-tool modal ────────────────────────────────────────────────────────

interface AssignModalProps {
  tool: Tool;
  onClose: () => void;
}

function AssignToolModal({ tool, onClose }: AssignModalProps) {
  const qc = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState("");

  const { data: agentsRaw, isLoading: agentsLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsApi.list(),
  });

  // Normalise the agents list — the API may return a paginated envelope or a plain array
  type AgentLike = { id: string; name: string; tools: string[] };
  const agents: AgentLike[] = Array.isArray(agentsRaw)
    ? (agentsRaw as AgentLike[])
    : ((agentsRaw as unknown as { data?: AgentLike[] })?.data ?? []);

  const assign = useMutation({
    mutationFn: () =>
      agentsApi.assignTool(selectedAgentId, { tool_instance_id: tool.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["tools"] });
      toast.success("Tool assigned", `${tool.name} has been added to the selected agent.`);
      onClose();
    },
    onError: () => {
      toast.error("Assignment failed", "Could not assign the tool. Please try again.");
    },
  });

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="panel w-full max-w-md p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-raised">
            <Link2 className="h-5 w-5 text-telemetry-600" />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Add Tool to Agent</h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              Assign <span className="font-medium text-ink">{tool.name}</span> to an agent.
            </p>
          </div>
        </div>

        {/* Tool summary */}
        <div className="mb-5 rounded-xl border border-line bg-surface-raised p-4">
          <div className="flex items-center gap-2">
            {(() => {
              const meta = TYPE_META[tool.type] ?? TYPE_META.api_call;
              const Icon = meta.icon;
              return <Icon className={`h-4 w-4 ${meta.color}`} />;
            })()}
            <span className="text-sm font-medium text-ink">{tool.name}</span>
            <Badge tone={STATUS_TONE[tool.status]} dot className="ml-auto">
              {tool.status}
            </Badge>
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">{tool.description}</p>
        </div>

        {/* Agent selector */}
        <label className="mb-1.5 block text-sm font-medium text-ink">
          Select Agent
        </label>
        {agentsLoading ? (
          <div className="flex h-10 items-center justify-center rounded-lg border border-line bg-surface-raised text-sm text-ink-muted">
            Loading agents…
          </div>
        ) : (
          <div className="relative">
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-line bg-surface-raised px-3 py-2.5 pr-9 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-telemetry-500"
            >
              <option value="">— Choose an agent —</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.tools?.includes(tool.id) ? " (already assigned)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            leftIcon={<Link2 className="h-4 w-4" />}
            disabled={!selectedAgentId || assign.isPending}
            onClick={() => assign.mutate()}
          >
            {assign.isPending ? "Assigning…" : "Assign Tool"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Tool card ────────────────────────────────────────────────────────────────

interface ToolCardProps {
  tool: Tool;
  onAssign: (tool: Tool) => void;
}

function ToolCard({ tool, onAssign }: ToolCardProps) {
  const meta = TYPE_META[tool.type] ?? TYPE_META.api_call;
  const Icon = meta.icon;
  const StatusIcon = STATUS_ICON[tool.status];

  return (
    <div className="panel group flex flex-col gap-4 p-5 transition-shadow hover:shadow-md">
      {/* Top row */}
      <div className="flex items-start gap-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-raised ${meta.color}`}
        >
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-ink">{tool.name}</h3>
            <Badge tone={STATUS_TONE[tool.status]} dot>
              {tool.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-ink-muted">{tool.description}</p>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-2xs text-ink-faint">
        <span className="flex items-center gap-1 rounded-full border border-line bg-base/40 px-2 py-0.5">
          <Wrench className="h-3 w-3" />
          {meta.label}
        </span>
        <span className="flex items-center gap-1">
          <Bot className="h-3 w-3" />
          {tool.used_by_agents} agent{tool.used_by_agents !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1">
          <StatusIcon className="h-3 w-3" />
          {tool.status}
        </span>
        {tool.secret_ref && (
          <span className="flex items-center gap-1 font-mono">
            <KeyRound className="h-3 w-3" />
            {tool.secret_ref}
          </span>
        )}
      </div>

      {/* Action */}
      <div className="flex items-center justify-end border-t border-line pt-3">
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Link2 className="h-3.5 w-3.5" />}
          onClick={() => onAssign(tool)}
          disabled={tool.status === "disabled"}
        >
          Add to Agent
        </Button>
      </div>
    </div>
  );
}

// ── Register tool modal ──────────────────────────────────────────────────────

interface RegisterModalProps {
  onClose: () => void;
}

function RegisterToolModal({ onClose }: RegisterModalProps) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<Tool["type"]>("api_call");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: () =>
      toolsApi.createInstance({
        tool_definition_id: `tdef_${type.split("_")[0]}`,
        name,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tools"] });
      toast.success("Tool registered", `${name} has been added to the registry.`);
      onClose();
    },
    onError: () => {
      toast.error("Registration failed", "Could not register the tool. Please try again.");
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="panel w-full max-w-md p-6 shadow-2xl">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-raised">
            <Plus className="h-5 w-5 text-telemetry-600" />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Register Tool</h2>
            <p className="mt-0.5 text-sm text-ink-muted">Add a new tool to the registry.</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Tool Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Customer DB"
              className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-telemetry-500"
            />
          </div>

          {/* Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Tool Type</label>
            <div className="relative">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Tool["type"])}
                className="w-full appearance-none rounded-lg border border-line bg-surface-raised px-3 py-2.5 pr-9 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-telemetry-500"
              >
                {Object.entries(TYPE_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What does this tool do?"
              className="w-full resize-none rounded-lg border border-line bg-surface-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-telemetry-500"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Registering…" : "Register Tool"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

type FilterStatus = "all" | Tool["status"];
type FilterType   = "all" | Tool["type"];

export function ToolsPage() {
  const [assignTarget, setAssignTarget] = useState<Tool | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType,   setFilterType]   = useState<FilterType>("all");

  const { data: tools, isLoading } = useQuery({
    queryKey: ["tools"],
    queryFn: () => toolsApi.list(),
  });

  const filtered = (tools ?? []).filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterType   !== "all" && t.type   !== filterType)   return false;
    return true;
  });

  const counts = {
    connected: tools?.filter((t) => t.status === "connected").length ?? 0,
    error:     tools?.filter((t) => t.status === "error").length ?? 0,
    disabled:  tools?.filter((t) => t.status === "disabled").length ?? 0,
  };

  return (
    <div>
      <PageHeader
        eyebrow="Build"
        title="Tools"
        description="The tool registry agents draw on for grounded context — databases, APIs, documents, and search."
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowRegister(true)}
          >
            Register Tool
          </Button>
        }
      />

      {/* Summary chips */}
      <div className="mb-6 flex flex-wrap gap-3">
        {(["all", "connected", "error", "disabled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filterStatus === s
                ? "border-telemetry-500 bg-telemetry-500/10 text-telemetry-600"
                : "border-line bg-surface-raised text-ink-muted hover:border-telemetry-400 hover:text-ink"
            }`}
          >
            {s !== "all" && (
              <span
                className={`h-2 w-2 rounded-full ${
                  s === "connected" ? "bg-ok-500" : s === "error" ? "bg-danger-500" : "bg-neutral-400"
                }`}
              />
            )}
            {s === "all" ? `All (${tools?.length ?? 0})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${counts[s]})`}
          </button>
        ))}

        {/* Type filter */}
        <div className="relative ml-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="appearance-none rounded-full border border-line bg-surface-raised px-3 py-1.5 pr-7 text-xs font-medium text-ink-muted focus:outline-none focus:ring-2 focus:ring-telemetry-500"
          >
            <option value="all">All Types</option>
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <CenteredLoader label="Loading tools…" />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-20 text-center">
          <Wrench className="mb-3 h-10 w-10 text-ink-faint" />
          <p className="text-sm font-medium text-ink">No tools match the current filters</p>
          <p className="mt-1 text-xs text-ink-muted">Try changing the status or type filter above.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((t) => (
            <ToolCard key={t.id} tool={t} onAssign={setAssignTarget} />
          ))}
        </div>
      )}

      {/* Modals */}
      {assignTarget && (
        <AssignToolModal tool={assignTarget} onClose={() => setAssignTarget(null)} />
      )}
      {showRegister && (
        <RegisterToolModal onClose={() => setShowRegister(false)} />
      )}
    </div>
  );
}
