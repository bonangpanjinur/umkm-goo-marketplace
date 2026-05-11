# Rencana Perbaikan Platform Marketplace
> **Dibuat:** 11 Mei 2026  
> **Berdasarkan:** Analisis mendalam kode (`artifacts/kopihub/`) + PRD v2.0  
> **Status legenda:** ✅ Selesai · 🟡 Ada tapi perlu disempurnakan · 🔴 Belum ada

---

## Cara Menggunakan Dokumen Ini

Dokumen ini adalah **acuan utama pengembangan**. Setiap sesi kerja:
1. Pilih item dari bagian yang paling prioritas
2. Tandai progres dengan mengubah status
3. Setelah selesai, pindah ke item berikutnya

Urutan prioritas global: **Kritis → Tinggi → Sedang → Rendah**

---

## BAGIAN 1 — SUPER ADMIN (Pemegang Platform)

### ✅ Sudah Jalan
- Dashboard KPI (total toko, MRR, tagihan pending, domain offline) — `/admin`
- Manajemen toko: list, search, filter, suspend/unsuspend, override paket, reset password owner — `/admin/shops`, `/admin/shops/$id`
- Review & approve tagihan sewa — `/admin/invoices`
- Review & approve penarikan dana — `/admin/withdrawals`
- Manajemen paket & Plan Matrix (entitlement per paket per fitur) — `/admin/plans`, `/admin/plans/$id/matrix`
- Katalog fitur & tema — `/admin/catalog`
- Manajemen domain kustom toko — `/admin/domains`
- Broadcast notifikasi ke semua toko — `/admin/broadcast`
- Audit log aktivitas — `/admin/audit`
- Pengaturan rekening bank & QRIS platform — `/admin/settings`
- Analitik marketplace (GMV, komisi, take rate, top shops, grafik harian) — `/admin/analytics`
- Manajemen sengketa/dispute — `/admin/disputes`
- Manajemen voucher platform lintas toko — `/admin/vouchers`

---

### 🔴 KRITIS — Harus Ada Sebelum Launch

#### A-1. KYC Review Queue (Antrian Verifikasi KTP)
**Kenapa penting:** Tanpa ini toko tidak bisa aktif. Saat ini tidak ada alur review KTP sama sekali.

**Yang perlu dibangun:**
- Halaman `/admin/kyc` — daftar antrian verifikasi dengan badge jumlah antrian di sidebar
- Split view: foto KTP zoomable di kiri, form keputusan (approve/reject + alasan) di kanan
- Riwayat keputusan per toko (siapa yang approve, kapan)
- Filter: pending · in_review · approved · rejected · expired
- Notifikasi ke owner saat approve/reject
- Badge status KYC di halaman list toko (`/admin/shops`)
- Kolom status KYC di detail toko (`/admin/shops/$id`)

**Database:** Kolom `kyc_status`, `kyc_document_url`, `kyc_reviewed_at`, `kyc_reviewer_id`, `kyc_reject_reason` di tabel `coffee_shops`

---

#### A-2. Konfigurasi Payment Gateway (Midtrans + Xendit)
**Kenapa penting:** Pembayaran online tidak bisa hidup tanpa ini.

**Yang perlu dibangun:**
- Halaman `/admin/platform` tab "Payment Gateway"
- Form Midtrans: Server Key, Client Key, mode Sandbox/Production, tombol "Test Koneksi"
- Form Xendit: API Key, Webhook Token, mode Test/Live, tombol "Test Koneksi"
- Secret key **disimpan terenkripsi** — field type password, tidak pernah ditampilkan kembali (hanya bisa diupdate)
- Toggle: gateway mana yang aktif untuk transaksi produk vs. pembayaran sewa
- Log terakhir webhook masuk (untuk debugging)

**Database:** Tabel `platform_settings` dengan kolom terenkripsi untuk credentials

---

#### A-3. Konfigurasi Komisi Platform
**Kenapa penting:** Revenue model utama platform tidak bisa jalan tanpa ini.

**Yang perlu dibangun:**
- Halaman `/admin/platform` tab "Komisi"
- Komisi global: persentase default semua transaksi
- Override per kategori bisnis (F&B 4%, Digital 8%, Fashion 5%, dll.)
- Override per paket (Gratis 10%, Starter 7%, Growth 5%, Pro 3%)
- Override per toko individual (exception list — form tambah toko + rate khusus)
- Tipe komisi: persentase, flat+persentase, minimal per transaksi
- Preview simulator: input harga → tampilkan berapa komisi masuk

---

#### A-4. Konfigurasi Nama & Branding Platform
**Kenapa penting:** Saat ini "KopiHub" hardcoded di mana-mana. Platform harus bisa dipakai untuk klien berbeda.

**Yang perlu dibangun:**
- Halaman `/admin/platform` tab "Branding"
- Field: nama platform, tagline, logo (upload), favicon, warna brand utama
- Semua halaman publik mengambil nama dari `platform_settings`, bukan hardcoded

---

### 🟡 Perlu Disempurnakan

