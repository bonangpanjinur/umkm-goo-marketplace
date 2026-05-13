# PRD — UMKMgo / KopiHub
## Platform Marketplace & POS Multi-Kategori untuk UMKM Indonesia
**Versi:** 4.0 | **Diperbarui:** Mei 2026 | **Status:** Living Document — Satu-satunya sumber kebenaran

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

## BAGIAN 1: STATUS IMPLEMENTASI SAAT INI

### 1.1 Super Admin ✅ Lengkap
Dashboard KPI · Manajemen KYC merchant · Manajemen toko (suspend/unsuspend) · Tagihan & invoice · Persetujuan penarikan dana · Voucher platform-wide · Dispute resolution · Manajemen paket & plan matrix · Konfigurasi komisi · Konfigurasi payment gateway (Midtrans + Xendit) · Branding platform · Broadcast notifikasi · Auto-cancel pesanan · Impersonasi toko (support mode + audit) · Audit log · Domain kustom · Feature flags · Fee simulator · Rekonsiliasi keuangan · Template notifikasi · Banner homepage · Review iklan merchant · Manajemen akun pembeli · Moderasi konten · Revenue Intelligence Dashboard · Churn & Retensi · Laporan Keuangan & Pajak (PPN 11%) · Deteksi Fraud (rule-based + anomali GMV) · Auto-renewal reminder · Revenue Leakage Detector

### 1.2 Merchant / Pemilik Toko ✅ Lengkap
**POS & Operasional:** Kasir digital · KDS · Meja + QR order · Shift kasir · Split bill per orang · Printer thermal · Panggil pelayan realtime

**Katalog:** Menu/produk · Kategori · Varian & atribut · Bundle · Produk digital · Import CSV

**Stok:** Stok terpadu · Inventori bahan baku · Resep + HPP · Deduct otomatis via trigger · Auto nonaktif menu jika bahan habis · Estimasi stok habis · Notif stok kritis

**Supply Chain:** Supplier · Purchase Order

**Tim:** Karyawan · Jadwal · Absensi · Shift

**Pengiriman:** Delivery · Kurir · RajaOngkir · Label pengiriman · Bukti foto pengantaran

**Pelanggan:** Database pelanggan · **Label otomatis** (VIP/Reguler/Baru/Tidak Aktif) · Live chat · Inbox

**Marketing:** Promo · **Voucher Toko** · Platform voucher · Flash sale terjadwal · Kalender promo · Email marketing (PRO) · Iklan berbayar · **Badge Tier Toko** (Platinum/Gold/Top Seller)

**Engagement:** Q&A produk + FAQ pin + auto-reply · Ulasan + sentiment analysis · Balas ulasan · Leaderboard

**Booking:** Slot layanan + manajemen booking (sisi merchant) · Reservasi meja + table maps

**Keuangan:** Wallet · Escrow · Penarikan · Rekening bank · Billing plan

**Laporan:** Harian + share WA · Penjualan · Profit & margin · Marketplace analytics · Invoice PDF · Laporan Keuangan

**Toko Online:** Storefront builder (4 tema) · Custom domain · Custom CSS · Storefront preview · Auto-reply luar jam buka · Auto print struk

**Notifikasi:** Notifikasi toko · **Banner keranjang terbengkalai**

