# PRD — UMKMgo / KopiHub
## Platform Marketplace & POS Multi-Kategori untuk UMKM Indonesia
**Versi:** 6.0 | **Diperbarui:** 14 Mei 2026 | **Status:** Living Document — Satu-satunya sumber kebenaran

---

## PRINSIP UTAMA

> **Bangun fitur sederhana yang langsung terasa dampaknya.** Setiap fitur harus bisa dijelaskan dalam satu kalimat, bisa dibangun dalam < 2 hari, dan langsung meningkatkan salah satu dari tiga metrik inti: **Konversi**, **Retensi**, atau **Pendapatan Toko**.

**Stack:** React 19 + Vite + TanStack Router · Supabase (auth, DB, storage, realtime) · Express 5 + Drizzle ORM · pnpm monorepo

**Aturan Pengembangan:**
1. Fitur baru wajib ada fallback — jika tabel belum ada, tampilkan SQL siap-jalankan
2. Semua data merchant selalu di-scope dengan `shop_id`
3. UI dalam Bahasa Indonesia
4. Mobile-first (nyaman di 375px)
5. Data lokal dulu (localStorage/state) untuk fitur tanpa DB baru
6. Tidak ada breaking change — fitur baru tidak boleh merusak yang sudah jalan

---

## RINGKASAN EKSEKUTIF

Platform ini sudah sangat kuat dari sisi infrastruktur. **70–75% fitur inti sudah ada.** Gap terbesar bukan di fitur yang rumit, tapi di pengalaman pengguna yang lengkap:

1. **Sistem booking sudah solid** ✅ — halaman publik self-serve ada, pilih staff ada, deposit ada, voucher khusus booking ada. Gap yang tersisa: reschedule mandiri, integrasi payment gateway untuk deposit, dan paket layanan/add-on.
2. **Booking BUKAN untuk semua usaha** ⚠️ — hanya untuk kategori jasa berbasis waktu atau unit terbatas (barber, salon, rental, studio foto, klinik, dll.). F&B umum, fashion, dan produk digital punya alur sendiri.
3. **Viral loop sudah ada** ✅ — share produk, share keranjang, referral, wishlist, alert harga turun sudah dibangun.
4. **Fitur per industri sudah dimulai** ✅ — size chart (fashion), ingredient list + BPOM (skincare), alergen tag (F&B), pilih staff (jasa) sudah ada.
5. **Gap terbesar saat ini:**
   - Integrasi payment gateway untuk deposit booking (Midtrans/Xendit)
   - Paket & add-on layanan saat booking (pilih Basic/Standard/Premium)
   - Portofolio/galeri karya terintegrasi di halaman toko publik
   - Reschedule mandiri oleh pelanggan (hanya batal mandiri yang ada)
   - Preview watermarked produk digital

---

## BAGIAN 0: ANALISIS ALUR BISNIS PER TIPE USAHA

> **Penting:** Platform ini melayani berbagai jenis UMKM dengan alur transaksi yang BERBEDA-BEDA. Kesalahan terbesar adalah menyamakan semua usaha dengan satu alur yang sama. Bagian ini mendefinisikan secara tegas 5 tipe alur bisnis dan usaha mana yang masuk ke masing-masing tipe.

---

### 0.1 Lima Tipe Alur Bisnis

```
TIPE 1 — PRODUK FISIK LANGSUNG (Beli & Kirim)
TIPE 2 — PRODUK DIGITAL (Beli & Unduh Otomatis)
TIPE 3 — BOOKING SESI (Reservasi Waktu Layanan)
TIPE 4 — BOOKING RENTAL (Sewa Berdasarkan Rentang Tanggal/Durasi)
TIPE 5 — PRE-ORDER & CUSTOM (Pesan Dulu, Dibuat Kemudian)
```

---

### 0.2 TIPE 1 — Produk Fisik Langsung

**Untuk siapa:** F&B siap saji, fashion ready-to-wear, skincare/kosmetik, alat tulis, perlengkapan rumah, sembako, aksesori, dll.

**Ciri khas:** Produk sudah jadi, tersedia di stok, bisa langsung dibeli dan dikirim/diambil.

**Alur Lengkap:**
```
PEMBELI:
  1. Browse marketplace / scan QR / klik link
  2. Lihat halaman toko → cari produk
  3. Pilih varian (ukuran, warna, rasa) → tambah ke keranjang
  4. Checkout:
     ├── Isi alamat pengiriman
     ├── Pilih metode pengiriman (delivery/pickup/dine-in untuk F&B)
     ├── Terapkan voucher (jika ada)
     └── Pilih metode bayar → konfirmasi
  5. Bayar → notifikasi ke merchant
  6. Merchant terima pesanan → proses
  7. Produk dikirim / siap diambil
  8. Pembeli terima → konfirmasi → review

MERCHANT (POS Walk-in):
  1. Pelanggan datang → kasir input order
  2. Pilih item → hitung total
  3. Bayar (tunai/QRIS/kartu)
  4. Cetak struk → selesai
  5. Jika F&B: pesanan masuk KDS dapur
```

**Fitur kritis untuk Tipe 1:**
| Fitur | Status |
|---|---|
| Keranjang multi-toko | ✅ |
| Checkout lengkap (delivery/pickup) | ✅ |
| Manajemen pesanan merchant | ✅ |
| POS kasir digital | ✅ |
| KDS dapur | ✅ |
| Order tracking realtime | ✅ |
| Bukti pengiriman foto | ✅ |
| QR order meja | ✅ |
| Varian produk (ukuran, warna) | ✅ |
| Stok otomatis berkurang | ✅ |
| Notifikasi WA pelanggan | ✅ |

**Sub-alur khusus F&B (Tipe 1A):**
```
Dine-in:    Scan QR meja → order → bayar → KDS → siap → pelayan antar
Takeaway:   Order online/POS → bayar → ambil sendiri
Delivery:   Order marketplace → bayar → dapur masak → kurir ambil → antar
Catering:   → lihat Tipe 5 (Pre-order)
Reservasi meja: → lihat Tipe 3 (Booking Sesi, terbatas)
```

**Sub-alur khusus Fashion (Tipe 1B):**
```
Browse → Filter ukuran/warna → Cek size chart → Tambah ke cart
→ Checkout → Bayar → Packing → Kirim (kurir) → Terima → Review
→ Jika tidak cocok → Return request
```

---

### 0.3 TIPE 2 — Produk Digital

**Untuk siapa:** Template desain, e-book, preset foto, font, musik, video, kursus online, software, kode aktivasi.

**Ciri khas:** Tidak ada pengiriman fisik. Setelah bayar, file/akses langsung dikirim otomatis. Tidak ada stok habis. Bisa dijual ke banyak orang tanpa batas.

**Alur Lengkap:**
```
PEMBELI:
  1. Browse → lihat produk digital
  2. Preview watermarked (sample) → cek spesifikasi, lisensi
  3. Klik "Beli" → checkout
  4. Bayar → konfirmasi otomatis
  5. File dikirim otomatis:
     ├── Email (link download)
     ├── Halaman akun (/akun/digital-products)
     └── Notifikasi in-app
  6. Download file → selesai
  7. Review (jika mau)

MERCHANT:
  1. Upload file digital (zip, pdf, mp4, dll.)
  2. Set harga + lisensi (personal/commercial)
  3. Set preview watermarked (opsional)
  4. Set limit download (anti-sharing)
  5. Monitor penjualan → tidak perlu proses manual
  6. Update versi → pembeli lama otomatis dapat notif
```

**Fitur kritis untuk Tipe 2:**
| Fitur | Status |
|---|---|
| Produk digital (upload + auto-delivery) | ✅ |
| Preview watermarked | ❌ Belum |
| Lisensi personal vs commercial | ❌ Belum |
| Limit download per pembelian | ❌ Belum |
| Kode aktivasi / serial key | ❌ Belum |
| Update versi (pembeli lama dapat notif) | ❌ Belum |
| Halaman riwayat produk digital di akun | ❌ Belum |

**Perbedaan kunci Tipe 2 vs Tipe 1:**
- Tidak ada stok, tidak ada kurir, tidak ada KDS, tidak ada booking
- Checkout jauh lebih sederhana (tidak perlu alamat)
- Penjual tidak perlu melakukan apa pun setelah upload
- Revenue model berbeda: lebih cocok untuk bundling + lisensi

---

### 0.4 TIPE 3 — Booking Sesi (Reservasi Waktu Layanan)

**Untuk siapa:** Barbershop, salon rambut, spa, pijat, studio foto, fotografer, les privat, klinik/dokter, gym kelas, pet grooming, yoga, workshop, konsultan, EO.

**Ciri khas:** Pelanggan memesan WAKTU TERTENTU dari jadwal yang tersedia. Kapasitas terbatas oleh waktu dan jumlah staff/ruangan. Layanan diberikan saat janji temu.

**Alur Lengkap:**
```
PEMBELI (booking mandiri):
  1. Masuk halaman toko → klik "Booking"
  2. Pilih LAYANAN yang diinginkan (potong rambut, creambath, dll.)
  3. Pilih TANGGAL dari kalender (slot merah = penuh, hijau = tersedia)
  4. Pilih SLOT WAKTU yang tersedia
  5. Pilih STAFF/TERAPIS (opsional — atau "siapa saja")
  6. Isi data diri (nama, telepon, catatan)
  7. Terapkan voucher booking (jika ada)
  8. Jika ada deposit → konfirmasi jumlah DP → instruksi transfer
  9. Submit → notifikasi konfirmasi via WA + in-app
 10. H-3 & H-1 → reminder otomatis
 11. Datang → layanan diberikan → selesai
 12. H+1 → notif minta review

MERCHANT:
  1. Buat slot layanan (jam, durasi, kapasitas, harga)
  2. Assign staff ke slot
  3. Terima notifikasi booking masuk → konfirmasi (auto/manual)
  4. Jika ada deposit manual → verifikasi transfer → konfirmasi
  5. Hari H → layanan diberikan
  6. Update status: selesai
  7. Catat catatan pelanggan (riwayat layanan, produk dipakai)

PEMBATALAN/RESCHEDULE:
  - Pelanggan klik link cancel di email/WA → /booking/cancel/:token
  - Sistem cek kebijakan (< 24 jam? → tolak otomatis)
  - Jika valid → booking dibatalkan → notif merchant
  - Waitlist → merchant dinotifikasi ada slot terbuka
  - Reschedule mandiri → ❌ belum ada (masih perlu dikerjakan)
```

**Fitur kritis untuk Tipe 3:**
| Fitur | Status |
|---|---|
| Halaman booking publik self-serve | ✅ |
| Kalender slot ketersediaan | ✅ |
| Pilih layanan (service_name per slot) | ✅ (via slot) |
| Pilih staff/terapis | ✅ |
| Deposit wajib (konfirmasi manual) | ✅ |
| Voucher diskon booking | ✅ |
| Analitik voucher | ✅ |
| Pembatalan mandiri via token | ✅ |
| Waitlist virtual | ✅ |
| Reminder H-1/H-3 otomatis | ✅ |
| Riwayat booking di akun pembeli | ✅ |
| **Reschedule mandiri** | ❌ Belum |
| **Paket layanan (Basic/Premium/add-on)** | ❌ Belum |
| **Deposit via payment gateway** | ❌ Belum |
| **Catatan pelanggan per kunjungan** | ❌ Belum |
| **Review post-booking (H+1 otomatis)** | ❌ Belum |
| **Kalender sync (export .ics)** | ❌ Belum |

**Kategori yang MENGGUNAKAN Tipe 3:**
- ✂️ Barbershop, Salon, Spa, Pijat, Waxing, Tato
- 📸 Studio Foto, Fotografer, Videografer
- 🎓 Les Privat, Workshop, Bimbel (kelas dengan batas peserta)
- ⚕️ Klinik, Dokter Gigi, Terapi, Fisioterapi, Gym Kelas
- 🐾 Pet Grooming
- 🏠 Konsultan Interior, Jasa Desain
- 🎭 EO, Entertainer, Konsultan

---

### 0.5 TIPE 4 — Booking Rental (Sewa Rentang Tanggal/Durasi)

**Untuk siapa:** Rental mobil, rental motor, sewa alat camping, sewa kostum, pet hotel, villa/penginapan, coworking space, sewa elektronik/kamera, sewa venue.

**Ciri khas:** Pelanggan menyewa UNIT/TEMPAT untuk RENTANG WAKTU tertentu. Tidak ada slot jam seperti booking sesi — yang penting tanggal mulai dan selesai. Ketersediaan ditentukan per unit, bukan per staff.

**Alur Lengkap:**
```
PEMBELI:
  1. Browse halaman toko → lihat daftar item/unit
  2. Pilih item (mobil Avanza, tenda dome 4 orang, dll.)
  3. Pilih TANGGAL MULAI dan TANGGAL SELESAI
  4. Sistem cek ketersediaan unit untuk rentang tersebut
     ├── Tersedia → lanjut
     └── Tidak tersedia → tampilkan unit lain / saran tanggal alternatif
  5. Hitung total biaya (harga/hari × durasi + deposit)
  6. Isi data diri + upload dokumen (KTP, SIM untuk kendaraan)
  7. Bayar deposit / bayar penuh
  8. Konfirmasi booking → notifikasi
  9. Hari ambil → tunjukkan bukti booking → ambil unit
 10. Gunakan selama durasi sewa
 11. Kembalikan → cek kondisi → settlement biaya akhir
 12. Review

MERCHANT:
  1. Input daftar unit/armada (ID unit, nama, foto, kondisi, harga/hari)
  2. Set kebijakan: deposit %, denda terlambat/hari, syarat dokumen
  3. Terima booking → verifikasi dokumen → konfirmasi
  4. Hari ambil → checklist kondisi sebelum
  5. Hari kembali → checklist kondisi sesudah
  6. Jika ada kerusakan → catat → billing tambahan
  7. Tutup booking → settlement
```

