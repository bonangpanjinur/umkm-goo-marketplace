# PRD — UMKMgo
## Platform Marketplace & POS Multi-Kategori untuk UMKM Indonesia

**Versi:** 11.0 | **Diperbarui:** 30 Mei 2026 (Audit Kode Lengkap — re-verifikasi 314 route) | **Status:** Living Document — Satu-satunya sumber kebenaran

> File ini adalah **satu-satunya** dokumen rencana pengembangan. Semua file lain (ANALISIS_STATUS_PRD.md, progress_tracker.md, dll.) telah dihapus dan isinya dikonsolidasikan ke sini.

---

## PRINSIP UTAMA

> **Bangun fitur sederhana yang langsung terasa dampaknya.** Setiap fitur harus bisa dijelaskan dalam satu kalimat, bisa dibangun dalam < 2 hari, dan langsung meningkatkan salah satu dari tiga metrik inti: **Konversi**, **Retensi**, atau **Pendapatan Toko**.

**Aturan Pengembangan:**
1. Fitur baru wajib ada fallback — jika tabel belum ada, tampilkan SQL siap-jalankan
2. Semua data merchant selalu di-scope dengan `shop_id`
3. UI dalam Bahasa Indonesia
4. Mobile-first (nyaman di 375px)
5. Data lokal dulu (localStorage/state) untuk fitur tanpa DB baru
6. Tidak ada breaking change — fitur baru tidak boleh merusak yang sudah jalan

---

## BAGIAN 1 — RINGKASAN EKSEKUTIF (Audit Kode Aktual, 30 Mei 2026)

| Dimensi | Angka Aktual |
|---|---|
| **Total route file** | **314** (bukan 303 — bertambah dari fase 10) |
| Route super admin (`/admin/*`) | **65** |
| Route merchant dashboard (`/pos-app/*`) | **159** |
| Route akun pembeli (`/akun/*`) | **22** |
| Route kurir (`/kurir/*`) | **6** |
| Route publik / toko / marketplace | **62** |
| Route storefront merchant (`/s/*`) | **9** |
| Komponen UI | **50+ komponen** di `src/components/` |
| API endpoint backend | **40+ endpoint** di Express server |
| Kategori bisnis yang didukung | **11** (fnb, retail, jasa, rental, kursus, salon, klinik, studio-foto, travel, custom-order, lainnya) |

### Kesimpulan Audit

Kode platform sangat luas dan ambisius. Namun terdapat **gap signifikan antara klaim PRD sebelumnya dan kenyataan kode**:

| Klaim PRD Lama | Kenyataan Aktual |
|---|---|
| Fase 1–10 "100% selesai" | ✅ Route & UI ada — ⚠️ tapi ~39 pos-app, ~36 admin, ~14 akun halaman masih **mock** (tidak ada Supabase query) |
| Checkout tersambung payment gateway | ✅ Kode `payment-gateway.ts` ada + `initiatePayment` dipakai di `checkout.tsx` — ⚠️ secrets belum dikonfigurasi |
| Quick Wins selesai semua | ✅ QW1–QW9 kode ada |
| Kurir 100% | ⚠️ `CourierDashboard.tsx` punya query nyata; tapi `kurir.earnings`, `kurir.history`, `kurir.profile`, `kurir.withdraw` route files masih **tanpa Supabase query** |
| Push notification selesai | ❌ `PushNotificationManager.tsx` return null — backend VAPID delivery worker tidak ada |

**Hambatan utama go-live:** Bukan kurangnya fitur, melainkan (1) secrets belum dikonfigurasi, (2) SQL migration belum dijalankan di Supabase, (3) ~89 halaman masih UI mock tanpa data nyata.

---

## BAGIAN 2 — STATUS TERKINI: BLOCKER GO-LIVE

### 🔴 KRITIS — Harus diselesaikan sebelum production

| ID | Item | Tindakan |
|----|------|----------|
| **BL-1** | `MIDTRANS_SERVER_KEY` belum dikonfigurasi | Set di **Replit Secrets** → payment checkout gagal |
| **BL-2** | `XENDIT_SECRET_KEY` belum dikonfigurasi | Set di **Replit Secrets** → Xendit checkout gagal |
| **BL-3** | `RESEND_API_KEY` belum dikonfigurasi | Set di **Replit Secrets** → undangan staff & renewal email tidak terkirim |
| **BL-4** | Schema Supabase belum di-apply | Jalankan file di `scripts/fresh_schema/` via Supabase SQL Editor |
| **BL-5** | `types.ts` belum diregenerasi | Jalankan `npx supabase gen types typescript --project-id <ID>` setelah schema di-apply |
| **BL-15** | ✅ FIXED — API Server gagal build | `web-push` dan `pg` sudah diinstall & ditambah ke esbuild external list (`artifacts/api-server/build.mjs`). API Server kini RUNNING. |
| **BL-16** | SQL Analytics RPCs belum ada di Supabase | Jalankan `scripts/fase11_analytics_rpcs.sql` → dibutuhkan oleh `/admin/analytics` dan `/pos-app/marketplace-analytics` |

### 🟡 PENTING — Untuk fitur lengkap

| ID | Item | Tindakan |
|----|------|----------|
| **BL-6** | Rename `coffee_shops → shops` belum diverifikasi di DB aktual | Jalankan `ALTER TABLE IF EXISTS public.coffee_shops RENAME TO shops` di Supabase |
| **BL-7** | `shops_nearby` RPC belum diverifikasi ada | Jalankan SQL RPC dari migration fase 7 |
| **BL-8** | VAPID keys belum dikonfigurasi | Set `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` di Replit Secrets |
| **BL-9** | `RAJAONGKIR_API_KEY` belum dikonfigurasi | Set di Replit Secrets → ongkir tidak bisa dihitung |
| **BL-10** | JWT hanya di-decode, tidak diverifikasi signature | Set `SUPABASE_JWT_SECRET` di Replit Secrets untuk full verification di `rest.ts` |

### 🟢 RENDAH — Nice to have

| ID | Item | Keterangan |
|----|------|------------|
| **BL-11** | WhatsApp broadcast aktual | UI + `wa.me` deep-link ada; full WA Business API (360dialog/Twilio) perlu credentials merchant |
| **BL-12** | pg_cron untuk auto-cancel & churn | Function `fn_auto_cancel_expired` dan `fn_churn_metrics_snapshot` sudah ada; perlu enable pg_cron di Supabase |
| **BL-13** | `menu_item_options → product_options` rename | Opsional, 6 file terdampak |
| **BL-14** | Mobile App (React Native/Expo) | Di luar scope — proyek terpisah |

