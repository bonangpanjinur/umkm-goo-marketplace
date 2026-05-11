import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Printer, Search, Package, MapPin, Phone, User, Loader2, CheckSquare, Square } from "lucide-react";

export const Route = createFileRoute("/pos-app/shipping-labels")({ component: ShippingLabelsPage });

type Order = {
  id: string;
  order_number: string | null;
  recipient_name: string;
  phone: string;
  address: string;
  total_price: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  tracking_number: string | null;
};

export default function ShippingLabelsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: shop } = await supabase
        .from("coffee_shops")
        .select("id, name, address, phone")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (shop) {
        setShopId((shop as any).id);
        setShopName((shop as any).name ?? "Toko");
        setShopAddress((shop as any).address ?? "");
        setShopPhone((shop as any).phone ?? "");
      }
    })();
  }, []);

  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    supabase
      .from("orders")
      .select("id, order_number, recipient_name, phone, address, total_price, status, payment_method, created_at, tracking_number")
      .eq("shop_id", shopId)
      .in("status", ["confirmed", "processing", "shipped"] as any[])
      .eq("fulfillment", "delivery")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setOrders((data as any) ?? []);
        setLoading(false);
      });
  }, [shopId]);

  const filtered = orders.filter(o =>
    (o.order_number ?? "").toLowerCase().includes(search.toLowerCase()) ||
    o.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
    o.address.toLowerCase().includes(search.toLowerCase())
  );

  function toggleSelect(id: string) {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(o => o.id)));
  }

  async function printLabels() {
    if (selected.size === 0) { toast.error("Pilih minimal 1 pesanan"); return; }
    setPrinting(true);
    const selectedOrders = filtered.filter(o => selected.has(o.id));
    const printContent = selectedOrders.map(order => `
      <div style="border:2px solid #000;padding:16px;margin:8px;width:320px;font-family:monospace;page-break-inside:avoid;">
        <div style="text-align:center;font-size:18px;font-weight:bold;border-bottom:1px solid #ccc;padding-bottom:8px;margin-bottom:8px;">
          LABEL PENGIRIMAN
        </div>
        <div style="font-size:10px;color:#666;margin-bottom:8px;">
          Pesanan: <strong>${order.order_number ?? order.id.slice(0,8).toUpperCase()}</strong>
          &nbsp;|&nbsp; ${new Date(order.created_at).toLocaleDateString("id-ID")}
        </div>
        <div style="border:1px solid #ccc;padding:8px;margin-bottom:8px;border-radius:4px;">
          <div style="font-size:10px;color:#666;margin-bottom:4px;">PENERIMA:</div>
          <div style="font-size:14px;font-weight:bold;">${order.recipient_name}</div>
          <div style="font-size:12px;">${order.phone}</div>
          <div style="font-size:11px;color:#333;margin-top:4px;">${order.address}</div>
        </div>
        <div style="border:1px solid #ccc;padding:8px;border-radius:4px;">
          <div style="font-size:10px;color:#666;margin-bottom:4px;">PENGIRIM:</div>
          <div style="font-size:13px;font-weight:bold;">${shopName}</div>
          <div style="font-size:11px;">${shopPhone}</div>
          <div style="font-size:11px;color:#333;">${shopAddress}</div>
        </div>
        ${order.tracking_number ? `<div style="margin-top:8px;font-size:11px;">Resi: <strong>${order.tracking_number}</strong></div>` : ""}
        <div style="margin-top:8px;font-size:10px;text-align:right;color:#666;">
          Total: Rp ${Number(order.total_price).toLocaleString("id-ID")}
        </div>
      </div>
    `).join("");

    const win = window.open("", "_blank");
    if (!win) { toast.error("Popup diblokir browser. Izinkan popup untuk mencetak."); setPrinting(false); return; }
    win.document.write(`<html><head><title>Label Pengiriman</title><style>@media print{body{margin:0}}</style></head><body style="display:flex;flex-wrap:wrap;">${printContent}</body></html>`);
    win.document.close();
    win.onload = () => { win.print(); setPrinting(false); };
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" /> Label Pengiriman
          </h1>
          <p className="text-sm text-muted-foreground">Generate & cetak label siap kirim untuk pesanan delivery</p>
        </div>
        <Button size="sm" onClick={printLabels} disabled={printing || selected.size === 0}>
          <Printer className="h-4 w-4 mr-1.5" />
          {printing ? "Mencetak..." : `Cetak (${selected.size})`}
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari nomor pesanan atau nama penerima..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={toggleAll} className="shrink-0">
          {selected.size === filtered.length && filtered.length > 0 ? "Batal Semua" : "Pilih Semua"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Tidak ada pesanan delivery aktif</p>
          <p className="text-sm mt-1">Label hanya untuk pesanan dengan status Dikonfirmasi, Diproses, atau Dikirim</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => (
            <Card
              key={order.id}
              className={`p-4 cursor-pointer transition-colors ${selected.has(order.id) ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}
              onClick={() => toggleSelect(order.id)}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  {selected.has(order.id)
                    ? <CheckSquare className="h-5 w-5 text-primary" />
                    : <Square className="h-5 w-5 text-muted-foreground" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-semibold">{order.order_number ?? order.id.slice(0,8).toUpperCase()}</span>
                    <Badge variant="secondary" className="text-xs">{order.status}</Badge>
                    {order.tracking_number && <Badge className="text-xs bg-green-600 hover:bg-green-600">Ada Resi</Badge>}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> {order.recipient_name}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Phone className="h-3 w-3" /> {order.phone}
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{order.address}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">Rp {Number(order.total_price).toLocaleString("id-ID")}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("id-ID")}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
