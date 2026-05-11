import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, X, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Item = { product_id: string; name: string };

export function MarketplaceReviewDialog({
  open, onOpenChange, orderId, shopId, userId, items, onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  shopId: string;
  userId: string;
  items: Item[];
  onSubmitted?: () => void;
}) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [existing, setExisting] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("product_reviews")
        .select("product_id, rating, comment, photos")
        .eq("order_id", orderId)
        .eq("user_id", userId);
      const r: Record<string, number> = {}, c: Record<string, string> = {}, p: Record<string, string[]> = {}, ex: Record<string, boolean> = {};
      (data ?? []).forEach((row: any) => {
        r[row.product_id] = row.rating;
        c[row.product_id] = row.comment ?? "";
        p[row.product_id] = row.photos ?? [];
        ex[row.product_id] = true;
      });
      setRatings(r); setComments(c); setPhotos(p); setExisting(ex);
    })();
  }, [open, orderId, userId]);

  const uploadPhoto = async (productId: string, file: File) => {
    if (file.size > 3 * 1024 * 1024) { toast.error("Foto maksimal 3MB"); return; }
    setUploading(productId);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${orderId}-${productId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("review-photos").upload(path, file);
    if (error) { toast.error(error.message); setUploading(null); return; }
    const { data: { publicUrl } } = supabase.storage.from("review-photos").getPublicUrl(path);
    setPhotos((p) => ({ ...p, [productId]: [...(p[productId] || []), publicUrl] }));
    setUploading(null);
  };

  const removePhoto = (productId: string, url: string) => {
    setPhotos((p) => ({ ...p, [productId]: (p[productId] || []).filter((u) => u !== url) }));
  };

  const save = async () => {
    const rows = items
      .filter((it) => ratings[it.product_id])
      .map((it) => ({
        shop_id: shopId,
        product_id: it.product_id,
        order_id: orderId,
        user_id: userId,
        rating: ratings[it.product_id],
        comment: (comments[it.product_id]?.trim().slice(0, 1000)) || null,
        photos: photos[it.product_id] || [],
        is_verified_purchase: true,
      }));
    if (rows.length === 0) { toast.error("Berikan minimal 1 rating"); return; }
    setSaving(true);
    const { error } = await supabase.from("product_reviews").upsert(rows, { onConflict: "product_id,user_id,order_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Terima kasih atas ulasannya!");
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Beri Ulasan</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {items.map((it) => {
            const rating = ratings[it.product_id] ?? 0;
            const itemPhotos = photos[it.product_id] || [];
            return (
              <div key={it.product_id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{it.name}</p>
                  {existing[it.product_id] && <span className="text-[10px] text-muted-foreground">Edit</span>}
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRatings((p) => ({ ...p, [it.product_id]: n }))} className="p-0.5">
                      <Star className={`h-6 w-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
                <Textarea placeholder="Bagaimana pengalamanmu?" value={comments[it.product_id] ?? ""} onChange={(e) => setComments((p) => ({ ...p, [it.product_id]: e.target.value }))} rows={2} maxLength={1000} />
                <div className="flex flex-wrap gap-2 items-center">
                  {itemPhotos.map((url) => (
                    <div key={url} className="relative">
                      <img src={url} alt="" className="h-16 w-16 rounded object-cover border" />
                      <button type="button" onClick={() => removePhoto(it.product_id, url)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  {itemPhotos.length < 3 && (
                    <label className="h-16 w-16 rounded border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted">
                      {uploading === it.product_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(it.product_id, f); e.target.value = ""; }} />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Batal</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Menyimpan…" : "Kirim Ulasan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