**Fitur kritis untuk Tipe 4:**
| Fitur | Status |
|---|---|
| Kalender ketersediaan per unit (date-range) | ✅ (`pos-app.rental-availability.tsx`) |
| Manajemen armada/unit | ⚠️ Dasar ada |
| Upload dokumen (KTP/SIM) saat booking | ❌ Belum |
| Perpanjangan sewa mandiri | ❌ Belum |
| Checklist kondisi sebelum/sesudah | ❌ Belum |
| Billing denda keterlambatan | ❌ Belum |
| Deposit via payment gateway | ❌ Belum |
| Syarat & ketentuan per kategori usaha | ❌ Belum |

**Kategori yang MENGGUNAKAN Tipe 4:**
- 🚗 Rental Mobil, Rental Motor, Bengkel (booking servis)
- 🏕️ Sewa Alat Camping, Sewa Kostum, Sewa Elektronik, Sewa Event
- 🏠 Villa, Penginapan, Coworking, Studio Sewa, Kost
- 🐾 Pet Hotel (penitipan hewan)
- ✈️ Transportasi carter, Paket wisata (dengan tanggal)

**Perbedaan Tipe 3 vs Tipe 4:**
| Aspek | Tipe 3 — Booking Sesi | Tipe 4 — Booking Rental |
|---|---|---|
| Unit terbatas | Waktu staff/ruang | Unit fisik (armada/item) |
| Pilih waktu | Slot jam tertentu (09:00–10:00) | Rentang tanggal (3–7 Mei) |
| Dokumen tambahan | Tidak wajib | KTP/SIM wajib (kendaraan) |
| Checklist kondisi | Tidak perlu | Wajib (sebelum & sesudah) |
| Perpanjangan | Tidak relevan | Perlu fitur khusus |
| Contoh | Barber, Salon, Klinik | Rental mobil, Villa, Pet hotel |

---

### 0.6 TIPE 5 — Pre-Order & Custom Order

**Untuk siapa:** Bakeri kue custom, katering acara, jahit baju custom, konveksi seragam, percetakan, furniture custom, kerajinan tangan, desain grafis.

**Ciri khas:** Produk belum ada saat pemesanan — dibuat khusus setelah order masuk. Ada estimasi waktu produksi. Sering memerlukan brief/spesifikasi dari pembeli.

**Alur Lengkap:**
```
PRE-ORDER (produk dengan tanggal tersedia):
PEMBELI:
  1. Lihat produk dengan label "Pre-Order"
  2. Cek estimasi tanggal siap (mis. "Tersedia mulai 20 Mei")
  3. Pesan → bayar DP atau lunas di muka
  4. Tunggu produk siap
  5. Merchant notifikasi "Siap dikirim"
  6. Terima produk → review

CUSTOM ORDER (brief & spec dari pembeli):
PEMBELI:
  1. Buka halaman toko → klik "Pesan Custom"
  2. Isi brief form:
     ├── Deskripsi kebutuhan
     ├── Budget estimasi (min-max)
     ├── Deadline / tanggal butuh
     ├── Upload gambar referensi
     └── Kontak (WA / email)
  3. Submit → merchant terima notifikasi
  4. Merchant review brief → kirim penawaran harga + estimasi
  5. Pembeli setuju → bayar DP
  6. Produksi berjalan → milestone update (opsional)
  7. Selesai → bayar sisa → kirim/ambil
  8. Review

MERCHANT:
  1. Terima custom order request
  2. Klik "Terima" → mulai → selesai → tolak (dengan WA template otomatis)
  3. Update status → history timeline otomatis tercatat
  4. Untuk pre-order: set open_at, close_at, estimasi kirim, min qty
```

**Fitur kritis untuk Tipe 5:**
| Fitur | Status |
|---|---|
| Pre-order mode (kolom pre_order_* di menu_items) | ✅ |
| Custom order form (toko.$slug.custom-order.tsx) | ✅ |
| Custom order management di POS | ✅ |
| Status history timeline custom order | ✅ |
| WA template otomatis per status | ✅ |
| Halaman status custom order pelanggan | ✅ |
| **Estimasi biaya dari merchant ke pembeli** | ❌ Belum |
| **Milestone tracking & escrow per milestone** | ❌ Belum |
| **Upload file hasil karya ke klien** | ❌ Belum |
| **Contract/agreement digital** | ❌ Belum |

**Kategori yang MENGGUNAKAN Tipe 5:**
- 🍽️ Bakeri/Kue custom, Katering acara
- 👗 Konveksi/jahit baju custom, Sablon
- 🎨 Kerajinan tangan, Seni komisi, Furniture custom
- 💻 Desainer grafis, Web developer, Ilustrator
- 🖨️ Percetakan, Undangan, Spanduk

---

### 0.7 Matriks Tipe Alur per Kategori Usaha

> Satu toko BISA memiliki lebih dari satu tipe alur secara bersamaan.

| Kategori Usaha | T1 Produk Fisik | T2 Digital | T3 Booking Sesi | T4 Rental | T5 Pre-order/Custom |
|---|:---:|:---:|:---:|:---:|:---:|
| **Restoran / Warung** | ✅ Utama | — | ⬜ Reservasi meja (opsional) | — | ⬜ Katering |
| **Kafe / Kedai** | ✅ Utama | — | ⬜ Reservasi meja (opsional) | — | — |
| **Bakeri & Kue** | ✅ Produk jadi | — | — | — | ✅ Kue custom |
| **Makanan Kemasan** | ✅ Utama | — | — | — | ⬜ Hamper custom |
| **Catering** | — | — | — | — | ✅ Utama |
| **Barbershop** | — | — | ✅ **Utama** | — | — |
| **Salon Rambut** | ⬜ Produk perawatan | — | ✅ **Utama** | — | — |
| **Spa & Pijat** | — | — | ✅ **Utama** | — | — |
| **Skincare / Kosmetik** | ✅ Utama | — | — | — | — |
| **Studio Foto** | — | ⬜ File foto | ✅ **Utama** | — | — |
| **Fotografer** | — | ⬜ File foto | ✅ **Utama** | — | — |
| **Desainer Grafis** | — | ⬜ File desain | ✅ Konsultasi | — | ✅ **Utama** |
| **Rental Mobil** | — | — | — | ✅ **Utama** | — |
| **Rental Motor** | — | — | — | ✅ **Utama** | — |
| **Sewa Alat Camping** | — | — | — | ✅ **Utama** | — |
| **Sewa Kostum** | — | — | ⬜ Fitting | ✅ **Utama** | — |
| **Bengkel** | ⬜ Suku cadang | — | ✅ Booking servis | — | — |
| **Fashion Ready-to-Wear** | ✅ Utama | — | — | — | ✅ Custom order |
| **Fashion Preloved** | ✅ Utama | — | — | — | — |
| **Konveksi / Jahit** | — | — | — | — | ✅ **Utama** |
| **Produk Digital** | — | ✅ **Utama** | — | — | — |
| **Kursus Online** | — | ✅ **Utama** | — | — | — |
| **Les Privat** | — | — | ✅ **Utama** | — | — |
| **Workshop / Kelas** | — | — | ✅ **Utama** | — | — |
| **Klinik / Dokter** | — | — | ✅ **Utama** | — | — |
| **Gym / Studio Fitness** | — | — | ✅ Kelas | — | — |
| **Pet Grooming** | — | — | ✅ **Utama** | — | — |
| **Pet Hotel** | — | — | — | ✅ **Utama** | — |
| **Villa / Penginapan** | — | — | — | ✅ **Utama** | — |
| **Coworking Space** | — | — | — | ✅ **Utama** | — |
| **Sewa Venue** | — | — | — | ✅ **Utama** | — |
| **Tour & Travel** | — | — | ✅ Paket tur | — | — |
| **EO / Entertainer** | — | — | ✅ **Utama** | — | ✅ Brief |
| **Furniture Custom** | — | — | ✅ Konsultasi | — | ✅ **Utama** |
| **Percetakan / Sablon** | ⬜ Stok umum | — | — | — | ✅ **Utama** |
| **Kerajinan Tangan** | ✅ Stok jadi | — | — | — | ✅ Custom |
| **Makanan Sehat** | ✅ Utama | — | — | — | ⬜ Meal prep langganan |
| **Agribisnis / Tani** | ✅ Utama | — | — | — | ⬜ Langganan mingguan |

**Legenda:** ✅ Utama (tipe alur ini adalah inti bisnis mereka) · ⬜ Opsional/Tambahan · — Tidak relevan

---

### 0.8 Implikasi Teknis: Konfigurasi per Kategori

Sistem booking HARUS dikonfigurasi secara berbeda berdasarkan kategori:

```
Saat merchant pilih kategori usaha → sistem otomatis:

├── Barbershop / Salon
│   └── Aktifkan: Booking Sesi (T3)
│       Tampilkan: pilih layanan, pilih staff, durasi per layanan
│       Sembunyikan: kalender rental, upload KTP, pre-order

├── Rental Mobil / Motor
│   └── Aktifkan: Booking Rental (T4)
│       Tampilkan: kalender tanggal mulai-selesai, pilih unit, upload KTP/SIM
│       Sembunyikan: pilih staff/slot jam, menu makanan, kasir POS

├── Restoran / Kafe
│   └── Aktifkan: Produk Fisik (T1) + POS + KDS
│       Booking: OPSIONAL (hanya reservasi meja — bukan wajib)
│       Tampilkan: menu item, varian, kasir, meja/QR
│       Sembunyikan: kalender rental, upload dokumen

├── Produk Digital
│   └── Aktifkan: Digital (T2)
│       Tampilkan: upload file, set lisensi, preview watermark
│       Sembunyikan: alamat pengiriman, stok fisik, kurir, KDS

├── Bakeri / Kue Custom
│   └── Aktifkan: Produk Fisik (T1) + Pre-order (T5)
│       Tampilkan: tanggal siap, min order, custom form
│       Sembunyikan: kalender rental/booking, KDS

└── EO / Fotografer
    └── Aktifkan: Booking Sesi (T3) + Custom Order (T5)
        Tampilkan: kalender, paket layanan, brief form, deposit
        Sembunyikan: kasir POS, stok fisik, kurir
```

---

## BAGIAN 1: STATUS IMPLEMENTASI SAAT INI

### 1.1 Super Admin ✅ Lengkap

**Yang Sudah Ada:**
Dashboard KPI · Manajemen KYC merchant · Manajemen toko (suspend/unsuspend) · Tagihan & invoice · Persetujuan penarikan dana · Voucher platform-wide · Dispute resolution · Manajemen paket & plan matrix · Konfigurasi komisi · Konfigurasi payment gateway (Midtrans + Xendit) · Branding platform · Broadcast notifikasi · Auto-cancel pesanan · Impersonasi toko (support mode + audit) · Audit log · Domain kustom · Feature flags · Fee simulator · Rekonsiliasi keuangan · Template notifikasi · Banner homepage · Review iklan merchant · Manajemen akun pembeli · Moderasi konten · Revenue Intelligence Dashboard · Churn & Retensi · Laporan Keuangan & Pajak (PPN 11%) · Deteksi Fraud (rule-based + anomali GMV) · Auto-renewal reminder · Revenue Leakage Detector · Platform Health Score per Toko (`shop_health_score`)

**⚠️ Perlu Diperbaiki:**
| Fitur | Masalah | Saran Perbaikan |
|---|---|---|
| **Deteksi Fraud** | Hanya rule-based dasar, tidak ada ML scoring | Tambah skor risiko 0–100 per transaksi berdasarkan pola: IP, device, kecepatan order, nilai transaksi |
| **Manajemen Kategori** | Kategori global ada tapi CRUD dari admin belum dinamis | Buat halaman `/admin/categories` — add/edit/delete/reorder kategori bisnis beserta icon, slug, fitur toggle |
| **Konfigurasi Booking per Kategori** | Tidak ada toggle kategori mana yang boleh pakai booking | Admin harus bisa set: kategori apa yang aktifkan T3/T4, parameter per kategori (min jam sebelumnya, deposit wajib/tidak) |
| **Churn Analysis** | Hanya dashboard, tidak ada tindakan otomatis | Tambah trigger: jika toko tidak login 14 hari → otomatis kirim email re-engagement |
| **Laporan Keuangan** | CSV export ada tapi format belum standar akuntansi | Tambah format laporan kompatibel Jurnal / MYOB / Accurate |
| **Broadcast Notifikasi** | Kirim ke semua atau segmen toko, belum bisa ke pembeli | Pisahkan target: broadcast ke merchant vs. broadcast ke pembeli |
| **Manajemen Pengguna Pembeli** | Hanya lihat data, tidak ada tindakan | Tambah: suspend akun, reset password, lihat riwayat order, tambah kredit/cashback manual |

