import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Gauge, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/store/auth";
import { toast } from "@/components/ui/Toast";

const HIGHLIGHTS = [
  { icon: Bot, label: "Activa agentes", value: "con un clic" },
  { icon: Gauge, label: "Controla el consumo", value: "token a token" },
  { icon: ShieldCheck, label: "Protege los datos", value: "antes de exponerlos" },
];

export function LoginPage() {
  const { login, error, status } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success("Sesión iniciada", "Bienvenido a iAlestra Agentic Hub");
      navigate("/marketplace");
    } catch {
      /* error en el store */
    }
  }

  return (
    <div className="grid min-h-screen bg-g-light lg:grid-cols-2">
      {/* Left — brand panel (navy) */}
      <div className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-secondary/25 blur-[130px]" />
        <div className="pointer-events-none absolute bottom-10 left-6 h-72 w-72 rounded-full bg-tertiary/20 blur-[120px]" />

        <div className="relative flex items-center gap-2.5">
          <img src="/logo-mark.svg" alt="iAlestra" className="h-9 w-9" />
          <span className="text-lg font-bold tracking-tight text-white">
            iAlestra<span className="text-secondary"> Agentic HUB</span>
          </span>
        </div>

        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Marketplace de agentes de IA</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-white">
            El centro de control de cada agente de tu organización.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Activa agentes listos para usar, monitorea el consumo de tokens en
            tiempo real y mantén la información sensible dentro de los límites.
          </p>
          <div className="mt-8 space-y-3">
            {HIGHLIGHTS.map((h) => (
              <div key={h.label} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-secondary">
                  <h.icon className="h-4 w-4" />
                </span>
                <p className="text-sm text-white/70">
                  <span className="font-medium text-white">{h.label}</span> {h.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-white/45">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />
          Todos los sistemas operativos · API v0.1.0
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img src="/logo-mark.svg" alt="iAlestra" className="h-8 w-8" />
            <span className="text-base font-bold text-primary">iAlestra Agentic Hub</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-primary">Iniciar sesión</h2>
          <p className="mt-1.5 text-sm text-g-dark">Usa tus credenciales para acceder a la consola.</p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-g-dark">Correo</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-g-dark" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  required
                  className="h-11 w-full rounded-xl border border-g-mid bg-white pl-9 pr-4 text-sm text-primary placeholder-g-dark focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-g-dark">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-g-dark" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11 w-full rounded-xl border border-g-mid bg-white pl-9 pr-4 text-sm text-primary placeholder-g-dark focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            </div>

            {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}

            <button
              type="submit"
              disabled={status === "authenticating"}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white transition-all hover:bg-primary-600 disabled:opacity-60"
            >
              {status === "authenticating" ? "Entrando…" : "Continuar"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-g-mid bg-white px-3.5 py-3">
            <p className="text-2xs font-semibold uppercase tracking-wider text-g-dark">Acceso</p>
            <p className="mt-1.5 text-2xs leading-relaxed text-g-dark">
              Con el backend en vivo (<code className="text-primary">VITE_USE_MOCK=false</code>) usa tus credenciales de
              <span className="text-primary"> super-admin</span> — la autenticación llega a
              <span className="font-mono"> /api/v1/auth/super-admin/login</span>.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
