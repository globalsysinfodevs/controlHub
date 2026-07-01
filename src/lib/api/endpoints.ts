/**
 * Typed endpoint functions — paths and request bodies match the FastAPI
 * Swagger spec exactly (OAS 3.1, /find/openapi.json).
 *
 * Route map (all under /api/v1 unless noted):
 *   GET  /health                              ← outside /api/v1, use checkHealth()
 *   Auth:        /auth/login  /auth/refresh  /auth/invitations/*
 *                /auth/super-admin/login|refresh|profile|change-password
 *   Super-admin: /super-admin/industries  /super-admin/tenants  /super-admin/users  /super-admin/stats
 *   Tenant:      /tenant/profile|api-access|notifications-config|plan|security-settings|models|model-defaults
 *   Users:       /users  /users/invite  /users/{id}
 *   Groups:      /groups  /groups/{id}  /groups/{id}/users  /groups/{id}/agents
 *   Agents:      /agents/categories  /agents  /agents/{id}  /agents/{id}/toggle|deployment|versions|rollback
 *   Models:      /models  /models/all  /models/available  /models/{id}
 *   Chat:        /chat  /chat/{agent_id}/message
 *   Analytics:   /analytics/dashboard  /analytics/export
 *   Audit:       /audit-logs  /audit-logs/export
 *   Security:    /security/alerts  /security/alerts/export
 *   Tools:       /tools/definitions  /tools/instances  /tools/instances/{ti_id}
 *   Datasources: /datasources/types  /datasources  /datasources/{ds_id}
 *   Notifications: /notifications/stream  /notifications  /notifications/unread-count
 *                  /notifications/mark-read  /notifications/mark-all-read
 *   Conversations: /conversations  /conversations/{id}
 *   Uploads:     /uploads
 *   Platform:    /platform-config  /platform-config/{key}
 */
import { api, apiUrl, getAccessToken, useLiveFor, setRefreshToken } from "./client";
import { mockChatStream } from "./mock/handlers";
import { agents as mockAgents } from "./mock/db";
import type {
  Agent,
  AppNotification,
  AuditEntry,
  Conversation,
  DashboardSummary,
  Group,
  SecurityAlert,
  Tool,
  User,
} from "./types";

// ── Convenience type aliases (used by feature components) ─────────────────────
/** A team member as returned by GET /api/v1/users */
export type TeamUser = User & { last_login?: string | null };
/** A group as returned by GET /api/v1/groups */
export type TeamGroup = Group;
/** An LLM model entry */
export interface LLMModel { id: string; name: string; display_name?: string; is_active: boolean; default_for_new_tenants?: boolean; deprecation_date?: string | null; }
/** Tenant plan shape */
export interface TenantPlan { plan_name: string | null; monthly_token_limit: number | null; monthly_cost: number | null; max_agents: number | null; max_users: number | null; }
/** Tenant security settings shape */
export interface TenantSecurity { azure_ad_enabled: boolean; mfa_required: boolean; allowed_ips: string[]; prompt_storage_mode: string; advanced_audit_logging: boolean; }

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export interface LoginRequest { email: string; password: string; }
export interface RefreshTokenRequest { refresh_token: string; }
export interface ChangePasswordRequest { current_password: string; new_password: string; }
export interface AcceptInvitationRequest {
  token: string;
  password: string;
  confirm_password: string;
}
export type LoginResponse = Record<string, unknown>;

/** Token pair returned by login/refresh endpoints. */
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/** GET /auth/super-admin/profile — SuperAdminProfileOut */
export interface SuperAdminProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  using_default_password: boolean;
}

