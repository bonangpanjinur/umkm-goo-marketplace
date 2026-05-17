## Tujuan

1. **UX upload gambar**: ganti semua `Input` URL gambar dengan komponen upload (drag & drop, preview, hapus). Tetap menerima URL eksternal sebagai opsi fallback.
2. **Navigasi POS benar-benar sesuai kategori bisnis**: menu yang tidak relevan dengan kategori toko **tidak muncul sama sekali** — bukan sekadar disembunyikan secara longgar.
3. **Memperbaiki matriks kapabilitas** semua 11 kategori + memperbarui PRD agar menjadi single source of truth.

---

## Bagian A — Komponen upload gambar reusable

### A1. `UploadableImage` (baru, `src/components/UploadableImage.tsx`)

Wrapper di atas `ImageDropzone` yang sudah ada. Props:

- `value: string | null` (URL saat ini)
- `bucket: string` + `pathPrefix: string`
- `onChange(url: string | null)`
- `allowExternalUrl?: boolean` (default `true`) — toggle untuk paste URL eksternal
- `aspect?: "square"|"video"|"wide"` (preview ratio)

Alur:
1. User drop/pilih file → validasi `validateImageUpload` (sudah ada).
2. Upload ke `supabase.storage.from(bucket).upload(path, file, { upsert:false })`.
3. Ambil `getPublicUrl` → `onChange(url)`.
4. Preview dengan tombol "Ganti" & "Hapus".
5. Tab kecil "URL eksternal" (collapsible) untuk paste link manual jika `allowExternalUrl`.

### A2. Buckets storage + RLS (migration)

Buat bucket publik (jika belum ada): `shop-images`, `admin-banners`, `platform-assets`, `umroh-covers`, `custom-order-refs`. Policy:
- `SELECT`: public.
- `INSERT/UPDATE/DELETE`: hanya user yang owner shop (atau super admin untuk `admin-banners`/`platform-assets`) — cek via `has_role` / `shops.owner_id`.

### A3. Refactor pemakaian

Ganti `Input placeholder="https://..."` di route berikut menjadi `<UploadableImage>`:

- `pos-app.combo-builder.tsx`, `pos-app.lookbook.tsx`, `pos-app.limited-editions.tsx`,
  `pos-app.wip-gallery.tsx`, `pos-app.portfolio.tsx`, `pos-app.umroh-packages.tsx`,
  `pos-app.flyers.tsx`, `pos-app.testimonials.tsx`, `pos-app.storefront-builder.tsx`,
  `pos-app.verified-claims.tsx` (evidence), `pos-app.studio-delivery.tsx` (cover),
  `toko.$slug.custom-order.tsx` (referensi pembeli — pakai bucket `custom-order-refs`),
  `admin.banners.tsx`, `admin.platform-billing.tsx` (QRIS).

Field non-gambar (webhook URL, redirect URL, link Google Drive file digital) **tetap text input** — bukan ranah upload gambar.

---

## Bagian B — Strict nav gating per kategori

### B1. Hapus mapping ganda di `pos-app.tsx`

Saat ini setiap `NavItem` punya `onlyFor` (legacy, longgar) **dan** `requires` (kapabilitas). Sumber kebenaran tunggal seharusnya **`requires` + `v_shop_capabilities`**. Yang dilakukan:

- Hapus konstanta `HAS_POS`, `FNB`, `SVC`, `FASHION`, `PHYSICAL`, dst.
- Hapus prop `onlyFor` dari `NavItem`.
- Setiap item yang dulunya pakai `onlyFor` sekarang **wajib** punya `requires: FeatureKey[]`. Item universal (Dashboard, Pesanan, Keuangan, Settings, KYC, Notifikasi) tanpa `requires`.
- Filter render: tampilkan item bila `caps.hasAll(item.requires)` (atau item tanpa `requires`).
- Tetap pakai `subtypeOnly` untuk membedakan `travel` umroh vs sales umum.

### B2. Auto-collapse grup kosong

Jika seluruh `items` dalam satu `NavGroup` ter-filter habis → grup tidak dirender (sudah ada parsial, dipastikan konsisten).

### B3. Page-level guard

Pasang `<CategoryGuard requires={[...]}>` (komponen sudah ada di `src/components/CategoryGuard.tsx`) di semua route vertikal: `pos-app.rental-*`, `pos-app.anamnesis`, `pos-app.medical-invoice`, `pos-app.patient-records`, `pos-app.umroh-*`, `pos-app.studio-*`, `pos-app.portfolio`, `pos-app.kursus`, `pos-app.digital*`, `pos-app.custom-orders`, `pos-app.custom-order-quotes`, `pos-app.milestones`, `pos-app.contracts`, `pos-app.job-deliverables`, `pos-app.kds`, `pos-app.kitchen-load`, `pos-app.tables`, `pos-app.table-qr`, `pos-app.recipes`, `pos-app.combo-builder`, `pos-app.size-guide`, `pos-app.lookbook`, `pos-app.limited-editions`, `pos-app.wip-gallery`, `pos-app.certificates`, `pos-app.antrian`, `pos-app.waitlist`, `pos-app.booking*`, `pos-app.followup-reminders`, `pos-app.service-bundles`, `pos-app.leads`, `pos-app.flyers`, `pos-app.testimonials`, `pos-app.about-page`.

