import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: process.env["VITE_API_PROXY_TARGET"] ?? "http://127.0.0.1:8001",
        changeOrigin: true,
      },
      "/sanctum": {
        target: process.env["VITE_API_PROXY_TARGET"] ?? "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
  },
});