### 1.2 Merchant / Pemilik Toko ✅ Lengkap

**Yang Sudah Ada:**

**POS & Operasional (Tipe 1):** Kasir digital · KDS · Meja + QR order · Shift kasir · Split bill per orang · Printer thermal · Panggil pelayan realtime

**Katalog:** Menu/produk · Kategori · Varian & atribut · Bundle produk · Produk digital · Import CSV · Pre-order mode · Custom order form

**Stok:** Stok terpadu · Inventori bahan baku · Resep + HPP · Deduct otomatis via trigger · Auto nonaktif menu jika bahan habis · Estimasi stok habis · Notif stok kritis

**Supply Chain:** Supplier · Purchase Order

**Tim:** Karyawan · Jadwal · Absensi · Shift

**Pengiriman:** Delivery · Kurir · RajaOngkir · Label pengiriman · Bukti foto pengantaran · Tracking number

**Pelanggan:** Database pelanggan · Label otomatis (VIP/Reguler/Baru/Tidak Aktif) · Live chat · Inbox

**Marketing:** Promo · Voucher Toko · Platform voucher · Flash sale terjadwal · Kalender promo · Email marketing (PRO) · Iklan berbayar · Badge Tier Toko (Platinum/Gold/Top Seller) · Upselling engine

**Engagement:** Q&A produk + FAQ pin + auto-reply · Ulasan + sentiment analysis · Balas ulasan · Leaderboard · Portofolio / Galeri karya

**Booking (T3 & T4):** Slot layanan + manajemen booking · Reservasi meja + table maps · Halaman booking publik self-serve · Pilih staff · Deposit wajib (konfirmasi manual) · Voucher khusus booking + analitik · Pembatalan mandiri via token · Waitlist virtual · Reminder H-1/H-3 otomatis · Kalender ketersediaan rental per unit

**Keuangan:** Wallet · Escrow · Penarikan · Rekening bank · Billing plan · Membership pelanggan per toko · Wallet pelanggan per toko · Top-up wallet · Cashback

**Laporan:** Harian + share WA · Penjualan · Profit & margin · Marketplace analytics · Invoice PDF · Laporan Keuangan · Health Score

**Toko Online:** Storefront builder (4 tema) · Custom domain · Custom CSS · Storefront preview · Auto-reply luar jam buka · Katalog shareable link

**⚠️ Perlu Diperbaiki / Belum Ada:**
| Fitur | Status | Prioritas |
|---|---|---|
| **Reschedule mandiri booking oleh pelanggan** | ❌ Belum (hanya batal) | 🔥 TINGGI |
| **Paket & add-on saat booking** (Basic/Standard/Premium) | ❌ Belum | 🔥 TINGGI |
| **Deposit booking via payment gateway** | ❌ Belum (masih manual WA) | 🔥 TINGGI |
| **Upload dokumen (KTP/SIM) saat booking rental** | ❌ Belum | 🔥 TINGGI — Tipe 4 |
| **Galeri portofolio terintegrasi di halaman publik toko** | ⚠️ Ada di POS tapi belum muncul di /toko/:slug | TINGGI |
| **Catatan pelanggan per kunjungan** (riwayat layanan) | ❌ Belum | TINGGI |
| **Review post-booking otomatis H+1** | ❌ Belum | TINGGI |
| **Dashboard POS** date range picker kustom | ⚠️ Hanya 7/30 hari | SEDANG |
| **Bulk action pesanan** (update status sekaligus) | ❌ Belum | SEDANG |
| **Crop/resize foto produk** di browser | ❌ Belum | SEDANG |

### 1.3 Pembeli / Customer ✅ Lengkap

**Yang Sudah Ada:**
Beranda marketplace · Search + filter · Kategori · Flash sale · Featured shops · Banner iklan · Halaman toko + tier badge · Detail produk + varian + ulasan + foto ulasan · Q&A produk · Keranjang multi-toko · Checkout (delivery/pickup) · Berbagai metode bayar · Order tracking realtime · Bukti pengiriman kurir · Live chat dengan penjual · Dispute · Akun: pesanan, alamat, wishlist, favorit, notifikasi · Loyalty (poin, tier Bronze→Platinum, redeem) · Voucher ulang tahun otomatis · Notif poin kadaluarsa · Referral program dengan kode unik · Follow toko · Reorder 1-klik · Pesanan favorit (beri nama, pesan lagi) · Alert harga turun · Riwayat produk dilihat · Trust Certificate Badge · Estimasi waktu pengiriman · Perbandingan produk (4 item) · Return self-service · Cashback wallet · Riwayat booking · Memberships toko · Saldo wallet per toko · Custom order request & tracking

**⚠️ Perlu Diperbaiki:**
| Fitur | Masalah | Saran Perbaikan |
|---|---|---|
| **Pencarian** | Hanya full-text sederhana | Tambah filter: harga min–max, rating minimum, kategori, lokasi, metode bayar |
| **Keranjang** | Tidak bisa pilih item mana yang mau di-checkout | Tambah checkbox per item — pilih sebagian untuk checkout sekarang |
| **Checkout** | Alamat tersimpan tidak otomatis dipilih | Auto-select alamat default saat checkout dibuka |
| **Order Tracking** | Hanya status internal, belum integrasi resi kurir | Tambah tombol "Cek Resi" langsung buka tracking kurir |
| **Wishlist** | Alert harga turun hanya localStorage, tidak lintas device | Simpan price alert di database agar sinkron |
| **Notifikasi** | Notif in-app ada tapi belum ada push notification browser | Implementasi Web Push Notification (service worker) |
| **Ulasan** | Tidak bisa upload foto saat menulis ulasan | Tambah upload foto/video bukti di form ulasan |
| **Riwayat produk digital** | Tidak ada halaman khusus produk digital yang dibeli | Buat `/akun/digital-products` — list + link download per produk |

---

## BAGIAN 2: LOG PENGEMBANGAN

| Tanggal | Sprint | Fitur | Status |
|---|---|---|---|
| 11 Mei 2026 | Migrasi | Migrasi Vercel → Replit, semua routes aktif, Supabase terhubung | ✅ |
| 11 Mei 2026 | Sprint 1 | KYC Admin, Onboarding Wizard, Varian Produk, Payment Config, Komisi, Branding | ✅ |
| 11 Mei 2026 | Sprint 1 | Bottom Nav Mobile, Wishlist, Follow Toko, Badge Verifikasi, Notifikasi In-App | ✅ |
| 11 Mei 2026 | Sprint 2 | Payment Gateway (Midtrans + Xendit), Stok Terpadu, Auto-cancel, Storefront Preview | ✅ |
| 11 Mei 2026 | Sprint 2 | Produk Digital, Atribut Produk, Booking Jadwal, Tracking Pesanan, Kalender Promo | ✅ |
| 11 Mei 2026 | Sprint 2 | Invoice PDF, Fee Simulator, Feature Flags, Template Notif, Rekonsiliasi, Command Palette | ✅ |
| 12 Mei 2026 | Fase 1 | Panggil Pelayan, Notif KDS, Toast realtime, Re-order 1-tap, Estimasi Waktu Siap | ✅ |
| 12 Mei 2026 | Fase 2 | Tier Membership, Voucher Ulang Tahun, Notif Poin Kadaluarsa, Kode Referral Unik, Pesanan Favorit | ✅ |
| 12 Mei 2026 | Fase 3 | Stok turun otomatis, Notif stok kritis, Auto nonaktif menu, Bundle Produk, Estimasi stok habis | ✅ |
| 12 Mei 2026 | Fase 4 | Notif Promo Toko Diikuti, Live Chat Sebelum Beli, Pesanan Berulang, Estimasi Waktu Kirim, Q&A + FAQ Pin, Foto Ulasan | ✅ |
| 12 Mei 2026 | Fase 5 | Auto-reply luar jam, Flash Sale Terjadwal, Laporan Harian WA, Auto Print Struk, Split Bill | ✅ |
| 12 Mei 2026 | Fase 6 | Balas Ulasan Publik, Sentimen Ulasan, Moderasi Ulasan, Leaderboard Toko | ✅ |
| 12 Mei 2026 | Fase 7 | Manajemen Buyer, Moderasi Konten, Revenue Intelligence, Churn & Retensi, Laporan Pajak, Fraud Detection, Auto-renewal, Revenue Leakage | ✅ |
| 13 Mei 2026 | Sprint 8 | Notifikasi Keranjang Terbengkalai, Badge Tier Toko (Platinum/Gold/Top Seller), Label Pelanggan Auto (VIP/Reguler/Baru/Tidak Aktif), Alert Harga Turun, Platform Voucher Admin UI | ✅ |
| 13 Mei 2026 | Sprint 8 | **Voucher Toko** — merchant CRUD voucher khusus tokonya | ✅ |
| 13 Mei 2026 | Sprint 9 | **P-01 Halaman Booking Publik** (`/toko/:slug/booking`) — wizard 3 langkah: kalender, pilih slot, isi data; notif in-app; tombol konfirmasi WA | ✅ |
| 13 Mei 2026 | Sprint 9 | **P-02 Tombol Share Produk** — ShareButton di halaman produk: native share API + copy link + WA | ✅ |
| 13 Mei 2026 | Sprint 9 | **P-03 Share Keranjang** — tombol "Bagikan Keranjang" di sidebar cart, native share API atau copy ringkasan | ✅ |
| 13 Mei 2026 | Sprint 9 | **P-04 Pesan sebagai Hadiah** — checkbox di checkout: nama penerima + pesan ucapan yang dicetak di slip | ✅ |
| 13 Mei 2026 | Sprint 9 | **P-05 WA Notif Order** — tombol "WA ke Pelanggan" di detail order merchant, pesan template terisi otomatis | ✅ |
| 13 Mei 2026 | Sprint 9 | **P-06 Histori Harga** — grafik line chart di halaman produk, query tabel `menu_item_price_history` | ✅ |
| 13 Mei 2026 | Sprint 9 | **P-07 Size Chart** — tabel ukuran dinamis di halaman produk (dari field `size_chart` JSON) | ✅ |
| 13 Mei 2026 | Sprint 9 | **P-08 Tag Alergen & Dietary** — badge Halal/Vegan/Vegetarian + daftar alergen di halaman produk | ✅ |
| 13 Mei 2026 | Sprint 9 | **P-09 Ingredient List & BPOM** — nomor BPOM + daftar komposisi/bahan di halaman produk | ✅ |
| 13 Mei 2026 | Sprint 9 | **P-10 Tombol Bagikan Laporan Harian ke WA** — shareWA() di laporan harian + banner CTA | ✅ |
| 13 Mei 2026 | Sprint 9 | **Tombol Booking** di halaman toko marketplace — menonjol mengarah ke halaman booking publik | ✅ |
| 14 Mei 2026 | Sprint 10 | **M-05 Perbandingan Produk** — `/bandingkan` side-by-side hingga 4 produk + `lib/compare.ts` | ✅ |
| 14 Mei 2026 | Sprint 10 | **M-15 Katalog Link Shareable** — `/katalog/:slug` halaman publik + filter kategori + tombol share | ✅ |
| 13 Mei 2026 | Sprint 11 | **M-01 Pilih Staff/Resource saat Booking** — dropdown pilih staff + preferensi "siapa saja" di halaman booking publik | ✅ |
| 13 Mei 2026 | Sprint 11 | **M-10 Deposit Booking Online** — SQL: `require_deposit`, `deposit_percent`, `deposit_notes` di `coffee_shops`; `deposit_required`, `deposit_amount`, `deposit_status` di `bookings`; pengaturan DP di POS; step konfirmasi DP + transfer di halaman booking publik | ✅ |
| 13 Mei 2026 | Sprint 11 | **Voucher Khusus Booking (M-VB)** — tabel `booking_vouchers` + RLS + fungsi atomik `fn_use_booking_voucher()`; manajemen voucher di POS; input kode voucher di halaman booking publik dengan diskon otomatis | ✅ |
| 13 Mei 2026 | Sprint 11 | **Voucher Analytics Panel** — panel analitik di POS booking: pemakaian per kode, total diskon diberikan, dampak % revenue | ✅ |
| 13 Mei 2026 | Sprint 11 | **Fase B Pembatalan Mandiri** — kolom `cancellation_token UUID UNIQUE` + `cancelled_at` di `bookings`; halaman publik `/booking/cancel/:token` dengan 5 state; dekremen `booked_count` saat batal; notif pemilik toko otomatis | ✅ |
| 13 Mei 2026 | Sprint 11 | **M-12 Waitlist Virtual** — tabel `booking_waitlist` + RLS; slot penuh tampil amber; form antrean + posisi nomor urut; panel antrean di POS per slot | ✅ |
| 13 Mei 2026 | Sprint 12 | **Booking infra (G-1)** — tabel `booking_slots`, `bookings`, `booking_waitlist` penuh; fungsi `booking_cancel_by_token()`; fungsi `send_booking_reminders()` H-1 & H-3 + pg_cron harian `0 2 * * *` UTC | ✅ |
| 13 Mei 2026 | Sprint 12 | **M-07 Upselling Engine (G-3)** — tabel `product_upsell_suggestions`; fungsi `compute_upsell_suggestions()` co-occurrence 90 hari; pg_cron mingguan; panel `pos-app.upsell.tsx`; component publik `FrequentlyBoughtTogether` | ✅ |
| 13 Mei 2026 | Sprint 13 | **Pre-Order Mode (F-04)** — `pos-app.pre-orders.tsx` + kolom `pre_order_*` di `menu_items` | ✅ |
| 13 Mei 2026 | Sprint 13 | **Custom Order Form (F-05)** — `custom_order_requests`, `pos-app.custom-orders.tsx`, `toko.$slug.custom-order.tsx`, status history, timeline, RPC `get_customer_custom_orders` | ✅ |
| 13 Mei 2026 | Sprint 13 | **Platform Health Score (F-13)** — view `shop_health_score` + `admin.health-score.tsx` list + detail dengan radial/bar chart | ✅ |
| 13 Mei 2026 | Sprint 13 | **Filter Ukuran & Warna** di halaman toko (`toko.$slug.tsx`) — multi-select chip, filter client-side | ✅ |
| 13 Mei 2026 | Sprint 13 | **Portofolio / Galeri Karya Toko** — `pos-app.portfolio.tsx` + tabel `shop_portfolio` + before/after support | ✅ |
| 13 Mei 2026 | Sprint 13 | **Harga Grosir / Bulk Pricing** — `pos-app.bulk-pricing.tsx` | ✅ |
| 13 Mei 2026 | Sprint 13 | **Happy Hour / Time-based Pricing** — `pos-app.happy-hour.tsx` | ✅ |
| 13 Mei 2026 | Sprint 13 | **Cashback Wallet** — `akun.cashback.tsx` | ✅ |
| 13 Mei 2026 | Sprint 13 | **Return Self-Service** — `akun.returns.tsx` | ✅ |
| 13 Mei 2026 | Sprint 13 | **Membership Pelanggan per Toko** — `shop_membership_tiers`, `customer_memberships`, diskon otomatis di checkout | ✅ |
| 13 Mei 2026 | Sprint 13 | **Wallet Pelanggan per Toko** — `customer_wallets`, `wallet_topups`, approval owner, notifikasi | ✅ |
| 13 Mei 2026 | Sprint 13 | **Kalender Ketersediaan Rental** — `pos-app.rental-availability.tsx` (T4) | ✅ |
| 13 Mei 2026 | Sprint 13 | **Deposit per Pesanan (T1)** — `deposit_enabled`, `deposit_percent`, `deposit_min_total` di `coffee_shops`; kolom deposit di `orders` | ✅ |
| 13 Mei 2026 | Sprint 13 | **Tracking Pengiriman** — `tracking_number`, `courier_name`, `tracking_url` di `orders` | ✅ |

