import { supabase } from "@/integrations/supabase/client";

/**
 * Tentukan rute setelah login berdasarkan role user.
 * Prioritas: super_admin → /admin, courier aktif → /kurir, lainnya → /pos-app.
 */
export async function resolvePostLoginRoute(userId: string): Promise<string> {
  try {
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    });
    if (isAdmin) return "/admin";

    const { count } = await supabase
      .from("couriers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true);
    if (count && count > 0) return "/kurir";
  } catch {
    // ignore — default ke /pos-app
  }
  return "/pos-app";
}
