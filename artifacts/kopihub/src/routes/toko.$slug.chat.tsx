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
  Paperclip, ImageIcon, X, ShoppingBag, Check, CheckCheck, Clock, RefreshCw, Wifi, WifiOff,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/toko/$slug/chat")({
  component: ShopChatPage,
});

type SendStatus = "sending" | "sent" | "failed";

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
  /** Client-only fields for optimistic UI */
  _tempId?: string;
  _status?: SendStatus;
  /** Local blob URL preview while attachment is uploading. */
  _localPreview?: string;
  /** Upload progress 0..1 while attachment is being uploaded (sending state only). */
  _uploadProgress?: number;
  /** True when this bubble's attachment still needs to be uploaded. */
  _pendingUpload?: boolean;
};

type RtStatus = "connecting" | "live" | "offline";

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
  const [rtStatus, setRtStatus] = useState<RtStatus>("connecting");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  /** Files awaiting upload (text-only fallback) keyed by tempId; survives retries. */
  const pendingFilesRef = useRef<Map<string, { file: File; caption: string }>>(new Map());
  /** Blob URLs we created so we can revoke them on unmount. */
  const blobUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => () => {
    blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    blobUrlsRef.current.clear();
  }, []);

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
    setRtStatus("connecting");
    const ch = supabase
      .channel(`shop-chat-${chatId}`, { config: { presence: { key: user.id } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "shop_chat_messages", filter: `chat_id=eq.${chatId}` },
        (payload) => setMessages((m) => {
          const n = payload.new as Message;
          return m.some((x) => x.id === n.id) ? m : [...m, { ...n, _status: "sent" }];
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
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRtStatus("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setRtStatus("offline");
        else setRtStatus("connecting");
      });
    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
      setRtStatus("offline");
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

  /**
   * Optimistic send:
   * 1. Push temp bubble (status "sending") immediately.
   * 2. INSERT into DB.
   * 3. On success: replace temp with real row (status "sent").
   * 4. On failure: keep temp bubble, mark status "failed", expose retry.
   */
  async function insertMessage(payload: Partial<Message>) {
    if (!user || !chatId || !shopId) return null;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: Message = {
      id: tempId,
      chat_id: chatId,
      sender_id: user.id,
      sender_role: "buyer",
      body: payload.body ?? "",
      attachment_url: payload.attachment_url ?? null,
      attachment_type: payload.attachment_type ?? null,
      product_id: payload.product_id ?? null,
      read_at: null,
      created_at: new Date().toISOString(),
      _tempId: tempId,
      _status: "sending",
    };
    setMessages((m) => [...m, optimistic]);

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

    if (error || !data) {
      setMessages((m) => m.map((x) => (x._tempId === tempId ? { ...x, _status: "failed" } : x)));
      toast.error("Gagal mengirim pesan");
      return null;
    }

    // Replace optimistic with real row; dedupe in case realtime already arrived.
    setMessages((m) => {
      const withoutTemp = m.filter((x) => x._tempId !== tempId);
      if (withoutTemp.some((x) => x.id === data.id)) return withoutTemp;
      return [...withoutTemp, { ...(data as Message), _status: "sent" }];
    });
    return data as Message;
  }

  /**
   * Upload a file via signed URL using XHR so we get real progress events.
   * Returns the final public URL on success.
   */
  function uploadFileWithProgress(
    file: File,
    onProgress: (pct: number) => void,
  ): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      if (!user) { reject(new Error("not-auth")); return; }
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { data: signed, error: signErr } = await (supabase.storage
        .from("chat-attachments") as any)
        .createSignedUploadUrl(path);
      if (signErr || !signed?.signedUrl) {
        reject(signErr ?? new Error("sign-failed"));
        return;
      }

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signed.signedUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.setRequestHeader("x-upsert", "false");
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) onProgress(ev.loaded / ev.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const { data: pub } = supabase.storage.from("chat-attachments").getPublicUrl(path);
          onProgress(1);
          resolve(pub.publicUrl);
        } else {
          reject(new Error(`upload-${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error("network"));
      xhr.onabort = () => reject(new Error("aborted"));
      xhr.send(file);
    });
  }

  /**
   * Begin (or retry) uploading a pending-attachment bubble, then INSERT the
   * message row when upload finishes. Progress is reflected directly on the
   * optimistic bubble — file selection is preserved across retries.
   */
  async function uploadAndInsertForBubble(tempId: string) {
    const entry = pendingFilesRef.current.get(tempId);
    if (!entry || !user || !chatId || !shopId) return;
    const { file, caption } = entry;

    // Mark sending + reset progress
    setMessages((m) => m.map((x) =>
      x._tempId === tempId
        ? { ...x, _status: "sending", _uploadProgress: 0, _pendingUpload: true }
        : x,
    ));

    let publicUrl: string;
    try {
      publicUrl = await uploadFileWithProgress(file, (pct) => {
        setMessages((m) => m.map((x) =>
          x._tempId === tempId ? { ...x, _uploadProgress: pct } : x,
        ));
      });
    } catch {
      // Keep file in ref so user can retry without re-picking it.
      setMessages((m) => m.map((x) =>
        x._tempId === tempId ? { ...x, _status: "failed", _uploadProgress: undefined } : x,
      ));
      toast.error("Gagal upload gambar — file disimpan, coba lagi");
      return;
    }

    // Upload OK → INSERT message row
    const { data, error } = await (supabase as any)
      .from("shop_chat_messages")
      .insert({
        chat_id: chatId,
        shop_id: shopId,
        sender_id: user.id,
        sender_role: "buyer",
        body: caption,
        attachment_url: publicUrl,
        attachment_type: "image",
        product_id: null,
      })
      .select("*")
      .single();

    if (error || !data) {
      // Insert failed but file IS uploaded. Keep URL on bubble so retry skips upload.
      setMessages((m) => m.map((x) =>
        x._tempId === tempId
          ? { ...x, _status: "failed", _uploadProgress: 1, attachment_url: publicUrl, attachment_type: "image", _pendingUpload: false }
          : x,
      ));
      pendingFilesRef.current.delete(tempId);
      toast.error("Upload OK tapi gagal kirim, coba lagi");
      return;
    }

    // Success → swap optimistic bubble with real row
    pendingFilesRef.current.delete(tempId);
    setMessages((m) => {
      const without = m.filter((x) => x._tempId !== tempId);
      if (without.some((x) => x.id === data.id)) return without;
      return [...without, { ...(data as Message), _status: "sent" }];
    });
  }

  async function retrySend(msg: Message) {
    if (!msg._tempId) return;
    // If attachment still needs upload, restart the upload+insert flow.
    if (msg._pendingUpload && pendingFilesRef.current.has(msg._tempId)) {
      await uploadAndInsertForBubble(msg._tempId);
      return;
    }
    // Attachment already uploaded (or text-only) → just re-insert message row.
    setMessages((m) => m.filter((x) => x._tempId !== msg._tempId));
    await insertMessage({
      body: msg.body,
      attachment_url: msg.attachment_url,
      attachment_type: msg.attachment_type,
      product_id: msg.product_id,
    });
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
    if (!file || !user || !chatId || !shopId) return;
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      toast.error("Hanya gambar yang didukung");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5MB");
      return;
    }

    // 1. Create optimistic bubble immediately with local preview + caption
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const localPreview = URL.createObjectURL(file);
    blobUrlsRef.current.add(localPreview);
    const caption = text.trim();
    pendingFilesRef.current.set(tempId, { file, caption });

    const optimistic: Message = {
      id: tempId,
      chat_id: chatId,
      sender_id: user.id,
      sender_role: "buyer",
      body: caption,
      attachment_url: null,
      attachment_type: "image",
      product_id: null,
      read_at: null,
      created_at: new Date().toISOString(),
      _tempId: tempId,
      _status: "sending",
      _localPreview: localPreview,
      _uploadProgress: 0,
      _pendingUpload: true,
    };
    setMessages((m) => [...m, optimistic]);
    setText("");

    // 2. Kick off upload + insert (progress updates flow into the bubble)
    setUploading(true);
    await uploadAndInsertForBubble(tempId);
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

  useEffect(() => {
    if (!notFound) return;
    toast.info("Toko tidak ditemukan");
    const t = setTimeout(() => navigate({ to: "/", replace: true }), 800);
    return () => clearTimeout(t);
  }, [notFound, navigate]);

  if (notFound) {
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
          <p className="text-xs mt-0.5 flex items-center gap-1.5">
            {sellerTyping ? (
              <span className="text-primary">sedang mengetik…</span>
            ) : rtStatus === "live" ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-muted-foreground">Live · chat real-time aktif</span>
              </>
            ) : rtStatus === "connecting" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Menghubungkan…</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">Offline · pesan baru tidak tampil otomatis</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <>
            {/* Skeleton seller */}
            <div className="flex justify-start animate-pulse">
              <div className="max-w-[78%] space-y-2">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5 w-56 h-12" />
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5 w-40 h-10" />
              </div>
            </div>
            {/* Skeleton mine */}
            <div className="flex justify-end animate-pulse">
              <div className="space-y-2 max-w-[78%]">
                <div className="bg-primary/20 rounded-2xl rounded-br-sm px-3 py-2.5 w-48 h-10" />
                <div className="bg-primary/20 rounded-2xl rounded-br-sm px-3 py-2.5 w-32 h-8" />
              </div>
            </div>
            {/* Skeleton seller */}
            <div className="flex justify-start animate-pulse">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5 w-64 h-14" />
            </div>
            {/* Skeleton mine */}
            <div className="flex justify-end animate-pulse">
              <div className="bg-primary/20 rounded-2xl rounded-br-sm px-3 py-2.5 w-44 h-10" />
            </div>
            {/* Skeleton seller */}
            <div className="flex justify-start animate-pulse">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5 w-52 h-10" />
            </div>
          </>
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
            const status: SendStatus = msg._status ?? "sent";
            const isFailed = isMine && status === "failed";
            const isSending = isMine && status === "sending";
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] ${isFailed ? "flex flex-col items-end gap-1" : ""}`}>
                  <div
                    className={`rounded-2xl px-3 py-2 transition-opacity ${
                      isMine
                        ? `${isFailed ? "bg-destructive/10 border border-destructive/40 text-foreground" : "bg-primary text-primary-foreground"} rounded-br-sm ${isSending ? "opacity-70" : ""}`
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
                          isMine && !isFailed ? "bg-primary-foreground/10" : "bg-background"
                        }`}
                      >
                        {prod.image_url ? (
                          <img src={prod.image_url} alt={prod.name} className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className={`h-10 w-10 rounded flex items-center justify-center ${isMine && !isFailed ? "bg-primary-foreground/20" : "bg-muted"}`}>
                            <ShoppingBag className="h-4 w-4 opacity-60" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{prod.name}</p>
                          <p className={`text-[11px] ${isMine && !isFailed ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{formatIDR(prod.price)}</p>
                        </div>
                      </Link>
                    )}

                    {msg.body && <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>}

                    <div
                      className={`text-[10px] mt-1 flex items-center gap-1 ${
                        isMine
                          ? isFailed
                            ? "text-destructive justify-end"
                            : "text-primary-foreground/70 justify-end"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isMine && (
                        status === "sending" ? (
                          <Clock className="h-3 w-3" aria-label="Mengirim" />
                        ) : status === "failed" ? (
                          <AlertCircle className="h-3 w-3" aria-label="Gagal terkirim" />
                        ) : msg.read_at ? (
                          <CheckCheck className="h-3 w-3" aria-label="Dibaca" />
                        ) : (
                          <Check className="h-3 w-3" aria-label="Terkirim" />
                        )
                      )}
                    </div>
                  </div>

                  {isFailed && (
                    <button
                      type="button"
                      onClick={() => retrySend(msg)}
                      className="flex items-center gap-1 text-[11px] font-medium text-destructive hover:underline px-1"
                    >
                      <RefreshCw className="h-3 w-3" /> Coba kirim ulang
                    </button>
                  )}
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
