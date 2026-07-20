import { BookOpen, LayoutTemplate, CreditCard, Building2 } from "lucide-react";
import { ComingSoon } from "./ComingSoon";

export function KnowledgeBasePage() {
  return (
    <ComingSoon
      icon={BookOpen}
      eyebrow="Build"
      title="Knowledge Base"
      description="Upload documents, build vector embeddings, and ground Document Reader agents with RAG."
      capabilities={[
        "Per-agent knowledge base management",
        "Document upload and processing pipeline",
        "Vector embeddings via pgvector",
        "RAG retrieval for grounded answers",
        "Source citations on every response",
        "Re-index and freshness controls",
      ]}
    />
  );
}

export function TemplatesPage() {
  return (
    <ComingSoon
      icon={LayoutTemplate}
      eyebrow="Build"
      title="Template Marketplace"
      description="Install proven agent templates into your workspace and track adoption across tenants."
      capabilities={[
        "Curated template catalog (super admin)",
        "One-click install into your workspace",
        "Template versioning and changelogs",
        "Install and usage metrics",
        "Category and capability filtering",
        "Publish your own agents as templates",
      ]}
    />
  );
}

export function BillingPage() {
  return (
    <ComingSoon
      icon={CreditCard}
      eyebrow="Account"
      title="Billing & Plans"
      description="Manage your plan, monitor consumption against limits, and forecast monthly cost."
      capabilities={[
        "Plan type and monthly token limit",
        "Live consumption vs. limit tracking",
        "Threshold alerts before overage",
        "Per-model cost engine and pricing",
        "Monthly billing snapshots",
        "Export invoices to PDF",
      ]}
    />
  );
}

export function TenantPage() {
  return (
    <ComingSoon
      icon={Building2}
      eyebrow="Account"
      title="Workspace Settings"
      description="Organization profile, API credentials, AI provider configuration, and notification preferences."
      capabilities={[
        "Organization profile (name, RFC, industry)",
        "Tenant API credentials and tokens",
        "AI provider configuration per tenant",
        "LLM model catalog management",
        "Notification preferences",
        "Timezone and locale",
      ]}
    />
  );
}
