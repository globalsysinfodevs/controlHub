import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/Toggle";
import { useChat } from "@/store/chat";
import { CAT_ACCENT, CAT_LABEL, type Accent, type CatalogAgent } from "./data";

const ACCENT_TILE: Record<Accent, string> = {
  secondary: "linear-gradient(135deg,rgba(0,184,255,.18),rgba(0,184,255,.05))",
  tertiary: "linear-gradient(135deg,rgba(158,0,190,.18),rgba(158,0,190,.05))",
  primary: "linear-gradient(135deg,rgba(26,33,81,.16),rgba(26,33,81,.04))",
};

export function DetailPanel({
  agent,
  onClose,
  onToggle,
}: {
  agent: CatalogAgent | null;
  onClose: () => void;
  onToggle: () => void;
}) {
  const openChat = useChat((s) => s.open);

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
                <div
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ background: ACCENT_TILE[CAT_ACCENT[agent.cat]] }}
                >
                  <span className="text-xl">{agent.icon}</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-primary">{agent.name}</h2>
                  <p className="text-xs text-g-dark">
                    {CAT_LABEL[agent.cat]} · {agent.model}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-g-light text-g-dark transition-colors hover:bg-g-mid"
                aria-label="Cerrar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6 p-6">
                <div className="flex items-center justify-between rounded-2xl bg-g-light p-4">
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      {agent.enabled ? "Habilitado" : "Disponible"}
                    </p>
                    <p className="text-xs text-g-dark">
                      {agent.enabled ? "Activo desde 14 enero, 2025" : "Actívalo para empezar a usarlo"}
                    </p>
                  </div>
                  <Toggle checked={agent.enabled} onChange={onToggle} />
                </div>

                <Section title="Descripción">
                  <p className="text-sm leading-relaxed text-primary">{agent.desc}</p>
                </Section>

                <Section title="Capacidades">
                  <ul className="space-y-2">
                    {agent.caps.map((c) => (
                      <li key={c} className="flex items-start gap-2.5 text-sm text-primary">
                        <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary-600">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section title="Herramientas">
                  <div className="flex flex-wrap gap-2">
                    {agent.tools.map((t) => (
                      <span key={t} className="rounded-lg bg-g-light px-2.5 py-1 text-xs text-g-dark">
                        {t}
                      </span>
                    ))}
                  </div>
                </Section>

                {agent.prompts.length > 0 && (
                  <Section title="Preguntas de ejemplo">
                    <div className="space-y-2">
                      {agent.prompts.map((p) => (
                        <button
                          key={p}
                          onClick={() => openChat(agent)}
                          className="w-full rounded-xl bg-g-light px-3 py-2.5 text-left text-sm text-primary transition-colors hover:bg-g-mid"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </Section>
                )}

                {agent.collab.length > 0 && (
                  <Section title="Colabora con">
                    <div className="flex flex-wrap gap-2">
                      {agent.collab.map((c) => (
                        <span
                          key={c.name}
                          className="flex items-center gap-1.5 rounded-lg border border-g-mid bg-white px-2.5 py-1 text-xs text-primary"
                        >
                          <span>{c.icon}</span>
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                <div className="rounded-2xl bg-g-light p-4">
                  <p className="eyebrow mb-3">Uso este mes</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <Usage value={agent.queries ? String(agent.queries) : "—"} label="Consultas" />
                    <Usage value={agent.tokens} label="Tokens" />
                    <Usage value={agent.latency} label="Latencia" />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-g-mid bg-white px-6 py-4">
              <button
                onClick={() => openChat(agent)}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:shadow-lg",
                  "bg-primary hover:bg-primary-600"
                )}
              >
                <MessageSquare className="h-[15px] w-[15px]" />
                Abrir chat con este agente
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
