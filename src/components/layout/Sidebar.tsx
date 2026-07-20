import { NavLink } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";
import { useQuery } from "@tanstack/react-query";
import { securityApi } from "@/lib/api/endpoints";
import { Wordmark } from "./Brand";
import { NAV, SECTIONS } from "./nav";

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUi();
  const collapsed = sidebarCollapsed;

  const { data: alerts } = useQuery({
    queryKey: ["security", "alerts", "nav"],
    queryFn: () => securityApi.alerts(),
  });
  const openAlerts = alerts?.filter((a) => a.status === "open").length ?? 0;

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 248 }}
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
      className="sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-line bg-surface/60 backdrop-blur-xl md:flex"
    >
      <div className={cn("flex h-16 items-center border-b border-line px-4", collapsed && "justify-center px-0")}>
        <Wordmark collapsed={collapsed} />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {SECTIONS.map((section) => {
          const items = NAV.filter((n) => n.section === section);
          return (
            <div key={section} className="mb-5">
              {!collapsed && <p className="eyebrow mb-2 px-2">{section}</p>}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const badge = item.badgeKey === "alerts" ? openAlerts : 0;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === "/"}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          cn(
                            "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                            collapsed && "justify-center px-0",
                            isActive
                              ? "bg-brand-500/12 text-ink"
                              : "text-ink-muted hover:bg-ink/[0.04] hover:text-ink"
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <motion.span
                                layoutId="nav-active"
                                className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-sheen shadow-glow-sm"
                              />
                            )}
                            <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-brand-600")} />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                            {!collapsed && !item.ready && (
                              <span className="ml-auto rounded bg-ink/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-ink-faint">
                                soon
                              </span>
                            )}
                            {badge > 0 && (
                              <span
                                className={cn(
                                  "flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white",
                                  collapsed ? "absolute right-1 top-1" : "ml-auto"
                                )}
                              >
                                {badge}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <button
        onClick={toggleSidebar}
        className="flex h-12 items-center gap-3 border-t border-line px-4 text-ink-faint transition-colors hover:text-ink"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
        {!collapsed && <span className="text-xs">Collapse</span>}
      </button>
    </motion.aside>
  );
}