---

## BAGIAN 3: KATEGORI USAHA

> Semua kategori dapat ditambah, diubah, dan dinonaktifkan oleh Super Admin dari panel tanpa perlu deploy ulang.
> Kolom "Tipe Alur" merujuk ke Tipe 1–5 di Bagian 0.

### 3.1 Daftar Lengkap Kategori

#### 🍽️ Makanan & Minuman
| Kode | Nama | Contoh Usaha | Tipe Alur | Fitur Tambahan |
|---|---|---|---|---|
| `fnb_restaurant` | Restoran & Rumah Makan | Warung makan, nasi padang | T1 + opsional T3 | POS · KDS · Meja · QR order · Reservasi meja (opsional) |
| `fnb_cafe` | Kafe & Kedai Kopi | Kafe specialty, coffee shop | T1 + opsional T3 | POS · KDS · Happy hour · Reservasi meja (opsional) |
| `fnb_street` | Jajanan & Gerobak | Bakso, gorengan, mi ayam | T1 | POS sederhana · Delivery |
| `fnb_catering` | Katering & Box Nasi | Katering pernikahan, box makan | T5 | Pre-order tanggal acara · Min. porsi · Deposit |
| `fnb_bakery` | Bakeri & Kue | Toko kue, roti, kue ulang tahun | T1 + T5 | Pre-order · Custom design · Tanggal siap |
| `fnb_packaged` | Makanan Kemasan | Keripik, sambal, frozen food | T1 | Berat · Expired · Komposisi · Halal cert |
| `fnb_healthy` | Makanan Sehat | Salad, jus cold-pressed | T1 | Info kalori/nutrisi · Allergen tag · Langganan |

#### 💆 Kecantikan & Perawatan Diri
| Kode | Nama | Contoh Usaha | Tipe Alur | Fitur Tambahan |
|---|---|---|---|---|
| `beauty_salon` | Salon Rambut & Kecantikan | Salon wanita, hair studio | **T3** | Booking + pilih stylist · Before/after gallery · Membership |
| `beauty_barber` | Barbershop | Barber modern, pangkas rambut | **T3** | Booking + pilih barber · Before/after gallery · Loyalty stamp |
| `beauty_spa` | Spa & Relaksasi | Spa, pijat tradisional | **T3** | Booking sesi · Paket layanan · Gift voucher |
| `beauty_skincare` | Skincare & Kosmetik | Brand skincare lokal | T1 | Ingredient list · BPOM · Skin type tag |
| `beauty_waxing` | Waxing & Threading | Waxing studio | **T3** | Booking slot · Paket bundling |
| `beauty_tattoo` | Tato & Piercing | Tato studio | T3 + T5 | Booking konsultasi · Portofolio · Deposit |

#### 📸 Kreatif & Studio
| Kode | Nama | Contoh Usaha | Tipe Alur | Fitur Tambahan |
|---|---|---|---|---|
| `creative_photo` | Studio Foto & Fotografer | Studio foto, fotografer wedding | **T3** + T2 | Booking sesi + pilih paket · Portofolio · Deposit · Deliver file |
| `creative_video` | Videografer & Video Editor | Videografer wedding | T3 + T5 | Booking + brief form · Portofolio · Milestone |
| `creative_design` | Desainer Grafis & Digital | Logo design, ilustrator | **T5** + T2 | Custom order form · Brief · Deliver file · Revisi |
| `creative_music` | Musik & Entertainer | Band, DJ, penyanyi | T3 + T5 | Booking + deposit · Rider teknis |
| `creative_printing` | Percetakan & Sablon | Sablon kaos, undangan | **T5** + T1 | Custom order · Proofing digital · Min. qty |

#### 🔧 Otomotif & Kendaraan
| Kode | Nama | Contoh Usaha | Tipe Alur | Fitur Tambahan |
|---|---|---|---|---|
| `auto_rental_car` | **Rental Mobil** | Sewa mobil harian/mingguan | **T4** | Booking tanggal + durasi · Cek unit · Deposit · SIM/KTP wajib |
| `auto_rental_moto` | **Rental Motor** | Sewa motor, scooter wisata | **T4** | Booking tanggal + durasi · KTP wajib |
| `auto_rental_bike` | Rental Sepeda & Skuter | Rental sepeda wisata | T4 | Booking jam/hari · Lokasi ambil |
| `auto_workshop` | Bengkel & Otomotif | Bengkel mobil, ganti oli | T3 + T1 | Booking servis · Estimasi biaya · Notif selesai |
| `auto_washing` | Cuci Kendaraan | Cuci mobil, detailing | T3 | Booking antrian · Paket layanan |
| `auto_accessory` | Aksesori Kendaraan | Audio mobil, kaca film | T1 | Produk + jasa pasang |

#### 🏕️ Sewa Alat & Perlengkapan
| Kode | Nama | Contoh Usaha | Tipe Alur | Fitur Tambahan |
|---|---|---|---|---|
| `rental_camping` | **Sewa Alat Camping & Outdoor** | Tenda, sleeping bag, carrier | **T4** | Booking tanggal + durasi · Cek unit · Deposit · Kondisi alat |
| `rental_tools` | Sewa Alat & Perkakas | Scaffolding, alat pertukangan | T4 | Booking + durasi · Deposit · Bukti pengembalian |
| `rental_event` | Sewa Perlengkapan Event | Kursi, meja, dekorasi, sound | T4 | Booking + delivery · Jumlah item · Deposit |
| `rental_sport` | Sewa Alat Olahraga & Hobi | Snorkeling, kayak, surfboard | T4 | Booking + durasi · Ukuran/size · Deposit |
| `rental_baby` | Sewa Perlengkapan Bayi | Stroller, car seat, bouncer | T4 | Booking + durasi · Sertifikat kebersihan |
| `rental_electronic` | Sewa Elektronik & Gadget | Kamera, drone, proyektor | T4 | Booking + durasi · Deposit · Serial tracking |
| `rental_costume` | Sewa Kostum & Baju Adat | Baju adat, kostum karnaval | T4 + T3 | Booking + fitting · Ukuran · Deposit |
| `rental_vehicle_heavy` | Sewa Kendaraan Berat | Truk, pick-up, angkutan | T4 | Booking + durasi · Sopir/mandiri · Rute |

#### 🏠 Properti & Hunian
| Kode | Nama | Contoh Usaha | Tipe Alur | Fitur Tambahan |
|---|---|---|---|---|
| `property_kost` | Kost & Kontrakan | Kost harian/bulanan | T3 + T4 | Booking viewing · Syarat sewa · DP online |
| `property_villa` | Villa & Penginapan | Villa sewa, guest house | **T4** | Booking tanggal check-in/out · Kapasitas · Fasilitas |
| `property_coworking` | Coworking & Ruang Kerja | Coworking, meeting room | **T4** | Booking jam/hari · Kapasitas · Fasilitas AV |
| `property_studio` | Ruang Studio Sewa | Studio musik, podcast, dance | **T4** | Booking jam · Kapasitas · Alat tersedia |

#### 🎓 Pendidikan & Pelatihan
| Kode | Nama | Contoh Usaha | Tipe Alur | Fitur Tambahan |
|---|---|---|---|---|
| `edu_private` | Les & Kursus Privat | Les matematika, musik, coding | **T3** | Booking jadwal · Pilih guru · Paket sesi |
| `edu_group` | Kelas & Workshop | Workshop kerajinan, kelas yoga | **T3** | Booking + batas peserta · Materi · Sertifikat |
| `edu_online` | Kursus Online | Video course, e-book, modul | **T2** | Produk digital · Akses seumur hidup |
| `edu_tutor_center` | Bimbel & Lembaga Kursus | Bimbel TK–SMA, kursus bahasa | T3 | Booking · Absensi siswa · Laporan nilai |

#### ⚕️ Kesehatan & Kebugaran
| Kode | Nama | Contoh Usaha | Tipe Alur | Fitur Tambahan |
|---|---|---|---|---|
| `health_clinic` | Klinik & Praktek Dokter | Klinik umum, dokter gigi | **T3** | Booking konsultasi · Nomor antrian · Anamnesis digital |
| `health_therapy` | Terapi & Rehabilitasi | Fisioterapi, terapi wicara | **T3** | Booking sesi · Paket terapi · Rekam kemajuan |
| `health_gym` | Gym & Studio Fitness | Gym, yoga, pilates, zumba | T3 + T4 | Booking kelas · Membership bulanan |
| `health_massage` | Pijat & Refleksiologi | Pijat panggilan, refleksi | **T3** | Booking sesi · Pilih area (studio/panggilan) · Pilih terapis |
| `health_herb` | Herbal & Suplemen | Jamu, herbal, suplemen lokal | T1 | Komposisi · Izin BPOM · Pantangan konsumsi |

#### 🐾 Hewan Peliharaan
| Kode | Nama | Contoh Usaha | Tipe Alur | Fitur Tambahan |
|---|---|---|---|---|
| `pet_grooming` | Pet Grooming | Grooming anjing/kucing | **T3** | Booking + pilih layanan · Jenis hewan · Ukuran |
| `pet_hotel` | Pet Hotel & Penitipan | Penitipan hewan saat liburan | **T4** | Booking tanggal + durasi · Kapasitas · Update foto |
| `pet_vet` | Klinik Hewan & Veteriner | Dokter hewan | **T3** | Booking konsultasi · Rekam medis |
| `pet_supplies` | Pakan & Aksesori Hewan | Pakan, mainan, kandang | T1 | Produk · Filter spesies |

#### ✈️ Perjalanan & Wisata
| Kode | Nama | Contoh Usaha | Tipe Alur | Fitur Tambahan |
|---|---|---|---|---|
| `travel_tour` | Paket Wisata & Tour | Open trip, private trip | **T3** + T5 | Booking + deposit · Itinerary · Min. peserta |
| `travel_guide` | Pemandu Wisata | Guide lokal, tour guide | **T3** | Booking · Pilih bahasa · Sertifikasi |
| `travel_transport` | Jasa Transportasi | Jemputan wisata, carter | T4 + T3 | Booking + rute · Kapasitas · Sopir |

#### 🏡 Rumah & Lifestyle
| Kode | Nama | Contoh Usaha | Tipe Alur | Fitur Tambahan |
|---|---|---|---|---|
| `home_interior` | Jasa Interior & Renovasi | Desain interior, renovasi | T3 + **T5** | Booking konsultasi · Portofolio · Estimasi biaya |
| `home_cleaning` | Laundry & Kebersihan | Laundry kiloan, jasa bersih | T3 + T1 | Booking + pickup/delivery · Estimasi selesai |
| `home_garden` | Tanaman & Taman | Tanaman hias, jasa taman | T1 + T5 | Panduan perawatan · Jasa taman custom |
| `home_furniture` | Furnitur Custom | Furniture custom, lemari built-in | **T5** | Custom order form · Dimensi · Estimasi produksi |
| `home_decor` | Dekorasi & Aksesoris Rumah | Bantal, karpet, lilin | T1 | Dimensi · Material |

