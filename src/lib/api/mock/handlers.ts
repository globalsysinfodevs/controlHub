/**
 * Mock request router. Maps `METHOD /path` to seeded data and returns the
 * same envelope shape the FastAPI backend produces. Adds a small latency so
 * loading states are exercised realistically.
 */
import { sleep } from "@/lib/utils";
import type {
  Agent,
  ApiPaginated,
  ApiSuccess,
  AuthSession,
} from "../types";
import * as db from "./db";

type Json = Record<string, unknown>;

const LS_KEY = "ialestra.mockdb.agents";

// Hydrate agent mutations from a previous session.
(() => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Agent[];
      db.agents.splice(0, db.agents.length, ...saved);
    }
  } catch {
    /* ignore corrupt cache */
  }
})();

function persistAgents() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db.agents));
  } catch {
    /* storage full / disabled */
  }
}

// ── Super Admin mock state (in-memory, resets on reload) ─────────────────────
let _saSeq = 100;
const saId = (prefix: string) => `${prefix}_${++_saSeq}`;
const saNow = () => new Date().toISOString();

// ── Agent categories mock state ───────────────────────────────────────────────
interface MockAgentCategory { id: string; name: string; slug: string; icon: string | null; created_at: string; }
const agentCategories: MockAgentCategory[] = [
  { id: "cat_support",    name: "Support",    slug: "support",    icon: "🎧", created_at: saNow() },
  { id: "cat_analytics",  name: "Analytics",  slug: "analytics",  icon: "📊", created_at: saNow() },
  { id: "cat_automation", name: "Automation", slug: "automation", icon: "⚡", created_at: saNow() },
  { id: "cat_knowledge",  name: "Knowledge",  slug: "knowledge",  icon: "📚", created_at: saNow() },
  { id: "cat_coding",     name: "Coding",     slug: "coding",     icon: "💻", created_at: saNow() },
  { id: "cat_research",   name: "Research",   slug: "research",   icon: "🔍", created_at: saNow() },
];

interface MockIndustry { id: string; name: string; icon: string | null; created_at: string; updated_at: string; }
const saIndustries: MockIndustry[] = [
  { id: "ind_tech", name: "Tecnología", icon: "💻", created_at: saNow(), updated_at: saNow() },
  { id: "ind_fin", name: "Finanzas", icon: "🏦", created_at: saNow(), updated_at: saNow() },
  { id: "ind_health", name: "Salud", icon: "🏥", created_at: saNow(), updated_at: saNow() },
  { id: "ind_retail", name: "Retail", icon: "🛍️", created_at: saNow(), updated_at: saNow() },
];

interface MockTenant {
  id: string; name: string; billing_email: string; rfc: string | null; industry_id: string | null;
  timezone: string; status: string; plan_name: string | null; monthly_token_limit: number | null;
  monthly_cost: number | null; is_deleted: boolean; created_at: string; updated_at: string;
}
const saTenants: MockTenant[] = [
  { id: "tnt_acme", name: "Acme S.A.", billing_email: "facturacion@acme.mx", rfc: "ACM010101AAA", industry_id: "ind_tech", timezone: "America/Mexico_City", status: "active", plan_name: "Enterprise", monthly_token_limit: 25_000_000, monthly_cost: 4999, is_deleted: false, created_at: saNow(), updated_at: saNow() },
  { id: "tnt_globex", name: "Globex", billing_email: "billing@globex.com", rfc: null, industry_id: "ind_fin", timezone: "UTC", status: "active", plan_name: "Pro", monthly_token_limit: 8_000_000, monthly_cost: 1499, is_deleted: false, created_at: saNow(), updated_at: saNow() },
  { id: "tnt_initech", name: "Initech", billing_email: "ap@initech.io", rfc: null, industry_id: "ind_retail", timezone: "America/Mexico_City", status: "suspended", plan_name: "Starter", monthly_token_limit: 2_000_000, monthly_cost: 499, is_deleted: false, created_at: saNow(), updated_at: saNow() },
];