#### A-5. Dashboard Admin — Tambah KPI Penting
**KPI yang belum ada:**
- Antrian KYC menunggu review (link ke `/admin/kyc`)
- Total escrow tertahan di platform
- GMV hari ini vs. kemarin (tren)
- Churn rate bulan ini (toko yang tidak perpanjang)
- Jumlah dispute aktif belum selesai
- Jumlah webhook payment yang gagal (error monitoring)

---

#### A-6. Manajemen Kategori Bisnis
**Saat ini:** Kategori bisnis tidak bisa dikelola dari admin UI, harus edit database langsung.

**Yang perlu dibangun:**
- Halaman `/admin/categories` — CRUD kategori bisnis
- Per kategori: nama, slug, ikon (upload), deskripsi, urutan tampil, status aktif/nonaktif
- Toggle fitur tambahan per kategori: aktifkan POS untuk F&B, aktifkan booking untuk Jasa, dll.
- Atribut produk default per kategori (BPOM untuk beauty, ISBN untuk buku, ukuran untuk fashion)
- Override komisi per kategori (sudah disebut di A-3)

---

#### A-7. Konfigurasi Penarikan Dana
**Yang perlu dibangun:**
- Halaman `/admin/platform` tab "Penarikan"
- Jadwal per paket: bulanan / dua kali per bulan / kapan saja
- Minimal penarikan per paket
- Biaya admin per jenis transfer (antar bank, sesama bank, ke dompet digital)
- Maksimal penarikan per hari
- Grace period sebelum toko dinonaktifkan karena telat bayar

---

#### A-8. Broadcast Tersegmen
**Saat ini:** Hanya bisa kirim ke semua toko.

**Yang perlu dibangun:**
- Filter segmen: per paket, per kategori bisnis, per kota, per status verifikasi
- Scheduler: kirim sekarang atau jadwalkan di tanggal/jam tertentu
- Preview pesan sebelum kirim
- Riwayat broadcast + open rate (jika pakai email)

---

#### A-9. Audit Log — Filter & Export
**Saat ini:** Tampilan daftar mentah tanpa filter.

**Yang perlu dibangun:**
- Filter: per tipe event, per toko, per admin, per rentang tanggal
- Search by toko/user
- Export CSV
- Highlight event penting (suspend toko, approve KYC, ubah komisi)

---

### 🔴 Sedang — Fase 2

| ID | Fitur | Catatan |
|---|---|---|
| A-10 | Impersonation — masuk sebagai owner (banner "Mode Support" + audit log otomatis) | Support tooling |
| A-11 | Marketplace Fee Simulator — input skenario → proyeksi pendapatan | Bantu pricing |
| A-12 | Feature Flag per toko/paket — aktifkan fitur beta untuk subset | Rollout bertahap |
| A-13 | Template notifikasi — edit subject & isi email, variabel dinamis | Komunikasi branded |
| A-14 | Rekonsiliasi gateway — cocokkan data platform vs. Midtrans/Xendit dashboard | Akuntansi |
| A-15 | Command Palette (⌘K) — cari toko, user, invoice, broadcast lintas modul | UX admin power user |

---

## BAGIAN 2 — OWNER / PEMILIK TOKO

### ✅ Sudah Jalan
- Dashboard toko — `/pos-app`
- Manajemen produk/menu (CRUD, gambar, kategori, flash sale kolom ada, stok) — `/pos-app/menu`
- Pesanan online (non-marketplace) — `/pos-app/online-orders`
- Pesanan marketplace (konfirmasi, proses, kirim, chat, dispute) — `/pos-app/marketplace-orders`
- Saldo & keuangan (tersedia, escrow, riwayat) — `/pos-app/keuangan`
- Request penarikan dana — `/pos-app/keuangan/tarik`
- Pembayaran sewa & upload bukti — `/pos-app/billing`
- Analitik marketplace (GMV, komisi, produk terlaris) — `/pos-app/marketplace-analytics`
- Pengaturan pengiriman (zona, flat/zone, pickup) — `/pos-app/delivery`
- Manajemen kurir internal — `/pos-app/couriers`
- Manajemen karyawan & undang staff — `/pos-app/employees`
- Loyalty & promo — `/pos-app/loyalty`, `/pos-app/promos`
- Ulasan pelanggan + balas — `/pos-app/reviews`
- Tampilan toko & pilih tema — `/pos-app/appearance`
- Pengaturan toko lengkap — `/pos-app/settings`
- Custom domain — `/pos-app/domain`
- Inventori & bahan baku (F&B) — `/pos-app/inventory`
- POS kasir — `/pos-app/pos`
- KDS dapur — `/pos-app/kds`
- Laporan keuangan & profit — `/pos-app/reports`, `/pos-app/reports/profit`
- Manajemen supplier — `/pos-app/suppliers`
- Purchase order — `/pos-app/purchase-orders`
- Absensi karyawan — `/pos-app/attendance`
- Shift kasir — `/pos-app/shifts`
- Manajemen meja & peta meja — `/pos-app/tables`, `/pos-app/table-maps`
- Resep & HPP — `/pos-app/recipes`

