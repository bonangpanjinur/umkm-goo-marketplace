import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Store, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/pesanan/$orderId")({
  head: () => ({ meta: [{ title: "Status Pesanan" }] }),
  component: OrderTrackPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu konfirmasi",
  confirmed: "Dikonfirmasi",
  preparing: "Sedang disiapkan",
  ready: "Siap",
  in_delivery: "Dalam perjalanan",
  delivered: "Terkirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const PAYMENT_LABEL: Record<string, string> = {
  unpaid: "Belum dibayar",
  pending: "Menunggu verifikasi",
  paid: "Lunas",
  refunded: "Refund",
};

function OrderTrackPage() {
  const { orderId } = Route.useParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: o } = await supabase
        .from("orders")
        .select("id, order_no, status, payment_status, total, subtotal, customer_name, customer_phone, delivery_address, fulfillment, note, created_at, requires_deposit, deposit_amount, deposit_paid, deposit_paid_at, balance_due, balance_paid, balance_paid_at, shop:coffee_shops(name, slug, phone, whatsapp, logo_url)")
        .eq("id", orderId)
        .maybeSingle();
      setOrder(o);
      const { data: it } = await supabase
        .from("order_items")
        .select("id, name, quantity, unit_price, subtotal")
        .eq("order_id", orderId);
      setItems((it as any[]) ?? []);
      setLoading(false);
    })();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceHeader />
        <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-muted-foreground">Memuat…</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceHeader />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Pesanan tidak ditemukan</h1>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">← Beranda</Link>
        </div>
        <MarketplaceFooter />
      </div>
    );
  }

  const wa = order.shop?.whatsapp ?? order.shop?.phone;

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            {order.shop?.logo_url ? (
              <img src={order.shop.logo_url} alt={order.shop.name} className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Store className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{order.shop?.name}</div>
              <div className="text-xs text-muted-foreground">No. {order.order_no}</div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/30 p-3">
              <div className="text-[11px] uppercase text-muted-foreground">Status</div>
              <div className="mt-1 text-sm font-semibold">{STATUS_LABEL[order.status] ?? order.status}</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <div className="text-[11px] uppercase text-muted-foreground">Pembayaran</div>
              <div className="mt-1 text-sm font-semibold">{PAYMENT_LABEL[order.payment_status] ?? order.payment_status}</div>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Item</h3>
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
              {items.map((it) => (
                <li key={it.id} className="flex justify-between px-3 py-2 text-sm">
                  <span>{it.quantity}× {it.name}</span>
                  <span className="font-medium">Rp {Number(it.subtotal).toLocaleString("id-ID")}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 grid gap-2 text-sm">
            <div className="flex justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">Subtotal</span>
              <span>Rp {Number(order.subtotal).toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="text-primary">Rp {Number(order.total).toLocaleString("id-ID")}</span>
            </div>
            {order.requires_deposit && (
              <div className="mt-2 rounded-lg border border-amber-300/60 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 p-3 text-xs">
                <div className="mb-1.5 font-semibold text-amber-800 dark:text-amber-300">
                  Pembayaran dengan DP
                </div>
                <div className="flex justify-between">
                  <span>DP {order.deposit_paid ? "(Lunas)" : "(Menunggu)"}</span>
                  <span className="font-semibold">Rp {Number(order.deposit_amount).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Sisa pelunasan {order.balance_paid ? "(Lunas)" : ""}</span>
                  <span>Rp {Number(order.balance_due).toLocaleString("id-ID")}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 space-y-1.5 text-sm">
            <div className="font-semibold">Pengiriman</div>
            <div className="text-muted-foreground">
              {order.fulfillment === "pickup" ? "Pickup di toko" : "Diantar"}
            </div>
            {order.delivery_address && (
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {order.delivery_address}
              </div>
            )}
          </div>

          {wa && (
            <a
              href={`https://wa.me/${wa.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Halo, saya tanya pesanan ${order.order_no}`)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-border bg-success/10 py-2.5 text-sm font-medium text-success hover:bg-success/20"
            >
              <Phone className="h-4 w-4" /> Hubungi toko
            </a>
          )}
        </div>

        <Link to="/" className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground">
          ← Kembali ke beranda
        </Link>
      </div>
      <MarketplaceFooter />
    </div>
  );
}
