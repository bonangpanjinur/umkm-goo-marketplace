import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2, ArrowLeft, Star, MessageSquare, Truck, AlertOctagon,
  Check, Clock, Package, PackageCheck, PackageX, Bike, Store,
  ShieldCheck, RefreshCw, Timer, CreditCard, AlertTriangle,
} from "lucide-react";
import { formatIDR } from "@/lib/format";
import { courierLabel, getCourierTrackUrl } from "@/lib/tracking";
import { MarketplaceReviewDialog } from "@/components/marketplace/MarketplaceReviewDialog";
import { OrderChat } from "@/components/marketplace/OrderChat";
import { DisputeDialog } from "@/components/marketplace/DisputeDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/akun/pesanan/$orderId")({
  head: () => ({ meta: [{ title: "Detail Pesanan — UMKMgo" }] }),
  component: OrderDetailPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending:     "Menunggu Konfirmasi",
  confirmed:   "Dikonfirmasi",
  preparing:   "Sedang Disiapkan",
  ready:       "Siap",
  in_delivery: "Sedang Diantar",
  delivering:  "Sedang Diantar",
  delivered:   "Terkirim",
  completed:   "Selesai",
  cancelled:   "Dibatalkan",
  voided:      "Dibatalkan",
};

const STATUS_COLOR: Record<string, string> = {
  pending:     "bg-amber-100 text-amber-700 border-amber-200",
  confirmed:   "bg-blue-100 text-blue-700 border-blue-200",
  preparing:   "bg-blue-100 text-blue-700 border-blue-200",
  ready:       "bg-violet-100 text-violet-700 border-violet-200",
  in_delivery: "bg-indigo-100 text-indigo-700 border-indigo-200",
  delivering:  "bg-indigo-100 text-indigo-700 border-indigo-200",
  delivered:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled:   "bg-red-100 text-red-700 border-red-200",
  voided:      "bg-red-100 text-red-700 border-red-200",
};

const STEPS_DELIVERY = [
  { key: "pending",     label: "Menunggu Konfirmasi", icon: Clock,        desc: "Pesanan menunggu konfirmasi dari toko" },
  { key: "confirmed",   label: "Dikonfirmasi",         icon: Check,        desc: "Toko telah menerima pesanan" },
  { key: "preparing",   label: "Sedang Disiapkan",     icon: Package,      desc: "Toko sedang menyiapkan pesanan" },
  { key: "ready",       label: "Siap Diantar",         icon: PackageCheck, desc: "Pesanan siap, menunggu kurir" },
  { key: "in_delivery", label: "Sedang Diantar",       icon: Bike,         desc: "Kurir sedang mengantarkan pesanan" },
  { key: "completed",   label: "Selesai",              icon: ShieldCheck,  desc: "Pesanan telah diterima" },
];

const STEPS_PICKUP = [
  { key: "pending",   label: "Menunggu Konfirmasi", icon: Clock,        desc: "Pesanan menunggu konfirmasi dari toko" },
  { key: "confirmed", label: "Dikonfirmasi",         icon: Check,        desc: "Toko telah menerima pesanan" },
  { key: "preparing", label: "Sedang Disiapkan",     icon: Package,      desc: "Toko sedang menyiapkan pesanan" },
  { key: "ready",     label: "Siap Diambil",         icon: PackageCheck, desc: "Silakan datang untuk mengambil pesanan" },
  { key: "completed", label: "Selesai",              icon: ShieldCheck,  desc: "Pesanan telah selesai" },
];

type StatusLog = { status: string; created_at: string; note: string | null };

function PaymentCountdownBanner({ deadlineMs, orderId }: { deadlineMs: number; orderId: string }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const tick = () => {
      const ms = deadlineMs - Date.now();
      if (ms <= 0) { setRemaining(""); return; }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setRemaining(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineMs]);

  if (!remaining) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
      <div>
        <p className="font-semibold text-red-900 text-sm">Waktu bayar habis</p>
        <p className="text-xs text-red-700 mt-0.5">Pesanan otomatis dibatalkan karena melewati batas waktu pembayaran.</p>
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <Timer className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-amber-900 text-sm">Selesaikan pembayaran segera</p>
          <p className="text-xs text-amber-700 mt-0.5">Pesanan akan dibatalkan otomatis jika belum dibayar dalam:</p>
          <div className="mt-2 inline-flex items-center rounded-lg bg-amber-100 px-3 py-1.5 font-mono text-lg font-bold tabular-nums text-amber-900 tracking-wider">
            <CreditCard className="h-4 w-4 mr-2" /> {remaining}
          </div>
        </div>
      </div>
    </div>
  );
}