---

### 🔴 KRITIS — Harus Ada Sebelum Launch

#### O-1. Status Verifikasi KTP di Dashboard Owner
**Kenapa penting:** Owner tidak tahu apakah tokonya sudah aktif atau belum dan kenapa.

**Yang perlu dibangun:**
- Banner di dashboard owner: status KYC (pending/in_review/approved/rejected/expired)
- Jika pending/rejected: tampilkan instruksi upload + form upload ulang KTP
- Jika approved: tampilkan badge "Terverifikasi" + tanggal verifikasi
- Jika rejected: tampilkan alasan penolakan dari admin + tombol upload ulang
- Redirect otomatis ke halaman KYC jika toko belum terverifikasi dan mencoba akses fitur operasional

**Halaman baru:** `/pos-app/verifikasi` — manajemen dokumen KYC

---

#### O-2. Onboarding Wizard (5 Langkah)
**Kenapa penting:** Saat ini onboarding hanya form nama toko. Owner tidak tahu apa yang harus dilakukan selanjutnya — TTV sangat panjang.

**Langkah wizard:**
1. **Info Toko** — nama, slug, deskripsi, kategori bisnis (pilih dari daftar aktif), logo
2. **Verifikasi KTP** — upload foto KTP, selfie opsional, penjelasan prosesnya
3. **Pilih Paket** — tampilkan tabel perbandingan paket, pilih & buat invoice
4. **Produk Pertama** — tambah minimal 1 produk dengan gambar
5. **Pengiriman & Publish** — atur zona pengiriman dasar, aktifkan toko

**Penyimpanan progres:** Simpan step terakhir agar bisa dilanjutkan nanti.

---

#### O-3. Produk Varian (Ukuran, Warna, Kombinasi)
**Kenapa penting:** Toko fashion, craft, electronics tidak bisa berjualan tanpa varian. Ini blocker untuk semua kategori non-F&B.

**Yang perlu dibangun:**
- Form tambah/edit produk: toggle "Produk ini punya varian"
- Builder varian: tambah tipe varian (Ukuran: S/M/L/XL, Warna: Merah/Biru, dll.)
- Tabel kombinasi varian: per kombinasi bisa set harga & stok berbeda
- Gambar per varian (opsional)
- Di storefront: tampilkan picker varian sebelum "Tambah ke Keranjang"
- Di keranjang & checkout: tampilkan nama varian yang dipilih
- Di pesanan owner: tampilkan varian yang dipesan

**Database:** Tabel `product_variants`, `product_variant_options`, `product_variant_combinations`

---

#### O-4. Stok Terpadu Lintas Channel
**Kenapa penting:** Saat ini POS dan marketplace bisa menjual produk yang sama secara bersamaan tanpa sinkronisasi stok → risiko oversell.

**Yang perlu dibangun:**
- Stok single source of truth di `menu_items.stock_qty`
- Setiap pesanan POS & marketplace mengurangi stok yang sama
- Alert low stock otomatis (threshold bisa diset per produk)
- Indikator stok real-time di halaman produk owner: `POS terjual hari ini: 5 · Marketplace: 3 · Sisa: 12`
- Opsi "Nonaktifkan otomatis saat stok = 0"

---

### 🟡 Perlu Disempurnakan

#### O-5. Unified Orders Hub
**Saat ini:** 3 halaman terpisah untuk pesanan POS, online, dan marketplace.

**Yang perlu dibangun:**
- Halaman `/pos-app/orders-hub` dengan tab chip: `Semua · POS · Web · Marketplace`
- Filter status di semua tab sekaligus
- Badge counter realtime per tab
- Halaman existing tetap ada sebagai fallback, tapi Hub jadi landing default

---

#### O-6. Flash Sale — UI Lengkap
**Saat ini:** Kolom database ada (`flash_price`, `flash_starts_at`, `flash_ends_at`) tapi UI di halaman produk sangat minim.

**Yang perlu dibangun:**
- Di form edit produk: section "Flash Sale" dengan input harga flash, tanggal mulai, tanggal selesai
- Indikator produk mana yang sedang flash sale (badge di list produk)
- Countdown timer aktif (tampilkan berapa jam lagi)
- Di storefront: badge "Flash Sale" + countdown timer di kartu produk

---

#### O-7. Keuangan — Escrow Visual & Rekening Bank
**Saat ini:** Angka tersedia/pending tampil tapi tidak ada konteks visual.

**Yang perlu dibangun:**
- `SaldoCard` tiga segmen warna: Pending (abu) → Tersedia (hijau) → Ditarik (biru)
- Rincian per pesanan: berapa komisi dipotong, berapa masuk ke saldo
- Timeline penarikan: kapan request, kapan diproses, kapan cair
- **Halaman kelola rekening bank:** `/pos-app/rekening-bank` — daftar rekening, tambah, hapus, set default
- Verifikasi kepemilikan rekening (input OTP atau cross-check nama)

---

