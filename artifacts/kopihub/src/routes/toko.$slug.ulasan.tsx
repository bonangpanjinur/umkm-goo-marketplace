import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import {
  Star, Camera, Upload, X, Loader2, CheckCircle2, ImageIcon, Store,
} from "lucide-react";

export const Route = createFileRoute("/toko/$slug/ulasan")({
  head: () => ({ meta: [{ title: "Tulis Ulasan Foto" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string | undefined) ?? "",
  }),
  component: UlasanPage,
});

type ReviewRecord = {
  id: string;
  token: string;
  client_name: string;
  session_date: string | null;
  package_name: string | null;
  rating: number;
  comment: string | null;
  photos: string[];
  shop_id: string;
};

type ShopInfo = {
  id: string;
  name: string;
  logo_url: string | null;
};

function StarSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const labels: Record<number, string> = {
    1: "Mengecewakan",
    2: "Kurang Memuaskan",
    3: "Cukup Bagus",
    4: "Sangat Bagus",
    5: "Luar Biasa! ✨",
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n} type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            className="transition-transform hover:scale-110 active:scale-95"
          >
            <Star className={`h-10 w-10 ${n <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
          </button>
        ))}
      </div>
      {(hover || value) > 0 && (
        <p className="text-sm font-medium text-amber-600">{labels[hover || value]}</p>
      )}
    </div>
  );
}

export default function UlasanPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch() as { token?: string };
  const token = search.token ?? "";

  const [review, setReview] = useState<ReviewRecord | null>(null);
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const { data, error } = await (supabase as any)
        .from("studio_photo_reviews")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (error || !data) { setNotFound(true); setLoading(false); return; }

      const rec = data as ReviewRecord;
      setReview(rec);

      if (rec.photos.length > 0 || (rec.comment !== null && rec.comment !== "")) {
        setAlreadyDone(true);
      }

      const { data: shopData } = await (supabase as any)
        .from("coffee_shops")
        .select("id, name, logo_url")
        .eq("id", rec.shop_id)
        .maybeSingle();
      if (shopData) setShop(shopData as ShopInfo);

      setRating(rec.rating ?? 5);
      setLoading(false);
    })();
  }, [token]);

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const remaining = 8 - photos.length;
    const newFiles = Array.from(files).slice(0, remaining);
    const newItems = newFiles.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setPhotos(prev => [...prev, ...newItems]);
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const submit = async () => {
    if (!review || !rating) { toast.error("Pilih bintang terlebih dahulu"); return; }
    setSaving(true);
    try {
      let uploadedUrls: string[] = [];

      if (photos.length > 0) {
        setUploading(true);
        for (let i = 0; i < photos.length; i++) {
          const { file } = photos[i];
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `studio-reviews/${review.shop_id}/${review.id}/${Date.now()}-${i}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("shop-assets")
            .upload(path, file, { upsert: true });
          if (upErr) throw upErr;
          const { data: urlData } = supabase.storage.from("shop-assets").getPublicUrl(path);
          uploadedUrls.push(urlData.publicUrl);
          setUploadProgress(Math.round(((i + 1) / photos.length) * 100));
        }
        setUploading(false);
      }

      const { error } = await (supabase as any)
        .from("studio_photo_reviews")
        .update({
          rating,
          comment: comment.trim() || null,
          photos: uploadedUrls,
        })
        .eq("id", review.id);

      if (error) throw error;
      setSubmitted(true);
      toast.success("Ulasan berhasil dikirim! Terima kasih 🙏");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim ulasan");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceHeader />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <MarketplaceFooter />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceHeader />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <Camera className="mx-auto h-14 w-14 text-muted-foreground/30 mb-4" />
          <h1 className="text-xl font-bold">Link tidak ditemukan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Link ulasan tidak valid atau sudah kedaluwarsa.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Kembali ke Beranda</Link>
          </Button>
        </div>
        <MarketplaceFooter />
      </div>
    );
  }

  if (alreadyDone || submitted) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceHeader />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">Terima Kasih, {review?.client_name}! 🙏</h1>
          <p className="mt-3 text-muted-foreground">
            {submitted
              ? "Ulasan dan foto kamu sudah kami terima. Foto kamu akan tampil di halaman toko kami."
              : "Kamu sudah pernah mengisi ulasan ini sebelumnya."
            }
          </p>
          {shop && (
            <Button asChild className="mt-8">
              <Link to="/toko/$slug" params={{ slug }}>Lihat Toko {shop.name}</Link>
            </Button>
          )}
        </div>
        <MarketplaceFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />

      <div className="mx-auto max-w-lg px-4 py-10 space-y-8">
        {/* Shop + session info header */}
        <div className="text-center">
          {shop?.logo_url ? (
            <img src={shop.logo_url} alt={shop.name} className="mx-auto h-16 w-16 rounded-2xl object-cover mb-3" />
          ) : (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
              <Store className="h-8 w-8" />
            </div>
          )}
          <h1 className="text-xl font-bold">{shop?.name ?? "Studio Foto"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hai, <strong>{review?.client_name}</strong>! Bagikan pengalamanmu sesi foto
            {review?.package_name && ` (${review.package_name})`}
            {review?.session_date && ` pada ${new Date(review.session_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`}.
          </p>
        </div>

        {/* Star rating */}
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <h2 className="text-center font-semibold">Beri Rating Sesi Fotomu</h2>
          <StarSelector value={rating} onChange={setRating} />
        </div>

        {/* Comment */}
        <div className="rounded-2xl border bg-card p-6 space-y-3">
          <h2 className="font-semibold">Ceritakan Pengalamanmu</h2>
          <Textarea
            rows={4}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Gimana kesan sesi fotonya? Hasilnya sesuai ekspektasi? Fotografernya ramah? Mau ceritain apa saja!"
          />
          <p className="text-xs text-muted-foreground">{comment.length} karakter (opsional)</p>
        </div>

        {/* Photo upload */}
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" /> Upload Foto Favorit dari Sesi
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Foto yang kamu upload akan tampil di halaman toko sebagai social proof. Maks 8 foto.
            </p>
          </div>

          {/* Upload area */}
          <label className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${photos.length >= 8 ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50 hover:bg-accent/30"}`}>
            <Upload className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">
              {photos.length >= 8 ? "Maksimum 8 foto" : "Pilih foto atau seret ke sini"}
            </p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP · Maks 5 MB per foto</p>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={photos.length >= 8}
              onChange={e => addPhotos(e.target.files)}
            />
          </label>

          {/* Preview grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-muted/40 group">
                  <img src={p.preview} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < 8 && (
                <label className="aspect-square flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/40 hover:bg-accent/20 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground/50" />
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => addPhotos(e.target.files)} />
                </label>
              )}
            </div>
          )}
        </div>

        {/* Camera tip */}
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 flex items-start gap-3">
          <Camera className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary">Tips upload foto</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload foto langsung dari galeri HP kamu. Resolusi tinggi = tampil lebih keren di halaman toko!
            </p>
          </div>
        </div>

        {/* Upload progress */}
        {uploading && (
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Mengupload foto...</p>
              <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {/* Submit */}
        <Button
          className="w-full h-12 text-base gap-2"
          onClick={submit}
          disabled={saving || !rating}
        >
          {saving
            ? <><Loader2 className="h-5 w-5 animate-spin" /> {uploading ? `Mengupload foto... ${uploadProgress}%` : "Mengirim..."}</>
            : <><Star className="h-5 w-5 fill-current" /> Kirim Ulasan</>
          }
        </Button>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Dengan mengirim ulasan, kamu menyetujui foto dapat ditampilkan di halaman publik toko ini.
        </p>
      </div>

      <MarketplaceFooter />
    </div>
  );
}