#### 👗 Fashion & Gaya
| Kode | Nama | Contoh Usaha | Tipe Alur | Fitur Tambahan |
|---|---|---|---|---|
| `fashion_ready` | Fashion Ready-to-Wear | Baju, celana, dress, hijab | **T1** | Varian ukuran + warna · Size chart · Lookbook |
| `fashion_custom` | Konveksi & Jahitan | Jahit baju custom, konveksi | **T5** | Custom order form · Pilih bahan · Estimasi · Fitting |
| `fashion_preloved` | Fashion Pre-loved | Thrift, pakaian bekas | T1 | Kondisi (A/B/C) · Ukuran actual · Bukan retur |
| `fashion_accessories` | Aksesori & Perhiasan | Tas, sepatu, perhiasan UMKM | T1 | Bahan · Ukuran |

#### 🎨 Kerajinan & Seni
| Kode | Nama | Contoh Usaha | Tipe Alur | Fitur Tambahan |
|---|---|---|---|---|
| `craft_handmade` | Kerajinan Tangan | Anyaman, gerabah, batik, lilin | T1 + T5 | Custom order · Estimasi produksi · Limited edition |
| `art_visual` | Seni Rupa & Lukisan | Lukisan, ilustrasi komisi | T3 + **T5** | Booking komisi · Portofolio · Certificate of Authenticity |
| `craft_jewelry` | Perhiasan & Aksesoris Handmade | Cincin silver, gelang | T1 + T5 | Custom engraving · Ukuran jari · Material |

#### 💻 Digital & Teknologi
| Kode | Nama | Contoh Usaha | Tipe Alur | Fitur Tambahan |
|---|---|---|---|---|
| `digital_product` | Produk Digital | Template, font, e-book, preset | **T2** | Auto-delivery · Lisensi · Preview watermark |
| `digital_service` | Jasa Digital | Web developer, SEO, SMM | T3 + **T5** | Brief form · Milestone · Deliver file · Revisi |
| `digital_repair` | Servis Elektronik | Servis HP, laptop, CCTV | T3 + T1 | Booking antar · Estimasi biaya · Notif selesai |

#### 🌾 Pertanian & Agribisnis
| Kode | Nama | Contoh Usaha | Tipe Alur | Fitur Tambahan |
|---|---|---|---|---|
| `agri_fresh` | Hasil Tani Segar | Sayur, buah dari kebun | T1 | Berat · Musim panen · Langganan mingguan |
| `agri_processed` | Produk Olahan Pertanian | Beras premium, kopi petani | T1 | Sertifikasi · Asal daerah |
| `agri_livestock` | Ternak & Hasil Ternak | Telur kampung, daging segar | T1 | Stok terbatas · Langganan |

#### 🎭 Event & Hiburan
| Kode | Nama | Contoh Usaha | Tipe Alur | Fitur Tambahan |
|---|---|---|---|---|
| `event_organizer` | Event Organizer | EO pernikahan, seminar | T3 + **T5** | Booking + brief · Paket EO · Deposit |
| `event_entertainer` | Entertainer & Performer | MC, badut, sulap, akustik | **T3** + T5 | Booking + brief · Rider teknis · Deposit |
| `event_venue` | Sewa Venue | Aula, ballroom, rooftop | **T4** | Booking tanggal + durasi · Kapasitas · Fasilitas |

#### 📦 Lainnya
| Kode | Nama | Contoh Usaha | Tipe Alur | Fitur Tambahan |
|---|---|---|---|---|
| `other_general` | Jasa Umum | Jasa titip, kurir lokal | T3 | Deskripsi bebas |
| `other_b2b` | Grosir & Distributor | Agen sembako, distributor | T1 | Harga grosir · MOQ · Syarat reseller |

---

## BAGIAN 4: SISTEM BOOKING — STATUS & ROADMAP

> **Penting:** Sistem booking HANYA diaktifkan untuk kategori usaha berbasis Tipe 3 (Booking Sesi) dan Tipe 4 (Booking Rental). F&B biasa (warung, kafe) TIDAK membutuhkan booking — mereka menggunakan POS + marketplace biasa. Reservasi meja untuk restoran adalah fitur opsional terpisah.

### 4.1 Status Saat Ini

| Komponen | Status |
|---|---|
| Buat slot layanan (tanggal, jam, durasi, kapasitas, harga) | ✅ |
| Tambah booking manual oleh merchant | ✅ |
| Manajemen status: pending → confirmed → done → cancelled | ✅ |
| Tabel `booking_slots` dan `bookings` di database | ✅ |
| Reservasi meja restoran | ✅ |
| Halaman booking publik (`/toko/:slug/booking`) | ✅ |
| Pilih staff/resource saat booking | ✅ |
| Deposit wajib (konfirmasi manual) | ✅ |
| Voucher diskon khusus booking | ✅ |
| Analitik voucher booking per kode | ✅ |
| Pembatalan mandiri via link token | ✅ |
| Waitlist virtual saat slot penuh | ✅ |
| Reminder otomatis H-1 / H-3 | ✅ |
| Riwayat booking di akun pembeli | ✅ |
| Kalender ketersediaan real-time | ✅ |
| Kalender ketersediaan rental per unit (Tipe 4) | ✅ |
| **Reschedule mandiri oleh pembeli** | ❌ Belum |
| **Paket layanan + add-on saat booking** | ❌ Belum |
| **Deposit via payment gateway (Midtrans/Xendit)** | ❌ Belum |
| **Upload dokumen (KTP/SIM) untuk rental** | ❌ Belum |
| **Checklist kondisi sebelum/sesudah rental** | ❌ Belum |
| **Review post-booking (notif H+1 otomatis)** | ❌ Belum |
| **Kalender sync / export .ics** | ❌ Belum |
| **Catatan pelanggan per kunjungan** | ❌ Belum |
| **Perpanjangan sewa mandiri (Tipe 4)** | ❌ Belum |

### 4.2 Jenis Booking per Kategori (Konfigurasi Otomatis)

| Tipe Usaha | Jenis Booking | Field Tampil | Field Sembunyi |
|---|---|---|---|
| Barbershop / Salon | Sesi (T3) | Pilih layanan · Pilih staff · Durasi | Kalender rental · Upload KTP |
| Spa / Pijat / Gym Kelas | Sesi (T3) | Pilih layanan · Pilih terapis · Durasi | Kalender rental |
| Studio Foto / Fotografer | Sesi + Paket (T3) | Pilih paket · Brief · Pilih lokasi | Kalender rental |
| Klinik / Dokter / Terapi | Konsultasi (T3) | Keluhan awal · Pilih dokter/terapis | Upload KTP · Kalender rental |
| Pet Grooming | Sesi (T3) | Info hewan (jenis, ras, ukuran) | Kalender rental |
| Rental Mobil / Motor | Rental (T4) | Tanggal mulai-selesai · Pilih unit · Upload KTP/SIM | Pilih staff/slot jam |
| Sewa Alat Camping | Rental (T4) | Tanggal mulai-selesai · Pilih item · Jumlah | Upload KTP (opsional) |
| Villa / Penginapan | Rental (T4) | Check-in/out · Jumlah tamu · Pilih kamar | Pilih staff |
| Coworking / Studio | Rental (T4) | Pilih tanggal+jam · Kapasitas | Pilih staff · Upload KTP |
| Pet Hotel | Rental (T4) | Info hewan · Tanggal mulai-selesai | Pilih staff |
| Les Privat / Workshop | Kelas (T3) | Pilih guru · Level · Batas peserta | Kalender rental |
| EO / Entertainer | Jasa (T3+T5) | Tanggal acara · Brief · Deposit | Kalender rental |
| Restoran / Kafe | Reservasi Meja (opsional) | Jumlah orang · Permintaan khusus | Semua field booking lain |

### 4.3 Roadmap Booking Lengkap

#### Fase A — Booking Publik ✅ Selesai
URL: `/toko/:slug/booking` — wizard 3 langkah, termasuk pilih staff, voucher, DP konfirmasi manual.

#### Fase A+ — Booking Enhancements ✅ Selesai (Sprint 11)
- ✅ Pilih staff/resource
- ✅ Deposit wajib (konfirmasi manual)
- ✅ Voucher khusus booking
- ✅ Analitik voucher
- ✅ Pembatalan mandiri via token
- ✅ Waitlist virtual

#### Fase B — Manajemen Lanjutan ✅ Sebagian Selesai
- ✅ Pembatalan mandiri oleh pelanggan via link aman
- ✅ Reminder otomatis H-3 dan H-1
- ✅ Riwayat booking di akun pembeli
- ❌ Reschedule mandiri (hanya batal yang ada)

#### Fase C — Fitur Lanjutan (~5 hari) ❌ Belum
- ❌ Deposit payment terintegrasi Midtrans/Xendit
- ❌ Paket + add-on saat booking (pilih layanan ekstra)
- ❌ Upload dokumen (KTP/SIM) untuk kategori rental
- ❌ Checklist kondisi sebelum/sesudah rental
- ❌ Review post-booking (notif H+1 otomatis)
- ❌ Kalender sync (export .ics ke Google Calendar)
- ❌ Reschedule mandiri minimal H-24 sebelum jadwal

#### Fase D — Booking Spesifik Kategori ❌ Belum
- ❌ Antrean digital klinik (nomor antrian + estimasi waktu)
- ❌ Anamnesis digital sebelum konsultasi
- ❌ Catatan pelanggan per kunjungan (riwayat layanan)
- ❌ Perpanjangan sewa mandiri (Tipe 4)
- ❌ Milestone escrow untuk project jangka panjang

---

## BAGIAN 5: BACKLOG — FITUR PRIORITAS

### 🔴 Bangun Sekarang (Dampak Besar, Effort Kecil — < 1 hari)

| # | Fitur | Tipe Usaha | Impact | Status |
|---|---|---|---|---|
| P-01 | **Halaman Booking Publik** (`/toko/:slug/booking`) | Jasa (T3 & T4) | Konversi | ✅ Selesai |
| P-02 | **Tombol Share Produk** (WA/IG/copy link) | Semua | Viral | ✅ Selesai |
| P-03 | **Share Keranjang** | Semua | Viral | ✅ Selesai |
| P-04 | **Pesan sebagai Hadiah** | Semua | AOV | ✅ Selesai |
| P-05 | **WhatsApp Notif Order** | Merchant | Retensi | ✅ Selesai |
| P-06 | **Histori Harga** | Semua | Kepercayaan | ✅ Selesai |
| P-07 | **Size Chart** per produk | Fashion | Konversi | ✅ Selesai |
| P-08 | **Tag Alergen & Dietary** | F&B | Kepercayaan | ✅ Selesai |
| P-09 | **Ingredient List & Nomor BPOM** | Beauty/F&B | Trust | ✅ Selesai |
| P-10 | **Bagikan Laporan Harian ke WA** | Merchant | Efisiensi | ✅ Selesai |

### 🟡 Kuartal Ini (Dampak Besar, Effort Sedang — 1–3 hari)

| # | Fitur | Tipe Usaha | Impact | Status |
|---|---|---|---|---|
| M-01 | **Pilih Staff/Resource saat Booking** | Jasa T3 | Konversi | ✅ Selesai |
| M-02 | **Portofolio / Galeri Karya** di halaman publik toko | Jasa/Kreatif | Kepercayaan | ⚠️ Ada di POS, belum tampil di /toko/:slug |
| M-03 | **Reminder Booking Otomatis** H-1 dan H-3 | Jasa T3&T4 | Retensi | ✅ Selesai |
| M-04 | **Reschedule Booking Mandiri** | Pembeli | UX | ❌ Belum |
| M-05 | **Perbandingan Produk** | Pembeli | Konversi | ✅ Selesai |
| M-06 | **Return Self-Service** | Pembeli | Kepercayaan | ✅ Selesai |
| M-07 | **Upselling Engine** ("Sering dibeli bersama") | Merchant | AOV | ✅ Selesai |
| M-08 | **Harga Grosir / Bulk Pricing** | Merchant | Pendapatan | ✅ Selesai |
| M-09 | **Cek Ketersediaan Unit Rental** real-time | Rental T4 | Konversi | ✅ Selesai |
| M-10 | **Deposit Booking Online** | Jasa/Rental | Komitmen | ✅ Manual · ❌ Gateway belum |
| M-11 | **Happy Hour / Time-based Pricing** | F&B | Pendapatan | ✅ Selesai |
| M-12 | **Waitlist Virtual** | F&B/Jasa | Retensi | ✅ Selesai |
| M-13 | **Preview Produk Digital** (watermarked sample) | Digital T2 | Konversi | ❌ Belum |
| M-14 | **Cashback Wallet** | Pembeli | Retensi | ✅ Selesai |
| M-15 | **Katalog PDF / Link Shareable** | Merchant | Pemasaran | ✅ Selesai |
| M-VB | **Voucher Khusus Booking** | Jasa T3 | Konversi | ✅ Selesai |
| M-16 | **Upload Dokumen KTP/SIM saat Booking Rental** | Rental T4 | Legal/UX | ❌ Belum |
| M-17 | **Paket Layanan + Add-on saat Booking** | Jasa T3 | AOV | ❌ Belum |
| M-18 | **Review Post-Booking Otomatis H+1** | Jasa T3&T4 | Kepercayaan | ❌ Belum |
| M-19 | **Galeri Portofolio tampil di halaman publik /toko/:slug** | Jasa/Kreatif | Kepercayaan | ❌ Belum |
| M-20 | **Halaman Produk Digital di Akun** (`/akun/digital-products`) | Digital T2 | UX | ❌ Belum |

