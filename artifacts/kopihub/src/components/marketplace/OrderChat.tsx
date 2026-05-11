import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

type Msg = {
  id: string;
  body: string;
  sender_id: string;
  sender_role: string;
  created_at: string;
};

export function OrderChat({
  orderId,
  currentUserId,
  className,
}: {
  orderId: string;
  currentUserId: string;
  className?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data } = await supabase
        .from("order_messages")
        .select("id, body, sender_id, sender_role, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (!ignore) {
        setMessages((data as Msg[]) ?? []);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`order-msg-${orderId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_messages", filter: `order_id=eq.${orderId}` },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (payload.new as any).id) ? prev : [...prev, payload.new as Msg],
          );
        },
      )
      .subscribe();
    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    const { error } = await supabase.rpc("send_order_message", { _order_id: orderId, _body: text });
    if (error) toast.error(error.message);
    else setBody("");
    setSending(false);
  }

  return (
    <div className={`flex flex-col rounded-lg border border-border bg-card ${className ?? ""}`}>
      <div ref={scrollRef} className="max-h-72 min-h-[140px] flex-1 space-y-2 overflow-y-auto p-3">
        {loading ? (
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Belum ada pesan. Mulai percakapan.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div className={`mt-0.5 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-border p-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tulis pesan..."
          maxLength={2000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button size="icon" onClick={send} disabled={sending || !body.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