### 1.3 Pembeli / Customer ✅ Lengkap
Beranda marketplace · Search + filter · Kategori · Flash sale · Featured shops · Banner iklan · Halaman toko + tier badge · Detail produk + varian + ulasan + foto ulasan · Q&A produk · Keranjang multi-toko · Checkout (delivery/pickup) · Berbagai metode bayar · Order tracking realtime · Bukti pengiriman kurir · Live chat dengan penjual · Dispute · Akun: pesanan, alamat, wishlist, favorit, notifikasi · Loyalty (poin, tier Bronze→Platinum, redeem) · **Voucher ulang tahun otomatis** · **Notif poin kadaluarsa** · Referral program dengan kode unik · Follow toko · **Reorder 1-klik** · Pesanan favorit (beri nama, pesan lagi) · **Alert harga turun** · Riwayat produk dilihat · Trust Certificate Badge · Estimasi waktu pengiriman

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
| `fnb_catering` | Katering & Box Nasi | Katering pernikahan, box makan siang, nasi tumpeng | Booking + deposit · Min. order · Tanggal pesan |
| `fnb_bakery` | Bakeri & Kue | Toko kue, roti artisan, kue ulang tahun custom | Pre-order · Custom design · Tanggal siap |
| `fnb_packaged` | Makanan Kemasan | Keripik, sambal, kue kering, minuman botol, frozen food | Berat · Expired · Komposisi · Halal cert |
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
| `digital_service` | Jasa Digital | Web developer, SEO, social media manager, data entry | Brief form · Milestone · Deliver file · Revisi |
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
| **Halaman booking publik untuk pembeli** | ❌ GAP KRITIS |
| Pilih staff/resource saat booking | ❌ |
| Deposit payment saat booking | ❌ |
| Reminder otomatis H-1 / H-3 | ❌ |
| Reschedule & batal mandiri oleh pembeli | ❌ |
| Riwayat booking di akun pembeli | ❌ |
| Kalender ketersediaan real-time | ❌ |

### 4.2 Roadmap Booking Lengkap

#### Fase A — Halaman Booking Publik (Prioritas KRITIS, ~2 hari)
URL: `/toko/:slug/booking`
```
Alur:
1. Pilih layanan (nama, durasi, harga)
2. Pilih tanggal (kalender — tanggal dengan slot tersedia tampil berbeda)
3. Pilih jam (slot kosong saja yang tampil)
4. Pilih staff/resource (opsional — jika merchant mengaktifkan)
5. Isi data: nama, nomor WA, catatan
6. Bayar deposit (opsional — merchant set %)
7. Konfirmasi → notif in-app + template WA ke pembeli dan merchant
```

#### Fase B — Manajemen Lanjutan (~3 hari)
- Reschedule mandiri (minimal H-24 sebelum jadwal)
- Pembatalan dengan kebijakan refund yang bisa dikonfigurasi
- Reminder otomatis H-3 dan H-1 (notif in-app + template WA)
- Riwayat booking di akun pembeli (`/akun/bookings`)
- Status: Menunggu → Dikonfirmasi → Selesai → Dibatalkan

#### Fase C — Fitur Lanjutan (~5 hari)
- Deposit payment via Midtrans/Xendit
- Paket + add-on saat booking (pilih layanan ekstra)
- Portofolio galeri terintegrasi
- Review post-booking (notif H+1 setelah layanan)
- Kalender sync (Google Calendar export .ics)

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

| # | Fitur | Role | Impact |
|---|---|---|---|
| P-01 | **Halaman Booking Publik** (`/toko/:slug/booking`) | Semua usaha jasa | Konversi |
| P-02 | **Tombol Share Produk** (WA/IG/copy link) | Pembeli | Viral |
| P-03 | **Share Keranjang** (link unik → teman bisa checkout item sama) | Pembeli | Viral |
| P-04 | **Pesan sebagai Hadiah** (checkbox + nama + pesan ucapan di checkout) | Pembeli | AOV |
| P-05 | **WhatsApp Notif Order** (tombol di detail pesanan → wa.me template terisi otomatis) | Merchant | Retensi |
| P-06 | **Histori Harga** (grafik mini 30 hari terakhir di halaman produk) | Pembeli | Kepercayaan |
| P-07 | **Size Chart** per produk fashion | Fashion | Konversi |
| P-08 | **Tag Alergen & Dietary** (Halal, Vegetarian, Bebas Gluten) untuk F&B | Restoran | Kepercayaan |
| P-09 | **Ingredient List & Nomor BPOM** untuk produk kecantikan/skincare | Beauty | Trust |
| P-10 | **Tombol Bagikan Laporan Harian ke WA** (sudah ada halaman, tambah tombol share) | Merchant | Efisiensi |

### 🟡 Kuartal Ini (Dampak Besar, Effort Sedang — 1–3 hari)

