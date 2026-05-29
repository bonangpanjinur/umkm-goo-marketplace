# PRD — UMKMgo
## Platform Marketplace & POS Multi-Kategori untuk UMKM Indonesia

**Versi:** 7.0 | **Diperbarui:** 29 Mei 2026 | **Status:** Living Document — Satu-satunya sumber kebenaran  
_(Menggantikan: `ANALISIS_FITUR_DAN_RENCANA_PERBAIKAN.md` + `.lovable/plan.md` — kedua file itu dihapus)_

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

## RINGKASAN EKSEKUTIF (per 29 Mei 2026)

| Dimensi | Angka |
|---|---|
| Total route file | **295** |
| Route super admin (`/admin/*`) | **61** |
| Route merchant dashboard (`/pos-app/*`) | **150** |
| Route akun pembeli (`/akun/*`) | **20** |
| Route kurir (`/kurir/*`) | **5** |
| Route publik / marketplace | **~59** |
| Tabel Supabase (public schema) | **142** |
| Tabel Drizzle/Neon (payment_transactions, webhook_logs) | **2** |

**Status keseluruhan:** Struktur kode sangat lengkap — hampir semua halaman sudah punya route dan UI. Masalah terbesar bukan fitur yang kurang, melainkan: (1) **infrastruktur teknis belum terhubung** (payment gateway, email, realtime), (2) **sejumlah halaman masih pakai data mock/fake**, dan (3) **duplikasi kode** di beberapa area kritis.

---

## BAGIAN 1 — STACK & ARSITEKTUR

### Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 19 + Vite + TanStack Router (file-based) + TanStack Query |
| Styling | Tailwind CSS 4 + shadcn/ui |
| State | Zustand (cart, parked carts) |
| Backend API | Express 5 (port 3001) |
| Database utama | Supabase PostgreSQL (142 tabel) |
| Database payment | Neon PostgreSQL via Drizzle ORM (`payment_transactions`, `webhook_logs`) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime + BroadcastChannel (lintas tab) |
| File Upload | Supabase Storage (semua upload saat ini) |
| Payment | Midtrans + Xendit (via env vars — belum aktif produksi) |
| Monorepo | pnpm workspaces, Node.js 24, TypeScript 5.9 |
| Build | esbuild (API server), Vite (frontend) |

### Kategori Bisnis yang Didukung (11 kategori seed)

`fnb` · `retail` · `jasa` · `rental` · `kursus` · `salon` · `klinik` · `studio-foto` · `travel` · `custom-order` · `lainnya`

### Role Pengguna

| Role | Akses |
|---|---|
| `super_admin` | `/admin/*` — pengelola platform |
| `owner` | `/pos-app/*` — pemilik toko |
| `manager` | `/pos-app/*` — sebagian besar akses POS |
| `cashier` / `barista` | `/pos-app/pos`, `/pos-app/orders` (terbatas) |
| buyer (customer) | `/akun/*`, marketplace publik |
| `kurir` | `/kurir/*` |

### Prinsip Arsitektur

- **Supabase** untuk Auth + Realtime + Storage + Database utama
- **Neon/Drizzle** untuk data payment server-side (audit trail, webhook idempotency)
- **Express API server** terpisah dari frontend Vite — frontend proxy `/api` ke port 3001
- **BroadcastChannel** untuk sinkronisasi status notifikasi lintas tab tanpa roundtrip DB
- **Role check** wajib via RPC `has_role(_user_id, _role)` — tidak baca `user_roles` langsung dari client
- Semua secret di Replit Secrets, bukan `.env` atau hardcode
- Config kanonikal: kolom `shops.deposit_percentage`, `shops.open_hours`, `shops.payment_methods_enabled`; bukan `booking_config` jsonb path (deprecated)

---

## BAGIAN 2 — SKEMA DATABASE LENGKAP (142 Tabel)

Dikelompokkan per domain bisnis. Semua tabel ada di Supabase (`public` schema) kecuali yang ditandai †.

### 2.1 Platform & Konfigurasi

| Tabel | Deskripsi Singkat |
|---|---|
| `plans` | Paket berlangganan (free/pro/enterprise) |
| `features` | Master fitur (max_outlets, max_products, dll.) |
| `plan_features` | Relasi plan ↔ feature dengan batas kuota |
| `themes` | Template tema toko |
| `plan_themes` | Tema yang termasuk dalam paket |
| `platform_settings` | Pengaturan global platform |
| `platform_vouchers` | Voucher diskon dari platform |
| `platform_voucher_redemptions` | Riwayat pemakaian voucher platform |
| `billing_settings` | Rekening bank & QRIS platform untuk billing merchant |
| `plan_invoices` | Tagihan paket langganan merchant |
| `cron_runs` | Log eksekusi cron job |
| `system_audit` | Audit log sistem lintas entitas |

### 2.2 Toko & Merchant

| Tabel | Deskripsi Singkat | Kolom Kunci |
|---|---|---|
| `coffee_shops` | Master toko (nama, slug, logo, kategori, jam buka, dsb.) | `id`, `slug`, `name`, `owner_user_id`, `business_category_id`, `plan_id`, `kyc_status`, `is_verified`, `rating_avg`, `deposit_percentage`, `deposit_required`, `open_hours` (jsonb), `custom_css`, `payment_methods_enabled` |
| `outlets` | Outlet/cabang per toko | `id`, `shop_id`, `name`, `address`, `is_main` |
| `business_categories` | Kategori bisnis master (11 item seed) | `id`, `slug`, `name` |
| `shop_verifications` | Dokumen KYC yang diajukan merchant | `shop_id`, `document_type`, `document_url`, `status` |
| `shop_wallets` | Saldo dompet merchant | `shop_id`, `balance`, `pending_balance` |
| `shop_backups` | Backup data toko | `shop_id`, `backup_url`, `created_at` |
| `backup_schedules` | Jadwal backup otomatis | `shop_id`, `frequency`, `next_run_at` |
| `shop_health_score` | View skor kesehatan toko 0–100 | derived view |
| `shop_portfolio` | Galeri portofolio toko | `shop_id`, `image_url`, `caption`, `sort_order` |
| `shop_membership_tiers` | Tier membership yang dibuat toko | `shop_id`, `name`, `price`, `benefits` (jsonb) |
| `customer_memberships` | Membership aktif customer per toko | `customer_user_id`, `shop_id`, `tier_id`, `expires_at` |
| `shop_customers` | Pelanggan terdaftar per toko | `shop_id`, `user_id`, `visit_count`, `total_spent` |
| `customer_segments` | Segmentasi pelanggan (VIP/Regular/New/Inactive) | `shop_id`, `user_id`, `segment_label` |

### 2.3 Produk & Inventori

| Tabel | Deskripsi Singkat | Kolom Kunci |
|---|---|---|
| `menu_items` | Produk / menu item (berlaku untuk semua kategori bisnis) | `id`, `shop_id`, `name`, `price`, `stock`, `category`, `is_active`, `image_url`, `slug`, `flash_price`, `flash_starts_at`, `flash_ends_at`, `nutrition_info` (jsonb), `production_days`, `condition_grade` (A/B/C), `low_stock_threshold` |
| `categories` | Kategori produk per toko | `id`, `shop_id`, `name`, `sort_order` |
| `menu_item_option_groups` | Grup opsi/modifier (ukuran, level, topping) | `id`, `menu_item_id`, `name`, `is_required` |
| `menu_item_options` | Pilihan dalam grup opsi | `id`, `group_id`, `name`, `price_modifier` |
| `ingredients` | Bahan baku untuk HPP & resep | `id`, `shop_id`, `name`, `unit`, `stock_qty`, `cost_per_unit` |
| `recipes` | Resep — relasi menu_item ↔ ingredient | `id`, `menu_item_id`, `ingredient_id`, `qty_used` |
| `stock_movements` | Log pergerakan stok (masuk/keluar/adjustment) | `id`, `shop_id`, `ingredient_id`, `qty`, `type`, `reference_id` |
| `stock_opnames` | Sesi opname stok | `id`, `shop_id`, `outlet_id`, `status`, `created_at` |
| `stock_opname_items` | Item per sesi opname | `opname_id`, `ingredient_id`, `system_qty`, `actual_qty` |
| `products` | Tabel produk marketplace (terpisah dari menu_items untuk beberapa alur) | `id`, `shop_id`, `name`, `price`, `stock`, `image_url` |
| `product_reviews` | Ulasan produk dari pembeli | `id`, `product_id`, `shop_id`, `user_id`, `rating`, `comment` |
| `menu_reviews` | Ulasan item menu dari pembeli | `id`, `menu_item_id`, `shop_id`, `user_id`, `rating` |
| `menu_hpp_view` | View HPP (Harga Pokok Produksi) per menu item | derived view |
| `product_upsell_suggestions` | Saran upsell antar produk | `shop_id`, `source_product_id`, `target_product_id` |

### 2.4 Pesanan & Transaksi

| Tabel | Deskripsi Singkat | Kolom Kunci |
|---|---|---|
| `orders` | Master pesanan (POS + marketplace) | `id`, `shop_id`, `outlet_id`, `user_id`, `status`, `total`, `requires_deposit`, `deposit_amount`, `deposit_paid`, `deposit_paid_at`, `balance_due`, `balance_paid`, `payment_method`, `channel` |
| `order_items` | Item dalam pesanan | `order_id`, `menu_item_id`, `name`, `qty`, `price`, `options` (jsonb) |
| `order_messages` | Pesan/chat per order | `order_id`, `sender_id`, `body` |
| `order_disputes` | Dispute / komplain pada order | `order_id`, `raised_by`, `reason`, `status`, `resolved_at` |
| `refunds` | Refund per order | `order_id`, `amount`, `reason`, `status` |
| `open_bills` | Tagihan terbuka (POS meja) | `shop_id`, `table_id`, `items` (jsonb), `total` |
| `promo_redemptions` | Pemakaian promo per order | `order_id`, `promo_id`, `discount_amount` |
| `parked_carts` | Keranjang terparkir POS (belum di-checkout) | `shop_id`, `label`, `items` (jsonb) |

### 2.5 Marketplace & Cart

| Tabel | Deskripsi Singkat |
|---|---|
| `marketplace_carts` | Cart marketplace per pembeli |
| `marketplace_cart_items` | Item dalam cart marketplace |

### 2.6 Booking & Reservasi

