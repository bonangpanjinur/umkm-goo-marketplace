import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { Store, ShoppingCart, Plus, Minus } from "lucide-react";
import { addToCart } from "@/lib/marketplace-cart";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/toko/$slug/produk/$productId")({
  component: ProductDetailPage,
});

type Product = {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  stock: number | null;
  track_stock: boolean;
};

type Shop = { id: string; slug: string; name: string; logo_url: string | null };

function ProductDetailPage() {
  const { slug, productId } = Route.useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: s } = await supabase
        .from("coffee_shops")
        .select("id, slug, name, logo_url")
        .eq("slug", slug)
        .maybeSingle();
      if (!s) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setShop(s as Shop);

      const { data: p } = await supabase
        .from("menu_items")
        .select("id, shop_id, name, description, price, image_url, rating_avg, rating_count, stock, track_stock")
        .eq("id", productId)
        .eq("shop_id", (s as any).id)
        .maybeSingle();
      if (!p) {
        setNotFound(true);
      } else {
        setProduct(p as Product);
      }
      setLoading(false);
    })();
  }, [slug, productId]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceHeader />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Produk tidak ditemukan</h1>
          <Link to="/toko/$slug" params={{ slug }} className="mt-4 inline-block text-primary hover:underline">
            ← Kembali ke toko
          </Link>
        </div>
        <MarketplaceFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <nav className="mb-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Beranda</Link>
          {" / "}
          {shop && (
            <>
              <Link to="/toko/$slug" params={{ slug }} className="hover:text-foreground">{shop.name}</Link>
              {" / "}
            </>
          )}
          <span className="text-foreground">{product?.name ?? "..."}</span>
        </nav>

        {loading ? (
          <div className="grid gap-8 md:grid-cols-2">
            <div className="aspect-square rounded-2xl bg-muted/40 animate-pulse" />
            <div className="space-y-3">
              <div className="h-8 w-3/4 rounded bg-muted/40 animate-pulse" />
              <div className="h-6 w-1/2 rounded bg-muted/40 animate-pulse" />
              <div className="h-24 rounded bg-muted/40 animate-pulse" />
            </div>
          </div>
        ) : product && shop ? (
          <div className="grid gap-8 md:grid-cols-2">
            <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-muted/40">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Store className="h-12 w-12" />
                </div>
              )}
            </div>
            <div>
              <Link
                to="/toko/$slug"
                params={{ slug: shop.slug }}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt={shop.name} className="h-5 w-5 rounded-full" />
                ) : (
                  <Store className="h-4 w-4" />
                )}
                {shop.name}
              </Link>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{product.name}</h1>
              {product.rating_avg && (
                <div className="mt-2 text-sm text-muted-foreground">
                  ★ {Number(product.rating_avg).toFixed(1)} ({product.rating_count ?? 0} ulasan)
                </div>
              )}
              <div className="mt-4 text-3xl font-bold text-primary">
                Rp {Number(product.price).toLocaleString("id-ID")}
              </div>
              {product.track_stock && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Stok: {(product.stock ?? 0) > 0 ? `${product.stock} tersedia` : "Habis"}
                </div>
              )}
              {product.description && (
                <p className="mt-6 text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
                  {product.description}
                </p>
              )}
              <div className="mt-8 flex gap-3">
                <Link to="/s/$slug" params={{ slug: shop.slug }} className="flex-1">
                  <Button size="lg" className="w-full gap-2">
                    <ShoppingCart className="h-4 w-4" /> Pesan di etalase toko
                  </Button>
                </Link>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Pembelian saat ini diarahkan ke etalase toko. Cart marketplace akan tersedia pada pembaruan berikutnya.
              </p>
            </div>
          </div>
        ) : null}
      </div>
      <MarketplaceFooter />
    </div>
  );
}
