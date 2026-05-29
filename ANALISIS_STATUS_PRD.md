# Analisis Status PRD vs Kode Aktual — UMKMgo
**Diperbarui:** Juni 2026 | **Berdasarkan:** PRD v9.0 + audit kode langsung

---

## RINGKASAN EKSEKUTIF

| Dimensi | PRD (Klaim) | Kode Aktual |
|---|---|---|
| Total route file | 303 | **312** ✅ (lebih banyak) |
| Fase 1–10 | 100% selesai | ✅ Kode ada — tapi **5 SQL migration belum dijalankan** di DB |
| Infrastruktur kritis (K1–K5) | Sebagian besar selesai | ⚠️ **K4 + K5 secrets belum dikonfigurasi** |
| Push notification (backend) | ✅ Done (klaim PRD) | ❌ **VAPID delivery worker tidak ada di server** |
| Payment checkout wired | ✅ Done (klaim PRD) | ⚠️ **Backend siap, frontend POS/storefront belum tersambung penuh** |
| WhatsApp broadcast API | ✅ Done (klaim PRD) | ⚠️ **Masih manual `window.open(wa.me)` — tidak ada server API call** |
| SQL migration dijalankan di DB | Diasumsikan | ❌ **5 file migration belum pernah dieksekusi di Supabase** |
| `types.ts` sinkron dengan DB | Diasumsikan | ❌ **88 tabel di types.ts vs 160+ dipakai di kode** |

---

## BAGIAN 1 — FASE YANG SUDAH SELESAI (KODE ✅)

> Kode sudah ada dan fungsional. Yang masih kurang hanya eksekusi SQL migration di Supabase Dashboard.

### ✅ Fase 1 — Infrastruktur Wajib
Semua kode ada. Catatan per item:

| ID | Task | Status Kode | Catatan |
|----|------|-------------|---------|
| F1-1 | Keamanan PostgREST (JWT middleware + whitelist) | ✅ | `artifacts/api-server/src/routes/rest.ts` |
| F1-2 | Payment Gateway setup (Midtrans + Xendit) | ✅ Kode | ⚠️ Secrets belum dikonfigurasi (lihat Bagian 2) |
| F1-3 | Email via Resend | ✅ Kode | ⚠️ `RESEND_API_KEY` belum dikonfigurasi |
| F1-4 | CORS + Rate Limiting | ✅ | `express-rate-limit` sudah terpasang |
| F1-5 | PostgREST operators `.in`, `.not`, UPSERT | ✅ | Terimplementasi di `rest.ts` |

### ✅ Fase 2 — Sambungkan Data Mock ke DB
Kode sudah tersambung ke Supabase. **SQL migration `scripts/fase2_migrations.sql` belum dijalankan.**

| ID | Task | Status Kode |
|----|------|-------------|
| F2-1 | Email Marketing → `marketing_campaigns` | ✅ |
| F2-2 | Storefront Builder save ke `storefront_layouts` | ✅ Fully implemented (upsert ke Supabase) |
| F2-3 | Digital Version → `menu_items` + `digital_product_versions` | ✅ |
| F2-4 | RajaOngkir Express endpoint `/api/rajaongkir/cost` | ✅ `rajaongkir.ts` ada di server |
| F2-5 | Flash Sale + Happy Hour kolom di `menu_items` | ✅ Kode — tabel pending migration |
| F2-6 | Cash Drawer `/pos-app/cash-drawer` | ✅ Route ada |

### ✅ Fase 3 — Bersih-bersih Kode
| ID | Task | Status |
|----|------|--------|
| F3-1 | Hapus `masuk.tsx` + `daftar.tsx` | ✅ Jadi redirect shim |
| F3-2 | Konsolidasi printer ke `lib/printer/` | ✅ |
| F3-3 | Merge ReviewDialog | ✅ `components/shared/ReviewDialog.tsx` |
| F3-4 | Konsolidasi `use-shop` + `outlet-context` | ✅ `lib/shop-context.tsx` |
| F3-5 | Filter `shop_id` di Supabase Realtime channel | ✅ |
| F3-6 | Keyset pagination di list besar | ✅ |

