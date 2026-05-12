# PRD (Product Requirements Document)
# KopiHub / UMKMgo — Platform Marketplace & POS UMKM Indonesia
# Versi: 2.0 | Status: DRAFT | Tanggal: Mei 2025

---

## EXECUTIVE SUMMARY

UMKMgo adalah platform super-app untuk UMKM Indonesia yang menggabungkan:
- **POS (Point of Sale)** berbasis cloud untuk operasional toko
- **Marketplace multi-kategori** untuk menjangkau pembeli seluruh Indonesia
- **Storefront builder** agar setiap toko punya toko online sendiri
- **Ekosistem loyalty & engagement** untuk mempertahankan pelanggan

**Target pengguna:** 65 juta UMKM Indonesia + ratusan juta konsumen

---

## BAGIAN 1: ANALISIS FITUR YANG SUDAH ADA

### 1.1 Super Admin (sudah ada)
- Dashboard platform: GMV, MRR, pesanan harian, toko aktif
- Manajemen KYC merchant
- Manajemen langganan (plans/billing)
- Pengaturan komisi per kategori
- Persetujuan penarikan dana (withdrawal)
- Manajemen banner iklan & ads
- Dispute resolution
- Moderasi ulasan & konten
- Broadcast notification
- Feature flags
- Audit log
- Laporan keuangan & rekonsiliasi
- Impersonasi toko (untuk support)
- Fraud detection (basic)
- Revenue leakage monitoring

### 1.2 Toko / Merchant (sudah ada)
- POS terminal (kasir digital)
- Kitchen Display System (KDS)
- Manajemen menu & kategori
- Manajemen stok & bahan baku (inventory)
- Resep & deduct otomatis
- Bundle produk
- Manajemen supplier & purchase order
- Manajemen karyawan & absensi
- Shift & kas
- Jadwal kerja karyawan
- Loyalty program (poin, tier Bronze/Silver/Gold/Platinum)
- Promo & voucher
- Flash sale terjadwal
- Email marketing
- Ulasan (balas, moderasi)
- Q&A produk (pin FAQ, auto-reply)
- Live chat dengan pembeli
- Laporan harian & analitik marketplace
- Keuangan (wallet, escrow, penarikan)
- Billing & langganan plan
- Storefront builder (2 tema)
- Custom domain
- Outlet multi-cabang
- QR code meja & menu
- Thermal printer
- Booking/reservasi meja
- KYC toko
- Atribut & varian produk
- Produk digital
- Kurir & pengiriman
- RajaOngkir integrasi
- Rekening bank toko
- Backup data
- Custom CSS

### 1.3 Pembeli / Customer (sudah ada)
- Marketplace beranda (banner, featured shop, produk)
- Pencarian produk & toko
- Kategori produk
- Halaman toko dengan rating
- Detail produk + ulasan + Q&A
- Keranjang belanja
- Checkout dengan berbagai metode bayar
- Order tracking real-time
- Live chat dengan penjual
- Dispute/komplain pesanan
- Halaman akun (pesanan, alamat, wishlist, favorit)
- Program loyalty (poin, tier, redeem)
- Referral program
- Notifikasi in-app
- Leaderboard toko terbaik
- Trust Certificate Badge
- Flash sale / promo
- Follow toko
- Review & rating produk

---

## BAGIAN 2: GAP ANALYSIS — FITUR YANG MASIH KURANG

### 2.1 SUPER ADMIN — Fitur yang Kurang

| No | Fitur | Prioritas | Alasan Bisnis |
|----|-------|-----------|---------------|
| A1 | **AI Fraud Scoring Engine** — ML-based risk scoring setiap transaksi/pendaftaran | KRITIS | Cegah kerugian platform jutaan rupiah |
| A2 | **Category Management** — CRUD kategori, sub-kategori, icon, SEO meta | TINGGI | Admin tidak bisa kelola kategori sendiri |
| A3 | **Cohort & Retention Analytics** — Analisis churn, LTV, cohort per bulan | TINGGI | Pengambilan keputusan strategis |
| A4 | **Platform Voucher Issuer** — Buat voucher platform-wide (bukan per toko) | TINGGI | Kampanye akuisisi pengguna |
| A5 | **Affiliate / Partner Management** — Kelola afiliasi, track konversi, bayar komisi | TINGGI | Channel akuisisi murah |
| A6 | **Tax & Invoice Management** — Laporan pajak PPh/PPN, e-Faktur | TINGGI | Kewajiban legal |
| A7 | **SLA & Uptime Monitor** — Monitor response time API, alert otomatis | TINGGI | Jaga kualitas layanan |
| A8 | **Forced App Update Manager** — Paksa update versi minimum | SEDANG | Security & bug fixes |
| A9 | **Multi-Language Content Manager** — Kelola terjemahan UI | SEDANG | Ekspansi regional |
| A10 | **Merchant Onboarding Automation** — Email sequence, checklist, progress tracking | TINGGI | Tingkatkan activation rate |
| A11 | **Data Export / GDPR Tools** — Export data pengguna, right to erasure | TINGGI | Kepatuhan regulasi |
| A12 | **Commission Simulator Advanced** — Simulasi dampak perubahan komisi | SEDANG | Mitigasi risiko pendapatan |
| A13 | **Platform Health Score** — Skor kesehatan per toko (aktif, konversi, komplain) | TINGGI | Identifikasi toko bermasalah |
| A14 | **Merchant Tier Program** — Badge Verified, Featured, Premium Seller | TINGGI | Tingkatkan kualitas merchant |
| A15 | **Automated Payout Schedule** — Payout otomatis terjadwal (harian/mingguan) | TINGGI | Kurangi beban ops |

### 2.2 TOKO / MERCHANT — Fitur yang Kurang

| No | Fitur | Prioritas | Alasan Bisnis |
|----|-------|-----------|---------------|
| B1 | **AI Product Description Generator** — Generate deskripsi produk dari foto | KRITIS | 80% toko tidak punya deskripsi yang baik |
| B2 | **WhatsApp Business Integration** — Kirim notif order, broadcast, chat via WA | KRITIS | Kanal komunikasi utama UMKM |
| B3 | **Abandoned Cart Recovery** — Notif otomatis ke pembeli yang tidak checkout | KRITIS | Recover 15-20% revenue hilang |
| B4 | **Subscription / Recurring Orders** — Langganan produk mingguan/bulanan | TINGGI | Revenue predictable untuk toko |
| B5 | **Multi-Kurir Aggregator** — Bandingkan harga Sicepat, JNE, J&T, Ninja real-time | TINGGI | UX checkout lebih baik |
| B6 | **Dynamic Pricing** — Harga berubah berdasarkan waktu/demand/stok | TINGGI | Optimasi revenue |
| B7 | **Customer Segmentation** — Kelompokkan pelanggan (VIP, hibernating, new) | TINGGI | Marketing lebih targeted |
| B8 | **Advanced Booking System** — Booking dengan deposit, reminder otomatis | TINGGI | Untuk kafe, salon, jasa |
| B9 | **Google Analytics / Pixel Integration** — Connect GA4, Meta Pixel | TINGGI | Tracking iklan lebih akurat |
| B10 | **Social Media Auto-Post** — Auto-post produk/promo ke IG, FB, TikTok | TINGGI | Hemat waktu marketing |
| B11 | **Video Product Upload** — Upload video produk (maks 30 detik) | TINGGI | Konversi lebih tinggi |
| B12 | **Digital Voucher Generator** — Buat e-voucher yang bisa dijual/diberikan | TINGGI | Revenue stream baru |
| B13 | **Profit & Loss Statement** — Laporan laba rugi otomatis per periode | TINGGI | Kesehatan finansial toko |
| B14 | **Purchase Order Automation** — Auto-generate PO ketika stok di bawah minimum | SEDANG | Efisiensi operasional |
| B15 | **Staff Performance Dashboard** — Penjualan per kasir, target, bonus | SEDANG | Motivasi karyawan |
| B16 | **Upselling & Cross-selling Engine** — Rekomendasi "beli juga" otomatis | TINGGI | Naikkan average order value |
| B17 | **Wholesale / Bulk Pricing** — Harga berbeda untuk pembelian banyak | SEDANG | Melayani pembeli grosir |
| B18 | **Affiliate Program per Toko** — Toko bisa punya afiliator sendiri | SEDANG | Channel penjualan baru |
| B19 | **Product Catalog Sharing** — Share katalog produk sebagai link/PDF | TINGGI | Mudah promosi offline |
| B20 | **Stock Alert Telegram/WA Bot** — Notif stok menipis via Telegram/WA | SEDANG | Toko selalu update stok |

