import { createFileRoute } from "@tanstack/react-router";
import { OrdersTabs } from "@/components/orders/OrdersTabs";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { logStaffAction } from "@/lib/staff-audit";
import { useAuth } from "@/lib/auth";
import { Loader2, ListOrdered, Banknote, QrCode, Printer, XCircle, Undo2, MessageCircle, CheckSquare, Square, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Receipt } from "@/components/pos/receipt";
import { KitchenTicket } from "@/components/pos/kitchen-ticket";
import { ReceiptPaperPicker } from "@/components/pos/receipt-paper-picker";
import { PrinterPicker } from "@/components/pos/printer-picker";
import { CourierReceipt } from "@/components/pos/courier-receipt";
import { ChefHat } from "lucide-react";
import {
  printReceiptNode,
  applyReceiptPaper,
  openReceiptInNewWindow,
  buildScopeKey,
} from "@/lib/receipt-printer";
import type { CartItem } from "@/lib/cart";
import { refundOrder } from "@/lib/shift";
import { ReasonDialog } from "@/components/reason-dialog";

export const Route = createFileRoute("/pos-app/orders")({
  component: OrdersPage,
});

type Order = {
  id: string;
  order_no: string;
  total: number;
  payment_method: "cash" | "qris";
  amount_tendered: number | null;
  change_due: number;
  status: string;
  created_at: string;
  customer_name: string | null;
  cashier_id: string;
};

type OrderDetail = Order & {
  subtotal: number;
  discount: number;
  service_charge: number;
  tax: number;
  tip_amount: number;
  promo_code: string | null;
  points_redeemed: number;
  points_earned: number;
  fulfillment: string;
  delivery_address: string | null;
  delivery_fee: number;
  courier_name: string | null;
  tracking_number: string | null;
  customer_phone: string | null;
  note: string | null;
  payment_split: any;
  order_items: {
    name: string;
    unit_price: number;
    quantity: number;
    note: string | null;
  }[];
};

