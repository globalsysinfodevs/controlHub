/**
 * Typed endpoint functions â€” paths and request bodies match the FastAPI
 * Swagger spec exactly (OAS 3.1, /find/openapi.json).
 *
 * Route map (all under /api/v1 unless noted):
 *   GET  /health                              â† outside /api/v1, use checkHealth()
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
  AgentCategory,
  AppNotification,
  AuditEntry,
  Conversation,
  DashboardSummary,
  Group,
  NotificationType,
  SecurityAlert,
  Tool,
  User,
} from "./types";

// â”€â”€ Convenience type aliases (used by feature components) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Auth
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface LoginRequest { email: string; password: string; }
export interface RefreshTokenRequest { refresh_token: string; }
export interface ChangePasswordRequest { current_password: string; new_password: string; }
export interface AcceptInvitationRequest {
  token: string;
  password: string;
  confirm_password: string;
}
export type LoginResponse = Record<string, unknown>;

export const authApi = {
  /**
   * Universal login â€” tries POST /auth/login first (all roles).
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

  /** POST /api/v1/auth/refresh â€” universal token refresh (all roles) */
  refresh: (refresh_token: string) =>
    api.post<LoginResponse>("/auth/refresh", { refresh_token } satisfies RefreshTokenRequest),

  /** POST /api/v1/auth/super-admin/refresh */
  superAdminRefresh: (refresh_token: string) =>
    api.post<LoginResponse>("/auth/super-admin/refresh", { refresh_token } satisfies RefreshTokenRequest),

  /**
   * GET /api/v1/auth/super-admin/profile â€” super admin only.
   * Tenant users have no profile endpoint; identity comes from the JWT claims.
   * Callers must guard this with isSuperAdmin(role) to avoid a 403.
   */
  me: () => api.get<LoginResponse>("/auth/super-admin/profile"),

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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Super Admin
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€ Domain models (match backend super_admin/schemas.py exactly) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** GET /super-admin/industries item â€” IndustryOut */
export interface Industry {
  id: string;
  name: string;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

/** GET /super-admin/tenants item â€” TenantOut */
export interface PlatformTenant {
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

/** GET /super-admin/tenants/{id} â€” TenantDetailOut (adds member counts) */
export interface PlatformTenantDetail extends PlatformTenant {
  user_count: number;
  active_user_count: number;
}

/** POST /super-admin/tenants/{id}/invite-admin response â€” InvitationOut */
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

/** GET /super-admin/users item â€” PlatformUserOut */
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

/** GET /super-admin/stats â€” PlatformStatsOut */
export interface PlatformStats {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  active_users: number;
  total_industries: number;
}

// â”€â”€ Request bodies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  listIndustries: (page = 1, page_size = 50) =>
    api.get<Industry[]>("/super-admin/industries", { page, page_size }),
  createIndustry: (body: IndustryCreate) => api.post<Industry>("/super-admin/industries", body),
  updateIndustry: (id: string, body: IndustryUpdate) =>
    api.patch<Industry>(`/super-admin/industries/${id}`, body),
  deleteIndustry: (id: string) => api.delete<null>(`/super-admin/industries/${id}`),

  // Tenants
  listTenants: (page = 1, page_size = 20, include_deleted = false) =>
    api.get<PlatformTenant[]>("/super-admin/tenants", { page, page_size, include_deleted: String(include_deleted) }),
  createTenant: (body: TenantCreate) => api.post<PlatformTenant>("/super-admin/tenants", body),
  getTenant: (id: string) => api.get<PlatformTenantDetail>(`/super-admin/tenants/${id}`),
  updateTenant: (id: string, body: TenantUpdate) =>
    api.patch<PlatformTenant>(`/super-admin/tenants/${id}`, body),
  deleteTenant: (id: string) => api.delete<null>(`/super-admin/tenants/${id}`),
  restoreTenant: (id: string) => api.post<PlatformTenant>(`/super-admin/tenants/${id}/restore`),
  inviteTenantAdmin: (tenantId: string, body: InviteTenantAdminRequest) =>
    api.post<TenantInvitation>(`/super-admin/tenants/${tenantId}/invite-admin`, body),

  // Platform users
  listUsers: (page = 1, page_size = 20, opts?: { tenant_id?: string; include_deleted?: boolean }) =>
    api.get<PlatformUser[]>("/super-admin/users", {
      page,
      page_size,
      tenant_id: opts?.tenant_id,
      include_deleted: opts?.include_deleted ? "true" : undefined,
    }),
  getUser: (id: string) => api.get<PlatformUser>(`/super-admin/users/${id}`),
  updateUserStatus: (id: string, body: PlatformUserStatusUpdate) =>
    api.patch<PlatformUser>(`/super-admin/users/${id}/status`, body),

