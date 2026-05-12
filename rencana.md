# UMKMgo — Rencana Pengembangan Fitur

> **Update terakhir:** 12 Mei 2026  
> **Status legenda:** ✅ Selesai · 🔄 Sedang dikerjakan · 🔲 Antri

---

## Log Progress

| Tanggal | Fase | Fitur | Status |
|---|---|---|---|
| 11 Mei 2026 | Migrasi | Migrasi Vercel → Replit, semua routes aktif, Supabase terhubung | ✅ |
| 11 Mei 2026 | Sprint 1 | KYC Admin & Owner, Onboarding Wizard, Varian Produk, Payment Config, Komisi, Branding | ✅ |
| 11 Mei 2026 | Sprint 1 | Bottom Nav Mobile, Wishlist, Follow Toko, Badge Verifikasi, Notifikasi In-App | ✅ |
| 11 Mei 2026 | Sprint 2 | Payment Gateway (Midtrans + Xendit), Stok Terpadu, Auto-cancel, Storefront Preview | ✅ |
| 11 Mei 2026 | Sprint 2 | Produk Digital, Atribut Produk, Booking Jadwal, Tracking Pesanan, Kalender Promo | ✅ |
| 11 Mei 2026 | Sprint 2 | Invoice PDF, Fee Simulator, Feature Flags, Template Notif, Rekonsiliasi, Command Palette | ✅ |
| 11 Mei 2026 | Sprint 2 | Riwayat Lihat Produk, Download Digital, Guest Checkout, Impersonation Admin | ✅ |
| 12 Mei 2026 | **Fase 1** | **Panggil Pelayan** — tombol floating di halaman order meja, broadcast real-time ke KDS | ✅ |
| 12 Mei 2026 | **Fase 1** | **Notifikasi KDS** — panel panggilan meja di KDS, suara alert, dismiss per meja | ✅ |
| 12 Mei 2026 | **Fase 1** | **Toast real-time** — notifikasi panggilan meja muncul di seluruh pos-app layout | ✅ |
| 12 Mei 2026 | **Fase 1** | **Re-order 1-tap** — pesan ulang menu yang sama setelah checkout, 1 klik | ✅ |
| 12 Mei 2026 | **Fase 1** | **Estimasi Waktu Siap** — perkiraan waktu berdasarkan jumlah pesanan di antrian dapur | ✅ |
| 12 Mei 2026 | **Fase 2** | **Tier Membership** — Bronze/Silver/Gold/Platinum berdasarkan lifetime earned; badge + progress bar; real data Supabase | ✅ |
| 12 Mei 2026 | **Fase 2** | **Voucher Ulang Tahun** — birthday field di profil customer; owner aktifkan voucher + nominal; panel birthday hari ini di owner dashboard | ✅ |
| 12 Mei 2026 | **Fase 2** | **Notif Poin Kadaluarsa** — owner set expire days di loyalty settings; customer lihat warning banner saat poin mendekati kadaluarsa | ✅ |
| 12 Mei 2026 | **Fase 2** | **Kode Referral Unik** — kode deterministik per user (UMK+8char); salin kode / bagikan link; riwayat referral dengan status & reward | ✅ |
| 12 Mei 2026 | **Fase 2** | **Pesanan Favorit** — tandai pesanan selesai sebagai favorit; beri nama custom; Pesan Lagi 1-tap pre-fill keranjang + navigate ke toko | ✅ |
| 12 Mei 2026 | **Fase 3** | **Stok turun otomatis** — Supabase trigger `fn_deduct_stock_on_order`: kurangi ingredients per resep saat order completed/confirmed; log stock_movements tipe 'sale' | ✅ |
| 12 Mei 2026 | **Fase 3** | **Notifikasi stok kritis** — badge merah animasi di nav Inventori + toast error/warning real-time saat bahan ≤ min_stock atau habis | ✅ |
| 12 Mei 2026 | **Fase 3** | **Auto non-aktif menu** — trigger DB nonaktifkan menu (is_available=false) otomatis jika ingredient habis + notifikasi danger ke owner | ✅ |
| 12 Mei 2026 | **Fase 3** | **Bundle Produk / Paket** — buat paket multi-produk dengan harga spesial; trigger DB expand bundle ke komponen dan deduct stok tiap bahan sekaligus; badge PAKET di POS grid | ✅ |
| 12 Mei 2026 | **Fase 4** | **Notifikasi Promo** — follower toko dapat notif saat promo/flash-sale baru; trigger DB fan-out ke semua followers | ✅ |
| 12 Mei 2026 | **Fase 4** | **Live Chat Sebelum Beli** — chat real-time antara pembeli dan owner; inbox panel di pos-app; halaman `/toko/$slug/chat` untuk pembeli | ✅ |
| 12 Mei 2026 | **Fase 4** | **Pesanan Berulang 1-tap** — "Pesan Lagi" di riwayat pesanan marketplace & pesanan favorit; pre-fill keranjang otomatis | ✅ |
| 12 Mei 2026 | **Fase 4** | **Estimasi Waktu Pengiriman** — komponen DeliveryEstimate di halaman produk/keranjang; berdasarkan min/max ETA dari zona pengiriman | ✅ |
| 12 Mei 2026 | **Fase 4** | **Q&A Produk + FAQ Pin** — pembeli tanya di halaman produk; owner jawab di `/pos-app/qa`; pin FAQ ke atas; tab FAQ di dashboard | ✅ |
| 12 Mei 2026 | **Fase 4** | **Foto di Ulasan** — upload foto saat tulis ulasan via MarketplaceReviewDialog; insentif +5 poin | ✅ |
| 12 Mei 2026 | **Fase 5** | **Auto-reply di luar jam buka** — toggle + custom message di Pengaturan; banner auto-reply aktif di Online Orders saat toko tutup | ✅ |
| 12 Mei 2026 | **Fase 5** | **Flash Sale Terjadwal** — set starts_at + ends_at per produk; badge LIVE/DIJADWAL/BERAKHIR; trigger notif ke followers | ✅ |
| 12 Mei 2026 | **Fase 5** | **Laporan Harian via WhatsApp** — halaman `/pos-app/laporan-harian`; omset, grafik per jam, top menu, stok kritis; tombol Bagikan via WhatsApp | ✅ |
| 12 Mei 2026 | **Fase 5** | **Auto Print Struk** — toggle per-perangkat di Pengaturan (localStorage); window.print() otomatis saat order online baru masuk via realtime | ✅ |
| 12 Mei 2026 | **Fase 5** | **Split Bill per Orang** — SplitBillDialog di KDS; pilih 2–20 orang; hitung per orang; salin teks untuk dikirim ke customer | ✅ |
| 12 Mei 2026 | **Fase 7** | **Manajemen Pengguna Pembeli** — Tabel semua buyer; cari by email/nama; filter aktif/diblokir; lihat riwayat pesanan per user; ban/unban dengan alasan | ✅ |
| 12 Mei 2026 | **Fase 7** | **Moderasi Konten Terpusat** — Panel ulasan ter-flag; isi+alasan flag+info toko+pembeli; aksi Setujui (hapus flag) atau Sembunyikan permanen | ✅ |
| 12 Mei 2026 | **Fase 7** | **Revenue Intelligence Dashboard** — KPI platform terpadu: subscription+komisi+fee breakdown; area chart tren harian; pie komposisi; top 10 toko per komisi; export CSV | ✅ |
| 12 Mei 2026 | **Fase 7** | **Churn & Retensi Toko** — 4 tab: Akan Expired (Pro ≤30 hari), Sudah Churn, GMV Turun >40%, Tidak Aktif >14 hari; quick action kirim notif renewal | ✅ |
| 12 Mei 2026 | **Fase 7** | **Laporan Keuangan & Pajak** — Rekap bulanan per tahun: subscription/komisi/fee WD; kalkulasi PPN 11%; total tahunan + per kuartal; export CSV untuk pembukuan | ✅ |
| 12 Mei 2026 | **Fase 7** | **Deteksi Fraud & Anomali** — Pesanan risiko tinggi (nilai besar+dispute cepat); spike GMV toko ≥5× rata-rata harian; risk score 0–100; tandai untuk investigasi | ✅ |

