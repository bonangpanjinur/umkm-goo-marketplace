# PRD — UMKMgo / KopiHub
## Platform Marketplace & POS Multi-Kategori untuk UMKM Indonesia
**Versi:** 5.1 | **Diperbarui:** 13 Mei 2026 | **Status:** Living Document — Satu-satunya sumber kebenaran

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

1. **Sistem booking sudah solid** ✅ — halaman publik self-serve ada, pilih staff ada, deposit ada, voucher khusus booking ada. Gap yang tersisa: reschedule/batal mandiri, reminder otomatis, riwayat booking di akun pembeli, dan integrasi payment gateway untuk deposit.
2. **Viral loop sudah ada** ✅ — share produk, share keranjang, referral, wishlist, alert harga turun sudah dibangun di Sprint 9.
3. **Fitur per industri sudah dimulai** ✅ — size chart (fashion), ingredient list + BPOM (skincare), alergen tag (F&B), pilih staff (jasa) sudah ada. Yang masih kurang: galeri portofolio, paket layanan, rental date-range, klinik antrian.
4. **Kepercayaan pembeli sudah diperkuat** ✅ — histori harga, BPOM, size chart, alergen, rating, tier badge sudah ada.
5. **Gap terbesar saat ini:**
   - Integrasi payment gateway untuk deposit booking (Midtrans/Xendit)
   - Reschedule & batal mandiri oleh pelanggan
   - Portofolio/galeri karya toko (M-02) — kritis untuk jasa kreatif & salon
   - Reminder otomatis H-1/H-3 (M-03) — kritis untuk retensi booking
   - ~~Waitlist virtual (M-12)~~ ✅ **Sudah selesai Sprint 11**
   - ~~Upselling engine (M-07)~~ ✅ **Sudah selesai Sprint 12**

---

## BAGIAN 1: STATUS IMPLEMENTASI SAAT INI

### 1.1 Super Admin ✅ Lengkap

**Yang Sudah Ada:**
Dashboard KPI · Manajemen KYC merchant · Manajemen toko (suspend/unsuspend) · Tagihan & invoice · Persetujuan penarikan dana · Voucher platform-wide · Dispute resolution · Manajemen paket & plan matrix · Konfigurasi komisi · Konfigurasi payment gateway (Midtrans + Xendit) · Branding platform · Broadcast notifikasi · Auto-cancel pesanan · Impersonasi toko (support mode + audit) · Audit log · Domain kustom · Feature flags · Fee simulator · Rekonsiliasi keuangan · Template notifikasi · Banner homepage · Review iklan merchant · Manajemen akun pembeli · Moderasi konten · Revenue Intelligence Dashboard · Churn & Retensi · Laporan Keuangan & Pajak (PPN 11%) · Deteksi Fraud (rule-based + anomali GMV) · Auto-renewal reminder · Revenue Leakage Detector

**⚠️ Perlu Diperbaiki:**
| Fitur | Masalah | Saran Perbaikan |
|---|---|---|
| **Deteksi Fraud** | Hanya rule-based dasar, tidak ada ML scoring | Tambah skor risiko 0–100 per transaksi berdasarkan pola: IP, device, kecepatan order, nilai transaksi |
| **Manajemen Kategori** | Kategori global ada tapi CRUD dari admin belum dinamis | Buat halaman `/admin/categories` — add/edit/delete/reorder kategori bisnis beserta icon, slug, fitur toggle |
| **Katalog Global** | Ada tapi belum jelas scope-nya | Pisahkan antara "Kategori Bisnis" (F&B, Fashion, dll.) dan "Kategori Produk" per toko |
| **Churn Analysis** | Hanya dashboard, tidak ada tindakan otomatis | Tambah trigger: jika toko tidak login 14 hari → otomatis kirim email re-engagement |
| **Laporan Keuangan** | CSV export ada tapi format belum standar akuntansi | Tambah format laporan kompatibel Jurnal / MYOB / Accurate |
| **Broadcast Notifikasi** | Kirim ke semua atau segmen toko, belum bisa ke pembeli | Pisahkan target: broadcast ke merchant vs. broadcast ke pembeli |
| **Manajemen Pengguna Pembeli** | Hanya lihat data, tidak ada tindakan | Tambah: suspend akun, reset password, lihat riwayat order, tambah kredit/cashback manual |

### 1.2 Merchant / Pemilik Toko ✅ Lengkap

**Yang Sudah Ada:**

**POS & Operasional:** Kasir digital · KDS · Meja + QR order · Shift kasir · Split bill per orang · Printer thermal · Panggil pelayan realtime

**Katalog:** Menu/produk · Kategori · Varian & atribut · Bundle · Produk digital · Import CSV

**Stok:** Stok terpadu · Inventori bahan baku · Resep + HPP · Deduct otomatis via trigger · Auto nonaktif menu jika bahan habis · Estimasi stok habis · Notif stok kritis

**Supply Chain:** Supplier · Purchase Order

**Tim:** Karyawan · Jadwal · Absensi · Shift

**Pengiriman:** Delivery · Kurir · RajaOngkir · Label pengiriman · Bukti foto pengantaran

**Pelanggan:** Database pelanggan · **Label otomatis** (VIP/Reguler/Baru/Tidak Aktif) · Live chat · Inbox

**Marketing:** Promo · **Voucher Toko** · Platform voucher · Flash sale terjadwal · Kalender promo · Email marketing (PRO) · Iklan berbayar · **Badge Tier Toko** (Platinum/Gold/Top Seller)

**Engagement:** Q&A produk + FAQ pin + auto-reply · Ulasan + sentiment analysis · Balas ulasan · Leaderboard

**Booking:** Slot layanan + manajemen booking (sisi merchant) · Reservasi meja + table maps · Halaman booking publik self-serve · Pilih staff · Deposit wajib (konfirmasi manual) · Voucher khusus booking + analitik per kode

**Keuangan:** Wallet · Escrow · Penarikan · Rekening bank · Billing plan

**Laporan:** Harian + share WA · Penjualan · Profit & margin · Marketplace analytics · Invoice PDF · Laporan Keuangan

**Toko Online:** Storefront builder (4 tema) · Custom domain · Custom CSS · Storefront preview · Auto-reply luar jam buka · Auto print struk

**Notifikasi:** Notifikasi toko · **Banner keranjang terbengkalai**

**⚠️ Perlu Diperbaiki:**
| Fitur | Masalah | Saran Perbaikan |
|---|---|---|
| **Dashboard POS** | Grafik tren hanya 7/30 hari, tidak bisa pilih rentang kustom | Tambah date range picker — pilih tanggal mulai & selesai bebas |
| **Manajemen Pesanan** | Status pesanan update manual satu per satu | Tambah bulk action: pilih beberapa pesanan → update status sekaligus |
| **Upload Foto Produk** | Belum ada crop/resize di browser sebelum upload | Tambah crop tool in-browser (react-image-crop) — hemat storage, foto lebih konsisten |
| **Booking** | Hanya bisa dibuat manual oleh merchant, belum ada halaman publik untuk pembeli booking sendiri | 🔥 Buat halaman publik `/toko/:slug/booking` agar pembeli bisa booking mandiri |
| **Laporan Laba Rugi** | Halaman profit ada tapi tidak menampilkan breakdown biaya operasional | Tambah input "biaya lain-lain" per periode agar L/R lebih akurat |
| **Stok** | Alert stok menipis hanya di UI, tidak ada notif push/WA | Tambah: kirim notif push ke owner + template WA jika stok item di bawah minimum |
| **Q&A Produk** | Auto-reply ada tapi matching hanya exact | Upgrade ke fuzzy matching / keyword-based matching |
| **Ulasan** | Balas ulasan ada tapi tidak ada filter "belum dibalas" yang jelas | Tambah tab "Perlu Dibalas" dengan badge merah jika ada ulasan belum dibalas > 24 jam |
| **Kalender Promo** | Ada tapi tidak terintegrasi dengan jadwal produk flash sale | Sinkronkan kalender promo dengan flash sale dan voucher aktif |

### 1.3 Pembeli / Customer ✅ Lengkap

**Yang Sudah Ada:**
Beranda marketplace · Search + filter · Kategori · Flash sale · Featured shops · Banner iklan · Halaman toko + tier badge · Detail produk + varian + ulasan + foto ulasan · Q&A produk · Keranjang multi-toko · Checkout (delivery/pickup) · Berbagai metode bayar · Order tracking realtime · Bukti pengiriman kurir · Live chat dengan penjual · Dispute · Akun: pesanan, alamat, wishlist, favorit, notifikasi · Loyalty (poin, tier Bronze→Platinum, redeem) · **Voucher ulang tahun otomatis** · **Notif poin kadaluarsa** · Referral program dengan kode unik · Follow toko · **Reorder 1-klik** · Pesanan favorit (beri nama, pesan lagi) · **Alert harga turun** · Riwayat produk dilihat · Trust Certificate Badge · Estimasi waktu pengiriman

