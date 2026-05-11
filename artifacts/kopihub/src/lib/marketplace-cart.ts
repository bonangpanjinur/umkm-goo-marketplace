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
  // If exists, increment qty; else insert
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
}

export async function listCart(): Promise<CartItem[]> {
  const cart_id = await getOrCreateCartId();
  const { data, error } = await supabase
    .from("marketplace_cart_items")
    .select(
      "id, cart_id, shop_id, product_id, variant_id, quantity, unit_price, notes, options, product:menu_items(id, name, image_url, slug), shop:coffee_shops(id, name, slug, logo_url)",
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
}

export async function removeCartItem(id: string): Promise<void> {
  const { error } = await supabase.from("marketplace_cart_items").delete().eq("id", id);
  if (error) throw error;
}

export async function cartCount(): Promise<number> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return 0;
  const { count } = await supabase
    .from("marketplace_cart_items")
    .select("id", { count: "exact", head: true })
    .eq("cart_id", await getOrCreateCartId());
  return count ?? 0;
}

export type DeliveryZone = {
  id: string;
  shop_id: string;
  name: string;
  fee: number;
  area_note: string | null;
};

export async function listShopZones(shopIds: string[]): Promise<DeliveryZone[]> {
  if (shopIds.length === 0) return [];
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("id, shop_id, name, fee, area_note")
    .in("shop_id", shopIds)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((z: any) => ({ ...z, fee: Number(z.fee) }));
}

export async function checkout(args: {
  recipient_name: string;
  phone: string;
  address: string;
  fulfillment?: "delivery" | "pickup";
  notes?: string | null;
  shipping?: Record<string, string>; // shop_id -> zone_id
  shop_voucher_codes?: Record<string, string>; // shop_id -> code
  platform_voucher_code?: string | null;
}): Promise<string[]> {
  const { data, error } = await supabase.rpc("marketplace_checkout", {
    _recipient_name: args.recipient_name,
    _phone: args.phone,
    _address: args.address,
    _fulfillment: args.fulfillment ?? "delivery",
    _notes: args.notes ?? undefined,
    _shipping: (args.shipping ?? {}) as any,
    _shop_voucher_codes: (args.shop_voucher_codes ?? {}) as any,
    _platform_voucher_code: args.platform_voucher_code ?? undefined,
  });
  if (error) throw error;
  return ((data as any)?.order_ids as string[]) ?? [];
}
