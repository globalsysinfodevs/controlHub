import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Bot,
  Cpu,
  Hash,
  Sparkles,
  Square,
  Thermometer,
  Wrench,
} from "lucide-react";
import type { Agent, ChatMessage } from "@/lib/api/types";
import { agentsApi, streamChat } from "@/lib/api/endpoints";
import { cn, formatInt } from "@/lib/utils";
import { Sigil } from "@/components/ui/Sigil";
import { Badge, StatusDot } from "@/components/ui/Badge";
import { CenteredLoader } from "@/components/ui/Feedback";
import { CATEGORY_META } from "@/features/agents/meta";
import { Markdown } from "./Markdown";

const SUGGESTIONS: Record<string, string[]> = {
  support: ["Draft a refund for a double-charged subscriber", "Explain our SLA for fiber outages"],
  analytics: ["Show Q2 ARPU by region", "Which plans churned most last month?"],
  knowledge: ["Summarize the incident runbook for a fiber cut", "What's our data retention policy?"],
  default: ["What can you help me with?", "Walk me through your tools and limits"],
};

export function ChatPage() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents", "chat"],
    queryFn: () => agentsApi.list({ status: "active", page_size: 100 }),
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = agents?.find((a) => a.id === activeId) ?? agents?.[0] ?? null;

  useEffect(() => {
    if (!activeId && agents?.length) setActiveId(agents[0].id);
  }, [agents, activeId]);

  if (isLoading) return <CenteredLoader label="Loading agents…" />;

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Agent rail */}
      <aside className="hidden w-64 shrink-0 flex-col panel overflow-hidden lg:flex">
        <div className="border-b border-line p-4">
          <p className="eyebrow">Execution</p>
          <h3 className="mt-1 font-display text-sm font-semibold">Choose an agent</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {agents?.map((a) => {
            const cat = CATEGORY_META[a.category];
            const on = a.id === active?.id;
            return (
              <button
                key={a.id}
                onClick={() => setActiveId(a.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors",
                  on ? "bg-brand-500/12" : "hover:bg-ink/[0.03]"
                )}
              >
                <Sigil seed={a.id} name={a.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{a.name}</p>
                  <p className="flex items-center gap-1 text-2xs text-ink-faint">
                    <cat.icon className="h-3 w-3" />
                    {cat.label}
                  </p>
                </div>
                {on && <StatusDot tone="brand" pulse />}
              </button>
            );
          })}
        </div>
      </aside>

      {active && <ChatThread key={active.id} agent={active} />}
    </div>
  );
}

function ChatThread({ agent }: { agent: Agent }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);
  const cat = CATEGORY_META[agent.category];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || streaming) return;
    setInput("");
    cancelRef.current = false;

    const userMsg: ChatMessage = {
      id: "u" + Date.now(),
      role: "user",
      content: prompt,
      created_at: new Date().toISOString(),
    };
    const assistantId = "a" + Date.now();
    setMessages((m) => [
      ...m,
      userMsg,
      { id: assistantId, role: "assistant", content: "", created_at: new Date().toISOString(), pending: true, model: agent.model },
    ]);
    setStreaming(true);

    try {
      for await (const chunk of streamChat(agent.id, prompt)) {
        if (cancelRef.current) break;
        if (chunk.delta) {
          setMessages((m) =>
            m.map((msg) => (msg.id === assistantId ? { ...msg, content: msg.content + chunk.delta } : msg))
          );
        }
        if (chunk.done) {
          setMessages((m) =>
            m.map((msg) => (msg.id === assistantId ? { ...msg, pending: false, tokens: chunk.tokens } : msg))
          );
        }
      }
    } finally {
      setMessages((m) => m.map((msg) => (msg.id === assistantId ? { ...msg, pending: false } : msg)));
      setStreaming(false);
    }
  }

  const suggestions = SUGGESTIONS[agent.category] ?? SUGGESTIONS.default;

  return (
    <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* Thread header */}
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Sigil seed={agent.id} name={agent.name} />
          <div>
            <p className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
              {agent.name}
              <Badge tone="brand" dot>
                live
              </Badge>
            </p>
            <p className="text-2xs text-ink-faint">{agent.description}</p>
          </div>
        </div>
        <div className="hidden items-center gap-3 text-2xs text-ink-faint sm:flex">
          <span className="flex items-center gap-1">
            <Cpu className="h-3.5 w-3.5" /> {agent.model}
          </span>
          <span className="flex items-center gap-1">
            <Thermometer className="h-3.5 w-3.5" /> {agent.temperature}
          </span>
          <span className="flex items-center gap-1">
            <Wrench className="h-3.5 w-3.5" /> {agent.tools.length} tools
          </span>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center text-center">
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: cat.hue + "1a", color: cat.hue }}
            >
              <cat.icon className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-semibold text-ink">Start a conversation</h3>
            <p className="mt-1.5 text-sm text-ink-muted">
              {agent.name} runs on {agent.model}. Try one of these:
            </p>
            <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="interactive rounded-xl border border-line bg-surface-raised/50 p-3 text-left text-sm text-ink-muted hover:text-ink"
                >
                  <Sparkles className="mb-1.5 h-4 w-4 text-brand-600" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} agent={agent} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-line bg-base/30 p-3 sm:p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-line-strong bg-surface px-3 py-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/25">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder={`Message ${agent.name}…`}
            className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
          {streaming ? (
            <button
              onClick={() => (cancelRef.current = true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-line-strong bg-surface-raised text-ink-muted hover:text-ink"
              aria-label="Stop generating"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => send(input)}
              disabled={!input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-sheen text-white shadow-glow-sm transition-all hover:brightness-110 disabled:opacity-40"
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-2xs text-ink-faint">
          Responses are simulated by the mock execution engine. Press Enter to send, Shift+Enter for a new line.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ msg, agent }: { msg: ChatMessage; agent: Agent }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      {isUser ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-raised text-ink-muted">
          <span className="text-xs font-medium">You</span>
        </span>
      ) : (
        <Sigil seed={agent.id} name={agent.name} size="sm" />
      )}
      <div className={cn("min-w-0 max-w-[85%]", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser
              ? "rounded-tr-sm bg-brand-500/15 text-ink"
              : "rounded-tl-sm border border-line bg-surface-raised/70"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
          ) : msg.content ? (
            <Markdown text={msg.content} />
          ) : (
            <TypingDots />
          )}
          {msg.pending && msg.content && (
            <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-brand-400" />
          )}
        </div>
        {!isUser && msg.tokens && (
          <div className="mt-1.5 flex items-center gap-2 px-1 text-2xs text-ink-faint">
            <Bot className="h-3 w-3" />
            <span>{msg.model}</span>
            <span className="flex items-center gap-0.5">
              <Hash className="h-3 w-3" />
              {formatInt(msg.tokens)} tokens
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
