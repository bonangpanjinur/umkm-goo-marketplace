import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/format";
import { downloadCSV } from "@/lib/export";
import {
  TrendingUp, RefreshCw, Loader2, Crown, Percent,
  Megaphone, Banknote, Download, ArrowUpRight, Target,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";

export const Route = createFileRoute("/admin/revenue")({
  component: AdminRevenuePage,
});

type Period = "7d" | "30d" | "90d" | "365d";

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7 Hari", "30d": "30 Hari", "90d": "90 Hari", "365d": "1 Tahun",
};

const COLORS = {
  subscription: "#6366f1",
  commission: "#22c55e",
  ads: "#f59e0b",
  withdrawal_fee: "#3b82f6",
};

export default function AdminRevenuePage() {
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(false);

  const [kpis, setKpis] = useState({
    totalRevenue: 0, subscriptionRevenue: 0, commissionRevenue: 0,
    adsRevenue: 0, withdrawalFees: 0, takeRate: 0, avgOrderValue: 0,
    revenueGrowth: 0,
  });
  const [daily, setDaily] = useState<any[]>([]);
  const [topShops, setTopShops] = useState<any[]>([]);
  const [breakdown, setBreakdown] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const prevSince = new Date(Date.now() - days * 2 * 86_400_000).toISOString();

    const [
      { data: invoices },
      { data: prevInvoices },
      { data: orders },
      { data: withdrawals },
    ] = await Promise.all([
      supabase.from("plan_invoices" as any).select("amount_idr, paid_at").eq("status", "paid").gte("paid_at", since),
      supabase.from("plan_invoices" as any).select("amount_idr").eq("status", "paid").gte("paid_at", prevSince).lt("paid_at", since),
      supabase.from("orders").select("total, commission_fee, created_at, shop_id, shop:shops(name)").eq("status", "completed").gte("created_at", since),
      supabase.from("withdrawal_requests" as any).select("admin_fee, created_at").eq("status", "paid").gte("created_at", since),
    ]);

    const subRev = (invoices ?? []).reduce((s: number, r: any) => s + Number(r.amount_idr), 0);
    const prevSubRev = (prevInvoices ?? []).reduce((s: number, r: any) => s + Number(r.amount_idr), 0);
    const commRev = (orders ?? []).reduce((s: number, r: any) => s + Number(r.commission_fee ?? 0), 0);
    const wdFees = (withdrawals ?? []).reduce((s: number, r: any) => s + Number(r.admin_fee ?? 0), 0);
    const gmv = (orders ?? []).reduce((s: number, r: any) => s + Number(r.total ?? 0), 0);
    const total = subRev + commRev + wdFees;
    const growth = prevSubRev > 0 ? ((subRev - prevSubRev) / prevSubRev) * 100 : 0;

    setKpis({
      totalRevenue: total,
      subscriptionRevenue: subRev,
      commissionRevenue: commRev,
      adsRevenue: 0, // placeholder for future ads revenue
      withdrawalFees: wdFees,
      takeRate: gmv > 0 ? (commRev / gmv) * 100 : 0,
      avgOrderValue: (orders ?? []).length > 0 ? gmv / (orders ?? []).length : 0,
      revenueGrowth: growth,
    });

    // Build daily chart data
    const dayCount = Math.min(days, 90);
    const dayArr = Array.from({ length: dayCount }, (_, i) => {
      const d = new Date(Date.now() - (dayCount - 1 - i) * 86_400_000);
      return d.toISOString().slice(0, 10);
    });

    const subMap: Record<string, number> = {};
    const commMap: Record<string, number> = {};
    (invoices ?? []).forEach((r: any) => {
      const d = r.paid_at.slice(0, 10);
      subMap[d] = (subMap[d] ?? 0) + Number(r.amount_idr);
    });
    (orders ?? []).forEach((r: any) => {
      const d = r.created_at.slice(0, 10);
      commMap[d] = (commMap[d] ?? 0) + Number(r.commission_fee ?? 0);
    });

    setDaily(dayArr.map(d => ({
      label: new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      Subscription: subMap[d] ?? 0,
      Komisi: commMap[d] ?? 0,
      Total: (subMap[d] ?? 0) + (commMap[d] ?? 0),
    })));

    // Top shops by commission
    const shopMap: Record<string, { name: string; commission: number; orders: number; gmv: number }> = {};
    (orders ?? []).forEach((r: any) => {
      const sid = r.shop_id;
      if (!shopMap[sid]) shopMap[sid] = { name: (r.shop as any)?.name ?? sid.slice(0, 8), commission: 0, orders: 0, gmv: 0 };
      shopMap[sid].commission += Number(r.commission_fee ?? 0);
      shopMap[sid].orders += 1;
      shopMap[sid].gmv += Number(r.total ?? 0);
    });
    setTopShops(
      Object.values(shopMap)
        .sort((a, b) => b.commission - a.commission)
        .slice(0, 10)
    );

    // Breakdown pie
    setBreakdown([
      { name: "Subscription", value: subRev, color: COLORS.subscription },
      { name: "Komisi Marketplace", value: commRev, color: COLORS.commission },
      { name: "Fee Penarikan", value: wdFees, color: COLORS.withdrawal_fee },
    ].filter(d => d.value > 0));

    setLoading(false);
  };

  useEffect(() => { load(); }, [period]);

  const exportData = () => {
    downloadCSV(topShops.map(s => ({
      "Toko": s.name,
      "Komisi (Rp)": s.commission,
      "GMV (Rp)": s.gmv,
      "Pesanan": s.orders,
    })), `revenue-top-shops-${period}`);
  };

  const KpiCard = ({ icon: Icon, label, value, sub, color, trend }: any) => (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Icon className={`h-3.5 w-3.5 ${color}`} /> {label}
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      {trend !== undefined && (
        <p className={`text-xs font-medium mt-1 flex items-center gap-0.5 ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          <ArrowUpRight className={`h-3 w-3 ${trend < 0 ? "rotate-180" : ""}`} />
          {trend >= 0 ? "+" : ""}{trend.toFixed(1)}% vs periode sebelumnya
        </p>
      )}
    </Card>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" /> Revenue Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Breakdown pendapatan platform dari semua sumber: subscription, komisi, iklan, dan fee.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["7d", "30d", "90d", "365d"] as Period[]).map(p => (
            <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)}>
              {PERIOD_LABELS[p]}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <KpiCard icon={TrendingUp} label="Total Pendapatan Platform" value={formatIDR(kpis.totalRevenue)} color="text-primary" trend={kpis.revenueGrowth} />
            <KpiCard icon={Crown} label="Pendapatan Subscription" value={formatIDR(kpis.subscriptionRevenue)} sub={`${kpis.totalRevenue > 0 ? ((kpis.subscriptionRevenue / kpis.totalRevenue) * 100).toFixed(0) : 0}% dari total`} color="text-indigo-500" />
            <KpiCard icon={Percent} label="Komisi Marketplace" value={formatIDR(kpis.commissionRevenue)} sub={`Take rate ${kpis.takeRate.toFixed(2)}%`} color="text-emerald-500" />
            <KpiCard icon={Banknote} label="Fee Penarikan" value={formatIDR(kpis.withdrawalFees)} color="text-blue-500" />
            <KpiCard icon={Megaphone} label="Pendapatan Iklan" value={formatIDR(kpis.adsRevenue)} sub="Fitur iklan berbayar" color="text-amber-500" />
            <KpiCard icon={Target} label="Avg. Order Value" value={formatIDR(kpis.avgOrderValue)} color="text-purple-500" />
          </div>

          {/* Trend chart + Pie */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Area chart */}
            <Card className="p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Tren Pendapatan Harian</h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500 inline-block" /> Subscription</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Komisi</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={daily}>
                  <defs>
                    <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}jt` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}rb` : String(v)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(val: number) => formatIDR(val)}
                    contentStyle={{ border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="Subscription" stroke="#6366f1" fill="url(#subGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Komisi" stroke="#22c55e" fill="url(#commGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Pie chart */}
            <Card className="p-5">
              <h2 className="text-sm font-semibold mb-4">Komposisi Pendapatan</h2>
              {breakdown.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={breakdown} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                        {breakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(val: number) => formatIDR(val)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {breakdown.map((b, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: b.color }} />
                          {b.name}
                        </span>
                        <span className="font-medium">{kpis.totalRevenue > 0 ? ((b.value / kpis.totalRevenue) * 100).toFixed(1) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">Belum ada data</div>
              )}
            </Card>
          </div>

          {/* Top shops by commission */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold">Top 10 Toko Penghasil Komisi</h2>
              <Button variant="outline" size="sm" onClick={exportData} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Toko</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">GMV</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Komisi</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Pesanan</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Take Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {topShops.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center text-muted-foreground text-sm">Belum ada data komisi</td></tr>
                  ) : topShops.map((s, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground font-medium">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatIDR(s.gmv)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-600">{formatIDR(s.commission)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.orders}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant="secondary" className="text-xs">
                          {s.gmv > 0 ? ((s.commission / s.gmv) * 100).toFixed(2) : 0}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
