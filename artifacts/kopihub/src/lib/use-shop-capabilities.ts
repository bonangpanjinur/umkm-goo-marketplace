import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FeatureKey, FlowType } from "./feature-keys";

export type ShopCapabilities = {
  shopId: string;
  categorySlug: string | null;
  categoryName: string | null;
  subtype: string | null;
  flowTypes: FlowType[];
  features: Set<FeatureKey>;
  bookingType: "session" | "rental" | "both" | "none" | null;
};

type Row = {
  shop_id: string;
  category_slug: string | null;
  category_name: string | null;
  business_subtype: string | null;
  flow_types: string[] | null;
  enabled_features: string[] | null;
  booking_type: string | null;
};

/**
 * Hook utama untuk gating fitur. Membaca view `v_shop_capabilities`
 * (gabungan business_categories.enabled_features + shops.feature_overrides).
 *
 *   const caps = useShopCapabilities(shopId);
 *   if (!caps.ready) return <Spinner/>;
 *   if (!caps.has("RENTAL")) return <Blocked/>;
 */
export function useShopCapabilities(shopId: string | null | undefined) {
  const [data, setData] = useState<ShopCapabilities | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shopId) { setReady(true); setData(null); return; }
    let cancelled = false;
    setReady(false);
    setError(null);
    (async () => {
      const { data: row, error: err } = await supabase
        .from("v_shop_capabilities")
        .select("shop_id, category_slug, category_name, business_subtype, flow_types, enabled_features, booking_type")
        .eq("shop_id", shopId)
        .maybeSingle<Row>();
      if (cancelled) return;
      if (err) { setError(err.message); setReady(true); return; }
      if (!row) { setData(null); setReady(true); return; }
      setData({
        shopId: row.shop_id,
        categorySlug: row.category_slug,
        categoryName: row.category_name,
        subtype: row.business_subtype,
        flowTypes: (row.flow_types ?? []) as FlowType[],
        features: new Set<FeatureKey>((row.enabled_features ?? []) as FeatureKey[]),
        bookingType: (row.booking_type ?? null) as ShopCapabilities["bookingType"],
      });
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [shopId]);

  return {
    ready,
    error,
    data,
    has: (k: FeatureKey) => !!data?.features.has(k),
    hasAny: (ks: FeatureKey[]) => !!data && ks.some(k => data.features.has(k)),
    hasAll: (ks: FeatureKey[]) => !!data && ks.every(k => data.features.has(k)),
    hasFlow: (f: FlowType) => !!data?.flowTypes.includes(f),
  };
}
