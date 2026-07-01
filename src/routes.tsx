import { Navigate, createBrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/store/auth";
import type { UserRole } from "@/lib/api/types";
import { LoginPage } from "@/features/auth/LoginPage";
import { SuperAdminShell } from "@/features/super-admin/SuperAdminShell";
import { PlatformOverview } from "@/features/super-admin/PlatformOverview";
import { TenantsPage } from "@/features/super-admin/TenantsPage";
import { IndustriesPage } from "@/features/super-admin/IndustriesPage";
import { PlatformUsersPage } from "@/features/super-admin/PlatformUsersPage";
import { AccountPage } from "@/features/super-admin/AccountPage";
import { UnauthorizedPage } from "@/features/auth/UnauthorizedPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status);
  if (status !== "authenticated") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  if (status === "authenticated") {
    // Super admins go to the overview dashboard; all other roles go to their account page.
    const dest = user?.role === "platform_super_admin" ? "/platform/overview" : "/platform/account";
    return <Navigate to={dest} replace />;
  }
  return <>{children}</>;
}

/** Redirects to the correct landing page based on the user's role. */
function RedirectToHome() {
  const role = useAuth((s) => s.user?.role);
  const dest = role === "platform_super_admin" ? "/platform/overview" : "/platform/account";
  return <Navigate to={dest} replace />;
}

/** Guard that only allows users with one of the specified roles. */
function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const role = useAuth((s) => s.user?.role);
  if (!role || !roles.includes(role)) return <UnauthorizedPage />;
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
    path: "/platform",
    element: (
      <RequireAuth>
        <SuperAdminShell />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: (
          // Default child route: super admins → overview, everyone else → account.
          <RedirectToHome />
        ),
      },
      {
        path: "overview",
        element: (
          <RequireRole roles={["platform_super_admin"]}>
            <PlatformOverview />
          </RequireRole>
        ),
      },
      {
        path: "tenants",
        element: (
          <RequireRole roles={["platform_super_admin"]}>
            <TenantsPage />
          </RequireRole>
        ),
      },
      {
        path: "industries",
        element: (
          <RequireRole roles={["platform_super_admin"]}>
            <IndustriesPage />
          </RequireRole>
        ),
      },
      {
        path: "users",
        element: (
          <RequireRole roles={["platform_super_admin"]}>
            <PlatformUsersPage />
          </RequireRole>
        ),
      },
      {
        path: "account",
        element: <AccountPage />,
      },
    ],
  },
  { path: "/", element: <Navigate to="/platform" replace /> },
  { path: "*", element: <Navigate to="/platform" replace /> },
]);
