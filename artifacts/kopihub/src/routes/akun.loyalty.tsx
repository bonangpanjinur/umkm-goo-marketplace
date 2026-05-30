import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Star, Gift, Zap, TrendingUp, Clock, Loader2,
  AlertTriangle, ShoppingBag, Trophy,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/akun/loyalty")({
  head: () => ({ meta: [{ title: "Poin Loyalty — UMKMgo" }] }), component: LoyaltyPage });

type LoyaltyPoint = {
  shop_id: string;
  balance: number;
  total_earned: number;
  total_redeemed: number;
  shop_name?: string;
};

type LoyaltyTx = {
  id: string;
  description: string;
  points: number;
  type: "earn" | "redeem" | "expire" | "adjustment";
  created_at: string;
  shop_name?: string;
};

const TIERS = [
  {
    name: "Bronze", min: 0, max: 999,
    color: "text-amber-700", bg: "bg-amber-50 border-amber-200",
    icon: "🥉", badge: "bg-amber-100 text-amber-800",
    perks: ["1 poin per Rp10.000 belanja", "Akses promo khusus member"],
  },
  {
    name: "Silver", min: 1000, max: 4999,
    color: "text-slate-600", bg: "bg-slate-50 border-slate-200",
    icon: "🥈", badge: "bg-slate-200 text-slate-800",
    perks: ["1.2× poin dari setiap transaksi", "Early access flash sale", "Gratis ongkir 2×/bulan"],
  },
  {
    name: "Gold", min: 5000, max: 9999,
    color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200",
    icon: "🥇", badge: "bg-yellow-100 text-yellow-800",
    perks: ["1.5× poin dari setiap transaksi", "Priority support", "Gratis ongkir unlimited", "Hadiah ulang tahun eksklusif"],
  },
  {
    name: "Platinum", min: 10000, max: Infinity,
    color: "text-purple-600", bg: "bg-purple-50 border-purple-200",
    icon: "💎", badge: "bg-purple-100 text-purple-800",
    perks: ["2× poin dari setiap transaksi", "Dedicated account manager", "Akses event eksklusif", "Cashback 5% setiap transaksi"],
  },
];

const REWARDS = [
  { id: "1", label: "Diskon Rp15.000",   points: 500,  icon: "🎟️" },
  { id: "2", label: "Diskon Rp35.000",   points: 1000, icon: "🎫" },
  { id: "3", label: "Gratis Ongkir",     points: 300,  icon: "🚚" },
  { id: "4", label: "Cashback Rp50.000", points: 1500, icon: "💸" },
];

function tierOf(totalEarned: number) {
  return TIERS.slice().reverse().find(t => totalEarned >= t.min) ?? TIERS[0];
}

