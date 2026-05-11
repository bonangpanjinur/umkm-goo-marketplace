import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCurrentShop } from "@/lib/use-shop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShoppingCart, Phone, MapPin, RefreshCw, AlertOctagon, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { OrderChat } from "@/components/marketplace/OrderChat";
import { ResolveDisputeDialog } from "@/components/marketplace/ResolveDisputeDialog";

export const Route = createFileRoute("/pos-app/marketplace-orders")({
  head: () => ({ meta: [{ title: "Pesanan Marketplace" }] }),
  component: MarketplaceOrdersPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  preparing: "Disiapkan",
  ready: "Siap",
  in_delivery: "Diantar",
  delivered: "Terkirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const NEXT_STATUS: Record<string, string | null> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "in_delivery",
  in_delivery: "delivered",
  delivered: "completed",
  completed: null,
  cancelled: null,
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-900",
  confirmed: "bg-blue-100 text-blue-900",
  preparing: "bg-orange-100 text-orange-900",
  ready: "bg-purple-100 text-purple-900",
  in_delivery: "bg-indigo-100 text-indigo-900",
  delivered: "bg-emerald-100 text-emerald-900",
  completed: "bg-green-100 text-green-900",
  cancelled: "bg-red-100 text-red-900",
};

function MarketplaceOrdersPage() {
  const { user } = useAuth();
  const { shop } = useCurrentShop();
  const [orders, setOrders] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("active");
  const [chatFor, setChatFor] = useState<string | null>(null);
  const [resolveFor, setResolveFor] = useState<any>(null);

  const load = async () => {
    if (!shop?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_no, status, payment_status, total, subtotal, commission_amount, net_to_shop, customer_name, customer_phone, delivery_address, fulfillment, note, created_at, escrow_status, items:order_items(id, name, qty, price, total)")
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
  };

  useEffect(() => {
    load();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id]);

  const filtered = useMemo(() => {
    if (tab === "active") return orders.filter(o => !["completed", "cancelled", "delivered"].includes(o.status));
    if (tab === "done") return orders.filter(o => ["completed", "delivered"].includes(o.status));
    if (tab === "cancelled") return orders.filter(o => o.status === "cancelled");
    return orders;
  }, [orders, tab]);

  const advance = async (o: any) => {
    const next = NEXT_STATUS[o.status];
    if (!next) return;
    const { error } = await supabase.from("orders").update({ status: next }).eq("id", o.id);
    if (error) toast.error(error.message);
    else { toast.success(`Status: ${STATUS_LABEL[next]}`); load(); }
  };

  const cancel = async (o: any) => {
    if (!confirm(`Batalkan pesanan ${o.order_no}?`)) return;
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", o.id);
    if (error) toast.error(error.message);
    else { toast.success("Dibatalkan"); load(); }
  };

  if (!user) return null;

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> Pesanan Marketplace
          </h1>
          <p className="text-sm text-muted-foreground">Order yang masuk dari marketplace publik (MKT-*)</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">Aktif</TabsTrigger>
          <TabsTrigger value="done">Selesai</TabsTrigger>
          <TabsTrigger value="cancelled">Dibatalkan</TabsTrigger>
          <TabsTrigger value="all">Semua</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Tidak ada pesanan</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => {
            const dispute = disputes[o.id];
            const dStatus = dispute?.status as string | undefined;
            const dActive = dStatus && ["open", "under_review"].includes(dStatus);
            return (
            <Card key={o.id} className={dActive ? "border-destructive/60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold">{o.order_no}</CardTitle>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("id-ID")}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{o.fulfillment}</Badge>
                    <Badge className={`text-xs ${STATUS_COLOR[o.status] || ""}`}>{STATUS_LABEL[o.status] || o.status}</Badge>
                    {dispute && (
                      <Badge variant={dActive ? "destructive" : "secondary"} className="text-xs gap-1">
                        <AlertOctagon className="h-3 w-3" />Sengketa: {dStatus}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">{o.customer_name}</span></div>
                  {o.customer_phone && <div className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{o.customer_phone}</div>}
                  {o.delivery_address && <div className="flex items-start gap-1 text-muted-foreground"><MapPin className="h-3 w-3 mt-0.5" />{o.delivery_address}</div>}
                  {o.note && <div className="text-muted-foreground italic">"{o.note}"</div>}
                </div>

                <div className="border-t pt-2 space-y-1">
                  {(o.items || []).map((it: any) => (
                    <div key={it.id} className="flex justify-between text-sm">
                      <span>{it.qty}× {it.name}</span>
                      <span>{formatIDR(it.total)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-2 grid grid-cols-3 gap-2 text-xs">
                  <div><div className="text-muted-foreground">Total</div><div className="font-semibold">{formatIDR(o.total)}</div></div>
                  <div><div className="text-muted-foreground">Komisi</div><div className="text-red-600">-{formatIDR(o.commission_amount || 0)}</div></div>
                  <div><div className="text-muted-foreground">Net</div><div className="font-semibold text-green-700">{formatIDR(o.net_to_shop || 0)}</div></div>
                </div>

                {dispute && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs space-y-1">
                    <div><span className="font-semibold">Alasan:</span> {dispute.reason}</div>
                    {dispute.description && <div className="text-muted-foreground">"{dispute.description}"</div>}
                    {dispute.resolution && <div><span className="font-semibold">Resolusi:</span> {dispute.resolution}</div>}
                    {dispute.refund_amount > 0 && <div>Refund: <span className="font-semibold">{formatIDR(dispute.refund_amount)}</span></div>}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {NEXT_STATUS[o.status] && (
                    <Button size="sm" onClick={() => advance(o)}>Lanjut → {STATUS_LABEL[NEXT_STATUS[o.status]!]}</Button>
                  )}
                  {!["completed", "cancelled", "delivered"].includes(o.status) && (
                    <Button size="sm" variant="outline" onClick={() => cancel(o)}>Batalkan</Button>
                  )}
                  {dActive && (
                    <Button size="sm" variant="destructive" onClick={() => setResolveFor(dispute)}>
                      <AlertOctagon className="h-3.5 w-3.5 mr-1" />Tanggapi
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setChatFor(chatFor === o.id ? null : o.id)}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />Chat
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/pesanan/$orderId" params={{ orderId: o.id }} target="_blank">Lihat publik</Link>
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
  );
}
