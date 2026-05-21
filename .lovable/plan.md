
# Audit Fitur Owner (/pos-app)

Cakupan: 148 halaman di `artifacts/kopihub/src/routes/pos-app.*.tsx` + hook, lib, dan komponen pendukungnya. Dibandingkan dengan 162 tabel + 7 view di DB Supabase.

Status singkat:
- ~125 halaman sudah terintegrasi DB (CRUD nyata, hook, atau RPC).
- ~7 halaman masih pakai data demo / `setTimeout` (tidak menyimpan apa-apa).
- ~22 halaman query tabel yang **belum ada** di DB → fitur tampak ada, tapi pasti error 400/404 saat dipakai.
- Beberapa skema duplikat / tidak konsisten yang harus diberesi.

---

## 1. Halaman yang masih demo / belum nyimpan ke DB

Yang ditemukan pakai `new Promise(r => setTimeout)` atau array statis:

| Halaman | Masalah |
|---|---|
| `pos-app/custom-css` | "Simpan" cuma fake delay, CSS tidak disimpan ke `shops` / tabel lain |
| `pos-app/outlets` | Daftar outlet pakai `DEMO_OUTLETS`; tambah outlet hanya update state lokal. Padahal tabel `outlets` sudah ada |
| `pos-app/email-marketing` | Form kampanye tidak terhubung ke `marketing_campaigns` / `campaign_recipients` yang sudah ada |
| `pos-app/rajaongkir` | Cek tarif pakai `DEMO_RESULTS`; belum panggil API RajaOngkir/JNE asli |
| `pos-app/storefront-builder` | Save fake delay; belum tulis ke `page_layouts` |
| `pos-app/digital-version` | Upload versi pakai delay; tidak tulis ke `digital_product_versions` (tabel pun belum ada) |
| `pos-app/variants` | Sebagian aksi simpan fake delay; cek `menu_item_variants` |

Prioritas: **outlets** & **email-marketing** paling urgent karena tabelnya sudah ada, tinggal wiring.

---

## 2. Halaman yang query tabel yang **belum ada** di DB

Halaman ini akan gagal load / save dengan 400 atau "table not found":

| Halaman | Tabel hilang | Catatan |
|---|---|---|
| `pos-app/limited-editions` | `limited_editions` | Buat tabel, atau gabungkan ke `menu_items` (flag) |
| `pos-app/antrian` | `queue_entries`, `queue_sessions` | Belum ada sama sekali |
| `pos-app/rental-checklist` | `rental_checklists` | `rental_inspections` ada, tabel checklist belum |
| `pos-app/lookbook` | `shop_lookbook` | |
| `pos-app/promos` | `shop_follows` | Dipakai untuk segmentasi promo |
| `pos-app/wip-gallery` | `wip_gallery` | |
| `pos-app/happy-hour` | `happy_hour_rules` | |
| `pos-app/medical-invoice` | `medical_invoices` | Modul klinik belum tersambung |
| `pos-app/anamnesis` | `anamnesis_forms` | |
| `pos-app/studio-brief` | `studio_briefs` | |
| `pos-app/studio-delivery` | `studio_deliveries` | |
| `pos-app/studio-photo-reviews` | `studio_photo_reviews` | |
| `pos-app/broadcast-wa` | `wa_broadcasts` | |
| `pos-app/certificates` | `authenticity_certificates` | |
| `pos-app/digital-licenses` | `digital_licenses`, `digital_download_logs` | |
| `pos-app/digital-version` | `digital_product_versions` | |
| `pos-app/milestones` | `project_milestones` | |
| `pos-app/waitlist` | `booking_waitlists` | Padahal ada `booking_waitlist` (singular) — typo / inkonsisten |
| `pos-app/booking` | `booking_addons`, `booking_service_packages`, `booking_vouchers`, `booking_reschedule_logs` | Hanya `booking_reschedule_tokens` & `booking_slots` yang ada |
| `pos-app/studio-addons` | `booking_addons` | |
| `pos-app/reviews` | `buyer_ratings` | Sudah ada `product_reviews` & `booking_reviews` — kemungkinan duplikasi |
| `pos-app/marketplace-orders` | `order_status_logs` | Sudah ada `order_audit_log` — pilih satu |

Selain itu hook/lib pakai tabel yang juga belum ada:
- `lib/loyalty-enhanced.ts` → `loyalty_rewards`, `loyalty_redemptions`, `loyalty_tiers`. Yang ada hanya `loyalty_points`, `loyalty_ledger`, `loyalty_settings`.
- `lib/reservations.ts` → `reservations`, `reservation_slots`. Belum ada.
- `akun/loyalty` → `loyalty_transactions`. Belum ada.

---

## 3. Inkonsistensi skema / duplikasi

