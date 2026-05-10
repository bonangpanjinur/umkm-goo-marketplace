# PRD — Platform Marketplace Multi-Kategori (FlowMarket)

> **Versi:** 1.0  
> **Tanggal:** 10 Mei 2026  
> **Status:** Draft untuk Review  
> **Dasar Analisis Kode:** FlowPOS / KopiHub (Supabase + React + TanStack Router)

---

## 1. Ringkasan Eksekutif

**FlowMarket** adalah platform marketplace SaaS multi-tenant yang memungkinkan pelaku usaha dari berbagai kategori (F&B, digital, kerajinan, fashion, dan lainnya) untuk membuka toko online mereka sendiri dengan manajemen penuh — termasuk pengiriman, keuangan, katalog produk, dan tampilan toko — tanpa harus membangun infrastruktur dari nol.

Platform ini beroperasi dengan model **sewa fitur berbasis langganan (subscription)**, di mana Super Admin menentukan paket dan harga, sementara pemilik toko memilih paket yang sesuai kebutuhan mereka. Setiap toko mendapatkan **website sendiri dengan custom domain** dan dapat memilih atau memesan tema tampilan.

Visi utama: **"Satu platform, ribuan toko, jutaan pembeli."**

---

## 2. Latar Belakang & Analisis Kode yang Ada

### 2.1 Apa yang Sudah Dibangun

Berdasarkan analisis kode repositori (`artifacts/kopihub/`), sistem sudah memiliki fondasi yang sangat kuat:

| Modul | Status | Relevansi ke PRD |
|---|---|---|
| **Multi-tenant shops** (tabel `coffee_shops`) | ✅ Ada | Basis untuk sistem toko marketplace |
| **Plan & Billing** (`admin.plans`, `plan_invoices`) | ✅ Ada | Basis sistem sewa fitur |
| **Entitlement System** (`get_my_entitlements` RPC) | ✅ Ada | Kontrol akses per fitur per plan |
| **Plan Matrix** (`admin_update_min_months`) | ✅ Ada | Konfigurasi fitur per plan dari Super Admin |
| **Storefront per toko** (`/s/$slug/`) | ✅ Ada | Basis website toko dengan URL unik |
| **Custom Domain** (`domain.functions.ts`) | ✅ Ada | Basis custom domain per toko |
| **Sistem Tema** (classic, minimal, dark-luxe, vibrant) | ✅ Ada | Basis tema toko berbayar/gratis |
| **Panel Super Admin** (`/admin/*`) | ✅ Ada | Manajemen toko, plan, domain, broadcast |
| **Manajemen Produk/Menu** | ✅ Ada | Perlu diperluas ke non-F&B |
| **Manajemen Order** | ✅ Ada | Perlu ditambah flow pengiriman fisik |
| **Loyalty & Promo** | ✅ Ada | Dapat dimanfaatkan di marketplace |
| **KDS, Meja, POS** | ✅ Ada (F&B-spesifik) | Opsional per kategori bisnis |
| **Sistem Kategori Bisnis** | ❌ Belum ada | Perlu dibangun — saat ini hanya F&B |
| **Marketplace Discovery** | ❌ Belum ada | Halaman utama, search, filter global |
| **Manajemen Pengiriman** | ⚠️ Parsial | Ada `app.couriers`, perlu diperluas |
| **Payment Gateway** | ⚠️ Stub | Perlu integrasi Midtrans/Xendit |
| **Review & Rating** | ⚠️ Belum selesai | Komponen ada, belum diport |

### 2.2 Gap yang Harus Dibangun

1. Halaman marketplace utama (discovery, search, kategori global)
2. Sistem kategori bisnis yang dinamis (dari Super Admin)
3. Manajemen pengiriman per toko (pilih kurir, atur tarif)
4. Payment gateway terintegrasi (Midtrans / Xendit)
5. Dashboard keuangan per toko (pendapatan, komisi platform, penarikan)
6. Sistem komisi platform yang bisa dikonfigurasi Super Admin
7. Tema berbayar yang dikontrol dari Super Admin
8. Fitur non-F&B: tipe produk digital, kerajinan, fashion (ukuran/variasi)

---

## 3. Aktor & Peran Sistem

### 3.1 Super Admin (Platform Owner — Anda)
- Mengelola seluruh platform
- Menentukan paket (plan), fitur, dan harga per bulan
- Menentukan komisi platform per transaksi (per kategori atau global)
- Menambah/mengubah/menonaktifkan kategori bisnis
- Mengelola tema toko (gratis / berbayar + harga)
- Memantau seluruh toko, transaksi, dan keuangan platform
- Menyetujui/menolak bukti pembayaran sewa (atau otomatis via gateway)
- Broadcast notifikasi ke semua / segmen pemilik toko
- Audit log semua aktivitas