### 2.3 PEMBELI / CUSTOMER — Fitur yang Kurang

| No | Fitur | Prioritas | Alasan Bisnis |
|----|-------|-----------|---------------|
| C1 | **Group Buy / Patungan** — Beli bareng teman, harga lebih murah | KRITIS | Viral, akuisisi organik sangat kuat |
| C2 | **Price Drop Alert** — Notif kalau produk wishlist turun harga | KRITIS | Engagement & konversi |
| C3 | **BNPL / Cicilan (Pay Later)** — Integrasi Kredivo, Akulaku, GoPay Later | KRITIS | Naikkan konversi 30-40% |
| C4 | **Social Shopping / Share Cart** — Share keranjang ke teman, bisa diorder | TINGGI | Virality |
| C5 | **Reorder One-Click** — Ulangi pesanan lama dengan 1 klik | TINGGI | Retention pembeli |
| C6 | **Product Comparison** — Bandingkan 2-4 produk secara side-by-side | TINGGI | Bantu keputusan beli |
| C7 | **Gift / Hadiah Ordering** — Kirim pesanan sebagai hadiah ke orang lain | TINGGI | Use case spesial (ulang tahun, dll) |
| C8 | **Price History Chart** — Grafik histori harga produk | TINGGI | Bangun kepercayaan |
| C9 | **AI Recommendation Engine** — Rekomendasi produk berbasis perilaku | TINGGI | Naikkan session value |
| C10 | **AI Shopping Assistant (Chatbot)** — Bantu cari produk lewat chat | TINGGI | Pengalaman belanja lebih mudah |
| C11 | **Subscription Shopping** — Berlangganan produk rutin (kopi tiap minggu) | TINGGI | Retention kuat |
| C12 | **Virtual Try-On (AR)** — Preview produk (baju, aksesoris) secara AR | SEDANG | Diferensiasi vs Tokopedia |
| C13 | **Shopping List / Planner** — Buat daftar belanja & reminder beli | SEDANG | Engagement harian |
| C14 | **2-Way Rating** — Toko bisa rate pembeli (untuk kurangi fraud) | TINGGI | Ekosistem sehat |
| C15 | **Community Forum / Review Social** — Feed review dengan like, komen | SEDANG | UGC & engagement |
| C16 | **Live Streaming Commerce** — Toko live, pembeli langsung beli | TINGGI | Trend terbesar 2025 |
| C17 | **Cashback Wallet** — Saldo cashback khusus marketplace | TINGGI | Retensi pembeli |
| C18 | **COD Verification** — OTP sebelum kurir menyerahkan paket COD | TINGGI | Kurangi penolakan COD |
| C19 | **Return & Refund Self-Service** — Ajukan retur mandiri dengan foto | TINGGI | Kepercayaan pembeli |
| C20 | **Map-based Pickup** — Pilih titik pickup terdekat untuk ambil sendiri | SEDANG | Hemat ongkir |

---

## BAGIAN 3: PRD LENGKAP — FITUR PRIORITAS KRITIS

### 3.1 FITUR: Group Buy / Patungan (C1)

**Deskripsi:**  
Pembeli bisa membuat "room patungan" untuk produk tertentu. Undang teman-teman. Jika minimal peserta terpenuhi sebelum deadline, semua mendapat harga spesial. Jika tidak terpenuhi, pesanan dibatalkan otomatis.

**User Stories:**
- Sebagai pembeli, saya ingin membuat room patungan produk agar bisa beli lebih murah bersama teman
- Sebagai pembeli, saya ingin menerima link ajakan patungan dari teman
- Sebagai toko, saya ingin menawarkan harga patungan untuk meningkatkan penjualan volume
- Sebagai admin, saya ingin memonitor semua group buy aktif di platform

**Acceptance Criteria:**
- [ ] Toko bisa set "harga patungan" dan "minimum peserta" per produk
- [ ] Pembeli bisa buat room, dapatkan link shareable
- [ ] Timer countdown deadline terlihat jelas
- [ ] Notif realtime ke semua peserta ketika ada yang bergabung
- [ ] Jika kuorum tercapai → semua otomatis diarahkan ke pembayaran
- [ ] Jika deadline lewat tanpa kuorum → otomatis batal, tidak ada yang dicharge
- [ ] Toko menerima notif ketika group buy produknya dibuat

**SQL Tables Baru:**
```sql
group_buys, group_buy_participants
```

---

### 3.2 FITUR: AI Product Description Generator (B1)

**Deskripsi:**  
Toko upload foto produk, AI generate nama, deskripsi, tag, dan harga estimasi secara otomatis. Didukung oleh vision AI.

**User Stories:**
- Sebagai pemilik toko, saya ingin upload foto produk dan AI otomatis mengisi deskripsi produk
- Sebagai pemilik toko, saya ingin AI menyarankan harga berdasarkan produk serupa
- Sebagai pemilik toko, saya ingin AI generate tag SEO untuk produk saya

**Acceptance Criteria:**
- [ ] Upload foto → AI return: nama produk, deskripsi 100-200 kata, 5 tag, kategori saran, harga estimasi
- [ ] Pemilik bisa edit semua field sebelum publish
- [ ] Mendukung multiple foto (AI analisis semua)
- [ ] Output dalam Bahasa Indonesia
- [ ] Latency < 5 detik

---

### 3.3 FITUR: WhatsApp Business Integration (B2)

**Deskripsi:**  
Integrasi WhatsApp Business API untuk notifikasi otomatis order, broadcast promo, dan chat dukungan.

**User Stories:**
- Sebagai toko, saya ingin pelanggan menerima konfirmasi order via WhatsApp otomatis
- Sebagai toko, saya ingin broadcast promo ke semua pelanggan lewat WhatsApp
- Sebagai pembeli, saya ingin terima update status pesanan via WhatsApp

**Acceptance Criteria:**
- [ ] Toko bisa connect nomor WA Business mereka
- [ ] Template pesan: order_confirmed, order_shipped, order_delivered, promo
- [ ] Broadcast ke segmen pelanggan (VIP, all, inactive)
- [ ] 2-way chat tersinkron dengan inbox toko di app
- [ ] Analytics: pesan terkirim, dibaca, diklik

---

### 3.4 FITUR: Abandoned Cart Recovery (B3)

**Deskripsi:**  
Sistem otomatis mendeteksi pembeli yang meninggalkan keranjang tanpa checkout, lalu kirim reminder personal + insentif.

**User Stories:**
- Sebagai toko, saya ingin sistem otomatis mengingatkan pembeli yang lupa checkout
- Sebagai pembeli, saya ingin menerima reminder dengan voucher diskon untuk menyelesaikan pembelian

**Acceptance Criteria:**
- [ ] Trigger: cart tidak di-checkout dalam 1 jam (configurable)
- [ ] Kirim notif push + email (+ WA jika terhubung)
- [ ] Isi notif: produk dalam cart + opsi voucher diskon
- [ ] Max 2 reminder per sesi (tidak spam)
- [ ] Dashboard toko: recovery rate, revenue recovered
- [ ] Opt-out tersedia untuk pembeli

---

### 3.5 FITUR: BNPL / Pay Later (C3)

**Deskripsi:**  
Integrasi dengan penyedia BNPL Indonesia (Kredivo, Akulaku, GoPay Later, ShopeePayLater-style) untuk cicilan tanpa kartu kredit.

