# PRD — KopiHub / UMKMgo
# Platform Marketplace & POS untuk UMKM Indonesia
**Versi:** 3.0 | **Diperbarui:** Mei 2026 | **Status:** Living Document

---

## PRINSIP UTAMA

> **Bangun fitur sederhana yang langsung terasa dampaknya.** Setiap fitur harus bisa dijelaskan dalam satu kalimat, bisa dibangun dalam < 2 hari, dan langsung meningkatkan salah satu dari tiga metrik inti: **Konversi**, **Retensi**, atau **Pendapatan Toko**.

---

## RINGKASAN EKSEKUTIF

UMKMgo adalah super-app untuk 65 juta UMKM Indonesia — menggabungkan POS kasir, marketplace multi-kategori, dan storefront builder dalam satu platform. Pembeli bisa belanja dari berbagai toko UMKM. Toko bisa kelola operasional sepenuhnya dari satu dashboard.

**Stack:** React 19 + Vite + TanStack Router · Supabase (auth, database, storage) · Express API · pnpm monorepo

---

## BAGIAN 1: SUDAH DIBANGUN ✅

### 1.1 Platform & Admin
| Fitur | Status |
|---|---|
| Dashboard Super Admin (GMV, MRR, pesanan, toko aktif) | ✅ |
| Manajemen KYC merchant | ✅ |
| Manajemen plan & billing | ✅ |
| Komisi per kategori | ✅ |
| Persetujuan penarikan dana | ✅ |
| Manajemen banner & iklan | ✅ |
| Dispute resolution | ✅ |
| Moderasi ulasan | ✅ |
| Broadcast notifikasi | ✅ |
| Feature flags | ✅ |
| Audit log | ✅ |
| **Platform Voucher** (admin buat kode diskon platform-wide) | ✅ |

### 1.2 Toko / Merchant
| Fitur | Status |
|---|---|
| POS terminal (kasir digital) | ✅ |
| Kitchen Display System (KDS) | ✅ |
| Manajemen menu, kategori, stok, bahan baku | ✅ |
| Bundle produk & resep | ✅ |
| Supplier & purchase order | ✅ |
| Karyawan, absensi, shift | ✅ |
| Loyalty (poin, tier Bronze/Silver/Gold/Platinum) | ✅ |
| Promo & flash sale terjadwal | ✅ |
| Email marketing | ✅ |
| Ulasan & Q&A produk | ✅ |
| Live chat dengan pembeli | ✅ |
| Laporan harian & analitik | ✅ |
| Wallet, escrow, penarikan | ✅ |
| Storefront builder (4 tema) | ✅ |
| Custom domain | ✅ |
| Multi-outlet & QR meja | ✅ |
| Kurir & RajaOngkir | ✅ |
| Produk digital & varian | ✅ |
| Analitik wishlist | ✅ |
| **Voucher Toko** (merchant CRUD voucher khusus tokonya) | ✅ |
| **Badge Tier Toko** (Platinum/Gold/Top Seller di beranda & halaman toko) | ✅ |
| **Label Pelanggan Otomatis** (VIP/Reguler/Baru/Tidak Aktif) | ✅ |
| **Notifikasi Keranjang Terbengkalai** (banner 30 menit) | ✅ |

### 1.3 Pembeli / Customer
| Fitur | Status |
|---|---|
| Marketplace beranda, search, kategori | ✅ |
| Halaman toko & produk + ulasan + Q&A | ✅ |
| Keranjang, checkout, order tracking | ✅ |
| Live chat, dispute, retur | ✅ |
| Akun: pesanan, alamat, wishlist, favorit | ✅ |
| Loyalty (poin, tier, redeem) | ✅ |
| Referral program | ✅ |
| Follow toko & notifikasi | ✅ |
| Flash sale & promo | ✅ |
| Trust Certificate Badge | ✅ |
| **Reorder 1-Klik** | ✅ |
| **Alert Harga Turun** (wishlist + detail produk) | ✅ |

---

## BAGIAN 2: BACKLOG — FITUR SEDERHANA, IMPACT BESAR

Setiap fitur dinilai dengan dua dimensi:
- **Kemudahan** (1–5): Seberapa cepat bisa dibangun
- **Impact** (1–5): Dampak langsung ke konversi / retensi / pendapatan

### 🔴 PRIORITAS TINGGI — Bangun Sekarang

