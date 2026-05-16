import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { ProductCard } from "./index";
import { Store, X, SlidersHorizontal, ChevronDown, Star, Search } from "lucide-react";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

const searchSchema = z.object({
  q:       z.string().optional().default(""),
  cat:     z.string().optional().default(""),
  sort:    z.enum(["relevan", "termurah", "termahal", "rating"]).optional().default("relevan"),
  min:     z.coerce.number().optional(),
  max:     z.coerce.number().optional(),
  minRating: z.coerce.number().optional(),
  city:    z.string().optional().default(""),
  pay:     z.enum(["", "cash", "qris", "transfer", "ewallet", "card"]).optional().default(""),
  tab:     z.enum(["semua", "produk", "toko"]).optional().default("semua"),
});

const PAY_LABEL: Record<string, string> = {
  cash: "Tunai", qris: "QRIS", transfer: "Transfer Bank", ewallet: "E-Wallet", card: "Kartu",
};

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Pencarian — UMKMgo" },
      { name: "description", content: "Cari produk dan toko di marketplace UMKMgo." },
    ],
  }),
  component: SearchPage,
});

type Cat = { id: string; slug: string; name: string };

function SkeletonProductGrid() {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-muted/30 animate-pulse">
          <div className="aspect-square w-full rounded-t-xl bg-muted/50" />
          <div className="p-3 space-y-1.5">
            <div className="h-3 bg-muted rounded w-4/5" />
            <div className="h-3 bg-muted rounded w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonShopGrid() {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-muted/30 animate-pulse p-4 h-20" />
      ))}
    </div>
  );
}

function ActiveFilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/8 px-2.5 py-0.5 text-xs font-medium text-primary">
      {label}
      <button onClick={onRemove} className="rounded-full hover:bg-primary/20 p-0.5">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function SearchPage() {
  const { q, cat, sort, min, max, minRating, tab } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [products,   setProducts]   = useState<any[]>([]);
  const [shops,      setShops]      = useState<any[]>([]);
  const [cats,       setCats]       = useState<Cat[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("business_categories").select("id, slug, name").eq("is_active", true).order("sort_order")
      .then(r => setCats((r.data as Cat[]) ?? []));
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
      if (typeof min       === "number") prodQ = prodQ.gte("price", min);
      if (typeof max       === "number") prodQ = prodQ.lte("price", max);
      if (typeof minRating === "number") prodQ = prodQ.gte("rating_avg", minRating);
      if (cat) {
        const c = cats.find(x => x.slug === cat);
        if (c) prodQ = (prodQ as any).eq("shop.business_category_id", c.id);
      }
      if (sort === "termurah")     prodQ = prodQ.order("price",      { ascending: true  });
      else if (sort === "termahal") prodQ = prodQ.order("price",      { ascending: false });
      else                          prodQ = prodQ.order("rating_avg", { ascending: false, nullsFirst: false });

      let shopQ = supabase
        .from("coffee_shops")
        .select("id, slug, name, tagline, logo_url, rating_avg, rating_count, kyc_status")
        .eq("is_active", true);
      if (q) shopQ = shopQ.or(`name.ilike.${term},tagline.ilike.${term}`);
      if (cat) {
        const c = cats.find(x => x.slug === cat);
        if (c) shopQ = shopQ.eq("business_category_id", c.id);
      }
      if (typeof minRating === "number") shopQ = shopQ.gte("rating_avg", minRating);
      shopQ = shopQ.order("rating_avg", { ascending: false, nullsFirst: false }).limit(24);

      const [prodRes, shopRes] = await Promise.all([prodQ.limit(60), shopQ]);
      setProducts(((prodRes.data as any[]) ?? []).filter(p => p.shop?.is_active !== false));
      setShops((shopRes.data as any[]) ?? []);
      setLoading(false);
    })();
  }, [q, cat, sort, min, max, minRating, cats]);

  const update = (patch: Record<string, any>) => navigate({ search: (prev: any) => ({ ...prev, ...patch }) });
  const clearFilter = (key: string) => update({ [key]: undefined });

  const hasFilters = !!(cat || min || max || minRating);
  const activePills: { label: string; key: string }[] = [];
  if (cat)       activePills.push({ label: cats.find(c => c.slug === cat)?.name ?? cat, key: "cat" });
  if (minRating) activePills.push({ label: `Min ★${minRating}`, key: "minRating" });
  if (min)       activePills.push({ label: `Min Rp${Number(min).toLocaleString("id-ID")}`, key: "min" });
  if (max)       activePills.push({ label: `Max Rp${Number(max).toLocaleString("id-ID")}`, key: "max" });

  const hasQuery = !!(q || cat);
  const visibleProducts = tab === "toko"  ? [] : products;
  const visibleShops    = tab === "produk" ? [] : shops;

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />
      <div className="mx-auto max-w-7xl px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {q
                ? <>Hasil untuk "<span className="text-primary">{q}</span>"</>
                : cat
                  ? `Kategori: ${cats.find(c => c.slug === cat)?.name ?? cat}`
                  : "Pencarian"
              }
            </h1>
            {hasQuery && !loading && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {products.length + shops.length} hasil ditemukan
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 shrink-0 mt-1 ${showFilter ? "border-primary text-primary" : ""}`}
            onClick={() => setShowFilter(v => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filter
            {hasFilters && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFilter ? "rotate-180" : ""}`} />
          </Button>
        </div>

        {/* Active filter pills */}
        {activePills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activePills.map(p => (
              <ActiveFilterPill key={p.key} label={p.label} onRemove={() => clearFilter(p.key)} />
            ))}
            <button onClick={() => update({ cat: undefined, min: undefined, max: undefined, minRating: undefined })}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
              Reset semua
            </button>
          </div>
        )}

        {/* Filter panel */}
        {showFilter && (
          <div className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 md:grid-cols-5">
            <div>
              <Label className="text-xs">Kategori</Label>
              <Select value={cat || "all"} onValueChange={v => update({ cat: v === "all" ? "" : v })}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua kategori</SelectItem>
                  {cats.map(c => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Urutkan</Label>
              <Select value={sort} onValueChange={v => update({ sort: v })}>
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
              <Label className="text-xs">Min rating</Label>
              <Select value={minRating ? String(minRating) : "all"} onValueChange={v => update({ minRating: v === "all" ? undefined : Number(v) })}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua rating</SelectItem>
                  <SelectItem value="4">★ 4+</SelectItem>
                  <SelectItem value="4.5">★ 4.5+</SelectItem>
                  <SelectItem value="3">★ 3+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Harga min (Rp)</Label>
              <Input ref={searchInputRef} type="number" inputMode="numeric" className="mt-1 h-9" value={min ?? ""} onChange={e => update({ min: e.target.value ? Number(e.target.value) : undefined })} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">Harga max (Rp)</Label>
              <Input type="number" inputMode="numeric" className="mt-1 h-9" value={max ?? ""} onChange={e => update({ max: e.target.value ? Number(e.target.value) : undefined })} placeholder="∞" />
            </div>
          </div>
        )}

        {/* Category quick-filter pills */}
        {cats.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => update({ cat: "" })}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${!cat ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}
            >Semua</button>
            {cats.map(c => (
              <button
                key={c.id}
                onClick={() => update({ cat: c.slug })}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${cat === c.slug ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}
              >{c.name}</button>
            ))}
          </div>
        )}

        {/* Result tabs */}
        {hasQuery && (
          <div className="mt-5 flex gap-1 border-b border-border">
            {(["semua", "produk", "toko"] as const).map(t => (
              <button
                key={t}
                onClick={() => update({ tab: t })}
                className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
                  tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "semua" ? "Semua" : t === "produk" ? `Produk (${products.length})` : `Toko (${shops.length})`}
              </button>
            ))}
          </div>
        )}

        {/* Empty / prompt state */}
        {!hasQuery && (
          <div className="mt-12 flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Search className="h-8 w-8" />
            </div>
            <p className="text-muted-foreground">Ketik di kolom pencarian atau pilih kategori di atas untuk memulai</p>
            <p className="text-xs text-muted-foreground">Contoh: "kopi susu", "kaos", "kue ulang tahun"</p>
          </div>
        )}

        {hasQuery && (
          <div className="mt-6 space-y-10">
            {/* Shops section */}
            {tab !== "produk" && (
              <section>
                <h2 className="mb-4 text-base font-semibold text-muted-foreground">
                  {tab === "semua" ? `Toko (${shops.length})` : `${shops.length} toko ditemukan`}
                </h2>
                {loading
                  ? <SkeletonShopGrid />
                  : shops.length === 0
                    ? <p className="text-sm text-muted-foreground">Tidak ada toko yang cocok.</p>
                    : (
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                        {shops.map(s => (
                          <Link
                            key={s.id}
                            to="/toko/$slug"
                            params={{ slug: s.slug }}
                            className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-md"
                          >
                            <div className="flex items-center gap-3">
                              {s.logo_url
                                ? <img src={s.logo_url} alt={s.name} className="h-12 w-12 rounded-full object-cover" />
                                : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Store className="h-5 w-5" /></div>
                              }
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1 min-w-0">
                                  <span className="truncate text-sm font-semibold">{s.name}</span>
                                  {s.kyc_status === "approved" && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  {s.rating_avg
                                    ? <><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{Number(s.rating_avg).toFixed(1)}</>
                                    : "Toko baru"
                                  }
                                </div>
                              </div>
                            </div>
                            {s.tagline && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{s.tagline}</p>}
                          </Link>
                        ))}
                      </div>
                    )
                }
              </section>
            )}

            {/* Products section */}
            {tab !== "toko" && (
              <section>
                <h2 className="mb-4 text-base font-semibold text-muted-foreground">
                  {tab === "semua" ? `Produk (${products.length})` : `${products.length} produk ditemukan`}
                </h2>
                {loading
                  ? <SkeletonProductGrid />
                  : products.length === 0
                    ? (
                      <div className="rounded-xl border border-border bg-card p-8 text-center space-y-2">
                        <p className="text-muted-foreground">Tidak ada produk yang cocok.</p>
                        <p className="text-xs text-muted-foreground">Coba hapus beberapa filter atau ubah kata kunci.</p>
                      </div>
                    )
                    : (
                      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                        {visibleProducts.map(p => <ProductCard key={p.id} product={p} />)}
                      </div>
                    )
                }
              </section>
            )}
          </div>
        )}
      </div>
      <MarketplaceFooter />
    </div>
  );
}
