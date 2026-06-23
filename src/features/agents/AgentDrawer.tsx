import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  GitBranch,
  Save,
  Sparkles,
  Thermometer,
  Trash2,
  Wrench,
  Zap,
} from "lucide-react";
import type { Agent, AgentCategory, OutputType } from "@/lib/api/types";
import { agentsApi, toolsApi } from "@/lib/api/endpoints";
import { formatCompact, formatPercent, timeAgo } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Sigil } from "@/components/ui/Sigil";
import { toast } from "@/components/ui/Toast";
import { CATEGORIES, CATEGORY_META, MODELS, OUTPUT_TYPES } from "./meta";

type Draft = {
  name: string;
  description: string;
  category: AgentCategory;
  model: string;
  temperature: number;
  system_prompt: string;
  tools: string[];
  output_types: OutputType[];
  status: Agent["status"];
};

const EMPTY: Draft = {
  name: "",
  description: "",
  category: "automation",
  model: "claude-sonnet-4-6",
  temperature: 0.3,
  system_prompt:
    "You are a helpful, precise assistant. Cite your sources and never expose sensitive data.",
  tools: [],
  output_types: ["markdown"],
  status: "draft",
};

function toDraft(a: Agent): Draft {
  return {
    name: a.name,
    description: a.description,
    category: a.category,
    model: a.model,
    temperature: a.temperature,
    system_prompt: a.system_prompt,
    tools: a.tools,
    output_types: a.output_types,
    status: a.status,
  };
}

