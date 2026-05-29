import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import {
  ShieldX, RefreshCw, Loader2, AlertOctagon, TrendingUp,
  Eye, Flag, UserX, Store, Zap, Clock, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/admin/fraud")({
  head: () => ({ meta: [{ title: "Deteksi Fraud — Admin" }] }),
  component: AdminFraudPage,
});

type FraudOrder = {
  id: string;
  order_no: string | null;
  total: number;
  status: string;
  created_at: string;
  customer_name: string | null;
  risk_reason: string;
  risk_score: number;
  shop: { name: string } | null;
};

type SpikeShop = {
  id: string;
  name: string;
  slug: string;
  gmv_today: number;
  gmv_avg: number;
  spike_ratio: number;
  order_count: number;
};

type Tab = "orders" | "shops" | "payments";

export default function AdminFraudPage() {
  const [tab, setTab] = useState<Tab>("orders");
  const [fraudOrders, setFraudOrders] = useState<FraudOrder[]>([]);
  const [spikeShops, setSpikeShops] = useState<SpikeShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [kpis, setKpis] = useState({ highRisk: 0, spiked: 0, disputeRate: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const ago7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const ago30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const ago1 = new Date(Date.now() - 1 * 86_400_000).toISOString();

      // Suspicious orders: high value that quickly went to dispute, or large orders placed very fast
      const { data: disputes } = await supabase
        .from("order_disputes" as any)
        .select("order_id, created_at")
        .gte("created_at", ago7);

      const { data: bigOrders } = await supabase
        .from("orders")
        .select("id, order_no, total, status, created_at, customer_name, shop:shops(name)")
        .gte("created_at", ago7)
        .gte("total", 500000)
        .order("total", { ascending: false })
        .limit(100);

      const disputedIds = new Set((disputes ?? []).map((d: any) => d.order_id));
      const disputeCreatedMap: Record<string, string> = {};
      (disputes ?? []).forEach((d: any) => { disputeCreatedMap[d.order_id] = d.created_at; });

      const fraudList: FraudOrder[] = [];
      (bigOrders ?? []).forEach((o: any) => {
        const reasons: string[] = [];
        let score = 0;

        if (disputedIds.has(o.id)) {
          const orderTime = new Date(o.created_at).getTime();
          const disputeTime = new Date(disputeCreatedMap[o.id]).getTime();
          const hoursToDispute = (disputeTime - orderTime) / 3_600_000;
          if (hoursToDispute < 2) { reasons.push("Dispute < 2 jam setelah order"); score += 40; }
          else if (hoursToDispute < 24) { reasons.push("Dispute < 24 jam setelah order"); score += 20; }
        }

        if (Number(o.total) >= 2_000_000) { reasons.push("Nilai order sangat tinggi ≥ Rp 2jt"); score += 20; }
        else if (Number(o.total) >= 1_000_000) { reasons.push("Nilai order tinggi ≥ Rp 1jt"); score += 10; }

        if (o.status === "cancelled") { reasons.push("Order dibatalkan setelah dibuat"); score += 15; }

        if (reasons.length > 0) {
          fraudList.push({
            id: o.id,
            order_no: o.order_no,
            total: Number(o.total),
            status: o.status,
            created_at: o.created_at,
            customer_name: o.customer_name,
            risk_reason: reasons.join(" · "),
            risk_score: Math.min(score, 100),
            shop: o.shop,
          });
        }
      });

      setFraudOrders(fraudList.sort((a, b) => b.risk_score - a.risk_score));
      setKpis(k => ({ ...k, highRisk: fraudList.filter(o => o.risk_score >= 40).length }));

      // Spike shops: today vs 7-day avg
      const { data: todayOrders } = await supabase
        .from("orders")
        .select("shop_id, total, shop:shops(name, slug)")
        .eq("status", "completed")
        .gte("created_at", todayStart.toISOString());

      const { data: pastOrders } = await supabase
        .from("orders")
        .select("shop_id, total")
        .eq("status", "completed")
        .gte("created_at", ago7)
        .lt("created_at", todayStart.toISOString());

      const todayMap: Record<string, { name: string; slug: string; gmv: number; count: number }> = {};
      (todayOrders ?? []).forEach((o: any) => {
        const sid = o.shop_id;
        if (!todayMap[sid]) todayMap[sid] = { name: (o.shop as any)?.name ?? "—", slug: (o.shop as any)?.slug ?? "", gmv: 0, count: 0 };
        todayMap[sid].gmv += Number(o.total ?? 0);
        todayMap[sid].count += 1;
      });

      const pastMap: Record<string, number> = {};
      (pastOrders ?? []).forEach((o: any) => {
        pastMap[o.shop_id] = (pastMap[o.shop_id] ?? 0) + Number(o.total ?? 0);
      });

      const spikes: SpikeShop[] = Object.entries(todayMap)
        .map(([id, v]) => {
          const avgDaily = (pastMap[id] ?? 0) / 7;
          const ratio = avgDaily > 0 ? v.gmv / avgDaily : v.gmv > 0 ? 999 : 0;
          return { id, name: v.name, slug: v.slug, gmv_today: v.gmv, gmv_avg: avgDaily, spike_ratio: ratio, order_count: v.count };
        })
        .filter(s => s.spike_ratio >= 5 && s.gmv_today >= 100_000)
        .sort((a, b) => b.spike_ratio - a.spike_ratio)
        .slice(0, 20);

      setSpikeShops(spikes);
      setKpis(k => ({ ...k, spiked: spikes.length }));

    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const flag = (id: string, type: string) => {
    setFlagged(prev => new Set([...prev, id]));
    toast.success(`${type} ditandai untuk investigasi`);
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const riskColor = (score: number) => {
    if (score >= 60) return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400";
    if (score >= 30) return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400";
    return "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400";
  };

  const riskLabel = (score: number) => score >= 60 ? "Tinggi" : score >= 30 ? "Sedang" : "Rendah";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldX className="h-6 w-6 text-red-500" /> Deteksi Fraud & Anomali
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor pesanan mencurigakan, lonjakan GMV tidak wajar, dan sinyal fraud pembayaran.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        <Card className={`p-4 ${kpis.highRisk > 0 ? "border-red-200 bg-red-50/50 dark:bg-red-950/10" : ""}`}>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertOctagon className="h-3.5 w-3.5 text-red-500" /> Pesanan Risiko Tinggi</p>
          <p className={`text-2xl font-bold mt-1 ${kpis.highRisk > 0 ? "text-red-600" : ""}`}>{kpis.highRisk}</p>
          <p className="text-xs text-muted-foreground mt-0.5">7 hari terakhir</p>
        </Card>
        <Card className={`p-4 ${kpis.spiked > 0 ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10" : ""}`}>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-amber-500" /> Toko Spike GMV</p>
          <p className={`text-2xl font-bold mt-1 ${kpis.spiked > 0 ? "text-amber-600" : ""}`}>{kpis.spiked}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Lonjakan ≥ 5× rata-rata</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Flag className="h-3.5 w-3.5 text-primary" /> Total Ditandai</p>
          <p className="text-2xl font-bold mt-1">{flagged.size}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Sesi ini</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="orders" className="gap-1.5">
            <AlertOctagon className="h-3.5 w-3.5" /> Pesanan Mencurigakan
            {fraudOrders.length > 0 && (
              <span className="ml-1 rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">{fraudOrders.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="shops" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Toko Anomali
            {spikeShops.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">{spikeShops.length}</span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : tab === "orders" ? (
        fraudOrders.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <p className="font-medium">Tidak ada pesanan mencurigakan terdeteksi</p>
            <p className="text-sm text-muted-foreground mt-1">Sistem tidak mendeteksi anomali dalam 7 hari terakhir</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fraudOrders.map(o => (
              <Card key={o.id} className={`p-4 border ${flagged.has(o.id) ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium">#{o.order_no || o.id.slice(0, 8)}</span>
                      <Badge variant="outline" className={`text-xs ${riskColor(o.risk_score)}`}>
                        Risiko {riskLabel(o.risk_score)}: {o.risk_score}/100
                      </Badge>
                      <Badge variant="outline" className="text-xs">{o.status}</Badge>
                      {flagged.has(o.id) && <Badge variant="secondary" className="text-xs gap-1"><CheckCircle2 className="h-3 w-3" /> Ditandai</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Store className="h-3.5 w-3.5" /> {(o.shop as any)?.name || "—"}</span>
                      <span className="flex items-center gap-1"><UserX className="h-3.5 w-3.5" /> {o.customer_name || "Anonim"}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {fmt(o.created_at)}</span>
                    </div>
                    <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 px-3 py-1.5 text-xs text-red-700 dark:text-red-400">
                      ⚠ {o.risk_reason}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold">{formatIDR(o.total)}</p>
                    <div className="flex items-center gap-1.5 mt-2 justify-end">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => {}}>
                        <Eye className="h-3 w-3" /> Detail
                      </Button>
                      {!flagged.has(o.id) && (
                        <Button
                          variant="outline" size="sm"
                          className="h-7 text-xs gap-1 text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => flag(o.id, "Pesanan")}
                        >
                          <Flag className="h-3 w-3" /> Tandai
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        spikeShops.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <p className="font-medium">Tidak ada lonjakan GMV tidak wajar hari ini</p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-amber-50/50 dark:bg-amber-950/10">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Zap className="h-4 w-4" />
                {spikeShops.length} toko dengan GMV spike ≥ 5× rata-rata harian — perlu verifikasi
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Toko</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">GMV Hari Ini</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Avg Harian (7 hari)</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Spike Ratio</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Pesanan</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {spikeShops.map(s => (
                    <tr key={s.id} className={`hover:bg-muted/20 ${flagged.has(s.id) ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-muted-foreground">/{s.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatIDR(s.gmv_today)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatIDR(s.gmv_avg)}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={s.spike_ratio >= 10 ? "destructive" : "default"} className="text-xs">
                          {s.spike_ratio >= 999 ? "∞" : `${s.spike_ratio.toFixed(1)}×`}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.order_count}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {!flagged.has(s.id) && (
                            <Button
                              variant="outline" size="sm"
                              className="h-7 text-xs gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                              onClick={() => flag(s.id, "Toko")}
                            >
                              <Flag className="h-3 w-3" /> Tandai
                            </Button>
                          )}
                          {flagged.has(s.id) && (
                            <Badge variant="secondary" className="text-xs gap-1"><CheckCircle2 className="h-3 w-3" /> Ditandai</Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}
    </div>
  );
}
