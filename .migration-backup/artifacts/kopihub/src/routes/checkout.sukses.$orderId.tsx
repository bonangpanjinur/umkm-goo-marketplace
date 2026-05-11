import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Store } from "lucide-react";

const searchSchema = z.object({ all: z.string().optional() });

export const Route = createFileRoute("/checkout/sukses/$orderId")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Pesanan Berhasil" }] }),
  component: SuccessPage,
});

function SuccessPage() {
  const { orderId } = Route.useParams();
  const { all } = Route.useSearch();
  const ids = all ? all.split(",").filter(Boolean) : [orderId];
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_no, total, customer_name, shop:coffee_shops(name, slug, phone, whatsapp)")
        .in("id", ids);
      setOrders((data as any[]) ?? []);
    })();
  }, [all, orderId]);

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Pesanan berhasil dibuat!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Toko akan menghubungi kamu untuk konfirmasi pembayaran.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              to="/pesanan/$orderId"
              params={{ orderId: o.id }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/50"
            >
              <Store className="h-8 w-8 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{o.shop?.name}</div>
                <div className="text-xs text-muted-foreground">No. Pesanan: {o.order_no}</div>
              </div>
              <div className="text-sm font-bold text-primary">
                Rp {Number(o.total).toLocaleString("id-ID")}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to="/">
            <Button variant="outline" className="w-full sm:w-auto">Lanjut belanja</Button>
          </Link>
          <Link to="/pesanan/$orderId" params={{ orderId }}>
            <Button className="w-full sm:w-auto">Lihat status pesanan</Button>
          </Link>
        </div>
      </div>
      <MarketplaceFooter />
    </div>
  );
}
