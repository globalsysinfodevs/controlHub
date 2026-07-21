import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronDown, LogOut } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { isMock, subscribeAccessToken } from "@/lib/api/client";
import { useAuth, isSuperAdmin } from "@/store/auth";
import { useMarket } from "@/store/marketplace";
import { notificationsApi, normalizeNotification } from "@/lib/api/endpoints";
import { toast } from "@/components/ui/Toast";
import { NotificationsPanel } from "./NotificationsPanel";

const DASHBOARD_TAB = { to: "/dashboard", label: "Dashboard" };
const PLATFORM_TAB = { to: "/platform", label: "Plataforma" };
const TENANT_TAB   = { to: "/tenant",    label: "Tenant" };
const BASE_TABS = [
  { to: "/marketplace", label: "Marketplace" },
  { to: "/analytics", label: "Analytics" },
  // { to: "/config", label: "Configuración" }, // hidden
];

export function TopNav() {
  const { user, tenant, logout } = useAuth();
  // Super admins get the platform console; tenant_admin gets dashboard + tenant console; others get dashboard.
  const tabs = isSuperAdmin(user?.role)
    ? [PLATFORM_TAB, ...BASE_TABS]
    : user?.role === "tenant_admin"
      ? [DASHBOARD_TAB, TENANT_TAB, ...BASE_TABS]
      : [DASHBOARD_TAB, ...BASE_TABS];
  const agents = useMarket((s) => s.agents);
  const enabled = agents.filter((a) => a.enabled).length;
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const qc = useQueryClient();
  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    enabled: !!user && !isMock,
  });

  // Real-time bell via Server-Sent Events. The server pushes a `notification`
  // event per new item; we refresh the badge + panel and surface a toast.
  // Skipped in mock mode (there is no backend to stream from). Because the JWT
  // rides in the EventSource URL, we reconnect whenever the token rotates
  // (refresh) and close the stream on logout.
  useEffect(() => {
    if (isMock) return;
    let conn: { close: () => void } | null = null;

    const onNotification = (data: string) => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      try {
        const n = normalizeNotification(JSON.parse(data));
        if (n.title) toast.info(n.title, n.body || undefined);
      } catch {
        /* ignore malformed event payloads */
      }
    };

    const open = () => {
      conn?.close();
      conn = notificationsApi.stream({ onNotification });
    };

    open();
    const unsub = subscribeAccessToken((token) => {
      if (token) open(); // token rotated → reconnect with the fresh token
      else conn?.close(); // logged out → stop streaming
    });

    return () => {
      unsub();
      conn?.close();
    };
  }, [qc]);

  const orgName = tenant?.name ?? "Acme Corp";

  return (
    <nav className="sticky top-0 z-40 bg-primary shadow-nav">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand + tabs */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <img src="/logo-mark.svg" alt="iAlestra" className="h-8 w-8 select-none" draggable={false} />
            <span className="text-lg font-bold tracking-tight text-white">
              iAlestra<span className="text-secondary"> Agentic HUB</span>
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

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 md:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
            <span className="text-xs font-medium text-white/80">Plan Pro · {enabled} / 8 agentes</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              aria-label="Notificaciones"
            >
              <Bell className="h-[15px] w-[15px] text-white" />
              {unread > 0 && (
                <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full border border-primary bg-tertiary" />
              )}
            </button>
            <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
          </div>

          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-sheen text-xs font-bold text-white">
                {(orgName.match(/\b\w/g) ?? []).slice(0, 2).join("").toUpperCase()}
              </span>
              <span className="hidden text-left md:block">
                <span className="block text-xs font-semibold leading-tight text-white">{orgName}</span>
                <span className="block text-xs capitalize leading-tight text-white/45">
                  {user?.role?.replace(/_/g, " ") ?? "Admin"}
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
                      <p className="truncate text-sm font-medium text-primary">{user?.email ?? "admin@acme.mx"}</p>
                      <p className="text-2xs text-g-dark">{orgName}</p>
                    </div>
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
    </nav>
  );
}
