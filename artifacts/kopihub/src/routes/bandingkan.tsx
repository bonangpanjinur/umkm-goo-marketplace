import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { X, Store, ShoppingCart, Scale, Star, Check, AlertTriangle } from "lucide-react";
import { getCompareList, removeFromCompare, clearCompare } from "@/lib/compare";
import { addToCart } from "@/lib/marketplace-cart";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/bandingkan")({
  head: () => ({ meta: [{ title: "Bandingkan Produk" }] }),
  component: BandingkanPage,
});

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  stock: number | null;
  track_stock: boolean;
  shop_id: string;
  dietary_tags: string[] | null;
  allergens: string[] | null;
  bpom_number: string | null;
  ingredients: string | null;
  shop: { name: string; slug: string } | null;
};

const ROWS: Array<{ key: keyof Product | "actions"; label: string }> = [
  { key: "price", label: "Harga" },
  { key: "rating_avg", label: "Rating" },
  { key: "stock", label: "Stok" },
  { key: "description", label: "Deskripsi" },
  { key: "dietary_tags", label: "Label" },
  { key: "allergens", label: "Alergen" },
  { key: "bpom_number", label: "BPOM" },
  { key: "actions", label: "" },
];

function BandingkanPage() {
  const [productIds, setProductIds] = useState<string[]>(getCompareList);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const refresh = () => setProductIds(getCompareList());

  useEffect(() => {
    if (productIds.length === 0) { setProducts([]); return; }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("id, name, description, price, image_url, rating_avg, rating_count, stock, track_stock, shop_id, dietary_tags, allergens, bpom_number, ingredients, shops(name, slug)")
        .in("id", productIds);

      const list = ((data ?? []) as any[]).map(p => ({
        ...p,
        shop: p.shops ?? null,
      }));
      const ordered = productIds
        .map(id => list.find((p: any) => p.id === id))
        .filter(Boolean) as Product[];
      setProducts(ordered);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIds.join(",")]);

  const remove = (id: string) => { removeFromCompare(id); refresh(); };
  const handleClear = () => { clearCompare(); refresh(); };

  const addCart = async (p: Product) => {
    if (!user) { toast.info("Masuk untuk berbelanja"); return; }
    try {
      await addToCart({ shop_id: p.shop_id, product_id: p.id, unit_price: p.price, quantity: 1 });
      toast.success(`${p.name} ditambahkan ke keranjang`);
    } catch (e: any) { toast.error(e.message ?? "Gagal"); }
  };

  const renderCell = (row: typeof ROWS[number], p: Product) => {
    switch (row.key) {
      case "price":
        return <span className="text-lg font-bold text-primary">Rp {Number(p.price).toLocaleString("id-ID")}</span>;
      case "rating_avg":
        return p.rating_avg
          ? <span className="font-semibold">★ {Number(p.rating_avg).toFixed(1)} <span className="text-xs text-muted-foreground">({p.rating_count})</span></span>
          : <span className="text-muted-foreground text-xs">Belum ada</span>;
      case "stock":
        return p.track_stock
          ? <span className={`text-sm font-medium ${Number(p.stock) > 0 ? "text-emerald-600" : "text-destructive"}`}>
              {Number(p.stock) > 0 ? `${p.stock} tersedia` : "Habis"}
            </span>
          : <span className="text-xs text-muted-foreground">Tidak dilacak</span>;
      case "description":
        return <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{p.description || "—"}</p>;
      case "dietary_tags":
        return p.dietary_tags?.length
          ? <div className="flex flex-wrap gap-1">{p.dietary_tags.map(t => <span key={t} className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{t}</span>)}</div>
          : <span className="text-xs text-muted-foreground">—</span>;
      case "allergens":
        return p.allergens?.length
          ? <div className="flex flex-wrap gap-1">{p.allergens.map(a => <span key={a} className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">⚠️ {a}</span>)}</div>
          : <span className="text-xs text-muted-foreground">—</span>;
      case "bpom_number":
        return p.bpom_number
          ? <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{p.bpom_number}</span>
          : <span className="text-xs text-muted-foreground">—</span>;
      case "actions":
        return (
          <div className="flex flex-col gap-2">
            <Button size="sm" className="w-full gap-1.5" onClick={() => addCart(p)}>
              <ShoppingCart className="h-3.5 w-3.5" /> Beli
            </Button>
            <Link to="/toko/$slug/produk/$productId" params={{ slug: p.shop?.slug ?? "", productId: p.id }}>
              <Button size="sm" variant="outline" className="w-full">Detail</Button>
            </Link>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Scale className="h-6 w-6 text-primary" /> Bandingkan Produk
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Bandingkan hingga 4 produk secara berdampingan</p>
          </div>
          {products.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClear}>Hapus Semua</Button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {productIds.map(id => <div key={id} className="h-64 rounded-xl bg-muted/40 animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-20 text-center">
            <Scale className="h-10 w-10 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold mb-2">Belum ada produk untuk dibandingkan</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Tambahkan produk dari halaman detail produk menggunakan tombol <strong>"Bandingkan"</strong>.
            </p>
            <Link to="/"><Button>Jelajahi Produk</Button></Link>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full border-collapse" style={{ minWidth: `${Math.max(480, products.length * 200 + 120)}px` }}>
              <thead>
                <tr>
                  <td className="w-28 p-2" />
                  {products.map(p => (
                    <td key={p.id} className="p-2 align-top">
                      <div className="relative rounded-xl border border-border bg-card overflow-hidden">
                        <button
                          onClick={() => remove(p.id)}
                          className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 shadow hover:bg-destructive/10 transition"
                          title="Hapus dari perbandingan"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <div className="aspect-[4/3] w-full bg-muted/40">
                          {p.image_url
                            ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                            : <div className="flex h-full w-full items-center justify-center"><Store className="h-8 w-8 text-muted-foreground" /></div>
                          }
                        </div>
                        <div className="p-3">
                          <p className="font-semibold text-sm leading-snug">{p.name}</p>
                          {p.shop && (
                            <Link to="/toko/$slug" params={{ slug: p.shop.slug }} className="text-[11px] text-muted-foreground hover:underline">
                              {p.shop.name}
                            </Link>
                          )}
                        </div>
                      </div>
                    </td>
                  ))}
                  {products.length < 4 && (
                    <td className="p-2 align-top">
                      <Link to="/">
                        <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground hover:border-primary/40 transition cursor-pointer">
                          <div>
                            <span className="text-2xl block mb-1">+</span>
                            Tambah produk
                          </div>
                        </div>
                      </Link>
                    </td>
                  )}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, idx) => (
                  <tr key={row.key} className={`border-t border-border ${idx % 2 === 0 ? "" : "bg-muted/20"}`}>
                    <td className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide align-middle whitespace-nowrap">
                      {row.label}
                    </td>
                    {products.map(p => (
                      <td key={p.id} className="p-3 align-middle text-center">
                        {renderCell(row, p)}
                      </td>
                    ))}
                    {products.length < 4 && <td />}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <MarketplaceFooter />
    </div>
  );
}
