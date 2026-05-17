
# Audit UMKMgo + Rencana Perbaikan F-16 dan Integrasi

Database sekarang: **142 tabel**, **1 shop** dummy ("toko pertama"), tabel inti masih kosong (`plans`, `business_categories`, `user_roles`, `bookings`, `orders`, `menu_items`, `products` = 0). Semua "data tes" lama sudah hilang.

---

## 1) Sisi TOKO (Owner) — yang belum / pincang

| Area | Kondisi | Gap |
|---|---|---|
| **Deposit booking (F-16)** | Kolom DB baru saja ditambah (`deposit_status`, `deposit_required`, `deposit_percentage`, `deposit_notes`, `require_id_upload`) | Kode masih pakai nama lama: `require_deposit`, `deposit_percent`, `cancellation_token`. UI booking owner & customer akan 400 |
| **Owner dashboard booking** | `pos-app.booking.tsx` punya kolom DP | Belum ada **filter** by `deposit_status` & **badge** real-time (DP Lunas / Menunggu / Gagal) |
| **Audit log void/refund** | Sudah wired | Belum di-wire untuk **DP refund**, **booking cancel oleh owner**, **menu price edit** |
| **Setup wizard owner** | `SetupChecklist` ada di dashboard | Belum cek: bank rekening terdaftar, payment_methods_enabled, jam buka, minimal 1 kategori produk |
| **Realtime order toast** | Sudah ada `useRealtimeOrders` | Belum dipasang di `/pos-app/booking` & `/pos-app/online-orders` |
| **Combo Builder (R-09)** | Route `pos-app.combo-builder.tsx` ada, tabel `fnb_combos` ada | Belum bisa dipakai di POS checkout (`pos-app.pos.tsx`) — combo tidak muncul di grid menu |
| **Bulk action pesanan** | – | Belum ada checkbox + tombol "tandai siap / batal sekaligus" |
| **Date range custom dashboard** | Filter hanya hari ini / 7 / 30 | Belum ada date-range picker kustom |

## 2) Sisi PEMBELI (Customer) — yang belum / pincang

| Area | Kondisi | Gap |
|---|---|---|
| **Halaman booking `/toko/$slug/booking`** | Form lengkap | **Akan 400 sekarang**: SELECT memakai `require_deposit`/`deposit_percent`/`require_id_upload` — kolom DB barunya `deposit_required`/`deposit_percentage`/`require_id_upload` ✅ tapi nama yang sudah ada di kode tidak match |
| **Halaman cancel booking `/booking/cancel/$token`** | Form lengkap | `.eq("cancellation_token", token)` — kolom DB **`cancel_token`** → halaman cancel **tidak akan match** booking apapun (bug live) |
| **Halaman pembayaran DP** | Snap Midtrans + manual transfer | Trust `onSuccess` client-side → race condition vs webhook (mismatch status sesaat) |
| **Order tracking `/track/$orderId`** | Ada | Belum subscribe realtime status; user harus refresh |
| **Notifikasi pembeli** | `notifications` table ada | Belum ada toast realtime saat status pesanan berubah |
| **Akun pesanan list** | Pagination 1000 default | Belum ada pagination eksplisit — risiko Supabase 1000-row limit |

## 3) Sisi SUPER ADMIN — yang belum / pincang

| Area | Kondisi | Gap |
|---|---|---|
| **`user_roles` table** | Kosong | Belum ada user dengan role `super_admin` → siapa pun yang akses `/admin` akan ditolak |
| **`plans` table** | Kosong | Onboarding owner tidak bisa pilih plan; `plan_subscriptions` tidak bisa dibuat |
| **`business_categories`** | Kosong | Owner tidak bisa pilih kategori usaha saat onboarding; gating `useBusinessCategory` tidak berfungsi |
| **`platform_settings`** | Belum diaudit | Default fee, currency, voucher cap belum di-seed |
| **`admin.booking-config.tsx`** | Tulis ke `shops.booking_config` (jsonb) | Sistem **parallel** dengan kolom `shops.deposit_*` per-toko → dua sumber kebenaran, akan konflik |
| **Linter 219 warning** | Pre-existing | Belum dibereskan: function search_path mutable, RLS overly permissive, extension in public, public bucket listing |
| **Edge functions warisan** | Masih ada di `supabase/functions/` | Belum dimigrasi ke `createServerFn` |

