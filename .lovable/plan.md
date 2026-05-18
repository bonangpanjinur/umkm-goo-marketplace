# Audit Pasca-Fase I (I.2 → I.4) & Rencana Perbaikan

Saya review ulang semua perubahan I.2/I.3/I.4 + alur yang ter-mirror (search, kategori, sitemap, sorting/featured). Berikut temuan + urutan perbaikannya.

---

## Temuan

### 🔴 P0 — Bug fungsional

**1. Boost `is_featured` pada query produk tidak bekerja**
`routes/search.tsx` → `buildProductQuery()` memakai
`.order("is_featured", { foreignTable: "shop" })`. Di supabase-js, opsi `foreignTable` hanya mengurutkan baris **embedded** (anak) — **bukan** parent. Artinya produk dari toko `is_featured=true` **tidak** naik ke atas seperti yang diharapkan di tab "Produk" maupun "Semua".
Sumber: dok PostgREST/PostgrestTransformBuilder.order.

**2. Sitemap menghasilkan duplicate-content URL**
`routes/sitemap[.]xml.ts` emit DUA URL untuk shop yang sama:

- `/toko/{slug}` → halaman marketplace publik (sudah punya `toko.$slug.tsx`)
- `/s/{slug}` → storefront mini untuk pembeli (utilitas, bukan halaman discovery)

Google akan menganggap keduanya bersaing → split rangking & potensi penalti soft-duplicate.

### 🟡 P1 — UX/SEO gap

**3. Badge "Unggulan" tidak pernah dirender**
Kolom `is_featured` sudah di-select di `/search` & `/kategori/$slug`, tapi card toko tidak menampilkan indikator apapun. Admin tidak melihat efek toggle Star di `/admin/shops`.

**4. `kategori.$slug.tsx` kurang JSON-LD**
Hanya punya `head()` (title/desc/og). Tidak ada `BreadcrumbList` (sementara `kategori.$slug.$city.tsx` sudah punya) → inkonsistensi sinyal SEO.

**5. Quick Filter city free-text rentan false-positive**
`address ilike %city%` di `/search` & `kategori.$slug.tsx`:

- "solo" cocok dengan "Solok" / "Banyak Solo"
- input bebas user → typo bikin 0 hasil padahal data ada

Sitemap sudah pakai allow-list `CITIES` (10 kota), tapi UI tidak.

### 🟢 P2 — Polish (opsional, gak blocking)

**6. Sort `relevan` & `rating` identik**
Keduanya fallback ke `.order("rating_avg")`. Tidak ada penalti, hanya pengalaman bingung.

**7. Produk di `kategori.$slug.tsx` tidak boost `is_featured`**
Sama akar masalahnya dengan #1 — perlu strategi non-foreignTable.

---

## Rencana Perbaikan

### Batch A — Bug fix (P0)

**A1. Perbaiki featured-boost produk** (`routes/search.tsx`, `routes/kategori.$slug.tsx`)

Strategi: **dua-pass ringan** alih-alih sort di SQL.

1. Sebelum fetch produk, ambil `id` toko `is_featured=true` aktif (max 50, satu query cepat).
2. Fetch produk seperti biasa (sort by rating/terlaris/terbaru).
3. Setelah hasil datang, stable-sort di client: produk yang `shop_id ∈ featuredSet` naik ke atas (preserve relative order).

Hapus baris `.order("is_featured", { foreignTable: "shop" })` yang tidak efektif.
Alternatif yang ditolak: bikin RPC/view (overkill); ORDER lewat join (PostgREST tidak support).

**A2. Sitemap: drop `/s/{slug}`, hanya emit `/toko/{slug}`** (`routes/sitemap[.]xml.ts`)

Hapus loop kedua. `/s/{slug}` tetap reachable lewat link internal kalau perlu, tapi tidak diiklankan ke crawler. Sebagai pelengkap, tambahkan `<link rel="canonical" href="/toko/{slug}">` di `s.$slug.tsx` agar Google men-collapse keduanya kalau di-crawl manual.

### Batch B — Featured visibility (P1)

**B1. Badge "★ Unggulan"** pada ShopCard di:

- `routes/search.tsx` (tab Toko)
- `routes/kategori.$slug.tsx`
- `routes/kategori.$slug.$city.tsx`

Komponen kecil inline: `{shop.is_featured && <span className="...amber...">★ Unggulan</span>}`. Tidak perlu komponen baru — pola sama seperti badge `kyc_status="approved"` yang sudah ada.

**B2. Badge "Unggulan" pada ProductCard** untuk produk dari toko featured (setelah A1 jalan, `shop.is_featured` sudah tersedia di payload).

### Batch C — SEO consistency (P1)

