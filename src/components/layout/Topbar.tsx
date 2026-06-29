import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, Command, LogOut, Search, Settings, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/store/auth";
import { useUi } from "@/store/ui";
import { notificationsApi } from "@/lib/api/endpoints";
import { Sigil } from "@/components/ui/Sigil";
import { StatusDot } from "@/components/ui/Badge";
import { BackendStatus } from "@/components/ui/BackendStatus";
import { NotificationsPanel } from "./NotificationsPanel";

export function Topbar({ title }: { title: string }) {
  const { user, tenant, logout } = useAuth();
  const setCommandOpen = useUi((s) => s.setCommandOpen);
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
  });
  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-base/70 px-5 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate font-display text-lg font-semibold tracking-tight">{title}</h1>
        <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-2xs text-ink-muted sm:inline-flex">
          <StatusDot tone="ok" pulse />
          {tenant?.name}
        </span>
        <BackendStatus />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setCommandOpen(true)}
          className="hidden h-9 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink-faint transition-colors hover:border-brand-500/40 hover:text-ink-muted lg:flex"
        >
          <Search className="h-4 w-4" />
          <span>Search or jump to…</span>
          <kbd className="ml-2 flex items-center gap-0.5 rounded border border-line px-1.5 py-0.5 font-mono text-2xs text-ink-faint">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>

        <button
          onClick={() => setCommandOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink-muted hover:text-ink lg:hidden"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink-muted transition-colors hover:text-ink"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                {unread}
              </span>
            )}
          </button>
          <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-line-strong bg-surface py-1 pl-1 pr-2 transition-colors hover:border-brand-500/40"
          >
            <Sigil seed={user?.id ?? "u"} name={user?.name ?? "User"} size="sm" />
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-medium leading-tight text-ink">{user?.name}</span>
              <span className="block text-2xs capitalize leading-tight text-ink-faint">
                {user?.role.replace("_", " ")}
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-ink-faint" />
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
                  className="panel absolute right-0 top-12 z-50 w-56 overflow-hidden p-1.5"
                >
                  <div className="border-b border-line px-3 py-2.5">
                    <p className="truncate text-sm font-medium text-ink">{user?.email}</p>
                    <p className="text-2xs text-ink-faint">{tenant?.name}</p>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/tenant");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-ink/[0.05] hover:text-ink"
                  >
                    <Settings className="h-4 w-4" /> Workspace settings
                  </button>
                  <button
                    onClick={() => logout()}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
