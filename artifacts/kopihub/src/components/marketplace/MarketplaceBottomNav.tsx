import { Link, useLocation } from "@tanstack/react-router";
import { Home, LayoutGrid, ReceiptText, MessageCircle, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

type Item = {
  to: string;
  label: string;
  icon: typeof Home;
  match: (path: string) => boolean;
  badge?: "chat" | "orders";
  auth?: boolean;
};

const NAV: Item[] = [
  { to: "/",          label: "Beranda",  icon: Home,         match: (p) => p === "/" },
  { to: "/kategori",  label: "Kategori", icon: LayoutGrid,   match: (p) => p.startsWith("/kategori") },
  { to: "/akun/pesanan", label: "Pesanan", icon: ReceiptText, match: (p) => p.startsWith("/akun/pesanan") || p.startsWith("/pesanan"), auth: true, badge: "orders" },
  { to: "/akun/inbox", label: "Chat",    icon: MessageCircle, match: (p) => p.startsWith("/akun/inbox"), auth: true, badge: "chat" },
  { to: "/akun",      label: "Akun",     icon: User,         match: (p) => p === "/akun" || (p.startsWith("/akun") && !p.startsWith("/akun/pesanan") && !p.startsWith("/akun/inbox")) },
];

export function MarketplaceBottomNav(_props: { shopId?: string } = {}) {
  const location = useLocation();
  const { user } = useAuth();
  const [chatUnread, setChatUnread] = useState(0);
  const [orderActive, setOrderActive] = useState(0);

  useEffect(() => {
    if (!user) { setChatUnread(0); setOrderActive(0); return; }
    let mounted = true;
    const refreshChat = async () => {
      const { data: chats } = await (supabase as any)
        .from("shop_chats").select("id").eq("buyer_user_id", user.id);
      const ids = (chats ?? []).map((c: any) => c.id);
      if (!ids.length) { if (mounted) setChatUnread(0); return; }
      const { count } = await (supabase as any)
        .from("shop_chat_messages").select("id", { count: "exact", head: true })
        .in("chat_id", ids).eq("sender_role", "seller").is("read_at", null);
      if (mounted) setChatUnread(count ?? 0);
    };
    const refreshOrders = async () => {
      const { count } = await (supabase as any)
        .from("orders").select("id", { count: "exact", head: true })
        .eq("buyer_user_id", user.id)
        .in("status", ["pending", "paid", "processing", "shipped", "out_for_delivery"]);
      if (mounted) setOrderActive(count ?? 0);
    };
    refreshChat(); refreshOrders();
    const ch = supabase.channel(`mp-bnav-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_chat_messages" }, refreshChat)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refreshOrders)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [user]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigasi utama"
    >
      <div className="mx-2 mb-2 rounded-2xl border border-border/60 bg-background/80 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)]">
        <div className="flex h-14 items-stretch justify-around px-1">
          {NAV.map((item) => {
            const needsAuth = item.auth && !user;
            const to = needsAuth ? "/login" : item.to;
            const isActive = !needsAuth && item.match(location.pathname);
            const Icon = item.icon;
            const badgeCount = item.badge === "chat" ? chatUnread : item.badge === "orders" ? orderActive : 0;
            return (
              <Link
                key={item.to}
                to={to}
                className={`group relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="relative">
                  <Icon
                    className="h-[22px] w-[22px] transition-transform group-active:scale-90"
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  {badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground ring-2 ring-background">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] leading-none tracking-tight ${isActive ? "font-semibold" : "font-medium"}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-foreground" aria-hidden />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