### 3.2 Pemilik Toko (Merchant / Tenant)
- Mendaftar akun dan membuat toko
- Memilih paket langganan dan membayar biaya sewa
- Mengelola katalog produk / menu sesuai kategori bisnis
- Mengatur tampilan toko (pilih tema, warna, logo, banner)
- Menghubungkan custom domain sendiri
- Mengatur pengiriman (pilih mitra kurir, atur ongkir)
- Memantau dan mengelola pesanan masuk
- Mengelola keuangan toko (saldo, penarikan dana)
- Mengatur karyawan dan level akses
- Melihat laporan penjualan, produk terlaris, dll.

### 3.3 Pembeli (Customer / End User)
- Browsing marketplace (tanpa login)
- Mencari produk berdasarkan kategori, lokasi, nama toko
- Melihat halaman toko individual
- Menambah produk ke keranjang
- Checkout dengan berbagai metode pembayaran
- Melacak status pesanan dan pengiriman
- Memberikan ulasan dan rating produk/toko
- Mengikuti program loyalitas toko
- Membuat akun untuk menyimpan riwayat pembelian

### 3.4 Kurir / Mitra Pengiriman
- (Fase 2) Menerima dan memproses permintaan pickup
- Update status pengiriman

---

## 4. Kategori Bisnis

### 4.1 Kategori Default (Dapat Dikelola dari Super Admin)

| Kode | Nama | Contoh Produk | Fitur Khusus |
|---|---|---|---|
| `fnb` | Food & Beverage | Makanan, minuman, kue, katering | POS, KDS, Meja, Resep, Bahan Baku |
| `digital` | Produk Digital | Template, e-book, font, musik, preset | Delivery file otomatis, no shipping |
| `craft` | Kerajinan Tangan | Anyaman, kayu ukir, batik, pottery | Variasi produk, estimasi produksi |
| `fashion` | Fashion & Pakaian | Baju, sepatu, tas, aksesoris | Variasi (ukuran, warna), size chart |
| `beauty` | Kecantikan | Skincare, makeup, parfum | Ingredient list, BPOM number |
| `electronics` | Elektronik & Gadget | Aksesoris HP, charger, earphone | Garansi, serial number |
| `books` | Buku & Edukasi | Buku fisik, modul, materi belajar | ISBN, edisi |
| `art` | Seni & Koleksi | Lukisan, fotografi, NFT fisik | COA (Certificate of Authenticity) |
| `home` | Rumah & Dekor | Furnitur mini, dekorasi, lilin | Dimensi produk |
| `plants` | Tanaman & Pertanian | Tanaman hias, bibit, pupuk | Perawatan, media tanam |
| `services` | Jasa & Layanan | Fotografi, desain, konsultasi | Booking jadwal, tidak ada pengiriman fisik |
| `other` | Lainnya | — | Fitur generik |

> **Catatan:** Semua kategori dapat ditambah, diubah urutan, diaktifkan/dinonaktifkan dari panel Super Admin tanpa deployment ulang.

---

## 5. Model Bisnis & Sistem Sewa

### 5.1 Konsep

Pemilik toko **menyewa akses ke platform** dengan membayar biaya bulanan. Harga dan fitur yang didapat ditentukan sepenuhnya oleh Super Admin melalui **Plan Matrix** (sudah ada dasarnya di kode).

### 5.2 Contoh Struktur Paket

| Paket | Harga/Bulan | Target |
|---|---|---|
| **Starter** | Rp 99.000 | Toko baru, produk sedikit |
| **Growth** | Rp 299.000 | Toko berkembang, lebih banyak fitur |
| **Pro** | Rp 599.000 | Toko besar, fitur lengkap |
| **Enterprise** | Custom | Franchise, multi-outlet |

> Harga dan nama paket sepenuhnya dikonfigurasi dari Super Admin — tidak hardcoded.

### 5.3 Fitur yang Dapat Dikontrol per Paket (Entitlement)

Berikut fitur-fitur yang dapat Super Admin aktifkan/nonaktifkan per paket:

**Katalog & Produk**
- `max_products` — Batas jumlah produk aktif
- `max_categories` — Batas jumlah kategori produk
- `product_variants` — Variasi produk (ukuran, warna)
- `digital_products` — Produk digital dengan file delivery
- `bulk_import` — Import produk via CSV/Excel

