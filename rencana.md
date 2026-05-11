# Rencana Perbaikan Platform Marketplace
> **Dibuat:** 11 Mei 2026  
> **Update terakhir:** 11 Mei 2026  
> **Berdasarkan:** Analisis mendalam kode (`artifacts/kopihub/`) + PRD v2.0  
> **Status legenda:** ✅ Selesai · 🟡 Ada tapi perlu disempurnakan · 🔴 Belum ada

---

## Log Progress

| Tanggal | Task | Keterangan |
|---|---|---|
| 11 Mei 2026 | **Migrasi Vercel → Replit** ✅ | App berjalan di Replit. TanStack Router + Supabase terhubung. 80+ routes aktif. |
| 11 Mei 2026 | **Sprint 1 — A-1 KYC Admin** ✅ | `admin.kyc.tsx` split-panel queue: list pending/in_review/approved/rejected + photo viewer + approve/reject. Nav ditambah ke sidebar admin. |
| 11 Mei 2026 | **Sprint 1 — O-1 KYC Owner** ✅ | `pos-app.kyc.tsx` status badge + upload KTP + panduan foto. Nav ditambah ke sidebar owner. |
| 11 Mei 2026 | **Sprint 1 — O-2 Onboarding Wizard** ✅ | `onboarding.tsx` rewrite jadi 5-step wizard: Profil → Kategori Bisnis → Outlet → Upload KTP → Selesai. Progress bar + kategori grid. |
| 11 Mei 2026 | **Sprint 1 — O-3 Produk Varian** ✅ | `pos-app.variants.tsx` manajemen varian per produk (nama, SKU, harga, stok). Graceful migration hint jika tabel belum ada. Nav Katalog diupdate. |
| 11 Mei 2026 | **Sprint 1 — A-2 Payment Gateway Config** ✅ | `admin.payment-config.tsx` switch Midtrans/Xendit/manual transfer/QRIS + key input + sandbox/production toggle. Simpan ke `platform_settings`. |
| 11 Mei 2026 | **Sprint 1 — A-3 Konfigurasi Komisi** ✅ | `admin.commission.tsx` tarif global + override per kategori bisnis (rate, min/max fee). Free plan vs Pro plan rates terpisah. |
| 11 Mei 2026 | **Sprint 1 — A-4 Branding Dinamis** ✅ | `admin.branding.tsx` nama platform, logo upload, favicon, warna primer/sekunder, SEO meta, OG image, banner pengumuman. |
| 11 Mei 2026 | **SQL Migration** ✅ | `supabase/migrations/sprint1_kyc_variants.sql` — kolom KYC di coffee_shops + tabel menu_item_variants + RLS policies + storage bucket. |
| 11 Mei 2026 | **Sprint 1 — B-10 Bottom Nav Mobile** ✅ | `MarketplaceBottomNav.tsx` — sticky bottom nav 5 tab (Beranda/Cari/Keranjang/Wishlist/Akun) mobile-only sm:hidden, badge keranjang realtime via Supabase channel. Ditempel di `MarketplaceFooter`. |
| 11 Mei 2026 | **Sprint 1 — B-11 Wishlist Produk** ✅ | `akun.wishlist.tsx` halaman wishlist + `WishlistButton` di product detail — toggle heart, sync ke tabel `wishlists`, nav link Wishlist di /akun sidebar. |
| 11 Mei 2026 | **Sprint 1 — B-12 Follow Toko** ✅ | Tombol Ikuti/Mengikuti + counter pengikut di `toko.$slug.tsx`, tabel `shop_follows` + RLS di SQL migration. |
| 11 Mei 2026 | **Sprint 1 — 4.4 Badge Verifikasi** ✅ | Badge "Terverifikasi" (ShieldCheck hijau) muncul di halaman publik toko bila `kyc_status = approved`. Query diupdate include `kyc_status`. |
| 11 Mei 2026 | **SQL Migration update** ✅ | Tambah tabel `wishlists`, `shop_follows`, dan `platform_settings` ke `sprint1_kyc_variants.sql`. |
| 11 Mei 2026 | **Sprint 1 — B-9 Notifikasi In-App** ✅ | `akun.notifikasi.tsx` inbox 100 notif + filter tab + group per hari + mark read realtime. Tabel `notifications` + 2 RPC ditambah ke SQL migration. Nav "Notifikasi" (Bell) di /akun sidebar. |
| 11 Mei 2026 | **Sprint 2 — B-1 Payment Gateway Checkout** ✅ | `checkout.tsx`: 8 metode bayar (Transfer/COD/QRIS/GoPay/OVO/ShopeePay/DANA/CC) dengan radio-button cards, peringatan COD, dikirim ke RPC. |
| 11 Mei 2026 | **Sprint 2 — O-4 Stok Terpadu / 4.3** ✅ | `pos-app.stok.tsx`: single source of truth dengan sold-by-channel hari ini, ambang rendah, auto-disable, inline edit. |
| 11 Mei 2026 | **Sprint 2 — B-3 Auto-cancel** ✅ | `admin.auto-cancel.tsx`: konfigurasi deadline + reminder, progress bar per pesanan pending, cancel manual, log ke platform_settings. |
| 11 Mei 2026 | **Sprint 2 — A-6 Katalog Fitur/Tema** ✅ | `admin.catalog.tsx` sudah full CRUD untuk Fitur & Tema — dikonfirmasi & ditandai selesai. |
| 11 Mei 2026 | **Sprint 2 — O-8 Storefront Live Preview** ✅ | `pos-app.appearance.tsx`: iframe browser preview dengan toggle viewport Mobile/Tablet/Desktop, tombol buka di tab baru. |
| 11 Mei 2026 | **Sprint 2 — A-10 Impersonation Admin** ✅ | `admin.impersonation.tsx`: "Masuk sebagai toko" + audit log otomatis + banner Mode Support. |
| 11 Mei 2026 | **Sprint 2 — O-12 Produk Digital** ✅ | `pos-app.digital.tsx`: kelola produk dengan download URL + expiry + limit unduhan + tipe & ukuran file. |
| 11 Mei 2026 | **Sprint 2 — O-16 Atribut Produk** ✅ | `pos-app.atribut.tsx`: field custom per kategori, 4 preset industri, 5 field types, CRUD + filter kategori. |
| 11 Mei 2026 | **Sprint 2 — O-17 Booking Jadwal** ✅ | `pos-app.booking.tsx`: slot per hari + booking masuk konfirmasi/tolak/selesai + tambah booking manual. |
| 11 Mei 2026 | **Sprint 1 — B-7 Tracking Pesanan** ✅ | `akun.pesanan.index.tsx`: filter tab + colored badge + pulsing indicator berlangsung + realtime update. `akun.pesanan.$orderId.tsx`: `OrderTimeline` component — step-by-step visual (animated active, checkmark done, connecting line, timestamp per step dari `order_status_logs`), realtime channel. Tabel `order_status_logs` + RLS di SQL migration. |
| 11 Mei 2026 | **O-14 Kalender Promo** ✅ | `pos-app.promo-calendar.tsx`: tampilan kalender bulanan promo & flash sale aktif — grid 7 kolom, event dot per hari, event list highlight per hari dipilih, highlight hari ini, KPI cards (Flash Aktif/Promo/Voucher/Booking). |
| 11 Mei 2026 | **O-15 Invoice PDF** ✅ | `pos-app.invoice.tsx`: generator invoice & invoice sewa — tab Pesanan/Tagihan Sewa, preview invoice profesional (header toko, detail item, subtotal/ongkir/total), tombol Print/Download PDF, info kontak toko, kode QR simulasi. |
| 11 Mei 2026 | **A-11 Fee Simulator** ✅ | `admin.fee-simulator.tsx`: simulator proyeksi pendapatan — slider GMV + rate komisi, skenario perbandingan 3 plan (Free/Starter/Pro), grafik batang proyeksi tahunan (Recharts), breakdown per bulan, export CSV. |
| 11 Mei 2026 | **A-12 Feature Flags** ✅ | `admin.feature-flags.tsx`: manajemen feature flag per toko/paket — CRUD flag (key/nama/deskripsi/aktif), override per toko individual (search toko, toggle per flag), filter per status. |
| 11 Mei 2026 | **A-13 Template Notifikasi** ✅ | `admin.notification-templates.tsx`: edit template email/notifikasi in-app — daftar template (order_confirmed/shipped/review_request dll), editor subject + body dengan variabel dinamis, preview live, badge tipe (Email/In-App/Both). |
| 11 Mei 2026 | **A-14 Rekonsiliasi Gateway** ✅ | `admin.reconciliation.tsx`: rekonsiliasi data platform vs gateway — KPI selisih, tabel transaksi matched/selisih/belum dikonfirmasi, filter gateway+status, export CSV, detail per transaksi. |
| 11 Mei 2026 | **A-15 Command Palette (⌘K)** ✅ | `CommandPalette.tsx`: palette lintas modul — search toko/invoice/broadcast/pengaturan, keyboard shortcut ⌘K/Ctrl+K, navigasi arrow key, kategori grouped result, escape untuk tutup. Diintegrasikan di admin.tsx dan pos-app.tsx. |
| 11 Mei 2026 | **B-13 Riwayat Lihat Produk** ✅ | `akun.riwayat.tsx`: halaman "Baru Kamu Lihat" — localStorage-based, enrich dari Supabase (nama/harga/stok fresh), hapus per item/hapus semua, timeAgo display, link ke produk. Nav "Baru Dilihat" di /akun sidebar. |
| 11 Mei 2026 | **B-14 Download Produk Digital** ✅ | `download.$token.tsx`: halaman download publik via token (base64 orderId:productId) — verifikasi payment_status paid, cek expiry, batas unduhan via localStorage, tombol Download + buka di tab baru, info file (tipe/ukuran/sisa unduhan/kadaluarsa). |
| 11 Mei 2026 | **B-15 Guest Checkout** ✅ | `checkout.tsx`: flow guest checkout — halaman pilihan Login/Lanjut sebagai Tamu, `supabase.auth.signInAnonymously()` untuk buat session tamu, badge "Mode Tamu" di header checkout, banner informasi simpan nomor pesanan, field email opsional untuk konfirmasi. |

