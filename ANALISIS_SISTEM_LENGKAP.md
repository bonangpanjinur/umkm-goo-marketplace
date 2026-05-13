# Analisis Sistem Lengkap — KopiHub / UMKMgo
**Tanggal:** Mei 2026 | **Versi Analisis:** 1.0 | **Dasar:** Eksplorasi menyeluruh seluruh codebase

---

## CARA MEMBACA DOKUMEN INI

Setiap fitur diberi label:
- ✅ **Ada & Berjalan** — sudah diimplementasi
- ⚠️ **Ada Tapi Perlu Perbaikan** — ada tapi belum lengkap atau ada bug UX
- ❌ **Belum Ada** — perlu dibangun dari nol
- 🔥 **Prioritas Tinggi** — impact besar, relatif mudah dibangun
- 💡 **Ide Baru** — belum ada di PRD sebelumnya

---

## BAGIAN 1: SUPER ADMIN (Pemilik Platform)

### Yang Sudah Ada ✅
| Fitur | Catatan |
|---|---|
| Dashboard KPI platform (GMV, MRR, toko aktif, pesanan) | Lengkap |
| Manajemen KYC merchant (review KTP) | Lengkap |
| Manajemen toko (lihat, suspend, detail) | Lengkap |
| Manajemen tagihan & invoice merchant | Lengkap |
| Persetujuan penarikan dana | Lengkap |
| Voucher platform-wide | Lengkap |
| Penyelesaian sengketa (dispute) | Lengkap |
| Konfigurasi paket & plan matrix | Lengkap |
| Konfigurasi komisi transaksi | Lengkap |
| Konfigurasi payment gateway (Midtrans, Xendit) | Lengkap |
| Branding platform (logo, warna, nama) | Lengkap |
| Broadcast notifikasi | Lengkap |
| Auto-cancel pesanan tidak dibayar | Lengkap |
| Impersonasi toko (support mode) | Lengkap + audit log |
| Audit log semua aktivitas admin | Lengkap |
| Manajemen domain kustom toko | Lengkap |
| Feature flags (on/off per fitur) | Lengkap |
| Fee simulator | Lengkap |
| Rekonsiliasi keuangan | Lengkap |
| Template notifikasi (email/push) | Lengkap |
| Manajemen banner homepage | Lengkap |
| Review & approve iklan merchant | Lengkap |
| Manajemen akun pembeli | Lengkap |
| Moderasi konten (produk, ulasan) | Lengkap |
| Revenue intelligence & forecasting | Lengkap |
| Churn & retention analysis | Lengkap |
| Laporan keuangan (termasuk PPN 11%) | Lengkap |
| Deteksi fraud (basic) | Basic |
| Auto-renewal reminder | Lengkap |
| Revenue leakage detection | Lengkap |
| Katalog global & kategori | Ada |

### Yang Perlu Diperbaiki ⚠️
| Fitur | Masalah | Saran Perbaikan |
|---|---|---|
| **Deteksi Fraud** | Hanya rule-based dasar, tidak ada ML scoring | Tambah skor risiko 0–100 per transaksi berdasarkan pola: IP, device, kecepatan order, nilai transaksi |
| **Manajemen Kategori** | Kategori global ada tapi CRUD dari admin belum dinamis | Buat halaman `/admin/categories` — add/edit/delete/reorder kategori bisnis beserta icon, slug, fitur toggle |
| **Katalog Global** | Ada tapi belum jelas scope-nya | Pisahkan antara "Kategori Bisnis" (F&B, Fashion, dll.) dan "Kategori Produk" per toko |
| **Churn Analysis** | Hanya dashboard, tidak ada tindakan otomatis | Tambah trigger: jika toko tidak login 14 hari → otomatis kirim email re-engagement |
| **Laporan Keuangan** | CSV export ada tapi format belum standar akuntansi | Tambah format laporan yang kompatibel dengan format umum (Jurnal, MYOB, Accurate) |
| **Broadcast Notifikasi** | Kirim ke semua atau segmen toko, belum bisa ke pembeli | Pisahkan target: broadcast ke merchant vs. broadcast ke pembeli |
| **Manajemen Pengguna Pembeli** | Hanya lihat data, tidak ada tindakan | Tambah: suspend akun, reset password, lihat riwayat order, tambah kredit/cashback manual |

