import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Users, Send, Copy, Check, Loader2, ChevronRight, ChevronLeft, Download, History, Phone, X, ExternalLink, Zap, RefreshCw, CheckCircle2, XCircle, Clock, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/broadcast-wa")({
  head: () => ({ meta: [{ title: "Broadcast WhatsApp — Merchant" }] }),
  component: BroadcastWAPage,
});

const SEGMENT_DEFS = [
  { value: "all",             label: "Semua Pelanggan",        hint: "Semua yang pernah order" },
  { value: "churn_risk",      label: "Churn Risk",             hint: "Tidak order 30+ hari terakhir" },
  { value: "vip",             label: "Pelanggan VIP",          hint: "5+ pesanan di toko ini" },
  { value: "new",             label: "Pelanggan Baru",         hint: "Order pertama dalam 7 hari terakhir" },
  { value: "one_time",        label: "Belum Repeat Order",     hint: "Hanya 1 order, belum pernah kembali" },
];

const WA_TEMPLATES = [
  {
    id: "promo",
    label: "🎉 Promo / Diskon",
    text: "Halo {{nama}}! 👋\n\nAda promo spesial dari *{{toko}}* untuk kamu!\n\nDiskon 20% untuk semua menu hari ini saja. Jangan sampai kelewatan! 🔥\n\nOrder sekarang 👉 {{link_toko}}\n\nSampai jumpa! 😊",
  },
  {
    id: "winback",
    label: "💌 Win-back (Churn Risk)",
    text: "Halo {{nama}}, kami kangen kamu di *{{toko}}*! 🥹\n\nSudah lama tidak bertransaksi? Kami punya kejutan untukmu.\n\nKunjungi kami lagi dan nikmati layanan terbaik kami 👉 {{link_toko}}\n\nSalam hangat ☕",
  },
  {
    id: "newmenu",
    label: "🍽️ Menu Baru",
    text: "Hei {{nama}}! Ada yang baru nih di *{{toko}}*! 🎊\n\nMenu terbaru kami sudah tersedia dan siap kamu coba. Yuk, intip menu barunya!\n\n{{link_toko}}\n\nTunggu kehadiranmu! 😊",
  },
  {
    id: "thankyou",
    label: "🙏 Terima Kasih VIP",
    text: "Halo {{nama}}! 🌟\n\nTerima kasih sudah setia bersama *{{toko}}*. Kamu adalah pelanggan istimewa kami!\n\nSebagai ucapan terima kasih, kami sudah menyiapkan surprise khusus untukmu.\n\nCek di sini 👉 {{link_toko}}\n\nSampai jumpa! 🤍",
  },
];

type Contact = { name: string; phone: string; order_count: number; last_order: string };
type Broadcast = { id: string; segment_label: string; recipient_count: number; sent_count: number; created_at: string };

function cleanPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return "62" + digits;
}

function renderMsg(template: string, contact: Contact, shopName: string, shopSlug: string): string {
  const link = `${window.location.origin}/toko/${shopSlug}`;
  return template
    .replace(/{{nama}}/g, contact.name || "Kak")
    .replace(/{{toko}}/g, shopName)
    .replace(/{{link_toko}}/g, link);
}

