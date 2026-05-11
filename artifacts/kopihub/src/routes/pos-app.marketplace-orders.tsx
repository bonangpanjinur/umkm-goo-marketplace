import { createFileRoute, Link } from "@tanstack/react-router";
import { OrdersTabs } from "@/components/orders/OrdersTabs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCurrentShop } from "@/lib/use-shop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, ShoppingCart, Phone, MapPin, RefreshCw,
  AlertOctagon, MessageSquare, Check, ChevronRight,
  Truck, Store, Clock, PackageCheck, Bike, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { OrderChat } from "@/components/marketplace/OrderChat";
import { ResolveDisputeDialog } from "@/components/marketplace/ResolveDisputeDialog";

export const Route = createFileRoute("/pos-app/marketplace-orders")({
  head: () => ({ meta: [{ title: "Pesanan Marketplace" }] }),
  component: MarketplaceOrdersPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending:     "Menunggu",
  confirmed:   "Dikonfirmasi",
  preparing:   "Disiapkan",
  ready:       "Siap",
  in_delivery: "Diantar",
  delivered:   "Terkirim",
  completed:   "Selesai",
  cancelled:   "Dibatalkan",
};

const STATUS_COLOR: Record<string, string> = {
  pending:     "bg-amber-100 text-amber-800",
  confirmed:   "bg-blue-100 text-blue-800",
  preparing:   "bg-orange-100 text-orange-800",
  ready:       "bg-violet-100 text-violet-800",
  in_delivery: "bg-indigo-100 text-indigo-800",
  delivered:   "bg-emerald-100 text-emerald-800",
  completed:   "bg-green-100 text-green-800",
  cancelled:   "bg-red-100 text-red-800",
};

const NEXT_STATUS: Record<string, string | null> = {
  pending:     "confirmed",
  confirmed:   "preparing",
  preparing:   "ready",
  ready:       "in_delivery",
  in_delivery: "delivered",
  delivered:   "completed",
  completed:   null,
  cancelled:   null,
};

const NEXT_LABEL: Record<string, string> = {
  pending:     "Konfirmasi",
  confirmed:   "Mulai Siapkan",
  preparing:   "Tandai Siap",
  ready:       "Mulai Antar",
  in_delivery: "Tandai Terkirim",
  delivered:   "Selesaikan",
};

const STEPS_DELIVERY = ["pending", "confirmed", "preparing", "ready", "in_delivery", "completed"];
const STEPS_PICKUP   = ["pending", "confirmed", "preparing", "ready", "completed"];

const STEP_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  pending:     Clock,
  confirmed:   Check,
  preparing:   Store,
  ready:       PackageCheck,
  in_delivery: Bike,
  completed:   ShieldCheck,
};

