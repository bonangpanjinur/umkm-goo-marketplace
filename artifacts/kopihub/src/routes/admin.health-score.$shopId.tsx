import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Heart, ChevronLeft, Package, ShoppingBag, Star, Clock, ExternalLink } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

export const Route = createFileRoute("/admin/health-score/$shopId")({
  head: () => ({ meta: [{ title: "Detail Health Score — Super Admin" }] }),
  component: HealthScoreDetailPage,
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
  shop_created_at: string;
  health_score: number;
};

// Mirror of the SQL formula in shop_health_score view so we can show component breakdown.
function computeBreakdown(r: Row) {
  const productScore = r.product_count >= 5 ? 20 : r.product_count * 4;
  const orderScore   = r.orders_last_30d >= 20 ? 30 : Math.round(r.orders_last_30d * 1.5);
  const ratingScore  = r.avg_rating >= 4 ? 25 : Math.round(r.avg_rating * 5);
  const ageDays      = (Date.now() - new Date(r.shop_created_at).getTime()) / 86400000;
  const recencyScore = ageDays < 30 ? 25 : 15;
  const total = Math.min(100, productScore + orderScore + ratingScore + recencyScore);
  return [
    { key: "product", label: "Produk Aktif", score: productScore, max: 20, raw: `${r.product_count} produk`, color: "#10b981" },
    { key: "orders",  label: "Order 30 Hari", score: orderScore,   max: 30, raw: `${r.orders_last_30d} order`, color: "#3b82f6" },
    { key: "rating",  label: "Rating",        score: ratingScore,  max: 25, raw: r.review_count > 0 ? `${Number(r.avg_rating).toFixed(2)} (${r.review_count})` : "Belum ada", color: "#f59e0b" },
    { key: "recency", label: "Recency Toko",  score: recencyScore, max: 25, raw: ageDays < 30 ? "Toko baru" : `${Math.round(ageDays)} hari`, color: "#8b5cf6" },
  ].map(c => ({ ...c, percent: Math.round((c.score / c.max) * 100), totalScore: total }));
}

function HealthScoreDetailPage() {
  const { shopId } = Route.useParams();
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("shop_health_score")
        .select("*")
        .eq("shop_id", shopId)
        .maybeSingle();
      setRow(data as Row | null);
      setLoading(false);
    })();
  }, [shopId]);

  const breakdown = useMemo(() => row ? computeBreakdown(row) : [], [row]);
  const total = breakdown[0]?.totalScore ?? 0;

  if (loading) return <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>;
  if (!row)    return <div className="p-6"><Link to="/admin/health-score" className="text-primary hover:underline">← Kembali</Link><p className="mt-4">Toko tidak ditemukan.</p></div>;

  const tone = total >= 70 ? { bg: "bg-emerald-100", text: "text-emerald-700", label: "Sehat" }
             : total >= 40 ? { bg: "bg-amber-100",   text: "text-amber-700",   label: "Perlu perhatian" }
             :               { bg: "bg-rose-100",    text: "text-rose-700",    label: "Berisiko" };

  const radialData = [{ name: "score", value: total, fill: total >= 70 ? "#10b981" : total >= 40 ? "#f59e0b" : "#ef4444" }];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link to="/admin/health-score" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Heart className="h-5 w-5 text-rose-500" /> {row.shop_name}</h1>
          <a href={`/toko/${row.slug}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
            /{row.slug} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tone.bg} ${tone.text}`}>{tone.label}</span>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 md:col-span-1">
          <div className="text-xs text-muted-foreground">Total Skor</div>
          <div className="h-44 -mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "hsl(var(--muted))" }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="-mt-32 flex flex-col items-center text-center pointer-events-none">
            <div className="text-4xl font-bold tabular-nums">{total}</div>
            <div className="text-[11px] text-muted-foreground">dari 100</div>
          </div>
          <div className="mt-20 text-[11px] text-muted-foreground text-center">Skor dihitung otomatis dari komponen di samping.</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 md:col-span-2">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Komponen Skor</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={breakdown} layout="vertical" margin={{ left: 16, right: 24, top: 8, bottom: 8 }}>
              <XAxis type="number" domain={[0, 30]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={110} />
              <Tooltip
                formatter={(_v: any, _n: any, item: any) => [`${item.payload.score} / ${item.payload.max} (${item.payload.raw})`, "Kontribusi"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                {breakdown.map(b => <Cell key={b.key} fill={b.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {breakdown.map(c => (
          <div key={c.key} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {c.key === "product" && <Package className="h-3.5 w-3.5" />}
              {c.key === "orders"  && <ShoppingBag className="h-3.5 w-3.5" />}
              {c.key === "rating"  && <Star className="h-3.5 w-3.5" />}
              {c.key === "recency" && <Clock className="h-3.5 w-3.5" />}
              {c.label}
            </div>
            <div className="mt-1 text-xl font-bold tabular-nums">{c.score}<span className="text-xs text-muted-foreground font-normal">/{c.max}</span></div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{c.raw}</div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${c.percent}%`, background: c.color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground space-y-2">
        <div className="font-semibold text-foreground text-sm">Cara meningkatkan skor</div>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Produk Aktif</strong>: tambahkan minimal 5 produk aktif untuk skor maksimal (20 poin).</li>
          <li><strong>Order 30 Hari</strong>: 20 order dalam 30 hari terakhir = skor maksimal (30 poin).</li>
          <li><strong>Rating</strong>: pertahankan rating ≥ 4.0 untuk skor maksimal (25 poin).</li>
          <li><strong>Recency</strong>: toko baru (&lt;30 hari) otomatis dapat 25 poin sebagai onboarding boost.</li>
        </ul>
      </div>
    </div>
  );
}