### Yang Belum Ada ❌
| # | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| SA-01 | 🔥 **Merchant Onboarding Automation** | TINGGI | Email sequence otomatis setelah toko daftar: Hari 1 (selamat datang + checklist), Hari 3 (panduan upload produk), Hari 7 (tips pertama penjualan). Track progress per toko |
| SA-02 | 🔥 **Platform Health Score per Toko** | TINGGI | Skor 0–100 per toko berdasarkan: produk aktif, foto lengkap, deskripsi terisi, respons ulasan, waktu proses order. Tampilkan di daftar toko admin |
| SA-03 | 🔥 **Automated Payout Scheduler** | TINGGI | Payout otomatis terjadwal (harian/mingguan/bulanan) tanpa perlu admin approve satu per satu. Admin set threshold & jadwal, sistem eksekusi otomatis |
| SA-04 | 🔥 **Merchant Tier Program (Admin Control)** | TINGGI | Admin definisikan tier: Starter → Verified → Top Seller → Elite. Kriteria otomatis dinilai setiap malam. Benefit per tier (komisi lebih rendah, visibilitas lebih tinggi) |
| SA-05 | **Cohort & LTV Analytics** | TINGGI | Analisis: cohort merchant berdasarkan bulan onboarding, berapa yang masih aktif 3/6/12 bulan kemudian. LTV per merchant per paket |
| SA-06 | **A/B Testing Manager** | SEDANG | Admin bisa buat eksperimen: tampilkan versi A ke 50% pengguna, versi B ke 50%. Track konversi. Tanpa perlu deploy ulang |
| SA-07 | **Affiliate & Partner Management** | SEDANG | Kelola afiliator: buat kode unik, track klik & konversi, hitung komisi, bayar afiliator |
| SA-08 | **SLA & Response Time Monitor** | SEDANG | Monitor: rata-rata waktu respons API, uptime 30 hari, notif jika ada degradasi performa |
| SA-09 | **Data Export & GDPR Tools** | TINGGI | Pembeli/merchant bisa request export seluruh data mereka. Admin bisa eksekusi right-to-erasure (hapus data sesuai permintaan) |
| SA-10 | **Merchant Leaderboard Internal** | RENDAH | Ranking merchant berdasarkan GMV, pertumbuhan, kepuasan pelanggan — untuk program reward internal |
| SA-11 | 💡 **Sandbox / Demo Mode** | SEDANG | Calon merchant bisa coba POS & dashboard dengan data dummy tanpa perlu daftar — kurangi barrier to entry |
| SA-12 | 💡 **Konfigurasi Booking per Kategori** | TINGGI | Admin bisa toggle: kategori bisnis mana yang boleh pakai sistem booking (salon, studio foto, dll.) dan set parameter booking (min H sebelumnya, maks peserta, deposit wajib/tidak) |
| SA-13 | 💡 **Tax Management** | TINGGI | Generate laporan pajak PPh/PPN per periode. Export format siap lapor SPT. Set NPWP platform |
| SA-14 | 💡 **Multi-Admin dengan Role** | SEDANG | Super admin bisa undang admin lain dengan akses terbatas: Finance Admin (hanya keuangan), Support Admin (hanya impersonasi + dispute), Content Admin (hanya banner + moderasi) |

---

## BAGIAN 2: PEMILIK TOKO / MERCHANT

### Yang Sudah Ada ✅
| Modul | Fitur |
|---|---|
| **POS** | Kasir digital, KDS, manajemen meja, QR order, shift kasir |
| **Katalog** | Menu/produk, kategori, varian, atribut, bundle, produk digital |
| **Stok** | Stok terpadu, inventori bahan baku, resep, HPP otomatis |
| **Supply Chain** | Supplier, purchase order |
| **Tim** | Karyawan, jadwal, absensi, shift |
| **Pengiriman** | Delivery, kurir, RajaOngkir, label pengiriman |
| **Pelanggan** | Database pelanggan, label otomatis (VIP/Reguler/Baru/Tidak Aktif) |
| **Marketing** | Promo, voucher toko, platform voucher, kalender promo, email marketing, iklan |
| **Engagement** | Live chat, Q&A produk, ulasan + sentiment analysis |
| **Booking** | Slot layanan, manajemen booking manual (sisi merchant) |
| **Keuangan** | Wallet, escrow, penarikan, rekening bank, billing |
| **Laporan** | Laporan harian, penjualan, profit & margin, analitik marketplace, laporan harian WA |
| **Toko Online** | Storefront builder (4 tema), custom domain, custom CSS |
| **Operasional** | Backup data, outlet multi-cabang, QR meja, printer thermal |
| **Notifikasi** | Notifikasi toko, keranjang terbengkalai (banner) |

### Yang Perlu Diperbaiki ⚠️
| Fitur | Masalah | Saran Perbaikan |
|---|---|---|
| **Dashboard POS** | Grafik tren hanya 7/30 hari, tidak bisa pilih rentang kustom | Tambah date range picker — pilih tanggal mulai & selesai bebas |
| **Manajemen Pesanan** | Status pesanan update manual satu per satu | Tambah bulk action: pilih beberapa pesanan → update status sekaligus |
| **Upload Foto Produk** | Belum ada crop/resize di browser sebelum upload | Tambah crop tool in-browser (react-image-crop) — hemat storage, foto lebih konsisten |
| **Booking** | Hanya bisa dibuat manual oleh merchant, belum ada halaman publik untuk pembeli booking sendiri | 🔥 Buat halaman publik `/toko/:slug/booking` agar pembeli bisa booking mandiri |
| **Laporan Laba Rugi** | Halaman profit ada tapi tidak menampilkan breakdown biaya operasional (gaji, bahan baku) | Tambah input "biaya lain-lain" per periode agar L/R lebih akurat |
| **Stok** | Alert stok menipis hanya di UI, tidak ada notif push/WA | Tambah: kirim notif push ke owner + template WA jika stok item tertentu di bawah minimum |
| **Q&A Produk** | Auto-reply ada tapi matching hanya exact — miss banyak pertanyaan serupa | Upgrade ke fuzzy matching / keyword-based matching |
| **Ulasan** | Balas ulasan ada tapi tidak ada filter "belum dibalas" yang jelas | Tambah tab "Perlu Dibalas" yang muncul dengan badge merah jika ada ulasan belum dibalas > 24 jam |
| **Email Marketing** | Ada tapi hanya PRO plan | Tambah versi basic (kirim ke semua pelanggan toko, max 200/bulan) untuk paket Growth |
| **Kalender Promo** | Ada tapi tidak terintegrasi dengan jadwal produk flash sale | Sinkronkan kalender promo dengan flash sale dan voucher aktif |