function getStepIndex(steps: typeof STEPS_DELIVERY, status: string) {
  const idx = steps.findIndex(s => s.key === status ||
    (status === "delivering" && s.key === "in_delivery") ||
    (status === "delivered"  && s.key === "completed"));
  return idx;
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function OrderTimeline({ order, logs }: { order: any; logs: StatusLog[] }) {
  const isCancelled = ["cancelled", "voided"].includes(order.status);
  const isDelivery  = order.fulfillment === "delivery";
  const steps       = isDelivery ? STEPS_DELIVERY : STEPS_PICKUP;
  const currentIdx  = getStepIndex(steps, order.status);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <PackageX className="h-8 w-8 shrink-0 text-red-500" />
        <div>
          <p className="font-semibold text-red-800">Pesanan Dibatalkan</p>
          <p className="text-xs text-red-600 mt-0.5">Hubungi penjual jika ada pertanyaan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Status Pesanan</h3>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[order.status] ?? "bg-muted text-muted-foreground"}`}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      <ol className="relative space-y-0">
        {steps.map((step, i) => {
          const done    = currentIdx >= 0 && i <= currentIdx;
          const active  = i === currentIdx;
          const Icon    = step.icon;
          const isLast  = i === steps.length - 1;

          const log = logs.find(l => l.status === step.key ||
            (l.status === "delivering"  && step.key === "in_delivery") ||
            (l.status === "delivered"   && step.key === "completed"));
          const timestamp = log?.created_at ?? (active ? order.updated_at : null);

          return (
            <li key={step.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  done
                    ? active
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : "border-emerald-500 bg-emerald-500 text-white"
                    : "border-muted bg-background text-muted-foreground"
                }`}>
                  {active && !isLast ? (
                    <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                  ) : null}
                  {done && !active ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 my-1 min-h-[20px] rounded-full ${done && i < currentIdx ? "bg-emerald-400" : "bg-muted"}`} />
                )}
              </div>
              <div className={`pb-5 flex-1 min-w-0 ${isLast ? "" : ""}`}>
                <p className={`text-sm leading-none mt-1.5 ${active ? "font-bold text-foreground" : done ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </p>
                {active && (
                  <p className="mt-1 text-xs text-muted-foreground">{step.desc}</p>
                )}
                {timestamp && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{formatTs(timestamp)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const { user } = useAuth();
  const [order, setOrder]     = useState<any>(null);
  const [items, setItems]     = useState<any[]>([]);
  const [logs, setLogs]       = useState<StatusLog[]>([]);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewOpen, setReviewOpen]   = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [dispute, setDispute]         = useState<any>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: o } = await supabase
      .from("orders")
      .select("id, order_no, status, payment_status, total, subtotal, delivery_fee, customer_name, customer_phone, delivery_address, fulfillment, note, created_at, updated_at, tracking_number, courier_name, tracking_url, tracking_set_at, shop:shops(id, name, slug, logo_url, whatsapp, phone)")
      .eq("id", orderId)
      .eq("customer_user_id", user.id)
      .maybeSingle();
    setOrder(o);
    if (o) {
      const [itemRes, reviewRes, disputeRes, logRes] = await Promise.all([
        supabase.from("order_items").select("id, menu_item_id, name, qty, price, total").eq("order_id", o.id),
        supabase.from("product_reviews").select("product_id").eq("order_id", o.id).eq("user_id", user.id),
        supabase.from("order_disputes").select("id, status, reason, description, resolution, refund_amount, created_at, resolved_at")
          .eq("order_id", o.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("order_status_logs" as any).select("status, created_at, note")
          .eq("order_id", o.id).order("created_at", { ascending: true }),
      ]);
      setItems(itemRes.data || []);
      setReviewed(new Set((reviewRes.data || []).map((r: any) => r.product_id)));
      setDispute(disputeRes.data);
      setLogs((logRes.data as any) || []);
    }
    setLoading(false);
  }, [orderId, user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!orderId) return;
    const ch = supabase.channel(`order-detail-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => {
          setOrder((prev: any) => prev ? { ...prev, ...payload.new } : prev);
          toast.info(`Status pesanan berubah: ${STATUS_LABEL[(payload.new as any).status] ?? (payload.new as any).status}`);
          load();
        })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_status_logs", filter: `order_id=eq.${orderId}` },
        (payload) => {
          setLogs(prev => [...prev, payload.new as StatusLog]);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orderId, load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    toast.success("Status diperbarui");
  };

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!order)  return <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Pesanan tidak ditemukan</div>;

  const canReview    = ["completed", "delivered"].includes(order.status);
  const reviewItems  = items.filter(it => it.menu_item_id).map(it => ({ product_id: it.menu_item_id, name: it.name }));
  const allReviewed  = reviewItems.length > 0 && reviewItems.every(it => reviewed.has(it.product_id));
  const canDispute   = ["ready", "in_delivery", "delivering", "delivered", "completed"].includes(order.status)
    && (!dispute || dispute.status === "rejected");
  const disputeStatusLabel: Record<string, string> = {
    open: "Sedang ditinjau", under_review: "Sedang ditinjau",
    resolved: "Selesai", rejected: "Ditolak",
  };
  const isActive = ["pending", "confirmed", "preparing", "ready", "in_delivery", "delivering"].includes(order.status);
  const needsPayment = order.status === "pending" && ["unpaid", "awaiting_gateway"].includes(order.payment_status ?? "");
  const payDeadlineMs = new Date(order.created_at).getTime() + 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-4">
      {needsPayment && <PaymentCountdownBanner deadlineMs={payDeadlineMs} orderId={order.id} />}
      <div className="flex items-center justify-between">
        <Link to="/akun/pesanan" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        {isActive && (
          <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Perbarui status
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            {order.shop?.logo_url
              ? <img src={order.shop.logo_url} className="h-12 w-12 rounded-xl object-cover border border-border" alt="" />
              : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted"><Store className="h-5 w-5 text-muted-foreground" /></div>
            }
            <div className="flex-1 min-w-0">
              <Link to="/toko/$slug" params={{ slug: order.shop?.slug }} className="font-bold text-base hover:underline">{order.shop?.name}</Link>
              <p className="text-xs text-muted-foreground mt-0.5">{order.order_no}</p>
              <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.delivery_address && (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Alamat pengantaran</p>
              <p>{order.delivery_address}</p>
              {order.customer_name && <p className="text-xs text-muted-foreground mt-0.5">{order.customer_name} · {order.customer_phone}</p>}
            </div>
          )}
          {order.note && (
            <p className="rounded-lg bg-muted/30 px-3 py-2 text-sm italic text-muted-foreground">"{order.note}"</p>
          )}

          <div className="space-y-1.5 border-t pt-3">
            {items.map(it => (
              <div key={it.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{it.qty}× <span className="text-foreground">{it.name}</span></span>
                <span className="font-medium">{formatIDR(it.total)}</span>
              </div>
            ))}
          </div>

          {Number(order.delivery_fee) > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground border-t pt-2">
              <span>Ongkos kirim</span><span>{formatIDR(order.delivery_fee)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>Total</span><span className="text-primary">{formatIDR(order.total)}</span>
          </div>
        </CardContent>
      </Card>

      <OrderTimeline order={order} logs={logs} />

      {order.tracking_number && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4 text-primary" /> Resi Pengiriman
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Kurir</span>
              <span className="font-medium">{courierLabel(order.courier_name)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">No. Resi</span>
              <button
                onClick={() => { navigator.clipboard.writeText(order.tracking_number); toast.success("No. resi disalin"); }}
                className="font-mono text-sm font-semibold text-foreground hover:text-primary transition-colors"
                title="Klik untuk salin"
              >
                {order.tracking_number}
              </button>
            </div>
            {order.tracking_set_at && (
              <p className="text-[11px] text-muted-foreground">Diinput {formatTs(order.tracking_set_at)}</p>
            )}
            {(() => {
              const url = order.tracking_url || getCourierTrackUrl(order.courier_name, order.tracking_number);
              return url ? (
                <Button asChild size="sm" variant="outline" className="w-full gap-2 mt-1">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <Truck className="h-4 w-4" /> Cek Status Resi
                  </a>
                </Button>
              ) : null;
            })()}
          </CardContent>
        </Card>
      )}

      {canReview && !allReviewed && reviewItems.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-900">Yuk kasih ulasan!</p>
              <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">
                Pesananmu sudah selesai. Bantu pembeli lain dengan memberikan ulasan untuk produk dari <strong>{order.shop?.name}</strong>.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setReviewOpen(true)}
            className="mt-3 w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white border-0"
          >
            <Star className="h-4 w-4 fill-white" /> Tulis Ulasan Sekarang
          </Button>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {order.fulfillment === "delivery" && (
          <Button asChild variant="outline" className="gap-2">
            <Link to="/track/$orderId" params={{ orderId: order.id }}>
              <Truck className="h-4 w-4" /> Lacak Pengantaran
            </Link>
          </Button>
        )}
        {canReview && reviewItems.length > 0 && (
          <Button onClick={() => setReviewOpen(true)} variant={allReviewed ? "outline" : "default"} className="gap-2">
            <Star className="h-4 w-4" />{allReviewed ? "Lihat Ulasan" : "Beri Ulasan"}
          </Button>
        )}
        {order.shop?.whatsapp && (
          <Button asChild variant="outline" className="gap-2">
            <a href={`https://wa.me/${order.shop.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Halo, saya ingin tanya tentang pesanan ${order.order_no}`)}`} target="_blank" rel="noopener noreferrer">
              <MessageSquare className="h-4 w-4" /> Chat Penjual
            </a>
          </Button>
        )}
        {canDispute && (
          <Button onClick={() => setDisputeOpen(true)} variant="outline" className="gap-2 text-destructive hover:text-destructive sm:col-span-2">
            <AlertOctagon className="h-4 w-4" /> Lapor Masalah
          </Button>
        )}
      </div>

      {dispute && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertOctagon className="h-4 w-4 text-destructive" /> Sengketa
              <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
                dispute.status === "resolved" ? "bg-emerald-100 text-emerald-700"
                  : dispute.status === "rejected" ? "bg-muted text-muted-foreground"
                  : "bg-red-100 text-red-700"
              }`}>
                {disputeStatusLabel[dispute.status] ?? dispute.status}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Alasan:</span> {dispute.reason}</div>
            {dispute.description && <div className="rounded-md bg-muted/40 p-2 text-xs">{dispute.description}</div>}
            {dispute.resolution && (
              <div className="rounded-md border border-border p-2">
                <div className="text-xs font-semibold">Tanggapan penjual</div>
                <div className="mt-1 text-xs">{dispute.resolution}</div>
                {Number(dispute.refund_amount) > 0 && (
                  <div className="mt-1 text-xs font-semibold text-emerald-700">Refund: {formatIDR(dispute.refund_amount)}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {user && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Chat dengan Penjual</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderChat orderId={order.id} currentUserId={user.id} />
          </CardContent>
        </Card>
      )}

      {reviewOpen && user && order.shop?.id && (
        <MarketplaceReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          orderId={order.id}
          shopId={order.shop.id}
          userId={user.id}
          items={reviewItems}
          onSubmitted={load}
        />
      )}
      <DisputeDialog open={disputeOpen} onOpenChange={setDisputeOpen} orderId={order.id} onCreated={load} />
    </div>
  );
}
