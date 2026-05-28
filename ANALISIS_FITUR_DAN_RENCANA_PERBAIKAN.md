# Analisis Fitur & Rencana Perbaikan — UMKMgo

> Tanggal analisis: 28 Mei 2026  
> Scope: Semua role — Super Admin, Merchant/Pemilik, Staff/Kasir, Customer/Pembeli, Kurir, dan 6 vertikal bisnis (Klinik, Travel, Studio, Rental, Salon, Kursus)

---

## Ringkasan Eksekutif

Platform UMKMgo sudah memiliki **struktur yang sangat lengkap** — 165 tabel DB, 257 route frontend, dan logika bisnis yang matang di banyak area. Namun terdapat **3 masalah kritis infrastruktur** yang harus diselesaikan sebelum platform bisa go-live, dan **puluhan halaman backoffice** yang tabelnya sudah ada di DB tapi belum punya UI. Prioritas utama bukan menambah fitur baru, melainkan **memperkuat fondasi** dan **melengkapi halaman yang sudah setengah jadi**.

---

## 1. Status Fitur Per Role

### 🔴 KRITIS (Infrastruktur — Rusak/Tidak Berfungsi)

| # | Area | Masalah | Dampak |
|---|------|---------|--------|
| K1 | **PostgREST Proxy Auth** | Semua endpoint `/rest/v1/*` bisa diakses tanpa autentikasi — siapapun bisa baca/tulis semua tabel | Data merchant bocor ke publik |
| K2 | **File Upload / Storage** | Semua upload gambar (produk, profil, foto studio, bukti kurir) masih mengandalkan Supabase Storage yang terpisah dari Neon | Upload baru gagal jika Supabase Storage diputus |
| K3 | **Realtime / WebSocket** | Supabase Realtime masih dipakai di POS, Orders, Kurir — data baru yang masuk ke Neon tidak akan memicu event realtime | POS multi-kasir tidak sync, kurir tidak dapat update order baru |
| K4 | **Payment Gateway Secrets** | MIDTRANS_SERVER_KEY dan XENDIT_SECRET_KEY belum dikonfigurasi | Checkout di marketplace gagal, tidak ada pembayaran |
| K5 | **Email Delivery** | Undangan staff, notifikasi renewal, dan reset password tidak terkirim (tidak ada SMTP dikonfigurasi) | Merchant tidak bisa tambah staff, user tidak bisa reset password |

---

### 👤 Role: Super Admin

#### ✅ Sudah Berjalan Baik
- Dashboard aktivitas platform, audit log, system audit
- KYC merchant: review dokumen dengan foto, approve/reject workflow
- Dispute resolution: dialog resolve, tracking refund
- Withdrawal requests: summary keuangan, CSV export, bank detail
- Fraud detection: scoring logic, spike shop detection
- Health score merchant: skor 0–100 per toko
- Moderation konten: approve/hide/restore ulasan
- Manajemen plans, features, themes, plan_themes
- Revenue reporting, category revenue, tax report
- Feature flags, fee simulator, impersonation tool
- Domain management, branding/white-label
- Banners, vouchers platform, affiliate config

#### ⚠️ Perlu Penyempurnaan
| # | Fitur | Masalah |
|---|-------|---------|
| A1 | **Analytics Dashboard** | Data kosong karena DB Neon masih fresh — perlu grafik dengan fallback state "belum ada data" yang informatif |
| A2 | **Merchant Health Score** | Menggunakan view `shop_health_score` — view belum diverifikasi ada di Neon |
| A3 | **Commission Config** | UI ada tapi logika pemotongan komisi dari order belum terintegrasi ke checkout flow |
| A4 | **Auto-cancel & Auto-renewal** | Cron job hanya untuk renewal notifications — eksekusi auto-cancel order belum ada endpoint server |
| A5 | **Churn Metrics** | Halaman ada tapi definisi "churn" (kapan dianggap churn) belum ada di backend |
| A6 | **GDPR Tools** | UI ada tapi actual data deletion belum ada endpoint dedicated di API server |
| A7 | **Broadcast Notifikasi** | Tabel `owner_notifications` dan `notifications` ada, tapi delivery channel (push/email/WA) belum terhubung |
| A8 | **Plans Matrix** | `admin.plans.$id.matrix.tsx` — perlu verifikasi apakah plan_features upsert berjalan via proxy |

