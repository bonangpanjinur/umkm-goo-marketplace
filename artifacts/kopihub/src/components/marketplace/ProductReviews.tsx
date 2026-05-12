import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, BadgeCheck, Loader2, Camera, X, Upload, Gift } from "lucide-react";
import { toast } from "sonner";

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

async function awardPhotoPoints(userId: string, shopId: string) {
  try {
    const { data: lp } = await supabase
      .from("loyalty_points")
      .select("id, balance, total_earned")
      .eq("user_id", userId)
      .eq("shop_id", shopId)
      .maybeSingle();
    if (lp) {
      await supabase
        .from("loyalty_points")
        .update({ balance: Number((lp as any).balance) + 5, total_earned: Number((lp as any).total_earned) + 5 })
        .eq("id", (lp as any).id);
    } else {
      await supabase
        .from("loyalty_points")
        .insert({ user_id: userId, shop_id: shopId, balance: 5, total_earned: 5 });
    }
  } catch (_) {}
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="p-0.5"
          aria-label={`${n} bintang`}
        >
          <Star className={`h-7 w-7 transition-colors ${n <= (hovered || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
        </button>
      ))}
    </div>
  );
}

function WriteReview({ productId, shopId, onSubmitted }: { productId: string; shopId: string; onSubmitted: () => void }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasPhotoBonus, setHasPhotoBonus] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto maksimal 5MB"); return; }
    if (photos.length >= 3) { toast.error("Maksimal 3 foto"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `reviews/${user!.id}/${productId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("review-photos").upload(path, file, { upsert: true });
    if (error) {
      const { error: e2 } = await supabase.storage.from("shop-assets").upload(path, file, { upsert: true });
      if (e2) { toast.error("Gagal upload foto: " + e2.message); setUploading(false); return; }
      const { data: { publicUrl } } = supabase.storage.from("shop-assets").getPublicUrl(path);
      setPhotos((p) => [...p, publicUrl]);
    } else {
      const { data: { publicUrl } } = supabase.storage.from("review-photos").getPublicUrl(path);
      setPhotos((p) => [...p, publicUrl]);
    }
    setUploading(false);
  };

  const submit = async () => {
    if (!user) { toast.error("Masuk terlebih dahulu"); return; }
    if (rating === 0) { toast.error("Pilih rating bintang terlebih dahulu"); return; }
    setSaving(true);
    const { error } = await supabase.from("product_reviews").upsert(
      {
        product_id: productId,
        shop_id: shopId,
        user_id: user.id,
        rating,
        comment: comment.trim() || null,
        photos: photos.length > 0 ? photos : [],
        is_verified_purchase: false,
      },
      { onConflict: "product_id,user_id" }
    );
    if (error) {
      try {
        await supabase.from("product_reviews").insert({
          product_id: productId,
          shop_id: shopId,
          user_id: user.id,
          rating,
          comment: comment.trim() || null,
          photos: photos.length > 0 ? photos : [],
          is_verified_purchase: false,
        });
      } catch (e2: any) {
        toast.error(e2.message ?? error.message);
        setSaving(false);
        return;
      }
    }
    if (photos.length > 0 && !hasPhotoBonus) {
      await awardPhotoPoints(user.id, shopId);
      setHasPhotoBonus(true);
      toast.success("Ulasan terkirim! +5 poin bonus untuk foto kamu 🎉");
    } else {
      toast.success("Ulasan berhasil dikirim!");
    }
    setSaving(false);
    onSubmitted();
  };

  if (!user) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        <a href="/login" className="text-primary hover:underline font-medium">Masuk</a> untuk menulis ulasan.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold">Tulis Ulasanmu</h3>

      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Rating *</p>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      <div>
        <Textarea
          placeholder="Ceritakan pengalamanmu dengan produk ini… (opsional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={1000}
        />
        <p className="text-[11px] text-right text-muted-foreground mt-0.5">{comment.length}/1000</p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs text-muted-foreground">Foto (opsional, maks. 3)</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            <Gift className="h-3 w-3" /> +5 poin untuk foto
          </span>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {photos.map((url, i) => (
            <div key={url} className="relative group">
              <img src={url} alt={`Foto ${i + 1}`} className="h-20 w-20 rounded-lg object-cover border border-border" />
              <button
                type="button"
                onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {photos.length < 3 && (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
              {uploading
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : <>
                    <Camera className="h-5 w-5" />
                    <span className="text-[10px]">Tambah foto</span>
                  </>
              }
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ""; }}
              />
            </label>
          )}
        </div>
      </div>

      <Button onClick={submit} disabled={saving || rating === 0} className="w-full sm:w-auto">
        {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Mengirim…</> : "Kirim Ulasan"}
      </Button>
    </div>
  );
}

export function ProductReviews({ productId, shopId }: { productId: string; shopId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("product_reviews")
      .select("id, rating, comment, photos, is_verified_purchase, shop_reply, shop_replied_at, created_at")
      .eq("product_id", productId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(20);
    const all = ((data as any) || []) as Review[];
    setReviews(all);

    if (user) {
      const mine = all.find((r) => false) ?? null;
      const { data: own } = await supabase
        .from("product_reviews")
        .select("id, rating, comment, photos, is_verified_purchase, shop_reply, shop_replied_at, created_at")
        .eq("product_id", productId)
        .eq("user_id", user.id)
        .maybeSingle();
      setMyReview((own as Review) ?? null);
      if (!own) setShowForm(true);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [productId, user?.id]);

  if (loading) return <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {user && showForm && !myReview && (
        <WriteReview
          productId={productId}
          shopId={shopId}
          onSubmitted={() => { setShowForm(false); load(); }}
        />
      )}

      {user && myReview && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-primary">Ulasanmu</p>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => { setMyReview(null); setShowForm(true); }}
            >
              Edit
            </button>
          </div>
          <div className="flex mb-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`h-4 w-4 ${n <= myReview.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
            ))}
          </div>
          {myReview.comment && <p className="text-sm text-foreground/80">{myReview.comment}</p>}
          {myReview.photos && myReview.photos.length > 0 && (
            <div className="mt-2 flex gap-2">
              {myReview.photos.map((url) => (
                <img key={url} src={url} alt="Foto ulasan" className="h-14 w-14 rounded object-cover border" />
              ))}
            </div>
          )}
        </div>
      )}

      {!user && (
        <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground text-center">
          <a href="/login" className="text-primary hover:underline font-medium">Masuk</a> untuk menulis ulasan. Sertakan foto dan dapatkan <span className="font-medium text-amber-600">+5 poin</span>!
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Belum ada ulasan. Jadilah yang pertama!</p>
      ) : (
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
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700">
                    <BadgeCheck className="h-3 w-3" />Pembelian terverifikasi
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("id-ID")}
                </span>
              </div>
              {r.comment && <p className="text-sm text-foreground/90 whitespace-pre-line">{r.comment}</p>}
              {r.photos && r.photos.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {r.photos.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="Foto ulasan" className="h-20 w-20 rounded object-cover border hover:opacity-90 transition" />
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
      )}
    </div>
  );
}
