import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { DeliveryEstimate } from "@/components/marketplace/DeliveryEstimate";
import { Button } from "@/components/ui/button";
import { Store, ShoppingCart, Plus, Minus, Heart, Share2, Check, Bell, TrendingDown, Ruler, AlertTriangle, Scale, Lock, Play, Package, Layers, Sparkles, Zap } from "lucide-react";
import { addToCompare, removeFromCompare, isInCompare } from "@/lib/compare";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import { addToCart } from "@/lib/marketplace-cart";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ProductReviews } from "@/components/marketplace/ProductReviews";

import { ProductQA } from "@/components/marketplace/ProductQA";
import { useSeo } from "@/lib/use-seo";

const PA_KEY = "kh_price_alerts";
function getPriceAlerts(): Record<string, { price: number; name: string }> {
  try { return JSON.parse(localStorage.getItem(PA_KEY) ?? "{}"); } catch { return {}; }
}
function savePriceAlerts(d: Record<string, { price: number; name: string }>) {
  try { localStorage.setItem(PA_KEY, JSON.stringify(d)); } catch {}
}

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
  allergens: string[] | null;
  dietary_tags: string[] | null;
  ingredients: string | null;
  bpom_number: string | null;
  skin_type_tags: string[] | null;
  size_chart: { label: string; sizes: { size: string; [key: string]: string }[] } | null;
  item_type: string | null;
  preview_image_url: string | null;
  accepts_custom_order?: boolean | null;
  flash_price?: number | null;
  flash_starts_at?: string | null;
  flash_ends_at?: string | null;
  restock_deadline?: string | null;
  nutrition_info?: { calories?: number; protein?: number; carbs?: number; fat?: number; fiber?: number } | null;
  production_days?: number | null;
};

type PricePoint = { recorded_at: string; price: number };

function PriceHistory({ productId, currentPrice }: { productId: string; currentPrice: number }) {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("menu_item_price_history" as any)
        .select("recorded_at, price")
        .eq("menu_item_id" as any, productId)
        .order("recorded_at" as any, { ascending: true })
        .limit(30) as any;
      setHistory((data ?? []) as PricePoint[]);
      setLoaded(true);
    })();
  }, [productId]);

  if (!loaded) return null;

  const chartData = [
    ...(history as PricePoint[]).map(h => ({
      date: new Date(h.recorded_at).toLocaleDateString("id-ID", { month: "short", day: "numeric" }),
      price: Number(h.price),
    })),
    { date: "Sekarang", price: currentPrice },
  ];

  if (chartData.length < 2) return null;

  const lowestPrice = Math.min(...chartData.map(d => d.price));
  const hasDropped = chartData.length > 1 && chartData[0].price > currentPrice;

  return (
    <div className="mt-6 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <TrendingDown className="h-4 w-4 text-primary" /> Histori Harga
        </h3>
        {hasDropped && (
          <span className="text-xs font-medium text-emerald-600 bg-emerald-100 rounded-full px-2 py-0.5">Harga turun!</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            formatter={(v: number) => [`Rp ${v.toLocaleString("id-ID")}`, "Harga"]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      {lowestPrice < currentPrice && (
        <p className="mt-2 text-xs text-muted-foreground">
          Harga terendah 30 hari: <span className="font-semibold text-emerald-600">Rp {lowestPrice.toLocaleString("id-ID")}</span>
        </p>
      )}
    </div>
  );
}

type Shop = { id: string; slug: string; name: string; logo_url: string | null };

function useFlashCountdown(endsAt: string | null) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => tick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!endsAt) return null;
  const ms = Math.max(0, new Date(endsAt).getTime() - Date.now());
  if (ms === 0) return null;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { h, m, s: sec };
}