**User Stories:**
- Sebagai pembeli, saya ingin bisa mencicil pembelian tanpa kartu kredit
- Sebagai toko, saya ingin menerima pembayaran penuh meski pembeli cicil

**Acceptance Criteria:**
- [ ] Minimum 2 BNPL provider terintegrasi (Kredivo, Akulaku)
- [ ] Toko bisa enable/disable BNPL per toko
- [ ] Admin bisa enable/disable BNPL per plan
- [ ] Toko menerima dana penuh (BNPL provider yang menanggung risiko)
- [ ] Pembeli lihat cicilan: "3× Rp100.000/bulan"
- [ ] Limit cicilan berdasarkan limit user di BNPL provider

---

### 3.6 FITUR: Live Streaming Commerce (C16)

**Deskripsi:**  
Toko bisa siaran langsung (live stream) dan pembeli langsung bisa membeli produk yang ditampilkan selama siaran.

**User Stories:**
- Sebagai toko, saya ingin live stream produk dan pembeli langsung bisa beli
- Sebagai pembeli, saya ingin tonton live stream dan langsung tambah ke keranjang
- Sebagai admin, saya ingin memonitor dan moderasi live stream aktif

**Acceptance Criteria:**
- [ ] Toko schedule live stream (ada halaman countdown)
- [ ] Selama live: pin produk → muncul tombol "Beli Sekarang" untuk penonton
- [ ] Live chat dengan moderasi (hapus pesan, ban user)
- [ ] Recording otomatis tersimpan 7 hari
- [ ] Notif ke semua follower toko saat live dimulai
- [ ] Viewer count realtime
- [ ] Admin bisa suspend live stream yang melanggar

---

### 3.7 FITUR: AI Recommendation Engine (C9)

**Deskripsi:**  
Sistem rekomendasi berbasis machine learning yang mempersonalisasi tampilan produk untuk setiap pembeli.

**User Stories:**
- Sebagai pembeli, saya ingin melihat produk yang relevan dengan seleraku
- Sebagai toko, saya ingin produkku direkomendasikan ke pembeli yang tepat

**Acceptance Criteria:**
- [ ] "Untukmu" section di beranda berdasarkan riwayat browse & beli
- [ ] "Sering dibeli bersama" di halaman produk
- [ ] "Pembeli lain juga beli" di checkout
- [ ] Cold-start handling untuk user baru (berbasis tren & lokasi)
- [ ] A/B testing support
- [ ] CTR & conversion tracking per recommendation

---

### 3.8 FITUR: Price Drop Alert (C2)

**Deskripsi:**  
Pembeli bisa set alert harga untuk produk yang masuk wishlist. Notif otomatis ketika harga turun.

**Acceptance Criteria:**
- [ ] Tombol "Beri tahu saya jika harga turun" di setiap produk
- [ ] Pembeli set target harga (opsional)
- [ ] Notif push + email ketika harga drop ≥ 5%
- [ ] Wishlist otomatis ter-highlight produk yang harganya turun
- [ ] Toko melihat berapa orang menunggu price drop (motivasi buat promo)

---

### 3.9 FITUR: Return & Refund Self-Service (C19)

**Deskripsi:**  
Pembeli bisa ajukan pengembalian barang secara mandiri tanpa perlu chat penjual, dengan foto bukti dan alasan terstandar.

**Acceptance Criteria:**
- [ ] Tombol "Ajukan Retur" di detail pesanan (dalam 7 hari setelah terima)
- [ ] Upload foto barang yang bermasalah (wajib min 1 foto)
- [ ] Pilih alasan: barang cacat, salah kirim, tidak sesuai foto, dsb
- [ ] Auto-approve jika alasan & foto jelas (AI moderation)
- [ ] Manual review untuk kasus borderline
- [ ] Toko notif real-time, punya 24 jam untuk respons
- [ ] Jika tidak respons → admin auto-decide
- [ ] Refund: saldo wallet atau ke rekening (3-5 hari kerja)

---

### 3.10 FITUR: Platform Merchant Tier Program (A14)

**Deskripsi:**  
Sistem tingkatan merchant berdasarkan performa: penjualan, rating, komplain, kecepatan respons. Badge terlihat di semua halaman toko.

**Tier:**
- 🌱 **Starter** — Baru bergabung, verifikasi dasar
- ⭐ **Verified** — KYC lulus, rating ≥ 4.0, aktif > 30 hari
- 🏆 **Top Seller** — Rating ≥ 4.5, ≥ 100 pesanan/bulan, response rate ≥ 90%
- 💎 **Elite Seller** — Rating ≥ 4.8, ≥ 500 pesanan/bulan, komplain < 1%

**Benefit per Tier:**
| Tier | Komisi | Posisi Iklan | Fitur Ekstra |
|------|--------|--------------|--------------|
| Starter | 5% | Normal | Dasar |
| Verified | 4.5% | +10% visibility | Badge |
| Top Seller | 4% | +25% visibility | Prioritas support |
| Elite Seller | 3% | Homepage feature | Dedicated AM |

---

## BAGIAN 4: SQL MIGRATION LIST LENGKAP

### 4.1 Core Tables (Existing — Perlu Verifikasi)

Tabel-tabel berikut diasumsikan sudah ada di Supabase dan perlu dimigrasi ke PostgreSQL Replit:

```sql
-- IDENTITAS & AKSES
profiles
user_roles
staff_permissions
staff_invitations

-- TOKO & OUTLET
coffee_shops
outlets
business_categories

-- PRODUK & MENU
categories
menu_items
menu_item_variants
menu_item_options
bundle_items
menu_item_modifiers

-- PESANAN & TRANSAKSI
orders
order_items
order_messages
order_status_logs
open_bills

-- KEUANGAN PLATFORM
shop_wallets
wallet_transactions
withdrawal_requests
plan_invoices
plans
plan_features
features
payment_transactions
webhook_logs
escrow_releases

-- INVENTARIS
ingredients
stock_movements
stock_opnames
recipes
suppliers
purchase_orders
purchase_order_items

-- LOGISTIK
couriers
delivery_settings
delivery_zones
shipping_rates
customer_addresses

-- ENGAGEMENT & LOYALTI
loyalty_settings
loyalty_points
loyalty_transactions
promos
vouchers

-- ULASAN & QA
product_reviews
product_qa
shop_follows
wishlists

-- CHAT & NOTIFIKASI
shop_chats
shop_chat_messages
notifications
order_disputes
refunds

-- MARKETING
marketing_campaigns
ads
banners
email_marketing_sends

-- SISTEM
platform_settings
system_audit
cron_runs
shop_backups
referral_codes
referrals
flash_sale_schedules
shop_bank_accounts
menu_item_variants
```

### 4.2 NEW TABLES — Fase 7 (Group Buy)

