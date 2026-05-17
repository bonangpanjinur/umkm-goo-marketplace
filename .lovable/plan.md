# Lanjutan Refactor: Capability-Based Gating

Melanjutkan dari fase sebelumnya (migration `flow_types` + `enabled_features`, view `v_shop_capabilities`, hook `useShopCapabilities`, dan perbaikan `deriveCategoryType`). Sekarang kita rapikan sisa permukaan yang masih bocor antar-kategori.

## Yang akan dikerjakan

### 1. Lengkapi `requires` di nav `pos-app.tsx`
Tambahkan `requires: FeatureKey[]` untuk semua item nav vertikal sehingga sidebar hanya menampilkan menu yang relevan dengan kategori toko:

- **F&B**: `KDS` → Kitchen Display, `TABLES` → Meja, `RECIPES` → Resep
- **Retail/Grosir**: `INVENTORY`, `PURCHASE_ORDERS`
- **Rental**: `RENTAL`, `DEPOSIT`, `FINES`, `CHECKLIST`
- **Klinik/Medical**: `ANAMNESIS`, `PATIENTS`, `PRESCRIPTIONS`
- **Studio Foto**: `STUDIO_BOOKING`, `STUDIO_PACKAGES`
- **Travel/Umroh**: `UMROH_PACKAGES`, `LEADS`, `MANIFEST`
- **Kursus**: `CLASSES`, `ENROLLMENTS`, `ATTENDANCE`
- **Jasa/Custom Order**: `CUSTOM_ORDER`, `QUOTES`

Item universal (Dashboard, Orders, Customers, Reports, Settings, Staff, Flyers) tetap tanpa `requires`.

### 2. Page-level guard dengan `<CategoryGuard/>`
Bungkus route vertikal yang sudah ada agar user yang membuka URL langsung (deep link) tetap diblok jika kategori tokonya tidak punya capability:

```text
rental-*           → requires: ["RENTAL"]
anamnesis, prescriptions → ["ANAMNESIS"]
studio-*           → ["STUDIO_BOOKING"]
umroh-*, manifest  → ["UMROH_PACKAGES"]
kursus, classes    → ["CLASSES"]
custom-orders      → ["CUSTOM_ORDER"]
kds, tables, recipes → masing-masing capability F&B
```

Komponen fallback menampilkan pesan "Fitur ini tidak tersedia untuk kategori usaha Anda" + tombol kembali ke dashboard.

### 3. Onboarding step 2 — capability preview
Setelah user pilih kategori, tampilkan ringkasan fitur yang akan aktif (dibaca dari `business_categories.enabled_features` + `flow_types`) sebagai badge list, misal:
- "✓ POS Kasir  ✓ Kitchen Display  ✓ Manajemen Meja  ✓ Resep & HPP"

Tujuan: user paham apa yang dia dapat sebelum lanjut, dan terlihat berbeda antar kategori.

### 4. Checkout flow router (`pickCheckoutFlow`)
Buat helper `src/lib/checkout-router.ts` yang menentukan rute checkout berdasarkan capability + isi cart:
- cart berisi booking session → `/checkout` (deposit flow Midtrans)
- cart berisi rental item → `/checkout` dengan jaminan/deposit
- cart berisi custom-order request → `/toko/$slug/custom-order`
- default (F&B/retail) → `/checkout` normal

### 5. Update PRD
Tambah seksi "§0.7.1 Capability Matrix" di `PRD_MARKETPLACE.md` yang mendokumentasikan:
- mapping 11 kategori → `flow_types` + `enabled_features`
- aturan: nav & route digate via `useShopCapabilities`, bukan slug string
- cara extend: tambah row di `business_categories`, isi `enabled_features`, lalu route otomatis muncul jika sudah pakai `requires`

### 6. Bersihkan `use-business-category.ts`
Ubah jadi thin wrapper di atas `useShopCapabilities` (back-compat) + tandai `@deprecated`, supaya call-site lama tidak pecah dan bisa dimigrasikan bertahap.

## Detail Teknis

- File baru: `src/lib/checkout-router.ts`
- File diedit: `src/routes/pos-app.tsx` (nav requires), `src/routes/onboarding.tsx` (capability preview), `src/lib/use-business-category.ts` (deprecate), `PRD_MARKETPLACE.md`
- File dibungkus `<CategoryGuard>`: semua route vertikal di `src/routes/pos-app.*` (rental, anamnesis, studio, umroh, kursus, custom-order, kds, tables, recipes)
- Tidak ada migration baru — semua sudah ada dari fase sebelumnya
- Tidak menyentuh storefront `/toko/$slug` kecuali checkout router

## Di luar scope
- Tidak menambah kategori baru
- Tidak mengubah skema booking/rental/anamnesis
- Tidak refactor storefront theming
