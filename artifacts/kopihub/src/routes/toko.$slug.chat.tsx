import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import {
  Send, ChevronLeft, Store, Loader2, AlertCircle, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/toko/$slug/chat")({
  component: ShopChatPage,
});

type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_role: "buyer" | "seller";
  body: string;
  read_at: string | null;
  created_at: string;
};

function ShopChatPage() {
  const { slug } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [chatId, setChatId]     = useState<string | null>(null);
  const [shopName, setShopName] = useState("Toko");
  const [shopId, setShopId]     = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const [notFound, setNotFound] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/login" }); return; }

    (async () => {
      setLoading(true);

      const { data: shop } = await (supabase as any)
        .from("coffee_shops")
        .select("id, name")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (!shop) { setNotFound(true); setLoading(false); return; }
      setShopName(shop.name);
      setShopId(shop.id);

      const { data: existing } = await (supabase as any)
        .from("shop_chats")
        .select("id")
        .eq("shop_id", shop.id)
        .eq("buyer_user_id", user.id)
        .maybeSingle();

      let id: string;
      if (existing) {
        id = existing.id;
      } else {
        const { data: newChat, error } = await (supabase as any)
          .from("shop_chats")
          .insert({ shop_id: shop.id, buyer_user_id: user.id })
          .select("id")
          .single();
        if (error || !newChat) {
          toast.error("Gagal membuka chat");
          setLoading(false);
          return;
        }
        id = newChat.id;
      }
      setChatId(id);

      const { data: msgs } = await (supabase as any)
        .from("shop_chat_messages")
        .select("*")
        .eq("chat_id", id)
        .order("created_at", { ascending: true });
      setMessages((msgs ?? []) as Message[]);

      await (supabase as any)
        .from("shop_chat_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("chat_id", id)
        .eq("sender_role", "seller")
        .is("read_at", null);

      setLoading(false);
    })();
  }, [slug, user, authLoading, navigate]);

  useEffect(() => {
    if (!chatId) return;
    const ch = supabase
      .channel(`shop-chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "shop_chat_messages", filter: `chat_id=eq.${chatId}` },
        (payload) => setMessages((m) => [...m, payload.new as Message]),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!text.trim() || !user || !chatId || !shopId) return;
    setSending(true);
    const { error } = await (supabase as any).from("shop_chat_messages").insert({
      chat_id: chatId,
      shop_id: shopId,
      sender_id: user.id,
      sender_role: "buyer",
      body: text.trim(),
    });
    if (!error) {
      await (supabase as any)
        .from("shop_chats")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", chatId);
      setText("");
    } else {
      toast.error("Gagal mengirim pesan");
    }
    setSending(false);
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceHeader />
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">Toko tidak ditemukan</p>
          <Button asChild variant="outline"><Link to="/">Beranda</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link to="/toko/$slug" params={{ slug }}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
          <Store className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-none">{shopName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Chat sebelum beli · tanya apa saja</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Belum ada pesan. Tanya soal produk, ketersediaan, atau promo — penjual akan segera membalas!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_role === "buyer";
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  }`}
                >
                  {!isMine && (
                    <p className="text-[10px] font-semibold mb-0.5 text-muted-foreground">{shopName}</p>
                  )}
                  <p className="text-sm">{msg.body}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isMine ? "text-primary-foreground/70 text-right" : "text-muted-foreground"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3 bg-background">
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tanya soal produk, harga, promo..."
            className="flex-1"
            disabled={sending || loading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!text.trim() || sending || loading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">
          Pesan langsung ke pemilik toko
        </p>
      </div>
    </div>
  );
}
