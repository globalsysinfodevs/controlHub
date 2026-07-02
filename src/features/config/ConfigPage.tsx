import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Building2, Copy, Cpu, Eye, KeyRound, Plus, Save, Sparkles, Terminal } from "lucide-react";
import { Toggle } from "@/components/ui/Toggle";
import { toast } from "@/components/ui/Toast";
import { isMock } from "@/lib/api/client";
import { modelsApi, tenantApi, type LLMModel } from "@/lib/api/endpoints";
import { useAuth, isSuperAdmin } from "@/store/auth";
import { EquipoTab } from "./EquipoTab";
import { PlanTab, SeguridadTab } from "./BillingSecurityTabs";

// All tabs — filtered per role below.
const ALL_TABS = [
  { key: "general",   label: "General",       superAdminOnly: false },
  { key: "modelos",   label: "Modelos",        superAdminOnly: true  },
  { key: "equipo",    label: "Equipo",         superAdminOnly: false },
  { key: "plan",      label: "Plan & Billing", superAdminOnly: false },
  { key: "seguridad", label: "Seguridad",      superAdminOnly: false },
];

const FIELD = "w-full rounded-xl border border-g-mid bg-g-light px-4 py-2.5 text-sm text-primary transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20";

interface Profile {
  name: string;
  rfc: string;
  billing_email: string;
  timezone: string;
}
const DEFAULT_PROFILE: Profile = { name: "Acme Corp", rfc: "ACM-010101-AB1", billing_email: "finanzas@acmecorp.mx", timezone: "América/Ciudad_de_México (UTC−6)" };
const DEFAULT_NOTIFS = { token_alerts_enabled: true, weekly_summary_email_enabled: true, new_agent_notifications_enabled: true, agent_error_alerts_enabled: false };