## 4) BUG aktif (akan crash / silent fail)

| # | Bug | Lokasi | Dampak |
|---|---|---|---|
| B1 | `cancellation_token` vs `cancel_token` | `booking.cancel.$token.tsx:86`, `toko.$slug.booking.tsx:582,608` | Cancel booking dari link selalu "tidak ditemukan" |
| B2 | `require_deposit` / `deposit_percent` vs `deposit_required` / `deposit_percentage` | `toko.$slug.booking.tsx:222,513,540,1976,2214`, `pos-app.booking.tsx:615,621,633,635`, `checkout.tsx:259,266` | SELECT shops error → seluruh page booking & checkout 400 |
| B3 | `deposit_status` value tidak konsisten: kode pakai `waiting_payment`/`submitted`/`verified`, constraint DB hanya allow `none/pending/paid/failed/expired/refunded` | `toko.$slug.booking.tsx:555,627`, `pos-app.booking.tsx:1600-1615`, `pos-app.booking-analytics.tsx:208` | UPDATE tolak (CHECK violation) → DP tidak pernah berstatus apa-apa |
| B4 | Webhook idempotency: `UPDATE webhook_logs` tanpa filter ID | `artifacts/api-server/src/routes/payments.ts` | Setiap webhook update SEMUA baris log |
| B5 | Client `markDepositPaid` tanpa verify server | `toko.$slug.booking.tsx:702-718` | Pembeli bisa "fake" DP lunas |
| B6 | Two-source deposit config (`shops.booking_config.deposit_*` admin level vs `shops.deposit_*` per-shop) | `admin.booking-config.tsx` vs `pos-app.booking.tsx` | Mana yang dipakai? UI menampilkan hasil acak |

## 5) POTENSI bug (belum aktif, akan muncul)

| # | Potensi | Pemicu |
|---|---|---|
| P1 | `plans` kosong → owner baru tidak bisa subscribe | Saat onboarding flow dipakai |
| P2 | `user_roles` kosong → tidak ada super admin | Saat user buka `/admin` |
| P3 | `business_categories` kosong → nav gating selalu disembunyikan | Default usaha apa pun = tidak ada NAV menu |
| P4 | `types.ts` masih menyebut `coffee_shops` (4600+ baris referensi) | Akan auto-regenerate setelah Lovable Cloud sync — tapi build dev bisa stale; perlu re-trigger |
| P5 | Supabase 1000-row limit | Saat orders/bookings >1000 per toko, list page diam-diam terpotong |
| P6 | Linter: RLS `USING (true)` di beberapa tabel | Risiko privilege escalation; perlu audit per tabel |
| P7 | Public storage bucket allows listing | Kebocoran file customer upload |
| P8 | Tidak ada cron auto-cancel booking pending DP > 24 jam | Slot terkunci selamanya |

---

## RENCANA PERBAIKAN (urut prioritas)

### Fase 1 — Hentikan Pendarahan (sehari, blocker semua flow booking)

**1.1 Pilihan: selaraskan kode ke nama kolom DB baru** *(direkomendasi)*
- Rename di kode (bukan DB): `require_deposit` → `deposit_required`, `deposit_percent` → `deposit_percentage`, `cancellation_token` → `cancel_token`
- File: `toko.$slug.booking.tsx`, `pos-app.booking.tsx`, `pos-app.booking-analytics.tsx`, `booking.cancel.$token.tsx`, `checkout.tsx`, `src/types/stage4.ts`
- **Alasan**: nama DB sudah selaras dengan `deposit_paid`/`deposit_amount` yang sudah ada (semua pakai prefix `deposit_*` tanpa singkatan)

**1.2 Selaraskan enum `deposit_status`**
- Kode pakai `waiting_payment`, `submitted`, `verified` — DB hanya allow `none, pending, paid, failed, expired, refunded`
- **Migrasi tambahan** (aman, additive): perlebar CHECK constraint untuk menerima `waiting_payment, submitted, verified` ATAU rename di kode → `pending`, `pending`, `paid`
- Rekomendasi: **rename di kode** supaya enum DB tetap rapi: `waiting_payment`→`pending`, `submitted`→`pending`, `verified`→`paid`