| # | Fitur | Role | Impact |
|---|---|---|---|
| M-01 | **Pilih Staff/Resource saat Booking** (fotografer, stylist, terapis) | Jasa | Konversi |
| M-02 | **Portofolio / Galeri Karya Toko** (section berbeda dari katalog produk) | Jasa/Kreatif | Kepercayaan |
| M-03 | **Reminder Booking Otomatis** H-1 dan H-3 | Semua jasa | Retensi |
| M-04 | **Reschedule & Batal Booking Mandiri** (dengan kebijakan refund) | Pembeli | UX |
| M-05 | **Perbandingan Produk** (2–4 produk side-by-side) | Pembeli | Konversi |
| M-06 | **Return Self-Service** (foto + alasan → auto-notif toko, toko 24 jam respons) | Pembeli | Kepercayaan |
| M-07 | **Upselling Engine** ("Sering dibeli bersama" per produk) | Merchant | AOV |
| M-08 | **Harga Grosir / Bulk Pricing** (harga beda per tier kuantitas) | Merchant | Pendapatan |
| M-09 | **Cek Ketersediaan Unit Rental** real-time (mobil, alat camping, kamera) | Rental | Konversi |
| M-10 | **Deposit Booking Online** via Midtrans/Xendit | Jasa/Rental | Komitmen |
| M-11 | **Happy Hour / Time-based Pricing** (harga berubah per jam) | F&B | Pendapatan |
| M-12 | **Waitlist / Antrian Virtual** (daftar antrian saat penuh, notif saat giliran tiba) | F&B/Jasa | Retensi |
| M-13 | **Preview Produk Digital** (sample watermarked sebelum beli) | Digital | Konversi |
| M-14 | **Cashback Wallet** (cashback % per transaksi, dipakai di order berikutnya) | Pembeli | Retensi |
| M-15 | **Katalog PDF / Link Shareable** (export produk aktif jadi PDF/link public) | Merchant | Pemasaran |

### 🟢 Masa Depan (Dampak Besar, Effort Besar — 3+ hari)

| # | Fitur | Estimasi |
|---|---|---|
| F-01 | Group Buy / Patungan (beli bareng, semua dapat harga spesial jika kuorum tercapai) | 3 hari |
| F-02 | Subscription / Langganan Produk Rutin | 3 hari |
| F-03 | AI Generator Deskripsi Produk (foto → nama + deskripsi + tag) | 2 hari |
| F-04 | Pre-Order Mode (tanggal buka, tutup, estimasi produksi) | 2 hari |
| F-05 | Custom Order / Made-to-Order Form | 2 hari |
| F-06 | Affiliate Program per Toko | 3 hari |
| F-07 | Google Analytics & Meta Pixel Integration | 2 hari |
| F-08 | Rating Pembeli 2-Way (toko rate pembeli, ekosistem lebih sehat) | 2 hari |
| F-09 | Live Streaming Commerce | 7+ hari |
| F-10 | BNPL / Cicilan (Kredivo, Akulaku) | 5 hari |
| F-11 | Mobile App (React Native / Expo) | 3+ minggu |
| F-12 | Merchant Onboarding Email Sequence (H+1, H+3, H+7 setelah daftar) | 2 hari |
| F-13 | Platform Health Score per Toko (skor 0–100 kelengkapan profil) | 2 hari |
| F-14 | Automated Payout Scheduler (payout otomatis terjadwal) | 2 hari |
| F-15 | Multi-Admin Super Admin (Finance Admin, Support Admin, Content Admin) | 2 hari |

---

## BAGIAN 6: FITUR KHUSUS PER KATEGORI

### 6.1 Rental (Mobil, Motor, Alat Camping, Elektronik, dll.)
- **Booking berdasarkan rentang tanggal** (bukan slot waktu)
- **Cek ketersediaan unit per item** — jika unit sudah dipesan tanggal tersebut, tidak bisa dipilih
- **Manajemen unit/armada** — merchant input setiap unit: ID, kondisi, foto, catatan
- **Dokumen wajib**: KTP untuk semua rental, SIM untuk kendaraan bermotor
- **Deposit wajib** — sistem hitung deposit otomatis berdasarkan nilai & durasi
- **Checklist kondisi** sebelum dan sesudah penyewaan (foto)
- **Perpanjangan sewa** — pembeli bisa request perpanjang dari akun
- **Denda keterlambatan** — merchant set nominal per hari terlambat