```sql
-- ============================================================
-- FASE 7-1: Group Buy / Patungan
-- ============================================================

CREATE TABLE IF NOT EXISTS group_buys (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           uuid        NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  product_id        uuid        NOT NULL REFERENCES menu_items(id)   ON DELETE CASCADE,
  creator_user_id   uuid        NOT NULL REFERENCES auth.users(id),
  title             text        NOT NULL,
  group_price       numeric(12,2) NOT NULL,
  original_price    numeric(12,2) NOT NULL,
  min_participants  integer     NOT NULL DEFAULT 2,
  max_participants  integer,
  current_count     integer     NOT NULL DEFAULT 0,
  status            text        NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open','fulfilled','expired','cancelled')),
  deadline_at       timestamptz NOT NULL,
  fulfilled_at      timestamptz,
  share_code        text        UNIQUE NOT NULL,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_buys_shop      ON group_buys(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_group_buys_product   ON group_buys(product_id);
CREATE INDEX IF NOT EXISTS idx_group_buys_share     ON group_buys(share_code);
CREATE INDEX IF NOT EXISTS idx_group_buys_deadline  ON group_buys(deadline_at) WHERE status = 'open';

ALTER TABLE group_buys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_open_group_buys" ON group_buys
  FOR SELECT USING (status = 'open');

CREATE POLICY "creator_manage" ON group_buys
  FOR ALL USING (creator_user_id = auth.uid());

CREATE POLICY "shop_owner_manage" ON group_buys
  FOR ALL USING (shop_id IN (SELECT id FROM coffee_shops WHERE owner_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_buy_participants (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_buy_id    uuid        NOT NULL REFERENCES group_buys(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id),
  quantity        integer     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','paid','cancelled','refunded')),
  order_id        uuid        REFERENCES orders(id),
  joined_at       timestamptz NOT NULL DEFAULT now(),
  paid_at         timestamptz,
  UNIQUE (group_buy_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_gbp_group  ON group_buy_participants(group_buy_id);
CREATE INDEX IF NOT EXISTS idx_gbp_user   ON group_buy_participants(user_id);

ALTER TABLE group_buy_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_participation" ON group_buy_participants
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "public_count_participants" ON group_buy_participants
  FOR SELECT USING (true);

-- Auto update current_count
CREATE OR REPLACE FUNCTION fn_update_group_buy_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE group_buys
  SET current_count = (
    SELECT COUNT(*) FROM group_buy_participants
    WHERE group_buy_id = COALESCE(NEW.group_buy_id, OLD.group_buy_id)
      AND status IN ('pending','paid')
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.group_buy_id, OLD.group_buy_id);

  -- Auto-fulfill if min reached
  UPDATE group_buys
  SET status = 'fulfilled', fulfilled_at = now()
  WHERE id = COALESCE(NEW.group_buy_id, OLD.group_buy_id)
    AND status = 'open'
    AND current_count >= min_participants
    AND deadline_at > now();

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_group_buy_count ON group_buy_participants;
CREATE TRIGGER trg_group_buy_count
  AFTER INSERT OR UPDATE OF status OR DELETE ON group_buy_participants
  FOR EACH ROW EXECUTE FUNCTION fn_update_group_buy_count();
```

### 4.3 NEW TABLES — Fase 7 (Abandoned Cart Recovery)

```sql
-- ============================================================
-- FASE 7-2: Abandoned Cart Recovery
-- ============================================================

CREATE TABLE IF NOT EXISTS cart_sessions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token   text,
  shop_id         uuid        REFERENCES coffee_shops(id) ON DELETE CASCADE,
  items           jsonb       NOT NULL DEFAULT '[]',
  total_amount    numeric(12,2) NOT NULL DEFAULT 0,
  last_activity   timestamptz NOT NULL DEFAULT now(),
  checkout_at     timestamptz,
  recovery_sent_at timestamptz,
  recovery_count  integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_sessions_user      ON cart_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_sessions_shop      ON cart_sessions(shop_id);
CREATE INDEX IF NOT EXISTS idx_cart_sessions_abandoned ON cart_sessions(last_activity)
  WHERE checkout_at IS NULL AND recovery_count < 2;

ALTER TABLE cart_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_cart" ON cart_sessions
  FOR ALL USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_recovery_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id       uuid        NOT NULL REFERENCES cart_sessions(id) ON DELETE CASCADE,
  channel       text        NOT NULL CHECK (channel IN ('push','email','whatsapp')),
  voucher_code  text,
  opened_at     timestamptz,
  converted_at  timestamptz,
  sent_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crl_cart ON cart_recovery_logs(cart_id);
```

### 4.4 NEW TABLES — Fase 7 (Price Drop Alert)

```sql
-- ============================================================
-- FASE 7-3: Price Drop Alerts
-- ============================================================

CREATE TABLE IF NOT EXISTS price_alerts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id    uuid        NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  target_price  numeric(12,2),
  last_seen_price numeric(12,2) NOT NULL,
  is_active     boolean     NOT NULL DEFAULT true,
  notified_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_product ON price_alerts(product_id, is_active);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user    ON price_alerts(user_id);

ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_alerts" ON price_alerts
  FOR ALL USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- Tambah tabel price_history untuk grafik histori harga
CREATE TABLE IF NOT EXISTS product_price_history (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid        NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  shop_id     uuid        NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  price       numeric(12,2) NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pph_product ON product_price_history(product_id, recorded_at DESC);

-- Trigger: catat histori harga setiap kali price berubah
CREATE OR REPLACE FUNCTION fn_track_price_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price THEN
    INSERT INTO product_price_history (product_id, shop_id, price)
    VALUES (NEW.id, NEW.shop_id, NEW.price);

    -- Check & notify price alerts
    UPDATE price_alerts
    SET notified_at = now()
    WHERE product_id = NEW.id
      AND is_active = true
      AND (target_price IS NULL OR NEW.price <= target_price)
      AND NEW.price < last_seen_price * 0.95; -- minimal 5% turun
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_price_change ON menu_items;
CREATE TRIGGER trg_price_change
  AFTER UPDATE OF price ON menu_items
  FOR EACH ROW EXECUTE FUNCTION fn_track_price_change();
```

### 4.5 NEW TABLES — Fase 7 (Return & Refund Self-Service)

```sql
-- ============================================================
-- FASE 7-4: Return & Refund Self-Service
-- ============================================================

CREATE TABLE IF NOT EXISTS return_requests (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid        NOT NULL REFERENCES orders(id),
  shop_id             uuid        NOT NULL REFERENCES coffee_shops(id),
  buyer_user_id       uuid        NOT NULL REFERENCES auth.users(id),
  reason_code         text        NOT NULL CHECK (reason_code IN (
                        'defective','wrong_item','not_as_described',
                        'missing_item','damaged_packaging','change_of_mind','other'
                      )),
  reason_detail       text,
  evidence_urls       text[]      NOT NULL DEFAULT '{}',
  items               jsonb       NOT NULL DEFAULT '[]',
  refund_amount       numeric(12,2) NOT NULL,
  refund_method       text        NOT NULL DEFAULT 'wallet'
                                  CHECK (refund_method IN ('wallet','bank_transfer','original_payment')),
  status              text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN (
                                    'pending','seller_reviewing','approved',
                                    'rejected','escalated','resolved','completed'
                                  )),
  seller_response     text,
  seller_responded_at timestamptz,
  admin_note          text,
  admin_resolved_by   uuid        REFERENCES auth.users(id),
  admin_resolved_at   timestamptz,
  auto_approved       boolean     NOT NULL DEFAULT false,
  return_deadline_at  timestamptz,
  completed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rr_order    ON return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_rr_shop     ON return_requests(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_rr_buyer    ON return_requests(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_rr_pending  ON return_requests(seller_responded_at)
  WHERE status = 'seller_reviewing';

ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_own_returns" ON return_requests
  FOR SELECT USING (buyer_user_id = auth.uid());

CREATE POLICY "buyer_create" ON return_requests
  FOR INSERT TO authenticated
  WITH CHECK (buyer_user_id = auth.uid());

CREATE POLICY "seller_manage_own" ON return_requests
  FOR ALL USING (shop_id IN (SELECT id FROM coffee_shops WHERE owner_id = auth.uid()));

CREATE POLICY "admin_all_returns" ON return_requests
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')
  ));
```

### 4.6 NEW TABLES — Fase 7 (Live Streaming)

