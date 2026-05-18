import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { ProductCard } from "./index";
import { Store, Star } from "lucide-react";
import { cityIlikeOr } from "@/lib/cities";

function titleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const Route = createFileRoute("/kategori/$slug/$city")({
  component: CategoryCityPage,
  head: ({ params }) => {
    const catName = titleCase(params.slug);
    const cityName = titleCase(params.city);
    const title = `${catName} di ${cityName} — Marketplace UMKMgo`;
    const desc = `Temukan ${catName.toLowerCase()} terbaik di ${cityName}. Bandingkan toko, baca review, dan pesan langsung lewat UMKMgo.`;
    const path = `/kategori/${params.slug}/${params.city}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: path },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: path }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Kategori", item: "/kategori" },
              { "@type": "ListItem", position: 2, name: catName, item: `/kategori/${params.slug}` },
              { "@type": "ListItem", position: 3, name: cityName, item: path },
            ],
          }),
        },
      ],
    };
  },
});

type Shop = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  address: string | null;
  is_featured?: boolean | null;
};

function CategoryCityPage() {
  const { slug, city } = Route.useParams();
  const cityName = titleCase(city);
  const [cat, setCat] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: c } = await supabase
        .from("business_categories")
        .select("id, name, description")
        .eq("slug", slug).eq("is_active", true).maybeSingle();
      if (!c) { setLoading(false); return; }
      setCat(c as any);

      const { data: shopsData } = await supabase
        .from("shops")
        .select("id, slug, name, tagline, logo_url, rating_avg, rating_count, address, is_featured")
        .eq("business_category_id", (c as any).id)
        .eq("is_active", true)
        .or(cityIlikeOr(cityName, "address"))
        .order("is_featured", { ascending: false, nullsFirst: false })
        .order("rating_avg", { ascending: false, nullsFirst: false })
        .limit(24);
      const list = (shopsData as Shop[]) ?? [];
      setShops(list);

      const ids = list.map((s) => s.id);
      if (ids.length > 0) {
        const { data: prods } = await supabase
          .from("menu_items")
          .select("id, shop_id, name, price, image_url, slug, rating_avg, flash_price, flash_starts_at, flash_ends_at, shop:shops(slug, name, is_featured)")
          .in("shop_id", ids).eq("is_available", true)
          .order("rating_avg", { ascending: false, nullsFirst: false })
          .limit(18);
        const raw = (prods as any[]) ?? [];
        const feat = raw.filter(p => p.shop?.is_featured);
        const rest = raw.filter(p => !p.shop?.is_featured);
        setProducts([...feat, ...rest]);
      } else {
        setProducts([]);
      }
      setLoading(false);
    })();
  }, [slug, cityName]);

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="text-xs text-muted-foreground">
            <Link to="/kategori" className="hover:text-foreground">Kategori</Link>
            {" / "}
            <Link to="/kategori/$slug" params={{ slug }} className="hover:text-foreground">{cat?.name ?? titleCase(slug)}</Link>
            {" / "}<span>{cityName}</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {cat?.name ?? titleCase(slug)} di {cityName}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {shops.length > 0
              ? `${shops.length} toko ${cat?.name?.toLowerCase() ?? titleCase(slug).toLowerCase()} di ${cityName}, urut berdasarkan rating.`
              : `Belum ada toko ${cat?.name?.toLowerCase() ?? ""} terdaftar di ${cityName}.`}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-4 text-xl font-bold tracking-tight">Toko di {cityName}</h2>
        {loading ? (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : shops.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Tidak ada toko ditemukan.{" "}
            <Link to="/kategori/$slug" params={{ slug }} className="text-primary hover:underline">
              Lihat semua {cat?.name ?? "kategori"}
            </Link>
          </div>
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
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="truncate text-sm font-semibold">{s.name}</span>
                      {s.is_featured && (
                        <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-label="Toko unggulan" />
                      )}
                    </div>
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

      {products.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="mb-4 text-xl font-bold tracking-tight">Produk pilihan dari {cityName}</h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            {products.map((p) => (<ProductCard key={p.id} product={p} />))}
          </div>
        </section>
      )}

      <MarketplaceFooter />
    </div>
  );
}
