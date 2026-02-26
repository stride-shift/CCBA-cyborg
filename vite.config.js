import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  // Ensure proper SPA routing in development
  server: {
    port: 5173,
    host: "0.0.0.0",
    open: false,
  },
  // Configure for static deployment - use absolute path
  base: "/",
  // Add SPA fallback for production builds
  preview: {
    port: 3000,
    host: "0.0.0.0",
    allowedHosts: ["all"],
  },
});