#### O-8. Storefront Live Preview
**Saat ini:** Owner bisa ganti tema tapi tidak bisa preview sebelum publish.

**Yang perlu dibangun:**
- Panel preview di kanan saat di `/pos-app/appearance`
- Iframe yang me-render storefront toko dalam mode preview
- Tombol "Lihat Toko" yang buka storefront di tab baru
- Preview responsif: toggle mobile/tablet/desktop

---

#### O-9. Penarikan Dana — Perbaikan Alur
**Yang perlu dibangun:**
- Pilih rekening bank dari daftar tersimpan (bukan input manual tiap kali)
- Tampilkan: jumlah tersedia, estimasi yang diterima setelah biaya admin, jadwal pencairan sesuai paket
- Konfirmasi 2 langkah sebelum submit request
- Notifikasi in-app saat status penarikan berubah

---

#### O-10. Notifikasi In-App Inbox
**Saat ini:** Hanya browser push notification, tidak ada riwayat.

**Yang perlu dibangun:**
- Bell icon di header dengan badge counter unread
- Drawer/panel notifikasi dengan riwayat (pesanan baru, stok menipis, penarikan disetujui, ulasan baru, tagihan jatuh tempo)
- Filter per kategori notifikasi
- Tandai semua sudah dibaca

---

#### O-11. Laporan — Generalisasi per Kategori
**Saat ini:** Laporan sangat F&B-centric (HPP, resep).

**Yang perlu dibangun:**
- Laporan penjualan umum: per produk, per periode, per kategori produk
- Laporan pelanggan: pelanggan baru vs. returning, nilai rata-rata per pelanggan
- Export CSV/Excel semua laporan
- Laporan pajak sederhana: total pendapatan kotor per periode

---

### 🔴 Sedang — Fase 2

| ID | Fitur | Kategori Target | Prioritas |
|---|---|---|---|
| O-12 | Produk digital — upload file, link download otomatis setelah bayar | Digital | Sedang |
| O-13 | Bulk import CSV produk — template download, validasi, import massal | Semua | Sedang |
| O-14 | Kalender promo — tampilan kalender kapan promo & flash sale aktif | Semua | Sedang |
| O-15 | Invoice PDF — unduh invoice pesanan & tagihan sewa | Semua | Sedang |
| O-16 | Atribut produk per kategori — BPOM (beauty), ISBN (buku), garansi (elektronik), ukuran (fashion) | Per kategori | Sedang |
| O-17 | Booking jadwal (untuk kategori Jasa) — kalender slot, konfirmasi, reminder | Jasa | Sedang |
| O-18 | Wishlist — owner lihat produk mana yang paling banyak disimpan pembeli | Semua | Rendah |
| O-19 | Storefront builder — susun section halaman toko (banner, featured produk, teks promo) | Semua | Rendah |
| O-20 | Custom CSS editor (paket Pro) | Pro | Rendah |
| O-21 | Multi-outlet switcher — kelola beberapa cabang dalam 1 akun | Enterprise/Pro | Rendah |
| O-22 | Email marketing — kirim promo ke daftar pelanggan toko | Pro | Rendah |
| O-23 | Integrasi API kurir RajaOngkir — ongkir real-time, cek coverage | Growth/Pro | Rendah |
| O-24 | Label pengiriman — generate label siap cetak dari dashboard | Semua | Rendah |

---

## BAGIAN 3 — PEMBELI (Customer / End User)

### ✅ Sudah Jalan
- Halaman utama marketplace (kategori, toko unggulan, produk) — `/`
- Halaman kategori produk — `/kategori/$slug`
- Storefront per toko multi-tema — `/s/$slug`
- Detail produk — `/toko/$slug/produk/$productId`
- Keranjang belanja multi-toko — `/keranjang`
- Checkout (alamat, zona pengiriman, voucher toko & platform) — `/checkout`
- Halaman sukses setelah order — `/checkout/sukses/$orderId`
- Tracking pesanan real-time — `/track/$orderId`
- Riwayat pesanan & detail — `/akun/pesanan`, `/pesanan/$orderId`
- Profil pembeli (nama, nomor WA, email) — `/akun`
- Manajemen alamat — `/akun/alamat`
- Pencarian produk & toko dengan filter dasar — `/search`
- Promo & voucher — `/promo`
- Review & rating produk dengan foto — via dialog
- Dispute/sengketa — via dialog

---

### 🔴 KRITIS — Harus Ada Sebelum Launch

#### B-1. Payment Gateway Online (Midtrans / Xendit)
**Kenapa penting:** Saat ini checkout hanya bisa transfer manual. Pembeli modern tidak mau repot transfer dan upload bukti.

**Yang perlu dibangun:**
- Integrasi Midtrans: VA BCA/BNI/Mandiri/BRI, QRIS, GoPay, kartu kredit
- Integrasi Xendit: VA CIMB, OVO, Dana, ShopeePay, disbursement
- Di halaman checkout: pilih metode bayar → redirect ke halaman Midtrans/Xendit atau tampilkan instruksi VA
- Webhook handler: terima konfirmasi bayar → update status order otomatis
- Halaman tunggu pembayaran dengan countdown timer
- Notifikasi "Pembayaran berhasil" setelah webhook diterima

