import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Heart, HeartOff, ShoppingBag, RefreshCw, Loader2,
  Store, Pencil, Trash2, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/akun/favorit")({ component: FavoritPage });

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
};

type FavOrder = {
  id: string;
  order_no: string;
  total: number;
  created_at: string;
  shop: { name: string; slug: string; logo_url: string | null } | null;
  items: OrderItem[];
};

type Favorite = {
  orderId: string;
  name: string;
  savedAt: string;
};

const FAV_KEY = "umkmgo.favorit.orders";

function readFavs(): Favorite[] {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]"); } catch { return []; }
}
function writeFavs(favs: Favorite[]) {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
}
function isFav(orderId: string) {
  return readFavs().some(f => f.orderId === orderId);
}

function FavoritPage() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [orders, setOrders]     = useState<FavOrder[]>([]);
  const [favIds, setFavIds]     = useState<string[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<"favorit" | "semua">("favorit");

  // Name edit dialog
  const [editDialog, setEditDialog] = useState<{ orderId: string; name: string } | null>(null);
  const [editName, setEditName]     = useState("");

  // Reorder loading
  const [reordering, setReordering] = useState<string | null>(null);

  const syncFavIds = () => setFavIds(readFavs().map(f => f.orderId));

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    syncFavIds();
    const { data } = await supabase
      .from("orders")
      .select("id, order_no, total, created_at, shop:shops(name, slug, logo_url)")
      .eq("customer_user_id", user.id)
      .like("order_no", "MKT-%")
      .in("status", ["completed", "delivering"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data || data.length === 0) { setLoading(false); return; }

    // Load order items in batch
    const ids = data.map((o: any) => o.id);
    const { data: itemData } = await supabase
      .from("order_items")
      .select("id, order_id, name, quantity, unit_price")
      .in("order_id", ids);

    const itemMap: Record<string, OrderItem[]> = {};
    (itemData ?? []).forEach((it: any) => {
      if (!itemMap[it.order_id]) itemMap[it.order_id] = [];
      itemMap[it.order_id].push(it);
    });

    setOrders(data.map((o: any) => ({
      id:         o.id,
      order_no:   o.order_no,
      total:      o.total,
      created_at: o.created_at,
      shop:       o.shop ?? null,
      items:      itemMap[o.id] ?? [],
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  function toggleFav(order: FavOrder) {
    const favs = readFavs();
    const exists = favs.findIndex(f => f.orderId === order.id);
    if (exists >= 0) {
      writeFavs(favs.filter(f => f.orderId !== order.id));
      toast.success("Dihapus dari favorit");
    } else {
      const defaultName = order.shop?.name
        ? `${order.shop.name} — ${order.items.slice(0, 2).map(i => i.name).join(", ")}${order.items.length > 2 ? "..." : ""}`
        : order.order_no;
      writeFavs([...favs, { orderId: order.id, name: defaultName, savedAt: new Date().toISOString() }]);
      toast.success("Ditambahkan ke favorit!");
    }
    syncFavIds();
  }

  function openEdit(orderId: string) {
    const name = readFavs().find(f => f.orderId === orderId)?.name ?? "";
    setEditDialog({ orderId, name });
    setEditName(name);
  }

  function saveEditName() {
    if (!editDialog) return;
    const favs = readFavs().map(f =>
      f.orderId === editDialog.orderId ? { ...f, name: editName.trim() || f.name } : f
    );
    writeFavs(favs);
    setEditDialog(null);
    syncFavIds();
    toast.success("Nama favorit diperbarui");
  }

  async function reorder(order: FavOrder) {
    if (!order.shop?.slug || order.items.length === 0) {
      navigate({ to: "/", search: {} });
      return;
    }
    setReordering(order.id);
    try {
      // Write items to customer cart using the storefront slug as cart key
      const cartKey = `umkmgo.cart.${order.shop.slug}`;
      const cartItems = order.items.map(item => ({
        menu_item_id: item.id,
        name: item.name,
        price: item.unit_price,
        qty: item.quantity,
        image_url: null,
      }));
      localStorage.setItem(cartKey, JSON.stringify(cartItems));
      window.dispatchEvent(new CustomEvent("umkmgo-cart-change", { detail: { slug: cartKey } }));
      toast.success(`${order.items.length} item ditambahkan ke keranjang!`, {
        description: `Menuju toko ${order.shop.name}`,
      });
      // Navigate to storefront
      await navigate({ to: "/s/$slug" as any, params: { slug: order.shop.slug } as any });
    } catch {
      toast.error("Gagal re-order, coba lagi");
    }
    setReordering(null);
  }

  const favSet = new Set(favIds);
  const favOrders   = orders.filter(o => favSet.has(o.id));
  const allOrders   = orders;
  const displayed   = tab === "favorit" ? favOrders : allOrders;

  const favMeta: Record<string, Favorite> = Object.fromEntries(
    readFavs().map(f => [f.orderId, f])
  );

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-500 fill-rose-500" /> Pesanan Favorit
        </h1>
        <p className="text-sm text-muted-foreground">Simpan pesanan favoritmu — pesan ulang dengan 1 klik</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "favorit" as const, label: `Favorit (${favOrders.length})` },
          { key: "semua"   as const, label: `Semua Selesai (${allOrders.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {displayed.length === 0 ? (
        <Card className="p-10 text-center">
          {tab === "favorit" ? (
            <>
              <Heart className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="font-medium">Belum ada pesanan favorit</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Tandai pesanan selesai sebagai favorit untuk pesan ulang lebih mudah
              </p>
              <Button variant="outline" size="sm" onClick={() => setTab("semua")}>
                Lihat Riwayat Pesanan
              </Button>
            </>
          ) : (
            <>
              <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="font-medium">Belum ada pesanan selesai</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Pesanan selesai akan muncul di sini</p>
              <Link to="/">
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Mulai Belanja
                </Button>
              </Link>
            </>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {displayed.map(order => {
            const fav  = favMeta[order.id];
            const isFaved = favSet.has(order.id);
            return (
              <Card key={order.id} className={`p-4 space-y-3 transition-all ${isFaved ? "border-rose-200 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20" : ""}`}>
                {/* Header */}
                <div className="flex items-start gap-3">
                  {order.shop?.logo_url
                    ? <img src={order.shop.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover border border-border shrink-0" />
                    : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0"><Store className="h-5 w-5 text-muted-foreground" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    {isFaved && fav?.name ? (
                      <p className="font-semibold text-sm text-rose-700 dark:text-rose-400 truncate">{fav.name}</p>
                    ) : null}
                    <p className={`text-sm truncate ${isFaved && fav?.name ? "text-muted-foreground text-xs" : "font-semibold"}`}>
                      {order.shop?.name ?? "Toko"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.order_no} · {new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isFaved && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => openEdit(order.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-7 w-7 ${isFaved ? "text-rose-500 hover:text-rose-600" : "text-muted-foreground hover:text-rose-400"}`}
                      onClick={() => toggleFav(order)}
                    >
                      {isFaved ? <Heart className="h-4 w-4 fill-current" /> : <Heart className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Items */}
                {order.items.length > 0 && (
                  <div className="space-y-1 pl-13">
                    {order.items.slice(0, 3).map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{item.quantity}× {item.name}</span>
                        <span className="font-medium">{formatIDR(item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{order.items.length - 3} item lainnya</p>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="font-bold text-sm">{formatIDR(order.total)}</span>
                  <div className="flex gap-2">
                    {order.shop?.slug && (
                      <Link to={"/s/$slug" as any} params={{ slug: order.shop.slug } as any}>
                        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                          <Store className="h-3.5 w-3.5" /> Kunjungi Toko
                        </Button>
                      </Link>
                    )}
                    <Button
                      size="sm"
                      className="gap-1.5 h-8 text-xs"
                      onClick={() => reorder(order)}
                      disabled={reordering === order.id}
                    >
                      {reordering === order.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <RefreshCw className="h-3.5 w-3.5" />
                      }
                      Pesan Lagi
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit name dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ganti Nama Favorit</DialogTitle>
          </DialogHeader>
          <Input
            value={editName}
            onChange={e => setEditName(e.target.value)}
            placeholder="Mis. Kopi susu biasa + snack"
            maxLength={80}
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialog(null)}>Batal</Button>
            <Button onClick={saveEditName}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
