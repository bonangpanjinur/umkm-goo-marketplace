import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Star, Camera, Plus, Loader2, Search, MessageSquare,
  Eye, EyeOff, Send, ChevronDown, ChevronUp, Reply,
  ImageIcon, ExternalLink, Trash2,
} from "lucide-react";

export const Route = createFileRoute("/pos-app/studio-photo-reviews")({
  head: () => ({ meta: [{ title: "Ulasan Foto Klien" }] }),
  component: StudioPhotoReviewsPage,
});

type PhotoReview = {
  id: string;
  token: string;
  client_name: string;
  client_phone: string | null;
  session_date: string | null;
  package_name: string | null;
  rating: number;
  comment: string | null;
  photos: string[];
  is_hidden: boolean;
  shop_reply: string | null;
  shop_replied_at: string | null;
  created_at: string;
};

const SQL_HINT = `CREATE TABLE IF NOT EXISTS public.studio_photo_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  token text NOT NULL DEFAULT gen_random_uuid()::text,
  client_name text NOT NULL,
  client_phone text,
  session_date date,
  package_name text,
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  comment text,
  photos text[] NOT NULL DEFAULT '{}',
  is_hidden boolean NOT NULL DEFAULT false,
  shop_reply text,
  shop_replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);`;

function Stars({ n, size = "sm" }: { n: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-4 w-4" : "h-3 w-3";
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`${cls} ${i <= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`} />
      ))}
    </span>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function StudioPhotoReviewsPage() {
  const { shop } = useCurrentShop();
  const [reviews, setReviews] = useState<PhotoReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lightboxPhotos, setLightboxPhotos] = useState<{ urls: string[]; idx: number } | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySaving, setReplySaving] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendSaving, setSendSaving] = useState(false);
  const [sendForm, setSendForm] = useState({
    client_name: "", client_phone: "", session_date: "", package_name: "",
  });

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("studio_photo_reviews")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    if (error?.message?.includes("exist")) setShowSql(true);
    setReviews((data ?? []) as PhotoReview[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const sendRequest = async () => {
    if (!shop || !sendForm.client_name.trim()) {
      toast.error("Nama klien wajib diisi");
      return;
    }
    setSendSaving(true);
    try {
      const { data, error } = await (supabase as any)
        .from("studio_photo_reviews")
        .insert({
          shop_id: shop.id,
          client_name: sendForm.client_name.trim(),
          client_phone: sendForm.client_phone.trim() || null,
          session_date: sendForm.session_date || null,
          package_name: sendForm.package_name.trim() || null,
          rating: 5,
        })
        .select()
        .single();
      if (error) throw error;

      const review = data as PhotoReview;
      const link = `${window.location.origin}/toko/${shop.slug}/ulasan?token=${review.token}`;

      if (sendForm.client_phone.trim()) {
        const msg = `Halo ${review.client_name}! 📸\n\nTerima kasih sudah mempercayakan momen berhargamu kepada kami!\n\nKami sangat menghargai pendapat kamu. Mau bantu kami dengan memberikan ulasan singkat dan upload beberapa foto favoritmu dari sesi?\n\n🔗 ${link}\n\nHanya butuh 2-3 menit. Terima kasih banyak! 🙏`;
        window.open(`https://wa.me/${sendForm.client_phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
        toast.success("Link ulasan dikirim via WhatsApp");
      } else {
        await navigator.clipboard.writeText(link);
        toast.success("Link ulasan disalin ke clipboard");
      }

      setSendOpen(false);
      setSendForm({ client_name: "", client_phone: "", session_date: "", package_name: "" });
      load(shop.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat permintaan ulasan");
    } finally {
      setSendSaving(false);
    }
  };

  const copyLink = async (review: PhotoReview) => {
    const link = `${window.location.origin}/toko/${(shop as any)?.slug}/ulasan?token=${review.token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Link disalin");
  };

  const toggleHide = async (review: PhotoReview) => {
    await (supabase as any)
      .from("studio_photo_reviews")
      .update({ is_hidden: !review.is_hidden })
      .eq("id", review.id);
    setReviews(prev => prev.map(r => r.id === review.id ? { ...r, is_hidden: !r.is_hidden } : r));
    toast.success(review.is_hidden ? "Ulasan ditampilkan kembali" : "Ulasan disembunyikan dari halaman toko");
  };

  const submitReply = async (reviewId: string) => {
    if (!replyText.trim()) { toast.error("Balasan tidak boleh kosong"); return; }
    setReplySaving(true);
    try {
      await (supabase as any)
        .from("studio_photo_reviews")
        .update({ shop_reply: replyText.trim(), shop_replied_at: new Date().toISOString() })
        .eq("id", reviewId);
      setReviews(prev => prev.map(r =>
        r.id === reviewId ? { ...r, shop_reply: replyText.trim(), shop_replied_at: new Date().toISOString() } : r
      ));
      setReplyingId(null);
      setReplyText("");
      toast.success("Balasan disimpan");
    } catch (err) {
      toast.error("Gagal menyimpan balasan");
    } finally {
      setReplySaving(false);
    }
  };

  const remove = async (review: PhotoReview) => {
    if (!confirm(`Hapus ulasan dari "${review.client_name}"?`)) return;
    await (supabase as any).from("studio_photo_reviews").delete().eq("id", review.id);
    setReviews(prev => prev.filter(r => r.id !== review.id));
    toast.success("Ulasan dihapus");
  };

  const filtered = reviews.filter(r =>
    !search.trim() ||
    r.client_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.package_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const withPhotos  = reviews.filter(r => r.photos.length > 0 && !r.is_hidden);
  const pending     = reviews.filter(r => r.photos.length === 0 && !r.is_hidden);
  const avgRating   = withPhotos.length > 0
    ? (withPhotos.reduce((s, r) => s + r.rating, 0) / withPhotos.length).toFixed(1)
    : "—";

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Camera className="h-5 w-5 text-primary" /> Ulasan Foto Klien
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Minta klien upload foto hasil sesi & tulis ulasan — tampil di halaman publik toko.
          </p>
        </div>
        <Button onClick={() => setSendOpen(true)} className="gap-1.5">
          <Send className="h-4 w-4" /> Minta Ulasan
        </Button>
      </div>

      {/* Stats strip */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Rata-rata Rating", value: avgRating, sub: `dari ${withPhotos.length} ulasan`, color: "text-amber-600" },
            { label: "Dengan Foto",      value: withPhotos.length, sub: "ulasan visual",              color: "text-primary" },
            { label: "Menunggu Diisi",   value: pending.length,    sub: "link belum diisi klien",     color: "text-amber-500" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border bg-card p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs font-medium">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {showSql && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Tabel belum ada — jalankan SQL berikut di Supabase:</p>
          <pre className="mt-2 text-xs font-mono bg-amber-100 p-2 rounded overflow-x-auto">{SQL_HINT}</pre>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Cari nama klien atau paket..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Camera className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="font-medium">Belum ada ulasan foto</p>
          <p className="text-sm mt-1">Kirim link permintaan ulasan ke klien setelah sesi selesai</p>
          <Button className="mt-4 gap-1.5" onClick={() => setSendOpen(true)}>
            <Send className="h-4 w-4" /> Kirim Permintaan Pertama
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(review => {
            const hasContent = review.photos.length > 0 || !!review.comment;
            const isExpanded = expandedId === review.id;
            return (
              <div key={review.id} className={`rounded-xl border bg-card overflow-hidden transition-opacity ${review.is_hidden ? "opacity-60" : ""}`}>
                <button
                  className="w-full text-left p-4 hover:bg-accent/20 transition"
                  onClick={() => setExpandedId(isExpanded ? null : review.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{review.client_name}</span>
                        {hasContent
                          ? <Stars n={review.rating} />
                          : <Badge variant="secondary" className="text-xs">Belum diisi</Badge>
                        }
                        {review.is_hidden && <Badge className="text-xs bg-gray-100 text-gray-600">Disembunyikan</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {review.package_name && `${review.package_name} · `}
                        {review.session_date ? fmtDate(review.session_date) : "Tanggal tidak diisi"}
                        {review.photos.length > 0 && ` · ${review.photos.length} foto`}
                      </p>
                      {/* Photo strip preview */}
                      {review.photos.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {review.photos.slice(0, 5).map((url, i) => (
                            <div key={i} className="h-10 w-10 rounded-md overflow-hidden shrink-0 bg-muted/40">
                              <img src={url} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            </div>
                          ))}
                          {review.photos.length > 5 && (
                            <div className="h-10 w-10 rounded-md bg-muted/60 flex items-center justify-center text-xs font-medium text-muted-foreground">
                              +{review.photos.length - 5}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                    {review.comment && (
                      <p className="text-sm text-foreground/80 italic">"{review.comment}"</p>
                    )}

                    {/* Full photo grid */}
                    {review.photos.length > 0 && (
                      <div className="grid grid-cols-4 gap-1.5">
                        {review.photos.map((url, i) => (
                          <button
                            key={i}
                            className="aspect-square overflow-hidden rounded-lg bg-muted/40 border border-border hover:border-primary/50 transition-colors"
                            onClick={() => setLightboxPhotos({ urls: review.photos, idx: i })}
                          >
                            <img src={url} alt="" className="h-full w-full object-cover hover:scale-105 transition-transform duration-200" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Shop reply */}
                    {review.shop_reply && (
                      <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                        <p className="text-xs font-semibold text-primary mb-0.5">Balasan Toko:</p>
                        <p className="text-sm">{review.shop_reply}</p>
                        {review.shop_replied_at && (
                          <p className="text-[10px] text-muted-foreground mt-1">{fmtDate(review.shop_replied_at)}</p>
                        )}
                      </div>
                    )}

                    {/* Inline reply form */}
                    {replyingId === review.id && (
                      <div className="space-y-2">
                        <Textarea
                          rows={2}
                          placeholder="Tulis balasan kamu..."
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs" disabled={replySaving}
                            onClick={() => submitReply(review.id)}>
                            {replySaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Reply className="h-3 w-3 mr-1" />}
                            Kirim Balasan
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs"
                            onClick={() => { setReplyingId(null); setReplyText(""); }}>
                            Batal
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {!hasContent && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                          onClick={() => copyLink(review)}>
                          <ExternalLink className="h-3 w-3" /> Salin Link Ulasan
                        </Button>
                      )}
                      {review.client_phone && !hasContent && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                          onClick={() => {
                            const link = `${window.location.origin}/toko/${(shop as any)?.slug}/ulasan?token=${review.token}`;
                            const msg = `Halo ${review.client_name}, jangan lupa isi ulasan sesi foto kamu ya! 📸\n\n${link}`;
                            window.open(`https://wa.me/${review.client_phone!.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
                          }}>
                          <MessageSquare className="h-3 w-3" /> Ingatkan via WA
                        </Button>
                      )}
                      {hasContent && !review.shop_reply && replyingId !== review.id && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                          onClick={() => { setReplyingId(review.id); setReplyText(""); }}>
                          <Reply className="h-3 w-3" /> Balas
                        </Button>
                      )}
                      {hasContent && (
                        <Button size="sm" variant="ghost"
                          className={`h-7 w-7 p-0 ${review.is_hidden ? "text-muted-foreground" : "text-muted-foreground hover:text-foreground"}`}
                          title={review.is_hidden ? "Tampilkan" : "Sembunyikan"}
                          onClick={() => toggleHide(review)}>
                          {review.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive ml-auto"
                        onClick={() => remove(review)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Send review request dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400 fill-amber-400" /> Minta Ulasan dari Klien
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama Klien <span className="text-destructive">*</span></Label>
              <Input value={sendForm.client_name} onChange={e => setSendForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Nama klien" />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor WhatsApp Klien</Label>
              <Input value={sendForm.client_phone} onChange={e => setSendForm(f => ({ ...f, client_phone: e.target.value }))} placeholder="08xx... (link dikirim otomatis via WA)" />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Sesi</Label>
              <Input type="date" value={sendForm.session_date} onChange={e => setSendForm(f => ({ ...f, session_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Nama Paket</Label>
              <Input value={sendForm.package_name} onChange={e => setSendForm(f => ({ ...f, package_name: e.target.value }))} placeholder="Basic, Standard, Premium" />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              Klien mendapat link untuk memberi bintang, menulis komentar, dan upload foto hasil sesi.
              Foto yang diupload otomatis tampil di halaman toko kamu.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>Batal</Button>
            <Button onClick={sendRequest} disabled={sendSaving}>
              {sendSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              {sendForm.client_phone ? "Kirim via WhatsApp" : "Salin Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxPhotos && (
        <Dialog open onOpenChange={() => setLightboxPhotos(null)}>
          <DialogContent className="max-w-2xl bg-black/95 border-0 p-0">
            <div className="relative">
              <img
                src={lightboxPhotos.urls[lightboxPhotos.idx]}
                alt=""
                className="w-full max-h-[80vh] object-contain rounded-lg"
              />
              <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3">
                {lightboxPhotos.urls.length > 1 && (
                  <>
                    <button
                      onClick={() => setLightboxPhotos(p => p ? { ...p, idx: (p.idx - 1 + p.urls.length) % p.urls.length } : null)}
                      className="rounded-full bg-white/20 hover:bg-white/30 p-2 text-white transition"
                    >←</button>
                    <span className="rounded-full bg-white/20 px-3 py-1 text-sm text-white">
                      {lightboxPhotos.idx + 1} / {lightboxPhotos.urls.length}
                    </span>
                    <button
                      onClick={() => setLightboxPhotos(p => p ? { ...p, idx: (p.idx + 1) % p.urls.length } : null)}
                      className="rounded-full bg-white/20 hover:bg-white/30 p-2 text-white transition"
                    >→</button>
                  </>
                )}
              </div>
              <button
                onClick={() => setLightboxPhotos(null)}
                className="absolute right-3 top-3 rounded-full bg-white/20 hover:bg-white/30 p-1.5 text-white transition"
              >✕</button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
