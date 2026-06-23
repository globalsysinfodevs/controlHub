import { create } from "zustand";
import type { CatalogAgent } from "@/features/marketplace/data";

interface ChatState {
  agent: CatalogAgent | null;
  open: (agent: CatalogAgent) => void;
  close: () => void;
}

/** Controls the fullscreen chat overlay opened from the marketplace. */
export const useChat = create<ChatState>((set) => ({
  agent: null,
  open: (agent) => set({ agent }),
  close: () => set({ agent: null }),
}));
