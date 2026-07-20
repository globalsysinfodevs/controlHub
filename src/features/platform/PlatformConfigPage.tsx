import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Loader2, Plus, Save, Settings2, User } from "lucide-react";
import {
  platformConfigApi,
  type PlatformConfigResponse,
  type PlatformConfigListEnvelope,
} from "@/lib/api/endpoints";
import { isMock } from "@/lib/api/client";
import { toast } from "@/components/ui/Toast";

// ── Mock data (used when VITE_MOCK=true) ──────────────────────────────────────
const MOCK_ENTRIES: PlatformConfigResponse[] = [
  {
    id: "mock-1", key: "maintenance_mode",    value: "false",
    updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    description: "Put the platform in read-only maintenance mode",
  },
  {
    id: "mock-2", key: "max_tenants",         value: "100",
    updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    description: "Maximum number of tenants allowed",
  },
  {
    id: "mock-3", key: "default_token_limit", value: "5000000",
    updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    description: "Default monthly token limit for new tenants",
  },
  {
    id: "mock-4", key: "platform_announcement", value: "",
    updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    description: "Banner message shown to all users (empty = hidden)",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const FIELD =
  "w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PlatformConfigPage() {
  const qc = useQueryClient();

  const { data: entries = [], isLoading, isError } = useQuery({
    queryKey: ["platform-config"],
    queryFn: async (): Promise<PlatformConfigResponse[]> => {
      if (isMock) return MOCK_ENTRIES;
      const res = await platformConfigApi.list() as unknown;
      // Backend returns { items: [...], total: N }
      if (res && typeof res === "object" && "items" in (res as object)) {
        return ((res as PlatformConfigListEnvelope).items ?? []);
      }
      // Fallback: plain array
      if (Array.isArray(res)) return res as PlatformConfigResponse[];
      return [];
    },
    retry: 1,
    staleTime: 30_000,
  });

  // Local edits — keyed by config key
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // New entry form
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [adding, setAdding] = useState(false);

  // Sync edits when data loads (don't overwrite keys the user is actively editing)
  useEffect(() => {
    if (entries.length > 0) {
      setEdits((prev) => {
        const next = { ...prev };
        entries.forEach((e) => {
          if (!(e.key in next)) next[e.key] = String(e.value ?? "");
        });
        return next;
      });
    }
  }, [entries]);

  async function save(key: string) {
    if (isMock) {
      toast.info("Modo demo", "Conéctate al backend para guardar configuración.");
      return;
    }
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      await platformConfigApi.upsert(key, edits[key] ?? "");
      toast.success("Configuración guardada", key);
      qc.invalidateQueries({ queryKey: ["platform-config"] });
    } catch (e) {
      toast.error("No se pudo guardar", (e as Error).message);
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  }

  async function addEntry() {
    if (!newKey.trim()) return;
    if (isMock) {
      toast.info("Modo demo", "Conéctate al backend para añadir configuración.");
      return;
    }
    setAdding(true);
    try {
      await platformConfigApi.upsert(newKey.trim(), newVal.trim());
      toast.success("Entrada añadida", newKey.trim());
      setNewKey("");
      setNewVal("");
      qc.invalidateQueries({ queryKey: ["platform-config"] });
    } catch (e) {
      toast.error("No se pudo añadir", (e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  const isDirty = (key: string, original: unknown) =>
    edits[key] !== undefined && edits[key] !== String(original ?? "");

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
          <Settings2 className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-ink">Configuración de Plataforma</h2>
          <p className="text-xs text-ink-muted">
            Parámetros globales del sistema · Solo Super Admin
          </p>
        </div>
        {isMock && (
          <span className="ml-auto rounded-full bg-warn/10 px-2.5 py-1 text-xs font-medium text-warn">
            Modo demo
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 py-12 text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
          <span className="text-sm">Cargando configuración…</span>
        </div>
      )}

      {/* Error */}
      {isError && !isMock && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          No se pudo cargar la configuración de plataforma.
        </div>
      )}

      {/* Config entries */}
      {!isLoading && (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.key} className="panel p-4">
              {/* Key + description row */}
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <code className="rounded bg-brand-500/8 px-2 py-0.5 font-mono text-xs font-semibold text-brand-700">
                  {entry.key}
                </code>
                {entry.description && (
                  <span className="text-xs text-ink-faint">{entry.description}</span>
                )}
                {isDirty(entry.key, entry.value) && (
                  <span className="rounded-full bg-warn/10 px-2 py-0.5 text-2xs font-medium text-warn">
                    Sin guardar
                  </span>
                )}
              </div>

              {/* Value input + save button */}
              <div className="flex items-center gap-3">
                <input
                  value={edits[entry.key] ?? String(entry.value ?? "")}
                  onChange={(e) =>
                    setEdits((prev) => ({ ...prev, [entry.key]: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && save(entry.key)}
                  className={FIELD}
                  placeholder="(vacío)"
                />
                <button
                  onClick={() => save(entry.key)}
                  disabled={saving[entry.key]}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
                >
                  {/*
                    Stable icon container: fixes the browser-extension
                    insertBefore crash (e.g. Adobe Acrobat injects nodes into
                    <span> elements; when React swaps icons it calls
                    insertBefore on a node the extension already moved).
                    Keeping the icon in its own fixed-size span means React
                    only ever replaces content *inside* that span, never
                    doing a sibling insertBefore on the outer element.
                  */}
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    {saving[entry.key] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                  </span>
                  Guardar
                </button>
              </div>

              {/* Metadata row */}
              {!isMock && (entry.updated_at || entry.updated_by) && (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-ink-faint">
                  {entry.updated_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Actualizado: {fmtDate(entry.updated_at)}
                    </span>
                  )}
                  {entry.updated_by && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Por: {entry.updated_by}
                    </span>
                  )}
                  {entry.id && (
                    <span className="font-mono opacity-60">id: {entry.id}</span>
                  )}
                </div>
              )}
            </div>
          ))}

          {entries.length === 0 && !isLoading && (
            <p className="py-8 text-center text-sm text-ink-muted">
              No hay entradas de configuración. Añade una abajo.
            </p>
          )}

          {/* Add new entry */}
          <div className="panel p-4">
            <p className="mb-3 text-xs font-semibold text-ink-muted">Añadir / actualizar entrada</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="clave (ej. maintenance_mode)"
                className={FIELD + " font-mono"}
                onKeyDown={(e) => e.key === "Enter" && addEntry()}
              />
              <input
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
                placeholder="valor"
                className={FIELD}
                onKeyDown={(e) => e.key === "Enter" && addEntry()}
              />
              <button
                onClick={addEntry}
                disabled={adding || !newKey.trim()}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-ok px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
              >
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  {adding ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                </span>
                Añadir
              </button>
            </div>
            <p className="mt-2 text-2xs text-ink-faint">
              Si la clave ya existe, su valor será reemplazado (upsert). Las claves inmutables del
              sistema no pueden modificarse desde aquí.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