#### ❌ Belum Ada (Perlu Dibuat)
| # | Fitur | Tabel DB | Prioritas |
|---|-------|----------|-----------|
| A9 | **Platform Settings UI** | `platform_settings` | Tinggi |
| A10 | **Wallet Topup Presets Management** | `wallet_topup_presets` | Sedang |
| A11 | **Manajemen API Keys Platform** | `api_keys`, `api_usage` | Sedang |
| A12 | **Webhook Events Monitor** | `webhook_events` | Sedang |
| A13 | **Cron Runs Monitor** | `cron_runs` | Rendah |
| A14 | **Backup Schedules Config** | `backup_schedules` | Rendah |

---

### 👤 Role: Merchant / Pemilik Toko

#### ✅ Sudah Berjalan Baik
- **POS Core**: Multi-tab cart (6 tab), parked carts, offline mode, barcode scan, shift management, thermal print
- **Orders**: Void/cancel/refund dialog, bulk actions, audit log, 3 jenis print (receipt/kitchen/kurir)
- **Inventory**: Ingredient CRUD, stock movements, bulk opname, stock forecasting, low stock alerts
- **Booking**: Hybrid service+table, waitlist, reschedule tokens, deposit/DP, service packages & addons
- **Menu**: AI generate description+SEO, HPP/margin dari view, recipe linking, flash sale, allergens, halal status
- **Reports**: Charts (recharts), date range filter, channel filter, CSV+Excel export, profit sub-route
- **Loyalty**: Tiers (Bronze/Silver/Gold/Platinum), birthday automation, member tracking, rewards catalog
- **Employees**: Invitation flow, role management (manager/cashier/barista), outlet assignment, permissions dialog
- **Customers**: Auto-segmentasi (VIP/Regular/New/Inactive), KPI cards, notes, CSV export
- **Website Builder**: Template selection, drag-and-drop layout, publish/draft toggle
- **Kursus (LMS)**: Module+lesson CRUD, video embed, DnD reorder (~1300 baris — sangat lengkap)
- **Umroh/Travel Packages**: Hotel Makkah/Madinah, airlines, quota, harga quad/triple/double
- **Medical Invoice**: Resep digital, riwayat pasien, print invoice+resep
- **Studio Gallery**: Upload foto, shareable token, photographer assignment
- **Rental Availability**: Kondisi unit, booking tab, date range checker

#### ⚠️ Perlu Penyempurnaan
| # | Fitur | Masalah |
|---|-------|---------|
| M1 | **POS — Refund Otomatis** | "Mark as Refunded" saja — tidak ada API call ke Midtrans/Xendit untuk actual refund |
| M2 | **POS — Printer Direct** | Fallback ke `window.print()` jika driver thermal tidak aktif |
| M3 | **Menu — Image Upload** | Masih ke Supabase Storage — perlu dimigrasi ke storage solution baru |
| M4 | **Booking — Refund** | Sama seperti M1, hanya menampilkan transaction ID tanpa eksekusi refund ke gateway |
| M5 | **Settings — Outlet Management** | Tabel `outlets` ada tapi tidak ada UI dedicated untuk tambah/edit outlet |
| M6 | **Settings — Bank Account** | `shop_bank_accounts` ada, verifikasi rekening bank belum ada flow |
| M7 | **Settings — QRIS Setup** | Merchant perlu upload QRIS image, belum ada UI khusus |
| M8 | **Promos — Kode Voucher** | `shop_vouchers` ada tapi manajemen kode terpisah dari halaman promos |
| M9 | **Kitchen Display (KDS)** | `pos-app.kitchen-load.tsx` ada tapi realtime update ke dapur bergantung Supabase Realtime |
| M10 | **Laporan — Multi-outlet** | Report hanya untuk satu outlet/toko, belum agregat multi-outlet |

