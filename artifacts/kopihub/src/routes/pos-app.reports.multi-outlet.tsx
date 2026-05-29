import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { Loader2, Building2, TrendingUp, Receipt, Coins, ShoppingBag, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/format";
import { downloadXLSX } from "@/lib/export";

export const Route = createFileRoute("/pos-app/reports/multi-outlet")({
  head: () => ({ meta: [{ title: "Laporan Multi-Outlet — Merchant" }] }),
  component: MultiOutletReportPage,
});

type Range = "today" | "7d" | "30d" | "month";

const RANGE_LABELS: Record<Range, string> = {
  today: "Hari ini",
  "7d": "7 hari",
  "30d": "30 hari",
  month: "Bulan ini",
};

function rangeStart(r: Range): string {
  const now = new Date();
  const d = new Date(now);
  if (r === "today") { d.setHours(0, 0, 0, 0); return d.toISOString().slice(0, 10); }
  if (r === "7d") { d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d.toISOString().slice(0, 10); }
  if (r === "30d") { d.setDate(d.getDate() - 29); d.setHours(0, 0, 0, 0); return d.toISOString().slice(0, 10); }
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

type Outlet = { id: string; name: string };
type OutletStat = {
  outlet_id: string;
  outlet_name: string;
  revenue: number;
  orders: number;
  aov: number;
  items_sold: number;
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(200 70% 50%)",
  "hsl(30 80% 55%)",
  "hsl(280 60% 60%)",
  "hsl(150 60% 45%)",
  "hsl(0 65% 55%)",
];

function MultiOutletReportPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [range, setRange] = useState<Range>("30d");
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [stats, setStats] = useState<OutletStat[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!shop) return;
    setLoading(true);

    const startDate = rangeStart(range);

    const [outletRes, orderRes] = await Promise.all([
      supabase
        .from("outlets")
        .select("id, name")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("orders")
        .select("id, outlet_id, total, status")
        .eq("shop_id", shop.id)
        .eq("status", "completed")
        .gte("business_date", startDate),
    ]);

    const outletList: Outlet[] = (outletRes.data ?? []) as Outlet[];
    setOutlets(outletList);

    const orderItems = orderRes.data ?? [];

    const outletMap = new Map<string, Outlet>(outletList.map((o) => [o.id, o]));
    outletMap.set("", { id: "", name: "Tanpa Outlet / Walk-in" });

    const aggMap = new Map<string, { revenue: number; orders: number; items_sold: number }>();
    for (const o of orderItems as { id: string; outlet_id: string | null; total: number }[]) {
      const key = o.outlet_id ?? "";
      const cur = aggMap.get(key) ?? { revenue: 0, orders: 0, items_sold: 0 };
      cur.revenue += Number(o.total);
      cur.orders += 1;
      aggMap.set(key, cur);
    }

    if (aggMap.size > 0) {
      const orderIds = (orderItems as { id: string }[]).map((o) => o.id);
      const { data: itemData } = await supabase
        .from("order_items")
        .select("order_id, quantity")
        .in("order_id", orderIds);

      const itemsByOrder = new Map<string, number>();
      for (const it of (itemData ?? []) as { order_id: string; quantity: number }[]) {
        itemsByOrder.set(it.order_id, (itemsByOrder.get(it.order_id) ?? 0) + it.quantity);
      }

      const orderOutletMap = new Map<string, string>();
      for (const o of orderItems as { id: string; outlet_id: string | null }[]) {
        orderOutletMap.set(o.id, o.outlet_id ?? "");
      }

      for (const [ordId, qty] of itemsByOrder) {
        const outletKey = orderOutletMap.get(ordId) ?? "";
        const cur = aggMap.get(outletKey);
        if (cur) cur.items_sold += qty;
      }
    }

    const result: OutletStat[] = [];
    for (const [outletId, agg] of aggMap) {
      const outletName = outletMap.get(outletId)?.name ?? "Outlet Tidak Dikenal";
      result.push({
        outlet_id: outletId,
        outlet_name: outletName,
        revenue: agg.revenue,
        orders: agg.orders,
        aov: agg.orders > 0 ? agg.revenue / agg.orders : 0,
        items_sold: agg.items_sold,
      });
    }

    result.sort((a, b) => b.revenue - a.revenue);
    setStats(result);
    setLoading(false);
  }

  useEffect(() => {
    if (shop) load();
  }, [shop?.id, range]);

  const totals = useMemo(() => ({
    revenue: stats.reduce((s, r) => s + r.revenue, 0),
    orders: stats.reduce((s, r) => s + r.orders, 0),
    items: stats.reduce((s, r) => s + r.items_sold, 0),
  }), [stats]);

  function exportXLSX() {
    const rows = stats.map((s) => ({
      Outlet: s.outlet_name,
      "Omzet (Rp)": s.revenue,
      "Transaksi": s.orders,
      "AOV (Rp)": Math.round(s.aov),
      "Item Terjual": s.items_sold,
    }));
    downloadXLSX(`laporan-multi-outlet-${range}-${new Date().toISOString().slice(0, 10)}.xlsx`, rows);
  }

  if (shopLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Laporan Multi-Outlet
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Perbandingan kinerja semua cabang dalam satu tampilan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
                <SelectItem key={r} value={r}>{RANGE_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportXLSX} disabled={stats.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Excel
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : stats.length === 0 ? (
        <div className="flex h-60 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          Tidak ada data pesanan pada rentang ini
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <KpiCard icon={Coins} label="Total Omzet" value={formatIDR(totals.revenue)} />
            <KpiCard icon={Receipt} label="Total Transaksi" value={String(totals.orders)} />
            <KpiCard icon={ShoppingBag} label="Total Item Terjual" value={String(totals.items)} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 text-sm font-semibold">Omzet per Outlet</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    fontSize={11}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}jt` : `${(v / 1000).toFixed(0)}rb`}
                  />
                  <YAxis type="category" dataKey="outlet_name" fontSize={11} stroke="hsl(var(--muted-foreground))" width={110} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => formatIDR(v)}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {stats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 text-sm font-semibold">Jumlah Transaksi per Outlet</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <YAxis type="category" dataKey="outlet_name" fontSize={11} stroke="hsl(var(--muted-foreground))" width={110} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v} transaksi`]}
                  />
                  <Bar dataKey="orders" radius={[0, 4, 4, 0]}>
                    {stats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Detail Per Outlet</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Outlet</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">Omzet</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">Transaksi</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">AOV</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">Item</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">% Omzet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.map((s, i) => {
                    const pct = totals.revenue > 0 ? (s.revenue / totals.revenue * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={s.outlet_id} className="hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: COLORS[i % COLORS.length] }}
                            />
                            <span className="font-medium">{s.outlet_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatIDR(s.revenue)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{s.orders}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatIDR(Math.round(s.aov))}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{s.items_sold}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: COLORS[i % COLORS.length],
                                }}
                              />
                            </div>
                            <span className="tabular-nums text-xs w-10 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-border bg-muted/20">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-sm">Total</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatIDR(totals.revenue)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{totals.orders}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatIDR(totals.orders > 0 ? Math.round(totals.revenue / totals.orders) : 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{totals.items}</td>
                    <td className="px-4 py-3 text-right font-semibold">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {outlets.length <= 1 && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              Toko Anda belum memiliki beberapa outlet. Buat outlet di{" "}
              <a href="/pos-app/outlets" className="font-medium underline">halaman Multi-Outlet</a>{" "}
              untuk melihat perbandingan kinerja per cabang.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}