### ✅ Fase 4 — Customer Experience
| ID | Task | Status |
|----|------|--------|
| F4-1 | Submit Ulasan dari `/akun/pesanan` | ✅ |
| F4-2 | Full-text Search (GIN + pg_trgm) | ✅ Kode — index DB pending migration |
| F4-3 | Address Book CRUD `/akun/alamat` | ✅ |
| F4-4 | Push Notification (VAPID + service worker) | ✅ Frontend — ⚠️ Backend delivery missing |
| F4-5 | Q&A Produk | ✅ `ProductQA.tsx` + `pos-app.qa.tsx` |
| F4-6 | Follow Toko `shop_follows` | ✅ |

### ✅ Fase 5 — Realtime SSE
| ID | Task | Status |
|----|------|--------|
| F5-1 | SSE endpoint POS sync | ✅ `sse.ts` broker pattern |
| F5-2 | SSE untuk kurir | ✅ |
| F5-3 | SSE untuk notifikasi merchant | ✅ |

### ✅ Fase 6 — Platform Lanjutan
| ID | Task | Status | Catatan |
|----|------|--------|---------|
| F6-1 | Auto Refund via Gateway | ✅ `POST /api/payments/refund` |  |
| F6-2 | Multi-outlet Report Agregat | ✅ `/pos-app/reports/multi-outlet` |  |
| F6-3 | Outgoing Webhooks merchant | ✅ `/pos-app/webhooks` |  |
| F6-4 | Group Buy / Patungan | ✅ | SQL migration pending |
| F6-5 | Subscription / Langganan Produk | ✅ | SQL migration pending |
| F6-6 | BNPL / Cicilan (Kredivo, Akulaku) | ✅ UI checkout | Payment gateway belum tersambung penuh |
| F6-7 | Mobile App | ⏳ Di-skip | Proyek terpisah |
| F6-8 | Telemedicine | ✅ | SQL migration pending |
| F6-9 | Live Streaming Commerce | ✅ | SQL migration pending |

### ✅ Fase 7 — DB Migration & Lokasi Lanjutan
| ID | Task | Status | Catatan |
|----|------|--------|---------|
| F7-1 | ALTER TABLE shops (kolom lokasi) | ✅ SQL siap | **Belum dijalankan di DB** |
| F7-2 | `shops_nearby` RPC | ✅ SQL siap | **Belum dijalankan di DB** |
| F7-3 | Regenerasi `types.ts` | ✅ Perintah siap | **Belum dieksekusi** |
| F7-4 | Rename `coffee_shops` → `shops` di DB | ✅ SQL siap | **Belum dijalankan di DB** |
| F7-5 | Rename `fnb_combos` → `product_combos` | ✅ SQL siap | **Belum dijalankan di DB** |
| L3-1..5 | Marker clustering, autocomplete, peta admin, share lokasi, toko terdekat | ✅ Semua |  |

### ✅ Fase 8 — Merchant Mock Data Lanjutan
| ID | Task | Status | Catatan |
|----|------|--------|---------|
| F8-1 | Broadcast WA (UI + wa.me deep-link) | ✅ UI | ⚠️ Hanya manual — tidak ada server API |
| F8-2 | Bulk Pricing tabel `bulk_pricing_rules` | ✅ SQL siap | **SQL migration pending** |
| F8-3 | Restock Notify (push/email ke subscriber) | ✅ Endpoint ada | ⚠️ Push delivery backend belum ada |
| F8-4 | Storefront Builder save | ✅ Fully wired |  |
| F8-5 | Flash Sale verifikasi kolom | ✅ SQL siap | **SQL migration pending** |
| F8-6 | Happy Hour verifikasi | ✅ SQL siap | **SQL migration pending** |

### ✅ Fase 9 — Admin Platform Tools
| ID | Task | Status |
|----|------|--------|
| F9-1 | Commission at Checkout | ✅ `fn_apply_commission` + endpoint |
| F9-2 | Auto-cancel Expired Orders | ✅ `fn_auto_cancel_expired` |
| F9-3 | GDPR Data Deletion | ✅ Endpoint `DELETE /admin/user/:userId/data` |
| F9-4 | Admin Broadcast Buyers (multi-channel) | ✅ |
| F9-5 | Churn Definition Backend | ✅ `fn_churn_metrics_snapshot` |
| F9-6 | Platform Settings UI lengkap | ✅ |
| F9-7 | Webhook Events Monitor | ✅ `/admin/webhook-monitor` |
| F9-8 | API Keys Platform | ✅ `/admin/api-keys` |

