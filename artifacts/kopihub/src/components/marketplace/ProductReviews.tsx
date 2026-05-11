import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, BadgeCheck, Loader2 } from "lucide-react";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  photos: string[] | null;
  is_verified_purchase: boolean;
  shop_reply: string | null;
  shop_replied_at: string | null;
  created_at: string;
};

export function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("product_reviews")
        .select("id, rating, comment, photos, is_verified_purchase, shop_reply, shop_replied_at, created_at")
        .eq("product_id", productId)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(20);
      setReviews((data as any) || []);
      setLoading(false);
    })();
  }, [productId]);

  if (loading) return <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Belum ada ulasan untuk produk ini.</p>;
  }

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <div key={r.id} className="border-b border-border pb-4 last:border-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={`h-4 w-4 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
              ))}
            </div>
            {r.is_verified_purchase && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700"><BadgeCheck className="h-3 w-3" />Pembelian terverifikasi</span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("id-ID")}</span>
          </div>
          {r.comment && <p className="text-sm text-foreground/90 whitespace-pre-line">{r.comment}</p>}
          {r.photos && r.photos.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {r.photos.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="Foto ulasan" className="h-20 w-20 rounded object-cover border" />
                </a>
              ))}
            </div>
          )}
          {r.shop_reply && (
            <div className="mt-3 ml-4 rounded-md bg-muted p-3 text-sm">
              <div className="text-xs font-semibold text-primary mb-1">Balasan Penjual</div>
              <p className="whitespace-pre-line">{r.shop_reply}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