**⚠️ Perlu Diperbaiki:**
| Fitur | Masalah | Saran Perbaikan |
|---|---|---|
| **Pencarian** | Hanya full-text sederhana, tidak ada filter lanjutan | Tambah filter: harga min–max, rating minimum, kategori, lokasi toko, metode bayar |
| **Halaman Keranjang** | Tidak bisa pilih item mana yang mau di-checkout | Tambah checkbox per item — pembeli bisa pilih sebagian untuk checkout sekarang |
| **Checkout** | Alamat tersimpan tidak otomatis dipilih | Auto-select alamat default saat checkout dibuka |
| **Order Tracking** | Hanya status internal, belum ada integrasi nomor resi ke website kurir | Tambah tombol "Cek Resi" yang langsung buka tracking di website kurir relevan |
| **Wishlist** | Alert harga turun hanya localStorage, tidak persisten lintas device | Simpan price alert di database agar sinkron di semua perangkat |
| **Notifikasi** | Notif in-app ada tapi belum ada push notification browser | Implementasi Web Push Notification (service worker) untuk notif walau browser ditutup |
| **Ulasan** | Tidak bisa upload foto saat menulis ulasan | Tambah upload foto/video bukti di form ulasan |
| **Profil Akun** | Belum ada avatar/foto profil yang bisa diupload | Tambah upload avatar |

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
| 13 Mei 2026 | Sprint 11 | **Voucher Khusus Booking (M-VB)** — tabel `booking_vouchers` + RLS + fungsi atomik `fn_use_booking_voucher()`; manajemen voucher di POS (buat/aktif/nonaktif/hapus); input kode voucher di halaman booking publik dengan diskon otomatis; kolom `voucher_code` + `voucher_discount` di `bookings` | ✅ |
| 13 Mei 2026 | Sprint 11 | **Voucher Analytics Panel** — panel analitik di POS booking: pemakaian per kode, total diskon diberikan, dampak % revenue, filter rentang 7/30/90 hari / semua waktu, progress bar share per voucher | ✅ |
| 13 Mei 2026 | Sprint 11 | **Fase B Pembatalan Mandiri** — kolom `cancellation_token UUID UNIQUE` + `cancelled_at` di `bookings` (migration m11); halaman publik `/booking/cancel/:token` dengan 5 state (view/confirm/cancelling/done/already_cancelled/past); dekremen `booked_count` saat batal; notif pemilik toko otomatis; link cancel + tombol salin muncul di success step dan deposit step | ✅ |
| 13 Mei 2026 | Sprint 11 | **M-12 Waitlist Virtual** — tabel `booking_waitlist` + RLS (migration m12); slot penuh tampil amber di kalender + grid slot dengan badge "Daftar Antre"; form antrean + posisi nomor urut; notif pemilik saat ada yang daftar antre; trigger otomatis saat booking dibatalkan (cek antrean → notif pemilik); panel antrean di POS per slot (expand/collapse, notif WA, hapus entry, tandai sudah dinotifikasi) | ✅ |
| 13 Mei 2026 | Sprint 12 | **Booking infra (G-1)** — tabel `booking_slots`, `bookings`, `booking_waitlist` dibuat penuh (sebelumnya route memakai `as any` tanpa tabel); RLS publik untuk slot aktif, pelanggan kelola booking sendiri, pemilik kelola semua; fungsi `booking_cancel_by_token()` (auto-tolak < 24 jam); fungsi `send_booking_reminders()` H-1 & H-3 dengan tracking `reminded_h1_at` / `reminded_h3_at` + dedup `dedupe_key`; pg_cron harian `0 2 * * *` UTC = **09:00 WIB**; trigger `bookings_fill_shop_id()` auto-isi `shop_id`; semua `SECURITY DEFINER` di-revoke dari `PUBLIC/anon/authenticated` | ✅ |
| 13 Mei 2026 | Sprint 12 | **M-07 Upselling Engine (G-3)** — tabel `product_upsell_suggestions` (kolom: `shop_id`, `product_id`, `suggested_id`, `score`, `position`, `source` `auto`/`manual`, `is_pinned`, unique `(product_id, suggested_id)`, check `product_id <> suggested_id`); RLS public read + owner manage via `coffee_shops.owner_id`; trigger `upsell_fill_shop_id()` auto-isi `shop_id` dari produk; fungsi `compute_upsell_suggestions()` analisis co-occurrence `order_items` 90 hari terakhir (skip `cancelled/refunded/draft/pending`), minimal 2× co-purchase, top-6 per produk, hanya intra-shop, hanya produk `is_available = true`, baris `auto` non-pin di-DELETE & dihitung ulang sementara `manual`/`is_pinned` dipertahankan; pg_cron mingguan `0 3 * * 0` UTC = **Minggu 10:00 WIB** (`compute-upsell-weekly`); halaman merchant `/pos-app/upsell` (pilih produk → list saran dengan badge OTO/MANUAL + co-purchase count, tambah/hapus/pin saran); component `FrequentlyBoughtTogether` di halaman produk publik `/toko/$slug/produk/$productId` baca `product_upsell_suggestions` dulu (urut `is_pinned DESC, position ASC`), fallback ke perhitungan client-side, fallback same-shop; sidebar POS section "Tampilan Toko" dapat menu "Sering Dibeli Bersama" | ✅ |

---

## BAGIAN 3: KATEGORI USAHA

> Semua kategori dapat ditambah, diubah, dan dinonaktifkan oleh Super Admin dari panel tanpa perlu deploy ulang.

### 3.1 Daftar Lengkap Kategori

#### 🍽️ Makanan & Minuman
| Kode | Nama | Contoh Usaha | Fitur Tambahan |
|---|---|---|---|
| `fnb_restaurant` | Restoran & Rumah Makan | Warung makan, rumah makan, nasi padang | POS · KDS · Meja · Reservasi · QR order |
| `fnb_cafe` | Kafe & Kedai Kopi | Kafe specialty, coffee shop, kedai susu | POS · KDS · Happy hour · Ambiance menu |
| `fnb_street` | Jajanan & Gerobak | Bakso, gorengan, mi ayam, es dawet | POS sederhana · Delivery |
| `fnb_catering` | Katering & Box Nasi | Katering pernikahan, box makan siang | Booking + deposit · Min. order · Tanggal pesan |
| `fnb_bakery` | Bakeri & Kue | Toko kue, roti artisan, kue ulang tahun custom | Pre-order · Custom design · Tanggal siap |
| `fnb_packaged` | Makanan Kemasan | Keripik, sambal, kue kering, frozen food | Berat · Expired · Komposisi · Halal cert |
| `fnb_healthy` | Makanan Sehat | Salad, jus cold-pressed, diet meal prep | Info kalori/nutrisi · Allergen tag · Langganan |

#### 💆 Kecantikan & Perawatan Diri
| Kode | Nama | Contoh Usaha | Fitur Tambahan |
|---|---|---|---|
| `beauty_salon` | Salon Rambut & Kecantikan | Salon wanita, hair studio, nail art | **Booking + pilih stylist** · Before/after gallery · Membership |
| `beauty_barber` | Barbershop | Barber modern, pangkas rambut | **Booking + pilih barber** · Before/after gallery · Loyalty stamp |
| `beauty_spa` | Spa & Relaksasi | Spa, pijat tradisional, reflexologi | Booking sesi · Paket layanan · Gift voucher |
| `beauty_skincare` | Skincare & Kosmetik | Brand skincare lokal, make-up artisan | Ingredient list · BPOM · Skin type tag |
| `beauty_waxing` | Waxing & Threading | Waxing studio, threading salon | Booking slot · Paket bundling |
| `beauty_tattoo` | Tato & Piercing | Tato studio, piercing studio | Booking konsultasi · Portofolio karya · Deposit |

#### 📸 Kreatif & Studio
| Kode | Nama | Contoh Usaha | Fitur Tambahan |
|---|---|---|---|
| `creative_photo` | Studio Foto & Fotografer | Studio foto, fotografer wedding, fotografer produk | **Booking sesi + pilih paket** · Portofolio · Deposit · Deliver file |
| `creative_video` | Videografer & Video Editor | Videografer wedding, konten kreator | Booking + brief form · Portofolio · Milestone |
| `creative_design` | Desainer Grafis & Digital | Logo design, UI/UX freelance, ilustrator | Custom order form · Brief · Deliver file · Revisi |
| `creative_music` | Musik & Entertainer | Band, DJ, penyanyi, sound system rental | Booking + deposit · Rider teknis · Kontrak |
| `creative_printing` | Percetakan & Sablon | Sablon kaos, spanduk, undangan, stiker | Custom order · Proofing digital · Min. qty |

#### 🔧 Otomotif & Kendaraan
| Kode | Nama | Contoh Usaha | Fitur Tambahan |
|---|---|---|---|
| `auto_rental_car` | **Rental Mobil** | Sewa mobil harian/mingguan, sopir atau lepas kunci | **Booking tanggal + durasi** · Cek ketersediaan · Deposit · Syarat SIM |
| `auto_rental_moto` | **Rental Motor** | Sewa motor, rental scooter wisata | **Booking tanggal + durasi** · Cek ketersediaan · KTP wajib |
| `auto_rental_bike` | Rental Sepeda & Skuter | Rental sepeda wisata, skuter listrik | Booking jam/hari · Lokasi ambil |
| `auto_workshop` | Bengkel & Otomotif | Bengkel mobil, motor, tune-up, ganti oli | **Booking servis** · Pilih jenis servis · Estimasi biaya · Notif selesai |
| `auto_washing` | Cuci Kendaraan | Cuci mobil, detailing, poles | Booking antrian · Paket layanan |
| `auto_accessory` | Aksesori Kendaraan | Audio mobil, kaca film, aksesori motor | Produk + jasa pasang |

#### 🏕️ Sewa Alat & Perlengkapan
| Kode | Nama | Contoh Usaha | Fitur Tambahan |
|---|---|---|---|
| `rental_camping` | **Sewa Alat Camping & Outdoor** | Tenda, sleeping bag, kompor, carrier, hammock | **Booking tanggal + durasi** · Cek ketersediaan · Deposit · Kondisi alat |
| `rental_tools` | Sewa Alat & Perkakas | Scaffolding, alat pertukangan, mesin bor | Booking + durasi · Deposit · Bukti pengembalian |
| `rental_event` | Sewa Perlengkapan Event | Kursi, meja, dekorasi, sound system, tenda | Booking + delivery · Jumlah item · Deposit |
| `rental_sport` | Sewa Alat Olahraga & Hobi | Alat snorkeling, sepatu gunung, kayak, papan surfing | Booking + durasi · Ukuran/size · Deposit |
| `rental_baby` | Sewa Perlengkapan Bayi | Stroller, car seat, bouncer | Booking + durasi · Sertifikat kebersihan |
| `rental_electronic` | Sewa Elektronik & Gadget | Kamera, drone, proyektor, laptop, walkie-talkie | Booking + durasi · Deposit · Serial tracking |
| `rental_costume` | Sewa Kostum & Baju Adat | Baju adat, kostum karnaval, baju pengantin | Booking + fitting · Ukuran · Deposit |
| `rental_vehicle_heavy` | Sewa Kendaraan Berat | Truk, pick-up, angkutan barang | Booking + durasi · Sopir atau mandiri · Rute |

