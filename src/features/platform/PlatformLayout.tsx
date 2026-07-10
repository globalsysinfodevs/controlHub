import { NavLink, Outlet } from "react-router-dom";
import { Building2, Gauge, Layers, Settings2, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SUB_TABS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/platform",            label: "Resumen",    icon: Gauge,    end: true },
  { to: "/platform/tenants",    label: "Tenants",    icon: Building2           },
  { to: "/platform/users",      label: "Usuarios",   icon: Users               },
  { to: "/platform/industries", label: "Industrias", icon: Layers              },
  // { to: "/platform/config", label: "Configuración", icon: Settings2 }, // hidden
];

/** Shared shell for the super-admin platform console: a secondary tab bar + page outlet. */
export function PlatformLayout() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="border-b border-line bg-surface/60 px-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto">
          {SUB_TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-brand-500 text-ink"
                    : "border-transparent text-ink-muted hover:text-ink"
                )
              }
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <Outlet />
      </div>
    </div>
  );
}