---

#### B-2. Alamat Tersimpan di Checkout
**Kenapa penting:** Pembeli harus isi ulang alamat setiap checkout — sangat melelahkan.

**Yang perlu dibangun:**
- Di checkout: tampilkan daftar alamat tersimpan dari `/akun/alamat` (pilih atau tambah baru)
- Auto-fill dari alamat default
- Simpan alamat baru saat checkout dengan checkbox "Simpan alamat ini"

---

#### B-3. Auto-cancel & Reminder Bayar
**Kenapa penting:** Order yang tidak dibayar menggantung dan memblokir stok.

**Yang perlu dibangun:**
- Countdown timer di halaman pesanan: "Bayar sebelum XX:XX atau pesanan dibatalkan"
- Notifikasi H-1 jam sebelum deadline bayar
- Otomatis batalkan pesanan + kembalikan stok jika lewat deadline
- Konfigurasi deadline di admin (default: 24 jam)

---

### 🟡 Perlu Disempurnakan

#### B-4. Halaman Utama Marketplace — Lebih "Hidup"
**Saat ini:** Statis, tidak ada konten dinamis yang menarik.

**Yang perlu dibangun:**
- Section flash sale aktif dengan countdown timer
- Section "Produk Terlaris Minggu Ini" (dynamic dari data order)
- Section "Toko Baru Bergabung" (toko diverifikasi dalam 30 hari terakhir)
- Banner promosi hero yang bisa dikonfigurasi admin (upload gambar, atur link, jadwal)
- Section rekomendasi "Berdasarkan riwayat belanja kamu" (setelah login)
- Infinite scroll atau "Muat lebih banyak" di produk

---

#### B-5. Pencarian — Lebih Canggih
**Saat ini:** Ada filter kategori, harga, sort. Belum ada filter lokasi dan pencarian tidak cerdas.

**Yang perlu dibangun:**
- Filter lokasi (kota/provinsi) — dari data alamat toko
- Filter rating minimum (1–5 bintang)
- Filter "Hanya toko terverifikasi" (badge KYC approved)
- Filter metode pengiriman (COD, same-day, digital)
- Filter ketersediaan stok ("Hanya yang tersedia")
- Autocomplete/suggestions saat mengetik di search bar
- Highlight kata yang cocok di hasil pencarian
- "Tidak ditemukan? Lihat produk serupa"

---

#### B-6. Alur Review Lebih Jelas
**Saat ini:** Review bisa dilakukan tapi tidak ada trigger yang obvious setelah pesanan selesai.

**Yang perlu dibangun:**
- Di halaman pesanan yang sudah selesai: banner "Yuk kasih ulasan untuk pesanan ini!" dengan tombol jelas
- Notifikasi in-app setelah pesanan selesai: "Pesananmu sudah sampai! Kasih ulasan untuk [Nama Toko]"
- Rating bintang visible di halaman detail produk storefront (tampilkan rata-rata + jumlah ulasan)
- Tampilan ulasan dengan foto di halaman detail produk (pagination)
- Filter ulasan: semua, bintang 5, bintang 4, ada foto saja

---

#### B-7. Tracking Pesanan — Lebih Lengkap
**Saat ini:** Timeline status ada, tapi belum ada link ke kurir dan ETA.

**Yang perlu dibangun:**
- Nomor resi dengan link langsung ke website kurir (JNE, JNT, SiCepat, dll.)
- ETA dinamis: "Estimasi tiba: 2–3 hari kerja"
- Tombol "Konfirmasi Sudah Terima" yang jelas di halaman tracking
- Timeline event lebih detail: jam berapa setiap status berubah

---

#### B-8. Akun Pembeli — Lebih Lengkap
**Saat ini:** Hanya profil, alamat, pesanan, notifikasi.

**Yang perlu dibangun:**
- Poin loyalty (jika toko punya program poin) — tampilkan di profil
- Riwayat produk yang pernah dilihat ("Baru kamu lihat")
- Daftar toko yang diikuti (follow toko)
- Wishlist produk (simpan produk favorit)
- Tombol "Beli Lagi" di riwayat pesanan (tambah ke keranjang langsung)

---

#### B-9. Notifikasi Pembeli — In-App + Push
**Saat ini:** Tidak ada notifikasi in-app yang terstruktur untuk pembeli.

**Yang perlu dibangun:**
- Bell icon di header marketplace dengan badge unread
- Drawer notifikasi: status pesanan, promo dari toko diikuti, voucher baru, ulasan dibalas toko
- Push notification browser (PWA) untuk: pesanan diproses, pesanan dikirim, pesanan sampai
- Email notifikasi untuk: konfirmasi order, pesanan dikirim (dengan nomor resi)

---

#### B-10. Pengalaman Mobile — Bottom Nav
**Saat ini:** Tidak ada navigasi bottom bar di mobile (pembeli harus scroll ke atas untuk navigasi).