interface MockPlatformUser {
  id: string; email: string; name: string; role: string; status: string; tenant_id: string | null;
  auth_provider: string; mfa_enabled: boolean; last_login: string | null; created_at: string; updated_at: string; is_deleted: boolean;
}
const saUsers: MockPlatformUser[] = [
  { id: "usr_root", email: "super@ialestra.mx", name: "Super Admin", role: "platform_super_admin", status: "active", tenant_id: null, auth_provider: "local", mfa_enabled: true, last_login: saNow(), created_at: saNow(), updated_at: saNow(), is_deleted: false },
  { id: "usr_ana", email: "ana@acme.mx", name: "Ana Torres", role: "tenant_admin", status: "active", tenant_id: "tnt_acme", auth_provider: "local", mfa_enabled: false, last_login: saNow(), created_at: saNow(), updated_at: saNow(), is_deleted: false },
  { id: "usr_beto", email: "beto@globex.com", name: "Beto Ruiz", role: "member", status: "invited", tenant_id: "tnt_globex", auth_provider: "local", mfa_enabled: false, last_login: null, created_at: saNow(), updated_at: saNow(), is_deleted: false },
  { id: "usr_caro", email: "caro@initech.io", name: "Carolina Díaz", role: "viewer", status: "inactive", tenant_id: "tnt_initech", auth_provider: "azure_ad", mfa_enabled: true, last_login: saNow(), created_at: saNow(), updated_at: saNow(), is_deleted: false },
];

function ok<T>(data: T, message = "Operation completed successfully"): ApiSuccess<T> {
  return { success: true, data, message };
}

function paginate<T>(
  items: T[],
  query: URLSearchParams,
  message = "Operation completed successfully"
): ApiPaginated<T> {
  const page = Math.max(1, Number(query.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.get("page_size") ?? 20)));
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize) || 0;
  const slice = items.slice((page - 1) * pageSize, page * pageSize);
  return {
    success: true,
    data: slice,
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_previous: page > 1,
    },
    message,
  };
}

