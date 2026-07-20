/**
 * In-memory mock database. Seeds realistic data for the IAlestra Control Hub
 * so the console is fully usable before the FastAPI module routers ship.
 * Mutations persist to localStorage within a session.
 */
import type {
  Agent,
  AuditEntry,
  Conversation,
  DashboardSummary,
  Group,
  SecurityAlert,
  Tenant,
  Tool,
  User,
  AppNotification,
  UsagePoint,
} from "../types";

const DAY = 86_400_000;

function isoDaysAgo(days: number, jitterHours = 0): string {
  return new Date(Date.now() - days * DAY - jitterHours * 3_600_000).toISOString();
}

export const tenant: Tenant = {
  id: "tnt_alestra",
  name: "Alestra Telecom",
  rfc: "ALE920101AB3",
  industry: "Telecommunications",
  timezone: "America/Mexico_City",
  plan: "enterprise",
  monthly_token_limit: 25_000_000,
};

export const currentUser: User = {
  id: "usr_001",
  name: "María Fuentes",
  email: "maria.fuentes@alestra.com",
  role: "admin",
  status: "active",
  group_ids: ["grp_ops", "grp_exec"],
  last_active_at: isoDaysAgo(0, 0.2),
  created_at: isoDaysAgo(214),
};

export const users: User[] = [
  currentUser,
  { id: "usr_002", name: "Diego Salazar", email: "diego.salazar@alestra.com", role: "super_admin", status: "active", group_ids: ["grp_exec"], last_active_at: isoDaysAgo(0, 1), created_at: isoDaysAgo(300) },
  { id: "usr_003", name: "Ana Reyes", email: "ana.reyes@alestra.com", role: "member", status: "active", group_ids: ["grp_support"], last_active_at: isoDaysAgo(0, 4), created_at: isoDaysAgo(120) },
  { id: "usr_004", name: "Luis Mendoza", email: "luis.mendoza@alestra.com", role: "member", status: "active", group_ids: ["grp_ops"], last_active_at: isoDaysAgo(1, 2), created_at: isoDaysAgo(95) },
  { id: "usr_005", name: "Sofía Cárdenas", email: "sofia.cardenas@alestra.com", role: "viewer", status: "invited", group_ids: [], last_active_at: null, created_at: isoDaysAgo(3) },
  { id: "usr_006", name: "Raúl Tovar", email: "raul.tovar@alestra.com", role: "member", status: "inactive", group_ids: ["grp_support"], last_active_at: isoDaysAgo(41), created_at: isoDaysAgo(180) },
];

export const groups: Group[] = [
  { id: "grp_ops", name: "Network Operations", description: "NOC engineers monitoring fiber and core network health.", agent_ids: ["agt_incident", "agt_sql"], member_count: 14, created_at: isoDaysAgo(190) },
  { id: "grp_support", name: "Customer Care", description: "Tier-1 and Tier-2 support agents handling subscriber tickets.", agent_ids: ["agt_support", "agt_kb"], member_count: 38, created_at: isoDaysAgo(190) },
  { id: "grp_exec", name: "Executive", description: "Leadership dashboards and board-level analytics.", agent_ids: ["agt_analyst", "agt_research"], member_count: 6, created_at: isoDaysAgo(210) },
];

export const tools: Tool[] = [
  { id: "tool_billing_db", name: "Billing Postgres", type: "sql_query", description: "Read-only access to the subscriber billing warehouse.", status: "connected", secret_ref: "kv://alestra/billing-ro", used_by_agents: 3 },
  { id: "tool_crm", name: "Salesforce CRM", type: "api_call", description: "Account, case, and entitlement lookups via REST.", status: "connected", secret_ref: "kv://alestra/sfdc-token", used_by_agents: 2 },
  { id: "tool_kb_docs", name: "Knowledge Library", type: "document_reader", description: "RAG over 4,210 indexed network runbooks and policies.", status: "connected", secret_ref: null, used_by_agents: 4 },
  { id: "tool_websearch", name: "Web Search", type: "web_search", description: "Grounded public web search for research agents.", status: "connected", secret_ref: "kv://alestra/serp", used_by_agents: 1 },
  { id: "tool_ticketing", name: "ServiceNow", type: "api_call", description: "Create and update incident tickets.", status: "error", secret_ref: "kv://alestra/snow", used_by_agents: 1 },
];

/** Tool definitions — the catalogue of available tool types. */
export interface ToolDefinition {
  id: string;
  name: string;
  tool_type: string;
  description: string | null;
  created_at: string;
}

