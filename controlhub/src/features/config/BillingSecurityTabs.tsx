import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, Coins, Plus, Save, ShieldCheck, Trash2, Users, Zap } from "lucide-react";
import { Toggle } from "@/components/ui/Toggle";
import { toast } from "@/components/ui/Toast";
import { isMock } from "@/lib/api/client";
import { tenantApi, type TenantPlan, type TenantSecurity } from "@/lib/api/endpoints";
import { useAuth, isSuperAdmin } from "@/store/auth";

const fmtCompact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

// ── Plan & Billing ────────────────────────────────────────────────────────────
const DEFAULT_PLAN: TenantPlan = { plan_name: "Pro", monthly_token_limit: 5_000_000, monthly_cost: 199, max_agents: 8, max_users: 15 };

export function PlanTab() {
  const user = useAuth((s) => s.user);
  const superAdmin = isSuperAdmin(user?.role);
  const q = useQuery({ queryKey: ["tenant", "plan"], queryFn: () => tenantApi.plan(), enabled: !isMock && !superAdmin, retry: false });
  const [plan, setPlan] = useState<TenantPlan>(DEFAULT_PLAN);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (q.data) setPlan({ ...DEFAULT_PLAN, ...q.data }); }, [q.data]);

  async function save() {
    if (isMock) return toast.info("Modo demo", "Conéctate al backend para guardar el plan.");
    setSaving(true);
    try { await tenantApi.updatePlan(plan); toast.success("Plan actualizado"); } catch (e) { toast.error("No se pudo guardar", (e as Error).message); } finally { setSaving(false); }
  }

  return (
    <div className="panel p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-primary">Plan actual · {plan.plan_name ?? "—"}</h3>
          <p className="text-xs text-g-dark">Configura el consumo máximo mensual y el costo del tenant</p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600 disabled:opacity-60">
          <Save className="h-3.5 w-3.5" /> {saving ? "Guardando…" : "Guardar plan"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <PlanCard icon={<Bot className="h-4 w-4 text-secondary" />} label="Agentes máx." value={plan.max_agents ?? 0} onChange={(v) => setPlan({ ...plan, max_agents: v })} />
        <PlanCard icon={<Zap className="h-4 w-4 text-tertiary" />} label="Tokens / mes" value={plan.monthly_token_limit ?? 0} onChange={(v) => setPlan({ ...plan, monthly_token_limit: v })} hint={fmtCompact(plan.monthly_token_limit ?? 0)} />
        <PlanCard icon={<Users className="h-4 w-4 text-primary" />} label="Usuarios máx." value={plan.max_users ?? 0} onChange={(v) => setPlan({ ...plan, max_users: v })} />
        <PlanCard icon={<Coins className="h-4 w-4 text-ok" />} label="Costo USD / mes" value={plan.monthly_cost ?? 0} onChange={(v) => setPlan({ ...plan, monthly_cost: v })} prefix="$" />
      </div>
    </div>
  );
}

function PlanCard({ icon, label, value, onChange, hint, prefix }: { icon: React.ReactNode; label: string; value: number; onChange: (v: number) => void; hint?: string; prefix?: string }) {
  return (
    <div className="rounded-2xl border border-g-mid bg-g-light/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white">{icon}</span>
        {hint && <span className="text-2xs text-g-dark">{hint}</span>}
      </div>
      <div className="flex items-baseline gap-1">
        {prefix && <span className="text-sm font-bold text-primary">{prefix}</span>}
        <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full bg-transparent text-xl font-bold text-primary focus:outline-none" />
      </div>
      <p className="mt-1 text-xs text-g-dark">{label}</p>
    </div>
  );
}

// ── Seguridad ─────────────────────────────────────────────────────────────────
const DEFAULT_SEC: TenantSecurity = { azure_ad_enabled: false, mfa_required: true, allowed_ips: ["192.168.1.0/24", "10.0.0.0/8"], prompt_storage_mode: "full", advanced_audit_logging: true };

export function SeguridadTab() {
  const user = useAuth((s) => s.user);
  const superAdmin = isSuperAdmin(user?.role);
  const q = useQuery({ queryKey: ["tenant", "security"], queryFn: () => tenantApi.security(), enabled: !isMock && !superAdmin, retry: false });
  const [sec, setSec] = useState<TenantSecurity>(DEFAULT_SEC);
  const [ip, setIp] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (q.data) setSec({ ...DEFAULT_SEC, ...q.data }); }, [q.data]);

  async function save() {
    if (isMock) return toast.info("Modo demo", "Conéctate al backend para guardar la configuración.");
    setSaving(true);
    try { await tenantApi.updateSecurity(sec); toast.success("Configuración de seguridad guardada"); } catch (e) { toast.error("No se pudo guardar", (e as Error).message); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div className="panel p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-4 w-4" /></span>
            <div><h3 className="text-sm font-semibold text-primary">Autenticación y acceso</h3><p className="text-xs text-g-dark">Métodos de acceso y registro de auditoría</p></div>
          </div>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600 disabled:opacity-60">
            <Save className="h-3.5 w-3.5" /> {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
        <SecRow title="Autenticación de dos factores (MFA)" sub="Obligatoria para todos los miembros" checked={sec.mfa_required} onChange={(v) => setSec({ ...sec, mfa_required: v })} />
        <SecRow title="SSO con Active Directory / SAML 2.0" sub="Integra con tu proveedor de identidad corporativo" checked={sec.azure_ad_enabled} onChange={(v) => setSec({ ...sec, azure_ad_enabled: v })} />
        <SecRow title="Registro de auditoría detallado" sub="Almacena el prompt y la respuesta completos de cada ejecución" checked={sec.advanced_audit_logging} onChange={(v) => setSec({ ...sec, advanced_audit_logging: v, prompt_storage_mode: v ? "full" : "metadata_only" })} last />
      </div>

      <div className="panel p-6">
        <h3 className="mb-1 text-sm font-semibold text-primary">Lista de IPs permitidas</h3>
        <p className="mb-4 text-xs text-g-dark">Solo estas IPs podrán acceder a la API del tenant</p>
        <div className="space-y-2">
          {sec.allowed_ips.map((cidr: string, i: number) => (
            <div key={cidr + i} className="flex items-center justify-between rounded-xl border border-g-mid bg-g-light/50 px-4 py-2.5">
              <span className="font-mono text-sm text-primary">{cidr}</span>
              <button onClick={() => setSec({ ...sec, allowed_ips: sec.allowed_ips.filter((_: string, j: number) => j !== i) })} className="text-g-dark hover:text-danger"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.1.0/24" className="h-9 flex-1 rounded-xl border border-g-mid bg-white px-3 font-mono text-sm text-primary placeholder-g-dark focus:border-secondary focus:outline-none" />
          <button onClick={() => { if (ip.trim()) { setSec({ ...sec, allowed_ips: [...sec.allowed_ips, ip.trim()] }); setIp(""); } }} className="flex items-center gap-1 rounded-xl border border-g-mid bg-g-light px-3 py-2 text-xs text-g-dark hover:bg-g-mid">
            <Plus className="h-3 w-3" /> Agregar IP
          </button>
        </div>
      </div>
    </div>
  );
}

function SecRow({ title, sub, checked, onChange, last }: { title: string; sub: string; checked: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <div className={"flex items-center justify-between py-3 " + (last ? "" : "border-b border-g-mid")}>
      <div><p className="text-sm font-medium text-primary">{title}</p><p className="text-xs text-g-dark">{sub}</p></div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}
