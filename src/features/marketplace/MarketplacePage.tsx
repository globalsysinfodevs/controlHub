import { useEffect, useMemo, useState } from "react";
import { Boxes, CircleCheck, Plus, Search, Trash2, X, Zap, MessageSquareText } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMarket } from "@/store/marketplace";
import { useAuth, isSuperAdmin } from "@/store/auth";
import { agentsApi, dashboardApi } from "@/lib/api/endpoints";
import { toast } from "@/components/ui/Toast";
import type { Agent } from "@/lib/api/types";
import { MarketAgentCard } from "./MarketAgentCard";
import { DetailPanel } from "./DetailPanel";

const STATUS = [
  { key: "all", label: "All" },
  { key: "enabled", label: "Enabled" },
  { key: "disabled", label: "Available" },
];

interface BackendCategory { id: string; name: string; slug?: string; icon?: string | null; }

/** Format a raw token count into a human-readable string (e.g. 1_200_000 → "1.2M"). */
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

export function MarketplacePage() {
  const { agents, toggle, hydrate } = useMarket();
  const { user } = useAuth();
  const isAdmin = isSuperAdmin(user?.role) || user?.role === "tenant_admin";
  const qc = useQueryClient();

  useEffect(() => { void hydrate(); }, [hydrate]);

  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("relevant");
  const [detailId, setDetailId] = useState<string | null>(null);

  // ── New category form state ───────────────────────────────────────────
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  // ── Delete category state ─────────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  // ── Fetch categories from backend ─────────────────────────────────────
  const { data: backendCats = [] } = useQuery<BackendCategory[]>({
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

  // ── Fetch dashboard summary for sidebar stats ─────────────────────────
  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary", 30],
    queryFn: () => dashboardApi.summary(30),
    staleTime: 2 * 60 * 1000,
  });

  const enabledCount = agents.filter((a) => a.enabled).length;

  // Use backend categories directly; fall back to names derived from agent list.
  const allCats: BackendCategory[] = useMemo(() => {
    if (backendCats.length > 0) return backendCats;
    // Derive unique category names from the loaded agent list as fallback
    const seen = new Set<string>();
    const derived: BackendCategory[] = [];
    for (const a of agents as Agent[]) {
      const name = a.category_name ?? "";
      if (name && !seen.has(name)) {
        seen.add(name);
        derived.push({ id: a.category_id ?? name, name, slug: name });
      }
    }
    return derived;
  }, [backendCats, agents]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: agents.length };
    for (const a of agents) {
      const key = a.category_name ?? "";
      if (key) c[key] = (c[key] ?? 0) + 1;
    }
    return c;
  }, [agents]);

  const visible = useMemo(() => {
    let list = (agents as Agent[]).filter((a) => {
      if (cat !== "all" && (a.category_name ?? "") !== cat) return false;
      if (status === "enabled" && !a.enabled) return false;
      if (status === "disabled" && a.enabled) return false;
      if (search && !(a.name + (a.description ?? "")).toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (sort === "used") list = [...list].sort((a, b) => b.invocations_30d - a.invocations_30d);
    else if (sort === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [agents, cat, status, search, sort]);

  function handleToggle(a: Agent) {
    const now = toggle(a.id);
    toast.success(now ? "Agent enabled" : "Agent disabled", a.name);
  }

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    try {
      await agentsApi.createCategory({ name: newCatName.trim(), icon: newCatIcon.trim() || undefined });
      toast.success("Category created", newCatName.trim());
      void qc.invalidateQueries({ queryKey: ["agent-categories"] });
      setNewCatName("");
      setNewCatIcon("");
      setShowNewCat(false);
    } catch (e) {
      toast.error("Error creating category", (e as Error).message);
    } finally {
      setSavingCat(false);
    }
  }

  async function handleDeleteCategory(categoryId: string, categoryName: string) {
    setDeletingCatId(categoryId);
    try {
      await agentsApi.deleteCategory(categoryId);
      toast.success("Category deleted", categoryName);
      void qc.invalidateQueries({ queryKey: ["agent-categories"] });
      // If the deleted category was selected, reset to "all"
      if (cat === categoryName || cat === categoryId) setCat("all");
    } catch (e) {
      toast.error("Error deleting category", (e as Error).message);
    } finally {
      setDeletingCatId(null);
      setConfirmDeleteId(null);
    }
  }

  const detail = (agents as Agent[]).find((a) => a.id === detailId) ?? null;

  // Derived sidebar stats from backend
  const tokensUsed = summary?.tokens_used ?? 0;
  const tokensLimit = summary?.tokens_limit ?? 5_000_000;
  const tokensPct = tokensLimit > 0 ? Math.min(100, Math.round((tokensUsed / tokensLimit) * 100)) : 0;
  const invocationsToday = summary?.invocations_today ?? 0;
  const avgLatencyS = summary ? (summary.avg_latency_ms / 1000).toFixed(1) + " s" : "—";
  const availability = summary ? summary.success_rate.toFixed(1) + "%" : "—";
  const availabilityClass = summary && summary.success_rate >= 99 ? "text-ok" : "text-primary";

  // Days until token reset (approximate: end of current month)
  const now = new Date();
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* ── Category sidebar ── */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 flex-shrink-0 overflow-y-auto border-r border-g-mid bg-white md:block">
        <div className="space-y-5 p-4">
          {/* Categories */}
          <div>
            <p className="eyebrow mb-2 px-3">CATEGORIES</p>
            <ul className="space-y-0.5">
              <CatBtn label="All" count={counts.all} active={cat === "all"} dot="bg-secondary" onClick={() => setCat("all")} />
              {allCats.map((c) => {
                const key = c.slug ?? c.name;
                return (
                  <CatBtn
                    key={c.id}
                    label={c.name}
                    count={counts[key] ?? counts[c.name] ?? 0}
                    active={cat === key}
                    dot={cat === key ? "bg-secondary" : "bg-g-mid"}
                    onClick={() => setCat(key)}
                    onDelete={isSuperAdmin(user?.role) ? () => setConfirmDeleteId(c.id) : undefined}
                    isDeleting={deletingCatId === c.id}
                    confirmingDelete={confirmDeleteId === c.id}
                    onConfirmDelete={() => void handleDeleteCategory(c.id, c.name)}
                    onCancelDelete={() => setConfirmDeleteId(null)}
                  />
                );
              })}
            </ul>

            {/* Add new category — admins only */}
            {isAdmin && (
              <div className="mt-2 px-1">
                {showNewCat ? (
                  <div className="rounded-xl border border-g-mid bg-g-light p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">New category</span>
                      <button
                        onClick={() => { setShowNewCat(false); setNewCatName(""); setNewCatIcon(""); }}
                        className="text-g-dark hover:text-primary"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <input
                      autoFocus
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleCreateCategory();
                        if (e.key === "Escape") setShowNewCat(false);
                      }}
                      placeholder="Category name"
                      className="w-full rounded-lg border border-g-mid bg-white px-2.5 py-1.5 text-xs text-primary placeholder-g-dark focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
                    />
                    <input
                      value={newCatIcon}
                      onChange={(e) => setNewCatIcon(e.target.value)}
                      placeholder="Emoji (optional)"
                      className="w-full rounded-lg border border-g-mid bg-white px-2.5 py-1.5 text-xs text-primary placeholder-g-dark focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
                    />
                    <button
                      onClick={() => void handleCreateCategory()}
                      disabled={savingCat || !newCatName.trim()}
                      className="w-full rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {savingCat ? "Saving…" : "Create"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewCat(true)}
                    className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-g-dark transition-colors hover:bg-g-light hover:text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New category
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-g-mid" />

          {/* Token usage */}
          <div className="px-1">
            <p className="eyebrow mb-3 px-2">USE OF TOKENS</p>
            <div className="mb-1.5 flex justify-between px-2 text-xs">
              <span className="text-g-dark">This month</span>
              <span className="font-semibold text-primary">
                {fmtTokens(tokensUsed)} / {fmtTokens(tokensLimit)}
              </span>
            </div>
            <div className="mx-2 h-1.5 rounded-full bg-g-mid">
              <div
                className="h-1.5 rounded-full bg-secondary transition-all duration-1000"
                style={{ width: `${tokensPct}%` }}
              />
            </div>
            <p className="mt-2 px-2 text-xs text-g-dark">
              {tokensPct}% used · Restarts in {daysLeft} days
            </p>
          </div>

          <div className="border-t border-g-mid" />

          {/* Quick stats */}
          <div className="space-y-3 px-3">
            <QuickStat label="Active agents" value={String(enabledCount)} />
            <QuickStat label="Consultations today" value={String(invocationsToday)} />
            <QuickStat label="Average time" value={avgLatencyS} />
            <QuickStat label="Availability" value={availability} valueClass={availabilityClass} />
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-auto">
        {/* Stats bar */}
        <div className="border-b border-g-mid bg-white px-4 py-4 sm:px-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={<Boxes className="h-5 w-5 text-secondary" />} tint="bg-secondary/10" value={String(enabledCount)} label="Authorized agents" />
            <StatCard icon={<MessageSquareText className="h-5 w-5 text-tertiary" />} tint="bg-tertiary/10" value={String(invocationsToday)} label="Consultations today" />
            <StatCard icon={<Zap className="h-5 w-5 text-primary" />} tint="bg-primary/10" value={fmtTokens(tokensUsed)} label="Tokens consumed" />
            <StatCard icon={<CircleCheck className="h-5 w-5 text-ok" />} tint="bg-ok/10" value={availability} label="Availability" />
          </div>
        </div>

        {/* Search + filters */}
        <div className="px-4 pb-3 pt-5 sm:px-6">
          <div className="flex flex-col items-start gap-3 md:flex-row md:items-center">
            <div className="relative w-full max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-g-dark" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Looking for an agent..."
                className="w-full rounded-xl border border-g-mid bg-white py-2.5 pl-9 pr-4 text-sm text-primary placeholder-g-dark transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {STATUS.map((s) => (
                <button key={s.key} onClick={() => setStatus(s.key)} className={"chip" + (status === s.key ? " active" : "")}>
                  {s.label}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="ml-auto rounded-xl border border-g-mid bg-white px-3 py-2.5 text-xs text-g-dark transition-colors focus:border-secondary focus:outline-none"
            >
              <option value="relevant">More relevant</option>
              <option value="used">Most used</option>
              <option value="az">A–Z</option>
            </select>
          </div>
          <p className="mt-2.5 text-xs text-g-dark">
            Showing <span className="font-semibold text-primary">{visible.length}</span> agents
          </p>
        </div>

        {/* Grid */}
        <div className="px-4 pb-10 sm:px-6">
          {visible.length === 0 ? (
            <div className="panel flex flex-col items-center justify-center px-6 py-16 text-center">
              <Search className="mb-3 h-7 w-7 text-g-dark" />
              <h3 className="text-base font-semibold text-primary">No results</h3>
              <p className="mt-1 text-sm text-g-dark">Adjust the search, category or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((a, i) => (
                <MarketAgentCard
                  key={a.id}
                  agent={a}
                  index={i}
                  onOpen={() => setDetailId(a.id)}
                  onToggle={() => handleToggle(a)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <DetailPanel agent={detail} onClose={() => setDetailId(null)} onToggle={() => detail && handleToggle(detail)} />
    </div>
  );
}

interface CatBtnProps {
  label: string;
  count: number;
  active: boolean;
  dot: string;
  onClick: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  confirmingDelete?: boolean;
  onConfirmDelete?: () => void;
  onCancelDelete?: () => void;
}

function CatBtn({ label, count, active, dot, onClick, onDelete, isDeleting, confirmingDelete, onConfirmDelete, onCancelDelete }: CatBtnProps) {
  if (confirmingDelete) {
    return (
      <li>
        <div className="mx-1 rounded-xl border border-red-200 bg-red-50 p-2.5 space-y-2">
          <p className="text-xs font-semibold text-red-700 leading-snug">
            Delete <span className="font-bold">"{label}"</span>?
          </p>
          <p className="text-xs text-red-500">This cannot be undone.</p>
          <div className="flex gap-1.5">
            <button
              onClick={onCancelDelete}
              disabled={isDeleting}
              className="flex-1 rounded-lg border border-g-mid bg-white px-2 py-1 text-xs text-g-dark transition-colors hover:bg-g-light disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirmDelete}
              disabled={isDeleting}
              className="flex-1 rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isDeleting ? "…" : "Delete"}
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="group relative">
      <button onClick={onClick} className={"cat-item pr-7" + (active ? " active" : "")}>
        <span className={"h-2 w-2 flex-shrink-0 rounded-full " + dot} />
        <span className="truncate">{label}</span>
        <span className="ml-auto rounded-full bg-g-light px-2 py-0.5 text-xs text-g-dark">{count}</span>
      </button>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete category"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-g-dark opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
}

function QuickStat({ label, value, valueClass = "text-primary" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-g-dark">{label}</span>
      <span className={"text-xs font-semibold " + valueClass}>{value}</span>
    </div>
  );
}

function StatCard({ icon, tint, value, label }: { icon: React.ReactNode; tint: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 transition-transform hover:-translate-y-0.5">
      <div className={"flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl " + tint}>{icon}</div>
      <div>
        <p className="stat-number text-xl font-bold leading-none text-primary">{value}</p>
        <p className="mt-0.5 text-xs text-g-dark">{label}</p>
      </div>
    </div>
  );
}