### ✅ Fase 10 — Kurir & Staff Lengkap
| ID | Task | Status |
|----|------|--------|
| F10-1 | Upload foto bukti pengiriman | ✅ Supabase Storage `delivery-proofs` |
| F10-2 | Penarikan penghasilan kurir `/kurir/withdraw` | ✅ |
| F10-3 | Peta navigasi kurir (Google Maps + OSM) | ✅ |
| F10-4 | Rating kurir dari pembeli `/akun/rate-kurir` | ✅ SQL pending |
| F10-5 | Riwayat pengiriman dengan filter | ✅ |
| F10-6 | Dashboard pribadi staff `/pos-app/staff-dashboard` | ✅ |
| F10-7 | Slip gaji digital `/pos-app/payslip` | ✅ |

---

## BAGIAN 2 — YANG BELUM SELESAI (PERLU DIKERJAKAN)

> Diurutkan dari yang paling kritis ke rendah prioritas.

---

### 🔴 FASE A — SQL Migrations Harus Dijalankan di Supabase

**Ini blocker terbesar.** Tanpa ini, banyak fitur yang sudah ada di kode akan gagal karena tabelnya belum ada di database.

| File Migration | Fitur yang Terdampak | Cara Menjalankan |
|---|---|---|
| `scripts/fase2_migrations.sql` | `storefront_layouts`, `digital_product_versions`, `bulk_pricing_rules`, kolom flash sale/happy hour | Supabase Dashboard → SQL Editor |
| `scripts/fase3_fase4_migrations.sql` | GIN indexes full-text search, `push_subscriptions`, `shop_follows`, `product_qa` | Supabase Dashboard → SQL Editor |
| `scripts/fase6_fase7_migrations.sql` | `group_buy_campaigns`, `product_subscription_plans`, `telemedicine_slots`, `live_sessions`, kolom lokasi `shops`, `shops_nearby` RPC | Supabase Dashboard → SQL Editor |
| `scripts/fase8_fase9_migrations.sql` | `restock_subscribers`, `webhook_events`, `api_keys`, `data_requests`, `bulk_pricing_rules` | Supabase Dashboard → SQL Editor |
| `scripts/fase10_migrations.sql` | `courier_ratings`, kolom `balance`/`total_earned` di `couriers`, kolom `courier_id` di `withdrawal_requests` | Supabase Dashboard → SQL Editor |

**Setelah semua migration dijalankan:**
```bash
# Regenerasi types.ts agar TypeScript sinkron dengan DB
npx supabase gen types typescript \
  --project-id <SUPABASE_PROJECT_ID> \
  > artifacts/kopihub/src/integrations/supabase/types.ts
```

---

### 🔴 FASE B — Secrets & Credentials Wajib Dikonfigurasi

Kode sudah siap, tapi fitur-fitur ini **tidak aktif** tanpa secrets yang dikonfigurasi di Replit.

