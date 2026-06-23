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

  // ── Dashboard ────────────────────────────────────────────────────────
  if (m === "GET" && p === "/analytics/summary") {
    const range = (Number(q.get("range")) || 30) as 7 | 30 | 90;
    return ok(db.dashboardSummary([7, 30, 90].includes(range) ? range : 30));
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
