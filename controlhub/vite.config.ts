import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env / .env.local / .env.[mode] so VITE_API_TARGET is available
  // inside the config (process.env does NOT include .env.local at config time).
  const env = loadEnv(mode, process.cwd(), "");

  const apiTarget =
    env.VITE_API_TARGET ??
    "https://ialestra-controlhub-fastapi-qa.delightfulhill-3790174e.eastus.azurecontainerapps.io";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            charts: ["recharts"],
            motion: ["framer-motion"],
            query: ["@tanstack/react-query"],
          },
        },
      },
    },
    server: {
      port: 5173,
      host: true,
      // All /api/* and /health requests are forwarded to the live backend.
      // This avoids CORS errors — the browser only ever talks to localhost:5173.
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
        "/health": {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