**Yang perlu dibangun:**
- Bottom navigation bar 5 ikon di mobile (<768px): Home · Cari · Keranjang · Pesanan · Akun
- Badge counter di ikon Keranjang (jumlah item) dan Pesanan (pesanan aktif)
- Sticky CTA "Tambah ke Keranjang" di halaman detail produk (fixed di bottom mobile)
- Checkout mobile: accordion single page (bukan scroll panjang)

---

### 🔴 Sedang — Fase 2

| ID | Fitur | Prioritas |
|---|---|---|
| B-11 | Wishlist / simpan produk — sinkron lintas device | Sedang |
| B-12 | Follow toko + feed update toko yang diikuti | Sedang |
| B-13 | Riwayat lihat produk ("Baru kamu lihat") — retensi | Sedang |
| B-14 | Produk digital — halaman download setelah bayar | Sedang |
| B-15 | Login sebagai tamu (guest checkout) — tanpa perlu daftar | Sedang |
| B-16 | Share produk ke media sosial (link + preview) | Rendah |
| B-17 | Referral program pembeli — dapat voucher saat ajak teman | Rendah |
| B-18 | Poin loyalty lintas platform (bukan per toko) | Rendah |
| B-19 | Chat dengan toko per pesanan (in-app) | Rendah |
| B-20 | Map toko (untuk yang punya pickup point) | Rendah |

---

## BAGIAN 4 — LINTAS ROLE (Integrasi Kritis)

Ini adalah fitur yang mempengaruhi ≥2 role sekaligus — **tanpa ini marketplace tidak terasa terintegrasi**.

### 4.1 Order Timeline Tunggal
**Siapa terpengaruh:** Pembeli · Owner · Staff · Super Admin

Semua role melihat event yang sama pada satu pesanan:
- Pembeli: tampilan timeline sederhana di `/track/$orderId`
- Owner: tampilan operasional di marketplace-orders
- Admin: bisa lihat timeline saat ada dispute

**Komponen yang perlu dibuat:** `<StatusTimeline>` — vertikal di mobile, horizontal di desktop

### 4.2 Inbox Notifikasi Terpadu
**Siapa terpengaruh:** Semua role

- Setiap role punya bell icon dengan drawer notifikasi
- Notifikasi difilter per role secara otomatis (owner dapat notif pesanan, pembeli dapat notif status, admin dapat alert KYC)
- Realtime via Supabase channel subscriptions
- Tersimpan di database (bukan hanya browser push)

**Komponen yang perlu dibuat:** `<NotificationBell>` + `<NotificationDrawer>` (sudah ada skeleton, perlu dilengkapi)

### 4.3 Stok Single Source of Truth
**Siapa terpengaruh:** Owner · Kasir POS · Pembeli

- POS kasir, pesanan online, dan pesanan marketplace mengurangi stok dari sumber yang sama
- Pembeli tidak bisa melihat/memesan produk yang sudah habis
- Alert otomatis ke owner saat stok di bawah threshold

### 4.4 Identitas & Verifikasi Terlihat di Publik
**Siapa terpengaruh:** Pembeli · Owner · Admin

- Badge "Terverifikasi" di halaman toko publik (jika KYC approved)
- Level badge: Basic (KTP), Verified Plus (+NPWP), Trusted Merchant (+sertifikasi)
- Filter "Toko Terverifikasi" di search dan kategori
- Admin bisa lihat status KYC di list toko

### 4.5 Saldo & Escrow Transparan
**Siapa terpengaruh:** Pembeli · Owner · Admin

- Pembeli lihat status refund real-time di halaman pesanan
- Owner lihat dana pending → tersedia → ditarik dengan visual jelas
- Admin lihat ledger escrow total platform

---

## BAGIAN 5 — URUTAN IMPLEMENTASI (Sprint Plan)

### Sprint 1 — Fondasi Bisnis (Paling Mendesak)
Tanpa sprint ini platform **tidak bisa launch**.

| Prioritas | Item | Role |
|---|---|---|
| 1 | A-1: KYC Review Queue + alur upload KTP owner (O-1) | Admin + Owner |
| 2 | A-2: Konfigurasi Payment Gateway (Midtrans + Xendit) | Admin |
| 3 | B-1: Integrasi payment di checkout pembeli + webhook | Pembeli |
| 4 | O-3: Produk varian (blocker untuk non-F&B) | Owner |
| 5 | A-4: Branding platform tidak hardcoded | Admin |

### Sprint 2 — Pengalaman Inti
Membuat pengalaman terasa lengkap dan profesional.

| Prioritas | Item | Role |
|---|---|---|
| 6 | O-2: Onboarding wizard 5 langkah | Owner |
| 7 | O-4: Stok terpadu lintas channel | Owner + Pembeli |
| 8 | B-2: Alamat tersimpan di checkout | Pembeli |
| 9 | B-3: Auto-cancel & reminder bayar | Pembeli + Owner |
| 10 | A-3: Konfigurasi komisi platform | Admin |

### Sprint 3 — Kualitas & Retensi
Membuat pengguna betah dan kembali lagi.

