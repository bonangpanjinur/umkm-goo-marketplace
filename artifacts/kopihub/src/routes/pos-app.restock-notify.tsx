import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Bell, MessageCircle, Search, Loader2, Package, RefreshCw, ExternalLink, CheckCircle2, Send, Megaphone, AlertTriangle, Trash2, Zap, ChevronRight, SkipForward, X, PartyPopper, Phone, ClipboardList, Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/pos-app/restock-notify")({
  head: () => ({ meta: [{ title: "Notifikasi Pelanggan Menunggu — Merchant" }] }),
  component: RestockNotifyPage,
});

type Subscriber = {
  id: string;
  product_id: string;
  product_name: string;
  customer_wa: string;
  customer_name: string | null;
  subscribed_at: string;
  notified_at: string | null;
};

type ProductGroup = {
  product_id: string;
  product_name: string;
  stock: number | null;
  is_available: boolean;
  track_stock: boolean;
  image_url: string | null;
  restock_deadline: string | null;
  subscribers: Subscriber[];
  notified_count: number;
  pending_count: number;
};

type BlastItem = {
  subscriberId: string;
  productName: string;
  customerWa: string;
  customerName: string | null;
  blastMsg: string;
};

function waLink(phone: string, message: string) {
  const clean = phone.replace(/\D/g, "").replace(/^0/, "62");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

function formatRestockDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}

function buildBlastMessage(productName: string, shopName: string, restockDeadline?: string | null): string {
  const deadlineLine = restockDeadline
    ? `\n⏰ Dijadwalkan tersedia: *${formatRestockDate(restockDeadline)}*`
    : "";
  return `Halo! 👋

Kabar gembira — *${productName}* di *${shopName}* kini sudah tersedia kembali! 🎉${deadlineLine}

Stok terbatas, segera pesan sebelum habis lagi ya.

Kunjungi toko kami sekarang!`;
}

function formatWA(wa: string): string {
  const clean = wa.replace(/\D/g, "");
  return clean.startsWith("62") ? `+${clean}` : clean.startsWith("0") ? `+62${clean.slice(1)}` : `+62${clean}`;
}

function autoNotifyKey(shopId: string) {
  return `restock_auto_notify_${shopId}`;
}

// ─── Daily summary builder ───────────────────────────────────────────────────
function buildDailySummary(groups: ProductGroup[], shopName: string): string {
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const totalPending = groups.reduce((s, g) => s + g.pending_count, 0);
  const outOfStock = groups.filter(
    g => (g.track_stock && (g.stock ?? 0) <= 0) || !g.is_available,
  );
  const inStockPending = groups.filter(
    g => g.pending_count > 0 && !outOfStock.includes(g),
  );

  const lines: string[] = [
    `📋 *Ringkasan Harian Restock*`,
    `🏪 *${shopName}*`,
    `🗓️ ${today}`,
    ``,
  ];

  if (outOfStock.length > 0) {
    lines.push(`⚠️ *${outOfStock.length} produk stok habis:*`);
    for (const g of outOfStock) {
      const stk = g.stock !== null ? ` (sisa: ${g.stock})` : "";
      lines.push(`• *${g.product_name}*${stk} — ${g.pending_count} pelanggan menunggu`);
    }
    lines.push(``);
  } else {
    lines.push(`✅ Semua produk yang dipantau tersedia.`);
    lines.push(``);
  }

  if (inStockPending.length > 0) {
    lines.push(`📦 *Kembali tersedia, belum dinotifikasi:*`);
    for (const g of inStockPending) {
      lines.push(`• *${g.product_name}* — ${g.pending_count} pelanggan`);
    }
    lines.push(``);
  }

  lines.push(`📊 *Total ${totalPending} pelanggan menunggu notifikasi*`);
  lines.push(`_via UMKMgo_`);

  return lines.join("\n");
}

