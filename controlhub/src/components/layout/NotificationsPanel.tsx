import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  CheckCheck,
  Inbox,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppNotification, NotificationType } from "@/lib/api/types";
import { notificationsApi } from "@/lib/api/endpoints";
import { timeAgo } from "@/lib/utils";

// ── Icon + colour per notification type ──────────────────────────────────────

const TONE_CLS = {
  danger: "text-danger bg-danger/12",
  warn: "text-warn bg-warn/12",
  brand: "text-brand-600 bg-brand-500/12",
  telemetry: "text-telemetry-600 bg-telemetry-500/12",
  ok: "text-ok bg-ok/12",
  neutral: "text-ink-muted bg-ink/[0.06]",
} as const;

type Tone = keyof typeof TONE_CLS;
type Visual = { icon: LucideIcon; tone: Tone };

const VISUALS: Record<NotificationType, Visual> = {
  token_warning:            { icon: Gauge,       tone: "warn"     },
  token_limit_reached:      { icon: Gauge,       tone: "danger"   },
  group_token_warning:      { icon: Gauge,       tone: "warn"     },
  user_token_warning:       { icon: Gauge,       tone: "warn"     },
  pii_detected:             { icon: CircleAlert, tone: "danger"   },
  agent_updated:            { icon: Bot,         tone: "brand"    },
  agent_deprecated:         { icon: AlertTriangle, tone: "warn"   },
  agent_execution_error:    { icon: AlertTriangle, tone: "danger" },
  execution_timeout:        { icon: Timer,       tone: "warn"     },
  execution_tool_failure:   { icon: AlertTriangle, tone: "danger" },
  user_invited:             { icon: UserPlus,    tone: "brand"    },
  user_activated:           { icon: UserCheck,   tone: "ok"       },
  user_removed:             { icon: UserMinus,   tone: "neutral"  },
  subscription_expiring:    { icon: CreditCard,  tone: "warn"     },
  plan_updated:             { icon: CreditCard,  tone: "telemetry"},
  system_announcement:      { icon: Megaphone,   tone: "telemetry"},
  system_maintenance:       { icon: Wrench,      tone: "warn"     },
  weekly_summary:           { icon: Mail,        tone: "telemetry"},
  security_default_password:{ icon: ShieldAlert, tone: "danger"   },
};

const FALLBACK_VISUAL: Visual = { icon: Megaphone, tone: "telemetry" };

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ open, onClose }: Props) {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const qc = useQueryClient();

  // ── Data fetching ──────────────────────────────────────────────────────────
  const {
    data: notifications = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["notifications", "list", unreadOnly],
    queryFn: () => notificationsApi.list(unreadOnly),
    enabled: open,
    staleTime: 30_000,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markOneMut = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead([id]),
    onSuccess: invalidate,
  });

  const markAllMut = useMutation({
    mutationFn: () => notificationsApi.readAll(),
    onSuccess: invalidate,
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasUnread = unreadCount > 0;

  function handleMarkOne(n: AppNotification) {
    if (n.read || markOneMut.isPending) return;
    markOneMut.mutate(n.id);
  }

  function handleMarkAll() {
    if (!hasUnread || markAllMut.isPending) return;
    markAllMut.mutate();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop — closes panel on outside click */}
          <div className="fixed inset-0 z-40" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="panel absolute right-0 top-12 z-50 w-[380px] overflow-hidden shadow-xl"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-600" />
                <span className="font-display text-sm font-semibold text-ink">
                  Notificaciones
                </span>
                {unreadCount > 0 && (
                  <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Unread filter toggle */}
                <button
                  onClick={() => setUnreadOnly((v) => !v)}
                  className={`text-2xs font-medium transition-colors ${
                    unreadOnly
                      ? "text-brand-600 underline underline-offset-2"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {unreadOnly ? "Ver todas" : "Solo no leídas"}
                </button>

                {/* Mark all read */}
                <button
                  onClick={handleMarkAll}
                  disabled={!hasUnread || markAllMut.isPending}
                  className="flex items-center gap-1 text-2xs font-medium text-brand-600 transition-colors hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Marcar todas como leídas"
                >
                  {/* Stable span prevents browser-extension DOM injection from
                      crashing React's insertBefore reconciliation on icon swap. */}
                  <span className="contents">
                    {markAllMut.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCheck className="h-3 w-3" />
                    )}
                  </span>
                  Marcar todo leído
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="max-h-[440px] overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-ink-muted">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                  <span className="text-xs">Cargando notificaciones…</span>
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-ink-muted">
                  <AlertTriangle className="h-5 w-5 text-warn" />
                  <span className="text-xs">No se pudieron cargar las notificaciones.</span>
                  <button
                    onClick={() => refetch()}
                    className="text-2xs text-brand-600 hover:underline"
                  >
                    Reintentar
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-ink-muted">
                  <Inbox className="h-6 w-6 opacity-40" />
                  <span className="text-xs font-medium">
                    {unreadOnly ? "No hay notificaciones sin leer" : "Todo al día"}
                  </span>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {notifications.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      onMarkRead={handleMarkOne}
                      isPending={markOneMut.isPending && markOneMut.variables === n.id}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* ── Footer ── */}
            {notifications.length > 0 && (
              <div className="border-t border-line px-4 py-2.5 text-center">
                <span className="text-2xs text-ink-faint">
                  {notifications.length} notificación{notifications.length !== 1 ? "es" : ""}
                  {unreadCount > 0 && ` · ${unreadCount} sin leer`}
                </span>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Single notification row ───────────────────────────────────────────────────

interface RowProps {
  notification: AppNotification;
  onMarkRead: (n: AppNotification) => void;
  isPending: boolean;
}

function NotificationRow({ notification: n, onMarkRead, isPending }: RowProps) {
  const { icon: Icon, tone } = VISUALS[n.type] ?? FALLBACK_VISUAL;

  return (
    <li
      onClick={() => onMarkRead(n)}
      className={`group flex gap-3 px-4 py-3 transition-colors ${
        n.read
          ? "opacity-70 hover:bg-ink/[0.02]"
          : "cursor-pointer bg-brand-500/[0.04] hover:bg-brand-500/[0.08]"
      }`}
    >
      {/* Icon badge — stable inner span prevents browser-extension DOM injection
          from crashing React's insertBefore reconciliation on icon swap. */}
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_CLS[tone]}`}
      >
        <span className="contents">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </span>
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium leading-snug text-ink">{n.title}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            {!n.read && (
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" title="No leída" />
            )}
          </div>
        </div>
        {n.body && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-muted">{n.body}</p>
        )}
        <p className="mt-1 text-2xs text-ink-faint">{timeAgo(n.created_at)}</p>
      </div>

      {/* Mark-read hint on hover (only for unread) */}
      {!n.read && (
        <span className="hidden shrink-0 self-center text-2xs text-brand-500 group-hover:block">
          Marcar leída
        </span>
      )}
    </li>
  );
}
