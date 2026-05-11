import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Heart, TrendingUp, Search, Loader2, Package } from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/wishlist-analytics")({ component: WishlistAnalyticsPage });

type WishlistProduct = {
  product_id: string;
  product_name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  wishlist_count: number;
};

export default function WishlistAnalyticsPage() {
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [shopId, setShopId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: shop } = await supabase
        .from("coffee_shops")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (shop) setShopId(shop.id);
    })();
  }, []);

  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    (async () => {
      const { data: items } = await supabase
        .from("menu_items")
        .select("id, name, price, image_url, is_available")
        .eq("shop_id", shopId)
        .eq("is_available", true);

      if (!items || items.length === 0) { setProducts([]); setLoading(false); return; }

      const { data: wishlistCounts } = await (supabase as any)
        .from("wishlists")
        .select("menu_item_id")
        .in("menu_item_id", items.map((i: any) => i.id));

      const countMap: Record<string, number> = {};
      for (const w of wishlistCounts ?? []) {
        countMap[(w as any).menu_item_id] = (countMap[(w as any).menu_item_id] ?? 0) + 1;
      }

      const merged = items
        .map((item: any) => ({
          product_id: item.id,
          product_name: item.name,
          price: Number(item.price),
          image_url: item.image_url,
          is_available: item.is_available,
          wishlist_count: countMap[item.id] ?? 0,
        }))
        .sort((a, b) => b.wishlist_count - a.wishlist_count);

      setProducts(merged);
      setLoading(false);
    })();
  }, [shopId]);

  const filtered = products.filter(p =>
    p.product_name.toLowerCase().includes(search.toLowerCase())
  );

  const total = products.reduce((s, p) => s + p.wishlist_count, 0);
  const topProduct = products[0];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-500" /> Analitik Wishlist Pembeli
        </h1>
        <p className="text-sm text-muted-foreground">Produk mana yang paling banyak disimpan pembeli</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Disimpan</p>
          <p className="text-2xl font-bold mt-1">{total}</p>
          <p className="text-xs text-muted-foreground mt-0.5">dari semua produk</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Produk Terfavorit</p>
          <p className="text-sm font-bold mt-1 truncate">{topProduct?.product_name ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{topProduct?.wishlist_count ?? 0}× disimpan</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Produk Diminati</p>
          <p className="text-2xl font-bold mt-1">{products.filter(p => p.wishlist_count > 0).length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">dari {products.length} produk</p>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Cari produk..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Belum ada data wishlist</p>
          <p className="text-sm mt-1">Data muncul saat pembeli menyimpan produkmu ke wishlist</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p, idx) => (
            <Card key={p.product_id} className="flex items-center gap-4 p-3">
              <div className="w-8 text-center font-bold text-muted-foreground text-sm shrink-0">
                {idx + 1}
              </div>
              {p.image_url ? (
                <img src={p.image_url} alt={p.product_name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{p.product_name}</p>
                <p className="text-xs text-muted-foreground">{formatIDR(p.price)}</p>
                {!p.is_available && <Badge variant="secondary" className="text-xs mt-0.5">Habis</Badge>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Heart className="h-4 w-4 text-pink-400" />
                <span className="font-bold text-sm">{p.wishlist_count}</span>
                {idx === 0 && p.wishlist_count > 0 && (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
