import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LowStockIngredient = {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  category: string | null;
  stock_status: "critical" | "empty";
};

export function useLowStockIngredients(shopId: string | null | undefined) {
  const [items, setItems] = useState<LowStockIngredient[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!shopId) { setItems([]); return; }
    setLoading(true);

    const { data: raw } = await supabase
      .from("ingredients")
      .select("id, name, unit, current_stock, min_stock, category")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("current_stock");

    const filtered: LowStockIngredient[] = (raw ?? [])
      .filter(
        (i: any) =>
          i.current_stock <= 0 ||
          (i.min_stock > 0 && i.current_stock <= i.min_stock),
      )
      .map((i: any) => ({
        ...i,
        stock_status: (i.current_stock <= 0 ? "empty" : "critical") as "empty" | "critical",
      }));

    setItems(filtered);
    setLoading(false);
  }, [shopId]);

  useEffect(() => {
    if (!shopId) { setItems([]); return; }
    load();

    const ch = supabase
      .channel(`low-stock-${shopId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ingredients",
          filter: `shop_id=eq.${shopId}`,
        },
        () => { load(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [shopId, load]);

  const criticalCount = items.length;
  const emptyCount = items.filter((i) => i.stock_status === "empty").length;

  return { items, loading, criticalCount, emptyCount, refresh: load };
}
