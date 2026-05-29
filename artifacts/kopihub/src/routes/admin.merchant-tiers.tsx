import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Trophy, Search, Star, ShoppingBag, BadgeCheck, Rocket, Crown } from "lucide-react";

export const Route = createFileRoute("/admin/merchant-tiers")({
  head: () => ({ meta: [{ title: "Tier Merchant — Admin" }] }),
  component: MerchantTiersPage,
});

type ShopRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  kyc_status: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  created_at: string;
  revenue_30d: number;
  order_count_30d: number;
};

type Tier = "elite" | "top_seller" | "verified" | "starter";

const TIER_META: Record<Tier, { label: string; color: string; icon: React.ReactNode; description: string; minRevenue: number; minOrders: number }> = {
  elite: {
    label: "Elite",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300",
    icon: <Crown className="h-3.5 w-3.5" />,
    description: "Revenue ≥ Rp 50 juta / 30 hari",
    minRevenue: 50_000_000,
    minOrders: 0,
  },
  top_seller: {
    label: "Top Seller",
    color: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300",
    icon: <Rocket className="h-3.5 w-3.5" />,
    description: "Revenue ≥ Rp 10 juta / 30 hari",
    minRevenue: 10_000_000,
    minOrders: 0,
  },
  verified: {
    label: "Verified",
    color: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: <BadgeCheck className="h-3.5 w-3.5" />,
    description: "KYC disetujui",
    minRevenue: 0,
    minOrders: 0,
  },
  starter: {
    label: "Starter",
    color: "bg-muted text-muted-foreground border-border",
    icon: <Star className="h-3.5 w-3.5" />,
    description: "Baru bergabung",
    minRevenue: 0,
    minOrders: 0,
  },
};

function computeTier(shop: ShopRow): Tier {
  if (shop.revenue_30d >= 50_000_000) return "elite";
  if (shop.revenue_30d >= 10_000_000) return "top_seller";
  if (shop.kyc_status === "approved") return "verified";
  return "starter";
}

function TierBadge({ tier }: { tier: Tier }) {
  const meta = TIER_META[tier];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.color}`}>
      {meta.icon} {meta.label}
    </span>
  );
}

function MerchantTiersPage() {
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterTier, setFilterTier] = useState<Tier | "all">("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString();

      const { data: shopData } = await supabase
        .from("shops")
        .select("id, name, slug, plan, kyc_status, rating_avg, rating_count, created_at")
        .order("created_at", { ascending: false });

      if (!shopData) { setLoading(false); return; }

      const { data: orderData } = await (supabase as any)
        .from("orders")
        .select("shop_id, total_amount")
        .gte("created_at", thirtyDaysAgo)
        .in("status", ["completed", "delivered", "ready"]);

      const revenueMap: Record<string, number> = {};
      const countMap: Record<string, number> = {};
      for (const o of (orderData ?? []) as { shop_id: string; total_amount: number }[]) {
        revenueMap[o.shop_id] = (revenueMap[o.shop_id] ?? 0) + Number(o.total_amount ?? 0);
        countMap[o.shop_id] = (countMap[o.shop_id] ?? 0) + 1;
      }

      setShops(shopData.map((s: any) => ({
        ...s,
        revenue_30d: revenueMap[s.id] ?? 0,
        order_count_30d: countMap[s.id] ?? 0,
      })));
      setLoading(false);
    })();
  }, []);

  const enriched = useMemo(() => shops.map(s => ({ ...s, tier: computeTier(s) })), [shops]);

  const tierCounts = useMemo(() => {
    const counts: Record<Tier, number> = { elite: 0, top_seller: 0, verified: 0, starter: 0 };
    enriched.forEach(s => { counts[s.tier] = (counts[s.tier] ?? 0) + 1; });
    return counts;
  }, [enriched]);

  const filtered = useMemo(() => {
    let arr = enriched;
    if (filterTier !== "all") arr = arr.filter(s => s.tier === filterTier);
    if (q.trim()) {
      const needle = q.toLowerCase();
      arr = arr.filter(s => s.name.toLowerCase().includes(needle) || s.slug.toLowerCase().includes(needle));
    }
    return arr.sort((a, b) => b.revenue_30d - a.revenue_30d);
  }, [enriched, filterTier, q]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Memuat data tier merchant…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" /> Program Tier Merchant
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Tier dihitung otomatis berdasarkan revenue 30 hari terakhir dan status KYC. Diperbarui setiap kali halaman dimuat.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["elite", "top_seller", "verified", "starter"] as Tier[]).map(tier => {
          const meta = TIER_META[tier];
          return (
            <button
              key={tier}
              onClick={() => setFilterTier(prev => prev === tier ? "all" : tier)}
              className={`rounded-xl border p-4 text-left transition-all ${filterTier === tier ? "ring-2 ring-primary" : "hover:bg-muted/40"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <TierBadge tier={tier} />
              </div>
              <div className="text-2xl font-bold tabular-nums">{tierCounts[tier]}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{meta.description}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Cari nama toko atau slug…"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterTier("all")} className={`px-3 py-1 rounded-full text-xs font-medium ${filterTier === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Semua ({enriched.length})</button>
          {(["elite", "top_seller", "verified", "starter"] as Tier[]).map(t => (
            <button key={t} onClick={() => setFilterTier(t)} className={`px-3 py-1 rounded-full text-xs font-medium ${filterTier === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {TIER_META[t].label} ({tierCounts[t]})
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Tidak ada toko yang cocok.
          </div>
        ) : (
          filtered.map(s => (
            <div key={s.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to="/admin/shops/$id" params={{ id: s.id }} className="font-semibold hover:underline truncate">
                    {s.name}
                  </Link>
                  <TierBadge tier={s.tier} />
                  {s.plan === "pro" && (
                    <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">PRO</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>@{s.slug}</span>
                  {s.rating_avg != null && (
                    <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {Number(s.rating_avg).toFixed(1)} ({s.rating_count ?? 0})</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                  {s.order_count_30d} pesanan
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Revenue: <span className="font-semibold text-foreground">Rp {s.revenue_30d.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20 p-4 text-sm">
        <p className="font-semibold text-amber-800 dark:text-amber-300 mb-2">💡 Kriteria Tier Otomatis</p>
        <ul className="space-y-1 text-amber-700 dark:text-amber-400 text-xs">
          <li><Crown className="inline h-3 w-3 mr-1" /><strong>Elite</strong> — Revenue ≥ Rp 50 juta dalam 30 hari terakhir</li>
          <li><Rocket className="inline h-3 w-3 mr-1" /><strong>Top Seller</strong> — Revenue ≥ Rp 10 juta dalam 30 hari terakhir</li>
          <li><BadgeCheck className="inline h-3 w-3 mr-1" /><strong>Verified</strong> — Status KYC disetujui (belum mencapai revenue Top Seller)</li>
          <li><Star className="inline h-3 w-3 mr-1" /><strong>Starter</strong> — Toko baru atau belum KYC</li>
        </ul>
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">Tier ini dihitung secara real-time dari data pesanan. Untuk menampilkan badge tier di halaman toko publik, tambahkan komponen TierBadge ke toko.$slug.tsx.</p>
      </div>
    </div>
  );
}
