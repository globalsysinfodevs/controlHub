/** Typed endpoint functions grouped by domain module. */
import { api, apiUrl, getAccessToken, useLiveFor } from "./client";
import { mockChatStream } from "./mock/handlers";
import { agents as mockAgents } from "./mock/db";
import type {
  Agent,
  AppNotification,
  AuditEntry,
  AuthSession,
  Conversation,
  DashboardSummary,
  Group,
  SecurityAlert,
  Tool,
  User,
} from "./types";

/** Raw login payload — the backend returns tokens (+ maybe a profile) in `data`. */
export type LoginResponse = Record<string, unknown>;

export const authApi = {
  // Tenant-user portal login (POST /api/v1/auth/login). Falls back to the
  // super-admin endpoint so the delivery team can use the same form.
  async login(email: string, password: string) {
    try {
      return await api.post<LoginResponse>("/auth/login", { email, password });
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403 || status === 404) {
        return await api.post<LoginResponse>("/auth/super-admin/login", { email, password });
      }
      throw err;
    }
  },
  // GET /api/v1/auth/super-admin/profile (super admin). Tenant users get their
  // identity from the login payload, so this is only a best-effort fallback.
  me: () => api.get<LoginResponse>("/auth/super-admin/profile"),
  refresh: (refresh_token: string) =>
    api.post<LoginResponse>("/auth/refresh", { refresh_token }),
  logout: async () => null,
};

export const dashboardApi = {
  summary: (range: 7 | 30 | 90) =>
    api.get<DashboardSummary>("/analytics/summary", { range }),
};

export interface AgentQuery {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export const agentsApi = {
  list: (q: AgentQuery = {}) =>
    api.get<Agent[]>("/agents", {
      search: q.search,
      category: q.category,
      status: q.status,
      page: q.page,
      page_size: q.page_size,
    }),
  get: (id: string) => api.get<Agent>(`/agents/${id}`),
  create: (body: Partial<Agent>) => api.post<Agent>("/agents", body),
  update: (id: string, body: Partial<Agent>) => api.patch<Agent>(`/agents/${id}`, body),
  remove: (id: string) => api.delete<null>(`/agents/${id}`),
};

// ── Team: users + groups (live /users, /groups) ─────────────────────────────
export interface TeamUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  auth_provider: string;
  last_login: string | null;
  monthly_token_limit: number | null;
  group_ids: string[];
  created_at: string;
}
export interface TeamGroup {
  id: string;
  name: string;
  monthly_token_limit: number | null;
  member_count: number;
  agent_ids: string[];
  user_ids: string[];
  created_at: string;
}

export const usersApi = {
  list: (page = 1) => api.get<TeamUser[]>("/users", { page, page_size: 50 }),
  invite: (body: { name: string; email: string; role: "member" | "viewer"; group_id?: string }) =>
    api.post<unknown>("/users/invite", body),
  update: (id: string, body: { role?: string; status?: string }) => api.put<TeamUser>(`/users/${id}`, body),
  remove: (id: string) => api.delete<null>(`/users/${id}`),
};

export const groupsApiLive = {
  list: () => api.get<TeamGroup[]>("/groups"),
  create: (body: { name: string; agent_ids?: string[] }) => api.post<TeamGroup>("/groups", body),
  update: (id: string, body: { name?: string }) => api.put<TeamGroup>(`/groups/${id}`, body),
  remove: (id: string) => api.delete<null>(`/groups/${id}`),
  addUsers: (id: string, user_ids: string[]) => api.post<TeamGroup>(`/groups/${id}/users`, { user_ids }),
  addAgents: (id: string, agent_ids: string[]) => api.post<TeamGroup>(`/groups/${id}/agents`, { agent_ids }),
};

// ── Live marketplace (real backend /agents) ──────────────────────────────────
import type { CatalogAgent } from "@/features/marketplace/data";

interface BackendAgent {
  id: string;
  name: string;
  description: string | null;
  category_name: string | null;
  model_name: string | null;
  output_types: string[];
  capabilities: string[];
  example_questions: string[];
  tools: string[];
  enabled: boolean;
}

const CAT_ICON: Record<string, string> = {
  Finanzas: "📊",
  Marketing: "🎯",
  RRHH: "👥",
  Legal: "⚖️",
  Operaciones: "🔗",
  CS: "🔮",
};

function toCatalog(a: BackendAgent): CatalogAgent {
  const cat = a.category_name ?? "Operaciones";
  return {
    id: a.id,
    icon: CAT_ICON[cat] ?? "🤖",
    name: a.name,
    cat,
    model: a.model_name ?? "—",
    desc: a.description ?? "",
    caps: a.capabilities ?? [],
    tools: a.tools ?? [],
    prompts: a.example_questions ?? [],
    collab: [],
    queries: 0,
    tokens: "—",
    latency: "—",
    output: (a.output_types ?? []).join(" + ") || "Chat",
    enabled: !!a.enabled,
  };
}

export const marketplaceApi = {
  /** GET /agents → mapped to the marketplace card shape. */
  async list(): Promise<CatalogAgent[]> {
    const agents = await api.get<BackendAgent[]>("/agents", { page: 1, page_size: 100 });
    return agents.map(toCatalog);
  },
  /** POST /agents/{id}/toggle — enable/disable for the current tenant. */
  toggle: (id: string, enabled: boolean) => api.post<BackendAgent>(`/agents/${id}/toggle`, { enabled }),
};

