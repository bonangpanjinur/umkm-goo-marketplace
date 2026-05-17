## 1. Berapa kategori sebenarnya?

**11 kategori aktif** di `business_categories` (sudah ter-seed di Fase 2):

| # | Slug | Nama | Tipe alur dominan (per PRD §0.7) |
|---|------|------|----------------------------------|
| 1 | `fnb` | F&B / Kuliner | T1 + (opsi T3 reservasi meja) |
| 2 | `retail` | Retail / Toko | T1 |
| 3 | `jasa` | Jasa Umum | T3 |
| 4 | `rental` | Rental | T4 |
| 5 | `kursus` | Kursus / Edukasi | T2 (online) / T3 (offline) |
| 6 | `salon` | Salon / Beauty | T3 |
| 7 | `klinik` | Klinik / Medis | T3 |
| 8 | `studio-foto` | Studio Foto | T3 + T2 (file hasil) |
| 9 | `travel` | Travel / Umroh | T3 (paket tur) |
| 10 | `custom-order` | Custom Order | T5 |
| 11 | `lainnya` | Lainnya | fallback semua |

## 2. Masalah inti yang ditemukan

Ada **tiga "sumber kebenaran" yang tidak sinkron** — itu sebabnya toko Travel disuguhi menu F&B:

**A. `pos-app.tsx` → `deriveCategoryType()`** memetakan slug DB ke "tipe lawas" via regex hardcoded. Hasilnya: 5 dari 11 slug **tidak ter-match** dan jatuh ke `general` (yang diperlakukan sebagai `HAS_POS` = dapat menu, stok, varian, kasir, dst.):

| Slug DB | Hasil derive | Status |
|---|---|---|
| `fnb`, `salon`, `jasa` | benar | ✅ |
| `retail` | `general` | ⚠️ jalan tapi tak punya identitas |
| `rental`, `kursus`, `klinik`, `studio-foto`, `travel`, `custom-order` | `general` | ❌ **Travel/Klinik/Rental dapat menu F&B** |

**B. `src/lib/use-business-category.ts`** mendefinisikan slug fiktif (`studio`, `umroh`, `medical`, `laundry`, `automotive`, `education`) yang **tidak pernah ada di DB**. Hook gating sekunder ini selalu miss.

**C. PRD §0.7** sudah punya matriks 5 tipe alur (T1 fisik, T2 digital, T3 booking sesi, T4 rental, T5 pre-order/custom), tapi matriks itu **belum dikodifikasi** ke kolom DB manapun. `enabled_features` di `business_categories` ada tapi kosong/tidak dipakai oleh nav.

## 3. Alur yang seharusnya (target)

Single source of truth: **`business_categories.flow_types` + `business_categories.enabled_features`**. Sisanya hanya membaca dari sini.

```text
Onboarding pilih kategori
        │
        ▼
   shops.business_category_id ──► business_categories
                                       ├── flow_types: text[]   (T1..T5)
                                       ├── enabled_features:    (POS, KDS, RENTAL, BOOKING, DIGITAL, CUSTOM_ORDER, ...)
                                       └── booking_type:        (session | rental | both | none)
        │
        ▼
   useShopCapabilities(shopId)  ◄── satu hook, satu DB read
        │
        ├──► pos-app nav: filter item via feature flag
        ├──► storefront: pilih komponen Home per kategori (sales-pro/umroh sudah ada)
        ├──► checkout: pilih alur (cart → / booking → / custom-order form →)
        └──► onboarding setup checklist: tugas per kategori
```

Mapping target per kategori (yang akan di-seed):

| Slug | flow_types | enabled_features (kunci) |
|---|---|---|
| fnb | T1, (T3) | POS, KDS, MENU, TABLES, INVENTORY, RECIPES |
| retail | T1 | POS, MENU, INVENTORY, VARIANTS, SIZE_GUIDE |
| jasa | T3 | BOOKING, STAFF_PICKER, SERVICE_BUNDLES |
| rental | T4 | RENTAL, DEPOSIT, FINES, CHECKLIST, TNC |
| kursus | T2, T3 | DIGITAL, KURSUS, LICENSES (T2); BOOKING (T3 offline) |
| salon | T3 | BOOKING, STAFF_PICKER, FOLLOWUP_REMINDERS, ANTRIAN |
| klinik | T3 | BOOKING, ANAMNESIS, MEDICAL_INVOICE, ANTRIAN, PATIENT_RECORDS |
| studio-foto | T3, T2 | BOOKING, PORTFOLIO, STUDIO_PACKAGES, STUDIO_DELIVERY |
| travel | T3 | BOOKING, UMROH_PACKAGES, FLYERS, LEADS, ABOUT_PAGE |
| custom-order | T5 | CUSTOM_ORDER, QUOTES, MILESTONES, CONTRACTS |
| lainnya | T1, T3, T5 | (semua, opt-in via owner setting) |