```sql
-- ============================================================
-- FASE 7-5: Live Streaming Commerce
-- ============================================================

CREATE TABLE IF NOT EXISTS live_streams (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           uuid        NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  host_user_id      uuid        NOT NULL REFERENCES auth.users(id),
  title             text        NOT NULL,
  description       text,
  thumbnail_url     text,
  stream_key        text        UNIQUE,
  playback_url      text,
  recording_url     text,
  status            text        NOT NULL DEFAULT 'scheduled'
                                CHECK (status IN ('scheduled','live','ended','cancelled')),
  scheduled_at      timestamptz,
  started_at        timestamptz,
  ended_at          timestamptz,
  peak_viewers      integer     NOT NULL DEFAULT 0,
  total_orders      integer     NOT NULL DEFAULT 0,
  total_revenue     numeric(14,2) NOT NULL DEFAULT 0,
  is_recorded       boolean     NOT NULL DEFAULT true,
  recording_expires_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_streams_shop   ON live_streams(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_streams_live   ON live_streams(status, started_at DESC);

ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_live"  ON live_streams FOR SELECT USING (status IN ('live','ended'));
CREATE POLICY "shop_owner_manage" ON live_streams FOR ALL USING (
  shop_id IN (SELECT id FROM coffee_shops WHERE owner_id = auth.uid())
);

-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_stream_products (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id   uuid    NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  product_id  uuid    NOT NULL REFERENCES menu_items(id),
  is_pinned   boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  pinned_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_lsp_stream ON live_stream_products(stream_id, is_pinned);

-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_stream_chat (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id   uuid        NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name text,
  message     text        NOT NULL CHECK (trim(message) <> ''),
  is_hidden   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lsc_stream ON live_stream_chat(stream_id, created_at);

-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_stream_viewers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id   uuid        NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id     uuid        REFERENCES auth.users(id),
  session_token text,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  left_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_lsv_stream ON live_stream_viewers(stream_id, left_at)
  WHERE left_at IS NULL;
```

### 4.7 NEW TABLES — Fase 7 (Merchant Tier Program)

```sql
-- ============================================================
-- FASE 7-6: Merchant Tier Program
-- ============================================================

CREATE TABLE IF NOT EXISTS merchant_tiers (
  id              uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text      UNIQUE NOT NULL,
  name            text      NOT NULL,
  min_orders_month integer  NOT NULL DEFAULT 0,
  min_rating      numeric(3,2) NOT NULL DEFAULT 0,
  max_complaint_rate numeric(5,4) NOT NULL DEFAULT 1.0,
  min_response_rate  numeric(5,4) NOT NULL DEFAULT 0,
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.05,
  visibility_boost integer  NOT NULL DEFAULT 0,
  badge_icon      text,
  badge_color     text,
  sort_order      integer   NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO merchant_tiers (code, name, min_orders_month, min_rating, max_complaint_rate, min_response_rate, commission_rate, visibility_boost, badge_icon, badge_color, sort_order)
VALUES
  ('starter',    'Starter',    0,   0.0, 1.0,  0.0,  0.050, 0,  '🌱', '#6b7280', 1),
  ('verified',   'Verified',   0,   4.0, 0.10, 0.80, 0.045, 10, '⭐', '#3b82f6', 2),
  ('top_seller', 'Top Seller', 100, 4.5, 0.05, 0.90, 0.040, 25, '🏆', '#f59e0b', 3),
  ('elite',      'Elite',      500, 4.8, 0.01, 0.95, 0.030, 50, '💎', '#8b5cf6', 4)
ON CONFLICT (code) DO NOTHING;

-- Tambah kolom tier ke coffee_shops
ALTER TABLE coffee_shops
  ADD COLUMN IF NOT EXISTS merchant_tier    text NOT NULL DEFAULT 'starter'
                                            REFERENCES merchant_tiers(code),
  ADD COLUMN IF NOT EXISTS tier_computed_at timestamptz,
  ADD COLUMN IF NOT EXISTS tier_orders_30d  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier_rating      numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier_response_rate numeric(5,4) NOT NULL DEFAULT 1.0;

CREATE INDEX IF NOT EXISTS idx_shops_tier ON coffee_shops(merchant_tier);

-- Function: compute merchant tier
CREATE OR REPLACE FUNCTION compute_merchant_tier(p_shop_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_orders_30d    integer;
  v_avg_rating    numeric;
  v_complaint_rt  numeric;
  v_response_rt   numeric;
  v_tier          text := 'starter';
BEGIN
  -- Orders last 30 days
  SELECT COUNT(*) INTO v_orders_30d
  FROM orders
  WHERE shop_id = p_shop_id AND status = 'completed'
    AND created_at >= now() - INTERVAL '30 days';

  -- Average rating
  SELECT COALESCE(AVG(rating), 0) INTO v_avg_rating
  FROM product_reviews WHERE shop_id = p_shop_id AND is_hidden = false;

  -- Complaint rate (disputes / total orders)
  SELECT COALESCE(
    (SELECT COUNT(*)::numeric FROM order_disputes WHERE shop_id = p_shop_id AND created_at >= now() - INTERVAL '30 days')
    / NULLIF(v_orders_30d::numeric, 0),
    0
  ) INTO v_complaint_rt;

  -- Response rate (orders responded within 24h)
  v_response_rt := 1.0; -- TODO: implement proper response tracking

  -- Determine tier
  SELECT code INTO v_tier
  FROM merchant_tiers
  WHERE v_orders_30d >= min_orders_month
    AND v_avg_rating  >= min_rating
    AND v_complaint_rt <= max_complaint_rate
    AND v_response_rt  >= min_response_rate
  ORDER BY sort_order DESC
  LIMIT 1;

  UPDATE coffee_shops
  SET merchant_tier      = COALESCE(v_tier, 'starter'),
      tier_computed_at   = now(),
      tier_orders_30d    = v_orders_30d,
      tier_rating        = v_avg_rating,
      tier_response_rate = v_response_rt
  WHERE id = p_shop_id;

  RETURN COALESCE(v_tier, 'starter');
END;
$$;
```

### 4.8 NEW TABLES — Fase 7 (Subscription Orders)

```sql
-- ============================================================
-- FASE 7-7: Subscription / Recurring Orders
-- ============================================================

CREATE TABLE IF NOT EXISTS product_subscriptions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id           uuid        NOT NULL REFERENCES coffee_shops(id),
  product_id        uuid        NOT NULL REFERENCES menu_items(id),
  quantity          integer     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  frequency         text        NOT NULL CHECK (frequency IN ('daily','weekly','biweekly','monthly')),
  next_order_at     date        NOT NULL,
  address_id        uuid        REFERENCES customer_addresses(id),
  payment_method    text,
  status            text        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','paused','cancelled')),
  total_cycles      integer,
  completed_cycles  integer     NOT NULL DEFAULT 0,
  last_order_id     uuid        REFERENCES orders(id),
  notes             text,
  pause_until       date,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subs_user    ON product_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_shop    ON product_subscriptions(shop_id);
CREATE INDEX IF NOT EXISTS idx_subs_next    ON product_subscriptions(next_order_at, status)
  WHERE status = 'active';

ALTER TABLE product_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_subscriptions" ON product_subscriptions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "shop_owner_view" ON product_subscriptions
  FOR SELECT USING (shop_id IN (SELECT id FROM coffee_shops WHERE owner_id = auth.uid()));
```

### 4.9 NEW TABLES — Fase 7 (Customer Segmentation)

