import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, MessageCircle, Store } from "lucide-react";

export const Route = createFileRoute("/akun/inbox")({
  head: () => ({ meta: [{ title: "Chat Toko · Akun" }] }),
  component: InboxPage,
});

type ChatRow = {
  id: string;
  shop_id: string;
  last_message_at: string | null;
  created_at: string;
  shop: { name: string; slug: string; logo_url: string | null } | null;
  unread: number;
  preview: string | null;
};

function formatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} hari`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function InboxPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      const { data: chatData } = await (supabase as any)
        .from("shop_chats")
        .select("id, shop_id, last_message_at, created_at, shop:shops(name, slug, logo_url)")
        .eq("buyer_user_id", user.id)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      const rows = (chatData ?? []) as any[];
      if (!rows.length) {
        if (mounted) { setChats([]); setLoading(false); }
        return;
      }

      const ids = rows.map((r) => r.id);
      const { data: msgs } = await (supabase as any)
        .from("shop_chat_messages")
        .select("chat_id, body, sender_role, read_at, created_at")
        .in("chat_id", ids)
        .order("created_at", { ascending: false });

      const previewByChat: Record<string, string> = {};
      const unreadByChat: Record<string, number> = {};
      for (const m of (msgs ?? []) as any[]) {
        if (!previewByChat[m.chat_id]) previewByChat[m.chat_id] = m.body;
        if (m.sender_role === "seller" && !m.read_at) {
          unreadByChat[m.chat_id] = (unreadByChat[m.chat_id] ?? 0) + 1;
        }
      }

      const merged: ChatRow[] = rows.map((r) => ({
        id: r.id,
        shop_id: r.shop_id,
        last_message_at: r.last_message_at,
        created_at: r.created_at,
        shop: r.shop,
        unread: unreadByChat[r.id] ?? 0,
        preview: previewByChat[r.id] ?? null,
      }));
      if (mounted) { setChats(merged); setLoading(false); }
    };
    load();

    const ch = supabase
      .channel(`inbox-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_chat_messages" }, load)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-muted animate-pulse" />
          <div className="h-5 w-40 rounded bg-muted animate-pulse" />
        </div>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 p-3">
              <div className="h-11 w-11 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-3 w-10 rounded bg-muted shrink-0" />
                </div>
                <div className="h-3 w-2/3 rounded bg-muted" />
              </div>
              <div className="h-5 w-5 rounded-full bg-muted shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Kotak Masuk Chat Toko</h2>
      </div>

      {chats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground opacity-30" />
          <p className="mt-3 text-sm text-muted-foreground">Belum ada percakapan dengan toko.</p>
          <p className="text-xs text-muted-foreground mt-1">Mulai chat dari halaman toko untuk tanya produk, harga, atau promo.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
          {chats.map((c) => (
            <li key={c.id}>
              <Link
                to="/toko/$slug/chat"
                params={{ slug: c.shop?.slug ?? "" }}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 transition"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 shrink-0 overflow-hidden">
                  {c.shop?.logo_url ? (
                    <img src={c.shop.logo_url} alt={c.shop.name} className="h-full w-full object-cover" />
                  ) : (
                    <Store className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{c.shop?.name ?? "Toko"}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(c.last_message_at ?? c.created_at)}</span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${c.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {c.preview ?? "Belum ada pesan"}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shrink-0">
                    {c.unread > 99 ? "99+" : c.unread}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
