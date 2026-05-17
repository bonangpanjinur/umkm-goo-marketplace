/**
 * @deprecated Gunakan `useShopCapabilities` dari `@/lib/use-shop-capabilities`
 * yang membaca view `v_shop_capabilities` (single source of truth).
 *
 * Wrapper tipis ini hanya disediakan untuk kompatibilitas mundur.
 */
import { useShopCapabilities } from "./use-shop-capabilities";

export type CategorySlug = string;

/** @deprecated lihat useShopCapabilities */
export function useBusinessCategory(shopId: string | null | undefined) {
  const caps = useShopCapabilities(shopId);
  return { slug: (caps.data?.categorySlug ?? null) as CategorySlug | null, loading: !caps.ready };
}

/** @deprecated periksa fitur via `caps.has("FEATURE_KEY")` langsung. */
export function isModuleRelevant(_moduleSlug: string, _categorySlug: CategorySlug | null): boolean {
  // Tanpa kontekst capabilities di sini, kembalikan true (jangan sembunyikan apapun).
  // Pemanggil baru harus pindah ke `useShopCapabilities(...).has(...)`.
  return true;
}