// ─── Blast Mode Panel ────────────────────────────────────────────────────────
function BlastModePanel({
  queue,
  shopName,
  onMarkAndNext,
  onSkip,
  onExit,
  sentCount,
  skippedCount,
}: {
  queue: BlastItem[];
  shopName: string;
  onMarkAndNext: (id: string) => Promise<void>;
  onSkip: () => void;
  onExit: () => void;
  sentCount: number;
  skippedCount: number;
}) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(false);
  const [done, setDone] = useState(false);
  const total = queue.length;
  const current = queue[index];

  // Auto-open WhatsApp for the current item whenever index changes
  useEffect(() => {
    if (done || !current) return;
    setOpened(false);
    const t = setTimeout(() => {
      window.open(waLink(current.customerWa, current.blastMsg), "_blank");
      setOpened(true);
    }, 300); // short delay so tab doesn't open before the UI updates
    return () => clearTimeout(t);
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSent() {
    setBusy(true);
    await onMarkAndNext(current.subscriberId);
    setBusy(false);
    if (index + 1 >= total) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
    }
  }

  function handleSkip() {
    onSkip();
    if (index + 1 >= total) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
    }
  }

  function reopenWA() {
    window.open(waLink(current.customerWa, current.blastMsg), "_blank");
    setOpened(true);
  }

  const progress = done ? 100 : Math.round((index / total) * 100);

  // ── Done screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-6">
        <div className="rounded-full bg-green-100 dark:bg-green-900/40 p-5">
          <PartyPopper className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Blast selesai! 🎉</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            {sentCount} pesan dikirim{skippedCount > 0 ? `, ${skippedCount} dilewati` : ""} dari total {total} pelanggan.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={onExit} className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> Selesai
          </Button>
        </div>
      </div>
    );
  }

  // ── Active blast step ────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-green-100 dark:bg-green-900/40 p-2">
            <Send className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-base font-bold">Mode Blast WA</h2>
            <p className="text-xs text-muted-foreground">
              Pelanggan {index + 1} dari {total}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onExit} title="Keluar dari mode blast">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{sentCount} terkirim · {skippedCount} dilewati</span>
          <span>{total - index} tersisa</span>
        </div>
      </div>

      {/* Current recipient card */}
      <Card className="border-green-200 dark:border-green-800 bg-green-50/40 dark:bg-green-950/10">
        <CardContent className="pt-5 pb-5 space-y-4">
          {/* Who */}
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-green-100 dark:bg-green-900/40 p-2.5 shrink-0">
              <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-0.5">
              <p className="font-semibold text-base leading-tight">
                {current.customerName || "Pelanggan"}
              </p>
              <p className="text-sm font-mono text-muted-foreground">
                {formatWA(current.customerWa)}
              </p>
              <Badge variant="secondary" className="text-xs mt-1">
                {current.productName}
              </Badge>
            </div>
          </div>

          {/* Message preview */}
          <div className="rounded-xl bg-white dark:bg-background border border-green-200 dark:border-green-800 p-3">
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
              Pesan WhatsApp
            </p>
            <pre className="text-xs whitespace-pre-wrap font-sans text-foreground leading-relaxed">
              {current.blastMsg}
            </pre>
          </div>

          {/* WA status + reopen */}
          <div className="flex items-center justify-between">
            {opened ? (
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                WhatsApp dibuka — kirim pesan, lalu klik "Sudah Dikirim"
              </span>
            ) : (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Membuka WhatsApp...
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-7 border-green-300 text-green-700 hover:bg-green-50"
              onClick={reopenWA}
            >
              <ExternalLink className="h-3 w-3" />
              Buka Lagi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white h-11 text-base"
          disabled={busy}
          onClick={handleSent}
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
          Sudah Dikirim → Lanjut
          {!busy && index + 1 < total && (
            <ChevronRight className="h-4 w-4 opacity-60" />
          )}
        </Button>
        <Button
          variant="outline"
          className="gap-2 h-11 text-muted-foreground"
          disabled={busy}
          onClick={handleSkip}
        >
          <SkipForward className="h-4 w-4" />
          Lewati
        </Button>
      </div>

      {/* Mini queue preview */}
      {total > 1 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Antrian berikutnya:</p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {queue.slice(index + 1, index + 5).map((item, i) => (
              <div key={item.subscriberId} className="flex items-center gap-2 text-xs text-muted-foreground py-1 border-b border-border/50 last:border-0">
                <span className="text-[10px] font-mono bg-muted rounded px-1 py-0.5 shrink-0">
                  {index + 2 + i}
                </span>
                <span className="truncate">{item.customerName || formatWA(item.customerWa)}</span>
                <span className="truncate text-[10px] text-muted-foreground/60">{item.productName}</span>
              </div>
            ))}
            {total - index - 1 > 4 && (
              <p className="text-[10px] text-muted-foreground/60 text-center pt-0.5">
                +{total - index - 5} lainnya
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function RestockNotifyPage() {
  const { shop } = useCurrentShop();
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "notified">("all");
  const [notifying, setNotifying] = useState<string | null>(null);
  const [autoNotify, setAutoNotify] = useState(true);

  // Blast mode state
  const [blastMode, setBlastMode] = useState(false);
  const [blastQueue, setBlastQueue] = useState<BlastItem[]>([]);
  const [blastSent, setBlastSent] = useState(0);
  const [blastSkipped, setBlastSkipped] = useState(0);

  // Ringkasan harian
  const [showRingkasan, setShowRingkasan] = useState(false);
  const [ringkasanCopied, setRingkasanCopied] = useState(false);

  const groupsRef = useRef<ProductGroup[]>([]);
  const autoNotifyRef = useRef(true);

  const shopId = (shop as any)?.id as string | undefined;
  const shopName = (shop as any)?.name as string | undefined;

  useEffect(() => {
    if (!shopId) return;
    const stored = localStorage.getItem(autoNotifyKey(shopId));
    const val = stored === null ? true : stored === "1";
    setAutoNotify(val);
    autoNotifyRef.current = val;
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    localStorage.setItem(autoNotifyKey(shopId), autoNotify ? "1" : "0");
    autoNotifyRef.current = autoNotify;
  }, [autoNotify, shopId]);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const { data: subs, error } = await (supabase as any)
        .from("restock_subscribers")
        .select("id, product_id, product_name, customer_wa, customer_name, subscribed_at, notified_at")
        .eq("shop_id", shopId)
        .order("subscribed_at", { ascending: false });

      if (error) {
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
setLoading(false);
          return;
        }
        throw error;
      }

      const subscribers: Subscriber[] = subs ?? [];
      const productIds = [...new Set(subscribers.map((s: Subscriber) => s.product_id))];

      let itemMap: Record<string, { stock: number | null; is_available: boolean; track_stock: boolean; image_url: string | null; restock_deadline: string | null }> = {};
      if (productIds.length > 0) {
        const { data: items } = await supabase
          .from("menu_items")
          .select("id, stock_qty, is_available, track_stock, image_url, restock_deadline")
          .in("id", productIds);
        for (const it of items ?? []) {
          itemMap[(it as any).id] = {
            stock: (it as any).stock_qty ?? null,
            is_available: (it as any).is_available ?? true,
            track_stock: (it as any).track_stock ?? false,
            image_url: (it as any).image_url ?? null,
            restock_deadline: (it as any).restock_deadline ?? null,
          };
        }
      }

      const groupMap: Record<string, ProductGroup> = {};
      for (const sub of subscribers) {
        if (!groupMap[sub.product_id]) {
          const info = itemMap[sub.product_id];
          groupMap[sub.product_id] = {
            product_id: sub.product_id,
            product_name: sub.product_name,
            stock: info?.stock ?? null,
            is_available: info?.is_available ?? true,
            track_stock: info?.track_stock ?? false,
            image_url: info?.image_url ?? null,
            restock_deadline: info?.restock_deadline ?? null,
            subscribers: [],
            notified_count: 0,
            pending_count: 0,
          };
        }
        groupMap[sub.product_id].subscribers.push(sub);
        if (sub.notified_at) groupMap[sub.product_id].notified_count++;
        else groupMap[sub.product_id].pending_count++;
      }

      const result = Object.values(groupMap).sort((a, b) => b.pending_count - a.pending_count);
      setGroups(result);
      groupsRef.current = result;
} catch (err: any) {
      toast.error("Gagal memuat data: " + (err?.message ?? "Unknown error"));
    }
    setLoading(false);
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  // Realtime: auto-mark when product comes back in stock
  useEffect(() => {
    if (!shopId || !tableReady) return;
    const ch = supabase
      .channel(`restock-auto-${shopId}`)
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "menu_items", filter: `shop_id=eq.${shopId}` },
        async (payload: any) => {
          if (!autoNotifyRef.current) return;
          const updated = payload.new as any;
          const prev = payload.old as any;
          const nowAvailable = updated.is_available === true;
          const nowHasStock = !updated.track_stock || (updated.stock_qty ?? 0) > 0;
          const wasUnavailable = prev.is_available === false || (prev.track_stock && (prev.stock_qty ?? 0) <= 0);
          if (!nowAvailable || !nowHasStock || !wasUnavailable) return;
          const group = groupsRef.current.find(g => g.product_id === updated.id);
          if (!group || group.pending_count === 0) return;
          const pendingIds = group.subscribers.filter(s => !s.notified_at).map(s => s.id);
          if (pendingIds.length === 0) return;
          try {
            await (supabase as any)
              .from("restock_subscribers")
              .update({ notified_at: new Date().toISOString() })
              .in("id", pendingIds);
            await load();
            toast.success(`✅ "${group.product_name}" kembali tersedia!`, {
              description: `${pendingIds.length} pelanggan otomatis ditandai sudah dinotifikasi.`,
              duration: 8000,
            });
          } catch {}
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shopId, tableReady, load]);

  // Build blast queue from all pending subscribers across all groups
  function startBlast() {
    const queue: BlastItem[] = [];
    for (const group of groupsRef.current) {
      for (const sub of group.subscribers) {
        if (!sub.notified_at) {
          queue.push({
            subscriberId: sub.id,
            productName: group.product_name,
            customerWa: sub.customer_wa,
            customerName: sub.customer_name,
            blastMsg: buildBlastMessage(group.product_name, shopName ?? "Toko Kami", group.restock_deadline),
          });
        }
      }
    }
    if (queue.length === 0) { toast.info("Tidak ada pelanggan yang menunggu notifikasi."); return; }
    setBlastQueue(queue);
    setBlastSent(0);
    setBlastSkipped(0);
    setBlastMode(true);
  }

  async function handleBlastMarkAndNext(subscriberId: string) {
    await (supabase as any)
      .from("restock_subscribers")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", subscriberId);
    setBlastSent(n => n + 1);
  }

  function handleBlastSkip() {
    setBlastSkipped(n => n + 1);
  }

  async function handleBlastExit() {
    setBlastMode(false);
    await load();
    if (blastSent > 0) {
      toast.success(`Blast selesai — ${blastSent} pesan dikirim${blastSkipped > 0 ? `, ${blastSkipped} dilewati` : ""}.`);
    }
  }

  async function markNotified(subscriberId: string) {
    await (supabase as any)
      .from("restock_subscribers")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", subscriberId);
    await load();
  }

  async function markAllNotified(productId: string) {
    setNotifying(productId);
    const ids = groupsRef.current
      .find(g => g.product_id === productId)
      ?.subscribers.filter(s => !s.notified_at)
      .map(s => s.id) ?? [];
    if (ids.length > 0) {
      await (supabase as any)
        .from("restock_subscribers")
        .update({ notified_at: new Date().toISOString() })
        .in("id", ids);
    }
    await load();
    setNotifying(null);
    toast.success("Semua pelanggan ditandai sudah dinotifikasi.");
  }

  async function removeSubscriber(id: string) {
    await (supabase as any).from("restock_subscribers").delete().eq("id", id);
    await load();
    toast.success("Subscriber dihapus.");
  }

  async function removeProduct(productId: string) {
    await (supabase as any).from("restock_subscribers").delete().eq("product_id", productId).eq("shop_id", shopId);
    await load();
    toast.success("Semua subscriber produk dihapus.");
  }

  const filtered = useMemo(() => {
    return groups
      .filter(g => g.product_name.toLowerCase().includes(search.toLowerCase()))
      .filter(g => {
        if (filter === "pending") return g.pending_count > 0;
        if (filter === "notified") return g.notified_count > 0 && g.pending_count === 0;
        return true;
      });
  }, [groups, search, filter]);

  const totalPending = groups.reduce((s, g) => s + g.pending_count, 0);
  const totalNotified = groups.reduce((s, g) => s + g.notified_count, 0);

  // ── Setup screen ─────────────────────────────────────────────────────────

  // ── Blast mode ────────────────────────────────────────────────────────────
  if (blastMode) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <BlastModePanel
          queue={blastQueue}
          shopName={shopName ?? "Toko Kami"}
          onMarkAndNext={handleBlastMarkAndNext}
          onSkip={handleBlastSkip}
          onExit={handleBlastExit}
          sentCount={blastSent}
          skippedCount={blastSkipped}
        />
      </div>
    );
  }

  // ── Normal view ───────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifikasi Pelanggan Menunggu
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pelanggan yang ingin dinotifikasi saat produk stok habis tersedia kembali
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {totalPending > 0 && (
            <Button
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={startBlast}
            >
              <Send className="h-4 w-4" />
              Kirim Semua Sekarang
              <Badge className="bg-white/20 text-white border-0 text-xs ml-0.5 px-1.5">
                {totalPending}
              </Badge>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowRingkasan(true)}
          >
            <ClipboardList className="h-4 w-4" />
            Ringkasan Harian
          </Button>
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Auto-notify toggle */}
      <Card className={autoNotify
        ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10"
        : "border-border bg-muted/30"
      }>
        <CardContent className="flex items-start sm:items-center justify-between gap-4 py-4">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-full p-1.5 ${autoNotify ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <Label htmlFor="auto-notify-toggle" className="text-sm font-semibold cursor-pointer">
                Auto-tandai saat produk kembali tersedia
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                {autoNotify
                  ? "Aktif — saat stok bertambah atau produk diaktifkan kembali, semua pelanggan yang menunggu otomatis ditandai sudah dinotifikasi."
                  : "Nonaktif — tandai pelanggan secara manual setelah mengirim WhatsApp."}
              </p>
            </div>
          </div>
          <Switch
            id="auto-notify-toggle"
            checked={autoNotify}
            onCheckedChange={val => {
              setAutoNotify(val);
              toast.success(val ? "Auto-notifikasi diaktifkan" : "Auto-notifikasi dinonaktifkan");
            }}
            className="shrink-0"
          />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-amber-600">{totalPending}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Belum Dinotifikasi</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-green-600">{totalNotified}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Sudah Dinotifikasi</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{groups.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Produk</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "notified"] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Semua" : f === "pending" ? "Menunggu" : "Sudah Dikirim"}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Memuat...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground space-y-2">
          <Package className="h-10 w-10 mx-auto opacity-30" />
          <p className="font-medium">
            {groups.length === 0
              ? "Belum ada pelanggan yang mendaftar notifikasi restock"
              : "Tidak ada hasil untuk filter ini"}
          </p>
          {groups.length === 0 && (
            <p className="text-xs max-w-xs mx-auto">
              Pelanggan bisa mendaftar dari halaman produk saat stok habis. Mereka memasukkan nomor WhatsApp dan akan muncul di sini.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map(group => {
            const isOutOfStock = (group.track_stock && (group.stock ?? 0) <= 0) || !group.is_available;
            const blastMsg = buildBlastMessage(group.product_name, shopName ?? "Toko Kami", group.restock_deadline);
            const pendingSubs = group.subscribers.filter(s => !s.notified_at);

            return (
              <Card key={group.product_id} className={isOutOfStock ? "border-red-200 dark:border-red-800" : "border-green-200 dark:border-green-800"}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {group.image_url ? (
                        <img src={group.image_url} alt={group.product_name} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <h2 className="font-semibold text-base leading-tight">{group.product_name}</h2>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {isOutOfStock ? (
                            <Badge variant="destructive" className="text-xs">Stok Habis</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 text-xs">Tersedia</Badge>
                          )}
                          {group.stock !== null && (
                            <span className="text-xs text-muted-foreground">Stok: {group.stock}</span>
                          )}
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Bell className="h-3 w-3" />
                            {group.pending_count} menunggu
                          </Badge>
                          {group.notified_count > 0 && (
                            <Badge className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-50 text-xs gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {group.notified_count} sudah dikirim
                            </Badge>
                          )}
                          {autoNotify && !isOutOfStock && pendingSubs.length > 0 && (
                            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50 text-xs gap-1">
                              <Zap className="h-3 w-3" />
                              akan di-auto-tandai
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      {pendingSubs.length > 0 && (
                        <>
                          {pendingSubs.length === 1 ? (
                            <a
                              href={waLink(pendingSubs[0].customer_wa, blastMsg)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => markNotified(pendingSubs[0].id)}
                            >
                              <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                                <MessageCircle className="h-4 w-4" />
                                Kirim WA
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </a>
                          ) : (
                            <a
                              href={waLink(pendingSubs[0].customer_wa, blastMsg)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Button size="sm" variant="outline" className="gap-2 border-green-300 text-green-700 hover:bg-green-50">
                                <Megaphone className="h-4 w-4" />
                                Blast Satu per Satu
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            disabled={notifying === group.product_id}
                            onClick={() => markAllNotified(group.product_id)}
                          >
                            {notifying === group.product_id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <CheckCircle2 className="h-4 w-4" />}
                            Tandai Semua Dikirim
                          </Button>
                        </>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="gap-2 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus semua subscriber?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Ini akan menghapus semua {group.subscribers.length} subscriber untuk produk <strong>{group.product_name}</strong>. Tidak bisa dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeProduct(group.product_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {pendingSubs.length > 1 && (
                    <details className="mt-3">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
                        Lihat template pesan WhatsApp ({pendingSubs.length} penerima)
                      </summary>
                      <div className="mt-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-2">
                        <pre className="text-xs whitespace-pre-wrap text-green-900 dark:text-green-200 font-sans">{blastMsg}</pre>
                        <p className="text-xs text-muted-foreground">
                          Klik "Kirim WA" di masing-masing baris di bawah untuk membuka WhatsApp Web dengan pesan ini.
                        </p>
                      </div>
                    </details>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Pelanggan</TableHead>
                        <TableHead className="text-xs">Nomor WhatsApp</TableHead>
                        <TableHead className="text-xs">Daftar Sejak</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs w-24">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.subscribers.map(sub => (
                        <TableRow key={sub.id} className={sub.notified_at ? "opacity-60" : ""}>
                          <TableCell className="text-sm font-medium">
                            {sub.customer_name || <span className="text-muted-foreground italic">—</span>}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {formatWA(sub.customer_wa)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(sub.subscribed_at).toLocaleDateString("id-ID", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            {sub.notified_at ? (
                              <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 text-xs gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Terkirim
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Bell className="h-3 w-3" />
                                Menunggu
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {!sub.notified_at && (
                                <a
                                  href={waLink(sub.customer_wa, blastMsg)}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() => markNotified(sub.id)}
                                  title="Kirim WhatsApp & tandai terkirim"
                                >
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50">
                                    <Send className="h-3.5 w-3.5" />
                                  </Button>
                                </a>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeSubscriber(sub.id)}
                                title="Hapus subscriber"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Ringkasan Harian dialog ── */}
      <Dialog open={showRingkasan} onOpenChange={setShowRingkasan}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Ringkasan Harian Restock
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <pre className="text-xs whitespace-pre-wrap font-sans text-foreground leading-relaxed select-all">
                {buildDailySummary(groups, shopName ?? "Toko Kami")}
              </pre>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  const text = buildDailySummary(groups, shopName ?? "Toko Kami");
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                }}
              >
                <Share2 className="h-4 w-4" />
                Bagikan via WhatsApp
                <ExternalLink className="h-3 w-3 opacity-70" />
              </Button>

              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={async () => {
                  const text = buildDailySummary(groups, shopName ?? "Toko Kami");
                  if (navigator.share) {
                    try { await navigator.share({ text }); return; } catch {}
                  }
                  await navigator.clipboard.writeText(text);
                  setRingkasanCopied(true);
                  toast.success("Ringkasan disalin ke clipboard!");
                  setTimeout(() => setRingkasanCopied(false), 2500);
                }}
              >
                {ringkasanCopied
                  ? <><Check className="h-4 w-4 text-green-600" /> Tersalin!</>
                  : <><Copy className="h-4 w-4" /> Salin Teks</>}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              "Bagikan via WhatsApp" membuka WA tanpa nomor — kamu bisa pilih kontak atau grup sendiri.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
