import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Uses @tanstack/react-start/plugin/vite which internally handles:
//   - TanStack Router codegen (routeTree.gen.ts)
//   - React plugin + fast-refresh
//   - SSR / server-entry bundling via Nitro
export default defineConfig({
  plugins: [
    tanstackStart({
      // Point SSR entry to our custom server wrapper for error handling.
      server: { entry: "src/server.ts" },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // @/* → src/* (matches tsconfig.json paths)
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    host: "localhost",
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "vendor";
          if (id.includes("@tanstack/react-router") || id.includes("@tanstack/react-query")) return "router";
          if (id.includes("node_modules/leaflet") || id.includes("node_modules/react-leaflet")) return "map";
          if (id.includes("node_modules/recharts")) return "charts";
        },
      },
    },
  },
});
