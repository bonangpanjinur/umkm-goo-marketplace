import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, MessageSquare, BadgeCheck, EyeOff, RefreshCw, BarChart2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/reviews")({
  head: () => ({ meta: [{ title: "Ulasan Pelanggan" }] }),
  component: ReviewsPage,
});

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  photos: string[] | null;
  is_verified_purchase: boolean;
  is_hidden: boolean;
  shop_reply: string | null;
  shop_replied_at: string | null;
  created_at: string;
  product: { name: string } | null;
};

function StarRow({ rating, count, total }: { rating: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-3 text-right text-muted-foreground">{rating}</span>
      <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-4 text-right text-muted-foreground">{count}</span>
    </div>
  );
}

function ReviewsPage() {
  const { shop } = useCurrentShop();
  const [reviews,    setReviews]    = useState<Review[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [replying,   setReplying]   = useState<string | null>(null);
  const [hiding,     setHiding]     = useState<string | null>(null);
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [filterReply,setFilterReply]= useState<"all" | "pending" | "replied">("all");
  const [sort,       setSort]       = useState<"newest" | "oldest" | "lowest">("newest");

  const load = async () => {
    if (!shop?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("product_reviews")
      .select("id, rating, comment, photos, is_verified_purchase, is_hidden, shop_reply, shop_replied_at, created_at, product:menu_items(name)")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setReviews((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [shop?.id]);

  const reply = async (reviewId: string) => {
    const text = replyDraft[reviewId]?.trim();
    if (!text) { toast.error("Tulis balasan"); return; }
    setReplying(reviewId);
    const { error } = await supabase.from("product_reviews").update({
      shop_reply: text.slice(0, 1000),
      shop_replied_at: new Date().toISOString(),
    }).eq("id", reviewId);
    setReplying(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Balasan terkirim");
      setReplyDraft(d => ({ ...d, [reviewId]: "" }));
      load();
    }
  };

  const toggleHide = async (r: Review) => {
    setHiding(r.id);
    const { error } = await supabase.from("product_reviews").update({ is_hidden: !r.is_hidden }).eq("id", r.id);
    setHiding(null);
    if (error) toast.error(error.message);
    else {
      toast.success(r.is_hidden ? "Ulasan ditampilkan" : "Ulasan disembunyikan");
      load();
    }
  };

  // Stats
  const starCounts = useMemo(() => {
    const visible = reviews.filter(r => !r.is_hidden);
    const counts = [0, 0, 0, 0, 0];
    visible.forEach(r => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++; });
    return counts;
  }, [reviews]);
  const total = starCounts.reduce((s, c) => s + c, 0);
  const avg = total > 0 ? (reviews.filter(r => !r.is_hidden).reduce((s, r) => s + r.rating, 0) / total) : 0;
  const pendingCount = reviews.filter(r => !r.is_hidden && !r.shop_reply).length;

  // Filtered + sorted
  const visible = useMemo(() => {
    let list = [...reviews];
    if (filterStar !== null) list = list.filter(r => r.rating === filterStar);
    if (filterReply === "pending") list = list.filter(r => !r.shop_reply && !r.is_hidden);
    if (filterReply === "replied") list = list.filter(r => !!r.shop_reply);
    if (sort === "newest")  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sort === "oldest")  list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (sort === "lowest")  list.sort((a, b) => a.rating - b.rating);
    return list;
  }, [reviews, filterStar, filterReply, sort]);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Star className="h-5 w-5 fill-amber-400 text-amber-400" /> Ulasan Pelanggan</h1>
          <p className="text-sm text-muted-foreground">Balas ulasan untuk meningkatkan kepercayaan pembeli</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stats */}
      {!loading && total > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 grid sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold">{avg.toFixed(1)}</div>
              <div className="flex justify-center mt-1">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className={`h-3.5 w-3.5 ${n <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{total} ulasan</div>
            </div>
            <div className="flex-1 space-y-1">
              {[5,4,3,2,1].map(s => <StarRow key={s} rating={s} count={starCounts[s-1]} total={total} />)}
            </div>
          </div>
          <div className="flex flex-col justify-center gap-2 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2.5">
              <span className="text-amber-700 font-medium">Perlu dibalas</span>
              <span className="text-2xl font-bold text-amber-700">{pendingCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5">
              <span className="text-muted-foreground">Sudah dibalas</span>
              <span className="text-lg font-semibold">{reviews.filter(r => !!r.shop_reply).length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Star filter */}
        <div className="flex gap-1">
          <button
            onClick={() => setFilterStar(null)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${filterStar === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >Semua ★</button>
          {[5,4,3,2,1].map(s => (
            <button
              key={s}
              onClick={() => setFilterStar(filterStar === s ? null : s)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${filterStar === s ? "bg-amber-400 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >★{s}</button>
          ))}
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Reply filter */}
        {(["all", "pending", "replied"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterReply(f)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${filterReply === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {f === "all" ? "Semua" : f === "pending" ? `Belum dibalas${pendingCount > 0 ? ` (${pendingCount})` : ""}` : "Sudah dibalas"}
          </button>
        ))}

        <div className="h-4 w-px bg-border" />

        {/* Sort */}
        <select
          value={sort}
          onChange={e => setSort(e.target.value as typeof sort)}
          className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground"
        >
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
          <option value="lowest">Rating terendah</option>
        </select>

        <span className="ml-auto text-xs text-muted-foreground">{visible.length} ulasan</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <Star className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">Tidak ada ulasan yang cocok dengan filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(r => (
            <div key={r.id} className={`rounded-xl border bg-card overflow-hidden transition-opacity ${r.is_hidden ? "opacity-50 border-dashed" : "border-border"}`}>
              <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{(r.product as any)?.name || "Produk"}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex">
                      {[1,2,3,4,5].map(n => <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />)}
                    </div>
                    {r.is_verified_purchase && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 rounded-full px-1.5 py-0.5">
                        <BadgeCheck className="h-3 w-3" />Terverifikasi
                      </span>
                    )}
                    {r.is_hidden && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 rounded-full px-1.5 py-0.5">
                        <EyeOff className="h-3 w-3" />Tersembunyi
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}</span>
                  <button
                    onClick={() => toggleHide(r)}
                    disabled={hiding === r.id}
                    title={r.is_hidden ? "Tampilkan ulasan" : "Sembunyikan ulasan"}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {hiding === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="px-4 py-3 space-y-3">
                {r.comment && <p className="text-sm whitespace-pre-line">{r.comment}</p>}
                {r.photos && r.photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {r.photos.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover border border-border hover:opacity-90 transition" />
                      </a>
                    ))}
                  </div>
                )}

                {r.shop_reply ? (
                  <div className="rounded-lg bg-muted/60 border border-border/60 p-3">
                    <div className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Balasanmu · {new Date(r.shop_replied_at!).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </div>
                    <p className="text-sm whitespace-pre-line">{r.shop_reply}</p>
                  </div>
                ) : !r.is_hidden ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Tulis balasan yang ramah dan profesional…"
                      rows={2}
                      value={replyDraft[r.id] || ""}
                      onChange={e => setReplyDraft(d => ({ ...d, [r.id]: e.target.value }))}
                      maxLength={1000}
                      className="text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => reply(r.id)} disabled={replying === r.id || !replyDraft[r.id]?.trim()}>
                        {replying === r.id ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Mengirim…</> : "Balas"}
                      </Button>
                      <span className="text-xs text-muted-foreground">{(replyDraft[r.id] || "").length}/1000</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
