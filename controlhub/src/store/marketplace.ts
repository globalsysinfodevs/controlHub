import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isMock, getAccessToken } from "@/lib/api/client";
import { marketplaceApi } from "@/lib/api/endpoints";
import type { Agent } from "@/lib/api/types";

interface MarketState {
  agents: Agent[];
  hydrated: boolean;
  /** Load agents from the live backend (no-op in mock mode). */
  hydrate: () => Promise<void>;
  /** Optimistically toggle enabled state and fire backend call. Returns new state. */
  toggle: (id: string) => boolean;
  setEnabled: (id: string, on: boolean) => void;
}

export const useMarket = create<MarketState>()(
  persist(
    (set, get) => ({
      agents: [],
      hydrated: false,

      async hydrate() {
        if (isMock) {
          set({ hydrated: true });
          return;
        }
        const token = getAccessToken() ?? localStorage.getItem("ialestra.token");
        if (!token) {
          set({ hydrated: true });
          return;
        }
        try {
          const live = (await marketplaceApi.list()) as Agent[];
          set({ agents: live, hydrated: true });
        } catch {
          set({ hydrated: true });
        }
      },

      toggle: (id) => {
        const agent = get().agents.find((a) => a.id === id);
        const next = !(agent?.enabled ?? false);
        set((s) => ({
          agents: s.agents.map((a) => (a.id === id ? { ...a, enabled: next } : a)),
        }));
        if (!isMock) marketplaceApi.toggle(id, next).catch(() => {});
        return next;
      },

      setEnabled: (id, on) =>
        set((s) => ({
          agents: s.agents.map((a) => (a.id === id ? { ...a, enabled: on } : a)),
        })),
    }),
    {
      name: "ialestra.market",
      // Only persist the enabled flags; re-hydrate full data from backend on load.
      partialize: (s) => ({ enabled: s.agents.map((a) => ({ id: a.id, on: a.enabled })) }),
      merge: (persisted, current) => {
        const saved = (persisted as { enabled?: { id: string; on: boolean }[] })?.enabled ?? [];
        const map = new Map(saved.map((e) => [e.id, e.on]));
        return {
          ...current,
          agents: current.agents.map((a) =>
            map.has(a.id) ? { ...a, enabled: map.get(a.id)! } : a
          ),
        };
      },
    }
  )
);