### 6.2 Barbershop & Salon
- **Booking + pilih barber/stylist** — foto + nama + spesialisasi
- **Galeri before/after** (berbeda dari katalog produk)
- **Loyalty stamp digital** (beli 9 potong, ke-10 gratis)
- **Catatan pelanggan per kunjungan** (riwayat warna, produk dipakai)
- **Pengingat potong rambut** — notif otomatis 4 minggu setelah kunjungan terakhir
- **Membership / Paket** (beli 10 sesi bayar 8, berlaku 3 bulan)

### 6.3 Restoran & F&B
- **Reservasi meja** dari marketplace (tanggal, waktu, jumlah orang, permintaan khusus)
- **Tag alergen & dietary**: Halal, Vegetarian, Vegan, Bebas Gluten, Bebas Laktosa, Pedas (level 1–5)
- **Info nutrisi** per menu item (kalori, protein, lemak, karbohidrat)
- **Happy hour pricing** — harga/diskon berbeda berdasarkan jam
- **Waitlist virtual** saat meja penuh
- **Split bill** per orang (sudah ada)
- **Pre-order katering** untuk tanggal tertentu (sudah ada sebagian)

### 6.4 Fotografer & Studio Kreatif
- **Paket sesi** (Basic 1 jam, Standard 2 jam, Premium full day)
- **Pilih lokasi** (studio indoor, outdoor, lokasi pilihan klien)
- **Brief form** sebelum sesi (konsep, referensi foto, kebutuhan)
- **Deposit 50%** saat booking
- **Deliver file** ke klien via link (Google Drive / Dropbox) setelah sesi
- **Add-on**: editing ekstra, album cetak, jumlah foto final
- **Portofolio per fotografer/studio** dengan kategori (wedding, produk, wisuda)

### 6.5 Fashion & Pakaian
- **Size chart** per produk (cm, bukan hanya S/M/L)
- **Filter ukuran & warna** di halaman toko
- **Notif "ukuran kamu tersedia lagi"** ketika restok
- **Custom order**: warna khusus, ukuran khusus, sablon nama
- **Pre-loved label**: kondisi A/B/C, ukuran aktual, tidak bisa retur

### 6.6 Kecantikan & Skincare
- **Ingredient list lengkap** per produk
- **Nomor BPOM & tanggal kedaluwarsa**
- **Tag jenis kulit**: Oily, Dry, Combination, Sensitive, Normal
- **Klaim verifikasi**: Dermatologically tested, Hypoallergenic, dll.

### 6.7 Produk Digital
- **Preview watermarked** (sample sebelum beli)
- **Lisensi**: Personal use vs. Commercial use
- **Update versi** — pembeli yang sudah beli otomatis dapat versi terbaru
- **Limit download** per lisensi

### 6.8 Penitipan Hewan & Pet Services
- **Booking + durasi** (harian, overnight, mingguan)
- **Info hewan**: jenis, ras, umur, berat, vaksin, catatan kesehatan
- **Update foto harian** ke pemilik hewan (kirim via WA)
- **Kapasitas kandang** per ukuran hewan

---

## BAGIAN 7: SUPER ADMIN — BACKLOG

### Yang Perlu Diperbaiki
| Fitur | Masalah | Saran |
|---|---|---|
| Broadcast Notifikasi | Hanya ke merchant, belum ke pembeli | Pisahkan target: merchant vs. pembeli |
| Manajemen Pembeli | Hanya lihat data, tidak ada kredit manual | Tambah: kredit cashback, suspend, reset password |
| Churn Analysis | Dashboard ada, tidak ada tindakan otomatis | Auto-kirim email re-engagement jika tidak login 14 hari |
| Laporan Keuangan | Ada tapi format belum standar akuntansi | Format kompatibel Jurnal / Accurate |

