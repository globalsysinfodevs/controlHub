/**
 * API contract types — mirror the FastAPI backend's response envelope
 * (app/core/responses.py) and domain models (app/modules/*).
 *
 * Success:    { success: true, data: T, message: string }
 * Paginated:  { success: true, data: T[], pagination: {...}, message: string }
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface ApiPaginated<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
  message: string;
}

/** Backend error envelope: { success:false, error_code, message }. */
export interface ApiError {
  success: false;
  error_code: string;
  message: string;
  details?: unknown;
}

// ── Domain models ────────────────────────────────────────────────────────────

export type UserRole = "super_admin" | "admin" | "member" | "viewer" | "tenant_admin" | "platform_super_admin";
export type UserStatus = "invited" | "active" | "inactive";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  group_ids: string[];
  last_active_at: string | null;
  created_at: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
  tenant: Tenant;
  mfa_required?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  rfc: string;
  industry: string;
  timezone: string;
  plan: "starter" | "growth" | "scale" | "enterprise";
  monthly_token_limit: number;
}

export type AgentCategory =
  | "support"
  | "analytics"
  | "knowledge"
  | "automation"
  | "coding"
  | "research";

export type OutputType = "text" | "markdown" | "json" | "table" | "chart";

export interface Agent {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  status: "active" | "inactive" | "draft";
  model: string;
  system_prompt: string;
  tools: string[];
  output_types: OutputType[];
  group_ids: string[];
  version: number;
  temperature: number;
  tokens_30d: number;
  invocations_30d: number;
  avg_latency_ms: number;
  success_rate: number;
  created_by: string;
  updated_at: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  agent_ids: string[];
  member_count: number;
  created_at: string;
}

export interface Tool {
  id: string;
  name: string;
  type: "sql_query" | "api_call" | "document_reader" | "web_search";
  description: string;
  status: "connected" | "error" | "disabled";
  secret_ref: string | null;
  used_by_agents: number;
}

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  tokens?: number;
  model?: string;
  created_at: string;
  pending?: boolean;
}

export interface Conversation {
  id: string;
  agent_id: string;
  title: string;
  message_count: number;
  updated_at: string;
}

export interface SecurityAlert {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  pii_types: string[];
  user_name: string;
  agent_name: string;
  excerpt: string;
  status: "open" | "reviewed" | "dismissed";
  detected_at: string;
}

export interface AuditEntry {
  id: string;
  user_name: string;
  agent_name: string;
  model: string;
  tokens: number;
  status: "success" | "error" | "blocked";
  latency_ms: number;
  timestamp: string;
}

/** Notification kinds — mirrors the backend NotificationType enum (19 values). */
export type NotificationType =
  | "token_warning"
  | "token_limit_reached"
  | "group_token_warning"
  | "user_token_warning"
  | "pii_detected"
  | "agent_updated"
  | "agent_deprecated"
  | "agent_execution_error"
  | "execution_timeout"
  | "execution_tool_failure"
  | "user_invited"
  | "user_activated"
  | "user_removed"
  | "subscription_expiring"
  | "plan_updated"
  | "system_announcement"
  | "system_maintenance"
  | "weekly_summary"
  | "security_default_password";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

// ── Dashboard analytics ──────────────────────────────────────────────────────

export interface UsagePoint {
  date: string;
  tokens: number;
  cost: number;
  invocations: number;
}

export interface DashboardSummary {
  tokens_used: number;
  tokens_limit: number;
  tokens_delta_pct: number;
  active_agents: number;
  total_agents: number;
  invocations_today: number;
  invocations_delta_pct: number;
  active_users: number;
  est_cost_mtd: number;
  cost_delta_pct: number;
  avg_latency_ms: number;
  success_rate: number;
  open_security_alerts: number;
  series: UsagePoint[];
  top_agents: { id: string; name: string; tokens: number; category: AgentCategory }[];
  model_split: { model: string; tokens: number }[];
}
