import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Banknote, QrCode, ListOrdered, ArrowLeft, ChefHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatIDR } from "@/lib/format";
import type { CartItem } from "@/lib/cart";
import { Receipt } from "@/components/pos/receipt";
import { KitchenTicket } from "@/components/pos/kitchen-ticket";
import { CourierReceipt } from "@/components/pos/courier-receipt";
import { ReceiptPaperPicker } from "@/components/pos/receipt-paper-picker";
import { PrinterPicker } from "@/components/pos/printer-picker";
import {
  applyReceiptPaper,
  buildScopeKey,
  openReceiptInNewWindow,
  printReceiptNode,
} from "@/lib/receipt-printer";
import { toast } from "sonner";

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
  order_items: { name: string; unit_price: number; quantity: number; note: string | null }[];
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  outletId: string;
  outletName: string;
  shopName: string;
  shopLogoUrl?: string | null;
  shopAddress?: string | null;
  shopPhone?: string | null;
};

export function OrdersTodayDialog({
  open,
  onOpenChange,
  outletId,
  outletName,
  shopName,
  shopLogoUrl,
  shopAddress,
  shopPhone,
}: Props) {
  const { user } = useAuth();
  const scopeKey = buildScopeKey(outletId, user?.id);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [fallbackOpen, setFallbackOpen] = useState<null | "receipt" | "ticket" | "courier">(null);
  const printRef = useRef<HTMLDivElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const courierRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !outletId) return;
    setLoading(true);
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const businessDate = `${y}-${m}-${d}`;
    supabase
      .from("orders")
      .select("id, order_no, total, payment_method, amount_tendered, change_due, status, created_at, customer_name")
      .eq("outlet_id", outletId)
      .eq("business_date", businessDate)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders((data ?? []) as Order[]);
        setLoading(false);
      });
  }, [open, outletId]);

  useEffect(() => {
    applyReceiptPaper(undefined, scopeKey);
  }, [scopeKey]);

  async function openDetail(o: Order) {
    const { data } = await supabase
      .from("orders")
      .select(
        "id, order_no, total, payment_method, amount_tendered, change_due, status, created_at, customer_name, subtotal, discount, service_charge, tax, tip_amount, promo_code, points_redeemed, points_earned, fulfillment, delivery_address, delivery_fee, courier_name, tracking_number, customer_phone, note, payment_split, order_items(name, unit_price, quantity, note)",
      )
      .eq("id", o.id)
      .single();
    if (data) setSelected(data as unknown as OrderDetail);
  }

  function tryPrint(kind: "receipt" | "ticket" | "courier", node: HTMLElement | null) {
    const res = printReceiptNode(node, undefined, scopeKey);
    if (res !== "ok") {
      const popped = openReceiptInNewWindow(node, undefined, scopeKey);
      if (!popped) {
        toast.error("Dialog cetak diblokir. Buka pratinjau lalu cetak manual.");
        setFallbackOpen(kind);
      }
    }
  }

  const items: CartItem[] = (selected?.order_items ?? []).map((i) => ({
    menu_item_id: "",
    name: i.name,
    unit_price: Number(i.unit_price),
    quantity: i.quantity,
    note: i.note ?? undefined,
  }));
  const isDelivery = selected?.fulfillment === "delivery";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selected ? (
              <>
                <button
                  onClick={() => setSelected(null)}
                  className="inline-flex items-center rounded p-1 hover:bg-muted"
                  aria-label="Kembali"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                Order #{selected.order_no}
              </>
            ) : (
              <>
                <ListOrdered className="h-4 w-4" />
                Pesanan Hari Ini
                <span className="text-xs text-muted-foreground font-normal">· {outletName}</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {!selected && (
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Belum ada pesanan hari ini
              </div>
            ) : (
              <ul className="divide-y rounded-lg border">
                {orders.map((o) => {
                  const voided = o.status === "voided" || o.status === "cancelled";
                  return (
                    <li
                      key={o.id}
                      className={`flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer ${voided ? "opacity-60" : ""}`}
                      onClick={() => openDetail(o)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          #{o.order_no}
                          {voided && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800">
                              VOID
                            </span>
                          )}
                          {o.customer_name && (
                            <span className="text-xs text-muted-foreground font-normal">
                              · {o.customer_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>
                            {new Date(o.created_at).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            {o.payment_method === "cash" ? (
                              <Banknote className="h-3 w-3" />
                            ) : (
                              <QrCode className="h-3 w-3" />
                            )}
                            {o.payment_method === "cash" ? "Tunai" : "QRIS"}
                          </span>
                        </div>
                      </div>
                      <div className={`text-sm font-semibold ${voided ? "line-through" : ""}`}>
                        {formatIDR(o.total)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {selected && (
          <div className="flex-1 overflow-auto space-y-3">
            <div className="text-xs text-muted-foreground">
              {new Date(selected.created_at).toLocaleString("id-ID")}
            </div>
            <ul className="divide-y rounded-lg border">
              {items.map((it, k) => (
                <li key={k} className="px-3 py-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span>{it.quantity}× {it.name}</span>
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
              <span>{formatIDR(selected.total)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Bayar via {selected.payment_method === "cash" ? "Tunai" : "QRIS"}
              {selected.payment_method === "cash" && selected.amount_tendered != null && (
                <> · diterima {formatIDR(Number(selected.amount_tendered))} · kembali {formatIDR(Number(selected.change_due))}</>
              )}
            </div>

            {/* Hidden print layer */}
            <div className="print-host" aria-hidden="true">
              <div ref={printRef}>
                <Receipt
                  shopName={shopName}
                  outletName={outletName}
                  shopLogoUrl={shopLogoUrl}
                  shopAddress={shopAddress}
                  shopPhone={shopPhone}
                  orderNo={selected.order_no}
                  cashierName="Kasir"
                  date={new Date(selected.created_at)}
                  items={items}
                  subtotal={Number(selected.subtotal ?? selected.total)}
                  manualDiscount={Number(selected.discount ?? 0)}
                  promoCode={selected.promo_code}
                  serviceCharge={Number(selected.service_charge ?? 0)}
                  tax={Number(selected.tax ?? 0)}
                  tipAmount={Number(selected.tip_amount ?? 0)}
                  pointsRedeemed={selected.points_redeemed ?? 0}
                  pointsEarned={selected.points_earned ?? 0}
                  customerName={selected.customer_name ?? undefined}
                  paymentSplit={Array.isArray(selected.payment_split) ? selected.payment_split : []}
                  total={Number(selected.total)}
                  paymentMethod={selected.payment_method}
                  amountTendered={selected.amount_tendered ? Number(selected.amount_tendered) : undefined}
                  changeDue={Number(selected.change_due)}
                />
              </div>
              <div ref={ticketRef}>
                <KitchenTicket
                  orderNo={selected.order_no}
                  date={new Date(selected.created_at)}
                  outletName={outletName}
                  customerName={selected.customer_name}
                  items={items}
                />
              </div>
              <div ref={courierRef}>
                {isDelivery && (
                  <CourierReceipt
                    shopName={shopName}
                    outletName={outletName}
                    orderNo={selected.order_no}
                    date={new Date(selected.created_at)}
                    customerName={selected.customer_name}
                    customerPhone={selected.customer_phone}
                    deliveryAddress={selected.delivery_address}
                    courierName={selected.courier_name}
                    trackingNumber={selected.tracking_number}
                    deliveryFee={Number(selected.delivery_fee ?? 0)}
                    total={Number(selected.total)}
                    items={items}
                    note={selected.note}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2 sm:gap-0">
          {selected ? (
            <>
              <div className="mr-auto flex flex-wrap items-center gap-2">
                <PrinterPicker outletId={outletId} scopeKey={scopeKey} />
                <ReceiptPaperPicker scopeKey={scopeKey} />
              </div>
              <Button variant="outline" onClick={() => tryPrint("ticket", ticketRef.current)}>
                <ChefHat className="mr-2 h-4 w-4" /> Tiket Dapur
              </Button>
              {isDelivery && (
                <Button variant="outline" onClick={() => tryPrint("courier", courierRef.current)}>
                  <Printer className="mr-2 h-4 w-4" /> Surat Jalan
                </Button>
              )}
              <Button onClick={() => tryPrint("receipt", printRef.current)}>
                <Printer className="mr-2 h-4 w-4" /> Cetak Struk
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Tutup</Button>
          )}
        </DialogFooter>

        {/* Fallback preview */}
        <Dialog open={fallbackOpen !== null} onOpenChange={(o) => !o && setFallbackOpen(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Pratinjau Struk</DialogTitle>
            </DialogHeader>
            <div className="rounded-md border bg-muted/30 p-3 max-h-[60vh] overflow-auto">
              <div className="bg-white p-2 mx-auto" style={{ width: "fit-content" }}>
                {fallbackOpen === "receipt" && selected && (
                  <Receipt
                    shopName={shopName}
                    outletName={outletName}
                    shopLogoUrl={shopLogoUrl}
                    shopAddress={shopAddress}
                    shopPhone={shopPhone}
                    orderNo={selected.order_no}
                    cashierName="Kasir"
                    date={new Date(selected.created_at)}
                    items={items}
                    subtotal={Number(selected.subtotal ?? selected.total)}
                    manualDiscount={Number(selected.discount ?? 0)}
                    promoCode={selected.promo_code}
                    serviceCharge={Number(selected.service_charge ?? 0)}
                    tax={Number(selected.tax ?? 0)}
                    tipAmount={Number(selected.tip_amount ?? 0)}
                    pointsRedeemed={selected.points_redeemed ?? 0}
                    pointsEarned={selected.points_earned ?? 0}
                    customerName={selected.customer_name ?? undefined}
                    paymentSplit={Array.isArray(selected.payment_split) ? selected.payment_split : []}
                    total={Number(selected.total)}
                    paymentMethod={selected.payment_method}
                    amountTendered={selected.amount_tendered ? Number(selected.amount_tendered) : undefined}
                    changeDue={Number(selected.change_due)}
                  />
                )}
                {fallbackOpen === "ticket" && selected && (
                  <KitchenTicket
                    orderNo={selected.order_no}
                    date={new Date(selected.created_at)}
                    outletName={outletName}
                    customerName={selected.customer_name}
                    items={items}
                  />
                )}
                {fallbackOpen === "courier" && selected && isDelivery && (
                  <CourierReceipt
                    shopName={shopName}
                    outletName={outletName}
                    orderNo={selected.order_no}
                    date={new Date(selected.created_at)}
                    customerName={selected.customer_name}
                    customerPhone={selected.customer_phone}
                    deliveryAddress={selected.delivery_address}
                    courierName={selected.courier_name}
                    trackingNumber={selected.tracking_number}
                    deliveryFee={Number(selected.delivery_fee ?? 0)}
                    total={Number(selected.total)}
                    items={items}
                    note={selected.note}
                  />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Dialog cetak browser tidak muncul (kemungkinan diblokir popup). Tekan Ctrl/Cmd+P di pratinjau ini.
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
                  if (!popped) printReceiptNode(node, undefined, scopeKey);
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