### 🟢 Masa Depan (Dampak Besar, Effort Besar — 3+ hari)

| # | Fitur | Estimasi | Status |
|---|---|---|---|
| F-01 | Group Buy / Patungan | 3 hari | ❌ |
| F-02 | Subscription / Langganan Produk Rutin | 3 hari | ❌ |
| F-03 | AI Generator Deskripsi Produk (foto → nama + deskripsi + tag) | 2 hari | ❌ |
| F-04 | Pre-Order Mode | 2 hari | ✅ Selesai Sprint 13 |
| F-05 | Custom Order Form | 2 hari | ✅ Selesai Sprint 13 |
| F-06 | Affiliate Program per Toko | 3 hari | ❌ |
| F-07 | Google Analytics & Meta Pixel Integration | 2 hari | ❌ |
| F-08 | Rating Pembeli 2-Way | 2 hari | ❌ |
| F-09 | Live Streaming Commerce | 7+ hari | ❌ |
| F-10 | BNPL / Cicilan (Kredivo, Akulaku) | 5 hari | ❌ |
| F-11 | Mobile App (React Native / Expo) | 3+ minggu | ❌ |
| F-12 | Merchant Onboarding Email Sequence | 2 hari | ❌ |
| F-13 | Platform Health Score per Toko | 2 hari | ✅ Selesai Sprint 13 |
| F-14 | Automated Payout Scheduler | 2 hari | ❌ |
| F-15 | Multi-Admin Super Admin (Finance/Support/Content) | 2 hari | ❌ |
| F-16 | Deposit via Payment Gateway (Midtrans/Xendit) untuk Booking | 3 hari | ❌ |
| F-17 | Reschedule Mandiri Booking | 2 hari | ❌ |
| F-18 | Antrean Digital Klinik (nomor antrian + estimasi tunggu) | 2 hari | ❌ |
| F-19 | Checklist Kondisi Rental (sebelum & sesudah) | 2 hari | ❌ |
| F-20 | Lisensi & Limit Download Produk Digital | 2 hari | ❌ |
| F-21 | Kursus Online dengan Progress Tracking | 5 hari | ❌ |

---

## BAGIAN 6: FITUR KHUSUS PER KATEGORI — STATUS DETAIL

### 6.1 F&B — Restoran, Kafe, Warung (Tipe 1)

> **Alur utama:** POS walk-in + marketplace order + delivery. Booking meja adalah OPSIONAL dan terpisah dari sistem booking layanan.

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| R-01 | POS kasir digital | ✅ | — |
| R-02 | KDS (Kitchen Display System) | ✅ | — |
| R-03 | QR order meja tanpa app | ✅ | — |
| R-04 | Tag Alergen & Dietary per menu | ✅ | — |
| R-05 | Waitlist Virtual (meja penuh) | ✅ M-12 | — |
| R-06 | Happy Hour / Harga Waktu | ✅ | — |
| R-07 | Reservasi Meja dari marketplace | ⚠️ Merchant-side only | 🔥 TINGGI |
| R-08 | Pre-Order Katering (tanggal + waktu) | ✅ Pre-order mode | — |
| R-09 | Menu Paket / Combo Builder | ❌ | SEDANG |
| R-10 | Informasi Nutrisi (kalori, protein, lemak) | ❌ | SEDANG |
| R-11 | Kitchen Load Monitor (estimasi tunggu) | ❌ | SEDANG |
| R-12 | Split bill per orang | ✅ | — |

**F&B tidak membutuhkan:** Pilih staff, kalender booking sesi, upload KTP, checklist kondisi, file delivery.

### 6.2 Produk Digital (Tipe 2)

> **Alur utama:** Upload file → pembeli beli → auto-deliver → download. Tidak ada pengiriman fisik, tidak ada booking, tidak ada stok.

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| PD-01 | Upload produk digital (zip, pdf, mp4, dll.) | ✅ | — |
| PD-02 | Auto-delivery file setelah pembayaran | ✅ | — |
| PD-03 | Preview watermarked (sample sebelum beli) | ❌ | 🔥 TINGGI |
| PD-04 | Lisensi produk (personal use vs. commercial) | ❌ | TINGGI |
| PD-05 | Limit download per lisensi (anti-sharing) | ❌ | SEDANG |
| PD-06 | Update versi → pembeli lama dapat notif | ❌ | SEDANG |
| PD-07 | Kode aktivasi / serial key untuk software | ❌ | SEDANG |
| PD-08 | Halaman `/akun/digital-products` (riwayat + download) | ❌ | TINGGI |
| PD-09 | Kursus online dengan progress tracking | ❌ | SEDANG |

**Produk Digital tidak membutuhkan:** Alamat pengiriman, kurir, stok fisik, KDS, booking jadwal.

### 6.3 Barbershop & Salon (Tipe 3 — Booking Sesi)

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| SB-01 | Booking layanan per slot waktu | ✅ | — |
| SB-02 | Pilih stylist/barber spesifik | ✅ | — |
| SB-03 | Durasi layanan berbeda per jenis | ⚠️ Dasar ada | TINGGI |
| SB-04 | Galeri hasil karya (before/after foto) | ✅ Ada di POS · ❌ Belum tampil di /toko/:slug | 🔥 TINGGI |
| SB-05 | Membership / Paket Langganan (10 potong bayar 8) | ✅ Shop membership | SEDANG |
| SB-06 | Pengingat potong rambut (notif 4 minggu setelah kunjungan) | ❌ | SEDANG |
| SB-07 | Catatan pelanggan per kunjungan | ❌ | SEDANG |
| SB-08 | Reschedule mandiri oleh pelanggan | ❌ | TINGGI |
| SB-09 | Konfirmasi booking via WA otomatis | ⚠️ Tombol manual ada | TINGGI |
| SB-10 | Deposit online via payment gateway | ❌ (konfirmasi manual ✅) | SEDANG |
| SB-11 | Review post-booking otomatis H+1 | ❌ | TINGGI |

### 6.4 Rental Mobil, Motor, Alat Camping (Tipe 4 — Booking Rental)

> **Alur utama:** Pilih unit → pilih tanggal mulai-selesai → cek ketersediaan → upload KTP/SIM → deposit → konfirmasi → ambil → gunakan → kembalikan → settlement.

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| RT-01 | Kalender ketersediaan per unit (date-range) | ✅ | — |
| RT-02 | Manajemen armada/unit (ID, foto, kondisi) | ⚠️ Dasar ada | TINGGI |
| RT-03 | Upload dokumen (KTP/SIM) saat booking | ❌ | 🔥 TINGGI |
| RT-04 | Hitung deposit otomatis (nilai × durasi) | ❌ | TINGGI |
| RT-05 | Perpanjangan sewa mandiri | ❌ | SEDANG |
| RT-06 | Checklist kondisi sebelum/sesudah sewa | ❌ | TINGGI |
| RT-07 | Billing denda keterlambatan (per hari) | ❌ | SEDANG |
| RT-08 | Syarat & ketentuan per kategori (T&C digital) | ❌ | TINGGI |
| RT-09 | Deposit via payment gateway | ❌ | TINGGI |
| RT-10 | Notifikasi "Unit siap diambil" | ❌ | SEDANG |

**Rental tidak membutuhkan:** Pilih staff, slot jam, KDS, kasir F&B, daftar menu.

### 6.5 Studio Foto & Fotografer (Tipe 3 + Tipe 2)

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| SF-01 | Booking sesi foto publik | ✅ | — |
| SF-02 | Pilih paket sesi (Basic 1 jam, Standard, Premium) | ❌ | 🔥 TINGGI |
| SF-03 | Pilih lokasi (studio, outdoor, lokasi klien) | ❌ | TINGGI |
| SF-04 | Portofolio galeri tampil di halaman publik | ❌ | 🔥 TINGGI |
| SF-05 | Upload file hasil foto ke klien (link download) | ❌ | TINGGI |
| SF-06 | Deposit wajib saat booking | ✅ (manual) · ❌ gateway | TINGGI |
| SF-07 | Brief form sebelum sesi | ❌ | TINGGI |
| SF-08 | Add-on saat booking (editing ekstra, album, dll.) | ❌ | SEDANG |
| SF-09 | Review dengan foto hasil karya (klien upload) | ❌ | TINGGI |

### 6.6 Fashion & Pakaian (Tipe 1 + Tipe 5)

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| FA-01 | Size chart per produk | ✅ | — |
| FA-02 | Filter ukuran dan warna di halaman toko | ✅ | — |
| FA-03 | Panduan ukuran interaktif ("Tinggi 165cm → pilih M") | ❌ | SEDANG |
| FA-04 | Label "Pre-loved / Second" untuk produk bekas | ❌ | SEDANG |
| FA-05 | Lookbook / foto model yang pakai produk | ❌ | SEDANG |
| FA-06 | Custom order (warna khusus, ukuran khusus) | ✅ Custom order form | — |
| FA-07 | Notif "Ukuran kamu tersedia lagi" saat restok | ❌ | TINGGI |

### 6.7 Skincare & Kecantikan (Tipe 1)

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| BE-01 | Ingredient list lengkap per produk | ✅ | — |
| BE-02 | Nomor izin BPOM & tanggal kedaluwarsa | ✅ | — |
| BE-03 | Tag skin type: oily, dry, combination, sensitive | ❌ | TINGGI |
| BE-04 | Quiz rekomendasi produk (jenis kulit) | ❌ | SEDANG |
| BE-05 | Klaim verifikasi: "Dermatologically tested" | ❌ | SEDANG |
| BE-06 | Bundling skincare routine | ✅ Bundle produk | — |

### 6.8 Klinik & Jasa Kesehatan (Tipe 3)

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| KL-01 | Booking konsultasi dokter/terapis | ✅ Booking sesi ada | — |
| KL-02 | Anamnesis digital sebelum konsultasi | ❌ | SEDANG |
| KL-03 | Rekam medis sederhana per pasien | ❌ | SEDANG |
| KL-04 | Nomor antrian digital + estimasi waktu tunggu | ❌ | TINGGI |
| KL-05 | Tagihan & resep digital | ❌ | SEDANG |
| KL-06 | Telemedicine / konsultasi video | ❌ | RENDAH |
| KL-07 | Reminder jadwal kontrol ulang | ❌ | SEDANG |

### 6.9 Jasa Digital & Freelancer (Tipe 3 + Tipe 5)

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| JU-01 | Booking konsultasi per jam / per sesi | ✅ Booking sesi ada | — |
| JU-02 | Custom order form (brief klien) | ✅ | — |
| JU-03 | Status history custom order | ✅ | — |
| JU-04 | WA template per perubahan status | ✅ | — |
| JU-05 | Deliver hasil kerja via platform (upload file) | ❌ | TINGGI |
| JU-06 | Milestone tracking untuk project jangka panjang | ❌ | SEDANG |
| JU-07 | Escrow per milestone (bayar bertahap sesuai progress) | ❌ | SEDANG |
| JU-08 | Kontrak freelance digital | ❌ | SEDANG |

### 6.10 Kerajinan & Produk Seni (Tipe 1 + Tipe 5)

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| KR-01 | Custom order (spesifikasi warna, ukuran, motif) | ✅ Custom order form | — |
| KR-02 | Estimasi waktu produksi per produk | ❌ | TINGGI |
| KR-03 | Certificate of Authenticity (COA) digital | ❌ | SEDANG |
| KR-04 | Edisi terbatas (limited edition) dengan counter stok | ❌ | SEDANG |
| KR-05 | Galeri proses pembuatan (work-in-progress) | ❌ | SEDANG |
| KR-06 | Opsi harga grosir / reseller | ✅ Bulk pricing | — |

---

## BAGIAN 7: SUPER ADMIN — BACKLOG

### Yang Perlu Diperbaiki
| Fitur | Masalah | Saran |
|---|---|---|
| Broadcast Notifikasi | Hanya ke merchant, belum ke pembeli | Pisahkan target: merchant vs. pembeli |
| Manajemen Pembeli | Hanya lihat data, tidak ada kredit manual | Tambah: kredit cashback, suspend, reset password |
| Churn Analysis | Dashboard ada, tidak ada tindakan otomatis | Auto-kirim email re-engagement jika tidak login 14 hari |
| Laporan Keuangan | Ada tapi format belum standar akuntansi | Format kompatibel Jurnal / Accurate |
| Deteksi Fraud | Hanya rule-based dasar | Tambah skor risiko 0–100 per transaksi |
| Konfigurasi Booking per Kategori | Tidak ada toggle kategori mana yang pakai T3/T4 | Admin set: kategori apa yang aktifkan booking, parameter per kategori |