```sql
-- ============================================================
-- FASE 7-8: Customer Segmentation (RFM-based)
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_segments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         uuid        NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id),
  segment         text        NOT NULL CHECK (segment IN (
                    'vip','loyal','at_risk','hibernating','new',
                    'potential','lost','one_time'
                  )),
  rfm_recency     integer     NOT NULL DEFAULT 0,
  rfm_frequency   integer     NOT NULL DEFAULT 0,
  rfm_monetary    numeric(14,2) NOT NULL DEFAULT 0,
  total_orders    integer     NOT NULL DEFAULT 0,
  total_spent     numeric(14,2) NOT NULL DEFAULT 0,
  last_order_at   timestamptz,
  first_order_at  timestamptz,
  computed_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cs_shop    ON customer_segments(shop_id, segment);
CREATE INDEX IF NOT EXISTS idx_cs_user    ON customer_segments(user_id);

ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_owner_read" ON customer_segments
  FOR SELECT USING (shop_id IN (SELECT id FROM coffee_shops WHERE owner_id = auth.uid()));

-- Function: recompute segments untuk satu toko
CREATE OR REPLACE FUNCTION fn_recompute_customer_segments(p_shop_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO customer_segments (shop_id, user_id, segment, rfm_recency, rfm_frequency, rfm_monetary, total_orders, total_spent, last_order_at, first_order_at)
  SELECT
    p_shop_id,
    o.customer_user_id,
    CASE
      WHEN days_since_last <= 30  AND freq >= 5  AND total >= 500000  THEN 'vip'
      WHEN days_since_last <= 60  AND freq >= 3                       THEN 'loyal'
      WHEN days_since_last <= 90  AND freq >= 2                       THEN 'at_risk'
      WHEN days_since_last > 180                                      THEN 'hibernating'
      WHEN first_days <= 30       AND freq = 1                        THEN 'new'
      WHEN freq = 1               AND days_since_last > 30            THEN 'one_time'
      ELSE 'potential'
    END,
    days_since_last::integer,
    freq::integer,
    total,
    freq::integer,
    total,
    last_order,
    first_order
  FROM (
    SELECT
      customer_user_id,
      COUNT(*)                                      AS freq,
      SUM(total)                                    AS total,
      MAX(created_at)                               AS last_order,
      MIN(created_at)                               AS first_order,
      EXTRACT(DAY FROM now() - MAX(created_at))     AS days_since_last,
      EXTRACT(DAY FROM MAX(created_at) - MIN(created_at)) AS first_days
    FROM orders
    WHERE shop_id = p_shop_id AND status = 'completed'
      AND customer_user_id IS NOT NULL
    GROUP BY customer_user_id
  ) o
  ON CONFLICT (shop_id, user_id)
  DO UPDATE SET
    segment      = EXCLUDED.segment,
    rfm_recency  = EXCLUDED.rfm_recency,
    rfm_frequency= EXCLUDED.rfm_frequency,
    rfm_monetary = EXCLUDED.rfm_monetary,
    total_orders = EXCLUDED.total_orders,
    total_spent  = EXCLUDED.total_spent,
    last_order_at  = EXCLUDED.last_order_at,
    first_order_at = EXCLUDED.first_order_at,
    computed_at  = now();
END;
$$;
```

### 4.10 NEW TABLES — Fase 7 (Affiliate Program)

```sql
-- ============================================================
-- FASE 7-9: Affiliate Program
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_programs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         uuid        REFERENCES coffee_shops(id) ON DELETE CASCADE,
  -- NULL shop_id = platform-wide affiliate
  name            text        NOT NULL,
  commission_type text        NOT NULL DEFAULT 'percent' CHECK (commission_type IN ('percent','flat')),
  commission_value numeric(10,4) NOT NULL,
  cookie_days     integer     NOT NULL DEFAULT 30,
  min_payout      numeric(12,2) NOT NULL DEFAULT 50000,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS affiliates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id      uuid        NOT NULL REFERENCES affiliate_programs(id),
  referral_code   text        UNIQUE NOT NULL,
  status          text        NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  total_clicks    integer     NOT NULL DEFAULT 0,
  total_conversions integer   NOT NULL DEFAULT 0,
  total_earned    numeric(14,2) NOT NULL DEFAULT 0,
  balance         numeric(14,2) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_id)
);

CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    uuid        NOT NULL REFERENCES affiliates(id),
  order_id        uuid        NOT NULL REFERENCES orders(id),
  amount          numeric(12,2) NOT NULL,
  commission      numeric(12,2) NOT NULL,
  status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aff_user     ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_aff_code     ON affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_aff_conv_aff ON affiliate_conversions(affiliate_id, status);
```

### 4.11 NEW TABLES — Fase 7 (BNPL)

```sql
-- ============================================================
-- FASE 7-10: BNPL / Pay Later Integration
-- ============================================================

CREATE TABLE IF NOT EXISTS bnpl_providers (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text    UNIQUE NOT NULL,
  name            text    NOT NULL,
  logo_url        text,
  min_amount      numeric(12,2) NOT NULL DEFAULT 0,
  max_amount      numeric(12,2),
  is_active       boolean NOT NULL DEFAULT false,
  config          jsonb   NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO bnpl_providers (code, name, min_amount, max_amount)
VALUES
  ('kredivo', 'Kredivo', 150000, 30000000),
  ('akulaku', 'Akulaku', 100000, 20000000),
  ('gopay_later', 'GoPay Later', 50000, 10000000),
  ('spaylater', 'SPayLater', 50000, 10000000)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS bnpl_transactions (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid    NOT NULL REFERENCES orders(id),
  provider_code       text    NOT NULL REFERENCES bnpl_providers(code),
  provider_txn_id     text,
  amount              numeric(12,2) NOT NULL,
  installments        integer,
  installment_amount  numeric(12,2),
  status              text    NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','approved','rejected','disbursed','defaulted')),
  applied_at          timestamptz,
  approved_at         timestamptz,
  disbursed_at        timestamptz,
  provider_response   jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bnpl_order    ON bnpl_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_bnpl_provider ON bnpl_transactions(provider_code, status);
```

### 4.12 NEW COLUMNS (ALTER TABLE) — Fase 7

```sql
-- ============================================================
-- FASE 7-11: Kolom Tambahan di Tabel Existing
-- ============================================================

-- Gift ordering support
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_gift          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_recipient   text,
  ADD COLUMN IF NOT EXISTS gift_message     text,
  ADD COLUMN IF NOT EXISTS gift_wrap        boolean NOT NULL DEFAULT false;

-- Subscription link
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS subscription_id  uuid REFERENCES product_subscriptions(id);

-- BNPL payment method
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS bnpl_provider    text REFERENCES bnpl_providers(code),
  ADD COLUMN IF NOT EXISTS group_buy_id     uuid REFERENCES group_buys(id);

-- Live stream purchase attribution
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS live_stream_id   uuid REFERENCES live_streams(id);

-- Affiliate tracking
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS affiliate_code   text,
  ADD COLUMN IF NOT EXISTS affiliate_id     uuid REFERENCES affiliates(id);

-- Toko: WhatsApp Business
ALTER TABLE coffee_shops
  ADD COLUMN IF NOT EXISTS wa_business_phone  text,
  ADD COLUMN IF NOT EXISTS wa_business_token  text,
  ADD COLUMN IF NOT EXISTS wa_notif_order     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wa_broadcast_enabled boolean NOT NULL DEFAULT false;

-- Toko: Subscription enable
ALTER TABLE coffee_shops
  ADD COLUMN IF NOT EXISTS subscription_enabled boolean NOT NULL DEFAULT false;

-- Toko: Live streaming enable
ALTER TABLE coffee_shops
  ADD COLUMN IF NOT EXISTS livestream_enabled boolean NOT NULL DEFAULT false;

-- Toko: BNPL enable
ALTER TABLE coffee_shops
  ADD COLUMN IF NOT EXISTS bnpl_enabled     boolean NOT NULL DEFAULT false;

-- Menu items: subscription + group buy
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS subscription_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_buy_enabled     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_buy_min_qty     integer,
  ADD COLUMN IF NOT EXISTS group_buy_price       numeric(12,2),
  ADD COLUMN IF NOT EXISTS video_url             text;

-- Notifications: dedupe key (if not exists)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS shop_id    uuid REFERENCES coffee_shops(id),
  ADD COLUMN IF NOT EXISTS dedupe_key text;

-- Unique constraint on dedupe_key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_dedupe_key_key'
  ) THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_dedupe_key_key UNIQUE (dedupe_key);
  END IF;
END $$;
```

### 4.13 NEW TABLES — Fase 7 (Abandoned Cart & WhatsApp Templates)

