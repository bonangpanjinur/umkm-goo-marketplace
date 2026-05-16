import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Sparkles, Store, ShieldCheck, Zap, TrendingUp, Star,
  ChevronLeft, ChevronRight, Megaphone, Package, Trophy, Medal,
  Plus, Flame, BadgeCheck,
} from "lucide-react";

function computeShopTier(shop: { kyc_status?: string; rating_avg?: number | null; rating_count?: number | null }) {
  const r = Number(shop.rating_avg ?? 0);
  const n = Number(shop.rating_count ?? 0);
  if (r >= 4.8 && n >= 100) return { label: "Platinum", icon: Trophy, cls: "bg-violet-100 text-violet-700" };
  if (r >= 4.5 && n >= 30)  return { label: "Gold Seller", icon: Medal, cls: "bg-amber-100 text-amber-700" };
  if (r >= 4.0 && n >= 10)  return { label: "Top Seller", icon: Medal, cls: "bg-sky-100 text-sky-700" };
  return null;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UMKMgo — Marketplace Produk Lokal Indonesia" },
      { name: "description", content: "Belanja produk F&B, fashion, digital, kerajinan, dan lainnya dari ribuan toko UMKM Indonesia — pengiriman cepat, pembayaran aman." },
      { property: "og:title", content: "UMKMgo — Marketplace Produk Lokal Indonesia" },
      { property: "og:description", content: "Marketplace multi-kategori UMKM Indonesia." },
    ],
  }),
  component: MarketplaceHome,
});

type Category = { id: string; slug: string; name: string; description: string | null; icon_url: string | null };
type Shop = { id: string; slug: string; name: string; tagline: string | null; logo_url: string | null; rating_avg: number | null; rating_count: number | null; is_featured?: boolean; kyc_status?: string; business_category_id?: string | null };
type Product = { id: string; shop_id: string; name: string; price: number; image_url: string | null; slug: string | null; rating_avg: number | null; rating_count?: number | null; stock?: number | null; total_sold?: number | null; low_stock_threshold?: number | null; flash_price?: number | null; flash_starts_at?: string | null; flash_ends_at?: string | null; shop?: { slug: string; name: string; logo_url?: string | null; kyc_status?: string | null } };
type Banner = { id: string; title: string; subtitle: string | null; cta_text: string | null; cta_link: string | null; image_url: string | null; bg_color: string | null; sort_order: number };
type AdSpot = { id: string; ad_type: "product" | "shop"; target_id: string; target_name: string; target_image: string | null; position: string; shop_name: string };

const DEFAULT_BANNERS: Banner[] = [
  { id: "def-1", title: "Semua Kebutuhanmu, dari Toko Lokal", subtitle: "Belanja produk F&B, fashion, digital, kerajinan dari ribuan UMKM Indonesia", cta_text: "Jelajahi Sekarang", cta_link: "/kategori", image_url: null, bg_color: "from-primary via-emerald-600 to-teal-700", sort_order: 1 },
  { id: "def-2", title: "Flash Sale Setiap Hari", subtitle: "Diskon hingga 70% untuk produk pilihan — stok terbatas!", cta_text: "Lihat Promo", cta_link: "/promo", image_url: null, bg_color: "from-rose-500 via-orange-500 to-amber-500", sort_order: 2 },
  { id: "def-3", title: "Buka Toko Gratis, Jual ke Seluruh Indonesia", subtitle: "Bergabunglah dengan ribuan pemilik UMKM yang sudah sukses bersama UMKMgo", cta_text: "Daftar Sekarang", cta_link: "/signup", image_url: null, bg_color: "from-violet-600 via-purple-600 to-blue-600", sort_order: 3 },
];