function BroadcastWAPage() {
  const { shop, loading: shopLoading } = useCurrentShop();

  const [segment, setSegment]         = useState("all");
  const [contacts, setContacts]       = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const [messageText, setMessageText] = useState(WA_TEMPLATES[0].text);
  const [tab, setTab]                 = useState<"compose" | "preview" | "history">("compose");

  const [history, setHistory]         = useState<Broadcast[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyExists, setHistoryExists] = useState<boolean | null>(null);
  const [showHistorySql, setShowHistorySql] = useState(false);
  const [copiedSql, setCopiedSql]     = useState(false);

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchIdx, setBatchIdx]       = useState(0);
  const [sentCount, setSentCount]     = useState(0);
  const [batchDone, setBatchDone]     = useState(false);

  const [copied, setCopied]           = useState(false);

  const [fonnteEnabled, setFonnteEnabled]   = useState<boolean | null>(null);
  const [showFonnteModal, setShowFonnteModal] = useState(false);
  const [sendingFonnte, setSendingFonnte]     = useState(false);
  const [fonnteProgress, setFonnteProgress]   = useState<{
    total: number; sent: number; failed: number; done: boolean;
    results: { phone: string; name: string; status: "ok" | "error" | "pending"; reason?: string }[];
  } | null>(null);

  useEffect(() => {
    const apiBase = (import.meta as any).env?.VITE_API_URL ?? "/api";
    fetch(`${apiBase}/wa/config`)
      .then(r => r.json())
      .then((j: any) => setFonnteEnabled(j.enabled === true))
      .catch(() => setFonnteEnabled(false));
  }, []);

  useEffect(() => {
    if (!shop?.id) return;
    loadContacts();
  }, [shop?.id, segment]);

  useEffect(() => {
    if (!shop?.id || historyLoaded) return;
    loadHistory();
  }, [shop?.id, historyLoaded]);

  async function loadContacts() {
    if (!shop?.id) return;
    setLoadingContacts(true);
    try {
      const now = new Date();
      const day30ago = new Date(now.getTime() - 30 * 86400_000).toISOString();
      const day7ago  = new Date(now.getTime() - 7 * 86400_000).toISOString();

      const { data: orders, error } = await supabase
        .from("orders" as any)
        .select("customer_name, customer_phone, created_at")
        .eq("shop_id" as any, shop.id)
        .not("customer_phone" as any, "is", null)
        .order("created_at" as any, { ascending: false })
        .limit(2000) as any;

      if (error) { setContacts([]); setLoadingContacts(false); return; }

      const phoneMap = new Map<string, Contact>();
      for (const o of (orders ?? []) as any[]) {
        const ph = (o.customer_phone ?? "").trim();
        if (!ph) continue;
        const key = cleanPhone(ph);
        if (phoneMap.has(key)) {
          const existing = phoneMap.get(key)!;
          existing.order_count++;
          if (o.created_at > existing.last_order) existing.last_order = o.created_at;
        } else {
          phoneMap.set(key, { name: o.customer_name ?? "Pelanggan", phone: key, order_count: 1, last_order: o.created_at });
        }
      }

      let list = Array.from(phoneMap.values());

      if (segment === "churn_risk")  list = list.filter(c => c.last_order < day30ago);
      else if (segment === "vip")    list = list.filter(c => c.order_count >= 5);
      else if (segment === "new")    list = list.filter(c => c.last_order >= day7ago);
      else if (segment === "one_time") list = list.filter(c => c.order_count === 1 && c.last_order < day7ago);

      setContacts(list);
    } catch {
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }

  async function loadHistory() {
    if (!shop?.id) return;
    const { data, error } = await (supabase as any)
      .from("wa_broadcasts")
      .select("id, segment_label, recipient_count, sent_count, created_at")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error?.message?.includes("does not exist") || error?.message?.includes("relation")) {
      setHistoryExists(false);
    } else {
      setHistoryExists(true);
      setHistory((data ?? []) as Broadcast[]);
    }
    setHistoryLoaded(true);
  }

  async function saveBroadcastHistory(sentCnt: number) {
    if (!shop?.id || false) return;
    const segDef = SEGMENT_DEFS.find(s => s.value === segment);
    await (supabase as any).from("wa_broadcasts").insert({
      shop_id: shop.id,
      segment_label: segDef?.label ?? segment,
      message_template: messageText.slice(0, 500),
      recipient_count: contacts.length,
      sent_count: sentCnt,
      status: "done",
    });
    setHistoryLoaded(false);
  }

  function startBatch() {
    if (!messageText.trim()) { toast.error("Tulis pesan terlebih dahulu."); return; }
    if (contacts.length === 0) { toast.error("Tidak ada kontak di segmen ini."); return; }
    setBatchIdx(0);
    setSentCount(0);
    setBatchDone(false);
    setShowBatchModal(true);
  }

  async function sendCurrent() {
    const c = contacts[batchIdx];
    const msg = renderMsg(messageText, c, shop?.name ?? "Toko Kami", shop?.slug ?? "");

    // F17-3: Coba kirim via Fonnte API dulu, fallback ke window.open
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? "/api";
      const cfgRes = await fetch(`${apiBase}/wa/config`);
      const cfgJson = await cfgRes.json();
      if (cfgJson.enabled) {
        await fetch(`${apiBase}/wa/send-bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ phone: c.phone, message: msg }] }),
        });
      } else {
        // Fonnte belum dikonfigurasi — buka wa.me seperti biasa
        const url = `https://wa.me/${c.phone}?text=${encodeURIComponent(msg)}`;
        window.open(url, "_blank", "noopener");
      }
    } catch {
      const url = `https://wa.me/${c.phone}?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank", "noopener");
    }

    const next = batchIdx + 1;
    setSentCount(s => s + 1);
    if (next >= contacts.length) {
      setBatchDone(true);
      saveBroadcastHistory(next);
    } else {
      setBatchIdx(next);
    }
  }

  function skipCurrent() {
    const next = batchIdx + 1;
    if (next >= contacts.length) {
      setBatchDone(true);
      saveBroadcastHistory(sentCount);
    } else {
      setBatchIdx(next);
    }
  }

  async function sendViaFonnte() {
    if (!shop) return;
    if (contacts.length === 0) { toast.error("Tidak ada kontak di segmen ini."); return; }
    if (!messageText.trim()) { toast.error("Tulis pesan terlebih dahulu."); return; }

    const messages = contacts.map(c => ({
      phone:   c.phone,
      message: renderMsg(messageText, c, shop.name ?? "Toko", shop.slug ?? ""),
    }));
    const initialResults = contacts.map(c => ({
      phone: c.phone, name: c.name, status: "pending" as const,
    }));

    setFonnteProgress({ total: messages.length, sent: 0, failed: 0, done: false, results: initialResults });
    setShowFonnteModal(true);
    setSendingFonnte(true);

    try {
      const apiBase = (import.meta as any).env?.VITE_API_URL ?? "/api";
      const response = await fetch(`${apiBase}/wa/send-bulk-stream`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages }),
      });

      if (!response.ok) {
        const j = await response.json() as any;
        toast.error(j.error ?? "Gagal memulai pengiriman");
        setShowFonnteModal(false);
        return;
      }
      if (!response.body) throw new Error("Tidak ada stream dari server");

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6)) as any;
            if (ev.type === "progress") {
              setFonnteProgress(prev => {
                if (!prev) return prev;
                const results = prev.results.map(r =>
                  r.phone === ev.phone
                    ? { ...r, status: ev.status as "ok" | "error", reason: ev.reason }
                    : r,
                );
                return { ...prev, sent: ev.sent, failed: ev.failed, results };
              });
            } else if (ev.type === "done") {
              setFonnteProgress(prev =>
                prev ? { ...prev, done: true, sent: ev.sent, failed: ev.failed } : prev,
              );
              saveBroadcastHistory(ev.sent);
            }
          } catch {}
        }
      }
    } catch (e) {
      toast.error("Koneksi terputus: " + (e instanceof Error ? e.message : String(e)));
      setShowFonnteModal(false);
    } finally {
      setSendingFonnte(false);
    }
  }

  function copyNumbers() {
    const nums = contacts.map(c => c.phone).join("\n");
    navigator.clipboard.writeText(nums);
    setCopied(true);
    toast.success(`${contacts.length} nomor disalin!`);
    setTimeout(() => setCopied(false), 2000);
  }

  function exportCSV() {
    const rows = [
      ["Nama", "Nomor WA", "Jumlah Order", "Order Terakhir", "Pesan Personal"].join(","),
      ...contacts.map(c => [
        `"${c.name.replace(/"/g, "'")}"`,
        c.phone,
        c.order_count,
        new Date(c.last_order).toLocaleDateString("id-ID"),
        `"${renderMsg(messageText, c, shop?.name ?? "", shop?.slug ?? "").replace(/"/g, "'").replace(/\n/g, " ")}"`,
      ].join(",")),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `broadcast-wa-${segment}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV berhasil diunduh");
  }

  const preview = useMemo(() => {
    if (!contacts[0]) return messageText;
    return renderMsg(messageText, contacts[0], shop?.name ?? "Toko", shop?.slug ?? "toko");
  }, [messageText, contacts, shop]);

  const segDef = SEGMENT_DEFS.find(s => s.value === segment);

  if (shopLoading) return <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            Broadcast WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kirim pesan serentak ke segmen pelanggan melalui WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setTab("history"); setHistoryLoaded(false); }}>
            <History className="h-4 w-4" /> Riwayat
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
        {(["compose", "preview", "history"] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === "history") setHistoryLoaded(false); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? "bg-white dark:bg-zinc-800 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "compose" ? "Tulis Pesan" : t === "preview" ? "Preview & Kirim" : "Riwayat"}
          </button>
        ))}
      </div>

      {/* ─── TAB: COMPOSE ─── */}
      {tab === "compose" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            {/* Segment */}
            <div>
              <Label className="text-sm font-semibold">Target Segmen</Label>
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENT_DEFS.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <div>
                        <span className="font-medium">{s.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">— {s.hint}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 flex items-center gap-2">
                {loadingContacts
                  ? <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Memuat kontak…</span>
                  : <span className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{contacts.length}</span> kontak ditemukan
                      {segDef && <span className="text-muted-foreground"> · {segDef.hint}</span>}
                    </span>
                }
                <button onClick={loadContacts} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
              </div>
            </div>

            {/* Template picker */}
            <div>
              <Label className="text-sm font-semibold">Template Pesan</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {WA_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setMessageText(t.text)}
                    className={`rounded-lg border px-3 py-2 text-xs text-left transition-colors hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/20 ${messageText === t.text ? "border-green-500 bg-green-50 dark:bg-green-950/20 font-semibold" : "border-border bg-card"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message composer */}
            <div>
              <Label className="text-sm font-semibold">Isi Pesan</Label>
              <Textarea
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                rows={9}
                className="mt-1.5 font-mono text-sm resize-none"
                placeholder="Tulis pesan di sini…"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Variabel yang didukung:{" "}
                <code className="bg-muted px-1 rounded">{"{{nama}}"}</code>{" "}
                <code className="bg-muted px-1 rounded">{"{{toko}}"}</code>{" "}
                <code className="bg-muted px-1 rounded">{"{{link_toko}}"}</code>
              </p>
            </div>
          </div>

          {/* Live preview */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Preview Pesan (kontak pertama)</Label>
              <div className="mt-1.5 rounded-2xl bg-[#e5ddd5] dark:bg-zinc-700 p-4 min-h-[180px]">
                {contacts.length === 0
                  ? <p className="text-xs text-muted-foreground text-center mt-8">Pilih segmen untuk preview</p>
                  : (
                    <div className="relative inline-block max-w-xs">
                      <div className="rounded-2xl rounded-tl-sm bg-white dark:bg-zinc-800 shadow px-3.5 py-2.5 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {preview}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 text-right">
                        {contacts[0]?.name} · {contacts[0]?.phone}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Kontakst preview list */}
            {contacts.length > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold">{contacts.length} Kontak — {segDef?.label}</span>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-border">
                  {contacts.slice(0, 30).map((c, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.phone}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{c.order_count}x order</Badge>
                    </div>
                  ))}
                  {contacts.length > 30 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                      +{contacts.length - 30} kontak lainnya…
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => setTab("preview")} disabled={contacts.length === 0 || !messageText.trim()}>
              <Send className="h-4 w-4" /> Lanjut ke Kirim →
            </Button>
          </div>
        </div>
      )}

      {/* ─── TAB: PREVIEW & KIRIM ─── */}
      {tab === "preview" && (
        <div className="space-y-5 max-w-2xl">
          {/* Summary */}
          <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 space-y-1">
            <p className="font-semibold text-green-800 dark:text-green-300">Siap Kirim!</p>
            <p className="text-sm text-green-700 dark:text-green-400">
              Segmen: <strong>{segDef?.label}</strong> · <strong>{contacts.length} kontak</strong>
            </p>
            <p className="text-xs text-green-600 dark:text-green-500">
              Pesan akan dipersonalisasi dengan nama masing-masing pelanggan
            </p>
          </div>

              {/* Fonnte auto-send — primary option when enabled */}
          {fonnteEnabled === true && (
            <div className="rounded-xl border-2 border-green-400 bg-green-50 dark:bg-green-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-green-800 dark:text-green-300">Kirim Otomatis via Fonnte ⚡</p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                    Semua {contacts.length} pesan dikirim otomatis — tidak perlu buka WA manual
                  </p>
                </div>
                <Badge className="bg-green-500 text-white text-[10px] shrink-0">
                  <Wifi className="h-2.5 w-2.5 mr-1" /> Aktif
                </Badge>
              </div>
              <Button
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold"
                onClick={sendViaFonnte}
                disabled={contacts.length === 0 || sendingFonnte}
              >
                {sendingFonnte
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Mengirim…</>
                  : <><Send className="h-4 w-4" /> Kirim {contacts.length} Pesan Sekarang</>
                }
              </Button>
            </div>
          )}

          {/* Manual options grid */}
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Option 1: Batch send */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Kirim Satu per Satu</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Buka WA tiap kontak secara berurutan</p>
                </div>
              </div>
              <Button className="w-full gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm" onClick={startBatch} disabled={contacts.length === 0}>
                <Send className="h-3.5 w-3.5" /> Mulai Kirim ({contacts.length})
              </Button>
            </div>

            {/* Option 2: Copy numbers */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                  <Copy className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Salin Semua Nomor</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Paste ke WA Web atau tools lain</p>
                </div>
              </div>
              <Button variant="outline" className="w-full gap-1.5 text-sm" onClick={copyNumbers} disabled={contacts.length === 0}>
                {copied ? <><Check className="h-3.5 w-3.5 text-green-600" /> Disalin!</> : <><Copy className="h-3.5 w-3.5" /> Salin Nomor</>}
              </Button>
            </div>

            {/* Option 3: Export CSV */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40">
                  <Download className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Ekspor CSV</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Nama, nomor + pesan personal siap pakai</p>
                </div>
              </div>
              <Button variant="outline" className="w-full gap-1.5 text-sm" onClick={exportCSV} disabled={contacts.length === 0}>
                <Download className="h-3.5 w-3.5" /> Unduh CSV
              </Button>
            </div>
          </div>

          {/* Fonnte status / promo */}
          {fonnteEnabled === false && (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 p-4 flex items-start gap-3">
              <WifiOff className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Aktifkan Kirim Otomatis (Fonnte)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Set <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">FONNTE_API_KEY</code> di Replit Secrets untuk kirim semua pesan sekaligus tanpa buka WA manual.
                  Daftar gratis di{" "}
                  <a href="https://fonnte.com" target="_blank" rel="noopener noreferrer" className="text-amber-700 dark:text-amber-400 underline font-medium">fonnte.com</a>.
                </p>
              </div>
            </div>
          )}

          <Button variant="outline" className="gap-1.5" onClick={() => setTab("compose")}>
            <ChevronLeft className="h-4 w-4" /> Kembali Edit Pesan
          </Button>
        </div>
      )}

      {/* ─── TAB: HISTORY ─── */}
      {tab === "history" && (
        <div className="space-y-4 max-w-2xl">
          {!historyLoaded
            ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat riwayat…</div>
            : history.length === 0
            ? (
              <div className="rounded-xl border border-dashed border-border p-12 text-center">
                <History className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Belum ada broadcast yang dikirim</p>
              </div>
            )
            : (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="divide-y divide-border">
                  {history.map(h => (
                    <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{h.segment_label}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(h.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{h.sent_count}<span className="text-muted-foreground font-normal">/{h.recipient_count}</span></p>
                        <p className="text-[11px] text-muted-foreground">terkirim</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </div>
      )}

      {/* ─── FONNTE AUTO-SEND PROGRESS MODAL ─── */}
      <Dialog open={showFonnteModal} onOpenChange={o => { if (!o && !sendingFonnte) setShowFonnteModal(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              {fonnteProgress?.done ? "Broadcast Selesai!" : "Mengirim via Fonnte…"}
            </DialogTitle>
          </DialogHeader>

          {fonnteProgress && (
            <div className="space-y-4 py-1">
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {fonnteProgress.done
                      ? "Pengiriman selesai"
                      : `Mengirim ${fonnteProgress.sent + fonnteProgress.failed} dari ${fonnteProgress.total}…`}
                  </span>
                  <span className="font-medium">
                    <span className="text-green-600">{fonnteProgress.sent} ✓</span>
                    {fonnteProgress.failed > 0 && <span className="text-red-500 ml-2">{fonnteProgress.failed} ✗</span>}
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${(((fonnteProgress.sent + fonnteProgress.failed) / fonnteProgress.total) * 100).toFixed(1)}%` }}
                  />
                </div>
                {!fonnteProgress.done && (
                  <p className="text-[11px] text-muted-foreground text-center">
                    Menunggu ~{Math.ceil((fonnteProgress.total - fonnteProgress.sent - fonnteProgress.failed) * 1.2)} detik lagi…
                  </p>
                )}
              </div>

              {/* Done summary */}
              {fonnteProgress.done && (
                <div className={`rounded-xl p-3 flex items-center gap-3 ${fonnteProgress.failed === 0 ? "bg-green-50 dark:bg-green-950/20 border border-green-200" : "bg-amber-50 dark:bg-amber-950/20 border border-amber-200"}`}>
                  <CheckCircle2 className={`h-8 w-8 shrink-0 ${fonnteProgress.failed === 0 ? "text-green-500" : "text-amber-500"}`} />
                  <div>
                    <p className="font-semibold text-sm">
                      {fonnteProgress.sent} dari {fonnteProgress.total} pesan terkirim
                    </p>
                    {fonnteProgress.failed > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">{fonnteProgress.failed} gagal — cek nomor tidak aktif</p>
                    )}
                  </div>
                </div>
              )}

              {/* Per-contact results list */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/30 border-b border-border px-3 py-1.5 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold">Status per Kontak</span>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-border">
                  {fonnteProgress.results.map((r, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                      <div className="shrink-0">
                        {r.status === "ok"      && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {r.status === "error"   && <XCircle className="h-4 w-4 text-red-500" />}
                        {r.status === "pending" && (
                          sendingFonnte && fonnteProgress.results.findIndex(x => x.status === "pending") === i
                            ? <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                            : <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground">{r.phone}</p>
                      </div>
                      {r.status === "error" && r.reason && (
                        <span className="text-[10px] text-red-500 shrink-0 max-w-[80px] truncate">{r.reason}</span>
                      )}
                      {r.status === "ok" && (
                        <span className="text-[10px] text-green-500 shrink-0">Terkirim</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {fonnteProgress?.done ? (
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={() => { setShowFonnteModal(false); setTab("history"); setHistoryLoaded(false); }}>
                  <History className="h-4 w-4 mr-1.5" /> Lihat Riwayat
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowFonnteModal(false)}>
                  Tutup
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground w-full text-center">
                <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                Jangan tutup tab ini — pengiriman sedang berlangsung
              </p>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── BATCH SEND MODAL ─── */}
      <Dialog open={showBatchModal} onOpenChange={o => { if (!o) setShowBatchModal(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              {batchDone ? "Broadcast Selesai!" : "Kirim Broadcast WA"}
            </DialogTitle>
          </DialogHeader>

          {batchDone ? (
            <div className="py-4 text-center space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <p className="font-semibold">Selesai!</p>
              <p className="text-sm text-muted-foreground">
                <strong>{sentCount}</strong> dari <strong>{contacts.length}</strong> pesan berhasil dikirim
              </p>
            </div>
          ) : (
            <div className="py-2 space-y-4">
              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Kontak {batchIdx + 1} dari {contacts.length}</span>
                  <span>{sentCount} terkirim</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${((batchIdx) / contacts.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Current contact */}
              {contacts[batchIdx] && (
                <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-green-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{contacts[batchIdx].name}</p>
                      <p className="text-xs text-muted-foreground">{contacts[batchIdx].phone}</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-zinc-800 border border-border p-2.5 text-xs whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                    {renderMsg(messageText, contacts[batchIdx], shop?.name ?? "", shop?.slug ?? "")}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Klik "Kirim & Lanjut" — WhatsApp akan terbuka di tab baru dengan pesan sudah terisi
              </p>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            {batchDone ? (
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowBatchModal(false)}>
                Tutup
              </Button>
            ) : (
              <>
                <Button variant="outline" className="gap-1 text-sm" onClick={skipCurrent}>
                  <X className="h-3.5 w-3.5" /> Lewati
                </Button>
                <Button className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm" onClick={sendCurrent}>
                  <ExternalLink className="h-3.5 w-3.5" /> Kirim & Lanjut <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
