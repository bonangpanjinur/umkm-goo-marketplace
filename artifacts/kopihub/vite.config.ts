import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

const rawPort = process.env.PORT ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

/**
 * block-server-only-imports
 *
 * Failsafe agar modul server-only (Node built-ins seperti `node:crypto`,
 * `node:fs`, atau file `*.server.ts(x)`) TIDAK pernah ikut ke bundle
 * client. Aktif hanya saat build client (bukan SSR).
 *
 * Aturan:
 *  - `node:*` & built-in Node (`crypto`, `fs`, `child_process`, dst.)
 *    hanya boleh diimport dari file `*.server.ts(x)`.
 *  - File `*.server.ts(x)` tidak boleh diimport dari modul client
 *    (dideteksi via importer yang BUKAN `*.server.*`). Pakai
 *    `await import("...")` dengan `/* @vite-ignore */` untuk lazy-load
 *    di handler server route.
 */
const NODE_BUILTINS = new Set([
  "crypto","fs","fs/promises","path","os","child_process","worker_threads",
  "net","tls","dgram","dns","stream","zlib","http","https","http2","cluster",
  "readline","perf_hooks","v8","vm","module",
]);

function isServerOnlyFile(id: string) {
  return /\.server\.(ts|tsx|js|mjs|cjs)(\?.*)?$/.test(id);
}

function blockServerOnlyImports(): Plugin {
  return {
    name: "lovable:block-server-only-imports",
    enforce: "pre",
    apply: "build",
    resolveId(source, importer, opts) {
      // Only police the CLIENT build graph.
      if ((opts as any)?.ssr) return null;
      if (!importer) return null;

      const isNodeBuiltin =
        source.startsWith("node:") ||
        NODE_BUILTINS.has(source.replace(/^node:/, ""));

      if (isNodeBuiltin && !isServerOnlyFile(importer)) {
        this.error(
          `[block-server-only-imports] "${source}" diimport oleh "${importer}".\n` +
          `Modul Node built-in hanya boleh dipakai dari file *.server.ts(x).\n` +
          `Pindahkan logikanya ke "*.server.ts" lalu lazy-load via:\n` +
          `  const m = await import(/* @vite-ignore */ "@/lib/your-helper.server");`
        );
      }

      if (isServerOnlyFile(source) && !isServerOnlyFile(importer)) {
        this.error(
          `[block-server-only-imports] "${source}" (server-only) diimport ` +
          `secara statis oleh "${importer}".\n` +
          `Gunakan dynamic import dengan /* @vite-ignore */ agar tidak ikut ` +
          `bundle client, atau pindahkan importer ke file *.server.ts(x).`
        );
      }

      return null;
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    blockServerOnlyImports(),
    TanStackRouterVite({ routesDirectory: "./src/routes", generatedRouteTree: "./src/routeTree.gen.ts" }),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  envDir: path.resolve(import.meta.dirname, "..", ".."),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "router-vendor": ["@tanstack/react-router", "@tanstack/react-query"],
          "supabase-vendor": ["@supabase/supabase-js"],
          "charts-vendor": ["recharts"],
          "motion-vendor": ["framer-motion"],
          "radix-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-tabs",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-label",
            "@radix-ui/react-slot",
          ],
          "icons-vendor": ["lucide-react"],
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.API_PORT ?? "3001"}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
