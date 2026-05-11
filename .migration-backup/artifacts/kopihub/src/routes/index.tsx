import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Store } from "lucide-react";

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

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
};

type Shop = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
};

type Product = {
  id: string;
  shop_id: string;
  name: string;
  price: number;
  image_url: string | null;
  slug: string | null;
  rating_avg: number | null;
  flash_price?: number | null;
  flash_starts_at?: string | null;
  flash_ends_at?: string | null;
  shop?: { slug: string; name: string };
};

function MarketplaceHome() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [cats, shopsRes, prodRes] = await Promise.all([
        supabase
          .from("business_categories")
          .select("id, slug, name, description, icon_url")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("coffee_shops")
          .select("id, slug, name, tagline, logo_url, rating_avg, rating_count, is_featured")
          .eq("is_active", true)
          .order("is_featured", { ascending: false })
          .order("rating_avg", { ascending: false, nullsFirst: false })
          .limit(8),
        supabase
          .from("menu_items")
          .select("id, shop_id, name, price, image_url, slug, rating_avg, is_featured, flash_price, flash_starts_at, flash_ends_at, shop:coffee_shops(slug, name)")
          .eq("is_available", true)
          .order("is_featured", { ascending: false })
          .order("rating_avg", { ascending: false, nullsFirst: false })
          .limit(12),
      ]);
      setCategories((cats.data as Category[]) ?? []);
      setShops((shopsRes.data as Shop[]) ?? []);
      setProducts((prodRes.data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" /> Marketplace multi-kategori
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Semua kebutuhanmu, <span className="text-primary">dari toko lokal.</span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Belanja produk F&B, fashion, digital, kerajinan, dan lainnya dari ribuan
              toko Indonesia — pengiriman cepat, pembayaran aman.
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

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Kategori</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pilih sesuai minatmu.</p>
          </div>
          <Link to="/kategori" className="text-sm text-primary hover:underline">
            Semua kategori →
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
            {categories.slice(0, 12).map((c) => (
              <Link
                key={c.id}
                to="/kategori/$slug"
                params={{ slug: c.slug }}
                className="group flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 text-center transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
              >
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {c.icon_url ? (
                    <img src={c.icon_url} alt={c.name} className="h-7 w-7" />
                  ) : (
                    <Store className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs font-medium text-foreground line-clamp-2">{c.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured shops */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Toko Unggulan</h2>
        </div>
        {shops.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada toko. <Link to="/signup" className="text-primary hover:underline">Jadilah yang pertama!</Link></p>
        ) : (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {shops.map((s) => (
              <Link
                key={s.id}
                to="/toko/$slug"
                params={{ slug: s.slug }}
                className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  {s.logo_url ? (
                    <img src={s.logo_url} alt={s.name} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Store className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s.name}</div>
                    {s.rating_avg ? (
                      <div className="text-xs text-muted-foreground">
                        ★ {Number(s.rating_avg).toFixed(1)} ({s.rating_count ?? 0})
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Toko baru</div>
                    )}
                  </div>
                </div>
                {s.tagline && (
                  <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{s.tagline}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Best products */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Produk Terlaris</h2>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada produk.</p>
        ) : (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
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
  const discountPct = flashActive
    ? Math.round((1 - displayPrice / Number(product.price)) * 100)
    : 0;
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
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Store className="h-8 w-8" />
          </div>
        )}
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
      </div>
      <div className="p-3">
        <div className="line-clamp-2 text-xs font-medium leading-snug">{product.name}</div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className={`text-sm font-semibold ${flashActive ? "text-destructive" : "text-primary"}`}>
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