---

## BAGIAN 3 — INVENTORI FITUR PER ROLE

> **Legenda:** ✅ Real (tersambung Supabase) | ⚠️ Mock (UI tanpa query DB) | ❌ Tidak ada

### 3.1 — CUSTOMER / PEMBELI

**Marketplace publik** (tidak butuh login):

| Halaman | Status | Catatan |
|---------|--------|---------|
| Beranda (`/`) | ✅ Real | Hero, kategori, toko unggulan |
| Kategori (`/kategori/$slug`) | ✅ Real | Filter, nearby shops |
| Cari produk (`/search`) | ✅ Real | Full-text search via PostgREST |
| Halaman toko (`/toko/$slug`) | ✅ Real | Rating, follow, share, peta |
| Halaman produk (`/toko/$slug/produk/$id`) | ✅ Real | Q&A, ulasan, bandingkan |
| Keranjang (`/keranjang`) | ✅ Real | Multi-toko, promo |
| Checkout (`/checkout`) | ✅ Real | Midtrans Snap/Xendit wired — ⚠️ butuh BL-1/BL-2 |
| Lacak pesanan (`/track/$orderId`) | ✅ Real | SSE realtime |
| Promo & flash sale (`/promo`) | ✅ Real | |
| Toko sekitar (`/sekitar`) | ✅ Real | GPS + Leaflet map |
| Bandingkan produk (`/bandingkan`) | ✅ Real | localStorage |
| Live commerce (`/live/$shopSlug`) | ✅ Real | |
| Leaderboard (`/leaderboard`) | ✅ Real | |

**Akun pembeli** (butuh login):

| Halaman | Status | Catatan |
|---------|--------|---------|
| Dashboard akun (`/akun`) | ✅ Real | |
| Alamat pengiriman (`/akun/alamat`) | ✅ Real | CRUD lengkap |
| Detail pesanan (`/akun/pesanan/$id`) | ✅ Real | Chat, return, submit ulasan |
| Daftar pesanan (`/akun/pesanan/`) | ✅ Real | |
| Saldo wallet (`/akun/saldo`) | ✅ Real | Top up via payment gateway |
| Wishlist (`/akun/wishlist`) | ✅ Real | Query `wishlists` table — CRUD wishlist produk |
| Favorit toko (`/akun/favorit`) | ✅ Real | Query `orders` + favorites via localStorage label — re-order 1 klik |
| Riwayat dilihat (`/akun/riwayat`) | ✅ Real | localStorage + supabase enrich dari `menu_items` + `shops` |
| Poin loyalty (`/akun/loyalty`) | ✅ Real | Query `loyalty_points`, `loyalty_settings`, `loyalty_transactions` |
| Notifikasi (`/akun/notifikasi`) | ✅ Real | Query via `useNotifications` hook → `notifications` table, mark-as-read |
| Booking saya (`/akun/bookings`) | ✅ Real | Query `bookings` + `booking_slots` + `booking_reviews` + reschedule + ICS export |
| Langganan produk (`/akun/langganan`) | ✅ Real | Query `product_subscriptions`, pause/resume |
| Produk digital (`/akun/digital-products`) | ✅ Real | Query `orders` + `order_items` untuk digital downloads |
| Kursus saya (`/akun/kursus`) | ✅ Real | Query `course_enrollments` |
| Custom order (`/akun/custom-orders`) | ✅ Real | Query `custom_orders` by buyer |
| Cashback (`/akun/cashback`) | ✅ Real | Query `cashback_wallets` + `cashback_transactions` |
| Nilai kurir (`/akun/rate-kurir`) | ✅ Real | Query `courier_ratings` — submit rating kurir |
| Pengembalian barang (`/akun/returns`) | ✅ Real | Query `return_requests`, submit return baru |

**Status buyer:** Semua 22 halaman akun terhubung ke Supabase (dikonfirmasi audit kode 30 Mei 2026). Gap sebelumnya sudah ditutup di Fase 11.

---

### 3.2 — MERCHANT / OWNER

**Dashboard & Core Operations (✅ Real — tersambung Supabase):**

| Area | Halaman | Status |
|------|---------|--------|
| Dashboard utama | `pos-app/` (index) | ✅ Real |
| POS Kasir | `pos-app/pos` | ✅ Real (1200+ baris) |
| Menu/Produk | `pos-app/menu` | ✅ Real (1500+ baris) |
| Pesanan | `pos-app/orders`, `pos-app/marketplace-orders`, `pos-app/online-orders` | ✅ Real |
| Inventori & Stok | `pos-app/inventory`, `pos-app/stok` | ✅ Real |
| Karyawan & Shift | `pos-app/employees`, `pos-app/schedule`, `pos-app/shifts`, `pos-app/attendance` | ✅ Real |
| Pelanggan | `pos-app/customers`, `pos-app/customer-treatments` | ✅ Real |
| Booking | `pos-app/booking` | ✅ Real (2300+ baris) |
| Custom Order | `pos-app/custom-orders` | ✅ Real |
| Produk Digital | `pos-app/digital`, `pos-app/digital-version`, `pos-app/digital-licenses` | ✅ Real |
| Kurir (daftar) | `pos-app/couriers` | ✅ Real |
| Supplier & PO | `pos-app/suppliers`, `pos-app/purchase-orders` | ✅ Real |
| Promo & Voucher | `pos-app/promos`, `pos-app/vouchers` | ✅ Real |
| Ulasan | `pos-app/reviews`, `pos-app/booking-reviews` | ✅ Real |
| Iklan & Iklan Berbayar | `pos-app/iklan` | ✅ Real |
| KDS (Dapur) | `pos-app/kds` | ✅ Real |
| Antrian | `pos-app/antrian` | ✅ Real |
| Keuangan & Laporan | `pos-app/keuangan`, `pos-app/reports`, `pos-app/reports/profit`, `pos-app/reports/multi-outlet` | ✅ Real |
| Outlets | `pos-app/outlets` | ✅ Real |
| Pengaturan & Branding | `pos-app/settings` | ✅ Real |
| Role & Permissions | `pos-app/role-mapping` | ✅ Real |
| Storefront Builder | `pos-app/storefront-builder` | ✅ Real |
| Restock Notify | `pos-app/restock-notify` | ✅ Real |
| Upsell | `pos-app/upsell` | ✅ Real |
| Membership | `pos-app/membership` | ✅ Real |
| Group Buy | `pos-app/group-buy` | ✅ Real |
| Subscription Produk | `pos-app/product-subscriptions` | ✅ Real |
| Travel/Umroh | `pos-app/umroh-packages`, `pos-app/travel-manifest`, `pos-app/travel-itinerary`, `pos-app/travel-installments`, `pos-app/jamaah-documents` | ✅ Real |
| Klinik/Medis | `pos-app/medications`, `pos-app/prescriptions` | ✅ Real |
| Studio Foto | `pos-app/studio-gallery`, `pos-app/studio-photographers`, `pos-app/studio-watermark` | ✅ Real |
| Rental | `pos-app/rental-checklist`, `pos-app/rental-inspections` | ✅ Real |
| Varian Produk | `pos-app/variants`, `pos-app/variant-matrix`, `pos-app/atribut` | ✅ Real |
| Bundel & Resep | `pos-app/bundles`, `pos-app/recipes` | ✅ Real |

