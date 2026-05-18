# Rencana: Audit Sisa + Konsolidasi SQL Fresh

## Bagian 1 — Analisis sisa yang perlu diperbaiki

Setelah I.2–I.5b selesai, ini yang masih tertinggal (sengaja di-skip atau baru ketahuan):

### 🟡 P1 — Konsistensi & UX

1. **Badge "Unggulan" di ProductCard belum dipasang** (B2 di audit lama). `is_featured` sudah ikut di payload produk lewat join `shop`, tapi `ProductCard` (di `routes/index.tsx`) belum render badge — admin tidak lihat dampak Star toggle pada level produk.
2. **3 route duplikasi logika `applyFeaturedBoost*` + fetch featured set** (`search.tsx`, `kategori.$slug.tsx`, `kategori.$slug.$city.tsx`). Risiko drift saat aturan boost berubah. Ekstrak ke `src/lib/featured-boost.ts`.
3. **CityCombobox tanpa offline/error feedback** — jika `dev.farizdotid.com` down dan cache kosong, user diam-diam dapat fallback 15 kota tanpa indikator. Tambah `error` state di hook + toast halus sekali per sesi.
4. **`s.$slug.tsx` canonical statis ke `/toko/{slug}`** — bagus untuk SEO, tapi storefront yang sudah pakai custom domain (`shops.custom_domain`) seharusnya canonical ke domain itu, bukan ke marketplace. Cek dulu domain → fallback ke `/toko/`.

### 🟢 P2 — Polish

5. **Sort `relevan` vs `rating` masih identik** (E1 lama, di-skip). Quick fix: `relevan` = `rating_avg desc` + tie-break `total_sold desc, created_at desc`; `rating` murni `rating_avg desc`.
6. **Sitemap belum punya `<image:image>`** untuk landing kategori×kota — opsional, tambah kalau mau Google Image traffic.
7. **`kategori.$slug.$city.tsx` belum pakai `CityCombobox`** (UI kota di halaman city-specific) — saat ini tidak ada switcher kota di sana. Tambah link "Ganti kota" → `/kategori/{slug}` dengan combobox.

### 🔵 Tidak ada P0 baru yang ditemukan.

---

## Bagian 2 — Konsolidasi SQL jadi 1 file fresh

### Kondisi sekarang

- 126 file di `supabase/migrations/` (rentang `20260512` → `20260517`, plus banyak file ad-hoc tanpa timestamp seperti `fase3_bundle.sql`, `m05_booking_vouchers.sql`).
- Database hidup berisi: **163 tabel**, **115 function**, **385 RLS policy**, **119 trigger**, **15 enum** di schema `public`.
- Penamaan campuran (timestamp Lovable + manual) bikin urutan apply ambigu kalau di-replay di project baru.

### Strategi: dump dari DB hidup → 1 file kanonik

Pakai `pg_dump --schema-only` dari instance Supabase yang sekarang sebagai **single source of truth** (lebih akurat daripada concat 126 file — banyak yang saling overwrite).

Output: **satu file** `supabase/migrations/00000000000000_init_schema.sql` berisi semua DDL dalam urutan yang valid.

### Langkah eksekusi

**1. Dump skema penuh (read-only, aman).**
```bash
pg_dump \
  --schema-only \
  --no-owner --no-privileges --no-comments \
  --schema=public \
  --exclude-table='supabase_migrations.*' \
  --file=/tmp/schema_raw.sql
```

**2. Dump data seed kritis** (tabel referensi yang harus ada di project baru, bukan data user):
- `business_categories`, `plans`, `plan_features`, `features`, `plan_themes`
- `icd10_codes`, `themes`, `platform_settings`, `wallet_topup_presets`
- `expiry_reminder_rules`, `delivery_zones` (kalau global)

```bash
pg_dump --data-only --inserts \
  --table=public.business_categories \
  --table=public.plans \
  ... \
  --file=/tmp/seed_data.sql
```

**3. Susun ulang ke satu file dengan section yang jelas:**
```
00000000000000_init_schema.sql
├── -- ============ EXTENSIONS ============
├── -- ============ ENUMS (15) ============
├── -- ============ FUNCTIONS (helpers dulu: has_role, update_updated_at_column, dll) ============
├── -- ============ TABLES (163) + INDEXES ============
├── -- ============ VIEWS (menu_hpp_view, v_shop_capabilities, courier_earnings) ============
├── -- ============ TRIGGERS (119) ============
├── -- ============ RLS ENABLE + POLICIES (385) ============
├── -- ============ STORAGE BUCKETS & POLICIES ============
├── -- ============ REALTIME PUBLICATION ============
└── -- ============ SEED DATA (reference tables) ============
```

**4. Arsipkan 126 file lama.**
- Pindah ke `supabase/migrations/_archive_pre_consolidation/`.
- Tambah `README.md` di folder itu yang menjelaskan tanggal konsolidasi & alasan.
- Folder `_archive_*` di-ignore Supabase CLI karena tidak match pattern timestamp standar — tapi tetap di repo untuk audit historis.

