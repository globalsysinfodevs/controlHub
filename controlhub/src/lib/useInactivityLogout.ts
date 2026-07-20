/**
 * useInactivityLogout
 *
 * Automatically logs the user out after `timeoutMs` milliseconds of inactivity.
 * "Activity" is defined as any of: mousemove, mousedown, keydown, touchstart, scroll, wheel.
 *
 * A warning toast is shown `warningMs` before the timeout fires so the user
 * can interact to reset the timer.
 *
 * The hook is a no-op when the user is not authenticated.
 */
import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/store/auth";
import { toast } from "@/components/ui/Toast";

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
];

interface Options {
  /** Inactivity duration before auto-logout (default: 30 minutes). */
  timeoutMs?: number;
  /** How many ms before timeout to show a warning toast (default: 60 seconds). */
  warningMs?: number;
}

export function useInactivityLogout({
  timeoutMs = 30 * 60 * 1000,   // 30 minutes
  warningMs = 60 * 1000,         // warn 1 minute before
}: Options = {}) {
  const status = useAuth((s) => s.status);
  const logout = useAuth((s) => s.logout);

  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (warnTimer.current) clearTimeout(warnTimer.current);
    logoutTimer.current = null;
    warnTimer.current = null;
  }, []);

  const resetTimers = useCallback(() => {
    if (status !== "authenticated") return;
    clearTimers();
    warnedRef.current = false;

    // Warning timer
    const warnDelay = timeoutMs - warningMs;
    if (warnDelay > 0) {
      warnTimer.current = setTimeout(() => {
        if (!warnedRef.current) {
          warnedRef.current = true;
          toast.error(
            "Session expiring soon",
            "You will be logged out in 1 minute due to inactivity. Move the mouse or press a key to stay logged in."
          );
        }
      }, warnDelay);
    }

    // Logout timer
    logoutTimer.current = setTimeout(() => {
      void logout();
      toast.error("Session expired", "You have been logged out due to inactivity.");
    }, timeoutMs);
  }, [status, timeoutMs, warningMs, clearTimers, logout]);

  useEffect(() => {
    if (status !== "authenticated") {
      clearTimers();
      return;
    }

    // Start timers on mount / when auth state becomes authenticated.
    resetTimers();

    // Reset timers on any user activity.
    const handleActivity = () => resetTimers();
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true })
    );

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, handleActivity)
      );
    };
  }, [status, resetTimers, clearTimers]);
}
