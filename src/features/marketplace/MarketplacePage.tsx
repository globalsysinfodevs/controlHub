import { useEffect, useMemo, useState } from "react";
import { Boxes, CircleCheck, Search, Zap, MessageSquareText } from "lucide-react";
import { useMarket } from "@/store/marketplace";
import { toast } from "@/components/ui/Toast";
import { CATEGORIES, CAT_LABEL, type CatalogAgent } from "./data";
import { MarketAgentCard } from "./MarketAgentCard";
import { DetailPanel } from "./DetailPanel";

const STATUS = [
  { key: "all", label: "Todos" },
  { key: "enabled", label: "Habilitados" },
  { key: "disabled", label: "Disponibles" },
  { key: "new", label: "✨ Nuevos" },
];

export function MarketplacePage() {
  const { agents, toggle, hydrate } = useMarket();
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("relevant");
  const [detailId, setDetailId] = useState<string | null>(null);

  const enabledCount = agents.filter((a) => a.enabled).length;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: agents.length };
    for (const a of agents) c[a.cat] = (c[a.cat] ?? 0) + 1;
    return c;
  }, [agents]);

  const visible = useMemo(() => {
    let list = agents.filter((a) => {
      if (cat !== "all" && a.cat !== cat) return false;
      if (status === "enabled" && !a.enabled) return false;
      if (status === "disabled" && a.enabled) return false;
      if (status === "new" && !a.isNew) return false;
      if (search && !(a.name + a.desc).toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (sort === "used") list = [...list].sort((a, b) => b.queries - a.queries);
    else if (sort === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [agents, cat, status, search, sort]);

  function handleToggle(a: CatalogAgent) {
    const now = toggle(a.id);
    toast.success(now ? "Agente habilitado" : "Agente deshabilitado", a.name);
  }

  const detail = agents.find((a) => a.id === detailId) ?? null;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* ── Category sidebar ── */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 flex-shrink-0 overflow-y-auto border-r border-g-mid bg-white md:block">
        <div className="space-y-5 p-4">
          <div>
            <p className="eyebrow mb-2 px-3">Categorías</p>
            <ul className="space-y-0.5">
              <CatBtn label="Todos" count={counts.all} active={cat === "all"} dot="bg-secondary" onClick={() => setCat("all")} />
              {CATEGORIES.map((c) => (
                <CatBtn
                  key={c.key}
                  label={c.label}
                  count={counts[c.key] ?? 0}
                  active={cat === c.key}
                  dot={cat === c.key ? "bg-secondary" : "bg-g-mid"}
                  onClick={() => setCat(c.key)}
                />
              ))}
            </ul>
          </div>

          <div className="border-t border-g-mid" />

          <div className="px-1">
            <p className="eyebrow mb-3 px-2">Uso de tokens</p>
            <div className="mb-1.5 flex justify-between px-2 text-xs">
              <span className="text-g-dark">Este mes</span>
              <span className="font-semibold text-primary">1.2M / 5M</span>
            </div>
            <div className="mx-2 h-1.5 rounded-full bg-g-mid">
              <div className="h-1.5 rounded-full bg-secondary transition-all duration-1000" style={{ width: "24%" }} />
            </div>
            <p className="mt-2 px-2 text-xs text-g-dark">24% utilizado · reinicia en 12 días</p>
          </div>

          <div className="border-t border-g-mid" />

          <div className="space-y-3 px-3">
            <QuickStat label="Agentes activos" value={String(enabledCount)} />
            <QuickStat label="Consultas hoy" value="247" />
            <QuickStat label="Tiempo promedio" value="1.8 s" />
            <QuickStat label="Disponibilidad" value="99.8%" valueClass="text-ok" />
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-auto">
        {/* Stats bar */}
        <div className="border-b border-g-mid bg-white px-4 py-4 sm:px-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={<Boxes className="h-5 w-5 text-secondary" />} tint="bg-secondary/10" value={String(enabledCount)} label="Agentes habilitados" />
            <StatCard icon={<MessageSquareText className="h-5 w-5 text-tertiary" />} tint="bg-tertiary/10" value="247" label="Consultas hoy" />
            <StatCard icon={<Zap className="h-5 w-5 text-primary" />} tint="bg-primary/10" value="1.2M" label="Tokens consumidos" />
            <StatCard icon={<CircleCheck className="h-5 w-5 text-ok" />} tint="bg-ok/10" value="99.8%" label="Disponibilidad" />
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
                placeholder="Buscar agente..."
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
              <option value="relevant">Más relevante</option>
              <option value="used">Más usado</option>
              <option value="az">A–Z</option>
            </select>
          </div>
          <p className="mt-2.5 text-xs text-g-dark">
            Mostrando <span className="font-semibold text-primary">{visible.length}</span> agentes
          </p>
        </div>

        {/* Grid */}
        <div className="px-4 pb-10 sm:px-6">
          {visible.length === 0 ? (
            <div className="panel flex flex-col items-center justify-center px-6 py-16 text-center">
              <Search className="mb-3 h-7 w-7 text-g-dark" />
              <h3 className="text-base font-semibold text-primary">Sin resultados</h3>
              <p className="mt-1 text-sm text-g-dark">Ajusta la búsqueda, la categoría o los filtros.</p>
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

function CatBtn({ label, count, active, dot, onClick }: { label: string; count: number; active: boolean; dot: string; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick} className={"cat-item" + (active ? " active" : "")}>
        <span className={"h-2 w-2 flex-shrink-0 rounded-full " + dot} />
        <span>{label}</span>
        <span className="ml-auto rounded-full bg-g-light px-2 py-0.5 text-xs text-g-dark">{count}</span>
      </button>
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