```sql
-- ============================================================
-- FASE 7-12: WhatsApp Templates & Broadcast
-- ============================================================

CREATE TABLE IF NOT EXISTS wa_templates (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text    UNIQUE NOT NULL,
  name          text    NOT NULL,
  body          text    NOT NULL,
  variables     text[]  NOT NULL DEFAULT '{}',
  category      text    NOT NULL DEFAULT 'utility',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO wa_templates (code, name, body, variables, category) VALUES
  ('order_confirmed',   'Order Dikonfirmasi',  'Halo {{name}}! Pesanan #{{order_no}} dari {{shop_name}} sudah dikonfirmasi. Total: Rp {{total}}. Pantau status: {{link}}', ARRAY['name','order_no','shop_name','total','link'], 'utility'),
  ('order_shipped',     'Pesanan Dikirim',     'Pesanan #{{order_no}} sudah dikirim! Kurir: {{courier}}, No. Resi: {{tracking_no}}. Estimasi tiba: {{eta}}', ARRAY['order_no','courier','tracking_no','eta'], 'utility'),
  ('order_delivered',   'Pesanan Diterima',    'Pesanan #{{order_no}} telah sampai. Puas? Beri ulasan di: {{review_link}}. Terima kasih sudah belanja di {{shop_name}}! 🙏', ARRAY['order_no','review_link','shop_name'], 'utility'),
  ('cart_recovery',     'Keranjang Menunggu',  'Halo {{name}}! Kamu punya {{item_count}} produk di keranjang senilai Rp {{total}}. Selesaikan belanjamu: {{cart_link}}. Gunakan kode {{voucher}} untuk diskon {{discount}}!', ARRAY['name','item_count','total','cart_link','voucher','discount'], 'marketing'),
  ('promo_broadcast',   'Promo Baru!',         '🎉 Promo spesial dari {{shop_name}}! {{promo_desc}}. Berlaku hingga {{valid_until}}. Kode: {{code}}. Belanja sekarang: {{link}}', ARRAY['shop_name','promo_desc','valid_until','code','link'], 'marketing')
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_broadcast_jobs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         uuid        NOT NULL REFERENCES coffee_shops(id),
  template_code   text        NOT NULL REFERENCES wa_templates(code),
  segment         text        NOT NULL DEFAULT 'all',
  target_count    integer     NOT NULL DEFAULT 0,
  sent_count      integer     NOT NULL DEFAULT 0,
  delivered_count integer     NOT NULL DEFAULT 0,
  failed_count    integer     NOT NULL DEFAULT 0,
  status          text        NOT NULL DEFAULT 'queued'
                              CHECK (status IN ('queued','running','done','failed')),
  scheduled_at    timestamptz NOT NULL DEFAULT now(),
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

### 4.14 NEW TABLES — Fase 7 (Platform Voucher & Cashback)

```sql
-- ============================================================
-- FASE 7-13: Platform Voucher & Cashback Wallet
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_vouchers (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text        UNIQUE NOT NULL,
  name                text        NOT NULL,
  description         text,
  type                text        NOT NULL DEFAULT 'discount'
                                  CHECK (type IN ('discount','cashback','free_ongkir','bonus_points')),
  discount_type       text        CHECK (discount_type IN ('percent','flat')),
  discount_value      numeric(12,2),
  cashback_percent    numeric(5,2),
  cashback_max        numeric(12,2),
  min_purchase        numeric(12,2) NOT NULL DEFAULT 0,
  max_uses            integer,
  max_uses_per_user   integer     NOT NULL DEFAULT 1,
  used_count          integer     NOT NULL DEFAULT 0,
  is_active           boolean     NOT NULL DEFAULT true,
  valid_from          timestamptz NOT NULL DEFAULT now(),
  valid_until         timestamptz,
  category_id         uuid        REFERENCES categories(id),
  new_user_only       boolean     NOT NULL DEFAULT false,
  created_by          uuid        REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pv_code    ON platform_vouchers(code, is_active);
CREATE INDEX IF NOT EXISTS idx_pv_dates   ON platform_vouchers(valid_from, valid_until) WHERE is_active;

CREATE TABLE IF NOT EXISTS platform_voucher_uses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id  uuid NOT NULL REFERENCES platform_vouchers(id),
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  order_id    uuid REFERENCES orders(id),
  amount_saved numeric(12,2) NOT NULL,
  used_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (voucher_id, user_id, order_id)
);

