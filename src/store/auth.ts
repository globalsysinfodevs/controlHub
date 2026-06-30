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
 */
function mapUser(raw: Raw | undefined, fallbackEmail: string): User {
  const src = raw ?? {};
  const email = pick<string>(src, "email", "username") ?? fallbackEmail;
  const name =
    pick<string>(src, "name", "full_name", "display_name", "first_name") ??
    email.split("@")[0].replace(/[._]/g, " ");
  return {
    id: String(pick(src, "id", "user_id", "sub", "_id") ?? "super-admin"),
    name,
    email,
    role: (pick<string>(src, "role") as UserRole) ?? "super_admin",
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

          // ── Extract user profile ──────────────────────────────────────────
          // Prefer a profile embedded in the login payload; otherwise fetch it.
          let profile = pick<Raw>(
            data,
            "user",
            "admin",
            "profile",
            "super_admin",
            "account",
            "operator"
          );
          if (!profile) {
            try {
              const me = (await authApi.me()) as unknown as Raw;
              profile = pick<Raw>(me, "user", "admin", "profile", "super_admin") ?? me;
            } catch {
              /* profile route optional — fall back to the entered email */
            }
          }

          // ── Extract tenant ────────────────────────────────────────────────
          const rawTenant = pick<Raw>(data, "tenant", "organization", "company");
          const tenant = rawTenant ? mapTenant(rawTenant) : PLATFORM_TENANT;

          set({ user: mapUser(profile, email), tenant, status: "authenticated" });
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
      // Only persist the identity — tokens live in localStorage separately.
      partialize: (s) => ({ user: s.user, tenant: s.tenant, status: s.status }),
    }
  )
);
