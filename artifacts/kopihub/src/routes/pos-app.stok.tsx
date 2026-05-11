import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/use-shop";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  RefreshCw,
  Search,
  ShoppingCart,
  Monitor,
  Globe,
  Layers,
  Save,
} from "lucide-react";

export const Route = createFileRoute("/pos-app/stok")({ component: StokTerpadu });

type StokItem = {
  id: string;
  name: string;
  stock_qty: number | null;
  low_stock_threshold: number | null;
  auto_disable_on_empty: boolean | null;
  is_available: boolean | null;
  category?: string | null;
  pos_sold_today: number;
  marketplace_sold_today: number;
  online_sold_today: number;
};

function StokTerpadu() {
  const { shop } = useShop();
  const [items, setItems] = useState<StokItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "empty">("all");
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shop?.id) return;
    setLoading(true);
    try {
      const { data: products, error } = await supabase
        .from("menu_items")
        .select("id, name, stock_qty, low_stock_threshold, auto_disable_on_empty, is_available, category")
        .eq("shop_id", shop.id)
        .order("name");
      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: orderItems } = await supabase
        .from("order_items" as any)
        .select("product_id, quantity, orders!inner(channel, created_at, shop_id)")
        .eq("orders.shop_id" as any, shop.id)
        .gte("orders.created_at" as any, today.toISOString()) as any;

      const salesByProduct: Record<string, { pos: number; marketplace: number; online: number }> = {};
      for (const oi of orderItems ?? []) {
        const pid = oi.product_id;
        const ch = oi.orders?.channel ?? "pos";
        if (!salesByProduct[pid]) salesByProduct[pid] = { pos: 0, marketplace: 0, online: 0 };
        if (ch === "pos") salesByProduct[pid].pos += oi.quantity;
        else if (ch === "marketplace") salesByProduct[pid].marketplace += oi.quantity;
        else salesByProduct[pid].online += oi.quantity;
      }

      const enriched: StokItem[] = (products ?? []).map((p: any) => ({
        ...p,
        pos_sold_today: salesByProduct[p.id]?.pos ?? 0,
        marketplace_sold_today: salesByProduct[p.id]?.marketplace ?? 0,
        online_sold_today: salesByProduct[p.id]?.online ?? 0,
      }));
      setItems(enriched);
    } finally {
      setLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => { load(); }, [load]);

  const saveItem = async (item: StokItem) => {
    setSaving(item.id);
    const { error } = await supabase
      .from("menu_items")
      .update({
        stock_qty: item.stock_qty,
        low_stock_threshold: item.low_stock_threshold,
        auto_disable_on_empty: item.auto_disable_on_empty,
        is_available: item.is_available,
      })
      .eq("id", item.id);
    setSaving(null);
    if (error) toast.error(error.message);
    else toast.success(`Stok "${item.name}" tersimpan`);
  };

  const updateLocal = (id: string, patch: Partial<StokItem>) =>
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const filtered = items.filter((it) => {
    const matchSearch = it.name.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "empty") return (it.stock_qty ?? 0) === 0;
    if (filter === "low") {
      const threshold = it.low_stock_threshold ?? 5;
      return (it.stock_qty ?? 0) > 0 && (it.stock_qty ?? 0) <= threshold;
    }
    return true;
  });

  const lowCount = items.filter((it) => {
    const t = it.low_stock_threshold ?? 5;
    return (it.stock_qty ?? 0) > 0 && (it.stock_qty ?? 0) <= t;
  }).length;
  const emptyCount = items.filter((it) => (it.stock_qty ?? 0) === 0).length;

  const stockStatus = (item: StokItem) => {
    const qty = item.stock_qty ?? 0;
    if (qty === 0) return "empty";
    const t = item.low_stock_threshold ?? 5;
    if (qty <= t) return "low";
    return "ok";
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" /> Stok Terpadu
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Single source of truth — POS, Online, dan Marketplace berbagi stok yang sama
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <Package className="h-8 w-8 text-primary/70" />
          <div>
            <p className="text-2xl font-bold">{items.length}</p>
            <p className="text-xs text-muted-foreground">Total produk</p>
          </div>
        </Card>
        <Card
          className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${filter === "low" ? "border-amber-400 bg-amber-50" : "hover:border-amber-300"}`}
          onClick={() => setFilter(filter === "low" ? "all" : "low")}
        >
          <TrendingDown className="h-8 w-8 text-amber-500" />
          <div>
            <p className="text-2xl font-bold text-amber-700">{lowCount}</p>
            <p className="text-xs text-muted-foreground">Stok rendah</p>
          </div>
        </Card>
        <Card
          className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${filter === "empty" ? "border-red-400 bg-red-50" : "hover:border-red-300"}`}
          onClick={() => setFilter(filter === "empty" ? "all" : "empty")}
        >
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <div>
            <p className="text-2xl font-bold text-red-700">{emptyCount}</p>
            <p className="text-xs text-muted-foreground">Stok habis</p>
          </div>
        </Card>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari produk…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Semua
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Tidak ada produk ditemukan
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const status = stockStatus(item);
            return (
              <Card key={item.id} className={`p-4 ${status === "empty" ? "border-red-200 bg-red-50/30" : status === "low" ? "border-amber-200 bg-amber-50/30" : ""}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{item.name}</span>
                      {item.category && (
                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                      )}
                      {status === "empty" && (
                        <Badge variant="destructive" className="text-xs">Habis</Badge>
                      )}
                      {status === "low" && (
                        <Badge className="text-xs bg-amber-500 hover:bg-amber-500">Stok Rendah</Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Monitor className="h-3.5 w-3.5" />
                        POS hari ini: <strong className="text-foreground">{item.pos_sold_today}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" />
                        Online: <strong className="text-foreground">{item.online_sold_today}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Marketplace: <strong className="text-foreground">{item.marketplace_sold_today}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-4 shrink-0">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Stok saat ini</Label>
                      <Input
                        type="number"
                        min={0}
                        className="w-24 mt-1 h-8 text-sm font-semibold"
                        value={item.stock_qty ?? ""}
                        placeholder="∞"
                        onChange={(e) =>
                          updateLocal(item.id, {
                            stock_qty: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Ambang batas rendah</Label>
                      <Input
                        type="number"
                        min={0}
                        className="w-24 mt-1 h-8 text-sm"
                        value={item.low_stock_threshold ?? ""}
                        placeholder="5"
                        onChange={(e) =>
                          updateLocal(item.id, {
                            low_stock_threshold: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={item.auto_disable_on_empty ?? false}
                          onCheckedChange={(v) => updateLocal(item.id, { auto_disable_on_empty: v })}
                          className="scale-90"
                        />
                        <Label className="text-[11px]">Nonaktif jika habis</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={item.is_available ?? true}
                          onCheckedChange={(v) => updateLocal(item.id, { is_available: v })}
                          className="scale-90"
                        />
                        <Label className="text-[11px]">Tersedia</Label>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => saveItem(item)}
                      disabled={saving === item.id}
                    >
                      <Save className="h-3.5 w-3.5 mr-1" />
                      {saving === item.id ? "Menyimpan…" : "Simpan"}
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