- **Notifikasi**: `notifications` (per-user) vs `owner_notifications` (per-shop) — keduanya dipakai oleh halaman berbeda. `notifications` belum punya `dismissed_at`, sehingga "Tutup" hanya set `read_at` (sudah difilter sekarang). Standardkan.
- **Booking waitlist**: kode pakai `booking_waitlists`, DB punya `booking_waitlist`. Rename salah satu.
- **Review**: `product_reviews`, `booking_reviews`, `menu_reviews`, dan referensi `buyer_ratings` → terlalu banyak permukaan, susah diaudit.
- **Order log**: `order_audit_log` (ada) vs `order_status_logs` (dipakai kode, belum ada). Pilih satu.
- **Loyalty**: dua model paralel — `loyalty_points/ledger/settings` (terpakai) vs `loyalty_rewards/redemptions/tiers/transactions` (lib enhanced, belum ada di DB).
- **Reservasi meja**: file `pos-app/reservasi.tsx` sudah redirect ke `/pos-app/booking` — pastikan tidak ada link lama yang menyesatkan, dan `lib/reservations.ts` (tabel `reservations`/`reservation_slots`) dimatikan/dimigrasikan.
- **`coffee_shops` view**: masih ada sebagai legacy view, sementara kode sudah pakai `shops`. Tetapkan apakah perlu di-drop.

---

## 4. Masalah cross-cutting yang sudah ketemu

- **Banner notifikasi muncul terus walau di-close** → sudah diperbaiki dengan filter `is("read_at", null)` di `listMyNotifications`. Tetap perlu kolom `dismissed_at` resmi kalau mau bedakan "dibaca" vs "ditutup".
- **`MarketplaceBottomNav` query 400** → enum status di-fix; lakukan audit serupa untuk semua filter `status=in.(...)` lain agar pakai enum valid (`pending|preparing|ready|delivering|completed|cancelled|refunded`).
- **`useQueryClient is not defined`** → sudah ditambahkan import. Cari import lupa serupa: jalankan `tsc --noEmit` jadi bagian rutin.
- **Pagination & staleTime** → sudah diterapkan ke Orders Today & Notifications. Halaman lain dengan list besar yang masih `limit(150)` / `limit(500)`: `pos-app/notifikasi` (150), `pos-app/orders`, `pos-app/customers`, `pos-app/inventory`, `pos-app/reviews`. Sebaiknya semua pakai pagination cursor seperti OrdersTodayDialog.
- **Realtime channel**: beberapa halaman owner subscribe `postgres_changes` tanpa filter `shop_id` → bisa terima event toko lain. Audit semua `.channel(...).on("postgres_changes", ...)` di `pos-app/*`.

---

## 5. Halaman yang sudah OK (sample, untuk konfirmasi)

`pos-app/pos`, `pos-app/menu`, `pos-app/orders`, `pos-app/customers`, `pos-app/inventory`, `pos-app/tables`, `pos-app/table-maps`, `pos-app/website-builder`, `pos-app/marketplace-analytics`, `pos-app/reports/profit`, `pos-app/rekening-bank` (setelah `shop_bank_accounts` dibuat), `pos-app/keuangan*`, `pos-app/kyc`, `pos-app/billing`, `pos-app/staff/employees/permissions/shifts/attendance`, `pos-app/printers`, `pos-app/kds`, semua SimpleCRUD (`testimonials`, `flyers`, `sales-offerings`, `umroh-*`, dll).

---

## Rekomendasi prioritas perbaikan

**P0 — bikin halaman live yang sekarang error / fake:**
1. `outlets` → wire ke tabel `outlets` (sudah ada).
2. `email-marketing` → wire ke `marketing_campaigns` + `campaign_recipients`.
3. `storefront-builder` & `custom-css` → simpan ke `page_layouts` / kolom baru di `shops`.
4. Rename `booking_waitlists` → `booking_waitlist` (atau sebaliknya) supaya halaman waitlist hidup.
5. Standardkan `order_status_logs` ↔ `order_audit_log` di `marketplace-orders`.

**P1 — buat tabel yang hilang untuk fitur yang sudah punya UI:**
- Modul antrian: `queue_entries`, `queue_sessions`.
- Modul studio: `studio_briefs`, `studio_deliveries`, `studio_photo_reviews`, `studio_addons` (booking_addons).
- Modul klinik: `medical_invoices`, `anamnesis_forms`.
- Modul digital: `digital_licenses`, `digital_download_logs`, `digital_product_versions`, `authenticity_certificates`.
- Modul kreatif: `wip_gallery`, `shop_lookbook`, `project_milestones`, `limited_editions`.
- Modul promo: `shop_follows`, `happy_hour_rules`, `wa_broadcasts`.
- Modul rental: `rental_checklists`.

Semua tabel ini perlu RLS standar: pemilik = `shops.owner_id = auth.uid()` atau super_admin.

**P2 — konsolidasi skema duplikat:**
- Loyalty: pilih satu model (basic vs enhanced) dan migrasi.
- Reviews: tentukan apakah `buyer_ratings` perlu, atau pakai `product_reviews` saja.
- Notifikasi: tambah `dismissed_at` ke `notifications` agar konsisten dengan `owner_notifications`.

**P3 — quality-of-life:**
- Tambah `tsc --noEmit` ke CI agar kasus `useQueryClient` tidak terulang.
- Audit filter `status=in.(...)` di semua route customer.
- Tambah filter `shop_id` di setiap channel realtime owner.
- Migrasikan list besar ke pagination cursor (pola OrdersTodayDialog).

---

Saya tunggu konfirmasi mau ambil prioritas yang mana dulu — P0 (5 fitur live), P1 (bikin tabel batch), atau jalan satu modul utuh (mis. studio / klinik) end-to-end.