#### 🏠 Properti & Hunian
| Kode | Nama | Contoh Usaha | Fitur Tambahan |
|---|---|---|---|
| `property_kost` | Kost & Kontrakan | Kost harian/bulanan, kontrakan | Booking viewing · Syarat sewa · DP online |
| `property_villa` | Villa & Penginapan | Villa sewa, guest house, homestay | **Booking tanggal + cek-in/out** · Kapasitas · Fasilitas |
| `property_coworking` | Coworking & Ruang Kerja | Coworking space, meeting room | Booking jam/hari · Kapasitas · Fasilitas AV |
| `property_studio` | Ruang Studio Sewa | Studio musik, studio podcast, ruang latihan dance | Booking jam · Kapasitas · Alat tersedia |

#### 🎓 Pendidikan & Pelatihan
| Kode | Nama | Contoh Usaha | Fitur Tambahan |
|---|---|---|---|
| `edu_private` | Les & Kursus Privat | Les matematika, bahasa Inggris, coding, musik | **Booking jadwal** · Pilih guru · Paket sesi |
| `edu_group` | Kelas & Workshop | Workshop kerajinan, kelas memasak, kelas yoga | Booking + batas peserta · Materi · Sertifikat |
| `edu_online` | Kursus Online | Video course, e-book, modul belajar | Produk digital · Akses seumur hidup · Progress tracking |
| `edu_tutor_center` | Bimbel & Lembaga Kursus | Bimbel TK–SMA, kursus bahasa, lembaga pelatihan | Booking · Absensi siswa · Laporan nilai |

#### ⚕️ Kesehatan & Kebugaran
| Kode | Nama | Contoh Usaha | Fitur Tambahan |
|---|---|---|---|
| `health_clinic` | Klinik & Praktek Dokter | Klinik umum, dokter gigi, bidan | **Booking konsultasi** · Nomor antrian · Anamnesis digital |
| `health_therapy` | Terapi & Rehabilitasi | Fisioterapi, terapi wicara, chiropractic | Booking sesi · Paket terapi · Rekam kemajuan |
| `health_gym` | Gym & Studio Fitness | Gym membership, studio yoga, pilates, zumba | Booking kelas · Membership bulanan · Check-in |
| `health_massage` | Pijat & Refleksiologi | Pijat panggilan, refleksi, akupunktur | Booking sesi · Area servis (studio/panggilan) · Pilih terapis |
| `health_herb` | Herbal & Suplemen | Jamu, herbal, suplemen kesehatan lokal | Komposisi · Izin BPOM · Pantangan konsumsi |

#### 🐾 Hewan Peliharaan
| Kode | Nama | Contoh Usaha | Fitur Tambahan |
|---|---|---|---|
| `pet_grooming` | Pet Grooming | Grooming anjing/kucing, mandi salon | **Booking + pilih layanan** · Jenis hewan + ras · Ukuran |
| `pet_hotel` | Pet Hotel & Penitipan | Penitipan hewan saat liburan | **Booking tanggal + durasi** · Kapasitas kandang · Update foto |
| `pet_vet` | Klinik Hewan & Veteriner | Dokter hewan, klinik hewan | Booking konsultasi · Rekam medis |
| `pet_supplies` | Pakan & Aksesori Hewan | Pakan, mainan, kandang, aksesoris | Produk · Filter spesies |

#### ✈️ Perjalanan & Wisata
| Kode | Nama | Contoh Usaha | Fitur Tambahan |
|---|---|---|---|
| `travel_tour` | Paket Wisata & Tour | Open trip, private trip, city tour | **Booking + deposit** · Itinerary · Min. peserta · Batas kursi |
| `travel_guide` | Pemandu Wisata | Guide lokal, tour guide bahasa asing | Booking · Pilih bahasa · Sertifikasi |
| `travel_transport` | Jasa Transportasi | Jemputan wisata, carter kendaraan, shuttle | Booking + rute · Kapasitas · Sopir termasuk |

#### 🏡 Rumah & Lifestyle
| Kode | Nama | Contoh Usaha | Fitur Tambahan |
|---|---|---|---|
| `home_interior` | Jasa Interior & Renovasi | Desain interior, kontraktor renovasi, tukang | **Booking konsultasi** · Portofolio · Estimasi biaya |
| `home_cleaning` | Laundry & Kebersihan | Laundry kiloan, dry cleaning, jasa bersih rumah | **Booking + pickup/delivery** · Jenis pakaian · Estimasi selesai |
| `home_garden` | Tanaman & Taman | Tanaman hias, bibit, jasa taman, pupuk | Panduan perawatan · Kebutuhan cahaya |
| `home_furniture` | Furnitur Custom | Furniture custom, lemari built-in, meja belajar | Custom order form · Dimensi · Estimasi produksi |
| `home_decor` | Dekorasi & Aksesoris Rumah | Bantal, karpet, lilin, vas, lukisan dekor | Dimensi · Material |

#### 👗 Fashion & Gaya
| Kode | Nama | Contoh Usaha | Fitur Tambahan |
|---|---|---|---|
| `fashion_ready` | Fashion Ready-to-Wear | Baju, celana, dress, jaket, hijab | Varian ukuran + warna · **Size chart** · Lookbook |
| `fashion_custom` | Konveksi & Jahitan | Jahit baju custom, konveksi seragam, sablon | **Custom order form** · Pilih bahan · Estimasi produksi · Fitting |
| `fashion_preloved` | Fashion Pre-loved | Thrift, pakaian bekas berkualitas | Kondisi (A/B/C) · Ukuran actual · Bukan retur |
| `fashion_accessories` | Aksesori & Perhiasan | Tas, sepatu, ikat pinggang, perhiasan UMKM | Bahan · Ukuran |

#### 🎨 Kerajinan & Seni
| Kode | Nama | Contoh Usaha | Fitur Tambahan |
|---|---|---|---|
| `craft_handmade` | Kerajinan Tangan | Anyaman, gerabah, batik, lilin, sabun | Custom order · Estimasi produksi · Limited edition |
| `art_visual` | Seni Rupa & Lukisan | Lukisan, ilustrasi komisi, fotografi seni | **Booking komisi** · Portofolio · Certificate of Authenticity |
| `craft_jewelry` | Perhiasan & Aksesoris Handmade | Cincin silver, gelang manik, kalung handmade | Custom engraving · Ukuran jari · Material |

#### 💻 Digital & Teknologi
| Kode | Nama | Contoh Usaha | Fitur Tambahan |
|---|---|---|---|
| `digital_product` | Produk Digital | Template, font, e-book, preset, musik | Auto-delivery · Lisensi · Preview watermark |
| `digital_service` | Jasa Digital | Web developer, SEO, social media manager | Brief form · Milestone · Deliver file · Revisi |
| `digital_repair` | Servis Elektronik | Servis HP, laptop, tablet, CCTV | **Booking antar** · Estimasi biaya · Notif selesai |

#### 🌾 Pertanian & Agribisnis
| Kode | Nama | Contoh Usaha | Fitur Tambahan |
|---|---|---|---|
| `agri_fresh` | Hasil Tani Segar | Sayur, buah, umbi dari kebun langsung | Berat · Musim panen · Langganan mingguan |
| `agri_processed` | Produk Olahan Pertanian | Beras premium, kopi petani, teh lokal, rempah | Sertifikasi · Asal daerah |
| `agri_livestock` | Ternak & Hasil Ternak | Telur kampung, daging segar, susu sapi | Stok terbatas · Langganan |

#### 🎭 Event & Hiburan
| Kode | Nama | Contoh Usaha | Fitur Tambahan |
|---|---|---|---|
| `event_organizer` | Event Organizer | EO pernikahan, ulang tahun, seminar | Booking + brief · Paket EO · Deposit |
| `event_entertainer` | Entertainer & Performer | MC, badut, sulap, akustik | Booking + brief · Rider teknis · Deposit |
| `event_venue` | Sewa Venue | Aula, ballroom, rooftop, outdoor venue | **Booking tanggal + durasi** · Kapasitas · Fasilitas |

#### 📦 Lainnya
| Kode | Nama | Contoh Usaha | Fitur Tambahan |
|---|---|---|---|
| `other_general` | Jasa Umum | Jasa titip, kurir lokal, jasa antre | Deskripsi bebas |
| `other_b2b` | Grosir & Distributor | Agen sembako, distributor FMCG | Harga grosir · MOQ · Syarat reseller |

---

## BAGIAN 4: SISTEM BOOKING — ANALISIS & ROADMAP

