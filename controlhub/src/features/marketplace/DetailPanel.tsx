import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/Toggle";
import { useChat } from "@/store/chat";
import type { Agent } from "@/lib/api/types";

/** Format a raw token count into a human-readable string. */
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

function fmtLatency(ms: number): string {
  if (ms === 0) return "—";
  return ms >= 1000 ? (ms / 1000).toFixed(1) + " s" : ms.toFixed(0) + " ms";
}

export function DetailPanel({
  agent,
  onClose,
  onToggle,
}: {
  agent: Agent | null;
  onClose: () => void;
  onToggle: () => void;
}) {
  const openChat = useChat((s) => s.open);

  const categoryLabel = agent?.category_name ?? "General";
  const modelLabel = agent ? (agent.model_name ?? agent.template_key) : "";

  // Token budget progress
  const tokenPct =
    agent?.monthly_token_limit && agent.monthly_token_limit > 0
      ? Math.min(100, Math.round((agent.tokens_30d / agent.monthly_token_limit) * 100))
      : null;

  return createPortal(
    <AnimatePresence>
      {agent && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-primary/30 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "105%" }}
            animate={{ x: 0 }}
            exit={{ x: "105%" }}
            transition={{ type: "tween", ease: [0.4, 0, 0.2, 1], duration: 0.36 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-white shadow-2xl md:w-[460px]"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-g-mid bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-secondary/10">
                  <span className="text-xl">🤖</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-primary">{agent.name}</h2>
                  <p className="text-xs text-g-dark">
                    {categoryLabel} · {modelLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-g-light text-g-dark transition-colors hover:bg-g-mid"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6 p-6">
                {/* Enable / disable toggle */}
                <div className="flex items-center justify-between rounded-2xl bg-g-light p-4">
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      {agent.enabled ? "Enabled" : "Available"}
                    </p>
                    <p className="text-xs text-g-dark">
                      {agent.enabled ? "Active for this tenant" : "Activate to start using"}
                    </p>
                  </div>
                  <Toggle checked={agent.enabled} onChange={onToggle} />
                </div>

                {agent.description && (
                  <Section title="Description">
                    <p className="text-sm leading-relaxed text-primary">{agent.description}</p>
                  </Section>
                )}

                {agent.capabilities.length > 0 && (
                  <Section title="Capabilities">
                    <ul className="space-y-2">
                      {agent.capabilities.map((c) => (
                        <li key={c} className="flex items-start gap-2.5 text-sm text-primary">
                          <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary-600">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {agent.tools.length > 0 && (
                  <Section title="Tools">
                    <div className="flex flex-wrap gap-2">
                      {agent.tools.map((t) => (
                        <span key={t} className="rounded-lg bg-g-light px-2.5 py-1 text-xs text-g-dark">
                          {t}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                {agent.example_questions.length > 0 && (
                  <Section title="Example questions">
                    <div className="space-y-2">
                      {agent.example_questions.map((p) => (
                        <button
                          key={p}
                          onClick={() => openChat(agent as unknown as Parameters<typeof openChat>[0])}
                          className="w-full rounded-xl bg-g-light px-3 py-2.5 text-left text-sm text-primary transition-colors hover:bg-g-mid"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Usage stats */}
                <div className="rounded-2xl bg-g-light p-4">
                  <p className="eyebrow mb-3">Usage this month</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <Usage
                      value={agent.invocations_30d > 0 ? String(agent.invocations_30d) : "—"}
                      label="Queries"
                    />
                    <Usage
                      value={agent.tokens_30d > 0 ? fmtTokens(agent.tokens_30d) : "—"}
                      label="Tokens"
                    />
                    <Usage value={fmtLatency(agent.avg_latency_ms)} label="Latency" />
                  </div>

                  {/* Per-agent token budget bar */}
                  {tokenPct !== null && (
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-g-dark">Monthly token budget</span>
                        <span className="font-semibold text-primary">
                          {fmtTokens(agent.tokens_30d)} / {fmtTokens(agent.monthly_token_limit!)}
                          <span className="ml-1 text-g-dark">({tokenPct}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-g-mid">
                        <div
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-700",
                            tokenPct >= 95 ? "bg-error" : tokenPct >= 80 ? "bg-warning" : "bg-secondary"
                          )}
                          style={{ width: `${tokenPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Success rate */}
                  {agent.success_rate > 0 && (
                    <p className="mt-3 text-center text-xs text-g-dark">
                      Success rate:{" "}
                      <span className="font-semibold text-ok">{agent.success_rate.toFixed(1)}%</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-g-mid bg-white px-6 py-4">
              <button
                onClick={() => openChat(agent as unknown as Parameters<typeof openChat>[0])}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:shadow-lg",
                  "bg-primary hover:bg-primary-600"
                )}
              >
                <MessageSquare className="h-[15px] w-[15px]" />
                Open chat with this agent
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-3">{title}</p>
      {children}
    </div>
  );
}

function Usage({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="stat-number text-xl font-bold text-primary">{value}</p>
      <p className="text-xs text-g-dark">{label}</p>
    </div>
  );
}
