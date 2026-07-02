import { Navigate, createBrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/store/auth";
import { LoginPage } from "@/features/auth/LoginPage";
import { SuperAdminShell } from "@/features/super-admin/SuperAdminShell";
import { PlatformOverview } from "@/features/super-admin/PlatformOverview";
import { TenantsPage } from "@/features/super-admin/TenantsPage";
import { IndustriesPage } from "@/features/super-admin/IndustriesPage";
import { PlatformUsersPage } from "@/features/super-admin/PlatformUsersPage";
import { AccountPage } from "@/features/super-admin/AccountPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status);
  if (status !== "authenticated") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status);
  if (status === "authenticated") return <Navigate to="/platform/overview" replace />;
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
      { index: true, element: <Navigate to="/platform/overview" replace /> },
      { path: "overview", element: <PlatformOverview /> },
      { path: "tenants", element: <TenantsPage /> },
      { path: "industries", element: <IndustriesPage /> },
      { path: "users", element: <PlatformUsersPage /> },
      { path: "account", element: <AccountPage /> },
    ],
  },
  { path: "/", element: <Navigate to="/platform/overview" replace /> },
  { path: "*", element: <Navigate to="/platform/overview" replace /> },
]);
