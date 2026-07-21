import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  Save,
  Shield,
  Terminal,
  Zap,
} from "lucide-react";
import {
  tenantApi,
  type LLMModel,
  type ModelDefaults,
  type NotificationsConfig,
  type SecuritySettingsUpdate,
  type TenantProfileUpdate,
} from "@/lib/api/endpoints";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { toast } from "@/components/ui/Toast";
import { CenteredLoader } from "@/components/ui/Feedback";

// ── Tab definitions ────────────────────────────────────────────────────────────

const TABS = [
  { key: "profile",       label: "Profile",        icon: Building2 },
  { key: "plan",          label: "Plan",            icon: Zap       },
  { key: "security",      label: "Security",        icon: Shield    },
  { key: "notifications", label: "Notifications",   icon: Bell      },
  { key: "models",        label: "Model Defaults",  icon: Cpu       },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ── Shared field style ─────────────────────────────────────────────────────────

const FIELD =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder-ink-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

// ── Root page ──────────────────────────────────────────────────────────────────

export function TenantConfigPage() {
  const [tab, setTab] = useState<TabKey>("profile");

  return (
    <div>
      <PageHeader
        eyebrow="Tenant"
        title="Config"
        description="Manage your organization settings, plan, security, and model preferences."
      />

      {/* Tab bar */}
      <div className="mb-6 flex items-center gap-0 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors " +
              (tab === t.key
                ? "border-brand-500 text-ink"
                : "border-transparent text-ink-muted hover:text-ink")
            }
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile"       && <ProfileTab />}
      {tab === "plan"          && <PlanTab />}
      {tab === "security"      && <SecurityTab />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "models"        && <ModelDefaultsTab />}
    </div>
  );
}

// ── Profile tab ────────────────────────────────────────────────────────────────

function ProfileTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["tenant", "profile"],
    queryFn: () => tenantApi.profile(),
    retry: false,
  });
  const { data: apiAccess, isLoading: apiLoading } = useQuery({
    queryKey: ["tenant", "api-access"],
    queryFn: () => tenantApi.apiAccess(),
    retry: false,
  });

  const [form, setForm] = useState<TenantProfileUpdate>({});
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name ?? "",
        rfc: data.rfc ?? "",
        billing_email: data.billing_email ?? "",
        timezone: data.timezone ?? "",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => tenantApi.updateProfile(form),
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["tenant", "profile"] });
    },
    onError: (e) => toast.error("Could not save profile", (e as Error).message),
  });

  const regenerate = useMutation({
    mutationFn: () => tenantApi.regenerateApiToken(),
    onSuccess: () => {
      toast.success("API token regenerated", "Update your integrations.");
      qc.invalidateQueries({ queryKey: ["tenant", "api-access"] });
    },
    onError: (e) => toast.error("Could not regenerate token", (e as Error).message),
  });

  if (isLoading) return <CenteredLoader label="Loading profile…" />;

  const tenantId = apiAccess?.tenant_id ?? "—";
  const apiToken = apiAccess?.api_token ?? "";
  const endpointBase = apiAccess?.endpoint_base ?? "—";

  return (
    <div className="space-y-5">
      {/* Organization info */}
      <SectionCard icon={<Building2 className="h-4 w-4" />} title="Organization Profile" sub="Displayed in reports and exports">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Company Name">
            <input
              value={(form.name as string) ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={FIELD}
              placeholder="Acme Corp"
            />
          </Field>
          <Field label="RFC / Tax ID">
            <input
              value={(form.rfc as string) ?? ""}
              onChange={(e) => setForm({ ...form, rfc: e.target.value })}
              className={FIELD}
              placeholder="ACM-010101-AB1"
            />
          </Field>
          <Field label="Billing Email">
            <input
              type="email"
              value={(form.billing_email as string) ?? ""}
              onChange={(e) => setForm({ ...form, billing_email: e.target.value })}
              className={FIELD}
              placeholder="billing@company.com"
            />
          </Field>
          <Field label="Timezone">
            <input
              value={(form.timezone as string) ?? ""}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className={FIELD}
              placeholder="America/Mexico_City"
            />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            leftIcon={<Save className="h-3.5 w-3.5" />}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            Save changes
          </Button>
        </div>
      </SectionCard>

      {/* API access */}
      <SectionCard icon={<Terminal className="h-4 w-4" />} title="API Access" sub="Credentials for programmatic integrations">
        {apiLoading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : (
          <div className="space-y-4">
            <Field label="Tenant ID">
              <div className="flex items-center gap-2">
                <input readOnly value={tenantId} className={FIELD + " flex-1 font-mono text-ink-muted"} />
                <button
                  onClick={() => { navigator.clipboard?.writeText(tenantId); toast.success("Copied"); }}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs text-ink-muted hover:bg-surface-raised"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
            </Field>
            <Field label="API Token">
              <div className="flex items-center gap-2">
                <input
                  type={showToken ? "text" : "password"}
                  readOnly
                  value={apiToken}
                  className={FIELD + " flex-1 font-mono"}
                />
                <button
                  onClick={() => setShowToken((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-surface-raised"
                >
                  {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                  loading={regenerate.isPending}
                  onClick={() => regenerate.mutate()}
                >
                  Regenerate
                </Button>
              </div>
            </Field>
            <div className="flex items-start gap-2 rounded-lg border border-brand-500/20 bg-brand-500/5 p-3">
              <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
              <p className="text-xs text-ink-muted">
                Base endpoint:{" "}
                <span className="font-mono font-medium text-ink">{endpointBase}</span>
              </p>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ── Plan tab ───────────────────────────────────────────────────────────────────

function PlanTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["tenant", "plan"],
    queryFn: () => tenantApi.plan(),
    retry: false,
  });

  if (isLoading) return <CenteredLoader label="Loading plan…" />;

  return (
    <SectionCard icon={<Zap className="h-4 w-4" />} title="Current Plan" sub="Your subscription details and usage limits">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Plan" value={data?.plan_name ?? "—"} />
        <StatCard
          label="Monthly Token Limit"
          value={data?.monthly_token_limit != null ? data.monthly_token_limit.toLocaleString() : "Unlimited"}
        />
        <StatCard
          label="Monthly Cost"
          value={data?.monthly_cost != null ? `$${data.monthly_cost.toLocaleString()}` : "—"}
        />
        <StatCard
          label="Max Agents"
          value={data?.max_agents != null ? data.max_agents.toLocaleString() : "Unlimited"}
        />
        <StatCard
          label="Max Users"
          value={data?.max_users != null ? data.max_users.toLocaleString() : "Unlimited"}
        />
      </div>
      <p className="mt-4 text-xs text-ink-faint">
        To change your plan, contact your platform administrator.
      </p>
    </SectionCard>
  );
}

// ── Security tab ───────────────────────────────────────────────────────────────

function SecurityTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["tenant", "security"],
    queryFn: () => tenantApi.security(),
    retry: false,
  });

  const [form, setForm] = useState<SecuritySettingsUpdate>({});
  const [ipInput, setIpInput] = useState("");

  useEffect(() => {
    if (data) {
      setForm({
        azure_ad_enabled: data.azure_ad_enabled,
        mfa_required: data.mfa_required,
        allowed_ips: data.allowed_ips ?? [],
        prompt_storage_mode: data.prompt_storage_mode ?? "standard",
        advanced_audit_logging: data.advanced_audit_logging,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => tenantApi.updateSecurity(form),
    onSuccess: () => {
      toast.success("Security settings saved");
      qc.invalidateQueries({ queryKey: ["tenant", "security"] });
    },
    onError: (e) => toast.error("Could not save settings", (e as Error).message),
  });

  if (isLoading) return <CenteredLoader label="Loading security settings…" />;

  const ips: string[] = (form.allowed_ips as string[]) ?? [];

  function addIp() {
    const ip = ipInput.trim();
    if (!ip || ips.includes(ip)) return;
    setForm({ ...form, allowed_ips: [...ips, ip] });
    setIpInput("");
  }

  function removeIp(ip: string) {
    setForm({ ...form, allowed_ips: ips.filter((x) => x !== ip) });
  }

  return (
    <div className="space-y-5">
      <SectionCard icon={<Shield className="h-4 w-4" />} title="Authentication & Access" sub="Control how users authenticate">
        <div className="divide-y divide-line">
          <ToggleRow
            title="Azure AD / SSO"
            sub="Allow users to sign in with your Azure Active Directory"
            checked={!!(form.azure_ad_enabled)}
            onChange={(v) => setForm({ ...form, azure_ad_enabled: v })}
          />
          <ToggleRow
            title="Require MFA"
            sub="All users must set up multi-factor authentication"
            checked={!!(form.mfa_required)}
            onChange={(v) => setForm({ ...form, mfa_required: v })}
          />
          <ToggleRow
            title="Advanced Audit Logging"
            sub="Log all user actions with full request context"
            checked={!!(form.advanced_audit_logging)}
            onChange={(v) => setForm({ ...form, advanced_audit_logging: v })}
          />
        </div>
      </SectionCard>

      <SectionCard icon={<Shield className="h-4 w-4" />} title="Prompt Storage" sub="How conversation prompts are stored">
        <Field label="Storage Mode">
          <select
            value={(form.prompt_storage_mode as string) ?? "standard"}
            onChange={(e) => setForm({ ...form, prompt_storage_mode: e.target.value })}
            className={FIELD}
          >
            <option value="standard">Standard</option>
            <option value="encrypted">Encrypted</option>
            <option value="none">Do not store</option>
          </select>
        </Field>
      </SectionCard>

      <SectionCard icon={<Shield className="h-4 w-4" />} title="IP Allowlist" sub="Restrict access to specific IP addresses (leave empty to allow all)">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addIp()}
              className={FIELD + " flex-1"}
              placeholder="192.168.1.0/24"
            />
            <Button size="sm" variant="outline" onClick={addIp}>
              Add
            </Button>
          </div>
          {ips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {ips.map((ip) => (
                <span
                  key={ip}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-surface-raised px-3 py-1 font-mono text-xs text-ink"
                >
                  {ip}
                  <button
                    onClick={() => removeIp(ip)}
                    className="text-ink-faint hover:text-danger"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button
          size="sm"
          leftIcon={<Save className="h-3.5 w-3.5" />}
          loading={save.isPending}
          onClick={() => save.mutate()}
        >
          Save security settings
        </Button>
      </div>
    </div>
  );
}

// ── Notifications tab ──────────────────────────────────────────────────────────

function NotificationsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["tenant", "notifs"],
    queryFn: () => tenantApi.notifications(),
    retry: false,
  });

  const [form, setForm] = useState<NotificationsConfig>({
    token_alerts_enabled: true,
    weekly_summary_email_enabled: true,
    new_agent_notifications_enabled: true,
    agent_error_alerts_enabled: false,
  });

  useEffect(() => {
    if (data) setForm({ ...form, ...data });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const save = useMutation({
    mutationFn: () => tenantApi.updateNotifications(form),
    onSuccess: () => {
      toast.success("Notification preferences saved");
      qc.invalidateQueries({ queryKey: ["tenant", "notifs"] });
    },
    onError: (e) => toast.error("Could not save preferences", (e as Error).message),
  });

  if (isLoading) return <CenteredLoader label="Loading notification settings…" />;

  return (
    <div className="space-y-5">
      <SectionCard icon={<Bell className="h-4 w-4" />} title="Notification Preferences" sub="Choose which alerts you want to receive">
        <div className="divide-y divide-line">
          <ToggleRow
            title="Token usage alerts"
            sub="Notify when usage exceeds 80% of the monthly limit"
            checked={form.token_alerts_enabled}
            onChange={(v) => setForm({ ...form, token_alerts_enabled: v })}
          />
          <ToggleRow
            title="Weekly summary email"
            sub="Usage report every Monday at 9:00 AM"
            checked={form.weekly_summary_email_enabled}
            onChange={(v) => setForm({ ...form, weekly_summary_email_enabled: v })}
          />
          <ToggleRow
            title="New agent notifications"
            sub="Alert when new agents are added to the catalogue"
            checked={form.new_agent_notifications_enabled}
            onChange={(v) => setForm({ ...form, new_agent_notifications_enabled: v })}
          />
          <ToggleRow
            title="Agent error alerts"
            sub="Notify if an agent fails more than 3 times"
            checked={form.agent_error_alerts_enabled}
            onChange={(v) => setForm({ ...form, agent_error_alerts_enabled: v })}
          />
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button
          size="sm"
          leftIcon={<Save className="h-3.5 w-3.5" />}
          loading={save.isPending}
          onClick={() => save.mutate()}
        >
          Save preferences
        </Button>
      </div>
    </div>
  );
}

// ── Model Defaults tab ─────────────────────────────────────────────────────────

function ModelDefaultsTab() {
  const qc = useQueryClient();

  const { data: models, isLoading: modelsLoading } = useQuery({
    queryKey: ["tenant", "models"],
    queryFn: () => tenantApi.models(),
    retry: false,
  });

  const { data: defaults, isLoading: defaultsLoading } = useQuery({
    queryKey: ["tenant", "model-defaults"],
    queryFn: () => tenantApi.modelDefaults(),
    retry: false,
  });

  const [form, setForm] = useState<ModelDefaults>({
    default_analysis_model_id: null,
    default_chat_model_id: null,
  });

  useEffect(() => {
    if (defaults) setForm(defaults);
  }, [defaults]);

  const save = useMutation({
    mutationFn: () => tenantApi.updateModelDefaults(form),
    onSuccess: () => {
      toast.success("Model defaults saved");
      qc.invalidateQueries({ queryKey: ["tenant", "model-defaults"] });
    },
    onError: (e) => toast.error("Could not save model defaults", (e as Error).message),
  });

  if (modelsLoading || defaultsLoading) return <CenteredLoader label="Loading models…" />;

  const modelList = (models ?? []) as LLMModel[];

  return (
    <div className="space-y-5">
      <SectionCard icon={<Cpu className="h-4 w-4" />} title="Default LLM Models" sub="Select which models are used by default for each task type">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Default Chat Model">
            <select
              value={form.default_chat_model_id ?? ""}
              onChange={(e) => setForm({ ...form, default_chat_model_id: e.target.value || null })}
              className={FIELD}
            >
              <option value="">— None —</option>
              {modelList.filter((m) => m.is_active).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name ?? m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Default Analysis Model">
            <select
              value={form.default_analysis_model_id ?? ""}
              onChange={(e) => setForm({ ...form, default_analysis_model_id: e.target.value || null })}
              className={FIELD}
            >
              <option value="">— None —</option>
              {modelList.filter((m) => m.is_active).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name ?? m.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {modelList.length === 0 && (
          <p className="mt-3 text-sm text-ink-muted">
            No active models available. Contact your platform administrator.
          </p>
        )}
      </SectionCard>

      <div className="flex justify-end">
        <Button
          size="sm"
          leftIcon={<Save className="h-3.5 w-3.5" />}
          loading={save.isPending}
          onClick={() => save.mutate()}
        >
          Save model defaults
        </Button>
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  sub,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="text-xs text-ink-muted">{sub}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-ink-muted">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-raised p-4">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function ToggleRow({
  title,
  sub,
  checked,
  onChange,
}: {
  title: string;
  sub: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-xs text-ink-muted">{sub}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}
