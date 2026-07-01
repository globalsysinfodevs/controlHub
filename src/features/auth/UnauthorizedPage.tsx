import { ShieldOff } from "lucide-react";
import { useAuth } from "@/store/auth";

/**
 * Shown when an authenticated user tries to access a route their role
 * doesn't permit. The backend would reject the API call anyway, so we
 * surface a friendly message instead of letting the request fail.
 */
export function UnauthorizedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10">
        <ShieldOff className="h-8 w-8 text-danger" />
      </span>

      <div className="space-y-1.5">
        <h1 className="font-display text-2xl font-semibold text-ink">Acceso no autorizado</h1>
        <p className="max-w-sm text-sm text-ink-muted">
          Tu rol{" "}
          <span className="font-medium text-ink">
            {user?.role?.replace(/_/g, " ") ?? "actual"}
          </span>{" "}
          no tiene permiso para ver esta sección.
        </p>
      </div>

      <button
        onClick={() => logout()}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