**Halaman Merchant yang Masih Mock (⚠️ UI ada, belum tersambung DB):**

| Halaman | Fitur yang Seharusnya Real | Tabel DB Target |
|---------|---------------------------|-----------------|
| `pos-app/anamnesis` | Form anamnesis pasien | `patient_anamnesis` |
| `pos-app/appearance` | Pengaturan tampilan toko (warna, font) | `shop_appearance` |
| `pos-app/audit-logs` | Log aksi karyawan | `pos_audit_log` |
| `pos-app/booking-analytics` | Grafik booking per periode | `bookings` (aggregasi) |
| `pos-app/booking-reminders` | Daftar & kirim reminder booking | `bookings`, `notifications` |
| `pos-app/broadcast-wa` | Blast pesan ke daftar kontak | `shop_customers`, WA API |
| `pos-app/bulk-pricing` | Aturan harga grosir | `bulk_pricing_rules` |
| `pos-app/capabilities` | Toggle fitur aktif per toko | `shop_capabilities` |
| `pos-app/cash-drawer` | Buka/tutup laci kas + log | `cash_sessions` |
| `pos-app/certificates` | Upload & kelola sertifikat merchant | `merchant_certificates` |
| `pos-app/combo-builder` | Buat produk combo | `product_combos` |
| `pos-app/contracts` | Kelola kontrak digital | `digital_contracts` |
| `pos-app/courier` (pengaturan) | Pengaturan zona kurir | `courier_zones` |
| `pos-app/custom-css` | Inject CSS ke storefront | `storefront_layouts` |
| `pos-app/customer-analytics` | Grafik & segmentasi pelanggan | `orders`, `customer_profiles` |
| `pos-app/custom-order-quotes` | Buat & kirim penawaran harga | `custom_order_quotes` |
| `pos-app/email-marketing` | Kirim email kampanye | `marketing_campaigns`, Resend API |
| `pos-app/flash-sale` | Jadwal & harga flash sale | `menu_items` (kolom flash_*) |
| `pos-app/flyers` | Generate & download flyer promosi | Supabase Storage |
| `pos-app/followup-reminders` | Jadwal auto-reminder ke pelanggan | `followup_reminders` |
| `pos-app/happy-hour` | Jadwal & diskon happy hour | `menu_items` (kolom happy_hour_*) |
| `pos-app/invoice` | Generate invoice PDF/HTML | `orders` → PDF |
| `pos-app/job-deliverables` | Upload deliverable proyek | `job_deliverables` |
| `pos-app/kitchen-load` | Estimasi beban dapur per slot | `orders`, `menu_items` |
| `pos-app/kursus` | Buat & kelola kursus/modul | `courses`, `course_modules` |
| `pos-app/laporan-harian` | Laporan ringkas per hari | `orders`, `cash_shifts` |
| `pos-app/lesson-progress` | Progress peserta kursus | `course_enrollments` |
| `pos-app/limited-editions` | Produk edisi terbatas + countdown | `menu_items` |
| `pos-app/lookbook` | Upload foto koleksi produk | Supabase Storage |
| `pos-app/loyalty` + `loyalty/rewards` | Konfigurasi poin & hadiah | `loyalty_tiers`, `loyalty_rewards` |
| `pos-app/marketplace-analytics` | Analitik dari marketplace (views, klik) | `shop_analytics` |
| `pos-app/medical-invoice` | Invoice untuk layanan medis | `medical_invoices` |
| `pos-app/milestones` | Milestone proyek klien | `project_milestones` |
| `pos-app/order-audit` | Audit trail perubahan status order | `order_audit_log` |
| `pos-app/outlet-shipping` | Ongkir per outlet | `outlet_shipping_zones` |
| `pos-app/patient-records` | Rekam medis pasien | `patient_records` |
| `pos-app/payslip` | Slip gaji karyawan | `attendances`, `shifts` |
| `pos-app/permissions` | Izin granular per karyawan | `staff_permissions` |
| `pos-app/printers` | Daftar printer & test print | `pos-printers` via `/printer/ping` |
| `pos-app/skin-quiz` | Quiz kulit untuk salon/klinik | `skin_quiz_answers` |
| `pos-app/size-guide` | Tabel ukuran produk fashion | `size_guides` |
| `pos-app/staff-dashboard` | Dashboard shift personal kasir | `shifts`, `attendances` |
| `pos-app/studio-addons`, `studio-brief`, `studio-delivery`, `studio-locations`, `studio-packages`, `studio-photo-reviews` | Detail studio foto | `studio_*` tables |
| `pos-app/telemedicine` | Slot & konsultasi telemedicine | `telemedicine_slots` |
| `pos-app/testimonials` | Kelola testimoni pelanggan | `testimonials` |
| `pos-app/verified-claims` | Klaim terverifikasi produk/toko | `verified_claims` |
| `pos-app/waitlist` | Daftar tunggu produk/slot | `waitlist_entries` |
| `pos-app/wip-gallery` | Galeri work-in-progress | Supabase Storage |
| `pos-app/wishlist-analytics` | Analitik produk yang di-wishlist | `wishlists` |

**Total pos-app mock: ~48 halaman dari 159 (30%).**

---

### 3.3 — ADMIN PLATFORM

**Halaman Admin yang Real (tersambung Supabase):**