export const authApi = {
  /**
   * Universal login — tries POST /auth/login first (all roles).
   * Falls back to /auth/super-admin/login on 401/403/404 so the super-admin
   * console works without knowing the role in advance.
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const body: LoginRequest = { email, password };
    try {
      return await api.post<LoginResponse>("/auth/login", body);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403 || status === 404) {
        return await api.post<LoginResponse>("/auth/super-admin/login", body);
      }
      throw err;
    }
  },

  /** POST /api/v1/auth/refresh — universal token refresh (all roles) */
  refresh: (refresh_token: string) =>
    api.post<LoginResponse>("/auth/refresh", { refresh_token } satisfies RefreshTokenRequest),

  /** POST /api/v1/auth/super-admin/refresh */
  superAdminRefresh: (refresh_token: string) =>
    api.post<LoginResponse>("/auth/super-admin/refresh", { refresh_token } satisfies RefreshTokenRequest),

  /** GET /api/v1/auth/super-admin/profile — only for platform_super_admin */
  me: () => api.get<SuperAdminProfile>("/auth/super-admin/profile"),

  /** GET /api/v1/tenant/profile — for tenant_admin / member / viewer roles */
  tenantMe: () => api.get<Record<string, unknown>>("/tenant/profile"),

  /** POST /api/v1/auth/super-admin/change-password */
  changePassword: (body: ChangePasswordRequest) =>
    api.post<null>("/auth/super-admin/change-password", body),

  /** GET /api/v1/auth/invitations/validate?token=... */
  validateInvitation: (token: string) =>
    api.get<LoginResponse>("/auth/invitations/validate", { token }),

  /** POST /api/v1/auth/invitations/accept */
  acceptInvitation: (body: AcceptInvitationRequest) =>
    api.post<LoginResponse>("/auth/invitations/accept", body),

  logout: async () => {
    setRefreshToken(null);
    return null;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Super Admin
// ─────────────────────────────────────────────────────────────────────────────

// ── Response shapes (mirror app/modules/super_admin/schemas.py) ───────────────

/** IndustryOut */
export interface Industry {
  id: string;
  name: string;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

/** TenantOut */
export interface TenantRecord {
  id: string;
  name: string;
  billing_email: string;
  rfc: string | null;
  industry_id: string | null;
  timezone: string;
  status: string;
  plan_name: string | null;
  monthly_token_limit: number | null;
  monthly_cost: number | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

/** TenantDetailOut */
export interface TenantDetail extends TenantRecord {
  user_count: number;
  active_user_count: number;
}

/** PlatformUserOut */
export interface PlatformUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  tenant_id: string | null;
  auth_provider: string;
  mfa_enabled: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

/** InvitationOut */
export interface TenantInvitation {
  id: string;
  tenant_id: string;
  user_id: string | null;
  email: string;
  name: string;
  role: string;
  expires_at: string;
  created_at: string;
}

/** PlatformStatsOut */
export interface PlatformStats {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  active_users: number;
  total_industries: number;
}

// ── Request shapes ────────────────────────────────────────────────────────────

export interface IndustryCreate { name: string; icon?: string | null; }
export interface IndustryUpdate { name?: string; icon?: string | null; }

export interface TenantCreate {
  name: string;
  billing_email: string;
  rfc?: string | null;
  industry_id?: string | null;
  timezone?: string;
  plan_name?: string | null;
  monthly_token_limit?: number | null;
  monthly_cost?: number | null;
}
export interface TenantUpdate {
  name?: string;
  billing_email?: string;
  rfc?: string | null;
  industry_id?: string | null;
  timezone?: string;
  plan_name?: string | null;
  monthly_token_limit?: number | null;
  monthly_cost?: number | null;
}
export interface InviteTenantAdminRequest { name: string; email: string; }
export interface PlatformUserStatusUpdate { status: "active" | "inactive"; }

export const superAdminApi = {
  // Industries
  /** GET /super-admin/industries — paginated */
  listIndustries: (page = 1, page_size = 100) =>
    api.get<Industry[]>("/super-admin/industries", { page, page_size }),
  createIndustry: (body: IndustryCreate) => api.post<Industry>("/super-admin/industries", body),
  updateIndustry: (id: string, body: IndustryUpdate) => api.patch<Industry>(`/super-admin/industries/${id}`, body),
  deleteIndustry: (id: string) => api.delete<null>(`/super-admin/industries/${id}`),

  // Tenants
  listTenants: (page = 1, page_size = 20, include_deleted = false) =>
    api.get<TenantRecord[]>("/super-admin/tenants", {
      page,
      page_size,
      include_deleted: include_deleted ? "true" : undefined,
    }),
  createTenant: (body: TenantCreate) => api.post<TenantRecord>("/super-admin/tenants", body),
  getTenant: (id: string) => api.get<TenantDetail>(`/super-admin/tenants/${id}`),
  updateTenant: (id: string, body: TenantUpdate) => api.patch<TenantRecord>(`/super-admin/tenants/${id}`, body),
  deleteTenant: (id: string) => api.delete<null>(`/super-admin/tenants/${id}`),
  restoreTenant: (id: string) => api.post<TenantRecord>(`/super-admin/tenants/${id}/restore`),
  inviteTenantAdmin: (tenantId: string, body: InviteTenantAdminRequest) =>
    api.post<TenantInvitation>(`/super-admin/tenants/${tenantId}/invite-admin`, body),

  // Platform users
  listUsers: (page = 1, page_size = 20, tenant_id?: string, include_deleted = false) =>
    api.get<PlatformUser[]>("/super-admin/users", {
      page,
      page_size,
      tenant_id,
      include_deleted: include_deleted ? "true" : undefined,
    }),
  getUser: (id: string) => api.get<PlatformUser>(`/super-admin/users/${id}`),
  updateUserStatus: (id: string, body: PlatformUserStatusUpdate) =>
    api.patch<PlatformUser>(`/super-admin/users/${id}/status`, body),

  // Stats
  stats: () => api.get<PlatformStats>("/super-admin/stats"),
};

// ─────────────────────────────────────────────────────────────────────────────
// Tenant configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantProfileUpdate {
  name?: string;
  rfc?: string | null;
  billing_email?: string;
  industry_id?: string | null;
  timezone?: string;
}
export interface SecuritySettingsUpdate {
  azure_ad_enabled?: boolean;
  mfa_required?: boolean;
  allowed_ips?: string[];
  prompt_storage_mode?: string;
  advanced_audit_logging?: boolean;
}
export interface NotificationsConfig {
  token_alerts_enabled: boolean;
  weekly_summary_email_enabled: boolean;
  new_agent_notifications_enabled: boolean;
  agent_error_alerts_enabled: boolean;
}
export interface PlanUpdate {
  plan_name?: string | null;
  monthly_token_limit?: number | null;
  monthly_cost?: number | null;
  max_agents?: number | null;
  max_users?: number | null;
}
export interface ModelDefaults { default_model_id: string; }

export const tenantApi = {
  profile: () => api.get<unknown>("/tenant/profile"),
  updateProfile: (body: TenantProfileUpdate) => api.put<unknown>("/tenant/profile", body),
  apiAccess: () => api.get<unknown>("/tenant/api-access"),
  regenerateApiToken: () => api.post<unknown>("/tenant/api-access/regenerate"),
  notifications: () => api.get<unknown>("/tenant/notifications-config"),
  updateNotifications: (body: NotificationsConfig) => api.put<unknown>("/tenant/notifications-config", body),
  plan: () => api.get<unknown>("/tenant/plan"),
  updatePlan: (body: PlanUpdate) => api.put<unknown>("/tenant/plan", body),
  security: () => api.get<unknown>("/tenant/security-settings"),
  updateSecurity: (body: SecuritySettingsUpdate) => api.put<unknown>("/tenant/security-settings", body),
  /** GET /api/v1/tenant/models — list active LLM models for this tenant */
  models: () => api.get<unknown[]>("/tenant/models"),
  /** GET /api/v1/tenant/model-defaults */
  modelDefaults: () => api.get<unknown>("/tenant/model-defaults"),
  /** PUT /api/v1/tenant/model-defaults */
  updateModelDefaults: (body: ModelDefaults) => api.put<unknown>("/tenant/model-defaults", body),
};

// ─────────────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────────────

export interface InviteUserRequest {
  name: string;
  email: string;
  role: "member" | "viewer";
  group_id?: string;
}
export interface UpdateUserRequest {
  name?: string;
  role?: string;
  status?: string;
  monthly_token_limit?: number | null;
}

export const usersApi = {
  /** GET /api/v1/users?page&page_size */
  list: (page = 1, page_size = 20) => api.get<TeamUser[]>("/users", { page, page_size }),
  /** POST /api/v1/users/invite */
  invite: (body: InviteUserRequest) => api.post<unknown>("/users/invite", body),
  /** GET /api/v1/users/{user_id} */
  get: (id: string) => api.get<unknown>(`/users/${id}`),
  /** PUT /api/v1/users/{user_id} */
  update: (id: string, body: UpdateUserRequest) => api.put<unknown>(`/users/${id}`, body),
  /** DELETE /api/v1/users/{user_id} */
  remove: (id: string) => api.delete<null>(`/users/${id}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Groups
// ─────────────────────────────────────────────────────────────────────────────

export interface GroupCreate { name: string; agent_ids?: string[]; monthly_token_limit?: number | null; }
export interface GroupUpdate { name?: string; monthly_token_limit?: number | null; }
export interface GroupMembersRequest { user_ids: string[]; }
export interface GroupAgentsRequest { agent_ids: string[]; }

export const groupsApi = {
  list: () => api.get<Group[]>("/groups"),
  create: (body: GroupCreate) => api.post<unknown>("/groups", body),
  get: (id: string) => api.get<unknown>(`/groups/${id}`),
  update: (id: string, body: GroupUpdate) => api.put<unknown>(`/groups/${id}`, body),
  remove: (id: string) => api.delete<null>(`/groups/${id}`),
  /** POST /api/v1/groups/{id}/users — add users */
  addUsers: (id: string, user_ids: string[]) =>
    api.post<unknown>(`/groups/${id}/users`, { user_ids } satisfies GroupMembersRequest),
  /** DELETE /api/v1/groups/{id}/users/{user_id} — remove single user */
  removeUser: (groupId: string, userId: string) =>
    api.delete<null>(`/groups/${groupId}/users/${userId}`),
  /** POST /api/v1/groups/{id}/agents — assign agents */
  addAgents: (id: string, agent_ids: string[]) =>
    api.post<unknown>(`/groups/${id}/agents`, { agent_ids } satisfies GroupAgentsRequest),
  /** DELETE /api/v1/groups/{id}/agents/{agent_id} — unassign agent */
  removeAgent: (groupId: string, agentId: string) =>
    api.delete<null>(`/groups/${groupId}/agents/${agentId}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Agents
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentCreate {
  name: string;
  description?: string;
  category_id?: string;
  model?: string;
  system_prompt?: string;
  tools?: string[];
  output_types?: string[];
  group_ids?: string[];
  temperature?: number;
}
export interface AgentUpdate {
  name?: string;
  description?: string;
  category_id?: string;
  model?: string;
  system_prompt?: string;
  tools?: string[];
  output_types?: string[];
  group_ids?: string[];
  temperature?: number;
  status?: "active" | "inactive" | "draft";
}
export interface ToggleRequest { enabled: boolean; }
export interface DeploymentUpdate { tenant_ids?: string[]; all_tenants?: boolean; }

export interface AgentQuery {
  page?: number;
  page_size?: number;
  search?: string;
  /** UUID of the category (backend uses category_id, not category name) */
  category_id?: string;
  /** Legacy alias — callers may pass category name; ignored on live backend */
  category?: string;
  /** Filter by status — used client-side only (backend doesn't support this param) */
  status?: string;
  /** Required for super admin to scope to a tenant */
  tenant_id?: string;
}

export const agentsApi = {
  /** GET /api/v1/agents/categories */
  categories: () => api.get<unknown[]>("/agents/categories"),
  /** GET /api/v1/agents — backend accepts no query params on this endpoint */
  list: (_q: AgentQuery = {}) =>
    api.get<unknown[]>("/agents"),
  /** GET /api/v1/agents/{agent_id} */
  get: (id: string) => api.get<unknown>(`/agents/${id}`),
  /** POST /api/v1/agents — super admin only */
  create: (body: AgentCreate) => api.post<unknown>("/agents", body),
  /** PUT /api/v1/agents/{agent_id} — super admin only */
  update: (id: string, body: AgentUpdate) => api.put<unknown>(`/agents/${id}`, body),
  /** DELETE /api/v1/agents/{agent_id} — super admin only */
  remove: (id: string) => api.delete<null>(`/agents/${id}`),
  /** POST /api/v1/agents/{agent_id}/toggle — enable/disable for tenant */
  toggle: (id: string, enabled: boolean) =>
    api.post<unknown>(`/agents/${id}/toggle`, { enabled } satisfies ToggleRequest),
  /** PUT /api/v1/agents/{agent_id}/deployment */
  updateDeployment: (id: string, body: DeploymentUpdate) =>
    api.put<unknown>(`/agents/${id}/deployment`, body),
  /** GET /api/v1/agents/{agent_id}/versions */
  versions: (id: string) => api.get<unknown[]>(`/agents/${id}/versions`),
  /** POST /api/v1/agents/{agent_id}/rollback/{version_id} */
  rollback: (agentId: string, versionId: string) =>
    api.post<unknown>(`/agents/${agentId}/rollback/${versionId}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Models (LLM)
// ─────────────────────────────────────────────────────────────────────────────

export interface ModelCreate { name: string; display_name?: string; default_for_new_tenants?: boolean; }
export interface ModelUpdate { is_active?: boolean; default_for_new_tenants?: boolean; display_name?: string; }

export const modelsApi = {
  /** GET /api/v1/models — active models */
  list: () => api.get<unknown[]>("/models"),
  /** GET /api/v1/models/all — full catalogue (super admin) */
  listAll: () => api.get<unknown[]>("/models/all"),
  /** GET /api/v1/models/available — addable models */
  available: () => api.get<string[]>("/models/available"),
  /** POST /api/v1/models — super admin */
  add: (body: ModelCreate) => api.post<unknown>("/models", body),
  /** PUT /api/v1/models/{model_id} — super admin */
  update: (id: string, body: ModelUpdate) => api.put<unknown>(`/models/${id}`, body),
  /** DELETE /api/v1/models/{model_id} — deactivate */
  remove: (id: string) => api.delete<null>(`/models/${id}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Chat
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatRequest {
  agent_id: string;
  prompt: string;
  stream?: boolean;
  conversation_id?: string | null;
}
export interface MessageRequest {
  content: string;
  role?: "user" | "assistant" | "system";
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsApi = {
  /** GET /api/v1/analytics/dashboard?period=7|30|90 */
  dashboard: (period: 7 | 30 | 90 = 30) =>
    api.get<DashboardSummary>("/analytics/dashboard", { period }),
  /** GET /api/v1/analytics/export */
  export: (params?: Record<string, string | number | undefined>) =>
    api.get<unknown>("/analytics/export", params),
};

// Keep legacy alias so existing callers don't break.
export const dashboardApi = {
  summary: (range: 7 | 30 | 90 = 30) => analyticsApi.dashboard(range),
};

// ─────────────────────────────────────────────────────────────────────────────
// Audit logs
// ─────────────────────────────────────────────────────────────────────────────

export const auditApi = {
  /** GET /api/v1/audit-logs?status&page&page_size */
  list: (status?: string, page = 1, page_size = 20) =>
    api.get<AuditEntry[]>("/audit-logs", { status, page, page_size }),
  /** GET /api/v1/audit-logs/export */
  export: () => api.get<unknown>("/audit-logs/export"),
};

// ─────────────────────────────────────────────────────────────────────────────
// Security alerts
// ─────────────────────────────────────────────────────────────────────────────

export const securityApi = {
  /** GET /api/v1/security/alerts?page&page_size */
  alerts: (page = 1, page_size = 20) =>
    api.get<SecurityAlert[]>("/security/alerts", { page, page_size }),
  /** GET /api/v1/security/alerts/export */
  export: () => api.get<unknown>("/security/alerts/export"),
};

// ─────────────────────────────────────────────────────────────────────────────
// Tools
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolInstanceCreate { name: string; tool_type: string; config?: Record<string, unknown> | null; }
export interface ToolInstanceUpdate { name?: string; config?: Record<string, unknown> | null; }

export const toolsApi = {
  /** GET /api/v1/tools/definitions */
  definitions: () => api.get<Tool[]>("/tools/definitions"),
  /** Alias for definitions() — legacy callers use toolsApi.list() */
  list: () => api.get<Tool[]>("/tools/definitions"),
  /** GET /api/v1/tools/instances */
  instances: () => api.get<unknown[]>("/tools/instances"),
  /** POST /api/v1/tools/instances */
  createInstance: (body: ToolInstanceCreate) => api.post<unknown>("/tools/instances", body),
  /** PUT /api/v1/tools/instances/{ti_id} */
  updateInstance: (id: string, body: ToolInstanceUpdate) => api.put<unknown>(`/tools/instances/${id}`, body),
  /** DELETE /api/v1/tools/instances/{ti_id} */
  deleteInstance: (id: string) => api.delete<null>(`/tools/instances/${id}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Datasources
// ─────────────────────────────────────────────────────────────────────────────

export interface DataSourceCreate {
  name: string;
  type: string;
  connection_string?: string | null;
  config?: Record<string, unknown> | null;
}
export interface DataSourceUpdate {
  name?: string;
  connection_string?: string | null;
  config?: Record<string, unknown> | null;
}

export const datasourcesApi = {
  /** GET /api/v1/datasources/types */
  types: () => api.get<unknown[]>("/datasources/types"),
  /** GET /api/v1/datasources */
  list: () => api.get<unknown[]>("/datasources"),
  /** POST /api/v1/datasources */
  create: (body: DataSourceCreate) => api.post<unknown>("/datasources", body),
  /** PUT /api/v1/datasources/{ds_id} */
  update: (id: string, body: DataSourceUpdate) => api.put<unknown>(`/datasources/${id}`, body),
  /** DELETE /api/v1/datasources/{ds_id} */
  remove: (id: string) => api.delete<null>(`/datasources/${id}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────

export interface MarkReadRequest { notification_ids: string[]; }

export const notificationsApi = {
  /** GET /api/v1/notifications?unread_only&page&page_size */
  list: (unreadOnly = false, page = 1, page_size = 50) =>
    api.get<AppNotification[]>("/notifications", {
      unread_only: unreadOnly ? "true" : undefined,
      page,
      page_size,
    }),
  /** GET /api/v1/notifications/unread-count */
  unreadCount: () => api.get<{ count: number } | number>("/notifications/unread-count"),
  /** POST /api/v1/notifications/mark-read */
  markRead: (ids: string[]) =>
    api.post<null>("/notifications/mark-read", { notification_ids: ids } satisfies MarkReadRequest),
  /** POST /api/v1/notifications/mark-all-read */
  readAll: () => api.post<null>("/notifications/mark-all-read"),
  /**
   * GET /api/v1/notifications/stream — SSE real-time stream.
   * Returns the raw EventSource so the caller can attach listeners.
   */
  stream: (): EventSource => {
    const token = getAccessToken() ?? localStorage.getItem("ialestra.token");
    const url = new URL(apiUrl("/notifications/stream"));
    if (token) url.searchParams.set("token", token);
    return new EventSource(url.toString());
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Conversations
// ─────────────────────────────────────────────────────────────────────────────

export const conversationsApi = {
  /** GET /api/v1/conversations */
  list: () => api.get<Conversation[]>("/conversations"),
  /** GET /api/v1/conversations/{conversation_id} */
  get: (id: string) => api.get<unknown>(`/conversations/${id}`),
  /** DELETE /api/v1/conversations/{conversation_id} */
  remove: (id: string) => api.delete<null>(`/conversations/${id}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Uploads
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadedFileResponse {
  id: string;
  filename: string;
  status: string;
  tool_type: string;
  created_at: string;
}

export const uploadsApi = {
  /** GET /api/v1/uploads */
  list: () => api.get<UploadedFileResponse[]>("/uploads"),
  /**
   * POST /api/v1/uploads — multipart/form-data.
   * Uses raw fetch because the body is FormData, not JSON.
   */
  upload: async (file: File, tool_type: string): Promise<UploadedFileResponse> => {
    const token = getAccessToken() ?? localStorage.getItem("ialestra.token");
    const form = new FormData();
    form.append("file", file);
    form.append("tool_type", tool_type);
    const res = await fetch(apiUrl("/uploads"), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      credentials: "omit",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.message ?? json?.detail ?? "Upload failed");
    // Backend may return the file directly or wrapped in { success, data }
    return (json?.data ?? json) as UploadedFileResponse;
  },
  /** DELETE /api/v1/uploads/{file_id} */
  remove: (id: string) => api.delete<null>(`/uploads/${id}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Platform config (super admin)
// ─────────────────────────────────────────────────────────────────────────────

export interface PlatformConfigUpdateRequest { value: unknown; }
export interface PlatformConfigResponse { key: string; value: unknown; description: string | null; }

export const platformConfigApi = {
  /** GET /api/v1/platform-config */
  list: () => api.get<PlatformConfigResponse[]>("/platform-config"),
  /** GET /api/v1/platform-config/{key} */
  get: (key: string) => api.get<PlatformConfigResponse>(`/platform-config/${key}`),
  /** PUT /api/v1/platform-config/{key} */
  upsert: (key: string, value: unknown) =>
    api.put<PlatformConfigResponse>(`/platform-config/${key}`, { value } satisfies PlatformConfigUpdateRequest),
};

// ─────────────────────────────────────────────────────────────────────────────
// Streaming chat
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stream an agent execution via SSE.
 * - Mock mode: drives the local simulator.
 * - Live mode: POST /api/v1/chat with stream:true, consumes SSE chunks.
 */
export async function* streamChat(
  agentId: string,
  prompt: string,
  conversationId?: string | null
): AsyncGenerator<{ delta?: string; done?: boolean; tokens?: number }> {
  if (!useLiveFor("/chat")) {
    const agent = (mockAgents as { id: string }[]).find((a) => a.id === agentId) ?? mockAgents[0];
    yield* mockChatStream(agent as Parameters<typeof mockChatStream>[0], prompt);
    return;
  }

  const token = getAccessToken() ?? localStorage.getItem("ialestra.token");
  const body: ChatRequest = {
    agent_id: agentId,
    prompt,
    stream: true,
    conversation_id: conversationId ?? null,
  };
  const res = await fetch(apiUrl("/chat"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    credentials: "omit",
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
      if (!line || line === "[DONE]") { yield { done: true }; continue; }
      try {
        const parsed = JSON.parse(line);
        yield { delta: parsed.delta, tokens: parsed.tokens };
      } catch {
        yield { delta: line };
      }
    }
  }
}

/**
 * Non-streaming chat — POST /api/v1/chat/{agent_id}/message
 * Returns the full assistant reply in one shot.
 */
export function sendMessage(agentId: string, content: string) {
  return api.post<unknown>(`/chat/${agentId}/message`, { content } satisfies MessageRequest);
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy / compatibility aliases
// ─────────────────────────────────────────────────────────────────────────────

/**
 * groupsApiLive — alias for groupsApi.
 * Some components import this name; it is identical to groupsApi.
 */
export const groupsApiLive = groupsApi;

/**
 * marketplaceApi — thin wrapper around agentsApi for the marketplace store.
 * list()   → GET /api/v1/agents (returns Agent[])
 * toggle() → POST /api/v1/agents/{id}/toggle
 */
export const marketplaceApi = {
  list: () => agentsApi.list({ page_size: 100 }) as Promise<Agent[]>,
  toggle: (id: string, enabled: boolean) => agentsApi.toggle(id, enabled),
};
