import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Send, ChevronLeft, Store, Loader2, AlertCircle, MessageCircle,
  Paperclip, ImageIcon, X, ShoppingBag,
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
  attachment_url?: string | null;
  attachment_type?: string | null;
  product_id?: string | null;
};

type ProductLite = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
};

const QUICK_REPLIES = [
  "Halo, masih buka?",
  "Bisa pesan sekarang?",
  "Ada promo hari ini?",
  "Bisa COD/antar?",
  "Stok masih ada?",
];

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

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
  const [uploading, setUploading] = useState(false);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [sellerTyping, setSellerTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

      // Load top products dari toko untuk picker
      const { data: prods } = await (supabase as any)
        .from("menu_items")
        .select("id, name, price, image_url")
        .eq("shop_id", shop.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(24);
      setProducts((prods ?? []) as ProductLite[]);

      setLoading(false);
    })();
  }, [slug, user, authLoading, navigate]);

  // Realtime: pesan baru + typing indicator
  useEffect(() => {
    if (!chatId || !user) return;
    const ch = supabase
      .channel(`shop-chat-${chatId}`, { config: { presence: { key: user.id } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "shop_chat_messages", filter: `chat_id=eq.${chatId}` },
        (payload) => setMessages((m) => {
          const n = payload.new as Message;
          return m.some((x) => x.id === n.id) ? m : [...m, n];
        }),
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        const from = (payload.payload as any)?.from;
        if (from === "seller") {
          setSellerTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setSellerTyping(false), 3000);
        }
      })
      .subscribe();
    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [chatId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sellerTyping]);

  function broadcastTyping() {
    if (!channelRef.current) return;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { from: "buyer" } });
  }

  async function insertMessage(payload: Partial<Message>) {
    if (!user || !chatId || !shopId) return null;
    const { data, error } = await (supabase as any)
      .from("shop_chat_messages")
      .insert({
        chat_id: chatId,
        shop_id: shopId,
        sender_id: user.id,
        sender_role: "buyer",
        body: payload.body ?? "",
        attachment_url: payload.attachment_url ?? null,
        attachment_type: payload.attachment_type ?? null,
        product_id: payload.product_id ?? null,
      })
      .select("*")
      .single();
    if (error) {
      toast.error("Gagal mengirim pesan");
      return null;
    }
    // Optimistic merge (realtime juga akan dapat, tapi dedupe by id)
    setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, data as Message]));
    return data as Message;
  }

  async function sendMessage() {
    if (!text.trim() || sending) return;
    setSending(true);
    const ok = await insertMessage({ body: text.trim() });
    if (ok) setText("");
    setSending(false);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      toast.error("Hanya gambar yang didukung");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) {
      toast.error("Gagal upload gambar");
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    await insertMessage({
      body: text.trim(),
      attachment_url: pub.publicUrl,
      attachment_type: "image",
    });
    setText("");
    setUploading(false);
  }

  async function sendProductRef(p: ProductLite) {
    setProductSheetOpen(false);
    await insertMessage({
      body: `Tanya soal: ${p.name}`,
      product_id: p.id,
    });
  }

  async function sendQuickReply(q: string) {
    if (sending) return;
    setSending(true);
    await insertMessage({ body: q });
    setSending(false);
  }

  if (notFound) {
    if (typeof window !== "undefined") {
      toast.info("Toko tidak ditemukan");
      navigate({ to: "/", replace: true });
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Mengalihkan ke beranda…</p>
      </div>
    );
  }

  const productById = (id: string) => products.find((p) => p.id === id);

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
          <p className="text-xs text-muted-foreground mt-0.5">
            {sellerTyping ? <span className="text-primary">sedang mengetik…</span> : "Chat sebelum beli · tanya apa saja"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Belum ada pesan. Tanya soal produk, ketersediaan, atau promo — penjual akan segera membalas!
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-3 max-w-md">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  onClick={() => sendQuickReply(q)}
                  disabled={sending}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_role === "buyer";
            const prod = msg.product_id ? productById(msg.product_id) : null;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  }`}
                >
                  {!isMine && (
                    <p className="text-[10px] font-semibold mb-0.5 text-muted-foreground">{shopName}</p>
                  )}

                  {msg.attachment_url && msg.attachment_type === "image" && (
                    <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="block mb-1.5">
                      <img
                        src={msg.attachment_url}
                        alt="Lampiran"
                        className="rounded-lg max-h-60 w-auto object-cover"
                        loading="lazy"
                      />
                    </a>
                  )}

                  {prod && (
                    <Link
                      to="/toko/$slug" params={{ slug }}
                      className={`flex items-center gap-2 rounded-lg p-2 mb-1.5 ${
                        isMine ? "bg-primary-foreground/10" : "bg-background"
                      }`}
                    >
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className={`h-10 w-10 rounded flex items-center justify-center ${isMine ? "bg-primary-foreground/20" : "bg-muted"}`}>
                          <ShoppingBag className="h-4 w-4 opacity-60" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{prod.name}</p>
                        <p className={`text-[11px] ${isMine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{formatIDR(prod.price)}</p>
                      </div>
                    </Link>
                  )}

                  {msg.body && <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>}

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

        {sellerTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {messages.length > 0 && messages.length < 4 && (
        <div className="px-3 pb-2 flex gap-2 overflow-x-auto">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              onClick={() => sendQuickReply(q)}
              disabled={sending}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-border p-3 bg-background">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <form
          className="flex gap-2 items-center"
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="shrink-0"
            aria-label="Lampirkan gambar"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          </Button>

          <Sheet open={productSheetOpen} onOpenChange={setProductSheetOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="shrink-0"
                aria-label="Tanya soal produk"
                disabled={products.length === 0}
              >
                <ShoppingBag className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh]">
              <SheetHeader>
                <SheetTitle>Pilih produk untuk ditanyakan</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-3 mt-4 overflow-y-auto pb-6">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => sendProductRef(p)}
                    className="text-left rounded-lg border border-border bg-card p-2 hover:bg-muted transition"
                  >
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full aspect-square rounded object-cover mb-2" />
                    ) : (
                      <div className="w-full aspect-square rounded bg-muted flex items-center justify-center mb-2">
                        <ShoppingBag className="h-6 w-6 opacity-30" />
                      </div>
                    )}
                    <p className="text-xs font-medium line-clamp-2">{p.name}</p>
                    <p className="text-[11px] text-primary mt-0.5">{formatIDR(p.price)}</p>
                  </button>
                ))}
                {products.length === 0 && (
                  <p className="col-span-2 text-center text-sm text-muted-foreground py-8">
                    Toko belum punya produk
                  </p>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              broadcastTyping();
            }}
            placeholder="Tanya soal produk, harga, promo..."
            className="flex-1"
            disabled={sending || loading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!text.trim() || sending || loading}
            aria-label="Kirim"
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