### Yang Belum Ada
| # | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| SA-01 | 🔥 **Merchant Onboarding Automation** | TINGGI | Email sequence otomatis: Hari 1 (selamat datang), Hari 3 (panduan produk), Hari 7 (tips penjualan pertama) |
| SA-02 | ✅ **Platform Health Score per Toko** | — | Selesai Sprint 13 |
| SA-03 | 🔥 **Automated Payout Scheduler** | TINGGI | Payout otomatis terjadwal tanpa approval manual per item |
| SA-04 | 🔥 **Merchant Tier Program** | TINGGI | Starter → Verified → Top Seller → Elite — kriteria otomatis dinilai harian |
| SA-05 | 🔥 **Konfigurasi Booking per Kategori** | TINGGI | Toggle kategori mana yang aktifkan T3/T4, set parameter per kategori |
| SA-06 | **Multi-Admin dengan Role** | SEDANG | Finance Admin, Support Admin, Content Admin |
| SA-07 | **Cohort & LTV Analytics** | SEDANG | Analisis merchant aktif 3/6/12 bulan, LTV per paket |
| SA-08 | **Data Export / GDPR Tools** | SEDANG | Pembeli/merchant bisa request export data, right-to-erasure |
| SA-09 | **Sandbox / Demo Mode** | SEDANG | Calon merchant coba POS & dashboard dengan data dummy |
| SA-10 | **A/B Testing Manager** | SEDANG | Admin buat eksperimen: versi A vs B, track konversi |
| SA-11 | **Tax Management** | TINGGI | Laporan PPh/PPN per periode, format SPT |
| SA-12 | **SLA & Response Time Monitor** | SEDANG | Monitor rata-rata respons API, uptime 30 hari |
| SA-13 | **Affiliate & Partner Management** | SEDANG | Kelola afiliator, track klik & konversi, hitung komisi |

---

## BAGIAN 8: ARSITEKTUR TEKNIS

### Stack
| Layer | Teknologi |
|---|---|
| Frontend | React 19 + Vite + TanStack Router + TanStack Query |
| UI | shadcn/ui + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) + Express 5 |
| ORM | Drizzle ORM (Express side) |
| Payment | Midtrans + Xendit (via API + Webhook, secret terenkripsi) |
| Email | Supabase Auth emails + Resend/SendGrid (Fase 2) |
| Monorepo | pnpm workspaces |

### Routing
```
/                          → Marketplace beranda
/kategori/:slug            → Halaman kategori
/toko/:slug                → Halaman toko (produk + info + portofolio)
/toko/:slug/booking        → Booking layanan publik ✅
/toko/:slug/produk/:id     → Detail produk
/toko/:slug/custom-order   → Custom order form ✅
/toko/:slug/custom-order/status → Status custom order pelanggan ✅
/katalog/:slug             → Katalog link shareable ✅
/bandingkan                → Perbandingan produk ✅
/search                    → Hasil pencarian
/keranjang                 → Keranjang
/checkout                  → Checkout
/booking/cancel/:token     → Pembatalan booking via link ✅
/akun/*                    → Akun pembeli
/akun/bookings             → Riwayat booking ✅
/akun/digital-products     → Produk digital yang dibeli ❌ Belum
/akun/returns              → Return self-service ✅
/akun/cashback             → Cashback & wallet ✅
/pos-app/*                 → Dashboard merchant
/pos-app/booking           → Manajemen booking ✅
/pos-app/portfolio         → Portofolio / galeri karya ✅
/pos-app/upsell            → Upselling engine ✅
/pos-app/rental-availability → Ketersediaan unit rental ✅
/pos-app/custom-orders     → Custom order requests ✅
/pos-app/pre-orders        → Pre-order mode ✅
/admin/*                   → Super admin
/admin/health-score        → Platform health score ✅
/s/:slug/*                 → Storefront per toko (website sendiri)
```

### Pola Database
- Semua data merchant di-scope `shop_id`
- Row Level Security (RLS) Supabase — `owner_id` di `coffee_shops` sebagai basis
- Notifikasi via tabel `notifications` + Supabase Realtime
- Sensitive data (payment secrets) disimpan terenkripsi AES-256
- `booking_type` akan membedakan T3 (sesi) vs T4 (rental) di level tabel

---

## BAGIAN 9: MODEL BISNIS

### Sumber Pendapatan Platform
1. **Biaya Sewa Bulanan** — Starter / Growth / Pro / Enterprise
2. **Komisi Transaksi** — % dari setiap transaksi berhasil (dikonfigurasi per kategori/paket)
3. **Biaya Iklan** — Posisi iklan premium di marketplace
4. **Tema Berbayar** — Tema toko premium
5. **Biaya Admin Penarikan** — Biaya per request penarikan dana

### Keputusan Final
| Keputusan | Jawaban |
|---|---|
| Nama platform | Dinamis — dikonfigurasi Super Admin |
| Model komisi | Sepenuhnya dikonfigurasi Super Admin (global, per kategori, per paket, per toko) |
| Payment gateway | Midtrans + Xendit keduanya |
| Verifikasi toko | Wajib upload KTP sebelum toko aktif |
| Jadwal penarikan | Kapan saja (Pro+); bulanan (Gratis/Starter) |
| Booking | Hanya untuk T3 & T4 — tidak semua kategori usaha |
| Booking T3 | Halaman publik ✅ · Pilih staff ✅ · Deposit manual ✅ · Voucher ✅ · Reminder otomatis ✅ · Gateway ❌ · Reschedule ❌ · Paket layanan ❌ |
| Booking T4 | Kalender unit ✅ · Upload KTP ❌ · Checklist kondisi ❌ · Perpanjangan ❌ |

---

## BAGIAN 10: METRIK KEBERHASILAN

### Metrik Platform
| Metrik | Target 3 Bulan | Target 6 Bulan | Target 12 Bulan |
|---|---|---|---|
| Toko aktif (≥1 pesanan/minggu) | 500 | 2.000 | 10.000 |
| GMV per bulan | Rp 500 juta | Rp 2 miliar | Rp 10 miliar |
| Booking per bulan | 2.000 | 10.000 | 50.000 |
| Produk digital terjual | 500 | 3.000 | 20.000 |

### Metrik per Fitur
| Fitur | Target Sukses |
|---|---|
| Booking publik | ≥ 60% merchant jasa aktifkan, ≥ 70% booking dari halaman publik |
| Pre-order mode | ≥ 30% merchant bakeri/katering aktifkan |
| Custom order | ≥ 20% merchant jasa terima ≥1 custom order/bulan |
| Upselling engine | AOV naik ≥ 5% dalam 30 hari, ≥ 8% klik dari blok upsell → add to cart |
| Katalog shareable | ≥ 40% merchant bagikan link katalog dalam 30 hari |
| Produk digital | ≥ 30% merchant digital aktifkan preview watermark setelah fitur live |

---

## BAGIAN 11: KEAMANAN & COMPLIANCE

- **Supabase Auth** — JWT + refresh token + session management
- **RLS** — Setiap tabel ada policy: merchant hanya akses tokonya; pembeli hanya akses datanya
- **Secret Gateway** — AES-256 encrypted, tidak pernah ditampilkan kembali di UI
- **KTP Photos** — Private Supabase bucket, hanya Super Admin bisa akses
- **Booking Documents** — KTP/SIM untuk rental disimpan di private bucket, hanya merchant yang bersangkutan bisa akses
- **Webhook Verification** — Setiap callback Midtrans/Xendit diverifikasi signature
- **Escrow** — Dana ditahan sampai pembeli konfirmasi atau auto-release setelah X hari
- **Audit Log** — Semua aksi admin, penarikan, impersonasi tercatat
- **PDPA/UU PDP** — Kebijakan privasi, hak hapus data, data lokalisasi
- **BPOM** — Wajib nomor BPOM untuk kategori beauty/food (enforced via atribut)
- **Pajak** — Laporan PPN 11% tersedia untuk audit

---

## BAGIAN 12: ARSITEKTUR UNIFIED SHOP

> **Prinsip Inti:** Satu merchant mendaftar sekali → langsung punya tiga sekaligus: website toko sendiri, halaman di marketplace, dan sistem booking (jika kategori mendukung T3/T4). Bukan tiga produk terpisah — satu platform, satu dashboard.

### 12.1 Konsep "Satu Toko, Tiga Wajah"

```
Merchant daftar → isi profil toko → pilih kategori usaha → langsung aktif di 3 tempat:

┌─────────────────────────────────────────────────────────┐
│                   SATU DASHBOARD                         │
│              (pos-app / /app)                            │
│                                                          │
│  Kelola produk/layanan · Kelola pesanan · Kelola booking │
│  Laporan · Keuangan · Pelanggan · Promo                  │
└──────────────┬──────────────┬──────────────┬────────────┘
               │              │              │
               ▼              ▼              ▼
    ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
    │   WEBSITE    │  │ MARKETPLACE │  │   BOOKING    │
    │   SENDIRI    │  │  PLATFORM   │  │    PAGE      │
    │              │  │             │  │ (khusus T3   │
    │/s/:slug      │  │/toko/:slug  │  │  dan T4)     │
    │atau          │  │             │  │              │
    │tokosaya.com  │  │Tampil di    │  │Pembeli self- │
    │              │  │search &     │  │serve booking │
    │Tema kustom   │  │kategori     │  │langsung ✅   │
    │per kategori  │  │marketplace  │  │              │
    └──────────────┘  └─────────────┘  └──────────────┘

CATATAN: Halaman booking HANYA muncul untuk toko dengan kategori
yang mendukung Tipe 3 (Booking Sesi) atau Tipe 4 (Booking Rental).
F&B biasa, fashion, skincare, produk digital → TIDAK ada tab booking.
```

### 12.2 URL & Akses Toko

| Kondisi | URL Toko | URL Marketplace | URL Booking | URL Katalog |
|---|---|---|---|---|
| Baru daftar (gratis) | `/s/nama-toko` | `/toko/nama-toko` | `/toko/nama-toko/booking` (jika T3/T4) | `/katalog/nama-toko` |
| Paket Growth+ | `/s/nama-toko` + custom path | `/toko/nama-toko` | `/toko/nama-toko/booking` | `/katalog/nama-toko` |
| Paket Pro (custom domain) | `namatoko.com` | `/toko/nama-toko` | `namatoko.com/booking` | `/katalog/nama-toko` |

### 12.3 Bagaimana Data Mengalir (Unified)

```
Sumber Pesanan/Booking:
  ├── Website Toko Sendiri (/s/:slug)              ──┐
  ├── Marketplace (/toko/:slug)                    ──┤──→ Satu database toko
  ├── Link Booking Langsung (/toko/:slug/booking)  ──┤   (shop_id = sama)
  ├── Katalog Shareable (/katalog/:slug)           ──┤
  ├── QR Code (di meja, brosur, IG story)          ──┘
  └── POS / Kasir (walk-in langsung)              ────→ Masuk sebagai POS order

Semua masuk ke Dashboard yang sama:
  /pos-app/pesanan         → semua pesanan (POS + marketplace + website)
  /pos-app/booking         → semua booking (dari semua sumber, hanya T3/T4)
  /pos-app/marketplace-orders → view khusus pesanan online
```

### 12.4 Fitur Booking per Kategori — Tampil/Sembunyi Otomatis

| Kategori | Tipe Booking | Field Ekstra | Tidak Tampil |
|---|---|---|---|
| Barbershop / Salon | Sesi (T3) | Pilih staff · Pilih layanan · Durasi | Kalender rental · Upload KTP |
| Spa / Pijat | Sesi (T3) | Pilih terapis · Durasi · Catatan | Kalender rental |
| Studio Foto | Sesi + Paket (T3) | Pilih paket · Brief · Pilih lokasi | Kalender rental |
| Klinik / Terapi | Konsultasi (T3) | Keluhan awal · Pilih dokter | Upload KTP |
| Pet Grooming | Sesi (T3) | Info hewan (jenis, ras, berat) | Kalender rental |
| Les Privat / Workshop | Kelas (T3) | Pilih guru · Level · Batas peserta | Upload KTP |
| Rental Mobil / Motor | Rental (T4) | Tanggal mulai-selesai · Pilih unit · Upload KTP/SIM | Pilih staff · Slot jam |
| Sewa Alat Camping | Rental (T4) | Tanggal · Pilih item · Jumlah | Upload KTP (opsional) |
| Villa / Penginapan | Rental (T4) | Check-in/out · Jumlah tamu | Pilih staff |
| Coworking / Studio Sewa | Rental (T4) | Tanggal+jam · Kapasitas | Pilih staff · Upload KTP |
| Pet Hotel | Rental (T4) | Info hewan · Tanggal mulai-selesai | Pilih staff |
| EO / Entertainer | Jasa (T3+T5) | Tanggal acara · Brief · Deposit | Kalender rental |
| Restoran / Kafe | Reservasi Meja (opsional) | Jumlah orang · Permintaan khusus | Semua field booking jasa |
| **F&B umum, Fashion, Skincare, Produk Digital** | **TIDAK ADA BOOKING** | — | Semua field booking |

---

## BAGIAN 13: RENCANA TEMA PER KATEGORI USAHA

> Tema bukan sekedar warna — tema adalah identitas visual + layout + komponen yang disesuaikan dengan kebutuhan unik tiap jenis bisnis. Tema juga otomatis menyembunyikan/menampilkan komponen sesuai Tipe Alur bisnis.

### 13.1 Filosofi Desain Tema

