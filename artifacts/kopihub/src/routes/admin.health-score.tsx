import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Heart, TrendingUp, Star, Package } from "lucide-react";

export const Route = createFileRoute("/admin/health-score")({
  head: () => ({ meta: [{ title: "Health Score Toko — Super Admin" }] }),
  component: HealthScorePage,
});

type Row = {
  shop_id: string;
  shop_name: string;
  slug: string;
  product_count: number;
  orders_last_30d: number;
  revenue_last_30d: number;
  avg_rating: number;
  review_count: number;
  health_score: number;
};

function HealthScorePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"score" | "revenue" | "orders">("score");

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any).from("shop_health_score").select("*").limit(500);
      if (!error) setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>;

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === "revenue") return b.revenue_last_30d - a.revenue_last_30d;
    if (sortBy === "orders")  return b.orders_last_30d  - a.orders_last_30d;
    return b.health_score - a.health_score;
  });

  const avgScore = rows.length ? Math.round(rows.reduce((s, r) => s + r.health_score, 0) / rows.length) : 0;
  const healthy  = rows.filter(r => r.health_score >= 70).length;
  const atRisk   = rows.filter(r => r.health_score < 40).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Heart className="h-5 w-5 text-rose-500" /> Health Score Toko</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Skor 0–100 berdasarkan jumlah produk, order 30 hari, rating, dan aktivitas.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Rata-rata skor" value={avgScore} icon={<TrendingUp className="h-4 w-4 text-primary" />} />
        <Stat label="Toko sehat (≥70)" value={healthy} icon={<Heart className="h-4 w-4 text-emerald-500" />} />
        <Stat label="Berisiko (<40)" value={atRisk} icon={<Heart className="h-4 w-4 text-rose-500" />} />
        <Stat label="Total toko" value={rows.length} icon={<Package className="h-4 w-4 text-muted-foreground" />} />
      </div>

      <div className="flex gap-2 text-xs">
        {[["score","Skor"],["revenue","Omset 30d"],["orders","Order 30d"]].map(([k, l]) => (
          <button key={k} onClick={() => setSortBy(k as any)}
            className={`px-3 py-1 rounded-full font-medium ${sortBy===k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Toko</th>
              <th className="text-right p-3">Skor</th>
              <th className="text-right p-3">Produk</th>
              <th className="text-right p-3">Order 30d</th>
              <th className="text-right p-3">Omset 30d</th>
              <th className="text-right p-3">Rating</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.shop_id} className="border-t border-border hover:bg-muted/20">
                <td className="p-3">
                  <Link to="/admin/health-score/$shopId" params={{ shopId: r.shop_id }} className="font-medium hover:text-primary">{r.shop_name}</Link>
                  <div className="text-[11px] text-muted-foreground">/{r.slug}</div>
                </td>
                <td className="p-3 text-right">
                  <span className={`inline-block min-w-[42px] text-center font-semibold rounded-full px-2 py-0.5 text-xs ${
                    r.health_score >= 70 ? "bg-emerald-100 text-emerald-700"
                    : r.health_score >= 40 ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
                  }`}>{r.health_score}</span>
                </td>
                <td className="p-3 text-right tabular-nums">{r.product_count}</td>
                <td className="p-3 text-right tabular-nums">{r.orders_last_30d}</td>
                <td className="p-3 text-right tabular-nums">Rp {Number(r.revenue_last_30d).toLocaleString("id-ID")}</td>
                <td className="p-3 text-right tabular-nums">
                  {r.review_count > 0 ? (
                    <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 text-amber-500 fill-amber-500" /> {Number(r.avg_rating).toFixed(1)}</span>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
