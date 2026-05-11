import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { ProductCard } from "./index";
import { Store } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().optional().default(""),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const [products, setProducts] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    (async () => {
      setLoading(true);
      const term = `%${q}%`;
      const [prodRes, shopRes] = await Promise.all([
        supabase
          .from("menu_items")
          .select("id, shop_id, name, price, image_url, slug, rating_avg, shop:coffee_shops(slug, name, is_active)")
          .ilike("name", term)
          .eq("is_available", true)
          .limit(48),
        supabase
          .from("coffee_shops")
          .select("id, slug, name, tagline, logo_url, rating_avg, rating_count")
          .or(`name.ilike.${term},tagline.ilike.${term}`)
          .eq("is_active", true)
          .limit(12),
      ]);
      setProducts(((prodRes.data as any[]) ?? []).filter((p) => p.shop?.is_active !== false));
      setShops((shopRes.data as any[]) ?? []);
      setLoading(false);
    })();
  }, [q]);

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">
          {q ? <>Hasil untuk "<span className="text-primary">{q}</span>"</> : "Pencarian"}
        </h1>
        {!q && (
          <p className="mt-2 text-sm text-muted-foreground">
            Ketik di kolom pencarian di atas untuk mulai mencari produk atau toko.
          </p>
        )}

        {q && (
          <>
            <section className="mt-8">
              <h2 className="mb-4 text-lg font-semibold">Toko ({shops.length})</h2>
              {loading ? (
                <div className="text-sm text-muted-foreground">Memuat…</div>
              ) : shops.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada toko cocok.</p>
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
                          <div className="text-xs text-muted-foreground">
                            {s.rating_avg ? `★ ${Number(s.rating_avg).toFixed(1)}` : "Toko baru"}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-10">
              <h2 className="mb-4 text-lg font-semibold">Produk ({products.length})</h2>
              {loading ? (
                <div className="text-sm text-muted-foreground">Memuat…</div>
              ) : products.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada produk cocok.</p>
              ) : (
                <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
                  {products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              )}
            </section>
          </>
        )}
      </div>
      <MarketplaceFooter />
    </div>
  );
}
