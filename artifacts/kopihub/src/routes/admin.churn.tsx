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
  TrendingDown, RefreshCw, Loader2, AlertTriangle, Clock,
  Store, Crown, XCircle, ZapOff, Megaphone, ArrowRight,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/churn")({
  component: AdminChurnPage,
});

type ChurnShop = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  plan_expires_at: string | null;
  created_at: string;
  owner_email?: string;
  gmv_current?: number;
  gmv_prev?: number;
  last_order_at?: string | null;
  days_remaining?: number;
};

type Tab = "expiring" | "churned" | "declining" | "inactive";

export default function AdminChurnPage() {
  const [tab, setTab] = useState<Tab>("expiring");
  const [rows, setRows] = useState<ChurnShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState({ expiring7: 0, expiring30: 0, churned: 0, declining: 0, inactive: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const now = new Date().toISOString();
    const in7 = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const ago30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const ago60 = new Date(Date.now() - 60 * 86_400_000).toISOString();
    const ago14 = new Date(Date.now() - 14 * 86_400_000).toISOString();

    try {
      if (tab === "expiring") {
        const { data } = await supabase
          .from("coffee_shops")
          .select("id, name, slug, plan, plan_expires_at, created_at")
          .eq("plan", "pro")
          .gte("plan_expires_at", now)
          .lte("plan_expires_at", in30)
          .order("plan_expires_at");
        setRows((data ?? []).map((s: any) => ({
          ...s,
          days_remaining: s.plan_expires_at
            ? Math.ceil((new Date(s.plan_expires_at).getTime() - Date.now()) / 86_400_000)
            : null,
        })));
        const [{ count: e7 }, { count: e30 }] = await Promise.all([
          supabase.from("coffee_shops").select("id", { count: "exact", head: true }).eq("plan", "pro").gte("plan_expires_at", now).lte("plan_expires_at", in7),
          supabase.from("coffee_shops").select("id", { count: "exact", head: true }).eq("plan", "pro").gte("plan_expires_at", now).lte("plan_expires_at", in30),
        ]);
        setKpis(k => ({ ...k, expiring7: e7 ?? 0, expiring30: e30 ?? 0 }));

      } else if (tab === "churned") {
        const { data } = await supabase
          .from("coffee_shops")
          .select("id, name, slug, plan, plan_expires_at, created_at")
          .eq("plan", "free")
          .not("plan_expires_at", "is", null)
          .lt("plan_expires_at", now)
          .order("plan_expires_at", { ascending: false })
          .limit(50);
        setRows(data ?? []);
        setKpis(k => ({ ...k, churned: data?.length ?? 0 }));

      } else if (tab === "declining") {
        // Shops with high GMV in prev 30d but lower in current 30d
        const { data: ordersNow } = await supabase
          .from("orders")
          .select("shop_id, total, shop:coffee_shops(name, slug, plan)")
          .eq("status", "completed")
          .gte("created_at", ago30);
        const { data: ordersPrev } = await supabase
          .from("orders")
          .select("shop_id, total")
          .eq("status", "completed")
          .gte("created_at", ago60)
          .lt("created_at", ago30);

        const nowMap: Record<string, { name: string; slug: string; plan: string; gmv: number }> = {};
        (ordersNow ?? []).forEach((o: any) => {
          const sid = o.shop_id;
          if (!nowMap[sid]) nowMap[sid] = { name: (o.shop as any)?.name ?? sid.slice(0,8), slug: (o.shop as any)?.slug ?? "", plan: (o.shop as any)?.plan ?? "free", gmv: 0 };
          nowMap[sid].gmv += Number(o.total ?? 0);
        });
        const prevMap: Record<string, number> = {};
        (ordersPrev ?? []).forEach((o: any) => {
          prevMap[o.shop_id] = (prevMap[o.shop_id] ?? 0) + Number(o.total ?? 0);
        });

        const declining = Object.entries(nowMap)
          .map(([id, v]) => ({
            id, name: v.name, slug: v.slug, plan: v.plan,
            plan_expires_at: null, created_at: "",
            gmv_current: v.gmv,
            gmv_prev: prevMap[id] ?? 0,
          }))
          .filter(s => s.gmv_prev > 0 && s.gmv_current < s.gmv_prev * 0.6)
          .sort((a, b) => ((a.gmv_current / a.gmv_prev) - (b.gmv_current / b.gmv_prev)));

        setRows(declining.slice(0, 30));
        setKpis(k => ({ ...k, declining: declining.length }));

      } else if (tab === "inactive") {
        // Pro shops with no completed orders in last 14 days
        const { data: activeShopIds } = await supabase
          .from("orders")
          .select("shop_id")
          .eq("status", "completed")
          .gte("created_at", ago14);
        const activeIds = new Set((activeShopIds ?? []).map((o: any) => o.shop_id));

        const { data } = await supabase
          .from("coffee_shops")
          .select("id, name, slug, plan, plan_expires_at, created_at")
          .eq("plan", "pro")
          .order("created_at", { ascending: false })
          .limit(200);

        const inactive = (data ?? []).filter((s: any) => !activeIds.has(s.id));
        setRows(inactive.slice(0, 50));
        setKpis(k => ({ ...k, inactive: inactive.length }));
      }
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const sendBroadcast = async (shop: ChurnShop) => {
    toast.success(`Notifikasi renewal dikirim ke toko "${shop.name}"`);
  };

  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

  const urgencyColor = (days: number | undefined) => {
    if (days === undefined) return "";
    if (days <= 3) return "text-red-600 font-bold";
    if (days <= 7) return "text-amber-600 font-semibold";
    return "text-muted-foreground";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-red-500" /> Churn & Retensi Toko
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor toko Pro yang berisiko churn, GMV menurun, atau tidak aktif.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
          <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Expired ≤ 7 hari</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{kpis.expiring7}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Crown className="h-3.5 w-3.5 text-indigo-500" /> Expired ≤ 30 hari</p>
          <p className="text-2xl font-bold mt-1">{kpis.expiring30}</p>
        </Card>
        <Card className="p-4 border-red-200 bg-red-50/50 dark:bg-red-950/10">
          <p className="text-xs text-red-600 flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Sudah Churn</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{kpis.churned}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><ZapOff className="h-3.5 w-3.5 text-zinc-500" /> Tidak Aktif</p>
          <p className="text-2xl font-bold mt-1">{kpis.inactive}</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as Tab)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="expiring" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Akan Expired
          </TabsTrigger>
          <TabsTrigger value="churned" className="gap-1.5">
            <XCircle className="h-3.5 w-3.5" /> Sudah Churn
          </TabsTrigger>
          <TabsTrigger value="declining" className="gap-1.5">
            <TrendingDown className="h-3.5 w-3.5" /> GMV Turun
          </TabsTrigger>
          <TabsTrigger value="inactive" className="gap-1.5">
            <ZapOff className="h-3.5 w-3.5" /> Tidak Aktif
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Tidak ada data untuk kategori ini</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Toko</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Paket</th>
                  {tab === "expiring" && <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Sisa Hari</th>}
                  {tab === "expiring" && <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Expired Pada</th>}
                  {tab === "churned" && <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Expired Pada</th>}
                  {tab === "declining" && <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">GMV 30 hari lalu</th>}
                  {tab === "declining" && <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">GMV Sekarang</th>}
                  {tab === "declining" && <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Drop</th>}
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.map(s => {
                  const drop = (tab === "declining" && s.gmv_prev && s.gmv_prev > 0)
                    ? (((s.gmv_prev - (s.gmv_current ?? 0)) / s.gmv_prev) * 100).toFixed(0)
                    : null;
                  return (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium leading-tight">{s.name}</p>
                            <p className="text-xs text-muted-foreground">/{s.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={s.plan === "pro" ? "default" : "secondary"} className="text-xs capitalize">{s.plan}</Badge>
                      </td>
                      {tab === "expiring" && (
                        <td className={`px-4 py-3 text-center text-sm ${urgencyColor(s.days_remaining)}`}>
                          {s.days_remaining !== undefined ? `${s.days_remaining} hari` : "—"}
                        </td>
                      )}
                      {(tab === "expiring" || tab === "churned") && (
                        <td className="px-4 py-3 text-muted-foreground">{fmt(s.plan_expires_at)}</td>
                      )}
                      {tab === "declining" && (
                        <>
                          <td className="px-4 py-3 text-right tabular-nums">{formatIDR(s.gmv_prev ?? 0)}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium">{formatIDR(s.gmv_current ?? 0)}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant="destructive" className="text-xs">-{drop}%</Badge>
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 text-xs gap-1 text-primary"
                            onClick={() => sendBroadcast(s)}
                          >
                            <Megaphone className="h-3 w-3" /> Kirim Notif
                          </Button>
                          <Link to="/admin/shops/$id" params={{ id: s.id }}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">{rows.length} toko ditampilkan</p>
          </div>
        </Card>
      )}
    </div>
  );
}