#### ❌ Belum Ada — Route Tidak Ditemukan
| # | Fitur | Tabel DB | Prioritas |
|---|-------|----------|-----------|
| M11 | **Purchase Order (PO) Management** | `purchase_orders`, `purchase_order_items`, `po_audit_log` | Tinggi |
| M12 | **Manajemen Supplier** | `suppliers` | Tinggi |
| M13 | **Return & Refund Requests (Merchant)** | `return_requests`, `product_returns`, `refunds` | Tinggi |
| M14 | **Shift & Absensi Karyawan** | `shifts`, `attendances` | Tinggi |
| M15 | **Cash Drawer Management** | `cash_shifts`, `cash_movements` | Tinggi |
| M16 | **Wallet & Withdrawal Request** | `shop_wallets`, `withdrawal_requests`, `wallet_transactions` | Tinggi |
| M17 | **Chat / Pesan Pelanggan (Inbox)** | `shop_chats`, `shop_chat_messages` | Tinggi |
| M18 | **Digital Products Management** | `digital_product_versions`, `digital_licenses`, `digital_download_logs` | Sedang |
| M19 | **Pre-Orders Management** | `pre_orders` (jika ada) | Sedang |
| M20 | **API Keys Toko** | `shop_api_keys` | Rendah |
| M21 | **Backup & Restore** | `shop_backups`, `backup_schedules` | Rendah |
| M22 | **Notifikasi Center Merchant** | `owner_notifications` | Sedang |
| M23 | **Authenticity Certificate** | `authenticity_certificates` | Rendah |
| M24 | **Size Charts** | `shop_size_charts` | Rendah |
| M25 | **Lookbook / Portfolio** | `shop_lookbook`, `shop_portfolio` | Rendah |

---

### 👤 Role: Staff / Kasir

#### ✅ Sudah Berjalan Baik
- Akses ke POS sesuai role (cashier hanya bisa POS, manager bisa semua)
- Akun staff dapat dibuat via invite dengan email + set password
- Permission dialog per staff (kontrol fitur mana yang bisa diakses)
- Audit log action staff sensitif (void, refund)
- Multi-outlet assignment

#### ⚠️ Perlu Penyempurnaan
| # | Fitur | Masalah |
|---|-------|---------|
| S1 | **Login Staff** | Staff login via Supabase Auth — email undangan tidak terkirim (lihat K5) |
| S2 | **View Shift Pribadi** | Staff tidak bisa melihat jadwal shift mereka sendiri |
| S3 | **Clock In/Clock Out** | `attendances` table ada tapi tidak ada UI untuk absensi mandiri |
| S4 | **KPI Kasir** | Reports ada tapi view per-kasir hanya di tabel, bukan dashboard pribadi |

#### ❌ Belum Ada
| # | Fitur | Prioritas |
|---|-------|-----------|
| S5 | **Dashboard Pribadi Staff** | Sedang |
| S6 | **Notifikasi Tugas** | Rendah |
| S7 | **Slip Gaji / Rekap Shift** | Rendah |

---

### 👤 Role: Customer / Pembeli

#### ✅ Sudah Berjalan Baik
- Marketplace homepage: banner, kategori, GPS-based nearby shops
- Browse per kategori, storefront toko
- Shopping cart (multi-toko), checkout flow
- Akun: profile, edit nama/phone/email/birthday
- Buyer reputation system
- Order history: categorized (Aktif/Selesai/Dibatalkan), realtime status, re-order
- Order detail dengan status tracking

#### ⚠️ Perlu Penyempurnaan
| # | Fitur | Masalah |
|---|-------|---------|
| C1 | **Checkout — Payment Gateway** | Midtrans/Xendit belum terhubung (K4) — tombol bayar tidak berfungsi |
| C2 | **Order Realtime Status** | Bergantung Supabase Realtime (K3) — update status tidak live di Neon |
| C3 | **Alamat Pengiriman** | `customer_addresses` ada di DB tapi tidak ada UI address book |
| C4 | **Ulasan Produk** | `product_reviews`, `menu_reviews`, `booking_reviews` ada tapi flow submit review dari customer belum ada |
| C5 | **Notifikasi Customer** | Push notification table ada (`push_subscriptions`) tapi VAPID keys/service worker belum dikonfigurasi |
| C6 | **Search** | Search bar ada di navbar tapi tidak ada full-text search API endpoint |

