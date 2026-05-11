import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Store, ShieldCheck, Zap, TrendingUp, Star } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Marketplace — Belanja dari ribuan toko lokal" },
      { name: "description", content: "Marketplace multi-kategori untuk belanja produk F&B, fashion, digital, kerajinan, dan lainnya dari toko lokal terpercaya." },
      { property: "og:title", content: "Marketplace — Belanja dari ribuan toko lokal" },
      { property: "og:description", content: "Marketplace multi-kategori dari toko lokal Indonesia." },
    ],
  }),
  component: MarketplaceHome,
});

type Category = { id: string; slug: string; name: string; description: string | null; icon_url: string | null };
type Shop     = { id: string; slug: string; name: string; tagline: string | null; logo_url: string | null; rating_avg: number | null; rating_count: number | null; is_featured?: boolean; kyc_status?: string };
type Product  = { id: string; shop_id: string; name: string; price: number; image_url: string | null; slug: string | null; rating_avg: number | null; flash_price?: number | null; flash_starts_at?: string | null; flash_ends_at?: string | null; shop?: { slug: string; name: string } };

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
      {shop.tagline && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{shop.tagline}</p>}
    </Link>
  );
}

function MarketplaceHome() {
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [shops,       setShops]       = useState<Shop[]>([]);
  const [newShops,    setNewShops]    = useState<Shop[]>([]);
  const [products,    setProducts]    = useState<Product[]>([]);
  const [flashProds,  setFlashProds]  = useState<Product[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [stats,       setStats]       = useState({ shops: 0, products: 0 });
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      const now = new Date().toISOString();
      const [cats, shopsRes, newShopsRes, prodRes, flashRes, shopCount, prodCount] = await Promise.all([
        supabase.from("business_categories").select("id, slug, name, description, icon_url").eq("is_active", true).order("sort_order"),
        (supabase as any).from("coffee_shops").select("id, slug, name, tagline, logo_url, rating_avg, rating_count, is_featured, kyc_status").eq("is_active", true).eq("is_featured", true).order("rating_avg", { ascending: false, nullsFirst: false }).limit(8),
        (supabase as any).from("coffee_shops").select("id, slug, name, tagline, logo_url, rating_avg, rating_count, kyc_status").eq("is_active", true).order("created_at", { ascending: false }).limit(6),
        supabase.from("menu_items").select("id, shop_id, name, price, image_url, slug, rating_avg, is_featured, flash_price, flash_starts_at, flash_ends_at, shop:coffee_shops(slug, name)").eq("is_available", true).order("is_featured", { ascending: false }).order("rating_avg", { ascending: false, nullsFirst: false }).limit(12),
        supabase.from("menu_items").select("id, shop_id, name, price, image_url, slug, rating_avg, flash_price, flash_starts_at, flash_ends_at, shop:coffee_shops(slug, name)").eq("is_available", true).not("flash_price", "is", null).lt("flash_starts_at", now).gt("flash_ends_at", now).order("flash_ends_at", { ascending: true }).limit(8),
        supabase.from("coffee_shops").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("is_available", true),
      ]);
      setCategories((cats.data as Category[]) ?? []);
      const featuredShops = (shopsRes.data as Shop[]) ?? [];
      const allNewShops   = (newShopsRes.data as Shop[]) ?? [];
      setShops(featuredShops.length > 0 ? featuredShops : allNewShops.slice(0, 8));
      setNewShops(allNewShops);
      setProducts((prodRes.data as any) ?? []);
      setFlashProds((flashRes.data as any) ?? []);
      setStats({ shops: shopCount.count ?? 0, products: prodCount.count ?? 0 });

      // Produk Terlaris — query order_items 7 hari terakhir
      try {
        const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
        const { data: recentItems } = await supabase
          .from("order_items")
          .select("menu_item_id, quantity")
          .gte("created_at", weekAgo)
          .not("menu_item_id", "is", null);
        const countMap: Record<string, number> = {};
        for (const item of (recentItems ?? [])) {
          if (item.menu_item_id) {
            countMap[item.menu_item_id] = (countMap[item.menu_item_id] ?? 0) + Number(item.quantity);
          }
        }
        const topIds = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
        if (topIds.length > 0) {
          const { data: bestData } = await supabase
            .from("menu_items")
            .select("id, shop_id, name, price, image_url, slug, rating_avg, flash_price, flash_starts_at, flash_ends_at, shop:coffee_shops(slug, name)")
            .in("id", topIds)
            .eq("is_available", true);
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

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/8 via-background to-primary/4">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Marketplace multi-kategori
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Semua kebutuhanmu, <span className="text-primary">dari toko lokal.</span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Belanja produk F&B, fashion, digital, kerajinan, dan lainnya dari ribuan toko Indonesia — pengiriman cepat, pembayaran aman.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/kategori">
                <Button size="lg" className="h-11 w-full px-6 sm:w-auto">
                  Jelajah Kategori <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="lg" variant="outline" className="h-11 w-full px-6 sm:w-auto">
                  <Store className="mr-1.5 h-4 w-4" /> Buka toko gratis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      {(stats.shops > 0 || stats.products > 0) && (
        <div className="border-b border-border bg-card">
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

      {/* Flash Sale */}
      {(loading || flashProds.length > 0) && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground">
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

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-10">
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

      {/* Featured Shops */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-5 flex items-end justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight">Toko Unggulan</h2>
          </div>
          <Link to="/search" search={{ sort: "rating" }} className="text-sm text-primary hover:underline">Semua toko →</Link>
        </div>
        {loading ? <SkeletonGrid cols={4} count={4} />
          : shops.length === 0
            ? <p className="text-sm text-muted-foreground">Belum ada toko. <Link to="/signup" className="text-primary hover:underline">Jadilah yang pertama!</Link></p>
            : (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                {shops.map(s => <ShopCard key={s.id} shop={s} />)}
              </div>
            )
        }
      </section>

      {/* Produk Terlaris */}
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

      {/* New Shops */}
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

      {/* Best products */}
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
    (!product.flash_ends_at   || new Date(product.flash_ends_at).getTime()   > now)
  );
  const displayPrice = flashActive ? Number(product.flash_price) : Number(product.price);
  const discountPct  = flashActive ? Math.round((1 - displayPrice / Number(product.price)) * 100) : 0;
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
      className="group rounded-xl border border-border bg-card overflow-hidden transition hover:border-primary/50 hover:shadow-md"
    >
      <div className="relative aspect-square w-full bg-muted/40">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
          : <div className="flex h-full w-full items-center justify-center text-muted-foreground"><Store className="h-8 w-8" /></div>
        }
        {flashActive && (
          <span className="absolute left-2 top-2 rounded-md bg-destructive px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive-foreground shadow">
            -{discountPct}%
          </span>
        )}
        {flashActive && remaining && (
          <span className="absolute right-2 top-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground shadow backdrop-blur">
            ⚡ {remaining}
          </span>
        )}
        {product.rating_avg && Number(product.rating_avg) >= 4.5 && (
          <span className="absolute bottom-2 left-2 flex items-center gap-0.5 rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
            <Star className="h-2.5 w-2.5 fill-white" />{Number(product.rating_avg).toFixed(1)}
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="line-clamp-2 text-xs font-medium leading-snug">{product.name}</div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className={`text-sm font-bold ${flashActive ? "text-destructive" : "text-primary"}`}>
            Rp {displayPrice.toLocaleString("id-ID")}
          </span>
          {flashActive && (
            <span className="text-[10px] text-muted-foreground line-through">
              Rp {Number(product.price).toLocaleString("id-ID")}
            </span>
          )}
        </div>
        {product.shop && (
          <div className="mt-1 truncate text-[11px] text-muted-foreground">{product.shop.name}</div>
        )}
      </div>
    </Link>
  );
}
