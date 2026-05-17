import { useMemo } from "react";
import { useCurrentShop } from "./use-shop";
import { useShopCapabilities } from "./use-shop-capabilities";

export type SubtypeMatcher = {
  /** Match jika categorySlug shop ada di list. */
  category?: string | string[];
  /** Match jika business_subtype shop ada di list. */
  subtype?: string | string[];
  /** Match jika feature key aktif. */
  feature?: string | string[];
  /** Match jika flow type aktif (mis. "service", "rental"). */
  flow?: string | string[];
};

function toArr(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Hook subtype-aware. Mengembalikan info kategori/subtype shop saat ini
 * plus helper `matches(...)` & `is(subtype)` untuk gating field per subtype.
 *
 *   const st = useShopSubtype();
 *   if (st.is("umroh")) ...
 *   {st.matches({ subtype: ["umroh","hajj"] }) && <FieldHotelMekkah/>}
 */
export function useShopSubtype() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const caps = useShopCapabilities(shop?.id);

  return useMemo(() => {
    const ready = !shopLoading && caps.ready;
    const subtype = caps.data?.subtype ?? null;
    const category = caps.data?.categorySlug ?? null;
    const features = caps.data?.features ?? new Set<string>();
    const flows = new Set<string>(caps.data?.flowTypes ?? []);

    function matches(m: SubtypeMatcher | SubtypeMatcher[]): boolean {
      const list = Array.isArray(m) ? m : [m];
      // OR antar matcher
      return list.some(one => {
        const cats = toArr(one.category);
        const subs = toArr(one.subtype);
        const feats = toArr(one.feature);
        const fls = toArr(one.flow);
        if (cats.length && (!category || !cats.includes(category))) return false;
        if (subs.length && (!subtype || !subs.includes(subtype))) return false;
        if (feats.length && !feats.every(f => features.has(f as never))) return false;
        if (fls.length && !fls.every(f => flows.has(f))) return false;
        return true;
      });
    }

    return {
      ready,
      shop,
      category,
      subtype,
      flows: Array.from(flows),
      is: (s: string) => subtype === s,
      isCategory: (c: string) => category === c,
      matches,
    };
  }, [shop, shopLoading, caps.ready, caps.data]);
}
