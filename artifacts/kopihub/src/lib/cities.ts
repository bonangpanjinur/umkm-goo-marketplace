// Allow-list kota besar Indonesia untuk Quick Filter & sitemap landing pages.
// Tambah secukupnya — setiap entry akan menghasilkan satu landing page per kategori.
export const CITIES = [
  "Jakarta",
  "Bandung",
  "Surabaya",
  "Yogyakarta",
  "Semarang",
  "Medan",
  "Denpasar",
  "Makassar",
  "Palembang",
  "Malang",
  "Pekanbaru",
  "Banjarmasin",
  "Manado",
  "Padang",
  "Balikpapan",
] as const;

export type CityName = (typeof CITIES)[number];

/**
 * Build OR-pattern untuk `address ilike` yang lebih akurat (whole-word-ish).
 * Mencegah false positive "solo" cocok dengan "Solok".
 *
 * Pakai pada PostgREST query:
 *   q.or(cityIlikeOr("Bandung"))
 */
export function cityIlikeOr(city: string, column = "address") {
  const c = city.trim();
  if (!c) return "";
  return [
    `${column}.ilike.${c}`,         // exact
    `${column}.ilike.${c} %`,       // start
    `${column}.ilike.% ${c}`,       // end
    `${column}.ilike.% ${c} %`,     // middle
    `${column}.ilike.%, ${c}%`,     // ", Bandung..."
    `${column}.ilike.%,${c}%`,      // ",Bandung..."
  ].join(",");
}
