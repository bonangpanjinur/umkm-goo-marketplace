## Audit PRD — Temuan Utama

PRD masih menandai 80+ item dengan ❌, tapi **5 di antaranya sudah selesai** lewat sprint sebelumnya dan cuma belum disinkronkan. Sinkronisasi ini gratis dan menghapus kebisingan, jadi dilakukan dulu.

### A. Sinkronisasi status (tanpa coding — cuma update PRD)

| Item | Status PRD sekarang | Status sebenarnya |
|---|---|---|
| **M-03 Reminder Booking Otomatis** (baris 428) | "cron otomatis masih ❌" | ✅ Sprint 12 G-1 — `send_booking_reminders()` + pg_cron `0 2 * * *` |
| **Fase B Reminder H-1/H-3** (baris 353) | ❌ | ✅ Sprint 12 G-1 |
| **Fase B Riwayat booking pembeli** (baris 354) | ❌ | ✅ `akun.bookings.tsx` |
| **R-03 Waitlist Virtual** (baris 482) | ❌ | ✅ Sprint 11 M-12 |
| **Bagian 4.1 Reminder otomatis & Riwayat booking** (baris 334–337) | ❌ | ✅ |

### B. Item HIGH-IMPACT yang benar-benar masih kosong

Diurutkan berdasarkan rasio **dampak ÷ effort**:

| # | Fitur | Effort | Alasan prioritas |
|---|---|---|---|
| **1** | **FA-02 Filter Ukuran & Warna** di halaman toko | ~3 jam | Fashion adalah kategori dengan SKU terbanyak. Tanpa filter, pembeli scroll 100+ produk → drop. Kolom `attributes` jsonb sudah ada, cuma butuh UI filter di `toko.$slug.tsx`. |
| **2** | **Galeri Before/After** untuk Salon (SB-04) & Fotografer (SF-04) | ~4 jam | Kepercayaan kategori jasa. Tabel `portfolio_items` sudah ada → tambah kolom `before_image_url` + `after_image_url` opsional + UI slider/comparison di publik. |
| **3** | **Custom Order Form** (F-05 / KR-01 / FA-06 / SF-08 add-on) | ~5 jam | Banyak kategori menunggu (kerajinan, fashion custom, fotografer add-on). 1 form generic + tabel `custom_order_requests` → notif merchant via WA. |
| **4** | **Pre-Order Mode** (F-04 / R-05 catering / fashion limited drop) | ~4 jam | Kolom `is_pre_order`, `pre_order_days` sudah ada di view `products`. Tinggal: UI badge "Pre-Order" + countdown + tab di POS untuk kelola batch + auto-notif saat tiba. |
| **5** | **SA-02 Platform Health Score per Toko** (0–100) | ~4 jam | Membuat admin/merchant fokus melengkapi profil. Skor derived dari: jumlah produk aktif, foto produk, deskripsi terisi, response rate ulasan, waktu proses order. View materialized + dashboard widget. |

Item lain yang **🔥 TINGGI tapi effort lebih besar** (skip dulu):
- **Integrasi Midtrans/Xendit** untuk deposit booking → 1–2 hari, butuh secret + webhook + UI konfirmasi.
- **F-12 Onboarding Email Sequence** → butuh email infra Resend + template + cron (~6 jam).
- **F-03 AI Generator Deskripsi Produk** → butuh Lovable AI prompt design (~4 jam, tapi dampaknya sedang).

### C. Urutan eksekusi yang diusulkan

```text
1. Sinkronisasi PRD (5 item ✅)              — 5 menit
2. FA-02 Filter Ukuran & Warna               — quick win, dampak fashion
3. Pre-Order Mode                            — kolom DB sudah siap, tinggal UI
4. Galeri Before/After                       — extend portfolio yang ada
5. Custom Order Form                         — generic untuk banyak kategori
6. Health Score Toko                         — admin tooling, deferred-low
```

Tiap item:
- Migrasi DB (jika perlu) → konfirmasi → kode UI → update bagian PRD terkait jadi ✅ dengan referensi file/tabel + entri Sprint 13 di Log Pengembangan.
- Verifikasi build sebelum lanjut item berikutnya.

### D. Detail teknis ringkas per item

**FA-02 Filter Ukuran & Warna**
- Tidak perlu migrasi (pakai `menu_items.attributes` jsonb yang sudah ada).
- Tambah panel filter sidebar di `toko.$slug.tsx` — extract unique values dari `attributes.size` & `attributes.color`, multi-select, filter client-side.

**Galeri Before/After**
- Migrasi: `ALTER TABLE portfolio_items ADD COLUMN before_image_url text, ADD COLUMN after_image_url text, ADD COLUMN comparison_mode boolean DEFAULT false`.
- UI slider react-compare-slider di `pos-app.portfolio.tsx` (upload) + `toko.$slug.tsx` portfolio section (display).

**Custom Order Form**
- Migrasi: tabel `custom_order_requests` (shop_id, customer_user_id, customer_name, contact, brief, budget_min, budget_max, deadline_at, attachments jsonb, status, created_at).
- Toggle per produk: `accepts_custom_order boolean` di `menu_items`.
- Halaman publik `/toko/:slug/custom-order` + panel POS `/pos-app/custom-orders`.

**Pre-Order Mode**
- Migrasi: tambah `pre_order_open_at`, `pre_order_close_at`, `pre_order_estimated_ship_at`, `pre_order_min_qty`, `pre_order_current_qty` ke `menu_items`.
- Panel POS `/pos-app/pre-orders` + badge di halaman produk + countdown + auto-aktivasi `is_available` saat `open_at` tercapai (cron harian).

**Health Score Toko**
- Migrasi: view `shop_health_scores` (computed score per shop) atau tabel materialized di-refresh harian.
- Komponen admin di `/admin/toko` (kolom skor + breakdown) + widget di `/pos-app` (skor + 3 tindakan top untuk naikkan skor).

### E. Yang TIDAK dikerjakan di plan ini (tetap di backlog)

- KL-01 / JU-01 booking publik per kategori klinik/jasa umum — sebenarnya sudah pakai infra booking generik G-1, tinggal kategori toggle di admin (SA-05).
- SA-01 onboarding email, F-10 BNPL, F-09 Live streaming, F-11 mobile app — effort besar, akan dijadwalkan sprint terpisah.
- Integrasi Midtrans/Xendit deposit — perlu user explicit approval karena butuh akun gateway.

Setelah plan ini disetujui, eksekusi langsung dari item #1 ke #6 berurutan.