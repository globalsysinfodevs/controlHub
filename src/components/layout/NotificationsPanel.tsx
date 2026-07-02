import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  CircleAlert,
  CreditCard,
  Gauge,
  Mail,
  Megaphone,
  ShieldAlert,
  Sparkles,
  Timer,
  UserCheck,
  UserMinus,
  UserPlus,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppNotification, NotificationType } from "@/lib/api/types";
import { notificationsApi } from "@/lib/api/endpoints";
import { timeAgo } from "@/lib/utils";
import { EmptyState } from "@/components/ui/Feedback";

const TONE = {
  danger: "text-danger bg-danger/12",
  warn: "text-warn bg-warn/12",
  brand: "text-brand-600 bg-brand-500/12",
  telemetry: "text-telemetry-600 bg-telemetry-500/12",
  ok: "text-ok bg-ok/12",
  neutral: "text-ink-muted bg-ink/[0.06]",
} as const;

type Visual = { icon: LucideIcon; tone: keyof typeof TONE };

/** Per-type icon + tone for all 19 notification kinds. */
const VISUALS: Record<NotificationType, Visual> = {
  token_warning: { icon: Gauge, tone: "warn" },
  token_limit_reached: { icon: Gauge, tone: "danger" },
  group_token_warning: { icon: Gauge, tone: "warn" },
  user_token_warning: { icon: Gauge, tone: "warn" },
  pii_detected: { icon: CircleAlert, tone: "danger" },
  agent_updated: { icon: Bot, tone: "brand" },
  agent_deprecated: { icon: AlertTriangle, tone: "warn" },
  agent_execution_error: { icon: AlertTriangle, tone: "danger" },
  execution_timeout: { icon: Timer, tone: "warn" },
  execution_tool_failure: { icon: AlertTriangle, tone: "danger" },
  user_invited: { icon: UserPlus, tone: "brand" },
  user_activated: { icon: UserCheck, tone: "ok" },
  user_removed: { icon: UserMinus, tone: "neutral" },
  subscription_expiring: { icon: CreditCard, tone: "warn" },
  plan_updated: { icon: CreditCard, tone: "telemetry" },
  system_announcement: { icon: Megaphone, tone: "telemetry" },
  system_maintenance: { icon: Wrench, tone: "warn" },
  weekly_summary: { icon: Mail, tone: "telemetry" },
  security_default_password: { icon: ShieldAlert, tone: "danger" },
};

const FALLBACK_VISUAL: Visual = { icon: Megaphone, tone: "telemetry" };

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

  async function markOne(n: AppNotification) {
    if (n.read) return;
    await notificationsApi.markRead([n.id]);
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
                    const { icon: Icon, tone } = VISUALS[n.type] ?? FALLBACK_VISUAL;
                    return (
                      <li
                        key={n.id}
                        onClick={() => markOne(n)}
                        className={`flex gap-3 px-4 py-3 transition-colors hover:bg-ink/[0.02] ${
                          n.read ? "" : "cursor-pointer bg-brand-500/[0.04]"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE[tone]}`}
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