| Secret | Fitur yang Terblokir | Cara Mendapatkan |
|---|---|---|
| `MIDTRANS_SERVER_KEY` | Checkout marketplace, BNPL, refund via gateway | https://dashboard.midtrans.com → Settings → Access Keys |
| `XENDIT_SECRET_KEY` | Checkout marketplace (alternatif), refund via Xendit | https://dashboard.xendit.co → Settings → API Keys |
| `RESEND_API_KEY` | Undangan staff, renewal reminder, reset password | https://resend.com → API Keys |
| `VITE_SUPABASE_URL` | Koneksi frontend ke Supabase | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` (Anon Key) | Koneksi frontend ke Supabase | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | API server akses Supabase (admin) | Supabase Dashboard → Settings → API |
| `SUPABASE_PROJECT_ID` | Regenerasi types.ts | Supabase Dashboard → Settings → General |

---

### 🟠 FASE C — Push Notification Backend (Belum Ada)

PRD mengklaim F4-4 selesai, tapi **audit kode menemukan:**
- `PushNotificationManager.tsx` → komponen placeholder, return `null`
- Comment eksplisit: *"Background push delivery requires server-side VAPID + push delivery worker which is not yet configured"*
- Tidak ada file VAPID/web-push di `artifacts/api-server/src/`

**Yang perlu dibangun:**

| # | Task | File | Estimasi |
|---|------|------|----------|
| C-1 | Install `web-push` di api-server | `artifacts/api-server/package.json` | 0.25 hari |
| C-2 | Generate VAPID key pair + simpan ke Replit Secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) | — | 0.25 hari |
| C-3 | Endpoint `POST /api/push/send` — kirim push ke semua subscriber | `artifacts/api-server/src/routes/push.ts` | 1 hari |
| C-4 | Sambungkan `restock-notify`, `broadcast-buyers`, renewal reminder ke endpoint push | `notifications.ts`, `admin-tools.ts` | 0.5 hari |
| C-5 | Aktifkan `PushNotificationManager.tsx` (hapus return null, wire ke VAPID public key) | Frontend | 0.5 hari |

---

### 🟠 FASE D — Payment Checkout Wired ke Frontend

Backend Midtrans/Xendit sudah lengkap di server. Tapi **checkout frontend belum tersambung ke payment gateway:**

| Area | Status Saat Ini | Yang Perlu Dibangun |
|---|---|---|
| **POS checkout** (`pos-checkout.ts`) | Insert langsung ke Supabase dengan status "paid" (cash only) | Tambah flow Midtrans Snap/Xendit Invoice untuk pembayaran non-cash |
| **Storefront checkout** (`/checkout`) | UI ada, metode pembayaran ada (termasuk BNPL) | Wire `POST /api/payments/create` → terima `payment_url` → redirect ke Snap/Xendit |
| **Booking deposit** | Callback route ada (`booking.$id.payment-callback.tsx`) | Verifikasi end-to-end dengan Midtrans sandbox |
| **Halaman sukses/gagal** | `/checkout/sukses/$orderId` ada | Pastikan terima status dari webhook, bukan cuma dari redirect URL |

**Yang perlu dibangun:**

| # | Task | File | Estimasi |
|---|------|------|----------|
| D-1 | Sambungkan `/checkout` ke `POST /api/payments/create` | `artifacts/kopihub/src/routes/checkout.tsx` | 1 hari |
| D-2 | Tampilkan Midtrans Snap popup / redirect ke Xendit Invoice | `checkout.tsx` | 0.5 hari |
| D-3 | Webhook test end-to-end (Midtrans sandbox → `/api/webhooks/midtrans`) | `webhooks.ts` | 0.5 hari |
| D-4 | POS: Tambah tombol "Bayar Non-Cash" yang trigger Midtrans/Xendit | `pos-app.pos.tsx` | 1 hari |

---

### 🟠 FASE E — WhatsApp Broadcast via Server API

Saat ini `/pos-app/broadcast-wa` membuka `window.open(wa.me/...)` per kontak — **tidak ada server-side send.**

| # | Task | Estimasi | Catatan |
|---|------|----------|---------|
| E-1 | Integrasi Fonnte (WhatsApp unofficial, murah) atau Meta Business API | 2 hari | Perlu `WA_API_KEY` dari merchant |
| E-2 | Endpoint `POST /api/wa/send-bulk` di Express | 1 hari | Rate limiting per toko |
| E-3 | Ganti `window.open()` di `broadcast-wa.tsx` ke API call | 0.5 hari | |

**Alternatif jangka pendek:** Tetap manual tapi tambahkan export nomor + pesan ke CSV agar merchant bisa pakai tool blast WA pihak ketiga.

---

### 🟡 FASE F — Rename Tabel di DB Supabase

Kode sudah pakai nama baru, tapi DB aktual belum direname. Jika tabel di DB masih pakai nama lama:

```sql
-- Cek status
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('shops', 'coffee_shops', 'product_combos', 'fnb_combos');

-- Jika perlu:
ALTER TABLE public.coffee_shops RENAME TO shops;
ALTER TABLE IF EXISTS public.fnb_combos RENAME TO product_combos;
```

---

### 🟡 FASE G — Quick Wins Masih Partial

| # | Item | Status PRD | Status Aktual |
|---|------|-----------|---------------|
| QW1 | Loading skeleton di **semua** halaman | ⚠️ Partial | Masih ⚠️ — belum semua halaman punya skeleton |
| QW2 | Empty state informatif di semua list | ⚠️ Partial | Masih ⚠️ — belum exhaustif |

---

### 🟡 FASE H — Masalah Teknis Lintas-Fitur (PRD §5)

| # | Masalah | Status |
|---|---------|--------|
| T2 | SQL Injection via `table` param di PostgREST proxy | ⚠️ Whitelist perlu diverifikasi aktif |
| T4 | CORS masih terlalu terbuka | ⚠️ Perlu set ke domain produksi saja saat deploy |
| 5.3 | Duplikasi `login.tsx`+`masuk.tsx`, `signup.tsx`+`daftar.tsx` | ✅ Sudah jadi redirect shim — OK |
| 5.5 | PostgREST: JOIN/embedded resources (`select=*,shop:shops(name)`) | ❌ Belum diimplementasi di proxy |
| 5.4 | Pagination: beberapa list masih `limit(500)` tanpa cursor | ⚠️ Partial — customers sudah, lainnya belum |

---

### 🟡 FASE I — types.ts Tidak Sinkron (88 vs 160+ Tabel)

Setelah migration dijalankan, wajib regenerasi:

```bash
npx supabase gen types typescript \
  --project-id <SUPABASE_PROJECT_ID> \
  > artifacts/kopihub/src/integrations/supabase/types.ts
