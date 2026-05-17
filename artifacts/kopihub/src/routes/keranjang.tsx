import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { listCart, updateCartItem, removeCartItem, listShopDeliverySettings, getLastCartActivity, markCartActivity, addToCart, type CartItem, type DeliverySettings } from "@/lib/marketplace-cart";
import { useAuth } from "@/lib/auth";
import { getDeliveryWindow, formatEta, formatTime } from "@/lib/delivery-eta";
import { Trash2, Plus, Minus, ShoppingCart, Store, Truck, PackageCheck, Clock, Bell, X, Share2, Check, CheckSquare, Square, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/keranjang")({
  head: () => ({ meta: [{ title: "Keranjang — Marketplace" }] }),
  component: CartPage,
});

type SuggestedProduct = { id: string; name: string; price: number; image_url: string | null; shop_id: string; slug: string; shop_slug: string };

function CartUpsellCard({ product, onAdded }: { product: SuggestedProduct; onAdded: () => void }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded]   = useState(false);

  const handleAdd = async () => {
    setAdding(true);
    try {
      await addToCart({ shop_id: product.shop_id, product_id: product.id, unit_price: product.price, quantity: 1 });
      setAdded(true);
      toast.success(`${product.name} ditambahkan!`);
      setTimeout(() => { setAdded(false); onAdded(); }, 1500);
    } catch {
      toast.error("Gagal menambahkan ke keranjang");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <Link to="/toko/$slug/produk/$productId" params={{ slug: product.shop_slug, productId: product.id }}>
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted/40">
          {product.image_url
            ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
            : <div className="flex h-full w-full items-center justify-center"><Store className="h-5 w-5 text-muted-foreground" /></div>
          }
        </div>
      </Link>
      <div className="min-w-0 flex-1">
        <Link to="/toko/$slug/produk/$productId" params={{ slug: product.shop_slug, productId: product.id }}>
          <p className="text-xs font-medium line-clamp-2 hover:text-primary transition-colors">{product.name}</p>
        </Link>
        <p className="mt-0.5 text-xs font-bold text-primary">Rp {Number(product.price).toLocaleString("id-ID")}</p>
      </div>
      <Button
        size="sm"
        variant={added ? "default" : "outline"}
        className={`shrink-0 gap-1.5 text-xs h-8 ${added ? "bg-emerald-500 border-emerald-500 hover:bg-emerald-600" : ""}`}
        onClick={handleAdd}
        disabled={adding}
      >
        {adding
          ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          : added
            ? <><Check className="h-3.5 w-3.5" /> Ditambahkan</>
            : <><Plus className="h-3.5 w-3.5" /> Tambah</>
        }
      </Button>
    </div>
  );
}

function CartUpsell({ cartItems }: { cartItems: CartItem[] }) {
  const [suggestions, setSuggestions] = useState<SuggestedProduct[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (cartItems.length === 0) return;
    const cartProductIds = cartItems.map(i => i.product_id).filter(Boolean);
    const cartProductIdsSet = new Set(cartProductIds);

    (async () => {
      try {
        const { data: refs } = await supabase
          .from("order_items" as any)
          .select("order_id")
          .in("menu_item_id" as any, cartProductIds)
          .limit(200) as any;

        const orderIds: string[] = (refs ?? []).map((r: any) => r.order_id).filter(Boolean);
        if (orderIds.length === 0) return;

        const { data: coItems } = await supabase
          .from("order_items" as any)
          .select("menu_item_id")
          .in("order_id" as any, orderIds)
          .not("menu_item_id" as any, "is", null)
          .limit(500) as any;

        const freq = new Map<string, number>();
        for (const item of (coItems ?? []) as any[]) {
          if (item.menu_item_id && !cartProductIdsSet.has(item.menu_item_id)) {
            freq.set(item.menu_item_id, (freq.get(item.menu_item_id) ?? 0) + 1);
          }
        }

        const topIds = [...freq.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([id]) => id);

        if (topIds.length < 2) return;

        const { data: products } = await supabase
          .from("menu_items")
          .select("id, name, price, image_url, shop_id, slug, shops(slug)")
          .in("id", topIds)
          .eq("is_available" as any, true) as any;

        setSuggestions(
          ((products ?? []) as any[]).map((p: any) => ({
            ...p,
            shop_slug: p.shops?.slug ?? "",
          }))
        );
      } catch {
        // silent
      }
    })();
  }, [cartItems.length, refreshKey]);

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Sering Dibeli Bersama</h3>
      </div>
      <div className="space-y-2">
        {suggestions.map(p => (
          <CartUpsellCard key={p.id} product={p} onAdded={() => setRefreshKey(k => k + 1)} />
        ))}
      </div>
    </div>
  );
}

