# Rencana: Tema Storefront per Kategori Bisnis

## 1. Kategori bisnis aktif (dari `business_categories`)

| # | Slug | Nama |
|---|------|------|
| 1 | `fnb` | F&B / Kuliner |
| 2 | `retail` | Retail / Toko |
| 3 | `jasa` | Jasa Umum |
| 4 | `rental` | Rental |
| 5 | `kursus` | Kursus / Edukasi |
| 6 | `salon` | Salon / Beauty |
| 7 | `klinik` | Klinik / Medis |
| 8 | `studio-foto` | Studio Foto |
| 9 | `travel` | Travel / Umroh |
| 10 | `custom-order` | Custom Order |
| 11 | `lainnya` | Lainnya |

> Catatan: "sales mobil / motor" saat ini masuk ke kategori **Rental** (untuk sewa) atau **Retail** (untuk jual). Bila Anda ingin kategori terpisah "Otomotif / Dealer", saya bisa tambahkan sebagai kategori baru — sebutkan di komentar plan.

## 2. Tema baru — satu per kategori

Setiap tema = `key`, `name`, `component_id`, ringkasan visual, dan komponen Home React yang akan dibuat.

| Kategori | Theme key | Nama tampilan | Vibe visual |
|---|---|---|---|
| fnb | `kuliner-warm` | Kuliner Hangat | Coklat hangat, foto hidangan besar, menu grid kartu, badge "Halal/Best Seller" |
| retail | `retail-bold` | Retail Bold | Hitam-putih + aksen merah, hero produk hero, grid katalog 3-kolom + filter |
| jasa | `service-clean` | Service Clean | Biru navy + putih, hero "Pesan Sekarang", daftar layanan + testimoni |
| rental | `rental-drive` | Rental Drive | Hitam metalik + kuning, kartu unit dengan harga/hari, kalender ketersediaan |
| kursus | `edu-bright` | Edu Bright | Indigo + kuning, hero CTA enroll, kartu kursus dengan progress + instruktur |
| salon | `beauty-soft` | Beauty Soft | Pink pastel, look-book mosaic, ikon staf, tombol booking sticky |
| klinik | `medic-trust` | Medic Trust | Hijau toska + putih, jadwal dokter, blok "Buat janji", trust badge |
| studio-foto | `studio-mono` | Studio Mono | Monokrom, gallery masonry full-bleed, paket foto, before/after slider |
| travel | `umroh` *(reuse)* | Travel & Umroh | Hijau emas (sudah ada) — diperluas untuk paket travel umum |
| custom-order | `craft-paper` | Craft Paper | Kraft beige + serif, WIP gallery, form custom-order, milestone strip |
| lainnya | `classic` *(reuse)* | Klasik Serbaguna | Default existing |

Total: **9 tema baru** + 2 reuse (`umroh`, `classic`).

## 3. Perubahan implementasi

### a. File komponen tema baru
Buat di `artifacts/kopihub/src/components/storefront/themes/<key>/Home.tsx`:
`kuliner-warm`, `retail-bold`, `service-clean`, `rental-drive`, `edu-bright`, `beauty-soft`, `medic-trust`, `studio-mono`, `craft-paper`.
Tiap Home memakai props `ThemeHomeProps` yang sudah ada dan menampilkan section yang relevan dengan fitur kategori (mis. `rental-drive` tampilkan unit + harga sewa, `medic-trust` tampilkan slot booking).

### b. Registry
Update `src/components/storefront/themes/registry.tsx`: tambahkan lazy import 9 tema baru, fallback tetap ke `classic` untuk key tak dikenal.

### c. Seed tabel `themes` (migration)
Insert 11 baris (`key, name, description, component_id, tier_hint='basic', is_active=true, sort_order`). `tier_hint` semua basic supaya semua plan bisa pakai; bisa disesuaikan nanti.

### d. Mapping kategori → tema rekomendasi
Tambah kolom `business_categories.recommended_theme_key text` + isi nilai sesuai tabel di atas.

### e. RPC `get_my_entitlements`
Saat ini RPC tidak ada (themes array di UI kosong). Buat RPC sederhana yang mengembalikan:
- `plan_code`, `months_active`
- `features` (dari `entitlements`/plan, atau placeholder semua allowed)
- `themes` (semua baris `themes` aktif, `allowed=true` jika tier sesuai)
- `active_theme_key` (dari `shops.theme_key`)

### f. UI `pos-app/appearance.tsx`
- Di atas grid tema, tampilkan badge **"Rekomendasi untuk kategori Anda"** pada tema yang `key === recommended_theme_key`.
- Urutkan: rekomendasi dulu, lalu sisanya.
- Tombol "Pakai tema rekomendasi" satu klik di header.

### g. Storefront resolver
`s.$slug.index.tsx` sudah pakai `getPublicShopTheme` → diteruskan ke `<ThemedHome themeKey>`. Tidak berubah.

## 4. Yang TIDAK berubah
- Tidak menyentuh kapabilitas/`enabled_features`, RLS, checkout, pembayaran.
- Tidak mengubah `client.ts` / `types.ts` secara manual (regen otomatis setelah migration).
- Theme `umroh` & `classic` tidak ditulis ulang.

## 5. Risiko
- 9 komponen Home baru = banyak file UI. Saya buat ringkas (1 file ±150 baris) memakai shadcn primitives yang sudah ada agar mudah di-tweak.
- Bila nanti ingin kategori "Otomotif" terpisah, tinggal tambah baris kategori + 1–2 tema (`dealer-mobil`, `dealer-motor`).

Setujui untuk saya lanjutkan implementasi?
