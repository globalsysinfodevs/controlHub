/**
 * AgentFormDrawer — super-admin create / edit agent drawer for the Marketplace.
 *
 * Create: POST /api/v1/agents
 * Edit:   PUT  /api/v1/agents/{id}
 *
 * Fields exposed:
 *   name, description, category_id, template_key, base_system_prompt,
 *   llm_model_id, tool_instance_ids (create only), status, is_global (create only)
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Save, Wrench, X } from "lucide-react";
import { agentsApi, modelsApi, toolsApi } from "@/lib/api/endpoints";
import type { AgentCreate, AgentUpdate } from "@/lib/api/endpoints";
import type { Agent } from "@/lib/api/types";
import { toast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BackendCategory { id: string; name: string; }
interface AgentTemplate { id: string; name: string; key?: string; description?: string | null; }
interface ToolInstance { id: string; name: string; tool_type?: string; }
interface LLMModel { id: string; name: string; display_name?: string; }

// ── Draft shape ───────────────────────────────────────────────────────────────

interface Draft {
  name: string;
  description: string;
  category_id: string;
  template_key: string;
  base_system_prompt: string;
  llm_model_id: string;
  tool_instance_ids: string[];
  status: "active" | "inactive" | "draft";
  is_global: boolean;
  change_summary: string;
}

const EMPTY: Draft = {
  name: "",
  description: "",
  category_id: "",
  template_key: "",
  base_system_prompt: "",
  llm_model_id: "",
  tool_instance_ids: [],
  status: "draft",
  is_global: true,
  change_summary: "",
};

function toDraft(a: Agent): Draft {
  return {
    name: a.name,
    description: a.description ?? "",
    category_id: a.category_id ?? "",
    template_key: a.template_key ?? "",
    base_system_prompt: a.system_prompt ?? a.behavior_prompt ?? "",
    llm_model_id: a.model_id ?? "",
    tool_instance_ids: [],          // tools are managed separately after creation
    status: a.status,
    is_global: a.is_global,
    change_summary: "",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AgentFormDrawer({
  agent,
  mode,
  open,
  onClose,
}: {
  agent: Agent | null;
  mode: "create" | "edit";
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(agent ? toDraft(agent) : EMPTY);

  // Reset draft when agent/mode/open changes
  useEffect(() => {
    setDraft(agent ? toDraft(agent) : EMPTY);
  }, [agent, mode, open]);

  // ── Remote data ─────────────────────────────────────────────────────────────

  const { data: categories = [] } = useQuery<BackendCategory[]>({
    queryKey: ["agent-categories"],
    queryFn: async () => {
      const res = await agentsApi.categories() as unknown;
      if (Array.isArray(res)) return res as BackendCategory[];
      if (res && typeof res === "object" && "items" in (res as object))
        return ((res as { items: BackendCategory[] }).items) ?? [];
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: templates = [] } = useQuery<AgentTemplate[]>({
    queryKey: ["agent-templates"],
    queryFn: async () => {
      const res = await agentsApi.templates() as unknown;
      if (Array.isArray(res)) return res as AgentTemplate[];
      if (res && typeof res === "object" && "items" in (res as object))
        return ((res as { items: AgentTemplate[] }).items) ?? [];
      return [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: models = [] } = useQuery<LLMModel[]>({
    queryKey: ["models-all"],
    queryFn: async () => {
      const res = await modelsApi.listAll() as unknown;
      if (Array.isArray(res)) return res as LLMModel[];
      if (res && typeof res === "object" && "items" in (res as object))
        return ((res as { items: LLMModel[] }).items) ?? [];
      return [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: toolInstances = [] } = useQuery<ToolInstance[]>({
    queryKey: ["tool-instances"],
    queryFn: async () => {
      const res = await toolsApi.instances() as unknown;
      if (Array.isArray(res)) return res as ToolInstance[];
      if (res && typeof res === "object" && "items" in (res as object))
        return ((res as { items: ToolInstance[] }).items) ?? [];
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["agents"] });
    void qc.invalidateQueries({ queryKey: ["marketplace-agents"] });
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const body: AgentCreate = {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        category_id: draft.category_id || undefined,
        template_key: draft.template_key || undefined,
        base_system_prompt: draft.base_system_prompt.trim() || undefined,
        llm_model_id: draft.llm_model_id || undefined,
        tool_instance_ids: draft.tool_instance_ids.length > 0 ? draft.tool_instance_ids : undefined,
        status: draft.status,
        is_global: draft.is_global,
      };
      return agentsApi.create(body);
    },
    onSuccess: (res) => {
      invalidate();
      const r = res as { name?: string };
      toast.success("Agent created", r.name ?? draft.name);
      onClose();
    },
    onError: (e) => toast.error("Could not create agent", (e as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const body: AgentUpdate = {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        category_id: draft.category_id || undefined,
        template_key: draft.template_key || undefined,
        base_system_prompt: draft.base_system_prompt.trim() || undefined,
        llm_model_id: draft.llm_model_id || undefined,
        status: draft.status,
        change_summary: draft.change_summary.trim() || undefined,
      };
      return agentsApi.update(agent!.id, body);
    },
    onSuccess: (res) => {
      invalidate();
      const r = res as { version?: number };
      toast.success("Agent updated", r.version ? `Now on version ${r.version}` : undefined);
      onClose();
    },
    onError: (e) => toast.error("Could not update agent", (e as Error).message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const toggleTool = (id: string) =>
    setDraft((d) => ({
      ...d,
      tool_instance_ids: d.tool_instance_ids.includes(id)
        ? d.tool_instance_ids.filter((x) => x !== id)
        : [...d.tool_instance_ids, id],
    }));

  const handleSubmit = () => {
    if (!draft.name.trim()) return;
    if (mode === "create") createMutation.mutate();
    else updateMutation.mutate();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="right"
      title={mode === "create" ? "New agent" : `Edit — ${agent?.name}`}
      description={
        mode === "create"
          ? "Create a new agent. Fields marked * are required."
          : "Update agent configuration. Changes are versioned."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            leftIcon={<Save className="h-4 w-4" />}
            onClick={handleSubmit}
            loading={isPending}
            disabled={!draft.name.trim()}
          >
            {mode === "create" ? "Create agent" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* ── Basic info ── */}
        <section className="space-y-4">
          <p className="eyebrow">Basic info</p>

          <div>
            <Label htmlFor="af-name">Name *</Label>
            <Input
              id="af-name"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Care Copilot"
            />
          </div>

          <div>
            <Label htmlFor="af-desc">Description</Label>
            <Textarea
              id="af-desc"
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What does this agent do, and for whom?"
              className="min-h-[72px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="af-cat">Category</Label>
              <Select
                id="af-cat"
                value={draft.category_id}
                onChange={(e) => set("category_id", e.target.value)}
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="af-status">Status</Label>
              <Select
                id="af-status"
                value={draft.status}
                onChange={(e) => set("status", e.target.value as Draft["status"])}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>

          {/* is_global — create only */}
          {mode === "create" && (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-base/40 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
                <Globe className="h-4 w-4 text-brand-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">Global agent</p>
                <p className="text-xs text-ink-muted">Available to all tenants (can be released later)</p>
              </div>
              <input
                type="checkbox"
                checked={draft.is_global}
                onChange={(e) => set("is_global", e.target.checked)}
                className="h-4 w-4 accent-brand-500"
              />
            </label>
          )}
        </section>

        {/* ── Template & model ── */}
        <section className="space-y-4">
          <p className="eyebrow">Template &amp; model</p>

          <div>
            <Label htmlFor="af-tpl">Template</Label>
            <Select
              id="af-tpl"
              value={draft.template_key}
              onChange={(e) => set("template_key", e.target.value)}
            >
              <option value="">— None —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.key ?? t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            {draft.template_key && (
              <p className="mt-1 text-xs text-ink-muted">
                {templates.find((t) => (t.key ?? t.id) === draft.template_key)?.description ?? ""}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="af-model">LLM model</Label>
            <Select
              id="af-model"
              value={draft.llm_model_id}
              onChange={(e) => set("llm_model_id", e.target.value)}
            >
              <option value="">— Default —</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name ?? m.name}
                </option>
              ))}
            </Select>
          </div>
        </section>

        {/* ── System prompt ── */}
        <section className="space-y-3">
          <p className="eyebrow">System prompt</p>
          <Textarea
            id="af-prompt"
            value={draft.base_system_prompt}
            onChange={(e) => set("base_system_prompt", e.target.value)}
            placeholder="You are a helpful, precise assistant…"
            className="min-h-[120px] font-mono text-xs"
          />
        </section>

        {/* ── Tool instances — create only ── */}
        {mode === "create" && (
          <section className="space-y-3">
            <p className="eyebrow">Tool instances</p>
            {toolInstances.length === 0 ? (
              <p className="text-xs text-ink-faint">No tool instances available.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {toolInstances.map((t) => {
                  const on = draft.tool_instance_ids.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTool(t.id)}
                      className={
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors " +
                        (on
                          ? "border-brand-500/50 bg-brand-500/10 text-ink"
                          : "border-line bg-base/40 text-ink-muted hover:border-line-strong")
                      }
                    >
                      <Wrench className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Change summary — edit only ── */}
        {mode === "edit" && (
          <section className="space-y-3">
            <p className="eyebrow">Change summary</p>
            <Input
              value={draft.change_summary}
              onChange={(e) => set("change_summary", e.target.value)}
              placeholder="Brief description of what changed (stored in version history)"
            />
          </section>
        )}

        {/* ── Tool management hint — edit mode ── */}
        {mode === "edit" && (
          <div className="flex items-start gap-2 rounded-xl border border-line bg-base/40 p-3">
            <X className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
            <p className="text-xs text-ink-muted">
              To add or remove tools from this agent, use the agent detail panel after saving.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