  // Stats
  stats: () => api.get<PlatformStats>("/super-admin/stats"),
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tenant configuration
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
/** GET/PUT /tenant/model-defaults â€” matches backend ModelDefaults schema. */
export interface ModelDefaults {
  default_analysis_model_id: string | null;
  default_chat_model_id: string | null;
}

// â”€â”€ Tenant output models (match tenant/schemas.py) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** GET /tenant/profile â€” TenantProfileOut */
export interface TenantProfile {
  id: string;
  name: string;
  rfc: string | null;
  billing_email: string;
  industry_id: string | null;
  timezone: string;
  status: string;
  plan_name: string | null;
  created_at: string;
}

/** GET /tenant/api-access â€” ApiAccessOut */
export interface TenantApiAccess {
  tenant_id: string;
  api_token: string | null;
  endpoint_base: string;
}

export const tenantApi = {
  profile: () => api.get<TenantProfile>("/tenant/profile"),
  updateProfile: (body: TenantProfileUpdate) => api.put<TenantProfile>("/tenant/profile", body),
  apiAccess: () => api.get<TenantApiAccess>("/tenant/api-access"),
  regenerateApiToken: () => api.post<TenantApiAccess>("/tenant/api-access/regenerate"),
  notifications: () => api.get<NotificationsConfig>("/tenant/notifications-config"),
  updateNotifications: (body: NotificationsConfig) => api.put<NotificationsConfig>("/tenant/notifications-config", body),
  plan: () => api.get<TenantPlan>("/tenant/plan"),
  updatePlan: (body: PlanUpdate) => api.put<TenantPlan>("/tenant/plan", body),
  security: () => api.get<TenantSecurity>("/tenant/security-settings"),
  updateSecurity: (body: SecuritySettingsUpdate) => api.put<TenantSecurity>("/tenant/security-settings", body),
  /** GET /api/v1/tenant/models â€” list active LLM models for this tenant */
  models: () => api.get<LLMModel[]>("/tenant/models"),
  /** GET /api/v1/tenant/model-defaults */
  modelDefaults: () => api.get<ModelDefaults>("/tenant/model-defaults"),
  /** PUT /api/v1/tenant/model-defaults */
  updateModelDefaults: (body: ModelDefaults) => api.put<ModelDefaults>("/tenant/model-defaults", body),
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Users
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Groups
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GroupCreate { name: string; agent_ids?: string[]; monthly_token_limit?: number | null; }
export interface GroupUpdate { name?: string; monthly_token_limit?: number | null; }
export interface GroupMembersRequest { user_ids: string[]; }
export interface GroupAgentsRequest { agent_ids: string[]; }

export const groupsApi = {
  list: (page = 1, page_size = 100) =>
    api
      .get<Group[] | { items: Group[]; total: number }>("/groups", { page, page_size })
      .then((r) => (Array.isArray(r) ? r : (r as { items: Group[] }).items ?? [])),
  create: (body: GroupCreate) => api.post<unknown>("/groups", body),
  get: (id: string) => api.get<unknown>(`/groups/${id}`),
  update: (id: string, body: GroupUpdate) => api.put<unknown>(`/groups/${id}`, body),
  remove: (id: string) => api.delete<null>(`/groups/${id}`),
  /** POST /api/v1/groups/{id}/users â€” add users */
  addUsers: (id: string, user_ids: string[]) =>
    api.post<unknown>(`/groups/${id}/users`, { user_ids } satisfies GroupMembersRequest),
  /** DELETE /api/v1/groups/{id}/users/{user_id} â€” remove single user */
  removeUser: (groupId: string, userId: string) =>
    api.delete<null>(`/groups/${groupId}/users/${userId}`),
  /** POST /api/v1/groups/{id}/agents â€” assign agents */
  addAgents: (id: string, agent_ids: string[]) =>
    api.post<unknown>(`/groups/${id}/agents`, { agent_ids } satisfies GroupAgentsRequest),
  /** DELETE /api/v1/groups/{id}/agents/{agent_id} â€” unassign agent */
  removeAgent: (groupId: string, agentId: string) =>
    api.delete<null>(`/groups/${groupId}/agents/${agentId}`),
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Agents
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  /** Legacy alias â€” callers may pass category name; ignored on live backend */
  category?: string;
  /** Filter by status â€” used client-side only (backend doesn't support this param) */
  status?: string;
  /** Required for super admin to scope to a tenant */
  tenant_id?: string;
}

export const agentsApi = {
  /** GET /api/v1/agents/categories */
  categories: () => api.get<unknown[]>("/agents/categories"),
  /** GET /api/v1/agents â€” backend accepts no query params on this endpoint */
  list: (_q: AgentQuery = {}) =>
    api.get<unknown[]>("/agents"),
  /** GET /api/v1/agents/{agent_id} */
  get: (id: string) => api.get<unknown>(`/agents/${id}`),
  /** POST /api/v1/agents â€” super admin only */
  create: (body: AgentCreate) => api.post<unknown>("/agents", body),
  /** PUT /api/v1/agents/{agent_id} â€” super admin only */
  update: (id: string, body: AgentUpdate) => api.put<unknown>(`/agents/${id}`, body),
  /** DELETE /api/v1/agents/{agent_id} â€” super admin only */
  remove: (id: string) => api.delete<null>(`/agents/${id}`),
  /** POST /api/v1/agents/{agent_id}/toggle â€” enable/disable for tenant */
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Models (LLM)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ModelCreate { name: string; display_name?: string; default_for_new_tenants?: boolean; }
export interface ModelUpdate { is_active?: boolean; default_for_new_tenants?: boolean; display_name?: string; }

export const modelsApi = {
  /** GET /api/v1/models â€” active models */
  list: () => api.get<unknown[]>("/models"),
  /** GET /api/v1/models/all â€” full catalogue (super admin) */
  listAll: () => api.get<unknown[]>("/models/all"),
  /** GET /api/v1/models/available â€” addable models */
  available: () => api.get<string[]>("/models/available"),
  /** POST /api/v1/models â€” super admin */
  add: (body: ModelCreate) => api.post<unknown>("/models", body),
  /** PUT /api/v1/models/{model_id} â€” super admin */
  update: (id: string, body: ModelUpdate) => api.put<unknown>(`/models/${id}`, body),
  /** DELETE /api/v1/models/{model_id} â€” deactivate */
  remove: (id: string) => api.delete<null>(`/models/${id}`),
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Chat
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Analytics
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const analyticsApi = {
  /**
