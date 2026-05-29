import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Trash2, ShoppingCart, ExternalLink, Loader2 } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/akun/riwayat")({
  head: () => ({ meta: [{ title: "Riwayat Pesanan — UMKMgo" }] }), component: RiwayatPage });

type ViewedProduct = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  shop_slug: string | null;
  shop_name: string | null;
  viewed_at: number; // unix timestamp
};

const STORAGE_KEY = "viewed_products";
const MAX_ITEMS = 50;

export function recordProductView(product: { id: string; name: string; price: number; image_url: string | null; is_available: boolean; shop_slug?: string | null; shop_name?: string | null }) {
  try {
    const existing: ViewedProduct[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    const filtered = existing.filter(p => p.id !== product.id);
    const updated = [{ ...product, viewed_at: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export default function RiwayatPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ViewedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriched, setEnriched] = useState<ViewedProduct[]>([]);

  function loadFromStorage() {
    try {
      const raw: ViewedProduct[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      setItems(raw);
    } catch { setItems([]); }
    setLoading(false);
  }

  async function enrich(raw: ViewedProduct[]) {
    if (raw.length === 0) { setEnriched([]); return; }
    const ids = raw.map(r => r.id);
    const { data } = await supabase
      .from("menu_items")
      .select("id, name, price, image_url, is_available, shops(slug, name)")
      .in("id", ids);
    if (!data) { setEnriched(raw); return; }
    const map = Object.fromEntries(data.map((d: any) => [d.id, d]));
    const merged = raw.map(r => {
      const fresh = map[r.id];
      if (!fresh) return r;
      return {
        ...r,
        name: fresh.name ?? r.name,
        price: fresh.price ?? r.price,
        image_url: fresh.image_url ?? r.image_url,
        is_available: fresh.is_available ?? r.is_available,
        shop_slug: fresh.shops?.slug ?? r.shop_slug,
        shop_name: fresh.shops?.name ?? r.shop_name,
      };
    });
    setEnriched(merged);
  }

  useEffect(() => { loadFromStorage(); }, []);
  useEffect(() => { if (!loading) enrich(items); }, [items, loading]);

  function removeItem(id: string) {
    const updated = items.filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setItems(updated);
    toast.success("Dihapus dari riwayat");
  }

  function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    setItems([]);
    setEnriched([]);
    toast.success("Riwayat dibersihkan");
  }

  function timeAgo(ts: number) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return `${days} hari lalu`;
  }

  const display = enriched.length > 0 ? enriched : items;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Baru Kamu Lihat
          </h1>
          <p className="text-sm text-muted-foreground">{display.length} produk yang pernah kamu buka</p>
        </div>
        {display.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearAll}>
            <Trash2 className="h-4 w-4 mr-1.5" /> Hapus Semua
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : display.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Belum ada riwayat</p>
          <p className="text-sm mt-1">Produk yang kamu buka akan muncul di sini</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/">Mulai Belanja</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {display.map(item => (
            <Card key={item.id} className="flex items-center gap-4 p-3">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.name}</p>
                {item.shop_name && (
                  <p className="text-xs text-muted-foreground truncate">{item.shop_name}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold text-primary">{formatIDR(item.price)}</span>
                  {!item.is_available && <Badge variant="secondary" className="text-xs">Habis</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(item.viewed_at)}</p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                {item.shop_slug && (
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                    <Link to="/toko/$slug/produk/$productId" params={{ slug: item.shop_slug, productId: item.id }}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> Lihat
                    </Link>
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!user && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Masuk ke akun</strong> untuk menyimpan riwayat di semua perangkat. Saat ini riwayat hanya tersimpan di browser ini.
          </p>
        </Card>
      )}
    </div>
  );
}