export async function mockRequest(
  method: string,
  path: string,
  body?: Json
): Promise<unknown> {
  await sleep(260 + (path.length % 7) * 24);

  const url = new URL(path, "http://mock");
  const p = url.pathname.replace(/^\/api\/v1/, "");
  const q = url.searchParams;
  const m = method.toUpperCase();

  // ── Auth (mirrors the deployed super-admin auth routes) ───────────────
  if (m === "POST" && (p === "/auth/super-admin/login" || p === "/auth/login")) {
    const session: AuthSession = {
      access_token: "mock.access." + btoa(db.currentUser.email),
      refresh_token: "mock.refresh." + btoa(db.currentUser.email),
      token_type: "bearer",
      expires_in: 1800,
      user: db.currentUser,
      tenant: db.tenant,
    };
    return ok(session, "Welcome back to the Control Hub");
  }
  if (m === "GET" && (p === "/auth/super-admin/profile" || p === "/auth/me")) {
    return ok({ user: db.currentUser, tenant: db.tenant });
  }
  if (m === "POST" && p === "/auth/super-admin/refresh") {
    return ok({ access_token: "mock.access.refreshed", refresh_token: "mock.refresh.refreshed", token_type: "bearer", expires_in: 1800 });
  }

  // ── Super Admin · platform stats ─────────────────────────────────────
  if (m === "GET" && p === "/super-admin/stats") {
    const liveTenants = saTenants.filter((t) => !t.is_deleted);
    const liveUsers = saUsers.filter((u) => !u.is_deleted);
    return ok(
      {
        total_tenants: liveTenants.length,
        active_tenants: liveTenants.filter((t) => t.status === "active").length,
        total_users: liveUsers.length,
        active_users: liveUsers.filter((u) => u.status === "active").length,
        total_industries: saIndustries.length,
      },
      "Stats retrieved"
    );
  }

  // ── Super Admin · industries ─────────────────────────────────────────
  if (m === "GET" && p === "/super-admin/industries") {
    return paginate([...saIndustries], q, "Industries retrieved");
  }
  if (m === "POST" && p === "/super-admin/industries") {
    const b = (body ?? {}) as Json;
    const ind: MockIndustry = { id: saId("ind"), name: String(b.name ?? ""), icon: (b.icon as string) ?? null, created_at: saNow(), updated_at: saNow() };
    saIndustries.unshift(ind);
    return ok(ind, "Industry created");
  }
  if ((m === "PATCH" || m === "DELETE") && /^\/super-admin\/industries\/[^/]+$/.test(p)) {
    const id = p.split("/")[3];
    const idx = saIndustries.findIndex((i) => i.id === id);
    if (idx === -1) throw apiError(404, "not_found", "Industry not found");
    if (m === "DELETE") {
      saIndustries.splice(idx, 1);
      return ok(null, "Industry deleted");
    }
    const b = (body ?? {}) as Json;
    saIndustries[idx] = { ...saIndustries[idx], ...(b.name != null ? { name: String(b.name) } : {}), ...(b.icon !== undefined ? { icon: (b.icon as string) ?? null } : {}), updated_at: saNow() };
    return ok(saIndustries[idx], "Industry updated");
  }

  // ── Super Admin · tenants ────────────────────────────────────────────
  if (m === "GET" && p === "/super-admin/tenants") {
    const includeDeleted = q.get("include_deleted") === "true";
    return paginate(saTenants.filter((t) => includeDeleted || !t.is_deleted), q, "Tenants retrieved");
  }
  if (m === "POST" && p === "/super-admin/tenants") {
    const b = (body ?? {}) as Json;
    const t: MockTenant = {
      id: saId("tnt"), name: String(b.name ?? ""), billing_email: String(b.billing_email ?? ""),
      rfc: (b.rfc as string) ?? null, industry_id: (b.industry_id as string) ?? null,
      timezone: String(b.timezone ?? "UTC"), status: "active", plan_name: (b.plan_name as string) ?? null,
      monthly_token_limit: (b.monthly_token_limit as number) ?? null, monthly_cost: (b.monthly_cost as number) ?? null,
      is_deleted: false, created_at: saNow(), updated_at: saNow(),
    };
    saTenants.unshift(t);
    return ok(t, "Tenant created");
  }
  if (m === "POST" && /^\/super-admin\/tenants\/[^/]+\/restore$/.test(p)) {
    const id = p.split("/")[3];
    const t = saTenants.find((x) => x.id === id);
    if (!t) throw apiError(404, "not_found", "Tenant not found");
    t.is_deleted = false; t.status = "active"; t.updated_at = saNow();
    return ok(t, "Tenant restored");
  }
  if (m === "POST" && /^\/super-admin\/tenants\/[^/]+\/invite-admin$/.test(p)) {
    const id = p.split("/")[3];
    const b = (body ?? {}) as Json;
    return ok({ id: saId("inv"), tenant_id: id, user_id: null, email: String(b.email ?? ""), name: String(b.name ?? ""), role: "tenant_admin", expires_at: saNow(), created_at: saNow() }, "Invitation sent");
  }
  if ((m === "GET" || m === "PATCH" || m === "DELETE") && /^\/super-admin\/tenants\/[^/]+$/.test(p)) {
    const id = p.split("/")[3];
    const t = saTenants.find((x) => x.id === id);
    if (!t) throw apiError(404, "not_found", "Tenant not found");
    if (m === "GET") return ok({ ...t, user_count: saUsers.filter((u) => u.tenant_id === id).length, active_user_count: saUsers.filter((u) => u.tenant_id === id && u.status === "active").length }, "Tenant retrieved");
    if (m === "DELETE") { t.is_deleted = true; t.status = "inactive"; t.updated_at = saNow(); return ok(null, "Tenant deactivated"); }
    const b = (body ?? {}) as Json;
    Object.assign(t, b, { updated_at: saNow() });
    return ok(t, "Tenant updated");
  }

  // ── Super Admin · platform users ─────────────────────────────────────
  if (m === "GET" && p === "/super-admin/users") {
    const includeDeleted = q.get("include_deleted") === "true";
    const tenantId = q.get("tenant_id");
    return paginate(
      saUsers.filter((u) => (includeDeleted || !u.is_deleted) && (!tenantId || u.tenant_id === tenantId)),
      q,
      "Users retrieved"
    );
  }
  if (m === "PATCH" && /^\/super-admin\/users\/[^/]+\/status$/.test(p)) {
    const id = p.split("/")[3];
    const u = saUsers.find((x) => x.id === id);
    if (!u) throw apiError(404, "not_found", "User not found");
    const b = (body ?? {}) as Json;
    u.status = String(b.status ?? u.status); u.updated_at = saNow();
    return ok(u, `User status updated to '${u.status}'`);
  }
  if (m === "GET" && /^\/super-admin\/users\/[^/]+$/.test(p)) {
    const id = p.split("/")[3];
    const u = saUsers.find((x) => x.id === id);
    if (!u) throw apiError(404, "not_found", "User not found");
    return ok(u, "User retrieved");
  }

  // ── Dashboard ────────────────────────────────────────────────────────
  if (m === "GET" && p === "/analytics/summary") {
    const range = (Number(q.get("range")) || 30) as 7 | 30 | 90;
    return ok(db.dashboardSummary([7, 30, 90].includes(range) ? range : 30));
  }
  if (m === "GET" && p === "/analytics/dashboard") {
    const period = (Number(q.get("period")) || 30) as 7 | 30 | 90;
    const s = db.dashboardSummary([7, 30, 90].includes(period) ? period : 30);
    // Return in the live backend envelope shape that mapDashboard() expects
    return ok({
      kpis: {
        tokens_total: s.tokens_used,
        tokens_delta_pct: s.tokens_delta_pct,
        total_queries: s.invocations_today,
        queries_delta_pct: s.invocations_delta_pct,
        avg_latency_ms: s.avg_latency_ms,
        cost_estimated: s.est_cost_mtd,
        cost_delta_pct: s.cost_delta_pct,
      },
      budget: { limit: s.tokens_limit },
      series: s.series,
      cost_by_agent: s.top_agents.map((a) => ({ agent_id: a.id, name: a.name, tokens: a.tokens })),
      top_agents: s.top_agents,
      model_split: s.model_split,
      success_rate: s.success_rate,
      active_agents: s.active_agents,
      total_agents: s.total_agents,
      active_users: s.active_users,
      open_security_alerts: s.open_security_alerts,
    });
  }

  // ── Agent categories ─────────────────────────────────────────────────
  if (m === "GET" && p === "/agents/categories") {
    return ok([...agentCategories], "Categories retrieved");
  }
  if (m === "POST" && p === "/agents/categories") {
    const b = (body ?? {}) as Json;
    const name = String(b.name ?? "").trim();
    if (!name) throw apiError(422, "validation_error", "Category name is required");
    const slug = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const cat: MockAgentCategory = { id: saId("cat"), name, slug, icon: (b.icon as string) ?? null, created_at: saNow() };
    agentCategories.push(cat);
    return ok(cat, "Category created");
  }

  // ── Agents ────────────────────────────────────────────────────────────
  if (m === "GET" && p === "/agents") {
    let list = [...db.agents];
    const search = q.get("search")?.toLowerCase();
    const category = q.get("category");
    const status = q.get("status");
    if (search) list = list.filter((a) => (a.name + a.description).toLowerCase().includes(search));
    if (category && category !== "all") list = list.filter((a) => a.category === category);
    if (status && status !== "all") list = list.filter((a) => a.status === status);
    return paginate(list, q, "Agents retrieved");
  }
  if (m === "GET" && /^\/agents\/[^/]+$/.test(p)) {
    const id = p.split("/")[2];
    const agent = db.agents.find((a) => a.id === id);
    if (!agent) throw apiError(404, "not_found", "Agent not found");
    return ok(agent);
  }
  if (m === "POST" && p === "/agents") {
    const now = new Date().toISOString();
    const agent: Agent = {
      id: "agt_" + Math.random().toString(36).slice(2, 8),
      name: (body?.name as string) || "Untitled Agent",
      description: (body?.description as string) || "",
      category: (body?.category as Agent["category"]) || "automation",
      status: "draft",
      model: (body?.model as string) || "claude-sonnet-4-6",
      system_prompt: (body?.system_prompt as string) || "",
      tools: (body?.tools as string[]) || [],
      output_types: (body?.output_types as Agent["output_types"]) || ["markdown"],
      group_ids: (body?.group_ids as string[]) || [],
      version: 1,
      temperature: (body?.temperature as number) ?? 0.3,
      tokens_30d: 0,
      invocations_30d: 0,
      avg_latency_ms: 0,
      success_rate: 0,
      created_by: db.currentUser.id,
      updated_at: now,
      created_at: now,
    };
    db.agents.unshift(agent);
    persistAgents();
    return ok(agent, "Agent created");
  }
  if ((m === "PUT" || m === "PATCH") && /^\/agents\/[^/]+$/.test(p)) {
    const id = p.split("/")[2];
    const agent = db.agents.find((a) => a.id === id);
    if (!agent) throw apiError(404, "not_found", "Agent not found");
    Object.assign(agent, body, {
      version: agent.version + 1,
      updated_at: new Date().toISOString(),
    });
    persistAgents();
    return ok(agent, "Agent updated — new version published");
  }
  if (m === "DELETE" && /^\/agents\/[^/]+$/.test(p)) {
    const id = p.split("/")[2];
    const idx = db.agents.findIndex((a) => a.id === id);
    if (idx >= 0) db.agents.splice(idx, 1);
    persistAgents();
    return ok(null, "Agent deleted");
  }

  // ── Supporting collections ────────────────────────────────────────────
  if (m === "GET" && p === "/users") return paginate([...db.users], q, "Users retrieved");
  if (m === "GET" && p === "/groups") return ok(db.groups);
  if (m === "GET" && p === "/tools") return ok(db.tools);
  if (m === "GET" && p === "/conversations") return ok(db.conversations);
  if (m === "GET" && p === "/security/alerts") return paginate([...db.securityAlerts], q, "Alerts retrieved");
  if (m === "GET" && p === "/audit-logs") {
    let list = [...db.auditEntries];
    const status = q.get("status");
    if (status && status !== "all") list = list.filter((e) => e.status === status);
    return paginate(list, q, "Audit log retrieved");
  }
  if (m === "GET" && p === "/notifications") {
    const unreadOnly = q.get("unread_only") === "true";
    const list = unreadOnly ? db.notifications.filter((n) => !n.read) : db.notifications;
    return paginate([...list], q, "Notifications retrieved");
  }
  if (m === "GET" && p === "/notifications/unread-count") {
    return ok({ count: db.notifications.filter((n) => !n.read).length });
  }
  if (m === "POST" && p === "/notifications/mark-read") {
    const ids = new Set((body?.notification_ids as string[]) ?? []);
    db.notifications.forEach((n) => ids.has(n.id) && (n.read = true));
    return ok(null, "Marked as read");
  }
  if (m === "POST" && p === "/notifications/mark-all-read") {
    db.notifications.forEach((n) => (n.read = true));
    return ok(null, "All caught up");
  }

  throw apiError(404, "not_found", `No mock route for ${m} ${p}`);
}

