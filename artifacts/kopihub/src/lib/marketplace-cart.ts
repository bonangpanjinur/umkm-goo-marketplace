import { supabase } from "@/integrations/supabase/client";

export type CartItem = {
  id: string;
  cart_id: string;
  shop_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  notes: string | null;
  options: any;
  product?: { id: string; name: string; image_url: string | null; slug: string | null };
  shop?: { id: string; name: string; slug: string; logo_url: string | null };
};

export async function getOrCreateCartId(): Promise<string> {
  const { data, error } = await supabase.rpc("get_or_create_marketplace_cart");
  if (error) throw error;
  return data as string;
}

export async function addToCart(args: {
  shop_id: string;
  product_id: string;
  unit_price: number;
  quantity?: number;
  notes?: string;
}): Promise<void> {
  const cart_id = await getOrCreateCartId();
  const { data: existing } = await supabase
    .from("marketplace_cart_items")
    .select("id, quantity")
    .eq("cart_id", cart_id)
    .eq("product_id", args.product_id)
    .is("variant_id", null)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("marketplace_cart_items")
      .update({ quantity: (existing as any).quantity + (args.quantity ?? 1), notes: args.notes ?? null })
      .eq("id", (existing as any).id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("marketplace_cart_items").insert({
      cart_id,
      shop_id: args.shop_id,
      product_id: args.product_id,
      unit_price: args.unit_price,
      quantity: args.quantity ?? 1,
      notes: args.notes ?? null,
    });
    if (error) throw error;
  }
  notifyCartChange();
}

export async function listCart(): Promise<CartItem[]> {
  const cart_id = await getOrCreateCartId();
  const { data, error } = await supabase
    .from("marketplace_cart_items")
    .select(
      "id, cart_id, shop_id, product_id, variant_id, quantity, unit_price, notes, options, product:menu_items(id, name, image_url, slug), shop:shops(id, name, slug, logo_url)",
    )
    .eq("cart_id", cart_id)
    .order("created_at");
  if (error) throw error;
  return (data as any) ?? [];
}

export async function updateCartItem(id: string, quantity: number): Promise<void> {
  if (quantity <= 0) {
    return removeCartItem(id);
  }
  const { error } = await supabase
    .from("marketplace_cart_items")
    .update({ quantity })
    .eq("id", id);
  if (error) throw error;
  notifyCartChange();
}

export async function removeCartItem(id: string): Promise<void> {
  const { error } = await supabase.from("marketplace_cart_items").delete().eq("id", id);
  if (error) throw error;
  notifyCartChange();
}

export function markCartActivity(): void {
  try { localStorage.setItem("kh_cart_ts", Date.now().toString()); } catch {}
}

export function getLastCartActivity(): number | null {
  try { const v = localStorage.getItem("kh_cart_ts"); return v ? Number(v) : null; } catch { return null; }
}

/**
 * Broadcast cart change ke seluruh tab/komponen agar badge & state cart
 * langsung refresh tanpa nunggu realtime postgres_changes. Aman dipanggil
 * dari SSR (no-op kalau window tidak ada).
 */
export function notifyCartChange(): void {
  markCartActivity();
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kh-cart-change"));
    }
  } catch {}
}

export async function cartCount(): Promise<number> {
  return cartQuantitySum();
}

/**
 * Jumlah total qty di cart aktif user (sum quantity, bukan jumlah baris).
 * Filter `shopId` opsional — gunakan untuk badge per-toko agar tidak
 * mengakumulasi item dari toko lain pada satu user (multi-shop di satu cart).
 */
export async function cartQuantitySum(shopId?: string): Promise<number> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return 0;
  const cart_id = await getOrCreateCartId();
  let q = supabase
    .from("marketplace_cart_items")
    .select("quantity, shop_id")
    .eq("cart_id", cart_id);
  if (shopId) q = q.eq("shop_id", shopId);
  const { data, error } = await q;
  if (error || !data) return 0;
  return (data as { quantity: number }[]).reduce((s, r) => s + Number(r.quantity ?? 0), 0);
}

export type DeliveryZone = {
  id: string;
  shop_id: string;
  name: string;
  fee: number;
  area_note: string | null;
  min_eta_minutes: number;
  max_eta_minutes: number;
};

export async function listShopZones(shopIds: string[]): Promise<DeliveryZone[]> {
  if (shopIds.length === 0) return [];
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("id, shop_id, name, fee, area_note, min_eta_minutes, max_eta_minutes")
    .in("shop_id", shopIds)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((z: any) => ({
    ...z,
    fee: Number(z.fee),
    min_eta_minutes: z.min_eta_minutes ?? 30,
    max_eta_minutes: z.max_eta_minutes ?? 60,
  }));
}

export type DeliverySettings = {
  shop_id: string;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  mode: "flat" | "zone";
  open_time: string | null;
  close_time: string | null;
  min_eta_minutes: number;
  max_eta_minutes: number;
  notes: string | null;
};

export async function listShopDeliverySettings(shopIds: string[]): Promise<DeliverySettings[]> {
  if (shopIds.length === 0) return [];
  const { data, error } = await supabase
    .from("delivery_settings")
    .select("shop_id, delivery_enabled, pickup_enabled, mode, open_time, close_time, min_eta_minutes, max_eta_minutes, notes")
    .in("shop_id", shopIds);
  if (error) return [];
  return (data ?? []).map((d: any) => ({
    ...d,
    min_eta_minutes: d.min_eta_minutes ?? 30,
    max_eta_minutes: d.max_eta_minutes ?? 60,
  })) as DeliverySettings[];
}

export async function checkout(args: {
  recipient_name: string;
  phone: string;
  address: string;
  fulfillment?: "delivery" | "pickup";
  payment_method?: string;
  notes?: string | null;
  shipping?: Record<string, string>;
  shop_voucher_codes?: Record<string, string>;
  platform_voucher_code?: string | null;
}): Promise<string[]> {
  const { data, error } = await supabase.rpc("marketplace_checkout", {
    _recipient_name: args.recipient_name,
    _phone: args.phone,
    _address: args.address,
    _fulfillment: args.fulfillment ?? "delivery",
    _payment_method: args.payment_method ?? "transfer",
    _notes: args.notes ?? undefined,
    _shipping: (args.shipping ?? {}) as any,
    _shop_voucher_codes: (args.shop_voucher_codes ?? {}) as any,
    _platform_voucher_code: args.platform_voucher_code ?? undefined,
  });
  if (error) throw error;
  notifyCartChange();
  return ((data as any)?.order_ids as string[]) ?? [];
}