**Tampilan Toko**
- `custom_domain` — Hubungkan domain sendiri
- `theme_selection` — Pilih tema gratis
- `premium_themes` — Akses tema berbayar
- `custom_css` — Edit CSS kustom
- `remove_watermark` — Hapus branding platform

**Penjualan & Transaksi**
- `max_orders_per_month` — Batas order per bulan
- `payment_gateway` — Terima pembayaran online otomatis
- `multi_payment_method` — Berbagai metode bayar
- `promo_codes` — Buat kode promo / diskon
- `loyalty_program` — Program poin pelanggan

**Pengiriman**
- `shipping_management` — Manajemen kurir dan ongkir
- `auto_courier_api` — Integrasi API kurir (JNE, JNT, dll.)
- `same_day_delivery` — Layanan same-day
- `pickup_point` — Ambil langsung di toko

**Operasional F&B (khusus kategori fnb)**
- `pos_system` — Aplikasi kasir
- `kds_display` — Kitchen Display System
- `table_management` — Manajemen meja & QR order
- `multi_outlet` — Beberapa cabang dalam satu akun
- `inventory_management` — Stok & bahan baku
- `recipe_costing` — Perhitungan HPP resep

**Analitik & Laporan**
- `basic_reports` — Laporan penjualan dasar
- `advanced_reports` — Laporan lanjutan (profit, HPP, customer)
- `export_reports` — Export Excel / PDF
- `customer_analytics` — Analitik perilaku pelanggan

**Tim & Manajemen**
- `max_staff_accounts` — Batas akun karyawan
- `rbac_roles` — Role-Based Access Control
- `audit_log` — Log aktivitas karyawan

**Integrasi**
- `api_access` — Akses REST API
- `webhook` — Webhook ke sistem eksternal
- `third_party_integrations` — GrabFood, GoFood, Tokopedia, dll.

### 5.4 Komisi Transaksi

Super Admin dapat menetapkan komisi platform per transaksi:
- Komisi global (misal: 2% dari setiap transaksi)
- Komisi per kategori bisnis
- Komisi per paket (Starter lebih tinggi, Pro lebih rendah)
- Paket tanpa komisi (flat fee saja)

---

## 6. Fitur Detail per Modul

### 6.1 Marketplace Discovery (Halaman Utama)

**Tampilan Publik — Pembeli**

- **Hero Section**: Banner promosi yang dapat diatur Super Admin
- **Kategori**: Grid semua kategori bisnis dengan ikon
- **Toko Unggulan**: Toko yang dipromosikan oleh Super Admin
- **Produk Terlaris**: Lintas semua toko
- **Produk Terbaru**: Feed produk terbaru dari semua toko
- **Pencarian Global**: Cari produk / toko berdasarkan nama, deskripsi, kategori
- **Filter**: Kategori, lokasi kota, rentang harga, rating, gratis ongkir
- **Halaman Kategori**: Daftar semua toko + produk dalam satu kategori

**URL Structure:**
```
/                          → Halaman utama marketplace
/kategori/:slug            → Halaman kategori (fnb, fashion, dll.)
/toko/:slug                → Halaman toko individual
/toko/:slug/produk/:id     → Halaman detail produk
/search?q=...&kat=...      → Hasil pencarian
/cari                      → Halaman pencarian lanjutan
```

### 6.2 Halaman Toko Individual

Setiap toko memiliki halaman publik di `/toko/:slug` (atau domain sendiri jika pakai custom domain).

**Komponen Halaman Toko:**
- Header toko: Logo, nama, deskripsi, rating, jam buka
- Navigasi kategori produk toko
- Grid / list produk dengan filter & search
- Info toko: Lokasi, kontak, kebijakan toko
- Ulasan & Rating toko
- Banner / promosi toko

