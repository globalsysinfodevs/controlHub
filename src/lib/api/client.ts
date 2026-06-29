/**
 * Unified API client.
 *
 * Set VITE_USE_MOCK=false (done in .env.local) to hit the live FastAPI backend.
 * VITE_API_BASE_URL must point to the root of the FastAPI mount, e.g.:
 *   https://…/find
 * The client appends /api/v1/<path> automatically.
 *
 * Either way, callers receive the unwrapped `data` payload — the
 * `{ success, data, message }` envelope is handled here.
 */
import type { ApiPaginated } from "./types";
import { mockRequest } from "./mock/handlers";

const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "true") !== "false";

/**
 * Absolute origin + mount prefix of the backend, e.g.
 *   "https://host/find"
 * Trailing slashes and an accidental "/api/v1" suffix are trimmed.
 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "")
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/, "");

/** Build a full backend URL for a versioned path ("/auth/login" → "<base>/api/v1/auth/login"). */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}/api/v1${normalized}`;
}

/**
 * Health check — hits GET /health (outside /api/v1).
 * Returns true if the backend is reachable and healthy.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      method: "GET",
      credentials: "omit",
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Token management ─────────────────────────────────────────────────────────

let accessToken: string | null = localStorage.getItem("ialestra.token");
let refreshToken: string | null = localStorage.getItem("ialestra.refresh");
let refreshPromise: Promise<string> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) localStorage.setItem("ialestra.token", token);
  else localStorage.removeItem("ialestra.token");
}

export function setRefreshToken(token: string | null) {
  refreshToken = token;
  if (token) localStorage.setItem("ialestra.refresh", token);
  else localStorage.removeItem("ialestra.refresh");
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function clearTokens() {
  setAccessToken(null);
  setRefreshToken(null);
}

// ── Error class ───────────────────────────────────────────────────────────────

export class ApiRequestError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "ApiRequestError";
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

function withQuery(path: string, query?: RequestOptions["query"]): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Routes the deployed QA backend actually implements today. When not in mock
 * mode, only these go to the real backend; every other route transparently
 * falls back to the in-memory mock so the rest of the console keeps working
 * while the backend is built out. Add patterns here as modules are deployed.
 */
const LIVE_ROUTE_PATTERNS: RegExp[] = [
  /^\/auth(\/|$)/,
  /^\/notifications(\/|$)/,
  /^\/tenant(\/|$)/,
  /^\/users(\/|$)/,
  /^\/groups(\/|$)/,
  /^\/agents(\/|$)/,
  /^\/chat(\/|$)/,
  /^\/analytics(\/|$)/,
  /^\/audit-logs(\/|$)/,
  /^\/security(\/|$)/,
  /^\/conversations(\/|$)/,
  /^\/models(\/|$)/,
  /^\/tools(\/|$)/,
  /^\/uploads(\/|$)/,
  /^\/platform-config(\/|$)/,
  /^\/super-admin(\/|$)/,
  /^\/datasources(\/|$)/,
];

function routeIsLive(path: string): boolean {
  const clean = path.split("?")[0];
  return LIVE_ROUTE_PATTERNS.some((re) => re.test(clean));
}

// Startup banner so the active data source is visible in DevTools.
if (USE_MOCK) {
  console.info(
    "%cIAlestra%c MOCK mode — all data is in-memory. Set VITE_USE_MOCK=false in .env.local (then restart) to use the live backend.",
    "background:#6366f1;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600",
    "color:#94a3b8"
  );
} else {
  console.info(
    `%cIAlestra%c LIVE → ${API_BASE || "(relative /api/v1 via dev proxy)"}`,
    "background:#22d3ee;color:#06121a;padding:2px 6px;border-radius:4px;font-weight:600",
    "color:#94a3b8"
  );
}

// ── Token refresh ─────────────────────────────────────────────────────────────

async function doRefresh(): Promise<string> {
  const rt = refreshToken ?? localStorage.getItem("ialestra.refresh");
  if (!rt) throw new ApiRequestError(401, "no_refresh_token", "Session expired. Please log in again.");

  const res = await fetch(apiUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: rt }),
    credentials: "omit",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    clearTokens();
    throw new ApiRequestError(401, "refresh_failed", "Session expired. Please log in again.");
  }
  const newAccess: string = json.data?.access_token ?? json.data?.token;
  const newRefresh: string | undefined = json.data?.refresh_token;
  setAccessToken(newAccess);
  if (newRefresh) setRefreshToken(newRefresh);
  return newAccess;
}

/** Ensure only one refresh call is in-flight at a time. */
async function refreshOnce(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ── Core request ──────────────────────────────────────────────────────────────

/** Core request. Returns the envelope's `data` (and attaches pagination when present). */
async function request<T>(path: string, opts: RequestOptions = {}, _retry = true): Promise<T> {
  const method = opts.method ?? "GET";
  const fullPath = withQuery(path, opts.query);

  // Mock when globally enabled, OR when the route isn't deployed yet.
  if (USE_MOCK || !routeIsLive(path)) {
    try {
      const envelope = (await mockRequest(method, fullPath, opts.body as never)) as {
        data: T;
        pagination?: unknown;
      };
      return attachPagination(envelope) as T;
    } catch (err) {
      const e = err as { status?: number; code?: string; message: string };
      throw new ApiRequestError(e.status ?? 500, e.code ?? "error", e.message);
    }
  }

  // Live backend. Bearer token auth (OAuth2PasswordBearer).
  const bearer = accessToken ?? localStorage.getItem("ialestra.token");

  const res = await fetch(apiUrl(withQuery(path, opts.query)), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "omit",
  });

  // Auto-refresh on 401 (expired access token), then retry once.
  if (res.status === 401 && _retry) {
    try {
      await refreshOnce();
      return request<T>(path, opts, false);
    } catch {
      // Refresh failed — propagate the original 401.
      clearTokens();
      throw new ApiRequestError(401, "unauthorized", "Session expired. Please log in again.");
    }
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    const code = json?.error_code ?? json?.error?.code ?? "http_error";
    const message =
      json?.message ?? json?.error?.message ?? json?.detail ?? res.statusText;
    throw new ApiRequestError(res.status, code, message);
  }
  return attachPagination(json) as T;
}

/** Surface pagination metadata on the returned array (non-enumerable). */
function attachPagination(envelope: { data: unknown; pagination?: unknown }): unknown {
  if (Array.isArray(envelope.data) && envelope.pagination) {
    Object.defineProperty(envelope.data, "pagination", {
      value: envelope.pagination,
      enumerable: false,
    });
  }
  return envelope.data;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"]) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** Helper to read pagination meta off a list returned by api.get. */
export function paginationOf<T>(list: T[]): ApiPaginated<T>["pagination"] | undefined {
  return (list as unknown as { pagination?: ApiPaginated<T>["pagination"] }).pagination;
}

export const isMock = USE_MOCK;

/** True when a given route should hit the real backend (deployed + not in mock mode). */
export function useLiveFor(path: string): boolean {
  return !USE_MOCK && routeIsLive(path);
}