-- ─────────────────────────────────────────────────────────────────────
-- Cashback Wallet (platform-level, bukan per toko)
CREATE TABLE IF NOT EXISTS cashback_wallets (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid    UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance     numeric(14,2) NOT NULL DEFAULT 0,
  total_earned numeric(14,2) NOT NULL DEFAULT 0,
  total_used  numeric(14,2) NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cashback_transactions (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id   uuid    NOT NULL REFERENCES cashback_wallets(id),
  type        text    NOT NULL CHECK (type IN ('earn','use','expire','adjustment')),
  amount      numeric(12,2) NOT NULL,
  order_id    uuid    REFERENCES orders(id),
  note        text,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cb_wallet  ON cashback_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_cbt_wallet ON cashback_transactions(wallet_id, created_at DESC);
```

### 4.15 NEW TABLES — Fase 7 (AI Recommendations)

```sql
-- ============================================================
-- FASE 7-14: AI Recommendation Engine
-- ============================================================

CREATE TABLE IF NOT EXISTS user_behavior_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id  text,
  event_type  text        NOT NULL CHECK (event_type IN (
                'view','click','add_cart','purchase','wishlist','search','share'
              )),
  product_id  uuid        REFERENCES menu_items(id) ON DELETE SET NULL,
  shop_id     uuid        REFERENCES coffee_shops(id) ON DELETE SET NULL,
  category_id uuid        REFERENCES categories(id) ON DELETE SET NULL,
  search_query text,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ube_user    ON user_behavior_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ube_product ON user_behavior_events(product_id, event_type);
CREATE INDEX IF NOT EXISTS idx_ube_session ON user_behavior_events(session_id);

-- Partition by month for performance (optional advanced)
-- Retention: delete events older than 90 days via cron

-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_recommendations (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid    NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  recommended_id  uuid    NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  score           numeric(8,6) NOT NULL DEFAULT 0,
  reason          text    CHECK (reason IN ('co_purchase','co_view','same_category','trending','editorial')),
  computed_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, recommended_id)
);

CREATE INDEX IF NOT EXISTS idx_rec_product ON product_recommendations(product_id, score DESC);

-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_trending (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  scope       text    NOT NULL DEFAULT 'platform' CHECK (scope IN ('platform','category','city')),
  scope_id    uuid,
  product_id  uuid    REFERENCES menu_items(id) ON DELETE CASCADE,
  score       integer NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trending ON platform_trending(scope, computed_at DESC);
```

---

## BAGIAN 5: RENCANA BISNIS & MONETISASI

### 5.1 Model Pendapatan Platform (Revenue Streams)

#### Stream 1: Komisi Transaksi Marketplace (UTAMA)
| Merchant Tier | Komisi |
|---------------|--------|
| Starter | 5% per transaksi |
| Verified | 4.5% |
| Top Seller | 4.0% |
| Elite Seller | 3.0% |

**Target:** GMV Rp 1 Miliar/bulan → Pendapatan Rp 40-50 Juta/bulan

#### Stream 2: Langganan SaaS (POS + Marketplace)
| Plan | Harga/Bulan | Target Pasar |
|------|-------------|--------------|
| Free | Rp 0 | UMKM baru, coba-coba |
| Starter | Rp 99.000 | Warung, toko kecil |
| Pro | Rp 299.000 | Restoran, toko menengah |
| Enterprise | Custom | Franchise, chain besar |

**Fitur differentiasi per plan:**
- Free: POS basic, 1 outlet, 50 produk, marketplace listing
- Starter: 3 outlet, 200 produk, laporan dasar, loyalty
- Pro: Unlimited outlet & produk, AI tools, live stream, advanced analytics, custom domain, priority support
- Enterprise: White-label, API akses, dedicated AM, SLA 99.9%

**Target:** 1.000 toko berbayar → MRR Rp 200 Juta/bulan

#### Stream 3: Iklan (Ads)
- **Promoted Products** — Toko bayar agar produknya muncul di posisi teratas search
- **Banner Iklan** — Slot banner premium di homepage (Rp 5-50 juta/bulan)
- **Push Notification Blast** — Kirim notif promo ke semua user (Rp 2 juta/1000 user)
- **Category Sponsorship** — Exclusive sponsor per kategori

**Target:** Rp 50 Juta/bulan dari ads

#### Stream 4: Affiliate Network
- Komisi afiliator: 2-3% dari transaksi
- Platform ambil bagian: 20% dari komisi afiliator
- **Target:** 500 afiliator aktif → Rp 20 Juta/bulan

#### Stream 5: Payment Fee (Fintech)
- Biaya payment processing yang sudah dimasukkan ke komisi
- BNPL: provider bayar referral fee ke platform (0.5-1.5% per transaksi)
- Withdrawal fee: Rp 2.500-5.000 per penarikan

#### Stream 6: Premium Fitur Add-on
| Fitur | Harga |
|-------|-------|
| WhatsApp Business integration | Rp 99.000/bulan |
| Live Streaming | Rp 149.000/bulan |
| AI Tools bundle | Rp 199.000/bulan |
| Custom domain | Rp 50.000/tahun |
| Storefront pro themes | Rp 49.000-149.000 (one-time) |

---

### 5.2 Strategi Akuisisi Merchant

#### Phase 1 (0-6 bulan): Traction
- **Target:** 500 toko aktif
- Free plan + onboarding mudah (< 5 menit setup)
- Program "Buka Toko Gratis" dengan trial Pro 30 hari
- Partnership dengan komunitas UMKM (Kadin, komunitas kafe, dll)
- Referral toko: tiap toko yang diajak → gratis 1 bulan plan berbayar

#### Phase 2 (6-18 bulan): Growth
- **Target:** 5.000 toko aktif
- Sales team keliling kota-kota tier 2 (Bandung, Surabaya, Medan, dll)
- Partnership dengan distributor bahan baku (order dari platform)
- Content marketing: tutorial YouTube, TikTok "Cara digitalisasi toko"
- Program merchant tier sebagai motivasi upgrade

#### Phase 3 (18-36 bulan): Scale
- **Target:** 50.000 toko aktif
- Franchise model untuk reseller/agen di kabupaten
- API untuk integrasi dengan sistem existing toko besar
- Ekspansi regional: Malaysia, Filipina, Vietnam

---

### 5.3 Strategi Retensi Pembeli

#### Engagement Loop:
1. **Daily Check-in** — Pembeli buka app setiap hari untuk claim poin
2. **Flash Sale Harian** — Setiap hari ada 3 produk flash sale (08:00, 12:00, 19:00)
3. **Challenge & Mission** — "Beli 3 kali minggu ini → dapat badge + 500 poin"
4. **Social Proof** — Feed aktivitas teman ("Budi baru beli kopi di X")
5. **Live Stream** — Konten fresh setiap hari dari toko-toko aktif

#### Loyalty Ecosystem:
- Poin tidak hanya dari belanja, tapi juga dari: review, referral, share produk, check-in daily
- Poin bisa ditukar: diskon, ongkir gratis, produk gratis, donasi
- Tier membership berlaku lintas toko (bukan per toko)

---

### 5.4 Proyeksi Keuangan (12 Bulan)

| Bulan | Toko Aktif | GMV | MRR SaaS | MRR Ads | Total Rev |
|-------|-----------|-----|----------|---------|-----------|
| 1 | 100 | 50 Jt | 5 Jt | 0 | 7 Jt |
| 3 | 300 | 200 Jt | 15 Jt | 5 Jt | 28 Jt |
| 6 | 800 | 600 Jt | 50 Jt | 20 Jt | 100 Jt |
| 9 | 1.500 | 1,5 M | 120 Jt | 50 Jt | 240 Jt |
| 12 | 3.000 | 4 M | 250 Jt | 100 Jt | 560 Jt |

---

### 5.5 Key Metrics (KPIs) yang Harus Ditrack

#### Platform Health:
- **GMV** (Gross Merchandise Value) — Total nilai transaksi
- **TPV** (Total Payment Volume)
- **MAU** (Monthly Active Users) — Pembeli & Toko
- **MRR** (Monthly Recurring Revenue) — dari subscription
- **NPS** (Net Promoter Score)

#### Growth:
- **CAC** (Customer Acquisition Cost) — per toko & per pembeli
- **LTV** (Lifetime Value) — per toko & per pembeli
- **Churn Rate** — % toko yang tidak perpanjang langganan
- **Activation Rate** — % toko yang berhasil buat 1 pesanan dalam 7 hari

#### Engagement:
- **Repeat Purchase Rate** — Pembeli yang beli > 1 kali dalam 30 hari
- **Average Order Value** (AOV)
- **Cart Abandonment Rate**
- **Review Rate** — % pesanan yang diberi ulasan

---

## BAGIAN 6: ROADMAP DEVELOPMENT

### Q3 2025 (Juli - September) — "Foundation & Quick Wins"
**Theme: Stabilitas & Fitur Viral**
- [x] Stabilisasi platform & migration Replit *(sedang berjalan)*
- [ ] **C1** Group Buy / Patungan *(viral growth driver)*
- [ ] **C2** Price Drop Alert
- [ ] **B3** Abandoned Cart Recovery
- [ ] **C19** Return & Refund Self-Service
- [ ] **A14** Merchant Tier Program
- [ ] **C17** Cashback Wallet
- [ ] **A4** Platform Voucher Issuer

### Q4 2025 (Oktober - Desember) — "Revenue Acceleration"
**Theme: Monetisasi & AI**
- [ ] **C3** BNPL / Pay Later (Kredivo + Akulaku)
- [ ] **B1** AI Product Description Generator
- [ ] **C9** AI Recommendation Engine
- [ ] **B2** WhatsApp Business Integration
- [ ] **B7** Customer Segmentation (RFM)
- [ ] **C7** Gift / Hadiah Ordering
- [ ] **C5** Reorder One-Click
- [ ] **B5** Multi-Kurir Aggregator real-time
- [ ] **B11** Video Product Upload

### Q1 2026 (Januari - Maret) — "Engagement & Virality"
**Theme: Social Commerce**
- [ ] **C16** Live Streaming Commerce
- [ ] **C4** Social Shopping / Share Cart
- [ ] **B6** Dynamic Pricing
- [ ] **C10** AI Shopping Assistant
- [ ] **B4** Subscription / Recurring Orders
- [ ] **C11** Subscription Shopping (buyer side)
- [ ] **B8** Advanced Booking System
- [ ] **C8** Price History Chart
- [ ] **C6** Product Comparison
- [ ] **A5** Affiliate / Partner Management

### Q2 2026 (April - Juni) — "Scale & Expansion"
**Theme: Enterprise & Regional**
- [ ] **B9** Google Analytics / Meta Pixel
- [ ] **B10** Social Media Auto-Post
- [ ] **B16** Upselling & Cross-selling Engine
- [ ] **C14** 2-Way Rating (toko rate pembeli)
- [ ] **A1** AI Fraud Scoring Engine
- [ ] **A6** Tax & Invoice Management (e-Faktur)
- [ ] **A10** Merchant Onboarding Automation
- [ ] **B12** Digital Voucher Generator
- [ ] **B13** P&L Statement otomatis
- [ ] API publik untuk integrasi pihak ketiga

---

## BAGIAN 7: TECHNICAL REQUIREMENTS

### 7.1 Performance Targets
- **Page Load:** < 2 detik (LCP) untuk semua halaman utama
- **API Response:** < 200ms (P95) untuk GET, < 500ms untuk POST
- **Uptime:** 99.9% (max 43 menit downtime/bulan)
- **Realtime:** WebSocket latency < 100ms untuk chat & order tracking

### 7.2 Security Requirements
- Semua API key tidak boleh di client/browser (server-only)
- RLS (Row Level Security) aktif di semua tabel sensitif
- Webhook validation (signature check) untuk semua payment gateway
- Rate limiting: max 100 req/min per IP, 10 login attempts/15 min
- Data encryption at rest untuk dokumen KYC, rekening bank

### 7.3 Scalability
- Database connection pooling (PgBouncer)
- CDN untuk static assets & gambar produk
- Queue system untuk email/WA blast (tidak blocking)
- Cron jobs untuk: auto-cancel order expired, compute tier, cleanup events
- Horizontal scaling support di API server

---

*Dokumen ini adalah PRD hidup — update berkala setiap sprint.*
*Owner: Product Team | Last updated: Mei 2025*
