import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, MessageCircle, Send, ArrowLeft, User, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/inbox")({
  head: () => ({ meta: [{ title: "Inbox Chat" }] }),
  component: InboxPage,
});

type ChatThread = {
  id: string;
  buyer_user_id: string;
  last_message_at: string;
  last_body?: string;
  unread_count?: number;
};

type Message = {
  id: string;
  sender_id: string;
  sender_role: "buyer" | "seller";
  body: string;
  created_at: string;
  read_at: string | null;
};

function InboxPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const { user } = useAuth();

  const [threads, setThreads]       = useState<ChatThread[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeChat, setActiveChat] = useState<ChatThread | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [text, setText]             = useState("");
  const [sending, setSending]       = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const totalUnread = threads.reduce((s, t) => s + (t.unread_count ?? 0), 0);

  const loadThreads = useCallback(async () => {
    if (!shop) return;
    setLoading(true);

    const { data } = await (supabase as any)
      .from("shop_chats")
      .select("id, buyer_user_id, last_message_at")
      .eq("shop_id", shop.id)
      .order("last_message_at", { ascending: false })
      .limit(60);

    const chats = (data ?? []) as ChatThread[];

    const enriched = await Promise.all(
      chats.map(async (c) => {
        const [lastMsg, unread] = await Promise.all([
          (supabase as any)
            .from("shop_chat_messages")
            .select("body")
            .eq("chat_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          (supabase as any)
            .from("shop_chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("chat_id", c.id)
            .eq("sender_role", "buyer")
            .is("read_at", null),
        ]);
        return {
          ...c,
          last_body: lastMsg.data?.body as string | undefined,
          unread_count: (unread.count ?? 0) as number,
        };
      }),
    );
    setThreads(enriched);
    setLoading(false);
  }, [shop]);

  useEffect(() => {
    if (!shopLoading && shop) loadThreads();
  }, [shop, shopLoading, loadThreads]);

  async function openChat(chat: ChatThread) {
    setActiveChat(chat);
    setMsgLoading(true);
    const { data: msgs } = await (supabase as any)
      .from("shop_chat_messages")
      .select("*")
      .eq("chat_id", chat.id)
      .order("created_at", { ascending: true });
    setMessages((msgs ?? []) as Message[]);
    setMsgLoading(false);

    await (supabase as any)
      .from("shop_chat_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("chat_id", chat.id)
      .eq("sender_role", "buyer")
      .is("read_at", null);

    setThreads((prev) =>
      prev.map((t) => (t.id === chat.id ? { ...t, unread_count: 0 } : t)),
    );
  }

  useEffect(() => {
    if (!activeChat?.id) return;
    const ch = supabase
      .channel(`inbox-chat-${activeChat.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "shop_chat_messages",
          filter: `chat_id=eq.${activeChat.id}`,
        },
        (payload) => {
          setMessages((m) => [...m, payload.new as Message]);
          setThreads((prev) =>
            prev.map((t) =>
              t.id === activeChat.id
                ? { ...t, last_body: (payload.new as Message).body, last_message_at: (payload.new as Message).created_at }
                : t,
            ),
          );
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeChat?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendReply() {
    if (!text.trim() || !activeChat || !user || !shop) return;
    setSending(true);
    const body = text.trim();
    setText("");
    const { error } = await (supabase as any).from("shop_chat_messages").insert({
      chat_id: activeChat.id,
      shop_id: shop.id,
      sender_id: user.id,
      sender_role: "seller",
      body,
    });
    if (!error) {
      await (supabase as any)
        .from("shop_chats")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", activeChat.id);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeChat.id
            ? { ...t, last_body: body, last_message_at: new Date().toISOString() }
            : t,
        ),
      );
    } else {
      toast.error("Gagal mengirim pesan");
      setText(body);
    }
    setSending(false);
  }

  if (shopLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Inbox Chat
            {totalUnread > 0 && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Percakapan calon pembeli yang tanya sebelum memesan.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadThreads} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]" style={{ height: "calc(100vh - 220px)", minHeight: 480 }}>
        {/* Thread list */}
        <div className="overflow-y-auto rounded-xl border border-border bg-card">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
              <MessageCircle className="h-9 w-9 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">
                Belum ada percakapan. Pembeli bisa chat dari halaman toko Anda di marketplace.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => openChat(t)}
                    className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 ${
                      activeChat?.id === t.id
                        ? "bg-primary/5 border-l-[3px] border-primary"
                        : ""
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold truncate">
                          Pembeli #{t.buyer_user_id.slice(0, 8).toUpperCase()}
                        </p>
                        {(t.unread_count ?? 0) > 0 && (
                          <span className="shrink-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                            {t.unread_count}
                          </span>
                        )}
                      </div>
                      {t.last_body && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {t.last_body}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(t.last_message_at).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Message panel */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          {!activeChat ? (
            <div className="flex flex-col flex-1 items-center justify-center gap-3 text-center p-8">
              <MessageCircle className="h-10 w-10 text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground">Pilih percakapan untuk membalas</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">
                <button
                  onClick={() => setActiveChat(null)}
                  className="lg:hidden p-1 rounded hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    Pembeli #{activeChat.buyer_user_id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">Chat pra-pembelian</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                    Belum ada pesan dalam percakapan ini
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_role === "seller";
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
                            <p className="text-[10px] font-semibold mb-0.5 text-muted-foreground">
                              Pembeli
                            </p>
                          )}
                          <p className="text-sm">{msg.body}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              isMine
                                ? "text-primary-foreground/70 text-right"
                                : "text-muted-foreground"
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

              <div className="border-t border-border p-3 shrink-0">
                <form
                  className="flex gap-2"
                  onSubmit={(e) => { e.preventDefault(); sendReply(); }}
                >
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Balas pesan pembeli..."
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button type="submit" size="icon" disabled={!text.trim() || sending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
