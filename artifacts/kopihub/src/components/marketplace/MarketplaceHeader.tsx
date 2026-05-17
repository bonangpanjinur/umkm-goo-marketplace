import { Link, useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ShoppingBag, ShoppingCart, Store, User, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { cartQuantitySum } from "@/lib/marketplace-cart";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/NotificationBell";
import { MarketplaceBottomNav } from "./MarketplaceBottomNav";

function ChatInboxButton({ userId }: { userId: string }) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const { data: chats } = await (supabase as any)
        .from("shop_chats")
        .select("id")
        .eq("buyer_user_id", userId);
      const ids = (chats ?? []).map((c: any) => c.id);
      if (!ids.length) { if (mounted) setUnread(0); return; }
      const { count } = await (supabase as any)
        .from("shop_chat_messages")
        .select("id", { count: "exact", head: true })
        .in("chat_id", ids)
        .eq("sender_role", "seller")
        .is("read_at", null);
      if (mounted) setUnread(count ?? 0);
    };
    refresh();
    const ch = supabase
      .channel(`mp-chat-unread-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_chat_messages" }, refresh)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [userId]);

  return (
    <Link to="/akun/inbox" className="relative" aria-label="Kotak masuk chat">
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <MessageCircle className="h-4 w-4" />
      </Button>
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

export function MarketplaceHeader({ shopId }: { shopId?: string } = {}) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let mounted = true;
    const refresh = () => cartQuantitySum(shopId).then((c) => mounted && setCount(c)).catch(() => {});
    refresh();
    const onCartChange = () => refresh();
    window.addEventListener("kh-cart-change", onCartChange);
    const ch = supabase
      .channel(`mp-cart-header-${shopId ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_cart_items" }, refresh)
      .subscribe();
    return () => {
      mounted = false;
      window.removeEventListener("kh-cart-change", onCartChange);
      supabase.removeChannel(ch);
    };
  }, [shopId]);

  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q: q.trim() } as any });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Store className="h-4 w-4" />
          </div>
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">
            Marketplace
          </span>
        </Link>
        <form onSubmit={submit} className="relative flex-1 max-w-2xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari produk, toko, atau kategori…"
            className="pl-9 h-9"
          />
        </form>
        <Link to="/kategori" className="hidden text-sm text-muted-foreground hover:text-foreground md:inline">
          Kategori
        </Link>
        <Link to="/promo" className="hidden text-sm font-semibold text-destructive hover:opacity-80 md:inline">
          Promo
        </Link>
        <Link to="/keranjang" className="relative" aria-label="Keranjang">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ShoppingCart className="h-4 w-4" />
          </Button>
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
        </Link>
        {user && <ChatInboxButton userId={user.id} />}
        {user && <NotificationBell />}
        {user ? (
          <>
            <Link to="/akun">
              <Button size="sm" variant="ghost" className="gap-1.5">
                <User className="h-3.5 w-3.5" /> Akun
              </Button>
            </Link>
            <Link to="/pos-app" className="hidden sm:inline">
              <Button size="sm" variant="outline" className="gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5" /> Toko Saya
              </Button>
            </Link>
          </>
        ) : (
          <>
            <Link to="/login">
              <Button size="sm" variant="ghost" className="gap-1.5">
                <User className="h-3.5 w-3.5" /> Masuk
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Daftar</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

export function MarketplaceFooter() {
  return (
    <>
      <footer className="mb-14 mt-16 border-t border-border py-8 sm:mb-0">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:flex-row">
          <span>© 2026 Marketplace · Buka toko gratis</span>
          <div className="flex gap-4">
            <Link to="/signup" className="hover:text-foreground">Mulai berjualan</Link>
            <Link to="/pos-app" className="hover:text-foreground">Dashboard toko</Link>
          </div>
        </div>
      </footer>
      <MarketplaceBottomNav />
    </>
  );
}