// ─── Banner Carousel ────────────────────────────────────────────────────────
function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => setCurrent(c => (c + 1) % banners.length), [banners.length]);
  const prev = useCallback(() => setCurrent(c => (c - 1 + banners.length) % banners.length), [banners.length]);

  useEffect(() => {
    if (paused || banners.length <= 1) return;
    timerRef.current = setInterval(next, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, next, banners.length]);

  if (banners.length === 0) return null;
  const b = banners[current];

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide */}
      <div className={`relative min-h-[320px] sm:min-h-[420px] bg-gradient-to-br ${b.bg_color ?? "from-primary to-emerald-600"} transition-all duration-700`}>
        {/* Background image overlay */}
        {b.image_url && (
          <img
            src={b.image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-40"
          />
        )}
        {/* Decorative shapes */}
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 right-10 h-52 w-52 rounded-full bg-white/5" />
        <div className="absolute bottom-16 right-1/3 h-24 w-24 rounded-full bg-white/5" />

        <div className="relative mx-auto flex h-full max-w-7xl items-center px-6 py-16 sm:px-10">
          <div className="max-w-lg text-white">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl drop-shadow-sm">
              {b.title}
            </h1>
            {b.subtitle && (
              <p className="mt-4 text-base sm:text-lg leading-relaxed text-white/85">
                {b.subtitle}
              </p>
            )}
            {b.cta_text && b.cta_link && (
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to={b.cta_link as any}>
                  <Button size="lg" className="h-12 w-full border-2 border-white/30 bg-white text-primary font-bold shadow-lg hover:bg-white/90 sm:w-auto">
                    {b.cta_text} <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="lg" variant="ghost" className="h-12 w-full border-2 border-white/40 text-white hover:bg-white/10 sm:w-auto">
                    <Store className="mr-1.5 h-4 w-4" /> Buka toko gratis
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Nav arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur transition hover:bg-black/40"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur transition hover:bg-black/40"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full bg-white transition-all duration-300 ${i === current ? "w-6 h-2 opacity-100" : "w-2 h-2 opacity-50 hover:opacity-75"}`}
              />
            ))}
          </div>
        )}

        {/* Slide counter */}
        <div className="absolute right-4 bottom-5 rounded-full bg-black/20 px-2.5 py-1 text-xs text-white/80 backdrop-blur">
          {current + 1} / {banners.length}
        </div>
      </div>
    </div>
  );
}

// ─── Sponsored Products / Shops (Iklan) ────────────────────────────────────
function SponsoredSection({ ads }: { ads: AdSpot[] }) {
  if (ads.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
          <Megaphone className="h-3 w-3" /> Iklan Sponsor
        </span>
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {ads.slice(0, 4).map(ad => (
          <Link
            key={ad.id}
            to={ad.ad_type === "product" ? "/toko/$slug/produk/$productId" : "/toko/$slug"}
            params={ad.ad_type === "product"
              ? { slug: ad.shop_name, productId: ad.target_id }
              : { slug: ad.target_id }}
            className="group relative rounded-xl border border-border bg-card overflow-hidden transition hover:border-primary/50 hover:shadow-md"
          >
            <div className="aspect-square w-full bg-gradient-to-br from-primary/10 to-emerald-50 flex items-center justify-center">
              {ad.target_image
                ? <img src={ad.target_image} alt={ad.target_name} className="h-full w-full object-cover transition group-hover:scale-105" />
                : (
                  <div className="flex flex-col items-center gap-2 text-primary/40">
                    {ad.ad_type === "product" ? <Package className="h-10 w-10" /> : <Store className="h-10 w-10" />}
                  </div>
                )
              }
              <span className="absolute right-2 top-2 rounded-full border border-border/50 bg-background/90 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground backdrop-blur">
                Iklan
              </span>
            </div>
            <div className="p-3">
              <p className="text-xs font-medium line-clamp-2 leading-snug">{ad.target_name}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{ad.shop_name}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Flash Countdown ────────────────────────────────────────────────────────
function FlashCountdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const end = new Date(endsAt).getTime();
    const tick = () => {
      const ms = end - Date.now();
      if (ms <= 0) { setRemaining(""); return; }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setRemaining(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!remaining) return null;
  return (
    <span className="flex items-center gap-1.5 rounded-lg bg-destructive/20 px-3 py-1 font-mono text-sm font-bold tabular-nums text-destructive">
      <Zap className="h-3.5 w-3.5" /> {remaining}
    </span>
  );
}

function SkeletonGrid({ cols = 4, count = 8 }: { cols?: number; count?: number }) {
  return (
    <div className={`grid gap-3 grid-cols-2 sm:grid-cols-${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl bg-muted/40 animate-pulse aspect-[3/4]" />
      ))}
    </div>
  );
}

