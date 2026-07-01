import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Tenant, User, UserRole } from "@/lib/api/types";
import { setAccessToken, setRefreshToken, clearTokens } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  status: "idle" | "authenticating" | "authenticated";
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

type Raw = Record<string, unknown>;

/** First non-null value among the given keys. */
function pick<T = unknown>(obj: Raw | undefined | null, ...keys: string[]): T | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}

/**
 * Map the backend's login/profile payload into our User shape.
 * Reads defensively across common FastAPI field names.
 * `roleHint` is used as a fallback when the payload doesn't include a role field.
 */
function mapUser(raw: Raw | undefined, fallbackEmail: string, roleHint?: string): User {
  const src = raw ?? {};
  const email = pick<string>(src, "email", "username") ?? fallbackEmail;
  const name =
    pick<string>(src, "name", "full_name", "display_name", "first_name") ??
    email.split("@")[0].replace(/[._]/g, " ");
  // Prefer role from the payload; fall back to the hint detected from the login
  // response; last resort is "super_admin" (legacy behaviour for super-admin login).
  const role =
    (pick<string>(src, "role") as UserRole) ??
    (roleHint as UserRole | undefined) ??
    "super_admin";
  return {
    id: String(pick(src, "id", "user_id", "sub", "_id") ?? "super-admin"),
    name,
    email,
    role,
    status: "active",
    group_ids: [],
    last_active_at: new Date().toISOString(),
    created_at: pick<string>(src, "created_at") ?? new Date().toISOString(),
  };
}

/**
 * Map the backend's tenant payload into our Tenant shape.
 * Reads defensively across common field names.
 */
function mapTenant(raw: Raw | undefined): Tenant {
  if (!raw) return PLATFORM_TENANT;
  return {
    id: String(pick(raw, "id", "tenant_id") ?? "platform"),
    name: pick<string>(raw, "name") ?? "IAlestra Platform",
    rfc: pick<string>(raw, "rfc") ?? "—",
    industry: pick<string>(raw, "industry", "industry_name") ?? "Platform",
    timezone: pick<string>(raw, "timezone") ?? "America/Mexico_City",
    plan: (pick<string>(raw, "plan", "plan_name") as Tenant["plan"]) ?? "enterprise",
    monthly_token_limit: pick<number>(raw, "monthly_token_limit") ?? 25_000_000,
  };
}

// Super admin operates at the platform level rather than a single tenant.
const PLATFORM_TENANT: Tenant = {
  id: "platform",
  name: "IAlestra Platform",
  rfc: "—",
  industry: "Platform",
  timezone: "America/Mexico_City",
  plan: "enterprise",
  monthly_token_limit: 25_000_000,
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      status: "idle",
      error: null,

      async login(email, password) {
        set({ status: "authenticating", error: null });
        try {
          const data = (await authApi.login(email, password)) as Raw;

          // ── Extract tokens ────────────────────────────────────────────────
          // The backend may return tokens at the top level or nested under
          // a `tokens` / `data` / `auth` object.
          const nested = (pick<Raw>(data, "tokens", "data", "auth") ?? data) as Raw;

          const access =
            pick<string>(data, "access_token", "accessToken", "access", "token", "jwt") ??
            pick<string>(nested, "access_token", "accessToken", "access", "token", "jwt");

          const refresh =
            pick<string>(data, "refresh_token", "refreshToken", "refresh") ??
            pick<string>(nested, "refresh_token", "refreshToken", "refresh");

          if (!access) {
            throw new Error("Signed in, but the server returned no access token.");
          }

          // Persist tokens in memory + localStorage.
          setAccessToken(access);
          if (refresh) setRefreshToken(refresh);

          // ── Decode JWT to get role early ──────────────────────────────────
          // The JWT payload is the most reliable source of the user's role
          // because it's set by the backend at token-issue time.
          let jwtRole: string | undefined;
          try {
            const payload = JSON.parse(atob(access.split(".")[1]));
            jwtRole =
              payload?.role ??
              payload?.user_role ??
              payload?.["https://ialestra.io/role"] ??
              undefined;
          } catch {
            // Non-standard JWT or parse error — ignore.
          }

          // ── Extract user profile ──────────────────────────────────────────
          // Prefer a profile embedded in the login payload; otherwise fetch it.
          // Try nested keys first, then treat the flat response as the profile
          // if it contains an email field (some backends return a flat object).
          let profile =
            pick<Raw>(data, "user", "admin", "profile", "super_admin", "account", "operator") ??
            (pick<string>(data, "email") ? (data as Raw) : undefined);

          // Detect role early — JWT claim > nested profile > flat data > nested token wrapper.
          const earlyRole =
            jwtRole ??
            pick<string>(profile ?? {}, "role") ??
            pick<string>(data, "role") ??
            pick<string>(nested, "role");

          if (!profile) {
            try {
              // Only platform_super_admin has a dedicated profile endpoint.
              // All other roles rely on the login payload + JWT claims for identity.
              if (earlyRole === "platform_super_admin" || !earlyRole) {
                const me = (await authApi.me()) as unknown as Raw;
                profile = pick<Raw>(me, "user", "admin", "profile", "super_admin", "data") ?? me;
              }
              // For tenant_admin / member / viewer: profile data comes from the
              // login response body and JWT claims — no separate profile fetch needed.
            } catch {
              /* profile route optional — fall back to the entered email */
            }
          }

          // ── Extract tenant ────────────────────────────────────────────────
          const rawTenant = pick<Raw>(data, "tenant", "organization", "company");
          const tenant = rawTenant ? mapTenant(rawTenant) : PLATFORM_TENANT;

          set({ user: mapUser(profile, email, earlyRole), tenant, status: "authenticated" });
        } catch (err) {
          set({
            status: "idle",
            error: err instanceof Error ? err.message : "Could not sign in",
          });
          throw err;
        }
      },

      async logout() {
        try {
          await authApi.logout();
        } finally {
          clearTokens();
          set({ user: null, tenant: null, status: "idle" });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "ialestra.auth",
      version: 2, // bump to invalidate stale sessions that had wrong role defaults
      // On version mismatch, reset to unauthenticated so users log in fresh.
      migrate: () => ({ user: null, tenant: null, status: "idle" as const, error: null }),
      // Only persist the identity — tokens live in localStorage separately.
      partialize: (s) => ({ user: s.user, tenant: s.tenant, status: s.status }),
    }
  )
);