### Yang Belum Ada ❌
| # | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| M-01 | 🔥 **Halaman Booking Publik** | KRITIS | Pembeli bisa buka `/toko/:slug/booking`, pilih layanan, pilih staff (opsional), pilih slot kosong, isi nama & WA, bayar deposit (opsional), konfirmasi booking. Berlaku untuk semua jenis usaha |
| M-02 | 🔥 **WhatsApp Notif Order (Template)** | TINGGI | Tombol "Kirim WA" di detail pesanan merchant → buka wa.me dengan pesan sudah terisi: nama pembeli, produk, total, status, nomor resi |
| M-03 | 🔥 **Bagikan Produk ke WA/IG** | TINGGI | Tombol share di setiap produk di dashboard toko → generate caption siap share + gambar produk |
| M-04 | 🔥 **Katalog PDF/Link Shareable** | TINGGI | Export daftar produk aktif menjadi: (1) link halaman katalog publik, (2) file PDF katalog bergaya brosur |
| M-05 | 🔥 **Upselling Engine** | TINGGI | Merchant bisa set "rekomendasi produk" untuk setiap item: "Sering dibeli bersama". Tampil di halaman produk dan di checkout |
| M-06 | 🔥 **Harga Grosir / Bulk Pricing** | TINGGI | Toko bisa set harga berbeda untuk pembelian jumlah besar: "Beli 1–4: Rp 50.000 | Beli 5–9: Rp 45.000 | Beli 10+: Rp 40.000" |
| M-07 | 🔥 **AI Generator Deskripsi Produk** | TINGGI | Upload foto produk → AI generate: nama, deskripsi 150 kata, 5 tag SEO, kategori saran, harga estimasi. Output Bahasa Indonesia |
| M-08 | **Subscription / Langganan Produk** | TINGGI | Pembeli bisa langganan produk rutin (setiap minggu/2 minggu/bulan). Order dibuat otomatis, merchant terima pesanan reguler tanpa pembeli perlu order ulang |
| M-09 | **Pre-Order** | TINGGI | Toggle "Pre-order" per produk: set tanggal buka, tanggal tutup, tanggal pengiriman estimasi. Cocok untuk UMKM yang buat per batch |
| M-10 | **Custom Order / Made-to-Order** | TINGGI | Form request kustom di halaman produk: pembeli isi spesifikasi → merchant review → kirim penawaran harga → pembeli setuju → order dibuat |
| M-11 | **Affiliate Program per Toko** | SEDANG | Merchant generate kode/link afiliasi unik → siapa pun (influencer, pelanggan loyal) bisa share → dapat komisi % dari setiap penjualan via link mereka |
| M-12 | **Video Produk** | SEDANG | Upload video maksimal 60 detik per produk. Tampil di halaman produk marketplace sebagai preview |
| M-13 | **Staff Performance Dashboard** | SEDANG | Lihat penjualan per kasir per shift, target vs. aktual, top produk terjual per staff — untuk motivasi dan bonus karyawan |
| M-14 | **Purchase Order Otomatis** | SEDANG | Set minimum stok per bahan baku → ketika stok turun ke bawah minimum, sistem otomatis buat draft Purchase Order ke supplier terkait |
| M-15 | **Google Analytics & Meta Pixel** | SEDANG | Input Tracking ID GA4 dan Meta Pixel ID di pengaturan toko → script otomatis dipasang di storefront toko |
| M-16 | **Dynamic / Time-Based Pricing** | SEDANG | Set harga berbeda berdasarkan jam (happy hour F&B), hari (harga weekend), atau stok tersisa (makin sedikit makin mahal) |
| M-17 | 💡 **Portofolio / Galeri Karya** | TINGGI | Untuk toko layanan (fotografer, desainer, pengrajin): section galeri hasil kerja di halaman toko, berbeda dari katalog produk. Pembeli bisa lihat portofolio sebelum booking |
| M-18 | 💡 **Reminder Booking Otomatis** | TINGGI | H-1 sebelum jadwal booking: sistem otomatis kirim reminder ke pembeli (notif in-app + template WA) |
| M-19 | 💡 **Waitlist / Antrian Digital** | SEDANG | Untuk toko F&B atau layanan yang ramai: pembeli bisa daftar antrian virtual, terima notif saat giliran mereka tiba |
| M-20 | 💡 **Tipping / Uang Tips** | RENDAH | Pembeli bisa tambahkan nominal tips ke pesanan (bisa opsional atau sarankan nominal). Khusus F&B dan jasa |

---

## BAGIAN 3: PEMBELI / CUSTOMER

