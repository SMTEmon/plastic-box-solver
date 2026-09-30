import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

//backend proxy target: defaults to localhost for bare metal, or VITE_BACKEND_URL in docker
const backendUrl = process.env.VITE_BACKEND_URL || "http://localhost:8000";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxy every /api call to the FastAPI backend on :8000.
    // This keeps the backend URL out of the source entirely -- no CORS
    // handling, no env var, no hardcoded hostname anywhere in the app.
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true,
      },
      // /health sits outside /api on the backend, used by the connection badge
      "/health": {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
});
