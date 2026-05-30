import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Star, ShoppingBag, Users, BadgeCheck, Store, Trophy } from "lucide-react";
import { TrustCertBadge, computeTrustCert } from "@/components/TrustCertBadge";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard Toko Terbaik — UMKMgo" }] }),
  component: LeaderboardPage,
});

type ShopEntry = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  tagline: string | null;
  avg_rating: number;
  review_count: number;
  reply_rate: number;
  order_count: number;
  follower_count: number;
  is_verified: boolean;
  has_trust_cert: boolean;
  score: number;
};

type Category = { label: string; icon: React.ElementType; field: keyof ShopEntry };

const CATEGORIES: Category[] = [
  { label: "Rating Tertinggi",   icon: Star,        field: "avg_rating"    },
  { label: "Terlaris",           icon: ShoppingBag, field: "order_count"   },
  { label: "Terbanyak Pengikut", icon: Users,       field: "follower_count" },
  { label: "Skor Terbaik",       icon: Trophy,      field: "score"          },
];

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
      #{rank}
    </span>
  );
}

function StarDisplay({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1,2,3,4,5].map(n => (
          <Star key={n} className={`h-3.5 w-3.5 ${n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`} />
        ))}
      </div>
      <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  );
}

function LeaderboardPage() {
  const [shops, setShops]     = useState<ShopEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [catIdx, setCatIdx]   = useState(3);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1. Shops
      const { data: shopData } = await supabase
        .from("shops")
        .select("id, name, slug, logo_url, tagline, is_kyc_verified")
        .eq("is_active", true)
        .order("created_at")
        .limit(200);

      if (!shopData || shopData.length === 0) { setLoading(false); return; }

      const shopIds = shopData.map(s => s.id);

      // 2. Review stats (avg rating + count + reply count)
      const { data: revData } = await supabase
        .from("product_reviews")
        .select("shop_id, rating, shop_reply")
        .in("shop_id", shopIds)
        .eq("is_hidden", false);

      const reviewMap: Record<string, { sum: number; count: number; replied: number }> = {};
      for (const r of revData ?? []) {
        if (!reviewMap[r.shop_id]) reviewMap[r.shop_id] = { sum: 0, count: 0, replied: 0 };
        reviewMap[r.shop_id].sum    += r.rating;
        reviewMap[r.shop_id].count  += 1;
        if (r.shop_reply) reviewMap[r.shop_id].replied += 1;
      }

      // 3. Completed order count
      const { data: ordData } = await supabase
        .from("orders")
        .select("shop_id")
        .in("shop_id", shopIds)
        .eq("status", "completed");

      const orderMap: Record<string, number> = {};
      for (const o of ordData ?? []) {
        orderMap[o.shop_id] = (orderMap[o.shop_id] ?? 0) + 1;
      }

      // 4. Follower count (table may not exist — fail silently)
      const followMap: Record<string, number> = {};
      try {
        const { data: followData } = await supabase
          .from("shop_follows" as any)
          .select("shop_id")
          .in("shop_id", shopIds);
        for (const f of (followData ?? []) as any[]) {
          followMap[f.shop_id] = (followMap[f.shop_id] ?? 0) + 1;
        }
      } catch (_) {}

      // 5. Assemble entries
      const entries: ShopEntry[] = shopData.map(s => {
        const rev       = reviewMap[s.id] ?? { sum: 0, count: 0, replied: 0 };
        const avg       = rev.count > 0 ? rev.sum / rev.count : 0;
        const replyRate = rev.count > 0 ? rev.replied / rev.count : 0;
        const orders    = orderMap[s.id] ?? 0;
        const follows   = followMap[s.id] ?? 0;
        const cert      = computeTrustCert(
          Math.round(avg * 10) / 10,
          rev.count,
          replyRate,
        );
        const score = (avg * Math.min(rev.count, 100)) * 0.4
                    + Math.min(orders, 1000)            * 0.4
                    + Math.min(follows, 500)             * 0.2;
        return {
          id:             s.id,
          name:           s.name,
          slug:           s.slug,
          logo_url:       s.logo_url,
          tagline:        s.tagline,
          avg_rating:     Math.round(avg * 10) / 10,
          review_count:   rev.count,
          reply_rate:     replyRate,
          order_count:    orders,
          follower_count: follows,
          is_verified:    Boolean((s as any).is_kyc_verified),
          has_trust_cert: cert.earned,
          score:          Math.round(score),
        };
      }).filter(s => s.review_count > 0 || s.order_count > 0);

      setShops(entries);
      setLoading(false);
    })();
  }, []);

  const cat    = CATEGORIES[catIdx];
  const sorted = [...shops].sort((a, b) => (b[cat.field] as number) - (a[cat.field] as number)).slice(0, 50);
  const top3   = sorted.slice(0, 3);
  const rest   = sorted.slice(3);

  const certCount = shops.filter(s => s.has_trust_cert).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/60 via-background to-background">
      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white py-12 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <Trophy className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Leaderboard Toko Terbaik</h1>
          <p className="mt-2 text-amber-100 text-sm">
            Ranking toko berdasarkan rating, pesanan, dan popularitas di UMKMgo
          </p>
          {certCount > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {certCount} toko meraih Sertifikat Toko Terpercaya
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Category switcher */}
        <div className="flex gap-2 flex-wrap justify-center">
          {CATEGORIES.map((c, i) => (
            <button
              key={c.label}
              onClick={() => setCatIdx(i)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                catIdx === i
                  ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                  : "bg-card border border-border text-muted-foreground hover:border-amber-300 hover:text-amber-700"
              }`}
            >
              <c.icon className="h-3.5 w-3.5" />
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3 flex flex-col items-center">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-14 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Store className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Belum ada toko yang memenuhi syarat.</p>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {top3.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-3">
                {top3.map((s, i) => (
                  <Link
                    key={s.id}
                    to="/toko/$slug"
                    params={{ slug: s.slug }}
                    className={`relative rounded-2xl border bg-card p-4 text-center hover:shadow-md transition-shadow group ${
                      i === 0 ? "border-amber-300 bg-amber-50/60 shadow-sm" :
                      i === 1 ? "border-slate-300 bg-slate-50/60" :
                      "border-orange-300 bg-orange-50/60"
                    }`}
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <RankMedal rank={i + 1} />
                    </div>
                    <div className="mt-3 flex justify-center mb-3">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt={s.name} className="h-14 w-14 rounded-xl object-cover border-2 border-white shadow" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100 border-2 border-white shadow">
                          <Store className="h-7 w-7 text-amber-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-1 mb-0.5 flex-wrap">
                      <p className="text-sm font-bold group-hover:text-primary transition-colors">{s.name}</p>
                      {s.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </div>
                    {/* Trust Cert badge on top-3 cards */}
                    {s.has_trust_cert && (
                      <div className="flex justify-center mb-1.5">
                        <TrustCertBadge size="sm" />
                      </div>
                    )}
                    {s.tagline && <p className="text-[11px] text-muted-foreground truncate mb-2">{s.tagline}</p>}
                    <div className="flex justify-center">
                      <StarDisplay rating={s.avg_rating} count={s.review_count} />
                    </div>
                    <div className="mt-2 flex justify-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><ShoppingBag className="h-3 w-3" />{s.order_count}</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{s.follower_count}</span>
                    </div>
                    {cat.field === "score" && (
                      <div className="mt-2 rounded-full bg-amber-100 px-2 py-0.5 inline-block text-[10px] font-bold text-amber-700">
                        Skor {s.score}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}

            {/* Rank 4+ list */}
            {rest.length > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border bg-muted/30 px-4 py-2.5">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {cat.label} — Rank 4 dan seterusnya
                  </p>
                </div>
                <ul className="divide-y divide-border">
                  {rest.map((s, i) => (
                    <li key={s.id}>
                      <Link
                        to="/toko/$slug"
                        params={{ slug: s.slug }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors group"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                          {i + 4}
                        </span>
                        {s.logo_url ? (
                          <img src={s.logo_url} alt={s.name} className="h-10 w-10 rounded-lg object-cover border border-border shrink-0" />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                            <Store className="h-5 w-5 text-amber-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{s.name}</p>
                            {s.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                            {s.has_trust_cert && <TrustCertBadge size="sm" />}
                          </div>
                          {s.tagline && <p className="text-xs text-muted-foreground truncate">{s.tagline}</p>}
                        </div>
                        <div className="shrink-0 text-right space-y-0.5">
                          <StarDisplay rating={s.avg_rating} count={s.review_count} />
                          <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5"><ShoppingBag className="h-3 w-3" />{s.order_count}</span>
                            <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{s.follower_count}</span>
                            {cat.field === "score" && (
                              <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">{s.score}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer */}
            <p className="text-center text-xs text-muted-foreground py-2">
              Ranking diperbarui real-time berdasarkan rating ulasan, volume pesanan, dan pengikut.
              <br />
              <span className="text-emerald-600 font-medium">Sertifikat Toko Terpercaya</span>
              {" "}diberikan kepada toko dengan rating ≥ 4.5, ≥ 50 ulasan, dan tingkat balas {">"} 80%.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