function FlashSaleBanner({ product }: { product: Product }) {
  const now = Date.now();
  const flashActive = !!(
    product.flash_price != null &&
    Number(product.flash_price) > 0 &&
    Number(product.flash_price) < Number(product.price) &&
    (!product.flash_starts_at || new Date(product.flash_starts_at).getTime() <= now) &&
    (!product.flash_ends_at || new Date(product.flash_ends_at).getTime() > now)
  );
  const countdown = useFlashCountdown(flashActive ? (product.flash_ends_at ?? null) : null);
  if (!flashActive) return null;
  const fp = Number(product.flash_price);
  const orig = Number(product.price);
  const discPct = Math.round((1 - fp / orig) * 100);
  return (
    <div className="mt-3 rounded-xl border border-red-300 dark:border-red-800 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/20 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow">
            <Zap className="h-3.5 w-3.5 animate-pulse" /> Flash Sale
          </span>
          <span className="rounded-full bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 px-2 py-0.5 text-xs font-bold text-destructive">
            -{discPct}%
          </span>
        </div>
        {countdown && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Berakhir dalam:</span>
            <div className="flex items-center gap-1">
              {countdown.h > 0 && (
                <><span className="rounded-md bg-destructive/10 border border-red-200 dark:border-red-800 px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums text-destructive">{String(countdown.h).padStart(2, "0")}</span><span className="text-muted-foreground text-xs">j</span></>
              )}
              <span className="rounded-md bg-destructive/10 border border-red-200 dark:border-red-800 px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums text-destructive">{String(countdown.m).padStart(2, "0")}</span>
              <span className="text-muted-foreground text-xs">m</span>
              <span className="rounded-md bg-destructive/10 border border-red-200 dark:border-red-800 px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums text-destructive">{String(countdown.s).padStart(2, "0")}</span>
              <span className="text-muted-foreground text-xs">d</span>
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2.5">
        <span className="text-3xl font-extrabold text-destructive">Rp {fp.toLocaleString("id-ID")}</span>
        <span className="text-base text-muted-foreground line-through">Rp {orig.toLocaleString("id-ID")}</span>
        <span className="text-sm font-semibold text-destructive">Hemat Rp {(orig - fp).toLocaleString("id-ID")}</span>
      </div>
    </div>
  );
}

type BundleComponent = {
  component_id: string;
  quantity: number;
  name: string;
  price: number;
  image_url: string | null;
};

function BundleContents({ productId }: { productId: string }) {
  const [components, setComponents] = useState<BundleComponent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("bundle_items")
        .select("component_id, quantity, menu_items!bundle_items_component_id_fkey(name, price, image_url)")
        .eq("bundle_id", productId);
      if (data) {
        setComponents(
          (data as any[]).map((row) => ({
            component_id: row.component_id,
            quantity: row.quantity,
            name: row.menu_items?.name ?? "—",
            price: Number(row.menu_items?.price ?? 0),
            image_url: row.menu_items?.image_url ?? null,
          })),
        );
      }
      setLoading(false);
    })();
  }, [productId]);

  if (loading) {
    return (
      <div className="mt-6 rounded-xl border border-border p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }
  if (components.length === 0) return null;

  const totalComponentPrice = components.reduce((sum, c) => sum + c.price * c.quantity, 0);

  return (
    <div className="mt-6 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 p-4">
      <h3 className="mb-3 text-sm font-semibold flex items-center gap-1.5 text-violet-700 dark:text-violet-300">
        <Package className="h-4 w-4" /> Isi Paket Ini
      </h3>
      <ul className="space-y-2">
        {components.map((c) => (
          <li key={c.component_id} className="flex items-center gap-3">
            {c.image_url ? (
              <img src={c.image_url} alt={c.name} className="h-9 w-9 rounded-lg object-cover shrink-0 border border-border" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground">Rp {c.price.toLocaleString("id-ID")}</p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              ×{c.quantity}
            </span>
          </li>
        ))}
      </ul>
      {totalComponentPrice > 0 && (
        <p className="mt-3 text-xs text-muted-foreground border-t border-violet-200 dark:border-violet-800 pt-3">
          Total harga satuan:{" "}
          <span className="line-through">Rp {totalComponentPrice.toLocaleString("id-ID")}</span>
          {" "}— beli bundel lebih hemat!
        </p>
      )}
    </div>
  );
}

function ProductDetailPage() {
  const { slug, productId } = Route.useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cartQty, setCartQty] = useState(1);

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
        .select("id, shop_id, name, description, price, image_url, rating_avg, rating_count, stock, track_stock, allergens, dietary_tags, ingredients, bpom_number, size_chart, item_type, preview_image_url, accepts_custom_order, flash_price, flash_starts_at, flash_ends_at, skin_type_tags, restock_deadline, nutrition_info, production_days")
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

  useSeo({
    title: product && shop ? `${product.name} — ${shop.name}` : "Produk",
    description: product?.description ?? (product ? `${product.name} di ${shop?.name ?? "toko"}.` : undefined),
    image: product?.image_url ?? undefined,
    type: "product",
    jsonLd: product && shop ? {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description ?? undefined,
      image: product.image_url ?? undefined,
      brand: { "@type": "Brand", name: shop.name },
      offers: {
        "@type": "Offer",
        price: product.price,
        priceCurrency: "IDR",
        availability: product.track_stock && (product.stock ?? 0) <= 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      },
      ...(product.rating_avg && product.rating_count ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: product.rating_avg,
          reviewCount: product.rating_count,
        },
      } : {}),
    } : null,
  });

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
              <FlashSaleBanner product={product} />
              {(() => {
                const now = Date.now();
                const flashActive = !!(
                  product.flash_price != null &&
                  Number(product.flash_price) > 0 &&
                  Number(product.flash_price) < Number(product.price) &&
                  (!product.flash_starts_at || new Date(product.flash_starts_at).getTime() <= now) &&
                  (!product.flash_ends_at || new Date(product.flash_ends_at).getTime() > now)
                );
                if (flashActive) return null;
                return (
                  <div className="mt-4 text-3xl font-bold text-primary">
                    Rp {Number(product.price).toLocaleString("id-ID")}
                  </div>
                );
              })()}
              <BulkPricingTiers productId={product.id} basePrice={Number(product.price)} activeQty={cartQty} />
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

              {/* M-10: Bundle components */}
              {product.item_type === "bundle" && (
                <BundleContents productId={product.id} />
              )}

              {/* P-08: Dietary & Allergen tags */}
              {((product.dietary_tags && product.dietary_tags.length > 0) || (product.allergens && product.allergens.length > 0)) && (
                <div className="mt-5 space-y-2">
                  {product.dietary_tags && product.dietary_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {product.dietary_tags.map((tag: string) => (
                        <span key={tag} className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          tag === "Halal" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" :
                          tag === "Vegan" ? "bg-green-100 text-green-700" :
                          tag === "Vegetarian" ? "bg-lime-100 text-lime-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>{tag}</span>
                      ))}
                    </div>
                  )}
                  {product.allergens && product.allergens.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">⚠️ Mengandung alergen:</p>
                      <div className="flex flex-wrap gap-1">
                        {product.allergens.map((a: string) => (
                          <span key={a} className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* BE-03: Skin type tags */}
              {product.skin_type_tags && product.skin_type_tags.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">💧 Cocok untuk jenis kulit:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.skin_type_tags.map((type: string) => (
                      <span key={type} className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* KR-02: Estimasi waktu produksi */}
              {product.production_days != null && product.production_days > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/20 px-3 py-2 text-sm">
                  <span className="text-base">🕐</span>
                  <span className="text-blue-800 dark:text-blue-300 font-medium">Dibuat dalam ~{product.production_days} hari kerja</span>
                  <span className="text-blue-600 dark:text-blue-400 text-xs">(produk custom/handmade)</span>
                </div>
              )}

              {/* FA-07: Restock notification */}
              {product.track_stock && product.stock !== null && product.stock <= 0 && (
                <StockAlertSection productId={product.id} productName={product.name} shopId={product.shop_id} restockDeadline={product.restock_deadline} />
              )}

              {/* R-10: Informasi Nutrisi */}
              {product.nutrition_info && Object.values(product.nutrition_info).some(v => v != null) && (
                <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">🥗 Informasi Nutrisi <span className="font-normal text-muted-foreground">(per porsi)</span></p>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {product.nutrition_info.calories != null && (
                      <div className="rounded-lg border border-border bg-background p-2 flex flex-col items-center">
                        <span className="text-base font-bold text-foreground">{product.nutrition_info.calories}</span>
                        <span className="text-[10px] text-muted-foreground">kkal</span>
                      </div>
                    )}
                    {product.nutrition_info.protein != null && (
                      <div className="rounded-lg border border-border bg-background p-2 flex flex-col items-center">
                        <span className="text-base font-bold text-foreground">{product.nutrition_info.protein}g</span>
                        <span className="text-[10px] text-muted-foreground">Protein</span>
                      </div>
                    )}
                    {product.nutrition_info.carbs != null && (
                      <div className="rounded-lg border border-border bg-background p-2 flex flex-col items-center">
                        <span className="text-base font-bold text-foreground">{product.nutrition_info.carbs}g</span>
                        <span className="text-[10px] text-muted-foreground">Karbo</span>
                      </div>
                    )}
                    {product.nutrition_info.fat != null && (
                      <div className="rounded-lg border border-border bg-background p-2 flex flex-col items-center">
                        <span className="text-base font-bold text-foreground">{product.nutrition_info.fat}g</span>
                        <span className="text-[10px] text-muted-foreground">Lemak</span>
                      </div>
                    )}
                    {product.nutrition_info.fiber != null && (
                      <div className="rounded-lg border border-border bg-background p-2 flex flex-col items-center">
                        <span className="text-base font-bold text-foreground">{product.nutrition_info.fiber}g</span>
                        <span className="text-[10px] text-muted-foreground">Serat</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* P-09: Ingredient list & BPOM */}
              {(product.ingredients || product.bpom_number) && (
                <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 space-y-2.5 text-sm">
                  {product.bpom_number && (
                    <div className="flex items-start gap-2">
                      <span className="inline-flex shrink-0 items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">BPOM</span>
                      <span className="text-muted-foreground font-mono text-xs pt-0.5">{product.bpom_number}</span>
                    </div>
                  )}
                  {product.ingredients && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1">Komposisi / Bahan</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{product.ingredients}</p>
                    </div>
                  )}
                </div>
              )}

              <DeliveryEstimate shopId={shop.id} />
              <AddToCartBlock product={product} shopSlug={shop.slug} shop={shop} qty={cartQty} onQtyChange={setCartQty} />
              {product.accepts_custom_order && (
                <Link
                  to="/toko/$slug/custom-order"
                  params={{ slug: shop.slug }}
                  search={{ produk: product.id }}
                  className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">Mau pesan custom?</div>
                      <p className="text-xs text-muted-foreground line-clamp-2">Kirim brief khusus (ukuran, warna, jumlah) — penjual akan balas via WhatsApp.</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary shrink-0">Mulai →</span>
                </Link>
              )}
            </div>
          </div>
        ) : null}
        {/* P-06: Price History Chart */}
        {product && <PriceHistory productId={product.id} currentPrice={product.price} />}

        {/* P-07: Size Chart */}
        {product?.size_chart && (
          <div className="mt-8 rounded-xl border border-border p-5">
            <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
              <Ruler className="h-4 w-4 text-primary" /> {product.size_chart.label ?? "Tabel Ukuran"}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/60">
                    <th className="border border-border px-3 py-2 text-left font-semibold">Ukuran</th>
                    {product.size_chart.sizes[0] && Object.keys(product.size_chart.sizes[0])
                      .filter(k => k !== "size")
                      .map(col => (
                        <th key={col} className="border border-border px-3 py-2 text-left font-semibold capitalize">{col}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {product.size_chart.sizes.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                      <td className="border border-border px-3 py-2 font-semibold">{row.size}</td>
                      {Object.entries(row).filter(([k]) => k !== "size").map(([k, v]) => (
                        <td key={k} className="border border-border px-3 py-2 text-muted-foreground">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Ukuran bisa berbeda ±1–2 cm. Hubungi toko untuk konsultasi ukuran.
            </p>
          </div>
        )}

        {/* M-13: Digital Preview */}
        {product && product.item_type === "digital" && (
          <DigitalPreview product={product} />
        )}

        {/* M-07: Frequently Bought Together */}
        {product && shop && (
          <FrequentlyBoughtTogether productId={product.id} shopId={shop.id} shopSlug={shop.slug} />
        )}

        {product && shop && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold mb-4">Tanya &amp; Jawab</h2>
            <ProductQA productId={product.id} shopId={shop.id} />
          </section>
        )}
        {product && shop && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold mb-4">Ulasan Produk</h2>
            <ProductReviews productId={product.id} shopId={shop.id} />
          </section>
        )}
      </div>
      <MarketplaceFooter />
    </div>
  );
}

function ShareButton({ product, shop }: { product: Product; shop: Shop }) {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;
  const text = `${product.name} — ${shop.name}\nRp ${Number(product.price).toLocaleString("id-ID")}`;

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: product.name, text, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link produk disalin!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" size="icon" onClick={share}
      className="h-11 w-11 shrink-0"
      title="Bagikan produk">
      {copied ? <Check className="h-5 w-5 text-green-600" /> : <Share2 className="h-5 w-5" />}
    </Button>
  );
}

const STOCK_ALERTS_KEY = "umkmgo_stock_alerts_v1";
function getStockAlerts(): Record<string, { productName: string; contact: string; subscribedAt: string }> {
  try { return JSON.parse(localStorage.getItem(STOCK_ALERTS_KEY) ?? "{}"); } catch { return {}; }
}
function saveStockAlerts(d: Record<string, { productName: string; contact: string; subscribedAt: string }>) {
  try { localStorage.setItem(STOCK_ALERTS_KEY, JSON.stringify(d)); } catch {}
}

function formatRestockDeadline(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}

function StockAlertSection({ productId, productName, shopId, restockDeadline }: { productId: string; productName: string; shopId: string; restockDeadline?: string | null }) {
  const [subscribed, setSubscribed] = useState(false);
  const [contact, setContact] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const alerts = getStockAlerts();
    if (alerts[productId]) { setSubscribed(true); setContact(alerts[productId].contact); }
  }, [productId]);

  const subscribe = async () => {
    const wa = contact.trim().replace(/\D/g, "");
    if (wa.length < 8) { toast.error("Masukkan nomor WhatsApp yang valid"); return; }
    setBusy(true);
    const alerts = getStockAlerts();
    alerts[productId] = { productName, contact: contact.trim(), subscribedAt: new Date().toISOString() };
    saveStockAlerts(alerts);
    try {
      await (supabase as any)
        .from("restock_subscribers")
        .upsert(
          { shop_id: shopId, product_id: productId, product_name: productName, customer_wa: wa },
          { onConflict: "product_id,customer_wa" }
        );
    } catch {
    }
    setSubscribed(true);
    setShowForm(false);
    setBusy(false);
    toast.success("Siap! Kamu akan mendapat notifikasi saat stok tersedia kembali.");
  };

  const unsubscribe = () => {
    const alerts = getStockAlerts();
    delete alerts[productId];
    saveStockAlerts(alerts);
    setSubscribed(false);
    setContact("");
    toast.success("Notifikasi dimatikan");
  };

  if (subscribed) {
    return (
      <div className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <Bell className="h-4 w-4 fill-current" />
          <span>Notifikasi stok aktif untuk <span className="font-semibold">{contact}</span></span>
        </div>
        <button onClick={unsubscribe} className="text-xs text-muted-foreground hover:text-destructive shrink-0">Matikan</button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Bell className="h-4 w-4 text-muted-foreground" />
        Produk ini sedang habis — mau diberitahu saat tersedia?
      </div>
      {restockDeadline && (
        <div className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          <Package className="h-4 w-4 shrink-0" />
          <span>Estimasi tersedia kembali: <strong>{formatRestockDeadline(restockDeadline)}</strong></span>
        </div>
      )}
      {showForm ? (
        <div className="flex gap-2">
          <input
            type="tel"
            value={contact}
            onChange={e => setContact(e.target.value)}
            placeholder="Nomor WhatsApp (08xxx)"
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
          <Button size="sm" onClick={subscribe} disabled={busy}>{busy ? "Menyimpan..." : "Beritahu Saya"}</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
          <Bell className="h-3.5 w-3.5 mr-1.5" /> Beritahu Saya saat Stok Tersedia
        </Button>
      )}
    </div>
  );
}

function PriceAlertButton({ productId, productName, productPrice }: { productId: string; productName: string; productPrice: number }) {
  const { user } = useAuth();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const alerts = getPriceAlerts();
    setActive(!!alerts[productId]);
  }, [productId]);

  const toggle = () => {
    if (!user) { toast.info("Masuk untuk mengaktifkan alert harga"); return; }
    const alerts = getPriceAlerts();
    if (active) {
      delete alerts[productId];
      savePriceAlerts(alerts);
      setActive(false);
      toast.success("Alert harga dimatikan");
    } else {
      alerts[productId] = { price: productPrice, name: productName };
      savePriceAlerts(alerts);
      setActive(true);
      toast.success("Alert aktif! Kamu akan diberitahu jika harga turun");
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      className={`h-11 w-11 shrink-0 ${active ? "text-amber-500 border-amber-300 bg-amber-50 hover:bg-amber-100" : ""}`}
      title={active ? "Matikan alert harga" : "Aktifkan alert harga turun"}
    >
      <Bell className={`h-5 w-5 ${active ? "fill-current" : ""}`} />
    </Button>
  );
}

function WishlistButton({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [wished, setWished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wishId, setWishId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("wishlists" as any).select("id").eq("user_id", user.id).eq("menu_item_id", productId).maybeSingle()
      .then(({ data }) => { if (data) { setWished(true); setWishId((data as any).id); } });
  }, [user?.id, productId]);

  const toggle = async () => {
    if (!user) { toast.info("Masuk untuk menyimpan wishlist"); return; }
    setBusy(true);
    if (wished && wishId) {
      await supabase.from("wishlists" as any).delete().eq("id", wishId);
      setWished(false); setWishId(null);
      toast.success("Dihapus dari wishlist");
    } else {
      const { data } = await supabase.from("wishlists" as any).insert({ user_id: user.id, menu_item_id: productId }).select("id").single();
      setWished(true); setWishId((data as any)?.id ?? null);
      toast.success("Ditambahkan ke wishlist");
    }
    setBusy(false);
  };

  return (
    <Button variant="outline" size="icon" onClick={toggle} disabled={busy}
      className={`h-11 w-11 shrink-0 ${wished ? "text-red-500 border-red-200 bg-red-50 hover:bg-red-100" : ""}`}
      title={wished ? "Hapus dari wishlist" : "Simpan ke wishlist"}>
      <Heart className={`h-5 w-5 ${wished ? "fill-current" : ""}`} />
    </Button>
  );
}

function CompareButton({ product }: { product: Product }) {
  const [inCompare, setInCompare] = useState(() => isInCompare(product.id));

  const toggle = () => {
    if (inCompare) {
      removeFromCompare(product.id);
      setInCompare(false);
      toast.success("Dihapus dari perbandingan");
    } else {
      const ok = addToCompare({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image_url: product.image_url,
        shop_id: product.shop_id,
      });
      if (ok) {
        setInCompare(true);
        toast.success("Ditambahkan ke perbandingan", {
          action: { label: "Bandingkan", onClick: () => window.open("/bandingkan", "_blank") },
        });
      } else {
        toast.error("Maksimal 4 produk bisa dibandingkan");
      }
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      className={`h-11 w-11 shrink-0 ${inCompare ? "text-blue-600 border-blue-300 bg-blue-50 hover:bg-blue-100" : ""}`}
      title={inCompare ? "Hapus dari perbandingan" : "Bandingkan produk ini"}
    >
      <Scale className={`h-5 w-5 ${inCompare ? "fill-current" : ""}`} />
    </Button>
  );
}

type BulkRule = { id: string; min_qty: number; max_qty: number | null; price: number; label: string | null };

function BulkPricingTiers({ productId, basePrice, activeQty }: { productId: string; basePrice: number; activeQty: number }) {
  const [tiers, setTiers] = useState<BulkRule[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("bulk_pricing_rules")
        .select("id, min_qty, max_qty, price, label")
        .eq("menu_item_id", productId)
        .order("min_qty");
      if (!error) setTiers((data ?? []) as BulkRule[]);
      setLoaded(true);
    })();
  }, [productId]);

  if (!loaded || tiers.length === 0) return null;

  const activeTier = tiers.slice().reverse().find(t => activeQty >= t.min_qty && (t.max_qty === null || activeQty <= t.max_qty));
  const activePrice = activeTier ? activeTier.price : basePrice;
  const activeSaving = Math.round((1 - activePrice / basePrice) * 100);

  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-emerald-200 dark:border-emerald-800 bg-emerald-100/60 dark:bg-emerald-900/30 px-3 py-2">
        <Layers className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
        <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Harga Grosir / Bulk</span>
        <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400">Beli lebih, hemat lebih!</span>
      </div>
      <div className="divide-y divide-emerald-100 dark:divide-emerald-900">
        {tiers.map(tier => {
          const isActive = tier === activeTier;
          const discount = Math.round((1 - tier.price / basePrice) * 100);
          return (
            <div
              key={tier.id}
              className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${isActive ? "bg-emerald-200/70 dark:bg-emerald-800/40" : ""}`}
            >
              {isActive && (
                <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
              {!isActive && (
                <span className="shrink-0 h-5 w-5 rounded-full border-2 border-emerald-300 dark:border-emerald-700" />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">
                  Beli {tier.min_qty}{tier.max_qty ? `–${tier.max_qty}` : "+"} pcs
                </span>
                {tier.label && (
                  <span className="ml-2 text-xs text-muted-foreground">({tier.label})</span>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className={`text-sm font-bold ${isActive ? "text-emerald-700 dark:text-emerald-300" : "text-foreground"}`}>
                  Rp {Number(tier.price).toLocaleString("id-ID")} / pcs
                </span>
                {discount > 0 && (
                  <span className="ml-2 text-[10px] font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-400 rounded-full px-1.5 py-0.5">
                    -{discount}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {activeTier && activeSaving > 0 && (
        <div className="border-t border-emerald-200 dark:border-emerald-800 bg-emerald-100/60 dark:bg-emerald-900/30 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
          Dengan {activeQty} pcs: Rp {Number(activePrice * activeQty).toLocaleString("id-ID")} — hemat {activeSaving}% dari harga normal
        </div>
      )}
      {!activeTier && (
        <div className="border-t border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-500">
          Tambah qty untuk mendapatkan harga grosir (min. {tiers[0]?.min_qty} pcs)
        </div>
      )}
    </div>
  );
}

function RelatedItemCard({ item, shopId, shopSlug }: {
  item: { id: string; name: string; price: number; image_url: string | null };
  shopId: string;
  shopSlug: string;
}) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded]   = useState(false);

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    try {
      await addToCart({ shop_id: shopId, product_id: item.id, unit_price: item.price, quantity: 1 });
      setAdded(true);
      toast.success(`${item.name} ditambahkan ke keranjang`);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      toast.error("Gagal menambahkan ke keranjang");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="group relative rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-colors">
      <Link
        to="/toko/$slug/produk/$productId"
        params={{ slug: shopSlug, productId: item.id }}
        className="block"
      >
        <div className="aspect-square bg-muted/40 overflow-hidden">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Store className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="p-2.5 pr-8">
          <p className="text-xs font-medium line-clamp-2 leading-snug">{item.name}</p>
          <p className="mt-1 text-xs font-bold text-primary">
            Rp {Number(item.price).toLocaleString("id-ID")}
          </p>
        </div>
      </Link>
      <button
        onClick={handleQuickAdd}
        disabled={adding}
        className={`absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition-all ${
          added ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
        title="Tambah ke keranjang"
      >
        {adding ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : added ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

function FrequentlyBoughtTogether({ productId, shopId, shopSlug }: { productId: string; shopId: string; shopSlug: string }) {
  type RelatedProduct = { id: string; name: string; price: number; image_url: string | null };
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Step 0: Try precomputed suggestions first (fast & curated)
        const { data: precomputed } = await supabase
          .from("product_upsell_suggestions" as any)
          .select("suggested_id, position, is_pinned, source")
          .eq("product_id" as any, productId)
          .order("is_pinned" as any, { ascending: false })
          .order("position" as any, { ascending: true })
          .limit(6) as any;

        const precomputedIds: string[] = (precomputed ?? [])
          .map((r: any) => r.suggested_id)
          .filter(Boolean);

        if (precomputedIds.length >= 2) {
          const { data } = await supabase
            .from("menu_items")
            .select("id, name, price, image_url")
            .in("id", precomputedIds)
            .eq("is_available" as any, true) as any;
          // Preserve order from precomputed
          const sorted = precomputedIds
            .map((id) => (data ?? []).find((d: any) => d.id === id))
            .filter(Boolean);
          setRelated(sorted as RelatedProduct[]);
          return;
        }

        // Step 1: Fallback — find orders containing this product
        const { data: refs } = await supabase
          .from("order_items" as any)
          .select("order_id")
          .eq("menu_item_id" as any, productId)
          .limit(200) as any;

        const orderIds: string[] = (refs ?? []).map((r: any) => r.order_id).filter(Boolean);

        let topIds: string[] = [];

        if (orderIds.length > 0) {
          // Step 2: Find co-purchased items in those orders
          const { data: coItems } = await supabase
            .from("order_items" as any)
            .select("menu_item_id")
            .in("order_id" as any, orderIds)
            .neq("menu_item_id" as any, productId)
            .not("menu_item_id" as any, "is", null)
            .limit(500) as any;

          // Step 3: Count frequency
          const freq = new Map<string, number>();
          for (const item of (coItems ?? []) as any[]) {
            if (item.menu_item_id) {
              freq.set(item.menu_item_id, (freq.get(item.menu_item_id) ?? 0) + 1);
            }
          }

          topIds = [...freq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([id]) => id);
        }

        if (topIds.length >= 2) {
          // Step 4: Fetch product details for co-purchased IDs
          const { data } = await supabase
            .from("menu_items")
            .select("id, name, price, image_url")
            .in("id", topIds)
            .eq("is_available" as any, true) as any;
          setRelated((data ?? []) as RelatedProduct[]);
        } else {
          // Fallback: same-shop items (most recently added first)
          const { data } = await supabase
            .from("menu_items")
            .select("id, name, price, image_url")
            .eq("shop_id" as any, shopId)
            .eq("is_available" as any, true)
            .neq("id", productId)
            .order("sort_order" as any, { ascending: true })
            .limit(4) as any;
          setRelated((data ?? []) as RelatedProduct[]);
        }
      } catch {
        // silent fallback
      } finally {
        setLoaded(true);
      }
    })();
  }, [productId, shopId]);

  if (!loaded || related.length === 0) return null;

  return (
    <section className="mt-10">
      <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
        <Package className="h-4 w-4 text-primary" /> Sering Dibeli Bersama
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {related.map((item) => (
          <RelatedItemCard key={item.id} item={item} shopId={shopId} shopSlug={shopSlug} />
        ))}
      </div>
    </section>
  );
}

function DigitalPreview({ product }: { product: Product }) {
  const [revealed, setRevealed] = useState(false);

  const previewSrc = product.preview_image_url ?? product.image_url;
  if (!previewSrc) return null;

  return (
    <div className="mt-8 rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-2 bg-muted/40 px-4 py-2.5 border-b border-border">
        <Play className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Preview Produk Digital</span>
        <span className="ml-auto text-xs text-muted-foreground">Sample watermarked</span>
      </div>
      <div className="relative">
        <img
          src={previewSrc}
          alt="Preview"
          className={`w-full object-cover transition-all duration-300 ${revealed ? "blur-none" : "blur-md"}`}
          style={{ maxHeight: 320 }}
        />
        {!revealed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
            <div className="rounded-xl bg-white/90 dark:bg-black/80 px-6 py-4 text-center shadow-lg">
              <Lock className="mx-auto h-7 w-7 text-primary mb-2" />
              <p className="text-sm font-semibold">Pratinjau terkunci</p>
              <p className="mt-1 text-xs text-muted-foreground">Beli produk untuk akses penuh</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 text-xs"
                onClick={() => setRevealed(true)}
              >
                Lihat sample blur
              </Button>
            </div>
          </div>
        )}
        {revealed && (
          <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white font-semibold select-none pointer-events-none">
            SAMPLE — Beli untuk versi lengkap
          </div>
        )}
      </div>
    </div>
  );
}

function AddToCartBlock({ product, shopSlug, shop, qty: qtyProp, onQtyChange }: {
  product: Product; shopSlug: string; shop?: Shop | null;
  qty?: number; onQtyChange?: (n: number) => void;
}) {
  const [qtyLocal, setQtyLocal] = useState(1);
  const qty = qtyProp ?? qtyLocal;
  const setQty = (n: number) => { setQtyLocal(n); onQtyChange?.(n); };
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigate = (useNavigate as any)();
  const outOfStock = product.track_stock && (product.stock ?? 0) <= 0;

  const effectivePrice = (() => {
    const now = Date.now();
    const flashActive = !!(
      product.flash_price != null &&
      Number(product.flash_price) > 0 &&
      Number(product.flash_price) < Number(product.price) &&
      (!product.flash_starts_at || new Date(product.flash_starts_at).getTime() <= now) &&
      (!product.flash_ends_at || new Date(product.flash_ends_at).getTime() > now)
    );
    return flashActive ? Number(product.flash_price) : Number(product.price);
  })();

  const onAdd = async (goCheckout = false) => {
    if (!user) {
      toast.info("Silakan masuk untuk berbelanja");
      navigate({ to: "/login" });
      return;
    }
    setBusy(true);
    try {
      await addToCart({
        shop_id: product.shop_id,
        product_id: product.id,
        unit_price: effectivePrice,
        quantity: qty,
      });
      toast.success(`${product.name} ditambahkan ke keranjang`);
      if (goCheckout) navigate({ to: "/keranjang" });
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menambahkan ke keranjang");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Jumlah</span>
        <div className="flex items-center rounded-lg border border-border">
          <button
            className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={() => setQty(Math.max(1, qty - 1))}
            disabled={qty <= 1}
            aria-label="Kurangi"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-sm font-medium">{qty}</span>
          <button
            className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={() => setQty(qty + 1)}
            aria-label="Tambah"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <WishlistButton productId={product.id} />
        <PriceAlertButton productId={product.id} productName={product.name} productPrice={Number(product.price)} />
        {shop && <ShareButton product={product} shop={shop as Shop} />}
        <CompareButton product={product} />
        <Button
          size="lg"
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => onAdd(false)}
          disabled={busy || outOfStock}
        >
          <ShoppingCart className="h-4 w-4" /> + Keranjang
        </Button>
        <Button
          size="lg"
          className="flex-1"
          onClick={() => onAdd(true)}
          disabled={busy || outOfStock}
        >
          {outOfStock ? "Stok Habis" : "Beli Sekarang"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Atau{" "}
        <Link to="/s/$slug" params={{ slug: shopSlug }} className="text-primary hover:underline">
          buka etalase toko
        </Link>{" "}
        untuk fitur pickup/delivery lengkap.
      </p>
    </div>
  );
}