---

## FASE 1 — Dine-in & KDS Real-time ✅ SELESAI

> Pengalaman makan di tempat yang mulus: scan QR → pesan → panggil pelayan → bayar → selesai.

| # | Fitur | Deskripsi | Status |
|---|---|---|---|
| F1-1 | **Tombol Panggil Pelayan** | Tombol floating di halaman menu scan QR; hanya muncul saat `table` ada; cooldown 3 menit; broadcast via Supabase Realtime | ✅ |
| F1-2 | **Panel Panggilan di KDS** | Kartu panggilan meja muncul di header KDS; tombol dismiss; broadcast ke semua device KDS; suara alert | ✅ |
| F1-3 | **Toast Notifikasi di Dashboard** | Toast muncul di seluruh halaman pos-app saat ada panggilan meja baru, tanpa perlu buka KDS | ✅ |
| F1-4 | **Re-order 1-tap** | Setelah checkout berhasil, tombol "Pesan Lagi Menu Sama" muncul; klik langsung isi keranjang & ke cart | ✅ |
| F1-5 | **Estimasi Waktu Siap** | Hitung antrian pesanan pending+preparing → tampilkan "~X menit" di layar sukses checkout | ✅ |

---

## FASE 2 — Retensi Customer & Loyalty Loop ✅ SELESAI

