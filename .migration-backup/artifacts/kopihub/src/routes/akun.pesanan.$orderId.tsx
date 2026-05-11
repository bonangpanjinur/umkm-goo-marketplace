import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Star, MessageSquare, Truck, AlertOctagon } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { MarketplaceReviewDialog } from "@/components/marketplace/MarketplaceReviewDialog";
import { OrderChat } from "@/components/marketplace/OrderChat";
import { DisputeDialog } from "@/components/marketplace/DisputeDialog";

export const Route = createFileRoute("/akun/pesanan/$orderId")({
  component: OrderDetailPage,
});

const STATUS: Record<string, string> = {
  pending: "Menunggu", confirmed: "Dikonfirmasi", preparing: "Disiapkan",
  ready: "Siap", in_delivery: "Diantar", delivered: "Terkirim",
  completed: "Selesai", cancelled: "Dibatalkan",
};

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [dispute, setDispute] = useState<any>(null);

  const load = async () => {
    if (!user) return;
    const { data: o } = await supabase
      .from("orders")
      .select("id, order_no, status, payment_status, total, subtotal, customer_name, customer_phone, delivery_address, fulfillment, note, created_at, shop:coffee_shops(id, name, slug, logo_url, whatsapp, phone)")
      .eq("id", orderId)
      .eq("customer_user_id", user.id)
      .maybeSingle();
    setOrder(o);
    if (o) {
      const { data: it } = await supabase.from("order_items").select("id, menu_item_id, name, qty, price, total").eq("order_id", o.id);
      setItems(it || []);
      const { data: rv } = await supabase.from("product_reviews").select("product_id").eq("order_id", o.id).eq("user_id", user.id);
      setReviewed(new Set((rv || []).map((r: any) => r.product_id)));
      const { data: d } = await supabase
        .from("order_disputes")
        .select("id, status, reason, description, resolution, refund_amount, created_at, resolved_at")
        .eq("order_id", o.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setDispute(d);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orderId, user?.id]);

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!order) return <Card><CardContent className="py-10 text-center text-muted-foreground">Pesanan tidak ditemukan</CardContent></Card>;

  const canReview = order.status === "completed" || order.status === "delivered";
  const reviewItems = items.filter(it => it.menu_item_id).map(it => ({ product_id: it.menu_item_id, name: it.name }));
  const allReviewed = reviewItems.length > 0 && reviewItems.every(it => reviewed.has(it.product_id));
  const canDispute = ["ready", "in_delivery", "delivering", "delivered", "completed"].includes(order.status)
    && (!dispute || dispute.status === "rejected");
  const disputeStatusLabel: Record<string, string> = {
    open: "Sedang ditinjau", under_review: "Sedang ditinjau",
    resolved: "Selesai", rejected: "Ditolak",
  };

  return (
    <div className="space-y-4">
      <Link to="/akun/pesanan" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Kembali ke daftar</Link>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">{order.order_no}</CardTitle>
              <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("id-ID")}</p>
            </div>
            <Badge>{STATUS[order.status] || order.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 border-b pb-3">
            {order.shop?.logo_url ? <img src={order.shop.logo_url} className="h-10 w-10 rounded object-cover" alt="" /> : <div className="h-10 w-10 rounded bg-muted" />}
            <div className="flex-1">
              <Link to="/toko/$slug" params={{ slug: order.shop?.slug }} className="font-semibold hover:underline">{order.shop?.name}</Link>
              <div className="text-xs text-muted-foreground">Penerima: {order.customer_name} · {order.customer_phone}</div>
            </div>
          </div>

          {order.delivery_address && <div className="text-sm"><span className="text-muted-foreground">Alamat:</span> {order.delivery_address}</div>}
          {order.note && <div className="text-sm italic text-muted-foreground">"{order.note}"</div>}

          <div className="space-y-1 border-t pt-3">
            {items.map(it => (
              <div key={it.id} className="flex justify-between text-sm">
                <span>{it.qty}× {it.name}</span>
                <span>{formatIDR(it.total)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between border-t pt-3 font-semibold">
            <span>Total</span><span>{formatIDR(order.total)}</span>
          </div>

          {order.fulfillment === "delivery" && (
            <Button asChild variant="outline" className="w-full">
              <Link to="/track/$orderId" params={{ orderId: order.id }}>
                <Truck className="h-4 w-4 mr-2" />Lacak Pengantaran
              </Link>
            </Button>
          )}

          {canReview && reviewItems.length > 0 && (
            <Button onClick={() => setReviewOpen(true)} className="w-full" variant={allReviewed ? "outline" : "default"}>
              <Star className="h-4 w-4 mr-2" />{allReviewed ? "Edit Ulasan" : "Beri Ulasan"}
            </Button>
          )}

          {order.shop?.whatsapp && (
            <Button asChild variant="outline" className="w-full">
              <a href={`https://wa.me/${order.shop.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Halo, saya ingin tanya tentang pesanan ${order.order_no}`)}`} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="h-4 w-4 mr-2" />Chat Penjual
              </a>
            </Button>
          )}
          {canDispute && (
            <Button onClick={() => setDisputeOpen(true)} variant="outline" className="w-full text-destructive hover:text-destructive">
              <AlertOctagon className="h-4 w-4 mr-2" />Lapor Masalah
            </Button>
          )}
        </CardContent>
      </Card>

      {dispute && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertOctagon className="h-4 w-4 text-destructive" /> Sengketa
              <Badge variant={dispute.status === "resolved" ? "default" : dispute.status === "rejected" ? "secondary" : "destructive"} className="ml-auto">
                {disputeStatusLabel[dispute.status] ?? dispute.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Alasan:</span> {dispute.reason}</div>
            {dispute.description && <div className="rounded-md bg-muted/40 p-2 text-xs">{dispute.description}</div>}
            {dispute.resolution && (
              <div className="rounded-md border border-border p-2">
                <div className="text-xs font-semibold">Tanggapan penjual</div>
                <div className="mt-1 text-xs">{dispute.resolution}</div>
                {dispute.refund_amount > 0 && (
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
