import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Plus, Send } from "lucide-react";
import { useChat } from "@/store/chat";
import { streamChat } from "@/lib/api/endpoints";
import { CAT_LABEL, type CatalogAgent } from "@/features/marketplace/data";
import { Markdown } from "./Markdown";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

export function ChatView() {
  const { agent, close } = useChat();
  return createPortal(
    <AnimatePresence>
      {agent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex flex-col bg-g-light"
        >
          <ChatThread key={agent.id} agent={agent} onClose={close} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function ChatThread({ agent, onClose }: { agent: CatalogAgent; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionTokens, setSessionTokens] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cancel = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const prompt = text.trim().replace(/^"|"$/g, "");
    if (!prompt || streaming) return;
    setInput("");
    cancel.current = false;
    const userMsg: Msg = { id: "u" + Date.now(), role: "user", content: prompt };
    const aId = "a" + Date.now();
    setMessages((m) => [...m, userMsg, { id: aId, role: "assistant", content: "", pending: true }]);
    setStreaming(true);
    try {
      for await (const chunk of streamChat(agent.id, prompt)) {
        if (cancel.current) break;
        if (chunk.delta) setMessages((m) => m.map((x) => (x.id === aId ? { ...x, content: x.content + chunk.delta } : x)));
        if (chunk.done) {
          setSessionTokens((t) => t + (chunk.tokens ?? 0));
          setMessages((m) => m.map((x) => (x.id === aId ? { ...x, pending: false } : x)));
        }
      }
    } finally {
      setMessages((m) => m.map((x) => (x.id === aId ? { ...x, pending: false } : x)));
      setStreaming(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex h-16 flex-shrink-0 items-center justify-between bg-primary px-5 shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="mr-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20" aria-label="Volver">
            <ChevronLeft className="h-4 w-4 text-white" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,rgba(0,184,255,.3),rgba(0,184,255,.1))" }}>
            <span className="text-lg">{agent.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white">{agent.name}</p>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
            </div>
            <p className="text-xs text-white/50">{CAT_LABEL[agent.cat]} · {agent.model}</p>
          </div>
        </div>
        <button onClick={() => { setMessages([]); setSessionTokens(0); }} className="flex items-center gap-1.5 rounded-lg bg-secondary/20 px-3 py-1.5 text-xs text-secondary transition-colors hover:bg-secondary/30">
          <Plus className="h-3.5 w-3.5" /> Nuevo chat
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-panel">{agent.icon}</div>
            <h3 className="text-lg font-bold text-primary">Chatea con {agent.name}</h3>
            <p className="mt-1.5 text-sm text-g-dark">Corre sobre {agent.model}. Prueba una de estas:</p>
            <div className="mt-5 grid w-full gap-2">
              {agent.prompts.map((p) => (
                <button key={p} onClick={() => send(p)} className="rounded-xl border border-g-mid bg-white p-3 text-left text-sm text-primary transition-all hover:-translate-y-0.5 hover:border-secondary hover:shadow-panel">
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((m) => (
              <Bubble key={m.id} msg={m} agent={agent} />
            ))}
          </div>
        )}
      </div>

      {/* Session bar */}
      <div className="flex items-center justify-between border-t border-g-mid bg-white px-6 py-2">
        <span className="text-xs text-g-dark">Sesión: <span className="font-semibold text-primary">{sessionTokens.toLocaleString()}</span> tokens</span>
        <div className="flex items-center gap-1.5 text-xs text-g-dark">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
          {agent.model}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-g-mid bg-white px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-3xl items-end gap-3 rounded-2xl border border-g-mid bg-g-light px-4 py-3 focus-within:border-secondary">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            rows={1}
            placeholder="Pregunta algo al agente..."
            className="max-h-32 flex-1 resize-none bg-transparent text-sm leading-relaxed text-primary placeholder-g-dark focus:outline-none"
          />
          <button onClick={() => send(input)} disabled={!input.trim() || streaming} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-600 disabled:opacity-40" aria-label="Enviar">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-g-dark">Los resultados pueden contener errores. Verifica información crítica.</p>
      </div>
    </>
  );
}

function Bubble({ msg, agent }: { msg: Msg; agent: CatalogAgent }) {
  const isUser = msg.role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={"flex gap-3 " + (isUser ? "flex-row-reverse" : "")}>
      {isUser ? (
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-white">Tú</span>
      ) : (
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white text-base shadow-panel">{agent.icon}</span>
      )}
      <div className={"max-w-[85%] rounded-2xl px-4 py-3 " + (isUser ? "rounded-tr-sm bg-primary text-white" : "rounded-tl-sm border border-g-mid bg-white")}>
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
        ) : msg.content ? (
          <Markdown text={msg.content} />
        ) : (
          <div className="flex items-center gap-1 py-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-g-dark" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
