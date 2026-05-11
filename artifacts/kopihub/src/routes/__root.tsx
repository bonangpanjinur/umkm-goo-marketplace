import { Outlet, Link, createRootRoute, HeadContent } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { PWAUpdater } from "@/components/PWAUpdater";
import { PushNotificationManager } from "@/components/PushNotificationManager";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold tracking-tight text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Halaman tidak ditemukan</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          URL yang Anda buka tidak ada atau sudah dipindah.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Kembali ke beranda
          </Link>
        </div>
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
      <Outlet />
      <PWAUpdater />
      <PushNotificationManager />
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}