### 4.1 Status Saat Ini
| Komponen | Status |
|---|---|
| Buat slot layanan dengan tanggal, jam, durasi, kapasitas, harga (sisi merchant) | ✅ |
| Tambah booking manual oleh merchant | ✅ |
| Manajemen status booking: pending → confirmed → done → cancelled | ✅ |
| Tabel `booking_slots` dan `bookings` di Supabase | ✅ |
| Reservasi meja restoran (library `reservations.ts`) | ✅ |
| **Halaman booking publik untuk pembeli** (`/toko/:slug/booking`) | ✅ Selesai Sprint 9 |
| Pilih staff/resource saat booking | ✅ Selesai Sprint 11 |
| Deposit payment saat booking | ✅ Selesai Sprint 11 (SQL + UI pengaturan POS + step konfirmasi DP) |
| Voucher diskon khusus booking | ✅ Selesai Sprint 11 (booking_vouchers + fn_use_booking_voucher + UI) |
| Analitik voucher booking per kode | ✅ Selesai Sprint 11 |
| Pembatalan mandiri via link token | ✅ Selesai Sprint 11 (Fase B — cancellation_token + halaman publik /booking/cancel/:token) |
| Waitlist virtual saat slot penuh | ✅ Selesai Sprint 11 (M-12 — booking_waitlist + form antrean + panel POS + notif otomatis) |
| Reminder otomatis H-1 / H-3 | ✅ Selesai Sprint 12 G-1 (`send_booking_reminders()` + pg_cron `0 2 * * *` UTC) |
| Reschedule & batal mandiri oleh pembeli | ✅ Selesai Sprint 11 (`booking.cancel.$token.tsx`) |
| Riwayat booking di akun pembeli | ✅ Selesai (`akun.bookings.tsx`) |
| Kalender ketersediaan real-time | ✅ (kalender slot di `toko.$slug.booking.tsx` baca `booking_slots` real-time) |

### 4.2 Roadmap Booking Lengkap

#### Fase A — Halaman Booking Publik ✅ Selesai
URL: `/toko/:slug/booking` — wizard 3 langkah: kalender tanggal → pilih slot → isi data & konfirmasi. Termasuk: pilih staff, voucher diskon, pengaturan DP di POS, step konfirmasi DP + info transfer ke pelanggan.

#### Fase A+ — Booking Enhancements ✅ Selesai (Sprint 11)
- ✅ Pilih staff/resource saat booking (dropdown + "siapa saja")
- ✅ Deposit wajib — pengaturan % DP per toko + step konfirmasi DP di booking
- ✅ Voucher khusus booking — buat/kelola di POS, input kode di halaman publik, diskon atomik via RPC
- ✅ Analitik voucher — pemakaian, total diskon, dampak revenue, filter rentang waktu

#### Fase B — Manajemen Lanjutan ✅ Selesai (Sprint 11–12)
- ⚠️ Reschedule mandiri (minimal H-24 sebelum jadwal) — *belum, hanya batal mandiri*
- ✅ Pembatalan mandiri oleh pelanggan via link aman (secure token) — Sprint 11
- ✅ Reminder otomatis H-3 dan H-1 (notif in-app + tracking dedup) — Sprint 12 G-1
- ✅ Riwayat booking di akun pembeli (`/akun/bookings`) — `akun.bookings.tsx`

#### Fase C — Fitur Lanjutan (~5 hari) ❌ Belum
- ❌ Deposit payment terintegrasi Midtrans/Xendit (saat ini: konfirmasi manual via WA)
- ❌ Paket + add-on saat booking (pilih layanan ekstra)
- ❌ Portofolio galeri terintegrasi
- ❌ Review post-booking (notif H+1 setelah layanan)
- ❌ Kalender sync (Google Calendar export .ics)

### 4.3 Konfigurasi Booking per Toko (Dashboard Merchant)
```
Pengaturan Booking:
├── Aktifkan sistem booking (toggle per toko)
├── Jenis booking: Layanan / Rental / Reservasi Meja
├── Minimal berapa jam sebelumnya bisa booking (default: 2 jam)
├── Maksimal berapa hari ke depan bisa booking (default: 30 hari)
├── Deposit wajib? Berapa persen?
├── Kebijakan pembatalan:
│   ├── Batal ≥ H-3: refund 100%
│   ├── Batal H-1: refund 50%
│   └── Batal H-0: refund 0%
├── Jam operasional (hari & jam per hari)
├── Kapasitas harian (total slot per hari)
├── Manajemen staff/resource:
│   ├── Nama staff, foto, spesialisasi
│   └── Jam tersedia per hari per staff
└── Notifikasi: WA template + in-app
```

### 4.4 Tabel Database yang Dibutuhkan (Tambahan)
```sql
booking_services     -- layanan yang bisa dipesan per toko (nama, durasi, harga, max per hari)
booking_staff        -- staff/resource per toko (nama, foto, jam tersedia)
booking_settings     -- konfigurasi booking per toko
booking_addons       -- layanan tambahan opsional saat booking
booking_payments     -- catatan deposit yang dibayar per booking
booking_reminders    -- log pengiriman reminder (dedup per hari)
```

### 4.5 Jenis Booking per Kategori Usaha
| Jenis Booking | Contoh Usaha | Fitur Khusus |
|---|---|---|
| **Booking Sesi** | Barbershop, salon, spa, fotografer, pijat | Pilih stylist/terapis · Durasi per layanan |
| **Booking Rental** | Rental mobil/motor/alat camping/kostum | Pilih tanggal mulai-selesai · Cek ketersediaan per unit · KTP/SIM wajib |
| **Reservasi Tempat** | Restoran, villa, venue, coworking | Pilih tanggal + waktu + kapasitas/jumlah orang |
| **Booking Kelas** | Yoga, workshop, les privat | Batas peserta · Materi · Sertifikat |
| **Booking Jasa** | EO, fotografer wedding, jasa renovasi | Brief form · Deposit · Milestone |
| **Booking Konsultasi** | Klinik, dokter, konsultan, terapi | Anamnesis digital · Rekam per kunjungan |

---

## BAGIAN 5: BACKLOG — FITUR PRIORITAS

### 🔴 Bangun Sekarang (Dampak Besar, Effort Kecil — < 1 hari)

| # | Fitur | Role | Impact | Status |
|---|---|---|---|---|
| P-01 | **Halaman Booking Publik** (`/toko/:slug/booking`) | Semua usaha jasa | Konversi | ✅ Selesai |
| P-02 | **Tombol Share Produk** (WA/IG/copy link) | Pembeli | Viral | ✅ Selesai |
| P-03 | **Share Keranjang** (link unik → teman bisa checkout item sama) | Pembeli | Viral | ✅ Selesai |
| P-04 | **Pesan sebagai Hadiah** (checkbox + nama + pesan ucapan di checkout) | Pembeli | AOV | ✅ Selesai |
| P-05 | **WhatsApp Notif Order** (tombol di detail pesanan → wa.me template terisi otomatis) | Merchant | Retensi | ✅ Selesai |
| P-06 | **Histori Harga** (grafik mini 30 hari terakhir di halaman produk) | Pembeli | Kepercayaan | ✅ Selesai |
| P-07 | **Size Chart** per produk fashion | Fashion | Konversi | ✅ Selesai |
| P-08 | **Tag Alergen & Dietary** (Halal, Vegetarian, Bebas Gluten) untuk F&B | Restoran | Kepercayaan | ✅ Selesai |
| P-09 | **Ingredient List & Nomor BPOM** untuk produk kecantikan/skincare | Beauty | Trust | ✅ Selesai |
| P-10 | **Tombol Bagikan Laporan Harian ke WA** | Merchant | Efisiensi | ✅ Selesai |

### 🟡 Kuartal Ini (Dampak Besar, Effort Sedang — 1–3 hari)

| # | Fitur | Role | Impact | Status |
|---|---|---|---|---|
| M-01 | **Pilih Staff/Resource saat Booking** (fotografer, stylist, terapis) | Jasa | Konversi | ✅ Selesai (Sprint 11) |
| M-02 | **Portofolio / Galeri Karya Toko** (section berbeda dari katalog produk) | Jasa/Kreatif | Kepercayaan | ✅ Selesai (`pos-app.portfolio.tsx`) |
| M-03 | **Reminder Booking Otomatis** H-1 dan H-3 | Semua jasa | Retensi | ✅ Selesai Sprint 12 G-1 — `send_booking_reminders()` + pg_cron harian `0 2 * * *` UTC + tracking `reminded_h1_at`/`reminded_h3_at` + dedup via `dedupe_key` |
| M-04 | **Reschedule & Batal Booking Mandiri** (dengan kebijakan refund) | Pembeli | UX | ✅ Selesai (`booking.cancel.$token.tsx` + `akun.bookings.tsx`) |
| M-05 | **Perbandingan Produk** (2–4 produk side-by-side) | Pembeli | Konversi | ✅ Selesai (Sprint 10) |
| M-06 | **Return Self-Service** (foto + alasan → auto-notif toko, toko 24 jam respons) | Pembeli | Kepercayaan | ✅ Selesai (`akun.returns.tsx`) |
| M-07 | **Upselling Engine** ("Sering dibeli bersama" per produk) | Merchant | AOV | ✅ Selesai Sprint 12 — tabel `product_upsell_suggestions` + fungsi `compute_upsell_suggestions()` (co-occurrence 90 hari, top-6 intra-shop) + cron mingguan `0 3 * * 0` UTC + panel `pos-app.upsell.tsx` (pin/manual override) + component publik baca precomputed dulu |
| M-08 | **Harga Grosir / Bulk Pricing** (harga beda per tier kuantitas) | Merchant | Pendapatan | ✅ Selesai (`pos-app.bulk-pricing.tsx`) |
| M-09 | **Cek Ketersediaan Unit Rental** real-time (mobil, alat camping, kamera) | Rental | Konversi | ✅ Selesai (`pos-app.rental-availability.tsx`) |
| M-10 | **Deposit Booking Online** — pengaturan % DP per toko, step konfirmasi DP, kolom DB | Jasa/Rental | Komitmen | ✅ Selesai (Sprint 11) — *integrasi Midtrans/Xendit masih ❌* |
| M-11 | **Happy Hour / Time-based Pricing** (harga berubah per jam) | F&B | Pendapatan | ✅ Selesai (`pos-app.happy-hour.tsx`) |
| M-12 | **Waitlist / Antrian Virtual** (daftar antrian saat penuh, notif WA saat slot terbuka, panel antrean di POS) | F&B/Jasa | Retensi | ✅ |
| M-13 | **Preview Produk Digital** (sample watermarked sebelum beli) | Digital | Konversi | ❌ |
| M-14 | **Cashback Wallet** (cashback % per transaksi, dipakai di order berikutnya) | Pembeli | Retensi | ✅ Selesai (`akun.cashback.tsx`) |
| M-15 | **Katalog PDF / Link Shareable** (export produk aktif jadi PDF/link public) | Merchant | Pemasaran | ✅ Selesai (Sprint 10) |
| M-VB | **Voucher Khusus Booking** — kode diskon eksklusif untuk booking online + analitik | Jasa | Konversi | ✅ Selesai (Sprint 11) |
| **Riwayat Booking di Akun Pembeli** (`/akun/bookings`) | Pembeli | UX | ✅ Selesai (`akun.bookings.tsx`) |

