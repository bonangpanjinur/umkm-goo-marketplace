import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { ProductCard } from "./index";
import { Store } from "lucide-react";

export const Route = createFileRoute("/kategori/$slug")({
  component: CategoryPage,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Kategori tidak ditemukan</h1>
        <Link to="/kategori" className="text-primary hover:underline">Kembali ke daftar kategori</Link>
      </div>
    </div>
  ),
});

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  banner_url: string | null;
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

function CategoryPage() {
  const { slug } = Route.useParams();
  const [cat, setCat] = useState<Category | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [notFoundFlag, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: c } = await supabase
        .from("business_categories")
        .select("id, slug, name, description, banner_url")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!c) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCat(c as Category);

      const { data: shopsData } = await supabase
        .from("coffee_shops")
        .select("id, slug, name, tagline, logo_url, rating_avg, rating_count")
        .eq("business_category_id", (c as any).id)
        .eq("is_active", true)
        .order("rating_avg", { ascending: false, nullsFirst: false })
        .limit(24);
      setShops((shopsData as Shop[]) ?? []);

      const shopIds = ((shopsData as any[]) ?? []).map((s) => s.id);
      if (shopIds.length > 0) {
        const { data: prods } = await supabase
          .from("menu_items")
          .select("id, shop_id, name, price, image_url, slug, rating_avg, shop:coffee_shops(slug, name)")
          .in("shop_id", shopIds)
          .eq("is_available", true)
          .order("rating_avg", { ascending: false, nullsFirst: false })
          .limit(24);
        setProducts((prods as any[]) ?? []);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (notFoundFlag) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceHeader />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Kategori tidak ditemukan</h1>
          <p className="mt-2 text-muted-foreground">Kategori "{slug}" tidak tersedia.</p>
          <Link to="/kategori" className="mt-4 inline-block text-primary hover:underline">
            ← Lihat semua kategori
          </Link>
        </div>
        <MarketplaceFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />

      {/* Banner */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <Link to="/kategori" className="text-xs text-muted-foreground hover:text-foreground">
            ← Semua Kategori
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {cat?.name ?? "..."}
          </h1>
          {cat?.description && (
            <p className="mt-2 max-w-2xl text-muted-foreground">{cat.description}</p>
          )}
        </div>
      </section>

      {/* Shops */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-4 text-xl font-bold tracking-tight">Toko di kategori ini</h2>
        {loading ? (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : shops.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada toko di kategori ini.</p>
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
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Products */}
      {products.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="mb-4 text-xl font-bold tracking-tight">Produk pilihan</h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <MarketplaceFooter />
    </div>
  );
}
