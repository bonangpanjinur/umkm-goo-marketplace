import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { User, ShoppingBag, MapPin, LogOut, Loader2, Heart, Bell, History, Gift, Star, CalendarCheck, PackageX, Wallet, Download, GraduationCap, MessageCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";

export const Route = createFileRoute("/akun")({
  head: () => ({ meta: [{ title: "Akun Saya" }] }),
  component: AkunLayout,
});

const NAV = [
  { to: "/akun",             label: "Profil",        icon: User,         exact: true },
  { to: "/akun/pesanan",     label: "Pesanan",       icon: ShoppingBag },
  { to: "/akun/inbox",             label: "Chat Toko",       icon: MessageCircle },
  { to: "/akun/custom-orders",     label: "Custom Order",    icon: Sparkles },
  { to: "/akun/bookings",          label: "Booking",         icon: CalendarCheck },
  { to: "/akun/digital-products",  label: "Produk Digital",  icon: Download },
  { to: "/akun/kursus",            label: "Kursus Saya",     icon: GraduationCap },
  { to: "/akun/saldo",             label: "Saldo & Member",  icon: Wallet },
  { to: "/akun/cashback",    label: "Cashback",      icon: Wallet },
  { to: "/akun/returns",     label: "Pengembalian",  icon: PackageX },
  { to: "/akun/favorit",     label: "Favorit",       icon: Heart },
  { to: "/akun/wishlist",    label: "Wishlist",      icon: Heart },
  { to: "/akun/riwayat",     label: "Baru Dilihat",  icon: History },
  { to: "/akun/loyalty",     label: "Poin Loyalty",  icon: Star },
  { to: "/akun/referral",    label: "Referral",      icon: Gift },
  { to: "/akun/notifikasi",  label: "Notifikasi",    icon: Bell },
  { to: "/akun/alamat",      label: "Alamat",        icon: MapPin },
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

  const isProfileRoot = location.pathname === "/akun";
  const displayName = (user.user_metadata as any)?.full_name || user.email?.split("@")[0] || "Pengguna";
  const avatarUrl = (user.user_metadata as any)?.avatar_url as string | undefined;
  const initial = (displayName[0] || "U").toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketplaceHeader />
      <main className="flex-1 mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6 pb-24 sm:pb-6">
        {/* Mobile profile hero — Apple-like rounded card */}
        <div className="sm:hidden mb-4 rounded-3xl bg-gradient-to-b from-muted/70 to-muted/30 border border-border/60 p-5">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-foreground text-background flex items-center justify-center text-lg font-semibold ring-2 ring-background shadow-sm">
              {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold tracking-tight truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
            <Link to="/akun" className="text-xs font-medium text-muted-foreground hover:text-foreground">
              Edit
            </Link>
          </div>
        </div>

        <h1 className="hidden sm:block text-2xl font-bold mb-4">Akun Saya</h1>

        <div className="grid gap-6 md:grid-cols-[200px_1fr]">
          {/* Desktop sidebar */}
          <aside className="hidden md:block space-y-1">
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

          {/* Mobile menu grid — only on /akun root */}
          {isProfileRoot && (
            <div className="md:hidden">
              <div className="grid grid-cols-4 gap-2">
                {NAV.slice(1).map((it) => {
                  const Icon = it.icon;
                  return (
                    <Link
                      key={it.to}
                      to={it.to}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-card border border-border/60 px-2 py-3 text-center transition active:scale-[0.97] hover:border-border"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/70">
                        <Icon className="h-[18px] w-[18px]" />
                      </div>
                      <span className="text-[10.5px] font-medium leading-tight line-clamp-2">{it.label}</span>
                    </Link>
                  );
                })}
              </div>
              <button
                onClick={logout}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm font-medium text-destructive transition active:scale-[0.98]"
              >
                <LogOut className="h-4 w-4" /> Keluar
              </button>
            </div>
          )}

          <div className={isProfileRoot ? "md:block" : ""}><ErrorBoundary withFallback><Outlet /></ErrorBoundary></div>
        </div>
      </main>
      <MarketplaceFooter />
    </div>
  );
}