export const toolDefinitions: ToolDefinition[] = [
  { id: "tdef_sql",    name: "SQL Query",       tool_type: "sql_query",       description: "Execute read-only SQL against a relational database.", created_at: isoDaysAgo(200) },
  { id: "tdef_api",    name: "API Call",         tool_type: "api_call",        description: "Call an external REST API with configurable auth.",    created_at: isoDaysAgo(200) },
  { id: "tdef_doc",    name: "Document Reader",  tool_type: "document_reader", description: "RAG retrieval over indexed document collections.",      created_at: isoDaysAgo(180) },
  { id: "tdef_web",    name: "Web Search",       tool_type: "web_search",      description: "Grounded public web search via SERP API.",              created_at: isoDaysAgo(180) },
  { id: "tdef_ds",     name: "Data Source",      tool_type: "data_source",     description: "Connect to a registered data source.",                  created_at: isoDaysAgo(150) },
];

/** Tool instances — concrete configured instances of tool definitions. */
export interface ToolInstance {
  id: string;
  name: string;
  tool_type: string;
  tool_definition_id: string;
  data_source_id: string | null;
  tenant_id: string | null;
  description: string | null;
  status: string;
  created_at: string;
}

export const toolInstances: ToolInstance[] = [
  { id: "ti_billing_db",  name: "Billing Postgres",  tool_type: "sql_query",       tool_definition_id: "tdef_sql",  data_source_id: null, tenant_id: null, description: "Read-only access to the subscriber billing warehouse.", status: "active", created_at: isoDaysAgo(190) },
  { id: "ti_crm",         name: "Salesforce CRM",    tool_type: "api_call",        tool_definition_id: "tdef_api",  data_source_id: null, tenant_id: null, description: "Account, case, and entitlement lookups via REST.",       status: "active", created_at: isoDaysAgo(185) },
  { id: "ti_kb_docs",     name: "Knowledge Library", tool_type: "document_reader", tool_definition_id: "tdef_doc",  data_source_id: null, tenant_id: null, description: "RAG over 4,210 indexed network runbooks and policies.",   status: "active", created_at: isoDaysAgo(180) },
  { id: "ti_websearch",   name: "Web Search",        tool_type: "web_search",      tool_definition_id: "tdef_web",  data_source_id: null, tenant_id: null, description: "Grounded public web search for research agents.",         status: "active", created_at: isoDaysAgo(175) },
  { id: "ti_ticketing",   name: "ServiceNow",        tool_type: "api_call",        tool_definition_id: "tdef_api",  data_source_id: null, tenant_id: null, description: "Create and update incident tickets.",                     status: "error",  created_at: isoDaysAgo(160) },
];

const SYSTEM_PROMPT = `You are a specialist assistant for Alestra Telecom.
Be precise, cite data sources, and never expose subscriber PII in plain text.
When you are uncertain, say so and propose the safest next step.`;

/** Shared defaults for required Agent fields not used by mock data. */
const AGENT_DEFAULTS = {
  assistant_name: null,
  category_id: null,
  category_name: null,
  is_global: false,
  is_released: true,
  tenant_id: null,
  template_key: "",
  model_id: null,
  model_name: null,
  capabilities: [] as string[],
  example_questions: [] as string[],
  enabled: true,
  behavior_prompt: null,
  language: null,
  response_style: null,
  monthly_token_limit: null,
} as const;