## 4. Perubahan backend (migration)

1. Tambah kolom di `business_categories`:
   - `flow_types text[] NOT NULL DEFAULT '{}'` — nilai dibatasi `T1|T2|T3|T4|T5` via trigger validasi (bukan CHECK, sesuai aturan project).
   - Pastikan `enabled_features text[]` terisi penuh dengan kode fitur kanonik (saat ini kosong).
2. **Seed 11 kategori** dengan `flow_types` + `enabled_features` sesuai tabel di atas (lewat `supabase--insert` `UPDATE`).
3. Tambahkan VIEW `v_shop_capabilities` yang return per-shop: `flow_types`, `enabled_features` gabungan (kategori + override `shops.feature_overrides jsonb` opsional), `booking_type`, `business_subtype`. Hindari pembacaan join berulang di client.
4. RLS: `business_categories` sudah publik-read; tidak ada perubahan policy.
5. Tidak ada perubahan pada tabel order/booking/rental — hanya nav gating yang berubah.

## 5. Perubahan frontend

1. **Ganti `deriveCategoryType()`** (pos-app.tsx) dengan hook `useShopCapabilities()` baru di `src/lib/use-shop-capabilities.ts` yang membaca `v_shop_capabilities`. Hapus regex slug.
2. **Refactor `NavItem`**: `onlyFor: string[]` (tipe) → `requires: FeatureKey[]` (fitur). Helper `nav.visibleFor(caps)` mengecek `caps.enabled_features` mengandung semua `requires`. Sub-type tetap (`subtypeOnly`) untuk umroh/sales.
3. **Mapping nav → fitur** dilakukan satu kali: tiap item di `NAV_GROUPS` diganti `onlyFor: HAS_POS` → `requires: ["POS"]`, dst. Daftar lengkap dihasilkan dari item nav sekarang (≈ 60 item).
4. **Perbaiki `src/lib/use-business-category.ts`**: jadikan deprecated/thin wrapper di atas `useShopCapabilities` atau hapus. Buang slug fiktif (`studio`, `umroh`, `medical`, dll.) yang tak match DB.
5. **Onboarding (step 2)**: setelah pilih kategori, tampilkan ringkasan _"Toko Anda akan punya: Booking Sesi, Portfolio, Paket Foto"_ (di-derive dari `flow_types` + `enabled_features`) supaya owner tahu apa yang aktif sebelum lanjut.
6. **Storefront**: komponen Home dipilih berdasarkan `flow_types` dominan, bukan slug. `themes/registry.tsx` sudah punya `umroh` & `sales-pro` Home — tambahkan mapping per kategori baru di iterasi berikutnya (di luar plan ini).
7. **Routing checkout**: helper `pickCheckoutFlow(caps, cartItems)`:
   - item booking sesi → `/checkout` (booking flow)
   - item rental → `/checkout` (rental flow)
   - item custom-order → `/toko/$slug/custom-order`
   - lainnya → cart standar
8. **Page-level guard**: route pos-app yang vertikal (rental-*, anamnesis, studio-*, umroh-*, kursus, custom-orders) tambahkan `if (!caps.has("RENTAL")) return <NotAvailableForCategory/>` sehingga tidak hanya nav yang disembunyikan, tapi URL langsung juga ditolak.

## 6. Urutan eksekusi (incremental, low-risk)

1. **Migration**: tambah kolom `flow_types`, isi `enabled_features` kanonik (1 migration + 1 insert/update seed). Tanpa breaking change.
2. **View `v_shop_capabilities`** + hook `useShopCapabilities`.
3. **Refactor `pos-app.tsx`** nav gating ke `requires` (file besar tapi mekanis — 1 PR, bisa di-review per group).
4. **Hapus `use-business-category.ts` lama** atau ubah jadi adapter.
5. **Onboarding ringkasan kapabilitas** + **page guards**.
6. **PRD update**: §0.8 ditandai _Selesai (implementasi)_, tambah dokumentasi `FeatureKey`.

## 7. Yang TIDAK termasuk

- Tidak refactor storefront/themes per kategori (di luar scope, tetap di backlog).
- Tidak menambah kategori baru — 11 yang ada cukup; bila perlu, owner pakai `lainnya` + override fitur.
- Tidak mengubah skema booking/rental/custom-order yang sudah jalan.

---

**Hasil akhir:** owner Travel/Klinik/Rental/Custom Order tidak lagi melihat menu, KDS, varian, kasir F&B; pos-app, storefront, checkout, dan onboarding semuanya membaca dari satu sumber (`business_categories` + override per-shop), sehingga konsisten end-to-end.