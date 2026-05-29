/**
 * shop-context.tsx — Konsolidasi dari use-shop.ts + outlet-context.tsx (F3-4)
 *
 * Menyediakan satu context yang mencakup:
 *  - Data toko aktif (shop) + outlet terpilih
 *  - Daftar semua outlet toko (untuk switcher)
 *  - Kemampuan switch outlet & persist ke localStorage
 *
 * Cara pakai:
 *   // Di root POS shell:
 *   <ShopProvider><App /></ShopProvider>
 *
 *   // Di komponen:
 *   const { shop, outlet, outlets, setCurrent, loading } = useShopContext();
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// ── Types ────────────────────────────────────────────────────

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

export type Outlet = {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean;
};

type ShopCtx = {
  shop: Shop | null;
  outlet: Outlet | null;
  outlets: Outlet[];
  setCurrent: (outlet: Outlet) => void;
  loading: boolean;
  refresh: () => void;
};

// ── Context ──────────────────────────────────────────────────

const ShopContext = createContext<ShopCtx>({
  shop: null,
  outlet: null,
  outlets: [],
  setCurrent: () => {},
  loading: true,
  refresh: () => {},
});

export function useShopContext(): ShopCtx {
  return useContext(ShopContext);
}

const OUTLET_STORAGE_KEY = "umkmgo_outlet_id";

// ── Provider ─────────────────────────────────────────────────

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outlet, setOutletState] = useState<Outlet | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    // 1) Try as owner
    let { data: s } = await supabase
      .from("shops")
      .select("id, name, slug, logo_url, address, phone, tax_percent, service_charge_percent, tax_inclusive, owner_id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let staffOutletId: string | null = null;

    // 2) Fall back to staff role lookup
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

    if (s) {
      setShop({
        ...s,
        tax_percent: Number(s.tax_percent ?? 0),
        service_charge_percent: Number(s.service_charge_percent ?? 0),
        tax_inclusive: !!s.tax_inclusive,
      });

      // Load all outlets for this shop
      const { data: outletRows } = await supabase
        .from("outlets")
        .select("id, name, address, is_active")
        .eq("shop_id", s.id)
        .order("name");
      const list = (outletRows ?? []) as Outlet[];
      setOutlets(list);

      // Determine which outlet to select
      let selected: Outlet | null = null;
      if (staffOutletId) {
        selected = list.find((o) => o.id === staffOutletId) ?? null;
      }
      if (!selected) {
        const saved = typeof window !== "undefined" ? localStorage.getItem(OUTLET_STORAGE_KEY) : null;
        selected = list.find((o) => o.id === saved) ?? list[0] ?? null;
      }
      setOutletState(selected);
    } else {
      setShop(null);
      setOutlets([]);
      setOutletState(null);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  const setCurrent = useCallback((o: Outlet) => {
    setOutletState(o);
    if (typeof window !== "undefined") localStorage.setItem(OUTLET_STORAGE_KEY, o.id);
  }, []);

  return (
    <ShopContext.Provider value={{ shop, outlet, outlets, setCurrent, loading, refresh: load }}>
      {children}
    </ShopContext.Provider>
  );
}

// ── Backward-compat aliases ───────────────────────────────────

/** @deprecated Pakai useShopContext() */
export function useCurrentShop() {
  const { shop, outlet, loading } = useShopContext();
  return { shop, outlet, loading };
}

/** @deprecated Pakai useShopContext() */
export const useShop = useCurrentShop;

/** @deprecated Pakai useShopContext() */
export function useOutletContext() {
  const { outlets, outlet: current, setCurrent, loading } = useShopContext();
  return { outlets, current, setCurrent, loading };
}

/** @deprecated Pakai ShopProvider */
export function OutletProvider({ children }: { children: ReactNode }) {
  return <ShopProvider>{children}</ShopProvider>;
}