export const agents: Agent[] = [
  {
    ...AGENT_DEFAULTS,
    id: "agt_support",
    name: "Care Copilot",
    description: "Resolves Tier-1 subscriber tickets with billing + CRM context and policy-grounded answers.",
    category: "support",
    status: "active",
    model: "claude-sonnet-4-6",
    system_prompt: SYSTEM_PROMPT,
    tools: ["tool_crm", "tool_kb_docs"],
    output_types: ["markdown", "text"],
    group_ids: ["grp_support"],
    version: 9,
    temperature: 0.3,
    tokens_30d: 4_820_000,
    invocations_30d: 18_240,
    avg_latency_ms: 1_840,
    success_rate: 98.6,
    created_by: "usr_002",
    updated_at: isoDaysAgo(2, 5),
    created_at: isoDaysAgo(160),
  },
  {
    ...AGENT_DEFAULTS,
    id: "agt_analyst",
    name: "Revenue Analyst",
    description: "Answers executive questions over the billing warehouse and renders charts and tables.",
    category: "analytics",
    status: "active",
    model: "claude-opus-4-8",
    system_prompt: SYSTEM_PROMPT,
    tools: ["tool_billing_db"],
    output_types: ["table", "chart", "markdown"],
    group_ids: ["grp_exec"],
    version: 14,
    temperature: 0.1,
    tokens_30d: 6_140_000,
    invocations_30d: 3_980,
    avg_latency_ms: 4_120,
    success_rate: 96.1,
    created_by: "usr_002",
    updated_at: isoDaysAgo(1, 9),
    created_at: isoDaysAgo(178),
  },
  {
    ...AGENT_DEFAULTS,
    id: "agt_incident",
    name: "Incident Commander",
    description: "Correlates NOC alarms, drafts runbooks, and opens tickets during network incidents.",
    category: "automation",
    status: "active",
    model: "claude-sonnet-4-6",
    system_prompt: SYSTEM_PROMPT,
    tools: ["tool_kb_docs", "tool_ticketing"],
    output_types: ["markdown"],
    group_ids: ["grp_ops"],
    version: 6,
    temperature: 0.2,
    tokens_30d: 2_360_000,
    invocations_30d: 1_120,
    avg_latency_ms: 2_650,
    success_rate: 94.4,
    created_by: "usr_001",
    updated_at: isoDaysAgo(4, 2),
    created_at: isoDaysAgo(88),
  },
  {
    ...AGENT_DEFAULTS,
    id: "agt_kb",
    name: "Policy Librarian",
    description: "Grounded Q&A over runbooks, SLAs, and internal policy documents with citations.",
    category: "knowledge",
    status: "active",
    model: "claude-haiku-4-5",
    system_prompt: SYSTEM_PROMPT,
    tools: ["tool_kb_docs"],
    output_types: ["markdown", "text"],
    group_ids: ["grp_support", "grp_ops"],
    version: 4,
    temperature: 0.0,
    tokens_30d: 1_980_000,
    invocations_30d: 9_410,
    avg_latency_ms: 920,
    success_rate: 99.2,
    created_by: "usr_001",
    updated_at: isoDaysAgo(6, 1),
    created_at: isoDaysAgo(70),
  },
  {
    ...AGENT_DEFAULTS,
    id: "agt_sql",
    name: "Query Builder",
    description: "Translates natural language into safe, read-only SQL against the warehouse.",
    category: "coding",
    status: "active",
    model: "claude-sonnet-4-6",
    system_prompt: SYSTEM_PROMPT,
    tools: ["tool_billing_db"],
    output_types: ["json", "table"],
    group_ids: ["grp_ops"],
    version: 11,
    temperature: 0.0,
    tokens_30d: 1_240_000,
    invocations_30d: 2_770,
    avg_latency_ms: 1_510,
    success_rate: 97.3,
    created_by: "usr_004",
    updated_at: isoDaysAgo(9, 4),
    created_at: isoDaysAgo(140),
  },
  {
    ...AGENT_DEFAULTS,
    id: "agt_research",
    name: "Market Scout",
    description: "Tracks competitor moves and telecom market signals from the public web.",
    category: "research",
    status: "draft",
    model: "claude-opus-4-8",
    system_prompt: SYSTEM_PROMPT,
    tools: ["tool_websearch"],
    output_types: ["markdown"],
    group_ids: ["grp_exec"],
    version: 1,
    temperature: 0.5,
    tokens_30d: 0,
    invocations_30d: 0,
    avg_latency_ms: 0,
    success_rate: 0,
    created_by: "usr_001",
    updated_at: isoDaysAgo(0, 6),
    created_at: isoDaysAgo(1),
  },
];

export const conversations: Conversation[] = [
  { id: "cnv_1", agent_id: "agt_support", title: "Double-charged subscriber refund", message_count: 8, updated_at: isoDaysAgo(0, 2) },
  { id: "cnv_2", agent_id: "agt_analyst", title: "Q2 ARPU by region", message_count: 5, updated_at: isoDaysAgo(0, 5) },
  { id: "cnv_3", agent_id: "agt_incident", title: "Fiber cut — Monterrey ring", message_count: 12, updated_at: isoDaysAgo(1, 3) },
];

export const securityAlerts: SecurityAlert[] = [
  { id: "sec_1", severity: "high", pii_types: ["credit_card", "full_name"], user_name: "Ana Reyes", agent_name: "Care Copilot", excerpt: "customer card 4111 •••• •••• 1234 for José …", status: "open", detected_at: isoDaysAgo(0, 1) },
  { id: "sec_2", severity: "critical", pii_types: ["national_id", "address"], user_name: "Luis Mendoza", agent_name: "Query Builder", excerpt: "CURP GOML••••09 living at Av. …", status: "open", detected_at: isoDaysAgo(0, 6) },
  { id: "sec_3", severity: "medium", pii_types: ["email", "phone"], user_name: "Ana Reyes", agent_name: "Policy Librarian", excerpt: "reach me at ••••@gmail.com / +52 …", status: "reviewed", detected_at: isoDaysAgo(2, 4) },
  { id: "sec_4", severity: "low", pii_types: ["phone"], user_name: "Raúl Tovar", agent_name: "Care Copilot", excerpt: "call back on +52 81 •••• …", status: "dismissed", detected_at: isoDaysAgo(5, 2) },
];

