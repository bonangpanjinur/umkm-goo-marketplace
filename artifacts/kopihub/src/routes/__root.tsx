import { Outlet, Link, createRootRoute, HeadContent, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { PWAUpdater } from "@/components/PWAUpdater";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import { EnvBanner } from "@/components/EnvBanner";

// Mapping prefix → tujuan paling masuk akal saat URL salah ketik / route hilang.
const REDIRECT_RULES: Array<{ test: (p: string) => boolean; to: string; label: string }> = [
  { test: (p) => p.startsWith("/admin"), to: "/admin", label: "Dashboard Super Admin" },
  { test: (p) => p.startsWith("/app"), to: "/app", label: "Dashboard Toko" },
  { test: (p) => p.startsWith("/s/"), to: "/", label: "Beranda Marketplace" },
  { test: (p) => /^\/(signup|register|daftar)/.test(p), to: "/signup", label: "Halaman Daftar" },
  { test: (p) => /^\/(login|signin|masuk)/.test(p), to: "/login", label: "Halaman Masuk" },
  { test: (p) => p.startsWith("/checkout") || p.startsWith("/cart"), to: "/cart", label: "Keranjang" },
  { test: (p) => p.startsWith("/order"), to: "/orders", label: "Pesanan Saya" },
];

function resolveRedirect(pathname: string) {
  for (const rule of REDIRECT_RULES) {
    if (rule.test(pathname)) return rule;
  }
  return { to: "/", label: "Beranda" };
}

function NotFoundComponent() {
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const target = useMemo(() => resolveRedirect(pathname), [pathname]);
  const [countdown, setCountdown] = useState(6);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (countdown <= 0) {
      router.navigate({ to: target.to });
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, paused, router, target.to]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Error 404
        </p>
        <h1 className="mt-2 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          URL <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{pathname}</code> tidak ada
          atau sudah dipindah.
        </p>

        <div className="mt-6 rounded-lg border border-border bg-card p-4 text-left">
          <p className="text-sm font-medium text-foreground">
            Mengarahkan ke <span className="text-primary">{target.label}</span>
            {!paused && (
              <span className="ml-1 text-muted-foreground">dalam {countdown} detik…</span>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to={target.to}
              className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Lanjutkan sekarang
            </Link>
            <button
              type="button"
              onClick={() => setPaused(true)}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Batalkan
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Ke Beranda
            </Link>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Jika Anda yakin URL ini benar, coba muat ulang halaman atau hubungi tim dukungan.
        </p>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "UTF-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "UMKMgo Marketplace" },
      { name: "description", content: "Marketplace multi-kategori untuk produk lokal Indonesia." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "UMKMgo" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <AuthProvider>
      <HeadContent />
      <EnvBanner />
      <Outlet />
      <PWAUpdater />
      <PushNotificationManager />
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}