function OrderProgressBar({ status, fulfillment }: { status: string; fulfillment: string }) {
  const isDelivery = fulfillment === "delivery";
  const steps = isDelivery ? STEPS_DELIVERY : STEPS_PICKUP;
  const normStatus = status === "delivered" ? "completed" : status;
  const currentIdx = steps.indexOf(normStatus);
  if (["cancelled", "voided"].includes(status)) return null;

  return (
    <div className="flex items-center gap-0.5">
      {steps.map((s, i) => {
        const done   = currentIdx >= 0 && i <= currentIdx;
        const active = i === currentIdx;
        const Icon   = STEP_ICON[s] ?? Check;
        return (
          <div key={s} className="flex items-center gap-0.5 flex-1 min-w-0">
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] transition-all ${
              done
                ? active
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                  : "bg-emerald-500 text-white"
                : "bg-muted text-muted-foreground"
            }`}>
              {done && !active ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 rounded-full ${i < currentIdx ? "bg-emerald-400" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MarketplaceOrdersPage() {
  const { user } = useAuth();
  const { shop } = useCurrentShop();
  const [orders, setOrders]   = useState<any[]>([]);
  const [disputes, setDisputes] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [tab, setTab]         = useState<string>("active");
  const [chatFor, setChatFor] = useState<string | null>(null);
  const [resolveFor, setResolveFor] = useState<any>(null);

  const load = useCallback(async () => {
    if (!shop?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_no, status, payment_status, total, subtotal, delivery_fee, commission_amount, net_to_shop, customer_name, customer_phone, delivery_address, fulfillment, note, created_at, updated_at, escrow_status, items:order_items(id, name, qty, price, total)")
      .eq("shop_id", shop.id)
      .like("order_no", "MKT-%")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error(error.message);
    } else {
      setOrders(data || []);
      const ids = (data || []).map((o: any) => o.id);
      if (ids.length) {
        const { data: ds } = await supabase
          .from("order_disputes")
          .select("id, order_id, status, reason, description, refund_amount, resolution, created_at")
          .in("order_id", ids);
        const map: Record<string, any> = {};
        (ds || []).forEach((d: any) => { map[d.order_id] = d; });
        setDisputes(map);
      } else {
        setDisputes({});
      }
    }
    setLoading(false);
  }, [shop?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!shop?.id) return;
    const ch = supabase
      .channel(`mkt-orders-${shop.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `shop_id=eq.${shop.id}` }, (payload) => {
        const o: any = payload.new;
        if (o?.order_no?.startsWith("MKT-")) {
          if (payload.eventType === "INSERT") {
            toast.success(`Pesanan baru: ${o.order_no}`, { description: `${formatIDR(o.total)}` });
            try { new Audio("/notify.mp3").play().catch(() => {}); } catch {}
          }
          load();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shop?.id, load]);

  const writeStatusLog = async (orderId: string, status: string, note?: string) => {
    try {
      await supabase.from("order_status_logs" as any).insert({
        order_id: orderId,
        status,
        note: note ?? null,
        actor_id: user?.id ?? null,
      });
    } catch {
      /* graceful — table may not exist yet */
    }
  };

  const advance = async (o: any) => {
    const next = NEXT_STATUS[o.status];
    if (!next) return;
    setAdvancing(o.id);
    const { error } = await supabase.from("orders").update({ status: next as any }).eq("id", o.id);
    if (error) {
      toast.error(error.message);
    } else {
      await writeStatusLog(o.id, next);
      toast.success(`Status: ${STATUS_LABEL[next]}`);
      load();
    }
    setAdvancing(null);
  };

  const cancel = async (o: any) => {
    if (!confirm(`Batalkan pesanan ${o.order_no}?`)) return;
    setAdvancing(o.id);
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", o.id);
    if (error) {
      toast.error(error.message);
    } else {
      await writeStatusLog(o.id, "cancelled", "Dibatalkan oleh penjual");
      toast.success("Dibatalkan");
      load();
    }
    setAdvancing(null);
  };

  const filtered = useMemo(() => {
    if (tab === "active")    return orders.filter(o => !["completed", "cancelled", "delivered"].includes(o.status));
    if (tab === "done")      return orders.filter(o => ["completed", "delivered"].includes(o.status));
    if (tab === "cancelled") return orders.filter(o => o.status === "cancelled");
    return orders;
  }, [orders, tab]);

  const activeCount = useMemo(() =>
    orders.filter(o => !["completed", "cancelled", "delivered"].includes(o.status)).length,
    [orders]);

  if (!user) return null;

  return (
    <>
      <OrdersTabs />
      <div className="p-4 sm:p-6 space-y-4 max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              Pesanan Marketplace
              {activeCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {activeCount} aktif
                </span>
              )}
            </h2>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="active">Aktif {activeCount > 0 && `(${activeCount})`}</TabsTrigger>
            <TabsTrigger value="done">Selesai</TabsTrigger>
            <TabsTrigger value="cancelled">Dibatalkan</TabsTrigger>
            <TabsTrigger value="all">Semua</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Tidak ada pesanan
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(o => {
              const dispute = disputes[o.id];
              const dStatus = dispute?.status as string | undefined;
              const dActive = dStatus && ["open", "under_review"].includes(dStatus);
              const isAdv   = advancing === o.id;
              const next    = NEXT_STATUS[o.status];
              const isTerminal = ["completed", "cancelled", "delivered"].includes(o.status);
              return (
                <Card key={o.id} className={`transition-all ${dActive ? "border-destructive/60" : isTerminal ? "opacity-80" : "border-primary/20"}`}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-bold">{o.order_no}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(o.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs gap-1">
                          {o.fulfillment === "delivery" ? <Truck className="h-3 w-3" /> : <Store className="h-3 w-3" />}
                          {o.fulfillment === "delivery" ? "Delivery" : "Pickup"}
                        </Badge>
                        <Badge className={`text-xs font-semibold ${STATUS_COLOR[o.status] ?? ""}`}>
                          {STATUS_LABEL[o.status] ?? o.status}
                        </Badge>
                        {dispute && (
                          <Badge variant={dActive ? "destructive" : "secondary"} className="text-xs gap-1">
                            <AlertOctagon className="h-3 w-3" />
                            Sengketa: {dStatus}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Mini progress bar */}
                    <div className="mt-3">
                      <OrderProgressBar status={o.status} fulfillment={o.fulfillment} />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Customer info */}
                    <div className="text-sm space-y-1">
                      <div className="font-medium">{o.customer_name}</div>
                      {o.customer_phone && (
                        <a href={`tel:${o.customer_phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                          <Phone className="h-3 w-3" />{o.customer_phone}
                        </a>
                      )}
                      {o.delivery_address && (
                        <div className="flex items-start gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />{o.delivery_address}
                        </div>
                      )}
                      {o.note && <div className="text-muted-foreground italic">"{o.note}"</div>}
                    </div>

                    {/* Items */}
                    <div className="border-t pt-2 space-y-1">
                      {(o.items || []).map((it: any) => (
                        <div key={it.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{it.qty}× <span className="text-foreground">{it.name}</span></span>
                          <span className="font-medium">{formatIDR(it.total)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Financials */}
                    <div className="border-t pt-2 grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground mb-0.5">Subtotal</div>
                        <div className="font-semibold">{formatIDR(o.subtotal || 0)}</div>
                      </div>
                      {Number(o.delivery_fee) > 0 && (
                        <div>
                          <div className="text-muted-foreground mb-0.5">Ongkir</div>
                          <div className="font-semibold">{formatIDR(o.delivery_fee)}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-muted-foreground mb-0.5">Komisi</div>
                        <div className="font-semibold text-red-600">-{formatIDR(o.commission_amount || 0)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-0.5">Net</div>
                        <div className="font-bold text-emerald-700">{formatIDR(o.net_to_shop || 0)}</div>
                      </div>
                    </div>

                    {/* Dispute info */}
                    {dispute && (
                      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-1">
                        <div><span className="font-semibold">Alasan:</span> {dispute.reason}</div>
                        {dispute.description && <div className="text-muted-foreground italic">"{dispute.description}"</div>}
                        {dispute.resolution && <div><span className="font-semibold">Resolusi:</span> {dispute.resolution}</div>}
                        {Number(dispute.refund_amount) > 0 && (
                          <div>Refund: <span className="font-semibold text-destructive">{formatIDR(dispute.refund_amount)}</span></div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {next && (
                        <Button
                          size="sm"
                          onClick={() => advance(o)}
                          disabled={isAdv}
                          className="gap-1.5"
                        >
                          {isAdv ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          {NEXT_LABEL[o.status] ?? `→ ${STATUS_LABEL[next]}`}
                        </Button>
                      )}
                      {!isTerminal && (
                        <Button size="sm" variant="outline" onClick={() => cancel(o)} disabled={isAdv}>
                          Batalkan
                        </Button>
                      )}
                      {dActive && (
                        <Button size="sm" variant="destructive" onClick={() => setResolveFor(dispute)}>
                          <AlertOctagon className="h-3.5 w-3.5 mr-1" />Tanggapi Sengketa
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setChatFor(chatFor === o.id ? null : o.id)}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />Chat
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/pesanan/$orderId" params={{ orderId: o.id }} target="_blank">
                          Lihat detail ↗
                        </Link>
                      </Button>
                    </div>

                    {chatFor === o.id && user && (
                      <OrderChat orderId={o.id} currentUserId={user.id} className="mt-2" />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <ResolveDisputeDialog
          open={!!resolveFor}
          onOpenChange={(v) => !v && setResolveFor(null)}
          dispute={resolveFor}
          onResolved={load}
        />
      </div>
    </>
  );
}