| Tabel | Deskripsi Singkat | Kolom Kunci |
|---|---|---|
| `bookings` | Reservasi layanan / meja / unit | `id`, `shop_id`, `user_id`, `service_name`, `booking_date`, `booking_time`, `status`, `deposit_required`, `deposit_status` (none/pending/paid/failed/expired/refunded), `deposit_amount`, `cancel_token` |
| `booking_slots` | Slot waktu / kapasitas booking | `shop_id`, `slot_date`, `slot_time`, `duration_minutes`, `capacity`, `deposit_percent`, `staff_user_id` |
| `booking_waitlist` | Waitlist jika slot penuh | `shop_id`, `slot_id`, `customer_name`, `customer_phone` |

### 2.7 Pembayaran & Keuangan

| Tabel | Deskripsi Singkat |
|---|---|
| `payment_transactions` † | Transaksi payment gateway (Neon/Drizzle) |
| `webhook_logs` † | Log webhook Midtrans/Xendit dengan idempotency (Neon/Drizzle) |
| `wallet_topups` | Top-up dompet customer |
| `wallet_topup_presets` | Preset nominal top-up |
| `wallet_transactions` | Riwayat transaksi dompet merchant |
| `customer_wallets` | Saldo dompet customer |
| `customer_wallet_transactions` | Transaksi dompet customer |
| `shop_wallets` | Saldo dompet merchant |
| `withdrawal_requests` | Permintaan penarikan saldo merchant |
| `purchase_orders` | Purchase Order ke supplier |
| `purchase_order_items` | Item dalam PO |

### 2.8 Karyawan & Shift

| Tabel | Deskripsi Singkat |
|---|---|
| `staff_invitations` | Undangan bergabung sebagai staff |
| `staff_permissions` | Izin akses per staff per fitur |
| `user_roles` | Role user (owner/cashier/barista/manager/super_admin/kurir) |
| `shifts` | Shift kerja yang dijadwalkan |
| `attendances` | Absensi clock-in/clock-out staff |
| `cash_shifts` | Shift kasir dengan modal awal & modal akhir |
| `cash_movements` | Pergerakan kas selama shift |

### 2.9 Loyalty & Promosi

| Tabel | Deskripsi Singkat |
|---|---|
| `loyalty_settings` | Konfigurasi program loyalty per toko |
| `loyalty_points` | Saldo poin loyalty per pelanggan per toko |
| `loyalty_ledger` | Riwayat kredit/debit poin loyalty |
| `promos` | Promosi / diskon per toko |
| `marketing_campaigns` | Kampanye marketing (email, WA blast) |
| `campaign_recipients` | Penerima per kampanye |

### 2.10 Profil & Customer

| Tabel | Deskripsi Singkat |
|---|---|
| `profiles` | Profil user umum (nama, avatar) |
| `customer_profiles` | Data pelanggan (nomor HP, birthday, referral code) |
| `customer_addresses` | Alamat pengiriman customer |
| `customer_favorites` | Toko favorit customer |
| `push_subscriptions` | Subscription push notification per device |
| `notifications` | Notifikasi untuk customer |
| `owner_notifications` | Notifikasi untuk merchant/owner |
| `user_preferences` | Preferensi UI per user |

### 2.11 Kurir & Pengiriman

| Tabel | Deskripsi Singkat |
|---|---|
| `couriers` | Profil kurir mitra |
| `delivery_settings` | Konfigurasi pengiriman per toko |
| `delivery_zones` | Zona pengiriman & ongkos kirim |

### 2.12 Ulasan & Q&A

| Tabel | Deskripsi Singkat |
|---|---|
| `product_reviews` | Ulasan produk marketplace |
| `menu_reviews` | Ulasan item menu (F&B) |

### 2.13 Custom Order (Kerajinan / Jasa Digital)

| Tabel | Deskripsi Singkat |
|---|---|
| `custom_order_requests` | Permintaan custom order dari buyer |
| `custom_order_status_history` | Riwayat status custom order |

### 2.14 Meja & POS

| Tabel | Deskripsi Singkat |
|---|---|
| `open_bills` | Tagihan terbuka per meja |
| `suppliers` | Manajemen supplier bahan baku |

### 2.15 Domain & Branding

| Tabel | Deskripsi Singkat |
|---|---|
| `domain_audit` | Log perubahan domain toko |
| `domain_blacklist` | Domain yang diblacklist |
| `domain_verify_attempts` | Log percobaan verifikasi domain |
| `branding_audit` | Log perubahan branding toko |
| `themes` | Template tema visual toko |

### 2.16 Stored Procedures / RPC (Pilihan)

| RPC | Fungsi |
|---|---|
| `has_role(user_id, role)` | Cek apakah user memiliki role |
| `has_shop_role(user_id, shop_id, role)` | Cek role user dalam toko tertentu |
| `assign_courier_atomic` | Klaim order pengiriman secara atomic |
| `courier_mark_delivered` | Tandai order terkirim |
| `open_shift` / `close_shift` | Buka/tutup shift kasir |
| `validate_promo` | Validasi kode promo |
| `apply_loyalty_post_order` | Tambah poin loyalty setelah order |
| `approve_withdrawal` / `reject_withdrawal` | Setujui/tolak penarikan saldo |
| `resolve_dispute` | Selesaikan dispute |
| `void_order` / `refund_order` | Void & refund order |
| `marketplace_checkout` | Proses checkout marketplace (atomic) |
| `get_profit_report` / `get_profit_report_daily` | Laporan profit |
| `get_marketplace_admin_stats` | Statistik admin platform |
| `get_shop_marketplace_stats` | Statistik marketplace per toko |

---

## BAGIAN 3 — STATUS FITUR PER ROLE

> **Legenda:** ✅ Route ada + terimplementasi · ⚠️ Route ada tapi mock/parsial · ❌ Belum ada route

---

### 3.1 SUPER ADMIN (`/admin/*`) — 61 Route

