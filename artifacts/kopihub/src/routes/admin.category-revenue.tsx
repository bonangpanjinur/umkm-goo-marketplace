import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Loader2, Store, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/category-revenue")({
  component: CategoryRevenuePage,
});

type Range = "7d" | "30d" | "90d";

type Row = {
  slug: string;
  name: string;
  shop_count: number;
  order_count: number;
  gmv: number;
  aov: number;
};

function rangeStart(r: Range): string {
  const d = new Date();
  d.setDate(d.getDate() - (r === "7d" ? 7 : r === "30d" ? 30 : 90));
  return d.toISOString().slice(0, 10);
}

function CategoryRevenuePage() {
  const [range, setRange] = useState<Range>("30d");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [range]);

  async function load() {
    setLoading(true);
    const start = rangeStart(range);

    // 1. Get categories + shops per category
    const { data: cats } = await (supabase as any)
      .from("business_categories")
      .select("id, slug, name")
      .order("sort_order");

    const { data: shops } = await (supabase as any)
      .from("shops")
      .select("id, business_category_id");

    // 2. Orders in range (paid/completed only — simplified: status not in cancelled/void)
    const { data: orders } = await (supabase as any)
      .from("orders")
      .select("shop_id, total, status, business_date")
      .gte("business_date", start)
      .not("status", "in", "(cancelled,void,refunded)");

    const shopToCat = new Map<string, string>();
    (shops ?? []).forEach((s: any) => shopToCat.set(s.id, s.business_category_id));

    const shopCountByCat = new Map<string, number>();
    (shops ?? []).forEach((s: any) => {
      if (!s.business_category_id) return;
      shopCountByCat.set(s.business_category_id, (shopCountByCat.get(s.business_category_id) ?? 0) + 1);
    });

    const aggByCat = new Map<string, { count: number; gmv: number }>();
    (orders ?? []).forEach((o: any) => {
      const catId = shopToCat.get(o.shop_id);
      if (!catId) return;
      const cur = aggByCat.get(catId) ?? { count: 0, gmv: 0 };
      cur.count += 1;
      cur.gmv += Number(o.total ?? 0);
      aggByCat.set(catId, cur);
    });

    const built: Row[] = (cats ?? []).map((c: any) => {
      const a = aggByCat.get(c.id) ?? { count: 0, gmv: 0 };
      return {
        slug: c.slug,
        name: c.name,
        shop_count: shopCountByCat.get(c.id) ?? 0,
        order_count: a.count,
        gmv: a.gmv,
        aov: a.count > 0 ? a.gmv / a.count : 0,
      };
    }).sort((a: Row, b: Row) => b.gmv - a.gmv);

    setRows(built);
    setLoading(false);
  }

  const totals = useMemo(() => ({
    gmv: rows.reduce((s, r) => s + r.gmv, 0),
    orders: rows.reduce((s, r) => s + r.order_count, 0),
    shops: rows.reduce((s, r) => s + r.shop_count, 0),
  }), [rows]);

  const chartData = rows.map(r => ({ name: r.name, GMV: Math.round(r.gmv) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Pendapatan per Kategori
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ringkasan GMV, jumlah order, dan AOV per kategori usaha.
          </p>
        </div>
        <div className="flex gap-1.5">
          {(["7d", "30d", "90d"] as Range[]).map(r => (
            <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r)}>
              {r === "7d" ? "7 hari" : r === "30d" ? "30 hari" : "90 hari"}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total GMV</p>
          <p className="text-xl font-bold mt-1 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />{formatIDR(totals.gmv)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Order</p>
          <p className="text-xl font-bold mt-1">{totals.orders.toLocaleString("id-ID")}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Toko</p>
          <p className="text-xl font-bold mt-1 flex items-center gap-2"><Store className="h-4 w-4 text-muted-foreground" />{totals.shops.toLocaleString("id-ID")}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold mb-3">GMV per Kategori</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} />
                  <Tooltip formatter={(v: any) => formatIDR(Number(v))} />
                  <Bar dataKey="GMV" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Kategori</th>
                  <th className="text-right px-4 py-2 font-medium">Toko</th>
                  <th className="text-right px-4 py-2 font-medium">Order</th>
                  <th className="text-right px-4 py-2 font-medium">GMV</th>
                  <th className="text-right px-4 py-2 font-medium">AOV</th>
                  <th className="text-right px-4 py-2 font-medium">% GMV</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.slug} className="border-t border-border">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{r.slug}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right">{r.shop_count.toLocaleString("id-ID")}</td>
                    <td className="px-4 py-2.5 text-right">{r.order_count.toLocaleString("id-ID")}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{formatIDR(r.gmv)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{formatIDR(r.aov)}</td>
                    <td className="px-4 py-2.5 text-right text-xs">
                      {totals.gmv > 0 ? ((r.gmv / totals.gmv) * 100).toFixed(1) : "0.0"}%
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Belum ada data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