function ShopCard({ shop }: { shop: Shop }) {
  const tier = computeShopTier(shop);
  return (
    <Link
      to="/toko/$slug"
      params={{ slug: shop.slug }}
      className="group flex flex-col rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        {shop.logo_url
          ? <img src={shop.logo_url} alt={shop.name} className="h-12 w-12 rounded-full object-cover border border-border" />
          : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Store className="h-5 w-5" /></div>
        }
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate text-sm font-semibold">{shop.name}</span>
            {shop.kyc_status === "approved" && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
          </div>
          {shop.rating_avg
            ? <div className="text-xs text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{Number(shop.rating_avg).toFixed(1)} ({shop.rating_count ?? 0})</div>
            : <div className="text-xs text-muted-foreground">Toko baru</div>
          }
        </div>
      </div>
      {tier && (() => { const Icon = tier.icon; return (
        <div className="mt-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tier.cls}`}>
            <Icon className="h-2.5 w-2.5" /> {tier.label}
          </span>
        </div>
      ); })()}
      {shop.tagline && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{shop.tagline}</p>}
    </Link>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
function MarketplaceHome() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [sponsoredAds, setSponsoredAds] = useState<AdSpot[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catCounts, setCatCounts] = useState<Record<string, number>>({});
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [newShops, setNewShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [flashProds, setFlashProds] = useState<Product[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [stats, setStats] = useState({ shops: 0, products: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const now = new Date().toISOString();

      // Load banners
      try {
        const { data: bannerData } = await (supabase as any).from("banners").select("*").eq("is_active", true).order("sort_order");
        if (bannerData && bannerData.length > 0) setBanners(bannerData as Banner[]);
        else setBanners(DEFAULT_BANNERS);
      } catch { setBanners(DEFAULT_BANNERS); }

      // Load sponsored ads (homepage_middle position)
      try {
        const { data: adData } = await (supabase as any).from("ad_requests")
          .select("id, ad_type, target_id, target_name, target_image, position, coffee_shops(name)")
          .eq("status", "active")
          .in("position", ["homepage_middle", "hero_carousel"])
          .lt("starts_at", now)
          .gt("ends_at", now);
        if (adData) {
          setSponsoredAds(adData.map((a: any) => ({ ...a, shop_name: a.coffee_shops?.name ?? "" })));
        }
      } catch { /* no ads table yet, skip gracefully */ }

      const [cats, shopsRes, newShopsRes, prodRes, flashRes, shopCount, prodCount, allShopCats] = await Promise.all([
        supabase.from("business_categories").select("id, slug, name, description, icon_url").eq("is_active", true).order("sort_order"),
        (supabase as any).from("coffee_shops").select("id, slug, name, tagline, logo_url, rating_avg, rating_count, is_featured, kyc_status, business_category_id").eq("is_active", true).eq("is_featured", true).order("rating_avg", { ascending: false, nullsFirst: false }).limit(32),
        (supabase as any).from("coffee_shops").select("id, slug, name, tagline, logo_url, rating_avg, rating_count, kyc_status, business_category_id").eq("is_active", true).order("created_at", { ascending: false }).limit(6),
        supabase.from("menu_items").select("id, shop_id, name, price, image_url, slug, rating_avg, rating_count, stock, total_sold, low_stock_threshold, is_featured, flash_price, flash_starts_at, flash_ends_at, shop:coffee_shops(slug, name, logo_url, kyc_status)").eq("is_available", true).order("is_featured", { ascending: false }).order("rating_avg", { ascending: false, nullsFirst: false }).limit(12),
        supabase.from("menu_items").select("id, shop_id, name, price, image_url, slug, rating_avg, rating_count, stock, total_sold, low_stock_threshold, flash_price, flash_starts_at, flash_ends_at, shop:coffee_shops(slug, name, logo_url, kyc_status)").eq("is_available", true).not("flash_price", "is", null).lt("flash_starts_at", now).gt("flash_ends_at", now).order("flash_ends_at", { ascending: true }).limit(8),
        supabase.from("coffee_shops").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("is_available", true),
        supabase.from("coffee_shops").select("business_category_id").eq("is_active", true),
      ]);

      // Aggregate shop counts per category
      const countMap: Record<string, number> = {};
      for (const r of (allShopCats.data as any[]) ?? []) {
        if (!r.business_category_id) continue;
        countMap[r.business_category_id] = (countMap[r.business_category_id] ?? 0) + 1;
      }
      setCatCounts(countMap);

      // Sort categories: non-zero first by count desc, then zero-count ones
      const rawCats = (cats.data as Category[]) ?? [];
      const sortedCats = [...rawCats].sort((a, b) => {
        const ca = countMap[a.id] ?? 0;
        const cb = countMap[b.id] ?? 0;
        if (ca === 0 && cb === 0) return 0;
        if (ca === 0) return 1;
        if (cb === 0) return -1;
        return cb - ca;
      });
      setCategories(sortedCats);

      const featuredShops = (shopsRes.data as Shop[]) ?? [];
      const allNewShops = (newShopsRes.data as Shop[]) ?? [];
      setShops(featuredShops.length > 0 ? featuredShops : allNewShops.slice(0, 32));
      setNewShops(allNewShops);
      setProducts((prodRes.data as any) ?? []);
      setFlashProds((flashRes.data as any) ?? []);
      setStats({ shops: shopCount.count ?? 0, products: prodCount.count ?? 0 });

      // Produk Terlaris
      try {
        const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
        const { data: recentItems } = await supabase.from("order_items").select("menu_item_id, quantity").gte("created_at", weekAgo).not("menu_item_id", "is", null);
        const countMap: Record<string, number> = {};
        for (const item of (recentItems ?? [])) {
          if (item.menu_item_id) countMap[item.menu_item_id] = (countMap[item.menu_item_id] ?? 0) + Number(item.quantity);
        }
        const topIds = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
        if (topIds.length > 0) {
          const { data: bestData } = await supabase.from("menu_items").select("id, shop_id, name, price, image_url, slug, rating_avg, rating_count, stock, total_sold, low_stock_threshold, flash_price, flash_starts_at, flash_ends_at, shop:coffee_shops(slug, name, logo_url, kyc_status)").in("id", topIds).eq("is_available", true);
          setBestsellers((bestData as any) ?? []);
        }
      } catch (_) {}

      setLoading(false);
    })();
  }, []);

  const earliestFlashEnd = flashProds[0]?.flash_ends_at;

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />

      {/* ── Banner Carousel ── */}
      {loading ? (
        <div className="relative min-h-[320px] sm:min-h-[420px] bg-gradient-to-br from-primary/20 to-emerald-100 animate-pulse" />
      ) : (
        <BannerCarousel banners={banners} />
      )}

      {/* ── Trust Bar ── */}
      {(stats.shops > 0 || stats.products > 0) && (
        <div className="border-b border-border bg-card shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Store className="h-4 w-4 text-primary" />
                <span><strong className="text-foreground">{stats.shops.toLocaleString("id-ID")}</strong> toko aktif</span>
              </div>
              <div className="h-4 w-px bg-border hidden sm:block" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span><strong className="text-foreground">{stats.products.toLocaleString("id-ID")}</strong> produk tersedia</span>
              </div>
              <div className="h-4 w-px bg-border hidden sm:block" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Pembayaran <strong className="text-foreground">aman & terverifikasi</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Flash Sale ── */}
      {(loading || flashProds.length > 0) && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground shadow-md">
                <Zap className="h-4 w-4" /> Flash Sale
              </div>
              {!loading && earliestFlashEnd && <FlashCountdown endsAt={earliestFlashEnd} />}
            </div>
            <Link to="/search" search={{ sort: "termurah" }} className="text-sm text-primary hover:underline">Semua promo →</Link>
          </div>
          {loading
            ? <SkeletonGrid cols={4} count={8} />
            : (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-4">
                {flashProds.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )
          }
        </section>
      )}

      {/* ── Sponsored / Iklan (Homepage Middle) ── */}
      {!loading && <SponsoredSection ads={sponsoredAds} />}

      {/* ── Categories ── */}
      <section className="mx-auto max-w-7xl px-4 py-10 border-t border-border">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Kategori</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Pilih sesuai minatmu.</p>
          </div>
          <Link to="/kategori" className="text-sm text-primary hover:underline">Semua →</Link>
        </div>
        {loading ? (
          <div className="grid gap-3 grid-cols-3 sm:grid-cols-6 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square rounded-xl bg-muted/40 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-3 sm:grid-cols-6 lg:grid-cols-8">
            {categories.slice(0, 16).map((c) => (
              <Link
                key={c.id}
                to="/kategori/$slug"
                params={{ slug: c.slug }}
                className="group flex flex-col items-center justify-center rounded-xl border border-border bg-card p-3 text-center transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {c.icon_url ? <img src={c.icon_url} alt={c.name} className="h-6 w-6" /> : <Store className="h-4 w-4" />}
                </div>
                <span className="text-[11px] font-medium text-foreground line-clamp-2 leading-snug">{c.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Category Filter + Featured Shops ── */}
      <section className="mx-auto max-w-7xl px-4 py-10 border-t border-border">
        <div className="mb-4 flex items-end justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight">Toko Unggulan</h2>
          </div>
          <Link to="/search" search={{ sort: "rating" }} className="text-sm text-primary hover:underline">Semua toko →</Link>
        </div>

        {/* Horizontal scrollable category filter chips */}
        {!loading && categories.some(c => (catCounts[c.id] ?? 0) > 0) && (
          <div className="mb-5 -mx-1 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCatId(null)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                selectedCatId === null
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5"
              }`}
            >
              Semua
            </button>
            {categories
              .filter(c => (catCounts[c.id] ?? 0) > 0)
              .map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCatId(prev => prev === c.id ? null : c.id)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    selectedCatId === c.id
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  {c.icon_url && <img src={c.icon_url} alt="" className="h-3.5 w-3.5 opacity-80" />}
                  {c.name}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                    selectedCatId === c.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {catCounts[c.id]}
                  </span>
                </button>
              ))
            }
          </div>
        )}

        {loading ? <SkeletonGrid cols={4} count={4} />
          : (() => {
              const filtered = selectedCatId
                ? shops.filter(s => s.business_category_id === selectedCatId)
                : shops;
              const selectedCat = selectedCatId ? categories.find(c => c.id === selectedCatId) : null;
              return filtered.length === 0
                ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      {selectedCat
                        ? <>Belum ada toko unggulan di kategori <strong>{selectedCat.name}</strong>. <Link to={`/kategori/${selectedCat.slug}`} className="text-primary hover:underline">Jelajahi semua →</Link></>
                        : <>Belum ada toko. <Link to="/signup" className="text-primary hover:underline">Jadilah yang pertama!</Link></>
                      }
                    </p>
                  </div>
                )
                : (
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                    {filtered.slice(0, 8).map(s => <ShopCard key={s.id} shop={s} />)}
                  </div>
                );
            })()
        }
      </section>

      {/* ── Produk Terlaris ── */}
      {(loading || bestsellers.length > 0) && (
        <section className="mx-auto max-w-7xl px-4 py-10 border-t border-border">
          <div className="mb-5 flex items-end justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-rose-500" />
              <div>
                <h2 className="text-xl font-bold tracking-tight">Produk Terlaris Minggu Ini</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Paling banyak dibeli dalam 7 hari terakhir.</p>
              </div>
            </div>
          </div>
          {loading ? (
            <SkeletonGrid cols={4} count={8} />
          ) : (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {bestsellers.map((p, i) => (
                <div key={p.id} className="relative">
                  {i < 3 && (
                    <div className={`absolute -top-2 -left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow-md ${i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : "bg-amber-700"}`}>
                      {i + 1}
                    </div>
                  )}
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Baru Bergabung ── */}
      {(loading || newShops.length > 0) && (
        <section className="mx-auto max-w-7xl px-4 py-10 border-t border-border">
          <div className="mb-5 flex items-end justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold tracking-tight">Baru Bergabung</h2>
            </div>
          </div>
          {loading ? <SkeletonGrid cols={3} count={3} />
            : (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 md:grid-cols-6">
                {newShops.slice(0, 6).map(s => <ShopCard key={s.id} shop={s} />)}
              </div>
            )
          }
        </section>
      )}

      {/* ── Produk Pilihan ── */}
      <section className="mx-auto max-w-7xl px-4 py-10 border-t border-border">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-xl font-bold tracking-tight">Produk Pilihan</h2>
          <Link to="/search" search={{}} className="text-sm text-primary hover:underline">Semua produk →</Link>
        </div>
        {loading ? <SkeletonGrid cols={4} count={12} />
          : products.length === 0
            ? <p className="text-sm text-muted-foreground">Belum ada produk.</p>
            : (
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )
        }
      </section>

      {/* ── CTA Daftar Toko ── */}
      <section className="border-t border-border bg-gradient-to-br from-primary/8 via-background to-emerald-50/40">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Punya produk yang ingin kamu jual?</h2>
          <p className="mt-3 text-muted-foreground">Buka toko di UMKMgo gratis — tanpa biaya setup, langsung bisa berjualan.</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/signup">
              <Button size="lg" className="h-11 px-8 shadow-md">
                <Store className="mr-1.5 h-4 w-4" /> Buka Toko Gratis
              </Button>
            </Link>
            <Link to="/kategori">
              <Button size="lg" variant="outline" className="h-11 px-8">
                Jelajahi Marketplace <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <MarketplaceFooter />
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const shopSlug = product.shop?.slug ?? "";
  const now = Date.now();
  const flashActive = !!(
    product.flash_price != null &&
    Number(product.flash_price) > 0 &&
    Number(product.flash_price) < Number(product.price) &&
    (!product.flash_starts_at || new Date(product.flash_starts_at).getTime() <= now) &&
    (!product.flash_ends_at || new Date(product.flash_ends_at).getTime() > now)
  );
  const displayPrice = flashActive ? Number(product.flash_price) : Number(product.price);
  const discountPct = flashActive ? Math.round((1 - displayPrice / Number(product.price)) * 100) : 0;
  const [remaining, setRemaining] = useState<string>("");
  useEffect(() => {
    if (!flashActive || !product.flash_ends_at) return;
    const end = new Date(product.flash_ends_at).getTime();
    const tick = () => {
      const ms = end - Date.now();
      if (ms <= 0) { setRemaining(""); return; }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setRemaining(h > 0 ? `${h}j ${m}m` : `${m}m ${s}d`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [flashActive, product.flash_ends_at]);

  return (
    <Link
      to="/toko/$slug/produk/$productId"
      params={{ slug: shopSlug, productId: product.id }}
      className="group relative flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 hover:ring-2 hover:ring-primary/20"
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-muted/30 to-muted/60">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
          : <div className="flex h-full w-full items-center justify-center text-muted-foreground/40"><Store className="h-10 w-10" /></div>
        }
        {/* Bottom gradient overlay for readability */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Top-left badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {flashActive && (
            <span className="flex items-center gap-0.5 rounded-md bg-gradient-to-r from-rose-500 to-orange-500 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-md animate-pulse">
              <Flame className="h-2.5 w-2.5" />-{discountPct}%
            </span>
          )}
          {!flashActive && product.stock != null && product.stock > 0 && product.stock <= (product.low_stock_threshold ?? 5) && (
            <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
              Sisa {product.stock}
            </span>
          )}
        </div>

        {/* Top-right: flash countdown */}
        {flashActive && remaining && (
          <span className="absolute right-2 top-2 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground shadow-sm backdrop-blur-md ring-1 ring-border/40">
            ⏱ {remaining}
          </span>
        )}

        {/* Bottom-left rating chip */}
        {product.rating_avg && Number(product.rating_avg) >= 4.5 && (
          <span className="absolute bottom-2 left-2 flex items-center gap-0.5 rounded-full bg-amber-400/95 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-md">
            <Star className="h-2.5 w-2.5 fill-white" />{Number(product.rating_avg).toFixed(1)}
          </span>
        )}

        {/* Quick-Add floating button (desktop hover) */}
        <button
          type="button"
          aria-label="Tambah cepat"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="absolute bottom-2 right-2 hidden h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 opacity-0 translate-y-1 transition-all duration-300 hover:scale-110 group-hover:flex group-hover:opacity-100 group-hover:translate-y-0"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3">
        <div className="line-clamp-2 min-h-[2.25rem] text-sm font-semibold leading-snug tracking-tight text-foreground">
          {product.name}
        </div>

        {/* Price block */}
        <div className="mt-2 flex flex-col gap-0.5">
          <span className={`text-base font-extrabold leading-none ${flashActive ? "text-rose-600" : "text-primary"}`}>
            Rp {displayPrice.toLocaleString("id-ID")}
          </span>
          {flashActive && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground line-through">
                Rp {Number(product.price).toLocaleString("id-ID")}
              </span>
              <span className="rounded bg-rose-50 px-1 py-px text-[9px] font-bold text-rose-600 dark:bg-rose-500/10">
                HEMAT {discountPct}%
              </span>
            </div>
          )}
        </div>

        {/* Footer: shop + sold */}
        <div className="mt-2 flex items-center justify-between gap-1.5 border-t border-border/40 pt-2">
          {product.shop && (
            <div className="flex min-w-0 items-center gap-1.5">
              <div className="h-4 w-4 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border/40">
                {product.shop.logo_url
                  ? <img src={product.shop.logo_url} alt="" className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center text-[8px] text-muted-foreground">{product.shop.name?.[0]?.toUpperCase()}</div>}
              </div>
              <span className="truncate text-[10px] font-medium text-muted-foreground">{product.shop.name}</span>
              {product.shop.kyc_status === "approved" && (
                <BadgeCheck className="h-3 w-3 shrink-0 text-sky-500" />
              )}
            </div>
          )}
          {product.total_sold != null && product.total_sold > 0 && (
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {product.total_sold >= 1000 ? `${(product.total_sold / 1000).toFixed(1)}rb` : product.total_sold} terjual
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