#### ❌ Belum Ada
| # | Fitur | Tabel DB | Prioritas |
|---|-------|----------|-----------|
| C7 | **Wallet Customer** | `customer_wallets`, `customer_wallet_transactions`, `wallet_topups`, `cashback_wallets` | Tinggi |
| C8 | **Request Return / Refund** | `return_requests` | Tinggi |
| C9 | **Wishlist / Favorit** | `wishlists`, `customer_favorites` | Sedang |
| C10 | **Halaman Loyalty Points** | `loyalty_points`, `loyalty_ledger`, `loyalty_rewards` | Sedang |
| C11 | **Follow Toko** | `shop_follows` | Sedang |
| C12 | **Q&A Produk** | `product_qa` | Sedang |
| C13 | **Download Digital Product** | `digital_licenses`, `digital_download_logs` | Sedang |
| C14 | **Referral Program** | `referrals`, `referral_programs` | Rendah |
| C15 | **Cashback History** | `cashback_transactions` | Rendah |
| C16 | **Chat dengan Toko** | `shop_chats` | Sedang |

---

### 👤 Role: Kurir / Mitra Pengiriman

#### ✅ Sudah Berjalan Baik
- Claim order delivery (atomic via RPC)
- Status flow: Available → Picked Up → Delivered
- Foto bukti pengiriman (camera capture)
- Rekap pendapatan harian

#### ⚠️ Perlu Penyempurnaan
| # | Fitur | Masalah |
|---|-------|---------|
| D1 | **Upload Foto Bukti** | Upload ke Supabase Storage (K2) — akan rusak |
| D2 | **Earnings Withdrawal** | Tidak ada flow penarikan penghasilan |
| D3 | **Peta/Rute** | Tidak ada integrasi peta untuk navigasi ke lokasi pelanggan |

#### ❌ Belum Ada
| # | Fitur | Prioritas |
|---|-------|-----------|
| D4 | **Profil & Dokumen Kurir** | Sedang |
| D5 | **Rating Kurir** | Rendah |
| D6 | **Riwayat Pengiriman Lengkap** | Rendah |

---

### 🏥 Vertikal: Klinik & Kesehatan

#### ✅ Sudah Ada
- Medical invoice: resep digital, riwayat invoice per pasien, print

#### ❌ Belum Ada — Halaman Kritis Yang Hilang
| # | Fitur | Tabel DB | Prioritas |
|---|-------|----------|-----------|
| KL1 | **Rekam Medis Pasien (SOAP)** | `patient_records`, `patient_visits` | Tinggi |
| KL2 | **Anamnesis Form** | `anamnesis_forms` | Tinggi |
| KL3 | **Manajemen Resep Dokter** | `prescriptions`, `prescription_items` | Tinggi |
| KL4 | **Katalog Obat** | `medications` | Tinggi |
| KL5 | **Antrian Pasien (Queue Display)** | `queue_sessions`, `queue_entries` | Tinggi |
| KL6 | **ICD-10 Picker di Kunjungan** | `icd10_codes` (data sudah ada) | Sedang |
| KL7 | **Skin Quiz / Konsultasi** | `shop_skin_quiz` | Rendah |
| KL8 | **Customer Treatments History** | `customer_treatments` | Sedang |

---

### ✈️ Vertikal: Travel & Umroh

#### ✅ Sudah Ada
- Umroh packages: hotel Makkah/Madinah, airlines, harga per kamar, quota

#### ❌ Belum Ada
| # | Fitur | Tabel DB | Prioritas |
|---|-------|----------|-----------|
| TR1 | **Manifest Jamaah** | `travel_manifest` (jamaah_manifest) | Tinggi |
| TR2 | **Dokumen Jamaah** | `travel_jamaah_documents` | Tinggi |
| TR3 | **Cicilan / Installment** | `travel_installments` | Tinggi |
| TR4 | **Itinerary Builder** | `travel_itineraries` | Sedang |
| TR5 | **Leads Management** | `leads` | Sedang |
| TR6 | **Testimonials** | `testimonials` | Rendah |
| TR7 | **Flyer Generator** | `flyers` | Rendah |

---

### 📸 Vertikal: Studio Foto

#### ✅ Sudah Ada
- Gallery management, foto upload, shareable token, photographer assignment