export function AgentDrawer({
  agent,
  mode,
  open,
  onClose,
}: {
  agent: Agent | null;
  mode: "view" | "create";
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "config">(mode === "create" ? "config" : "overview");
  const [draft, setDraft] = useState<Draft>(agent ? toDraft(agent) : EMPTY);

  const { data: tools } = useQuery({ queryKey: ["tools"], queryFn: () => toolsApi.list() });

  useEffect(() => {
    setDraft(agent ? toDraft(agent) : EMPTY);
    setTab(mode === "create" ? "config" : "overview");
  }, [agent, mode, open]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["agents"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const save = useMutation({
    mutationFn: () =>
      mode === "create" ? agentsApi.create(draft) : agentsApi.update(agent!.id, draft),
    onSuccess: (saved) => {
      invalidate();
      toast.success(
        mode === "create" ? "Agent created" : "Changes published",
        mode === "create" ? `${saved.name} is ready as a draft.` : `Now on version ${saved.version}.`
      );
      onClose();
    },
    onError: (e) => toast.error("Could not save", (e as Error).message),
  });

  const remove = useMutation({
    mutationFn: () => agentsApi.remove(agent!.id),
    onSuccess: () => {
      invalidate();
      toast.success("Agent deleted");
      onClose();
    },
  });

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const toggleArr = <K extends "tools" | "output_types">(k: K, v: string) =>
    setDraft((d) => {
      const has = (d[k] as string[]).includes(v);
      return { ...d, [k]: has ? (d[k] as string[]).filter((x) => x !== v) : [...(d[k] as string[]), v] } as Draft;
    });

  const cat = CATEGORY_META[draft.category];

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="right"
      title={mode === "create" ? "New agent" : agent?.name}
      description={mode === "create" ? "Agents are configured as data — no code deploy needed." : undefined}
      footer={
        <>
          {mode === "view" && agent && (
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => remove.mutate()}
              loading={remove.isPending}
              className="mr-auto"
            >
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => save.mutate()}
            loading={save.isPending}
            disabled={!draft.name.trim()}
          >
            {mode === "create" ? "Create agent" : "Publish changes"}
          </Button>
        </>
      }
    >
      {/* Header card */}
      <div className="mb-5 flex items-center gap-4 rounded-xl border border-line bg-surface-raised/60 p-4">
        <Sigil seed={agent?.id ?? draft.name ?? "new"} name={draft.name || "New Agent"} size="xl" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-medium"
              style={{ borderColor: cat.hue + "55", color: cat.hue, background: cat.hue + "12" }}
            >
              <cat.icon className="h-3 w-3" />
              {cat.label}
            </span>
            {agent && (
              <Badge tone="neutral">
                <GitBranch className="h-3 w-3" /> v{agent.version}
              </Badge>
            )}
          </div>
          <p className="mt-1.5 font-mono text-xs text-ink-muted">{draft.model}</p>
          {agent && <p className="text-2xs text-ink-faint">Updated {timeAgo(agent.updated_at)}</p>}
        </div>
      </div>

      {mode === "view" && (
        <div className="mb-5 flex gap-1 rounded-lg border border-line bg-base/40 p-1">
          {(["overview", "config"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors " +
                (tab === t ? "bg-brand-500/15 text-brand-700" : "text-ink-muted hover:text-ink")
              }
            >
              {t === "config" ? "Configuration" : "Overview"}
            </button>
          ))}
        </div>
      )}

      {tab === "overview" && agent ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatBox icon={Zap} label="Tokens · 30d" value={formatCompact(agent.tokens_30d)} />
            <StatBox icon={Activity} label="Invocations · 30d" value={formatCompact(agent.invocations_30d)} />
            <StatBox icon={Activity} label="Success rate" value={formatPercent(agent.success_rate, 1)} />
            <StatBox icon={Thermometer} label="Avg latency" value={`${agent.avg_latency_ms} ms`} />
          </div>

          <section>
            <p className="eyebrow mb-2">System prompt</p>
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-base/50 p-3.5 font-mono text-xs leading-relaxed text-ink-muted">
              {agent.system_prompt}
            </pre>
          </section>

          <section>
            <p className="eyebrow mb-2">Connected tools</p>
            <div className="flex flex-wrap gap-2">
              {agent.tools.length === 0 && <p className="text-sm text-ink-faint">No tools connected.</p>}
              {agent.tools.map((id) => {
                const t = tools?.find((x) => x.id === id);
                return (
                  <span key={id} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-raised px-2.5 py-1 text-xs text-ink-muted">
                    <Wrench className="h-3 w-3" /> {t?.name ?? id}
                  </span>
                );
              })}
            </div>
          </section>

          <section>
            <p className="eyebrow mb-2">Output types</p>
            <div className="flex flex-wrap gap-1.5">
              {agent.output_types.map((o) => (
                <Badge key={o} tone="telemetry">
                  {o}
                </Badge>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label htmlFor="ag-name">Name</Label>
            <Input id="ag-name" value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Care Copilot" />
          </div>
          <div>
            <Label htmlFor="ag-desc">Description</Label>
            <Textarea
              id="ag-desc"
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What does this agent do, and for whom?"
              className="min-h-[72px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ag-cat">Category</Label>
              <Select id="ag-cat" value={draft.category} onChange={(e) => set("category", e.target.value as AgentCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_META[c].label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="ag-model">Model</Label>
              <Select id="ag-model" value={draft.model} onChange={(e) => set("model", e.target.value)}>
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label hint={draft.temperature.toFixed(2)}>Temperature</Label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={draft.temperature}
              onChange={(e) => set("temperature", Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-ink/[0.08] accent-brand-500"
            />
            <div className="mt-1 flex justify-between text-2xs text-ink-faint">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          <div>
            <Label htmlFor="ag-prompt" hint="dynamic, stored per agent">
              System prompt
            </Label>
            <Textarea
              id="ag-prompt"
              value={draft.system_prompt}
              onChange={(e) => set("system_prompt", e.target.value)}
              className="min-h-[120px] font-mono text-xs"
            />
          </div>

          <div>
            <Label>Tools</Label>
            <div className="grid grid-cols-2 gap-2">
              {tools?.map((t) => {
                const on = draft.tools.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleArr("tools", t.id)}
                    className={
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors " +
                      (on ? "border-brand-500/50 bg-brand-500/10 text-ink" : "border-line bg-base/40 text-ink-muted hover:border-line-strong")
                    }
                  >
                    <Wrench className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Output types</Label>
            <div className="flex flex-wrap gap-1.5">
              {OUTPUT_TYPES.map((o) => {
                const on = draft.output_types.includes(o);
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => toggleArr("output_types", o)}
                    className={
                      "rounded-full border px-3 py-1 text-2xs font-medium capitalize transition-colors " +
                      (on ? "border-telemetry-500/50 bg-telemetry-500/12 text-telemetry-600" : "border-line text-ink-muted hover:text-ink")
                    }
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </div>

          {mode === "view" && (
            <div className="flex items-center justify-between rounded-lg border border-line bg-base/40 p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-600" />
                <span className="text-sm text-ink">Status</span>
              </div>
              <Select
                value={draft.status}
                onChange={(e) => set("status", e.target.value as Agent["status"])}
                className="h-8 w-32"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </Select>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function StatBox({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-base/40 p-3">
      <div className="flex items-center gap-1.5 text-ink-faint">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-2xs">{label}</span>
      </div>
      <p className="stat-number mt-1 font-display text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
