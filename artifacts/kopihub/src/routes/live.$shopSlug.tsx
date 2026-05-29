import { createFileRoute, useParams, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { addToCart } from "@/lib/marketplace-cart";
import { useAuth } from "@/lib/auth";
import {
  Radio, Eye, ShoppingCart, MessageSquare, Send, Users, ChevronRight, Loader2, ExternalLink,
} from "lucide-react";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/live/$shopSlug")({
  head: () => ({ meta: [{ title: "Live Commerce" }] }),
  component: LiveViewerPage,
  validateSearch: (search: Record<string, unknown>) => ({
    session: typeof search.session === "string" ? search.session : undefined,
  }),
});

type Shop = { id: string; name: string; logo_url: string | null; slug: string };
type LiveSession = {
  id: string; title: string; description: string | null; status: string;
  stream_url: string | null; viewer_count: number; products: string[];
};
type Product = { id: string; name: string; price: number; image_url: string | null; stock: number };
type ChatMessage = { id: string; user_name: string; message: string; created_at: string };

function LiveViewerPage() {
  const { shopSlug } = useParams({ from: "/live/$shopSlug" });
  const search = useSearch({ from: "/live/$shopSlug" });
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: s } = await supabase.from("shops").select("id,name,logo_url,slug").eq("slug", shopSlug).maybeSingle();
      if (!s) { setLoading(false); return; }
      setShop(s as Shop);

      let sessionQuery = (supabase as any).from("live_sessions").select("*").eq("shop_id", s.id);
      if (search.session) {
        sessionQuery = sessionQuery.eq("id", search.session);
      } else {
        sessionQuery = sessionQuery.eq("status", "live");
      }
      const { data: sess } = await sessionQuery.order("started_at", { ascending: false }).limit(1).maybeSingle();
      if (!sess) { setLoading(false); return; }
      setSession(sess as LiveSession);

      if ((sess as LiveSession).products?.length > 0) {
        const { data: prods } = await (supabase as any)
          .from("menu_items").select("id,name,price,image_url,stock")
          .in("id", (sess as LiveSession).products);
        setProducts((prods ?? []) as Product[]);
      }

      const { data: msgs } = await (supabase as any).from("live_chat_messages")
        .select("*").eq("session_id", sess.id).order("created_at").limit(50);
      setMessages((msgs ?? []) as ChatMessage[]);

      await (supabase as any).from("live_sessions").update({ viewer_count: ((sess as LiveSession).viewer_count ?? 0) + 1 }).eq("id", sess.id);
      setLoading(false);
    })();
  }, [shopSlug, search.session]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!session) return;
    const channel = (supabase as any).channel(`live-chat-${session.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `session_id=eq.${session.id}` }, (payload: any) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [session?.id]);

  const sendMessage = async () => {
    if (!session || !chatInput.trim()) return;
    setSending(true);
    const userName = user ? (user.email?.split("@")[0] ?? "Penonton") : `Penonton${Math.floor(Math.random() * 9999)}`;
    await (supabase as any).from("live_chat_messages").insert({
      session_id: session.id, user_id: user?.id ?? null, user_name: userName, message: chatInput.trim(),
    });
    setChatInput("");
    setSending(false);
  };

  const handleAddToCart = async (product: Product) => {
    if (!shop) return;
    await addToCart({ product_id: product.id, shop_id: shop.id, quantity: 1, unit_price: product.price, product_name: product.name, image_url: product.image_url });
    toast.success(`${product.name} ditambahkan ke keranjang`);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col"><MarketplaceHeader />
      <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    </div>
  );

  if (!shop || !session) return (
    <div className="min-h-screen flex flex-col"><MarketplaceHeader />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
        <Radio className="h-12 w-12 text-muted-foreground/40" />
        <p className="font-semibold text-lg">Tidak ada sesi live aktif</p>
        <p className="text-sm text-muted-foreground">Sesi live belum dimulai atau sudah berakhir.</p>
        {shop && (
          <Link to="/toko/$slug" params={{ slug: shopSlug }}>
            <Button variant="outline">Kunjungi Toko <ChevronRight className="h-4 w-4 ml-1" /></Button>
          </Link>
        )}
      </div>
      <MarketplaceFooter />
    </div>
  );

  const isLive = session.status === "live";

  return (
    <div className="min-h-screen flex flex-col">
      <MarketplaceHeader />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          {shop.logo_url && <img src={shop.logo_url} alt={shop.name} className="h-8 w-8 rounded-full object-cover" />}
          <div>
            <Link to="/toko/$slug" params={{ slug: shop.slug }} className="text-sm font-semibold hover:underline">{shop.name}</Link>
            <div className="flex items-center gap-2">
              {isLive ? (
                <Badge className="bg-red-500 text-white text-[11px] animate-pulse"><Radio className="h-2.5 w-2.5 mr-1" />LIVE</Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-600 text-[11px]">Rekaman</Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" />{session.viewer_count} penonton</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center border border-border">
              {session.stream_url ? (
                session.stream_url.includes("youtube") ? (
                  <iframe
                    src={session.stream_url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen className="w-full h-full"
                  />
                ) : (
                  <a href={session.stream_url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-3 text-white">
                    <ExternalLink className="h-12 w-12 opacity-60" />
                    <span className="text-sm opacity-60">Buka stream di tab baru</span>
                    <Button variant="outline" className="text-white border-white/30 hover:bg-white/10">Tonton Live</Button>
                  </a>
                )
              ) : (
                <div className="flex flex-col items-center gap-3 text-white opacity-60">
                  <Radio className="h-12 w-12" />
                  <p className="text-sm">{isLive ? "Streaming sedang berlangsung" : "Sesi tidak tersedia"}</p>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold">{session.title}</h2>
              {session.description && <p className="text-sm text-muted-foreground mt-1">{session.description}</p>}
            </div>

            {products.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Produk di Live ini</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {products.map(p => (
                    <Card key={p.id} className="p-3">
                      {p.image_url && <img src={p.image_url} alt={p.name} className="w-full aspect-square rounded-lg object-cover mb-2" />}
                      <p className="text-xs font-semibold line-clamp-2">{p.name}</p>
                      <p className="text-sm font-bold text-primary mt-1">{formatIDR(p.price)}</p>
                      <Button size="sm" className="w-full mt-2 h-7 text-xs" onClick={() => handleAddToCart(p)}>
                        <ShoppingCart className="h-3 w-3 mr-1" /> Beli
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <Card className="flex-1 flex flex-col h-[500px]">
              <div className="flex items-center gap-2 p-3 border-b border-border">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm font-semibold">Live Chat</span>
                <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{session.viewer_count}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.map(msg => (
                  <div key={msg.id} className="text-xs">
                    <span className="font-semibold text-primary">{msg.user_name}: </span>
                    <span>{msg.message}</span>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-4">Jadilah yang pertama berkomentar!</p>
                )}
                <div ref={chatEndRef} />
              </div>
              {isLive && (
                <div className="p-3 border-t border-border flex gap-2">
                  <input
                    className="flex-1 rounded-md border border-input px-3 py-1.5 text-xs bg-background"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder="Kirim pesan..."
                    maxLength={200}
                  />
                  <Button size="sm" onClick={sendMessage} disabled={sending || !chatInput.trim()} className="h-8 w-8 p-0">
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
      <MarketplaceFooter />
    </div>
  );
}