```
Satu tema = Layout + Palet Warna + Font + Komponen Khusus + Default Sections

Merchant bisa:
  → Ganti warna primer & aksen (color picker)
  → Upload logo & banner
  → Toggle sections on/off (hero, galeri, layanan, booking, ulasan, dll.)
  → Atur urutan sections (drag & drop)
  → Custom CSS (paket Pro)

Tema otomatis menyesuaikan komponen dengan kategori:
  → Barbershop: aktifkan StaffCard, BeforeAfterGallery, BookingWidget
  → Rental Mobil: aktifkan FleetGrid, DateRangeCalendar, DocumentUpload
  → Produk Digital: aktifkan DigitalPreview, LicenseInfo, DownloadCTA
  → F&B: aktifkan MenuSection, NutritionInfo, QROrderCTA (booking meja opsional)
```

### 13.2 Katalog Tema

#### 🍽️ Tema F&B
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_cafe_cozy` | **Cozy Brew** | Kafe & Kedai Kopi | Coklat tua · Krem · Amber | Foto hero full-width · Font serif · Suasana hangat |
| `theme_cafe_modern` | **Neo Cafe** | Kafe Modern | Hitam · Putih · Kuning mustard | Minimalis · Grid produk besar · Typography bold |
| `theme_restaurant_premium` | **Grand Table** | Restoran & Fine Dining | Navy · Gold · Ivory | Elegan · Menu bergambar · Reservasi menonjol |
| `theme_warung` | **Warung Nusantara** | Warung & Kedai | Merah bata · Kuning · Putih | Tradisional · POS-forward · Harga jelas |
| `theme_bakery` | **Dough & Sweet** | Bakeri & Kue | Rose · Krem · Coklat susu | Foto produk close-up · Pre-order CTA · Warm & inviting |
| `theme_healthy` | **Green Plate** | Makanan Sehat | Hijau sage · Putih · Aksen tomat | Clean · Nutrisi terlihat · Subscription CTA |

#### ✂️ Tema Kecantikan & Perawatan
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_barber` | **The Barber** | Barbershop | Hitam · Putih · Merah | Dark maskulin · Vintage · StaffCard · BookingWidget prominent |
| `theme_barber_modern` | **Fresh Cut** | Barbershop Modern | Abu gelap · Putih · Kuning | Clean modern · BeforeAfterGallery · BookingWidget |
| `theme_salon_elegant` | **Belle Salon** | Salon Wanita | Blush pink · Gold · Putih | Elegan · Galeri layanan · BookingWidget prominent |
| `theme_salon_bold` | **Glam Studio** | Salon & Nail Art | Ungu · Hitam · Gold | Bold & luxe · Portfolio nails/makeup |
| `theme_spa` | **Serenity** | Spa & Relaksasi | Sage green · Putih · Coklat kayu | Tenang · Foto suasana · Paket layanan cards |
| `theme_skincare` | **Pure Glow** | Skincare & Kosmetik | Putih · Krem · Blush | Clean beauty · Ingredient highlight · Before/after |

#### 🚗 Tema Otomotif & Rental
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_rental_car` | **Road Ready** | Rental Mobil | Abu gelap · Biru · Putih | FleetGrid · DateRangeCalendar · DocumentUpload prominent |
| `theme_rental_moto` | **Ride Free** | Rental Motor | Oranye · Hitam · Putih | Energik · Grid armada · Harga per hari |
| `theme_workshop` | **Garage Pro** | Bengkel | Merah · Hitam · Abu | Industrial · Jenis servis grid · Booking antrian |
| `theme_carwash` | **Sparkling** | Cuci Kendaraan | Biru · Putih · Cyan | Fresh · Paket layanan · Queue booking |

#### 🏕️ Tema Rental & Outdoor
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_camping` | **Wild & Free** | Sewa Alat Camping | Hijau tua · Coklat · Krem | Adventure · Foto alam · DateRangeCalendar · ItemGrid |
| `theme_outdoor_sport` | **Peak Sport** | Sewa Alat Olahraga | Biru · Hijau · Putih | Aktif · Kategori alat · Kalender rental |
| `theme_event_rental` | **Party Pro** | Sewa Perlengkapan Event | Ungu · Gold · Putih | Event-forward · Paket bundling · CTA booking |

#### 📸 Tema Kreatif & Studio
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_photographer` | **Frame & Lens** | Fotografer & Studio | Hitam · Putih · Gold | PortfolioMasonry · PackageCard · BookingCTA |
| `theme_studio_dark` | **Studio Noir** | Studio Foto/Musik/Podcast | Hitam · Abu · Aksen neon | Dark & premium · Equipment list · Booking jam |
| `theme_creative` | **Canvas** | Desainer & Ilustrator | Putih · Hitam · Aksen bebas | Portfolio masonry · BriefForm · Project card |

#### 🏠 Tema Properti & Hunian
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_villa` | **Escape** | Villa & Penginapan | Hijau · Coklat kayu · Putih | Foto landscape · Fasilitas grid · DateRangeCalendar |
| `theme_kost` | **HomeBase** | Kost & Kontrakan | Biru · Putih · Abu | Clean · Spek kamar · Booking viewing |
| `theme_coworking` | **Work Flow** | Coworking & Meeting Room | Biru gelap · Putih · Aksen kuning | Produktif · Fasilitas · Booking per jam |

#### ⚕️ Tema Kesehatan & Kebugaran
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_clinic` | **MedCare** | Klinik & Praktek | Biru · Putih · Hijau muda | Clinical trust · Dokter cards · Booking konsultasi |
| `theme_gym` | **Iron Will** | Gym & Studio Fitness | Hitam · Merah · Abu | Bold · Jadwal kelas · Membership CTA |
| `theme_yoga` | **Breathe** | Yoga & Pilates | Putih · Sage · Pastel | Tenang · Jadwal kelas · Instruktur profiles |
| `theme_wellness` | **Vital** | Terapi & Pijat | Hijau muda · Coklat · Putih | Wellness-forward · Layanan list · Booking sesi |

#### 🐾 Tema Hewan Peliharaan
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_petshop` | **Pawsome** | Pet Shop & Grooming | Kuning · Putih · Aksen orange | Playful · Foto hewan lucu · Booking grooming |
| `theme_pethotel` | **Happy Paws** | Pet Hotel | Hijau · Putih · Abu | Trustworthy · Kapasitas · Update foto hewan |

#### 👗 Tema Fashion & Gaya
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_fashion_minimal` | **Mode** | Fashion Modern | Putih · Hitam · Aksen bebas | Lookbook · Grid foto besar · Size chart |
| `theme_fashion_bold` | **Street** | Fashion Streetwear | Hitam · Putih · Neon | Edgy · Koleksi grid · Drop timer |
| `theme_batik_craft` | **Nusantara** | Batik & Kerajinan | Coklat · Gold · Merah bata | Tradisional modern · Cerita pengrajin · Custom order |

#### 💻 Tema Digital
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_digital_product` | **Digital Store** | Produk Digital | Ungu gelap · Putih · Cyan | DigitalPreview · LicenseInfo · DownloadCTA |
| `theme_course` | **LearnUp** | Kursus Online | Ungu · Putih · Aksen hijau | Preview video · Progress CTA · Modul list |

#### ✈️ Tema Wisata & Perjalanan
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_travel` | **Wanderlust** | Tour & Travel | Biru laut · Putih · Sunset orange | Foto destinasi · Paket wisata cards · Booking + itinerary |
| `theme_guide` | **Local Expert** | Guide Wisata Lokal | Hijau · Coklat · Putih | Otentik · Profil guide · Review |

#### 🎓 Tema Pendidikan
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_education` | **EduPath** | Bimbel & Kursus | Biru · Putih · Kuning | Trustworthy · Jadwal kelas · Daftar guru |

#### 🎭 Tema Event & Hiburan
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_event` | **Celebrate** | EO & Venue | Gold · Putih · Hitam | Mewah · Portofolio event · Paket EO · Booking |
| `theme_entertainer` | **Spotlight** | Artis & Entertainer | Hitam · Merah · Gold | Showbiz · Video reel · Booking + rider |

### 13.3 Roadmap Pembuatan Tema

#### Fase 1 — Tema Dasar ✅ Sudah Ada
- Classic · Modern · Bold · Natural

#### Fase 2 — Tema Kategori Utama (prioritas volume UMKM Indonesia)
| # | Tema | Kategori | Komponen Baru |
|---|---|---|---|
| 1 | **Cozy Brew** | F&B Cafe | MenuSection · Happy Hour Banner |
| 2 | **The Barber** | Barbershop | StaffCard · BeforeAfterGallery · BookingWidget |
| 3 | **Road Ready** | Rental Mobil | FleetGrid · DateRangeCalendar · DocumentUpload |
| 4 | **Wild & Free** | Sewa Camping | ItemGrid · DateRangeBooking · DepositBadge |
| 5 | **Frame & Lens** | Fotografer | PortfolioMasonry · PackageCard · BriefForm |
| 6 | **Belle Salon** | Salon | StaffCard · ServicePriceList · BeforeAfterGallery |
| 7 | **Grand Table** | Restoran | MenuSection · TableReservation (opsional) |
| 8 | **Pure Glow** | Skincare | IngredientList · BPOMBadge · SkinTypeFilter |
| 9 | **Digital Store** | Produk Digital | DigitalPreview · LicenseInfo · DownloadCTA |

#### Fase 3 — Tema Kategori Lanjutan
- MedCare (klinik), Iron Will (gym), Escape (villa), Pawsome (pet), Mode (fashion)
- Wanderlust (travel), EduPath (pendidikan), Celebrate (event), LearnUp (kursus online)

#### Fase 4 — Tema Premium & White Label
- Tema berbayar (Rp 99k – Rp 499k sekali beli atau Rp 29k/bulan)
- White label: hapus semua branding platform (Enterprise only)

---

## BAGIAN 14: DETAIL TEKNIS FITUR UTAMA

### G-3 Upselling Engine ("Sering Dibeli Bersama")

**Tujuan:** Naikkan AOV dengan menampilkan rekomendasi produk yang sering dibeli bersama produk yang sedang dilihat.

**Skema tabel `product_upsell_suggestions`:**

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `shop_id` | uuid NOT NULL | Auto-isi dari `menu_items.shop_id` via trigger |
| `product_id` | uuid NOT NULL | FK `menu_items(id)` ON DELETE CASCADE |
| `suggested_id` | uuid NOT NULL | FK `menu_items(id)` ON DELETE CASCADE |
| `score` | numeric(10,2) | Jumlah co-purchase (source `auto`) |
| `position` | smallint | Urutan tampil (1 = paling atas) |
| `source` | text | `auto` atau `manual` |
| `is_pinned` | boolean | Jika `true`, tidak ditimpa job otomatis |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger |

**Fungsi `compute_upsell_suggestions()` (SECURITY DEFINER, dijalankan cron mingguan):**
1. DELETE baris `source='auto' AND is_pinned=false`
2. CTE `recent_items` — distinct `(order_id, menu_item_id)` dari 90 hari terakhir
3. CTE `pairs` — self-join pada order_id, hitung COUNT(*), filter >= 2
4. CTE `ranked` — ROW_NUMBER() per product_id, top-6, intra-shop, kedua produk `is_available=true`
5. INSERT/UPDATE dengan ON CONFLICT
6. Jadwal cron: `0 3 * * 0` UTC = Minggu 10:00 WIB

**Strategi fallback di komponen `FrequentlyBoughtTogether`:**
1. Baca dari `product_upsell_suggestions` precomputed (≥ 2 item → render)
2. Fallback co-occurrence client-side (max 200 order, 500 item)
3. Fallback terakhir: 4 produk dari toko yang sama

**Metrik sukses (30 hari setelah live):**
- ≥ 40% halaman produk menampilkan blok
- ≥ 8% klik dari blok berakhir add to cart
- AOV merchant pengguna naik ≥ 5%

---

## GLOSARIUM

| Istilah | Definisi |
|---|---|
| GMV | Gross Merchandise Value — Total nilai semua transaksi sebelum dikurangi komisi |
| MRR | Monthly Recurring Revenue — Pendapatan berulang dari sewa |
| Entitlement | Hak akses ke fitur berdasarkan paket langganan |
| Plan Matrix | Tabel nilai setiap entitlement per paket |
| Escrow | Dana ditahan sementara sampai kondisi terpenuhi |
| RLS | Row Level Security — Keamanan database level baris |
| KDS | Kitchen Display System — Layar pesanan di dapur |
| HPP | Harga Pokok Produksi/Penjualan |
| CSAT | Customer Satisfaction Score |
| **Tipe 1** | Alur Produk Fisik Langsung — beli dan kirim/ambil |
| **Tipe 2** | Alur Produk Digital — beli dan unduh otomatis |
| **Tipe 3** | Booking Sesi — reservasi waktu layanan (barber, salon, klinik) |
| **Tipe 4** | Booking Rental — sewa berdasarkan rentang tanggal (rental mobil, villa) |
| **Tipe 5** | Pre-order & Custom — pesan dulu, dibuat kemudian |
| Booking Sesi | Reservasi layanan dengan durasi tetap (potong rambut, foto, pijat) |
| Booking Rental | Reservasi barang/kendaraan/tempat dengan rentang tanggal sewa |
| Booking Tempat | Reservasi meja/venue berdasarkan tanggal + kapasitas |
