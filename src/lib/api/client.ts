/**
 * Unified API client. By default it runs against the in-memory mock backend so
 * the console is fully usable today. Set VITE_USE_MOCK=false to hit the live
 * FastAPI backend (proxied via Vite to http://localhost:8000).
 *
 * Either way, callers receive the unwrapped `data` payload — the
 * `{ success, data, message }` envelope is handled here.
 */
import type { ApiPaginated } from "./types";
import { mockRequest } from "./mock/handlers";

const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "true") !== "false";

/**
 * Absolute origin of the backend, e.g. "https://api.example.com".
 * - Leave EMPTY in local dev → requests go to relative "/api/v1/…" and the
 *   Vite dev proxy (vite.config.ts → VITE_API_TARGET) forwards them.
 * - Set to your DEPLOYED backend URL for production builds, where there is no
 *   dev proxy and the static frontend must call the backend directly.
 * Trailing slashes and an accidental "/api/v1" suffix are trimmed.
 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "")
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/, "");

/** Build a full backend URL for a versioned path ("/auth/login" → ".../api/v1/auth/login"). */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}/api/v1${normalized}`;
}

let accessToken: string | null = localStorage.getItem("ialestra.token");

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) localStorage.setItem("ialestra.token", token);
  else localStorage.removeItem("ialestra.token");
}

export function getAccessToken() {
  return accessToken;
}

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
    `%cIAlestra%c LIVE (hybrid) → ${API_BASE || "(relative /api/v1 via dev proxy)"}\n` +
      `Real backend for: ${LIVE_ROUTE_PATTERNS.map((r) => r.source).join(", ")}\n` +
      `All other screens (dashboard, agents, chat, users…) still use mock — those routes aren't deployed yet.`,
    "background:#22d3ee;color:#06121a;padding:2px 6px;border-radius:4px;font-weight:600",
    "color:#94a3b8"
  );
}

/** Core request. Returns the envelope's `data` (and attaches pagination when present). */
async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
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

  // Live backend (deployed route). In dev with an empty API_BASE this is a
  // relative path the Vite proxy forwards; otherwise it is the absolute backend
  // URL. Auth is bearer-token (OAuth2PasswordBearer), so no cookies are needed —
  // "omit" keeps CORS simple against the cross-origin deployment.
  //
  // The access token from login is attached as `Authorization: Bearer <token>`
  // on EVERY request. We fall back to localStorage so the header survives
  // reloads and any in-memory desync.
  const bearer = accessToken ?? localStorage.getItem("ialestra.token");
  const res = await fetch(`${apiUrl(path)}${withQuery("", opts.query)}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "omit",
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    // The backend's error envelope is { success:false, error_code, message }.
    // Also tolerate FastAPI defaults ({ detail }) and a nested { error:{...} }.
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