| # | Fitur | Deskripsi Singkat | Mudah | Impact | Kategori |
|---|---|---|---|---|---|
| P1 | **Share Keranjang** | Tombol "Bagikan Keranjang" → link unik → teman bisa langsung checkout item yang sama | 4 | 5 | Konversi + Viral |
| P2 | **Pesan sebagai Hadiah** | Checkbox di checkout: "Ini hadiah" → input nama penerima + pesan ucapan → toko tahu ini untuk dikirim sebagai hadiah | 5 | 4 | Konversi |
| P3 | **Histori Harga Produk** | Grafik mini harga 30 hari terakhir di halaman produk — bangun kepercayaan pembeli | 4 | 4 | Konversi |
| P4 | **Perbandingan Produk** | Pembeli bisa pilih 2–3 produk → tampilkan tabel spesifikasi side-by-side | 3 | 4 | Konversi |
| P5 | **WhatsApp Notif Order** | Tombol "Kirim notif WA" di halaman pesanan toko → buka wa.me dengan template pesan sudah terisi | 5 | 5 | Retensi |
| P6 | **Daftar Belanja / Shopping List** | Pembeli bisa buat daftar "mau beli" — seperti wishlist tapi dengan kuantitas dan catatan | 4 | 3 | Retensi |
| P7 | **Cashback Wallet** | Pembeli dapat saldo cashback dari setiap pembelian, bisa dipakai di order berikutnya | 3 | 5 | Retensi |
| P8 | **Rating Pembeli (2-Way Rating)** | Toko bisa kasih rating ke pembeli setelah order selesai — ekosistem lebih sehat | 4 | 3 | Ekosistem |
| P9 | **Auto-Reply Q&A** | Toko bisa set template jawaban otomatis untuk pertanyaan yang sering muncul | 5 | 4 | Efisiensi Toko |
| P10 | **Tombol Bagikan Produk** | Tombol share produk ke WhatsApp/Instagram/copy link di setiap halaman produk | 5 | 4 | Viral |

### 🟡 PRIORITAS SEDANG — Kuartal Ini

| # | Fitur | Deskripsi Singkat | Mudah | Impact | Kategori |
|---|---|---|---|---|---|
| M1 | **Group Buy / Patungan** | Buat room beli bareng → share link → jika kuorum tercapai sebelum deadline, semua dapat harga spesial | 2 | 5 | Viral + Konversi |
| M2 | **Return Self-Service** | Tombol "Ajukan Retur" di detail pesanan → upload foto → pilih alasan → auto-notif ke toko | 3 | 4 | Kepercayaan |
| M3 | **Bulk Order / Grosir** | Harga berbeda untuk pembelian quantity besar — merchant set tabel harga per tier | 3 | 4 | Pendapatan |
| M4 | **Subscription / Langganan Produk** | Pembeli bisa langganan produk rutin (mingguan/bulanan) → order otomatis dibuat | 2 | 5 | Retensi |
| M5 | **AI Deskripsi Produk** | Upload foto produk → AI generate nama, deskripsi, tag, harga estimasi | 3 | 5 | Efisiensi Toko |
| M6 | **Laporan Laba Rugi Otomatis** | Rekap pendapatan dikurangi HPP, komisi, ongkir — tampil per bulan/minggu | 3 | 5 | Toko |
| M7 | **Katalog PDF/Link** | Toko bisa export katalog produk jadi link shareable atau PDF — mudah share di WA | 4 | 4 | Pemasaran |
| M8 | **Affiliate per Toko** | Merchant bisa generate link afiliasi → siapa pun bisa promosikan toko dan dapat komisi | 3 | 4 | Akuisisi |
| M9 | **COD + Verifikasi OTP** | Pembeli input OTP sebelum kurir serahkan paket COD — kurangi penolakan | 3 | 4 | Operasional |
| M10 | **Performance Dashboard Kasir** | Penjualan per kasir, top produk per shift, target harian — motivasi karyawan | 3 | 3 | Operasional |

### 🟢 PRIORITAS RENDAH — Masa Depan

| # | Fitur | Deskripsi |
|---|---|---|
| L1 | **Live Streaming Commerce** | Toko live stream, pin produk, pembeli langsung beli |
| L2 | **BNPL / Pay Later** | Integrasi Kredivo, Akulaku — cicilan tanpa kartu kredit |
| L3 | **AI Rekomendasi Produk** | "Untuk kamu" berdasarkan riwayat browse & beli |
| L4 | **Virtual Try-On (AR)** | Preview produk fashion/aksesoris secara AR |
| L5 | **Mobile App** | React Native / Expo — iOS & Android |

---

## BAGIAN 3: DETAIL FITUR PRIORITAS TINGGI

### P1 — Share Keranjang
**Apa:** Tombol "Bagikan Keranjang" di halaman keranjang → sistem generate link unik → siapa pun klik link itu, item yang sama langsung masuk keranjang mereka.

**Kenapa penting:** Viral loop paling kuat — satu pembeli membawa banyak pembeli baru tanpa biaya pemasaran.

**Cara kerja:**
1. Klik tombol → sistem simpan snapshot keranjang ke tabel `shared_carts` dengan `share_code` unik
2. Link: `kopihub.id/keranjang?share=ABC123`
3. Yang membuka link: item otomatis ditambahkan ke keranjang mereka, bisa edit sebelum checkout

**Tabel baru:** `shared_carts` (id, user_id, items_snapshot JSONB, share_code, expires_at, use_count)

---

### P2 — Pesan sebagai Hadiah
**Apa:** Checkbox "Ini pesanan hadiah" di checkout. Jika dicentang: muncul field nama penerima + pesan ucapan. Nota pesanan menampilkan "Dari: [nama pengirim] · Untuk: [nama penerima]" plus pesan ucapan.