> Pembeli datang lagi tanpa perlu bayar biaya iklan baru.

| # | Fitur | Deskripsi | Status |
|---|---|---|---|
| F2-1 | **Tier Membership** | Bronze/Silver/Gold/Platinum berdasarkan `total_earned` lifetime; progress bar ke tier berikutnya; badge aktif; benefit per tier; per-toko breakdown; CTA ke marketplace | ✅ |
| F2-2 | **Voucher Ulang Tahun Otomatis** | Birthday field di form profil customer; owner aktifkan + set nominal + expiry days di `pos-app/loyalty`; panel "Ulang Tahun Hari Ini" di owner dashboard | ✅ |
| F2-3 | **Notif Poin Kadaluarsa** | Owner set `points_expire_days` di loyalty settings; customer lihat warning banner kuning saat poin aktif akan segera kadaluarsa | ✅ |
| F2-4 | **Kode Referral Unik** | Kode deterministik `UMK+8HEX` per user; salin kode / salin link / share native; riwayat referral + status (Terdaftar/Pembelian Pertama/Reward Diterima) + total reward | ✅ |
| F2-5 | **Pesanan Favorit** | `/akun/favorit` — tandai pesanan selesai dengan ikon hati; beri nama custom; "Pesan Lagi" pre-fill keranjang + navigate ke storefront toko; tab Favorit vs Semua | ✅ |

---

## FASE 3 — Manajemen Stok Otomatis ✅ SELESAI

> Stok tidak pernah oversell; owner selalu tahu kondisi bahan.

| # | Fitur | Deskripsi | Status |
|---|---|---|---|
| F3-1 | **Stok turun otomatis** | Trigger Supabase: tiap order masuk, kurangi `ingredients` sesuai resep; berlaku POS & marketplace | ✅ |
| F3-2 | **Notifikasi stok kritis** | Badge merah + toast di pos-app saat stok ingredient ≤ `min_stock` | ✅ |
| F3-3 | **Auto non-aktif menu** | Jika semua ingredient utama habis, `is_available = false` otomatis | ✅ |
| F3-4 | **Bundle Produk / Paket** | 1 kopi + 1 snack = harga paket; stok keduanya berkurang sekaligus | ✅ |
| F3-5 | **Estimasi stok habis** | "Berdasarkan penjualan 7 hari, kopi susu akan habis dalam ~2 hari" | ✅ |

---

## FASE 4 — Pengalaman Pembeli di Marketplace ✅ SELESAI

> Marketplace yang terasa personal dan mendorong transaksi berulang.