| Halaman | Status |
|---------|--------|
| Dashboard admin (`/admin/`) | ✅ Real |
| Manajemen toko (`/admin/shops`) | ✅ Real |
| Audit trail (`/admin/audit`) | ✅ Real |
| Branding platform (`/admin/branding`) | ✅ Real |
| Broadcast (`/admin/broadcast`) | ✅ Real |
| Tindakan pembeli (`/admin/buyer-actions`) | ✅ Real |
| Katalog platform (`/admin/catalog`) | ✅ Real |
| Churn analysis (`/admin/churn`) | ✅ Real |
| Domain kustom (`/admin/domains`) | ✅ Real |
| Pengingat kadaluarsa (`/admin/expiry-reminders`) | ✅ Real |
| Feature flags (`/admin/feature-flags`) | ✅ Real |
| Laporan keuangan (`/admin/financial-report`) | ✅ Real |
| Fraud scoring (`/admin/fraud-scoring`) | ✅ Real |
| GDPR tools (`/admin/gdpr-tools`) | ✅ Real |
| Impersonasi (`/admin/impersonation`) | ✅ Real |
| Tagihan platform (`/admin/invoices`, `/admin/platform-billing`) | ✅ Real |
| Template notifikasi (`/admin/notification-templates`) | ✅ Real |
| Paket/Plans (`/admin/plans`, `/admin/plans/$id/matrix`) | ✅ Real |
| Revenue leakage (`/admin/revenue-leakage`) | ✅ Real |
| Revenue (`/admin/revenue`) | ✅ Real |
| Pengaturan platform (`/admin/settings`) | ✅ Real |
| Override reminder toko (`/admin/shop-reminder-overrides`) | ✅ Real |
| SLA monitor (`/admin/sla-monitor`) | ✅ Real |
| Laporan pajak (`/admin/tax-report`) | ✅ Real |
| Voucher platform (`/admin/vouchers`) | ✅ Real |
| Penarikan dana (`/admin/withdrawals`) | ✅ Real |

**Halaman Admin yang Masih Mock (⚠️ UI tanpa DB query):**

| Halaman | Yang Seharusnya Real |
|---------|---------------------|
| `admin.activity` | Log aktivitas platform realtime |
| `admin.ads` | Manajemen iklan berbayar merchant |
| `admin.affiliate` | Program afiliasi & komisi |
| `admin.ai-settings` | Konfigurasi AI (model, prompt, budget) |
| `admin.analytics` | Analitik platform (DAU, MAU, GMV) |
| `admin.api-keys` | CRUD API keys merchant |
| `admin.auto-cancel` | Konfigurasi & trigger auto-cancel |
| `admin.auto-renewal` | Konfigurasi auto-renewal plan |
| `admin.banners` | Upload & jadwal banner homepage |
| `admin.booking-config` | Konfigurasi booking global |
| `admin.broadcast-buyers` | Multi-channel blast ke semua pembeli |
| `admin.categories` | CRUD kategori marketplace |
| `admin.category-revenue` | Revenue breakdown per kategori |
| `admin.churn-reengagement` | Daftar & kirim campaign re-engagement |
| `admin.cohort-analytics` | Analisis kohort pengguna |
| `admin.commission` | Konfigurasi & lihat hasil komisi |
| `admin.credentials` | Kelola service credentials |
| `admin.disputes` | Daftar & resolve sengketa |
| `admin.fee-simulator` | Simulasi biaya platform |
| `admin.fraud` | Daftar merchant/order terindikasi fraud |
| `admin.health-score` + `health-score/$shopId` | Skor kesehatan tiap toko |
| `admin.kyc` | Verifikasi dokumen KYC merchant |
| `admin.merchant-tiers` | Konfigurasi tier & benefit merchant |
| `admin.migrations` | Status & run DB migrations |
| `admin.moderation` | Moderasi produk/toko yang dilaporkan |
| `admin.multi-admin` | Kelola tim admin platform |
| `admin.onboarding-automation` | Alur & trigger onboarding merchant |
| `admin.payment-config` | Konfigurasi gateway pembayaran |
| `admin.payout-scheduler` | Jadwal & eksekusi payout ke merchant |
| `admin.push-config` | Konfigurasi VAPID + push topics |
| `admin.reconciliation` | Rekonsiliasi payment gateway vs DB |
| `admin.shops.$id` | Detail lengkap satu toko |
| `admin.users` | Daftar & kelola semua user |
| `admin.webhook-monitor` | Log delivery webhook merchant |

**Total admin mock: ~34 halaman dari 65 (52%).**

---

### 3.4 — KURIR

| Halaman | Status | Catatan |
|---------|--------|---------|
| Dashboard kurir (`/kurir/`) | ✅ Real | `CourierDashboard.tsx` punya Supabase query + SSE realtime |
| Upload foto bukti pengiriman | ✅ Real | Supabase Storage `delivery-proofs` |
| Peta navigasi | ✅ Real | Google Maps embed + OSM |
| Riwayat pengiriman (`/kurir/history`) | ✅ Real | Query `couriers` + `orders` by `courier_id`, filter status/tanggal/toko |
| Penghasilan (`/kurir/earnings`) | ✅ Real | Query `courier_earnings` table — summary & breakdown harian |
| Profil kurir (`/kurir/profile`) | ✅ Real | Query & edit `couriers` table (nama, telepon, kendaraan, foto) |
| Penarikan dana (`/kurir/withdraw`) | ✅ Real | Query + submit `withdrawal_requests` + `couriers.balance` |
| Notifikasi order baru (SSE) | ✅ Real | SSE broker aktif, `CourierDashboard` subscribe ke event realtime |

**Status kurir:** Semua 6 halaman kurir terhubung ke Supabase (dikonfirmasi audit kode 30 Mei 2026). Fase 12 selesai penuh.

---

### 3.5 — STOREFRONT (`/s/$slug/*`)

Storefront adalah mini-app untuk order dine-in/QR langsung dari meja:

| Halaman | Status |
|---------|--------|
| Home storefront (`/s/$slug/`) | ✅ Real |
| Menu item (`/s/$slug/menu/$menuId`) | ✅ Real |
| Keranjang storefront | ✅ Real |
| Checkout storefront | ✅ Real |
| Pesanan saya | ✅ Real |
| Bayar (`/s/$slug/pay/$orderId`) | ⚠️ Partial — gateway wired tapi butuh BL-1/BL-2 |
| Login storefront | ✅ Real |
| Profil storefront | ✅ Real |

---

## BAGIAN 4 — RENCANA PERBAIKAN & BACKLOG

> Diurutkan dari dampak tertinggi ke rendah. Setiap fase bisa dikerjakan mandiri.

---

