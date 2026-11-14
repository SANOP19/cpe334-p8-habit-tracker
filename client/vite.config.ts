import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The API server port (server/.env PORT). Requests to /api are proxied there in development
// so the browser sends the session cookie to the same origin.
const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": apiTarget },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