**Fitur Custom Domain:**
- Pemilik toko input domain di dashboard
- Platform verifikasi kepemilikan via DNS TXT record
- Setelah verifikasi, domain diarahkan ke halaman toko
- SSL otomatis (Let's Encrypt)

### 6.3 Halaman Detail Produk

- Foto produk (multiple, zoom)
- Nama, deskripsi, harga
- Variasi produk (jika ada): ukuran, warna, tipe
- Estimasi pengiriman & ongkir (masukkan kota tujuan)
- Stok tersedia
- Tombol Tambah ke Keranjang / Beli Sekarang
- Informasi toko (mini card dengan link ke halaman toko)
- Produk lain dari toko yang sama
- Ulasan & Rating produk
- **Untuk produk digital**: Preview (jika ada), spesifikasi file, format

### 6.4 Sistem Keranjang & Checkout

**Keranjang:**
- Multi-toko dalam satu keranjang (produk dari beberapa toko)
- Keranjang tersimpan di akun (bisa dilanjutkan nanti)
- Notifikasi jika stok berubah

**Checkout:**
- Pilih / input alamat pengiriman
- Pilih metode pengiriman per toko (setiap toko bisa punya kurir berbeda)
- Tampil rincian biaya: subtotal, ongkir per toko, total
- Kode promo / voucher
- Pilih metode pembayaran:
  - Transfer bank (manual + upload bukti)
  - Virtual Account (Midtrans / Xendit)
  - QRIS
  - Dompet digital (OVO, GoPay, Dana)
  - Kartu kredit/debit
  - COD (Cash on Delivery — opsional per toko)
- Ringkasan pesanan sebelum bayar
- Order dikonfirmasi → notifikasi ke pembeli & pemilik toko

### 6.5 Manajemen Order (Pembeli)

- Riwayat semua pesanan
- Status pesanan: `menunggu pembayaran` → `dikonfirmasi` → `diproses` → `dikirim` → `selesai` → `dibatalkan`
- Lacak pengiriman (nomor resi + link tracking)
- Tombol konfirmasi terima barang
- Request pembatalan pesanan
- Ajukan pengembalian / refund

### 6.6 Dashboard Pemilik Toko

**Beranda Dashboard:**
- Ringkasan: Total pesanan hari ini, pendapatan, produk aktif, rating toko
- Grafik penjualan (harian/mingguan/bulanan)
- Pesanan terbaru yang perlu ditangani
- Notifikasi: Pesanan baru, stok menipis, pesan dari customer

**Modul Manajemen:**

#### A. Katalog Produk
- Tambah/edit/hapus produk
- Upload foto (multiple)
- Atur kategori produk
- Kelola variasi (ukuran, warna, dll.)
- Atur stok dan notifikasi stok menipis
- Publish/unpublish produk
- Bulk edit/delete
- Import via CSV (jika entitlement aktif)
- **Untuk F&B**: Modifier, resep, HPP, KDS routing

#### B. Manajemen Pesanan
- Daftar semua pesanan dengan filter status
- Detail pesanan: Produk, pembeli, alamat, pembayaran
- Konfirmasi pesanan
- Input nomor resi pengiriman
- Cetak invoice / packing list
- Proses refund / pembatalan
- **Untuk F&B**: Tampilan KDS, status pesanan dapur

#### C. Manajemen Pengiriman
- Daftar kurir yang tersedia di platform
- Aktifkan kurir yang ingin digunakan
- Atur ongkir:
  - Gratis ongkir (syarat tertentu)
  - Flat rate
  - Berdasarkan berat/jarak
  - Integrasi API kurir (JNE, JNT, SiCepat, Anteraja, dll.)
- Atur wilayah pengiriman (kota/provinsi yang dilayani)
- Atur estimasi waktu pemrosesan pesanan
- **Untuk F&B**: Manajemen kurir internal / delivery sendiri

#### D. Keuangan Toko
- Saldo toko (total pendapatan dikurangi komisi platform)
- Riwayat transaksi (masuk & keluar)
- Request penarikan dana (withdrawal)
  - Minimal penarikan (ditentukan Super Admin)
  - Pilih rekening bank tujuan
  - Status penarikan: pending → diproses → selesai
- Tagihan langganan (sewa fitur)
  - Status pembayaran: aktif / jatuh tempo / lewat jatuh tempo
  - Riwayat invoice
  - Tombol perpanjang / upgrade paket
- Laporan komisi yang dipotong platform
- Export laporan keuangan (PDF / Excel)

#### E. Tampilan Toko (Appearance)
- Pilih tema (dari daftar yang ditentukan Super Admin)
- Upload logo & banner
- Atur warna utama toko
- Isi profil toko: Deskripsi, lokasi, jam buka, kontak
- Kelola custom domain
- Preview tampilan toko

#### F. Pelanggan & Loyalitas
- Daftar pelanggan toko
- Riwayat pembelian per pelanggan
- Program poin loyalitas (aktifkan/atur poin per transaksi)
- Buat reward yang bisa ditukar poin
- Referral program
- Export data pelanggan

#### G. Promosi & Diskon
- Buat kode promo (persentase / nominal)
- Diskon produk tertentu
- Flash sale (waktu terbatas)
- Buy X Get Y
- Gratis ongkir dengan minimum pembelian
- Bundling produk

#### H. Ulasan & Rating
- Lihat semua ulasan produk / toko
- Balas ulasan pelanggan
- Filter ulasan (bintang, belum dibalas)
- Laporkan ulasan yang tidak pantas

#### I. Tim & Karyawan
- Undang karyawan via email
- Atur peran: Owner, Manager, Staff (Kasir / Gudang / Kurir)
- Kelola izin akses per modul
- Log aktivitas karyawan
- **Untuk F&B**: Absensi, jadwal, shift

#### J. Laporan
- Laporan penjualan (per produk, kategori, waktu)
- Laporan stok
- Laporan pelanggan
- Laporan pengiriman
- **F&B**: Laporan HPP, margin, bahan baku
- Export semua laporan

#### K. Integrasi (paket Pro/Enterprise)
- API Key management
- Webhook configuration
- Integrasi marketplace lain (GrabFood, GoFood, dll.)
- Integrasi akuntansi

### 6.7 Panel Super Admin

**Dashboard Super Admin:**
- Total toko aktif, toko baru bulan ini
- Total transaksi platform, GMV (Gross Merchandise Value)
- Pendapatan platform (komisi + sewa)
- Grafik pertumbuhan
- Aktivitas terbaru
- Alert: toko jatuh tempo, penarikan pending, laporan abuse

**Modul Super Admin:**

#### A. Manajemen Toko
- Daftar semua toko dengan filter (kategori, paket, status)
- Detail toko: Info, pemilik, paket aktif, statistik
- Ubah paket toko secara manual
- Suspend / unsuspend toko (dengan alasan)
- Reset password pemilik
- Lihat semua produk toko
- Lihat laporan keuangan toko

#### B. Manajemen Paket (Plan)
- Buat / edit / hapus paket
- Atur nama, harga, deskripsi paket
- **Plan Matrix**: Tentukan nilai setiap entitlement per paket
  - Angka (max_products: 50, max_staff: 3)
  - Boolean (custom_domain: true/false)
  - Minimum bulan langganan per fitur
- Atur komisi transaksi per paket
- Lihat berapa toko yang menggunakan setiap paket

#### C. Manajemen Kategori Bisnis
- Tambah kategori baru (nama, ikon, deskripsi, slug)
- Edit kategori yang ada
- Aktifkan / nonaktifkan kategori
- Atur urutan tampil di marketplace
- Tentukan fitur default yang relevan per kategori
- Upload ikon/banner kategori

#### D. Manajemen Tema
- Daftar semua tema yang tersedia
- Upload tema baru
- Tandai tema sebagai: Gratis / Berbayar (+ harga)
- Aktifkan / nonaktifkan tema
- Preview tema
- Tentukan tema default untuk toko baru

#### E. Keuangan Platform
- Total pendapatan (sewa + komisi)
- Daftar invoice penyewaan: pending review / approved / rejected
- Approve / reject bukti pembayaran
- Daftar request penarikan dari pemilik toko
  - Approve penarikan (manual / otomatis)
  - Tandai selesai (input nomor referensi transfer)
- Konfigurasi: Minimal penarikan, jadwal penarikan, biaya admin

#### F. Manajemen Domain
- Daftar semua custom domain terdaftar
- Status verifikasi domain
- Force verify / revoke domain
- Blacklist domain

#### G. Konten & Promosi Platform
- Kelola banner halaman utama marketplace
- Atur toko unggulan (featured stores)
- Broadcast notifikasi ke semua / segmen pemilik toko
- Kelola halaman statis (About, FAQ, ToS, Privacy)

#### H. Monitoring & Audit
- Log semua aktivitas admin
- Log aktivitas semua pemilik toko
- Monitor performa sistem
- Laporan abuse / pelanggaran

#### I. Pengaturan Platform
- Info platform (nama, logo, warna brand)
- Pengaturan komisi global
- Pengaturan metode pembayaran yang diterima platform
- Pengaturan kurir yang tersedia
- Konfigurasi email notifikasi
- Maintenance mode

---

## 7. Sistem Tema Toko

### 7.1 Tema yang Sudah Ada (dari Kode)
- **Classic** — Clean, minimalis, cocok untuk semua tipe
- **Minimal** — Ultra-clean, fokus pada produk
- **Dark Luxe** — Gelap, premium, cocok untuk fashion/art
- **Vibrant** — Colorful, energik, cocok untuk F&B

### 7.2 Tema Baru yang Direncanakan

| Kode Tema | Nama | Target | Status |
|---|---|---|---|
| `classic` | Classic | Umum | ✅ Ada |
| `minimal` | Minimal | Umum | ✅ Ada |
| `dark-luxe` | Dark Luxe | Fashion, Art | ✅ Ada (partial) |
| `vibrant` | Vibrant | F&B, Kecantikan | ✅ Ada (partial) |
| `natural` | Natural | Kerajinan, Tanaman | Rencana |
| `bold` | Bold | Elektronik, Gaming | Rencana |
| `elegant` | Elegant | Perhiasan, Parfum | Rencana |
| `playful` | Playful | Anak-anak, Mainan | Rencana |
| `professional` | Professional | Jasa, Konsultan | Rencana |

### 7.3 Manajemen Tema di Super Admin
- Toggle setiap tema: aktif/nonaktif
- Tetapkan harga tema berbayar (sekali bayar atau per bulan)
- Tema gratis: Tersedia untuk semua paket
- Tema berbayar: Hanya tersedia jika entitlement `premium_themes` aktif
- Tema custom: Pemilik toko bisa pesan tema khusus (fitur Enterprise)

---

## 8. Sistem Pengiriman

### 8.1 Tipe Pengiriman yang Didukung

| Tipe | Deskripsi | Contoh |
|---|---|---|
| **Kurir Reguler** | JNE, JNT, SiCepat, Anteraja, Pos Indonesia | Semua kategori fisik |
| **Same Day** | GoSend, GrabExpress, Lalamove | Produk butuh cepat |
| **Kurir Mandiri** | Motor/mobil toko sendiri | F&B, toko lokal |
| **Pickup** | Pembeli ambil langsung di toko | Semua tipe |
| **Pengiriman Digital** | File dikirim otomatis via email / link | Produk digital |
| **Tanpa Pengiriman** | Jasa yang dilakukan di lokasi | Services |

### 8.2 Alur Pengiriman

```
Order Dikonfirmasi → Pemilik Toko Proses → 
Input Nomor Resi → Pembeli Dapat Notifikasi → 
Lacak di Platform → Barang Diterima → 
Pembeli Konfirmasi → Dana Cair ke Toko
```

### 8.3 Integrasi API Kurir (Fase 2)
- RajaOngkir API untuk cek ongkir real-time
- Otomatis input nomor resi dari label pengiriman digital
- Tracking real-time dari API kurir

---

## 9. Sistem Pembayaran

### 9.1 Alur Pembayaran Pembeli

```
Pembeli Checkout → Pilih Metode Bayar → 
Redirect / Tampilkan instruksi bayar → 
Bayar → Notifikasi ke Platform → 
Konfirmasi ke Toko → Dana ditahan di escrow → 
Barang diterima → Dana cair ke toko (dikurangi komisi)
```

### 9.2 Escrow System

Platform memegang dana sampai pembeli konfirmasi terima barang (atau otomatis setelah X hari):
- Dana masuk ke platform dahulu
- Dikurangi komisi platform
- Sisanya masuk ke saldo toko
- Pemilik toko request penarikan kapan saja

### 9.3 Alur Pembayaran Sewa (Subscription)

**Otomatis (Paket dengan Gateway):**
- Auto-charge saat jatuh tempo
- Notifikasi H-7 sebelum jatuh tempo

**Manual (Semua Paket):**
- Pemilik toko klik "Bayar Sekarang"
- Pilih metode pembayaran
- Upload bukti transfer (jika manual)
- Super Admin review dan approve

---

## 10. Notifikasi

### 10.1 Notifikasi ke Pembeli
- Registrasi berhasil (email)
- Order diterima (email + in-app)
- Status order berubah (in-app + opsional email/WA)
- Pesanan dikirim + nomor resi (email + in-app)
- Pesanan selesai (in-app)
- Promo dari toko yang diikuti (in-app)

### 10.2 Notifikasi ke Pemilik Toko
- Order baru (in-app + opsional email)
- Pembayaran diterima (in-app)
- Stok produk menipis (in-app)
- Review baru dari pelanggan (in-app)
- Invoice sewa jatuh tempo H-7, H-3, H-1 (email + in-app)
- Penarikan dana berhasil (in-app + email)
- Broadcast dari Super Admin (in-app)

### 10.3 Notifikasi ke Super Admin
- Toko baru mendaftar
- Bukti pembayaran baru masuk
- Request penarikan baru
- Laporan abuse baru

---

## 11. Arsitektur Teknis

### 11.1 Stack yang Sudah Ada (Dipertahankan)
- **Frontend**: React + Vite + TanStack Router
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **UI**: shadcn/ui + Tailwind CSS
- **State**: TanStack Query

### 11.2 Perubahan Database Utama

**Tabel baru:**
```sql
-- Kategori bisnis (dinamis dari super admin)
business_categories (id, slug, name, icon_url, description, sort_order, is_active)

-- Produk marketplace (generalisasi menu_items)
products (id, shop_id, category_id, name, description, price, 
          images, stock, weight_grams, is_digital, digital_file_url,
          is_available, is_featured, sort_order, ...)

-- Variasi produk
product_variants (id, product_id, name, sku, price_adjustment, stock, attributes)

-- Alamat pengiriman pembeli
customer_addresses (id, user_id, label, recipient_name, phone, 
                   address, city, province, postal_code, is_default)

-- Pengiriman per toko
shop_shipping_settings (id, shop_id, courier_ids, flat_rate, 
                        free_shipping_min, regions_served)

-- Penarikan dana
withdrawals (id, shop_id, amount, bank_name, account_number, 
            account_name, status, processed_at, reference_no)

-- Komisi per transaksi
platform_commissions (id, order_id, shop_id, gross_amount, 
                     commission_rate, commission_amount, net_amount)

-- Ulasan produk
product_reviews (id, product_id, shop_id, user_id, order_id, 
                rating, comment, reply, created_at)

-- Laporan & abuse
abuse_reports (id, reporter_id, target_type, target_id, reason, status)
```

**Perubahan tabel existing:**
```sql
-- coffee_shops → shops (alias businesses, tambah kolom)
ALTER TABLE coffee_shops ADD COLUMN 
  business_category_id UUID,  -- FK ke business_categories
  commission_rate NUMERIC,    -- Override komisi per toko
  marketplace_visible BOOLEAN DEFAULT true,
  featured_until TIMESTAMPTZ, -- Jika dijadikan toko unggulan
  total_sales_count INTEGER DEFAULT 0,
  average_rating NUMERIC(2,1);

-- plan_features tambah semua entitlement baru
-- themes tambah kolom is_premium, price_idr
```

### 11.3 URL & Routing

**Marketplace Publik:**
```
/                          → Landing / Discovery
/kategori/:slug            → Halaman kategori
/toko/:slug                → Halaman toko (alias /s/:slug existing)
/toko/:slug/produk/:id     → Detail produk
/search                    → Pencarian
/keranjang                 → Keranjang belanja
/checkout                  → Checkout
/pesanan/:id               → Detail pesanan pembeli
/akun/pesanan              → Riwayat pesanan pembeli
/akun/profil               → Profil pembeli
```

**Dashboard Toko:**
```
/app/                      → Dashboard utama toko
/app/produk                → Manajemen produk
/app/pesanan               → Manajemen pesanan
/app/pengiriman            → Pengaturan pengiriman
/app/keuangan              → Laporan keuangan & penarikan
/app/billing               → Tagihan sewa & upgrade paket
/app/tampilan              → Tema & appearance
/app/pelanggan             → Data & loyalitas pelanggan
/app/promosi               → Kode promo & diskon
/app/laporan               → Laporan penjualan
/app/integrasi             → API & webhook
/app/pengaturan            → Profil & pengaturan toko
/app/karyawan              → Manajemen tim
```

**Panel Super Admin:**
```
/admin/                    → Dashboard super admin
/admin/toko                → Kelola semua toko
/admin/paket               → Kelola plan & entitlement
/admin/paket/:id/matrix    → Plan feature matrix
/admin/kategori            → Kelola kategori bisnis
/admin/tema                → Kelola tema toko
/admin/keuangan            → Komisi, penarikan, invoice
/admin/domain              → Kelola custom domain
/admin/konten              → Banner & promosi platform
/admin/broadcast           → Kirim notifikasi massal
/admin/audit               → Log aktivitas
/admin/pengaturan          → Pengaturan platform
```

---

## 12. Roadmap Pengembangan

### Fase 0 — Refactoring & Generalisasi (2–3 minggu)
Memanfaatkan kode yang sudah ada, generalisasi dari F&B ke multi-kategori.

- [ ] Migrasi konsep `menu_items` → `products` (backward compatible)
- [ ] Tambah tabel `business_categories` + UI Super Admin
- [ ] Generalisasi entitlement untuk semua kategori
- [ ] Buat halaman marketplace publik (discovery, kategori, search)
- [ ] Integrasi payment gateway (Midtrans/Xendit) — ganti stub

### Fase 1 — MVP Marketplace (4–6 minggu)
Platform bisa digunakan oleh toko pertama secara live.

- [ ] Halaman marketplace utama + kategori + search
- [ ] Halaman toko individual (generalisasi dari /s/$slug/)
- [ ] Detail produk dengan variasi
- [ ] Keranjang multi-toko
- [ ] Checkout dengan payment gateway
- [ ] Dashboard toko: produk, pesanan, keuangan dasar
- [ ] Super Admin: kelola toko, paket, kategori, invoice sewa
- [ ] Sistem penarikan dana manual
- [ ] Notifikasi dasar (email)
- [ ] Sistem ulasan & rating

### Fase 2 — Pengiriman & Operasional (3–4 minggu)
Pengiriman terintegrasi dan operasional lebih lengkap.

- [ ] Integrasi API kurir (RajaOngkir) untuk cek ongkir
- [ ] Tracking pengiriman
- [ ] Produk digital (delivery file otomatis)
- [ ] Sistem promosi & kode diskon
- [ ] Program loyalitas pelanggan
- [ ] Notifikasi WhatsApp (via Fonnte/WA Business API)
- [ ] Export laporan Excel/PDF
- [ ] Fitur F&B lanjutan (POS, KDS, meja) untuk toko kategori F&B

### Fase 3 — Tema & Personalisasi (2–3 minggu)
Setiap toko punya identitas unik.

- [ ] Tambah 5 tema baru (Natural, Bold, Elegant, Playful, Professional)
- [ ] Sistem pembelian tema berbayar
- [ ] Custom CSS editor (untuk paket Pro)
- [ ] Verifikasi custom domain end-to-end
- [ ] Builder sederhana konten toko (drag widget)

### Fase 4 — Skala & Integrasi (Ongoing)
Platform siap untuk ribuan toko.

- [ ] Integrasi marketplace eksternal (Tokopedia, Shopee sync)
- [ ] API publik untuk mitra
- [ ] Program affiliate/referral pemilik toko
- [ ] Mobile app (pembeli + pemilik toko)
- [ ] Multi-bahasa
- [ ] Fitur franchise / multi-outlet lanjutan

---

## 13. Metrik Keberhasilan

| Metrik | Target 3 Bulan | Target 6 Bulan |
|---|---|---|
| Toko aktif | 50 | 300 |
| GMV per bulan | Rp 100 juta | Rp 1 miliar |
| Pembeli terdaftar | 500 | 5.000 |
| Pendapatan platform (sewa + komisi) | Rp 15 juta | Rp 100 juta |
| Rating platform (app store) | — | 4.5+ |
| Uptime | 99.5% | 99.9% |

---

## 14. Risiko & Mitigasi

| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| Pemilik toko tidak mau bayar komisi | Tinggi | Tinggi | Mulai komisi 0%, naikkan bertahap setelah ekosistem terbentuk |
| Persaingan dengan Tokopedia/Shopee | Tinggi | Medium | Fokus niche (UMKM lokal, produk artisan, tidak ada di marketplace besar) |
| Abuse / penipuan oleh toko | Medium | Tinggi | Verifikasi identitas, escrow system, laporan cepat |
| Skalabilitas database (Supabase) | Low | Tinggi | Monitor query, indexing, siapkan arsitektur caching |
| Ketergantungan payment gateway | Medium | Tinggi | Support 2+ gateway, fallback ke manual transfer |

---

## 15. Pertanyaan Terbuka (Keputusan yang Diperlukan)

Sebelum mulai pengembangan, mohon konfirmasi:

1. **Nama platform**: "FlowMarket", atau nama lain?
2. **Model komisi**: Berapa % komisi awal? Apakah toko baru gratis komisi di bulan pertama?
3. **Payment gateway**: Midtrans, Xendit, atau keduanya?
4. **Verifikasi toko**: Apakah pemilik toko perlu verifikasi KTP / NPWP sebelum aktif?
5. **Penarikan dana**: Jadwal penarikan (kapan saja / mingguan / bulanan)? Biaya admin berapa?
6. **Tema**: Berapa harga tema berbayar? Per bulan atau sekali beli?
7. **Sprint pertama**: Fokus ke mana dulu — marketplace publik + discovery, atau dashboard toko + billing?

---

*Dokumen ini dibuat berdasarkan analisis mendalam kode repositori FlowPOS/KopiHub yang sudah ada, dikombinasikan dengan visi platform marketplace yang Anda inginkan. Fondasi teknis sudah sangat kuat — estimasi waktu pengembangan lebih cepat dari memulai dari nol.*