export function ConfigPage() {
  const user = useAuth((s) => s.user);
  const superAdmin = isSuperAdmin(user?.role);
  // Only show tabs the current role is allowed to see.
  const TABS = ALL_TABS.filter((t) => !t.superAdminOnly || superAdmin);

  const [tab, setTab] = useState("general");
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [notifs, setNotifs] = useState(DEFAULT_NOTIFS);
  const [saving, setSaving] = useState(false);

  // Live tenant config (real backend). Disabled in mock mode.
  const profileQ = useQuery({ queryKey: ["tenant", "profile"], queryFn: () => tenantApi.profile(), enabled: !isMock, retry: false });
  const apiAccessQ = useQuery({ queryKey: ["tenant", "api-access"], queryFn: () => tenantApi.apiAccess(), enabled: !isMock, retry: false });
  const notifsQ = useQuery({ queryKey: ["tenant", "notifs"], queryFn: () => tenantApi.notifications(), enabled: !isMock, retry: false });

  useEffect(() => {
    if (profileQ.data) {
      const d = profileQ.data;
      setProfile({
        name: d.name ?? "",
        rfc: d.rfc ?? "",
        billing_email: d.billing_email ?? "",
        timezone: d.timezone ?? "UTC",
      });
    }
  }, [profileQ.data]);
  useEffect(() => {
    if (notifsQ.data) setNotifs({ ...DEFAULT_NOTIFS, ...notifsQ.data });
  }, [notifsQ.data]);

  const apiAccess = apiAccessQ.data;
  const tenantId = apiAccess?.tenant_id ?? "tenant_acme_7f3k2p";
  const apiToken = apiAccess?.api_token ?? "sk-agentos-acme-X9kM2pL8vQr5tNwA3jHeBdCuFoZiYg";
  const endpointBase = apiAccess?.endpoint_base ?? "https://api.agentos.io/v1/tenant_acme_7f3k2p";

  async function saveGeneral() {
    if (isMock) {
      toast.success("Cambios guardados");
      return;
    }
    setSaving(true);
    try {
      await tenantApi.updateProfile(profile);
      await tenantApi.updateNotifications(notifs);
      toast.success("Cambios guardados");
    } catch (e) {
      toast.error("No se pudo guardar", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="border-b border-g-mid bg-white px-5 pt-5 sm:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">Configuración</h1>
            <p className="mt-0.5 text-xs text-g-dark">Gestiona tu cuenta, integraciones y preferencias de agentes</p>
          </div>
          <button disabled={saving} onClick={saveGeneral} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-600 hover:shadow-lg disabled:opacity-60">
            <Save className="h-3.5 w-3.5" /> {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
        <div className="mt-5 flex items-center gap-0 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                "whitespace-nowrap border-b-2 px-5 py-3 text-sm transition-colors " +
                (tab === t.key ? "border-secondary font-semibold text-primary" : "border-transparent text-g-dark hover:text-primary")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-8">
        {tab === "general" && (
          <>
            <Card icon={<Building2 className="h-4 w-4 text-primary" />} tint="bg-primary/10" title="Perfil de la organización" sub="Información que aparece en reportes y exportaciones">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <Lbl>Nombre de la empresa</Lbl>
                  <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={FIELD} />
                </div>
                <div>
                  <Lbl>RFC / Tax ID</Lbl>
                  <input value={profile.rfc} onChange={(e) => setProfile({ ...profile, rfc: e.target.value })} className={FIELD} />
                </div>
                <div>
                  <Lbl>Correo de facturación</Lbl>
                  <input value={profile.billing_email} onChange={(e) => setProfile({ ...profile, billing_email: e.target.value })} className={FIELD} />
                </div>
                <div>
                  <Lbl>Industria</Lbl>
                  <select className={FIELD}>
                    <option>Tecnología / Software</option>
                    <option>Telecomunicaciones</option>
                    <option>Servicios Financieros</option>
                    <option>Manufactura</option>
                    <option>Retail</option>
                    <option>Salud</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Lbl>Zona horaria</Lbl>
                  <input value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} className={FIELD} />
                </div>
              </div>
            </Card>

            <Card icon={<Terminal className="h-4 w-4 text-secondary" />} tint="bg-secondary/10" title="Acceso API del Tenant" sub="Credenciales para integraciones programáticas">
              <div className="space-y-4">
                <div>
                  <Lbl>Tenant ID</Lbl>
                  <div className="flex items-center gap-2">
                    <input readOnly value={tenantId} className={FIELD + " flex-1 font-mono text-g-dark"} />
                    <button onClick={() => { navigator.clipboard?.writeText(tenantId); toast.success("Copiado"); }} className="flex items-center gap-1.5 rounded-xl border border-g-mid bg-g-light px-4 py-2.5 text-xs text-g-dark transition-colors hover:bg-g-mid">
                      <Copy className="h-3 w-3" /> Copiar
                    </button>
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <Lbl noMargin>API Token</Lbl>
                    <button onClick={() => toast.warning("Token regenerado", "Actualiza tus integraciones")} className="text-xs text-danger hover:underline">Regenerar token</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="password" value={apiToken} readOnly className={FIELD + " flex-1 font-mono"} />
                    <button className="rounded-xl border border-g-mid bg-g-light px-4 py-2.5 text-g-dark transition-colors hover:bg-g-mid"><Eye className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-xl border border-secondary/20 bg-secondary/5 p-3">
                  <KeyRound className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-secondary" />
                  <p className="text-xs text-g-dark">Endpoint base: <span className="font-mono font-medium text-primary">{endpointBase}</span></p>
                </div>
              </div>
            </Card>

            <Card icon={<Bell className="h-4 w-4 text-tertiary" />} tint="bg-tertiary/10" title="Notificaciones" sub="Configura qué alertas deseas recibir">
              <div>
                <NotifRow title="Alertas de consumo de tokens" sub="Notificar cuando el uso supere el 80% del plan" checked={notifs.token_alerts_enabled} onChange={(v) => setNotifs({ ...notifs, token_alerts_enabled: v })} />
                <NotifRow title="Resumen semanal por correo" sub="Reporte de uso cada lunes 9:00 AM" checked={notifs.weekly_summary_email_enabled} onChange={(v) => setNotifs({ ...notifs, weekly_summary_email_enabled: v })} />
                <NotifRow title="Nuevos agentes disponibles" sub="Avisar cuando se agreguen agentes al catálogo" checked={notifs.new_agent_notifications_enabled} onChange={(v) => setNotifs({ ...notifs, new_agent_notifications_enabled: v })} />
                <NotifRow title="Alertas de errores y timeouts" sub="Notificar si un agente falla más de 3 veces" checked={notifs.agent_error_alerts_enabled} onChange={(v) => setNotifs({ ...notifs, agent_error_alerts_enabled: v })} />
              </div>
            </Card>
          </>
        )}

        {tab === "modelos" && <ModelosTab />}
        {tab === "equipo" && <EquipoTab />}
        {tab === "plan" && <PlanTab />}
        {tab === "seguridad" && <SeguridadTab />}
      </div>
    </div>
  );
}

function Card({ icon, tint, title, sub, children }: { icon: React.ReactNode; tint: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="panel p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className={"flex h-8 w-8 items-center justify-center rounded-xl " + tint}>{icon}</div>
        <div>
          <h3 className="text-sm font-semibold text-primary">{title}</h3>
          <p className="text-xs text-g-dark">{sub}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Lbl({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return <label className={"block text-xs font-semibold text-g-dark " + (noMargin ? "" : "mb-1.5")}>{children}</label>;
}

// ── Modelos tab — Super Admin model catalogue (IAlestra AI API, §22) ─────────
const MOCK_MODELS: LLMModel[] = [
  { id: "m1", name: "gpt-4o", display_name: "GPT-4o", is_active: true, deprecation_date: null, default_for_new_tenants: false },
  { id: "m2", name: "gpt-5.4", display_name: "GPT-5.4", is_active: true, deprecation_date: null, default_for_new_tenants: false },
  { id: "m3", name: "gpt-4.1", display_name: "GPT-4.1", is_active: true, deprecation_date: null, default_for_new_tenants: false },
  { id: "m4", name: "gpt-4o-mini", display_name: "GPT-4o mini", is_active: true, deprecation_date: null, default_for_new_tenants: true },
];

function ModelosTab() {
  const qc = useQueryClient();
  const modelsQ = useQuery({ queryKey: ["models", "all"], queryFn: () => modelsApi.listAll(), enabled: !isMock, retry: false });
  const availQ = useQuery({ queryKey: ["models", "available"], queryFn: () => modelsApi.available(), enabled: !isMock, retry: false });

  const models: LLMModel[] = isMock ? MOCK_MODELS : (modelsQ.data as LLMModel[] | undefined) ?? [];
  const available = isMock ? [] : availQ.data ?? [];
  const [adding, setAdding] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["models"] });
  };

  async function add(name: string) {
    if (!name) return;
    if (isMock) return toast.info("Modo demo", "Conéctate al backend para administrar modelos.");
    try {
      await modelsApi.add({ name });
      toast.success("Modelo añadido", name);
      setAdding("");
      refresh();
    } catch (e) {
      toast.error("No se pudo añadir", (e as Error).message);
    }
  }

  async function toggle(m: LLMModel, on: boolean) {
    if (isMock) return;
    try {
      await modelsApi.update(m.id, { is_active: on });
      refresh();
    } catch (e) {
      toast.error("No se pudo actualizar", (e as Error).message);
    }
  }

  async function makeDefault(m: LLMModel) {
    if (isMock) return;
    try {
      await modelsApi.update(m.id, { default_for_new_tenants: true });
      toast.success("Modelo por defecto actualizado", m.display_name);
      refresh();
    } catch (e) {
      toast.error("No se pudo actualizar", (e as Error).message);
    }
  }

  return (
    <Card icon={<Cpu className="h-4 w-4 text-secondary" />} tint="bg-secondary/10" title="Catálogo de modelos (IAlestra AI API)" sub="Solo el Super Admin activa modelos del proveedor IAlestra. Los tenants solo pueden usar modelos activos.">
      {/* Add from the IAlestra universe */}
      {available.length > 0 && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-secondary/20 bg-secondary/5 p-3">
          <Sparkles className="h-4 w-4 flex-shrink-0 text-secondary" />
          <span className="text-xs text-g-dark">Añadir del catálogo IAlestra:</span>
          <select value={adding} onChange={(e) => setAdding(e.target.value)} className="rounded-lg border border-g-mid bg-white px-3 py-1.5 text-xs text-primary focus:border-secondary focus:outline-none">
            <option value="">Selecciona un modelo…</option>
            {available.map((n) => (<option key={n} value={n}>{n}</option>))}
          </select>
          <button onClick={() => add(adding)} disabled={!adding} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-50">
            <Plus className="h-3 w-3" /> Añadir
          </button>
        </div>
      )}

      <div className="divide-y divide-g-mid">
        {models.length === 0 && <p className="py-6 text-sm text-g-dark">No hay modelos en el catálogo. Añade uno del proveedor IAlestra.</p>}
        {models.map((m) => (
          <div key={m.id} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Cpu className="h-4 w-4" /></span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-primary">{m.display_name}</p>
                  {m.default_for_new_tenants && <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-2xs font-medium text-secondary-600">Por defecto</span>}
                  {!m.is_active && <span className="rounded-full bg-g-mid px-2 py-0.5 text-2xs text-g-dark">Inactivo</span>}
                </div>
                <p className="font-mono text-2xs text-g-dark">{m.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {m.is_active && !m.default_for_new_tenants && (
                <button onClick={() => makeDefault(m)} className="text-2xs text-secondary-600 hover:underline">Hacer por defecto</button>
              )}
              <Toggle checked={m.is_active} onChange={(on) => toggle(m, on)} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function NotifRow({ title, sub, checked, onChange }: { title: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border-b border-g-mid py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-primary">{title}</p>
        <p className="text-xs text-g-dark">{sub}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}