**5. Verifikasi roundtrip:**
- Buat database test kosong lokal (atau pakai `supabase db reset` di project terpisah).
- Apply file baru → bandingkan `pg_dump --schema-only` hasil vs dump asli (diff harus kosong / hanya whitespace).

### Hal yang akan saya jaga di file hasil

- **Urutan dependency**: ekstensi → enum → fungsi helper (`has_role`, `update_updated_at_column`) → tabel sesuai FK graph → trigger → policy. `pg_dump` sudah handle ini, saya cuma re-segment dengan komentar.
- **`auth.users` tidak di-dump** (Supabase yang manage). FK ke `auth.users(id)` dipertahankan apa adanya.
- **`storage.objects` policies**: dump terpisah dari schema `storage`, append ke section storage.
- **Realtime**: dump `ALTER PUBLICATION supabase_realtime ADD TABLE ...` untuk tabel yang sudah di-enable (akan saya query dari `pg_publication_tables`).
- **`security definer` & `search_path`**: pg_dump mempertahankan ini untuk fungsi — kritis untuk RLS jangan sampai hilang.

### Risiko & catatan

- **Destruktif untuk history Supabase CLI**: tabel `supabase_migrations.schema_migrations` di Cloud sudah berisi 126 entry. File baru `00000000000000_init_schema.sql` akan punya timestamp lebih awal → CLI nganggap "belum diapply" dan akan coba apply ulang → konflik (tabel sudah ada).
  - **Solusi A (rekomendasi)**: file baru hanya untuk **bootstrap project baru / fresh clone**. Tidak di-apply ke Cloud yang sekarang. Tambah comment besar di header file: `-- FRESH BOOTSTRAP ONLY — DO NOT APPLY TO EXISTING CLOUD`.
  - **Solusi B**: setelah file dibuat, manual `INSERT INTO supabase_migrations.schema_migrations(version) VALUES('00000000000000')` di Cloud supaya CLI skip. Tapi 126 entry lama tetap di-record → tidak betul-betul "bersih".
- **Generated columns & defaults yang pakai fungsi custom**: pg_dump kadang reorder. Saya akan manual cek section function ada di atas section table yang refer ke fungsi tsb.
- **Tidak akan ada data user** di file ini (orders, products, dll) — hanya schema + reference seed.

---

## Yang perlu Anda konfirmasi

1. **Untuk Bagian 1**: kerjakan semua P1 (1–4) + P2 (5)? Atau cherry-pick?
2. **Untuk Bagian 2**: pilih **Solusi A** (file bootstrap untuk fresh clone, Cloud sekarang biarkan) atau **Solusi B** (paksa Cloud sekarang juga "anggap sudah diapply")?
3. **Seed data**: konfirmasi 8 tabel referensi di atas, atau ada yang perlu ditambah/dikurangi?
4. **Urutan kerja**: SQL konsolidasi dulu (besar, 1 turn fokus) lalu fixes P1, atau sebaliknya?

---

## I.6 — Konsolidasi SQL + perbaikan pasca-I.5b ✅ SELESAI

### Konsolidasi SQL (Bagian 2)

- File kanonik: `supabase/migrations/00000000000000_init_schema.sql` (~588 KB, ~18.1k baris).
  - Sumber: `pg_dump --schema-only` dari Cloud sekarang (single source of truth).
  - Isi: 15 enum, 115 function, 163 tabel, 119 trigger, 385 RLS policy, 23 storage bucket, 69 storage policy, seed 10 tabel referensi.
  - Header berisi peringatan: **FRESH BOOTSTRAP ONLY — DO NOT APPLY TO EXISTING CLOUD**.
- 126 file lama dipindah ke `supabase/migrations/_archive_pre_consolidation/` + `README.md` penjelasan.
- Folder `_archive_*` tidak di-pick-up Supabase CLI (bukan pola timestamp standar).

### Perbaikan pasca-audit (Bagian 1)

- **P1.1 Badge "Unggulan" di ProductCard** — `index.tsx` ProductCard render `★ Unggulan` (amber) saat `product.shop?.is_featured`. Type `Product.shop.is_featured` ditambah; home page menu_items query ikut select `shop(is_featured)`.
- **P1.2 Helper bersama** — `src/lib/featured-boost.ts` ekspor `applyFeaturedBoostShops` & `applyFeaturedBoostProducts`. 3 route (`search.tsx`, `kategori.$slug.tsx`, `kategori.$slug.$city.tsx`) tidak lagi duplikat logika.
- **P1.3 CityCombobox offline feedback** — `useIndonesiaCities()` sekarang return `usingFallback`. Combobox tampilkan banner amber "Daftar kota lengkap tidak bisa dimuat" saat API down & jatuh ke 15 kota statik.
- **P1.4 Canonical custom domain** — `s.$slug.tsx` `head()` cek `shop.custom_domain` + `custom_domain_verified_at` dari loaderData; canonical → `https://{domain}/` jika ada, fallback `/toko/{slug}`.
- **P2.5 Sort `relevan` vs `rating` beda** — `search.tsx` `buildProductQuery`: `relevan` = `rating_avg desc → total_sold desc → created_at desc`; `rating` murni `rating_avg desc`.

### Tidak ada migration DB di batch ini (semua frontend + 1 file SQL bootstrap).
