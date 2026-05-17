import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Slug kategori usaha yang dipakai untuk gating fitur vertikal.
 * Slug mengikuti tabel `business_categories.slug`.
 */
export type CategorySlug =
  | "fnb" | "retail" | "jasa"
  | "rental" | "studio" | "umroh" | "medical"
  | "salon" | "laundry" | "automotive" | "education"
  | string;

/**
 * Peta modul → daftar kategori yang relevan. Modul yang tidak ada di peta
 * dianggap "umum" dan selalu tampil.
 */
const MODULE_CATEGORY_MAP: Record<string, CategorySlug[]> = {
  // F&B-only
  "kds": ["fnb"],
  "kitchen-load": ["fnb"],
  "recipes": ["fnb"],
  "tables": ["fnb"],
  "table-maps": ["fnb"],
  "table-qr": ["fnb"],
  "open-bills": ["fnb"],
  // Jasa vertikal-spesifik
  "rental": ["rental"],
  "studio": ["studio"],
  "umroh": ["umroh"],
  "medical": ["medical"],
  "salon": ["salon"],
  "laundry": ["laundry"],
  "automotive": ["automotive"],
  "education": ["education"],
  // Retail-friendly
  "bundles": ["retail", "fnb"],
  "variants": ["retail", "fnb"],
};

/** Hook untuk ambil slug kategori usaha dari shop. */
export function useBusinessCategory(shopId: string | null | undefined) {
  const [slug, setSlug] = useState<CategorySlug | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("shops")
        .select("business_category_id, business_categories(slug)")
        .eq("id", shopId)
        .maybeSingle();
      const cat = (data as { business_categories?: { slug?: string } } | null)?.business_categories;
      setSlug((cat?.slug as CategorySlug) ?? null);
      setLoading(false);
    })();
  }, [shopId]);

  return { slug, loading };
}

/**
 * Cek apakah sebuah modul (segmen path) relevan untuk kategori toko.
 * Jika kategori belum diset (null), tampilkan semua agar onboarding tetap mudah.
 */
export function isModuleRelevant(moduleSlug: string, categorySlug: CategorySlug | null): boolean {
  const allowed = MODULE_CATEGORY_MAP[moduleSlug];
  if (!allowed) return true; // modul umum
  if (!categorySlug) return true; // kategori belum diisi → jangan sembunyikan
  return allowed.includes(categorySlug);
}
