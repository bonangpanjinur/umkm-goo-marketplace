import type { ReactNode } from "react";
import { useShopSubtype, type SubtypeMatcher } from "@/lib/use-shop-subtype";

export type SubtypeFieldProps = SubtypeMatcher & {
  /** Alternatif: array matcher (OR). */
  any?: SubtypeMatcher[];
  /** Render kebalikan: tampilkan jika TIDAK match. */
  invert?: boolean;
  /** Fallback saat caps belum siap. Default: render anak (optimistic). */
  loadingFallback?: ReactNode;
  /** Render saat tidak match. */
  fallback?: ReactNode;
  children: ReactNode;
};

/**
 * Bungkus field/section yang hanya boleh muncul untuk
 * kategori / subtype / feature / flow tertentu.
 *
 *   <SubtypeField subtype={["umroh","hajj"]}>
 *     <FieldHotelMekkah/>
 *   </SubtypeField>
 *
 *   <SubtypeField category="travel" subtype="tour-domestic">
 *     <FieldDestinasi/>
 *   </SubtypeField>
 *
 *   <SubtypeField any={[{subtype:"umroh"},{category:"klinik"}]}>...</SubtypeField>
 *
 *   <SubtypeField subtype="umroh" invert>...</SubtypeField>
 */
export function SubtypeField({
  children, fallback = null, loadingFallback,
  invert = false, any, category, subtype, feature, flow,
}: SubtypeFieldProps) {
  const st = useShopSubtype();
  if (!st.ready) return <>{loadingFallback ?? children}</>;
  const m = any ?? [{ category, subtype, feature, flow }];
  const ok = st.matches(m);
  const show = invert ? !ok : ok;
  return <>{show ? children : fallback}</>;
}
