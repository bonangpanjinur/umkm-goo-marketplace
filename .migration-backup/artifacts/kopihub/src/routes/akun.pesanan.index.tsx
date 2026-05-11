import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingBag } from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/akun/pesanan/")({
  component: OrdersListPage,
});

const STATUS: Record<string, string> = {
  pending: "Menunggu", confirmed: "Dikonfirmasi", preparing: "Disiapkan",
  ready: "Siap", in_delivery: "Diantar", delivered: "Terkirim",
  completed: "Selesai", cancelled: "Dibatalkan",
};

function OrdersListPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_no, status, total, created_at, fulfillment, shop:coffee_shops(name, slug, logo_url)")
        .eq("customer_user_id", user.id)
        .like("order_no", "MKT-%")
        .order("created_at", { ascending: false })
        .limit(50);
      setOrders(data || []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (orders.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center space-y-3">
        <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">Belum ada pesanan</p>
        <Link to="/" className="text-primary text-sm font-medium hover:underline">Mulai belanja</Link>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map(o => (
        <Link key={o.id} to="/akun/pesanan/$orderId" params={{ orderId: o.id }} className="block">
          <Card className="hover:shadow-md transition">
            <CardContent className="p-4 flex items-center gap-3">
              {o.shop?.logo_url ? <img src={o.shop.logo_url} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-muted" />}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{o.shop?.name}</div>
                <div className="text-xs text-muted-foreground">{o.order_no} · {new Date(o.created_at).toLocaleDateString("id-ID")}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm">{formatIDR(o.total)}</div>
                <Badge variant="outline" className="text-xs mt-1">{STATUS[o.status] || o.status}</Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