### Yang Sudah Ada ✅
| Modul | Fitur |
|---|---|
| **Discovery** | Beranda, search, kategori, flash sale, featured shops, banner |
| **Produk** | Detail produk, varian, ulasan, Q&A |
| **Toko** | Halaman toko, follow toko, peta lokasi toko, tier badge |
| **Belanja** | Keranjang, checkout (delivery/pickup), berbagai metode bayar |
| **Pasca-Beli** | Order tracking, chat dengan penjual, dispute, laporan retur |
| **Akun** | Profil, pesanan, alamat, wishlist, favorit, notifikasi |
| **Engagement** | Loyalty (poin, tier, redeem), referral program |
| **Fitur Baru** | Reorder 1-klik, alert harga turun, riwayat produk dilihat |

### Yang Perlu Diperbaiki ⚠️
| Fitur | Masalah | Saran Perbaikan |
|---|---|---|
| **Pencarian** | Hanya full-text sederhana, tidak ada filter lanjutan | Tambah filter: harga min–max, rating minimum, kategori, lokasi toko, metode bayar, pengiriman gratis |
| **Halaman Keranjang** | Tidak bisa pilih item mana yang mau di-checkout (semua atau tidak sama sekali) | Tambah checkbox per item — pembeli bisa pilih sebagian untuk checkout sekarang |
| **Checkout** | Alamat tersimpan tidak otomatis dipilih, harus input ulang tiap kali | Auto-select alamat default saat checkout dibuka |
| **Order Tracking** | Tracking hanya status internal, belum ada integrasi nomor resi ke website kurir | Tambah tombol "Cek Resi" yang langsung buka tracking di website kurir yang relevan |
| **Wishlist** | Alert harga turun hanya localStorage, tidak persisten lintas device | Simpan price alert di database agar sinkron di semua perangkat |
| **Notifikasi** | Notif in-app ada tapi belum ada push notification browser | Implementasi Web Push Notification (service worker) untuk notif walau browser ditutup |
| **Ulasan** | Tidak bisa upload foto saat menulis ulasan | Tambah upload foto/video bukti di form ulasan — tingkatkan kepercayaan |
| **Profil Akun** | Belum ada avatar/foto profil yang bisa diupload | Tambah upload avatar |

### Yang Belum Ada ❌
| # | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| C-01 | 🔥 **Booking Layanan dari Marketplace** | KRITIS | Pembeli bisa booking langsung dari halaman toko/produk untuk usaha yang enable booking (salon, barber, fotografer, klinik, dll.). Pilih layanan → pilih tanggal & jam → konfirmasi |
| C-02 | 🔥 **Share Keranjang** | TINGGI | Tombol "Bagikan Keranjang" → link unik → siapa pun klik, item yang sama masuk keranjang mereka. Viral loop terkuat |
| C-03 | 🔥 **Pesan sebagai Hadiah** | TINGGI | Checkbox "Ini hadiah" di checkout → input nama & pesan untuk penerima → nota pesanan tampilkan info hadiah |
| C-04 | 🔥 **Tombol Share Produk** | TINGGI | Share ke WhatsApp (auto-fill caption + gambar), Instagram Stories, copy link — satu klik dari halaman produk |
| C-05 | 🔥 **Perbandingan Produk** | TINGGI | Pilih 2–4 produk → tabel side-by-side: harga, varian, rating, pengiriman, toko. Bantu keputusan beli |
| C-06 | 🔥 **Histori Harga** | TINGGI | Grafik mini harga 30–90 hari terakhir di halaman produk. "Harga terendah bulan ini: Rp X" |
| C-07 | **Cashback Wallet** | TINGGI | Setiap pembelian dapat cashback % ke saldo wallet. Saldo bisa dipakai di order berikutnya. Admin set % cashback per kategori |
| C-08 | **Group Buy / Patungan** | TINGGI | Buat room beli bareng → share link → jika peserta cukup sebelum deadline, semua dapat harga spesial. Gagal = tidak ada yang dicharge |
| C-09 | **Return Self-Service** | TINGGI | Tombol "Ajukan Retur" di detail pesanan (dalam 7 hari). Upload foto → pilih alasan → auto-notif ke toko. Toko punya 24 jam respons |
| C-10 | **Rating Pembeli (2-Way Rating)** | SEDANG | Toko bisa rate pembeli setelah order selesai (1–5 bintang + catatan). Pembeli dengan rating rendah bisa diblok oleh toko tertentu |
| C-11 | **Shopping List / Planner** | SEDANG | Buat daftar belanja pribadi dengan quantity dan catatan. Bisa jadi order dengan satu klik. Beda dari wishlist (wishlist = ingin beli suatu hari, shopping list = rencana beli sekarang) |
| C-12 | **Daftar Dibeli Rutin** | SEDANG | "Beli Lagi" section: daftar produk yang paling sering dibeli pembeli — mudah reorder tanpa cari dari awal |
| C-13 | **AI Chatbot Asisten Belanja** | SEDANG | Chat dengan AI: "Cariin kopi arabika di bawah 100rb" → AI tampilkan produk relevan dari marketplace |
| C-14 | **Subscription Shopping** | SEDANG | Langganan produk rutin: pilih produk + frekuensi (tiap minggu/bulan) → order dibuat otomatis, pembeli tidak perlu ingat beli lagi |
| C-15 | **Bayar di Tempat / COD + OTP** | SEDANG | Untuk pesanan COD: kurir dapat OTP 6 digit, pembeli harus input OTP untuk konfirmasi penerimaan — kurangi penolakan & kecurangan |
| C-16 | **BNPL / Cicilan** | TINGGI | Integrasi Kredivo atau Akulaku — cicilan tanpa kartu kredit. Pembeli bayar cicil, toko terima penuh di muka |
| C-17 | **Live Streaming Commerce** | TINGGI | Toko bisa live stream. Penonton bisa tambahkan produk yang di-pin ke keranjang langsung selama siaran |
| C-18 | 💡 **Reservasi Meja dari Marketplace** | TINGGI | Untuk restoran/kafe: pembeli bisa reservasi meja langsung dari halaman toko di marketplace. Pilih tanggal, waktu, jumlah orang |
| C-19 | 💡 **Menu Digital Interaktif** | SEDANG | Buka QR menu dari kafe → tampilan menu digital yang bisa filter (vegetarian, halal, tanpa gluten, allergen) → order & bayar dari HP |
| C-20 | 💡 **Komunitas / Feed Ulasan Sosial** | RENDAH | Feed publik: ulasan produk dengan foto, bisa di-like dan dikomentari. Pembeli bisa follow reviewer lain. UGC yang mendorong discovery |

