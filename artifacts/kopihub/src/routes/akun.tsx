import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { User, ShoppingBag, MapPin, LogOut, Loader2, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/akun")({
  head: () => ({ meta: [{ title: "Akun Saya" }] }),
  component: AkunLayout,
});

const NAV = [
  { to: "/akun", label: "Profil", icon: User, exact: true },
  { to: "/akun/pesanan", label: "Pesanan", icon: ShoppingBag },
  { to: "/akun/wishlist", label: "Wishlist", icon: Heart },
  { to: "/akun/alamat", label: "Alamat", icon: MapPin },
];

function AkunLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Berhasil keluar");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketplaceHeader />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Akun Saya</h1>
        <div className="grid gap-6 md:grid-cols-[200px_1fr]">
          <aside className="space-y-1">
            {NAV.map((it) => {
              const active = it.exact ? location.pathname === it.to : location.pathname.startsWith(it.to);
              const Icon = it.icon;
              return (
                <Link key={it.to} to={it.to} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${active ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}>
                  <Icon className="h-4 w-4" />{it.label}
                </Link>
              );
            })}
            <button onClick={logout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4" />Keluar
            </button>
          </aside>
          <div><Outlet /></div>
        </div>
      </main>
      <MarketplaceFooter />
    </div>
  );
}
