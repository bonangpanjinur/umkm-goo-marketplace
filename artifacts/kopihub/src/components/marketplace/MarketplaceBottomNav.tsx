import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, ShoppingCart, User, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { cartCount } from "@/lib/marketplace-cart";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/",           label: "Beranda",   icon: Home,         exact: true },
  { to: "/search",     label: "Cari",      icon: Search },
  { to: "/keranjang",  label: "Keranjang", icon: ShoppingCart, cart: true },
  { to: "/akun/wishlist", label: "Wishlist", icon: Heart,       auth: true },
  { to: "/akun",       label: "Akun",      icon: User,         auth: true },
];

export function MarketplaceBottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const refresh = () => cartCount().then((c) => mounted && setCount(c)).catch(() => {});
    refresh();
    const ch = supabase.channel("mp-cart-bottom")
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_cart_items" }, refresh)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur sm:hidden">
      <div className="flex h-14 items-center justify-around px-1">
        {NAV.map((item) => {
          if (item.auth && !user) return null;
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.cart && count > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-primary-foreground">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
        {!user && (
          <Link
            to="/login"
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-muted-foreground hover:text-foreground"
          >
            <User className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Masuk</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