---

## BAGIAN 4: FITUR KHUSUS RESTORAN & F&B

### Yang Sudah Ada ✅
- POS kasir dengan split meja
- Kitchen Display System (KDS)
- Manajemen meja & QR order
- Resep & deduct stok otomatis
- Printer thermal dapur
- Shift kasir & rekonsiliasi kas
- Inventori bahan baku
- Pengiriman (delivery/pickup)

### Yang Perlu Diperbaiki ⚠️
| Fitur | Masalah | Saran Perbaikan |
|---|---|---|
| **QR Order di Meja** | Pembeli bisa order lewat QR tapi belum ada konfirmasi pesanan masuk ke KDS secara realtime jika jaringan lambat | Tambah indikator "Pesanan terkirim ✓" yang jelas dan fallback jika offline |
| **Split Bill** | Belum ada fitur bagi tagihan per orang di POS | Tambah: pilih item mana per orang, hitung masing-masing, proses pembayaran terpisah |
| **Manajemen Meja** | Layout meja bisa dikonfigurasi tapi tidak ada status "Dipesan" dari sistem booking | Sinkronkan reservasi meja dengan tampilan layout meja — meja yang dipesan tampil beda warna |

### Yang Belum Ada ❌
| # | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| R-01 | 🔥 **Reservasi Meja Publik** | KRITIS | Pembeli reservasi meja dari marketplace atau storefront toko. Pilih: tanggal, waktu, jumlah orang, permintaan khusus (ulang tahun, dll.). Auto-konfirmasi atau perlu approval toko |
| R-02 | 🔥 **Tag Alergen & Dietary** | TINGGI | Setiap menu item bisa diberi tag: Halal, Vegetarian, Vegan, Bebas Gluten, Bebas Laktosa, Pedas (1–5 bintang), Alergen (kacang, susu, seafood). Filter di halaman menu digital |
| R-03 | 🔥 **Waitlist / Antrian Virtual** | TINGGI | Pelanggan daftar antrian digital saat meja penuh. Terima notif WA/push saat meja tersedia. Kurangi pelanggan yang pergi tanpa menunggu |
| R-04 | 🔥 **Happy Hour / Harga Waktu** | TINGGI | Set harga atau diskon berbeda berdasarkan jam: "Kopi Rp 10.000 antara 14.00–17.00". Otomatis berlaku & berakhir |
| R-05 | **Pre-Order Catering** | TINGGI | Pembeli bisa pesan untuk tanggal & waktu tertentu di masa depan (katering, kue ulang tahun, box nasi). Toko dapat lead time untuk persiapan |
| R-06 | **Menu Paket / Combo Builder** | SEDANG | Pembeli bisa build their own combo: pilih menu utama + minuman + dessert → harga otomatis dihitung. Toko set kontennya |
| R-07 | **Informasi Nutrisi** | SEDANG | Merchant input kalori, protein, lemak, karbohidrat per porsi. Tampil di menu digital. Penting untuk niche health food |
| R-08 | **Rekap Penjualan per Menu** | SEDANG | Dashboard: menu mana yang paling banyak terjual hari ini, minggu ini, bulan ini — dengan grafik batang. Sudah ada tapi perlu lebih detail |
| R-09 | 💡 **Order Meja via QR tanpa App** | TINGGI | Tamu scan QR → langsung buka halaman menu di browser → order → bayar QRIS di tempat. Tidak perlu download app. Fully web-based |
| R-10 | 💡 **Kitchen Load Monitor** | SEDANG | Dashboard dapur: estimasi waktu tunggu berdasarkan queue pesanan aktif. "Estimasi siap: 15 menit". Tampil di KDS dan bisa di-share ke pembeli |

---

## BAGIAN 5: FITUR KHUSUS PER JENIS USAHA

### 5.1 Salon & Barbershop

