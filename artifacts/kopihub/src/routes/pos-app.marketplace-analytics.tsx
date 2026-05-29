import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/use-shop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIDR } from "@/lib/format";
import { downloadCSV } from "@/lib/export";
import { Loader2, Store, Download } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/pos-app/marketplace-analytics")({
  head: () => ({ meta: [{ title: "Analitik Marketplace — Merchant" }] }),
  component: ShopMarketplaceAnalyticsPage,
});

type Stats = {
  gross_sales: number;
  commission_paid: number;
  net_revenue: number;
  orders: number;
  aov: number;
  unique_customers: number;
  completed: number;
  in_progress: number;
};

type TopProduct = { menu_item_id: string; item_name: string; qty: number; revenue: number };

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function ShopMarketplaceAnalyticsPage() {
  const { shop } = useShop();
  const [from, setFrom] = useState(todayISO(-29));
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [daily, setDaily] = useState<{ day: string; Pendapatan: number; Pesanan: number }[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  const load = async () => {
    if (!shop?.id) return;
    setLoading(true);
    try {
      const fromIso = new Date(from + "T00:00:00").toISOString();
      const toIso = new Date(to + "T23:59:59").toISOString();
      const [r1, r2, r3] = await Promise.all([
        (supabase as any).rpc("get_shop_marketplace_stats", { _shop_id: shop.id, _from: fromIso, _to: toIso }),
        (supabase as any).rpc("get_shop_marketplace_daily", { _shop_id: shop.id, _from: fromIso, _to: toIso }),
        (supabase as any).rpc("get_shop_marketplace_top_products", { _shop_id: shop.id, _from: fromIso, _to: toIso, _limit: 10 }),
      ]);
      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
      if (r3.error) throw r3.error;
      setStats(r1.data as Stats);
      setDaily((r2.data ?? []).map((r: any) => ({
        day: r.day,
        Pendapatan: Number(r.revenue),
        Pesanan: Number(r.orders),
      })));
      setTopProducts((r3.data ?? []) as TopProduct[]);
    } catch (e: any) {
      toast.error(e.message ?? "Gagal memuat analitik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [shop?.id]);

  const cards = useMemo(() => ([
    { label: "Penjualan Kotor", value: formatIDR(stats?.gross_sales ?? 0) },
    { label: "Komisi Dibayar", value: formatIDR(stats?.commission_paid ?? 0) },
    { label: "Pendapatan Bersih", value: formatIDR(stats?.net_revenue ?? 0) },
    { label: "Pesanan", value: String(stats?.orders ?? 0) },
    { label: "AOV", value: formatIDR(stats?.aov ?? 0) },
    { label: "Pelanggan Unik", value: String(stats?.unique_customers ?? 0) },
    { label: "Selesai", value: String(stats?.completed ?? 0) },
    { label: "Dalam Proses", value: String(stats?.in_progress ?? 0) },
  ]), [stats]);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <Store className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Analitik Marketplace</h1>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="from">Dari</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">Sampai</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
          </div>
          <Button onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tampilkan"}
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadCSV(`marketplace-daily-${from}-${to}.csv`, daily)}
            disabled={daily.length === 0}
          >
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold tabular-nums">{c.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Tren Harian</CardTitle></CardHeader>
        <CardContent className="h-80">
          {daily.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Belum ada data.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
                <Tooltip formatter={(v: any, n: any) => n === "Pendapatan" ? formatIDR(Number(v)) : v} />
                <Legend />
                <Bar dataKey="Pendapatan" fill="hsl(var(--primary))" />
                <Bar dataKey="Pesanan" fill="hsl(142 70% 45%)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Top 10 Produk Marketplace</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCSV(`top-products-${from}-${to}.csv`, topProducts)}
            disabled={topProducts.length === 0}
          >
            <Download className="h-3.5 w-3.5 mr-1" /> Export
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Pendapatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">Belum ada data.</TableCell></TableRow>
              ) : topProducts.map((p) => (
                <TableRow key={p.menu_item_id}>
                  <TableCell className="font-medium">{p.item_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.qty}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDR(p.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
