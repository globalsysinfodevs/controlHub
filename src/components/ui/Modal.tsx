import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** "center" renders a dialog; "right" renders a slide-in drawer. */
  variant?: "center" | "right";
  size?: "sm" | "md" | "lg";
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "center",
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cn("fixed inset-0 z-50 flex", variant === "right" ? "justify-end" : "items-center justify-center p-4")}>
          <motion.div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={variant === "right" ? { x: "100%" } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={variant === "right" ? { x: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={variant === "right" ? { x: "100%" } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={cn(
              "relative z-10 flex flex-col border border-line-strong bg-surface shadow-lift",
              variant === "right"
                ? "h-full w-full max-w-lg rounded-l-2xl"
                : cn("w-full rounded-2xl", widths[size])
            )}
          >
            {(title || description) && (
              <header className="flex items-start justify-between gap-4 border-b border-line p-5">
                <div>
                  {title && <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>}
                  {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-white/5 hover:text-ink"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>
            )}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
            {footer && <footer className="flex items-center justify-end gap-2 border-t border-line p-4">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
