import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CalendarDays,
  Clock,
  CreditCard,
  Globe,
  Mail,
  Receipt,
  Zap,
} from "lucide-react";
import { tenantApi } from "@/lib/api/endpoints";
import { useAuth } from "@/store/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { CenteredLoader } from "@/components/ui/Feedback";

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-line last:border-0">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-ink-muted">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-faint">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-ink break-all">{value}</p>
      </div>
    </div>
  );
}

export function TenantOverviewPage() {
  const tenant = useAuth((s) => s.tenant);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["tenant", "profile"],
    queryFn: () => tenantApi.profile(),
    retry: false,
  });

  const { data: plan } = useQuery({
    queryKey: ["tenant", "plan"],
    queryFn: () => tenantApi.plan(),
    retry: false,
  });

  if (isLoading) return <CenteredLoader label="Loading organization profile…" />;

  const name = profile?.name ?? tenant?.name ?? "—";
  const status = profile?.status ?? "active";

  return (
    <div>
      <PageHeader
        eyebrow="Tenant"
        title="Overview"
        description="Your organization profile and current plan at a glance."
      />

      <div className="grid gap-5 md:grid-cols-2">
        {/* Organization profile card */}
        <div className="panel p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-raised">
              <Building2 className="h-5 w-5 text-brand-500" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-ink">{name}</h2>
              <Badge
                tone={status === "active" ? "ok" : status === "suspended" ? "danger" : "neutral"}
                dot
                className="mt-0.5"
              >
                {status}
              </Badge>
            </div>
          </div>

          <div>
            {profile?.rfc && (
              <InfoRow icon={<Receipt className="h-3.5 w-3.5" />} label="RFC / Tax ID" value={profile.rfc} />
            )}
            <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Billing Email" value={profile?.billing_email ?? "—"} />
            <InfoRow icon={<Globe className="h-3.5 w-3.5" />} label="Timezone" value={profile?.timezone ?? tenant?.timezone ?? "—"} />
            <InfoRow
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              label="Member Since"
              value={
                profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                  : "—"
              }
            />
          </div>
        </div>

        {/* Plan card */}
        <div className="panel p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-raised">
              <CreditCard className="h-5 w-5 text-telemetry-600" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-ink">Current Plan</h2>
              <p className="text-xs text-ink-muted">Subscription & limits</p>
            </div>
          </div>

          <div>
            <InfoRow
              icon={<Zap className="h-3.5 w-3.5" />}
              label="Plan"
              value={
                <span className="inline-flex items-center gap-1.5">
                  {plan?.plan_name ?? profile?.plan_name ?? tenant?.plan ?? "—"}
                  {(plan?.plan_name ?? profile?.plan_name) && (
                    <Badge tone="brand">{plan?.plan_name ?? profile?.plan_name}</Badge>
                  )}
                </span>
              }
            />
            <InfoRow
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Monthly Token Limit"
              value={
                plan?.monthly_token_limit != null
                  ? plan.monthly_token_limit.toLocaleString() + " tokens"
                  : tenant?.monthly_token_limit != null
                    ? tenant.monthly_token_limit.toLocaleString() + " tokens"
                    : "Unlimited"
              }
            />
            {plan?.monthly_cost != null && (
              <InfoRow
                icon={<CreditCard className="h-3.5 w-3.5" />}
                label="Monthly Cost"
                value={`$${plan.monthly_cost.toLocaleString()}`}
              />
            )}
            {plan?.max_agents != null && (
              <InfoRow
                icon={<Zap className="h-3.5 w-3.5" />}
                label="Max Agents"
                value={plan.max_agents.toLocaleString()}
              />
            )}
            {plan?.max_users != null && (
              <InfoRow
                icon={<Zap className="h-3.5 w-3.5" />}
                label="Max Users"
                value={plan.max_users.toLocaleString()}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