export const notifications: AppNotification[] = [
  { id: "ntf_1", type: "pii_detected", title: "PII detected in execution", body: "Critical: national ID exposed via Query Builder.", read: false, created_at: isoDaysAgo(0, 6) },
  { id: "ntf_2", type: "token_warning", title: "Approaching monthly limit", body: "You have used 78% of the 25M token allotment.", read: false, created_at: isoDaysAgo(0, 9) },
  { id: "ntf_3", type: "agent_updated", title: "Revenue Analyst updated", body: "Diego Salazar published version 14.", read: true, created_at: isoDaysAgo(1, 9) },
  { id: "ntf_4", type: "agent_deprecated", title: "Model deprecation notice", body: "claude-haiku-4-5 retires Sep 30. Plan a migration.", read: true, created_at: isoDaysAgo(3, 0) },
];

function buildAudit(): AuditEntry[] {
  const names = users.filter((u) => u.status === "active");
  const out: AuditEntry[] = [];
  const statuses: AuditEntry["status"][] = ["success", "success", "success", "success", "error", "blocked"];
  for (let i = 0; i < 60; i++) {
    const a = agents[i % agents.length];
    const u = names[i % names.length];
    out.push({
      id: `aud_${1000 + i}`,
      user_name: u.name,
      agent_name: a.name,
      model: a.model ?? "",
      tokens: 400 + ((i * 977) % 5200),
      status: statuses[(i * 7) % statuses.length],
      latency_ms: 600 + ((i * 311) % 4200),
      timestamp: isoDaysAgo(Math.floor(i / 6), (i % 6) * 3),
    });
  }
  return out;
}
export const auditEntries: AuditEntry[] = buildAudit();

function buildSeries(days: number): UsagePoint[] {
  const pts: UsagePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    // Smooth wave + weekday dip — deterministic, no randomness.
    const wave = Math.sin((i / days) * Math.PI * 3) * 0.22 + 0.78;
    const weekday = new Date(Date.now() - i * DAY).getDay();
    const dip = weekday === 0 || weekday === 6 ? 0.55 : 1;
    const tokens = Math.round(620_000 * wave * dip + 180_000);
    pts.push({
      date: isoDaysAgo(i).slice(0, 10),
      tokens,
      cost: +(tokens * 0.0000026).toFixed(2),
      invocations: Math.round(tokens / 320),
    });
  }
  return pts;
}

export function dashboardSummary(range: 7 | 30 | 90): DashboardSummary {
  const series = buildSeries(range);
  const tokensUsed = agents.reduce((s, a) => s + a.tokens_30d, 0);
  const top = [...agents]
    .filter((a) => a.tokens_30d > 0)
    .sort((a, b) => b.tokens_30d - a.tokens_30d)
    .slice(0, 5)
    .map((a) => ({ id: a.id, name: a.name, tokens: a.tokens_30d, category: a.category ?? "automation" as const }));
  const modelMap = new Map<string, number>();
  for (const a of agents) { const m = a.model ?? ""; modelMap.set(m, (modelMap.get(m) ?? 0) + a.tokens_30d); }
  return {
    tokens_used: tokensUsed,
    tokens_limit: tenant.monthly_token_limit,
    tokens_delta_pct: 12.4,
    active_agents: agents.filter((a) => a.status === "active").length,
    total_agents: agents.length,
    invocations_today: series[series.length - 1].invocations,
    invocations_delta_pct: 8.1,
    active_users: users.filter((u) => u.status === "active").length,
    est_cost_mtd: +series.reduce((s, p) => s + p.cost, 0).toFixed(2),
    cost_delta_pct: 6.7,
    avg_latency_ms: Math.round(agents.reduce((s, a) => s + a.avg_latency_ms, 0) / agents.length),
    success_rate: 97.5,
    open_security_alerts: securityAlerts.filter((s) => s.status === "open").length,
    series,
    top_agents: top,
    model_split: [...modelMap.entries()].map(([model, tokens]) => ({ model, tokens })),
  };
}
