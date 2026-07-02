import { Navigate, createBrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth, homePathForRole, isSuperAdmin } from "@/store/auth";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { PlatformLayout } from "@/features/platform/PlatformLayout";
import { PlatformOverviewPage } from "@/features/platform/PlatformOverviewPage";
import { TenantsPage } from "@/features/platform/TenantsPage";
import { PlatformUsersPage } from "@/features/platform/PlatformUsersPage";
import { IndustriesPage } from "@/features/platform/IndustriesPage";
import { MarketplacePage } from "@/features/marketplace/MarketplacePage";
import { AnalyticsPage } from "@/features/analytics/AnalyticsPage";
import { ConfigPage } from "@/features/config/ConfigPage";

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
        ],
      },
      { path: "marketplace", element: <MarketplacePage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "config", element: <ConfigPage /> },
    ],
  },
  { path: "*", element: <HomeRedirect /> },
]);