| Prioritas | Item | Role |
|---|---|---|
| 11 | 4.2: Inbox notifikasi terpadu semua role | Semua |
| 12 | O-5: Unified Orders Hub | Owner |
| 13 | B-4: Halaman utama marketplace lebih hidup | Pembeli |
| 14 | B-6: Alur review lebih jelas | Pembeli |
| 15 | B-10: Bottom nav mobile untuk pembeli | Pembeli |
| 16 | O-7: Escrow visual + kelola rekening bank | Owner |
| 17 | A-5: Dashboard admin — KPI lengkap | Admin |

### Sprint 4 — Kelengkapan Fitur
Fitur-fitur yang meningkatkan nilai platform secara signifikan.

| Prioritas | Item | Role |
|---|---|---|
| 18 | A-6: Manajemen kategori bisnis | Admin |
| 19 | A-7: Konfigurasi penarikan dana | Admin |
| 20 | A-8: Broadcast tersegmen | Admin |
| 21 | O-6: Flash sale UI lengkap + countdown | Owner + Pembeli |
| 22 | B-5: Search lebih canggih (filter lokasi, rating, KYC) | Pembeli |
| 23 | O-8: Storefront live preview | Owner |
| 24 | O-11: Laporan generalisasi per kategori | Owner |
| 25 | B-7: Tracking pesanan lebih lengkap | Pembeli |
| 26 | 4.4: Badge verifikasi di storefront publik | Pembeli + Admin |

### Sprint 5 — Fase 2 & Ekspansi Kategori
Fitur yang membuka kategori bisnis lebih luas.

| Item |
|---|
| O-12: Produk digital (upload file, auto-deliver) |
| O-16: Atribut produk per kategori (BPOM, ISBN, garansi) |
| O-17: Booking jadwal untuk kategori Jasa |
| O-13: Bulk import CSV produk |
| B-11: Wishlist produk |
| B-12: Follow toko |
| A-10: Impersonation untuk support |
| O-23: Integrasi API kurir RajaOngkir |

---

## BAGIAN 6 — CATATAN TEKNIS

### Perubahan Database yang Dibutuhkan
```
coffee_shops:
  + kyc_status ENUM (pending, in_review, approved, rejected, expired)
  + kyc_document_url TEXT
  + kyc_reviewed_at TIMESTAMPTZ
  + kyc_reviewer_id UUID FK profiles
  + kyc_reject_reason TEXT
  + kyc_selfie_url TEXT (opsional)
  + business_category_id UUID FK business_categories (sudah ada tapi perlu diaktifkan)
  + verification_level TEXT (basic, verified_plus, trusted)

platform_settings:
  + platform_name TEXT
  + platform_logo_url TEXT
  + platform_tagline TEXT
  + brand_color TEXT
  + midtrans_server_key_enc TEXT (terenkripsi)
  + midtrans_client_key_enc TEXT
  + midtrans_mode TEXT (sandbox/production)
  + xendit_api_key_enc TEXT (terenkripsi)
  + xendit_webhook_token_enc TEXT
  + xendit_mode TEXT (test/live)
  + commission_global_pct NUMERIC
  + withdrawal_grace_period_days INT
  + auto_cancel_hours INT

shop_bank_accounts:
  + id UUID PK
  + shop_id UUID FK
  + bank_name TEXT
  + account_no TEXT (masked display)
  + account_name TEXT
  + is_default BOOLEAN
  + created_at TIMESTAMPTZ

product_variants:
  + id UUID PK
  + product_id UUID FK menu_items
  + name TEXT (e.g., "Ukuran", "Warna")
  + sort_order INT

product_variant_options:
  + id UUID PK
  + variant_id UUID FK product_variants
  + value TEXT (e.g., "S", "M", "L", "Merah")
  + sort_order INT

product_variant_combinations:
  + id UUID PK
  + product_id UUID FK
  + options JSONB (option IDs)
  + price NUMERIC
  + stock_qty INT
  + sku TEXT
  + image_url TEXT

customer_wishlists:
  + id UUID PK
  + user_id UUID FK
  + menu_item_id UUID FK
  + created_at TIMESTAMPTZ

shop_followers:
  + id UUID PK
  + user_id UUID FK
  + shop_id UUID FK
  + created_at TIMESTAMPTZ

notification_inbox:
  + id UUID PK
  + user_id UUID FK
  + role TEXT (super_admin, owner, customer)
  + type TEXT
  + title TEXT
  + body TEXT
  + link TEXT
  + is_read BOOLEAN
  + created_at TIMESTAMPTZ

business_categories:
  (sudah ada tapi perlu kolom tambahan)
  + extra_features JSONB (toggle fitur per kategori)
  + product_attributes JSONB (atribut khusus kategori)
  + commission_override_pct NUMERIC
```