### Yang Belum Ada
| # | Fitur | Prioritas |
|---|---|---|
| SA-01 | **Merchant Onboarding Automation** — email sequence H+1/H+3/H+7 | TINGGI |
| SA-02 | **Platform Health Score** — skor 0–100 kelengkapan per toko | TINGGI |
| SA-03 | **Automated Payout Scheduler** — payout otomatis tanpa approve manual | TINGGI |
| SA-04 | **Merchant Tier Program (Admin Control)** — Starter → Verified → Top Seller → Elite | TINGGI |
| SA-05 | **Konfigurasi Booking per Kategori** — toggle mana kategori yang boleh pakai booking | TINGGI |
| SA-06 | **Multi-Admin dengan Role** — Finance, Support, Content Admin | SEDANG |
| SA-07 | **Cohort & LTV Analytics** — berapa merchant masih aktif 3/6/12 bulan setelah daftar | SEDANG |
| SA-08 | **Data Export / GDPR Tools** — export data user, right-to-erasure | SEDANG |
| SA-09 | **Sandbox / Demo Mode** — calon merchant coba POS dengan data dummy tanpa daftar | SEDANG |

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
/toko/:slug/booking        → Booking layanan publik ← PERLU DIBANGUN
/toko/:slug/produk/:id     → Detail produk
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
| Booking | Sistem sudah ada sisi merchant; perlu halaman publik untuk pembeli |

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
    │Tema kustom   │  │kategori     │  │langsung      │
    │per kategori  │  │marketplace  │  │              │
    └──────────────┘  └─────────────┘  └──────────────┘
```

### 12.2 Contoh Nyata per Jenis Usaha

#### Barbershop "Cukur Bros"
```
Daftar → pilih kategori: Barbershop
URL default: /s/cukur-bros  (bisa upgrade ke cukurbros.com)

Website Sendiri (tema: Barber Dark):
  → Profil toko + foto barbershop
  → Daftar layanan (Potong Biasa Rp 25k, Skin Fade Rp 45k, dll.)
  → Tombol "Booking Sekarang" menonjol
  → Galeri before/after
  → Ulasan pelanggan

Halaman Marketplace (/toko/cukur-bros):
  → Kartu toko tampil di kategori "Barbershop" di marketplace
  → Pembeli search "barbershop" → Cukur Bros muncul
  → Rating + jarak + harga mulai dari

Halaman Booking (/toko/cukur-bros/booking):
  → Pilih layanan: Potong Biasa / Skin Fade / Creambath
  → Pilih barber: Budi / Andi / Reza (dengan foto & spesialisasi)
  → Pilih tanggal & slot jam
  → Isi nama + WA
  → Konfirmasi → notif WA otomatis ke pembeli & toko

Dashboard Merchant (sama untuk semua sumber):
  → Booking dari website, marketplace, atau link langsung
    → semua masuk satu inbox di /pos-app/booking
```

#### Rental Mobil "Jaya Rental"
```
Daftar → pilih kategori: Rental Mobil
URL default: /s/jaya-rental  (bisa upgrade ke jayarental.com)

Website Sendiri (tema: Rental Bold):
  → Daftar armada: Avanza, Innova, Hiace (foto, kapasitas, harga/hari)
  → Cek ketersediaan per tanggal
  → Tombol "Pesan Sekarang"
  → Syarat sewa (SIM, KTP, deposit)
  → Area layanan (kota/kabupaten yang dilayani)

Halaman Marketplace (/toko/jaya-rental):
  → Tampil di kategori "Rental Kendaraan"
  → Filter: kota, harga, kapasitas
  → Rating + jumlah ulasan

Halaman Booking (/toko/jaya-rental/booking):
  → Pilih kendaraan: Avanza / Innova / Hiace
  → Pilih tanggal mulai & selesai (kalender range)
  → Cek ketersediaan otomatis (unit yang sudah dipesan tidak bisa dipilih)
  → Dengan/tanpa sopir
  → Lokasi ambil kendaraan
  → Upload KTP + SIM (form)
  → Bayar deposit online
  → Konfirmasi + kontrak digital dikirim via WA

