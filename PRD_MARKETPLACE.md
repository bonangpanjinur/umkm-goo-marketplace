# PRD — Platform Marketplace Multi-Kategori
## Dokumen Kebutuhan Produk (Product Requirements Document)

> **Versi:** 2.0 — Final Draft  
> **Tanggal:** 10 Mei 2026  
> **Status:** Siap Review Teknis  
> **Dasar Analisis Kode:** FlowPOS / KopiHub (Supabase + React + TanStack Router)  
> **Diperbarui berdasarkan:** Konfirmasi keputusan pemilik platform

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Analisis Kode yang Ada](#2-analisis-kode-yang-ada)
3. [Aktor & Peran Sistem](#3-aktor--peran-sistem)
4. [Kategori Bisnis](#4-kategori-bisnis)
5. [Model Bisnis & Sistem Sewa](#5-model-bisnis--sistem-sewa)
6. [Sistem Entitlement & Fitur per Paket](#6-sistem-entitlement--fitur-per-paket)
7. [Verifikasi Toko](#7-verifikasi-toko)
8. [Sistem Pembayaran & Payment Gateway](#8-sistem-pembayaran--payment-gateway)
9. [Sistem Pengiriman](#9-sistem-pengiriman)
10. [Sistem Keuangan Platform & Toko](#10-sistem-keuangan-platform--toko)
11. [Sistem Tema Toko](#11-sistem-tema-toko)
12. [Fitur Detail per Modul](#12-fitur-detail-per-modul)
13. [Arsitektur Teknis & Database](#13-arsitektur-teknis--database)
14. [URL & Routing](#14-url--routing)
15. [Notifikasi & Komunikasi](#15-notifikasi--komunikasi)
16. [Keamanan & Compliance](#16-keamanan--compliance)
17. [Roadmap Pengembangan](#17-roadmap-pengembangan)
18. [Metrik Keberhasilan](#18-metrik-keberhasilan)
19. [Risiko & Mitigasi](#19-risiko--mitigasi)

---

## 1. Ringkasan Eksekutif

Platform ini adalah **marketplace SaaS multi-tenant** yang memungkinkan pelaku usaha dari berbagai kategori (F&B, digital, kerajinan, fashion, dan lainnya) untuk membuka toko online mereka sendiri dengan manajemen penuh — termasuk pengiriman, keuangan, katalog produk, dan tampilan toko — tanpa harus membangun infrastruktur sendiri.

### Keputusan Desain Utama (Telah Dikonfirmasi)

| Keputusan | Jawaban |
|---|---|
| **Nama platform** | Dinamis — dikonfigurasi Super Admin, bisa diubah kapan saja |
| **Model komisi** | Sepenuhnya dikonfigurasi Super Admin (per kategori, per paket, atau global) |
| **Payment gateway** | Keduanya: **Midtrans + Xendit** — Secret Key diubah via UI Super Admin |
| **Verifikasi toko** | Wajib upload KTP sebagai syarat minimum aktivasi toko |
| **Penarikan dana** | Kapan saja (paket Pro+), bulanan (paket Gratis/Starter); biaya admin diatur Super Admin |
| **Harga tema berbayar** | Ditentukan nanti — dikonfigurasi dari panel Super Admin |

### Prinsip Utama Platform

- **Super Admin memiliki kendali penuh** atas semua aspek platform tanpa perlu deployment ulang
- **Pemilik toko mengelola bisnis mereka secara mandiri** — pengiriman, stok, keuangan, tampilan
- **Pembeli mendapat pengalaman belanja yang mudah** lintas kategori dan toko
- **Semua konfigurasi penting bersifat dinamis** — tidak ada yang hardcoded

---

## 2. Analisis Kode yang Ada

### 2.1 Fondasi yang Sudah Dibangun

Berdasarkan analisis mendalam repositori (`artifacts/kopihub/`), estimasi **60–70% infrastruktur** sudah tersedia:

| Modul | Status | Catatan |
|---|---|---|
| **Multi-tenant shops** (`coffee_shops`) | ✅ Ada | Basis sistem toko marketplace |
| **Plan & Billing** (`admin.plans`, `plan_invoices`) | ✅ Ada | Basis sistem sewa fitur |
| **Entitlement System** (`get_my_entitlements`) | ✅ Ada | Kontrol akses per fitur per plan |
| **Plan Matrix** (`admin_update_min_months`) | ✅ Ada | Konfigurasi fitur per paket dari Super Admin |
| **Storefront per toko** (`/s/$slug/`) | ✅ Ada | Website toko dengan URL unik |
| **Custom Domain** (`domain.functions.ts`) | ✅ Ada | Custom domain per toko |
| **Sistem Tema** (classic, minimal, dark-luxe, vibrant) | ✅ Ada | Tema toko berbayar/gratis |
| **Panel Super Admin** (`/admin/*`) | ✅ Ada | Kelola toko, plan, domain, broadcast |
| **Manajemen Produk/Menu** | ✅ Ada | Perlu diperluas ke non-F&B |
| **Manajemen Order** | ✅ Ada | Perlu ditambah flow pengiriman fisik |
| **Loyalty & Promo** | ✅ Ada | Siap dimanfaatkan di marketplace |
| **KDS, Meja, POS** | ✅ Ada | Opsional — aktif hanya untuk kategori F&B |
| **Billing invoice manual** | ✅ Ada | Submit bukti, approve oleh admin |
| **Broadcast notifikasi** | ✅ Ada | Kirim pesan ke semua/segmen toko |
| **Audit log admin** | ✅ Ada | Log semua aktivitas |

### 2.2 Yang Perlu Dibangun

| Modul | Prioritas | Estimasi Kompleksitas |
|---|---|---|
| Halaman marketplace publik (discovery, search) | 🔴 Tinggi | Sedang |
| Sistem kategori bisnis dinamis (dari Super Admin) | 🔴 Tinggi | Rendah |
| Verifikasi toko (upload KTP, review admin) | 🔴 Tinggi | Rendah |
| Integrasi Midtrans + Xendit (ganti stub) | 🔴 Tinggi | Tinggi |
| Escrow system & saldo toko | 🔴 Tinggi | Tinggi |
| Sistem penarikan dana (withdrawal) | 🔴 Tinggi | Sedang |
| Komisi platform per transaksi | 🔴 Tinggi | Sedang |
| Sistem konfigurasi platform (nama, gateway secrets) | 🔴 Tinggi | Rendah |
| Produk non-F&B (variasi, produk digital) | 🟠 Sedang | Sedang |
| Manajemen pengiriman terintegrasi (API kurir) | 🟠 Sedang | Tinggi |
| Sistem tema berbayar (pembelian dari toko) | 🟠 Sedang | Sedang |
| Ulasan & rating (sudah ada komponen, belum diport) | 🟠 Sedang | Rendah |
| Builder konten toko sederhana | 🟡 Rendah | Tinggi |
| Notifikasi WhatsApp | 🟡 Rendah | Sedang |
| Mobile app | 🟡 Rendah | Sangat Tinggi |

---

## 3. Aktor & Peran Sistem

### 3.1 Super Admin (Platform Owner)

Satu atau beberapa akun dengan akses penuh ke seluruh platform. Bertanggung jawab atas:

**Konfigurasi Platform:**
- Mengubah nama platform, logo, warna brand, deskripsi
- Mengatur kredensial payment gateway (Midtrans & Xendit) via UI — tidak perlu akses server
- Mengatur komisi transaksi (global, per kategori, per paket)
- Mengatur ketentuan penarikan dana (jadwal, minimal, biaya admin)

**Manajemen Toko:**
- Melihat, mengelola, suspend, unsuspend semua toko
- Review dan approve/reject verifikasi KTP pemilik toko
- Override paket toko secara manual
- Reset password pemilik toko

**Konfigurasi Produk Platform:**
- Menambah/mengubah/menonaktifkan kategori bisnis
- Mengelola paket & harga sewa
- Menentukan fitur dan nilai entitlement per paket (Plan Matrix)
- Mengelola tema toko (gratis/berbayar, harga)

**Keuangan Platform:**
- Menyetujui/menolak bukti pembayaran sewa (manual)
- Menyetujui/menolak request penarikan dana toko
- Memantau semua transaksi dan pendapatan platform
- Mengatur biaya admin penarikan

**Operasional:**
- Broadcast notifikasi ke semua/segmen pemilik toko
- Memantau audit log semua aktivitas
- Mengelola domain kustom toko
- Mengelola konten halaman utama marketplace (banner, featured stores)

### 3.2 Pemilik Toko (Merchant / Tenant)

Pelaku usaha yang mendaftar dan membuka toko di platform. Setiap akun bisa memiliki satu toko utama (dengan multi-outlet opsional untuk paket tertentu).

**Onboarding:**
- Daftar akun dengan email atau Google
- Buat profil toko (nama, kategori bisnis, deskripsi, lokasi)
- Upload KTP untuk verifikasi (wajib sebelum toko aktif)
- Pilih paket langganan
- Bayar sewa bulan pertama
- Toko aktif setelah verifikasi KTP disetujui Super Admin

**Operasional Harian:**
- Kelola katalog produk (tambah, edit, hapus, stok)
- Pantau dan proses pesanan masuk
- Input nomor resi pengiriman
- Balas ulasan pelanggan
- Lihat laporan penjualan

**Keuangan:**
- Pantau saldo toko
- Request penarikan dana (jadwal sesuai paket)
- Bayar tagihan sewa tepat waktu
- Upgrade/downgrade paket

**Tampilan & Branding:**
- Pilih dan aktifkan tema toko
- Upload logo, banner, foto produk
- Atur warna dan tampilan toko
- Hubungkan custom domain sendiri

### 3.3 Staff / Karyawan Toko

Akun yang diundang oleh Pemilik Toko dengan akses terbatas sesuai peran yang ditetapkan.

**Peran yang Tersedia:**
| Peran | Akses |
|---|---|
| **Manager** | Semua fitur toko kecuali keuangan & billing |
| **Kasir (F&B)** | POS, pesanan, KDS |
| **Gudang** | Produk, stok, inventori |
| **Kurir Internal** | Pesanan, status pengiriman |
| **Customer Service** | Pesanan, ulasan, chat pelanggan |

### 3.4 Pembeli (Customer / End User)

Pengguna yang berbelanja di marketplace. Bisa sebagai tamu (guest) atau akun terdaftar.

**Tamu (Tanpa Akun):**
- Browsing semua produk dan toko
- Melihat detail produk
- Menambah ke keranjang (disimpan di browser)
- Checkout dengan input data manual

**Akun Terdaftar:**
- Semua fitur tamu
- Keranjang tersimpan di akun
- Simpan alamat pengiriman
- Riwayat semua pesanan
- Ikuti program loyalitas toko
- Tulis ulasan dan rating
- Lacak pesanan
- Wishlist produk

---

## 4. Kategori Bisnis

### 4.1 Kategori Default

Semua kategori ini dapat **ditambah, diubah urutan, diaktifkan, atau dinonaktifkan** oleh Super Admin kapan saja tanpa deployment ulang.

| Kode | Nama Tampilan | Contoh Produk | Fitur Tambahan |
|---|---|---|---|
| `fnb` | Food & Beverage | Makanan, minuman, kue, katering, kedai kopi | POS, KDS, Meja, Resep, HPP, Bahan Baku |
| `digital` | Produk Digital | Template desain, e-book, font, musik, preset, kode | Delivery file otomatis, tanpa pengiriman fisik |
| `craft` | Kerajinan Tangan | Anyaman, ukiran kayu, batik, gerabah, lilin, sabun | Variasi produk, estimasi waktu produksi, custom order |
| `fashion` | Fashion & Pakaian | Baju, celana, sepatu, tas, aksesoris, hijab | Variasi (ukuran, warna), size chart, panduan ukuran |
| `beauty` | Kecantikan & Perawatan | Skincare, makeup, parfum, perawatan rambut | Daftar bahan (ingredient list), nomor BPOM |
| `electronics` | Elektronik & Gadget | Aksesoris HP, charger, earphone, komponen | Garansi, nomor seri, spesifikasi teknis |
| `books` | Buku & Edukasi | Buku fisik, modul, materi belajar, komik | ISBN, edisi, jumlah halaman |
| `art` | Seni & Koleksi | Lukisan, fotografi, patung, memorabilia | Sertifikat keaslian (COA), edisi terbatas |
| `home` | Rumah & Dekorasi | Furnitur mini, bantal, karpet, lilin dekor, rak | Dimensi produk, material, panduan perawatan |
| `plants` | Tanaman & Pertanian | Tanaman hias, bibit, pupuk, media tanam, pot | Panduan perawatan, kebutuhan cahaya, media tanam |
| `food_packaged` | Makanan Kemasan | Keripik, sambal, kue kering, minuman botol, frozen | Berat bersih, tanggal kedaluwarsa, komposisi |
| `services` | Jasa & Layanan | Fotografi, desain grafis, konsultasi, les privat | Booking jadwal, tanpa pengiriman fisik |
| `kids` | Anak-anak & Mainan | Mainan edukatif, baju anak, perlengkapan bayi | Batas usia, material aman, sertifikasi SNI |
| `sports` | Olahraga & Outdoor | Perlengkapan gym, camping, sepeda, renang | Ukuran, material, panduan penggunaan |
| `pets` | Hewan Peliharaan | Pakan, aksesoris, kandang, grooming | Spesies target, berat rekomendasi |
| `other` | Lainnya | — | Fitur generik tanpa tambahan khusus |

### 4.2 Fitur Kategori di Super Admin

Setiap kategori memiliki konfigurasi:
- **Nama & Slug**: Nama tampilan publik dan URL slug
- **Ikon & Banner**: Gambar representasi kategori
- **Deskripsi**: Teks deskripsi halaman kategori
- **Urutan Tampil**: Urutan di halaman utama marketplace
- **Status**: Aktif / Nonaktif
- **Fitur Tambahan**: Toggle modul tambahan (POS, booking, dll.) yang relevan
- **Atribut Default Produk**: Field tambahan yang muncul saat pemilik toko mengisi produk (contoh: ukuran untuk fashion, BPOM untuk kecantikan)
- **Komisi Khusus**: Override komisi global untuk kategori tertentu (opsional)

---

## 5. Model Bisnis & Sistem Sewa

### 5.1 Sumber Pendapatan Platform

Platform menghasilkan pendapatan dari dua sumber utama yang semuanya **dikonfigurasi oleh Super Admin**:

**A. Biaya Sewa Bulanan (Subscription)**
- Pemilik toko membayar biaya tetap per bulan sesuai paket yang dipilih
- Dibayar di muka setiap bulan atau tahunan (dengan diskon)
- Toko yang tidak membayar akan dibatasi/dinonaktifkan otomatis

**B. Komisi Transaksi**
- Persentase dari setiap transaksi yang berhasil di platform
- Dihitung dari nilai pesanan sebelum ongkir
- Dapat dikonfigurasi berbeda-beda:
  - Komisi global (berlaku semua toko)
  - Override per kategori bisnis
  - Override per paket (paket lebih mahal = komisi lebih rendah)
  - Override per toko individual (kasus khusus)

### 5.2 Contoh Struktur Paket

> **Penting:** Nama paket, harga, dan fitur **sepenuhnya dikonfigurasi dari panel Super Admin** — tidak ada yang hardcoded. Tabel berikut hanya contoh awal.

| Paket | Contoh Harga | Target Pengguna |
|---|---|---|
| **Gratis** | Rp 0/bulan | Toko baru, uji coba, skala sangat kecil |
| **Starter** | Rp 99.000/bulan | Toko kecil, baru mulai berjualan |
| **Growth** | Rp 299.000/bulan | Toko berkembang, butuh lebih banyak fitur |
| **Pro** | Rp 599.000/bulan | Toko besar, fitur lengkap, komisi rendah |
| **Enterprise** | Harga Kustom | Franchise, multi-outlet, kebutuhan khusus |

### 5.3 Ketentuan Paket Gratis

Paket gratis (jika diaktifkan Super Admin) dengan batasan ketat:
- Batas produk sangat terbatas (contoh: 10 produk)
- Komisi transaksi lebih tinggi
- Tanpa custom domain
- Hanya tema gratis
- Penarikan dana bulanan saja
- Tanpa akses fitur lanjutan
- Watermark platform di halaman toko

### 5.4 Pembayaran Sewa

**Metode Pembayaran Sewa:**
- Transfer bank manual + upload bukti (Super Admin approve)
- Virtual Account otomatis (Midtrans / Xendit)
- QRIS
- Kartu kredit/debit (untuk paket Pro ke atas)

**Alur Pembayaran Sewa Manual:**
```
Pemilik Toko klik "Bayar" → Pilih metode → 
Upload bukti transfer → Notifikasi ke Super Admin → 
Super Admin review → Approve/Reject → 
Notifikasi ke Pemilik Toko → Akun diperpanjang / Ditolak (dengan alasan)
```

**Alur Pembayaran Sewa Otomatis:**
```
Sistem generate invoice H-7 sebelum jatuh tempo → 
Notifikasi ke pemilik toko (email + in-app) → 
Auto-charge jika metode terdaftar → 
Berhasil: Perpanjang otomatis → 
Gagal: Notifikasi, grace period X hari → 
Lewat grace period: Toko dinonaktifkan sementara
```

**Notifikasi Jatuh Tempo:**
- H-7: Reminder pertama (email + in-app)
- H-3: Reminder kedua (email + in-app)
- H-1: Reminder terakhir (email + in-app + opsional WA)
- H+1: Toko masuk grace period, banner peringatan di dashboard
- H+grace_period: Toko dinonaktifkan (dikonfigurasi Super Admin)

---

## 6. Sistem Entitlement & Fitur per Paket

### 6.1 Konsep Plan Matrix

Super Admin mengontrol **setiap fitur** yang didapat setiap paket melalui **Plan Matrix**. Setiap baris matriks adalah kombinasi: `[paket] x [fitur] = nilai`.

Tipe nilai entitlement:
- **Boolean**: Aktif / Tidak aktif (contoh: `custom_domain: true/false`)
- **Integer**: Angka batas (contoh: `max_products: 50`)
- **Float**: Persentase (contoh: `commission_rate: 0.05`)
- **String**: Pilihan (contoh: `support_level: "email"/"priority"/"dedicated"`)

### 6.2 Daftar Lengkap Entitlement

#### Katalog & Produk
| Kode Fitur | Tipe | Deskripsi | Contoh Nilai per Paket |
|---|---|---|---|
| `max_products` | Integer | Batas produk aktif | 10 / 50 / 200 / unlimited |
| `max_categories_product` | Integer | Batas kategori produk toko | 3 / 10 / 30 / unlimited |
| `product_variants` | Boolean | Variasi produk (ukuran, warna) | false / true / true / true |
| `digital_products` | Boolean | Upload & jual produk digital | false / false / true / true |
| `bulk_import_csv` | Boolean | Import produk via CSV | false / false / true / true |
| `product_videos` | Boolean | Upload video produk | false / false / true / true |
| `custom_product_attributes` | Boolean | Atribut produk kustom | false / false / true / true |
| `pre_order` | Boolean | Mode pre-order produk | false / true / true / true |
| `max_images_per_product` | Integer | Batas foto per produk | 3 / 5 / 10 / 20 |

#### Tampilan Toko
| Kode Fitur | Tipe | Deskripsi | Contoh Nilai per Paket |
|---|---|---|---|
| `custom_domain` | Boolean | Hubungkan domain sendiri | false / false / true / true |
| `free_themes` | Boolean | Akses tema gratis | true / true / true / true |
| `premium_themes` | Boolean | Akses tema berbayar | false / false / true / true |
| `custom_css` | Boolean | Edit CSS kustom | false / false / false / true |
| `remove_watermark` | Boolean | Hapus watermark platform | false / false / true / true |
| `custom_store_sections` | Boolean | Susun section halaman toko | false / false / true / true |
| `announcement_bar` | Boolean | Bar pengumuman di toko | false / true / true / true |

#### Penjualan & Transaksi
| Kode Fitur | Tipe | Deskripsi | Contoh Nilai per Paket |
|---|---|---|---|
| `max_orders_per_month` | Integer | Batas pesanan per bulan | 30 / 200 / 1000 / unlimited |
| `payment_gateway_online` | Boolean | Terima bayar online otomatis | false / true / true / true |
| `multi_payment_method` | Boolean | Berbagai metode bayar | false / true / true / true |
| `cod_payment` | Boolean | Bayar di tempat (COD) | false / false / true / true |
| `promo_codes` | Boolean | Buat kode promo / diskon | false / true / true / true |
| `flash_sale` | Boolean | Flash sale (waktu terbatas) | false / false / true / true |
| `bundling_products` | Boolean | Bundle produk | false / false / true / true |
| `commission_rate` | Float | Komisi platform (%) | 0.10 / 0.07 / 0.05 / 0.03 |

#### Pengiriman
| Kode Fitur | Tipe | Deskripsi | Contoh Nilai per Paket |
|---|---|---|---|
| `shipping_management` | Boolean | Atur kurir & ongkir | true / true / true / true |
| `courier_api_integration` | Boolean | Integrasi API kurir real-time | false / false / true / true |
| `free_shipping_promo` | Boolean | Program gratis ongkir | false / true / true / true |
| `same_day_delivery` | Boolean | Layanan same-day | false / false / true / true |
| `pickup_point` | Boolean | Ambil di toko | true / true / true / true |
| `multi_warehouse` | Boolean | Gudang di beberapa lokasi | false / false / false / true |

#### Operasional F&B (khusus kategori `fnb`)
| Kode Fitur | Tipe | Deskripsi | Contoh Nilai per Paket |
|---|---|---|---|
| `pos_system` | Boolean | Aplikasi kasir | false / true / true / true |
| `kds_display` | Boolean | Kitchen Display System | false / false / true / true |
| `table_management` | Boolean | Manajemen meja & QR order | false / false / true / true |
| `qr_ordering` | Boolean | Order via QR code di meja | false / false / true / true |
| `inventory_management` | Boolean | Stok & bahan baku | false / true / true / true |
| `recipe_costing` | Boolean | Perhitungan HPP resep | false / false / true / true |
| `multi_outlet` | Boolean | Beberapa cabang | false / false / false / true |
| `kitchen_printer` | Boolean | Integrasi printer dapur | false / false / true / true |
| `shift_management` | Boolean | Manajemen shift kasir | false / false / true / true |

#### Pelanggan & Loyalitas
| Kode Fitur | Tipe | Deskripsi | Contoh Nilai per Paket |
|---|---|---|---|
| `loyalty_program` | Boolean | Program poin pelanggan | false / true / true / true |
| `loyalty_tiers` | Boolean | Level tier loyalitas | false / false / true / true |
| `referral_program` | Boolean | Program referral pelanggan | false / false / true / true |
| `customer_segments` | Boolean | Segmentasi pelanggan | false / false / true / true |
| `email_marketing` | Boolean | Kirim email ke pelanggan | false / false / false / true |
| `wishlist` | Boolean | Fitur wishlist pembeli | false / true / true / true |

#### Analitik & Laporan
| Kode Fitur | Tipe | Deskripsi | Contoh Nilai per Paket |
|---|---|---|---|
| `basic_reports` | Boolean | Laporan penjualan dasar | true / true / true / true |
| `advanced_reports` | Boolean | Laporan lanjutan (profit, HPP) | false / false / true / true |
| `export_excel_pdf` | Boolean | Export laporan ke file | false / true / true / true |
| `customer_analytics` | Boolean | Analitik perilaku pelanggan | false / false / true / true |
| `realtime_dashboard` | Boolean | Dashboard real-time | false / false / true / true |
| `sales_comparison` | Boolean | Perbandingan periode | false / false / true / true |

#### Tim & Manajemen
| Kode Fitur | Tipe | Deskripsi | Contoh Nilai per Paket |
|---|---|---|---|
| `max_staff_accounts` | Integer | Batas akun karyawan | 1 / 3 / 10 / unlimited |
| `rbac_roles` | Boolean | Peran & izin akses kustom | false / false / true / true |
| `staff_audit_log` | Boolean | Log aktivitas karyawan | false / false / true / true |
| `attendance_management` | Boolean | Absensi (F&B) | false / false / true / true |

#### Dukungan & Integrasi
| Kode Fitur | Tipe | Deskripsi | Contoh Nilai per Paket |
|---|---|---|---|
| `support_level` | String | Level dukungan | "community" / "email" / "priority" / "dedicated" |
| `api_access` | Boolean | Akses REST API | false / false / false / true |
| `webhook` | Boolean | Webhook ke sistem eksternal | false / false / false / true |
| `third_party_sync` | Boolean | Sinkronisasi platform lain | false / false / false / true |
| `white_label` | Boolean | Hapus semua branding platform | false / false / false / true |

#### Keuangan & Penarikan
| Kode Fitur | Tipe | Deskripsi | Contoh Nilai per Paket |
|---|---|---|---|
| `withdrawal_schedule` | String | Jadwal penarikan | "monthly" / "monthly" / "anytime" / "anytime" |
| `withdrawal_min_amount` | Integer | Minimal penarikan (Rp) | 100000 / 100000 / 50000 / 50000 |
| `priority_withdrawal` | Boolean | Penarikan diproses lebih cepat | false / false / false / true |

---

## 7. Verifikasi Toko

### 7.1 Alur Verifikasi KTP (Wajib)

Setiap pemilik toko **wajib** menyelesaikan verifikasi identitas sebelum toko aktif dan bisa menerima pesanan.

**Alur Verifikasi:**
```
Daftar Akun → Isi Data Toko → Upload KTP →
Status: "Menunggu Verifikasi" →
Super Admin Review (dalam X jam kerja) →
  ├── Disetujui → Toko Aktif → Notifikasi ke Pemilik Toko
  └── Ditolak (dengan alasan) → Pemilik Toko upload ulang
```

### 7.2 Dokumen Verifikasi

**Minimum (Wajib):**
- Foto KTP yang jelas (tidak buram, tidak terpotong)
- Nama di KTP harus sesuai dengan nama akun

**Opsional (untuk fitur tertentu atau paket Enterprise):**
- Foto selfie dengan KTP (untuk verifikasi lanjutan)
- NPWP (untuk toko dengan transaksi besar, threshold diatur Super Admin)
- Surat izin usaha (SIUP/NIB untuk toko yang menjual produk regulasi)
- Sertifikasi BPOM (untuk toko kategori beauty/food dengan klaim tertentu)

### 7.3 Status Verifikasi

| Status | Deskripsi | Aksi Toko |
|---|---|---|
| `pending` | Menunggu review Super Admin | Tidak bisa terima pesanan |
| `in_review` | Sedang direview | Tidak bisa terima pesanan |
| `approved` | Terverifikasi | Toko aktif penuh |
| `rejected` | Ditolak dengan alasan | Upload ulang dokumen |
| `expired` | Dokumen kedaluwarsa | Perbarui dokumen |
| `suspended` | Toko disuspend oleh Super Admin | Tidak bisa beroperasi |

### 7.4 Tampilan Verifikasi di Toko

- Badge "Terverifikasi" pada halaman toko publik
- Level verifikasi: Basic (KTP), Verified Plus (+ NPWP), Trusted Merchant (+ sertifikasi)
- Filter di marketplace untuk menampilkan hanya toko terverifikasi

### 7.5 Re-verifikasi

- Jika ada perubahan nama bisnis atau pemilik
- Setiap 2 tahun (dikonfigurasi Super Admin)
- Jika Super Admin meminta secara manual

---

## 8. Sistem Pembayaran & Payment Gateway

### 8.1 Dua Gateway yang Didukung: Midtrans & Xendit

Platform menggunakan **keduanya secara bersamaan**. Super Admin bisa menentukan:
- Gateway mana yang digunakan sebagai default
- Metode pembayaran mana yang aktif dari masing-masing gateway
- Gateway mana yang digunakan untuk pembayaran sewa vs. pembayaran produk

**Konfigurasi Secret Key via UI Super Admin:**
```
Panel Super Admin → Pengaturan → Payment Gateway → 
  ├── Midtrans
  │   ├── Server Key: [input terenkripsi]
  │   ├── Client Key: [input terenkripsi]
  │   ├── Mode: Sandbox / Production
  │   └── [Test Koneksi]
  └── Xendit
      ├── API Key: [input terenkripsi]
      ├── Webhook Token: [input terenkripsi]
      ├── Mode: Test / Live
      └── [Test Koneksi]
```

Secret key disimpan **terenkripsi di database**, tidak pernah ditampilkan kembali di UI (hanya bisa di-update, tidak dilihat).

### 8.2 Metode Pembayaran yang Didukung

| Metode | Provider | Transaksi Produk | Bayar Sewa |
|---|---|---|---|
| Transfer Bank Manual | Platform | ✅ | ✅ |
| Virtual Account BCA | Midtrans | ✅ | ✅ |
| Virtual Account BNI | Midtrans | ✅ | ✅ |
| Virtual Account Mandiri | Midtrans | ✅ | ✅ |
| Virtual Account BRI | Midtrans + Xendit | ✅ | ✅ |
| Virtual Account Permata | Midtrans | ✅ | ✅ |
| Virtual Account CIMB | Xendit | ✅ | ✅ |
| QRIS | Midtrans + Xendit | ✅ | ✅ |
| GoPay | Midtrans | ✅ | ✅ |
| OVO | Xendit | ✅ | ✅ |
| Dana | Xendit | ✅ | ✅ |
| ShopeePay | Xendit | ✅ | ❌ |
| LinkAja | Xendit | ✅ | ❌ |
| Kartu Kredit/Debit | Midtrans + Xendit | ✅ | ✅ |
| Indomaret / Alfamart | Midtrans | ✅ | ✅ |
| COD (Bayar di tempat) | Platform | ✅ | ❌ |

### 8.3 Alur Pembayaran Transaksi Produk

```
Pembeli Checkout → Pilih Metode Bayar →
API Request ke Gateway (Midtrans/Xendit) →
  ├── Redirect ke halaman bayar (kartu kredit, GoPay, dll.)
  └── Tampilkan instruksi bayar (VA, QRIS, minimarket)

Pembeli Bayar →
Gateway kirim Webhook ke Platform →
Platform verifikasi signature webhook →
Update status order → "Menunggu Konfirmasi Toko" →
Notifikasi ke Pemilik Toko (order baru) →

Pemilik Toko proses & kirim →
Input nomor resi →
Notifikasi ke Pembeli →
Pembeli konfirmasi terima → (atau auto X hari) →
Dana masuk saldo toko (dikurangi komisi) →
Pemilik Toko bisa request penarikan
```

### 8.4 Alur COD

```
Pembeli pilih COD → Order dikonfirmasi → 
Pemilik Toko kirim barang → 
Kurir antar & terima uang cash →
Pemilik Toko konfirmasi pembayaran diterima →
Komisi platform dipotong dari saldo toko →
Jika saldo negatif: tagih saat perpanjangan sewa
```

### 8.5 Webhook Security

Setiap webhook dari gateway diverifikasi menggunakan:
- **Midtrans**: `x-callback-token` header verification
- **Xendit**: `x-callback-token` + HMAC signature verification

Webhook yang tidak terverifikasi langsung ditolak (HTTP 401).

### 8.6 Refund & Pembatalan

**Pembatalan sebelum diproses toko:**
- Refund otomatis ke metode bayar asal (jika payment gateway mendukung)
- Notifikasi ke pembeli & toko

**Pembatalan setelah diproses:**
- Perlu persetujuan pemilik toko
- Refund manual atau via gateway
- Status: `refund_pending` → `refund_processed`

**Sengketa (Dispute):**
- Pembeli bisa buka sengketa jika barang tidak sesuai/tidak datang
- Platform sebagai mediator
- Dana tetap ditahan selama proses sengketa
- Resolusi: dikembalikan ke pembeli atau dicairkan ke toko

---

## 9. Sistem Pengiriman

### 9.1 Tipe Pengiriman

| Tipe | Deskripsi | Cocok untuk |
|---|---|---|
| **Kurir Reguler** | JNE, JNT, SiCepat, Anteraja, Pos Indonesia, dll. | Semua produk fisik |
| **Same Day / Instant** | GoSend, GrabExpress, Lalamove, Paxel | Produk segar, urgent |
| **Kurir Mandiri** | Motor/mobil operasional toko sendiri | F&B, toko lokal, area terbatas |
| **Pickup di Toko** | Pembeli datang langsung | Semua tipe produk |
| **Digital Delivery** | File dikirim otomatis via email + link download | Produk digital |
| **Tanpa Pengiriman** | Jasa yang dilakukan di lokasi pembeli/toko | Kategori `services` |
| **Drop Point** | Titip ke mitra lokal | Fase 2 |

### 9.2 Konfigurasi Pengiriman oleh Pemilik Toko

Setiap toko mengatur pengiriman secara mandiri:

**Pengaturan Dasar:**
- Kurir yang diterima (pilih dari daftar yang diaktifkan platform)
- Wilayah yang dilayani (kota/provinsi/nasional/internasional)
- Berat default produk (jika tidak diisi per produk)
- Dimensi paket default

**Pengaturan Ongkir:**
- **Flat Rate**: Ongkir sama untuk semua tujuan
- **Berdasarkan Berat**: Dihitung otomatis dari berat produk × tarif per kg
- **Berdasarkan Jarak/Zona**: Tarif berbeda per zona pengiriman
- **Gratis Ongkir**: Tanpa syarat, atau dengan minimum pembelian
- **Berdasarkan API Kurir**: Real-time dari API RajaOngkir (jika entitlement aktif)

**Pengaturan Waktu:**
- Estimasi waktu pemrosesan (berapa hari sampai siap kirim)
- Jam operasional toko (pesanan setelah jam X diproses besok)
- Hari libur toko

### 9.3 Integrasi API Kurir (Fase 2)

- **RajaOngkir API**: Cek ongkir real-time, coverage area, estimasi hari
- **Otomatis pilih kurir tercepat/termurah** berdasarkan preferensi pembeli
- **Tracking otomatis**: Input nomor resi → sistem polling status dari API kurir
- **Label pengiriman digital**: Generate label siap cetak dari dalam dashboard

### 9.4 Alur Pengiriman Produk Digital

```
Pembeli bayar → 
Platform generate link download unik (expire X jam) →
Kirim via email + tampil di halaman pesanan →
Pembeli download file →
Order otomatis selesai setelah download atau X hari
```

### 9.5 Tracking Pesanan untuk Pembeli

- Halaman tracking di `/pesanan/:id`
- Timeline status: Pesanan Dibuat → Dibayar → Diproses → Dikirim → Diterima
- Nomor resi dengan link langsung ke website kurir
- Notifikasi otomatis setiap update status

---

## 10. Sistem Keuangan Platform & Toko

### 10.1 Alur Dana (Money Flow)

```
Pembeli bayar Rp 200.000 →
Platform terima dana →
Simpan di escrow (pending) →

Pesanan selesai (pembeli konfirmasi / auto X hari) →
Platform hitung komisi: misal 5% = Rp 10.000 →
Dana cair ke saldo toko: Rp 190.000 →

Pemilik Toko request penarikan →
Platform proses transfer →
Dana masuk rekening toko
```

### 10.2 Saldo Toko

Setiap toko memiliki **saldo internal** di platform:

| Status Saldo | Deskripsi |
|---|---|
| **Pending** | Dana dari pesanan yang belum selesai (sedang dalam escrow) |
| **Tersedia** | Dana yang bisa ditarik |
| **Ditahan** | Dana yang sedang dalam proses sengketa |
| **Ditarik** | Akumulasi total yang sudah ditarik |

### 10.3 Sistem Komisi (Dikonfigurasi Super Admin)

**Level Konfigurasi Komisi (dari prioritas tertinggi ke terendah):**
1. Override per toko individual
2. Override per paket langganan
3. Override per kategori bisnis
4. Komisi global platform

**Tipe Komisi:**
- **Persentase**: X% dari nilai pesanan (sebelum ongkir)
- **Flat + Persentase**: Rp Y + X% per transaksi
- **Minimal Komisi**: Tidak kurang dari Rp Z per transaksi

**Konfigurasi di Super Admin:**
```
Pengaturan → Komisi →
  ├── Komisi Global: 5%
  ├── Per Kategori:
  │   ├── F&B: 4%
  │   ├── Digital: 8%
  │   └── Fashion: 5%
  ├── Per Paket:
  │   ├── Gratis: 10%
  │   ├── Starter: 7%
  │   ├── Growth: 5%
  │   └── Pro: 3%
  └── Override Per Toko (daftar exception)
```

### 10.4 Sistem Penarikan Dana (Withdrawal)

**Jadwal Penarikan (berdasarkan paket):**

| Paket | Jadwal | Proses |
|---|---|---|
| Gratis | Sekali per bulan (tanggal tertentu) | Manual oleh Super Admin |
| Starter | Dua kali per bulan | Manual oleh Super Admin |
| Growth | Kapan saja (request langsung diproses) | Semi-otomatis |
| Pro | Kapan saja (prioritas, lebih cepat) | Otomatis / Prioritas |
| Enterprise | Kapan saja + jadwal otomatis | Otomatis |

**Biaya Admin Penarikan (Dikonfigurasi Super Admin):**
```
Pengaturan → Penarikan →
  ├── Biaya Admin:
  │   ├── Transfer BCA ke BCA: Rp 0
  │   ├── Transfer antar bank: Rp 6.500
  │   └── Transfer ke dompet digital: Rp 2.500
  ├── Minimal Penarikan:
  │   ├── Paket Gratis: Rp 100.000
  │   ├── Paket Starter: Rp 50.000
  │   └── Paket Pro+: Rp 10.000
  └── Maksimal Penarikan per Hari: Rp 50.000.000
```

**Alur Penarikan:**
```
Pemilik Toko klik "Tarik Dana" →
Masukkan jumlah (min/max check) →
Pilih rekening bank yang sudah terdaftar →
Konfirmasi (tampil estimasi diterima setelah biaya admin) →
Request terkirim →

Super Admin terima notifikasi →
Review request →
Approve: Transfer manual → Input nomor referensi → Selesai
  atau
Proses otomatis (Fase 2): Xendit Disbursement API →
Notifikasi ke Pemilik Toko
```

**Manajemen Rekening Bank:**
- Pemilik toko bisa daftarkan hingga 3 rekening bank
- Verifikasi nomor rekening (cek nama pemilik via API bank, Fase 2)
- Default rekening untuk penarikan

### 10.5 Laporan Keuangan Toko

**Laporan yang Tersedia:**
- Ringkasan pendapatan (hari/minggu/bulan/kustom)
- Rincian setiap transaksi (pesanan, komisi dipotong, dana masuk)
- Riwayat penarikan dana
- Tagihan sewa (histori invoice + status)
- Laporan pajak sederhana (total pendapatan kotor per periode)

**Export:**
- PDF: Laporan ringkasan dan invoice
- Excel/CSV: Data transaksi mentah untuk rekap manual

### 10.6 Dashboard Keuangan Super Admin

**Ringkasan:**
- GMV (Gross Merchandise Value) platform hari ini / bulan ini
- Total komisi terkumpul
- Total pendapatan sewa
- Total yang sudah dicairkan ke toko
- Total dana dalam escrow

**Manajemen:**
- Daftar semua request penarikan (pending, diproses, selesai, ditolak)
- Daftar semua invoice sewa (pending review, disetujui, ditolak)
- Laporan komisi per toko / kategori / periode
- Rekonsiliasi gateway (cocokkan dengan Midtrans/Xendit dashboard)

---

## 11. Sistem Tema Toko

### 11.1 Tema yang Sudah Ada

| Kode | Nama | Deskripsi | Status |
|---|---|---|---|
| `classic` | Classic | Clean, minimalis, universal | ✅ Tersedia |
| `minimal` | Minimal | Ultra-clean, fokus produk | ✅ Tersedia |
| `dark-luxe` | Dark Luxe | Gelap, premium, elegan | ✅ Parsial |
| `vibrant` | Vibrant | Colorful, energik | ✅ Parsial |

### 11.2 Tema yang Direncanakan

| Kode | Nama | Target Kategori | Tipe |
|---|---|---|---|
| `natural` | Natural & Earthy | Kerajinan, Tanaman, Makanan organik | Rencana |
| `bold` | Bold & Modern | Elektronik, Olahraga, Gaming | Rencana |
| `elegant` | Elegant | Perhiasan, Parfum, Kecantikan premium | Rencana |
| `playful` | Playful | Anak-anak, Mainan, Snack | Rencana |
| `professional` | Professional | Jasa, Konsultan, Buku, Edukasi | Rencana |
| `artisan` | Artisan | Seni, Kerajinan eksklusif | Rencana |
| `fresh` | Fresh & Clean | F&B sehat, Minuman | Rencana |
| `magazine` | Magazine Style | Fashion, Lifestyle | Rencana |

### 11.3 Konfigurasi Tema di Super Admin

Setiap tema memiliki konfigurasi:
- **Nama & Deskripsi**: Tampil di halaman pilih tema
- **Preview Screenshot**: Gambar preview tema
- **Status**: Aktif / Nonaktif
- **Tipe**: Gratis / Berbayar
- **Harga** (jika berbayar): Dikonfigurasi Super Admin — sekali beli atau per bulan
- **Entitlement Required**: Minimal paket yang bisa akses tema ini
- **Kategori Rekomendasi**: Kategori bisnis yang paling cocok

### 11.4 Cara Toko Menggunakan Tema Berbayar

**Pembelian Sekali Bayar:**
```
Pilih tema berbayar → Konfirmasi harga →
Bayar via saldo toko atau metode pembayaran →
Tema aktif permanen di toko tersebut
```

**Sewa Bulanan (jika model ini dipilih Super Admin):**
```
Tema aktif selama berlangganan →
Nonaktif jika tidak perpanjang →
Toko kembali ke tema gratis
```

### 11.5 Kustomisasi dalam Tema

Terlepas dari tema yang dipilih, setiap pemilik toko bisa kustomisasi:
- **Warna Utama**: Accent color toko (primary/secondary)
- **Logo**: Upload logo toko
- **Banner**: Banner header toko + banner promosi
- **Font**: Pilih dari daftar Google Fonts yang disediakan (terbatas)
- **Layout Produk**: Grid (2/3/4 kolom) atau List
- **Konten Section**: Aktifkan/nonaktifkan section (hero, kategori, terlaris, tentang)
- **Custom CSS** (paket Pro): Edit CSS bebas

---

## 12. Fitur Detail per Modul

### 12.1 Marketplace Discovery (Halaman Publik)

#### Halaman Utama (`/`)
- **Navbar**: Logo platform, search bar, kategori dropdown, keranjang, login/daftar
- **Hero Banner**: Gambar/carousel yang dikelola Super Admin (max 5 slide)
- **Kategori Bisnis**: Grid semua kategori aktif dengan ikon dan jumlah toko
- **Toko Unggulan**: Toko yang dipromosikan Super Admin (bayar atau pilihan editorial)
- **Produk Terlaris**: Top N produk berdasarkan total transaksi (30 hari terakhir)
- **Produk Terbaru**: Feed produk baru dari semua toko
- **Flash Sale**: Section khusus jika ada toko yang menjalankan flash sale
- **Toko Baru**: Toko yang baru bergabung (badge "Baru")
- **Footer**: Tentang, FAQ, Syarat & Ketentuan, Privasi, Kontak, media sosial

#### Halaman Kategori (`/kategori/:slug`)
- Banner kategori (dari Super Admin)
- Deskripsi kategori
- Filter: Sub-kategori, Lokasi kota, Rentang harga, Rating minimal, Gratis ongkir, Verifikasi toko
- Sortir: Terlaris, Terbaru, Harga terendah, Rating tertinggi
- Grid toko dengan card: Foto, nama, rating, lokasi, jumlah produk
- Grid produk dengan card: Foto, nama, toko asal, harga, rating

#### Halaman Pencarian (`/search`)
- Input pencarian
- Filter lengkap (sama dengan halaman kategori)
- Hasil: Tab "Produk" dan "Toko"
- Highlight kata kunci yang dicari
- Saran pencarian (autocomplete dari nama produk/toko populer)
- Pencarian tanpa hasil: Tampilkan rekomendasi produk serupa

### 12.2 Halaman Toko Individual (`/toko/:slug`)

- **Header Toko**: Logo, nama, rating, badge verifikasi, tombol Ikuti, lokasi
- **Info Bar**: Jam buka, status (Buka/Tutup), jumlah produk, jumlah ulasan
- **Banner Toko**: Banner yang diatur pemilik
- **Navigasi**: Semua Produk / Kategori toko / Tentang / Ulasan
- **Katalog Produk**: Filter dan sortir dalam toko, grid produk
- **Tentang Toko**: Deskripsi, kebijakan toko, info kontak
- **Ulasan Toko**: Rating keseluruhan + daftar ulasan pembeli
- **Produk Populer**: Widget sidebar atau section khusus

**Custom Domain:**
- Jika toko punya custom domain, halaman ini bisa diakses via domain mereka
- Tampilan sama, hanya domain yang berbeda
- Navbar bisa menampilkan logo toko saja (tanpa logo platform) jika entitlement `white_label` aktif

### 12.3 Halaman Detail Produk (`/toko/:slug/produk/:id`)

- **Galeri**: Foto utama + thumbnail (swipe di mobile, hover zoom di desktop), video (jika ada)
- **Info Produk**:
  - Nama produk
  - Harga (dengan harga coret jika ada diskon)
  - Rating produk + jumlah ulasan
  - Deskripsi lengkap (rich text/markdown)
  - Atribut tambahan (sesuai kategori: ukuran, bahan, BPOM, dll.)
- **Variasi** (jika ada): Pilih ukuran, warna, tipe — harga dan stok update otomatis
- **Stok**: Jumlah tersisa (jika aktifkan di toko), atau "Tersedia" / "Habis"
- **Pengiriman**:
  - Estimasi ongkir: Input kota tujuan → tampil opsi kurir + harga + estimasi
  - Estimasi tiba: Berdasarkan waktu proses toko + estimasi kurir
- **Tombol Aksi**: Tambah ke Keranjang, Beli Sekarang, Tambah ke Wishlist
- **Info Toko**: Mini card toko (logo, nama, rating, tombol Kunjungi Toko)
- **Produk Lain dari Toko**: Carousel produk serupa
- **Ulasan Produk**: Rating per aspek (kualitas, sesuai deskripsi, pengiriman), daftar ulasan dengan foto

### 12.4 Keranjang Belanja (`/keranjang`)

- Produk dikelompokkan per toko
- Atur jumlah masing-masing produk
- Hapus produk / kosongkan keranjang
- Estimasi ongkir per toko (pilih kurir)
- Kode promo / voucher (per toko atau platform-wide)
- Ringkasan total: Subtotal + Ongkir + Diskon = Total
- Checklist produk (bisa checkout hanya produk tertentu)
- Simpan ke "Beli Nanti" (keranjang sekunder)
- Notifikasi jika produk yang di keranjang habis stok atau harga berubah

### 12.5 Checkout (`/checkout`)

**Step 1 — Alamat Pengiriman:**
- Pilih dari alamat tersimpan, atau tambah baru
- Form: Nama penerima, No. HP, Provinsi, Kota, Kecamatan, Kode Pos, Alamat lengkap, Label (Rumah/Kantor/Lainnya)
- Autocomplete alamat (integrasi API Kelurahan/Kodepos Indonesia)

**Step 2 — Pengiriman per Toko:**
- Setiap toko tampil terpisah
- Pilih metode pengiriman (kurir + layanan)
- Tampil estimasi hari dan biaya
- Catatan untuk toko (opsional)

**Step 3 — Pembayaran:**
- Kode promo / voucher
- Ringkasan detail: Produk, ongkir per toko, diskon, total akhir
- Pilih metode pembayaran
- Tombol "Bayar Sekarang"
- Centang persetujuan S&K

**Step 4 — Konfirmasi:**
- Order ID
- Ringkasan pesanan
- Instruksi pembayaran (jika VA/QRIS/minimarket)
- Countdown timer pembayaran
- Tombol ke halaman pesanan

### 12.6 Dashboard Toko — Semua Modul

#### A. Beranda Dashboard (`/app/`)
```
Ringkasan Hari Ini:
  ├── Pesanan Baru: X (perlu dikonfirmasi)
  ├── Pesanan Diproses: Y
  ├── Pendapatan Hari Ini: Rp Z
  └── Produk Stok Menipis: N item

Grafik: Penjualan 7/30 hari (bar chart)

Pesanan Terbaru (5 terakhir) [tombol Lihat Semua]

Notifikasi Penting:
  ├── Tagihan sewa jatuh tempo H-X
  ├── Produk kehabisan stok
  └── Ulasan baru belum dibalas
```

#### B. Katalog Produk (`/app/produk`)
- Tabel produk: Foto, nama, kategori, harga, stok, status, aksi
- Filter: Kategori, Status (aktif/nonaktif/habis), Sortir
- Pencarian produk
- Tombol: Tambah Produk, Import CSV, Export
- Aksi bulk: Aktifkan/nonaktifkan, hapus, ubah harga
- **Form Tambah/Edit Produk:**
  - Nama, deskripsi (rich text editor)
  - Kategori produk (dalam toko)
  - Harga jual, harga modal (HPP, opsional)
  - Harga coret (harga sebelum diskon)
  - Stok (angka atau "tidak terbatas")
  - Berat, dimensi (untuk hitung ongkir)
  - Foto (drag & drop, urutan bisa diatur)
  - Video (opsional)
  - Variasi (toggle → tambah opsi ukuran/warna/dll.)
  - Atribut tambahan (sesuai kategori bisnis)
  - Status (aktif/draft)
  - File digital (jika produk digital)
  - Pre-order toggle + estimasi pengiriman

#### C. Manajemen Pesanan (`/app/pesanan`)
- Tab: Semua / Menunggu Konfirmasi / Diproses / Dikirim / Selesai / Dibatalkan
- Tabel: No. pesanan, nama pembeli, produk, total, status, tanggal
- Filter: Status, Tanggal, Metode bayar, Kurir
- **Detail Pesanan:**
  - Info pembeli: Nama, alamat, kontak
  - Rincian produk + variasi + jumlah + harga
  - Metode pembayaran + status pembayaran
  - Metode pengiriman yang dipilih
  - Tombol aksi sesuai status:
    - Konfirmasi pesanan (→ Diproses)
    - Input nomor resi (→ Dikirim)
    - Cetak invoice
    - Cetak packing list
    - Proses pembatalan (jika pembeli request)
    - Proses refund

#### D. Manajemen Pengiriman (`/app/pengiriman`)
- Daftar kurir yang tersedia di platform
- Toggle aktifkan/nonaktifkan kurir
- Pengaturan ongkir per kurir (flat, berat, zona)
- Pengaturan gratis ongkir
- Wilayah pengiriman yang dilayani
- Waktu pemrosesan
- Jam operasional + hari libur

#### E. Keuangan Toko (`/app/keuangan`)
- **Ringkasan Saldo:**
  ```
  Saldo Tersedia:    Rp 1.250.000  [Tarik Dana]
  Saldo Pending:     Rp   350.000
  Saldo Ditahan:     Rp         0
  Total Ditarik:     Rp 5.000.000
  ```
- **Grafik Pendapatan**: Harian/mingguan/bulanan
- **Riwayat Transaksi**: Filter per tipe (masuk/keluar), periode, status
- **Request Penarikan Dana:**
  - Formulir: Jumlah, pilih rekening
  - Estimasi tiba (berdasarkan jadwal paket)
  - Histori request + status

#### F. Tagihan Sewa (`/app/billing`)
- Status paket aktif: Nama paket, tanggal aktif, tanggal kadaluwarsa
- Fitur yang aktif (daftar entitlement)
- Tombol: Perpanjang, Upgrade Paket
- Riwayat invoice: Nomor, periode, jumlah, status, tombol download PDF
- Tombol bayar (untuk invoice yang belum dibayar)
- Upload bukti transfer (untuk bayar manual)

#### G. Tampilan Toko (`/app/tampilan`)
- **Pilih Tema:**
  - Grid tema (gratis + berbayar yang sudah dibeli/sewa)
  - Badge "Aktif" pada tema yang sedang dipakai
  - Preview tema sebelum pilih
  - Tombol "Gunakan" / "Beli" (untuk tema berbayar)
- **Kustomisasi:**
  - Upload logo (recommended size ditampilkan)
  - Upload banner header (multiple, dengan urutan)
  - Warna utama (color picker)
  - Warna aksen
  - Pilih font
  - Layout produk (grid 2/3/4 atau list)
- **Section Halaman:**
  - Toggle masing-masing section (hero, kategori, terlaris, tentang, dll.)
  - Drag untuk atur urutan section
- **Preview**: Tombol "Preview Toko" membuka preview di tab baru

#### H. Custom Domain (`/app/domain`)
- Status domain (tidak ada / pending verifikasi / aktif / error)
- Input domain baru
- Instruksi DNS: "Tambahkan CNAME record berikut ke DNS domain Anda"
- Tombol "Verifikasi Domain" (cek DNS)
- Status SSL (pending / aktif / error)
- Tombol hapus domain

#### I. Pelanggan (`/app/pelanggan`)
- Daftar pelanggan yang pernah beli di toko
- Info: Nama, email, total pembelian, jumlah pesanan, terakhir beli
- Detail pelanggan: Riwayat pesanan, poin loyalitas
- Export data pelanggan (CSV)

#### J. Program Loyalitas (`/app/loyalitas`)
- Aktifkan/nonaktifkan program
- Pengaturan poin: Berapa poin per Rp 1.000 transaksi
- Pengaturan expiry poin
- Tier loyalitas (Bronze/Silver/Gold/Platinum) dengan benefit masing-masing
- Buat reward yang bisa ditukar poin
- Konfigurasi referral program
- Dashboard: Total member, poin beredar, poin ditukar

#### K. Promosi (`/app/promosi`)
- Buat kode promo:
  - Tipe: Persentase / Nominal
  - Minimum pembelian
  - Maksimal diskon (untuk tipe persentase)
  - Batas penggunaan (per user / total)
  - Masa berlaku
  - Produk/kategori yang berlaku
- Flash sale:
  - Pilih produk, set harga sale, waktu mulai/selesai, kuota
- Gratis ongkir:
  - Minimum pembelian, berlaku untuk kurir apa, masa berlaku

#### L. Ulasan & Rating (`/app/ulasan`)
- Semua ulasan produk/toko
- Filter: Bintang (1-5), Status (sudah/belum dibalas), Produk tertentu
- Balas ulasan
- Laporkan ulasan tidak pantas (ke Super Admin)
- Statistik: Rata-rata rating, distribusi bintang

#### M. Laporan (`/app/laporan`)
- **Laporan Penjualan**: Grafik dan tabel per produk, kategori, periode
- **Laporan Produk**: Terlaris, paling dilihat, conversion rate
- **Laporan Pelanggan**: Pembeli baru vs. repeat, nilai rata-rata pesanan
- **Laporan Pengiriman**: Kurir yang paling dipakai, rata-rata waktu kirim
- **F&B Khusus**: Laporan HPP, margin, bahan baku, shift kasir
- **Export**: PDF / Excel untuk semua laporan

#### N. Karyawan (`/app/karyawan`)
- Daftar karyawan aktif dengan peran
- Undang karyawan via email
- Ubah peran karyawan
- Nonaktifkan akun karyawan
- Log aktivitas karyawan (jika entitlement aktif)

#### O. Pengaturan Toko (`/app/pengaturan`)
- Profil toko: Nama, deskripsi, kategori, lokasi, kontak, jam buka
- Notifikasi: Pilih notif apa yang diterima dan via apa (email/in-app/WA)
- Keamanan: Ubah password, 2FA (Fase 2)
- Integrasi API (jika entitlement aktif)
- Zona waktu dan bahasa toko
- Kebijakan toko: Retur, pengiriman, garansi (teks bebas yang tampil di halaman toko)
- Hapus toko (dengan konfirmasi)

### 12.7 Panel Super Admin — Semua Modul

#### A. Dashboard Super Admin (`/admin/`)
```
Ringkasan Platform (Hari Ini / 30 Hari):
  ├── Toko Aktif: X (Y baru bulan ini)
  ├── GMV: Rp Z
  ├── Komisi Terkumpul: Rp A
  ├── Pendapatan Sewa: Rp B
  └── Pesanan: N transaksi

Alert:
  ├── Verifikasi KTP Menunggu: X toko
  ├── Invoice Sewa Pending Review: Y
  └── Request Penarikan Pending: Z

Grafik: GMV, toko aktif, pendapatan (harian/mingguan/bulanan)
```

#### B. Manajemen Toko (`/admin/toko`)
- Tabel: Nama toko, pemilik, kategori, paket, status verifikasi, status toko, tanggal daftar, total GMV
- Filter: Kategori, Paket, Status, Verifikasi, Tanggal
- **Detail Toko (`/admin/toko/:id`):**
  - Info lengkap toko dan pemilik
  - Status verifikasi KTP + tombol approve/reject
  - Paket aktif + tombol override manual
  - Statistik: GMV, total pesanan, rating
  - Riwayat invoice sewa
  - Riwayat request penarikan
  - Log aktivitas toko
  - Tombol: Suspend, Unsuspend, Reset Password Pemilik, Kirim Notifikasi

#### C. Manajemen Paket (`/admin/paket`)
- Daftar semua paket aktif/nonaktif
- Buat paket baru: Nama, deskripsi, harga bulanan, harga tahunan, urutan
- Aktifkan/nonaktifkan paket
- Statistik penggunaan (berapa toko per paket)
- **Plan Matrix (`/admin/paket/:id/matrix`):**
  - Tabel: Fitur (baris) × Nilai (kolom)
  - Edit langsung nilai setiap entitlement
  - History perubahan (audit trail)
  - Undo perubahan (optimistic concurrency)

#### D. Manajemen Kategori Bisnis (`/admin/kategori`)
- Daftar semua kategori
- Tambah/edit/hapus kategori
- Toggle aktif/nonaktif
- Atur urutan (drag & drop)
- Upload ikon dan banner kategori
- Edit atribut produk default per kategori
- Override komisi per kategori (opsional)

#### E. Manajemen Tema (`/admin/tema`)
- Daftar semua tema
- Tambah tema baru: Upload file tema, nama, preview screenshot, kategori rekomendasi
- Toggle aktif/nonaktif
- Atur tipe: Gratis / Berbayar
- Atur harga tema berbayar (jika berbayar)
- Atur model harga: Sekali beli / Sewa bulanan
- Lihat berapa toko yang menggunakan setiap tema

#### F. Konfigurasi Payment Gateway (`/admin/pengaturan/payment-gateway`)
- **Midtrans:**
  - Server Key (input, masked)
  - Client Key (input, masked)
  - Mode: Sandbox / Production
  - Metode aktif (toggle per metode)
  - Tombol "Test Koneksi"
  - Tombol "Simpan" (encrypt sebelum save)
- **Xendit:**
  - API Key (input, masked)
  - Webhook Verification Token (input, masked)
  - Mode: Test / Live
  - Metode aktif (toggle per metode)
  - Tombol "Test Koneksi"
- **Pengaturan Umum:**
  - Gateway default untuk transaksi produk
  - Gateway default untuk pembayaran sewa
  - Timeout pembayaran (menit)

#### G. Konfigurasi Platform (`/admin/pengaturan/platform`)
- Nama platform (tampil di semua halaman)
- Tagline / deskripsi singkat
- Logo platform (upload)
- Favicon
- Warna brand (primary, secondary, accent)
- Email pengirim notifikasi
- Nomor WhatsApp customer service
- Media sosial (link)
- Alamat perusahaan (untuk invoice)
- Syarat & Ketentuan (rich text editor)
- Kebijakan Privasi (rich text editor)

#### H. Konfigurasi Komisi (`/admin/pengaturan/komisi`)
- Komisi global (%)
- Override per kategori (tabel)
- Override per paket (tabel)
- Komisi minimal per transaksi (Rp)
- Toggle: Apakah komisi termasuk/tidak termasuk ongkir

#### I. Konfigurasi Penarikan Dana (`/admin/pengaturan/penarikan`)
- Biaya admin per metode transfer
- Minimal penarikan per paket
- Jadwal penarikan per paket
- Grace period setelah request (berapa hari diproses)
- Maksimal penarikan per hari
- Whitelist bank yang didukung

#### J. Keuangan Platform (`/admin/keuangan`)
- **Invoice Sewa:**
  - Daftar dengan filter: Pending Review / Disetujui / Ditolak / Semua
  - Detail invoice + preview bukti transfer
  - Tombol: Approve / Reject (dengan alasan)
- **Request Penarikan:**
  - Daftar dengan filter: Pending / Diproses / Selesai / Ditolak
  - Detail: Toko, jumlah, rekening tujuan
  - Tombol: Approve → Input nomor referensi transfer / Tolak (dengan alasan)
- **Laporan Keuangan Platform:**
  - Total pendapatan (komisi + sewa) per periode
  - Breakdown per kategori, per paket
  - Export Excel

#### K. Verifikasi KTP (`/admin/verifikasi`)
- Daftar toko yang menunggu verifikasi
- Detail: Nama toko, pemilik, KTP yang diupload (tampil gambar)
- Tombol: Approve / Reject (dengan alasan)
- Riwayat verifikasi

#### L. Manajemen Domain (`/admin/domain`)
- Daftar semua custom domain terdaftar
- Status: Pending verifikasi / Aktif / Error DNS / SSL Error
- Tombol: Force Verify / Revoke / Blacklist domain

#### M. Konten Marketplace (`/admin/konten`)
- **Banner Halaman Utama:**
  - Upload banner (judul, link tujuan, urutan, masa aktif)
  - Preview banner
  - Toggle aktif/nonaktif
- **Toko Unggulan (Featured):**
  - Pilih toko dari daftar
  - Atur masa featured (tanggal mulai/selesai)
  - Upload banner toko featured (opsional)
- **Halaman Statis:**
  - Edit Tentang Platform
  - Edit FAQ
  - Edit cara jual/cara beli

#### N. Broadcast Notifikasi (`/admin/broadcast`)
- Tulis judul + pesan
- Target: Semua toko / Filter per paket / Filter per kategori / Toko tertentu
- Jadwal: Kirim sekarang / Jadwalkan nanti
- Channel: In-app / Email / Keduanya
- Riwayat broadcast yang sudah dikirim

#### O. Audit Log (`/admin/audit`)
- Log semua aktivitas Super Admin (siapa, apa, kapan, IP)
- Log aktivitas sensitif pemilik toko (login, ubah rekening, request penarikan)
- Filter: Tipe aksi, User, Tanggal
- Export log

#### P. Monitoring (`/admin/monitoring`)
- Status semua layanan (API, Gateway, database)
- Error rate transaksi
- Pesanan yang stuck (bayar tapi belum update status)
- Penarikan yang overdue (sudah approve tapi belum transfer)

---

## 13. Arsitektur Teknis & Database

### 13.1 Stack Teknologi (Dipertahankan dari Kode yang Ada)

| Layer | Teknologi |
|---|---|
| Frontend | React 18 + Vite + TanStack Router + TanStack Query |
| UI Components | shadcn/ui + Tailwind CSS v4 |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| Storage | Supabase Storage (foto produk, KTP, logo, dll.) |
| Real-time | Supabase Realtime (pesanan, notifikasi) |
| Payment | Midtrans + Xendit (via API + Webhook) |
| Email | Supabase Auth emails + Resend / SendGrid (Fase 2) |
| CDN | Supabase Storage CDN |

### 13.2 Perubahan & Tambahan Database

#### Tabel Baru

```sql
-- Konfigurasi platform (nama, gateway secrets, dll.)
CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  value_encrypted TEXT, -- Untuk secrets (gateway keys)
  is_encrypted BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Kategori bisnis (dinamis)
CREATE TABLE business_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url TEXT,
  banner_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  commission_override NUMERIC(5,4), -- NULL = gunakan komisi global
  product_attributes JSONB DEFAULT '[]', -- Atribut tambahan produk
  enabled_features TEXT[] DEFAULT '{}', -- Modul yang relevan
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Produk (generalisasi dari menu_items)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  product_category_id UUID REFERENCES product_categories(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  description TEXT,
  price NUMERIC(15,2) NOT NULL,
  compare_price NUMERIC(15,2), -- Harga coret
  cost_price NUMERIC(15,2), -- HPP
  sku VARCHAR(100),
  weight_grams INTEGER,
  length_cm NUMERIC(8,2),
  width_cm NUMERIC(8,2),
  height_cm NUMERIC(8,2),
  stock INTEGER, -- NULL = tidak terbatas
  low_stock_threshold INTEGER DEFAULT 5,
  is_digital BOOLEAN DEFAULT false,
  digital_file_url TEXT,
  digital_file_name TEXT,
  is_pre_order BOOLEAN DEFAULT false,
  pre_order_days INTEGER,
  images JSONB DEFAULT '[]', -- [{url, alt, order}]
  video_url TEXT,
  attributes JSONB DEFAULT '{}', -- Atribut sesuai kategori bisnis
  tags TEXT[] DEFAULT '{}',
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  total_sold INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2),
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kategori produk dalam toko (bukan kategori bisnis)
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Variasi produk
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- "Merah - XL"
  sku VARCHAR(100),
  price_adjustment NUMERIC(15,2) DEFAULT 0,
  stock INTEGER,
  attributes JSONB NOT NULL DEFAULT '{}', -- {"ukuran": "XL", "warna": "Merah"}
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Opsi variasi produk
CREATE TABLE product_variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL, -- "Ukuran"
  values TEXT[] NOT NULL, -- ["S", "M", "L", "XL"]
  sort_order INTEGER DEFAULT 0
);

-- Verifikasi toko
CREATE TABLE shop_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  ktp_url TEXT NOT NULL,
  selfie_ktp_url TEXT,
  npwp_url TEXT,
  business_license_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' 
    CHECK (status IN ('pending','in_review','approved','rejected','expired')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  expires_at TIMESTAMPTZ, -- Kapan harus re-verifikasi
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alamat pembeli
CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label VARCHAR(50) DEFAULT 'Rumah',
  recipient_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  district VARCHAR(100), -- Kecamatan
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  country VARCHAR(50) DEFAULT 'Indonesia',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pengiriman pesanan
CREATE TABLE order_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  courier_code VARCHAR(50), -- jne, jnt, sicepat, dll.
  courier_name VARCHAR(100),
  service_type VARCHAR(50), -- REG, YES, OKE
  tracking_number VARCHAR(100),
  tracking_url TEXT,
  estimated_delivery_date DATE,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'pending',
  shipping_cost NUMERIC(15,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pengaturan pengiriman toko
CREATE TABLE shop_shipping_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE UNIQUE,
  enabled_couriers TEXT[] DEFAULT '{}', -- Kode kurir yang aktif
  default_weight_grams INTEGER DEFAULT 500,
  processing_days INTEGER DEFAULT 1,
  operating_hours JSONB, -- Jam operasional per hari
  ships_to TEXT[] DEFAULT '{"ID"}', -- ISO country codes
  flat_rate NUMERIC(15,2), -- NULL = tidak flat rate
  free_shipping_min_order NUMERIC(15,2), -- NULL = tidak ada gratis ongkir
  use_courier_api BOOLEAN DEFAULT false,
  custom_zones JSONB DEFAULT '[]', -- Zona pengiriman kustom
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Saldo toko
CREATE TABLE shop_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE UNIQUE,
  balance_available NUMERIC(15,2) DEFAULT 0,
  balance_pending NUMERIC(15,2) DEFAULT 0,
  balance_held NUMERIC(15,2) DEFAULT 0,
  total_earned NUMERIC(15,2) DEFAULT 0,
  total_withdrawn NUMERIC(15,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transaksi saldo toko
CREATE TABLE shop_balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL, -- credit, debit, hold, release
  amount NUMERIC(15,2) NOT NULL,
  reference_type VARCHAR(50), -- order, withdrawal, commission, refund
  reference_id UUID,
  description TEXT,
  balance_before NUMERIC(15,2),
  balance_after NUMERIC(15,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Komisi platform per transaksi
CREATE TABLE platform_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  shop_id UUID NOT NULL REFERENCES coffee_shops(id),
  gross_amount NUMERIC(15,2) NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL,
  commission_amount NUMERIC(15,2) NOT NULL,
  net_amount NUMERIC(15,2) NOT NULL,
  commission_source VARCHAR(30), -- global, category, plan, shop_override
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Request penarikan dana
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES coffee_shops(id),
  amount NUMERIC(15,2) NOT NULL,
  admin_fee NUMERIC(15,2) DEFAULT 0,
  net_amount NUMERIC(15,2) NOT NULL, -- amount - admin_fee
  bank_name VARCHAR(100) NOT NULL,
  bank_account_number VARCHAR(50) NOT NULL,
  bank_account_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending','approved','processing','completed','rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  transfer_reference VARCHAR(100),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rekening bank toko
CREATE TABLE shop_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  bank_name VARCHAR(100) NOT NULL,
  bank_code VARCHAR(10),
  account_number VARCHAR(50) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ulasan produk
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES coffee_shops(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  order_id UUID REFERENCES orders(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  rating_quality INTEGER CHECK (rating_quality BETWEEN 1 AND 5),
  rating_match INTEGER CHECK (rating_match BETWEEN 1 AND 5),
  rating_delivery INTEGER CHECK (rating_delivery BETWEEN 1 AND 5),
  comment TEXT,
  images TEXT[] DEFAULT '{}',
  owner_reply TEXT,
  owner_replied_at TIMESTAMPTZ,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Wishlist pembeli
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Laporan abuse
CREATE TABLE abuse_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id),
  target_type VARCHAR(30) NOT NULL, -- shop, product, review
  target_id UUID NOT NULL,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Log webhook pembayaran
CREATE TABLE payment_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway VARCHAR(20) NOT NULL, -- midtrans, xendit
  event_type VARCHAR(100),
  payload JSONB NOT NULL,
  signature_valid BOOLEAN,
  processed BOOLEAN DEFAULT false,
  order_id UUID REFERENCES orders(id),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Perubahan Tabel yang Sudah Ada

```sql
-- Tambah kolom ke coffee_shops (alias: shops / businesses)
ALTER TABLE coffee_shops ADD COLUMN IF NOT EXISTS
  business_category_id UUID REFERENCES business_categories(id),
  marketplace_visible BOOLEAN DEFAULT true,
  featured_until TIMESTAMPTZ,
  verification_status VARCHAR(20) DEFAULT 'pending',
  total_sales_count INTEGER DEFAULT 0,
  total_gmv NUMERIC(15,2) DEFAULT 0,
  average_rating NUMERIC(3,2),
  review_count INTEGER DEFAULT 0,
  commission_rate_override NUMERIC(5,4), -- NULL = ikuti aturan umum
  custom_domain_verified BOOLEAN DEFAULT false,
  theme_key VARCHAR(50) DEFAULT 'classic',
  watermark_removed BOOLEAN DEFAULT false;

-- Tambah kolom ke orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS
  platform_commission_amount NUMERIC(15,2),
  net_amount_to_shop NUMERIC(15,2),
  escrow_released_at TIMESTAMPTZ,
  gateway VARCHAR(20), -- midtrans, xendit, manual
  gateway_transaction_id VARCHAR(255),
  refund_amount NUMERIC(15,2),
  refunded_at TIMESTAMPTZ,
  void_reason TEXT,
  dispute_status VARCHAR(20);

-- Tabel themes (extend yang sudah ada)
ALTER TABLE themes ADD COLUMN IF NOT EXISTS
  is_premium BOOLEAN DEFAULT false,
  price_idr NUMERIC(15,2),
  price_model VARCHAR(20) DEFAULT 'one_time' 
    CHECK (price_model IN ('one_time', 'monthly')),
  min_plan_required VARCHAR(50),
  category_recommendations TEXT[] DEFAULT '{}',
  preview_url TEXT;

-- Tabel plan_features / plan_matrix (extend yang sudah ada)
-- Pastikan semua entitlement baru ada sebagai baris
```

### 13.3 Edge Functions (Supabase)

| Function | Trigger | Deskripsi |
|---|---|---|
| `payment-webhook-midtrans` | POST /webhook/midtrans | Proses callback Midtrans |
| `payment-webhook-xendit` | POST /webhook/xendit | Proses callback Xendit |
| `release-escrow` | Cron / Manual trigger | Cairkan escrow yang sudah jatuh tempo |
| `send-order-email` | DB trigger (order insert) | Kirim email konfirmasi order |
| `send-withdrawal-email` | DB trigger (withdrawal update) | Notifikasi status penarikan |
| `verify-domain` | HTTP request | Cek CNAME DNS untuk custom domain |
| `digital-file-delivery` | DB trigger (order paid) | Generate link download produk digital |
| `cron-maintenance` | pg_cron setiap jam | Cleanup, stats update, reminder jatuh tempo |
| `auto-release-escrow` | pg_cron setiap hari | Auto-release escrow setelah X hari |
| `subscription-reminder` | pg_cron setiap hari | Kirim reminder jatuh tempo sewa |

### 13.4 Row Level Security (RLS)

Setiap tabel harus memiliki RLS policy yang memastikan:
- Pemilik toko hanya bisa akses data toko mereka sendiri
- Staff hanya bisa akses sesuai peran
- Super Admin bisa akses semua data
- Pembeli hanya bisa akses data publik dan data mereka sendiri
- Platform commissions, withdrawals tidak bisa diubah langsung oleh toko

---

## 14. URL & Routing

### 14.1 Marketplace Publik

```
/                          → Halaman utama marketplace
/kategori                  → Semua kategori
/kategori/:slug            → Halaman kategori spesifik
/toko/:slug                → Halaman toko
/toko/:slug/produk/:id     → Detail produk
/search?q=&kat=&kota=&...  → Hasil pencarian
/keranjang                 → Keranjang belanja
/checkout                  → Proses checkout
/checkout/sukses/:orderId  → Konfirmasi order berhasil
/pesanan/:orderId          → Lacak pesanan (publik, tanpa login)

/login                     → Login pembeli/pemilik toko
/daftar                    → Daftar akun baru
/lupa-password             → Lupa password
/reset-password            → Reset password

/akun                      → Profil akun pembeli
/akun/pesanan              → Riwayat pesanan
/akun/wishlist             → Wishlist
/akun/alamat               → Kelola alamat pengiriman
/akun/loyalitas/:shopSlug  → Poin loyalitas di toko tertentu
```

### 14.2 Dashboard Pemilik Toko

```
/app                       → Beranda dashboard
/app/produk                → Daftar produk
/app/produk/baru           → Tambah produk
/app/produk/:id            → Edit produk
/app/kategori              → Kategori produk toko
/app/pesanan               → Manajemen pesanan
/app/pesanan/:id           → Detail pesanan
/app/pengiriman            → Pengaturan pengiriman
/app/keuangan              → Saldo & transaksi
/app/keuangan/tarik        → Request penarikan
/app/billing               → Tagihan sewa & paket
/app/tampilan              → Tema & appearance
/app/domain                → Custom domain
/app/pelanggan             → Data pelanggan
/app/loyalitas             → Program loyalitas
/app/promosi               → Kode promo & flash sale
/app/ulasan                → Ulasan & rating
/app/laporan               → Laporan & statistik
/app/karyawan              → Manajemen karyawan
/app/pengaturan            → Pengaturan toko
/app/integrasi             → API & webhook (Enterprise)

-- F&B Specific
/app/pos                   → Point of Sale
/app/kds                   → Kitchen Display System
/app/meja                  → Manajemen meja
/app/inventori             → Stok & bahan baku
/app/resep                 → Resep & HPP
/app/shift                 → Manajemen shift
```

### 14.3 Panel Super Admin

```
/admin                     → Dashboard super admin
/admin/toko                → Kelola semua toko
/admin/toko/:id            → Detail toko
/admin/verifikasi          → Antrian verifikasi KTP
/admin/paket               → Kelola paket langganan
/admin/paket/:id/matrix    → Plan feature matrix
/admin/kategori            → Kelola kategori bisnis
/admin/tema                → Kelola tema toko
/admin/keuangan            → Keuangan platform
/admin/keuangan/invoice    → Invoice sewa
/admin/keuangan/penarikan  → Request penarikan
/admin/domain              → Custom domain
/admin/konten              → Banner & featured stores
/admin/broadcast           → Kirim notifikasi massal
/admin/audit               → Audit log
/admin/monitoring          → Status sistem
/admin/pengaturan          → Pengaturan platform
/admin/pengaturan/payment-gateway → Konfigurasi gateway
/admin/pengaturan/komisi   → Konfigurasi komisi
/admin/pengaturan/penarikan → Konfigurasi penarikan
/admin/pengaturan/platform → Info & branding platform
```

### 14.4 Custom Domain

Jika pemilik toko menghubungkan `tokosaya.com`, maka:
- `tokosaya.com` → Sama dengan `/toko/:slug` di platform utama
- `tokosaya.com/produk/:id` → Detail produk di domain kustom
- `tokosaya.com/keranjang` → Keranjang khusus toko ini
- `tokosaya.com/checkout` → Checkout khusus toko ini

---

## 15. Notifikasi & Komunikasi

### 15.1 Notifikasi ke Pembeli

| Event | Channel | Isi |
|---|---|---|
| Registrasi berhasil | Email | Welcome + verifikasi email |
| Order dibuat | Email + In-app | Detail order + instruksi bayar |
| Pembayaran dikonfirmasi | Email + In-app | Order ID + ringkasan |
| Order dikonfirmasi toko | In-app | Penjual sedang proses |
| Pesanan dikirim | Email + In-app | Nomor resi + link tracking |
| Pesanan tiba (konfirmasi) | In-app | Tombol "Konfirmasi Terima" |
| Pesanan selesai | In-app | Ajakan beri ulasan |
| Refund diproses | Email + In-app | Jumlah + estimasi cair |
| Promo dari toko diikuti | In-app | Detail promo |
| Poin loyalty bertambah | In-app | Jumlah poin baru |

### 15.2 Notifikasi ke Pemilik Toko

| Event | Channel | Isi |
|---|---|---|
| Toko aktif setelah verifikasi | Email + In-app | Selamat, toko Anda aktif! |
| Pesanan baru masuk | Email + In-app | Detail singkat pesanan |
| Pembayaran diterima | In-app | Pesanan siap diproses |
| Stok produk menipis | In-app | Nama produk + sisa stok |
| Ulasan baru | In-app | Nama pembeli + rating |
| Tagihan jatuh tempo H-7 | Email + In-app | Tanggal + jumlah tagihan |
| Tagihan jatuh tempo H-3 | Email + In-app | Reminder lebih mendesak |
| Tagihan jatuh tempo H-1 | Email + In-app + WA | Sangat mendesak |
| Toko masuk grace period | Email + In-app | Instruksi bayar |
| Toko dinonaktifkan | Email + In-app | Alasan + cara aktifkan |
| Penarikan dana disetujui | Email + In-app | Jumlah + estimasi cair |
| Penarikan selesai | Email + In-app | Konfirmasi transfer |
| Broadcast dari Super Admin | In-app | Isi pesan admin |
| Verifikasi KTP disetujui | Email + In-app | Toko siap beroperasi |
| Verifikasi KTP ditolak | Email + In-app | Alasan + instruksi upload ulang |

### 15.3 Notifikasi ke Super Admin (Internal Dashboard)

| Event | Notif Internal |
|---|---|
| Toko baru mendaftar | Jumlah toko baru hari ini |
| Verifikasi KTP menunggu | Alert + jumlah antrian |
| Invoice sewa menunggu review | Alert + jumlah |
| Request penarikan baru | Alert + jumlah |
| Dispute/sengketa baru | Alert |
| Error payment webhook | Alert teknis |

### 15.4 Template Komunikasi

Semua template notifikasi (email, in-app) dapat diedit oleh Super Admin:
- Subject email
- Isi email (HTML + teks polos)
- Variabel dinamis: `{nama_toko}`, `{jumlah}`, `{tanggal}`, dll.

---

## 16. Keamanan & Compliance

### 16.1 Autentikasi & Akses

- **Supabase Auth**: JWT-based, refresh token, session management
- **Role-Based Access Control (RBAC)**: Enforced di database level via RLS
- **Super Admin**: Akun khusus dengan `role = 'super_admin'` di tabel profiles
- **2FA**: Opsional untuk semua akun, wajib untuk Super Admin (Fase 2)
- **Session timeout**: Konfigurasi per tipe akun

### 16.2 Keamanan Data Sensitif

- **Secret Gateway**: Disimpan terenkripsi (AES-256) di `platform_settings`, tidak pernah ditampilkan kembali
- **KTP Photos**: Disimpan di Supabase Storage private bucket, hanya Super Admin yang bisa akses
- **Nomor Rekening**: Masked di UI (hanya 4 digit terakhir tampil)
- **Password**: Tidak pernah disimpan plaintext (handled Supabase Auth)

### 16.3 Keamanan Transaksi

- **Webhook Verification**: Setiap webhook dari Midtrans/Xendit diverifikasi signature
- **Idempotency**: Webhook yang sama tidak diproses dua kali (via `payment_webhook_logs`)
- **Escrow**: Dana ditahan sampai pembeli konfirmasi atau auto-release setelah X hari
- **Fraud Detection**: Flag transaksi mencurigakan (nilai tinggi, akun baru, dll.) — Fase 2

### 16.4 Privasi Data

- Data pelanggan hanya bisa diakses toko yang bersangkutan (via RLS)
- Super Admin tidak bisa lihat detail percakapan private
- Pemilik toko tidak bisa akses data pelanggan toko lain
- Hak hapus data (GDPR-lite): User bisa request hapus akun

### 16.5 Compliance

- **PDPA Indonesia (UU PDP)**: Data pribadi dilindungi, ada kebijakan privasi
- **OJK**: Jika platform berkembang ke payment aggregator, perlu izin OJK
- **BPOM**: Toko yang menjual produk beauty/food wajib cantumkan nomor BPOM (enforced via atribut kategori)
- **Pajak**: Platform menyediakan laporan untuk keperluan pelaporan pajak pemilik toko (tidak mengelola pajak)

---

## 17. Roadmap Pengembangan

### Fase 0 — Fondasi & Generalisasi (3–4 minggu)
*Memanfaatkan dan generalisasi kode yang sudah ada*

- [ ] Migrasi `menu_items` → `products` (dengan backward compat untuk F&B)
- [ ] Tabel dan CRUD `business_categories` + UI Super Admin
- [ ] Tabel `platform_settings` + UI konfigurasi platform (nama, logo)
- [ ] UI konfigurasi payment gateway (Midtrans + Xendit) di Super Admin
- [ ] UI konfigurasi komisi di Super Admin
- [ ] UI konfigurasi penarikan dana di Super Admin
- [ ] Generalisasi entitlement untuk semua kategori (tambah baris baru ke plan matrix)
- [ ] Sistem verifikasi KTP: Upload, antrian review, approve/reject

### Fase 1 — MVP Marketplace (5–7 minggu)
*Platform bisa digunakan oleh toko pertama secara live*

- [ ] Halaman utama marketplace (hero, kategori, toko unggulan, produk terlaris)
- [ ] Halaman kategori bisnis dengan filter dan sortir
- [ ] Pencarian global (produk + toko)
- [ ] Halaman toko individual (generalisasi dari `/s/:slug/`)
- [ ] Halaman detail produk dengan variasi
- [ ] Keranjang belanja multi-toko
- [ ] Checkout lengkap (alamat, pengiriman, payment)
- [ ] Integrasi Midtrans (payment link, VA, QRIS)
- [ ] Integrasi Xendit (VA, e-wallet, disbursement)
- [ ] Webhook handler + escrow system
- [ ] Sistem komisi otomatis per transaksi
- [ ] Saldo toko + riwayat transaksi
- [ ] Request penarikan dana (manual review Super Admin)
- [ ] Dashboard toko: Produk, pesanan, keuangan dasar
- [ ] Notifikasi email dasar
- [ ] Sistem ulasan & rating produk

### Fase 2 — Pengiriman, Promosi & Loyalitas (4–5 minggu)
*Operasional lebih lengkap*

- [ ] Integrasi RajaOngkir API (ongkir real-time)
- [ ] Tracking pesanan otomatis (polling API kurir)
- [ ] Produk digital: Upload file, auto-delivery link
- [ ] Sistem kode promo & diskon
- [ ] Flash sale (waktu terbatas + kuota)
- [ ] Program loyalitas pelanggan (poin, tier, reward)
- [ ] Referral program
- [ ] Notifikasi WhatsApp (via Fonnte atau WA Business API)
- [ ] Export laporan Excel/PDF semua tabel
- [ ] Wishlist produk
- [ ] Fitur F&B lanjutan: POS, KDS, meja, inventori (toko kategori F&B)

### Fase 3 — Tema & Personalisasi Toko (3–4 minggu)
*Setiap toko punya identitas visual unik*

- [ ] Tambah 5+ tema baru (Natural, Bold, Elegant, Playful, Professional)
- [ ] Sistem pembelian / sewa tema berbayar
- [ ] Custom CSS editor (paket Pro)
- [ ] Builder section halaman toko sederhana
- [ ] Verifikasi custom domain end-to-end (CNAME + SSL otomatis)
- [ ] White label (hapus semua branding platform, Enterprise only)

### Fase 4 — Skala, Integrasi & Mobile (Ongoing)
*Platform siap untuk ribuan toko dan jutaan pembeli*

- [ ] Mobile app pembeli (React Native / Expo)
- [ ] Mobile app pemilik toko (notifikasi pesanan, kelola produk)
- [ ] Integrasi akuntansi (Jurnal, Kledo)
- [ ] Sinkronisasi GrabFood / GoFood (untuk F&B)
- [ ] API publik untuk mitra + developer
- [ ] Fitur franchise/multi-outlet lanjutan
- [ ] Program afiliasi/referral pemilik toko (ajak merchant)
- [ ] Multi-bahasa (English support)
- [ ] Analytics lanjutan (heatmap, funnel, A/B test)

---

## 18. Metrik Keberhasilan

### 18.1 Metrik Platform

| Metrik | Target 3 Bulan | Target 6 Bulan | Target 12 Bulan |
|---|---|---|---|
| Toko aktif | 50 | 300 | 1.000 |
| GMV per bulan | Rp 100 juta | Rp 1 miliar | Rp 10 miliar |
| Pembeli terdaftar | 500 | 5.000 | 50.000 |
| Pesanan per bulan | 500 | 5.000 | 50.000 |
| Conversion rate marketplace | - | 2% | 3% |

### 18.2 Metrik Keuangan Platform

| Metrik | Target 3 Bulan | Target 6 Bulan | Target 12 Bulan |
|---|---|---|---|
| Pendapatan sewa per bulan | Rp 5 juta | Rp 50 juta | Rp 300 juta |
| Pendapatan komisi per bulan | Rp 2 juta | Rp 25 juta | Rp 250 juta |
| Total MRR | Rp 7 juta | Rp 75 juta | Rp 550 juta |
| Churn rate toko | < 20% | < 15% | < 10% |

### 18.3 Metrik Kualitas Platform

| Metrik | Target |
|---|---|
| Uptime | > 99.5% |
| Waktu respon halaman (P95) | < 3 detik |
| Waktu verifikasi KTP | < 24 jam kerja |
| Waktu proses penarikan | < 2 hari kerja (manual) |
| CSAT pemilik toko | > 4.0/5.0 |
| CSAT pembeli | > 4.2/5.0 |

---

## 19. Risiko & Mitigasi

| Risiko | Kemungkinan | Dampak | Strategi Mitigasi |
|---|---|---|---|
| Pemilik toko tidak mau bayar komisi | Tinggi | Tinggi | Mulai komisi 0–2% untuk early adopter, naik bertahap |
| Persaingan Tokopedia/Shopee/Lazada | Tinggi | Sedang | Fokus niche: UMKM lokal, produk artisan, komunitas |
| Penipuan oleh toko (produk palsu/tidak kirim) | Sedang | Tinggi | Escrow system, verifikasi KTP, rating & laporan |
| Penipuan oleh pembeli (klaim tidak terima) | Sedang | Sedang | Bukti pengiriman, foto unboxing opsional, mediasi |
| Secret gateway bocor | Rendah | Sangat Tinggi | Enkripsi at-rest, audit log akses, rotasi periodik |
| Skalabilitas Supabase | Sedang | Tinggi | Monitor query, indexing, connection pooling, caching |
| Perubahan kebijakan Midtrans/Xendit | Rendah | Tinggi | Abstraksi gateway layer, mudah tambah gateway baru |
| Keterlambatan verifikasi KTP | Sedang | Sedang | SLA review 24 jam, notifikasi antrian ke admin |
| Penyalahgunaan custom domain | Rendah | Sedang | Verifikasi kepemilikan domain, blacklist |
| Data pelanggan bocor | Rendah | Sangat Tinggi | RLS ketat, enkripsi, audit log, penetration testing |

---

## Appendix A: Glosarium

| Istilah | Definisi |
|---|---|
| **GMV** | Gross Merchandise Value — Total nilai semua transaksi sebelum dikurangi komisi |
| **MRR** | Monthly Recurring Revenue — Pendapatan berulang bulanan dari sewa |
| **Entitlement** | Hak akses ke fitur tertentu berdasarkan paket langganan |
| **Plan Matrix** | Tabel konfigurasi nilai setiap entitlement per paket |
| **Escrow** | Dana yang ditahan sementara sampai kondisi terpenuhi |
| **Churn** | Persentase toko yang berhenti berlangganan |
| **RLS** | Row Level Security — Keamanan database level baris |
| **KDS** | Kitchen Display System — Layar pesanan di dapur (F&B) |
| **HPP** | Harga Pokok Produksi/Penjualan — Biaya modal produk |
| **CSAT** | Customer Satisfaction Score — Skor kepuasan pelanggan |

---

## Appendix B: Keputusan yang Sudah Final

| # | Keputusan | Detail |
|---|---|---|
| 1 | Nama platform | Dinamis, dikonfigurasi Super Admin via UI |
| 2 | Model komisi | Sepenuhnya dikonfigurasi Super Admin (global, per kategori, per paket, per toko) |
| 3 | Payment gateway | Midtrans + Xendit keduanya; secret key diubah via UI Super Admin (terenkripsi) |
| 4 | Verifikasi toko | Wajib upload KTP sebelum toko aktif |
| 5 | Jadwal penarikan | Kapan saja (paket Pro+); bulanan (paket Gratis/Starter); biaya admin dikonfigurasi Super Admin |
| 6 | Harga tema berbayar | Ditentukan nanti via panel Super Admin |

---

*PRD ini dibuat berdasarkan analisis mendalam kode repositori FlowPOS/KopiHub yang sudah ada dan telah diperbarui dengan keputusan yang dikonfirmasi oleh pemilik platform. Fondasi teknis yang ada memungkinkan estimasi pengembangan lebih cepat dibandingkan memulai dari nol — perkiraan 60–70% infrastruktur sudah tersedia.*

---

## Status Implementasi (per Sesi 7 + Fase 2)

### ✅ Fase 1 — MVP Marketplace (selesai)
- **Sesi 1-2 Foundations**: business categories, marketplace toggle, slug-based shop pages (`/toko/$slug`), product detail (`/toko/$slug/produk/$productId`), homepage marketplace, search awal.
- **Sesi 3 Cart & Checkout**: keranjang multi-toko (`/keranjang`), checkout (`/checkout`), halaman sukses, halaman pesanan (`/pesanan/$orderId`), withdrawal admin (`/admin/withdrawals`), dompet & komisi.
- **Sesi 4 Owner Marketplace Orders**: `/pos-app/marketplace-orders` untuk konfirmasi, status, escrow.
- **Sesi 5 Customer Account & Reviews**: `/akun` (profil, alamat, pesanan), upload foto review, ulasan toko + balasan, `MarketplaceReviewDialog`, `ProductReviews`.
- **Sesi 6 Discovery & SEO**: filter & sort `/search`, JSON-LD (`Product`, `Store`), dynamic head meta, featured shops/produk, partial indexes.
- **Sesi 7 Pengiriman & Tracking**: zona ongkir per toko di checkout, ongkir otomatis terhitung & masuk total per pesanan, halaman lacak (`/track/$orderId`) realtime, kurir wajib upload **bukti foto pengantaran** (`courier_mark_delivered`), link "Lacak Pengantaran" di akun pelanggan.

### ✅ Fase 2 — Promo & Voucher (selesai sebagian)
- **Voucher platform** (lintas-toko, dikelola super admin)
  - Tabel `platform_vouchers` + `platform_voucher_redemptions`
  - CRUD admin di `/admin/vouchers`: kode, jenis (% / nominal), nilai, min belanja, maks diskon, kuota total & per pengguna, jadwal aktif
  - Diterapkan di marketplace_checkout secara proporsional ke setiap pesanan toko
- **Voucher per-toko di marketplace checkout**
  - Memanfaatkan tabel `promos` lama (channel `online`/`all`)
  - Input kode voucher di tiap kartu toko di `/checkout`
- **Flash sale ringan**
  - Kolom `flash_price`, `flash_starts_at`, `flash_ends_at` pada `menu_items`
  - `marketplace_checkout` otomatis pakai `flash_price` saat aktif
- **Tracking diskon** pada `orders`: `shop_voucher_code`, `shop_voucher_discount`, `platform_voucher_code`, `platform_voucher_discount`

### 🔜 Sisa pekerjaan Fase 2 (opsional sesi berikut)
- UI owner untuk mengatur flash sale di `/pos-app/menu` (set harga + jadwal lewat form)
- Badge flash sale di kartu produk marketplace + countdown timer
- Halaman publik `/promo` daftar voucher platform aktif
- Loyalty points lintas toko (poin marketplace)

### Saran Fase Berikutnya
- **Fase 3 — Sengketa & Komunikasi**: alur dispute/refund, chat customer↔seller (realtime), auto-release escrow setelah X hari.
- **Fase 4 — Analitik**: dashboard admin (GMV, take-rate), dashboard owner marketplace (konversi, AOV), export laporan.
- **Fase 5 — Notifikasi & Re-engagement**: email/WA notif (status order, broadcast promo), push notification PWA.
