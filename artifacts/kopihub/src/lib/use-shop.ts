import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export type Shop = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  tax_percent: number;
  service_charge_percent: number;
  tax_inclusive: boolean;
  owner_id: string | null;
};
export type Outlet = { id: string; name: string };

export function useCurrentShop() {
  const { user, loading } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [loadingShop, setLoading] = useState(true);

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      setLoading(true);

      // 1) Try as owner first
      let { data: s } = await supabase
        .from("shops")
        .select("id, name, slug, logo_url, address, phone, tax_percent, service_charge_percent, tax_inclusive, owner_id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      // 2) If not an owner, find the shop where the user has a staff role.
      //    Staff accounts are created under a specific shop and must land
      //    directly inside that shop's POS app.
      let staffOutletId: string | null = null;
      if (!s) {
        const { data: role } = await supabase
          .from("user_roles")
          .select("shop_id, outlet_id")
          .eq("user_id", user.id)
          .not("shop_id", "is", null)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (role?.shop_id) {
          staffOutletId = role.outlet_id ?? null;
          const { data: shopRow } = await supabase
            .from("shops")
            .select("id, name, slug, logo_url, address, phone, tax_percent, service_charge_percent, tax_inclusive, owner_id")
            .eq("id", role.shop_id)
            .maybeSingle();
          s = shopRow ?? null;
        }
      }

      setShop(
        s
          ? {
              ...s,
              tax_percent: Number(s.tax_percent ?? 0),
              service_charge_percent: Number(s.service_charge_percent ?? 0),
              tax_inclusive: !!s.tax_inclusive,
            }
          : null,
      );
      if (s) {
        // For staff, prefer their assigned outlet if any; otherwise first outlet.
        if (staffOutletId) {
          const { data: o } = await supabase
            .from("outlets")
            .select("id, name")
            .eq("id", staffOutletId)
            .maybeSingle();
          setOutlet(o ?? null);
        } else {
          const { data: o } = await supabase
            .from("outlets")
            .select("id, name")
            .eq("shop_id", s.id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          setOutlet(o ?? null);
        }
      }
      setLoading(false);
    })();
  }, [user, loading]);

  return { shop, outlet, loading: loading || loadingShop };
}

export const useShop = useCurrentShop;
