import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { ProductCard } from "./index";
import { Store, MapPin, Phone, ShieldCheck, Heart, Users } from "lucide-react";
import { useSeo } from "@/lib/use-seo";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
    title: shop ? `${shop.name} — KopiHub` : "Toko",
    description: shop?.tagline ?? shop?.description ?? (shop ? `Belanja produk dari ${shop.name} di KopiHub.` : undefined),
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
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {shop?.name ?? "..."}
                </h1>
                {shop?.kyc_status === "approved" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                    <ShieldCheck className="h-3 w-3" /> Terverifikasi
                  </span>
                )}
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
              <div className="mt-3">
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
