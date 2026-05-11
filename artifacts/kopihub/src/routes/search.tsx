import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { ProductCard } from "./index";
import { Store } from "lucide-react";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const searchSchema = z.object({
  q: z.string().optional().default(""),
  cat: z.string().optional().default(""),
  sort: z.enum(["relevan", "termurah", "termahal", "rating"]).optional().default("relevan"),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: ({ search }) => ({
    meta: [
      { title: search.q ? `Hasil "${search.q}" — KopiHub` : "Pencarian — KopiHub" },
      { name: "description", content: `Cari produk dan toko di marketplace KopiHub${search.q ? `: ${search.q}` : ""}.` },
    ],
  }),
  component: SearchPage,
});

type Cat = { id: string; slug: string; name: string };

function SearchPage() {
  const { q, cat, sort, min, max } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [products, setProducts] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("business_categories").select("id, slug, name").eq("is_active", true).order("sort_order").then((r) => {
      setCats((r.data as Cat[]) ?? []);
    });
  }, []);

  useEffect(() => {
    if (!q && !cat) { setProducts([]); setShops([]); return; }
    (async () => {
      setLoading(true);
      const term = q ? `%${q}%` : "%";
      let prodQ = supabase
        .from("menu_items")
        .select("id, shop_id, name, price, image_url, slug, rating_avg, flash_price, flash_starts_at, flash_ends_at, shop:coffee_shops!inner(slug, name, is_active, business_category_id)")
        .ilike("name", term)
        .eq("is_available", true);
      if (typeof min === "number") prodQ = prodQ.gte("price", min);
      if (typeof max === "number") prodQ = prodQ.lte("price", max);
      if (cat) {
        const c = cats.find((x) => x.slug === cat);
        if (c) prodQ = prodQ.eq("shop.business_category_id", c.id);
      }
      if (sort === "termurah") prodQ = prodQ.order("price", { ascending: true });
      else if (sort === "termahal") prodQ = prodQ.order("price", { ascending: false });
      else if (sort === "rating") prodQ = prodQ.order("rating_avg", { ascending: false, nullsFirst: false });
      else prodQ = prodQ.order("rating_avg", { ascending: false, nullsFirst: false });

      let shopQ = supabase
        .from("coffee_shops")
        .select("id, slug, name, tagline, logo_url, rating_avg, rating_count, business_category_id")
        .eq("is_active", true);
      if (q) shopQ = shopQ.or(`name.ilike.${term},tagline.ilike.${term}`);
      if (cat) {
        const c = cats.find((x) => x.slug === cat);
        if (c) shopQ = shopQ.eq("business_category_id", c.id);
      }
      shopQ = shopQ.order("rating_avg", { ascending: false, nullsFirst: false }).limit(12);

      const [prodRes, shopRes] = await Promise.all([prodQ.limit(48), shopQ]);
      setProducts(((prodRes.data as any[]) ?? []).filter((p) => p.shop?.is_active !== false));
      setShops((shopRes.data as any[]) ?? []);
      setLoading(false);
    })();
  }, [q, cat, sort, min, max, cats]);

  const update = (patch: Record<string, any>) => {
    navigate({ search: (prev: any) => ({ ...prev, ...patch }) });
  };

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">
          {q ? <>Hasil untuk "<span className="text-primary">{q}</span>"</> : cat ? `Kategori: ${cats.find((c) => c.slug === cat)?.name ?? cat}` : "Pencarian"}
        </h1>

        <div className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
          <div>
            <Label className="text-xs">Kategori</Label>
            <Select value={cat || "all"} onValueChange={(v) => update({ cat: v === "all" ? "" : v })}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua kategori</SelectItem>
                {cats.map((c) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Urutkan</Label>
            <Select value={sort} onValueChange={(v) => update({ sort: v })}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="relevan">Paling relevan</SelectItem>
                <SelectItem value="rating">Rating tertinggi</SelectItem>
                <SelectItem value="termurah">Harga terendah</SelectItem>
                <SelectItem value="termahal">Harga tertinggi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Harga min</Label>
            <Input type="number" inputMode="numeric" className="mt-1 h-9" value={min ?? ""} onChange={(e) => update({ min: e.target.value ? Number(e.target.value) : undefined })} placeholder="0" />
          </div>
          <div>
            <Label className="text-xs">Harga max</Label>
            <Input type="number" inputMode="numeric" className="mt-1 h-9" value={max ?? ""} onChange={(e) => update({ max: e.target.value ? Number(e.target.value) : undefined })} placeholder="∞" />
          </div>
        </div>

        {!q && !cat && (
          <p className="mt-6 text-sm text-muted-foreground">
            Ketik di kolom pencarian di atas atau pilih kategori untuk mulai.
          </p>
        )}

        {(q || cat) && (
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
