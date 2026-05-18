import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { ProductCard } from "./index";
import { Store, Search as SearchIcon, Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CITIES, cityIlikeOr } from "@/lib/cities";

const SUBTYPE_LABEL: Record<string, string> = {
  "kafe": "Kafe", "restoran": "Restoran", "warung": "Warung", "katering": "Katering", "bakery": "Bakery",
  "fashion": "Fashion", "elektronik": "Elektronik", "kelontong": "Kelontong", "buku": "Buku",
  "salon": "Salon", "barbershop": "Barbershop", "spa": "Spa", "laundry": "Laundry",
  "klinik-umum": "Klinik Umum", "klinik-gigi": "Klinik Gigi", "klinik-kecantikan": "Klinik Kecantikan",
  "studio-foto": "Studio Foto", "studio-musik": "Studio Musik",
  "umroh": "Umroh", "hajj": "Haji", "tour": "Tour & Travel",
  "rental-mobil": "Rental Mobil", "rental-motor": "Rental Motor", "rental-alat": "Rental Alat",
  "kursus": "Kursus", "custom-order": "Pesan Custom",
};
function formatSubtype(s: string): string {
  return SUBTYPE_LABEL[s] ?? s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export const Route = createFileRoute("/kategori/$slug")({
  component: CategoryPage,
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const title = `${name} — Marketplace UMKMgo`;
    const desc = `Jelajahi toko ${name.toLowerCase()} terdaftar di marketplace UMKMgo. Bandingkan rating, lokasi, dan pesan langsung.`;
    const path = `/kategori/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: path },
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
              { "@type": "ListItem", position: 2, name, item: path },
            ],
          }),
        },
      ],
    };
  },
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
  is_featured?: boolean | null;
  business_subtype?: string | null;
};

function CategoryPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [cat, setCat] = useState<Category | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [subtypes, setSubtypes] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [notFoundFlag, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  // Quick filter draft
  const [subtypeDraft, setSubtypeDraft] = useState<string>("");
  const [cityDraft, setCityDraft] = useState<string>("");

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
        .from("shops")
        .select("id, slug, name, tagline, logo_url, rating_avg, rating_count, business_subtype, is_featured")
        .eq("business_category_id", (c as any).id)
        .eq("is_active", true)
        .order("is_featured", { ascending: false, nullsFirst: false })
        .order("rating_avg", { ascending: false, nullsFirst: false })
        .limit(24);
      const shopList = (shopsData as any[]) ?? [];
      setShops(shopList as Shop[]);
      setSubtypes(Array.from(new Set(shopList.map(s => s.business_subtype).filter(Boolean))).sort());

      const shopIds = shopList.map((s) => s.id);
      if (shopIds.length > 0) {
        const { data: prods } = await supabase
          .from("menu_items")
          .select("id, shop_id, name, price, image_url, slug, rating_avg, total_sold, flash_price, flash_starts_at, flash_ends_at, shop:shops(slug, name, is_featured)")
          .in("shop_id", shopIds)
          .eq("is_available", true)
          .order("rating_avg", { ascending: false, nullsFirst: false })
          .order("total_sold", { ascending: false, nullsFirst: false })
          .limit(24);
        setProducts((prods as any[]) ?? []);
      }
      setLoading(false);
    })();
  }, [slug]);

  const applyQuickFilter = useMemo(() => () => {
    navigate({
      to: "/search",
      search: {
        cat: slug,
        subtype: subtypeDraft || undefined,
        city: cityDraft || undefined,
      } as any,
    });
  }, [navigate, slug, subtypeDraft, cityDraft]);

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

      {/* Quick filter → /search */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <Label className="text-xs">Subtipe usaha</Label>
              <Select
                value={subtypeDraft || "all"}
                onValueChange={(v) => setSubtypeDraft(v === "all" ? "" : v)}
                disabled={subtypes.length === 0}
              >
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder={subtypes.length === 0 ? "Tidak ada subtipe" : "Semua subtipe"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua subtipe</SelectItem>
                  {subtypes.map((s) => (
                    <SelectItem key={s} value={s}>{formatSubtype(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Kota / Lokasi</Label>
              <Input
                className="mt-1 h-9"
                value={cityDraft}
                onChange={(e) => setCityDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applyQuickFilter(); }}
                placeholder="Jakarta, Bandung…"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={applyQuickFilter} className="h-9 w-full md:w-auto gap-1.5">
                <SearchIcon className="h-4 w-4" /> Cari di kategori ini
              </Button>
            </div>
          </div>
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
