import { createFileRoute, Link, useParams, useNavigate, getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  readCart,
  setQty,
  removeItem,
  cartTotal,
  itemUnitPrice,
  type CustomerCartItem,
} from "@/lib/customer-cart";
import { formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2, ShoppingBag, ChevronLeft, ScanQrCode } from "lucide-react";

export const Route = createFileRoute("/order/$slug/cart")({
  head: () => ({ meta: [{ title: "Keranjang — UMKMgo" }] }),
  component: DineInCartPage,
});

const parentRoute = getRouteApi("/order/$slug");

function DineInCartPage() {
  const { slug } = useParams({ from: "/order/$slug/cart" });
  const { table, tableName } = parentRoute.useSearch();
  const navigate = useNavigate();
  const cartKey = `dine:${slug}:${table}`;
  const [items, setItems] = useState<CustomerCartItem[]>([]);

  useEffect(() => {
    setItems(readCart(cartKey));
    const handler = () => setItems(readCart(cartKey));
    window.addEventListener("umkmgo-cart-change", handler);
    return () => window.removeEventListener("umkmgo-cart-change", handler);
  }, [cartKey]);

  const total = cartTotal(items);
  const displayTableName = tableName || (table ? `Meja ${table}` : "");

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShoppingBag className="mb-3 h-12 w-12 text-muted-foreground" />
        <p className="font-medium">Keranjang kosong</p>
        <p className="text-sm text-muted-foreground mt-1">Belum ada menu yang dipilih</p>
        <Link
          to="/order/$slug"
          params={{ slug }}
          search={{ table, tableName }}
          className="mt-4"
        >
          <Button>Lihat Menu</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-36">
      <div className="flex items-center gap-2">
        <Link to="/order/$slug" params={{ slug }} search={{ table, tableName }}>
          <Button variant="ghost" size="sm" className="gap-1 -ml-2">
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Pesanan Kamu</h1>
      </div>

      {/* Table info */}
      {table && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 px-3 py-2">
          <ScanQrCode className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-800 dark:text-green-300 font-medium">
            {displayTableName}
          </p>
        </div>
      )}

      {/* Items */}
      <div className="space-y-2">
        {items.map((item) => {
          const unit = itemUnitPrice(item);
          return (
            <div
              key={item.menu_item_id}
              className="flex gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-tight">{item.name}</p>
                  <button
                    onClick={() => {
                      removeItem(cartKey, item.menu_item_id);
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{formatIDR(unit)} / pcs</p>
                <div className="flex items-center gap-2 mt-auto">
                  <div className="flex items-center rounded-full border border-border overflow-hidden">
                    <button
                      onClick={() => setQty(cartKey, item.menu_item_id, item.qty - 1)}
                      className="flex h-7 w-7 items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-3 text-sm font-semibold">{item.qty}</span>
                    <button
                      onClick={() => setQty(cartKey, item.menu_item_id, item.qty + 1)}
                      className="flex h-7 w-7 items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="ml-auto text-sm font-bold text-primary">
                    {formatIDR(unit * item.qty)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{items.length} item</span>
          <span className="font-bold text-base">{formatIDR(total)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Belum termasuk pajak/biaya layanan jika ada
        </p>
      </div>

      {/* Checkout button */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur p-4">
        <div className="max-w-2xl mx-auto space-y-2">
          <div className="flex items-center justify-between text-sm font-semibold px-1">
            <span>Total</span>
            <span className="text-primary">{formatIDR(total)}</span>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={() =>
              navigate({
                to: "/order/$slug/checkout",
                params: { slug },
                search: { table, tableName },
              })
            }
          >
            Lanjut ke Pembayaran
          </Button>
        </div>
      </div>
    </div>
  );
}
