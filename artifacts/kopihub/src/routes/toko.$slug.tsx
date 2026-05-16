import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { ProductCard } from "./index";
import { Store, MapPin, Phone, ShieldCheck, Heart, Users, MessageCircle, CalendarCheck, Images, ChevronLeft, ChevronRight, X, Package, Scale, ShoppingCart, Check, Star, Sparkles, Crown, Map as MapIcon, ClipboardList } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addToCart } from "@/lib/marketplace-cart";
import { useSeo } from "@/lib/use-seo";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  TrustCertBadge,
  TrustCertCard,
  computeTrustCert,
} from "@/components/TrustCertBadge";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { Trophy, Medal } from "lucide-react";

type PortfolioItem = { id: string; image_url: string; caption: string | null; category: string | null; sort_order: number; before_image_url?: string | null; after_image_url?: string | null; is_before_after?: boolean | null };

function PortfolioGallery({ shopId }: { shopId: string }) {
  const [items, setItems]     = useState<PortfolioItem[]>([]);
  const [loaded, setLoaded]   = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("shop_portfolio")
        .select("id, image_url, caption, category, sort_order, before_image_url, after_image_url, is_before_after")
        .eq("shop_id", shopId)
        .order("sort_order")
        .limit(24);
      if (!error) setItems((data ?? []) as PortfolioItem[]);
      setLoaded(true);
    })();
  }, [shopId]);

  if (!loaded || items.length === 0) return null;

  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean))) as string[];

  const prev = () => setLightbox(lb => lb !== null ? (lb - 1 + items.length) % items.length : null);
  const next = () => setLightbox(lb => lb !== null ? (lb + 1) % items.length : null);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 border-b border-border">
      <div className="flex items-center gap-2 mb-4">
        <Images className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold tracking-tight">Galeri / Portofolio</h2>
        {categories.length > 0 && (
          <div className="ml-2 flex gap-1.5 flex-wrap">
            {categories.map(c => (
              <span key={c} className="rounded-full bg-primary/10 text-primary text-[11px] font-medium px-2.5 py-0.5">{c}</span>
            ))}
          </div>
        )}
      </div>
      <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-6">
        {items.map((item, idx) => (
          <button
            key={item.id}
            className="group relative aspect-square overflow-hidden rounded-xl bg-muted/40 border border-border hover:border-primary/50 transition-all"
            onClick={() => setLightbox(idx)}
          >
            {item.is_before_after && item.before_image_url && item.after_image_url ? (
              <BeforeAfterSlider beforeUrl={item.before_image_url} afterUrl={item.after_image_url} className="aspect-square h-full" />
            ) : (
              <img
                src={item.image_url}
                alt={item.caption ?? "Portofolio"}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/200x200?text=Foto"; }}
              />
            )}
            {item.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-white line-clamp-2">{item.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={() => setLightbox(null)}>
            <X className="h-5 w-5" />
          </button>
          <button className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={e => { e.stopPropagation(); prev(); }}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            {items[lightbox].is_before_after && items[lightbox].before_image_url && items[lightbox].after_image_url ? (
              <BeforeAfterSlider beforeUrl={items[lightbox].before_image_url!} afterUrl={items[lightbox].after_image_url!} className="aspect-video w-full" />
            ) : (
              <img
                src={items[lightbox].image_url}
                alt={items[lightbox].caption ?? "Portofolio"}
                className="w-full max-h-[80vh] object-contain rounded-xl"
              />
            )}
            {items[lightbox].caption && (
              <p className="mt-3 text-center text-sm text-white/80">{items[lightbox].caption}</p>
            )}
            <p className="mt-1 text-center text-xs text-white/50">{lightbox + 1} / {items.length}</p>
          </div>
          <button className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={e => { e.stopPropagation(); next(); }}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </section>
  );
}

// ── Studio Photo Reviews Gallery ─────────────────────────────────────────────
type StudioPhotoReview = {
  id: string;
  client_name: string;
  session_date: string | null;
  package_name: string | null;
  rating: number;
  comment: string | null;
  photos: string[];
  shop_reply: string | null;
  created_at: string;
};

function StudioPhotoReviewsGallery({ shopId }: { shopId: string }) {
  const [reviews, setReviews] = useState<StudioPhotoReview[]>([]);
  const [loaded, setLoaded]   = useState(false);
  const [lightbox, setLightbox] = useState<{ urls: string[]; idx: number } | null>(null);

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("studio_photo_reviews")
        .select("id, client_name, session_date, package_name, rating, comment, photos, shop_reply, created_at")
        .eq("shop_id", shopId)
        .eq("is_hidden", false)
        .neq("photos", "{}")
        .order("created_at", { ascending: false })
        .limit(30);
      const rows = ((data ?? []) as StudioPhotoReview[]).filter(r => r.photos && r.photos.length > 0);
      setReviews(rows);
      setLoaded(true);
    })();
  }, [shopId]);

  if (!loaded || reviews.length === 0) return null;

  const allPhotos = reviews.flatMap(r => r.photos.map(url => ({ url, review: r })));
  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 border-b border-border">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          <h2 className="text-xl font-bold tracking-tight">Ulasan &amp; Foto Klien</h2>
          <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-0.5">
            ★ {avgRating.toFixed(1)} · {reviews.length} ulasan
          </span>
        </div>
      </div>

      {/* Photo masonry grid */}
      <div className="columns-2 sm:columns-3 md:columns-4 gap-2 space-y-2 mb-6">
        {allPhotos.slice(0, 20).map(({ url, review }, idx) => (
          <button
            key={`${review.id}-${idx}`}
            className="group relative block w-full overflow-hidden rounded-xl border border-border hover:border-primary/50 transition-all break-inside-avoid"
            onClick={() => {
              const reviewPhotos = review.photos;
              const photoIdx = reviewPhotos.indexOf(url);
              setLightbox({ urls: reviewPhotos, idx: photoIdx >= 0 ? photoIdx : 0 });
            }}
          >
            <img
              src={url}
              alt={`Karya ${review.client_name}`}
              className="w-full object-cover group-hover:scale-105 transition-transform duration-200"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className={`h-2.5 w-2.5 ${n <= review.rating ? "fill-amber-400 text-amber-400" : "text-white/30"}`} />
                ))}
              </div>
              <p className="text-[10px] text-white/80 mt-0.5">{review.client_name}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Review cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {reviews.slice(0, 6).map(r => (
          <div key={r.id} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                  {r.client_name[0]?.toUpperCase()}
                </div>
                <span className="font-medium text-sm">{r.client_name}</span>
              </div>
              <div className="flex gap-0.5 shrink-0">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className={`h-3 w-3 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`} />
                ))}
              </div>
            </div>
            {r.package_name && (
              <span className="inline-block text-[10px] font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5">{r.package_name}</span>
            )}
            {r.comment && (
              <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">"{r.comment}"</p>
            )}
            {r.shop_reply && (
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-foreground/70">
                <span className="font-semibold text-primary">Toko: </span>{r.shop_reply}
              </div>
            )}
            {r.photos.length > 0 && (
              <div className="flex gap-1">
                {r.photos.slice(0, 4).map((url, i) => (
                  <button
                    key={i}
                    className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border hover:border-primary/50 transition-colors"
                    onClick={() => setLightbox({ urls: r.photos, idx: i })}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
                {r.photos.length > 4 && (
                  <div className="h-10 w-10 shrink-0 rounded-md bg-muted/60 flex items-center justify-center text-xs font-medium text-muted-foreground">
                    +{r.photos.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={() => setLightbox(null)}>
            <X className="h-5 w-5" />
          </button>
          {lightbox.urls.length > 1 && (
            <>
              <button
                className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={e => { e.stopPropagation(); setLightbox(p => p ? { ...p, idx: (p.idx - 1 + p.urls.length) % p.urls.length } : null); }}
              ><ChevronLeft className="h-5 w-5" /></button>
              <button
                className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={e => { e.stopPropagation(); setLightbox(p => p ? { ...p, idx: (p.idx + 1) % p.urls.length } : null); }}
              ><ChevronRight className="h-5 w-5" /></button>
            </>
          )}
          <div className="max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.urls[lightbox.idx]} alt="" className="w-full max-h-[80vh] object-contain rounded-xl" />
            {lightbox.urls.length > 1 && (
              <p className="mt-2 text-center text-xs text-white/50">{lightbox.idx + 1} / {lightbox.urls.length}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function computeShopTier(shop: { kyc_status?: string | null; rating_avg?: number | null; rating_count?: number | null }) {
  const r = Number(shop.rating_avg ?? 0);
  const n = Number(shop.rating_count ?? 0);
  if (r >= 4.8 && n >= 100) return { label: "Platinum", icon: Trophy, cls: "bg-violet-100 text-violet-700 border-violet-200" };
  if (r >= 4.5 && n >= 30)  return { label: "Gold Seller", icon: Medal, cls: "bg-amber-100 text-amber-700 border-amber-200" };
  if (r >= 4.0 && n >= 10)  return { label: "Top Seller", icon: Medal, cls: "bg-sky-100 text-sky-700 border-sky-200" };
  return null;
}

export const Route = createFileRoute("/toko/$slug")({
  component: ShopPage,
});

type Shop = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  business_category_id: string | null;
  kyc_status: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
};

type ReviewStats = {
  avgRating: number;
  count: number;
  replyRate: number;
};

function ShopPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [showCertDetail, setShowCertDetail] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const toggleCompare = (id: string) => {
    setCompareIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 3 ? [...prev, id] : prev,
    );
  };

  const loadFollowStatus = async (shopId: string) => {
    const [countRes, followedRes] = await Promise.all([
      supabase.from("shop_follows" as any).select("id", { count: "exact", head: true }).eq("shop_id", shopId),
      user ? supabase.from("shop_follows" as any).select("id").eq("shop_id", shopId).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    setFollowCount((countRes as any).count ?? 0);
    setFollowed(!!(followedRes as any).data);
  };

  const toggleFollow = async () => {
    if (!shop) return;
    if (!user) { toast.info("Masuk untuk mengikuti toko"); return; }
    setFollowBusy(true);
    if (followed) {
      await supabase.from("shop_follows" as any).delete().eq("shop_id", shop.id).eq("user_id", user.id);
      setFollowed(false);
      setFollowCount(c => Math.max(0, c - 1));
      toast.success("Berhenti mengikuti toko");
    } else {
      await supabase.from("shop_follows" as any).insert({ shop_id: shop.id, user_id: user.id });
      setFollowed(true);
      setFollowCount(c => c + 1);
      toast.success("Mengikuti toko!");
    }
    setFollowBusy(false);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: s } = await supabase
        .from("coffee_shops" as any)
        .select("id, slug, name, tagline, description, logo_url, address, phone, rating_avg, rating_count, business_category_id, kyc_status")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!s) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setShop(s as unknown as Shop);
      loadFollowStatus((s as any).id);

      // Fetch review stats for trust cert computation
      const { data: revData } = await supabase
        .from("product_reviews")
        .select("rating, shop_reply")
        .eq("shop_id", (s as any).id)
        .eq("is_hidden", false)
        .limit(1000);
      if (revData && revData.length > 0) {
        const rows = revData as { rating: number; shop_reply: string | null }[];
        const avg = rows.reduce((sum, r) => sum + r.rating, 0) / rows.length;
        const replied = rows.filter(r => !!r.shop_reply).length;
        setReviewStats({
          avgRating: Math.round(avg * 10) / 10,
          count:     rows.length,
          replyRate: replied / rows.length,
        });
      }

      const { data: prods } = await supabase
        .from("menu_items")
        .select("id, shop_id, name, price, image_url, slug, rating_avg, rating_count, stock, track_stock, flash_price, flash_starts_at, flash_ends_at, attributes, item_type")
        .eq("shop_id", (s as any).id)
        .eq("is_available", true)
        .order("sort_order")
        .limit(48);
      setProducts(
        ((prods as any[]) ?? []).map((p) => ({
          ...p,
          shop: { slug: (s as any).slug, name: (s as any).name },
        })),
      );
      setLoading(false);
    })();
  }, [slug]);

  useSeo({
    title: shop ? `${shop.name} — UMKMgo` : "Toko",
    description: shop?.tagline ?? shop?.description ?? (shop ? `Belanja produk dari ${shop.name} di UMKMgo.` : undefined),
    image: shop?.logo_url ?? undefined,
    type: "website",
    jsonLd: shop ? {
      "@context": "https://schema.org",
      "@type": "Store",
      name: shop.name,
      description: shop.description ?? shop.tagline ?? undefined,
      image: shop.logo_url ?? undefined,
      address: shop.address ?? undefined,
      telephone: shop.phone ?? undefined,
      ...(shop.rating_avg && shop.rating_count ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: shop.rating_avg,
          reviewCount: shop.rating_count,
        },
      } : {}),
    } : null,
  });

  const certResult = reviewStats
    ? computeTrustCert(reviewStats.avgRating, reviewStats.count, reviewStats.replyRate)
    : null;

  if (notFound) {
    if (typeof window !== "undefined") {
      toast.info("Toko tidak ditemukan");
      navigate({ to: "/", replace: true });
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Mengalihkan ke beranda…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />

      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-start gap-4">
            {shop?.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="h-20 w-20 rounded-2xl object-cover shrink-0" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
                <Store className="h-9 w-9" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {shop?.name ?? "..."}
                </h1>
                {shop?.kyc_status === "approved" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                    <ShieldCheck className="h-3 w-3" /> Terverifikasi
                  </span>
                )}
                {certResult?.earned && (
                  <TrustCertBadge size="sm" />
                )}
                {shop && (() => {
                  const tier = computeShopTier(shop);
                  if (!tier) return null;
                  const Icon = tier.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${tier.cls}`}>
                      <Icon className="h-3 w-3" /> {tier.label}
                    </span>
                  );
                })()}
              </div>
              {shop?.tagline && (
                <p className="mt-1 text-muted-foreground">{shop.tagline}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {shop?.rating_avg ? (
                  <span>★ {Number(shop.rating_avg).toFixed(1)} ({shop.rating_count ?? 0} ulasan)</span>
                ) : (
                  <span>Toko baru</span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> {followCount} pengikut
                </span>
                {shop?.address && (
                  <Link
                    to="/toko/$slug/map"
                    params={{ slug }}
                    className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                  >
                    <MapPin className="h-3 w-3" /> {shop.address}
                  </Link>
                )}
                {shop?.phone && (
                  <a
                    href={`tel:${shop.phone}`}
                    className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                  >
                    <Phone className="h-3 w-3" /> {shop.phone}
                  </a>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={followed ? "outline" : "default"}
                  className="gap-1.5"
                  onClick={toggleFollow}
                  disabled={followBusy}
                >
                  <Heart className={`h-3.5 w-3.5 ${followed ? "fill-current text-red-500" : ""}`} />
                  {followed ? "Mengikuti" : "Ikuti Toko"}
                </Button>
                <Button asChild size="sm" variant="default" className="gap-1.5">
                  <Link to="/toko/$slug/booking" params={{ slug }} search={{ type: "table" }}>
                    <CalendarCheck className="h-3.5 w-3.5" />
                    Reservasi Meja
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link to="/toko/$slug/chat" params={{ slug }}>
                    <MessageCircle className="h-3.5 w-3.5" />
                    Chat dengan Toko
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link to="/toko/$slug/custom-order" params={{ slug }}>
                    <Sparkles className="h-3.5 w-3.5" />
                    Custom Order
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link to="/toko/$slug/membership" params={{ slug }}>
                    <Crown className="h-3.5 w-3.5" />
                    Membership
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link to="/toko/$slug/map" params={{ slug }}>
                    <MapIcon className="h-3.5 w-3.5" />
                    Lihat Lokasi
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link to="/toko/$slug/ulasan" params={{ slug }}>
                    <Star className="h-3.5 w-3.5" />
                    Ulasan
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link to="/toko/$slug/antrian" params={{ slug }}>
                    <Users className="h-3.5 w-3.5" />
                    Lihat Antrian
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost" className="gap-1.5">
                  <Link to="/akun/bookings">
                    <ClipboardList className="h-3.5 w-3.5" />
                    Booking Saya
                  </Link>
                </Button>
                {certResult && (
                  <button
                    onClick={() => setShowCertDetail(v => !v)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    {certResult.earned ? "Lihat Sertifikat" : "Lihat Syarat Sertifikat"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {shop?.description && (
            <p className="mt-6 max-w-3xl text-sm leading-relaxed text-foreground/80">{shop.description}</p>
          )}

          {/* Trust cert detail panel */}
          {certResult && showCertDetail && (
            <div className="mt-5 max-w-xl">
              <TrustCertCard result={certResult} />
            </div>
          )}
        </div>
      </section>

      <PortfolioGallery shopId={shop?.id ?? ""} />

      <StudioPhotoReviewsGallery shopId={shop?.id ?? ""} />

      <ProductsSection
        loading={loading}
        products={products}
        selectedSizes={selectedSizes}
        setSelectedSizes={setSelectedSizes}
        selectedColors={selectedColors}
        setSelectedColors={setSelectedColors}
        compareIds={compareIds}
        toggleCompare={toggleCompare}
      />

      <MarketplaceFooter />

      <CompareFloatingBar
        compareIds={compareIds}
        products={products}
        onCompare={() => setCompareOpen(true)}
        onClear={() => setCompareIds([])}
      />
      <CompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        productIds={compareIds}
        products={products}
      />
    </div>
  );
}

function extractAttrValues(products: any[], key: string): string[] {
  const set = new Set<string>();
  for (const p of products) {
    const attr = p?.attributes;
    if (!attr) continue;
    const raw = attr[key] ?? attr[key.toLowerCase()] ?? attr[key.charAt(0).toUpperCase() + key.slice(1)];
    if (Array.isArray(raw)) {
      for (const v of raw) if (v) set.add(String(v).trim());
    } else if (typeof raw === "string" && raw.trim()) {
      // support comma-separated string
      for (const v of raw.split(",")) if (v.trim()) set.add(v.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
}

function productMatchesAttr(product: any, key: string, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const attr = product?.attributes;
  if (!attr) return false;
  const raw = attr[key] ?? attr[key.toLowerCase()] ?? attr[key.charAt(0).toUpperCase() + key.slice(1)];
  let values: string[] = [];
  if (Array.isArray(raw)) values = raw.map(String);
  else if (typeof raw === "string") values = raw.split(",").map((s) => s.trim());
  const lower = values.map((v) => v.toLowerCase());
  return selected.some((s) => lower.includes(s.toLowerCase()));
}

function BundleCard({ product }: { product: any }) {
  const shopSlug = product.shop?.slug ?? "";
  return (
    <Link
      to="/toko/$slug/produk/$productId"
      params={{ slug: shopSlug, productId: product.id }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-background transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-muted/40">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Package className="h-10 w-10 opacity-30" />
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
          <Package className="h-3 w-3" /> PAKET
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground group-hover:text-primary">
          {product.name}
        </p>
        <p className="mt-auto text-sm font-bold text-primary">
          Rp {Number(product.price).toLocaleString("id-ID")}
        </p>
      </div>
    </Link>
  );
}

function ProductsSection({
  loading,
  products,
  selectedSizes,
  setSelectedSizes,
  selectedColors,
  setSelectedColors,
  compareIds,
  toggleCompare,
}: {
  loading: boolean;
  products: any[];
  selectedSizes: string[];
  setSelectedSizes: (v: string[]) => void;
  selectedColors: string[];
  setSelectedColors: (v: string[]) => void;
  compareIds: string[];
  toggleCompare: (id: string) => void;
}) {
  const bundles = useMemo(() => products.filter((p) => p.item_type === "bundle"), [products]);
  const regulars = useMemo(() => products.filter((p) => p.item_type !== "bundle"), [products]);

  const sizes = useMemo(() => extractAttrValues(regulars, "size"), [regulars]);
  const colors = useMemo(() => extractAttrValues(regulars, "color"), [regulars]);

  const filtered = useMemo(() => {
    return regulars.filter(
      (p) =>
        productMatchesAttr(p, "size", selectedSizes) &&
        productMatchesAttr(p, "color", selectedColors),
    );
  }, [regulars, selectedSizes, selectedColors]);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const hasFilters = sizes.length > 0 || colors.length > 0;
  const activeCount = selectedSizes.length + selectedColors.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 space-y-10">
      {/* ── Paket Bundle section ── */}
      {(loading || bundles.length > 0) && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 px-2.5 py-1 text-xs font-bold text-violet-700 dark:text-violet-300">
              <Package className="h-3.5 w-3.5" /> Paket Bundle
            </span>
            <h2 className="text-xl font-bold tracking-tight">Paket Hemat</h2>
          </div>
          {loading ? (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
              {bundles.map((p) => (
                <div key={p.id} className="relative">
                  <BundleCard product={p} />
                  <CompareToggleButton productId={p.id} compareIds={compareIds} toggleCompare={toggleCompare} maxed={compareIds.length >= 3} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Regular products section ── */}
      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight">Produk</h2>
          {activeCount > 0 && (
            <button
              onClick={() => { setSelectedSizes([]); setSelectedColors([]); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Reset filter ({activeCount})
            </button>
          )}
        </div>

        {hasFilters && (
          <div className="mb-5 space-y-3">
            {sizes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground w-14 shrink-0">Ukuran</span>
                {sizes.map((s) => {
                  const on = selectedSizes.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggle(selectedSizes, setSelectedSizes, s)}
                      className={`px-3 h-8 rounded-full border text-xs font-medium transition-colors ${
                        on
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary/50"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            )}
            {colors.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground w-14 shrink-0">Warna</span>
                {colors.map((c) => {
                  const on = selectedColors.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => toggle(selectedColors, setSelectedColors, c)}
                      className={`px-3 h-8 rounded-full border text-xs font-medium transition-colors ${
                        on
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary/50"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {regulars.length === 0
              ? "Belum ada produk."
              : "Tidak ada produk yang cocok dengan filter. Coba reset atau ubah pilihan."}
          </p>
        ) : (
          <>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
              {filtered.map((p) => (
                <div key={p.id} className="relative">
                  <ProductCard product={p} />
                  <CompareToggleButton productId={p.id} compareIds={compareIds} toggleCompare={toggleCompare} maxed={compareIds.length >= 3} />
                </div>
              ))}
            </div>
            {activeCount > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Menampilkan {filtered.length} dari {regulars.length} produk
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function CompareToggleButton({
  productId,
  compareIds,
  toggleCompare,
  maxed,
}: {
  productId: string;
  compareIds: string[];
  toggleCompare: (id: string) => void;
  maxed: boolean;
}) {
  const selected = compareIds.includes(productId);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selected && maxed) {
          toast.info("Maksimal 3 produk untuk dibandingkan");
          return;
        }
        toggleCompare(productId);
      }}
      title={selected ? "Hapus dari perbandingan" : "Bandingkan produk ini"}
      className={`absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-md border shadow-sm transition-all ${
        selected
          ? "bg-primary border-primary text-primary-foreground"
          : "bg-background/90 border-border hover:border-primary/60 text-muted-foreground hover:text-primary"
      }`}
    >
      {selected ? <Check className="h-3.5 w-3.5" /> : <Scale className="h-3 w-3" />}
    </button>
  );
}

function CompareFloatingBar({
  compareIds,
  products,
  onCompare,
  onClear,
}: {
  compareIds: string[];
  products: any[];
  onCompare: () => void;
  onClear: () => void;
}) {
  if (compareIds.length === 0) return null;

  const selected = compareIds.map(id => products.find(p => p.id === id)).filter(Boolean);

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex justify-center pb-4 px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-background/95 backdrop-blur-sm shadow-2xl px-4 py-3 animate-in slide-in-from-bottom-4 duration-200">
        {/* Thumbnails + empty slots */}
        <div className="flex items-center gap-1.5">
          {selected.map((p: any) => (
            <div
              key={p.id}
              className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/40"
            >
              {p.image_url
                ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                : <div className="flex h-full w-full items-center justify-center"><Store className="h-4 w-4 text-muted-foreground" /></div>
              }
            </div>
          ))}
          {Array.from({ length: 3 - compareIds.length }).map((_, i) => (
            <div
              key={i}
              className="h-11 w-11 shrink-0 rounded-lg border border-dashed border-border bg-muted/20 flex items-center justify-center"
            >
              <span className="text-[18px] text-muted-foreground/40">+</span>
            </div>
          ))}
        </div>

        <div className="h-8 w-px bg-border shrink-0" />

        <div className="min-w-0 hidden sm:block">
          <p className="text-xs font-semibold text-foreground">{compareIds.length}/3 produk dipilih</p>
          <p className="text-[10px] text-muted-foreground">Pilih hingga 3 untuk dibandingkan</p>
        </div>

        <Button
          size="sm"
          onClick={onCompare}
          disabled={compareIds.length < 2}
          className="shrink-0 gap-1.5"
        >
          <Scale className="h-3.5 w-3.5" />
          Bandingkan
        </Button>

        <button
          onClick={onClear}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Hapus semua pilihan"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function CompareModal({
  open,
  onClose,
  productIds,
  products,
}: {
  open: boolean;
  onClose: () => void;
  productIds: string[];
  products: any[];
}) {
  const { user } = useAuth();
  const [bundleItems, setBundleItems] = useState<Record<string, any[]>>({});

  const selected = productIds.map(id => products.find(p => p.id === id)).filter(Boolean);

  useEffect(() => {
    if (!open || selected.length === 0) return;
    const bundleIds = selected.filter((p: any) => p.item_type === "bundle").map((p: any) => p.id);
    if (bundleIds.length === 0) { setBundleItems({}); return; }

    (async () => {
      const { data } = await (supabase as any)
        .from("bundle_items")
        .select("bundle_id, quantity, menu_item:menu_item_id(name)")
        .in("bundle_id", bundleIds);

      const grouped: Record<string, any[]> = {};
      for (const item of (data ?? []) as any[]) {
        if (!grouped[item.bundle_id]) grouped[item.bundle_id] = [];
        grouped[item.bundle_id].push(item);
      }
      setBundleItems(grouped);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productIds.join(",")]);

  const addCart = async (p: any) => {
    if (!user) { toast.info("Masuk untuk berbelanja"); return; }
    try {
      await addToCart({ shop_id: p.shop_id, product_id: p.id, unit_price: p.price, quantity: 1 });
      toast.success(`${p.name} ditambahkan ke keranjang`);
    } catch { toast.error("Gagal menambahkan"); }
  };

  const prices   = selected.map((p: any) => Number(p.price));
  const ratings  = selected.map((p: any) => Number(p.rating_avg ?? 0));
  const lowestPrice   = selected.length > 1 ? Math.min(...prices)  : -1;
  const highestRating = selected.length > 1 ? Math.max(...ratings) : -1;
  const hasBundle = selected.some((p: any) => p.item_type === "bundle");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Scale className="h-4 w-4 text-primary" /> Perbandingan Produk
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto px-6 pb-6">
          <table
            className="w-full border-collapse"
            style={{ minWidth: `${selected.length * 220 + 120}px` }}
          >
            {/* Product header row */}
            <thead>
              <tr>
                <td className="w-28 pb-4" />
                {selected.map((p: any) => (
                  <td key={p.id} className="pb-4 px-2 align-top min-w-[180px]">
                    <div className="overflow-hidden rounded-xl border border-border">
                      <div className="aspect-[4/3] w-full bg-muted/40">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                          : <div className="flex h-full w-full items-center justify-center"><Store className="h-8 w-8 text-muted-foreground" /></div>
                        }
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold leading-snug line-clamp-2">{p.name}</p>
                        {p.item_type === "bundle" && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                            <Package className="h-2.5 w-2.5" /> PAKET
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Harga */}
              <tr className="border-t border-border">
                <td className="py-3 pr-3 align-middle">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Harga</span>
                </td>
                {selected.map((p: any) => {
                  const price = Number(p.price);
                  const isBest = price === lowestPrice;
                  return (
                    <td key={p.id} className="px-2 py-3 text-center align-middle">
                      <div className="text-base font-bold text-primary">
                        Rp {price.toLocaleString("id-ID")}
                      </div>
                      {isBest && (
                        <div className="mt-0.5 text-[10px] font-semibold text-emerald-600">✓ Termurah</div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Rating */}
              <tr className="border-t border-border bg-muted/20">
                <td className="py-3 pr-3 align-middle">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Rating</span>
                </td>
                {selected.map((p: any) => {
                  const rat = Number(p.rating_avg ?? 0);
                  const isBest = rat > 0 && rat === highestRating;
                  return (
                    <td key={p.id} className="px-2 py-3 text-center align-middle">
                      {rat > 0
                        ? <span className={`font-semibold ${isBest ? "text-amber-500" : ""}`}>
                            ★ {rat.toFixed(1)}
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              ({p.rating_count ?? 0})
                            </span>
                          </span>
                        : <span className="text-xs text-muted-foreground">Belum ada</span>
                      }
                      {isBest && (
                        <div className="mt-0.5 text-[10px] font-semibold text-amber-500">✓ Tertinggi</div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Stok */}
              <tr className="border-t border-border">
                <td className="py-3 pr-3 align-middle">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Stok</span>
                </td>
                {selected.map((p: any) => (
                  <td key={p.id} className="px-2 py-3 text-center align-middle">
                    {p.track_stock
                      ? <span className={`text-sm font-semibold ${Number(p.stock) > 0 ? "text-emerald-600" : "text-destructive"}`}>
                          {Number(p.stock) > 0 ? `${p.stock} unit` : "Habis"}
                        </span>
                      : <span className="text-xs text-muted-foreground">Tidak dilacak</span>
                    }
                  </td>
                ))}
              </tr>

              {/* Isi Paket — only when at least one bundle */}
              {hasBundle && (
                <tr className="border-t border-border bg-muted/20">
                  <td className="py-3 pr-3 align-top">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Isi Paket</span>
                  </td>
                  {selected.map((p: any) => (
                    <td key={p.id} className="px-2 py-3 align-top text-center">
                      {p.item_type === "bundle"
                        ? bundleItems[p.id]?.length > 0
                          ? <ul className="space-y-1 text-left">
                              {bundleItems[p.id].map((bi: any, i: number) => (
                                <li key={i} className="flex items-start gap-1 text-xs">
                                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                                  <span>{bi.quantity > 1 ? `${bi.quantity}× ` : ""}{bi.menu_item?.name ?? "Item"}</span>
                                </li>
                              ))}
                            </ul>
                          : <span className="text-xs text-muted-foreground">—</span>
                        : <span className="text-xs text-muted-foreground">Produk satuan</span>
                      }
                    </td>
                  ))}
                </tr>
              )}

              {/* Actions */}
              <tr className="border-t border-border">
                <td className="py-4" />
                {selected.map((p: any) => (
                  <td key={p.id} className="px-2 py-4">
                    <div className="flex flex-col gap-2">
                      <Button size="sm" className="w-full gap-1.5" onClick={() => addCart(p)}>
                        <ShoppingCart className="h-3.5 w-3.5" /> Beli Sekarang
                      </Button>
                      <Link
                        to="/toko/$slug/produk/$productId"
                        params={{ slug: p.shop?.slug ?? "", productId: p.id }}
                        onClick={onClose}
                      >
                        <Button size="sm" variant="outline" className="w-full">Lihat Detail</Button>
                      </Link>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
