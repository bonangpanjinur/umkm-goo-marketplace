import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Lock,
  Pencil,
  Check,
  X,
  Download,
  FileDown,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/use-permissions";
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
  order_source: "pos" | "qr_table" | "website" | "marketplace" | null;
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

const PAGE_SIZE = 30; // server-side keyset pagination
type SortDir = "newest" | "oldest";
type StatusFilter = "all" | "active" | "voided";
type PayFilter = "all" | "cash" | "qris";
type SourceFilter = "all" | "pos" | "online" | "qr_table" | "marketplace";
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
  const { role } = usePermissions();
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
  // Cursor-based pagination: stack of {created_at, id} markers per visited page.
  // page 1 = cursorStack [] (no cursor), page N = cursorStack[N-2].
  type Cursor = { created_at: string; id: string };
  const [cursorStack, setCursorStack] = useState<Cursor[]>([]);
  const page = cursorStack.length + 1;

  // Edit state for table_label in detail view
  const [editingTable, setEditingTable] = useState(false);
  const [tableDraft, setTableDraft] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [savingTable, setSavingTable] = useState(false);

  // Audit history for the currently-selected order (qr_unlock + others)
  type AuditEntry = {
    id: string;
    action: string;
    reason: string | null;
    actor_name: string | null;
    actor_id: string | null;
    created_at: string;
    metadata: Record<string, unknown> | null;
  };
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // QR-unlock filter for list view
  const [qrUnlockedOnly, setQrUnlockedOnly] = useState(false);
  const [qrUnlockedIds, setQrUnlockedIds] = useState<Set<string>>(new Set());

  // Export dialog state
  const [exportOpen, setExportOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [exportFrom, setExportFrom] = useState<string>(today);
  const [exportTo, setExportTo] = useState<string>(today);
  const [exporting, setExporting] = useState(false);

  async function loadAudit(orderId: string) {
    setAuditLoading(true);
    const { data } = await supabase
      .from("order_audit_log")
      .select("id, action, reason, actor_name, actor_id, created_at, metadata")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    setAuditEntries((data ?? []) as AuditEntry[]);
    setAuditLoading(false);
  }

  useEffect(() => {
    // Reset edit state when changing selected order
    setEditingTable(false);
    setTableDraft(selected?.table_label ?? "");
    setCancelOpen(false);
    setCancelReason("");
    setAuditEntries([]);
    if (selected?.id) loadAudit(selected.id);
  }, [selected?.id]);

  // Persist sort
  useEffect(() => {
    lsSet(sortKey, sortDir);
  }, [sortDir, sortKey]);
  useEffect(() => {
    lsSet(pageKey, String(page));
  }, [page, pageKey]);

  // Reset cursor saat outlet / dialog dibuka kembali / sort berubah
  useEffect(() => {
    setCursorStack([]);
  }, [outletId, open, sortDir]);

  // Phase 2: server-side keyset pagination + staleTime 30s
  const businessDate = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }, [open]);

  const cursor = cursorStack[cursorStack.length - 1] ?? null;
  const ascending = sortDir === "oldest";

  const ordersQuery = useQuery({
    queryKey: [
      "orders-today",
      outletId,
      businessDate,
      ascending ? "asc" : "desc",
      cursor?.created_at ?? null,
      cursor?.id ?? null,
    ],
    enabled: !!open && !!outletId,
    staleTime: 30_000,
    queryFn: async () => {
      // Ambil PAGE_SIZE+1 → baris ekstra hanya jadi indikator "ada next"
      let q = supabase
        .from("orders")
        .select(
          "id, order_no, total, payment_method, amount_tendered, change_due, status, created_at, customer_name, customer_phone, fulfillment, table_label, channel, marketplace_order, order_source",
        )
        .eq("outlet_id", outletId)
        .eq("business_date", businessDate)
        .order("created_at", { ascending })
        .order("id", { ascending })
        .limit(PAGE_SIZE + 1);

      if (cursor) {
        // Keyset cursor: (created_at, id) berikutnya setelah cursor
        // newest (desc): created_at < X OR (created_at = X AND id < Y)
        // oldest (asc) : created_at > X OR (created_at = X AND id > Y)
        if (ascending) {
          q = q.or(
            `created_at.gt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.gt.${cursor.id})`,
          );
        } else {
          q = q.or(
            `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
          );
        }
      }

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as Order[];
      const hasMore = rows.length > PAGE_SIZE;
      return { rows: rows.slice(0, PAGE_SIZE), hasMore };
    },
    placeholderData: (prev) => prev, // keep previous page while loading next
  });

  useEffect(() => {
    setOrders(ordersQuery.data?.rows ?? []);
    setLoading(ordersQuery.isLoading || ordersQuery.isFetching);
  }, [ordersQuery.data, ordersQuery.isLoading, ordersQuery.isFetching]);

  const hasMore = ordersQuery.data?.hasMore ?? false;

  function goNext() {
    const last = ordersQuery.data?.rows[ordersQuery.data.rows.length - 1];
    if (!last || !hasMore) return;
    setCursorStack((s) => [...s, { created_at: last.created_at, id: last.id }]);
  }
  function goPrev() {
    setCursorStack((s) => s.slice(0, -1));
  }



  useEffect(() => {
    applyReceiptPaper(undefined, scopeKey);
  }, [scopeKey]);

  // Load IDs of today's orders that have at least one qr_unlock entry
  useEffect(() => {
    if (!open || !outletId) return;
    let cancelled = false;
    (async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("order_audit_log")
        .select("order_id")
        .eq("outlet_id", outletId)
        .eq("action", "qr_unlock")
        .gte("created_at", startOfDay.toISOString());
      if (cancelled) return;
      const set = new Set<string>();
      (data ?? []).forEach((r: { order_id: string | null }) => {
        if (r.order_id) set.add(r.order_id);
      });
      setQrUnlockedIds(set);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, outletId, orders.length]);

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
      if (sourceFilter === "pos" && !(o.order_source === "pos" || (!o.order_source && o.channel === "pos"))) return false;
      if (sourceFilter === "online" && !(o.order_source === "website" || (!o.order_source && o.channel === "online" && !o.table_label))) return false;
      if (sourceFilter === "qr_table" && !(o.order_source === "qr_table" || (!o.order_source && o.channel === "online" && o.table_label))) return false;
      if (sourceFilter === "marketplace" && !(o.order_source === "marketplace" || o.marketplace_order)) return false;
      if (fulfillFilter !== "all" && o.fulfillment !== fulfillFilter) return false;
      if (qrUnlockedOnly && !qrUnlockedIds.has(o.id)) return false;
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
  }, [orders, search, statusFilter, payFilter, sourceFilter, fulfillFilter, sortDir, qrUnlockedOnly, qrUnlockedIds]);

  // Server sudah sort & paginate; filter di sini hanya menyaring halaman saat ini.
  const pageItems = filtered;

  // Reset cursor saat filter berubah (data baru perlu di-page ulang dari awal)
  useEffect(() => {
    setCursorStack([]);
  }, [search, statusFilter, payFilter, sourceFilter, fulfillFilter, qrUnlockedOnly]);


  async function fetchDetail(id: string): Promise<OrderDetail | null> {
    const { data } = await supabase
      .from("orders")
      .select(
        "id, order_no, total, payment_method, amount_tendered, change_due, status, created_at, customer_name, fulfillment, table_label, channel, marketplace_order, order_source, shop_id, outlet_id, subtotal, discount, service_charge, tax, tip_amount, promo_code, points_redeemed, points_earned, delivery_address, delivery_fee, courier_name, tracking_number, customer_phone, note, payment_split, order_items(name, unit_price, quantity, note)",
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

  // ===== Export QR-unlock audit (CSV / PDF) =====
  async function fetchExportRows(): Promise<Array<{
    created_at: string;
    order_no: string | null;
    actor: string;
    reason: string;
    previous_label: string;
    new_label: string;
  }>> {
    const from = new Date(exportFrom + "T00:00:00").toISOString();
    const to = new Date(exportTo + "T23:59:59.999").toISOString();
    const { data } = await supabase
      .from("order_audit_log")
      .select("created_at, order_no, order_id, actor_name, actor_id, reason, metadata")
      .eq("outlet_id", outletId)
      .eq("action", "qr_unlock")
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false });
    const orderIds = Array.from(new Set((data ?? []).map((r: any) => r.order_id).filter(Boolean)));
    let currentLabels = new Map<string, string | null>();
    if (orderIds.length > 0) {
      const { data: ords } = await supabase
        .from("orders")
        .select("id, table_label")
        .in("id", orderIds);
      (ords ?? []).forEach((o: any) => currentLabels.set(o.id, o.table_label));
    }
    return (data ?? []).map((r: any) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      const prev = (meta.previous_table_label as string | null) ?? null;
      const newLbl = currentLabels.get(r.order_id) ?? null;
      return {
        created_at: new Date(r.created_at).toLocaleString("id-ID"),
        order_no: r.order_no,
        actor: r.actor_name ?? r.actor_id ?? "—",
        reason: r.reason ?? "",
        previous_label: prev ?? "—",
        new_label: newLbl ?? "—",
      };
    });
  }

  async function exportCSV() {
    setExporting(true);
    try {
      const rows = await fetchExportRows();
      if (rows.length === 0) { toast.info("Tidak ada entri QR unlock pada rentang ini"); return; }
      const header = ["Waktu", "No. Order", "Oleh", "Alasan", "Meja sebelum", "Meja sesudah"];
      const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
      const csv = [header.join(","), ...rows.map((r) => [r.created_at, r.order_no ?? "", r.actor, r.reason, r.previous_label, r.new_label].map(esc).join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-unlock-${outletName}-${exportFrom}_${exportTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Diekspor ${rows.length} entri`);
    } catch (e: any) {
      toast.error("Gagal ekspor CSV: " + (e?.message ?? "error"));
    } finally { setExporting(false); }
  }

  async function exportPDF() {
    setExporting(true);
    try {
      const rows = await fetchExportRows();
      if (rows.length === 0) { toast.info("Tidak ada entri QR unlock pada rentang ini"); return; }
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 32;
      let y = margin;
      doc.setFontSize(14);
      doc.text("Riwayat QR Unlock", margin, y); y += 18;
      doc.setFontSize(10);
      doc.text(`Outlet: ${outletName}`, margin, y); y += 14;
      doc.text(`Rentang: ${exportFrom} s.d. ${exportTo}`, margin, y); y += 14;
      doc.text(`Total entri: ${rows.length}`, margin, y); y += 18;
      const lineH = 12;
      doc.setFontSize(9);
      rows.forEach((r, i) => {
        if (y > 780) { doc.addPage(); y = margin; }
        doc.setFont("helvetica", "bold");
        doc.text(`${i + 1}. #${r.order_no ?? "-"}  ·  ${r.created_at}`, margin, y); y += lineH;
        doc.setFont("helvetica", "normal");
        doc.text(`Oleh: ${r.actor}`, margin, y); y += lineH;
        doc.text(`Meja: ${r.previous_label} → ${r.new_label}`, margin, y); y += lineH;
        const reasonLines = doc.splitTextToSize(`Alasan: ${r.reason || "-"}`, 530);
        doc.text(reasonLines, margin, y); y += lineH * reasonLines.length + 4;
      });
      doc.save(`qr-unlock-${outletName}-${exportFrom}_${exportTo}.pdf`);
      toast.success(`PDF dibuat (${rows.length} entri)`);
    } catch (e: any) {
      toast.error("Gagal ekspor PDF: " + (e?.message ?? "error"));
    } finally { setExporting(false); }
  }

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
  const sourceText: string | null = printSource
    ? printSource.order_source === "marketplace" || printSource.marketplace_order
      ? "Marketplace"
      : printSource.order_source === "qr_table"
        ? "QR Meja"
        : printSource.order_source === "website"
          ? "Online / Website"
          : printSource.order_source === "pos"
            ? "POS / Kasir"
            : printSource.channel === "online"
              ? (printSource.table_label ? "QR Meja" : "Online / Website")
              : "POS / Kasir"
    : null;
  const isQrTable = !!(
    printSource &&
    (printSource.order_source === "qr_table" ||
      (!printSource.order_source && printSource.channel === "online" && printSource.table_label))
  );
  const displayCustomer = printSource
    ? [
        printSource.table_label
          ? `Meja ${printSource.table_label}`
          : isQrTable
            ? "QR Meja (no. meja belum tercatat)"
            : null,
        printSource.customer_name,
      ]
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
                  <SelectItem value="qr_table">QR Meja</SelectItem>
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

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={qrUnlockedOnly ? "default" : "outline"}
                className="h-7 text-[11px]"
                onClick={() => setQrUnlockedOnly((v) => !v)}
                title="Tampilkan hanya pesanan yang pernah di-unlock dari QR Meja"
              >
                <Lock className="mr-1 h-3 w-3" />
                Hanya QR Unlock {qrUnlockedOnly && `(${qrUnlockedIds.size})`}
              </Button>
              {role === "owner" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={() => setExportOpen(true)}
                  title="Ekspor riwayat QR unlock ke CSV/PDF"
                >
                  <FileDown className="mr-1 h-3 w-3" />
                  Ekspor Audit QR
                </Button>
              )}
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
                    const src = o.order_source
                      ?? (o.marketplace_order ? "marketplace"
                          : o.channel === "online" ? (o.table_label ? "qr_table" : "website")
                          : "pos");
                    const sourceLabel =
                      src === "marketplace"
                        ? { txt: "MARKETPLACE", cls: "bg-purple-100 text-purple-800" }
                        : src === "qr_table"
                          ? { txt: "QR MEJA", cls: "bg-amber-100 text-amber-800" }
                          : src === "website"
                            ? { txt: "ONLINE", cls: "bg-amber-100 text-amber-800" }
                            : { txt: "POS", cls: "bg-slate-100 text-slate-700" };
                    const fulfillLabel =
                      o.fulfillment === "delivery"
                        ? { txt: "DELIVERY", cls: "bg-blue-100 text-blue-800" }
                        : o.fulfillment === "pickup"
                          ? { txt: "PICKUP", cls: "bg-indigo-100 text-indigo-800" }
                          : null;
                    return (
                      <li
                        key={o.id}
                        className={`flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 ${voided ? "opacity-60" : ""}`}
                      >
                        <button
                          className="flex-1 min-w-0 text-left"
                          onClick={() => openDetail(o)}
                        >
                          <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                            #{o.order_no}
                            {voided && (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800">
                                VOID
                              </span>
                            )}
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${sourceLabel.cls}`}>
                              {sourceLabel.txt}
                            </span>
                            {fulfillLabel && (
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${fulfillLabel.cls}`}>
                                {fulfillLabel.txt}
                              </span>
                            )}
                            {o.table_label && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                                Meja {o.table_label}
                              </span>
                            )}
                          </div>
                          {(o.customer_name || o.customer_phone) && (
                            <div className="text-xs text-foreground/80 mt-0.5 truncate">
                              {o.customer_name ?? "—"}
                              {o.customer_phone && (
                                <span className="text-muted-foreground"> · {o.customer_phone}</span>
                              )}
                            </div>
                          )}
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
            <div className="rounded-lg border p-3 text-sm space-y-1">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className={`rounded px-1.5 py-0.5 font-semibold ${
                  isQrTable
                    ? "bg-amber-100 text-amber-800"
                    : (selected.order_source === "marketplace" || selected.marketplace_order)
                      ? "bg-purple-100 text-purple-800"
                      : (selected.order_source === "website" || selected.channel === "online")
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                }`}>
                  {sourceText ?? "—"}
                </span>
                {selected.fulfillment && (
                  <span className="rounded bg-muted px-1.5 py-0.5 font-semibold uppercase">
                    {selected.fulfillment === "dine_in" ? "Dine-in" : selected.fulfillment}
                  </span>
                )}
              </div>
              {/* Sumber baris jelas — staf tahu order dari mana */}
              <div>
                <span className="text-muted-foreground">Sumber: </span>
                <span className="font-semibold">
                  {isQrTable ? "QR Meja" : sourceText ?? "—"}
                </span>
              </div>
              {/* Baris Meja dengan kunci/edit */}
              {(selected.table_label || editingTable || isQrTable) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground">Meja:</span>
                  {editingTable ? (
                    <>
                      <Input
                        value={tableDraft}
                        onChange={(e) => setTableDraft(e.target.value)}
                        placeholder="Mis. 5 / A1"
                        className="h-7 w-32"
                        maxLength={40}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2"
                        disabled={savingTable}
                        onClick={async () => {
                          if (!selected) return;
                          setSavingTable(true);
                          const newLabel = tableDraft.trim() || null;
                          const { error } = await supabase
                            .from("orders")
                            .update({ table_label: newLabel } as never)
                            .eq("id", selected.id);
                          setSavingTable(false);
                          if (error) { toast.error("Gagal menyimpan: " + error.message); return; }
                          setSelected({ ...selected, table_label: newLabel });
                          setOrders((prev) => prev.map((p) => p.id === selected.id ? { ...p, table_label: newLabel } : p));
                          setEditingTable(false);
                          toast.success("Meja diperbarui");
                          loadAudit(selected.id);
                        }}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => { setEditingTable(false); setTableDraft(selected.table_label ?? ""); }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {selected.table_label ? (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800">
                          {selected.table_label}
                        </span>
                      ) : (
                        <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[11px] italic text-amber-800">
                          (no. meja belum tercatat)
                        </span>
                      )}
                      {isQrTable ? (
                        <>
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200 cursor-help">
                                  <Lock className="h-3 w-3" /> Terkunci (dari QR)
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs">
                                {(() => {
                                  const last = auditEntries.find((a) => a.action === "qr_unlock");
                                  if (!last) {
                                    return (
                                      <div>
                                        Kolom Meja dikunci karena order berasal dari QR Meja.
                                        Klik "Batalkan QR…" untuk membuka kunci dengan alasan.
                                      </div>
                                    );
                                  }
                                  const meta = (last.metadata ?? {}) as Record<string, unknown>;
                                  const prev = (meta.previous_table_label as string | null) ?? null;
                                  return (
                                    <div className="space-y-1">
                                      <div className="font-semibold">Unlock terakhir</div>
                                      <div>Oleh: {last.actor_name ?? last.actor_id ?? "Sistem"}</div>
                                      <div>{new Date(last.created_at).toLocaleString("id-ID")}</div>
                                      {last.reason && <div>Alasan: <span className="italic">{last.reason}</span></div>}
                                      <div>
                                        Meja: <span className="font-mono">{prev ?? "—"}</span>
                                        {" → "}
                                        <span className="font-mono">{selected.table_label ?? "—"}</span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => setCancelOpen(true)}
                          >
                            Batalkan QR…
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => { setTableDraft(selected.table_label ?? ""); setEditingTable(true); }}
                          title="Edit meja"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Atas nama: </span>
                <span className="font-medium">{selected.customer_name ?? "—"}</span>
              </div>
              {selected.customer_phone && (
                <div>
                  <span className="text-muted-foreground">No. HP: </span>
                  <span>{selected.customer_phone}</span>
                </div>
              )}
              {selected.delivery_address && (
                <div>
                  <span className="text-muted-foreground">Alamat: </span>
                  <span>{selected.delivery_address}</span>
                </div>
              )}
              {selected.note && (
                <div className="italic text-muted-foreground">📝 {selected.note}</div>
              )}
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

            {/* Riwayat audit (terutama qr_unlock) */}
            <div className="rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                  Riwayat Audit
                </span>
              </div>
              {auditLoading ? (
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Memuat…</div>
              ) : auditEntries.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">Belum ada riwayat untuk order ini.</div>
              ) : (
                <ul className="space-y-2">
                  {auditEntries.map((a) => {
                    const meta = (a.metadata ?? {}) as Record<string, unknown>;
                    const prev = (meta.previous_table_label as string | null) ?? null;
                    const isUnlock = a.action === "qr_unlock";
                    return (
                      <li key={a.id} className="text-xs border-l-2 border-amber-300 pl-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`rounded px-1.5 py-0.5 font-semibold ${isUnlock ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                            {isUnlock ? "QR Unlock" : a.action}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(a.created_at).toLocaleString("id-ID")}
                          </span>
                          <span>· oleh <span className="font-medium">{a.actor_name ?? a.actor_id ?? "Sistem"}</span></span>
                        </div>
                        {a.reason && <div className="mt-0.5">Alasan: <span className="italic">{a.reason}</span></div>}
                        {isUnlock && (
                          <div className="mt-0.5 text-muted-foreground">
                            Meja sebelum: <span className="font-mono">{prev ?? "—"}</span>
                            {selected.table_label !== prev && (
                              <> → sesudah: <span className="font-mono">{selected.table_label ?? "—"}</span></>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
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
                source={sourceText}
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
                source={sourceText}
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
                    source={sourceText}
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
                    source={sourceText}
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

        {/* Cancel-QR-with-reason dialog: unlocks table_label editing on order from QR */}
        <Dialog open={cancelOpen} onOpenChange={(o) => !o && setCancelOpen(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Batalkan Penguncian QR Meja</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Order ini berasal dari QR meja. Kolom Meja terkunci untuk mencegah salah ubah.
              Masukkan alasan untuk membuka kunci dan mengubah meja.
            </p>
            {/* Riwayat unlock sebelumnya, agar owner tahu sudah pernah dibuka oleh siapa */}
            {auditEntries.filter((a) => a.action === "qr_unlock").length > 0 && (
              <div className="rounded border bg-amber-50 border-amber-200 p-2 text-xs space-y-1 max-h-32 overflow-auto">
                <div className="font-semibold text-amber-900">Riwayat unlock sebelumnya:</div>
                {auditEntries.filter((a) => a.action === "qr_unlock").map((a) => (
                  <div key={a.id} className="text-amber-900">
                    · {new Date(a.created_at).toLocaleString("id-ID")} — {a.actor_name ?? "?"} {a.reason && `("${a.reason}")`}
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-medium">Alasan</label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Mis. pelanggan pindah meja"
                maxLength={120}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCancelOpen(false)}>Tutup</Button>
              <Button
                disabled={!cancelReason.trim() || savingTable}
                onClick={async () => {
                  if (!selected) return;
                  setSavingTable(true);
                  const reason = cancelReason.trim();
                  const newNote = `${selected.note ? selected.note + "\n" : ""}[QR Meja dibatalkan] ${reason}`;
                  const previousLabel = selected.table_label ?? null;
                  const { error } = await supabase
                    .from("orders")
                    .update({ channel: "pos", order_source: "pos", note: newNote } as never)
                    .eq("id", selected.id);
                  setSavingTable(false);
                  if (error) { toast.error("Gagal: " + error.message); return; }
                  setSelected({ ...selected, channel: "pos", order_source: "pos", note: newNote });
                  setOrders((prev) => prev.map((p) => p.id === selected.id ? { ...p, channel: "pos", order_source: "pos" } : p));
                  // Audit log entry — best-effort, do not block UI on failure
                  try {
                    await supabase.from("order_audit_log").insert({
                      shop_id: (selected as any).shop_id,
                      outlet_id: (selected as any).outlet_id ?? null,
                      order_id: selected.id,
                      order_no: selected.order_no,
                      action: "qr_unlock",
                      reason,
                      actor_id: user?.id ?? null,
                      actor_name: (user as any)?.user_metadata?.full_name ?? user?.email ?? null,
                      metadata: {
                        previous_table_label: previousLabel,
                        previous_order_source: "qr_table",
                        new_order_source: "pos",
                      },
                    } as never);
                  } catch (e) {
                    console.warn("qr_unlock audit log failed", e);
                  }
                  setCancelOpen(false);
                  setCancelReason("");
                  setEditingTable(true);
                  setTableDraft(selected.table_label ?? "");
                  toast.success("Kunci QR dilepas — silakan ubah meja");
                  loadAudit(selected.id);
                }}
              >
                Buka Kunci
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Export QR-unlock audit (CSV / PDF) */}
        <Dialog open={exportOpen} onOpenChange={(o) => !o && setExportOpen(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Ekspor Audit QR Unlock</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              Outlet: <span className="font-medium">{outletName}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Dari</label>
                <Input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} className="h-8" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Sampai</label>
                <Input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} className="h-8" />
              </div>
            </div>
            <DialogFooter className="flex-wrap gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setExportOpen(false)} disabled={exporting}>Tutup</Button>
              <Button variant="outline" onClick={exportCSV} disabled={exporting}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>
              <Button onClick={exportPDF} disabled={exporting}>
                {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />} PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
