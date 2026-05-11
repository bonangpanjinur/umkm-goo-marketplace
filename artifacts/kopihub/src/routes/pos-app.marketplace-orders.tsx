import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCurrentShop } from "@/lib/use-shop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShoppingCart, Phone, MapPin, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { fmtIDR } from "@/lib/format";

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
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("active");

  const load = async () => {
    if (!shop?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_no, status, payment_status, total, subtotal, commission_amount, net_to_shop, customer_name, customer_phone, delivery_address, fulfillment, note, created_at, items:order_items(id, name, qty, price, total)")
      .eq("shop_id", shop.id)
      .like("order_no", "MKT-%")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error(error.message);
    } else {
      setOrders(data || []);
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
            toast.success(`Pesanan baru: ${o.order_no}`, { description: `${fmtIDR(o.total)}` });
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
          {filtered.map(o => (
            <Card key={o.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold">{o.order_no}</CardTitle>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("id-ID")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{o.fulfillment}</Badge>
                    <Badge className={`text-xs ${STATUS_COLOR[o.status] || ""}`}>{STATUS_LABEL[o.status] || o.status}</Badge>
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
                      <span>{fmtIDR(it.total)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-2 grid grid-cols-3 gap-2 text-xs">
                  <div><div className="text-muted-foreground">Total</div><div className="font-semibold">{fmtIDR(o.total)}</div></div>
                  <div><div className="text-muted-foreground">Komisi</div><div className="text-red-600">-{fmtIDR(o.commission_amount || 0)}</div></div>
                  <div><div className="text-muted-foreground">Net</div><div className="font-semibold text-green-700">{fmtIDR(o.net_to_shop || 0)}</div></div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {NEXT_STATUS[o.status] && (
                    <Button size="sm" onClick={() => advance(o)}>Lanjut → {STATUS_LABEL[NEXT_STATUS[o.status]!]}</Button>
                  )}
                  {!["completed", "cancelled", "delivered"].includes(o.status) && (
                    <Button size="sm" variant="outline" onClick={() => cancel(o)}>Batalkan</Button>
                  )}
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/pesanan/$orderId" params={{ orderId: o.id }} target="_blank">Lihat publik</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