Dashboard Merchant:
  → Semua booking masuk satu panel
  → Kalender armada: mana yang sedang disewa, kapan kembali
  → Alert: armada akan kembali besok (siapkan untuk penyewa berikutnya)
```

#### Toko Kue "Dapur Manis"
```
Daftar → pilih kategori: Bakeri & Kue
URL default: /s/dapur-manis

Website Sendiri (tema: Bakery Warm):
  → Foto produk yang menggiurkan (hero full-width)
  → Menu: kue ulang tahun, kue kering, box hampers
  → Pre-order form untuk kue custom
  → "Order minimal H-3" tertera jelas
  → Jam buka + kontak WA

Marketplace (/toko/dapur-manis):
  → Tampil di kategori F&B → Bakeri
  → Produk bisa dibeli langsung (ready stock)
  → Pre-order produk dengan tanggal siap

Booking/Order:
  → Produk ready: tambah ke keranjang → checkout biasa
  → Kue custom: isi form (ukuran, rasa, tulisan, tema, tanggal acara)
             → merchant review → kirim penawaran → konfirmasi
```

### 12.3 Bagaimana Data Mengalir (Unified)

```
Sumber Pesanan/Booking:
  ├── Website Toko Sendiri (/s/:slug)      ──┐
  ├── Marketplace (/toko/:slug)            ──┤──→ Satu database toko
  ├── Link Booking Langsung (/toko/:slug/booking) ─┤   (shop_id = sama)
  ├── QR Code (di meja, brosur, IG story) ──┘
  └── POS / Kasir (walk-in langsung)      ────→ Masuk sebagai POS order

Semua masuk ke Dashboard yang sama:
  /pos-app/pesanan         → semua pesanan (POS + marketplace + website)
  /pos-app/booking         → semua booking (dari semua sumber)
  /pos-app/marketplace-orders → view khusus pesanan online
