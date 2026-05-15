import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Loader2, Trash2, ExternalLink, RefreshCw, User } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { cartCount, cartTotal, type CartItem } from "@/lib/cart";
import { listParkedCarts, deleteParkedCart, type ParkedCart } from "@/lib/parked-carts";

export const Route = createFileRoute("/pos-app/open-bills")({
  component: OpenBillsPage,
});

function OpenBillsPage() {
  const { outlet, loading: shopLoading } = useCurrentShop();
  const [bills, setBills] = useState<ParkedCart[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    if (!outlet) return;
    setRefreshing(true);
    try {
      const list = await listParkedCarts(outlet.id);
      setBills(list);
      // Fetch actor names
      const ids = Array.from(new Set(list.map((b) => b.created_by).filter(Boolean) as string[]));
      if (ids.length) {
        const { data } = await (supabase as any)
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        const map: Record<string, string> = {};
        (data ?? []).forEach((p: any) => {
          map[p.id] = p.full_name || p.email || p.id.slice(0, 8);
        });
        setActorNames(map);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Gagal memuat open bills");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!outlet) return;
    refresh();
    const channel = supabase
      .channel(`open_bills_page:${outlet.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parked_carts", filter: `outlet_id=eq.${outlet.id}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlet?.id]);

  const handleDelete = async (b: ParkedCart) => {
    if (!window.confirm(`Hapus open bill "${b.label}"?`)) return;
    try {
      await deleteParkedCart(b.id);
      toast.success("Open bill dihapus");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (shopLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!outlet) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center text-muted-foreground">
        Pilih outlet terlebih dahulu.
      </div>
    );
  }

  const totalBills = bills.length;
  const totalValue = bills.reduce((s, b) => s + cartTotal((b.items ?? []) as CartItem[]), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Open Bills
              <Badge variant="secondary" className="text-sm">{totalBills}</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Tagihan terbuka di {outlet.name} · live sync antar kasir
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link to="/pos-app/pos">
            <Button size="sm" className="gap-1.5">
              <ExternalLink className="h-4 w-4" /> Buka POS
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total bill aktif</div>
          <div className="text-2xl font-bold tabular-nums">{totalBills}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total nilai bill</div>
          <div className="text-2xl font-bold tabular-nums">{formatIDR(totalValue)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Sinkronisasi</div>
          <div className="text-sm font-medium text-emerald-600 mt-2">● Realtime aktif</div>
        </Card>
      </div>

      {bills.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Belum ada open bill di outlet ini.</p>
          <p className="text-xs mt-1">Bill akan muncul real-time saat kasir menekan tombol Park di POS.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {bills.map((b) => {
            const items = (b.items ?? []) as CartItem[];
            const count = cartCount(items);
            const total = cartTotal(items);
            const actor = b.created_by ? actorNames[b.created_by] : null;
            return (
              <Card key={b.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{b.label}</h3>
                      <Badge variant="outline" className="text-xs">{count} item</Badge>
                      <Badge variant="secondary" className="text-xs tabular-nums">{formatIDR(total)}</Badge>
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground flex flex-wrap gap-3">
                      <span>Dibuat {new Date(b.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      {actor && (
                        <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {actor}</span>
                      )}
                    </div>
                    {items.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                        {items.map((it) => `${it.quantity}× ${it.name}`).join(" · ")}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Link to="/pos-app/pos">
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5" /> Buka di POS
                      </Button>
                    </Link>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(b)}
                      aria-label="Hapus bill"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}