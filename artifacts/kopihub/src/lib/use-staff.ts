import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export type StaffInfo = {
  isOwner: boolean;
  isStaff: boolean;
  role: string | null;
  shopId: string | null;
  allowedModules: string[] | null; // null = all allowed
  loading: boolean;
};

/**
 * Default modul yang boleh diakses per role staff.
 * Empty array `[]` = boleh semua (setara dengan null override).
 * Daftar role multi-UMKM: pelayan, gudang, koki, helper, supervisor.
 * Legacy (cashier, barista, manager) tetap didukung untuk akun lama.
 */
const MODULE_MAP: Record<string, string[]> = {
  // Generik (modern, dipakai semua jenis UMKM)
  supervisor: [], // semua kecuali billing/settings (di-handle di NAV)
  pelayan: ["pos", "orders", "online-orders", "tables", "open-bills", "shifts"],
  gudang: ["inventory", "recipes", "purchase-orders", "suppliers"],
  koki: ["kitchen-load", "orders", "online-orders", "recipes"],
  helper: ["orders", "online-orders"],
  // Legacy aliases (jangan dihapus — data lama masih pakai)
  manager: [],
  cashier: ["pos", "orders", "shifts", "open-bills", "tables"],
  barista: ["orders", "online-orders", "kitchen-load"],
};

/** Label Bahasa Indonesia untuk role staff (dipakai di UI manage employees) */
export const STAFF_ROLE_LABELS: Record<string, string> = {
  supervisor: "Supervisor",
  pelayan: "Pelayan / Kasir",
  gudang: "Staff Gudang",
  koki: "Koki / Produksi",
  helper: "Helper",
  manager: "Manajer (legacy)",
  cashier: "Kasir (legacy)",
  barista: "Barista (legacy)",
};

export function useStaffRole(): StaffInfo {
  const { user, loading } = useAuth();
  const [info, setInfo] = useState<StaffInfo>({
    isOwner: false,
    isStaff: false,
    role: null,
    shopId: null,
    allowedModules: null,
    loading: true,
  });

  useEffect(() => {
    if (loading || !user) {
      setInfo((p) => ({ ...p, loading }));
      return;
    }
    (async () => {
      // Check if user owns a shop
      const { data: shop } = await supabase
        .from("shops")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (shop) {
        setInfo({ isOwner: true, isStaff: false, role: "owner", shopId: shop.id, allowedModules: null, loading: false });
        return;
      }

      // Check user_roles (where promote-to-login & create-user write)
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("shop_id, role")
        .eq("user_id", user.id)
        .not("shop_id", "is", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (roleRow?.shop_id) {
        // Optional per-user override from staff_permissions
        const { data: perm } = await supabase
          .from("staff_permissions")
          .select("allowed_modules, role")
          .eq("user_id", user.id)
          .eq("shop_id", roleRow.shop_id)
          .maybeSingle();
        const role = perm?.role ?? roleRow.role;
        const modules = perm?.allowed_modules ?? MODULE_MAP[role] ?? null;
        setInfo({ isOwner: false, isStaff: true, role, shopId: roleRow.shop_id, allowedModules: modules, loading: false });
        return;
      }

      // Legacy fallback: staff_permissions only
      const { data: perm } = await supabase
        .from("staff_permissions")
        .select("shop_id, role, allowed_modules")
        .eq("user_id", user.id)
        .maybeSingle();

      if (perm) {
        const modules = perm.allowed_modules ?? MODULE_MAP[perm.role] ?? null;
        setInfo({ isOwner: false, isStaff: true, role: perm.role, shopId: perm.shop_id, allowedModules: modules, loading: false });
        return;
      }

      setInfo({ isOwner: false, isStaff: false, role: null, shopId: null, allowedModules: null, loading: false });
    })();
  }, [user, loading]);

  return info;
}

/** Check if a nav path is allowed for the current user */
export function isModuleAllowed(path: string, allowedModules: string[] | null): boolean {
  if (!allowedModules) return true; // null = all allowed
  // Extract module from path like /pos-app/pos → pos
  const segment = path.replace(/^\/pos-app\/?/, "").split("/")[0];
  if (!segment) return true; // dashboard always allowed
  return allowedModules.includes(segment);
}
