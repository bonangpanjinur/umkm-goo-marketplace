import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { ProductCard } from "./index";
import { Store, MapPin, Phone } from "lucide-react";

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
};

function ShopPage() {
  const { slug } = Route.useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: s } = await supabase
        .from("coffee_shops")
        .select("id, slug, name, tagline, description, logo_url, address, phone, rating_avg, rating_count, business_category_id")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!s) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setShop(s as Shop);

      const { data: prods } = await supabase
        .from("menu_items")
        .select("id, shop_id, name, price, image_url, slug, rating_avg")
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
          <div className="flex items-center gap-4">
            {shop?.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="h-20 w-20 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Store className="h-9 w-9" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {shop?.name ?? "..."}
              </h1>
              {shop?.tagline && (
                <p className="mt-1 text-muted-foreground">{shop.tagline}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {shop?.rating_avg ? (
                  <span>★ {Number(shop.rating_avg).toFixed(1)} ({shop.rating_count ?? 0} ulasan)</span>
                ) : (
                  <span>Toko baru</span>
                )}
                {shop?.address && (
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {shop.address}</span>
                )}
                {shop?.phone && (
                  <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {shop.phone}</span>
                )}
              </div>
            </div>
          </div>
          {shop?.description && (
            <p className="mt-6 max-w-3xl text-sm leading-relaxed text-foreground/80">{shop.description}</p>
          )}
        </div>
      </section>

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
