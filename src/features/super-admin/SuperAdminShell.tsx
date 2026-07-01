import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { isMock } from "@/lib/api/client";
import type { UserRole } from "@/lib/api/types";

interface Tab {
  to: string;
  label: string;
  /** Roles that may see this tab. Undefined = visible to all authenticated users. */
  roles?: UserRole[];
}

const ALL_TABS: Tab[] = [
  { to: "/platform/overview",   label: "Resumen",    roles: ["platform_super_admin"] },
  { to: "/platform/tenants",    label: "Inquilinos", roles: ["platform_super_admin"] },
  { to: "/platform/industries", label: "Industrias", roles: ["platform_super_admin"] },
  { to: "/platform/users",      label: "Usuarios",   roles: ["platform_super_admin"] },
  { to: "/platform/account",    label: "Cuenta" }, // visible to all roles
];

export function SuperAdminShell() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const name = user?.name ?? "Super Admin";

  // Wait for zustand/persist to rehydrate from localStorage before filtering
  // tabs — otherwise user is null on first render and all role-gated tabs vanish.
  const [hydrated, setHydrated] = useState(false);
  useState(() => {
    // useAuth.persist.onFinishHydration fires once the store is ready.
    const unsub = useAuth.persist.onFinishHydration(() => setHydrated(true));
    // If already hydrated (e.g. fast reload), mark immediately.
    if (useAuth.persist.hasHydrated()) setHydrated(true);
    return unsub;
  });

  // Only show tabs the current user's role is allowed to access.
  // While hydrating, show all tabs so the nav doesn't flash empty.
  const tabs = !hydrated
    ? ALL_TABS
    : ALL_TABS.filter((t) => !t.roles || (user?.role && t.roles.includes(user.role)));

  return (
    <div className="min-h-screen bg-g-light">
      <nav className="sticky top-0 z-40 bg-primary shadow-nav">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-sheen">
                <ShieldCheck className="h-[18px] w-[18px] text-white" />
              </span>
              <span className="text-lg font-bold tracking-tight text-white">
                iAlestra<span className="text-secondary"> Admin de Plataforma</span>
              </span>
            </div>
            <div className="hidden items-center gap-6 md:flex">
              {tabs.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  className={({ isActive }) =>
                    cn("nav-lnk", isActive ? "active text-white" : "text-white/45 hover:text-white")
                  }
                >
                  {t.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={cn(
                "hidden items-center gap-1.5 rounded-full px-3 py-1.5 md:flex",
                isMock ? "bg-warn/20" : "bg-white/10"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 animate-pulse rounded-full",
                  isMock ? "bg-warn" : "bg-secondary"
                )}
              />
              <span className="text-xs font-medium text-white/80">
                {isMock ? "Datos de prueba" : "Backend en vivo"}
              </span>
            </div>

            <div className="relative">
              <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-sheen text-xs font-bold text-white">
                  {initials(name)}
                </span>
                <span className="hidden text-left md:block">
                  <span className="block text-xs font-semibold leading-tight text-white">{name}</span>
                  <span className="block text-xs capitalize leading-tight text-white/45">
                    {user?.role?.replace(/_/g, " ") ?? "super admin"}
                  </span>
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-white/50 md:block" />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="panel absolute right-0 top-11 z-50 w-56 overflow-hidden p-1.5"
                    >
                      <div className="border-b border-g-mid px-3 py-2.5">
                        <p className="truncate text-sm font-medium text-primary">
                          {user?.email ?? "admin@ialestra.io"}
                        </p>
                        <p className="text-2xs capitalize text-g-dark">
                          {user?.role?.replace(/_/g, " ") ?? "super admin de plataforma"}
                        </p>
                      </div>
                      <NavLink
                        to="/platform/account"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-primary transition-colors hover:bg-g-light"
                      >
                        <ShieldCheck className="h-4 w-4" /> Cuenta y seguridad
                      </NavLink>
                      <button
                        onClick={() => logout()}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
                      >
                        <LogOut className="h-4 w-4" /> Cerrar sesión
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="flex items-center gap-4 overflow-x-auto border-t border-white/10 px-4 py-2 md:hidden">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap text-sm font-medium",
                  isActive ? "text-white" : "text-white/50"
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