### 🟢 Masa Depan (Dampak Besar, Effort Besar — 3+ hari)

| # | Fitur | Estimasi |
|---|---|---|
| F-01 | Group Buy / Patungan (beli bareng, semua dapat harga spesial jika kuorum tercapai) | 3 hari |
| F-02 | Subscription / Langganan Produk Rutin | 3 hari |
| F-03 | AI Generator Deskripsi Produk (foto → nama + deskripsi + tag) | 2 hari |
| F-04 | ✅ Pre-Order Mode (Sprint 13 — `pos-app.pre-orders.tsx` + kolom `pre_order_*` di `menu_items`) | 2 hari |
| F-05 | ✅ Custom Order Form (Sprint 13 — `custom_order_requests`, `pos-app.custom-orders.tsx` dgn tombol Terima/Tolak + WA template, `toko.$slug.custom-order.tsx`, CTA di `toko.$slug.produk.$productId.tsx`, toggle `accepts_custom_order`, halaman status customer `toko.$slug.custom-order.status.tsx` + RPC `get_customer_custom_orders`) | 2 hari |
| F-06 | Affiliate Program per Toko | 3 hari |
| F-07 | Google Analytics & Meta Pixel Integration | 2 hari |
| F-08 | Rating Pembeli 2-Way (toko rate pembeli, ekosistem lebih sehat) | 2 hari |
| F-09 | Live Streaming Commerce | 7+ hari |
| F-10 | BNPL / Cicilan (Kredivo, Akulaku) | 5 hari |
| F-11 | Mobile App (React Native / Expo) | 3+ minggu |
| F-12 | Merchant Onboarding Email Sequence (H+1, H+3, H+7 setelah daftar) | 2 hari |
| F-13 | ✅ Platform Health Score per Toko (Sprint 13 — view `shop_health_score` + `admin.health-score.tsx` daftar + `admin.health-score.$shopId.tsx` detail komponen skor + grafik radial/bar) | 2 hari |
| F-14 | Automated Payout Scheduler (payout otomatis terjadwal) | 2 hari |
| F-15 | Multi-Admin Super Admin (Finance Admin, Support Admin, Content Admin) | 2 hari |

---

## BAGIAN 6: FITUR KHUSUS PER KATEGORI

### 6.1 Restoran & F&B
- **Reservasi meja** dari marketplace (tanggal, waktu, jumlah orang, permintaan khusus)
- **Tag alergen & dietary**: Halal, Vegetarian, Vegan, Bebas Gluten, Bebas Laktosa, Pedas (level 1–5)
- **Info nutrisi** per menu item (kalori, protein, lemak, karbohidrat)
- **Happy hour pricing** — harga/diskon berbeda berdasarkan jam
- **Waitlist virtual** saat meja penuh
- **Split bill** per orang (sudah ada)
- **Pre-order katering** untuk tanggal tertentu

**Detail backlog F&B:**
| # | Fitur | Ada? | Prioritas |
|---|---|---|---|
| R-01 | **Reservasi Meja Publik** dari marketplace | ⚠️ Merchant-side only (meja), ✅ booking layanan publik ada | 🔥 TINGGI |
| R-02 | **Tag Alergen & Dietary** per menu item | ✅ Selesai Sprint 9 | — |
| R-03 | **Waitlist / Antrian Virtual** | ✅ Selesai Sprint 11 M-12 (`booking_waitlist` + form antrean + panel POS + notif otomatis) | — |
| R-04 | **Happy Hour / Harga Waktu** (otomatis berlaku & berakhir) | ❌ | 🔥 TINGGI |
| R-05 | Pre-Order Catering (tanggal + waktu tertentu di masa depan) | ❌ | TINGGI |
| R-06 | Menu Paket / Combo Builder (build your own combo) | ❌ | SEDANG |
| R-07 | Informasi Nutrisi (kalori, protein, lemak per porsi) | ❌ | SEDANG |
| R-08 | Rekap Penjualan per Menu (lebih detail) | ⚠️ Dasar ada | SEDANG |
| R-09 | Order Meja via QR tanpa App (fully web-based) | ✅ Ada | TINGGI |
| R-10 | Kitchen Load Monitor (estimasi waktu tunggu berdasarkan queue aktif) | ❌ | SEDANG |

### 6.2 Barbershop & Salon
- **Booking + pilih barber/stylist** — foto + nama + spesialisasi
- **Galeri before/after** (berbeda dari katalog produk)
- **Loyalty stamp digital** (beli 9 potong, ke-10 gratis)
- **Catatan pelanggan per kunjungan** (riwayat warna, produk dipakai)
- **Pengingat potong rambut** — notif otomatis 4 minggu setelah kunjungan terakhir
- **Membership / Paket** (beli 10 sesi bayar 8, berlaku 3 bulan)

**Detail backlog Salon & Barber:**
| # | Fitur | Ada? | Prioritas |
|---|---|---|---|
| SB-01 | Booking layanan per slot waktu | ✅ Selesai Sprint 9 — publik self-serve via `/toko/:slug/booking` | — |
| SB-02 | Pilih stylist/barber spesifik saat booking | ✅ Selesai Sprint 11 | — |
| SB-03 | Durasi layanan berbeda per jenis (potong 30 menit, warna 2 jam) | ⚠️ Dasar ada | TINGGI |
| SB-04 | Galeri hasil karya (before/after foto) | ❌ | 🔥 TINGGI |
| SB-05 | Membership / Paket Langganan (beli 10 potong bayar 8) | ❌ | SEDANG |
| SB-06 | Pengingat potong rambut (notif 4 minggu setelah kunjungan terakhir) | ❌ | SEDANG |
| SB-07 | Catatan pelanggan per kunjungan (riwayat warna, produk digunakan) | ❌ | SEDANG |
| SB-08 | Booking bisa reschedule mandiri oleh pelanggan | ❌ | TINGGI |
| SB-09 | Konfirmasi booking via WhatsApp otomatis | ⚠️ Tombol manual "Konfirmasi via WA" ada di halaman booking | TINGGI |
| SB-10 | Pembayaran deposit online saat booking | ✅ Selesai Sprint 11 (konfirmasi manual; integrasi gateway ❌) | SEDANG |

### 6.3 Fotografer & Studio Kreatif
- **Paket sesi** (Basic 1 jam, Standard 2 jam, Premium full day)
- **Pilih lokasi** (studio indoor, outdoor, lokasi pilihan klien)
- **Brief form** sebelum sesi (konsep, referensi foto, kebutuhan)
- **Deposit 50%** saat booking
- **Deliver file** ke klien via link (Google Drive / Dropbox) setelah sesi
- **Add-on**: editing ekstra, album cetak, jumlah foto final
- **Portofolio per fotografer/studio** dengan kategori (wedding, produk, wisuda)

**Detail backlog Studio Foto:**
| # | Fitur | Ada? | Prioritas |
|---|---|---|---|
| SF-01 | Booking sesi foto (foto produk, wisuda, prewedding, dll.) | ✅ Selesai Sprint 9 — self-serve publik via `/toko/:slug/booking` | — |
| SF-02 | Pilih paket sesi (Basic 1 jam, Standard 2 jam, Premium full day) | ❌ | 🔥 TINGGI |
| SF-03 | Pilih lokasi (studio indoor, outdoor, lokasi pilihan klien) | ❌ | TINGGI |
| SF-04 | Portofolio galeri hasil foto per fotografer/studio | ❌ | 🔥 TINGGI |
| SF-05 | Upload file hasil foto ke klien (link download) | ❌ | TINGGI |
| SF-06 | Deposit wajib saat booking (misal 50% dari total) | ✅ Selesai Sprint 11 (konfirmasi manual; integrasi gateway ❌) | TINGGI |
| SF-07 | Contract/agreement digital saat booking | ❌ | SEDANG |
| SF-08 | Add-on saat booking (editing ekstra, album cetak, dll.) | ❌ | SEDANG |
| SF-09 | Kalender ketersediaan fotografer | ❌ | 🔥 TINGGI |
| SF-10 | Review dengan foto hasil karya (klien upload di ulasan) | ❌ | TINGGI |

### 6.4 Rental (Mobil, Motor, Alat Camping, Elektronik, dll.)
- **Booking berdasarkan rentang tanggal** (bukan slot waktu)
- **Cek ketersediaan unit per item** — jika unit sudah dipesan tanggal tersebut, tidak bisa dipilih
- **Manajemen unit/armada** — merchant input setiap unit: ID, kondisi, foto, catatan
- **Dokumen wajib**: KTP untuk semua rental, SIM untuk kendaraan bermotor
- **Deposit wajib** — sistem hitung deposit otomatis berdasarkan nilai & durasi
- **Checklist kondisi** sebelum dan sesudah penyewaan (foto)
- **Perpanjangan sewa** — pembeli bisa request perpanjang dari akun
- **Denda keterlambatan** — merchant set nominal per hari terlambat

### 6.5 Fashion & Pakaian
- **Size chart** per produk (cm, bukan hanya S/M/L)
- **Filter ukuran & warna** di halaman toko
- **Notif "ukuran kamu tersedia lagi"** ketika restok
- **Custom order**: warna khusus, ukuran khusus, sablon nama
- **Pre-loved label**: kondisi A/B/C, ukuran aktual, tidak bisa retur

