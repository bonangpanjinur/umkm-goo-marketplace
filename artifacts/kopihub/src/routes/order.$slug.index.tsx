import { createFileRoute, Link, useParams, getRouteApi } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { addToCart } from "@/lib/customer-cart";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Coffee, ScanQrCode } from "lucide-react";

export const Route = createFileRoute("/order/$slug/")({
  component: DineInMenuPage,
});

const parentRoute = getRouteApi("/order/$slug");

type Cat = { id: string; name: string };
type Item = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  is_available: boolean;
};

function DineInMenuPage() {
  const { slug } = useParams({ from: "/order/$slug/" });
  const { table, tableName } = parentRoute.useSearch();
  const { shop } = parentRoute.useLoaderData();
  const cartKey = `dine:${slug}:${table}`;

  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeCat, setActiveCat] = useState("all");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (!shop) return;
    (async () => {
      const [{ data: c }, { data: m }] = await Promise.all([
        supabase
          .from("categories")
          .select("id,name")
          .eq("shop_id", shop.id)
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("menu_items")
          .select("id,name,description,price,image_url,category_id,is_available")
          .eq("shop_id", shop.id)
          .eq("is_available", true)
          .order("sort_order"),
      ]);
      setCats(c ?? []);
      setItems((m ?? []) as Item[]);
    })();
  }, [shop]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (activeCat !== "all" && i.category_id !== activeCat) return false;
      if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, activeCat, q]);

  function handleAdd(item: Item) {
    setAdding(item.id);
    addToCart(cartKey, {
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
    });
    toast.success(`${item.name} ditambahkan ke pesanan`);
    setTimeout(() => setAdding(null), 600);
  }

  const displayTableName = tableName || (table ? `Meja ${table}` : "");

  return (
    <div className="space-y-4">
      {/* Dine-in info card */}
      {table && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-3 flex items-start gap-3">
          <ScanQrCode className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              Kamu memesan dari <strong>{displayTableName}</strong>
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
              Pilih menu di bawah → Tambahkan ke keranjang → Pesan & bayar langsung di sini
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari menu..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category Pills */}
      {cats.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveCat("all")}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeCat === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Semua
          </button>
          {cats.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeCat === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Menu Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Coffee className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">
            {q ? `Tidak ada menu yang cocok dengan "${q}"` : "Menu belum tersedia"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card overflow-hidden flex flex-col"
            >
              {/* Image */}
              <div className="aspect-square bg-muted relative">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Coffee className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2.5 flex flex-col flex-1">
                <p className="text-xs font-semibold leading-tight line-clamp-2">{item.name}</p>
                {item.description && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-auto pt-2 gap-1">
                  <span className="text-xs font-bold text-primary">
                    {formatIDR(item.price)}
                  </span>
                  <button
                    onClick={() => handleAdd(item)}
                    disabled={adding === item.id}
                    className={`flex items-center justify-center h-7 w-7 rounded-full transition-all ${
                      adding === item.id
                        ? "bg-green-500 text-white scale-110"
                        : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur p-3 sm:hidden">
        <div className="max-w-2xl mx-auto">
          <Link
            to="/order/$slug/cart"
            params={{ slug }}
            search={{ table, tableName }}
          >
            <Button className="w-full" size="lg">
              Lihat Keranjang & Pesan
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