```

### 12.4 URL & Akses Toko

| Kondisi | URL Toko | URL Marketplace | URL Booking |
|---|---|---|---|
| Baru daftar (gratis) | `/s/nama-toko` | `/toko/nama-toko` | `/toko/nama-toko/booking` |
| Paket Growth+ | `/s/nama-toko` + custom path | `/toko/nama-toko` | `/toko/nama-toko/booking` |
| Paket Pro (custom domain) | `namatoko.com` | `/toko/nama-toko` | `namatoko.com/booking` |

> Marketplace (`/toko/`) selalu pakai URL platform — tidak bisa pakai custom domain di halaman marketplace. Custom domain hanya untuk website toko sendiri.

### 12.5 Fitur Booking per Kategori — Tampil/Sembunyi Otomatis

Fitur booking **otomatis menyesuaikan** berdasarkan kategori usaha yang dipilih saat daftar:

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

> Tema bukan sekedar warna — tema adalah identitas visual + layout + komponen yang disesuaikan dengan kebutuhan unik tiap jenis bisnis. Setiap merchant bisa pilih tema yang sesuai kategori usahanya, dan kustomisasi warna, font, logo.

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

### 13.2 Katalog Tema (35+ Tema Rencana)

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

### 13.3 Komponen Khusus per Tema

Setiap tema memiliki komponen yang spesifik untuk kebutuhan bisnis tersebut:

#### Tema Barber / Salon — Komponen Ekstra
```
StaffCard         → Foto barber/stylist + nama + spesialisasi + tombol pilih
BeforeAfterGallery → Slider sebelum/sesudah (drag atau swipe)
LoyaltyStamp      → Kartu stamp digital (8 stamp = 1 gratis)
BookingWidget     → Pilih layanan → pilih staff → pilih slot → form
ServicePriceList  → Tabel layanan + durasi + harga (bergambar opsional)
```

#### Tema Rental (Mobil/Alat) — Komponen Ekstra
```
FleetGrid         → Grid kendaraan/alat + foto + spesifikasi + harga/hari
AvailabilityCalendar → Pilih tanggal range → cek ketersediaan
DepositBadge      → Banner "Deposit X% diperlukan"
DocumentUpload    → Upload KTP/SIM saat booking
UnitStatusBadge   → Tersedia / Dipesan / Dalam Perawatan
```

#### Tema Restoran — Komponen Ekstra
```
MenuSection       → Kategori menu dengan foto besar + harga + allergen tag
TableReservation  → Form reservasi meja (tanggal + waktu + jumlah orang)
HappyHourBanner   → Banner countdown happy hour aktif
DietaryFilter     → Filter Halal / Vegetarian / Bebas Gluten
NutritionBadge    → Info kalori per item (opsional)
QROrderButton     → CTA scan QR untuk order di meja
```

#### Tema Fotografer / Studio — Komponen Ekstra
```
PortfolioMasonry  → Grid foto portfolio (bisa klik untuk fullscreen)
PackageCard       → Paket foto (nama + durasi + include + harga + CTA)
BriefForm         → Form pengisian konsep/kebutuhan sebelum booking
DeliverInfo       → Info: "X foto edited, format JPG + RAW, deliver H+7"
PhotoographerProfile → Foto fotografer + bio + pengalaman + spesialisasi
```

#### Tema Villa / Penginapan — Komponen Ekstra
```
PhotoGallery      → Gallery foto 5+ gambar (hero + lightbox)
FacilityGrid      → Grid fasilitas (WiFi, kolam, dapur, dll.) dengan ikon
CheckInOutPicker  → Date range picker check-in / check-out
GuestSelector     → Pilih jumlah tamu (dewasa + anak)
RoomGrid          → Tipe kamar + foto + fasilitas + harga/malam
```

### 13.4 Roadmap Pembuatan Tema

#### Fase 1 — Tema Dasar (4 tema, sudah ada sebagian)
- ✅ Classic (generik, semua kategori)
- ✅ Modern (minimalis)
- ✅ Bold (kontras tinggi)
- ✅ Natural (earthy tones)

#### Fase 2 — Tema Kategori Utama (bangun sekarang, ~1 minggu per tema)
Prioritas berdasarkan jumlah kategori paling umum di UMKM Indonesia:

| # | Tema | Kategori | Komponen Baru |
|---|---|---|---|
| 1 | **Cozy Brew** (kafe) | F&B Cafe | POS-forward layout · Menu cards · Booking meja |
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
- Custom tema dari Super Admin (upload komponen sendiri)

### 13.5 Implementasi Teknis Tema

```typescript
// Setiap tema didefinisikan sebagai config object:
interface ThemeConfig {
  id: string                    // "theme_barber"
  name: string                  // "The Barber"
  category: string[]            // ["beauty_barber"]
  layout: "service" | "product" | "rental" | "restaurant"
  defaultColors: {
    primary: string             // "#1a1a1a"
    accent: string              // "#e63946"
    background: string          // "#f8f8f8"
    text: string                // "#2d2d2d"
  }
  defaultFont: string           // "Inter" | "Playfair Display" | "Space Grotesk"
  sections: ThemeSection[]      // Sections yang tampil default
  components: string[]          // Komponen ekstra yang tersedia
  bookingType: "session" | "rental" | "reservation" | "class" | "none"
  isPremium: boolean
  price?: number
}

// Section yang bisa di-toggle & drag:
type ThemeSection =
  | "hero"              // Banner utama / foto toko
  | "services"          // Daftar layanan (untuk jasa)
  | "products"          // Grid produk (untuk toko)
  | "fleet"             // Grid armada (untuk rental)
  | "portfolio"         // Galeri karya (untuk kreatif)
  | "booking_cta"       // Widget booking
  | "staff"             // Profil staff
  | "about"             // Tentang toko
  | "reviews"           // Ulasan pelanggan
  | "location"          // Peta + jam buka
  | "faq"               // FAQ
  | "contact"           // Tombol WA + sosmed
```

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
