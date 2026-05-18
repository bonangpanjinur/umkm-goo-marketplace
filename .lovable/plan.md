## I.2 — Marketplace filter: Kategori + Subtype + Lokasi ✅ SELESAI

- `subtype` ditambahkan ke `searchSchema`, query, cacheKey, pills, dan localStorage di `routes/search.tsx`.
- Quick filter (Subtype + Kota) di `routes/kategori.$slug.tsx` → navigate ke `/search` dengan filter aktif.
- Tidak ada migration DB (kolom `business_subtype` sudah ada).

## I.3 — SEO: Sitemap dinamis & landing kota+kategori ✅ SELESAI

### Yang dikerjakan

1. **`routes/sitemap[.]xml.ts`** — Server route TanStack Start, replace static `public/sitemap.xml` (sudah dihapus).
   - Include static routes (`/`, `/kategori`, `/search`, `/pricing`, `/features`).
   - Loop semua `business_categories.is_active=true` → emit `/kategori/{slug}`.
   - Loop allow-list 10 kota besar (Jakarta, Bandung, Surabaya, dst) × kategori → emit `/kategori/{slug}/{city}`.
   - Loop semua `shops.is_active=true` → emit `/toko/{slug}` + `/s/{slug}` (limit 1000).
   - `Cache-Control: public, max-age=3600`. Pakai `@supabase/supabase-js` createClient dgn anon key (read-only).
   - `BASE_URL=""` (relative) sampai custom domain di-set.

2. **`routes/kategori.$slug.$city.tsx`** — Landing page baru kategori × kota.
   - Title: `{Kategori} di {Kota} — Marketplace UMKMgo`, description unik per kombinasi.
   - `og:title`, `og:description`, `og:url`, canonical link.
   - JSON-LD `BreadcrumbList` (Kategori → Sub-kategori → Kota).
   - Konten: shops difilter via `address ilike %city%` + produk pilihan dari shop tsb.
   - Empty state link balik ke `/kategori/{slug}`.

3. **`routes/kategori.$slug.tsx`** — Tambah `head()` dengan title/desc/og/canonical per slug.

### Catatan

- Tidak ada perubahan DB.
- Sitemap akan mulai populated otomatis begitu deploy; crawler bisa discovery via `public/robots.txt` (sudah `Sitemap: /sitemap.xml`).
- Allow-list kota disimpan inline di `sitemap[.]xml.ts` (`CITIES` const) — gampang extend nanti.
