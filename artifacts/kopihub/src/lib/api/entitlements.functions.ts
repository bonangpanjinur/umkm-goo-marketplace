import { supabase } from "@/integrations/supabase/client";

export async function getEntitlements() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.rpc("get_my_entitlements" as any);
  return data;
}

export async function setShopTheme({ data }: { data: { themeKey: string } }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");
  const { data: shop } = await supabase.from("shops").select("id").eq("owner_id", user.id).maybeSingle();
  if (!shop) throw new Error("shop_not_found");
  // Update kedua kolom (legacy `theme_key` & yang dibaca storefront `active_theme_key`)
  // agar perubahan langsung tercermin di /s/$slug tanpa perlu refresh tambahan.
  const { error } = await supabase
    .from("shops")
    .update({ theme_key: data.themeKey, active_theme_key: data.themeKey } as any)
    .eq("id", shop.id);
  if (error) throw error;
  return { ok: true };
}

export async function getPublicShopTheme({ data }: { data: { slug: string } }) {
  const { data: shop } = await supabase
    .from("shops")
    .select("active_theme_key, theme_key")
    .eq("slug", data.slug)
    .maybeSingle();
  const s = shop as any;
  return { themeKey: s?.active_theme_key ?? s?.theme_key ?? "classic" };
}