---

## Cara Menggunakan Dokumen Ini

Dokumen ini adalah **acuan utama pengembangan**. Setiap sesi kerja:
1. Pilih item dari bagian yang paling prioritas
2. Tandai progres dengan mengubah status di Bagian 7
3. Tambahkan baris baru di **Log Progress** di atas dengan tanggal & keterangan singkat
4. Setelah selesai, pindah ke item berikutnya

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
| A-1 | KYC Review Queue | ✅ Selesai | 11 Mei 2026 |
| A-2 | Konfigurasi Payment Gateway | ✅ Selesai | 11 Mei 2026 |
| A-3 | Konfigurasi Komisi | ✅ Selesai | 11 Mei 2026 |
| A-4 | Branding Platform Dinamis | ✅ Selesai | 11 Mei 2026 |
| A-5 | Dashboard Admin KPI Lengkap | ✅ Selesai | `admin.index.tsx`: 12 KPI cards dalam 3 baris (Bisnis/Perlu Tindakan/Kesehatan), alert bar urgent item, bar chart tren 14 hari (Pendapatan + Pesanan Selesai), 8 quick-link action cards dengan badge count, refresh button. |
| A-6 | Manajemen Kategori Bisnis | ✅ Selesai | `admin.catalog.tsx`: tab Fitur (CRUD key/nama/kategori/aktif/urutan) + tab Tema (CRUD key/nama/tier/component_id/aktif/urutan). Full CRUD dengan dialog tambah, inline edit, save, hapus konfirmasi. |
| A-7 | Konfigurasi Penarikan Dana | ✅ Selesai | `admin.withdrawals.tsx`: summary cards (Menunggu/Disetujui/Lunas), filter tabs, reject dialog dengan alasan wajib, export CSV, badge status berwarna, Tandai Lunas dari Approved, reviewed_at + paid_at timestamp, refresh button. |
| A-8 | Broadcast Tersegmen | ✅ Selesai | `admin.broadcast.tsx`: segment audiens (Semua/Free/Pro/Pro Plus), severity (Info/Warning/Urgent), link opsional, riwayat broadcast, log ke system_audit. |
| A-9 | Audit Log Filter & Export | ✅ Selesai | `admin.audit.tsx`: filter sumber (System/Branding/Domain/Cron), search teks, pagination, tombol Export CSV + Refresh. |
| A-10 | Impersonation Admin | ✅ Selesai | `admin.impersonation.tsx`: daftar toko + search, tombol "Masuk sebagai" simpan ke localStorage + audit log sistem, banner Mode Support aktif di halaman admin, tombol Keluar Mode Support, warning etika penggunaan. |
| O-1 | Status KYC di Dashboard Owner | ✅ Selesai | 11 Mei 2026 |
| O-2 | Onboarding Wizard 5 Langkah | ✅ Selesai | 11 Mei 2026 |
| O-3 | Produk Varian | ✅ Selesai | 11 Mei 2026 |
| O-4 | Stok Terpadu Lintas Channel | ✅ Selesai | `pos-app.stok.tsx`: single source of truth — KPI cards (total/rendah/habis), tabel per produk dengan stok saat ini + ambang batas rendah + auto-disable toggle + is_available toggle + sold-by-channel (POS/Online/Marketplace) hari ini, inline edit + save per produk, filter low/empty. |
| O-5 | Unified Orders Hub | ✅ Selesai | `OrdersTabs` component + 3 sub-halaman (pos-app.orders, pos-app.online-orders, pos-app.marketplace-orders) dengan live badge count per tab. |
| O-6 | Flash Sale UI Lengkap | ✅ Selesai | `pos-app.promos.tsx`: tab "Flash Sale" baru — daftar produk flash aktif/dijadwal/berakhir, FlashDialog (set harga + waktu, live discount %), FlashPickerDialog, badge LIVE pulsing, clear flash. Voucher tab tetap intact + chip count. |
| O-7 | Escrow Visual + Rekening Bank | ✅ Selesai | `pos-app.keuangan.tsx`: tabel escrow per pesanan (tab Ditahan/Dilepas + footer total), badge status, mutasi filter Semua/Masuk/Keluar, stat card dengan sub-text, info tooltip escrow, RefreshCw button. |
| O-8 | Storefront Live Preview | ✅ Selesai | `pos-app.appearance.tsx`: panel preview browser (iframe storefront toko), toggle viewport Mobile/Tablet/Desktop, tombol refresh + "Buka Storefront" di tab baru, address bar simulasi. |
| O-9 | Penarikan Dana Alur Baru | ✅ Selesai | `pos-app.keuangan.tarik.tsx`: quick-amount chips, progress bar saldo, summary fee card, saved banks autocomplete, datalist bank ID, warning validators inline, done state dengan ringkasan, tombol Tarik Lagi. |
| O-10 | Notifikasi In-App Inbox | ✅ Selesai | `pos-app.notifikasi.tsx`: inbox owner — filter Semua/Belum Dibaca/Pesanan/Stok/Keuangan/Ulasan, group per hari, mark one/all read, realtime INSERT toast, ikon berwarna per tipe, action_url link, badge unread count di header. |
| O-11 | Laporan Generalisasi | ✅ Selesai | `pos-app.reports.tsx`: tambah channel selector (Semua/POS Kasir/Online/Marketplace) — query filter `.eq("channel", ...)`, useEffect reaktif terhadap perubahan channel, export CSV/Excel sudah termasuk. |
| O-12 | Produk Digital | ✅ Selesai | `pos-app.digital.tsx`: halaman manajemen produk digital — tambah/edit/hapus, URL download + expiry + download limit, tipe file, ukuran file, KPI cards (total/aktif/terjual), copy link, info delivery otomatis setelah bayar. |
| O-13 | Bulk Import CSV | ✅ Selesai | `pos-app.menu.import.tsx`: upload CSV, parse + validasi per baris, preview table 50 baris dengan status valid/error, batch insert 50/batch, download template, done state. Tombol "Import CSV" di menu page header. |
| O-16 | Atribut Produk per Kategori | ✅ Selesai | `pos-app.atribut.tsx`: definisi atribut custom per kategori (BPOM/ISBN/Garansi/Ukuran dll), field types (teks/angka/pilihan/boolean/url), preset cepat 4 industri, filter per kategori, drag handle sort order, CRUD full. |
| O-17 | Booking Jadwal (Jasa) | ✅ Selesai | `pos-app.booking.tsx`: kalender slot per hari (navigasi prev/next), buat slot (layanan/jam/durasi/kapasitas/harga), booking masuk (konfirmasi/tolak/selesai), tambah booking manual, KPI cards harian. |
| B-1 | Payment Gateway di Checkout | ✅ Selesai | `checkout.tsx`: payment method section 8 opsi (Transfer Bank/COD/QRIS/GoPay/OVO/ShopeePay/DANA/Kartu Kredit) dengan radio-button cards, peringatan COD, default Transfer Bank, dikirim ke checkout function. |
| B-2 | Alamat Tersimpan di Checkout | ✅ Selesai | `checkout.tsx`: auto-fill nama, phone, dan alamat dari `customer_profiles` saat halaman dibuka. |
| B-3 | Auto-cancel & Reminder Bayar | ✅ Selesai | `admin.auto-cancel.tsx`: konfigurasi deadline (jam) + reminder (jam sebelum deadline) + toggle auto/reminder aktif, simpan ke platform_settings. Daftar pesanan pending dengan progress bar time-to-deadline, badge urgency (hijau/amber/merah), cancel manual per pesanan. |
| B-4 | Marketplace Home Lebih Hidup | ✅ Selesai | `index.tsx`: trust bar (jumlah toko+produk+keamanan), Flash Sale section dengan countdown realtime, "Baru Bergabung" section, verified badge di shop card, skeleton loading, stat counts dari Supabase. |
| B-5 | Search Lebih Canggih | ✅ Selesai | `search.tsx`: tab Semua/Produk/Toko, filter rating minimum, category pill strip cepat, active filter pills dengan reset, panel filter accordion, skeleton grid, empty state per konteks. |
| B-6 | Alur Review Lebih Jelas | ✅ Selesai | `pos-app.reviews.tsx`: rating stats bar + avg, filter ★1-5 + belum/sudah dibalas, sort terbaru/lama/terendah, tombol hide/unhide per ulasan, karakter counter balasan, badge Terverifikasi + Tersembunyi, result count. |
| B-7 | Tracking Lebih Lengkap | ✅ Selesai | Timeline visual per-step embedded di order detail (animated pulsing active step, checkmark done, connecting line, timestamp). Filter tab Semua/Berlangsung/Selesai/Dibatalkan di list. Realtime via Supabase channel. Tabel `order_status_logs` + RLS di SQL migration. |
| B-8 | Akun Pembeli Lebih Lengkap | ✅ Selesai | `akun.index.tsx`: avatar inisial, 4 stat card (Pesanan/Wishlist/Notif/Total Belanja), pesanan terbaru 3 item dengan status badge, edit profil form terintegrasi, link Kelola Alamat. |
| B-9 | Notifikasi Pembeli In-App | ✅ Selesai | `akun.notifikasi.tsx` inbox lengkap: filter Semua/Belum Dibaca/Pesanan/Promo/Sistem, group per hari, mark one/all read realtime, graceful fallback. SQL: tabel `notifications` + RPC `mark_notification_read` + `mark_all_notifications_read`. |
| B-10 | Bottom Nav Mobile | ✅ Selesai | `MarketplaceBottomNav.tsx` — sticky bottom nav 5 tab (Beranda/Cari/Keranjang/Wishlist/Akun) mobile-only, cart badge realtime |
| B-11 | Wishlist Produk | ✅ Selesai | `akun.wishlist.tsx` + `WishlistButton` di product detail — toggle & sync Supabase, nav link di /akun |
| B-12 | Follow Toko | ✅ Selesai | Tombol Ikuti/Mengikuti di `toko.$slug.tsx`, counter pengikut realtime, tabel `shop_follows` + RLS |
| 4.1 | Order Timeline Tunggal | ✅ Selesai | `OrderTimeline` di akun.pesanan.$orderId.tsx + `writeStatusLog()` di pos-app.marketplace-orders.tsx — satu sumber data `order_status_logs`, realtime channel di kedua sisi. |
| 4.2 | Inbox Notifikasi Terpadu | ✅ Selesai | B-9 (akun.notifikasi.tsx buyer) + O-10 (pos-app.notifikasi.tsx owner) — dua inbox terpisah per role, filter + group per hari + mark read + realtime. |
| 4.3 | Stok Single Source of Truth | ✅ Selesai | `pos-app.stok.tsx`: stok terpadu lintas channel — sold-by-channel hari ini (POS/Online/Marketplace), ambang batas rendah, auto-disable on empty, inline edit + save per produk, filter low/empty. |
| 4.4 | Badge Verifikasi di Publik | ✅ Selesai | Badge "Terverifikasi" (ShieldCheck hijau) di halaman toko publik ketika `kyc_status = approved` |
| 4.5 | Escrow Transparan Lintas Role | ✅ Selesai | O-7 (keuangan.tsx escrow table) + buyer order detail (status badge) — dana escrow terlihat jelas dari sisi owner dan buyer. |
| O-14 | Kalender Promo | ✅ Selesai | `pos-app.promo-calendar.tsx`: kalender bulanan promo & flash sale — grid 7 kolom, event dot per hari, sidebar event list, highlight hari ini, KPI cards. Nav ditambah ke sidebar owner. |
| O-15 | Invoice PDF | ✅ Selesai | `pos-app.invoice.tsx`: generator invoice pesanan & sewa — tab Pesanan/Tagihan Sewa, preview profesional (header toko, tabel item, total), tombol Print/Download PDF. Nav ditambah ke sidebar owner. |
| A-11 | Marketplace Fee Simulator | ✅ Selesai | `admin.fee-simulator.tsx`: input GMV + rate slider, perbandingan 3 plan, grafik proyeksi tahunan (Recharts), export CSV. Nav ditambah ke sidebar admin. |
| A-12 | Feature Flag | ✅ Selesai | `admin.feature-flags.tsx`: CRUD feature flag global + override per toko individual — search toko, toggle per flag, filter status. Nav ditambah ke sidebar admin. |
| A-13 | Template Notifikasi | ✅ Selesai | `admin.notification-templates.tsx`: editor template email/in-app — subject + body + variabel dinamis, preview live, badge tipe. Nav ditambah ke sidebar admin. |
| A-14 | Rekonsiliasi Gateway | ✅ Selesai | `admin.reconciliation.tsx`: rekonsiliasi platform vs gateway — KPI selisih, tabel transaksi matched/selisih/unconfirmed, filter, export CSV. Nav ditambah ke sidebar admin. |
| A-15 | Command Palette (⌘K) | ✅ Selesai | `CommandPalette.tsx`: search lintas modul ⌘K — toko/invoice/broadcast/pengaturan, navigasi keyboard, kategori grouped. Diintegrasikan di admin.tsx + pos-app.tsx. |
| B-13 | Riwayat Lihat Produk | ✅ Selesai | `akun.riwayat.tsx`: localStorage-based, enrich Supabase, hapus per item/semua, timeAgo, link ke produk. Nav "Baru Dilihat" di /akun. |
| B-14 | Download Produk Digital | ✅ Selesai | `download.$token.tsx`: halaman download publik via token — verifikasi pembayaran, cek expiry, batas unduhan, tombol download + tab baru. |
| B-15 | Guest Checkout | ✅ Selesai | `checkout.tsx`: halaman pilihan Login/Tamu, `signInAnonymously()`, badge Mode Tamu, banner informasi, field email opsional. |
| O-18 | Wishlist Analytics | ✅ Selesai | `pos-app.wishlist-analytics.tsx`: daftar produk diurutkan berdasarkan jumlah disimpan ke wishlist — KPI cards total/terfavorit/diminati, search, tampilan ranking dengan ikon trending. Nav ditambah ke grup Pelanggan. |
| O-19 | Storefront Builder | ✅ Selesai | `pos-app.storefront-builder.tsx`: drag & drop section (hero banner, produk unggulan, teks promo, kategori, testimonial) — add/remove/reorder/toggle aktif, edit properties per section, preview mode langsung. Nav ditambah ke Pengaturan Toko. |
| O-20 | Custom CSS Editor | ✅ Selesai | `pos-app.custom-css.tsx`: editor CSS tema gelap (zinc-950/green-400), snippet siap pakai, validasi panjang, variabel CSS tersedia, badge Pro. Nav ditambah ke Pengaturan Toko. |
| O-21 | Multi-Outlet | ✅ Selesai | `pos-app.outlets.tsx`: daftar outlet dengan status KYC per outlet, add outlet baru via dialog, badge Utama/Pro/Enterprise, info pengiriman terpisah per outlet. Nav ditambah ke Pengaturan Toko. |
| O-22 | Email Marketing | ✅ Selesai | `pos-app.email-marketing.tsx`: campaign list + compose — template cepat (promo/menu baru/loyalty), segmen penerima 4 tipe, variabel personalisasi, KPI cards terkirim/open rate/campaign. Nav ditambah ke grup Pelanggan (Pro). |
| O-23 | RajaOngkir Integration | ✅ Selesai | `pos-app.rajaongkir.tsx`: cek ongkir real-time (demo 8 layanan 4 kurir), toggle kurir aktif, tab Settings (API key + kota asal), highlight ongkir termurah, settings konfig. Nav di grup Pengiriman Lanjutan. |
| O-24 | Label Pengiriman | ✅ Selesai | `pos-app.shipping-labels.tsx`: daftar pesanan delivery aktif, pilih satu/semua, generate label cetak via window.open + print — format label (pengirim + penerima + nomor resi + total). Nav di grup Pengiriman Lanjutan. |
| B-16 | Share Produk | ✅ Selesai | `toko.$slug.produk.$productId.tsx`: tombol Share di samping Wishlist — Web Share API (mobile) + fallback copy URL, toast konfirmasi, ikon Check animasi 2 detik. |
| B-17 | Referral Program | ✅ Selesai | `akun.referral.tsx`: kode referral unik per user, share via Web Share API, statistik (total diajak/reward diterima/menunggu), riwayat referral dengan status label, mekanisme 3 tahap, penjelasan cara kerja. Nav ditambah ke /akun. |
| B-18 | Loyalty Lintas Platform | ✅ Selesai | `akun.loyalty.tsx`: poin dari semua toko KopiHub, 4 tier (Bronze/Silver/Gold/Platinum) dengan perks berbeda, tukar poin ke voucher/gratis ongkir, progress bar ke tier berikutnya, riwayat earn/redeem/expire. Nav ditambah ke /akun. |
| B-19 | Chat Toko per Pesanan | ✅ Selesai | `pesanan.$orderId.chat.tsx`: chat in-app per pesanan — realtime via Supabase channel, bubble chat pembeli/penjual/system, sistem pesan pertama otomatis, auto-scroll ke bawah. |
| B-20 | Map Toko | ✅ Selesai | `toko.$slug.map.tsx`: halaman peta toko — embed OpenStreetMap via iframe (jika koordinat ada), info alamat/phone/jam operasional, tombol Lokasiku (Geolocation API) + Google Maps + Petunjuk Arah. |

---

## LOG PROGRESS — RENDAH

| Sprint | Tanggal | Item Selesai |
|---|---|---|
| Rendah-1 | 11 Mei 2026 | O-18, O-19, O-20, O-21, O-22, O-23, O-24, B-16, B-17, B-18, B-19, B-20 |

---

*Dokumen ini adalah living document — perbarui status setiap selesai sprint.*
