
# Fase 2 — Seed Data Inti

Tujuan: bikin super admin bisa onboarding, owner bisa pilih plan & kategori usaha, dan default platform terisi. Semua via tool `insert` (data, bukan skema). Idempoten pakai `ON CONFLICT DO NOTHING` supaya aman dijalankan ulang.

## 2.1 `business_categories` — 11 kategori UMKM

Kolom dipakai: `slug`, `name`, `description`, `sort_order`, `enabled_features` (text[]), `booking_enabled`, `booking_type`.

| Slug | Nama | Booking | Features inti |
|---|---|---|---|
| fnb | F&B / Kuliner | ❌ | menu, kds, table_qr, open_bills, recipes |
| retail | Retail / Toko | ❌ | products, inventory, variants, barcode |
| jasa | Jasa Umum | ✅ service | bookings, schedule, custom_orders |
| rental | Rental | ✅ rental | rental_units, deposit, checklist |
| kursus | Kursus / Edukasi | ✅ class | courses, lessons, certificates |
| salon | Salon / Beauty | ✅ service | bookings, employees, schedule |
| klinik | Klinik / Medis | ✅ service | patient_records, anamnesis, medical_invoice |
| studio-foto | Studio Foto | ✅ service | studio_packages, studio_brief, lookbook |
| travel | Travel / Umroh | ✅ service | umroh_packages, umroh_facilities, contracts |
| custom-order | Custom Order | ❌ | custom_orders, quotes, job_deliverables |
| lainnya | Lainnya | ❌ | products, services |

## 2.2 `plans` + `plan_features` — 3 paket SaaS

| Code | Nama | Harga/bln | Sort |
|---|---|---|---|
| free | Free Starter | Rp 0 | 1 |
| pro | Pro Bisnis | Rp 99.000 | 2 |
| enterprise | Enterprise | Rp 499.000 | 3 |

`duration_days` = 30 untuk semua. `features` jsonb ringkas; detail kuantitatif masuk ke `plan_features` (`limit_value`):

- Free: max 1 outlet, 50 produk, 100 order/bln, 1 staff
- Pro: 3 outlet, 1000 produk, unlimited order, 10 staff, marketplace, booking, KDS
- Enterprise: unlimited semua + API + multi-admin + dedicated support

## 2.3 `user_roles` — super admin pertama

Owner `toko pertama` (user_id `305a3d88-8596-4e04-97ec-98844d8063f6`) dapat role `super_admin` (shop_id NULL, is_active true). Owner role-nya untuk shop sudah diasumsikan ada — kalau belum, kita tambahkan juga `owner` role agar /pos-app tetap bisa diakses.

Cek dulu: kalau row sudah ada (super_admin atau owner untuk user_id ini), skip via `ON CONFLICT (user_id, role) DO NOTHING`.

## 2.4 `platform_settings` — default

Key/value sebagai text (sesuai schema). Kategori grouping:

| Key | Value | Category | Deskripsi |
|---|---|---|---|
| platform_name | UMKMgo | branding | Nama platform |
| default_currency | IDR | general | Mata uang default |
| platform_fee_percent | 2.5 | billing | Komisi platform (%) |
| max_voucher_discount_percent | 50 | promo | Cap diskon voucher (%) |
| min_withdrawal_idr | 50000 | billing | Minimal tarik saldo |
| booking_default_min_hours_before | 2 | booking | Default min jam booking |
| booking_default_max_advance_days | 60 | booking | Default maksimal hari ke depan |
| booking_default_deposit_percentage | 30 | booking | Default DP (%) |
| booking_auto_cancel_hours | 24 | booking | Auto-cancel booking pending DP |
| default_tax_percent | 11 | tax | PPN default (%) |
| default_service_charge_percent | 0 | tax | Service charge default |
| pwa_install_prompt | true | general | Aktifkan PWA install prompt |

Semua pakai `ON CONFLICT (key) DO NOTHING` agar idempoten.

---

## Strategi Aman

1. **Cek constraint dulu** sebelum insert (unique key di setiap tabel — `slug`, `code`, `key`, `(user_id, role)`).
2. **ON CONFLICT DO NOTHING** di semua INSERT → bisa dijalankan ulang tanpa duplikat.
3. **Tidak ada migrasi skema** — pure data insert via tool `insert`.
4. **Verifikasi setelah insert**: `SELECT COUNT(*)` per tabel + sample row.
5. **Owner shop "toko pertama"**: shop_id-nya dipakai untuk `user_roles.owner` (kalau belum ada) — bukan shop ID lain.
6. **plan_features** insert via SELECT dari plans by code (agar UUID resolve otomatis).
7. **Tidak menyentuh** auth.users, storage, realtime, supabase_functions, vault.

## Verifikasi Akhir

Query verifikasi: jumlah row per tabel + sample dari masing-masing. Setelah seed:
- `business_categories` ≥ 11
- `plans` = 3 + `plan_features` ≥ 12 rows
- `user_roles` ≥ 1 row super_admin untuk user 305a3d88
- `platform_settings` ≥ 12 keys

Lanjut? Setelah ini Fase 3 (konsolidasi config + owner UI badge filter).

