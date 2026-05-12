import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Admin hook — counts ad_requests with status="pending"
 * (paid by owner, waiting for admin review).
 * Updates in real-time via Supabase Postgres Changes.
 */
export function useAdminPendingAdCount(): number {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const { count: c, error } = await (supabase as any)
        .from("ad_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (!error) setCount(c ?? 0);
    } catch {
      // table may not exist yet — stay silent
    }
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel("admin-ad-pending-count")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "ad_requests" },
        () => { load(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return count;
}

/**
 * Owner hook — counts the owner's own ads with status="payment_pending"
 * (submitted but payment not yet completed — nudge them to pay).
 */
export function useOwnerPaymentPendingCount(shopId: string | null): number {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!shopId) return;
    try {
      const { count: c, error } = await (supabase as any)
        .from("ad_requests")
        .select("*", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .eq("status", "payment_pending");
      if (!error) setCount(c ?? 0);
    } catch {
      // table may not exist yet
    }
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    load();

    const channel = supabase
      .channel(`owner-ad-${shopId}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "ad_requests" },
        () => { load(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [shopId, load]);

  return count;
}