### Komponen UI Baru yang Dibutuhkan
```
<StatusTimeline />      — order timeline vertikal/horizontal
<NotificationBell />    — bell dengan badge (sudah ada skeleton)
<NotificationDrawer />  — drawer riwayat notifikasi
<SaldoCard />           — 3 segmen: pending, tersedia, ditarik
<MobileBottomNav />     — bottom nav 5 ikon untuk pembeli
<VariantPicker />       — picker varian di storefront
<VariantBuilder />      — builder varian di dashboard owner
<KycUploader />         — upload KTP dengan preview & validasi
<FlashSaleForm />       — form flash sale inline di edit produk
<CountdownTimer />      — countdown waktu flash sale / deadline bayar
<CommandPalette />      — ⌘K search lintas modul (admin & owner)
```

### API Endpoint Baru yang Dibutuhkan
```
POST /api/kyc/upload          — upload dokumen KYC
POST /api/kyc/review          — admin approve/reject KYC
GET  /api/platform/settings   — baca konfigurasi platform
POST /api/platform/settings   — update konfigurasi platform
POST /api/payments/midtrans   — buat transaksi Midtrans
POST /api/payments/xendit     — buat transaksi Xendit
POST /api/webhooks/midtrans   — terima webhook Midtrans
POST /api/webhooks/xendit     — terima webhook Xendit
POST /api/orders/:id/cancel   — batalkan pesanan + kembalikan stok
GET  /api/notifications       — daftar notifikasi per user
POST /api/notifications/read  — tandai notifikasi dibaca
```

---

## BAGIAN 7 — CHECKLIST STATUS UPDATE

> Perbarui tabel ini setiap selesai mengerjakan sebuah fitur.

| ID | Fitur | Status | Selesai |
|---|---|---|---|
| A-1 | KYC Review Queue | 🔴 Belum | — |
| A-2 | Konfigurasi Payment Gateway | 🔴 Belum | — |
| A-3 | Konfigurasi Komisi | 🔴 Belum | — |
| A-4 | Branding Platform Dinamis | 🔴 Belum | — |
| A-5 | Dashboard Admin KPI Lengkap | 🟡 Sebagian | — |
| A-6 | Manajemen Kategori Bisnis | 🟡 Sebagian | — |
| A-7 | Konfigurasi Penarikan Dana | 🔴 Belum | — |
| A-8 | Broadcast Tersegmen | 🟡 Sebagian | — |
| A-9 | Audit Log Filter & Export | 🟡 Sebagian | — |
| A-10 | Impersonation Admin | 🔴 Belum | — |
| O-1 | Status KYC di Dashboard Owner | 🔴 Belum | — |
| O-2 | Onboarding Wizard 5 Langkah | 🔴 Belum | — |
| O-3 | Produk Varian | 🔴 Belum | — |
| O-4 | Stok Terpadu Lintas Channel | 🟡 Sebagian | — |
| O-5 | Unified Orders Hub | 🟡 Sebagian | — |
| O-6 | Flash Sale UI Lengkap | 🟡 Sebagian | — |
| O-7 | Escrow Visual + Rekening Bank | 🟡 Sebagian | — |
| O-8 | Storefront Live Preview | 🔴 Belum | — |
| O-9 | Penarikan Dana Alur Baru | 🟡 Sebagian | — |
| O-10 | Notifikasi In-App Inbox | 🟡 Sebagian | — |
| O-11 | Laporan Generalisasi | 🟡 Sebagian | — |
| O-12 | Produk Digital | 🔴 Belum | — |
| O-13 | Bulk Import CSV | 🔴 Belum | — |
| O-16 | Atribut Produk per Kategori | 🔴 Belum | — |
| O-17 | Booking Jadwal (Jasa) | 🔴 Belum | — |
| B-1 | Payment Gateway di Checkout | 🔴 Belum | — |
| B-2 | Alamat Tersimpan di Checkout | 🟡 Sebagian | — |
| B-3 | Auto-cancel & Reminder Bayar | 🔴 Belum | — |
| B-4 | Marketplace Home Lebih Hidup | 🟡 Sebagian | — |
| B-5 | Search Lebih Canggih | 🟡 Sebagian | — |
| B-6 | Alur Review Lebih Jelas | 🟡 Sebagian | — |
| B-7 | Tracking Lebih Lengkap | 🟡 Sebagian | — |
| B-8 | Akun Pembeli Lebih Lengkap | 🟡 Sebagian | — |
| B-9 | Notifikasi Pembeli In-App | 🔴 Belum | — |
| B-10 | Bottom Nav Mobile | 🔴 Belum | — |
| B-11 | Wishlist Produk | 🔴 Belum | — |
| B-12 | Follow Toko | 🔴 Belum | — |
| 4.1 | Order Timeline Tunggal | 🟡 Sebagian | — |
| 4.2 | Inbox Notifikasi Terpadu | 🟡 Sebagian | — |
| 4.3 | Stok Single Source of Truth | 🟡 Sebagian | — |
| 4.4 | Badge Verifikasi di Publik | 🔴 Belum | — |
| 4.5 | Escrow Transparan Lintas Role | 🟡 Sebagian | — |

---

*Dokumen ini adalah living document — perbarui status setiap selesai sprint.*