| # | Fitur | Ada? | Prioritas |
|---|---|---|---|
| SB-01 | Booking layanan (potong rambut, warna, creambath, dll.) per slot waktu | ⚠️ Merchant-side only | 🔥 TINGGI |
| SB-02 | Pilih stylist/barber spesifik saat booking | ❌ | 🔥 TINGGI |
| SB-03 | Durasi layanan berbeda per jenis (potong 30 menit, warna 2 jam) | ⚠️ Dasar ada | TINGGI |
| SB-04 | Galeri hasil karya (before/after foto) | ❌ | 🔥 TINGGI |
| SB-05 | Membership / Paket Langganan (beli 10 potong bayar 8) | ❌ | SEDANG |
| SB-06 | Pengingat potong rambut (notif otomatis 4 minggu setelah kunjungan terakhir) | ❌ | SEDANG |
| SB-07 | Catatan pelanggan per kunjungan (riwayat warna, produk digunakan) | ❌ | SEDANG |
| SB-08 | Booking bisa reschedule mandiri oleh pelanggan | ❌ | TINGGI |
| SB-09 | Konfirmasi booking via WhatsApp otomatis | ❌ | 🔥 TINGGI |
| SB-10 | Pembayaran deposit online saat booking | ❌ | SEDANG |

### 5.2 Studio Foto & Fotografer

| # | Fitur | Ada? | Prioritas |
|---|---|---|---|
| SF-01 | Booking sesi foto (foto produk, foto wisuda, prewedding, dll.) | ⚠️ Merchant-side only | 🔥 KRITIS |
| SF-02 | Pilih paket sesi (Basic 1 jam, Standard 2 jam, Premium full day) | ❌ | 🔥 TINGGI |
| SF-03 | Pilih lokasi (studio indoor, outdoor, lokasi pilihan klien) | ❌ | TINGGI |
| SF-04 | Portofolio galeri hasil foto per fotografer/studio | ❌ | 🔥 TINGGI |
| SF-05 | Upload file hasil foto ke klien (link download Google Drive / Dropbox) | ❌ | TINGGI |
| SF-06 | Deposit wajib saat booking (misal 50% dari total) | ❌ | TINGGI |
| SF-07 | Contract/agreement digital saat booking | ❌ | SEDANG |
| SF-08 | Add-on saat booking (editing ekstra, album cetak, dll.) | ❌ | SEDANG |
| SF-09 | Kalender ketersediaan fotografer | ❌ | 🔥 TINGGI |
| SF-10 | Review dengan foto hasil karya (klien upload di ulasan) | ❌ | TINGGI |

### 5.3 Klinik & Jasa Kesehatan

| # | Fitur | Ada? | Prioritas |
|---|---|---|---|
| KL-01 | Booking konsultasi dokter/dokter gigi/terapis | ⚠️ Merchant-side only | 🔥 KRITIS |
| KL-02 | Anamnesis digital sebelum konsultasi (form isian kesehatan) | ❌ | SEDANG |
| KL-03 | Rekam medis sederhana per pasien (merchant-side) | ❌ | SEDANG |
| KL-04 | Nomor antrian digital + estimasi waktu tunggu | ❌ | TINGGI |
| KL-05 | Tagihan & resep digital | ❌ | SEDANG |
| KL-06 | Telemedicine / konsultasi video | ❌ | RENDAH |
| KL-07 | Reminder jadwal kontrol ulang | ❌ | SEDANG |

### 5.4 Fashion & Pakaian

| # | Fitur | Ada? | Prioritas |
|---|---|---|---|
| FA-01 | Tabel ukuran (size chart) per produk | ❌ | 🔥 TINGGI |
| FA-02 | Filter ukuran dan warna di halaman toko | ❌ | 🔥 TINGGI |
| FA-03 | Panduan ukuran interaktif ("Tinggi 165cm, berat 55kg → pilih M") | ❌ | SEDANG |
| FA-04 | Label "Pre-loved / Second" untuk produk bekas berkualitas | ❌ | SEDANG |
| FA-05 | Tampilkan model yang pakai produk (foto lookbook) | ❌ | SEDANG |
| FA-06 | Custom order (warna khusus, ukuran khusus, sablon nama) | ❌ | TINGGI |
| FA-07 | Notif "Ukuran kamu tersedia lagi" ketika stok restok | ❌ | TINGGI |

### 5.5 Kecantikan & Skincare

| # | Fitur | Ada? | Prioritas |
|---|---|---|---|
| BE-01 | Ingredient list lengkap per produk | ❌ | 🔥 TINGGI |
| BE-02 | Nomor izin BPOM & tanggal kedaluwarsa | ❌ | 🔥 TINGGI |
| BE-03 | Tag skin type: oily, dry, combination, sensitive | ❌ | TINGGI |
| BE-04 | Quiz rekomendasi produk berdasarkan jenis kulit | ❌ | SEDANG |
| BE-05 | Klaimverifikasi: "Dermatologically tested", "Hypoallergenic" | ❌ | SEDANG |
| BE-06 | Bundling skincare routine (serum + moisturizer + SPF) | ✅ Bundle ada | TINGGI |

### 5.6 Kerajinan & Produk Seni

