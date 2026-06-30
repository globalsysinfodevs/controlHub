import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query";
import { router } from "@/routes";
import { ToastViewport } from "@/components/ui/Toast";
console.log(import.meta.env.VITE_API_BASE_URL,"test env");
console.log(import.meta.env.VITE_USE_MOCK,"test env");

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ToastViewport />
    </QueryClientProvider>
  );
}
