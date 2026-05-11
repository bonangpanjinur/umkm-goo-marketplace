import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Heart, HeartOff, Store, ShoppingCart } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { addToCart } from "@/lib/marketplace-cart";

export const Route = createFileRoute("/akun/wishlist")({
  component: WishlistPage,
});

type WishlistItem = {
  id: string;
  menu_item_id: string;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    is_available: boolean;
    shop_id: string;
    shop: { slug: string; name: string } | null;
  } | null;
};

function WishlistPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("wishlists" as any)
      .select("id, menu_item_id, menu_item:menu_items(id, name, price, image_url, is_available, shop_id, shop:coffee_shops(slug, name))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.message.toLowerCase().includes("does not exist") || error.message.toLowerCase().includes("relation")) {
        setTableExists(false);
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }

    const mapped = ((data ?? []) as any[]).map((row) => ({
      id: row.id,
      menu_item_id: row.menu_item_id,
      product: row.menu_item ? {
        ...row.menu_item,
        shop: row.menu_item.shop ?? null,
      } : null,
    }));
    setItems(mapped);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user?.id]);

  const remove = async (wishlistId: string, productName: string) => {
    setRemoving(wishlistId);
    const { error } = await supabase.from("wishlists" as any).delete().eq("id", wishlistId);
    if (error) toast.error(error.message);
    else {
      toast.success(`${productName} dihapus dari wishlist`);
      setItems(prev => prev.filter(i => i.id !== wishlistId));
    }
    setRemoving(null);
  };

  const addCart = async (item: WishlistItem) => {
    if (!item.product || !user) return;
    try {
      await addToCart({ menuItemId: item.product.id, shopId: item.product.shop_id, qty: 1 });
      toast.success("Ditambahkan ke keranjang");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menambah ke keranjang");
    }
  };

  if (!tableExists) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        Fitur wishlist memerlukan migrasi database. Jalankan SQL dari file <code>sprint1_kyc_variants.sql</code>.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Wishlist Saya</h2>
        <span className="text-sm text-muted-foreground">{items.length} produk</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <HeartOff className="h-12 w-12 text-muted-foreground opacity-30" />
          <div>
            <p className="font-medium">Wishlist masih kosong</p>
            <p className="mt-1 text-sm text-muted-foreground">Tekan ikon ♡ pada produk yang Anda suka untuk menyimpannya di sini.</p>
          </div>
          <Button asChild variant="outline" className="mt-2">
            <Link to="/">Jelajahi Produk</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(item => {
            const p = item.product;
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <Link
                  to="/toko/$slug/produk/$productId"
                  params={{ slug: p?.shop?.slug ?? "", productId: item.menu_item_id }}
                  className="flex-shrink-0"
                >
                  {p?.image_url ? (
                    <img src={p.image_url} alt={p?.name} className="h-16 w-16 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted border border-border">
                      <Store className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to="/toko/$slug/produk/$productId"
                    params={{ slug: p?.shop?.slug ?? "", productId: item.menu_item_id }}
                  >
                    <p className="truncate text-sm font-medium hover:text-primary">{p?.name ?? "Produk dihapus"}</p>
                    <p className="text-xs text-muted-foreground">{p?.shop?.name ?? "—"}</p>
                  </Link>
                  <p className="mt-1 text-sm font-semibold text-primary">{p ? formatIDR(p.price) : "—"}</p>
                  {p && !p.is_available && (
                    <span className="text-xs text-destructive">Tidak tersedia</span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-600"
                    onClick={() => remove(item.id, p?.name ?? "Produk")}
                    disabled={removing === item.id}
                  >
                    {removing === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className="h-3.5 w-3.5 fill-current" />}
                  </Button>
                  {p?.is_available && (
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs px-2" onClick={() => addCart(item)}>
                      <ShoppingCart className="h-3 w-3" /> Tambah
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