### 🔥 Fase 11 — Sambungkan Akun Pembeli ke DB (Prioritas Tinggi)

> Target: Halaman akun pembeli yang masih mock → tersambung data nyata dari Supabase

**Estimasi total: 3–4 hari**

| ID | Task | Tabel Target | Estimasi |
|----|------|-------------|----------|
| F11-1 | **Riwayat pesanan** `/akun/riwayat` — query `orders` by `customer_id`, tampilkan status realtime | `orders` | 0.5 hari |
| F11-2 | **Wishlist/Favorit** `/akun/wishlist` & `/akun/favorit` — CRUD `wishlists` + `shop_follows` | `wishlists`, `shop_follows` | 0.5 hari |
| F11-3 | **Poin loyalty** `/akun/loyalty` — query `loyalty_points` + riwayat redemption | `loyalty_points`, `loyalty_redemptions` | 0.5 hari |
| F11-4 | **Notifikasi pembeli** `/akun/notifikasi` — query `notifications` by `user_id`, mark-as-read | `notifications` | 0.25 hari |
| F11-5 | **Booking saya** `/akun/bookings` — query `bookings` by buyer, filter status | `bookings` | 0.5 hari |
| F11-6 | **Langganan produk** `/akun/langganan` — query `product_subscription_plans` aktif user | `product_subscriptions` | 0.5 hari |
| F11-7 | **Produk digital** `/akun/digital-products` — query digital downloads user | `digital_product_versions`, `orders` | 0.5 hari |
| F11-8 | **Pengembalian barang** `/akun/returns` — query `order_returns` by buyer | `order_returns` | 0.25 hari |
| F11-9 | **Cashback & referral** `/akun/cashback` & `/akun/referral` — query cashback balance + referral stats | `cashback_ledger`, `referrals` | 0.5 hari |

---

### 🔥 Fase 12 — Sambungkan Kurir ke DB (Prioritas Tinggi)

> Target: 4 halaman kurir yang masih mock → tersambung data nyata

**Estimasi total: 1.5 hari**

| ID | Task | Tabel Target | Estimasi |
|----|------|-------------|----------|
| F12-1 | **Riwayat pengiriman** `/kurir/history` — query `orders` where `courier_id = me`, filter status + tanggal | `orders`, `couriers` | 0.5 hari |
| F12-2 | **Penghasilan kurir** `/kurir/earnings` — query `couriers.balance` + riwayat `withdrawal_requests` + transaksi harian | `couriers`, `withdrawal_requests` | 0.5 hari |
| F12-3 | **Profil kurir** `/kurir/profile` — query & edit `couriers` (nama, no. HP, kendaraan, foto) | `couriers` | 0.25 hari |
| F12-4 | **Penarikan dana** `/kurir/withdraw` — submit & lihat status `withdrawal_requests` | `withdrawal_requests`, `couriers` | 0.25 hari |

---

### 🟠 Fase 13 — Push Notification Backend (Prioritas Sedang)

> Target: Bangun VAPID delivery worker yang hilang

**Estimasi total: 2 hari**

| ID | Task | File | Estimasi |
|----|------|------|----------|
| F13-1 | Install `web-push` di api-server + generate VAPID key pair | `api-server/package.json` | 0.25 hari |
| F13-2 | Endpoint `POST /api/push/send` — kirim push ke subscriber | `api-server/src/routes/push.ts` | 0.5 hari |
| F13-3 | Aktifkan `PushNotificationManager.tsx` (hapus `return null`, wire ke VAPID public key) | Frontend component | 0.5 hari |
| F13-4 | Sambungkan restock-notify, broadcast-buyers, renewal ke endpoint push | `notifications.ts`, `admin-tools.ts` | 0.5 hari |
| F13-5 | Test end-to-end push di browser (Chrome + service worker) | — | 0.25 hari |

---

### 🟠 Fase 14 — Admin Tools Real Data (Prioritas Sedang)

> Target: Sambungkan ~20 admin halaman kritis yang masih mock ke DB nyata

**Estimasi total: 4–5 hari**

| ID | Task | Tabel Target | Estimasi |
|----|------|-------------|----------|
| F14-1 | **Manajemen users** `/admin/users` — query `profiles` + `auth.users`, ban/unban | `profiles` | 0.5 hari |
| F14-2 | **Detail toko** `/admin/shops/$id` — tampilkan metrik, orders, revenue satu toko | `shops`, `orders` | 0.5 hari |
| F14-3 | **Payout scheduler** `/admin/payout-scheduler` — daftar merchant pending payout + eksekusi | `payout_schedules`, `withdrawal_requests` | 1 hari |
| F14-4 | **Disputes** `/admin/disputes` — daftar & resolve sengketa order | `disputes`, `orders` | 0.5 hari |
| F14-5 | **Moderation** `/admin/moderation` — antrian produk/toko dilaporkan | `moderation_queue` | 0.5 hari |
| F14-6 | **KYC verifikasi** `/admin/kyc` — approve/reject dokumen merchant | `kyc_submissions` | 0.5 hari |
| F14-7 | **Broadcast buyers** `/admin/broadcast-buyers` — sambungkan ke endpoint push + email | `notifications` | 0.5 hari |
| F14-8 | **Activity log** `/admin/activity` — stream log aktivitas platform real-time | `audit_logs` | 0.5 hari |
| F14-9 | **Analytics platform** `/admin/analytics` — DAU, MAU, GMV dari `orders` | `orders`, `profiles` | 0.5 hari |
| F14-10 | **Webhook monitor** `/admin/webhook-monitor` — tampilkan `webhook_events` nyata | `webhook_events` | 0.25 hari |
| F14-11 | **API Keys** `/admin/api-keys` — CRUD `api_keys` merchant | `api_keys` | 0.25 hari |
| F14-12 | **Auto-cancel config** `/admin/auto-cancel` — trigger & lihat hasil | `orders`, backend fn | 0.25 hari |
| F14-13 | **Merchant tiers** `/admin/merchant-tiers` — CRUD tier + benefit | `merchant_tiers` | 0.5 hari |

---

### 🟡 Fase 15 — Merchant Mock Pages Batch 1 (Prioritas Sedang)

> Target: ~20 halaman merchant mock yang paling sering dipakai → tersambung DB

**Estimasi total: 4–6 hari**

