import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/use-shop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/format";
import { Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export const Route = createFileRoute("/app/reports/profit")({
  component: ProfitReportPage,
});

type Summary = {
  revenue: number;
  cogs: number;
  gross_profit: number;
  margin_percent: number;
  orders: number;
};

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function ProfitReportPage() {
  const { shop } = useShop();
  const [from, setFrom] = useState(todayISO(-29));
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [daily, setDaily] = useState<any[]>([]);

  const load = async () => {
    if (!shop?.id) return;
    setLoading(true);
    try {
      const fromIso = new Date(from + "T00:00:00").toISOString();
      const toIso = new Date(to + "T23:59:59").toISOString();
      const [{ data: sum, error: e1 }, { data: rows, error: e2 }] = await Promise.all([
        (supabase as any).rpc("get_profit_report", { _shop_id: shop.id, _from: fromIso, _to: toIso }),
        (supabase as any).rpc("get_profit_report_daily", { _shop_id: shop.id, _from: fromIso, _to: toIso }),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      setSummary(sum as Summary);
      setDaily((rows ?? []).map((r: any) => ({
        day: r.day,
        Pendapatan: Number(r.revenue),
        HPP: Number(r.cogs),
        Laba: Number(r.gross_profit),
      })));
    } catch (e: any) {
      toast.error(e.message ?? "Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [shop?.id]);

  const cards = useMemo(() => ([
    { label: "Pendapatan", value: formatIDR(summary?.revenue ?? 0) },
    { label: "HPP (COGS)", value: formatIDR(summary?.cogs ?? 0) },
    { label: "Laba Kotor", value: formatIDR(summary?.gross_profit ?? 0) },
    { label: "Margin", value: `${summary?.margin_percent ?? 0}%` },
  ]), [summary]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Laporan Profit & Margin</h1>
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
          <p className="ml-auto text-xs text-muted-foreground">
            HPP dihitung dari resep × harga bahan baku saat ini.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold">{c.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Tren harian</CardTitle></CardHeader>
        <CardContent className="h-80">
          {daily.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Belum ada data pada rentang ini.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
                <Tooltip formatter={(v: any) => formatIDR(Number(v))} />
                <Legend />
                <Bar dataKey="Pendapatan" fill="hsl(var(--primary))" />
                <Bar dataKey="HPP" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="Laba" fill="hsl(142 70% 45%)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {summary && summary.orders > 0 && (
        <p className="text-xs text-muted-foreground">
          {summary.orders} transaksi pada periode ini.
        </p>
      )}
    </div>
  );
}
