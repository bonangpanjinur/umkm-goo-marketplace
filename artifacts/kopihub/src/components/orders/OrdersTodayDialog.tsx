import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Printer,
  Banknote,
  QrCode,
  ListOrdered,
  ArrowLeft,
  ChefHat,
  Search,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
  fulfillment: string | null;
  table_label: string | null;
  channel: "pos" | "online" | null;
  marketplace_order: boolean | null;
  customer_phone: string | null;
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

const PAGE_SIZE = 10;
type SortDir = "newest" | "oldest";
type StatusFilter = "all" | "active" | "voided";
type PayFilter = "all" | "cash" | "qris";
type SourceFilter = "all" | "pos" | "online" | "marketplace";
type FulfillmentFilter = "all" | "dine_in" | "pickup" | "delivery";

function lsGet(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key: string, val: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, val);
  } catch {}
}

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
  const sortKey = `pos:orders-sort:${scopeKey}`;
  const pageKey = `pos:orders-page:${scopeKey}`;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [quickOrder, setQuickOrder] = useState<OrderDetail | null>(null);
  const [fallbackOpen, setFallbackOpen] = useState<null | "receipt" | "ticket" | "courier">(null);
  const printRef = useRef<HTMLDivElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const courierRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [payFilter, setPayFilter] = useState<PayFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [fulfillFilter, setFulfillFilter] = useState<FulfillmentFilter>("all");
  const [sortDir, setSortDir] = useState<SortDir>(
    () => (lsGet(sortKey, "newest") as SortDir) || "newest",
  );
  const [page, setPage] = useState<number>(() => {
    const p = parseInt(lsGet(pageKey, "1"), 10);
    return Number.isFinite(p) && p > 0 ? p : 1;
  });

  // Persist sort & page
  useEffect(() => {
    lsSet(sortKey, sortDir);
  }, [sortDir, sortKey]);
  useEffect(() => {
    lsSet(pageKey, String(page));
  }, [page, pageKey]);

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
      .select(
        "id, order_no, total, payment_method, amount_tendered, change_due, status, created_at, customer_name, customer_phone, fulfillment, table_label, channel, marketplace_order",
      )
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

  // Filter + sort + paginate
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = orders.filter((o) => {
      if (statusFilter === "voided") {
        if (!(o.status === "voided" || o.status === "cancelled")) return false;
      } else if (statusFilter === "active") {
        if (o.status === "voided" || o.status === "cancelled") return false;
      }
      if (payFilter !== "all" && o.payment_method !== payFilter) return false;
      if (sourceFilter === "pos" && o.channel !== "pos") return false;
      if (sourceFilter === "online" && o.channel !== "online") return false;
      if (sourceFilter === "marketplace" && !o.marketplace_order) return false;
      if (fulfillFilter !== "all" && o.fulfillment !== fulfillFilter) return false;
      if (q) {
        const hay = `${o.order_no} ${o.customer_name ?? ""} ${o.customer_phone ?? ""} ${o.table_label ?? ""} ${o.status} ${o.payment_method} ${o.channel ?? ""} ${o.fulfillment ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortDir === "newest" ? tb - ta : ta - tb;
    });
    return list;
  }, [orders, search, statusFilter, payFilter, sourceFilter, fulfillFilter, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, payFilter, sourceFilter, fulfillFilter]);

  async function fetchDetail(id: string): Promise<OrderDetail | null> {
    const { data } = await supabase
      .from("orders")
      .select(
        "id, order_no, total, payment_method, amount_tendered, change_due, status, created_at, customer_name, fulfillment, table_label, subtotal, discount, service_charge, tax, tip_amount, promo_code, points_redeemed, points_earned, delivery_address, delivery_fee, courier_name, tracking_number, customer_phone, note, payment_split, order_items(name, unit_price, quantity, note)",
      )
      .eq("id", id)
      .single();
    return (data ?? null) as unknown as OrderDetail | null;
  }

  async function openDetail(o: Order) {
    const detail = await fetchDetail(o.id);
    if (detail) setSelected(detail);
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

  // Quick reprint: fetch detail, render hidden, then print receipt + ticket/courier
  const quickPendingRef = useRef(false);
  async function quickReprint(o: Order) {
    if (quickPendingRef.current) return;
    quickPendingRef.current = true;
    try {
      const detail = await fetchDetail(o.id);
      if (!detail) {
        toast.error("Detail pesanan tidak ditemukan");
        return;
      }
      setQuickOrder(detail);
      // Wait two frames for DOM
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      tryPrint("receipt", printRef.current);
      // Small delay then print ticket/courier
      await new Promise((r) => setTimeout(r, 350));
      if (detail.fulfillment === "delivery") {
        tryPrint("courier", courierRef.current);
      } else {
        tryPrint("ticket", ticketRef.current);
      }
      toast.success(`Cetak ulang #${detail.order_no}`);
      // Clear after a moment so subsequent quick prints re-trigger render
      setTimeout(() => setQuickOrder(null), 800);
    } finally {
      quickPendingRef.current = false;
    }
  }

  // The print source — selected (manual) takes precedence over quickOrder
  const printSource = selected ?? quickOrder;
  const items: CartItem[] = (printSource?.order_items ?? []).map((i) => ({
    menu_item_id: "",
    name: i.name,
    unit_price: Number(i.unit_price),
    quantity: i.quantity,
    note: i.note ?? undefined,
  }));
  const isDelivery = printSource?.fulfillment === "delivery";
  const displayCustomer = printSource
    ? [printSource.table_label ? `Meja ${printSource.table_label}` : null, printSource.customer_name]
        .filter(Boolean)
        .join(" · ") || null
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
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
                <span className="text-xs text-muted-foreground font-normal">
                  · {outletName} · {filtered.length}/{orders.length}
                </span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {!selected && (
          <>
            {/* Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-12 gap-2">
              <div className="relative col-span-2 sm:col-span-12">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari No. order / nama / no. HP / meja…"
                  className="h-9 pl-8"
                />
              </div>
              <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
                <SelectTrigger className="h-9 sm:col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua sumber</SelectItem>
                  <SelectItem value="pos">POS / Kasir</SelectItem>
                  <SelectItem value="online">Online / QR</SelectItem>
                  <SelectItem value="marketplace">Marketplace</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fulfillFilter} onValueChange={(v) => setFulfillFilter(v as FulfillmentFilter)}>
                <SelectTrigger className="h-9 sm:col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua jenis</SelectItem>
                  <SelectItem value="dine_in">Dine-in</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="h-9 sm:col-span-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="voided">Void/Batal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={payFilter} onValueChange={(v) => setPayFilter(v as PayFilter)}>
                <SelectTrigger className="h-9 sm:col-span-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua bayar</SelectItem>
                  <SelectItem value="cash">Tunai</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortDir} onValueChange={(v) => setSortDir(v as SortDir)}>
                <SelectTrigger className="h-9 sm:col-span-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Terbaru</SelectItem>
                  <SelectItem value="oldest">Terlama</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : pageItems.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  {orders.length === 0 ? "Belum ada pesanan hari ini" : "Tidak ada pesanan cocok dengan filter"}
                </div>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {pageItems.map((o) => {
                    const voided = o.status === "voided" || o.status === "cancelled";
                    const isDel = o.fulfillment === "delivery";
                    return (
                      <li
                        key={o.id}
                        className={`flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 ${voided ? "opacity-60" : ""}`}
                      >
                        <button
                          className="flex-1 min-w-0 text-left"
                          onClick={() => openDetail(o)}
                        >
                          <div className="flex items-center gap-2 text-sm font-medium">
                            #{o.order_no}
                            {voided && (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800">
                                VOID
                              </span>
                            )}
                            {isDel && (
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                                DELIVERY
                              </span>
                            )}
                            {o.table_label && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                                Meja {o.table_label}
                              </span>
                            )}
                            {o.customer_name && (
                              <span className="text-xs text-muted-foreground font-normal truncate">
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
                        </button>
                        <div className={`text-sm font-semibold tabular-nums ${voided ? "line-through" : ""}`}>
                          {formatIDR(o.total)}
                        </div>
                        {!voided && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              quickReprint(o);
                            }}
                            title="Reprint cepat: Struk + Tiket/Surat Jalan"
                          >
                            <Zap className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Pagination */}
            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>
                  Hal. {safePage} dari {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
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
          </div>
        )}

        {/* Hidden print layer — uses printSource (selected OR quickOrder) */}
        {printSource && (
          <div className="print-host" aria-hidden="true">
            <div ref={printRef}>
              <Receipt
                shopName={shopName}
                outletName={outletName}
                shopLogoUrl={shopLogoUrl}
                shopAddress={shopAddress}
                shopPhone={shopPhone}
                orderNo={printSource.order_no}
                cashierName="Kasir"
                date={new Date(printSource.created_at)}
                items={items}
                subtotal={Number(printSource.subtotal ?? printSource.total)}
                manualDiscount={Number(printSource.discount ?? 0)}
                promoCode={printSource.promo_code}
                serviceCharge={Number(printSource.service_charge ?? 0)}
                tax={Number(printSource.tax ?? 0)}
                tipAmount={Number(printSource.tip_amount ?? 0)}
                pointsRedeemed={printSource.points_redeemed ?? 0}
                pointsEarned={printSource.points_earned ?? 0}
                customerName={displayCustomer ?? undefined}
                paymentSplit={Array.isArray(printSource.payment_split) ? printSource.payment_split : []}
                total={Number(printSource.total)}
                paymentMethod={printSource.payment_method}
                amountTendered={printSource.amount_tendered ? Number(printSource.amount_tendered) : undefined}
                changeDue={Number(printSource.change_due)}
              />
            </div>
            <div ref={ticketRef}>
              <KitchenTicket
                orderNo={printSource.order_no}
                date={new Date(printSource.created_at)}
                outletName={outletName}
                customerName={displayCustomer}
                items={items}
              />
            </div>
            <div ref={courierRef}>
              {isDelivery && (
                <CourierReceipt
                  shopName={shopName}
                  outletName={outletName}
                  orderNo={printSource.order_no}
                  date={new Date(printSource.created_at)}
                  customerName={displayCustomer}
                  customerPhone={printSource.customer_phone}
                  deliveryAddress={printSource.delivery_address}
                  courierName={printSource.courier_name}
                  trackingNumber={printSource.tracking_number}
                  deliveryFee={Number(printSource.delivery_fee ?? 0)}
                  total={Number(printSource.total)}
                  items={items}
                  note={printSource.note}
                />
              )}
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
            <>
              <div className="mr-auto flex flex-wrap items-center gap-2">
                <PrinterPicker outletId={outletId} scopeKey={scopeKey} />
                <ReceiptPaperPicker scopeKey={scopeKey} />
              </div>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Tutup</Button>
            </>
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
                {fallbackOpen === "receipt" && printSource && (
                  <Receipt
                    shopName={shopName}
                    outletName={outletName}
                    shopLogoUrl={shopLogoUrl}
                    shopAddress={shopAddress}
                    shopPhone={shopPhone}
                    orderNo={printSource.order_no}
                    cashierName="Kasir"
                    date={new Date(printSource.created_at)}
                    items={items}
                    subtotal={Number(printSource.subtotal ?? printSource.total)}
                    manualDiscount={Number(printSource.discount ?? 0)}
                    promoCode={printSource.promo_code}
                    serviceCharge={Number(printSource.service_charge ?? 0)}
                    tax={Number(printSource.tax ?? 0)}
                    tipAmount={Number(printSource.tip_amount ?? 0)}
                    pointsRedeemed={printSource.points_redeemed ?? 0}
                    pointsEarned={printSource.points_earned ?? 0}
                    customerName={displayCustomer ?? undefined}
                    paymentSplit={Array.isArray(printSource.payment_split) ? printSource.payment_split : []}
                    total={Number(printSource.total)}
                    paymentMethod={printSource.payment_method}
                    amountTendered={printSource.amount_tendered ? Number(printSource.amount_tendered) : undefined}
                    changeDue={Number(printSource.change_due)}
                  />
                )}
                {fallbackOpen === "ticket" && printSource && (
                  <KitchenTicket
                    orderNo={printSource.order_no}
                    date={new Date(printSource.created_at)}
                    outletName={outletName}
                    customerName={displayCustomer}
                    items={items}
                  />
                )}
                {fallbackOpen === "courier" && printSource && isDelivery && (
                  <CourierReceipt
                    shopName={shopName}
                    outletName={outletName}
                    orderNo={printSource.order_no}
                    date={new Date(printSource.created_at)}
                    customerName={displayCustomer}
                    customerPhone={printSource.customer_phone}
                    deliveryAddress={printSource.delivery_address}
                    courierName={printSource.courier_name}
                    trackingNumber={printSource.tracking_number}
                    deliveryFee={Number(printSource.delivery_fee ?? 0)}
                    total={Number(printSource.total)}
                    items={items}
                    note={printSource.note}
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