| ID | Task | Prioritas | Estimasi |
|----|------|-----------|----------|
| F15-1 | **Loyalty Program** `/pos-app/loyalty` & `/loyalty/rewards` — CRUD tiers + rewards | Tinggi | 1 hari |
| F15-2 | **Flash Sale** `/pos-app/flash-sale` — wire kolom `flash_*` di `menu_items` + countdown POS | Tinggi | 0.5 hari |
| F15-3 | **Happy Hour** `/pos-app/happy-hour` — wire kolom `happy_hour_*` + trigger diskon realtime di POS | Tinggi | 0.5 hari |
| F15-4 | **Cash Drawer** `/pos-app/cash-drawer` — open/close session + log kas | Sedang | 0.5 hari |
| F15-5 | **Laporan Harian** `/pos-app/laporan-harian` — query ringkas `orders` + `cash_shifts` hari ini | Sedang | 0.5 hari |
| F15-6 | **Audit Log POS** `/pos-app/audit-logs` — query `pos_audit_log` by shop | Sedang | 0.25 hari |
| F15-7 | **Customer Analytics** `/pos-app/customer-analytics` — chart repeat buyer, RFM dasar | Sedang | 0.5 hari |
| F15-8 | **Bulk Pricing** `/pos-app/bulk-pricing` — CRUD `bulk_pricing_rules` + apply di checkout | Sedang | 0.5 hari |
| F15-9 | **Booking Reminders** `/pos-app/booking-reminders` — daftar + kirim reminder manual | Sedang | 0.5 hari |
| F15-10 | **Email Marketing** `/pos-app/email-marketing` — wire ke `marketing_campaigns` + Resend API | Rendah | 0.5 hari |
| F15-11 | **Combo Builder** `/pos-app/combo-builder` — CRUD `product_combos` | Rendah | 0.5 hari |
| F15-12 | **Permissions granular** `/pos-app/permissions` — CRUD `staff_permissions` per karyawan | Rendah | 0.5 hari |

---

### 🟡 Fase 16 — Merchant Mock Pages Batch 2 (Prioritas Rendah)

> Halaman merchant yang lebih niche — tersambung DB sesuai kebutuhan bisnis vertikal

| ID | Task | Estimasi |
|----|------|----------|
| F16-1 | Anamnesis pasien `/pos-app/anamnesis` → `patient_anamnesis` | 0.5 hari |
| F16-2 | Rekam medis `/pos-app/patient-records` → `patient_records` | 0.5 hari |
| F16-3 | Invoice PDF merchant `/pos-app/invoice` → generate dari `orders` | 1 hari |
| F16-4 | Kursus & modul `/pos-app/kursus` → `courses`, `course_modules`, `course_lessons` | 1 hari |
| F16-5 | Skin quiz `/pos-app/skin-quiz` → `skin_quiz_answers` | 0.5 hari |
| F16-6 | Appearance toko `/pos-app/appearance` → `shop_appearance` | 0.5 hari |
| F16-7 | WIP Gallery `/pos-app/wip-gallery` → Supabase Storage | 0.5 hari |
| F16-8 | Lookbook `/pos-app/lookbook` → Supabase Storage | 0.5 hari |
| F16-9 | Custom CSS `/pos-app/custom-css` → `storefront_layouts.custom_css` | 0.25 hari |
| F16-10 | Milestone proyek `/pos-app/milestones` → `project_milestones` | 0.5 hari |
| F16-11 | Testimonials `/pos-app/testimonials` → `testimonials` | 0.25 hari |
| F16-12 | Verified claims `/pos-app/verified-claims` → `verified_claims` | 0.5 hari |

---

### 🟢 Fase 17 — WhatsApp Broadcast via Server API (Nice to Have)

| ID | Task | Estimasi |
|----|------|----------|
| F17-1 | Integrasi Fonnte (WA unofficial) atau Meta Business API | 2 hari |
| F17-2 | Endpoint `POST /api/wa/send-bulk` di Express | 1 hari |
| F17-3 | Ganti `window.open()` di `broadcast-wa.tsx` ke API call | 0.5 hari |
| F17-4 | Export kontak ke CSV (alternatif jangka pendek) | 0.25 hari |

---

## BAGIAN 5 — INFRASTRUKTUR & DEPLOYMENT

### 5.1 — Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 19 + Vite 7 + TanStack Router (file-based) + TanStack Query |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix UI) |
| State | Zustand (cart, parked carts) + localStorage |
| Backend API | Express 5 (port 3001) |
| Database utama | Supabase PostgreSQL (~142 tabel) |
| Database payment | Neon PostgreSQL via Drizzle ORM (`payment_transactions`, `webhook_logs`) |
| Auth | Supabase Auth (JWT) |
| Realtime | Supabase Realtime + SSE broker + BroadcastChannel |
| File Upload | Supabase Storage |
| Payment | Midtrans + Xendit (kode siap — secrets pending) |
| Email | Resend (kode siap — secrets pending) |
| Monorepo | pnpm workspaces, Node.js 24, TypeScript 5.9 |
| Build | esbuild (API server), Vite (frontend) |
| Routing | TanStack Router file-based (`routeTree.gen.ts` auto-generated) |

### 5.2 — API Endpoints Backend (`/artifacts/api-server`)

| Grup | Endpoint |
|------|---------|
| **PostgREST Proxy** | `GET/POST/PATCH/DELETE /rest/v1/:table`, `POST /rest/v1/rpc/:func` |
| **Payment** | `POST /payments/initiate`, `GET /payments/:orderId/status`, `POST /payments/refund`, `POST /payments/webhook/midtrans`, `POST /payments/webhook/xendit` |
| **Staff** | `POST /staff/create-user`, `/staff/delete-user`, `/staff/promote-to-login`, `/staff/set-password`, `/staff/update-role`, `/staff/resend-invitation`, `/staff/reset-password` |
| **SSE** | `GET /api/sse/stream`, `POST /api/sse/publish`, `GET /api/sse/status` |
| **Admin Tools** | `POST /admin/auto-cancel`, `POST /admin/commission/apply`, `POST /admin/churn/snapshot`, `DELETE /admin/user/:userId/data`, `POST /admin/restock-notify`, `POST /admin/migrations/run`, `GET /admin/migrations/status` |
| **Cron** | `POST /cron/renewal-notifications`, `GET /cron/renewal-preview`, `GET /cron/renewal-history` |
| **RajaOngkir** | `GET /rajaongkir/city`, `POST /rajaongkir/cost` |
| **AI** | `POST /ai/generate-description` |
| **Printer** | `POST /printer/tcp`, `POST /printer/ping` |
| **Webhooks** | `GET/POST/DELETE /webhooks`, `GET /webhooks/:id/deliveries`, `POST /webhooks/:id/test` |
| **Health** | `GET /healthz` |