**Kenapa penting:** Meningkatkan AOV (Average Order Value) — orang biasanya beli lebih banyak untuk hadiah.

**Cara kerja:** Tambah kolom `is_gift`, `gift_recipient_name`, `gift_message` di tabel `orders`. Tampilkan di nota PDF dan di dashboard toko.

---

### P5 — WhatsApp Notif Order (Template Siap Kirim)
**Apa:** Di halaman detail pesanan toko, ada tombol "Kirim ke WhatsApp". Klik → buka wa.me dengan pesan sudah terisi otomatis: nama pembeli, produk, total, nomor pesanan, status.

**Kenapa penting:** 90%+ UMKM Indonesia berkomunikasi via WhatsApp. Tidak perlu integrasi API mahal — cukup deep link.

**Template:**
```
Halo [Nama Pembeli]! 👋
Pesanan #[ID] kamu sudah [STATUS].
Total: Rp [TOTAL]
[Jika dikirim] No. Resi: [RESI] via [KURIR]
Terima kasih sudah berbelanja di [Nama Toko]! 🙏
```

---

### P10 — Tombol Bagikan Produk
**Apa:** Di setiap halaman produk, tombol share dengan icon WhatsApp, Instagram, dan "Salin Link". Satu klik langsung share.

**Kenapa penting:** Pembeli yang sudah melihat produk adalah agen pemasaran terbaik — bantu mereka share semudah mungkin.

**Cara kerja:** Web Share API (`navigator.share`) untuk mobile, fallback ke copy-to-clipboard + preset teks untuk desktop.

---

### P9 — Auto-Reply Q&A
**Apa:** Di halaman Q&A dashboard toko, merchant bisa set daftar "Pertanyaan Sering" beserta jawabannya. Ketika ada pertanyaan baru yang cocok secara fuzzy match → sistem otomatis balas dengan jawaban template + tandai "Dijawab otomatis".

**Kenapa penting:** Toko kecil tidak punya waktu balas Q&A satu per satu. Response rate yang tinggi = lebih banyak kepercayaan pembeli.

---

## BAGIAN 4: METRIK KEBERHASILAN

### Metrik Platform
| Metrik | Target 3 Bulan | Target 6 Bulan |
|---|---|---|
| Toko aktif (pesanan ≥ 1/minggu) | 500 | 2.000 |
| GMV bulanan | Rp 500jt | Rp 2M |
| Conversion rate checkout | > 35% | > 45% |
| Retention pembeli (beli lagi dalam 30 hari) | > 25% | > 35% |

### Metrik per Fitur (Target setelah Live 30 hari)
| Fitur | Metrik Target |
|---|---|
| Share Keranjang | ≥ 10% order berasal dari shared cart |
| Alert Harga Turun | ≥ 15% pembeli yang klik alert melakukan pembelian |
| Voucher Toko | ≥ 20% toko aktif membuat minimal 1 voucher |
| Reorder 1-Klik | ≥ 30% pembeli repeat menggunakan fitur ini |
| Label Pelanggan Auto | ≥ 40% toko menggunakan segmentasi untuk promo |

---

## BAGIAN 5: ARSITEKTUR TEKNIS

### Stack
- **Frontend:** React 19 + Vite + TanStack Router + TanStack Query
- **UI:** shadcn/ui + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime) + Express 5
- **ORM:** Drizzle ORM (Express side)
- **State:** Zustand untuk cart, TanStack Query untuk server state
- **Monorepo:** pnpm workspaces

### Struktur Route
```
/                          → Marketplace beranda
/toko/:slug                → Halaman publik toko
/toko/:slug/produk/:id     → Detail produk
/kategori/:slug            → Halaman kategori
/keranjang                 → Keranjang
/checkout                  → Checkout
/akun/*                    → Akun pembeli
/pos-app/*                 → Dashboard merchant
/admin/*                   → Super admin
/s/:slug/*                 → Storefront builder per toko
```

### Pola Database
- Semua tabel merchant di-scope oleh `shop_id`
- Row Level Security (RLS) Supabase untuk keamanan data
- `owner_user_id` di `coffee_shops` sebagai basis RLS merchant
- Notifikasi via tabel `notifications` + Supabase Realtime

---

## BAGIAN 6: ATURAN PENGEMBANGAN

1. **Fitur baru wajib ada fallback** — jika tabel Supabase belum ada, tampilkan instruksi SQL yang bisa langsung dijalankan
2. **Semua data merchant di-scope** — selalu filter dengan `shop_id` milik user yang login
3. **UI bahasa Indonesia** — semua label, toast, error message dalam Bahasa Indonesia
4. **Mobile-first** — semua halaman harus nyaman di layar 375px
5. **Data lokal dulu** — fitur yang tidak butuh database baru (pakai localStorage/state) didahulukan
6. **Tidak ada breaking change** — fitur baru tidak boleh merusak fitur yang sudah jalan