**C1. Tambah JSON-LD `BreadcrumbList` + `CollectionPage`** di `routes/kategori.$slug.tsx` `head()`:

```
Kategori → {Nama Kategori}
```

Plus `CollectionPage` dengan `mainEntity` minimal (URL kategori, jumlah hasil).

### Batch D — Quick Filter hardening (P1)

**D1. Ekspos `CITIES` allow-list sebagai modul shared** (`src/lib/cities.ts`) — dipakai oleh sitemap & UI.

**D2. Ubah input kota di Quick Filter** (`kategori.$slug.tsx`) dari free-text `<Input>` jadi `<Select>` dengan opsi dari `CITIES` + opsi "Semua kota". `/search` tetap accept free-text (untuk power user via URL), tapi field UI-nya jadi select dengan opsi "Kota lain (ketik)" untuk fallback.

**D3. Whole-word matching** di query: ganti `.ilike("address", "%city%")` jadi pattern yang lebih ketat — `.or("address.ilike.% city %,address.ilike.%, city%,address.ilike.city %")` — atau lebih bersih: tambah index `to_tsvector(address)` lalu pakai full-text (opsional, butuh migration).

Untuk sekarang **D3 cukup tighten pattern** (`% city%` dgn leading space) — tidak butuh migration.

### Batch E — Polish (P2, opsional, bisa dilewati)

- **E1**: Sort `relevan` → boost `rating_avg desc` + tie-break `total_sold desc` supaya beda dari `rating`.
- **E2**: Hapus opsi `rating` (duplikat) atau rename `relevan` jadi "Rekomendasi".

---

## Urutan Eksekusi yang Saya Usulkan

1. **Batch A (P0)** — wajib, langsung perbaiki bug yang sudah live.
2. **Batch B (P1)** — quick win, user akhirnya lihat efek admin Star.
3. **Batch C (P1)** — SEO, hemat 1 turn.
4. **Batch D (P1)** — perlu file baru (`src/lib/cities.ts`) + sedikit refactor UI.
5. **Batch E** — skip dulu, lanjut ke Fase berikutnya.

Tidak ada migration database di semua batch.

---

## Pertanyaan untuk Konfirmasi

1. Setuju strategi **two-pass + client-side stable-sort** untuk featured boost (A1)? Atau prefer skip boost di produk dan cuma di toko saja (lebih simpel)?
2. Drop `/s/{slug}` dari sitemap (A2) — Anda ingin storefront tetap discoverable lewat sitemap untuk tujuan tertentu (mis. landing share-link)?
3. Batch D city allow-list: 10 kota sekarang cukup, atau perlu ditambah (Pekanbaru, Banjarmasin, Manado, dll)?

Setelah Anda konfirmasi (atau bilang "lanjut semua"), saya kerjakan A → B → C → D berurutan.

## I.5 — Audit & perbaikan pasca I.2–I.4 ✅ SELESAI

### Bug fix (P0)

- **Featured boost produk** — `.order("is_featured", { foreignTable: "shop" })` di-hapus dari `buildProductQuery` (search.tsx) karena PostgREST opsi `foreignTable` hanya mengurut embedded rows, BUKAN parent. Ganti dengan stable-partition client-side: produk dari toko `shop.is_featured` naik ke atas setelah fetch (`applyFeaturedBoostProducts`). Sama untuk shops (`applyFeaturedBoostShops`) sebagai safety net. Pola identik di `kategori.$slug.tsx` & `kategori.$slug.$city.tsx`.
- **Duplicate-content sitemap** — `routes/sitemap[.]xml.ts` tidak lagi emit `/s/{slug}`. Hanya `/toko/{slug}` yang kanonik. `s.$slug.tsx` sekarang punya `head().links` `<link rel="canonical" href="/toko/{slug}">`.

### UX / SEO polish (P1)

- **Badge "★ Unggulan"** dirender di ShopCard `/search`, `/kategori/$slug`, `/kategori/$slug/$city` (Star icon amber, di sebelah nama).
- **JSON-LD `BreadcrumbList`** ditambahkan di `kategori.$slug.tsx` head() (Kategori → {nama}).
- **City filter hardening** — modul baru `src/lib/cities.ts` ekspos `CITIES` allow-list (15 kota) + helper `cityIlikeOr(city, column)` yang generate pattern `.or()` whole-word-ish (`% city`, `city %`, `, city`, dst) — hindari false positive "Solo" ↔ "Solok". Dipakai di sitemap, search.tsx (produk & toko), `kategori.$slug.$city.tsx`. Quick Filter di `kategori.$slug.tsx` jadi `<Select>` dari `CITIES` (bukan free-text lagi).

### Tidak ada migration DB.
