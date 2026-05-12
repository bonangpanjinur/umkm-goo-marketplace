import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ForecastEntry = {
  ingredient_id: string;
  sold_7d: number;
  avg_daily_use: number;
  days_remaining: number | null;
};

/**
 * Queries stock_movements for the last 7 days (type='sale') per shop,
 * then computes daily average and estimated days until depletion for
 * each ingredient based on current_stock.
 *
 * Returns a map keyed by ingredient_id.
 * Uses a stable string key derived from ingredient ids+stocks to avoid
 * infinite re-render from new array references.
 */
export function useStockForecast(
  shopId: string | null | undefined,
  ingredients: Array<{ id: string; current_stock: number }>,
) {
  const [data, setData] = useState<Record<string, ForecastEntry>>({});
  const [loading, setLoading] = useState(false);

  // Derive a stable key so we only re-fetch when shopId or ingredient data actually changes
  const stableKey = shopId
    ? `${shopId}|${ingredients.map((i) => `${i.id}:${i.current_stock}`).join(",")}`
    : "";

  // Keep a ref to the current ingredients so the async closure always has fresh data
  const ingredientsRef = useRef(ingredients);
  ingredientsRef.current = ingredients;

  useEffect(() => {
    if (!shopId || ingredients.length === 0) {
      setData({});
      return;
    }

    let cancelled = false;
    setLoading(true);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    supabase
      .from("stock_movements")
      .select("ingredient_id, quantity")
      .eq("shop_id", shopId)
      .eq("type", "sale")
      .gte("created_at", sevenDaysAgo)
      .then(({ data: movements }) => {
        if (cancelled) return;

        // Sum sold quantities per ingredient in the last 7 days
        const soldMap: Record<string, number> = {};
        for (const m of movements ?? []) {
          soldMap[m.ingredient_id] = (soldMap[m.ingredient_id] ?? 0) + Number(m.quantity);
        }

        // Build forecast per ingredient using latest ref
        const result: Record<string, ForecastEntry> = {};
        for (const ing of ingredientsRef.current) {
          const sold7d = soldMap[ing.id] ?? 0;
          const avgDailyUse = sold7d / 7;
          const daysRemaining = avgDailyUse > 0 ? ing.current_stock / avgDailyUse : null;
          result[ing.id] = {
            ingredient_id: ing.id,
            sold_7d: sold7d,
            avg_daily_use: avgDailyUse,
            days_remaining: daysRemaining,
          };
        }

        setData(result);
        setLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKey]);

  return { data, loading };
}

/** Helper: format days_remaining as a human label */
export function formatDaysRemaining(days: number | null): {
  label: string;
  urgency: "empty" | "critical" | "warning" | "ok" | "unknown";
} {
  if (days === null) return { label: "—", urgency: "unknown" };
  if (days <= 0) return { label: "Habis", urgency: "empty" };
  const rounded = Math.round(days);
  if (rounded <= 2) return { label: `~${rounded} hari`, urgency: "critical" };
  if (rounded <= 7) return { label: `~${rounded} hari`, urgency: "warning" };
  return { label: `~${rounded} hari`, urgency: "ok" };
}