#### ✅ Lengkap & Berjalan

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/admin` | Dashboard aktivitas platform | `system_audit`, `orders`, `coffee_shops` |
| `/admin/analytics` | Analitik platform | `orders`, `coffee_shops`, `user_roles` |
| `/admin/shops` | Daftar & filter toko | `coffee_shops`, `business_categories` |
| `/admin/shops/$id` | Detail toko | `coffee_shops`, `outlets`, `plans` |
| `/admin/kyc` | Verifikasi KYC merchant | `shop_verifications`, `coffee_shops` |
| `/admin/domains` | Manajemen domain kustom | `domain_audit`, `domain_blacklist`, `domain_verify_attempts` |
| `/admin/invoices` | Tagihan paket berlangganan | `plan_invoices`, `coffee_shops` |
| `/admin/withdrawals` | Penarikan saldo merchant | `withdrawal_requests`, `shop_wallets` |
| `/admin/plans` | Manajemen paket & harga | `plans`, `features`, `plan_features` |
| `/admin/plans/$id/matrix` | Matrix fitur per paket | `plan_features`, `features` |
| `/admin/commission` | Konfigurasi komisi platform | `coffee_shops`, `orders` |
| `/admin/payment-config` | Konfigurasi payment gateway | `billing_settings` |
| `/admin/reconciliation` | Rekonsiliasi transaksi gateway | `payment_transactions` † |
| `/admin/financial-report` | Laporan keuangan platform | `orders`, `plan_invoices`, `withdrawal_requests` |
| `/admin/tax-report` | Laporan PPh/PPN | `orders`, `plan_invoices` |
| `/admin/payout-scheduler` | Jadwal payout otomatis | `withdrawal_requests`, `shop_wallets` |
| `/admin/revenue` | Revenue intelligence | `orders`, `coffee_shops` |
| `/admin/revenue-leakage` | Deteksi kebocoran pendapatan | `orders`, `refunds`, `order_disputes` |
| `/admin/churn` | Churn rate merchant | `coffee_shops`, `plan_invoices` |
| `/admin/cohort-analytics` | Cohort & LTV analytics | `coffee_shops`, `orders` |
| `/admin/category-revenue` | Pendapatan per kategori bisnis | `orders`, `business_categories` |
| `/admin/disputes` | Dispute resolution | `order_disputes`, `orders` |
| `/admin/fraud` | Log fraud detection | `orders`, `payment_transactions` † |
| `/admin/fraud-scoring` | ML fraud scoring 0–100 | `orders`, `customer_profiles` |
| `/admin/moderation` | Moderasi konten ulasan | `product_reviews`, `menu_reviews` |
| `/admin/health-score` | Health score toko | `shop_health_score` (view) |
| `/admin/health-score/$shopId` | Detail health score per toko | `shop_health_score` |
| `/admin/merchant-tiers` | Program tier merchant (Bronze–Platinum) | `coffee_shops`, `orders` |
| `/admin/multi-admin` | Manajemen admin platform dengan role | `user_roles` |
| `/admin/cohort-analytics` | Cohort & LTV analytics | `coffee_shops` |
| `/admin/gdpr-tools` | GDPR — export & hapus data | `profiles`, `customer_profiles`, `orders` |
| `/admin/sandbox` | Mode demo / seed data dummy | semua tabel |
| `/admin/sla-monitor` | SLA & response time monitor | `system_audit`, `cron_runs` |
| `/admin/affiliate` | Manajemen afiliasi & partner | `platform_vouchers`, `customer_profiles` |
| `/admin/onboarding-automation` | Email sequence Hari 1/3/7/14/30 | `coffee_shops`, `marketing_campaigns` |
| `/admin/broadcast` | Broadcast notifikasi ke merchant | `owner_notifications` |
| `/admin/broadcast-buyers` | Broadcast notifikasi ke pembeli | `notifications`, `customer_profiles` |
| `/admin/buyer-actions` | Kredit manual & suspend pembeli | `customer_profiles`, `user_roles` |
| `/admin/churn-reengagement` | Auto re-engagement merchant tidak aktif | `coffee_shops`, `marketing_campaigns` |
| `/admin/banners` | Manajemen banner hero halaman utama | _(jsonb di platform_settings)_ |
| `/admin/ads` | Manajemen iklan berbayar | `platform_settings` |
| `/admin/catalog` | Katalog produk platform | `menu_items` |
| `/admin/categories` | Kategori bisnis platform | `business_categories` |
| `/admin/vouchers` | Voucher diskon dari platform | `platform_vouchers`, `platform_voucher_redemptions` |
| `/admin/impersonation` | Impersonasi akun merchant | `user_roles`, `coffee_shops` |
| `/admin/feature-flags` | Feature flags per toko/plan | `plan_features` |
| `/admin/fee-simulator` | Simulasi fee komisi | `plans`, `commission` |
| `/admin/platform-billing` | Billing paket platform | `plan_invoices`, `billing_settings` |
| `/admin/settings` | Pengaturan global platform | `platform_settings` |
| `/admin/branding` | White-label & branding platform | `themes`, `branding_audit` |
| `/admin/audit` | Audit log sistem | `system_audit` |
| `/admin/activity` | Aktivitas terbaru platform | `system_audit`, `orders` |
| `/admin/users` | Manajemen user & role | `profiles`, `user_roles` |
| `/admin/notification-templates` | Template notifikasi | `owner_notifications` |
| `/admin/ai-settings` | Konfigurasi AI (deskripsi, SEO) | `platform_settings` |
| `/admin/auto-cancel` | Auto-cancel order kadaluarsa | `orders` |
| `/admin/auto-renewal` | Auto-renewal berlangganan | `plan_invoices`, `plans` |
| `/admin/expiry-reminders` | Reminder plan hampir habis | `plan_invoices`, `coffee_shops` |
| `/admin/shop-reminder-overrides` | Override jadwal reminder per toko | `coffee_shops` |
| `/admin/booking-config` | Konfigurasi booking per kategori | `coffee_shops`, `booking_slots` |
| `/admin/push-config` | Konfigurasi push notification (VAPID) | `push_subscriptions` |

#### ⚠️ Perlu Tindak Lanjut

| Route | Masalah |
|---|---|
| `/admin/analytics` | Data kosong karena DB baru — perlu empty state informatif |
| `/admin/health-score` | View `shop_health_score` perlu diverifikasi di DB produksi |
| `/admin/commission` | Logika pemotongan komisi dari order belum terintegrasi ke checkout |
| `/admin/auto-cancel` | UI ada, eksekusi auto-cancel belum ada endpoint server-side |
| `/admin/churn` | Definisi "churn" (kapan dianggap churn) belum ada di backend |
| `/admin/gdpr-tools` | UI ada, actual data deletion belum ada dedicated endpoint di API server |
| `/admin/broadcast-buyers` | Tabel ada, delivery channel (push/email/WA) belum terhubung |

#### ❌ Belum Ada

| Fitur | Tabel DB | Prioritas |
|---|---|---|
| **Platform Settings UI** lengkap (topup presets, API keys) | `platform_settings`, `wallet_topup_presets` | Sedang |
| **Webhook Events Monitor** | _(tidak ada tabel webhook_events — perlu buat)_ | Sedang |
| **API Keys Platform** | _(tidak ada tabel api_keys)_ | Rendah |

---

### 3.2 MERCHANT / PEMILIK TOKO (`/pos-app/*`) — 150 Route

#### ✅ POS Core

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/pos-app/pos` | Terminal POS utama (multi-tab, 6 cart, barcode scan) | `menu_items`, `orders`, `order_items`, `open_bills`, `parked_carts` |
| `/pos-app/orders` | Manajemen pesanan (void, refund, print) | `orders`, `order_items`, `refunds` |
| `/pos-app/order-audit` | Audit log aksi pada order | `system_audit` |
| `/pos-app/open-bills` | Tagihan terbuka per meja | `open_bills` |
| `/pos-app/kds` | Kitchen Display System | `orders`, `order_items` |
| `/pos-app/kitchen-load` | Monitor beban dapur realtime | `orders` |
| `/pos-app/table-maps` | Denah meja (drag-drop) | `coffee_shops` |
| `/pos-app/table-qr` | QR code per meja | `coffee_shops` |
| `/pos-app/tables` | Manajemen meja | `coffee_shops` |
| `/pos-app/printers` | Konfigurasi printer thermal | _(localStorage)_ |
| `/pos-app/shifts` | Manajemen shift kasir | `shifts`, `cash_shifts` |
| `/pos-app/attendance` | Absensi clock-in/clock-out | `attendances` |

#### ✅ Menu & Produk

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/pos-app/menu` | CRUD produk/menu (AI desc, SEO, flash sale, allergen) | `menu_items`, `categories`, `menu_item_option_groups`, `menu_item_options` |
| `/pos-app/menu/import` | Import menu bulk dari CSV | `menu_items` |
| `/pos-app/categories` | Kategori produk per toko | `categories` |
| `/pos-app/variants` | Varian produk (ukuran, warna) | `menu_item_option_groups`, `menu_item_options` |
| `/pos-app/variant-matrix` | Matrix varian × harga | `menu_item_options` |
| `/pos-app/atribut` | Atribut produk kustom | `menu_items` |
| `/pos-app/bundles` | Bundel produk | `menu_items` |
| `/pos-app/combo-builder` | Builder combo/paket F&B | `menu_items` |
| `/pos-app/bulk-pricing` | Harga grosir / tier harga | `menu_items` |
| `/pos-app/upsell` | Konfigurasi upsell otomatis | `product_upsell_suggestions` |
| `/pos-app/flash-sale` | Flash sale dengan countdown | `menu_items` |
| `/pos-app/happy-hour` | Happy hour (jam tertentu) | `menu_items` |
| `/pos-app/limited-editions` | Edisi terbatas dengan counter stok | `menu_items` |
| `/pos-app/size-guide` | Panduan ukuran interaktif | `coffee_shops` |
| `/pos-app/lookbook` | Lookbook foto model produk | `shop_portfolio` |
| `/pos-app/wip-gallery` | Galeri proses pembuatan (WIP) | `shop_portfolio` |
| `/pos-app/portfolio` | Portofolio karya toko | `shop_portfolio` |
| `/pos-app/verified-claims` | Badge klaim terverifikasi | `menu_items` |
| `/pos-app/skin-quiz` | Quiz rekomendasi produk per jenis kulit | `menu_items` |
| `/pos-app/qa` | Q&A produk dari pembeli | `menu_items` |

#### ✅ Inventori & Supplier

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/pos-app/inventory` | Manajemen bahan baku & stok | `ingredients`, `stock_movements` |
| `/pos-app/stok` | Opname stok | `stock_opnames`, `stock_opname_items` |
| `/pos-app/recipes` | Resep — relasi menu ↔ bahan | `recipes`, `ingredients` |
| `/pos-app/suppliers` | Manajemen supplier | `suppliers` |
| `/pos-app/purchase-orders` | Purchase order ke supplier | `purchase_orders`, `purchase_order_items` |
| `/pos-app/purchase-orders/$poId` | Detail PO | `purchase_orders`, `purchase_order_items` |
| `/pos-app/restock-notify` | Notifikasi restock ke pelanggan | `menu_items`, `notifications` |

#### ✅ Booking & Reservasi

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/pos-app/booking` | Manajemen booking (list, approve, cancel) | `bookings`, `booking_slots` |
| `/pos-app/booking-analytics` | Analitik booking | `bookings` |
| `/pos-app/booking-reminders` | Reminder booking otomatis via WA | `bookings` |
| `/pos-app/booking-reviews` | Ulasan booking dari pelanggan | `bookings`, `menu_reviews` |
| `/pos-app/reservasi` | Manajemen reservasi meja | `bookings`, `booking_slots` |
| `/pos-app/waitlist` | Waitlist booking | `booking_waitlist` |
| `/pos-app/schedule` | Jadwal layanan & ketersediaan | `booking_slots` |
| `/pos-app/service-bundles` | Paket & bundle layanan | `menu_items` |
| `/pos-app/anamnesis` | Form anamnesis digital (klinik/kecantikan) | `bookings`, `customer_profiles` |
| `/pos-app/antrian` | Nomor antrian digital | `booking_slots`, `bookings` |

#### ✅ Pelanggan & Loyalty

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/pos-app/customers` | Daftar & segmentasi pelanggan | `shop_customers`, `customer_segments`, `customer_profiles` |
| `/pos-app/customer-analytics` | Analitik perilaku pelanggan | `shop_customers`, `orders` |
| `/pos-app/loyalty` | Program poin loyalty (tier Bronze–Platinum) | `loyalty_settings`, `loyalty_points`, `loyalty_ledger` |
| `/pos-app/loyalty/rewards` | Katalog reward loyalty | `loyalty_settings` |
| `/pos-app/membership` | Manajemen membership & tier | `shop_membership_tiers`, `customer_memberships` |
| `/pos-app/followup-reminders` | Reminder kembali (potong rambut 28 hari, kontrol klinik) | `bookings`, `shop_customers` |
| `/pos-app/customer-treatments` | Riwayat treatment per pelanggan | `bookings`, `customer_profiles` |
| `/pos-app/wishlist-analytics` | Analitik wishlist pelanggan | `customer_favorites` |

#### ✅ Marketplace Orders & Pengiriman

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/pos-app/marketplace-orders` | Order dari marketplace (approve, print label) | `orders`, `order_items` |
| `/pos-app/marketplace-analytics` | Analitik penjualan marketplace | `orders`, `menu_items` |
| `/pos-app/online-orders` | Semua pesanan online | `orders` |
| `/pos-app/delivery` | Konfigurasi pengiriman & kurir | `delivery_settings`, `delivery_zones` |
| `/pos-app/outlet-shipping` | Ongkos kirim per outlet | `outlets`, `delivery_settings` |
| `/pos-app/couriers` | Manajemen kurir mitra | `couriers` |
| `/pos-app/courier` | Assign kurir ke order | `orders`, `couriers` |
| `/pos-app/shipping-labels` | Cetak label pengiriman | `orders` |
| `/pos-app/rajaongkir` | Cek ongkos kirim (RajaOngkir) | `coffee_shops` (shop_api_keys) |
| `/pos-app/product-returns` | Manajemen retur & refund | `refunds`, `orders` |
| `/pos-app/invoice` | Generate invoice PDF | `orders`, `order_items` |

#### ✅ Keuangan & Tagihan

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/pos-app/keuangan` | Saldo & riwayat transaksi wallet | `shop_wallets`, `wallet_transactions` |
| `/pos-app/keuangan/tarik` | Ajukan penarikan saldo | `withdrawal_requests`, `shop_wallets` |
| `/pos-app/billing` | Status & histori tagihan paket | `plan_invoices`, `plans` |
| `/pos-app/rekening-bank` | Rekening bank untuk penarikan | `shop_wallets` |
| `/pos-app/wallet-approvals` | Approve top-up wallet (jika manual) | `wallet_topups` |
| `/pos-app/wallet-config` | Konfigurasi wallet & top-up | `wallet_topup_presets` |
| `/pos-app/open-bills` | Tagihan terbuka POS | `open_bills` |

#### ✅ Laporan

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/pos-app/reports` | Laporan penjualan (grafik, CSV, Excel) | `orders`, `order_items` |
| `/pos-app/reports/profit` | Laporan profit (HPP vs penjualan) | `menu_hpp_view`, `orders` |
| `/pos-app/laporan-harian` | Ringkasan harian shift | `orders`, `shifts` |

#### ✅ Promosi & Marketing

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/pos-app/promos` | Diskon & kode promo | `promos`, `promo_redemptions` |
| `/pos-app/vouchers` | Voucher toko | `promos` |
| `/pos-app/promo-calendar` | Kalender promosi | `promos` |
| `/pos-app/broadcast-wa` | Blast pesan WhatsApp ke pelanggan | `shop_customers`, `marketing_campaigns` |
| `/pos-app/email-marketing` | Kampanye email marketing | `marketing_campaigns`, `campaign_recipients` |
| `/pos-app/iklan` | Iklan berbayar di platform | `platform_settings` |

#### ✅ Karyawan & Pengaturan

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/pos-app/employees` | CRUD karyawan + undangan email | `staff_invitations`, `user_roles` |
| `/pos-app/permissions` | Permission matrix per staff | `staff_permissions` |
| `/pos-app/role-mapping` | Mapping role ke fitur | `user_roles`, `staff_permissions` |
| `/pos-app/audit-logs` | Audit log aksi karyawan | `system_audit` |
| `/pos-app/settings` | Pengaturan toko (jam buka, deposit, dll.) | `coffee_shops` |
| `/pos-app/outlets` | Manajemen outlet/cabang | `outlets` |
| `/pos-app/appearance` | Tema & warna toko | `themes` |
| `/pos-app/domain` | Domain kustom | `domain_audit` |
| `/pos-app/custom-css` | CSS kustom toko | `coffee_shops.custom_css` |
| `/pos-app/kyc` | Upload dokumen KYC | `shop_verifications` |
| `/pos-app/backup` | Backup & restore data | `shop_backups`, `backup_schedules` |
| `/pos-app/subscriptions` | Manajemen langganan produk rutin | `promos` |
| `/pos-app/capabilities` | Fitur yang tersedia sesuai plan | `plan_features`, `plans` |
| `/pos-app/notifikasi` | Pusat notifikasi merchant | `owner_notifications` |
| `/pos-app/inbox` | Chat inbox dari pelanggan | `order_messages` |
| `/pos-app/sales-offerings` | Penawaran penjualan khusus | `menu_items` |

#### ✅ Website Builder & Storefront

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/pos-app/website-builder` | Builder website toko (template, drag-drop) | `coffee_shops` |
| `/pos-app/website-builder/templates` | Pilih template | `themes` |
| `/pos-app/website-builder/$layoutId` | Edit layout kustom | `coffee_shops` |
| `/pos-app/storefront-builder` | Builder etalase online (hero, produk unggulan) | `coffee_shops` |
| `/pos-app/about-page` | Halaman "Tentang Toko" | `coffee_shops` |

#### ✅ Kursus & LMS

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/pos-app/kursus` | CRUD modul & lesson kursus (DnD) | `menu_items` (kursus disimpan sebagai menu item) |
| `/pos-app/lesson-progress` | Tracking progress siswa | `customer_profiles` |
| `/pos-app/digital` | Produk digital (e-book, template, file) | `menu_items` |
| `/pos-app/digital-licenses` | Manajemen lisensi produk digital | `menu_items` |
| `/pos-app/digital-version` | Update versi produk digital + notif pembeli | `menu_items` |

#### ✅ Vertikal — Klinik & Kesehatan

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/pos-app/patient-records` | Rekam medis pasien (SOAP) | `customer_profiles`, `bookings` |
| `/pos-app/prescriptions` | Resep dokter | `bookings`, `order_items` |
| `/pos-app/medications` | Katalog obat | `menu_items` |
| `/pos-app/medical-invoice` | Tagihan & resep digital per pasien | `orders`, `order_items` |
| `/pos-app/anamnesis` | Form anamnesis digital | `bookings` |
| `/pos-app/antrian` | Nomor antrian digital | `booking_slots` |

#### ✅ Vertikal — Travel & Umroh

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/pos-app/umroh-packages` | Paket Umroh (hotel, maskapai, harga) | `menu_items` |
| `/pos-app/umroh-facilities` | Fasilitas paket Umroh | `menu_items` |
| `/pos-app/umroh-faq` | FAQ paket Umroh | `coffee_shops` |
| `/pos-app/travel-manifest` | Manifest jamaah | `bookings`, `customer_profiles` |
| `/pos-app/jamaah-documents` | Dokumen jamaah (paspor, visa) | `bookings`, `customer_profiles` |
| `/pos-app/travel-installments` | Cicilan / installment travel | `bookings`, `orders` |
| `/pos-app/travel-itinerary` | Itinerary builder perjalanan | `menu_items`, `bookings` |
| `/pos-app/leads` | Manajemen leads calon jamaah | `shop_customers` |
| `/pos-app/testimonials` | Testimonial dari jamaah | `menu_reviews` |
| `/pos-app/flyers` | Generator flyer promosi paket | `menu_items` |

#### ✅ Vertikal — Studio Foto

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/pos-app/studio-gallery` | Upload & kelola foto hasil sesi | `shop_portfolio` |
| `/pos-app/studio-packages` | Paket sesi foto (Basic/Standard/Premium) | `menu_items` |
| `/pos-app/studio-brief` | Brief form klien sebelum sesi | `bookings`, `customer_profiles` |
| `/pos-app/studio-delivery` | Kirim file hasil foto ke klien | `orders`, `menu_items` |
| `/pos-app/studio-locations` | Manajemen lokasi sesi (studio/outdoor) | `coffee_shops` |
| `/pos-app/studio-photographers` | Manajemen fotografer & assignment | `staff_invitations`, `bookings` |
| `/pos-app/studio-addons` | Add-on saat booking (editing, album) | `booking_slots`, `menu_items` |
| `/pos-app/studio-photo-reviews` | Ulasan dengan foto hasil karya | `menu_reviews` |
| `/pos-app/studio-watermark` | Konfigurasi watermark preview foto | `coffee_shops` |

#### ✅ Vertikal — Rental

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/pos-app/rental-availability` | Ketersediaan unit rental | `bookings`, `menu_items` |
| `/pos-app/rental-deposit-config` | Konfigurasi deposit % per unit | `menu_items`, `coffee_shops` |
| `/pos-app/rental-extend` | Perpanjangan sewa mandiri | `bookings` |
| `/pos-app/rental-fines` | Billing denda keterlambatan | `bookings`, `orders` |
| `/pos-app/rental-checklist` | Checklist kondisi unit saat serah terima | `bookings` |
| `/pos-app/rental-inspections` | Laporan inspeksi unit | `bookings` |
| `/pos-app/rental-tnc` | Syarat & Ketentuan sewa | `coffee_shops` |
| `/pos-app/rental-unit-ready` | Notifikasi "unit siap diambil" | `bookings`, `notifications` |

#### ✅ Vertikal — Jasa Digital / Freelance

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/pos-app/custom-orders` | Manajemen custom order request | `custom_order_requests`, `custom_order_status_history` |
| `/pos-app/custom-order-quotes` | Penawaran harga custom order | `custom_order_requests` |
| `/pos-app/milestones` | Milestone tracking + escrow per tahap | `orders`, `order_items` |
| `/pos-app/contracts` | Kontrak freelance digital + TTD | `custom_order_requests` |
| `/pos-app/job-deliverables` | Upload deliverable ke klien | `orders`, `menu_items` |
| `/pos-app/certificates` | Certificate of Authenticity (COA) digital | `orders` |

#### ⚠️ Route Ada tapi Masih Mock / Perlu Disambungkan ke DB

| Route | Masalah Spesifik |
|---|---|
| `/pos-app/email-marketing` | ✅ Query ke `email_campaigns` + `campaign_recipients` sudah ada — perlu verifikasi tabel `email_campaigns` ada di Supabase (tidak terlihat di types.ts — pakai `marketing_campaigns`?) |
| `/pos-app/storefront-builder` | Load dari `storefront_layouts` sudah ada, save masih pakai `_id++` lokal — perlu wire INSERT/UPDATE ke tabel |
| `/pos-app/custom-css` | Save ke `coffee_shops.custom_css` sudah ada, hanya setTimeout kosmetik (bukan masalah data) |
| `/pos-app/rajaongkir` | Sudah query Supabase untuk key — perlu panggil API RajaOngkir via Express endpoint |
| `/pos-app/digital-version` | `tablesMissing` check masih ada — wire ke `menu_items` atau tambah tabel `digital_product_versions` |
| `/pos-app/broadcast-wa` | UI ada, pengiriman WA aktual belum terintegrasi (WhatsApp Business API) |
| `/pos-app/flash-sale` | UI ada, perlu verifikasi kolom `flash_price`/`flash_starts_at`/`flash_ends_at` sudah di-migrate |
| `/pos-app/happy-hour` | UI ada, perlu verifikasi implementasi jam & diskon |
| `/pos-app/bulk-pricing` | UI ada, perlu tabel/kolom khusus bulk pricing |
| `/pos-app/restock-notify` | UI ada, notifikasi aktual belum terkirim |

#### ❌ Belum Ada Route (dari schema DB)

| Fitur | Tabel DB | Prioritas |
|---|---|---|
| **Cash Drawer Management** | `cash_shifts`, `cash_movements` | Tinggi |
| **Pre-orders Management** | `pre_orders` (belum ada di types) | Sedang |
| Tabel `storefront_layouts` | Belum terlihat di types.ts — perlu konfirmasi / buat | Tinggi |

---

### 3.3 CUSTOMER / PEMBELI (`/akun/*`) — 20 Route

#### ✅ Lengkap

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/akun` | Profil pembeli (nama, HP, avatar, birthday) | `profiles`, `customer_profiles` |
| `/akun/pesanan` | Riwayat pesanan (Aktif / Selesai / Dibatalkan) | `orders`, `order_items` |
| `/akun/pesanan/$orderId` | Detail pesanan + tracking | `orders`, `order_items` |
| `/akun/bookings` | Riwayat booking layanan | `bookings` |
| `/akun/inbox` | Chat dengan toko | `order_messages` |
| `/akun/custom-orders` | Status custom order | `custom_order_requests`, `custom_order_status_history` |
| `/akun/digital-products` | Download produk digital yang dibeli | `orders`, `menu_items` |
| `/akun/kursus` | Kursus yang diikuti | `orders`, `menu_items` |
| `/akun/kursus/$courseId` | Materi & progress kursus | `menu_items` |
| `/akun/saldo` | Saldo dompet & riwayat transaksi | `customer_wallets`, `customer_wallet_transactions` |
| `/akun/cashback` | Riwayat cashback | `customer_wallet_transactions` |
| `/akun/returns` | Request retur & refund | `refunds`, `orders` |
| `/akun/favorit` | Toko & produk favorit | `customer_favorites` |
| `/akun/wishlist` | Wishlist produk | `customer_favorites` |
| `/akun/riwayat` | Produk baru dilihat (browsing history) | _(localStorage)_ |
| `/akun/loyalty` | Poin loyalty per toko | `loyalty_points`, `loyalty_ledger` |
| `/akun/referral` | Program referral & kode undangan | `customer_profiles` |
| `/akun/notifikasi` | Pusat notifikasi pembeli | `notifications` |
| `/akun/alamat` | Address book pengiriman | `customer_addresses` |

#### ⚠️ Perlu Penyempurnaan

| Halaman | Masalah |
|---|---|
| Semua halaman yang fetch data | **Checkout belum tersambung payment gateway** (Midtrans/Xendit belum dikonfigurasi) |
| `/akun/pesanan` | Update status realtime bergantung Supabase Realtime (K3) |
| `/akun/notifikasi` | Push notification belum aktif (VAPID keys belum dikonfigurasi) |

#### ❌ Belum Ada

| Fitur | Tabel DB | Prioritas |
|---|---|---|
| **Full-text search produk & toko** | `menu_items`, `coffee_shops` | Tinggi |
| **Submit ulasan produk** (flow dari akun) | `product_reviews`, `menu_reviews` | Tinggi |
| **Follow toko** | `customer_favorites` | Sedang |
| **Q&A Produk** (customer submit pertanyaan) | _(tidak ada tabel product_qa)_ | Sedang |

---

### 3.4 KURIR (`/kurir/*`) — 5 Route

#### ✅ Lengkap

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/kurir` | Dashboard kurir (order tersedia, klaim) | `orders`, `couriers` |
| `/kurir/earnings` | Rekap penghasilan harian | `orders`, `couriers` |
| `/kurir/history` | Riwayat pengiriman selesai | `orders` |
| `/kurir/profile` | Profil & dokumen kurir | `couriers` |

#### ⚠️ Perlu Penyempurnaan

| Masalah | Solusi |
|---|---|
| Upload foto bukti pengiriman ke Supabase Storage | Perlu solusi storage yang tidak bergantung Supabase Storage |
| Tidak ada flow penarikan penghasilan | Tambah `withdrawal_requests` untuk kurir |
| Tidak ada peta/rute navigasi | Integrasi Google Maps / Mapbox |

#### ❌ Belum Ada

| Fitur | Prioritas |
|---|---|
| Rating kurir dari pembeli | Rendah |
| Riwayat pengiriman lengkap dengan filter | Rendah |

---

### 3.5 MARKETPLACE PUBLIK

#### ✅ Lengkap

| Route | Halaman | Tabel Terkait |
|---|---|---|
| `/` | Homepage (banner carousel, kategori, toko featured, produk) | `coffee_shops`, `menu_items`, `business_categories` |
| `/kategori` | Daftar semua kategori | `business_categories` |
| `/kategori/$slug` | Produk per kategori | `menu_items`, `coffee_shops` |
| `/kategori/$slug/$city` | Produk per kategori per kota | `menu_items`, `coffee_shops` |
| `/promo` | Halaman promo platform | `platform_vouchers`, `menu_items` |
| `/sekitar` | Toko terdekat (GPS-based + peta) | `coffee_shops` |
| `/search` | Pencarian toko & produk | `coffee_shops`, `menu_items` |
| `/toko/$slug` | Halaman toko publik | `coffee_shops`, `menu_items` |
| `/toko/$slug/produk/$productId` | Detail produk | `menu_items` |
| `/toko/$slug/booking` | Booking layanan dari halaman toko | `bookings`, `booking_slots` |
| `/toko/$slug/reservasi` | Reservasi meja | `bookings`, `booking_slots` |
| `/toko/$slug/antrian` | Ambil nomor antrian | `booking_slots` |
| `/toko/$slug/ulasan` | Ulasan toko | `product_reviews`, `menu_reviews` |
| `/toko/$slug/chat` | Chat dengan toko | `order_messages` |
| `/toko/$slug/custom-order` | Ajukan custom order | `custom_order_requests` |
| `/toko/$slug/saldo` | Top-up saldo di toko | `customer_wallets` |
| `/toko/$slug/membership` | Beli membership toko | `customer_memberships`, `shop_membership_tiers` |
| `/toko/$slug/map` | Peta lokasi toko | `coffee_shops` |
| `/keranjang` | Keranjang belanja marketplace | `marketplace_carts`, `marketplace_cart_items` |
| `/checkout` | Checkout (alamat, pembayaran) | `orders`, `marketplace_carts`, `customer_addresses` |
| `/checkout/sukses/$orderId` | Halaman sukses order | `orders` |
| `/pesanan/$orderId` | Detail & tracking pesanan publik | `orders`, `order_items` |
| `/pesanan/$orderId/chat` | Chat per pesanan | `order_messages` |
| `/track/$orderId` | Tracking pesanan tanpa login | `orders` |
| `/bandingkan` | Bandingkan produk side-by-side | `menu_items` |
| `/leaderboard` | Leaderboard toko terbaik | `coffee_shops` |
| `/katalog/$slug` | Katalog produk per toko (subdomain) | `coffee_shops`, `menu_items` |

#### Route Khusus (non-auth)

| Route | Fungsi |
|---|---|
| `/login` + `/masuk` | Login (duplikat — perlu konsolidasi) |
| `/signup` + `/daftar` | Registrasi (duplikat — perlu konsolidasi) |
| `/forgot-password` + `/reset-password` | Reset kata sandi |
| `/onboarding` | Onboarding merchant baru |
| `/invite/$token` | Terima undangan staff |
| `/booking/$id/payment-callback` | Callback pembayaran deposit booking |
| `/booking/cancel/$token` | Batalkan booking via token |
| `/booking/reschedule/$token` | Reschedule booking via token |
| `/download/$token` | Download produk digital |
| `/d/$token` | Short-link download |
| `/kontrak/$token` | Lihat kontrak freelance via token |
| `/quote/$id` | Lihat penawaran custom order |
| `/sitemap.xml` | Sitemap SEO |

#### Route Toko Mode White-Label (`/s/$slug/*`)

| Route | Fungsi |
|---|---|
| `/s/$slug` | Homepage toko white-label |
| `/s/$slug/menu/$menuId` | Detail produk |
| `/s/$slug/cart` | Keranjang toko |
| `/s/$slug/checkout` | Checkout toko |
| `/s/$slug/orders` | Order history di toko |
| `/s/$slug/pay/$orderId` | Bayar order |
| `/s/$slug/login` | Login untuk toko tertentu |
| `/s/$slug/me` | Akun di konteks toko |

#### Route Order Langsung (`/order/$slug/*`)

Sama dengan `/s/$slug/*` tapi dengan slug format berbeda.

---

## BAGIAN 4 — MASALAH KRITIS INFRASTRUKTUR

> **Ini harus diselesaikan sebelum platform bisa go-live.** Tanpa ini, checkout gagal, upload gambar bisa rusak, dan POS tidak real-time.

### K1 — Keamanan PostgREST Proxy ⚠️ KRITIS

**Masalah:** Endpoint `/rest/v1/*` bisa diakses tanpa autentikasi — siapapun bisa baca/tulis semua tabel Supabase.  
**Solusi:**
1. Tambah JWT middleware validation di Express sebelum tiap route `/rest/v1/*`
2. Whitelist tabel yang boleh diakses per role
3. Auto-inject filter `shop_id` berdasarkan JWT claims

### K2 — File Upload / Storage ⚠️ KRITIS

**Masalah:** Semua upload gambar (produk, profil, foto studio, bukti kurir) ke Supabase Storage. Jika Supabase Storage diputus, upload baru gagal.  
**Solusi pilihan:** (a) Tetap pakai Supabase Storage + pastikan bucket policy benar, atau (b) Migrasi ke Cloudinary / Cloudflare R2

### K3 — Realtime / WebSocket ⚠️ KRITIS

**Masalah:** Supabase Realtime dipakai di POS, Orders, Kurir — tapi data baru masuk ke Neon tidak akan memicu event realtime Supabase.  
**Solusi:** Implementasi Server-Sent Events (SSE) di Express untuk menggantikan Supabase Realtime channel di fitur-fitur kritis.

### K4 — Payment Gateway Secrets ⚠️ KRITIS

**Masalah:** `MIDTRANS_SERVER_KEY` dan `XENDIT_SECRET_KEY` belum dikonfigurasi di Replit Secrets — checkout marketplace gagal.  
**Solusi:** Set secrets di Replit + uji end-to-end checkout.

### K5 — Email Delivery ⚠️ KRITIS

**Masalah:** Undangan staff, notifikasi renewal, reset password tidak terkirim — tidak ada SMTP dikonfigurasi.  
**Solusi:** Konfigurasi Resend atau SendGrid, sambungkan ke: staff invitation flow, renewal cron, reset password.

---

## BAGIAN 5 — MASALAH TEKNIS LINTAS-FITUR

### 5.1 Keamanan

| # | Masalah | Solusi |
|---|---|---|
| T1 | PostgREST proxy tanpa auth (K1 di atas) | JWT middleware + tabel whitelist |
| T2 | SQL Injection via `table` param langsung dipakai di query | Whitelist nama tabel yang boleh diakses |
| T3 | Tidak ada Row Level Security enforcement di proxy | Auto-inject `shop_id` filter dari JWT |
| T4 | CORS terlalu terbuka (`app.use(cors())`) | Set CORS origin ke domain Replit/produksi saja |
| T5 | Tidak ada rate limiting di API | Tambah `express-rate-limit` middleware |

### 5.2 Data Mock / Fake — Perlu Disambungkan

| File Route | Masalah Mock |
|---|---|
| `pos-app.email-marketing.tsx` | Pakai `email_campaigns` tapi tabel tidak ada di types.ts — kemungkinan perlu pakai `marketing_campaigns` |
| `pos-app.storefront-builder.tsx` | `let _id = 1` — generate ID lokal, save tidak persist ke DB |
| `pos-app.digital-version.tsx` | `tablesMissing` check — perlu wire ke `menu_items` atau tabel baru |
| `pos-app.rajaongkir.tsx` | API call RajaOngkir belum diimplementasi via Express endpoint |
| `pos-app.flash-sale.tsx` + `pos-app.happy-hour.tsx` | Perlu verifikasi kolom sudah ada di `menu_items` |
| `pos-app.bulk-pricing.tsx` | Perlu tabel atau kolom khusus tier pricing |
| `pos-app.restock-notify.tsx` | Notifikasi aktual belum terkirim ke pelanggan |

### 5.3 Duplikasi Kode yang Perlu Dibersihkan

| Area | Duplikat | Rekomendasi |
|---|---|---|
| **Auth routes** | `login.tsx` + `masuk.tsx` (identik), `signup.tsx` + `daftar.tsx` (identik) | Hapus `masuk.tsx` dan `daftar.tsx`, redirect ke yang utama |
| **Cart system** | `lib/cart.ts` (POS), `lib/customer-cart.ts` (customer per-toko), `lib/marketplace-cart.ts` (marketplace multi-toko) | Tiga sistem berbeda — dokumentasikan kapan masing-masing dipakai; jangan merge paksa |
| **Printer** | `lib/escpos-printer.ts` (root, legacy ESC/POS BT) + `lib/printer/` (direktori baru dengan `escpos.ts`, `printerService.ts`, dll.) | Hapus `escpos-printer.ts`, semua pakai `lib/printer/` |
| **Review dialog** | `components/customer/ReviewDialog.tsx` + `components/marketplace/MarketplaceReviewDialog.tsx` | Merge jadi satu dengan prop `mode` |
| **Printer picker** | `components/pos/printer-picker.tsx` + halaman `pos-app.printers` | Pastikan keduanya pakai driver dari `lib/printer/` |
| **Shop context** | `lib/use-shop.ts` + `lib/outlet-context.tsx` (overlap) | Konsolidasi — `use-shop` untuk data toko, `outlet-context` untuk outlet aktif saja |

### 5.4 Performa & Realtime

| Masalah | Solusi |
|---|---|
| Subscribe realtime tanpa filter `shop_id` → traffic boros + potensi bocor lintas toko | Tambah `.filter('shop_id', 'eq', shopId)` di semua channel realtime owner |
| List besar masih `limit(150–500)` tanpa cursor pagination | Konversi ke keyset pagination di: notifications, orders, customers, inventory, reviews |
| View legacy `coffee_shops` — perlu diperiksa apakah masih dipakai | Grep referensi, drop jika tidak ada |

### 5.5 Operator PostgREST Proxy yang Belum Diimplementasi

| Operator | Status |
|---|---|
| `.in`, `.cs`, `.not`, `.or` | Belum diimplementasi di proxy `rest.ts` |
| Embedded resources `select=*,shop:shops(name)` | JOIN resolver belum ada |
| `RETURNING *` setelah POST/PATCH | Response tidak konsisten |

---

## BAGIAN 6 — PETA JALAN (ROADMAP)

### 🚨 Fase 1 — Darurat (Minggu 1–2): Infrastruktur Wajib

| ID | Task | Tabel/Komponen | Estimasi |
|----|------|----------------|----------|
| F1-1 | **Keamanan PostgREST**: JWT middleware + tabel whitelist + `shop_id` filter | Express `rest.ts` | 2 hari |
| F1-2 | **Payment Gateway**: Setup `MIDTRANS_SERVER_KEY` + `XENDIT_SECRET_KEY`, uji checkout | `payment_transactions` †, `orders` | 1 hari |
| F1-3 | **Email**: Konfigurasi SMTP (Resend/SendGrid), sambungkan staff invitation + renewal | `staff_invitations`, `plan_invoices` | 1 hari |
| F1-4 | **CORS + Rate Limiting**: Restrict origin, tambah `express-rate-limit` | Express `index.ts` | 0.5 hari |
| F1-5 | **PostgREST operators**: `.in`, `.not`, `RETURNING *` di proxy | Express `rest.ts` | 1 hari |

### 🔧 Fase 2 — Sambungkan Data Mock ke DB (Minggu 2–3)

| ID | Task | Tabel | Estimasi |
|----|------|-------|----------|
| F2-1 | **Email Marketing**: Ganti `email_campaigns` → `marketing_campaigns` + `campaign_recipients` | `marketing_campaigns`, `campaign_recipients` | 0.5 hari |
| F2-2 | **Storefront Builder**: Buat/verifikasi tabel `storefront_layouts`, wire load/save | _(buat tabel baru)_ | 1 hari |
| F2-3 | **Digital Version**: Wire ke `menu_items`, hapus `tablesMissing` | `menu_items` | 0.5 hari |
| F2-4 | **RajaOngkir**: Buat Express endpoint `/api/rajaongkir/cost`, panggil dari frontend | _(API eksternal)_ | 1 hari |
| F2-5 | **Flash Sale + Happy Hour**: Verifikasi kolom `flash_price`/`flash_starts_at`/`flash_ends_at` ada di DB | `menu_items` | 0.5 hari |
| F2-6 | **Cash Drawer**: Buat halaman `/pos-app/cash-drawer` | `cash_shifts`, `cash_movements` | 1 hari |

### 🧹 Fase 3 — Bersih-bersih Kode (Minggu 3–4)

| ID | Task | Estimasi |
|----|------|----------|
| F3-1 | Hapus `masuk.tsx` + `daftar.tsx` (redirect ke `login.tsx` + `signup.tsx`) | 0.25 hari |
| F3-2 | Hapus `lib/escpos-printer.ts`, update semua import ke `lib/printer/` | 0.5 hari |
| F3-3 | Merge `customer/ReviewDialog` + `marketplace/MarketplaceReviewDialog` | 0.5 hari |
| F3-4 | Konsolidasi `lib/use-shop.ts` + `lib/outlet-context.tsx` | 0.5 hari |
| F3-5 | Tambah filter `shop_id` di semua channel Supabase Realtime owner | 0.5 hari |
| F3-6 | Konversi list besar ke keyset pagination (notifications, customers, reviews) | 1 hari |

### 🛍️ Fase 4 — Customer Experience (Minggu 4–6)

| ID | Fitur | Tabel | Prioritas |
|----|-------|-------|-----------|
| F4-1 | **Submit Ulasan** (flow dari `/akun/pesanan`) | `product_reviews`, `menu_reviews` | Tinggi |
| F4-2 | **Full-text Search** endpoint + UI | `menu_items`, `coffee_shops` | Tinggi |
| F4-3 | **Address Book** CRUD di `/akun/alamat` | `customer_addresses` | Tinggi |
| F4-4 | **Push Notification** (VAPID + service worker) | `push_subscriptions` | Sedang |
| F4-5 | **Q&A Produk** (customer submit pertanyaan, merchant jawab) | _(tabel baru `product_qa`)_ | Sedang |
| F4-6 | **Follow Toko** | `customer_favorites` | Rendah |

### 🔄 Fase 5 — Realtime (Minggu 5–7)

| ID | Task | Estimasi |
|----|------|----------|
| F5-1 | SSE endpoint di Express untuk POS sync (order baru, status update) | 2 hari |
| F5-2 | SSE untuk kurir (order tersedia real-time) | 1 hari |
| F5-3 | SSE untuk notifikasi merchant | 1 hari |

### 🚀 Fase 6 — Platform Lanjutan (Minggu 8+)

| ID | Fitur | Tabel | Prioritas |
|----|-------|-------|-----------|
| F6-1 | **Auto Refund ke Gateway** (saat cancel/dispute) | `refunds`, `payment_transactions` | Tinggi |
| F6-2 | **Multi-outlet Report Agregat** | `orders`, `outlets` | Sedang |
| F6-3 | **Outgoing Webhooks** (merchant subscribe events) | _(tabel baru `merchant_webhooks`)_ | Sedang |
| F6-4 | **Group Buy / Patungan** | _(tabel baru)_ | Rendah |
| F6-5 | **Subscription / Langganan Produk Rutin** | _(recurring billing)_ | Rendah |
| F6-6 | **BNPL / Cicilan** (Kredivo, Akulaku) | _(API pihak ketiga)_ | Rendah |
| F6-7 | **Mobile App** (React Native / Expo) | — | Proyek terpisah |
| F6-8 | **Telemedicine / Konsultasi Video** (klinik) | _(WebRTC)_ | Rendah |
| F6-9 | **Live Streaming Commerce** | _(WebRTC/HLS)_ | Rendah |

---

## BAGIAN 7 — QUICK WINS

Perbaikan kecil berdampak besar, bisa dikerjakan kapan saja:

| # | Perbaikan | Estimasi |
|---|-----------|----------|
| QW1 | Loading skeleton di semua halaman yang fetch data | 0.5 hari |
| QW2 | Empty state informatif saat list kosong (bukan blank) | 0.5 hari |
| QW3 | Filter "Buka Sekarang" & rating minimum di halaman `/sekitar` | 0.5 hari |
| QW4 | Selector outlet di KDS (filter `outlet_id` jika toko >1 outlet) | 0.25 hari |
| QW5 | `<title>` dinamis per halaman di semua route | 0.25 hari |
| QW6 | Sitemap.xml sudah ada — tambah `robots.txt` | 0.25 hari |
| QW7 | OG tags per halaman toko & produk untuk share sosmed | 0.5 hari |
| QW8 | Hapus/kunci halaman `*.sandbox.*` di build produksi | 0.25 hari |
| QW9 | Deposit booking — pindahkan `markDepositPaid` ke webhook-only (Midtrans/Xendit) | 1 hari |

---

## BAGIAN 8 — METRIK KELENGKAPAN PER ROLE (per 29 Mei 2026)

| Role | Route Ada | Perlu Sambungkan ke DB | Fitur Belum Ada | % Siap |
|---|---|---|---|---|
| **Super Admin** | 61 route ✅ | 7 halaman ⚠️ | 3 fitur ❌ | ~88% |
| **Merchant / Owner** | 150 route ✅ | 10 halaman ⚠️ | 2 fitur ❌ | ~90% |
| **Staff / Kasir** | (via pos-app) | Login email belum terkirim (K5) | Dashboard pribadi, slip gaji | ~70% |
| **Customer** | 20 route ✅ | Checkout belum aktif (K4) | Submit ulasan, search, Q&A | ~75% |
| **Kurir** | 5 route ✅ | Upload foto (K2), penarikan | Rating, peta navigasi | ~65% |
| **Marketplace Publik** | 30+ route ✅ | Search, realtime (K3) | — | ~80% |
| **Infrastruktur** | — | K1–K5 belum selesai | — | ~40% |

> **Kesimpulan:** Struktur halaman hampir 100% lengkap. Bottleneck utama adalah **5 masalah infrastruktur (K1–K5)** dan **10 halaman yang masih pakai mock data**. Prioritaskan Fase 1 (infrastruktur) sebelum menambah fitur baru apapun.

---

## BAGIAN 9 — RENAME TABEL & KONSISTENSI NAMA (Migrasi dari `coffee_shops`)

### 9.1 Status Rename `coffee_shops` → `shops`

| Lapisan | Status | Keterangan |
|---|---|---|
| **Kode route/lib/hooks** | ✅ Sudah `"shops"` | 123+ `.from("shops")` calls — tidak ada `"coffee_shops"` tersisa |
| **`types.ts`** | ✅ Diperbaiki sesi ini | Semua 28 kemunculan `"coffee_shops"` sudah diganti `"shops"` |
| **DB Supabase (aktual)** | ⚠️ Perlu diverifikasi | Jika tabel di DB masih `coffee_shops`, jalankan SQL di bawah |
| **FK constraint names** | ⚠️ Kosmetik | `coffee_shops_*_fkey` di nama constraint — tidak pengaruh fungsional |

**SQL Migration — Rename Tabel di DB:**
```sql
-- Cek apakah tabel shops sudah ada atau masih coffee_shops
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('shops', 'coffee_shops');

-- Jika masih coffee_shops dan shops belum ada:
ALTER TABLE public.coffee_shops RENAME TO shops;

-- Regenerasi types setelah rename:
-- npx supabase gen types typescript --project-id <PROJECT_ID> \
--   > artifacts/kopihub/src/integrations/supabase/types.ts
```

### 9.2 Nama Tabel F&B-Spesifik yang Sudah / Perlu Digeneralisasi

| Nama Lama | Nama Baru | Status | File Terdampak |
|---|---|---|---|
| `coffee_shops` | `shops` | ✅ Kode & types.ts selesai; DB pending | semua |
| `fnb_combos` | `product_combos` | ✅ Kode selesai (`pos-app.combo-builder.tsx`); DB pending | 1 file |
| `menu_item_option_groups` | `product_option_groups` (opsional) | ⚠️ Kandidat — 6 file perlu update | rendah-prioritas |
| `menu_item_options` | `product_options` (opsional) | ⚠️ Kandidat — 6 file perlu update | rendah-prioritas |
| `menu_item_variants` | `product_variants` (opsional) | ⚠️ Kandidat — 4 file perlu update | rendah-prioritas |
| `menu_reviews` | Merge ke `product_reviews` (opsional) | ⚠️ Dua tabel ulasan terpisah | rendah-prioritas |
| `menu_hpp_view` | `product_cost_view` (opsional) | ⚠️ View — 2 file | rendah-prioritas |

> **Catatan:** `menu_items` (78 occurrences) sudah dipakai secara generik untuk SEMUA jenis usaha (digital, rental, kursus, paket umroh, dll.). **Jangan rename** — terlalu banyak dampak dan sudah diterima sebagai "product catalog universal".

**SQL Migration — Rename `fnb_combos`:**
```sql
ALTER TABLE IF EXISTS public.fnb_combos RENAME TO product_combos;
```

### 9.3 Tabel di Kode tapi Belum di `types.ts` (Perlu Regenerasi)

`types.ts` saat ini memiliki **88 tabel** (sudah termasuk rename `shops`). Kode menggunakan **~160+ tabel**. Tabel-tabel berikut ada di DB (dipakai di kode) tapi belum terdefinisi di `types.ts` — solusi: **regenerasi `types.ts` dari Supabase CLI**.

| Domain | Tabel yang Hilang dari `types.ts` |
|---|---|
| **Rental** | `rental_units`, `rental_bookings`, `rental_checklists`, `rental_inspections` |
| **Booking Extended** | `booking_addons`, `booking_service_packages`, `booking_review_requests`, `booking_reviews`, `booking_vouchers`, `booking_reschedule_logs` |
| **Chat** | `shop_chats`, `shop_chat_messages` |
| **Studio Foto** | `studio_galleries`, `studio_gallery_photos`, `studio_briefs`, `studio_packages`, `studio_locations`, `studio_deliveries`, `studio_photo_reviews` |
| **Kursus / LMS** | `course_modules`, `course_lessons`, `course_enrollments`, `course_certificates`, `lesson_progress` |
| **Klinik** | `patient_records`, `patient_visits`, `medications`, `prescriptions`, `prescription_items`, `anamnesis_forms`, `icd10_codes`, `medical_invoices` |
| **Travel & Umroh** | `umroh_packages`, `umroh_facilities`, `umroh_faqs`, `travel_jamaah_manifest`, `travel_jamaah_documents`, `travel_itineraries`, `travel_installments` |
| **Freelance/Custom** | `freelance_contracts`, `custom_order_quotes`, `project_milestones`, `job_deliverables`, `authenticity_certificates` |
| **POS Extended** | `tables`, `table_maps`, `printers`, `queue_sessions`, `queue_entries`, `order_audit_log`, `pos_audit_log`, `staff_audit_logs` |
| **Produk Extended** | `flash_sales`, `happy_hour_rules`, `bulk_pricing_rules`, `product_combos`, `bundle_items`, `limited_editions`, `product_qa`, `menu_item_variants`, `restock_subscribers` |
| **Shop Extended** | `shop_about`, `shop_api_keys`, `shop_bank_accounts`, `shop_lookbook`, `shop_skin_quiz`, `shop_product_claims`, `shop_size_charts`, `storefront_layouts`, `page_layouts`, `page_layout_versions` |
| **Loyalty Extended** | `loyalty_tiers`, `loyalty_rewards`, `loyalty_redemptions`, `loyalty_analytics` |
| **Customer Extended** | `cashback_wallets`, `cashback_transactions`, `wishlists`, `buyer_ratings`, `referrals`, `referral_programs`, `customer_treatments` |
| **Marketing Extended** | `email_campaigns`, `wa_broadcasts`, `ad_requests`, `banners`, `affiliates` |
| **Kurir Extended** | `courier_earnings`, `outlet_couriers` |
| **Staff Extended** | `staff_members`, `staff_audit_logs` |
| **Returns** | `return_requests`, `product_returns` |
| **Integrasi** | `webhook_events`, `integration_webhooks`, `integration_mappings`, `third_party_integrations`, `api_keys`, `api_usage` |
| **Admin** | `admin_users`, `data_requests` |
| **Views** | `v_shop_capabilities` |

**Perintah regenerasi:**
```bash
npx supabase gen types typescript \
  --project-id <SUPABASE_PROJECT_ID> \
  > artifacts/kopihub/src/integrations/supabase/types.ts
```

---

## BAGIAN 10 — FITUR LOKASI & PETA TOKO

### 10.1 Audit Status (per 29 Mei 2026)

> Fitur lokasi sudah memiliki pondasi yang **sangat kuat**. Sebagian besar komponen sudah dibangun — gap utama ada di **skema DB yang belum komplit** dan **beberapa fitur UX lanjutan**.

#### ✅ Sudah Diimplementasi

| Komponen / Route | Deskripsi | API / Library |
|---|---|---|
| `ShopLocationPicker.tsx` | Map interaktif untuk merchant set pin lokasi toko — Nominatim search (address→coords), GPS device, drag pin, input koordinat manual, Google Maps preview link | **Nominatim** (gratis, tanpa API key) + **Leaflet** + **OpenStreetMap** |
| `pos-app.settings.tsx` | Form settings merchant sudah punya field `address`, `latitude`, `longitude`, `google_maps_url` + ShopLocationPicker terintegrasi | Supabase (shops table) |
| `/sekitar` | Halaman toko terdekat — GPS geolocation, radius slider 1–50 km, tampilan list + peta Leaflet, jarak dalam km/m, link arah ke Google Maps | `shops_nearby` RPC + Leaflet |
| `NearbyShopsMap.tsx` | Komponen peta Leaflet dengan marker tiap toko, circle radius, popup detail, fit bounds otomatis | **Leaflet** + **OpenStreetMap tiles** (100% gratis) |
| `/toko/$slug/map` | Halaman peta per toko — embed OpenStreetMap, link "Lihat di Google Maps" + "Petunjuk Arah", deteksi GPS pembeli untuk hitung jarak | OpenStreetMap embed + Browser Geolocation |
| `/toko/$slug` | Halaman storefront — tampil alamat + kota, Google Maps view + arah jika ada koordinat | Static link generation |
| Homepage `/` | Link "Cari toko di sekitar saya" → `/sekitar` | — |
| `kategori/$slug/$city` | Filter toko per kategori per kota (berbasis teks kota) | — |

#### ⚠️ Ada tapi Perlu Diperbaiki

| Item | Masalah | Solusi |
|---|---|---|
| **Kolom DB `shops` tidak lengkap** | `latitude`, `longitude`, `city`, `province`, `postal_code`, `google_maps_url` **belum ada di `types.ts`** (kode pakai `as any` untuk bypass TypeScript) | Jalankan SQL migration + regenerasi `types.ts` |
| **`shops_nearby` RPC** | Dipanggil di kode tapi belum ada definisi SQL — perlu dibuat di Supabase | Jalankan SQL create function di bawah |
| **Auto-fill kota dari pin** | Saat merchant drop pin di peta, `city`/`province` tidak otomatis terisi | Tambah Nominatim reverse geocoding di `ShopLocationPicker` |
| **Field `city`, `province`, `postal_code` di settings** | `pos-app.settings.tsx` belum punya form input untuk kota/provinsi/kodepos | Tambah 3 field form |
| **Filter `/sekitar`** | Tidak ada filter kategori bisnis, tidak ada toggle "Buka Sekarang" | Tambah filter panel |
| **Lokasi pembeli tidak persisten** | GPS di `/sekitar` hanya untuk sesi itu — tidak disimpan ke localStorage/profil | Simpan ke `localStorage` + update `customer_profiles.default_city` |
| **Homepage tanpa geo-context** | Homepage tidak menampilkan toko terdekat secara otomatis berdasarkan lokasi | Tambah banner/section "Di Sekitar Anda" |

#### ❌ Belum Ada

| Fitur | Deskripsi | Prioritas |
|---|---|---|
| **Autocomplete alamat saat checkout** | Saat pembeli input alamat pengiriman di checkout, ada autocomplete dari Nominatim | Sedang |
| **Peta sebaran toko di admin** | Super admin bisa lihat semua toko di peta (choropleth/heatmap per provinsi) | Rendah |
| **Clustering marker** | Di `/sekitar` jika toko banyak, marker di-cluster supaya tidak overlapping | Sedang |
| **Share lokasi toko** | Merchant bisa generate link "lokasi toko saya" yang bisa dibagikan ke WhatsApp | Rendah |

---

### 10.2 Skema Database — Kolom yang Perlu Ditambahkan

Tabel `shops` di types.ts **tidak memiliki** kolom-kolom lokasi berikut. Perlu di-ALTER TABLE:

```sql
-- Kolom lokasi pada tabel shops (jika belum ada)
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS latitude     NUMERIC(10, 7)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS longitude    NUMERIC(10, 7)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS city         TEXT            DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS province     TEXT            DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS postal_code  TEXT            DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT         DEFAULT NULL;

-- Index untuk query nearby shops (haversine / earthdistance)
CREATE INDEX IF NOT EXISTS idx_shops_lat_lng
  ON public.shops (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index untuk filter per kota
CREATE INDEX IF NOT EXISTS idx_shops_city
  ON public.shops (city)
  WHERE city IS NOT NULL;
```

**Penjelasan tiap kolom:**

| Kolom | Tipe | Contoh | Kegunaan |
|---|---|---|---|
| `latitude` | `NUMERIC(10,7)` | `-6.2088090` | GPS koordinat, presisi 7 desimal (~1 cm) |
| `longitude` | `NUMERIC(10,7)` | `106.8455530` | GPS koordinat |
| `city` | `TEXT` | `Jakarta Selatan` | Filter per kota di marketplace & search |
| `province` | `TEXT` | `DKI Jakarta` | Filter per provinsi |
| `postal_code` | `TEXT` | `12930` | Kalkulasi ongkos kirim, integrasi RajaOngkir |
| `google_maps_url` | `TEXT` | `https://maps.app.goo.gl/...` | Link Google Maps yang diisi merchant secara manual (short link) |

---

### 10.3 Fungsi PostgreSQL `shops_nearby` (RPC)

Fungsi ini dipanggil dari `/sekitar` tapi belum tentu ada di DB. Buat jika belum ada:

```sql
-- Aktifkan extension earthdistance (jika belum)
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Fungsi shops_nearby menggunakan earthdistance (akurat & cepat)
CREATE OR REPLACE FUNCTION public.shops_nearby(
  _lat      NUMERIC,
  _lng      NUMERIC,
  _radius_km NUMERIC DEFAULT 10,
  _limit    INT     DEFAULT 60
)
RETURNS TABLE (
  id           UUID,
  slug         TEXT,
  name         TEXT,
  tagline      TEXT,
  logo_url     TEXT,
  address      TEXT,
  city         TEXT,
  latitude     NUMERIC,
  longitude    NUMERIC,
  rating_avg   NUMERIC,
  review_count INT,
  distance_km  NUMERIC
)
LANGUAGE sql STABLE AS $$
  SELECT
    s.id,
    s.slug,
    s.name,
    s.tagline,
    s.logo_url,
    s.address,
    s.city,
    s.latitude,
    s.longitude,
    s.rating_avg,
    COALESCE(s.rating_count, 0)::INT AS review_count,
    ROUND(
      (earth_distance(
        ll_to_earth(_lat, _lng),
        ll_to_earth(s.latitude::float8, s.longitude::float8)
      ) / 1000.0)::NUMERIC,
      2
    ) AS distance_km
  FROM public.shops s
  WHERE
    s.latitude  IS NOT NULL
    AND s.longitude IS NOT NULL
    AND s.is_active = TRUE
    AND s.marketplace_visible = TRUE
    AND earth_box(ll_to_earth(_lat, _lng), _radius_km * 1000) @>
        ll_to_earth(s.latitude::float8, s.longitude::float8)
    AND earth_distance(
        ll_to_earth(_lat, _lng),
        ll_to_earth(s.latitude::float8, s.longitude::float8)
      ) <= _radius_km * 1000
  ORDER BY distance_km ASC
  LIMIT _limit;
$$;

-- Grant akses ke anon dan authenticated
GRANT EXECUTE ON FUNCTION public.shops_nearby TO anon, authenticated;
```

> **Catatan:** Jika ekstensi `earthdistance` tidak tersedia di Supabase tier yang dipakai, gunakan formula Haversine sederhana:
> ```sql
> -- Alternatif tanpa extension (Haversine manual)
> ROUND((
>   6371 * acos(
>     cos(radians(_lat)) * cos(radians(s.latitude::float8)) *
>     cos(radians(s.longitude::float8) - radians(_lng)) +
>     sin(radians(_lat)) * sin(radians(s.latitude::float8))
>   )
> )::NUMERIC, 2) AS distance_km
> ```

---

### 10.4 API Geocoding yang Digunakan (Gratis)

| API | Kegunaan | Limit | API Key |
|---|---|---|---|
| **Nominatim (OpenStreetMap)** | Address → coordinates (forward geocoding) + Coordinates → address (reverse geocoding) | 1 req/detik, tanpa registrasi | ❌ Tidak perlu |
| **OpenStreetMap Tile Server** | Map tiles di Leaflet (`{s}.tile.openstreetmap.org`) | Fair use | ❌ Tidak perlu |
| **Browser Geolocation API** | Deteksi posisi pembeli / merchant di browser | Browser native | ❌ Tidak perlu |
| **Google Maps (link only)** | Buka peta / petunjuk arah di tab baru | Tidak ada API call — hanya URL link | ❌ Tidak perlu |

> Semua API yang dipakai **100% gratis dan sudah terimplementasi**. Tidak ada biaya tambahan.

**Endpoint Nominatim yang Dipakai:**
```
# Forward geocoding (address → lat/lng) — sudah ada di ShopLocationPicker.tsx
GET https://nominatim.openstreetmap.org/search
  ?format=json&limit=1&countrycodes=id&q=<ALAMAT>

# Reverse geocoding (lat/lng → address) — PERLU DITAMBAHKAN
GET https://nominatim.openstreetmap.org/reverse
  ?format=json&lat=<LAT>&lon=<LNG>&addressdetails=1&accept-language=id
```

**Contoh response reverse geocoding yang berguna:**
```json
{
  "address": {
    "road": "Jalan Sudirman",
    "suburb": "Senayan",
    "city_district": "Kebayoran Baru",
    "city": "Jakarta Selatan",
    "state": "DKI Jakarta",
    "postcode": "12930",
    "country": "Indonesia"
  }
}
```
→ Dari sini: `city = address.city`, `province = address.state`, `postal_code = address.postcode`

---

### 10.5 Rencana Penyempurnaan — Prioritas & Urutan

#### 🔴 P1 — Wajib (DB tidak konsisten tanpa ini)

| ID | Task | File | SQL/API |
|----|------|------|---------|
| L1-1 | **ALTER TABLE shops** — tambah kolom `latitude`, `longitude`, `city`, `province`, `postal_code`, `google_maps_url` | Supabase DB | SQL §10.2 |
| L1-2 | **Buat `shops_nearby` RPC** di Supabase | Supabase DB | SQL §10.3 |
| L1-3 | **Regenerasi `types.ts`** setelah schema update | `types.ts` | `supabase gen types` |
| L1-4 | **Tambah field kota/provinsi/kodepos** di `pos-app.settings.tsx` (3 input baru di bawah alamat) | `pos-app.settings.tsx` | — |

#### 🟡 P2 — Penting (UX merchant dan pembeli lebih baik)

| ID | Task | File | Estimasi |
|----|------|------|---------|
| L2-1 | **Auto-fill kota dari pin** — saat merchant drop pin atau search alamat di `ShopLocationPicker`, panggil Nominatim reverse geocoding → isi `city`, `province`, `postal_code` otomatis | `ShopLocationPicker.tsx` | 0.5 hari |
| L2-2 | **Simpan lokasi pembeli ke localStorage** — setelah GPS detected di `/sekitar`, simpan `{ lat, lng, city }` ke `localStorage("umkmgo.userLocation")` supaya bisa dipakai di halaman lain | `sekitar.tsx` | 0.25 hari |
| L2-3 | **Filter kategori bisnis di `/sekitar`** — dropdown filter business_category_id di atas daftar toko | `sekitar.tsx` | 0.5 hari |
| L2-4 | **Filter "Buka Sekarang" di `/sekitar`** — toggle yang filter toko berdasarkan `open_hours` vs waktu saat ini | `sekitar.tsx` | 0.5 hari |
| L2-5 | **Section "Toko Terdekat" di Homepage** — jika `localStorage("umkmgo.userLocation")` ada, tampilkan strip toko terdekat di bawah banner (3–6 toko, lazy load GPS jika tidak ada) | `index.tsx` | 1 hari |

#### 🟢 P3 — Peningkatan (Nice to have)

| ID | Task | File | Estimasi |
|----|------|------|---------|
| L3-1 | **Marker clustering di peta `/sekitar`** — pakai `react-leaflet-cluster` supaya tidak overlap saat toko banyak | `NearbyShopsMap.tsx` | 0.5 hari |
| L3-2 | **Autocomplete alamat di checkout** — saat pembeli ketik alamat, saran dari Nominatim | `checkout.tsx` | 1 hari |
| L3-3 | **Peta sebaran toko di admin** — choropleth per provinsi di `/admin/shops` | `admin.shops.tsx` | 1 hari |
| L3-4 | **Share lokasi toko** — tombol "Bagikan Lokasi" di halaman toko yang generate WhatsApp deep link dengan koordinat/Google Maps URL | `toko.$slug.tsx` | 0.25 hari |
| L3-5 | **Toko terdekat di halaman kategori** — saat user di `/kategori/$slug`, tampilkan toko yang paling dekat dengan lokasi user di atas list | `kategori.$slug.tsx` | 0.5 hari |

---

### 10.6 Ringkasan Status Fitur Lokasi

```
LAPISAN          STATUS    KETERANGAN
─────────────────────────────────────────────────────
Map tiles        ✅ DONE   OpenStreetMap (Leaflet) — gratis
GPS browser      ✅ DONE   navigator.geolocation
Forward geocode  ✅ DONE   Nominatim di ShopLocationPicker
Reverse geocode  ❌ TODO   Perlu tambah ke ShopLocationPicker (L2-1)
Halaman /sekitar ✅ DONE   GPS + radius + list + peta — lengkap
Peta per toko    ✅ DONE   /toko/$slug/map
Setting merchant ✅ DONE   Lat/lng + address sudah ada; city/province TODO (L1-4)
Google Maps link ✅ DONE   View + petunjuk arah dari koordinat/nama
DB kolom lokasi  ⚠️ TODO   ALTER TABLE shops (L1-1) + regenerasi types (L1-3)
shops_nearby RPC ⚠️ TODO   Perlu dibuat di DB jika belum ada (L1-2)
Lokasi persisten ❌ TODO   localStorage buyer location (L2-2)
Section homepage ❌ TODO   "Toko di sekitar kamu" (L2-5)
Filter /sekitar  ❌ TODO   Kategori + buka sekarang (L2-3, L2-4)
```

---

*Dokumen ini dihasilkan dari analisis langsung terhadap 142 tabel Supabase, 2 tabel Drizzle/Neon, 295 route frontend, 8 API route, dan kode komponen pada 29 Mei 2026.*
