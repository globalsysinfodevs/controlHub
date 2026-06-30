import type { ReactNode } from "react";
import { Loader2, AlertTriangle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiRequestError } from "@/lib/api/client";

/** Friendly message from any thrown API/network error. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error) return err.message;
  return "Algo salió mal";
}

/** Translate a backend status string to Spanish for display. */
const STATUS_ES: Record<string, string> = {
  active: "activo",
  inactive: "inactivo",
  invited: "invitado",
  deleted: "eliminado",
  deactivated: "desactivado",
  suspended: "suspendido",
  pending: "pendiente",
};
export function statusLabel(status: string): string {
  return STATUS_ES[status] ?? status;
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface shadow-card", className)}>
      {children}
    </div>
  );
}

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-16 text-sm text-ink-muted">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger/15">
        <AlertTriangle className="h-5 w-5 text-danger" />
      </span>
      <p className="max-w-sm text-sm text-ink-muted">{errorMessage(error)}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/[0.05]">
        <Inbox className="h-5 w-5 text-ink-faint" />
      </span>
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