| # | Fitur | Ada? | Prioritas |
|---|---|---|---|
| KR-01 | Mode custom order (spesifikasi warna, ukuran, motif) | ❌ | 🔥 TINGGI |
| KR-02 | Estimasi waktu produksi per produk | ❌ | TINGGI |
| KR-03 | Certificate of Authenticity (COA) digital untuk karya seni | ❌ | SEDANG |
| KR-04 | Edisi terbatas (limited edition) dengan counter stok terlihat | ❌ | SEDANG |
| KR-05 | Galeri proses pembuatan (work-in-progress photos) | ❌ | SEDANG |
| KR-06 | Opsi beli reseller / grosir dengan harga berbeda | ❌ | SEDANG |

### 5.7 Produk Digital (Template, Font, E-book, Kode)

| # | Fitur | Ada? | Prioritas |
|---|---|---|---|
| PD-01 | Auto-delivery file setelah pembayaran berhasil | ✅ | — |
| PD-02 | Lisensi produk digital (personal use vs. commercial use) | ❌ | TINGGI |
| PD-03 | Preview produk (watermarked sample sebelum beli) | ❌ | 🔥 TINGGI |
| PD-04 | Update produk: pembeli yang sudah beli otomatis dapat versi terbaru | ❌ | SEDANG |
| PD-05 | Limit download per lisensi (anti-sharing) | ❌ | SEDANG |
| PD-06 | Kode aktivasi / serial key untuk software | ❌ | SEDANG |

### 5.8 Jasa Umum (Desainer, Les Privat, Konsultan)

| # | Fitur | Ada? | Prioritas |
|---|---|---|---|
| JU-01 | Booking konsultasi per jam / per sesi | ⚠️ Merchant-side only | 🔥 KRITIS |
| JU-02 | Brief form sebelum sesi (isi kebutuhan klien) | ❌ | TINGGI |
| JU-03 | Milestone tracking untuk project jangka panjang | ❌ | SEDANG |
| JU-04 | Deliver hasil kerja via platform (upload file) | ❌ | TINGGI |
| JU-05 | Kontrak freelance digital yang bisa ditandatangani | ❌ | SEDANG |
| JU-06 | Escrow per milestone (bayar bertahap sesuai progress) | ❌ | SEDANG |

---

## BAGIAN 6: SISTEM BOOKING — ANALISIS MENDALAM

### Status Saat Ini
Sistem booking **sudah ada di sisi merchant** (`/pos-app/booking`):
- ✅ Buat slot layanan dengan tanggal, jam, durasi, kapasitas, harga
- ✅ Tambah booking manual oleh merchant
- ✅ Manajemen status booking (pending → confirmed → done)
- ✅ Tabel `booking_slots` dan `bookings` di Supabase
- ✅ Reservasi meja restoran (library `reservations.ts` + `types/stage4.ts`)

### Yang Masih Kurang (Gap Kritis)
**Pembeli tidak bisa booking sendiri.** Seluruh sistem booking saat ini hanya bisa diakses dari dashboard merchant. Tidak ada halaman publik untuk booking.

### Roadmap Sistem Booking Lengkap

#### Fase 1 — Halaman Booking Publik (KRITIS, ~2 hari kerja)
```
/toko/:slug/booking
  ├── Daftar layanan yang tersedia (nama, durasi, harga)
  ├── Pilih layanan
  ├── Pilih tanggal (kalender, tampilkan tanggal yang punya slot tersedia)
  ├── Pilih jam (tampilkan slot yang masih kosong)
  ├── Pilih staff (opsional — jika merchant punya beberapa stylist/fotografer)
  ├── Isi data: nama, nomor WA, catatan
  ├── Bayar deposit (opsional — merchant bisa set persentase deposit)
  └── Konfirmasi → terima notifikasi
```

#### Fase 2 — Manajemen Booking Lanjutan (TINGGI, ~3 hari kerja)
- Reschedule mandiri oleh pembeli (dengan batasan: minimal H-24 sebelum jadwal)
- Pembatalan mandiri (dengan kebijakan refund yang bisa dikonfigurasi merchant)
- Reminder otomatis H-3 dan H-1 sebelum jadwal (notif in-app + template WA)
- History booking di akun pembeli (`/akun/bookings`)
- Status real-time: Menunggu Konfirmasi → Dikonfirmasi → Selesai → Dibatalkan

#### Fase 3 — Booking Terintegrasi Penuh (SEDANG, ~5 hari kerja)
- **Kalender ketersediaan** yang sync otomatis antara Google Calendar dan booking platform
- **Deposit payment** terintegrasi dengan payment gateway (Midtrans/Xendit)
- **Paket & add-on**: pilih paket dasar → tambahkan layanan ekstra saat booking
- **Portofolio galeri** terintegrasi di halaman booking (lihat hasil kerja sebelum booking)
- **Review post-booking**: notif otomatis H+1 setelah layanan → minta rating

#### Konfigurasi Booking per Toko (Merchant Dashboard)
```
Pengaturan Booking:
├── Aktifkan sistem booking (toggle)
├── Kebijakan booking:
│   ├── Minimal berapa jam sebelumnya bisa booking (default: 2 jam)
│   ├── Maksimal berapa hari ke depan bisa booking (default: 30 hari)
│   ├── Deposit wajib? Berapa persen?
│   └── Kebijakan pembatalan (refund 100% jika batal H-3, 50% H-1, 0% H-0)
├── Jam operasional (hari & jam buka/tutup)
├── Kapasitas harian (total booking per hari)
└── Manajemen staff/resource (nama, spesialisasi, jam tersedia)
```

