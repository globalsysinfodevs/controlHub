import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CATALOG, type CatalogAgent } from "@/features/marketplace/data";
import { isMock } from "@/lib/api/client";
import { marketplaceApi } from "@/lib/api/endpoints";

interface MarketState {
  agents: CatalogAgent[];
  hydrated: boolean;
  /** Load agents from the live backend (no-op in mock mode). Falls back to the
   *  seeded catalogue if the backend returns nothing. */
  hydrate: () => Promise<void>;
  toggle: (id: string) => boolean; // returns the new enabled state (optimistic)
  setEnabled: (id: string, on: boolean) => void;
}

export const useMarket = create<MarketState>()(
  persist(
    (set, get) => ({
      agents: CATALOG,
      hydrated: false,
      async hydrate() {
        if (isMock) {
          set({ hydrated: true });
          return;
        }
        try {
          const live = await marketplaceApi.list();
          if (live.length > 0) set({ agents: live as unknown as CatalogAgent[], hydrated: true });
          else set({ hydrated: true }); // keep seeded catalogue if backend is empty
        } catch {
          set({ hydrated: true }); // backend unreachable → keep local catalogue
        }
      },
      toggle: (id) => {
        const agent = get().agents.find((a) => a.id === id);
        const next = !(agent?.enabled ?? false);
        set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, enabled: next } : a)) }));
        // Persist to the backend when live (fire-and-forget; UI already updated).
        if (!isMock) marketplaceApi.toggle(id, next).catch(() => {});
        return next;
      },
      setEnabled: (id, on) =>
        set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, enabled: on } : a)) })),
    }),
    {
      name: "ialestra.market",
      // Persist only the enabled flags, then re-hydrate onto the catalogue.
      partialize: (s) => ({ enabled: s.agents.map((a) => ({ id: a.id, on: a.enabled })) }),
      merge: (persisted, current) => {
        const saved = (persisted as { enabled?: { id: string; on: boolean }[] })?.enabled ?? [];
        const map = new Map(saved.map((e) => [e.id, e.on]));
        return {
          ...current,
          agents: current.agents.map((a) => (map.has(a.id) ? { ...a, enabled: map.get(a.id)! } : a)),
        };
      },
    }
  )
);