function LoyaltyPage() {
  const { user } = useAuth();
  const [points, setPoints]   = useState<LoyaltyPoint[]>([]);
  const [txns, setTxns]       = useState<LoyaltyTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiryDays, setExpiryDays] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        // Load all loyalty_points for this user across all shops
        const { data: pts, error: pErr } = await supabase
          .from("loyalty_points")
          .select("shop_id, balance, total_earned, total_redeemed")
          .eq("user_id", user.id);

        if (pErr?.code === "42P01" || pErr?.message?.toLowerCase().includes("does not exist")) {
          // Table not yet created — silently show empty state
          setLoading(false);
          return;
        }

        if (!pErr && pts && pts.length > 0) {
          // Enrich with shop names
          const shopIds = pts.map((p: any) => p.shop_id);
          const { data: shops } = await supabase
            .from("shops")
            .select("id, name")
            .in("id", shopIds);
          const shopMap = Object.fromEntries((shops ?? []).map((s: any) => [s.id, s.name]));
          setPoints(pts.map((p: any) => ({ ...p, shop_name: shopMap[p.shop_id] ?? "Toko" })));

          // Load expiry setting from the first shop's loyalty_settings
          const { data: ls } = await supabase
            .from("loyalty_settings")
            .select("points_expire_days")
            .eq("shop_id", pts[0].shop_id)
            .maybeSingle();
          if (ls && (ls as any).points_expire_days) setExpiryDays((ls as any).points_expire_days);
        }

        // Load transaction history
        const { data: txData, error: txErr } = await supabase
          .from("loyalty_transactions" as any)
          .select("id, description, points, type, created_at, shop_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!txErr && txData) {
          setTxns(txData as unknown as LoyaltyTx[]);
        }
      } catch {
        // Silent — show empty state
      }
      setLoading(false);
    })();
  }, [user]);

  const totalBalance  = points.reduce((s, p) => s + p.balance, 0);
  const totalEarned   = points.reduce((s, p) => s + p.total_earned, 0);
  const totalRedeemed = points.reduce((s, p) => s + p.total_redeemed, 0);

  const currentTier = tierOf(totalEarned);
  const tierIdx     = TIERS.indexOf(currentTier);
  const nextTier    = TIERS[tierIdx + 1];
  const progress    = nextTier
    ? Math.min(100, ((totalEarned - currentTier.min) / (nextTier.min - currentTier.min)) * 100)
    : 100;

  // Expiry warning: if balance > 0 and expiryDays set
  const showExpiryWarning = expiryDays !== null && totalBalance > 0;

  if (loading) return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <Skeleton className="h-7 w-36" />
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-12 w-32" />
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-14 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Poin Loyalty
        </h1>
        <p className="text-sm text-muted-foreground">Kumpulkan poin dari setiap transaksi — naik tier, dapat lebih banyak keuntungan</p>
      </div>

      {/* Expiry warning */}
      {showExpiryWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Poin kamu akan kadaluarsa dalam {expiryDays} hari
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Segera tukarkan {totalBalance.toLocaleString("id-ID")} poin sebelum hangus
            </p>
          </div>
        </div>
      )}

      {/* Balance card */}
      <Card className="p-5 bg-gradient-to-br from-amber-500/10 via-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Saldo Poin Aktif</p>
            <p className="text-4xl font-black text-primary tabular-nums">{totalBalance.toLocaleString("id-ID")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Total earned: {totalEarned.toLocaleString()} · Ditukar: {totalRedeemed.toLocaleString()}
            </p>
          </div>
          <div className={`flex flex-col items-center px-4 py-2.5 rounded-xl border ${currentTier.bg}`}>
            <span className="text-2xl">{currentTier.icon}</span>
            <span className={`text-sm font-bold ${currentTier.color}`}>{currentTier.name}</span>
            <span className="text-[10px] text-muted-foreground mt-0.5">Tier kamu</span>
          </div>
        </div>

        {/* Progress to next tier */}
        {nextTier ? (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{totalEarned.toLocaleString()} poin earned</span>
              <span>{nextTier.min.toLocaleString()} → {nextTier.name} {nextTier.icon}</span>
            </div>
            <Progress value={progress} className="h-2.5" />
            <p className="text-xs text-muted-foreground mt-1.5">
              Butuh <strong className="text-foreground">{(nextTier.min - totalEarned).toLocaleString("id-ID")} poin lagi</strong> untuk naik ke {nextTier.name}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-purple-600 font-semibold">
            <Trophy className="h-4 w-4" />
            Tier tertinggi — selamat, Platinum Member! 🎉
          </div>
        )}
      </Card>

      {/* Per-shop breakdown */}
      {points.length > 1 && (
        <div>
          <p className="text-sm font-semibold mb-3">Poin per Toko</p>
          <div className="space-y-2">
            {points.map(p => (
              <div key={p.shop_id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <p className="text-sm font-medium">{p.shop_name}</p>
                <div className="text-right">
                  <p className="font-semibold text-primary">{p.balance.toLocaleString()} poin</p>
                  <p className="text-xs text-muted-foreground">earned {p.total_earned.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tukar poin */}
      <div>
        <p className="text-sm font-semibold mb-3">Tukar Poin</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {REWARDS.map(r => {
            const canRedeem = totalBalance >= r.points;
            return (
              <Card key={r.id} className={`p-3 flex items-center gap-3 transition-all ${!canRedeem ? "opacity-55" : "hover:border-primary/50"}`}>
                <span className="text-2xl">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {r.points.toLocaleString()} poin
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={canRedeem ? "default" : "outline"}
                  disabled={!canRedeem}
                  className="shrink-0"
                >
                  Tukar
                </Button>
              </Card>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Fitur tukar poin segera tersedia — hubungi toko untuk redeem manual.</p>
      </div>

      {/* Tier benefits */}
      <div>
        <p className="text-sm font-semibold mb-3">Semua Tier & Keuntungan</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TIERS.map((tier, i) => {
            const isActive = tier.name === currentTier.name;
            const isPassed = tierIdx > i;
            return (
              <Card key={tier.name} className={`p-3 border transition-all ${isActive ? "border-primary ring-1 ring-primary/30" : ""}`}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-xl">{tier.icon}</span>
                  <span className={`font-bold ${tier.color}`}>{tier.name}</span>
                  {isActive && <Badge className="ml-auto text-[10px] h-5">Level Kamu</Badge>}
                  {isPassed && <span className="ml-auto text-[10px] text-green-600 font-semibold">✓ Terlewati</span>}
                  {!isActive && !isPassed && tier.min > 0 && (
                    <span className="ml-auto text-[10px] text-muted-foreground">{tier.min.toLocaleString()}+ poin</span>
                  )}
                </div>
                <ul className="space-y-1">
                  {tier.perks.map(p => (
                    <li key={p} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <Zap className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <p className="text-sm font-semibold mb-3">Riwayat Poin</p>
        {txns.length === 0 ? (
          <Card className="p-8 text-center">
            <ShoppingBag className="h-8 w-8 mx-auto text-muted-foreground opacity-30 mb-2" />
            <p className="text-sm text-muted-foreground">Belum ada riwayat transaksi poin</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {txns.map(t => (
              <Card key={t.id} className="flex items-center gap-3 p-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  t.type === "earn" ? "bg-green-100" :
                  t.type === "redeem" ? "bg-blue-100" :
                  t.type === "expire" ? "bg-red-100" : "bg-muted"
                }`}>
                  {t.type === "earn"   ? <TrendingUp className="h-4 w-4 text-green-600" /> :
                   t.type === "redeem" ? <Gift className="h-4 w-4 text-blue-600" /> :
                                         <Clock className="h-4 w-4 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                    {t.shop_name ? ` · ${t.shop_name}` : ""}
                  </p>
                </div>
                <span className={`font-bold text-sm shrink-0 tabular-nums ${t.points > 0 ? "text-green-600" : "text-red-500"}`}>
                  {t.points > 0 ? "+" : ""}{t.points.toLocaleString()}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* CTA to shop */}
      <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 text-center">
        <p className="text-sm font-semibold mb-1">Kumpulkan lebih banyak poin</p>
        <p className="text-xs text-muted-foreground mb-3">Belanja di toko-toko UMKMgo untuk naik tier lebih cepat</p>
        <Link to="/">
          <Button size="sm" className="gap-2">
            <ShoppingBag className="h-4 w-4" /> Mulai Belanja
          </Button>
        </Link>
      </Card>
    </div>
  );
}