function DeliveryChip({ ds }: { ds: DeliverySettings }) {
  const win = ds.open_time && ds.close_time
    ? getDeliveryWindow(ds.open_time, ds.close_time)
    : null;
  const isOpen = win?.open ?? true;

  if (!ds.delivery_enabled && ds.pickup_enabled) {
    return (
      <div className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 border-b border-border text-xs text-blue-700">
        <PackageCheck className="h-3.5 w-3.5 shrink-0" />
        <span>Hanya ambil di toko (Pickup)</span>
      </div>
    );
  }
  if (!ds.delivery_enabled) return null;

  return (
    <div className={`flex items-center gap-1.5 px-4 py-1.5 border-b border-border text-xs ${isOpen ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
      {isOpen
        ? <Truck className="h-3.5 w-3.5 shrink-0" />
        : <Clock className="h-3.5 w-3.5 shrink-0" />
      }
      <span>
        {isOpen
          ? <>Delivery tersedia · estimasi <strong>~{formatEta(ds.min_eta_minutes, ds.max_eta_minutes)}</strong>{win?.closesAt ? ` · tutup pukul ${formatTime(win.closesAt)}` : ""}</>
          : <>Delivery tutup saat ini{win?.opensAt ? ` · buka pukul ${formatTime(win.opensAt)}` : ""}</>
        }
      </span>
      {ds.pickup_enabled && isOpen && (
        <span className="ml-auto flex items-center gap-1 shrink-0">
          <PackageCheck className="h-3 w-3" /> Pickup tersedia
        </span>
      )}
    </div>
  );
}

function CartPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliveryMap, setDeliveryMap] = useState<Record<string, DeliverySettings>>({});
  const [showAbandonedBanner, setShowAbandonedBanner] = useState(false);
  const [cartShared, setCartShared] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const refresh = async () => {
    try {
      const data = await listCart();
      setItems(data);
      setSelectedIds(new Set(data.map(i => i.id)));
      if (data.length > 0) {
        const shopIds = Array.from(new Set(data.map((i) => i.shop_id)));
        const dsArr = await listShopDeliverySettings(shopIds);
        const map: Record<string, DeliverySettings> = {};
        for (const ds of dsArr) map[ds.shop_id] = ds;
        setDeliveryMap(map);
        const lastTs = getLastCartActivity();
        if (lastTs && Date.now() - lastTs > 30 * 60 * 1000) {
          setShowAbandonedBanner(true);
        }
        markCartActivity();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    refresh();
  }, [user, authLoading]);

  const grouped = items.reduce<Record<string, CartItem[]>>((acc, it) => {
    (acc[it.shop_id] ||= []).push(it);
    return acc;
  }, {});

  const selectedItems = items.filter(it => selectedIds.has(it.id));
  const total = selectedItems.reduce((s, it) => s + Number(it.unit_price) * it.quantity, 0);
  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map(i => i.id)));
  };

  const toggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setQty = async (id: string, qty: number) => {
    const cur = items.find((i) => i.id === id);
    const meta = cur ? { shop_id: cur.shop_id, prevQuantity: Number(cur.quantity ?? 0) } : undefined;
    if (qty <= 0) {
      await removeCartItem(id, meta);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    } else {
      await updateCartItem(id, qty, meta);
    }
    refresh();
  };

  const goCheckout = () => {
    if (selectedIds.size === 0) {
      toast.error("Pilih setidaknya 1 item untuk checkout.");
      return;
    }
    sessionStorage.setItem("checkout_selected_ids", JSON.stringify([...selectedIds]));
    navigate({ to: "/checkout" });
  };

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Keranjang</h1>

        {showAbandonedBanner && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">Keranjangmu menunggu!</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Kamu punya {items.length} item yang belum di-checkout. Selesaikan pembelianmu sekarang sebelum stok habis.
              </p>
            </div>
            <button
              onClick={() => setShowAbandonedBanner(false)}
              className="shrink-0 text-amber-500 hover:text-amber-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="mt-6 text-sm text-muted-foreground">Memuat…</div>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
            <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Keranjangmu masih kosong.</p>
            <Link to="/" className="mt-4 inline-block">
              <Button>Mulai belanja</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {/* Select All */}
              <div className="flex items-center gap-2 px-1">
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  {allSelected
                    ? <CheckSquare className="h-4.5 w-4.5 text-primary" />
                    : someSelected
                      ? <CheckSquare className="h-4.5 w-4.5 text-primary/50" />
                      : <Square className="h-4.5 w-4.5 text-muted-foreground" />
                  }
                  {allSelected ? "Batal Pilih Semua" : "Pilih Semua"}
                </button>
                {selectedIds.size > 0 && selectedIds.size < items.length && (
                  <span className="text-xs text-muted-foreground">({selectedIds.size} dari {items.length} terpilih)</span>
                )}
              </div>

              {Object.entries(grouped).map(([shopId, shopItems]) => {
                const shop = shopItems[0].shop!;
                const ds = deliveryMap[shopId];
                const selectedShopItems = shopItems.filter(it => selectedIds.has(it.id));
                const shopSubtotal = selectedShopItems.reduce(
                  (s, i) => s + Number(i.unit_price) * i.quantity,
                  0,
                );
                return (
                  <div key={shopId} className="rounded-xl border border-border bg-card overflow-hidden">
                    <Link
                      to="/toko/$slug"
                      params={{ slug: shop.slug }}
                      className="flex items-center gap-3 border-b border-border px-4 py-3 hover:bg-muted/40"
                    >
                      {shop.logo_url ? (
                        <img src={shop.logo_url} alt={shop.name} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Store className="h-4 w-4" />
                        </div>
                      )}
                      <span className="text-sm font-semibold">{shop.name}</span>
                    </Link>

                    {ds && <DeliveryChip ds={ds} />}

                    <ul className="divide-y divide-border">
                      {shopItems.map((it) => {
                        const isSelected = selectedIds.has(it.id);
                        return (
                          <li key={it.id} className={`flex items-center gap-3 p-4 transition-colors ${isSelected ? "" : "opacity-60 bg-muted/20"}`}>
                            <button
                              onClick={() => toggleItem(it.id)}
                              className="shrink-0 text-primary"
                              aria-label={isSelected ? "Batalkan pilihan" : "Pilih item"}
                            >
                              {isSelected
                                ? <CheckSquare className="h-5 w-5" />
                                : <Square className="h-5 w-5 text-muted-foreground" />
                              }
                            </button>
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted/40">
                              {it.product?.image_url ? (
                                <img src={it.product.image_url} alt={it.product.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                  <Store className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="line-clamp-2 text-sm font-medium">{it.product?.name}</div>
                              <div className="mt-0.5 text-sm font-semibold text-primary">
                                Rp {Number(it.unit_price).toLocaleString("id-ID")}
                              </div>
                            </div>
                            <div className="flex items-center rounded-lg border border-border">
                              <button
                                className="flex h-8 w-8 items-center justify-center text-muted-foreground"
                                onClick={() => setQty(it.id, it.quantity - 1)}
                                aria-label="Kurangi"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-9 text-center text-sm font-medium">{it.quantity}</span>
                              <button
                                className="flex h-8 w-8 items-center justify-center text-muted-foreground"
                                onClick={() => setQty(it.id, it.quantity + 1)}
                                aria-label="Tambah"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <button
                              onClick={() => setQty(it.id, 0)}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="border-t border-border bg-muted/20 px-4 py-2 text-right text-xs text-muted-foreground">
                      Subtotal terpilih: <span className="font-semibold text-foreground">Rp {shopSubtotal.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cart upsell — items frequently bought alongside what's in cart */}
            <CartUpsell cartItems={items} />

            <aside className="h-fit rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold">Ringkasan</h3>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Item terpilih ({selectedIds.size}/{items.length})
                  </span>
                  <span>Rp {total.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Ongkir</span>
                  <span>Dihitung saat checkout</span>
                </div>
              </div>
              <div className="mt-4 flex justify-between border-t border-border pt-3 text-base font-bold">
                <span>Total</span>
                <span className="text-primary">Rp {total.toLocaleString("id-ID")}</span>
              </div>
              <Button
                size="lg"
                className="mt-5 w-full"
                disabled={selectedIds.size === 0}
                onClick={goCheckout}
              >
                {selectedIds.size === 0
                  ? "Pilih item untuk checkout"
                  : selectedIds.size === items.length
                    ? "Lanjut ke Checkout"
                    : `Checkout ${selectedIds.size} item terpilih`
                }
              </Button>
              <button
                type="button"
                onClick={async () => {
                  const itemSummary = selectedItems
                    .map(i => `• ${i.quantity}× ${i.product?.name ?? "Produk"} (Rp ${Number(i.unit_price).toLocaleString("id-ID")})`)
                    .join("\n");
                  const totalFmt = `Rp ${total.toLocaleString("id-ID")}`;
                  const msg = `🛒 *Keranjang Belanjaanku di UMKMgo*\n\n${itemSummary}\n\n*Total: ${totalFmt}*\n\nTambahkan ke keranjangmu juga: ${window.location.origin}/keranjang`;
                  if (navigator.share) {
                    try { await navigator.share({ title: "Keranjang UMKMgo", text: msg }); return; } catch {}
                  }
                  await navigator.clipboard.writeText(msg);
                  setCartShared(true);
                  toast.success("Link keranjang disalin!");
                  setTimeout(() => setCartShared(false), 2500);
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                {cartShared
                  ? <><Check className="h-3.5 w-3.5 text-green-500" /> Disalin!</>
                  : <><Share2 className="h-3.5 w-3.5" /> Bagikan Keranjang</>
                }
              </button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Pesanan akan dipisah per toko.
              </p>
            </aside>
          </div>
        )}
      </div>
      <MarketplaceFooter />
    </div>
  );
}
