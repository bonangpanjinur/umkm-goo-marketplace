import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { ProductCard } from "./index";
import { Store, X, SlidersHorizontal, ChevronDown, Star, Search, Loader2, Inbox, AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

const PRODUCT_PAGE_SIZE = 24;
const SHOP_PAGE_SIZE = 12;

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

function ProductSkeletonCards({ n = 10 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={`ps-${i}`} className="rounded-xl border border-border bg-muted/30 animate-pulse">
          <div className="aspect-square w-full rounded-t-xl bg-muted/50" />
          <div className="p-3 space-y-1.5">
            <div className="h-3 bg-muted rounded w-4/5" />
            <div className="h-3 bg-muted rounded w-2/5" />
          </div>
        </div>
      ))}
    </>
  );
}

function ShopSkeletonCards({ n = 4 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={`ss-${i}`} className="rounded-xl border border-border bg-muted/30 animate-pulse p-4 h-20" />
      ))}
    </>
  );
}

function SkeletonProductGrid({ n = 10 }: { n?: number }) {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
      <ProductSkeletonCards n={n} />
    </div>
  );
}

function SkeletonShopGrid() {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
      <ShopSkeletonCards n={4} />
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

function SearchEmptyState({
  type, hasFilters, onClear, onRetry, error,
}: {
  type: "produk" | "toko";
  hasFilters: boolean;
  onClear: () => void;
  onRetry: () => void;
  error?: string | null;
}) {
  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-destructive">Gagal memuat {type}</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Coba lagi
        </Button>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Tidak ada {type} yang cocok</p>
        <p className="text-xs text-muted-foreground">
          {hasFilters
            ? "Coba hapus beberapa filter atau ubah kata kunci pencarian."
            : `Belum ada ${type} yang tersedia saat ini.`}
        </p>
      </div>
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={onClear} className="gap-1.5">
          <X className="h-3.5 w-3.5" /> Hapus filter
        </Button>
      )}
    </div>
  );
}

// ===== Cache persistence (per-tab, with TTL) =====
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 menit
const PRODUCT_CACHE_KEY = "kopihub:search:productCache:v1";
const SHOP_CACHE_KEY    = "kopihub:search:shopCache:v1";
const FILTERS_KEY       = "kopihub:search:filters:v1";

type ProductCacheEntry = { products: any[]; productTotal: number; productPage: number; ts: number };
type ShopCacheEntry    = { shops: any[];    shopTotal: number;    shopPage: number;    ts: number };

function loadCacheMap<T extends { ts: number }>(key: string): Map<string, T> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, T>;
    const now = Date.now();
    const map = new Map<string, T>();
    Object.entries(obj).forEach(([k, v]) => {
      if (v && typeof v.ts === "number" && now - v.ts < CACHE_TTL_MS) map.set(k, v);
    });
    return map;
  } catch { return new Map(); }
}

function persistCacheMap<T>(key: string, map: Map<string, T>) {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, T> = {};
    map.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(key, JSON.stringify(obj));
  } catch { /* quota / serialization errors diabaikan */ }
}

function isAbortError(e: any): boolean {
  if (!e) return false;
  const msg = String(e.message || e.name || "").toLowerCase();
  return msg.includes("abort");
}

