import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, X, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============================================================
// UnifiedReviewDialog — handles both POS (menu_reviews) dan
// Marketplace (product_reviews). Pilih mode via prop `mode`.
// ============================================================

export type ReviewMode = "pos" | "marketplace";

export type ReviewItem = {
  id: string;
  name: string;
};

type BaseProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  shopId: string;
  userId: string;
  items: ReviewItem[];
  onSubmitted?: () => void;
};

type PosProps = BaseProps & { mode: "pos" };
type MarketplaceProps = BaseProps & { mode: "marketplace" };
export type UnifiedReviewDialogProps = PosProps | MarketplaceProps;

export function UnifiedReviewDialog({
  mode,
  open,
  onOpenChange,
  orderId,
  shopId,
  userId,
  items,
  onSubmitted,
}: UnifiedReviewDialogProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [existing, setExisting] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const table = mode === "pos" ? "menu_reviews" : "product_reviews";
  const idField = mode === "pos" ? "menu_item_id" : "product_id";

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await (supabase as any)
        .from(table)
        .select(`${idField}, rating, comment${mode === "marketplace" ? ", photos" : ""}`)
        .eq("order_id", orderId)
        .eq("user_id", userId);

      const r: Record<string, number> = {};
      const c: Record<string, string> = {};
      const p: Record<string, string[]> = {};
      const ex: Record<string, boolean> = {};

      (data ?? []).forEach((row: any) => {
        const itemId = row[idField];
        r[itemId] = row.rating;
        c[itemId] = row.comment ?? "";
        if (mode === "marketplace") p[itemId] = row.photos ?? [];
        ex[itemId] = true;
      });

      setRatings(r);
      setComments(c);
      if (mode === "marketplace") setPhotos(p);
      setExisting(ex);
    })();
  }, [open, orderId, userId, table, idField, mode]);

  const uploadPhoto = async (itemId: string, file: File) => {
    if (file.size > 3 * 1024 * 1024) { toast.error("Foto maksimal 3MB"); return; }
    setUploading(itemId);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${orderId}-${itemId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("review-photos").upload(path, file);
    if (error) { toast.error(error.message); setUploading(null); return; }
    const { data: { publicUrl } } = supabase.storage.from("review-photos").getPublicUrl(path);
    setPhotos((p) => ({ ...p, [itemId]: [...(p[itemId] || []), publicUrl] }));
    setUploading(null);
  };

  const removePhoto = (itemId: string, url: string) => {
    setPhotos((p) => ({ ...p, [itemId]: (p[itemId] || []).filter((u) => u !== url) }));
  };

  const save = async () => {
    const rows = items
      .filter((it) => ratings[it.id])
      .map((it) => {
        const base = {
          shop_id: shopId,
          [idField]: it.id,
          order_id: orderId,
          user_id: userId,
          rating: ratings[it.id],
          comment: (comments[it.id]?.trim().slice(0, 1000)) || null,
        };
        if (mode === "marketplace") {
          return { ...base, photos: photos[it.id] || [], is_verified_purchase: true };
        }
        return base;
      });

    if (rows.length === 0) { toast.error("Berikan minimal 1 rating"); return; }
    setSaving(true);

    const conflictKey = mode === "pos"
      ? "order_id,menu_item_id,user_id"
      : "product_id,user_id,order_id";

    const { error } = await (supabase as any)
      .from(table)
      .upsert(rows, { onConflict: conflictKey });

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Terima kasih atas ulasannya!");
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Beri Ulasan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {items.map((it) => {
            const rating = ratings[it.id] ?? 0;
            const itemPhotos = photos[it.id] || [];
            return (
              <div key={it.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{it.name}</p>
                  {existing[it.id] && (
                    <span className="text-[10px] text-muted-foreground">
                      {mode === "pos" ? "Sudah dinilai" : "Edit"}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRatings((p) => ({ ...p, [it.id]: n }))}
                      className="p-0.5"
                    >
                      <Star className={`h-6 w-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder={mode === "pos" ? "Komentar (opsional)" : "Bagaimana pengalamanmu?"}
                  value={comments[it.id] ?? ""}
                  onChange={(e) => setComments((p) => ({ ...p, [it.id]: e.target.value }))}
                  rows={2}
                  maxLength={1000}
                  className="text-sm"
                />
                {mode === "marketplace" && (
                  <div className="flex flex-wrap gap-2 items-center">
                    {itemPhotos.map((url) => (
                      <div key={url} className="relative">
                        <img src={url} alt="" className="h-16 w-16 rounded object-cover border" />
                        <button
                          type="button"
                          onClick={() => removePhoto(it.id, url)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {itemPhotos.length < 3 && (
                      <label className="h-16 w-16 rounded border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted">
                        {uploading === it.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Upload className="h-4 w-4 text-muted-foreground" />
                        }
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadPhoto(it.id, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Menyimpan…" : "Kirim Ulasan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