---

## Bagian C — Koreksi matriks kapabilitas 11 kategori

Migration data (UPDATE `business_categories.enabled_features`). Perubahan kunci:

| Kategori | Tambah | Hapus |
|---|---|---|
| **fnb** | `LIMITED_EDITIONS`, `PRE_ORDERS`, `CUSTOM_ORDER`, `CUSTOM_ORDER_QUOTES`, `LOOKBOOK` (untuk menu siap-saji?) → **tidak**, hanya `LIMITED_EDITIONS`, `PRE_ORDERS`, `CUSTOM_ORDER`, `CUSTOM_ORDER_QUOTES`, `FOLLOWUP_REMINDERS`, `WAITLIST` | `BOOKING` (gunakan `RESERVASI` saja untuk meja) |
| **retail** | `BUNDLES` (sudah), `LIMITED_EDITIONS` (sudah), tambah `PORTFOLIO` opsional? — **tidak**. Tambah `PRE_ORDERS` | — |
| **jasa** | `PORTFOLIO`, `CUSTOM_ORDER`, `CUSTOM_ORDER_QUOTES` | — |
| **rental** | `LEADS`, `TESTIMONIALS`, `PORTFOLIO` | — |
| **kursus** | `LEADS`, `TESTIMONIALS`, `PORTFOLIO` | `BOOKING` (default offline kursus pakai jadwal sendiri; bisa di-enable per shop) |
| **salon** | `PORTFOLIO`, `LOOKBOOK` | — |
| **klinik** | `LEADS` (untuk konsultasi pra-medis), `RESERVASI` | — |
| **studio-foto** | `LEADS`, `TESTIMONIALS`, `FLYERS` | — |
| **travel** | `RESERVASI` (paket trip), `STAFF_PICKER` (tour leader) | `BOOKING` (gunakan `LEADS` + `UMROH_PACKAGES` alur kuotasi, bukan kalender sesi) |
| **custom-order** | `PORTFOLIO`, `LEADS`, `TESTIMONIALS`, `FLYERS` | — |
| **lainnya** | (tetap superset) | — |

Catatan: angka definitif dirapikan saat implementasi; perubahan di atas dianggap proposal — implementasi pakai 1 migration UPDATE per kategori.

---

## Bagian D — Update PRD

Edit `PRD_MARKETPLACE.md`:

1. **§0.7.1 Capability Matrix**: tulis ulang tabel agar 1:1 dengan hasil migration C. Tambah kolom "Subtype yang relevan".
2. **§17 Logika Kategori Dinamis**: catat aturan baru — *"Sumber kebenaran tunggal navigasi POS adalah `v_shop_capabilities`. NavItem tanpa key wajib bersifat universal; selain itu wajib `requires: FeatureKey[]`. `onlyFor` dideprek."*
3. **§15 POS Panel per Tipe Bisnis**: per kategori, daftar menu sidebar yang muncul (di-generate dari matriks C). Hapus referensi `HAS_POS`, `FNB`, dst.
4. **§14**: tambah subseksi "Upload gambar standar" — semua field gambar pakai `UploadableImage`, daftar bucket & policy.

---

## File yang akan disentuh

**Baru**: `src/components/UploadableImage.tsx`, 1 migration `*_upload_buckets.sql`, 1 migration `*_category_features_v2.sql`.

**Diedit**: `src/routes/pos-app.tsx` (gating refactor), ~14 file route untuk upload, ~30+ file route vertikal untuk `<CategoryGuard>`, `PRD_MARKETPLACE.md`, `src/lib/feature-keys.ts` (jika perlu menambah label baru).

**Tidak disentuh**: `client.ts`, `types.ts`, file payment/checkout, RLS schema tabel produk.

---

## Risiko & catatan

- Menghapus `onlyFor` mengandalkan kelengkapan `enabled_features`; jika ada kategori belum di-seed feature key tertentu, menu menghilang. Mitigasi: jalankan migration C dulu, lalu refactor pos-app.tsx, lalu uji per kategori.
- Toko existing yang sudah pakai `feature_overrides` tetap berjalan (view `v_shop_capabilities` sudah handle union/diff).
- Untuk field upload yang berisi data legacy (URL eksternal), `UploadableImage` tetap menampilkan preview dari URL apapun → migrasi data tidak diperlukan.