function SearchPage() {
  const { q, cat, sort, min, max, minRating, city, pay, tab } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });

  // Draft state for inputs that should NOT auto-apply (city, pay)
  const [cityDraft, setCityDraft] = useState(city ?? "");
  const [payDraft, setPayDraft]   = useState<string>(pay ?? "");
  useEffect(() => { setCityDraft(city ?? ""); }, [city]);
  useEffect(() => { setPayDraft(pay ?? ""); }, [pay]);
  const draftDirty = (cityDraft || "") !== (city || "") || (payDraft || "") !== (pay || "");

  const [products,   setProducts]   = useState<any[]>([]);
  const [shops,      setShops]      = useState<any[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [shopTotal,    setShopTotal]    = useState(0);
  const [productPage, setProductPage] = useState(0);
  const [shopPage,    setShopPage]    = useState(0);
  const [loadingMoreP, setLoadingMoreP] = useState(false);
  const [loadingMoreS, setLoadingMoreS] = useState(false);

  const [cats,       setCats]       = useState<Cat[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingShops,    setLoadingShops]    = useState(false);
  const [productError,    setProductError]    = useState<string | null>(null);
  const [shopError,       setShopError]       = useState<string | null>(null);
  const [productMoreError, setProductMoreError] = useState<string | null>(null);
  const [shopMoreError,    setShopMoreError]    = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cache terpisah: produk & toko (independent), dengan TTL & localStorage persistence.
  const productCacheRef = useRef<Map<string, ProductCacheEntry>>(new Map());
  const shopCacheRef    = useRef<Map<string, ShopCacheEntry>>(new Map());
  const cacheHydratedRef = useRef(false);
  const cacheKey = JSON.stringify({ q, cat, sort, min: min ?? null, max: max ?? null, minRating: minRating ?? null, city, pay });

  // AbortController per-section untuk membatalkan request lama saat filter berubah cepat.
  const productAbortRef = useRef<AbortController | null>(null);
  const shopAbortRef    = useRef<AbortController | null>(null);

  // Hidrasi cache + filter terakhir dari localStorage saat mount.
  useEffect(() => {
    productCacheRef.current = loadCacheMap<ProductCacheEntry>(PRODUCT_CACHE_KEY);
    shopCacheRef.current    = loadCacheMap<ShopCacheEntry>(SHOP_CACHE_KEY);
    cacheHydratedRef.current = true;

    // Jika user mendarat di /search tanpa query, pulihkan filter terakhir.
    if (!q && !cat) {
      try {
        const raw = localStorage.getItem(FILTERS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.q || parsed.cat)) {
            navigate({ search: () => parsed, replace: true });
          }
        }
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist filter aktif sebagai snapshot terakhir.
  useEffect(() => {
    if (!q && !cat) return;
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify({ q, cat, sort, min, max, minRating, city, pay, tab }));
    } catch { /* ignore */ }
  }, [q, cat, sort, min, max, minRating, city, pay, tab]);

  useEffect(() => {
    supabase.from("business_categories").select("id, slug, name").eq("is_active", true).order("sort_order")
      .then(r => setCats((r.data as Cat[]) ?? []));
  }, []);

  // ---- Query builders ----
  const buildProductQuery = () => {
    const term = q ? `%${q}%` : "%";
    let prodQ = supabase
      .from("menu_items")
      .select(
        "id, shop_id, name, price, image_url, slug, rating_avg, flash_price, flash_starts_at, flash_ends_at, shop:coffee_shops!inner(slug, name, is_active, business_category_id, address, payment_methods_enabled)",
        { count: "exact" },
      )
      .ilike("name", term)
      .eq("is_available", true);
    if (typeof min       === "number") prodQ = prodQ.gte("price", min);
    if (typeof max       === "number") prodQ = prodQ.lte("price", max);
    if (typeof minRating === "number") prodQ = prodQ.gte("rating_avg", minRating);
    if (city) prodQ = (prodQ as any).ilike("shop.address", `%${city}%`);
    if (pay)  prodQ = (prodQ as any).contains("shop.payment_methods_enabled", [pay]);
    if (cat) {
      const c = cats.find(x => x.slug === cat);
      if (c) prodQ = (prodQ as any).eq("shop.business_category_id", c.id);
    }
    if (sort === "termurah")      prodQ = prodQ.order("price",      { ascending: true  });
    else if (sort === "termahal") prodQ = prodQ.order("price",      { ascending: false });
    else                          prodQ = prodQ.order("rating_avg", { ascending: false, nullsFirst: false });
    return prodQ;
  };

  const buildShopQuery = () => {
    const term = q ? `%${q}%` : "%";
    let shopQ = supabase
      .from("coffee_shops")
      .select(
        "id, slug, name, tagline, logo_url, rating_avg, rating_count, kyc_status, address, payment_methods_enabled",
        { count: "exact" },
      )
      .eq("is_active", true);
    if (q) shopQ = shopQ.or(`name.ilike.${term},tagline.ilike.${term}`);
    if (cat) {
      const c = cats.find(x => x.slug === cat);
      if (c) shopQ = shopQ.eq("business_category_id", c.id);
    }
    if (typeof minRating === "number") shopQ = shopQ.gte("rating_avg", minRating);
    if (city) shopQ = shopQ.ilike("address", `%${city}%`);
    if (pay)  shopQ = shopQ.contains("payment_methods_enabled", [pay]);
    shopQ = shopQ.order("rating_avg", { ascending: false, nullsFirst: false });
    return shopQ;
  };

  const saveProductCache = (entry: Omit<ProductCacheEntry, "ts">) => {
    productCacheRef.current.set(cacheKey, { ...entry, ts: Date.now() });
    persistCacheMap(PRODUCT_CACHE_KEY, productCacheRef.current);
  };
  const saveShopCache = (entry: Omit<ShopCacheEntry, "ts">) => {
    shopCacheRef.current.set(cacheKey, { ...entry, ts: Date.now() });
    persistCacheMap(SHOP_CACHE_KEY, shopCacheRef.current);
  };

  const fetchProducts = async (opts?: { isRetry?: boolean }) => {
    productAbortRef.current?.abort();
    const ctrl = new AbortController();
    productAbortRef.current = ctrl;
    setLoadingProducts(true);
    setProductError(null);
    try {
      const res = await buildProductQuery().range(0, PRODUCT_PAGE_SIZE - 1).abortSignal(ctrl.signal);
      if (ctrl.signal.aborted) return;
      if (res.error) throw res.error;
      const list = ((res.data as any[]) ?? []).filter(p => p.shop?.is_active !== false);
      const total = res.count ?? 0;
      setProducts(list);
      setProductTotal(total);
      setProductPage(0);
      saveProductCache({ products: list, productTotal: total, productPage: 0 });
      if (opts?.isRetry) toast.success("Produk berhasil dimuat ulang");
    } catch (e: any) {
      if (isAbortError(e) || ctrl.signal.aborted) return;
      setProductError(e.message || "Gagal memuat produk.");
    } finally {
      if (productAbortRef.current === ctrl) productAbortRef.current = null;
      setLoadingProducts(false);
    }
  };

  const fetchShops = async (opts?: { isRetry?: boolean }) => {
    shopAbortRef.current?.abort();
    const ctrl = new AbortController();
    shopAbortRef.current = ctrl;
    setLoadingShops(true);
    setShopError(null);
    try {
      const res = await buildShopQuery().range(0, SHOP_PAGE_SIZE - 1).abortSignal(ctrl.signal);
      if (ctrl.signal.aborted) return;
      if (res.error) throw res.error;
      const list = (res.data as any[]) ?? [];
      const total = res.count ?? 0;
      setShops(list);
      setShopTotal(total);
      setShopPage(0);
      saveShopCache({ shops: list, shopTotal: total, shopPage: 0 });
      if (opts?.isRetry) toast.success("Toko berhasil dimuat ulang");
    } catch (e: any) {
      if (isAbortError(e) || ctrl.signal.aborted) return;
      setShopError(e.message || "Gagal memuat toko.");
    } finally {
      if (shopAbortRef.current === ctrl) shopAbortRef.current = null;
      setLoadingShops(false);
    }
  };

  // Initial / filter-change effect: pakai cache (jika belum kedaluwarsa), kalau tidak fetch.
  useEffect(() => {
    if (!q && !cat) {
      productAbortRef.current?.abort();
      shopAbortRef.current?.abort();
      setProducts([]); setShops([]); setProductTotal(0); setShopTotal(0);
      setProductError(null); setShopError(null);
      setProductMoreError(null); setShopMoreError(null);
      return;
    }
    setProductMoreError(null); setShopMoreError(null);

    const now = Date.now();
    const pCached = productCacheRef.current.get(cacheKey);
    const sCached = shopCacheRef.current.get(cacheKey);
    const pFresh = pCached && now - pCached.ts < CACHE_TTL_MS;
    const sFresh = sCached && now - sCached.ts < CACHE_TTL_MS;

    if (pFresh && pCached) {
      setProducts(pCached.products);
      setProductTotal(pCached.productTotal);
      setProductPage(pCached.productPage);
      setProductError(null);
    } else {
      fetchProducts();
    }
    if (sFresh && sCached) {
      setShops(sCached.shops);
      setShopTotal(sCached.shopTotal);
      setShopPage(sCached.shopPage);
      setShopError(null);
    } else {
      fetchShops();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cat, sort, min, max, minRating, city, pay, cats]);

  const loadMoreProducts = async (opts?: { isRetry?: boolean }) => {
    const next = productPage + 1;
    setLoadingMoreP(true);
    setProductMoreError(null);
    try {
      const from = next * PRODUCT_PAGE_SIZE;
      const to = from + PRODUCT_PAGE_SIZE - 1;
      const res = await buildProductQuery().range(from, to);
      if (res.error) throw res.error;
      const more = ((res.data as any[]) ?? []).filter(p => p.shop?.is_active !== false);
      const merged = [...products, ...more];
      const total = res.count ?? productTotal;
      setProducts(merged);
      setProductPage(next);
      setProductTotal(total);
      saveProductCache({ products: merged, productTotal: total, productPage: next });
      if (opts?.isRetry) toast.success("Produk tambahan berhasil dimuat");
    } catch (e: any) {
      setProductMoreError(e.message || "Gagal memuat produk tambahan.");
    } finally {
      setLoadingMoreP(false);
    }
  };

  const loadMoreShops = async (opts?: { isRetry?: boolean }) => {
    const next = shopPage + 1;
    setLoadingMoreS(true);
    setShopMoreError(null);
    try {
      const from = next * SHOP_PAGE_SIZE;
      const to = from + SHOP_PAGE_SIZE - 1;
      const res = await buildShopQuery().range(from, to);
      if (res.error) throw res.error;
      const more = (res.data as any[]) ?? [];
      const merged = [...shops, ...more];
      const total = res.count ?? shopTotal;
      setShops(merged);
      setShopPage(next);
      setShopTotal(total);
      saveShopCache({ shops: merged, shopTotal: total, shopPage: next });
      if (opts?.isRetry) toast.success("Toko tambahan berhasil dimuat");
    } catch (e: any) {
      setShopMoreError(e.message || "Gagal memuat toko tambahan.");
    } finally {
      setLoadingMoreS(false);
    }
  };

  // Invalidate cache + refetch (untuk tombol Coba lagi pada initial-fetch error)
  const retryProducts = () => {
    productCacheRef.current.delete(cacheKey);
    persistCacheMap(PRODUCT_CACHE_KEY, productCacheRef.current);
    fetchProducts({ isRetry: true });
  };
  const retryShops = () => {
    shopCacheRef.current.delete(cacheKey);
    persistCacheMap(SHOP_CACHE_KEY, shopCacheRef.current);
    fetchShops({ isRetry: true });
  };

  const clearAllCachesAndRefetch = () => {
    // Hapus seluruh cache in-memory
    productCacheRef.current.clear();
    shopCacheRef.current.clear();
    // Hapus dari localStorage
    try {
      localStorage.removeItem(PRODUCT_CACHE_KEY);
      localStorage.removeItem(SHOP_CACHE_KEY);
    } catch { /* ignore */ }
    // Reset state
    setProducts([]);
    setShops([]);
    setProductPage(0);
    setShopPage(0);
    setProductError(null);
    setShopError(null);
    setProductMoreError(null);
    setShopMoreError(null);
    // Refetch
    fetchProducts();
    fetchShops();
    toast.success("Cache dihapus dan hasil dimuat ulang");
  };

  const refreshCurrentCache = () => {
    // Hapus cache hanya untuk kombinasi filter saat ini; cache lain tetap terjaga
    productCacheRef.current.delete(cacheKey);
    shopCacheRef.current.delete(cacheKey);
    persistCacheMap(PRODUCT_CACHE_KEY, productCacheRef.current);
    persistCacheMap(SHOP_CACHE_KEY, shopCacheRef.current);
    setProductError(null);
    setShopError(null);
    setProductMoreError(null);
    setShopMoreError(null);
    fetchProducts();
    fetchShops();
    toast.success("Hasil pencarian dimuat ulang");
  };

  const update = (patch: Record<string, any>) => navigate({ search: (prev: any) => ({ ...prev, ...patch }) });
  const clearFilter = (key: string) => update({ [key]: undefined });

  const applyDrafts = () => update({
    city: cityDraft || undefined,
    pay: (payDraft as any) || undefined,
  });

  const hasFilters = !!(cat || min || max || minRating || city || pay);
  const activePills: { label: string; key: string }[] = [];
  if (cat)       activePills.push({ label: cats.find(c => c.slug === cat)?.name ?? cat, key: "cat" });
  if (minRating) activePills.push({ label: `Min ★${minRating}`, key: "minRating" });
  if (min)       activePills.push({ label: `Min Rp${Number(min).toLocaleString("id-ID")}`, key: "min" });
  if (max)       activePills.push({ label: `Max Rp${Number(max).toLocaleString("id-ID")}`, key: "max" });
  if (city)      activePills.push({ label: `Kota: ${city}`, key: "city" });
  if (pay)       activePills.push({ label: `Bayar: ${PAY_LABEL[pay] ?? pay}`, key: "pay" });

  const hasQuery = !!(q || cat);
  const visibleProducts = tab === "toko"  ? [] : products;
  const visibleShops    = tab === "produk" ? [] : shops;
  const canLoadMoreProducts = products.length < productTotal;
  const canLoadMoreShops    = shops.length    < shopTotal;

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
            {hasQuery && !loadingProducts && !loadingShops && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{productTotal.toLocaleString("id-ID")}</span> produk
                {" · "}
                <span className="font-medium text-foreground">{shopTotal.toLocaleString("id-ID")}</span> toko
                {" cocok dengan filter"}
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
          {hasQuery && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 mt-1 gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={refreshCurrentCache}
                title="Muat ulang hasil untuk filter saat ini"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 mt-1 gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={clearAllCachesAndRefetch}
                title="Hapus cache hasil pencarian dan muat ulang"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Hapus cache</span>
              </Button>
            </>
          )}
        </div>

        {/* Active filter pills */}
        {activePills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activePills.map(p => (
              <ActiveFilterPill key={p.key} label={p.label} onRemove={() => clearFilter(p.key)} />
            ))}
            <button onClick={() => { setCityDraft(""); setPayDraft(""); update({ cat: undefined, min: undefined, max: undefined, minRating: undefined, city: undefined, pay: undefined }); }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
              Reset semua
            </button>
          </div>
        )}

        {/* Filter panel */}
        {showFilter && (
          <div className="mt-4 rounded-xl border border-border bg-card p-4">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
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
              <div>
                <Label className="text-xs">Kota / Lokasi</Label>
                <Input
                  type="text"
                  className="mt-1 h-9"
                  value={cityDraft}
                  onChange={e => setCityDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") applyDrafts(); }}
                  placeholder="Jakarta, Bandung…"
                />
              </div>
              <div>
                <Label className="text-xs">Metode Bayar</Label>
                <Select value={payDraft || "all"} onValueChange={v => setPayDraft(v === "all" ? "" : v)}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua metode</SelectItem>
                    <SelectItem value="cash">Tunai</SelectItem>
                    <SelectItem value="qris">QRIS</SelectItem>
                    <SelectItem value="transfer">Transfer Bank</SelectItem>
                    <SelectItem value="ewallet">E-Wallet</SelectItem>
                    <SelectItem value="card">Kartu Debit/Kredit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
              {draftDirty && (
                <span className="mr-auto text-xs text-muted-foreground">Perubahan belum diterapkan</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={!draftDirty}
                onClick={() => { setCityDraft(city ?? ""); setPayDraft(pay ?? ""); }}
              >
                Batal
              </Button>
              <Button size="sm" onClick={applyDrafts} disabled={!draftDirty}>
                Terapkan filter
              </Button>
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
                {t === "semua" ? `Semua (${(productTotal + shopTotal).toLocaleString("id-ID")})` : t === "produk" ? `Produk (${productTotal.toLocaleString("id-ID")})` : `Toko (${shopTotal.toLocaleString("id-ID")})`}
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
                  Toko · menampilkan {shops.length.toLocaleString("id-ID")} dari {shopTotal.toLocaleString("id-ID")}
                </h2>
                {loadingShops ? <SkeletonShopGrid />
                  : shopError && shops.length === 0 ? (
                    <SearchEmptyState
                      type="toko"
                      hasFilters={hasFilters}
                      onClear={() => { setCityDraft(""); setPayDraft(""); update({ cat: undefined, min: undefined, max: undefined, minRating: undefined, city: undefined, pay: undefined }); }}
                      onRetry={retryShops}
                      error={shopError}
                    />
                  ) : shops.length === 0 ? (
                    <SearchEmptyState
                      type="toko"
                      hasFilters={hasFilters}
                      onClear={() => { setCityDraft(""); setPayDraft(""); update({ cat: undefined, min: undefined, max: undefined, minRating: undefined, city: undefined, pay: undefined }); }}
                      onRetry={retryShops}
                    />
                  ) : (
                      <>
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                          {visibleShops.map(s => (
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
                          {loadingMoreS && <ShopSkeletonCards n={4} />}
                        </div>
                        {shopMoreError && (
                          <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>{shopMoreError}</span>
                            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-destructive hover:text-destructive" onClick={() => loadMoreShops({ isRetry: true })} disabled={loadingMoreS}>
                              <RefreshCw className="h-3 w-3" /> Coba lagi
                            </Button>
                          </div>
                        )}
                        {canLoadMoreShops && tab !== "produk" && !shopMoreError && (
                          <div className="mt-4 flex justify-center">
                            <Button variant="outline" size="sm" onClick={loadMoreShops} disabled={loadingMoreS} className="gap-1.5">
                              {loadingMoreS ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat…</> : "Muat lebih banyak toko"}
                            </Button>
                          </div>
                        )}
                        {!canLoadMoreShops && shops.length >= SHOP_PAGE_SIZE && (
                          <p className="mt-4 text-center text-xs text-muted-foreground">Tidak ada lagi toko untuk filter ini.</p>
                        )}
                      </>
                    )
                }
              </section>
            )}

            {/* Products section */}
            {tab !== "toko" && (
              <section>
                <h2 className="mb-4 text-base font-semibold text-muted-foreground">
                  Produk · menampilkan {products.length.toLocaleString("id-ID")} dari {productTotal.toLocaleString("id-ID")}
                </h2>
                {loadingProducts ? <SkeletonProductGrid />
                  : productError && products.length === 0 ? (
                    <SearchEmptyState
                      type="produk"
                      hasFilters={hasFilters}
                      onClear={() => { setCityDraft(""); setPayDraft(""); update({ cat: undefined, min: undefined, max: undefined, minRating: undefined, city: undefined, pay: undefined }); }}
                      onRetry={retryProducts}
                      error={productError}
                    />
                  ) : products.length === 0 ? (
                    <SearchEmptyState
                      type="produk"
                      hasFilters={hasFilters}
                      onClear={() => { setCityDraft(""); setPayDraft(""); update({ cat: undefined, min: undefined, max: undefined, minRating: undefined, city: undefined, pay: undefined }); }}
                      onRetry={retryProducts}
                    />
                  ) : (
                      <>
                        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                          {visibleProducts.map(p => <ProductCard key={p.id} product={p} />)}
                          {loadingMoreP && <ProductSkeletonCards n={10} />}
                        </div>
                        {productMoreError && (
                          <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>{productMoreError}</span>
                            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-destructive hover:text-destructive" onClick={() => loadMoreProducts({ isRetry: true })} disabled={loadingMoreP}>
                              <RefreshCw className="h-3 w-3" /> Coba lagi
                            </Button>
                          </div>
                        )}
                        {canLoadMoreProducts && tab !== "toko" && !productMoreError && (
                          <div className="mt-4 flex justify-center">
                            <Button variant="outline" size="sm" onClick={loadMoreProducts} disabled={loadingMoreP} className="gap-1.5">
                              {loadingMoreP ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat…</> : "Muat lebih banyak produk"}
                            </Button>
                          </div>
                        )}
                        {!canLoadMoreProducts && products.length >= PRODUCT_PAGE_SIZE && (
                          <p className="mt-4 text-center text-xs text-muted-foreground">Tidak ada lagi produk untuk filter ini.</p>
                        )}
                      </>
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
