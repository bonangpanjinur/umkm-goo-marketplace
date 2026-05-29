import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, FileText, Search, Loader2, ArrowLeft } from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/invoice")({
  head: () => ({ meta: [{ title: "Invoice — Merchant" }] }), component: InvoicePage });

type Order = {
  id: string;
  order_number: string | null;
  total_price: number;
  status: string;
  payment_method: string | null;
  payment_status: string | null;
  created_at: string;
  notes: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  items: OrderItem[];
};

type OrderItem = {
  name: string;
  qty: number;
  price: number;
  variant?: string | null;
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function InvoicePreview({ order, shop }: { order: Order; shop: { name: string; address?: string | null; phone?: string | null; logo_url?: string | null } | null }) {
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = 0; // can add PPN later

  return (
    <div className="bg-white p-8 text-sm font-sans" style={{ minWidth: 600 }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          {shop?.logo_url && (
            <img src={shop.logo_url} alt="logo" className="h-12 mb-2 object-contain" />
          )}
          <h1 className="text-2xl font-bold text-gray-900">{shop?.name ?? "Toko"}</h1>
          {shop?.address && <p className="text-gray-500 text-xs mt-1">{shop.address}</p>}
          {shop?.phone && <p className="text-gray-500 text-xs">{shop.phone}</p>}
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-primary">INVOICE</div>
          <p className="text-gray-500 text-xs mt-1">No: <span className="font-mono font-semibold text-gray-800">{order.order_number ?? order.id.slice(0, 8).toUpperCase()}</span></p>
          <p className="text-gray-500 text-xs">Tanggal: {fmtDate(order.created_at)}</p>
        </div>
      </div>

      {/* Bill to */}
      {order.customer_name && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Kepada:</p>
          <p className="font-semibold text-gray-900">{order.customer_name}</p>
          {order.customer_phone && <p className="text-gray-500 text-xs">{order.customer_phone}</p>}
          {order.customer_address && <p className="text-gray-500 text-xs">{order.customer_address}</p>}
        </div>
      )}

      {/* Items table */}
      <table className="w-full mb-6" cellPadding={0} cellSpacing={0}>
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Produk</th>
            <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase w-16">Qty</th>
            <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase w-28">Harga</th>
            <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase w-28">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-2.5 text-gray-800">
                {item.name}
                {item.variant && <span className="text-gray-400 text-xs ml-1">({item.variant})</span>}
              </td>
              <td className="py-2.5 text-center text-gray-600">{item.qty}</td>
              <td className="py-2.5 text-right text-gray-600">{formatIDR(item.price)}</td>
              <td className="py-2.5 text-right font-medium text-gray-800">{formatIDR(item.price * item.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-56 space-y-1.5">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatIDR(subtotal)}</span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>PPN (11%)</span>
              <span>{formatIDR(tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-1.5">
            <span>Total</span>
            <span>{formatIDR(order.total_price)}</span>
          </div>
        </div>
      </div>

      {/* Payment info */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Metode Pembayaran</p>
          <p className="text-gray-800 capitalize">{order.payment_method ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Status Pembayaran</p>
          <p className={`font-medium capitalize ${order.payment_status === "paid" ? "text-green-600" : "text-amber-600"}`}>
            {order.payment_status === "paid" ? "Lunas" : "Belum Lunas"}
          </p>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Catatan</p>
          <p className="text-gray-700 text-xs">{order.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
        <p>Terima kasih telah berbelanja di <strong>{shop?.name}</strong>!</p>
        <p className="mt-0.5">Dokumen ini dibuat secara otomatis dan sah tanpa tanda tangan.</p>
      </div>
    </div>
  );
}

export default function InvoicePage() {
  const { shop } = useShop();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  async function load() {
    if (!shop?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, total_price, status, payment_method, payment_status, created_at, notes, customer_name, customer_phone, customer_address, order_items(name, qty, price)")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(100);

    const mapped: Order[] = (data ?? []).map((o: any) => ({
      ...o,
      items: (o.order_items ?? []).map((oi: any) => ({ name: oi.name, qty: oi.qty, price: oi.price })),
    }));
    setOrders(mapped);
    setLoading(false);
  }

  useEffect(() => { load(); }, [shop?.id]);

  const filtered = orders.filter(o => {
    if (filter === "paid" && o.payment_status !== "paid") return false;
    if (filter === "unpaid" && o.payment_status === "paid") return false;
    const q = search.toLowerCase();
    if (q && !(o.order_number ?? "").toLowerCase().includes(q) && !(o.customer_name ?? "").toLowerCase().includes(q)) return false;
    return true;
  });

  function printInvoice() {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Invoice</title>
      <style>
        body { font-family: sans-serif; margin: 0; padding: 20px; }
        @media print { body { padding: 0; } }
        table { width: 100%; border-collapse: collapse; }
        .text-primary { color: #6d28d9; }
      </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Invoice Pesanan
          </h1>
          <p className="text-sm text-muted-foreground">Unduh atau cetak invoice untuk setiap pesanan</p>
        </div>
      </div>

      <div className="grid md:grid-cols-[340px_1fr] gap-4 items-start">
        {/* Order list */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Cari no. order / pelanggan..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="paid">Lunas</SelectItem>
                <SelectItem value="unpaid">Belum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">Tidak ada pesanan ditemukan</div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filtered.map(o => (
                <button
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors hover:border-primary/50 ${selected?.id === o.id ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-medium">{o.order_number ?? o.id.slice(0, 8).toUpperCase()}</span>
                    <Badge variant={o.payment_status === "paid" ? "default" : "secondary"} className="text-xs">
                      {o.payment_status === "paid" ? "Lunas" : "Belum Lunas"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{o.customer_name ?? "—"}</span>
                    <span className="font-semibold">{formatIDR(o.total_price)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(o.created_at)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="space-y-3">
          {!selected ? (
            <Card className="p-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Pilih pesanan untuk melihat invoice</p>
            </Card>
          ) : (
            <>
              <div className="flex gap-2">
                <Button onClick={printInvoice} size="sm">
                  <Printer className="h-4 w-4 mr-1.5" /> Cetak / Unduh PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Kembali
                </Button>
              </div>
              <Card className="overflow-hidden">
                <div ref={printRef} className="overflow-x-auto">
                  <InvoicePreview order={selected} shop={shop} />
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
