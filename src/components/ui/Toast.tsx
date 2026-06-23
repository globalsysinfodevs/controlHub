import { create } from "zustand";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

type ToastTone = "success" | "error" | "info" | "warning";
interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastStore {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

let seq = 1;
const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = seq++;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 4200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/** Imperative API: toast.success("Saved"), toast.error("Failed", "reason"). */
export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ tone: "success", title, description }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ tone: "error", title, description }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ tone: "info", title, description }),
  warning: (title: string, description?: string) =>
    useToastStore.getState().push({ tone: "warning", title, description }),
};

const icons: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-[18px] w-[18px] text-ok" />,
  error: <XCircle className="h-[18px] w-[18px] text-danger" />,
  info: <Info className="h-[18px] w-[18px] text-brand-400" />,
  warning: <AlertTriangle className="h-[18px] w-[18px] text-warn" />,
};

export function ToastViewport() {
  const { toasts, dismiss } = useToastStore();
  return createPortal(
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-full max-w-sm flex-col gap-2.5">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            onClick={() => dismiss(t.id)}
            className="panel pointer-events-auto flex cursor-pointer items-start gap-3 p-3.5"
          >
            <span className="mt-0.5">{icons[t.tone]}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-ink-muted">{t.description}</p>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}
