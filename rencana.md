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

## FASE 2 — Retensi Customer & Loyalty Loop 🔲

> Pembeli datang lagi tanpa perlu bayar biaya iklan baru.

| # | Fitur | Deskripsi | Status |
|---|---|---|---|
| F2-1 | **Tier Membership** | Silver → Gold → Platinum; threshold poin; badge di profil; benefit per tier (diskon, prioritas) | 🔲 |
| F2-2 | **Voucher Ulang Tahun Otomatis** | Cek tanggal lahir → kirim voucher H-1 ulang tahun ke customer | 🔲 |
| F2-3 | **Notif Poin Kadaluarsa** | Ingatkan customer 7 hari sebelum poin expired via notifikasi in-app | 🔲 |
| F2-4 | **Kode Referral Unik** | Tiap customer punya kode referral; share link; keduanya dapat poin saat referral pertama order | 🔲 |
| F2-5 | **Pesanan Favorit** | Simpan kombinasi menu ke "Favorit"; pesan ulang 1 tap dari halaman akun customer | 🔲 |

---

## FASE 3 — Manajemen Stok Otomatis 🔲

> Stok tidak pernah oversell; owner selalu tahu kondisi bahan.

| # | Fitur | Deskripsi | Status |
|---|---|---|---|
| F3-1 | **Stok turun otomatis** | Trigger Supabase: tiap order masuk, kurangi `ingredients` sesuai resep; berlaku POS & marketplace | 🔲 |
| F3-2 | **Notifikasi stok kritis** | Badge merah + toast di pos-app saat stok ingredient ≤ `min_stock` | 🔲 |
| F3-3 | **Auto non-aktif menu** | Jika semua ingredient utama habis, `is_available = false` otomatis | 🔲 |
| F3-4 | **Bundle Produk / Paket** | 1 kopi + 1 snack = harga paket; stok keduanya berkurang sekaligus | 🔲 |
| F3-5 | **Estimasi stok habis** | "Berdasarkan penjualan 7 hari, kopi susu akan habis dalam ~2 hari" | 🔲 |

---

## FASE 4 — Pengalaman Pembeli di Marketplace 🔲

> Marketplace yang terasa personal dan mendorong transaksi berulang.

| # | Fitur | Deskripsi | Status |
|---|---|---|---|
| F4-1 | **Notifikasi Promo Toko Diikuti** | Pembeli yang follow toko dapat notif saat toko post promo baru | 🔲 |
| F4-2 | **Live Chat Sebelum Beli** | Chat real-time antara calon pembeli dan pemilik toko (bukan hanya di dalam pesanan) | 🔲 |
| F4-3 | **Pesanan Berulang 1-tap** | Di halaman akun, tampilkan "Pesan Lagi" dari riwayat pesanan marketplace | 🔲 |
| F4-4 | **Estimasi Waktu Pengiriman** | Tampil di halaman produk berdasarkan zona delivery dan jam operasional toko | 🔲 |
| F4-5 | **Q&A Produk** | Pembeli tanya di halaman produk; owner jawab; tampil publik untuk calon pembeli lain | 🔲 |
| F4-6 | **Foto di Ulasan** | Upload foto saat tulis ulasan; dapat +5 poin sebagai insentif | 🔲 |

---

## FASE 5 — Otomasi Operasional 🔲

> Toko berjalan saat owner tidak pegang HP.

| # | Fitur | Deskripsi | Status |
|---|---|---|---|
| F5-1 | **Auto-reply di luar jam buka** | Sistem kirim pesan otomatis ke customer jika order masuk di luar jam operasional | 🔲 |
| F5-2 | **Flash Sale Terjadwal** | Owner set promo untuk besok; sistem aktifkan/nonaktifkan otomatis sesuai jadwal | 🔲 |
| F5-3 | **Laporan Harian via WhatsApp** | Ringkasan omset, top menu, stok kritis dikirim jam 23.00 tiap hari | 🔲 |
| F5-4 | **Auto Print Struk** | Saat order online/marketplace masuk, struk tercetak otomatis tanpa klik manual | 🔲 |
| F5-5 | **Split Bill per Orang** | Di halaman order meja, hitung pembagian bill per kepala dari total pesanan meja | 🔲 |

---

## FASE 6 — Feedback Loop & Kepercayaan 🔲

> Ulasan jadi aset, bukan sekedar angka.

| # | Fitur | Deskripsi | Status |
|---|---|---|---|
| F6-1 | **Balas Ulasan Publik** | Owner balas ulasan dari dashboard; balasan tampil di bawah ulasan pembeli | 🔲 |
| F6-2 | **Laporan Sentimen Ulasan** | Kelompokkan ulasan: positif/negatif/saran; topik paling sering disebut | 🔲 |
| F6-3 | **Moderasi Ulasan** | Owner flag ulasan tidak relevan; admin platform review | 🔲 |
| F6-4 | **Leaderboard Toko Terbaik** | Ranking toko per kategori berdasarkan rating + volume pesanan | 🔲 |

---

## Prioritas Global

| Fase | Dampak Bisnis | Effort | Status |
|------|--------------|--------|--------|
| Fase 1 — Dine-in & KDS | ⭐⭐⭐⭐⭐ | Rendah | ✅ Selesai |
| Fase 3 — Stok Otomatis | ⭐⭐⭐⭐⭐ | Sedang | 🔲 Antri |
| Fase 2 — Retensi Customer | ⭐⭐⭐⭐ | Sedang | 🔲 Antri |
| Fase 5 — Otomasi Operasional | ⭐⭐⭐⭐ | Sedang | 🔲 Antri |
| Fase 4 — Marketplace UX | ⭐⭐⭐ | Tinggi | 🔲 Antri |
| Fase 6 — Feedback Loop | ⭐⭐⭐ | Rendah | 🔲 Antri |