#### ❌ Belum Ada
| # | Fitur | Tabel DB | Prioritas |
|---|-------|----------|-----------|
| SF1 | **Brief Management** | `studio_briefs` | Tinggi |
| SF2 | **Delivery / Handover** | `studio_deliveries` | Tinggi |
| SF3 | **WIP Gallery** | `wip_gallery` | Sedang |
| SF4 | **Location Management** | `studio_locations` | Sedang |
| SF5 | **Photo Reviews** | `studio_photo_reviews` | Rendah |

---

### 🚗 Vertikal: Rental

#### ✅ Sudah Ada
- Unit kondisi tracking, booking tab, date range checker

#### ❌ Belum Ada
| # | Fitur | Tabel DB | Prioritas |
|---|-------|----------|-----------|
| RT1 | **Laporan Inspeksi** | `rental_inspections` | Tinggi |
| RT2 | **Checklist Unit** | `rental_checklists` | Sedang |
| RT3 | **Manajemen Denda** | field `fine_amount` di `rental_bookings` | Sedang |
| RT4 | **KYC Penyewa** | field `kyc_status` | Sedang |
| RT5 | **Perpanjangan Sewa** | field `extended_*` di `rental_bookings` | Sedang |

---

### 💇 Vertikal: Salon & Barbershop

#### ✅ Sudah Ada
- Booking dengan service packages, waitlist, staff picker

#### ❌ Belum Ada
| # | Fitur | Tabel DB | Prioritas |
|---|-------|----------|-----------|
| SL1 | **Antrian Display Screen** | `queue_sessions`, `queue_entries` | Tinggi |
| SL2 | **Customer Treatment History** | `customer_treatments` | Sedang |
| SL3 | **Session Membership** | `customer_memberships`, `shop_membership_tiers` | Sedang |

---

### 📚 Vertikal: Kursus & Edukasi

#### ✅ Sudah Ada
- Module + lesson CRUD, video embed, DnD reorder, progress tracking structure

#### ⚠️ Perlu Penyempurnaan
| # | Fitur | Masalah |
|---|-------|---------|
| KS1 | **Student View / Portal** | LMS merchant-side sudah ada, tapi belum ada halaman untuk siswa melihat materi |
| KS2 | **Sertifikat Download** | `course_certificates` table ada tapi tidak ada generator/download UI |
| KS3 | **Lesson Progress Tracking** | `lesson_progress` ada tapi belum ada progress bar di student view |
| KS4 | **Enrollment Flow** | `course_enrollments` ada tapi flow customer membeli + unlock kursus belum ada |

---

## 2. Masalah Teknis Lintas-Fitur

### 🔐 Keamanan (KRITIS)

| # | Masalah | Solusi |
|---|---------|--------|
| T1 | **PostgREST Proxy tanpa Auth** — endpoint publik, semua tabel bisa diakses | Tambah middleware JWT validation di Express sebelum tiap route `/rest/v1/*` |
| T2 | **SQL Injection via table name** — `table` param langsung dipakai di query | Tambah whitelist tabel yang boleh diakses |
| T3 | **No Row Level Security** — merchant A bisa baca data merchant B | Tambah filtering `shop_id` otomatis berdasarkan JWT claims |
| T4 | **CORS terlalu terbuka** — `app.use(cors())` tanpa origin restriction | Set CORS origin ke domain Replit saja |
| T5 | **Rate Limiting** — tidak ada throttling di API | Tambah `express-rate-limit` middleware |

### 📁 Storage / Upload

| # | Masalah | Solusi |
|---|---------|--------|
| T6 | **Semua upload gambar ke Supabase Storage** | Pilih: (a) tetap pakai Supabase Storage dengan bucket policy, atau (b) migrasi ke Cloudinary/R2 via API key |

### ⚡ Realtime

| # | Masalah | Solusi |
|---|---------|--------|
| T7 | **Supabase Realtime tidak sync dengan Neon** | Implementasi Server-Sent Events (SSE) di Express untuk menggantikan Supabase Realtime channel |

### 🔗 Integrasi Filter PostgREST

| # | Masalah | Solusi |
|---|---------|--------|
| T8 | **Operator filter terbatas** — `.in`, `.cs`, `.not`, `.or` belum diimplementasi | Tambah parser operator di `rest.ts` |
| T9 | **Embedded resources** — `select=*,shop:shops(name)` tidak di-resolve | Tambah JOIN resolver untuk relasi umum |
| T10 | **RETURNING setelah POST/PATCH** — response tidak konsisten | Tambah `RETURNING *` ke semua mutation queries |

