import { Outlet, createRootRoute, HeadContent, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { PWAUpdater } from "@/components/PWAUpdater";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import { EnvBanner } from "@/components/EnvBanner";
import { toast } from "sonner";

// Mapping prefix → tujuan paling masuk akal saat URL salah ketik / route hilang.
const REDIRECT_RULES: Array<{ test: (p: string) => boolean; to: string }> = [
  { test: (p) => p.startsWith("/admin"), to: "/admin" },
  { test: (p) => p.startsWith("/pos-app") || p.startsWith("/app"), to: "/pos-app" },
  { test: (p) => /^\/(signup|register|daftar)/.test(p), to: "/signup" },
  { test: (p) => /^\/(login|signin|masuk)/.test(p), to: "/login" },
  { test: (p) => p.startsWith("/akun"), to: "/akun" },
];

function resolveRedirect(pathname: string): string {
  for (const rule of REDIRECT_RULES) {
    if (rule.test(pathname)) return rule.to;
  }
  return "/";
}

function NotFoundComponent() {
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const target = useMemo(() => resolveRedirect(pathname), [pathname]);

  useEffect(() => {
    toast.info("Halaman tidak ditemukan, mengalihkan…");
    router.navigate({ to: target, replace: true });
  }, [router, target]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground">Mengalihkan…</p>
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
