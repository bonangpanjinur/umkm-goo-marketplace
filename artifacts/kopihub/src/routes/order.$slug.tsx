import { createFileRoute, Outlet, useParams, notFound, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Coffee, ShoppingBag, ScanQrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readCart, cartCount } from "@/lib/customer-cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/order/$slug")({
  validateSearch: (search: Record<string, unknown>) => ({
    table: (search.table as string) || "",
    tableName: (search.tableName as string) || "",
  }),
  loader: async ({ params }) => {
    const { data: shop } = await supabase
      .from("coffee_shops")
      .select("id, name, slug, description, tagline, logo_url, phone, is_active")
      .eq("slug", params.slug)
      .maybeSingle();

    if (!shop || !shop.is_active) throw notFound();
    return { shop };
  },
  component: DineInLayout,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Toko tidak ditemukan</h1>
        <p className="text-muted-foreground mt-2 text-sm">QR code ini mungkin sudah tidak aktif.</p>
        <Link to="/" className="mt-4 inline-block">
          <Button>Kembali ke Beranda</Button>
        </Link>
      </div>
    </div>
  ),
});

function DineInLayout() {
  const { slug } = useParams({ from: "/order/$slug" });
  const { table, tableName } = Route.useSearch();
  const { shop } = Route.useLoaderData();
  const [cartCnt, setCartCnt] = useState(0);

  useEffect(() => {
    const key = `dine:${slug}:${table}`;
    const update = () => setCartCnt(cartCount(readCart(key)));
    update();
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.slug === key) update();
    };
    window.addEventListener("umkmgo-cart-change", handler);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("umkmgo-cart-change", handler);
      window.removeEventListener("storage", update);
    };
  }, [slug, table]);

  const displayTableName = tableName || `Meja ${table}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Dine-in Banner */}
      {table && (
        <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2">
          <ScanQrCode className="h-4 w-4 shrink-0" />
          <span>Memesan dari <strong>{displayTableName}</strong> — Pesanan akan langsung disiapkan</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-2 px-4">
          <Link
            to="/order/$slug"
            params={{ slug }}
            search={{ table, tableName }}
            className="flex items-center gap-2 min-w-0"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground overflow-hidden">
              {shop.logo_url ? (
                <img src={shop.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Coffee className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-tight">{shop.name}</div>
              {table && (
                <div className="text-[10px] text-muted-foreground leading-tight flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  {displayTableName}
                </div>
              )}
            </div>
          </Link>
          <Link
            to="/order/$slug/cart"
            params={{ slug }}
            search={{ table, tableName }}
          >
            <Button size="sm" className="relative gap-1.5">
              <ShoppingBag className="h-4 w-4" />
              <span>{cartCnt}</span>
              {cartCnt > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 pb-20">
        <Outlet />
      </main>
    </div>
  );
}
