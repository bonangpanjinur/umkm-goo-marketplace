import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Star, Gift, Zap, Trophy, Clock, ShoppingBag, Loader2, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/akun/loyalty")({ component: LoyaltyPage });

type Transaction = {
  id: string;
  description: string;
  points: number;
  type: "earn" | "redeem" | "expire";
  created_at: string;
};

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: "1", description: "Pembelian di KopiHub Pusat", points: 150, type: "earn", created_at: "2026-05-10" },
  { id: "2", description: "Tukar poin — Diskon Rp15.000", points: -500, type: "redeem", created_at: "2026-05-05" },
  { id: "3", description: "Pembelian di KopiHub Selatan", points: 200, type: "earn", created_at: "2026-05-01" },
  { id: "4", description: "Bonus ulang tahun", points: 300, type: "earn", created_at: "2026-04-15" },
  { id: "5", description: "Pembelian di KopiHub Pusat", points: 100, type: "earn", created_at: "2026-04-10" },
];

const TIERS = [
  { name: "Bronze", min: 0,    max: 999,  color: "text-amber-700", bg: "bg-amber-100",  icon: "🥉", perks: ["1 poin per Rp1.000 belanja", "Akses promo khusus member"] },
  { name: "Silver", min: 1000, max: 4999, color: "text-slate-500", bg: "bg-slate-100",  icon: "🥈", perks: ["1.2 poin per Rp1.000 belanja", "Early access flash sale", "Gratis ongkir 2×/bulan"] },
  { name: "Gold",   min: 5000, max: 9999, color: "text-yellow-500", bg: "bg-yellow-100", icon: "🥇", perks: ["1.5 poin per Rp1.000 belanja", "Priority support", "Gratis ongkir unlimited", "Hadiah ulang tahun"] },
  { name: "Platinum",min:10000,max:Infinity,color:"text-purple-600",bg:"bg-purple-100",icon:"💎",perks:["2 poin per Rp1.000 belanja","Dedicated account manager","Akses event eksklusif","Cashback 5%"]},
];

const REWARDS = [
  { id: "1", label: "Diskon Rp15.000",  points: 500,  icon: "🎟️" },
  { id: "2", label: "Diskon Rp35.000",  points: 1000, icon: "🎫" },
  { id: "3", label: "Gratis Ongkir",    points: 300,  icon: "🚚" },
  { id: "4", label: "Cashback Rp50.000",points: 1500, icon: "💸" },
];

export default function LoyaltyPage() {
  const { user } = useAuth();
  const [transactions] = useState<Transaction[]>(DEMO_TRANSACTIONS);
  const [loading] = useState(false);

  const totalPoints = transactions.reduce((s, t) => s + t.points, 0);
  const currentTier = TIERS.slice().reverse().find(t => totalPoints >= t.min) ?? TIERS[0];
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1];
  const progress = nextTier
    ? Math.min(100, ((totalPoints - currentTier.min) / (nextTier.min - currentTier.min)) * 100)
    : 100;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Poin Loyalty
        </h1>
        <p className="text-sm text-muted-foreground">Kumpulkan poin dari setiap transaksi di semua toko KopiHub</p>
      </div>

      <Card className="p-5 bg-gradient-to-br from-amber-500/10 to-primary/10 border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Total Poin Aktif</p>
            <p className="text-4xl font-black text-primary">{totalPoints.toLocaleString("id-ID")}</p>
          </div>
          <div className={`text-center px-4 py-2 rounded-xl ${currentTier.bg}`}>
            <p className="text-2xl">{currentTier.icon}</p>
            <p className={`text-sm font-bold ${currentTier.color}`}>{currentTier.name}</p>
          </div>
        </div>
        {nextTier && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{totalPoints.toLocaleString()} poin</span>
              <span>{nextTier.min.toLocaleString()} poin → {nextTier.name}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Butuh <strong>{(nextTier.min - totalPoints).toLocaleString("id-ID")} poin</strong> lagi untuk naik ke {nextTier.name}
            </p>
          </div>
        )}
      </Card>

      <div>
        <p className="text-sm font-semibold mb-3">Tukar Poin</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {REWARDS.map(r => (
            <Card key={r.id} className={`p-3 flex items-center gap-3 ${totalPoints < r.points ? "opacity-60" : ""}`}>
              <span className="text-2xl">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {r.points.toLocaleString()} poin
                </p>
              </div>
              <Button size="sm" variant={totalPoints >= r.points ? "default" : "outline"} disabled={totalPoints < r.points} className="shrink-0">
                Tukar
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold mb-2">Tier & Keuntungan</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TIERS.map(tier => (
            <Card key={tier.name} className={`p-3 ${currentTier.name === tier.name ? "border-primary ring-1 ring-primary/30" : ""}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{tier.icon}</span>
                <span className={`font-semibold ${tier.color}`}>{tier.name}</span>
                {currentTier.name === tier.name && <Badge className="text-xs h-5 ml-auto">Level Kamu</Badge>}
                {tier.min > 0 && currentTier.name !== tier.name && <span className="text-xs text-muted-foreground ml-auto">{tier.min.toLocaleString()}+ poin</span>}
              </div>
              <ul className="space-y-0.5">
                {tier.perks.map(p => (
                  <li key={p} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-primary shrink-0" /> {p}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold mb-3">Riwayat Poin</p>
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {transactions.map(t => (
              <Card key={t.id} className="flex items-center gap-3 p-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.type === "earn" ? "bg-green-100" : t.type === "redeem" ? "bg-blue-100" : "bg-red-100"}`}>
                  {t.type === "earn" ? <TrendingUp className="h-4 w-4 text-green-600" /> : t.type === "redeem" ? <Gift className="h-4 w-4 text-blue-600" /> : <Clock className="h-4 w-4 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</p>
                </div>
                <span className={`font-bold text-sm shrink-0 ${t.points > 0 ? "text-green-600" : "text-red-500"}`}>
                  {t.points > 0 ? "+" : ""}{t.points.toLocaleString()}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