---

## 3. Rencana Perbaikan — Prioritas & Urutan

### 🚨 Fase 1 — Darurat (Minggu 1–2): Fondasi Harus Berjalan

| ID | Task | Estimasi |
|----|------|----------|
| F1-1 | **Keamanan PostgREST**: JWT middleware + tabel whitelist + shop_id filter | 2 hari |
| F1-2 | **Payment Gateway**: Setup MIDTRANS_SERVER_KEY + XENDIT_SECRET_KEY, uji checkout end-to-end | 1 hari |
| F1-3 | **Storage**: Putuskan strategi (Supabase Storage tetap / Cloudinary / R2), update semua upload URL | 2 hari |
| F1-4 | **Email**: Konfigurasi SMTP (Resend/SendGrid), sambungkan ke staff invitation + renewal cron | 1 hari |
| F1-5 | **Realtime**: Implementasi SSE endpoint di Express untuk POS sync + order status + kurir | 3 hari |
| F1-6 | **PostgREST: operator filter** `.in`, `.not`, `RETURNING *` | 1 hari |

---

### 🔧 Fase 2 — Penting (Minggu 3–6): Halaman Backoffice Yang Hilang

Urutan dikerjakan berdasarkan dampak ke merchant:

| ID | Halaman | Route | Prioritas |
|----|---------|-------|-----------|
| F2-1 | **Shift & Absensi** | `/pos-app/shifts` | Tinggi |
| F2-2 | **Cash Drawer Management** | `/pos-app/cash-drawer` | Tinggi |
| F2-3 | **Manajemen Supplier** | `/pos-app/suppliers` | Tinggi |
| F2-4 | **Purchase Order (PO)** | `/pos-app/purchase-orders` | Tinggi |
| F2-5 | **Return & Refund (Merchant)** | `/pos-app/returns` | Tinggi |
| F2-6 | **Wallet & Withdrawal Merchant** | `/pos-app/wallet` | Tinggi |
| F2-7 | **Chat Inbox Merchant** | `/pos-app/inbox` | Tinggi |
| F2-8 | **Outlet Management** | `/pos-app/outlets` | Tinggi |
| F2-9 | **Notifikasi Center** | `/pos-app/notifications` | Sedang |
| F2-10 | **Digital Products** | `/pos-app/digital-products` | Sedang |

---

### 🛍️ Fase 3 — Customer Experience (Minggu 5–8)

| ID | Fitur | Prioritas |
|----|-------|-----------|
| F3-1 | **Customer Wallet** (top-up, balance, transaksi, cashback) | Tinggi |
| F3-2 | **Alamat Pengiriman** (address book CRUD) | Tinggi |
| F3-3 | **Submit Ulasan** (produk, layanan, booking) | Tinggi |
| F3-4 | **Return Request Customer** | Tinggi |
| F3-5 | **Loyalty Points Page** (poin, riwayat, reward catalog) | Sedang |
| F3-6 | **Wishlist / Favorit** | Sedang |
| F3-7 | **Full-text Search** (API endpoint + UI) | Sedang |
| F3-8 | **Follow Toko** | Rendah |
| F3-9 | **Q&A Produk** | Rendah |
| F3-10 | **Chat Customer ↔ Toko** | Sedang |
| F3-11 | **Referral Program** | Rendah |

---

### 🏥 Fase 4 — Vertikal Klinik (Minggu 6–9)

| ID | Fitur | Prioritas |
|----|-------|-----------|
| F4-1 | **Antrian Pasien** (queue display screen) | Tinggi |
| F4-2 | **Rekam Medis / SOAP Notes** | Tinggi |
| F4-3 | **Katalog Obat** | Tinggi |
| F4-4 | **Anamnesis Form Builder** | Sedang |
| F4-5 | **Resep Dokter (full workflow)** | Sedang |
| F4-6 | **ICD-10 Picker** (sudah ada data) | Rendah |

---

### ✈️ Fase 5 — Vertikal Travel & Lainnya (Minggu 8–12)

