import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxy every /api call to the FastAPI backend on :8000.
    // This keeps the backend URL out of the source entirely -- no CORS
    // handling, no env var, no hardcoded hostname anywhere in the app.
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // /health sits outside /api on the backend, used by the connection badge
      "/health": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