### 5.3 — Database Schema (Ringkasan)

DB Supabase berisi ~142 tabel di `public` schema, mencakup:

| Domain | Tabel Utama |
|--------|-------------|
| Core | `shops`, `outlets`, `orders`, `menu_items`, `customers`, `profiles` |
| Keuangan | `payment_transactions`, `wallet_transactions`, `cash_shifts`, `plan_invoices`, `withdrawal_requests` |
| Logistik | `deliveries`, `couriers`, `courier_ratings`, `inventory_items`, `purchase_orders` |
| Marketing | `promo_codes`, `flash_sales`, `marketing_campaigns`, `loyalty_points`, `bulk_pricing_rules` |
| Booking | `bookings`, `booking_addons`, `booking_reviews` |
| Klinik | `patient_records`, `medications`, `prescriptions`, `medical_invoices` |
| Rental | `rental_units`, `rental_bookings`, `rental_checklists`, `rental_inspections` |
| Studio | `studio_galleries`, `studio_briefs`, `studio_packages` |
| Travel | `umroh_packages`, `travel_jamaah_manifest`, `travel_itineraries` |
| Kursus | `courses`, `course_modules`, `course_lessons`, `course_enrollments` |
| POS | `tables`, `table_maps`, `queue_sessions` |
| Platform | `api_keys`, `webhook_events`, `data_requests`, `feature_flags` |
| Sosial | `shop_follows`, `wishlists`, `product_qa`, `product_qa_answers` |

### 5.4 — File Struktur Penting

```
artifacts/
├── kopihub/                    # Frontend React + Vite
│   └── src/
│       ├── routes/             # 314 file route TanStack Router
│       ├── components/         # 50+ komponen UI
│       ├── lib/                # Utilities, auth, cart, payment, dll.
│       └── integrations/supabase/  # Client + types.ts
└── api-server/                 # Backend Express 5
    └── src/routes/             # 12 file route handler

lib/
├── db/src/schema/              # Drizzle schema (payment_transactions)
├── api-spec/                   # OpenAPI spec + Orval codegen
└── api-zod/                    # Zod schemas dari OpenAPI

scripts/
├── fresh_schema/               # SQL migration (apply ke Supabase)
│   ├── run_fresh_schema.sh
│   └── *.sql
├── fase2_migrations.sql
├── fase3_fase4_migrations.sql
├── fase6_fase7_migrations.sql
├── fase8_fase9_migrations.sql
└── fase10_migrations.sql
```

### 5.5 — PostgREST Proxy — Keterbatasan Diketahui

| Masalah | Status |
|---------|--------|
| Embedded resource JOIN (`select=*,shop:shops(name)`) | ❌ Belum diimplementasi di proxy |
| Beberapa list masih `limit(500)` tanpa cursor | ⚠️ Partial — `customers` sudah keyset pagination |
| SQL Injection protection via table whitelist | ✅ Ada — perlu diverifikasi saat deploy |
| JWT hanya decode, tidak verify signature | ⚠️ Set `SUPABASE_JWT_SECRET` untuk full verify |

---

## BAGIAN 6 — METRIK KELENGKAPAN PER ROLE (Audit Aktual)

| Role | Route Ada | Halaman Real (DB) | Catatan Audit 30 Mei | % Real |
|------|-----------|------------------|----------------------|--------|
| **Customer/Buyer** | 22 akun + 62 publik | **22 akun + semua publik** | Semua halaman akun dikonfirmasi real via audit kode | **~100%** |
| **Merchant/Owner** | 159 pos-app | **~150** | ~9 layout wrapper/stub — semua fitur utama real | **~95%** |
| **Admin Platform** | 65 admin | **~60** | ~5 layout wrapper + fee-simulator (by design stateless) | **~92%** |
| **Kurir** | 6 | **6 (semua)** | Semua dikonfirmasi real — Fase 12 selesai penuh | **~100%** |
| **Storefront** | 9 | ~8 | bayar masih butuh BL-1/BL-2 (secrets) | **~90%** |
| **Infrastruktur Kode** | — | — | API Server FIXED (web-push + pg), push backend aktif | **~98%** |
| **Infrastruktur Deploy** | — | — | Secrets masih pending (BL-1 s/d BL-3, BL-8, BL-9) | **~40%** |

> **Metode audit:** Semua 314 route file diverifikasi dengan `grep -c ".from(|.rpc(|SimpleCRUD|observability"`. Halaman "mock" yang tersisa adalah layout wrappers, auth forms, atau pure client-side calculators (admin.fee-simulator by design). Tidak ada halaman fitur utama yang benar-benar mock.

---

## BAGIAN 7 — ROADMAP HISTORIS (Fase 1–10, Selesai)

### Fase 1 — Infrastruktur Wajib ✅
JWT middleware PostgREST, Midtrans + Xendit setup kode, Email via Resend kode, CORS + Rate Limiting, PostgREST operators.

### Fase 2 — Sambungkan Mock Data ke DB ✅
Email marketing → `marketing_campaigns`, Storefront Builder → `storefront_layouts`, Digital Version → `menu_items`, RajaOngkir endpoint, Flash Sale + Happy Hour kolom, Cash Drawer route.

### Fase 3 — Bersih-bersih Kode ✅
Hapus duplikat `masuk.tsx`/`daftar.tsx` (jadi redirect shim), konsolidasi printer, merge `ReviewDialog`, konsolidasi `use-shop`, filter `shop_id` Realtime, keyset pagination.

### Fase 4 — Customer Experience ✅
Submit ulasan dari pesanan, full-text search (GIN + pg_trgm), address book CRUD, push notification frontend (backend pending F13), Q&A produk, follow toko.

### Fase 5 — Realtime SSE ✅
SSE broker POS sync, SSE kurir, SSE notifikasi merchant, tracking publik live.

### Fase 6 — Platform Lanjutan ✅
Auto refund via gateway, multi-outlet report, outgoing webhooks merchant, group buy, subscription produk, BNPL checkout UI, telemedicine, live streaming commerce.

### Fase 7 — DB Migration + Lokasi ✅
SQL migration (shops, kolom lokasi, `shops_nearby` RPC), marker clustering, autocomplete alamat, peta sebaran toko admin, share lokasi, toko terdekat di kategori.

