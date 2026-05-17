/**
 * pickCheckoutFlow — pilih halaman checkout yang tepat berdasarkan
 * capability toko + isi cart. Dipakai di tombol "Bayar" pada toko publik.
 *
 *   const target = pickCheckoutFlow(caps, cart, { shopSlug });
 *   navigate({ to: target.path, params: target.params });
 */
import type { FeatureKey } from "./feature-keys";

export type CartLineKind =
  | "product"           // F&B / retail biasa
  | "digital"           // file/lisensi/kursus
  | "booking_session"   // booking jadwal (T3)
  | "rental"            // unit sewa (T4)
  | "custom_order"      // pre-order / custom (T5)
  | "service";          // jasa onsite (T1+T3 ringan)

export type CartLine = { kind: CartLineKind };

type CapsLike = { has: (k: FeatureKey) => boolean };

export type CheckoutTarget =
  | { path: "/checkout"; flavor: "booking" | "rental" | "default" }
  | { path: "/toko/$slug/custom-order"; flavor: "custom-order"; params: { slug: string } };

export function pickCheckoutFlow(
  caps: CapsLike,
  cart: CartLine[],
  ctx: { shopSlug: string },
): CheckoutTarget {
  const has = (k: CartLineKind) => cart.some((l) => l.kind === k);

  // Custom-order request → form khusus, bukan checkout standar.
  if (has("custom_order") && caps.has("CUSTOM_ORDER")) {
    return {
      path: "/toko/$slug/custom-order",
      flavor: "custom-order",
      params: { slug: ctx.shopSlug },
    };
  }

  // Booking sesi → checkout dengan deposit Midtrans (Fase 6).
  if (has("booking_session") && caps.has("BOOKING")) {
    return { path: "/checkout", flavor: "booking" };
  }

  // Rental → checkout dengan jaminan/deposit RENTAL.
  if (has("rental") && caps.has("RENTAL")) {
    return { path: "/checkout", flavor: "rental" };
  }

  // Default — F&B / retail / digital / jasa biasa.
  return { path: "/checkout", flavor: "default" };
}
