import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUnansweredQACount(shopId: string | null | undefined) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!shopId) { setCount(0); return; }
    const { count: c } = await supabase
      .from("product_qa")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId)
      .is("answer", null)
      .eq("is_hidden", false);
    setCount(c ?? 0);
  }, [shopId]);

  useEffect(() => {
    if (!shopId) { setCount(0); return; }
    load();
    const ch = supabase
      .channel(`qa-count-${shopId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_qa", filter: `shop_id=eq.${shopId}` },
        () => { load(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shopId, load]);

  return count;
}
