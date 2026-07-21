import { NavLink, Outlet } from "react-router-dom";
import { Building2, Settings2, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SUB_TABS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/tenant",         label: "Overview",  icon: Building2, end: true },
  { to: "/tenant/users",   label: "Users",     icon: Users               },
  { to: "/tenant/config",  label: "Config",    icon: Settings2           },
];

/** Shared shell for the tenant admin console: secondary tab bar + page outlet. */
export function TenantLayout() {
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
