/**
 * BackendStatus — tiny pill that shows whether the live FastAPI backend is
 * reachable. Runs a health check on mount and every 60 s thereafter.
 *
 * States:
 *   checking  → grey pulsing dot
 *   online    → green dot  "API online"
 *   offline   → red dot    "API offline"
 *
 * Only rendered when VITE_USE_MOCK=false; in mock mode it shows nothing.
 */
import { useEffect, useState } from "react";
import { checkHealth, isMock } from "@/lib/api/client";

type Status = "checking" | "online" | "offline";

const POLL_MS = 60_000; // re-check every 60 s

export function BackendStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    if (isMock) return; // nothing to check in mock mode

    let cancelled = false;

    async function check() {
      const ok = await checkHealth();
      if (!cancelled) setStatus(ok ? "online" : "offline");
    }

    check();
    const id = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Don't render anything in mock mode
  if (isMock) return null;

  const dot =
    status === "checking"
      ? "bg-ink-faint animate-pulse"
      : status === "online"
        ? "bg-ok"
        : "bg-danger animate-pulse";

  const label =
    status === "checking" ? "Connecting…" : status === "online" ? "API online" : "API offline";

  const pill =
    status === "offline"
      ? "border-danger/30 bg-danger/10 text-danger"
      : "border-line bg-surface text-ink-muted";

  return (
    <span
      className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs transition-colors sm:inline-flex ${pill}`}
      title={`Backend: ${label}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