function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function OrdersPage() {
  const { shop, outlet, loading: shopLoading } = useCurrentShop();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkReasonFor, setBulkReasonFor] = useState<null | "voided" | "cancelled" | "refunded">(null);

  async function load() {
    if (!outlet) return;
    setLoading(true);
    const today = todayJakarta();
    const { data } = await supabase
      .from("orders")
      .select(
        "id, order_no, total, payment_method, amount_tendered, change_due, status, created_at, customer_name, cashier_id",
      )
      .eq("outlet_id", outlet.id)
      .eq("business_date", today)
      .order("created_at", { ascending: false });
    setOrders((data ?? []) as Order[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!outlet) return;
    load();
    const channel = supabase
      .channel(`orders_${outlet.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `outlet_id=eq.${outlet.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlet?.id]);

  function toggleCheck(id: string) {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (checkedIds.size === orders.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(orders.map(o => o.id)));
    }
  }

  async function bulkUpdateStatus(status: string) {
    if (checkedIds.size === 0) { toast.error("Pilih pesanan terlebih dahulu"); return; }
    const isSensitive = status === "voided" || status === "cancelled" || status === "refunded";
    let reason = "";
    if (isSensitive) {
      const input = prompt(`Alasan ${status} (wajib untuk audit):`)?.trim() ?? "";
      if (!input) { toast.error("Alasan wajib diisi untuk aksi sensitif"); return; }
      reason = input;
    }
    setBulkUpdating(true);
    const ids = Array.from(checkedIds);
    const { error } = await supabase
      .from("orders")
      .update({ status } as any)
      .in("id", ids);
    if (error) { toast.error(error.message); } else {
      toast.success(`${checkedIds.size} pesanan diperbarui ke status "${status}"`);
      // Audit log untuk aksi sensitif (void / cancel / refund)
      if (shop && isSensitive) {
        const action = status === "refunded" ? "order.refund" : "order.void";
        for (const id of ids) {
          logStaffAction({
            shopId: shop.id,
            action,
            meta: { order_id: id, status, reason, bulk: true, count: ids.length },
          });
        }
      }
      setCheckedIds(new Set());
      load();
    }
    setBulkUpdating(false);
  }

  async function openDetail(o: Order) {
    const { data } = await supabase
      .from("orders")
      .select(
        "id, order_no, total, payment_method, amount_tendered, change_due, status, created_at, customer_name, cashier_id, subtotal, discount, service_charge, tax, tip_amount, promo_code, points_redeemed, points_earned, fulfillment, delivery_address, delivery_fee, courier_name, tracking_number, customer_phone, note, payment_split, order_items(name, unit_price, quantity, note)",
      )
      .eq("id", o.id)
      .single();
    if (data) setSelected(data as unknown as OrderDetail);
  }

  if (shopLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalToday = orders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + Number(o.total), 0);
  const countToday = orders.filter((o) => o.status === "completed").length;

  return (
    <>
      <OrdersTabs />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="mb-6">
          <h2 className="text-base font-semibold tracking-tight text-muted-foreground">Order Hari Ini</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {outlet?.name} · {new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}
          </p>
        </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs font-medium text-muted-foreground">Penjualan</div>
          <div className="mt-1 text-2xl font-bold">{formatIDR(totalToday)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs font-medium text-muted-foreground">Jumlah order</div>
          <div className="mt-1 text-2xl font-bold">{countToday}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <ListOrdered className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">Belum ada order hari ini</h2>
        </div>
      ) : (
        <>
        {/* Bulk Action Bar */}
        {checkedIds.size > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
            <span className="text-sm font-medium">{checkedIds.size} dipilih</span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => bulkUpdateStatus("completed")} disabled={bulkUpdating}>
                <CheckSquare className="h-3.5 w-3.5" /> Selesai
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 text-amber-600" onClick={() => bulkUpdateStatus("pending")} disabled={bulkUpdating}>
                Pending
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 text-red-500" onClick={() => bulkUpdateStatus("voided")} disabled={bulkUpdating}>
                <XCircle className="h-3.5 w-3.5" /> Void
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCheckedIds(new Set())} disabled={bulkUpdating}>
                Batal Pilih
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left w-8">
                  <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
                    {checkedIds.size === orders.length && orders.length > 0
                      ? <CheckSquare className="h-4 w-4 text-primary" />
                      : <Square className="h-4 w-4" />
                    }
                  </button>
                </th>
                <th className="px-4 py-2 text-left">No</th>
                <th className="px-4 py-2 text-left">Waktu</th>
                <th className="px-4 py-2 text-left">Bayar</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => {
                const voided = o.status === "voided" || o.status === "cancelled";
                const isChecked = checkedIds.has(o.id);
                return (
                <tr key={o.id} className={`hover:bg-muted/30 ${voided ? "opacity-60" : ""} ${isChecked ? "bg-primary/5" : ""}`}>
                  <td className="px-4 py-2.5">
                    <button onClick={() => toggleCheck(o.id)} className="text-muted-foreground hover:text-foreground">
                      {isChecked ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    #{o.order_no}
                    {voided && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800">VOID</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {new Date(o.created_at).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      {o.payment_method === "cash" ? (
                        <Banknote className="h-3 w-3" />
                      ) : (
                        <QrCode className="h-3 w-3" />
                      )}
                      {o.payment_method === "cash" ? "Tunai" : "QRIS"}
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${voided ? "line-through" : ""}`}>{formatIDR(o.total)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(o)}>
                      Detail
                    </Button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {selected && shop && outlet && (
        <DetailDialog
          order={selected}
          shopId={shop.id}
          shopName={shop.name}
          outletName={outlet.name}
          outletId={outlet.id}
          shopLogoUrl={shop.logo_url}
          shopAddress={shop.address}
          shopPhone={shop.phone}
          onClose={() => setSelected(null)}
          onVoided={() => {
            setSelected(null);
            load();
          }}
        />
      )}
      </div>
    </>
  );
}

function DetailDialog({
  order,
  shopId,
  shopName,
  outletName,
  outletId,
  shopLogoUrl,
  shopAddress,
  shopPhone,
  onClose,
  onVoided,
}: {
  order: OrderDetail;
  shopId: string;
  shopName: string;
  outletName: string;
  outletId: string;
  shopLogoUrl?: string | null;
  shopAddress?: string | null;
  shopPhone?: string | null;
  onClose: () => void;
  onVoided: () => void;
}) {
  const { user } = useAuth();
  const scopeKey = buildScopeKey(outletId, user?.id);
  const printRef = useRef<HTMLDivElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const courierRef = useRef<HTMLDivElement>(null);
  const [fallbackOpen, setFallbackOpen] = useState<null | "receipt" | "ticket" | "courier">(null);
  useEffect(() => {
    applyReceiptPaper(undefined, scopeKey);
  }, [scopeKey]);
  const [voiding, setVoiding] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState<string>(String(order.total));
  const [refundReason, setRefundReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<"cash" | "qris" | "transfer">(
    order.payment_method === "qris" ? "qris" : "cash",
  );
  const [refunding, setRefunding] = useState(false);
  const isVoided = order.status === "voided" || order.status === "cancelled";
  const isDelivery = order.fulfillment === "delivery";
  const items: CartItem[] = order.order_items.map((i) => ({
    menu_item_id: "",
    name: i.name,
    unit_price: Number(i.unit_price),
    quantity: i.quantity,
    note: i.note ?? undefined,
  }));

  function tryPrint(
    kind: "receipt" | "ticket" | "courier",
    node: HTMLElement | null,
  ) {
    const res = printReceiptNode(node, undefined, scopeKey);
    if (res !== "ok") {
      // Dialog blocked or unavailable — try popup, then inline fallback.
      const popped = openReceiptInNewWindow(node, undefined, scopeKey);
      if (!popped) {
        toast.error("Dialog cetak diblokir. Buka pratinjau lalu cetak manual.");
        setFallbackOpen(kind);
      }
    }
  }
  const handlePrint = () => tryPrint("receipt", printRef.current);
  const handlePrintTicket = () => tryPrint("ticket", ticketRef.current);
  const handlePrintCourier = () => tryPrint("courier", courierRef.current);

  async function handleRefund() {
    const amt = Number(refundAmount || 0);
    if (amt <= 0) { toast.error("Jumlah refund harus > 0"); return; }
    if (amt > Number(order.total)) { toast.error("Tidak boleh melebihi total order"); return; }
    setRefunding(true);
    try {
      await refundOrder(order.id, amt, refundReason || "Refund", refundMethod);
      logStaffAction({
        shopId,
        action: "order.refund",
        meta: { order_id: order.id, order_no: order.order_no, amount: amt, reason: refundReason, method: refundMethod },
      });
      toast.success(`Refund ${formatIDR(amt)} dicatat`);
      setRefundOpen(false);
      onVoided();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal refund";
      toast.error(msg);
    } finally {
      setRefunding(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Order #{order.order_no}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString("id-ID")}
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {items.map((it, k) => (
              <li key={k} className="px-3 py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span>
                    {it.quantity}× {it.name}
                  </span>
                  <span>{formatIDR(it.unit_price * it.quantity)}</span>
                </div>
                {it.note && (
                  <div className="mt-0.5 text-xs italic text-muted-foreground">📝 {it.note}</div>
                )}
              </li>
            ))}
          </ul>
          <div className="flex justify-between rounded-lg bg-muted p-3 text-sm font-semibold">
            <span>Total</span>
            <span>{formatIDR(order.total)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Bayar via {order.payment_method === "cash" ? "Tunai" : "QRIS"}
            {order.payment_method === "cash" && order.amount_tendered != null && (
              <> · diterima {formatIDR(Number(order.amount_tendered))} · kembali {formatIDR(Number(order.change_due))}</>
            )}
          </div>
          <div className="print-host" aria-hidden="true">
            <div ref={printRef}>
              <Receipt
                shopName={shopName}
                outletName={outletName}
                shopLogoUrl={shopLogoUrl}
                shopAddress={shopAddress}
                shopPhone={shopPhone}
                orderNo={order.order_no}
                cashierName="Kasir"
                date={new Date(order.created_at)}
                items={items}
                subtotal={Number(order.subtotal ?? order.total)}
                manualDiscount={Number(order.discount ?? 0)}
                promoCode={order.promo_code}
                serviceCharge={Number(order.service_charge ?? 0)}
                tax={Number(order.tax ?? 0)}
                tipAmount={Number(order.tip_amount ?? 0)}
                pointsRedeemed={order.points_redeemed ?? 0}
                pointsEarned={order.points_earned ?? 0}
                customerName={order.customer_name ?? undefined}
                paymentSplit={Array.isArray(order.payment_split) ? order.payment_split : []}
                total={Number(order.total)}
                paymentMethod={order.payment_method}
                amountTendered={order.amount_tendered ? Number(order.amount_tendered) : undefined}
                changeDue={Number(order.change_due)}
              />
            </div>
            <div ref={ticketRef}>
              <KitchenTicket
                orderNo={order.order_no}
                date={new Date(order.created_at)}
                outletName={outletName}
                customerName={order.customer_name}
                items={items}
              />
            </div>
            <div ref={courierRef}>
              {isDelivery && (
                <CourierReceipt
                  shopName={shopName}
                  outletName={outletName}
                  orderNo={order.order_no}
                  date={new Date(order.created_at)}
                  customerName={order.customer_name}
                  customerPhone={order.customer_phone}
                  deliveryAddress={order.delivery_address}
                  courierName={order.courier_name}
                  trackingNumber={order.tracking_number}
                  deliveryFee={Number(order.delivery_fee ?? 0)}
                  total={Number(order.total)}
                  items={items}
                  note={order.note}
                />
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2 sm:gap-0">
          {!isVoided && (
            <>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={voiding}
                onClick={async () => {
                  const reason = prompt("Alasan void (wajib untuk audit):")?.trim() ?? "";
                  if (!reason) { toast.error("Alasan wajib diisi"); return; }
                  if (!confirm(`Void order #${order.order_no}? Stok & poin akan dibalik.`)) return;
                  setVoiding(true);
                  const { error } = await supabase.rpc("void_order", { _order_id: order.id, _reason: reason });
                  setVoiding(false);
                  if (error) { toast.error(error.message); return; }
                  logStaffAction({
                    shopId,
                    action: "order.void",
                    meta: { order_id: order.id, order_no: order.order_no, reason },
                  });
                  toast.success("Order di-void");
                  onVoided();
                }}
              >
                <XCircle className="mr-2 h-4 w-4" /> {voiding ? "Memproses…" : "Void"}
              </Button>
              <Button variant="outline" onClick={() => setRefundOpen(true)}>
                <Undo2 className="mr-2 h-4 w-4" /> Refund
              </Button>
            </>
          )}
          <div className="mr-auto flex flex-wrap items-center gap-2">
            <PrinterPicker outletId={outletId} scopeKey={scopeKey} />
            <ReceiptPaperPicker scopeKey={scopeKey} />
          </div>
          {order.customer_name && (
            <Button
              variant="outline"
              className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
              onClick={() => {
                const itemsList = items.map(i => `• ${i.quantity}× ${i.name}`).join("\n");
                const msg = `Halo ${order.customer_name}! 👋\n\nTerima kasih sudah memesan di *${shopName}*.\n\n*Order #${order.order_no}*\n${itemsList}\n\n*Total: ${formatIDR(order.total)}*\n\nPesanan Anda sedang kami proses. Terima kasih! 🙏`;
                const waNum = order.customer_phone?.replace(/\D/g, "") ?? "";
                const url = waNum
                  ? `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`
                  : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                window.open(url, "_blank");
              }}
            >
              <MessageCircle className="h-4 w-4" /> WA ke Pelanggan
            </Button>
          )}
          <Button variant="outline" onClick={handlePrintTicket}>
            <ChefHat className="mr-2 h-4 w-4" /> Tiket Dapur
          </Button>
          {isDelivery && (
            <Button variant="outline" onClick={handlePrintCourier}>
              <Printer className="mr-2 h-4 w-4" /> Surat Jalan Kurir
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Cetak ulang
          </Button>
          <Button onClick={onClose}>Tutup</Button>
        </DialogFooter>

        {/* Refund dialog */}
        <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Refund order #{order.order_no}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="rounded-md bg-muted p-3 text-sm">
                Total order: <span className="font-semibold">{formatIDR(order.total)}</span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="refund-amount">Jumlah refund (Rp)</Label>
                <Input
                  id="refund-amount"
                  type="number"
                  inputMode="numeric"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setRefundAmount(String(order.total))}
                    className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-muted"
                  >
                    Penuh
                  </button>
                  <button
                    onClick={() => setRefundAmount(String(Math.round(Number(order.total) / 2)))}
                    className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-muted"
                  >
                    50%
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Metode refund</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["cash", "qris", "transfer"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setRefundMethod(m)}
                      className={`rounded-md border px-3 py-2 text-sm capitalize transition-colors ${
                        refundMethod === m
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {m === "cash" ? "Tunai" : m === "qris" ? "QRIS" : "Transfer"}
                    </button>
                  ))}
                </div>
                {refundMethod === "cash" && (
                  <p className="text-xs text-muted-foreground">
                    Akan otomatis dicatat sebagai cash-out pada shift aktif.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="refund-reason">Alasan</Label>
                <Textarea
                  id="refund-reason"
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Mis. salah pesan, kualitas tidak sesuai…"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRefundOpen(false)}>Batal</Button>
              <Button onClick={handleRefund} disabled={refunding}>
                {refunding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Konfirmasi refund
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fallback preview when window.print() is blocked */}
        <Dialog open={fallbackOpen !== null} onOpenChange={(o) => !o && setFallbackOpen(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Pratinjau Struk</DialogTitle>
            </DialogHeader>
            <div className="rounded-md border bg-muted/30 p-3 max-h-[60vh] overflow-auto">
              <div className="bg-white p-2 mx-auto" style={{ width: "fit-content" }}>
                {fallbackOpen === "receipt" && (
                  <Receipt
                    shopName={shopName}
                    outletName={outletName}
                    shopLogoUrl={shopLogoUrl}
                    shopAddress={shopAddress}
                    shopPhone={shopPhone}
                    orderNo={order.order_no}
                    cashierName="Kasir"
                    date={new Date(order.created_at)}
                    items={items}
                    subtotal={Number(order.subtotal ?? order.total)}
                    manualDiscount={Number(order.discount ?? 0)}
                    promoCode={order.promo_code}
                    serviceCharge={Number(order.service_charge ?? 0)}
                    tax={Number(order.tax ?? 0)}
                    tipAmount={Number(order.tip_amount ?? 0)}
                    pointsRedeemed={order.points_redeemed ?? 0}
                    pointsEarned={order.points_earned ?? 0}
                    customerName={order.customer_name ?? undefined}
                    paymentSplit={Array.isArray(order.payment_split) ? order.payment_split : []}
                    total={Number(order.total)}
                    paymentMethod={order.payment_method}
                    amountTendered={order.amount_tendered ? Number(order.amount_tendered) : undefined}
                    changeDue={Number(order.change_due)}
                  />
                )}
                {fallbackOpen === "ticket" && (
                  <KitchenTicket
                    orderNo={order.order_no}
                    date={new Date(order.created_at)}
                    outletName={outletName}
                    customerName={order.customer_name}
                    items={items}
                  />
                )}
                {fallbackOpen === "courier" && isDelivery && (
                  <CourierReceipt
                    shopName={shopName}
                    outletName={outletName}
                    orderNo={order.order_no}
                    date={new Date(order.created_at)}
                    customerName={order.customer_name}
                    customerPhone={order.customer_phone}
                    deliveryAddress={order.delivery_address}
                    courierName={order.courier_name}
                    trackingNumber={order.tracking_number}
                    deliveryFee={Number(order.delivery_fee ?? 0)}
                    total={Number(order.total)}
                    items={items}
                    note={order.note}
                  />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Dialog cetak browser tidak muncul (kemungkinan diblokir popup). Klik "Cetak Sekarang" untuk mencoba lagi, atau gunakan Ctrl/Cmd+P di pratinjau ini.
            </p>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setFallbackOpen(null)}>Tutup</Button>
              <Button
                onClick={() => {
                  const node =
                    fallbackOpen === "ticket"
                      ? ticketRef.current
                      : fallbackOpen === "courier"
                        ? courierRef.current
                        : printRef.current;
                  const popped = openReceiptInNewWindow(node, undefined, scopeKey);
                  if (!popped) {
                    printReceiptNode(node, undefined, scopeKey);
                  }
                }}
              >
                <Printer className="mr-2 h-4 w-4" /> Cetak Sekarang
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
