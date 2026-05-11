import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, MessageSquare, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/reviews")({
  head: () => ({ meta: [{ title: "Ulasan Pelanggan" }] }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const { shop } = useCurrentShop();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<string | null>(null);

  const load = async () => {
    if (!shop?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("product_reviews")
      .select("id, rating, comment, photos, is_verified_purchase, shop_reply, shop_replied_at, created_at, product:menu_items(name)")
      .eq("shop_id", shop.id)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(50);
    setReviews(data || []);
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
    else { toast.success("Balasan terkirim"); setReplyDraft({ ...replyDraft, [reviewId]: "" }); load(); }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Star className="h-5 w-5" /> Ulasan Pelanggan</h1>
        <p className="text-sm text-muted-foreground">Balas ulasan untuk meningkatkan kepercayaan pembeli</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : reviews.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Belum ada ulasan</CardContent></Card>
      ) : (
        reviews.map(r => (
          <Card key={r.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm">{r.product?.name || "Produk"}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex">
                      {[1,2,3,4,5].map(n => <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />)}
                    </div>
                    {r.is_verified_purchase && <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700"><BadgeCheck className="h-3 w-3" />Terverifikasi</span>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("id-ID")}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {r.comment && <p className="text-sm whitespace-pre-line">{r.comment}</p>}
              {r.photos?.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {r.photos.map((url: string) => <a key={url} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="" className="h-16 w-16 rounded object-cover border" /></a>)}
                </div>
              )}

              {r.shop_reply ? (
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs font-semibold text-primary mb-1 flex items-center gap-1"><MessageSquare className="h-3 w-3" />Balasanmu · {new Date(r.shop_replied_at).toLocaleDateString("id-ID")}</div>
                  <p className="text-sm whitespace-pre-line">{r.shop_reply}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea placeholder="Tulis balasan…" rows={2} value={replyDraft[r.id] || ""} onChange={(e) => setReplyDraft({ ...replyDraft, [r.id]: e.target.value })} maxLength={1000} />
                  <Button size="sm" onClick={() => reply(r.id)} disabled={replying === r.id}>
                    {replying === r.id ? "Mengirim…" : "Balas"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
