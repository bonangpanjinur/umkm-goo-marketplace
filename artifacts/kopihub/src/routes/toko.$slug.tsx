import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { ProductCard } from "./index";
import { Store, MapPin, Phone, ShieldCheck, Heart, Users, MessageCircle, CalendarCheck, Images, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useSeo } from "@/lib/use-seo";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  TrustCertBadge,
  TrustCertCard,
  computeTrustCert,
} from "@/components/TrustCertBadge";
import { Trophy, Medal } from "lucide-react";

type PortfolioItem = { id: string; image_url: string; caption: string | null; category: string | null; sort_order: number };

function PortfolioGallery({ shopId }: { shopId: string }) {
  const [items, setItems]     = useState<PortfolioItem[]>([]);
  const [loaded, setLoaded]   = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("shop_portfolio")
        .select("id, image_url, caption, category, sort_order")
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
            <img
              src={item.image_url}
              alt={item.caption ?? "Portofolio"}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
              onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/200x200?text=Foto"; }}
            />
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
            <img
              src={items[lightbox].image_url}
              alt={items[lightbox].caption ?? "Portofolio"}
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
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
};

type ReviewStats = {
  avgRating: number;
  count: number;
  replyRate: number;
};

function ShopPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [showCertDetail, setShowCertDetail] = useState(false);

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
        .select("id, shop_id, name, price, image_url, slug, rating_avg, flash_price, flash_starts_at, flash_ends_at")
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
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceHeader />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Toko tidak ditemukan</h1>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">← Beranda</Link>
        </div>
        <MarketplaceFooter />
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
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {shop.address}</span>
                )}
                {shop?.phone && (
                  <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {shop.phone}</span>
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
                  <Link to="/toko/$slug/booking" params={{ slug }}>
                    <CalendarCheck className="h-3.5 w-3.5" />
                    Booking Layanan
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link to="/toko/$slug/chat" params={{ slug }}>
                    <MessageCircle className="h-3.5 w-3.5" />
                    Chat dengan Toko
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

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-4 text-xl font-bold tracking-tight">Produk</h2>
        {loading ? (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada produk.</p>
        ) : (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      <MarketplaceFooter />
    </div>
  );
}
