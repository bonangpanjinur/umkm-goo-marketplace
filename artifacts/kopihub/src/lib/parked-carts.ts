import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/lib/cart";

/**
 * Broadcast perubahan parked cart (park/unpark/hapus/confirm) ke seluruh
 * tab & komponen, supaya badge "Cart Tersimpan" + counter cart aktif
 * langsung refresh tanpa menunggu realtime postgres_changes.
 * Aman dipanggil dari SSR (no-op kalau window tidak ada).
 */
export function notifyParkedCartChange(outletId?: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("kh_pos_cart_ts", Date.now().toString());
    }
  } catch {}
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("kh-pos-cart-change", { detail: { outletId } }),
      );
    }
  } catch {}
}

export type ParkedCart = {
  id: string;
  shop_id: string;
  outlet_id: string;
  label: string;
  items: CartItem[];
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const sb = supabase as any;

export async function listParkedCarts(outletId: string): Promise<ParkedCart[]> {
  const { data, error } = await sb
    .from("parked_carts")
    .select("*")
    .eq("outlet_id", outletId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ParkedCart[];
}

export async function parkCart(input: {
  shop_id: string;
  outlet_id: string;
  label: string;
  items: CartItem[];
  note?: string | null;
  created_by?: string | null;
  id?: string | null;
}): Promise<ParkedCart> {
  if (input.id) {
    // Update existing parked cart
    const { data, error } = await sb
      .from("parked_carts")
      .update({
        label: input.label,
        items: input.items,
        note: input.note ?? null,
      })
      .eq("id", input.id)
      .select()
      .single();
    if (error) throw error;
    notifyParkedCartChange(input.outlet_id);
    return data as ParkedCart;
  }
  const { data, error } = await sb
    .from("parked_carts")
    .insert({
      shop_id: input.shop_id,
      outlet_id: input.outlet_id,
      label: input.label,
      items: input.items,
      note: input.note ?? null,
      created_by: input.created_by ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  notifyParkedCartChange(input.outlet_id);
  return data as ParkedCart;
}

export async function deleteParkedCart(id: string): Promise<void> {
  const { error } = await sb.from("parked_carts").delete().eq("id", id);
  if (error) throw error;
  notifyParkedCartChange();
}
}