| # | Fitur | Deskripsi | Status |
|---|---|---|---|
| F4-1 | **Notifikasi Promo Toko Diikuti** | Pembeli yang follow toko dapat notif saat toko post promo baru | ✅ |
| F4-2 | **Live Chat Sebelum Beli** | Chat real-time antara calon pembeli dan pemilik toko (bukan hanya di dalam pesanan) | ✅ |
| F4-3 | **Pesanan Berulang 1-tap** | Di halaman akun, tampilkan "Pesan Lagi" dari riwayat pesanan marketplace | ✅ |
| F4-4 | **Estimasi Waktu Pengiriman** | Tampil di halaman produk berdasarkan zona delivery dan jam operasional toko | ✅ |
| F4-5 | **Q&A Produk + FAQ Pin** | Pembeli tanya di halaman produk; owner jawab; "Tandai sebagai penting" pin FAQ ke atas halaman produk; tab FAQ di dashboard | ✅ |
| F4-6 | **Foto di Ulasan** | Upload foto saat tulis ulasan; dapat +5 poin sebagai insentif | ✅ |

---

## FASE 5 — Otomasi Operasional ✅ SELESAI

> Toko berjalan saat owner tidak pegang HP.

| # | Fitur | Deskripsi | Status |
|---|---|---|---|
| F5-1 | **Auto-reply di luar jam buka** | Toggle + custom message di Pengaturan; banner auto-reply aktif di halaman Online Orders saat toko tutup | ✅ |
| F5-2 | **Flash Sale Terjadwal** | Owner set flash_starts_at + flash_ends_at per produk; status LIVE/DIJADWAL/BERAKHIR; badge real-time di halaman Promo | ✅ |
| F5-3 | **Laporan Harian via WhatsApp** | Halaman /laporan-harian: omset, grafik per jam, top menu, stok kritis; tombol Bagikan via WhatsApp dengan teks terformat | ✅ |
| F5-4 | **Auto Print Struk** | Toggle per-perangkat di Pengaturan (localStorage); window.print() otomatis saat pesanan online baru masuk via realtime | ✅ |
| F5-5 | **Split Bill per Orang** | SplitBillDialog di KDS: pilih jumlah orang (2–20), hitung per orang, salin teks untuk dikirim ke customer | ✅ |

---

## FASE 6 — Feedback Loop & Kepercayaan ✅ SELESAI

> Ulasan jadi aset, bukan sekedar angka.

| # | Fitur | Deskripsi | Status |
|---|---|---|---|
| F6-1 | **Balas Ulasan Publik** | Owner balas ulasan dari dashboard; balasan tampil di bawah ulasan pembeli | ✅ |
| F6-2 | **Laporan Sentimen Ulasan** | Kelompokkan ulasan: positif/negatif/saran; topik paling sering disebut; keyword cloud | ✅ |
| F6-3 | **Moderasi Ulasan** | Owner sembunyikan/tampilkan ulasan; flag ke admin platform + alasan pelaporan | ✅ |
| F6-4 | **Leaderboard Toko Terbaik** | Halaman publik /leaderboard; ranking per kategori (rating/terlaris/followers/skor); podium top-3 | ✅ |

---

## FASE 7 — Super Admin Intelligence ✅ SELESAI

> Platform yang menghasilkan uang harus bisa dikelola dengan data, bukan intuisi.

### Latar Belakang & Urgensi Bisnis

Setelah 27 halaman admin operasional terbangun, ditemukan 6 gap kritis yang langsung berdampak pada revenue dan keamanan platform:
- Tidak ada cara untuk melihat/mengelola akun pembeli yang bermasalah
- Ulasan yang di-flag oleh seller terbengkalai tanpa alur review admin
- Tidak ada dashboard pendapatan platform terpadu (hanya GMV toko, bukan revenue platform)
- Pro shops yang akan churn tidak terdeteksi sebelum benar-benar pergi
- Tidak ada laporan keuangan terkonsolidasi untuk keperluan pajak/audit
- Tidak ada sistem deteksi fraud otomatis untuk melindungi platform

### Fitur yang Dibangun

