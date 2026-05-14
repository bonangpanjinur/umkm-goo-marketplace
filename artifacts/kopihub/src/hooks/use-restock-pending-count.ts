import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRestockPendingCount(shopId: string | null | undefined) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!shopId) { setCount(0); return; }
    try {
      const { count: c } = await (supabase as any)
        .from("restock_subscribers")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .is("notified_at", null);
      setCount(c ?? 0);
    } catch {
      setCount(0);
    }
  }, [shopId]);

  useEffect(() => {
    if (!shopId) { setCount(0); return; }
    load();
    const ch = (supabase as any)
      .channel(`restock-count-${shopId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restock_subscribers", filter: `shop_id=eq.${shopId}` },
        () => { load(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shopId, load]);

  return count;
}
