import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Jumlah pesan dari pembeli yang belum dibaca penjual untuk satu toko.
 * Realtime: refresh saat ada INSERT/UPDATE pada shop_chat_messages toko ini.
 */
export function useUnreadChatCount(shopId: string | null | undefined) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!shopId) { setCount(0); return; }
    const { count: c } = await (supabase as any)
      .from("shop_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId)
      .eq("sender_role", "buyer")
      .is("read_at", null);
    setCount(c ?? 0);
  }, [shopId]);

  useEffect(() => {
    if (!shopId) { setCount(0); return; }
    load();
    const ch = supabase
      .channel(`chat-unread-${shopId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shop_chat_messages", filter: `shop_id=eq.${shopId}` },
        () => { load(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shopId, load]);

  return count;
}
