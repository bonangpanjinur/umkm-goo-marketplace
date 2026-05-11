import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIDR } from "@/lib/format";
import { downloadCSV } from "@/lib/export";
import { Loader2, BarChart3, Download } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalyticsPage,
});

type Stats = {
  gmv: number;
  commission: number;
  net_to_shops: number;
  orders: number;
  aov: number;
  take_rate: number;
  shops_active: number;
  customers: number;
};

type TopShop = { shop_id: string; shop_name: string; gmv: number; commission: number; orders: number };

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function AdminAnalyticsPage() {
  const [from, setFrom] = useState(todayISO(-29));
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [daily, setDaily] = useState<{ day: string; GMV: number; Komisi: number; Pesanan: number }[]>([]);
  const [topShops, setTopShops] = useState<TopShop[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const fromIso = new Date(from + "T00:00:00").toISOString();
      const toIso = new Date(to + "T23:59:59").toISOString();
      const [r1, r2, r3] = await Promise.all([
        (supabase as any).rpc("get_marketplace_admin_stats", { _from: fromIso, _to: toIso }),
        (supabase as any).rpc("get_marketplace_admin_daily", { _from: fromIso, _to: toIso }),
        (supabase as any).rpc("get_marketplace_admin_top_shops", { _from: fromIso, _to: toIso, _limit: 10 }),
      ]);
      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
      if (r3.error) throw r3.error;
      setStats(r1.data as Stats);
      setDaily((r2.data ?? []).map((r: any) => ({
        day: r.day,
        GMV: Number(r.gmv),
        Komisi: Number(r.commission),
        Pesanan: Number(r.orders),
      })));
      setTopShops((r3.data ?? []) as TopShop[]);
    } catch (e: any) {
      toast.error(e.message ?? "Gagal memuat analitik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const cards = useMemo(() => ([
    { label: "GMV", value: formatIDR(stats?.gmv ?? 0) },
    { label: "Komisi Platform", value: formatIDR(stats?.commission ?? 0) },
    { label: "Take Rate", value: `${stats?.take_rate ?? 0}%` },
    { label: "Pesanan", value: String(stats?.orders ?? 0) },
    { label: "AOV", value: formatIDR(stats?.aov ?? 0) },
    { label: "Toko Aktif", value: String(stats?.shops_active ?? 0) },
    { label: "Pelanggan", value: String(stats?.customers ?? 0) },
    { label: "Net ke Toko", value: formatIDR(stats?.net_to_shops ?? 0) },
  ]), [stats]);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
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
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
                <Tooltip formatter={(v: any) => formatIDR(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="GMV" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="Komisi" stroke="hsl(142 70% 45%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Top 10 Toko</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCSV(`top-shops-${from}-${to}.csv`, topShops)}
            disabled={topShops.length === 0}
          >
            <Download className="h-3.5 w-3.5 mr-1" /> Export
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Toko</TableHead>
                <TableHead className="text-right">GMV</TableHead>
                <TableHead className="text-right">Komisi</TableHead>
                <TableHead className="text-right">Pesanan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topShops.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">Belum ada data.</TableCell></TableRow>
              ) : topShops.map((s) => (
                <TableRow key={s.shop_id}>
                  <TableCell className="font-medium">{s.shop_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDR(s.gmv)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDR(s.commission)}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.orders}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
