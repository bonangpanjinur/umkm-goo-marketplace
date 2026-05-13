import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { Store, Share2, Check, ShoppingCart, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/katalog/$slug")({
  head: () => ({ meta: [{ title: "Katalog Produk" }] }),
  component: KatalogPage,
});

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  flash_price: number | null;
  flash_starts_at: string | null;
  flash_ends_at: string | null;
  category?: { name: string } | null;
};

type Shop = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  tagline: string | null;
  phone: string | null;
};

function KatalogPage() {
  const { slug } = Route.useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase
        .from("coffee_shops")
        .select("id, name, slug, logo_url, tagline, phone")
        .eq("slug", slug)
        .maybeSingle();
      if (!s) { setLoading(false); return; }
      setShop(s as Shop);

      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name")
          .eq("shop_id", (s as any).id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("menu_items")
          .select("id, name, description, price, image_url, flash_price, flash_starts_at, flash_ends_at, categories(name)")
          .eq("shop_id", (s as any).id)
          .eq("is_available", true)
          .order("name"),
      ]);

      setCategories(cats ?? []);
      setProducts(
        ((prods ?? []) as any[]).map(p => ({
          ...p,
          category: p.categories ?? null,
        })),
      );
      setLoading(false);
    })();
  }, [slug]);

  const shareKatalog = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Katalog ${shop?.name}`, url });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link katalog disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  const now = Date.now();
  const filtered = products.filter(p => {
    if (activeCategory === "all") return true;
    return (p as any).category?.name === activeCategory ||
      categories.find(c => c.id === activeCategory)?.name === (p as any).category?.name;
  });

  const getDisplayPrice = (p: Product) => {
    const isFlash =
      p.flash_price != null &&
      Number(p.flash_price) > 0 &&
      Number(p.flash_price) < Number(p.price) &&
      (!p.flash_starts_at || new Date(p.flash_starts_at).getTime() <= now) &&
      (!p.flash_ends_at || new Date(p.flash_ends_at).getTime() > now);
    return { price: isFlash ? Number(p.flash_price) : Number(p.price), isFlash };
  };

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />
      <div className="mx-auto max-w-5xl px-4 py-8">
        {loading ? (
          <div className="space-y-6">
            <div className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          </div>
        ) : !shop ? (
          <div className="py-20 text-center">
            <h1 className="text-2xl font-bold">Toko tidak ditemukan</h1>
            <Link to="/"><Button className="mt-4">Kembali ke Beranda</Button></Link>
          </div>
        ) : (
          <>
            <div className="mb-8 rounded-2xl border border-border bg-card p-5 flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt={shop.name} className="h-16 w-16 rounded-2xl object-cover border border-border shrink-0" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted/40">
                    <Store className="h-7 w-7 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold">{shop.name}</h1>
                  {shop.tagline && <p className="text-sm text-muted-foreground mt-0.5">{shop.tagline}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {products.length} produk tersedia
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <Link to="/toko/$slug" params={{ slug }}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> Kunjungi Toko
                  </Button>
                </Link>
                <Button onClick={shareKatalog} size="sm" className="gap-1.5">
                  {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                  {copied ? "Disalin!" : "Bagikan Katalog"}
                </Button>
              </div>
            </div>

            {categories.length > 0 && (
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${activeCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}
                >
                  Semua
                </button>
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${activeCategory === c.id ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-16 text-center">
                <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">Belum ada produk tersedia.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {filtered.map(p => {
                  const { price, isFlash } = getDisplayPrice(p);
                  return (
                    <Link
                      key={p.id}
                      to="/toko/$slug/produk/$productId"
                      params={{ slug, productId: p.id }}
                      className="group rounded-xl border border-border bg-card overflow-hidden transition hover:border-primary/50 hover:shadow-md"
                    >
                      <div className="relative aspect-square w-full bg-muted/40">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                          : <div className="flex h-full w-full items-center justify-center text-muted-foreground"><Store className="h-8 w-8" /></div>
                        }
                        {isFlash && (
                          <span className="absolute left-2 top-2 rounded-md bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">SALE</span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-2 text-xs font-medium leading-snug">{p.name}</p>
                        <div className="mt-1.5 flex items-baseline gap-1.5">
                          <span className={`text-sm font-bold ${isFlash ? "text-destructive" : "text-primary"}`}>
                            Rp {price.toLocaleString("id-ID")}
                          </span>
                          {isFlash && (
                            <span className="text-[10px] text-muted-foreground line-through">
                              Rp {Number(p.price).toLocaleString("id-ID")}
                            </span>
                          )}
                        </div>
                        {(p as any).category?.name && (
                          <p className="mt-1 text-[11px] text-muted-foreground">{(p as any).category.name}</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      <MarketplaceFooter />
    </div>
  );
}