| ID | Fitur | Prioritas |
|----|-------|-----------|
| F5-1 | **Manifest Jamaah + Dokumen** | Tinggi |
| F5-2 | **Cicilan Travel** | Tinggi |
| F5-3 | **Studio: Brief + Delivery** | Sedang |
| F5-4 | **Rental: Inspeksi + Denda** | Sedang |
| F5-5 | **Salon: Antrian Display** | Sedang |
| F5-6 | **Kursus: Student Portal + Sertifikat** | Sedang |
| F5-7 | **Travel: Itinerary Builder** | Rendah |

---

### 🚀 Fase 6 — Platform Lanjutan (Minggu 10+)

| ID | Fitur | Prioritas |
|----|-------|-----------|
| F6-1 | **Push Notifications** (VAPID + service worker) | Sedang |
| F6-2 | **Outgoing Webhooks** (merchant bisa subscribe events) | Sedang |
| F6-3 | **Multi-outlet Reports Agregat** | Sedang |
| F6-4 | **PWA / Mobile Optimized** | Rendah |
| F6-5 | **API Keys Merchant** (buka API publik untuk integrasi) | Rendah |
| F6-6 | **Auto Refund ke Gateway** (saat cancel/dispute) | Tinggi |
| F6-7 | **Backup & Restore** | Rendah |

---

## 4. Quick Wins (Bisa Dikerjakan Kapan Saja)

Ini perbaikan kecil yang berdampak besar pada pengalaman pengguna:

| # | Perbaikan | Estimasi |
|---|-----------|----------|
| QW1 | Tambah loading skeleton di semua halaman yang fetch data | 0.5 hari |
| QW2 | Empty state informatif saat tabel/list kosong (bukan blank) | 0.5 hari |
| QW3 | Error boundary global untuk catch runtime errors | 1 hari |
| QW4 | Tambah `favicon` dan `<title>` dinamis per halaman | 0.5 hari |
| QW5 | Rate limiting di semua endpoint API (express-rate-limit) | 0.5 hari |
| QW6 | CORS restriction (hanya domain Replit) | 0.25 hari |
| QW7 | Sitemap + robots.txt untuk SEO marketplace | 0.5 hari |
| QW8 | `<meta>` OG tags untuk share toko di sosmed | 0.5 hari |

---

## 5. Metrik Kelengkapan Per Role

| Role | Fitur Ada | Perlu Perbaikan | Belum Ada | % Siap |
|------|-----------|-----------------|-----------|--------|
| Super Admin | 35 | 8 | 6 | ~78% |
| Merchant | 20 | 10 | 15 | ~55% |
| Staff / Kasir | 5 | 4 | 3 | ~50% |
| Customer | 8 | 6 | 10 | ~40% |
| Kurir | 4 | 3 | 3 | ~50% |
| Klinik | 1 | 0 | 8 | ~10% |
| Travel | 1 | 0 | 7 | ~12% |
| Studio Foto | 1 | 0 | 5 | ~15% |
| Rental | 1 | 0 | 5 | ~15% |
| Salon | 2 | 0 | 3 | ~40% |
| Kursus | 3 | 4 | 1 | ~60% |
| **Rata-rata** | | | | **~39%** |

> Catatan: "% Siap" mengacu pada kelengkapan fitur yang disebutkan di database schema. Infrastruktur teknis (auth, storage, realtime, payment) diperhitungkan terpisah.

---

## 6. Rekomendasi Urutan Kerja Tim

```
Minggu 1–2:  Fase 1 (infrastruktur kritis)
             → Keamanan PostgREST, payment gateway, storage, email, realtime
             
Minggu 3–4:  Fase 2 batch pertama
             → Shift/absensi, cash drawer, supplier, purchase order
             
Minggu 5–6:  Fase 2 batch kedua + Fase 3 batch pertama  
             → Returns, wallet merchant, outlet mgmt, customer wallet, alamat
             
Minggu 7–8:  Fase 3 batch kedua + Fase 4 klinik
             → Review system, search, antrian klinik, rekam medis
             
Minggu 9–10: Fase 5 vertikal
             → Manifest travel, studio brief, rental inspeksi
             
Minggu 11+:  Fase 6 platform lanjutan
             → Push notif, outgoing webhooks, PWA
```

---

*File ini dihasilkan dari analisis otomatis terhadap 165 tabel DB, 257 route frontend, dan 8 API routes pada 28 Mei 2026.*
