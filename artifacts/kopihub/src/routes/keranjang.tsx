import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { listCart, updateCartItem, removeCartItem, listShopDeliverySettings, getLastCartActivity, markCartActivity, type CartItem, type DeliverySettings } from "@/lib/marketplace-cart";
import { useAuth } from "@/lib/auth";
import { getDeliveryWindow, formatEta, formatTime } from "@/lib/delivery-eta";
import { Trash2, Plus, Minus, ShoppingCart, Store, Truck, PackageCheck, Clock, Bell, X, Share2, Check, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/keranjang")({
  head: () => ({ meta: [{ title: "Keranjang — Marketplace" }] }),
  component: CartPage,
});

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
    if (qty <= 0) {
      await removeCartItem(id);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    } else {
      await updateCartItem(id, qty);
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