#### Tabel Database yang Dibutuhkan
```sql
-- Sudah ada (perlu diperluas):
booking_slots    -- slot waktu yang tersedia
bookings         -- reservasi yang dibuat

-- Perlu ditambahkan:
booking_services     -- daftar layanan yang bisa dipesan per toko
booking_staff        -- daftar staff/resource per toko
booking_settings     -- konfigurasi booking per toko
booking_addons       -- layanan tambahan yang bisa dipilih saat booking
booking_payments     -- catatan deposit yang dibayar
booking_reminders    -- log pengiriman reminder
```

---

## BAGIAN 7: MATRIKS PRIORITAS TINDAKAN

### 🔴 Bangun Sekarang (Dampak Besar, Effort Kecil)

| # | Fitur | Role | Estimasi |
|---|---|---|---|
| 1 | **Halaman Booking Publik** (`/toko/:slug/booking`) | Semua usaha jasa | 2 hari |
| 2 | **Tombol Share Produk** (WA/IG/copy link) | Pembeli | 2 jam |
| 3 | **Share Keranjang** (link unik) | Pembeli | 4 jam |
| 4 | **WhatsApp Notif Order** (template deep link) | Merchant | 2 jam |
| 5 | **Pesan sebagai Hadiah** (checkbox + pesan ucapan) | Pembeli | 3 jam |
| 6 | **Size Chart** di halaman produk fashion | Fashion | 2 jam |
| 7 | **Tag Alergen & Dietary** untuk F&B | Restoran | 3 jam |
| 8 | **Ingredient List & BPOM** untuk kecantikan | Beauty | 2 jam |
| 9 | **Histori Harga** grafik mini di produk | Pembeli | 4 jam |
| 10 | **Perbandingan Produk** (side-by-side) | Pembeli | 4 jam |

### 🟡 Kuartal Ini (Dampak Besar, Effort Sedang)

| # | Fitur | Role | Estimasi |
|---|---|---|---|
| 11 | **Pilih Staff saat Booking** | Jasa/Salon/Fotografer | 1 hari |
| 12 | **Portofolio Galeri Toko** | Jasa/Fotografer | 1 hari |
| 13 | **Reminder Booking Otomatis** (H-1/H-3) | Semua usaha jasa | 1 hari |
| 14 | **Reschedule & Batal Booking Mandiri** | Pembeli | 1 hari |
| 15 | **Return Self-Service** (upload foto) | Pembeli | 1 hari |
| 16 | **Upselling Engine** ("sering dibeli bersama") | Merchant | 1 hari |
| 17 | **Harga Grosir / Bulk Pricing** | Merchant | 1 hari |
| 18 | **Preview Produk Digital** (sample watermarked) | Produk Digital | 1 hari |
| 19 | **Happy Hour Pricing** untuk F&B | Restoran | 1 hari |
| 20 | **Waitlist / Antrian Virtual** | Restoran/Jasa | 1.5 hari |

### 🟢 Masa Depan (Dampak Besar, Effort Besar)

| # | Fitur | Estimasi |
|---|---|---|
| 21 | Subscription / Langganan Produk | 3 hari |
| 22 | Group Buy / Patungan | 3 hari |
| 23 | AI Generator Deskripsi Produk | 2 hari (jika pakai API AI) |
| 24 | Cashback Wallet | 3 hari |
| 25 | BNPL / Cicilan | 5 hari (integrasi pihak ketiga) |
| 26 | Live Streaming Commerce | 7+ hari |
| 27 | Katalog PDF Shareable | 2 hari |
| 28 | Merchant Onboarding Automation | 2 hari |
| 29 | Affiliate per Toko | 3 hari |
| 30 | Multi-Admin Super Admin | 2 hari |

---

## RINGKASAN EKSEKUTIF

Platform ini sudah sangat kuat dari sisi infrastruktur. **60–70% fitur inti sudah ada.** Gap terbesar bukan di fitur yang rumit, tapi di pengalaman pengguna yang lengkap:

1. **Sistem booking masih setengah jalan** — merchant bisa kelola, tapi pembeli tidak bisa self-serve. Ini gap paling kritis untuk semua usaha jasa.

2. **Viral loop belum ada** — tidak ada cara mudah untuk pembeli share produk, share keranjang, atau ajak teman beli bareng. Fitur ini hampir nol effort tapi dampaknya besar.

3. **Fitur per industri masih generik** — semua toko diperlakukan sama padahal kebutuhan restoran, salon, fotografer, dan toko fashion sangat berbeda. Perlu field & fitur spesifik per kategori bisnis.

4. **Kepercayaan pembeli perlu diperkuat** — histori harga, foto ulasan, BPOM/ingredient list, size chart adalah fitur kecil yang langsung naikkan konversi.

5. **Super Admin sudah lengkap** — gap utama hanya di otomasi (payout otomatis, onboarding sequence, health score per toko).