function apiError(status: number, code: string, message: string) {
  return Object.assign(new Error(message), { status, code, isApiError: true });
}

/**
 * Streaming chat simulator. Yields response chunks for an agent so the chat
 * UI can render token-by-token, matching the backend's SSE contract.
 */
export async function* mockChatStream(
  agent: Agent,
  prompt: string
): AsyncGenerator<{ delta?: string; done?: boolean; tokens?: number }> {
  await sleep(420);
  const reply = composeReply(agent, prompt);
  const words = reply.split(/(\s+)/);
  for (const w of words) {
    await sleep(14 + (w.length % 5) * 8);
    yield { delta: w };
  }
  yield { done: true, tokens: Math.round(reply.length / 3.6) };
}

function composeReply(agent: Agent, prompt: string): string {
  const trimmed = prompt.trim();
  const lead =
    agent.category === "analytics"
      ? `Here's what the warehouse shows for "${trimmed}".`
      : agent.category === "support"
        ? `Let's resolve this. Based on the account context for "${trimmed}":`
        : agent.category === "knowledge"
          ? `From the indexed runbooks, here's the grounded answer to "${trimmed}".`
          : `Working on "${trimmed}".`;
  return [
    lead,
    "",
    "**Summary**",
    `- ${agent.name} is running on \`${agent.model}\` at temperature ${agent.temperature}.`,
    `- ${agent.tools.length} tool${agent.tools.length === 1 ? "" : "s"} are wired in for grounded context.`,
    "- No subscriber PII is exposed in this response.",
    "",
    "**Next steps**",
    "1. Confirm the account identifier and entitlement.",
    "2. Apply the policy-approved resolution path.",
    "3. Log the outcome for audit and notify the requester.",
    "",
    "_This is a simulated response from the mock execution engine. Point `VITE_USE_MOCK=false` at the FastAPI backend to stream live model output._",
  ].join("\n");
}