```

Tabel yang **ada di kode tapi belum di types.ts** (casting `as any` di banyak tempat):

| Domain | Tabel Hilang |
|--------|-------------|
| Rental | `rental_units`, `rental_bookings`, `rental_checklists`, `rental_inspections` |
| Booking Extended | `booking_addons`, `booking_reviews`, `booking_vouchers` |
| Studio Foto | `studio_galleries`, `studio_briefs`, `studio_packages`, `studio_deliveries` |
| Kursus/LMS | `course_modules`, `course_lessons`, `course_enrollments`, `course_certificates` |
| Klinik | `patient_records`, `medications`, `prescriptions`, `medical_invoices` |
| Travel | `umroh_packages`, `travel_jamaah_manifest`, `travel_itineraries` |
| POS Extended | `tables`, `table_maps`, `queue_sessions`, `pos_audit_log` |
| Produk Extended | `flash_sales`, `happy_hour_rules`, `bulk_pricing_rules`, `product_combos` |
| Shop Extended | `shop_api_keys`, `storefront_layouts`, `page_layouts` |
| Loyalty Extended | `loyalty_tiers`, `loyalty_rewards`, `loyalty_redemptions` |
| Integrasi | `webhook_events`, `api_keys`, `api_usage` |

---

## BAGIAN 3 — RINGKASAN PRIORITAS PENGERJAAN

### Urutan yang Direkomendasikan

```
SEGERA (Blocker Go-Live):
  A. Jalankan 5 SQL migration di Supabase Dashboard
  B. Konfigurasi secrets di Replit (Supabase keys, Midtrans, Xendit, Resend)

MINGGU INI (Core functionality):
  D. Sambungkan checkout frontend ke payment gateway Midtrans/Xendit
  C. Bangun push notification backend (VAPID + web-push)

MINGGU DEPAN (Fitur penting):
  I. Regenerasi types.ts setelah semua migration jalan
  F. Rename tabel di DB Supabase (coffee_shops → shops, dll.)
  H. Fix CORS ke domain produksi + verifikasi whitelist SQL injection

OPSIONAL (Nice to have):
  E. WhatsApp broadcast via server API (Fonnte/Meta)
  G. Lengkapi loading skeleton + empty state
```

---

## BAGIAN 4 — METRIK KESIAPAN AKTUAL

| Role | Route Ada | DB Tersambung | Fitur Kritis Belum Jalan | % Siap Aktual |
|---|---|---|---|---|
| **Super Admin** | 61 ✅ | ~55 ✅ | — | **~90%** |
| **Merchant / Owner** | 154 ✅ | ~148 ✅ | WA API, Push backend | **~88%** |
| **Customer** | 21 ✅ | ~19 ✅ | **Checkout payment** ❌ | **~75%** |
| **Kurir** | 6 ✅ | ~5 ✅ | — | **~90%** |
| **Marketplace Publik** | 62+ ✅ | ~58 ✅ | **Checkout payment** ❌ | **~78%** |
| **Infrastruktur DB** | — | — | 5 SQL migration belum jalan | **~40%** |
| **Infrastruktur Secrets** | — | — | Midtrans/Xendit/Resend | **~30%** |

> **Kesimpulan:** Kode platform sudah sangat lengkap (300+ route, arsitektur solid). Hambatan utama bukan fitur baru, melainkan **eksekusi migration SQL di Supabase** dan **konfigurasi secrets/credentials**. Setelah dua hal itu selesai, platform siap diuji end-to-end.
