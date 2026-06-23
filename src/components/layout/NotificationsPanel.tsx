import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  CircleAlert,
  Gauge,
  Sparkles,
  Megaphone,
} from "lucide-react";
import type { AppNotification } from "@/lib/api/types";
import { notificationsApi } from "@/lib/api/endpoints";
import { timeAgo } from "@/lib/utils";
import { EmptyState } from "@/components/ui/Feedback";

const ICONS: Record<AppNotification["type"], typeof Bot> = {
  pii_alert: CircleAlert,
  token_limit: Gauge,
  agent_update: Bot,
  llm_deprecation: AlertTriangle,
  execution_error: AlertTriangle,
  portal_update: Megaphone,
};

const TONE: Record<AppNotification["type"], string> = {
  pii_alert: "text-danger bg-danger/12",
  token_limit: "text-warn bg-warn/12",
  agent_update: "text-brand-600 bg-brand-500/12",
  llm_deprecation: "text-warn bg-warn/12",
  execution_error: "text-danger bg-danger/12",
  portal_update: "text-telemetry-600 bg-telemetry-500/12",
};

export function NotificationsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
  });

  async function markAll() {
    await notificationsApi.readAll();
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="panel absolute right-0 top-12 z-50 w-[360px] overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-600" />
                <span className="font-display text-sm font-semibold">Notificaciones</span>
              </div>
              <button onClick={markAll} className="text-2xs text-brand-600 hover:text-brand-700">
                Marcar todo leído
              </button>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {!data?.length ? (
                <EmptyState icon={<Sparkles className="h-5 w-5" />} title="Todo al día" />
              ) : (
                <ul className="divide-y divide-line">
                  {data.map((n) => {
                    const Icon = ICONS[n.type];
                    return (
                      <li
                        key={n.id}
                        className="flex gap-3 px-4 py-3 transition-colors hover:bg-ink/[0.02]"
                      >
                        <span
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE[n.type]}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-ink">{n.title}</p>
                            {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />}
                          </div>
                          <p className="mt-0.5 text-xs text-ink-muted">{n.body}</p>
                          <p className="mt-1 text-2xs text-ink-faint">{timeAgo(n.created_at)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
