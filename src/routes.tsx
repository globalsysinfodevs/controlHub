import { Navigate, createBrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth, homePathForRole, isSuperAdmin } from "@/store/auth";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/features/auth/LoginPage";
import { AcceptInvitationPage } from "@/features/auth/AcceptInvitationPage";
import { ActivateAccountPage } from "@/features/auth/ActivateAccountPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { PlatformLayout } from "@/features/platform/PlatformLayout";
import { PlatformOverviewPage } from "@/features/platform/PlatformOverviewPage";
import { TenantsPage } from "@/features/platform/TenantsPage";
import { PlatformUsersPage } from "@/features/platform/PlatformUsersPage";
import { IndustriesPage } from "@/features/platform/IndustriesPage";
import { PlatformConfigPage } from "@/features/platform/PlatformConfigPage";
import { TenantLayout } from "@/features/tenant/TenantLayout";
import { TenantOverviewPage } from "@/features/tenant/TenantOverviewPage";
import { TenantUsersPage } from "@/features/tenant/TenantUsersPage";
import { TenantConfigPage } from "@/features/tenant/TenantConfigPage";
import { MarketplacePage } from "@/features/marketplace/MarketplacePage";
import { AnalyticsPage } from "@/features/analytics/AnalyticsPage";
import { ConfigPage } from "@/features/config/ConfigPage";
import { ToolsPage } from "@/pages/ToolsPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status);
  if (status !== "authenticated") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Super-admin-only guard for platform management screens. */
function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  if (!isSuperAdmin(user?.role)) return <Navigate to={homePathForRole(user?.role)} replace />;
  return <>{children}</>;
}

/** Send an authenticated user to their role's home; unauthenticated to login. */
function HomeRedirect() {
  const { status, user } = useAuth();
  if (status !== "authenticated") return <Navigate to="/login" replace />;
  return <Navigate to={homePathForRole(user?.role)} replace />;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  if (status === "authenticated") return <Navigate to={homePathForRole(user?.role)} replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <RedirectIfAuthed>
        <LoginPage />
      </RedirectIfAuthed>
    ),
  },
  {
    // Public route — no auth required. Users open this from their invitation email.
    path: "/invite/accept",
    element: <AcceptInvitationPage />,
  },
  {
    // Tenant admin activation link — sent by super admin via email.
    // URL format: /activate-account?token=<token>
    path: "/activate-account",
    element: <ActivateAccountPage />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: "dashboard", element: <DashboardPage /> },
      {
        path: "platform",
        element: (
          <RequireSuperAdmin>
            <PlatformLayout />
          </RequireSuperAdmin>
        ),
        children: [
          { index: true, element: <PlatformOverviewPage /> },
          { path: "tenants", element: <TenantsPage /> },
          { path: "users", element: <PlatformUsersPage /> },
          { path: "industries", element: <IndustriesPage /> },
          { path: "config", element: <PlatformConfigPage /> },
        ],
      },
      {
        path: "tenant",
        element: <TenantLayout />,
        children: [
          { index: true, element: <TenantOverviewPage /> },
          { path: "users", element: <TenantUsersPage /> },
          { path: "config", element: <TenantConfigPage /> },
        ],
      },
      { path: "marketplace", element: <MarketplacePage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "config", element: <ConfigPage /> },
      { path: "tools", element: <ToolsPage /> },
    ],
  },
  { path: "*", element: <HomeRedirect /> },
]);