**Detail backlog Fashion:**
| # | Fitur | Ada? | Prioritas |
|---|---|---|---|
| FA-01 | Tabel ukuran (size chart) per produk | ✅ Selesai Sprint 9 | — |
| FA-02 | Filter ukuran dan warna di halaman toko | ✅ Selesai Sprint 13 (`toko.$slug.tsx` — extract `attributes.size` & `attributes.color`, multi-select chip, filter client-side) | — |
| FA-03 | Panduan ukuran interaktif ("Tinggi 165cm, berat 55kg → pilih M") | ❌ | SEDANG |
| FA-04 | Label "Pre-loved / Second" untuk produk bekas berkualitas | ❌ | SEDANG |
| FA-05 | Tampilkan model yang pakai produk (foto lookbook) | ❌ | SEDANG |
| FA-06 | Custom order (warna khusus, ukuran khusus, sablon nama) | ❌ | TINGGI |
| FA-07 | Notif "Ukuran kamu tersedia lagi" ketika stok restok | ❌ | TINGGI |

### 6.6 Kecantikan & Skincare
- **Ingredient list lengkap** per produk
- **Nomor BPOM & tanggal kedaluwarsa**
- **Tag jenis kulit**: Oily, Dry, Combination, Sensitive, Normal
- **Klaim verifikasi**: Dermatologically tested, Hypoallergenic, dll.

**Detail backlog Beauty:**
| # | Fitur | Ada? | Prioritas |
|---|---|---|---|
| BE-01 | Ingredient list lengkap per produk | ✅ Selesai Sprint 9 | — |
| BE-02 | Nomor izin BPOM & tanggal kedaluwarsa | ✅ Selesai Sprint 9 | — |
| BE-03 | Tag skin type: oily, dry, combination, sensitive | ❌ | TINGGI |
| BE-04 | Quiz rekomendasi produk berdasarkan jenis kulit | ❌ | SEDANG |
| BE-05 | Klaim verifikasi: "Dermatologically tested", "Hypoallergenic" | ❌ | SEDANG |
| BE-06 | Bundling skincare routine (serum + moisturizer + SPF) | ✅ Bundle ada | TINGGI |

### 6.7 Produk Digital
- **Preview watermarked** (sample sebelum beli)
- **Lisensi**: Personal use vs. Commercial use
- **Update versi** — pembeli yang sudah beli otomatis dapat versi terbaru
- **Limit download** per lisensi

**Detail backlog Produk Digital:**
| # | Fitur | Ada? | Prioritas |
|---|---|---|---|
| PD-01 | Auto-delivery file setelah pembayaran berhasil | ✅ | — |
| PD-02 | Lisensi produk digital (personal use vs. commercial use) | ❌ | TINGGI |
| PD-03 | Preview produk (watermarked sample sebelum beli) | ❌ | 🔥 TINGGI |
| PD-04 | Update produk: pembeli yang sudah beli otomatis dapat versi terbaru | ❌ | SEDANG |
| PD-05 | Limit download per lisensi (anti-sharing) | ❌ | SEDANG |
| PD-06 | Kode aktivasi / serial key untuk software | ❌ | SEDANG |

### 6.8 Klinik & Jasa Kesehatan
| # | Fitur | Ada? | Prioritas |
|---|---|---|---|
| KL-01 | Booking konsultasi dokter/dokter gigi/terapis | ⚠️ Merchant-side only | 🔥 KRITIS |
| KL-02 | Anamnesis digital sebelum konsultasi (form isian kesehatan) | ❌ | SEDANG |
| KL-03 | Rekam medis sederhana per pasien (merchant-side) | ❌ | SEDANG |
| KL-04 | Nomor antrian digital + estimasi waktu tunggu | ❌ | TINGGI |
| KL-05 | Tagihan & resep digital | ❌ | SEDANG |
| KL-06 | Telemedicine / konsultasi video | ❌ | RENDAH |
| KL-07 | Reminder jadwal kontrol ulang | ❌ | SEDANG |

### 6.9 Penitipan Hewan & Pet Services
- **Booking + durasi** (harian, overnight, mingguan)
- **Info hewan**: jenis, ras, umur, berat, vaksin, catatan kesehatan
- **Update foto harian** ke pemilik hewan (kirim via WA)
- **Kapasitas kandang** per ukuran hewan

### 6.10 Kerajinan & Produk Seni
| # | Fitur | Ada? | Prioritas |
|---|---|---|---|
| KR-01 | Mode custom order (spesifikasi warna, ukuran, motif) | ❌ | 🔥 TINGGI |
| KR-02 | Estimasi waktu produksi per produk | ❌ | TINGGI |
| KR-03 | Certificate of Authenticity (COA) digital untuk karya seni | ❌ | SEDANG |
| KR-04 | Edisi terbatas (limited edition) dengan counter stok terlihat | ❌ | SEDANG |
| KR-05 | Galeri proses pembuatan (work-in-progress photos) | ❌ | SEDANG |
| KR-06 | Opsi beli reseller / grosir dengan harga berbeda | ❌ | SEDANG |

### 6.11 Jasa Umum (Desainer, Les Privat, Konsultan)
| # | Fitur | Ada? | Prioritas |
|---|---|---|---|
| JU-01 | Booking konsultasi per jam / per sesi | ⚠️ Merchant-side only | 🔥 KRITIS |
| JU-02 | Brief form sebelum sesi (isi kebutuhan klien) | ❌ | TINGGI |
| JU-03 | Milestone tracking untuk project jangka panjang | ❌ | SEDANG |
| JU-04 | Deliver hasil kerja via platform (upload file) | ❌ | TINGGI |
| JU-05 | Kontrak freelance digital yang bisa ditandatangani | ❌ | SEDANG |
| JU-06 | Escrow per milestone (bayar bertahap sesuai progress) | ❌ | SEDANG |

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

