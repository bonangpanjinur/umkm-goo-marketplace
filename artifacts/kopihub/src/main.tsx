import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter, useRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // anggap fresh 30 detik → hindari refetch bertubi
      gcTime: 5 * 60_000,       // simpan cache 5 menit
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const isNotFoundError = /not_found|not found|404/i.test(error.message);

  if (isNotFoundError && typeof window !== "undefined") {
    const currentPath = router.state.location.pathname;
    const fallback = currentPath.startsWith("/admin")
      ? "/admin"
      : currentPath.startsWith("/pos-app") || currentPath.startsWith("/app")
        ? "/pos-app"
        : currentPath.startsWith("/akun")
          ? "/akun"
          : "/";

    window.location.replace(fallback);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Terjadi kesalahan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman gagal dimuat. Periksa koneksi atau coba lagi.
        </p>
        {import.meta.env.DEV && error.message && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Coba lagi
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Beranda
          </a>
        </div>
      </div>
    </div>
  );
}

function DefaultNotFoundComponent() {
  // Instant redirect ke beranda marketplace — tidak ada layar 404.
  if (typeof window !== "undefined") {
    window.location.replace("/");
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground">Mengalihkan ke beranda…</p>
    </div>
  );
}

const router = createRouter({
  routeTree,
  context: {},
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
  defaultErrorComponent: DefaultErrorComponent,
  defaultNotFoundComponent: DefaultNotFoundComponent,
  basepath: import.meta.env.BASE_URL,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const container = document.getElementById("root")!;
const root = (container as any).__reactRoot ?? createRoot(container);
(container as any).__reactRoot = root;
root.render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
);

// ── PWA service worker registration ──────────────────────────────
// Skip di iframe & host preview Lovable agar tidak menyebabkan
// stale content saat editing. Aktif di production / domain custom.
(function registerPwa() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovable.app") && host.includes("--");
  if (isInIframe || isPreviewHost) {
    // Bersihkan SW lama bila pernah ter-register di preview
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
})();
