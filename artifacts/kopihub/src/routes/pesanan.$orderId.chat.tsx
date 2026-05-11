import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { Send, ChevronLeft, MessageCircle, Loader2, AlertCircle, Store } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pesanan/$orderId/chat")({ component: OrderChatPage });

type Message = {
  id: string;
  content: string;
  sender_type: "buyer" | "seller" | "system";
  sender_id: string | null;
  created_at: string;
  read_at: string | null;
};

export default function OrderChatPage() {
  const { orderId } = Route.useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [shopName, setShopName] = useState("Toko");
  const [orderNum, setOrderNum] = useState("");
  const [status, setStatus] = useState("");
  const [notFound, setNotFound] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: order } = await supabase
        .from("orders")
        .select("id, order_number, status, coffee_shops(name)")
        .eq("id", orderId)
        .maybeSingle();

      if (!order) { setNotFound(true); setLoading(false); return; }
      setOrderNum((order as any).order_number ?? orderId.slice(0, 8).toUpperCase());
      setStatus((order as any).status ?? "");
      setShopName((order as any).coffee_shops?.name ?? "Toko");

      const { data: msgs } = await supabase
        .from("order_messages")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (msgs && msgs.length > 0) {
        setMessages(msgs as Message[]);
      } else {
        setMessages([{
          id: "sys-1",
          content: `Chat ini khusus untuk pesanan #${(order as any).order_number ?? orderId.slice(0,8).toUpperCase()}. Tanyakan kendala pesanan, negosiasi, atau konfirmasi pengiriman di sini.`,
          sender_type: "system",
          sender_id: null,
          created_at: new Date().toISOString(),
          read_at: null,
        }]);
      }
      setLoading(false);
    })();
  }, [orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`order-chat-${orderId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_messages", filter: `order_id=eq.${orderId}` }, payload => {
        setMessages(m => [...m, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  async function sendMessage() {
    if (!text.trim() || !user) return;
    setSending(true);
    const newMsg = {
      order_id: orderId,
      content: text.trim(),
      sender_type: "buyer",
      sender_id: user.id,
    };
    const { error } = await supabase.from("order_messages").insert(newMsg);
    if (error) {
      setMessages(m => [...m, {
        id: `local-${Date.now()}`,
        content: text.trim(),
        sender_type: "buyer",
        sender_id: user.id,
        created_at: new Date().toISOString(),
        read_at: null,
      }]);
    }
    setText("");
    setSending(false);
  }

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Pesanan tidak ditemukan</p>
        <Button asChild className="mt-4" variant="outline"><Link to="/akun/pesanan">Kembali</Link></Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link to="/pesanan/$orderId" params={{ orderId }}><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Store className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-none">{shopName}</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            Pesanan #{orderNum} <Badge variant="secondary" className="text-xs h-4">{status}</Badge>
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          messages.map(msg => {
            if (msg.sender_type === "system") return (
              <div key={msg.id} className="flex justify-center">
                <span className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full max-w-[80%] text-center">{msg.content}</span>
              </div>
            );
            const isMine = msg.sender_type === "buyer";
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/70 text-right" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
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
          onSubmit={e => { e.preventDefault(); sendMessage(); }}
        >
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Tulis pesan..."
            className="flex-1"
            disabled={sending || loading}
          />
          <Button type="submit" size="icon" disabled={!text.trim() || sending || loading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">Chat ini khusus untuk pesanan #{orderNum}</p>
      </div>
    </div>
  );
}
