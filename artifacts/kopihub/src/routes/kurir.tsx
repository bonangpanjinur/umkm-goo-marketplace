import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Bike, History, Wallet, User as UserIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/error-boundary";

export const Route = createFileRoute("/kurir")({
  component: CourierLayout,
});

const NAV = [
  { to: "/kurir", label: "Tugas", icon: Bike, exact: true },
  { to: "/kurir/history", label: "Riwayat", icon: History },
  { to: "/kurir/earnings", label: "Penghasilan", icon: Wallet },
  { to: "/kurir/profile", label: "Profil", icon: UserIcon },
] as const;

function CourierLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: location.pathname } as never });
      return;
    }
    (async () => {
      // auto-link by email
      await supabase.rpc("link_courier_account").catch(() => undefined);
      const { count } = await supabase
        .from("couriers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (!count || count === 0) setDenied(true);
      setReady(true);
    })();
  }, [user, loading, navigate, location.pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <Bike className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h1 className="mb-2 text-lg font-semibold">Bukan akun kurir</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Email <span className="font-medium">{user?.email}</span> belum terdaftar sebagai kurir aktif di toko manapun.
          Minta pemilik toko menambahkan email ini di menu <em>Kurir Toko</em>.
        </p>
        <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }}>
          <LogOut className="mr-2 h-4 w-4" /> Keluar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16">
      <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <Bike className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Portal Kurir</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </header>
      <main className="flex-1">
        <ErrorBoundary withFallback><Outlet /></ErrorBoundary>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-border bg-background">
        {NAV.map((item) => {
          const active = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                active ? "text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