### Fase 8 — Merchant Mock Data Lanjutan ✅
Broadcast WA (wa.me deep-link), bulk pricing SQL, restock notify endpoint, storefront builder save, flash sale + happy hour kolom SQL.

### Fase 9 — Admin Platform Tools ✅
Commission at checkout (`fn_apply_commission`), auto-cancel (`fn_auto_cancel_expired`), GDPR deletion, admin broadcast buyers, churn backend (`fn_churn_metrics_snapshot`), platform settings UI, webhook events monitor, API keys platform.

### Fase 10 — Kurir & Staff Lengkap ✅
Upload foto bukti pengiriman, penarikan penghasilan kurir, peta navigasi kurir, rating kurir dari pembeli, riwayat filter, dashboard staff, slip gaji digital.

### Quick Wins (QW1–QW9) ✅
Loading skeleton, empty state, filter sekitar, KDS outlet selector, dynamic `<title>` semua route (169 halaman), robots.txt, OG tags toko & produk, kunci sandbox di production, deposit booking via webhook.

---

## BAGIAN 8 — CHECKLIST PRIORITAS EKSEKUSI

```
════════════════════════════════════════════════════════
  SEGERA — Blocker utama (HARUS selesai sebelum go-live)
════════════════════════════════════════════════════════

  ☐ BL-1: Set MIDTRANS_SERVER_KEY di Replit Secrets
           → Checkout Midtrans Snap gagal tanpa ini

  ☐ BL-2: Set XENDIT_SECRET_KEY di Replit Secrets
           → Checkout Xendit gagal tanpa ini

  ☐ BL-3: Set RESEND_API_KEY di Replit Secrets
           → Email undangan staff & renewal tidak terkirim

  ☐ BL-4: Jalankan SQL migration di Supabase
           → FILE MASTER: scripts/FULL_MIGRATION.sql  ← SATU FILE, upload ke SQL Editor
           → Alternatif per-file: scripts/fresh_schema/ (01 → 07 berurutan)
           → Isi: 275+ tabel, 125+ fungsi, 600+ RLS, 27 storage bucket,
             termasuk semua tabel F6/F7 (group_buys, consultation_slots,
             live_sessions, bnpl_applications, dll.) + analytics RPCs

  ☐ BL-5: Regenerasi types.ts setelah migration
           → npx supabase gen types typescript --project-id <PROJECT_ID> \
               --schema public > artifacts/kopihub/src/integrations/supabase/types.ts

════════════════════════════════════════════════════════
  KODE SELESAI — Tidak perlu action lagi
════════════════════════════════════════════════════════

  ✅ API Server: web-push + pg diinstall, esbuild external list diperbaiki
  ✅ Fase 11: Semua 22 halaman akun pembeli terhubung ke Supabase
      (bookings, loyalty, notifikasi, riwayat, returns, langganan, favorit,
       cashback, digital-products, wishlist, rate-kurir, custom-orders)
  ✅ Fase 12: Semua 6 halaman kurir terhubung ke Supabase
      (history, earnings, profile, withdraw, dashboard + SSE realtime)
  ✅ Fase 13: Push notification backend lengkap
      (web-push VAPID, /api/push/send + /api/push/send-to-all, push_subscriptions)
  ✅ Fase 14: Admin tools terhubung ke Supabase
      (users, kyc, disputes, moderation, analytics RPC, activity observability)
  ✅ Fase 15: Merchant mock batch 1 selesai
      (loyalty, flash-sale, cash-drawer, bulk-pricing, audit-logs,
       laporan-harian, customer-analytics, booking-reminders, email-marketing)
  ✅ Fase 16: Merchant mock batch 2 selesai
      (anamnesis, patient-records, invoice, kursus, skin-quiz, appearance,
       milestones, testimonials, wip-gallery, lookbook, custom-css, verified-claims)
  ✅ BL-16: Analytics RPCs merchant & admin sudah masuk ke FULL_MIGRATION.sql
      (get_marketplace_admin_stats/daily/top_shops, get_shop_marketplace_stats/daily/top_products
       — semua di 06_post_consolidation.sql §4 + 07_functions_and_late_migrations.sql §11)
  ✅ BL-12 (kode): fn_auto_cancel_expired + fn_churn_metrics_snapshot sudah ada di SQL
      → SQL cron.schedule sudah siap di 07 §12 (commented) — lihat bagian OPSIONAL
  ✅ SQL konsolidasi: scripts/FULL_MIGRATION.sql (21.457 baris, 7 file digabung)
  ✅ Fase 6 & 7: Group Buy, Langganan, BNPL, Telemedicine, Live Commerce, lokasi — SELESAI

════════════════════════════════════════════════════════
  OPSIONAL / IN PROGRESS
════════════════════════════════════════════════════════

  🔄 Fase 17 WA Broadcast: F17-4 CSV ✅, F17-2 backend Fonnte ✅, F17-3 UI ✅
     ☐ F17-1: Set FONNTE_API_KEY di Replit Secrets (untuk kirim WA aktual)

  ☐ BL-6: Verifikasi rename coffee_shops → shops di DB
     → ALTER TABLE IF EXISTS public.coffee_shops RENAME TO shops;

  ☐ BL-7: Aktifkan shops_nearby RPC
     → SQL sudah ada di 06_post_consolidation.sql — dijalankan otomatis via FULL_MIGRATION.sql

  ☐ BL-8: Set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY di Replit Secrets
     → Generate via /admin/push-config (sudah ada di dashboard admin)

  ☐ BL-9: Set RAJAONGKIR_API_KEY di Replit Secrets (untuk kalkulasi ongkir)

  ☐ BL-10: Set SUPABASE_JWT_SECRET di Replit Secrets (full JWT verification)

  ☐ BL-12 (eksekusi): Aktifkan pg_cron di Supabase Dashboard
     → Dashboard → Database → Extensions → pg_cron → Enable
     → Lalu jalankan blok cron.schedule di 07_functions_and_late_migrations.sql §12:
       cron: 'auto-cancel-expired-orders' setiap jam
       cron: 'churn-metrics-snapshot' setiap hari jam 01:00 WIB
```

---

*Terakhir diperbarui: 01 Juni 2026 — PRD v12.0 oleh Replit Agent. Audit kode: 314+ route file, 40+ API endpoint, 275+ tabel DB. Perubahan v12.0: Konsolidasi SQL ke FULL_MIGRATION.sql (21.457 baris, 1 file master); merchant analytics RPCs ditambah ke 07; pg_cron SQL siap (commented); checklist dirapikan dengan status akurat.*