| # | Fitur | Route | Deskripsi Detail | Status |
|---|---|---|---|---|
| F7-1 | **Manajemen Pengguna Pembeli** | `/admin/users` | Tabel semua buyer dengan pencarian email/nama, filter aktif/diblokir, pagination 50/hal; modal detail: riwayat 20 pesanan terakhir per user; aksi ban/unban dengan formulir alasan; integrasi tabel `profiles` + `orders` | ✅ |
| F7-2 | **Moderasi Konten Terpusat** | `/admin/moderation` | Panel khusus ulasan ter-flag (`is_flagged=true`); tab Menunggu Review vs Sudah Diproses; tampilkan isi ulasan, rating bintang, alasan flag, info toko, nama pembeli, tanggal; aksi: Setujui (hapus flag, ulasan tetap tampil) atau Sembunyikan (is_hidden=true); counter badge realtime | ✅ |
| F7-3 | **Revenue Intelligence Dashboard** | `/admin/revenue` | 6 KPI cards: Total Pendapatan Platform, Subscription MRR, Komisi Marketplace (take rate %), Fee Penarikan, Pendapatan Iklan, AOV; area chart tren harian multi-series (subscription vs komisi); pie chart komposisi pendapatan; tabel top 10 toko penghasil komisi dengan take rate per toko; period filter 7/30/90/365 hari; export CSV | ✅ |
| F7-4 | **Churn & Retensi Toko** | `/admin/churn` | 4 tab operasional: (1) Akan Expired — Pro shops dengan sisa ≤30 hari, urut by urgency, warna merah/kuning; (2) Sudah Churn — pernah Pro, sudah free, urut by expire date; (3) GMV Turun — shops dengan GMV 30-hari sekarang <60% vs 30-hari sebelumnya; (4) Tidak Aktif — Pro shops tanpa order completed 14 hari; quick action "Kirim Notif Renewal" per baris | ✅ |
| F7-5 | **Laporan Keuangan & Pajak** | `/admin/financial-report` | Rekap per tahun (selector 5 tahun terakhir); breakdown 12 bulan: subscription + komisi + fee WD; kalkulasi PPN 11% (UU HPP 2021) per bulan; ringkasan 4 kuartal; total tahunan di tfoot; badge "Berjalan" untuk bulan ini; catatan pajak informatif; export CSV siap pembukuan | ✅ |
| F7-6 | **Deteksi Fraud & Anomali** | `/admin/fraud` | Tab Pesanan Mencurigakan: skoring 0–100 berdasarkan dispute <2 jam / <24 jam setelah order, nilai ≥ Rp 1jt, status cancelled; Tab Toko Anomali: spike GMV hari ini ≥5× rata-rata harian 7 hari (deteksi wash trading / fake orders); KPI cards: risiko tinggi, spike shops, total ditandai; aksi "Tandai untuk Investigasi" per item | ✅ |

### Dampak Bisnis yang Diharapkan

| Fitur | Dampak Langsung |
|---|---|
| Revenue Intelligence | Visibilitas penuh pendapatan platform → keputusan pricing lebih tepat |
| Churn & Retensi | Deteksi dini toko Pro yang akan pergi → intervensi tepat waktu = MRR terjaga |
| Laporan Keuangan | Kesiapan audit/pajak → compliance, hindari denda |
| Fraud Detection | Cegah kerugian dari dispute fraudulen atau wash-trading |
| Moderasi Konten | Kepercayaan marketplace meningkat → konversi pembeli lebih tinggi |
| User Management | Respons cepat terhadap akun bermasalah → reputasi platform terjaga |

---

## Prioritas Global

| Fase | Dampak Bisnis | Effort | Status |
|------|--------------|--------|--------|
| Fase 1 — Dine-in & KDS | ⭐⭐⭐⭐⭐ | Rendah | ✅ Selesai |
| Fase 3 — Stok Otomatis | ⭐⭐⭐⭐⭐ | Sedang | ✅ Selesai |
| Fase 2 — Retensi Customer | ⭐⭐⭐⭐ | Sedang | ✅ Selesai |
| Fase 5 — Otomasi Operasional | ⭐⭐⭐⭐ | Sedang | ✅ Selesai |
| Fase 4 — Marketplace UX | ⭐⭐⭐ | Tinggi | ✅ Selesai |
| Fase 6 — Feedback Loop | ⭐⭐⭐ | Rendah | ✅ Selesai |
| Fase 7 — Super Admin Intelligence | ⭐⭐⭐⭐⭐ | Tinggi | ✅ Selesai |