**1.3 Fix webhook idempotency**
- `payments.ts`: `UPDATE webhook_logs WHERE id = $insertedId` (bukan tanpa filter)

**1.4 Hapus trust client-side `markDepositPaid`**
- Customer hanya boleh redirect ke success page; webhook yang flip status

### Fase 2 — Seed Data Inti (super admin bisa onboarding)

Insert (lewat tool insert, bukan migrasi karena data, bukan skema):
- `business_categories`: F&B, Retail, Jasa, Rental, Kursus, Salon, Klinik, Studio Foto, Travel/Umroh, Custom Order, Lainnya
- `plans`: Free, Pro, Enterprise dengan `plan_features`
- `user_roles`: tambah row `super_admin` untuk owner_id dari shop "toko pertama" (305a3d88-…) → user pertama jadi super admin
- `platform_settings`: default fee 2.5%, currency IDR, max voucher 50%

### Fase 3 — Konsolidasi Sumber Kebenaran

**3.1 Hapus dualism booking config**
- Pilih satu: kolom `shops.deposit_*` per-toko (sudah ada) ATAU `shops.booking_config` JSON (admin global)
- Rekomendasi: **kolom kolom** lebih cepat di-query & di-RLS; deprecate `booking_config.deposit_*`. `admin.booking-config.tsx` jadi UI untuk **default platform** saja (di `platform_settings`)

**3.2 Owner badge + filter di `/pos-app/booking`**
- Tab: Semua / DP Lunas / Menunggu DP / DP Gagal / Tanpa DP
- Badge berwarna per status
- Subscribe realtime `bookings` channel filter shop_id

### Fase 4 — Operasional Lanjutan

- Cron `/api/public/cron/expire-bookings` (pg_cron 1 jam) — auto-cancel booking `deposit_status='pending'` > 24h
- Pagination eksplisit di list orders/bookings (>1000 row safety)
- Setup secrets Midtrans/Xendit + smoke test E2E
- Audit log untuk DP refund, owner-cancel-booking, menu price edit

### Fase 5 — Hardening Keamanan

- Audit semua RLS `USING (true)` (linter warning 3-9)
- Set `search_path` di semua function (warning 1)
- Tutup public bucket listing (warning 10)
- Pindah extension dari schema `public`

---

## STRATEGI MIGRASI AMAN

**Prinsip**: setiap migrasi tambah-saja, backfill, baru hapus di rilis terpisah.

| Migrasi | Sifat | Rollback |
|---|---|---|
| M1: perlebar `deposit_status` CHECK (Fase 1.2 opsi B) | Additive (ADD CONSTRAINT after DROP) | Aman; tabel kosong |
| M2: jika pilih Opsi A (rename kode) — **tidak butuh migrasi** | – | – |
| M3: deprecate `shops.booking_config.deposit_*` | Tidak hapus kolom JSON, hanya stop write | Aman |
| M4: audit & rewrite RLS overly-permissive | Per-tabel, dry-run via `read_query` dulu | Backup policy lama jadi `*_legacy` |

**Pengamanan umum:**
- Backup row count sebelum & sesudah tiap migrasi (kita verifikasi via `read_query`)
- Tidak ada `DROP COLUMN` di fase 1–3 (semua additive)
- Tidak modifikasi schema `auth/storage/realtime/supabase_functions/vault`
- Tabel kosong sekarang → migrasi struktur **risiko nol**; risiko nyata baru muncul setelah ada data produksi

---

## YANG DIKERJAKAN DI LOOP IMPLEMENTASI PERTAMA (sesudah plan disetujui)

Loop pertama akan fokus **Fase 1 (B1+B2+B3 saja)** karena ini blocker semua flow booking. Loop berikutnya: Fase 2 seed → Fase 3 owner UI → dst.

Konfirmasi sebelum saya jalankan:
- **Opsi A**: rename di kode (tanpa migrasi tambahan) — **rekomendasi**
- **Opsi B**: perlebar enum DB untuk terima nama lama (butuh 1 migrasi mini)

