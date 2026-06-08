import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  server: {
    port: 5173,
  },
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@/app": path.resolve(__dirname, "src/app"),
      "@/shared": path.resolve(__dirname, "src/shared"),
      "@/features": path.resolve(__dirname, "src/features"),
      "@/pages": path.resolve(__dirname, "src/pages"),
      buffer: "buffer",
    },
  },
  optimizeDeps: {
    include: ["buffer"],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
});
