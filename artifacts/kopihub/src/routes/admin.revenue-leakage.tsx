import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import {
  TrendingDown, RefreshCw, Loader2, AlertTriangle, Search,
  ShieldAlert, Store, FileSearch, ChevronDown, ChevronUp,
  CheckCircle2, Ban, BarChart3, DollarSign, Activity, Flag,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

export const Route = createFileRoute("/admin/revenue-leakage")({
  component: AdminRevenueLeakagePage,
});

const DEFAULT_PLATFORM_RATE = 0.03; // 3% default if no override
const UNDERPAID_THRESHOLD = 0.5;    // flag if actual < 50% of expected

type LeakageType = "null_commission" | "zero_commission" | "underpaid" | "all";

type LeakOrder = {
  id: string;
  order_no: string;
  shop_id: string;
  shop_name: string;
  total: number;
  commission_fee: number | null;
  commission_rate: number | null;
  shop_commission_override: number | null;
  created_at: string;
  leakage_type: "null_commission" | "zero_commission" | "underpaid";
  expected_commission: number;
  actual_commission: number;
  gap: number;
  flagged?: boolean;
};

type DailyBucket = { date: string; gap: number; count: number };

const LEAKAGE_LABELS: Record<LeakOrder["leakage_type"], { label: string; color: string; bg: string }> = {
  null_commission: { label: "Komisi NULL", color: "text-red-600", bg: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  zero_commission: { label: "Komisi Nol", color: "text-orange-600", bg: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  underpaid: { label: "Komisi Kurang", color: "text-amber-600", bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

const PERIOD_OPTIONS = [
  { value: "7",  label: "7 hari terakhir" },
  { value: "30", label: "30 hari terakhir" },
  { value: "90", label: "90 hari terakhir" },
  { value: "365", label: "1 tahun terakhir" },
];

export default function AdminRevenueLeakagePage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [leakOrders, setLeakOrders] = useState<LeakOrder[]>([]);
  const [period, setPeriod] = useState("30");
  const [leakageFilter, setLeakageFilter] = useState<LeakageType>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"gap" | "total" | "created_at">("gap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [flagging, setFlagging] = useState<string | null>(null);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - Number(period) * 86_400_000).toISOString();

      // 1. Get completed orders with possible leakage
      const { data: orders, error: oErr } = await supabase
        .from("orders")
        .select("id, order_no, shop_id, total, commission_fee, commission_rate, created_at")
        .eq("status", "completed")
        .gte("created_at", since)
        .gt("total", 0)
        .order("created_at", { ascending: false })
        .limit(2000);

      if (oErr) throw oErr;

      // 2. Get shop names + commission overrides for all unique shop IDs
      const shopIds = [...new Set((orders ?? []).map((o) => o.shop_id).filter(Boolean))];
      const shopMap: Record<string, { name: string; rate: number | null }> = {};

      if (shopIds.length > 0) {
        const { data: shops } = await supabase
          .from("coffee_shops")
          .select("id, name, commission_rate_override")
          .in("id", shopIds);
        for (const s of shops ?? []) {
          shopMap[s.id] = { name: s.name ?? s.id.slice(0, 8), rate: s.commission_rate_override ?? null };
        }
      }

      // 3. Detect leakage
      const leaked: LeakOrder[] = [];
      for (const o of orders ?? []) {
        const shopInfo = shopMap[o.shop_id] ?? { name: o.shop_id?.slice(0, 8) ?? "—", rate: null };
        const effectiveRate =
          o.commission_rate != null
            ? o.commission_rate
            : shopInfo.rate != null
              ? shopInfo.rate
              : DEFAULT_PLATFORM_RATE;
        const expected = o.total * effectiveRate;
        const actual = o.commission_fee ?? 0;

        let leakageType: LeakOrder["leakage_type"] | null = null;

        if (o.commission_fee == null) {
          leakageType = "null_commission";
        } else if (o.commission_fee === 0) {
          leakageType = "zero_commission";
        } else if (expected > 100 && actual < expected * UNDERPAID_THRESHOLD) {
          // Only flag underpaid if expected commission > Rp 100 (avoid noise on tiny orders)
          leakageType = "underpaid";
        }

        if (leakageType) {
          leaked.push({
            id: o.id,
            order_no: o.order_no ?? o.id.slice(0, 8),
            shop_id: o.shop_id,
            shop_name: shopInfo.name,
            total: o.total,
            commission_fee: o.commission_fee,
            commission_rate: o.commission_rate,
            shop_commission_override: shopInfo.rate,
            created_at: o.created_at,
            leakage_type: leakageType,
            expected_commission: expected,
            actual_commission: actual,
            gap: expected - actual,
          });
        }
      }

      setLeakOrders(leaked);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // ── Computed ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let rows = leakOrders;
    if (leakageFilter !== "all") rows = rows.filter((r) => r.leakage_type === leakageFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) => r.order_no.toLowerCase().includes(q) || r.shop_name.toLowerCase().includes(q),
      );
    }
    return [...rows].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "created_at") return mul * (a.created_at > b.created_at ? 1 : -1);
      return mul * ((a[sortKey] ?? 0) - (b[sortKey] ?? 0));
    });
  }, [leakOrders, leakageFilter, search, sortKey, sortDir]);

  const kpi = useMemo(() => {
    const affectedShops = new Set(leakOrders.map((o) => o.shop_id)).size;
    const totalGap = leakOrders.reduce((s, o) => s + o.gap, 0);
    const nullCount = leakOrders.filter((o) => o.leakage_type === "null_commission").length;
    const zeroCount = leakOrders.filter((o) => o.leakage_type === "zero_commission").length;
    const underpaidCount = leakOrders.filter((o) => o.leakage_type === "underpaid").length;
    return { affectedShops, totalGap, nullCount, zeroCount, underpaidCount };
  }, [leakOrders]);

  const dailyChart = useMemo<DailyBucket[]>(() => {
    const buckets: Record<string, DailyBucket> = {};
    for (const o of leakOrders) {
      const d = o.created_at.slice(0, 10);
      if (!buckets[d]) buckets[d] = { date: d, gap: 0, count: 0 };
      buckets[d].gap += o.gap;
      buckets[d].count += 1;
    }
    return Object.values(buckets)
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .slice(-30);
  }, [leakOrders]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const flagForInvestigation = async (order: LeakOrder) => {
    setFlagging(order.id);
    try {
      await supabase.from("system_audit").insert({
        event_type: "revenue_leakage_flagged",
        actor_id: user?.id,
        payload: {
          order_id: order.id,
          order_no: order.order_no,
          shop_id: order.shop_id,
          shop_name: order.shop_name,
          leakage_type: order.leakage_type,
          total: order.total,
          expected_commission: order.expected_commission,
          actual_commission: order.actual_commission,
          gap: order.gap,
          flagged_at: new Date().toISOString(),
        },
      });
      setFlaggedIds((prev) => new Set([...prev, order.id]));
      toast.success(`Order #${order.order_no} ditandai untuk investigasi`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menandai");
    } finally {
      setFlagging(null);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const SortIcon = ({ col }: { col: typeof sortKey }) =>
    sortKey === col
      ? sortDir === "desc"
        ? <ChevronDown className="h-3 w-3 inline ml-0.5" />
        : <ChevronUp className="h-3 w-3 inline ml-0.5" />
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-red-500" /> Revenue Leakage Detector
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deteksi otomatis order completed yang tidak menghasilkan komisi sesuai rate yang berlaku.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4 text-red-500" /> Total Potensi Kehilangan
          </div>
          <p className="text-2xl font-bold text-red-600">{formatIDR(kpi.totalGap)}</p>
          <p className="text-xs text-muted-foreground">{leakOrders.length} order bocor ditemukan</p>
        </Card>

        <Card className="p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Store className="h-4 w-4 text-orange-500" /> Toko Terdampak
          </div>
          <p className="text-2xl font-bold">{kpi.affectedShops}</p>
          <p className="text-xs text-muted-foreground">toko unik dengan order bocor</p>
        </Card>

        <Card className="p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Ban className="h-4 w-4 text-red-500" /> Null / Zero Komisi
          </div>
          <p className="text-2xl font-bold">{kpi.nullCount + kpi.zeroCount}</p>
          <p className="text-xs text-muted-foreground">{kpi.nullCount} null · {kpi.zeroCount} nol</p>
        </Card>

        <Card className="p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-amber-500" /> Komisi Kurang Bayar
          </div>
          <p className="text-2xl font-bold">{kpi.underpaidCount}</p>
          <p className="text-xs text-muted-foreground">kurang dari 50% rate seharusnya</p>
        </Card>
      </div>

      {/* Daily chart */}
      {dailyChart.length > 1 && (
        <Card className="p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Tren Leakage Harian (potensi kehilangan komisi, IDR)
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dailyChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => v.slice(5)}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}jt` : `${(v / 1000).toFixed(0)}rb`}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                formatter={(v: number) => [formatIDR(v), "Leakage"]}
                labelFormatter={(l: string) => new Date(l).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="gap" radius={[3, 3, 0, 0]}>
                {dailyChart.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.gap > 500_000 ? "#ef4444" : entry.gap > 100_000 ? "#f97316" : "#fbbf24"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari order no / nama toko…"
            className="pl-8 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={leakageFilter} onValueChange={(v) => setLeakageFilter(v as LeakageType)}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="Tipe leakage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua tipe</SelectItem>
            <SelectItem value="null_commission">Komisi NULL</SelectItem>
            <SelectItem value="zero_commission">Komisi Nol</SelectItem>
            <SelectItem value="underpaid">Komisi Kurang</SelectItem>
          </SelectContent>
        </Select>
        {filtered.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {filtered.length} order ditampilkan
          </Badge>
        )}
      </div>

      {/* How leakage is detected */}
      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        {(["null_commission", "zero_commission", "underpaid"] as const).map((t) => {
          const info = LEAKAGE_LABELS[t];
          const count = leakOrders.filter((o) => o.leakage_type === t).length;
          return (
            <div
              key={t}
              onClick={() => setLeakageFilter(leakageFilter === t ? "all" : t)}
              className={`rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                leakageFilter === t
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-semibold ${info.color}`}>{info.label}</span>
                <Badge className={`text-xs ${info.bg}`}>{count}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t === "null_commission" && "commission_fee IS NULL — field tidak terisi saat order selesai"}
                {t === "zero_commission" && "commission_fee = 0 — tersimpan nol meski total > 0"}
                {t === "underpaid" && `Komisi aktual < 50% dari rate (default ${(DEFAULT_PLATFORM_RATE * 100).toFixed(0)}% atau override toko)`}
              </p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <FileSearch className="h-4 w-4" />
          <span className="text-sm font-semibold">Detail Order Bocor</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 opacity-70" />
            <p className="font-medium">
              {leakOrders.length === 0
                ? "Tidak ditemukan leakage dalam periode ini"
                : "Tidak ada hasil untuk filter yang dipilih"}
            </p>
            <p className="text-xs">Sistem mendeteksi semua order completed — tidak ada kebocoran komisi terdeteksi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Order</th>
                  <th className="px-4 py-2.5 text-left font-medium">Toko</th>
                  <th
                    className="px-4 py-2.5 text-right font-medium cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort("total")}
                  >
                    Total Order <SortIcon col="total" />
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">Expected</th>
                  <th className="px-4 py-2.5 text-right font-medium">Aktual</th>
                  <th
                    className="px-4 py-2.5 text-right font-medium cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort("gap")}
                  >
                    Selisih <SortIcon col="gap" />
                  </th>
                  <th className="px-4 py-2.5 text-center font-medium">Tipe</th>
                  <th
                    className="px-4 py-2.5 text-left font-medium cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort("created_at")}
                  >
                    Tanggal <SortIcon col="created_at" />
                  </th>
                  <th className="px-4 py-2.5 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((o) => {
                  const info = LEAKAGE_LABELS[o.leakage_type];
                  const isFlagged = flaggedIds.has(o.id) || o.flagged;
                  return (
                    <tr key={o.id} className={`hover:bg-muted/20 ${isFlagged ? "opacity-60" : ""}`}>
                      <td className="px-4 py-2.5">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{o.order_no}</code>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate max-w-[160px]">{o.shop_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                        {formatIDR(o.total)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">
                        {formatIDR(o.expected_commission)}
                        <span className="text-[10px] text-muted-foreground ml-1">
                          ({((o.commission_rate ?? o.shop_commission_override ?? DEFAULT_PLATFORM_RATE) * 100).toFixed(1)}%)
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-red-500">
                        {formatIDR(o.actual_commission)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-red-600">
                        {formatIDR(o.gap)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${info.bg}`}>
                          {info.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {fmt(o.created_at)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {isFlagged ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> Ditandai
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            disabled={flagging === o.id}
                            onClick={() => flagForInvestigation(o)}
                          >
                            {flagging === o.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Flag className="h-3 w-3" />}
                            Investigasi
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Summary row */}
              <tfoot className="bg-muted/20 border-t border-border">
                <tr>
                  <td colSpan={5} className="px-4 py-2.5 text-xs font-semibold text-right">
                    Total potensi kehilangan ({filtered.length} order):
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-red-600 tabular-nums">
                    {formatIDR(filtered.reduce((s, o) => s + o.gap, 0))}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Detection methodology note */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 px-4 py-3">
        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Metodologi Deteksi
        </p>
        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
          <li>
            <strong>Komisi NULL</strong>: field <code>commission_fee</code> tidak terisi (IS NULL) padahal order sudah completed
          </li>
          <li>
            <strong>Komisi Nol</strong>: <code>commission_fee = 0</code> padahal <code>total &gt; 0</code> — kemungkinan bug kalkulasi
          </li>
          <li>
            <strong>Komisi Kurang</strong>: komisi aktual &lt; 50% dari komisi seharusnya berdasarkan <code>commission_rate</code> order
            atau <code>commission_rate_override</code> toko (fallback default platform {(DEFAULT_PLATFORM_RATE * 100).toFixed(0)}%)
          </li>
          <li>
            Aksi "Investigasi" mencatat ke tabel <code>system_audit</code> untuk tindak lanjut tim finance
          </li>
        </ul>
      </div>
    </div>
  );
}
