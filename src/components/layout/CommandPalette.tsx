import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { CornerDownLeft, Search } from "lucide-react";
import { useUi } from "@/store/ui";
import { agentsApi } from "@/lib/api/endpoints";
import { NAV } from "./nav";
import { Sigil } from "@/components/ui/Sigil";
import { cn } from "@/lib/utils";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  to: string;
  group: string;
  seed?: string;
}

export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useUi();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const { data: agents } = useQuery({
    queryKey: ["agents", "palette"],
    queryFn: () => agentsApi.list({ page_size: 100 }),
    enabled: commandOpen,
  });

  // Global ⌘K / Ctrl+K toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commandOpen, setCommandOpen]);

  useEffect(() => {
    if (commandOpen) {
      setQ("");
      setActive(0);
    }
  }, [commandOpen]);

  const commands = useMemo<Cmd[]>(() => {
    const pages: Cmd[] = NAV.map((n) => ({
      id: "nav-" + n.to,
      label: n.label,
      hint: "Page · " + n.section,
      to: n.to,
      group: "Navigate",
    }));
    const agentCmds: Cmd[] = (agents ?? []).map((a) => ({
      id: "agent-" + a.id,
      label: a.name,
      hint: a.category,
      to: `/agents?focus=${a.id}`,
      group: "Agents",
      seed: a.id,
    }));
    return [...pages, ...agentCmds];
  }, [agents]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((c) => (c.label + c.hint + c.group).toLowerCase().includes(needle));
  }, [commands, q]);

  function run(cmd?: Cmd) {
    const target = cmd ?? filtered[active];
    if (!target) return;
    setCommandOpen(false);
    navigate(target.to);
  }

  return createPortal(
    <AnimatePresence>
      {commandOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCommandOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="panel relative z-10 w-full max-w-xl overflow-hidden"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 text-ink-faint" />
              <input
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(a + 1, filtered.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(a - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    run();
                  }
                }}
                placeholder="Search pages and agents…"
                className="h-12 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
              />
              <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-2xs text-ink-faint">ESC</kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-ink-faint">No matches for “{q}”.</p>
              ) : (
                filtered.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => run(cmd)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      i === active ? "bg-brand-500/12" : "hover:bg-ink/[0.03]"
                    )}
                  >
                    {cmd.seed ? (
                      <Sigil seed={cmd.seed} name={cmd.label} size="xs" />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-md border border-line text-ink-faint">
                        <Search className="h-3 w-3" />
                      </span>
                    )}
                    <span className="flex-1 text-sm text-ink">{cmd.label}</span>
                    <span className="text-2xs capitalize text-ink-faint">{cmd.hint}</span>
                    {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-ink-faint" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