### Yang Belum Ada
| # | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| SA-01 | 🔥 **Merchant Onboarding Automation** | TINGGI | Email sequence otomatis setelah toko daftar: Hari 1 (selamat datang + checklist), Hari 3 (panduan upload produk), Hari 7 (tips pertama penjualan). Track progress per toko |
| SA-02 | ✅ **Platform Health Score per Toko** — Sprint 13 (`shop_health_score` view + halaman list `admin.health-score.tsx` + halaman detail `admin.health-score.$shopId.tsx` dgn breakdown 4 komponen: Produk Aktif, Order 30 Hari, Rating, Recency, plus radial/bar chart & rekomendasi) |
| SA-03 | 🔥 **Automated Payout Scheduler** | TINGGI | Payout otomatis terjadwal (harian/mingguan/bulanan) tanpa perlu admin approve satu per satu. Admin set threshold & jadwal, sistem eksekusi otomatis |
| SA-04 | 🔥 **Merchant Tier Program (Admin Control)** | TINGGI | Admin definisikan tier: Starter → Verified → Top Seller → Elite. Kriteria otomatis dinilai setiap malam. Benefit per tier (komisi lebih rendah, visibilitas lebih tinggi) |
| SA-05 | **Konfigurasi Booking per Kategori** | TINGGI | Admin toggle: kategori bisnis mana yang boleh pakai sistem booking (salon, studio foto, dll.) dan set parameter booking (min H sebelumnya, maks peserta, deposit wajib/tidak) |
| SA-06 | **Multi-Admin dengan Role** | SEDANG | Super admin bisa undang admin lain dengan akses terbatas: Finance Admin (hanya keuangan), Support Admin (hanya impersonasi + dispute), Content Admin (hanya banner + moderasi) |
| SA-07 | **Cohort & LTV Analytics** | SEDANG | Analisis: cohort merchant berdasarkan bulan onboarding, berapa yang masih aktif 3/6/12 bulan kemudian. LTV per merchant per paket |
| SA-08 | **Data Export / GDPR Tools** | SEDANG | Pembeli/merchant bisa request export seluruh data mereka. Admin bisa eksekusi right-to-erasure (hapus data sesuai permintaan) |
| SA-09 | **Sandbox / Demo Mode** | SEDANG | Calon merchant bisa coba POS & dashboard dengan data dummy tanpa perlu daftar — kurangi barrier to entry |
| SA-10 | **A/B Testing Manager** | SEDANG | Admin bisa buat eksperimen: tampilkan versi A ke 50% pengguna, versi B ke 50%. Track konversi. Tanpa perlu deploy ulang |
| SA-11 | **Merchant Leaderboard Internal** | RENDAH | Ranking merchant berdasarkan GMV, pertumbuhan, kepuasan pelanggan — untuk program reward internal |
| SA-12 | **Tax Management** | TINGGI | Generate laporan pajak PPh/PPN per periode. Export format siap lapor SPT. Set NPWP platform |
| SA-13 | **SLA & Response Time Monitor** | SEDANG | Monitor: rata-rata waktu respons API, uptime 30 hari, notif jika ada degradasi performa |
| SA-14 | **Affiliate & Partner Management** | SEDANG | Kelola afiliator: buat kode unik, track klik & konversi, hitung komisi, bayar afiliator |

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
/toko/:slug                → Halaman toko (produk + info)
/toko/:slug/booking        → Booking layanan publik ✅
/toko/:slug/produk/:id     → Detail produk
/katalog/:slug             → Katalog link shareable ✅
/bandingkan                → Perbandingan produk ✅
/search                    → Hasil pencarian
/keranjang                 → Keranjang
/checkout                  → Checkout
/akun/*                    → Akun pembeli
/akun/bookings             → Riwayat booking ← PERLU DIBANGUN
/pos-app/*                 → Dashboard merchant
/admin/*                   → Super admin
/s/:slug/*                 → Storefront per toko
```

### Pola Database
- Semua data merchant di-scope `shop_id`
- Row Level Security (RLS) Supabase — `owner_user_id` di `coffee_shops` sebagai basis
- Notifikasi via tabel `notifications` + Supabase Realtime
- Sensitive data (payment secrets) disimpan terenkripsi AES-256

---

## BAGIAN 9: MODEL BISNIS

### Sumber Pendapatan Platform
1. **Biaya Sewa Bulanan** — Starter / Growth / Pro / Enterprise (harga dikonfigurasi Super Admin)
2. **Komisi Transaksi** — % dari setiap transaksi berhasil (dikonfigurasi per kategori/paket)
3. **Biaya Iklan** — Merchant bayar untuk posisi iklan premium di marketplace
4. **Tema Berbayar** — Tema toko premium (sekali beli atau sewa bulanan)
5. **Biaya Admin Penarikan** — Biaya per request penarikan dana

### Keputusan Final
| Keputusan | Jawaban |
|---|---|
| Nama platform | Dinamis — dikonfigurasi Super Admin, bisa diubah kapan saja |
| Model komisi | Sepenuhnya dikonfigurasi Super Admin (global, per kategori, per paket, per toko) |
| Payment gateway | Midtrans + Xendit keduanya; secret key diubah via UI Super Admin (terenkripsi) |
| Verifikasi toko | Wajib upload KTP sebelum toko aktif |
| Jadwal penarikan | Kapan saja (Pro+); bulanan (Gratis/Starter); biaya admin dikonfigurasi Super Admin |
| Booking | Halaman publik `/toko/:slug/booking` ✅ · Pilih staff ✅ · Deposit manual ✅ · Voucher booking ✅ · Analitik voucher ✅ · Integrasi payment gateway ❌ · Reschedule/batal mandiri ❌ · Reminder otomatis ❌ |

---

## BAGIAN 10: METRIK KEBERHASILAN

### Metrik Platform
| Metrik | Target 3 Bulan | Target 6 Bulan | Target 12 Bulan |
|---|---|---|---|
| Toko aktif (≥1 pesanan/minggu) | 500 | 2.000 | 10.000 |
| GMV per bulan | Rp 500 juta | Rp 2 miliar | Rp 10 miliar |
| Pembeli terdaftar | 5.000 | 25.000 | 100.000 |
| Conversion rate checkout | 35% | 45% | 55% |
| Retention pembeli (beli lagi 30 hari) | 25% | 35% | 45% |
| Churn rate toko (bulanan) | < 15% | < 10% | < 8% |
| Uptime | > 99.5% | > 99.5% | > 99.9% |

### Metrik per Fitur (Target 30 hari setelah live)
| Fitur | Metrik |
|---|---|
| Halaman Booking Publik | ≥ 30% usaha jasa aktifkan booking; ≥ 20% pembeli yang kunjungi halaman booking melakukan reservasi |
| Share Keranjang | ≥ 10% order berasal dari shared cart link |
| Alert Harga Turun | ≥ 15% pembeli yang klik alert melakukan pembelian |
| Voucher Toko | ≥ 20% toko aktif buat minimal 1 voucher |
| WhatsApp Notif Order | ≥ 60% merchant pakai tombol WA notif |
| Katalog Shareable | ≥ 40% merchant bagikan link katalog dalam 30 hari |

---

## BAGIAN 11: KEAMANAN & COMPLIANCE

- **Supabase Auth** — JWT + refresh token + session management
- **RLS** — Setiap tabel ada policy: merchant hanya akses tokonya; pembeli hanya akses datanya
- **Secret Gateway** — AES-256 encrypted, tidak pernah ditampilkan kembali di UI
- **KTP Photos** — Private Supabase bucket, hanya Super Admin bisa akses
- **Webhook Verification** — Setiap callback Midtrans/Xendit diverifikasi signature
- **Escrow** — Dana ditahan sampai pembeli konfirmasi atau auto-release setelah X hari
- **Audit Log** — Semua aksi admin, penarikan, impersonasi tercatat
- **PDPA/UU PDP** — Kebijakan privasi, hak hapus data, data lokalisasi
- **BPOM** — Wajib nomor BPOM untuk kategori beauty/food (enforced via atribut)
- **Pajak** — Laporan PPN 11% tersedia untuk audit

---

## BAGIAN 12: ARSITEKTUR UNIFIED SHOP

> **Prinsip Inti:** Satu merchant mendaftar sekali → langsung punya tiga sekaligus: website toko sendiri, halaman di marketplace, dan sistem booking. Bukan tiga produk terpisah — satu platform, satu dashboard.

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
    │              │  │             │  │              │
    │/s/:slug      │  │/toko/:slug  │  │/toko/:slug   │
    │atau          │  │             │  │  /booking    │
    │tokosaya.com  │  │Tampil di    │  │Pembeli self- │
    │              │  │search &     │  │serve booking │
    │Tema kustom   │  │kategori     │  │langsung ✅   │
    │per kategori  │  │marketplace  │  │              │
    └──────────────┘  └─────────────┘  └──────────────┘
```

### 12.2 URL & Akses Toko

| Kondisi | URL Toko | URL Marketplace | URL Booking | URL Katalog |
|---|---|---|---|---|
| Baru daftar (gratis) | `/s/nama-toko` | `/toko/nama-toko` | `/toko/nama-toko/booking` | `/katalog/nama-toko` |
| Paket Growth+ | `/s/nama-toko` + custom path | `/toko/nama-toko` | `/toko/nama-toko/booking` | `/katalog/nama-toko` |
| Paket Pro (custom domain) | `namatoko.com` | `/toko/nama-toko` | `namatoko.com/booking` | `/katalog/nama-toko` |

> Marketplace (`/toko/`) dan katalog (`/katalog/`) selalu pakai URL platform. Custom domain hanya untuk website toko sendiri.

### 12.3 Bagaimana Data Mengalir (Unified)

```
Sumber Pesanan/Booking:
  ├── Website Toko Sendiri (/s/:slug)      ──┐
  ├── Marketplace (/toko/:slug)            ──┤──→ Satu database toko
  ├── Link Booking Langsung (/toko/:slug/booking) ─┤   (shop_id = sama)
  ├── Katalog Shareable (/katalog/:slug)   ──┤
  ├── QR Code (di meja, brosur, IG story) ──┘
  └── POS / Kasir (walk-in langsung)      ────→ Masuk sebagai POS order

Semua masuk ke Dashboard yang sama:
  /pos-app/pesanan         → semua pesanan (POS + marketplace + website)
  /pos-app/booking         → semua booking (dari semua sumber)
  /pos-app/marketplace-orders → view khusus pesanan online
```

### 12.4 Fitur Booking per Kategori — Tampil/Sembunyi Otomatis

| Kategori | Jenis Booking | Field Ekstra |
|---|---|---|
| Barbershop / Salon | Booking Sesi | Pilih staff · Pilih layanan · Durasi |
| Restoran / Kafe | Reservasi Meja | Jumlah orang · Permintaan khusus |
| Rental Mobil / Motor | Booking Rental | Tanggal mulai-selesai · Pilih unit · Upload KTP/SIM |
| Sewa Alat Camping | Booking Rental | Tanggal mulai-selesai · Pilih item · Jumlah · Kondisi |
| Studio Foto | Booking Sesi + Paket | Pilih paket · Brief · Pilih lokasi |
| Klinik / Terapi | Booking Konsultasi | Keluhan awal · Pilih dokter/terapis |
| Pet Grooming / Hotel | Booking Sesi / Rental | Info hewan (jenis, ras, berat) |
| Kursus / Les Privat | Booking Kelas | Pilih guru · Level · Jadwal rutin |
| Villa / Penginapan | Booking Rental | Check-in / check-out · Jumlah tamu · Kamar |
| Gym / Fitness | Booking Kelas | Pilih kelas · Instruktur · Kapasitas |
| Workshop / Event | Booking Kelas | Jumlah peserta · Materi · Sertifikat |
| EO / Entertainer | Booking Jasa | Brief · Tanggal acara · Deposit |
| F&B / Katering | Pre-order + Reservasi | Tanggal acara · Jumlah porsi · Custom |

---

## BAGIAN 13: RENCANA TEMA PER KATEGORI USAHA

> Tema bukan sekedar warna — tema adalah identitas visual + layout + komponen yang disesuaikan dengan kebutuhan unik tiap jenis bisnis.

### 13.1 Filosofi Desain Tema

```
Satu tema = Layout + Palet Warna + Font + Komponen Khusus + Default Sections

Merchant bisa:
  → Ganti warna primer & aksen (color picker)
  → Upload logo & banner
  → Toggle sections on/off (hero, galeri, layanan, booking, ulasan, dll.)
  → Atur urutan sections (drag & drop)
  → Custom CSS (paket Pro)
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
| `theme_barber` | **The Barber** | Barbershop | Hitam · Putih · Merah | Dark maskulin · Vintage barber pole · Staff cards |
| `theme_barber_modern` | **Fresh Cut** | Barbershop Modern | Abu gelap · Putih · Kuning | Clean modern · Before/after gallery |
| `theme_salon_elegant` | **Belle Salon** | Salon Wanita | Blush pink · Gold · Putih | Elegan · Galeri layanan · Booking prominent |
| `theme_salon_bold` | **Glam Studio** | Salon & Nail Art | Ungu · Hitam · Gold | Bold & luxe · Portfolio nails/makeup |
| `theme_spa` | **Serenity** | Spa & Relaksasi | Sage green · Putih · Coklat kayu | Tenang · Foto suasana · Paket layanan cards |
| `theme_skincare` | **Pure Glow** | Skincare & Kosmetik | Putih · Krem · Blush | Clean beauty · Ingredient highlight · Before/after |

#### 🚗 Tema Otomotif & Rental
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_rental_car` | **Road Ready** | Rental Mobil | Abu gelap · Biru · Putih | Foto armada besar · Filter ketersediaan · Kalender booking |
| `theme_rental_moto` | **Ride Free** | Rental Motor | Oranye · Hitam · Putih | Energik · Grid armada · Harga per hari |
| `theme_workshop` | **Garage Pro** | Bengkel | Merah · Hitam · Abu | Industrial · Jenis servis grid · Booking antrian |
| `theme_carwash` | **Sparkling** | Cuci Kendaraan | Biru · Putih · Cyan | Fresh · Paket layanan · Queue booking |

#### 🏕️ Tema Rental & Outdoor
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_camping` | **Wild & Free** | Sewa Alat Camping | Hijau tua · Coklat · Krem | Adventure · Foto alam · Cek ketersediaan item |
| `theme_outdoor_sport` | **Peak Sport** | Sewa Alat Olahraga | Biru · Hijau · Putih | Aktif · Kategori alat · Kalender rental |
| `theme_event_rental` | **Party Pro** | Sewa Perlengkapan Event | Ungu · Gold · Putih | Event-forward · Paket bundling · CTA booking |

#### 📸 Tema Kreatif & Studio
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_photographer` | **Frame & Lens** | Fotografer & Studio | Hitam · Putih · Gold | Portfolio full-screen · Paket foto cards · Booking CTA |
| `theme_studio_dark` | **Studio Noir** | Studio Foto/Musik/Podcast | Hitam · Abu · Aksen neon | Dark & premium · Equipment list · Booking jam |
| `theme_creative` | **Canvas** | Desainer & Ilustrator | Putih · Hitam · Aksen bebas | Portfolio masonry · Brief form · Project card |

#### 🏠 Tema Properti & Hunian
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_villa` | **Escape** | Villa & Penginapan | Hijau · Coklat kayu · Putih | Foto landscape · Fasilitas grid · Kalender check-in/out |
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

#### ✈️ Tema Wisata & Perjalanan
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_travel` | **Wanderlust** | Tour & Travel | Biru laut · Putih · Sunset orange | Foto destinasi · Paket wisata cards · Booking + itinerary |
| `theme_guide` | **Local Expert** | Guide Wisata Lokal | Hijau · Coklat · Putih | Otentik · Profil guide · Review |

#### 🎓 Tema Pendidikan
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_education` | **EduPath** | Bimbel & Kursus | Biru · Putih · Kuning | Trustworthy · Jadwal kelas · Daftar guru |
| `theme_online_course` | **LearnUp** | Kursus Online | Ungu · Putih · Aksen hijau | Modern · Preview video · Progress CTA |

#### 🎭 Tema Event & Hiburan
| Kode Tema | Nama | Target | Palet Default | Karakteristik |
|---|---|---|---|---|
| `theme_event` | **Celebrate** | EO & Venue | Gold · Putih · Hitam | Mewah · Portofolio event · Paket EO · Booking |
| `theme_entertainer` | **Spotlight** | Artis & Entertainer | Hitam · Merah · Gold | Showbiz · Video reel · Booking + rider |

### 13.3 Roadmap Pembuatan Tema

#### Fase 1 — Tema Dasar (sudah ada)
- ✅ Classic · Modern · Bold · Natural

#### Fase 2 — Tema Kategori Utama (prioritas berdasarkan volume UMKM Indonesia)
| # | Tema | Kategori | Komponen Baru |
|---|---|---|---|
| 1 | **Cozy Brew** | F&B Cafe | POS-forward layout · Menu cards · Booking meja |
| 2 | **The Barber** | Barbershop | StaffCard · BeforeAfterGallery · BookingWidget |
| 3 | **Road Ready** | Rental Mobil | FleetGrid · AvailabilityCalendar · DocumentUpload |
| 4 | **Wild & Free** | Sewa Camping | ItemGrid · DateRangeBooking · DepositBadge |
| 5 | **Frame & Lens** | Fotografer | PortfolioMasonry · PackageCard · BriefForm |
| 6 | **Belle Salon** | Salon | StaffCard · ServicePriceList · BeforeAfterGallery |
| 7 | **Grand Table** | Restoran | MenuSection · TableReservation · HappyHourBanner |
| 8 | **Pure Glow** | Skincare | IngredientList · BPOMBadge · SkinTypeFilter |

#### Fase 3 — Tema Kategori Lanjutan
- MedCare (klinik), Iron Will (gym), Escape (villa), Pawsome (pet), Mode (fashion)
- Wanderlust (travel), EduPath (pendidikan), Celebrate (event)

#### Fase 4 — Tema Premium & White Label
- Tema berbayar (Rp 99k – Rp 499k sekali beli atau Rp 29k/bulan)
- White label: hapus semua branding platform (Enterprise only)

---

## BAGIAN 14: DETAIL PER FITUR

### G-3 Upselling Engine ("Sering Dibeli Bersama")

**Tujuan:** Naikkan AOV dengan menampilkan rekomendasi produk yang sering dibeli bersama produk yang sedang dilihat — campuran data otomatis (co-occurrence pesanan) dan kurasi manual oleh merchant.

**Skema tabel `product_upsell_suggestions`:**

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `shop_id` | uuid NOT NULL | Auto-isi dari `menu_items.shop_id` via trigger `upsell_fill_shop_id()` |
| `product_id` | uuid NOT NULL | FK `menu_items(id)` ON DELETE CASCADE |
| `suggested_id` | uuid NOT NULL | FK `menu_items(id)` ON DELETE CASCADE |
| `score` | numeric(10,2) | Jumlah co-purchase (untuk source `auto`) |
| `position` | smallint | Urutan tampil (1 = paling atas) |
| `source` | text | `auto` atau `manual` (CHECK) |
| `is_pinned` | boolean | Jika `true`, tidak ditimpa job otomatis |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger `touch_updated_at()` |

**Constraint:** UNIQUE `(product_id, suggested_id)` · CHECK `product_id <> suggested_id` (`upsell_no_self`).

**Index:** `(product_id, position)`, `(shop_id)`, `(source)`.

**RLS:**
- `upsell_public_read` — semua orang (anon + authenticated) boleh `SELECT`.
- `upsell_owner_manage` — `ALL` hanya untuk `auth.uid()` yang merupakan `coffee_shops.owner_id` dari `shop_id` baris.

**Fungsi `compute_upsell_suggestions()` (SECURITY DEFINER, dijalankan cron):**
1. `DELETE` baris `source='auto' AND is_pinned=false` (manual & pinned dipertahankan).
2. CTE `recent_items` — distinct `(order_id, menu_item_id)` dari `order_items ⋈ orders` 90 hari terakhir, kecuali status `cancelled/refunded/draft/pending`.
3. CTE `pairs` — self-join pada `order_id`, hitung `COUNT(*)` per pasangan, filter `>= 2`.
4. CTE `ranked` — `ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY score DESC)`, hanya pasangan dengan kedua produk `is_available = true` dan `shop_id` sama (intra-shop).
5. `INSERT` top-6 per produk dengan `ON CONFLICT (product_id, suggested_id) DO UPDATE` (refresh score & position).
6. Return `(processed_products, inserted_pairs)`.

**Jadwal cron:** `compute-upsell-weekly` — `0 3 * * 0` UTC = **Minggu pukul 10:00 WIB**.

**Pemicu manual:** fungsi sudah di-`REVOKE` dari `PUBLIC/anon/authenticated` — hanya bisa dipanggil service role / owner DB lewat SQL editor.

---

**Contoh query baca dari klien (halaman produk publik `/toko/$slug/produk/$productId`):**

```ts
// 1) Ambil saran ter-precompute (urut: pinned dulu, lalu posisi)
const { data: suggestions } = await supabase
  .from("product_upsell_suggestions")
  .select("suggested_id, position, score, source, is_pinned")
  .eq("product_id", productId)
  .order("is_pinned", { ascending: false })
  .order("position", { ascending: true })
  .limit(6);

const ids = (suggestions ?? []).map((s) => s.suggested_id);

// 2) Ambil detail produk dari menu_items (hanya yang aktif)
const { data: products } = await supabase
  .from("menu_items")
  .select("id, name, price, image_url")
  .in("id", ids)
  .eq("is_available", true);

// 3) Susun ulang sesuai urutan suggestion
const ordered = ids
  .map((id) => products?.find((p) => p.id === id))
  .filter(Boolean);
```

**Contoh query untuk panel merchant (`/pos-app/upsell`):**

```ts
// List saran satu produk + status pin & sumber
const { data } = await supabase
  .from("product_upsell_suggestions")
  .select("id, suggested_id, score, position, source, is_pinned")
  .eq("product_id", selectedProductId)
  .order("is_pinned", { ascending: false })
  .order("position", { ascending: true });

// Tambah saran manual (selalu pinned)
await supabase.from("product_upsell_suggestions").insert({
  product_id: selectedProductId,
  suggested_id: pickedId,
  source: "manual",
  is_pinned: true,
  position: nextPosition,
}); // shop_id auto-terisi via trigger upsell_fill_shop_id()

// Pin / unpin
await supabase
  .from("product_upsell_suggestions")
  .update({ is_pinned: !current.is_pinned })
  .eq("id", current.id);

// Hapus saran
await supabase
  .from("product_upsell_suggestions")
  .delete()
  .eq("id", suggestionId);
```

**Strategi fallback di komponen `FrequentlyBoughtTogether`:**
1. Coba baca dari `product_upsell_suggestions` (precomputed). Jika ≥ 2 item → render.
2. Fallback co-occurrence client-side (scan max 200 order, 500 item).
3. Fallback terakhir: 4 produk dari toko yang sama (urut `sort_order`).

**Metrik sukses (target 30 hari setelah live):**
- ≥ 40% halaman produk menampilkan blok "Sering Dibeli Bersama".
- ≥ 8% klik dari blok berakhir tambah ke keranjang.
- AOV merchant pengguna naik ≥ 5% dibanding 30 hari sebelumnya.

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
| Booking Sesi | Reservasi layanan dengan durasi tetap (potong rambut, foto, pijat) |
| Booking Rental | Reservasi barang/kendaraan dengan rentang tanggal sewa |
| Booking Tempat | Reservasi meja/venue berdasarkan tanggal + kapasitas |
