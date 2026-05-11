import { Link, useLocation } from "@tanstack/react-router";
import { ListOrdered, Bell, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";

type Tab = {
  to: "/pos-app/orders" | "/pos-app/online-orders" | "/pos-app/marketplace-orders";
  label: string;
  hint: string;
  icon: typeof ListOrdered;
  countKey: "pos" | "online" | "marketplace";
};

const TABS: Tab[] = [
  { to: "/pos-app/orders", label: "Kasir", hint: "Transaksi POS in-store", icon: ListOrdered, countKey: "pos" },
  { to: "/pos-app/online-orders", label: "Web Toko", hint: "Order dari web toko Anda", icon: Bell, countKey: "online" },
  { to: "/pos-app/marketplace-orders", label: "Marketplace", hint: "Order dari marketplace KopiHub", icon: ShoppingCart, countKey: "marketplace" },
];

export function OrdersTabs() {
  const { pathname } = useLocation();
  const { shopId } = useCurrentShop();
  const [counts, setCounts] = useState<{ pos: number; online: number; marketplace: number }>({
    pos: 0,
    online: 0,
    marketplace: 0,
  });

  useEffect(() => {
    if (!shopId) return;
    let active = true;
    (async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const [pos, online, marketplace] = await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shopId)
          .is("source", null)
          .gte("created_at", todayIso),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shopId)
          .eq("source", "online")
          .in("status", ["pending", "confirmed", "preparing"]),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shopId)
          .eq("source", "marketplace")
          .in("status", ["pending", "confirmed", "preparing", "ready"]),
      ]);

      if (!active) return;
      setCounts({
        pos: pos.count ?? 0,
        online: online.count ?? 0,
        marketplace: marketplace.count ?? 0,
      });
    })();
    return () => {
      active = false;
    };
  }, [shopId]);

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
      <div className="px-4 sm:px-6 py-3">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Pesanan</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Semua pesanan di satu tempat — pilih kategori di bawah.</p>
      </div>
      <nav className="flex items-center gap-1 px-2 sm:px-4 -mb-px overflow-x-auto">
        {TABS.map((t) => {
          const active = pathname === t.to;
          const Icon = t.icon;
          const count = counts[t.countKey];
          return (
            <Link
              key={t.to}
              to={t.to}
              title={t.hint}
              className={`group relative flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
              {count > 0 && (
                <span
                  className={`inline-flex items-center justify-center rounded-full px-1.5 min-w-[20px] h-5 text-[11px] font-semibold ${
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
