import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Tenant, User, UserRole } from "@/lib/api/types";
import { setAccessToken, setRefreshToken, clearTokens, getAccessToken } from "@/lib/api/client";
import { authApi, tenantApi } from "@/lib/api/endpoints";

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  status: "idle" | "authenticating" | "authenticated";
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  /** Hydrate auth state directly from an acceptInvitation / activate-account response. */
  activateFromToken: (data: Raw) => Promise<User>;
  logout: () => Promise<void>;
  clearError: () => void;
}

type Raw = Record<string, unknown>;

/** True for the platform super admin (frontend + backend role spellings). */
export function isSuperAdmin(role?: string | null): boolean {
  return role === "super_admin" || role === "platform_super_admin";
}

/** Landing route after login: super admin → console, tenant users → dashboard. */
export function homePathForRole(role?: string | null): string {
  return isSuperAdmin(role) ? "/marketplace" : "/dashboard";
}

/**
 * Decode a JWT payload without verifying the signature.
 * The backend embeds `sub`, `email`, `role`, and `tenant_id` in the token,
 * which is our source of identity — there is no generic profile endpoint.
 */
function decodeJwt(token: string | undefined): Raw | null {
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json) as Raw;
  } catch {
    return null;
  }
}

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

          // ── Identity from the token ───────────────────────────────────────
          // The login response returns tokens only; role/email/tenant live in
          // the JWT claims. This is what tells us who logged in.
          const claims = decodeJwt(access) ?? {};
          const role = pick<string>(claims, "role");

          // ── Extract user profile ──────────────────────────────────────────
          // Prefer a profile embedded in the login payload. Only super admins
          // have a profile endpoint — calling it as a tenant user would 403.
          let profile = pick<Raw>(
            data,
            "user",
            "admin",
            "profile",
            "super_admin",
            "account",
            "operator"
          );
          if (!profile && isSuperAdmin(role)) {
            try {
              const me = (await authApi.me()) as Raw;
              profile = pick<Raw>(me, "user", "admin", "profile", "super_admin") ?? me;
            } catch {
              /* profile route optional — fall back to token claims */
            }
          }

          // Merge claims (base) with any richer profile (overrides) so role,
          // email, and id are always populated even without a profile payload.
          const src: Raw = { ...claims, ...(profile ?? {}) };

          // ── Extract tenant ────────────────────────────────────────────────
          const rawTenant = pick<Raw>(data, "tenant", "organization", "company");

          let tenant: Tenant;
          if (isSuperAdmin(role)) {
            tenant = rawTenant ? mapTenant(rawTenant) : PLATFORM_TENANT;
          } else {
            // For tenant users the login response rarely embeds tenant info.
            // Fetch /tenant/profile (authenticated with the token we just set)
            // to get the real company name. Fall back gracefully on any error.
            let tenantProfile: Raw | undefined = rawTenant ?? undefined;
            if (!tenantProfile || !pick<string>(tenantProfile, "name")) {
              try {
                const profileRes = await tenantApi.profile();
                tenantProfile = profileRes as unknown as Raw;
              } catch {
                /* profile fetch optional — fall back to JWT claims */
              }
            }
            tenant = mapTenant(
              tenantProfile ?? { id: pick(claims, "tenant_id"), name: "Mi organización" }
            );
          }

          const user = mapUser(src, email);
          set({ user, tenant, status: "authenticated" });
          return user;
        } catch (err) {
          set({
            status: "idle",
            error: err instanceof Error ? err.message : "Could not sign in",
          });
          throw err;
        }
      },

      async activateFromToken(data: Raw) {
        const nested = (pick<Raw>(data, "tokens", "data", "auth") ?? data) as Raw;
        const access =
          pick<string>(data, "access_token", "accessToken", "access", "token", "jwt") ??
          pick<string>(nested, "access_token", "accessToken", "access", "token", "jwt");
        const refresh =
          pick<string>(data, "refresh_token", "refreshToken", "refresh") ??
          pick<string>(nested, "refresh_token", "refreshToken", "refresh");

        if (!access) throw new Error("The server returned no access token after activation.");

        setAccessToken(access);
        if (refresh) setRefreshToken(refresh);

        const claims = decodeJwt(access) ?? {};
        const role = pick<string>(claims, "role");
        let profile = pick<Raw>(data, "user", "admin", "profile", "account");
        const src: Raw = { ...claims, ...(profile ?? {}) };

        const rawTenant = pick<Raw>(data, "tenant", "organization", "company");
        let tenant: Tenant;
        if (isSuperAdmin(role)) {
          tenant = rawTenant ? mapTenant(rawTenant) : PLATFORM_TENANT;
        } else {
          let tenantProfile: Raw | undefined = rawTenant ?? undefined;
          if (!tenantProfile || !pick<string>(tenantProfile, "name")) {
            try {
              const profileRes = await tenantApi.profile();
              tenantProfile = profileRes as unknown as Raw;
            } catch {
              /* optional */
            }
          }
          tenant = mapTenant(
            tenantProfile ?? { id: pick(claims, "tenant_id"), name: "Mi organización" }
          );
        }

        const email = pick<string>(src, "email", "username") ?? "";
        const user = mapUser(src, email);
        set({ user, tenant, status: "authenticated" });
        return user;
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
      /**
       * Persist user + tenant identity only.
       * status is intentionally NOT persisted — on every page load we derive it
       * from whether a valid access token exists in localStorage.  This means:
       *   • After logout (tokens cleared) → reopening the tab shows login.
       *   • After a hard refresh while still logged in → token present → stays authenticated.
       */
      partialize: (s) => ({ user: s.user, tenant: s.tenant }),
      /**
       * After Zustand rehydrates from localStorage, check whether an access
       * token actually exists.  If not (e.g. after logout or token expiry),
       * force status back to "idle" so RequireAuth redirects to /login.
       */
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const hasToken =
          !!getAccessToken() || !!localStorage.getItem("ialestra.token");
        if (!hasToken) {
          // No token → treat as logged out regardless of persisted user data.
          state.user = null;
          state.tenant = null;
          state.status = "idle";
        } else {
          state.status = "authenticated";
        }
      },
    }
  )
);
