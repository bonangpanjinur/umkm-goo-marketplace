# P0: Wire Fitur "Fake" ke Database

Empat halaman owner masih pakai mock/`setTimeout`. Plan ini menggantinya dengan persistensi nyata ke Supabase + integrasi API yang sesuai.

## 1. Custom CSS (`pos-app.custom-css.tsx`)
- **Storage**: gunakan kolom yang sudah ada di tabel `shops` → `custom_css text` (tambah kolom kalau belum ada via migration kecil).
- **Aksi**: load CSS milik shop owner saat mount; tombol **Simpan** → `update shops set custom_css = ... where id = current_shop`.
- **Apply runtime**: inject `<style>` di `toko.$slug.tsx` (storefront publik) dari `shop.custom_css`.
- **Validasi**: batasi panjang (≤ 20KB), strip tag `<script>` sederhana.

## 2. Email Marketing (`pos-app.email-marketing.tsx`)
- **Tabel baru** (migration):
  - `email_campaigns` (shop_id, name, subject, body_html, status: draft|scheduled|sent, scheduled_at, sent_at, recipient_count)
  - `email_campaign_recipients` (campaign_id, customer_id, email, status: pending|sent|failed, sent_at)
- **RLS**: owner-only via `is_shop_owner(shop_id)`.
- **UI wiring**: list campaigns dari DB, create/edit form simpan ke `email_campaigns`. Tombol **Kirim** → server fn `sendCampaign` (queue rows → status `sent`; pengiriman aktual via Resend nanti, untuk P0 cukup mark sent + insert recipients dari `customers` table).
- **Audit**: log aksi kirim via `logStaffAction`.

## 3. Storefront Builder (`pos-app.storefront-builder.tsx`)
- **Tabel baru**: `storefront_layouts` (shop_id unique, blocks jsonb, theme jsonb, updated_at).
- **UI wiring**: load layout existing; **Simpan** upsert ke tabel; **Preview** baca dari tabel yang sama.
- **Apply runtime**: `toko.$slug.tsx` baca `storefront_layouts` (fallback ke layout default kalau null).

## 4. RajaOngkir (`pos-app.rajaongkir.tsx`)
- **Secret**: minta `RAJAONGKIR_API_KEY` via `add_secret` (server-side only).
- **Server fn baru** (`src/lib/api/shipping.functions.ts`):
  - `getProvinces()`, `getCities(provinceId)`, `getCost({origin, destination, weight, courier})`.
  - Semua proxy ke `https://api.rajaongkir.com/starter/...` pakai key dari `process.env`.
- **Storage konfigurasi**: tambah ke `shops` → `shipping_origin_city_id int`, `shipping_couriers text[]`.
- **UI wiring**: dropdown provinsi/kota dari API, simpan origin ke `shops`. Pengecekan ongkir live via server fn.

## Urutan eksekusi
1. Migration tunggal: tambah kolom `shops.custom_css`, `shops.shipping_origin_city_id`, `shops.shipping_couriers` + buat tabel `email_campaigns`, `email_campaign_recipients`, `storefront_layouts` (semua dengan RLS owner-only).
2. Tunggu approval migration.
3. Minta secret RajaOngkir.
4. Implementasi UI + server functions per fitur (4 file routes + 1 server fn shipping + 1 server fn campaign).
5. Wire storefront publik (`toko.$slug.tsx`) untuk baca custom_css & storefront_layouts.

## Catatan teknis
- Semua server fn pakai `requireSupabaseAuth` + cek owner via `is_shop_owner`.
- Pengiriman email aktual (Resend/SMTP) keluar dari scope P0 — cukup struktur data + status tracking. Tambahkan TODO untuk integrasi gateway nanti.
- Tidak menyentuh schema yang sudah dipakai modul lain.