// ── Live analytics dashboard (real backend /analytics/dashboard) ─────────────
export const analyticsApi = {
  dashboard: (period: 7 | 30 | 90) =>
    api.get<unknown>("/analytics/dashboard", { period }),
};

// ── Live tenant configuration (real backend /tenant/*) ───────────────────────
export interface TenantProfile {
  id: string;
  name: string;
  rfc: string | null;
  billing_email: string;
  industry_id: string | null;
  timezone: string;
  plan_name: string | null;
}
export interface TenantApiAccess {
  tenant_id: string;
  api_token: string | null;
  endpoint_base: string;
}
export interface TenantNotifications {
  token_alerts_enabled: boolean;
  weekly_summary_email_enabled: boolean;
  new_agent_notifications_enabled: boolean;
  agent_error_alerts_enabled: boolean;
}

// ── Platform LLM model catalogue (real backend /models, super admin) ─────────
export interface LLMModel {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
  deprecation_date: string | null;
  default_for_new_tenants: boolean;
}
export const modelsApi = {
  listAll: () => api.get<LLMModel[]>("/models/all"),
  available: () => api.get<string[]>("/models/available"),
  add: (body: { name: string; display_name?: string; default_for_new_tenants?: boolean }) =>
    api.post<LLMModel>("/models", body),
  update: (id: string, body: { is_active?: boolean; default_for_new_tenants?: boolean; display_name?: string }) =>
    api.put<LLMModel>(`/models/${id}`, body),
  remove: (id: string) => api.delete<null>(`/models/${id}`),
};

export interface TenantPlan {
  plan_name: string | null;
  monthly_token_limit: number | null;
  monthly_cost: number | null;
  max_agents: number | null;
  max_users: number | null;
}
export interface TenantSecurity {
  azure_ad_enabled: boolean;
  mfa_required: boolean;
  allowed_ips: string[];
  prompt_storage_mode: string;
  advanced_audit_logging: boolean;
}

export const tenantApi = {
  profile: () => api.get<TenantProfile>("/tenant/profile"),
  updateProfile: (body: Partial<TenantProfile>) => api.put<TenantProfile>("/tenant/profile", body),
  apiAccess: () => api.get<TenantApiAccess>("/tenant/api-access"),
  notifications: () => api.get<TenantNotifications>("/tenant/notifications-config"),
  updateNotifications: (body: TenantNotifications) =>
    api.put<TenantNotifications>("/tenant/notifications-config", body),
  plan: () => api.get<TenantPlan>("/tenant/plan"),
  updatePlan: (body: Partial<TenantPlan>) => api.put<TenantPlan>("/tenant/plan", body),
  security: () => api.get<TenantSecurity>("/tenant/security-settings"),
  updateSecurity: (body: Partial<TenantSecurity>) => api.put<TenantSecurity>("/tenant/security-settings", body),
};

export const groupsApi = { list: () => api.get<Group[]>("/groups") };
export const toolsApi = { list: () => api.get<Tool[]>("/tools") };
export const conversationsApi = { list: () => api.get<Conversation[]>("/conversations") };

export const securityApi = {
  alerts: (page = 1) => api.get<SecurityAlert[]>("/security/alerts", { page, page_size: 50 }),
};

export const auditApi = {
  list: (status?: string, page = 1) =>
    api.get<AuditEntry[]>("/audit-logs", { status, page, page_size: 20 }),
};

export const notificationsApi = {
  // Deployed: GET /api/v1/notifications?unread_only&page&page_size (paginated).
  list: (unreadOnly = false) =>
    api.get<AppNotification[]>("/notifications", {
      unread_only: unreadOnly ? "true" : undefined,
      page: 1,
      page_size: 50,
    }),
  // Deployed: GET /api/v1/notifications/unread-count.
  unreadCount: () => api.get<{ count: number } | number>("/notifications/unread-count"),
  // Deployed: POST /api/v1/notifications/mark-read (body { notification_ids }).
  markRead: (ids: string[]) => api.post<null>("/notifications/mark-read", { notification_ids: ids }),
  // Deployed: POST /api/v1/notifications/mark-all-read.
  readAll: () => api.post<null>("/notifications/mark-all-read"),
};

/**
 * Stream an agent execution. In mock mode this drives the local simulator;
 * against the live backend it would consume the SSE stream from /chat.
 */
export async function* streamChat(
  agentId: string,
  prompt: string
): AsyncGenerator<{ delta?: string; done?: boolean; tokens?: number }> {
  // Execution isn't deployed yet — drive the local simulator unless /chat is live.
  if (!useLiveFor("/chat")) {
    const agent = mockAgents.find((a) => a.id === agentId) ?? mockAgents[0];
    yield* mockChatStream(agent, prompt);
    return;
  }

  const token = getAccessToken() ?? localStorage.getItem("ialestra.token");
  const res = await fetch(apiUrl("/chat"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ agent_id: agentId, prompt, stream: true }),
    credentials: "include",
  });
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const evt of events) {
      const line = evt.replace(/^data:\s*/, "").trim();
      if (!line || line === "[DONE]") {
        yield { done: true };
        continue;
      }
      try {
        const parsed = JSON.parse(line);
        yield { delta: parsed.delta, tokens: parsed.tokens };
      } catch {
        yield { delta: line };
      }
    }
  }
}
