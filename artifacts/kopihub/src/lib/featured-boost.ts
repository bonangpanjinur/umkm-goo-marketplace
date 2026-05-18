// Helpers to surface produk/toko dari shop `is_featured=true` ke atas.
// Stable-sort di client karena PostgREST `.order({ foreignTable })` hanya
// mengurut embedded rows, BUKAN parent. Lihat audit Fase I.5.

export function applyFeaturedBoostShops<T extends { is_featured?: boolean | null }>(list: T[]): T[] {
  const feat: T[] = [];
  const rest: T[] = [];
  for (const s of list) (s.is_featured ? feat : rest).push(s);
  return [...feat, ...rest];
}

export function applyFeaturedBoostProducts<T extends { shop?: { is_featured?: boolean | null } | null }>(
  list: T[],
): T[] {
  const feat: T[] = [];
  const rest: T[] = [];
  for (const p of list) (p.shop?.is_featured ? feat : rest).push(p);
  return [...feat, ...rest];
}
