import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query";
import { router } from "@/routes";
import { ToastViewport } from "@/components/ui/Toast";
import { useInactivityLogout } from "@/lib/useInactivityLogout";

console.log(import.meta.env.VITE_API_BASE_URL, "test env");
console.log(import.meta.env.VITE_USE_MOCK, "test env");

/**
 * Inner component so useInactivityLogout can access the Zustand auth store
 * (which is a module-level singleton — no provider needed, but the hook must
 * be called inside the React tree so React's rules of hooks are satisfied).
 */
function AppInner() {
  // Auto-logout after 30 minutes of inactivity; warn 1 minute before.
  useInactivityLogout({ timeoutMs: 30 * 60 * 1000, warningMs: 60 * 1000 });

  return (
    <>
      <RouterProvider router={router} />
      <ToastViewport />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
