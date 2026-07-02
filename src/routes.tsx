import { Navigate, createBrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/store/auth";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/features/auth/LoginPage";
import { MarketplacePage } from "@/features/marketplace/MarketplacePage";
import { AnalyticsPage } from "@/features/analytics/AnalyticsPage";
import { ConfigPage } from "@/features/config/ConfigPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status);
  if (status !== "authenticated") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status);
  if (status === "authenticated") return <Navigate to="/marketplace" replace />;
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
      { index: true, element: <Navigate to="/marketplace" replace /> },
      { path: "marketplace", element: <MarketplacePage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "config", element: <ConfigPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/marketplace" replace /> },
]);
