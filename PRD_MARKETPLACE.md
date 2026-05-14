# PRD — UMKMgo / KopiHub
## Platform Marketplace & POS Multi-Kategori untuk UMKM Indonesia
**Versi:** 6.1 | **Diperbarui:** 14 Mei 2026 | **Status:** Living Document — Satu-satunya sumber kebenaran

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

## 📊 RINGKASAN STATUS FITUR — AUDIT CODEBASE (15 Mei 2026)

> Cross-check langsung antara PRD dan 226+ file route di `artifacts/kopihub/src/routes/`. ✅ = route/komponen ada · ⚠️ = parsial / DB belum migrate · ❌ = belum dibangun

### ✅ SUDAH SELESAI (P1 & P2 — Semua Lengkap)

| Kode | Fitur | Route / File |
|---|---|---|
| R-07 | Reservasi Meja customer-facing | `toko.$slug.reservasi.tsx`, `pos-app.reservasi.tsx` |
| R-09 | Menu Paket / Combo Builder | `pos-app.combo-builder.tsx` |
| R-10 | Informasi Nutrisi | Field `nutrition_info jsonb` di menu editor |
| R-11 | Kitchen Load Monitor | `pos-app.kitchen-load.tsx` |
| PD-06 | Update Versi Produk Digital | `pos-app.digital-version.tsx` |
| FA-03 | Panduan Ukuran Interaktif | `pos-app.size-guide.tsx` |
| FA-05 | Lookbook / Foto Model | `pos-app.lookbook.tsx` |
| FA-07 | Notif Restock Ukuran | `pos-app.restock-notify.tsx` |
| BE-04 | Quiz Rekomendasi Produk | `pos-app.skin-quiz.tsx` |
| BE-05 | Klaim Verifikasi | `pos-app.verified-claims.tsx` |
| KL-02 | Anamnesis Digital | `pos-app.anamnesis.tsx` |
| KL-04 | Nomor Antrian Digital | `pos-app.antrian.tsx` |
| KL-05 | Tagihan & Resep Digital | `pos-app.medical-invoice.tsx` |
| KL-07 | Reminder Kontrol Ulang | `pos-app.followup-reminders.tsx` |
| JU-06 | Milestone Tracking | `pos-app.milestones.tsx` |
| JU-07 | Escrow per Milestone | Embedded dalam `pos-app.milestones.tsx` |
| JU-08 | Kontrak Freelance Digital | `pos-app.contracts.tsx` |
| KR-02 | Estimasi Waktu Produksi | Field `production_days` di menu editor |
| KR-03 | Certificate of Authenticity | `pos-app.certificates.tsx` |
| KR-04 | Edisi Terbatas | `pos-app.limited-editions.tsx` |
| KR-05 | Galeri WIP | `pos-app.wip-gallery.tsx` |
| SB-06 | Pengingat Potong Rambut | `pos-app.followup-reminders.tsx` (mode haircut) |
| RT-04 | Hitung Deposit Otomatis | `pos-app.rental-deposit-config.tsx` |
| RT-05 | Perpanjangan Sewa Mandiri | `pos-app.rental-extend.tsx` |
| RT-06 | Checklist Kondisi Rental | `pos-app.rental-checklist.tsx` |
| RT-07 | Billing Denda Keterlambatan | `pos-app.rental-fines.tsx` |
| RT-08 | Syarat & Ketentuan Sewa | `pos-app.rental-tnc.tsx` |
| RT-10 | Notifikasi "Unit Siap Diambil" | `pos-app.rental-unit-ready.tsx` |
| SA-01 | Merchant Onboarding Automation | `admin.onboarding-automation.tsx` |
| SA-03 | Automated Payout Scheduler | `admin.payout-scheduler.tsx` |
| SA-04 | Merchant Tier Program | `admin.merchant-tiers.tsx` |
| SA-06 | Multi-Admin dengan Role | `admin.multi-admin.tsx` |
| SA-07 | Cohort & LTV Analytics | `admin.cohort-analytics.tsx` |
| SA-08 | Data Export / GDPR Tools | `admin.gdpr-tools.tsx` |
| SA-09 | Sandbox / Demo Mode | `admin.sandbox.tsx` |
| SA-11 | Tax Management | `admin.tax-report.tsx` |
| SA-12 | SLA & Response Time Monitor | `admin.sla-monitor.tsx` |
| SA-13 | Affiliate & Partner Management | `admin.affiliate.tsx` |
| ADM-1 | Broadcast Notif ke Pembeli | `admin.broadcast-buyers.tsx` |
| ADM-2 | Kredit Manual & Suspend Pembeli | `admin.buyer-actions.tsx` |
| ADM-3 | Churn Auto Re-engagement | `admin.churn-reengagement.tsx` |
| ADM-4 | Fraud ML Scoring | `admin.fraud-scoring.tsx` |

---

### ⚠️ SEBAGIAN SELESAI (Butuh Tindak Lanjut)

| Kode | Fitur | Masalah | Tindakan |
|---|---|---|---|
| FA-04 | Label "Pre-loved / Second" kondisi A/B/C | UI lengkap, kolom DB `condition_grade` belum di-migrate | Jalankan: `ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS condition_grade text CHECK (condition_grade IN ('A','B','C'));` |
| SB-03 | Durasi layanan berbeda per jenis | Dasar ada, belum per-service granular | Tambah field `duration_minutes` per service item di booking |
| SB-09 | Konfirmasi booking via WA | Hanya tombol manual, belum otomatis | Integrasi WhatsApp Business API / webhook |
| RT-02 | Manajemen armada/unit rental | Dasar ada, belum manajemen kondisi & dokumen unit | Tambah field kondisi unit, log servis, dokumen per unit |

---

### ❌ BELUM DIBANGUN — PRIORITAS SEDANG (Layak Dikerjakan Berikutnya)

| # | Kode | Fitur | Kategori | Prioritas |
|---|---|---|---|---|
| 1 | SF-02 | ✅ Pilih paket sesi foto (Basic / Standard / Premium) | Studio Foto | — | `pos-app.studio-packages.tsx` |
| 2 | SF-04 | Portfolio galeri tampil di halaman publik toko studio foto | Studio Foto | 🔥 TINGGI | |
| 3 | SF-05 | ✅ Upload file hasil foto ke klien via platform (link download) | Studio Foto | — | `pos-app.studio-delivery.tsx` |
| 4 | SF-07 | ✅ Brief form sebelum sesi foto (diisi klien saat booking) | Studio Foto | — | `pos-app.studio-brief.tsx` |
| 5 | SF-03 | Pilih lokasi sesi (studio / outdoor / lokasi klien) | Studio Foto | TINGGI | |
| 6 | SF-08 | Add-on saat booking (editing ekstra, album, dll.) | Studio Foto | SEDANG | |
| 7 | SF-09 | Review dengan foto hasil karya (klien upload) | Studio Foto | TINGGI | |
| 8 | BE-03 | Tag skin type per produk (oily, dry, combination, sensitive) | Skincare | TINGGI | |
| 9 | KL-03 | Rekam medis sederhana per pasien | Klinik | SEDANG | |
| 10 | JU-05 | Deliver hasil kerja via platform (upload file ke klien) | Jasa Digital | TINGGI | |
| 11 | SA-05 | Konfigurasi Booking per Kategori (toggle T3/T4 per kategori) | Super Admin | TINGGI | |

---

### ❌ BELUM DIBANGUN — PRIORITAS 3 (Kompleks / Butuh Infra Eksternal)

| # | Kode | Fitur | Estimasi | Catatan |
|---|---|---|---|---|
| 1 | F-16 | Deposit via Payment Gateway (booking) | 3 hari | Konfirmasi manual ✅ sudah ada |
| 2 | SB-10 | Deposit online via payment gateway (barbershop) | 3 hari | Manual ✅ sudah ada |
| 3 | RT-09 | Deposit rental via payment gateway | 3 hari | Konfigurasi deposit % ✅ sudah ada |
| 4 | F-01 | Group Buy / Patungan | 3 hari | Escrow, batas waktu, refund jika gagal |
| 5 | F-02 | Subscription / Langganan Produk Rutin | 3 hari | Recurring billing & auto-debit |
| 6 | F-06 | Affiliate Program per Toko | 3 hari | Tracking klik, komisi, dashboard afiliator per toko |
| 7 | F-07 | Google Analytics & Meta Pixel Integration | 2 hari | Consent management & iframe safety |
| 8 | F-09 | Live Streaming Commerce | 7+ hari | WebRTC/HLS, infra streaming besar |
| 9 | F-10 | BNPL / Cicilan (Kredivo, Akulaku) | 5 hari | API pihak ketiga, KYC pembeli |
| 10 | F-11 | Mobile App (React Native / Expo) | 3+ minggu | Proyek terpisah |
| 11 | KL-06 | Telemedicine / Konsultasi Video | 5+ hari | WebRTC, rekaman, privasi |
| 12 | SA-10 | A/B Testing Manager | 3 hari | Experiment framework, statistik signifikansi |

---

## 🚦 TABEL FITUR BELUM DIKERJAKAN — DIURUTKAN BERDASARKAN PRIORITAS

> **Terakhir diperbarui:** 14 Mei 2026 (audit ulang vs codebase 226 routes) | Status diverifikasi langsung dari kode. ✅ = sudah ada di kode · ❌ = belum ada · ⚠️ = parsial
>
> **Hasil audit:** Semua item Prioritas 1 & 2 sudah ✅ di kode. Yang tersisa hanya item Prioritas 3 (kompleks/butuh infra eksternal) + FA-04 ⚠️ parsial (UI lengkap, kolom DB belum di-migrate).

### 🔴 PRIORITAS 1 — Tinggi (Impact Besar, Effort Kecil–Sedang, Feasible Sekarang)

| # | Kode | Fitur | Kategori | Metrik | Catatan |
|---|---|---|---|---|---|
| 1 | R-10 | ✅ **Informasi Nutrisi** (kalori, protein, karbohidrat, lemak, serat) per menu item | F&B | Konversi / Trust | Diimplementasi 15 Mei 2026 — form di menu editor + tampilan card di halaman produk. SQL: `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS nutrition_info jsonb;` |
| 2 | KR-02 | ✅ **Estimasi Waktu Produksi** per produk (dalam hari) | Custom/Kerajinan | Konversi | Diimplementasi 15 Mei 2026 — field `production_days` di menu editor + badge biru di halaman produk. SQL: `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS production_days integer;` |
| 3 | R-07 | ✅ **Reservasi Meja customer-facing** dari halaman `/toko/:slug` | F&B | Konversi | Diimplementasi — halaman `/toko/:slug/reservasi` dengan wizard 4 langkah (pilih tanggal, pilih meja dari denah, isi data, konfirmasi). Realtime availability check. |
| 4 | RT-08 | ✅ **Syarat & Ketentuan Sewa** per toko rental (dokumen, denda, deposit) | Rental | Trust / Legal | Diimplementasi 15 Mei 2026 — halaman `/pos-app/rental-tnc` dengan kebijakan kunci (deposit %, denda, durasi min, wajib KTP) + teks T&C lengkap + preview. SQL: `ALTER TABLE coffee_shops ADD COLUMN IF NOT EXISTS rental_tnc text, ADD COLUMN IF NOT EXISTS rental_deposit_pct integer, ...` |
| 5 | RT-04 | ✅ **Hitung Deposit Otomatis Rental** (harga × durasi × %) | Rental | Konversi | Diimplementasi — halaman `/pos-app/rental-deposit-config` dengan konfigurasi deposit % per unit + preview kalkulasi otomatis (daily_price × total_days × deposit_pct). SQL: `ALTER TABLE rental_units ADD COLUMN IF NOT EXISTS deposit_pct numeric, auto_deposit boolean`. Ditambahkan ke sidebar nav. |
| 6 | SA-03 | ✅ **Automated Payout Scheduler** — payout terjadwal tanpa approval manual | Super Admin | Pendapatan | Diimplementasi — halaman `/admin/payout-scheduler` dengan konfigurasi jadwal (harian/mingguan/bulanan), auto-approve di bawah threshold, preview payout eligible per toko. |
| 7 | SA-11 | ✅ **Tax Management** — laporan PPh/PPN format SPT per periode | Super Admin | Compliance | Diimplementasi — halaman `/admin/tax-report` dengan kalkulasi PPN 11% & PPh Final 0.5%, laporan bulanan/kuartalan, export summary. |
| 8 | RT-05 | ✅ **Perpanjangan Sewa Mandiri** oleh penyewa | Rental | Retensi | Diimplementasi — halaman `/pos-app/rental-extend` kelola permintaan perpanjangan dari penyewa aktif. SQL: `ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS extension_requested boolean, extension_days int, extension_status text`. |
| 9 | RT-07 | ✅ **Billing Denda Keterlambatan** (per jam/hari) | Rental | Pendapatan | Diimplementasi — halaman `/pos-app/rental-fines` hitung & tagih denda per hari, input tanggal pengembalian aktual, konfigurasi denda per unit. SQL: `ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS actual_return_date date, fine_total numeric`. |
| 10 | SA-01 | ✅ **Merchant Onboarding Automation** — email sequence Hari 1/3/7 | Super Admin | Retensi | Diimplementasi — halaman `/admin/onboarding-automation` dengan template email Hari 1/3/7/14/30, preview merchant baru, tombol kirim manual. |
| 11 | PD-06 | ✅ **Update Versi Produk Digital** → pembeli lama dapat notifikasi | Digital | Retensi | Diimplementasi 15 Mei 2026 — halaman `/pos-app/digital-version` dengan riwayat versi per produk, upload file, changelog, tombol "Notif Pembeli". Tabel `digital_product_versions`. |
| 12 | R-09 | ✅ **Menu Paket / Combo Builder** F&B | F&B | AOV | Diimplementasi — halaman `/pos-app/combo-builder` dengan builder visual combo F&B, pilih item + jumlah, hitung harga asli vs bundel, diskon %, tag promosi. SQL: `CREATE TABLE fnb_combos (...)`. Ditambahkan ke sidebar nav. |
| 13 | RT-10 | ✅ **Notifikasi "Unit Siap Diambil"** ke penyewa | Rental | UX | Diimplementasi — halaman `/pos-app/rental-unit-ready` kirim notifikasi WA otomatis ke penyewa H-0 & H+1. SQL: `ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS unit_ready_notified boolean`. |
| 13b | A2 | ✅ **Auto-DP (Down Payment) saat Checkout** untuk order yang butuh deposit | Marketplace / Checkout | Konversi / Cashflow | Diimplementasi 14 Mei 2026 — pengaturan DP per toko (`deposit_enabled`, `deposit_percent`, `deposit_min_total`) di `/pos-app/settings`, breakdown DP & sisa pelunasan di halaman checkout, tracking `deposit_amount/balance_due/deposit_paid/balance_paid` di tabel `orders`, aksi "Tandai DP Lunas" + "Tandai Pelunasan" di `/pos-app/marketplace-orders`, status DP/sisa di `/pesanan/$orderId`. SQL: `ALTER TABLE coffee_shops ADD deposit_enabled, deposit_percent, deposit_min_total; ALTER TABLE orders ADD requires_deposit, deposit_amount, deposit_paid, deposit_paid_at, balance_due, balance_paid, balance_paid_at`. |

### 🟡 PRIORITAS 2 — Sedang (Impact Sedang, Effort Sedang, Bisa Dikerjakan Berikutnya)

| # | Kode | Fitur | Kategori | Metrik | Catatan |
|---|---|---|---|---|---|
| 14 | R-11 | ✅ **Kitchen Load Monitor** — estimasi waktu tunggu per pesanan | F&B | UX | Diimplementasi — halaman `/pos-app/kitchen-load` dengan monitor beban dapur realtime per slot waktu, estimasi waktu tunggu, indikator "Padat/Normal/Sepi". Ditambahkan ke sidebar nav F&B. |
| 15 | FA-03 | ✅ **Panduan Ukuran Interaktif** ("Tinggi 165cm → pilih M") | Fashion | Konversi | Diimplementasi — halaman `/pos-app/size-guide` dengan tabel ukuran per kategori produk + kalkulator rekomendasi ukuran berdasarkan tinggi/berat badan. Ditambahkan ke sidebar nav Fashion. |
| 16 | FA-04 | ✅ **Label "Pre-loved / Second"** kondisi A/B/C untuk produk bekas | Fashion | Trust | Diimplementasi — field `condition_grade` (A/B/C) di menu editor dengan selector visual + badge ♻️ di product list + SQL hint. Berlaku untuk semua tipe toko. SQL: `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS condition_grade text CHECK (condition_grade IN ('A','B','C'));` |
| 17 | FA-05 | ✅ **Lookbook / Foto Model** yang pakai produk | Fashion | Konversi | Diimplementasi — halaman `/pos-app/lookbook` dengan upload foto model, tag produk yang dipakai, tampil di halaman toko publik. Ditambahkan ke sidebar nav Fashion. |
| 18 | BE-04 | ✅ **Quiz Rekomendasi Produk** berdasarkan jenis kulit | Skincare | Konversi | Diimplementasi — halaman `/pos-app/skin-quiz` dengan quiz multi-step, mapping jenis kulit → rekomendasi produk, embed di halaman toko. Ditambahkan ke sidebar nav Fashion/Services. |
| 19 | BE-05 | ✅ **Klaim Verifikasi** ("Dermatologically tested") | Skincare | Trust | Diimplementasi — halaman `/pos-app/verified-claims` dengan library klaim terstandar (Dermatologically Tested, Hypoallergenic, dll), badge tampil di halaman produk. Ditambahkan ke sidebar nav Fashion/Services. |
| 20 | KL-02 | ✅ **Anamnesis Digital** sebelum konsultasi klinik | Klinik | UX | Diimplementasi — halaman `/pos-app/anamnesis` dengan form keluhan, riwayat medis, alergi, pre-booking; link dikirim via WA ke pasien. Ditambahkan ke sidebar nav Services. |
| 21 | KL-05 | ✅ **Tagihan & Resep Digital** per pasien | Klinik | UX | Diimplementasi — halaman `/pos-app/medical-invoice` dengan tagihan PDF + resep digital, tanda tangan dokter, riwayat per pasien. Ditambahkan ke sidebar nav Services. |
| 22 | KL-07 | ✅ **Reminder Jadwal Kontrol Ulang** | Klinik | Retensi | Diimplementasi — halaman `/pos-app/followup-reminders` mode "clinic" dengan reminder kontrol X hari setelah kunjungan via WhatsApp. Ditambahkan ke sidebar nav F&B/Services. |
| 23 | JU-06 | ✅ **Milestone Tracking** untuk project jangka panjang | Jasa Digital | Retensi | Diimplementasi — halaman `/pos-app/milestones` dengan milestone per proyek, status tracking (pending/in_progress/delivered/paid/disputed). SQL: `CREATE TABLE project_milestones (...)`. Ditambahkan ke sidebar nav Digital/Services. |
| 24 | JU-07 | ✅ **Escrow per Milestone** — bayar bertahap sesuai progress | Jasa Digital | Trust | Diimplementasi — embedded dalam `/pos-app/milestones`: setiap milestone punya amount, status escrow (locked→delivered→paid), dispute handling. SQL: field `milestones jsonb` per proyek. |
| 25 | JU-08 | ✅ **Kontrak Freelance Digital** | Jasa Digital | Trust | Diimplementasi — halaman `/pos-app/contracts` dengan template kontrak, tanda tangan digital, link per order, riwayat kontrak. Ditambahkan ke sidebar nav Digital/Services. |
| 26 | KR-03 | ✅ **Certificate of Authenticity (COA) Digital** | Kerajinan/Seni | Trust | Diimplementasi — halaman `/pos-app/certificates` dengan COA otomatis per order, QR code verifikasi, cetak PDF, template kustom. Ditambahkan ke sidebar nav Craft. |
| 27 | KR-04 | ✅ **Edisi Terbatas** dengan counter stok visible | Kerajinan | Konversi | Diimplementasi — halaman `/pos-app/limited-editions` dengan label "Limited Edition", counter stok tersisa, countdown timer, badge di marketplace. Ditambahkan ke sidebar nav Fashion/Craft. |
| 28 | KR-05 | ✅ **Galeri Proses Pembuatan** (work-in-progress) | Kerajinan | Trust | Diimplementasi — halaman `/pos-app/wip-gallery` dengan upload foto proses, caption tahapan, tampil di halaman toko. Ditambahkan ke sidebar nav Craft. |
| 29 | SB-06 | ✅ **Pengingat Potong Rambut** — notif 4 minggu setelah kunjungan | Barber/Salon | Retensi | Diimplementasi — halaman `/pos-app/followup-reminders` mode "haircut" dengan default 28 hari, blast WA 1-klik ke pelanggan yang belum kembali. Ditambahkan ke sidebar nav F&B/Services. |
| 30 | SA-06 | ✅ **Multi-Admin Super Admin** (Finance, Support, Content) | Super Admin | Skala | Diimplementasi — halaman `/admin/multi-admin` dengan role Finance/Support/Content, permission matrix, invite via email. |
| 31 | SA-07 | ✅ **Cohort & LTV Analytics** — merchant aktif 3/6/12 bulan | Super Admin | Retensi | Diimplementasi — halaman `/admin/cohort-analytics` dengan cohort chart per bulan registrasi, retensi 3/6/12 bulan, LTV estimasi. |
| 32 | SA-08 | ✅ **Data Export / GDPR Tools** | Super Admin | Compliance | Diimplementasi — halaman `/admin/gdpr-tools` dengan right-to-erasure, data export per user, anonymization, audit log. |
| 33 | SA-09 | ✅ **Sandbox / Demo Mode** | Super Admin | Akuisisi | Diimplementasi — halaman `/admin/sandbox` dengan mode demo, seed data dummy per kategori, reset sandbox, onboarding calon merchant. |
| 34 | SA-12 | ✅ **SLA & Response Time Monitor** | Super Admin | Kualitas | Diimplementasi — halaman `/admin/sla-monitor` dengan uptime chart 30 hari, P50/P95 response time, alert threshold, status per endpoint. |
| 35 | SA-13 | ✅ **Affiliate & Partner Management** | Super Admin | Pendapatan | Diimplementasi — halaman `/admin/affiliate` dengan tracking link unik per afiliator, klik & konversi, komisi, dashboard payout. |
| 36 | ADM-1 | ✅ **Broadcast Notifikasi ke Pembeli** (terpisah dari merchant) | Super Admin | Retensi | Diimplementasi — halaman `/admin/broadcast-buyers` dengan segmentasi pembeli, composer notifikasi push/email, preview, schedule kirim. |
| 37 | ADM-2 | ✅ **Kredit Manual & Suspend Pembeli** | Super Admin | Kontrol | Diimplementasi — halaman `/admin/buyer-actions` dengan kredit manual, suspend akun, catatan alasan, audit trail tindakan admin. |
| 38 | ADM-3 | ✅ **Churn Auto Re-engagement** — email otomatis jika tidak login 14 hari | Super Admin | Retensi | Diimplementasi — halaman `/admin/churn-reengagement` dengan daftar merchant tidak aktif 14+ hari, template email re-engagement, kirim manual + schedule otomatis. |
| 39 | ADM-4 | ✅ **Fraud ML Scoring** 0–100 per transaksi | Super Admin | Keamanan | Diimplementasi — halaman `/admin/fraud-scoring` dengan skor risiko 0–100 per transaksi berdasarkan sinyal (kecepatan, geo, pattern), filter threshold, tindakan blokir/review. |
| 39b | FA-04 | ⚠️ **Label "Pre-loved / Second"** kondisi A/B/C untuk produk bekas | Fashion | Trust | UI sudah lengkap di `pos-app.menu.tsx` (selector kondisi A/B/C baris 806–835, badge ♻️ di product list baris 1033–1036, query SELECT & UPDATE sudah include `condition_grade`). **Yang kurang:** kolom DB belum ada — perlu jalankan `ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS condition_grade text CHECK (condition_grade IN ('A','B','C'));`. SQL hint sudah ditampilkan di UI bagi user. |

### 🟢 PRIORITAS 3 — Masa Depan (Kompleks, 3+ Hari, atau Butuh Infrastruktur Eksternal)

| # | Kode | Fitur | Estimasi | Catatan |
|---|---|---|---|---|
| 40 | F-16 | **Deposit via Payment Gateway** (Midtrans/Xendit) untuk Booking | 3 hari | Butuh merchant setup gateway key; konfirmasi manual ✅ sudah ada |
| 41 | F-01 | **Group Buy / Patungan** | 3 hari | Kompleks: escrow, batas waktu, refund jika gagal |
| 42 | F-02 | **Subscription / Langganan Produk Rutin** | 3 hari | Butuh recurring billing & auto-debit |
| 43 | F-06 | **Affiliate Program per Toko** | 3 hari | Tracking klik unik, komisi, dashboard afiliator |
| 44 | F-07 | **Google Analytics & Meta Pixel Integration** | 2 hari | Perlu consent management & iframe safety |
| 45 | F-09 | **Live Streaming Commerce** | 7+ hari | Infrastruktur streaming besar, WebRTC/HLS |
| 46 | F-10 | **BNPL / Cicilan** (Kredivo, Akulaku) | 5 hari | Integrasi API pihak ketiga, KYC pembeli |
| 47 | F-11 | **Mobile App** (React Native / Expo) | 3+ minggu | Proyek besar tersendiri |
| 48 | KL-06 | **Telemedicine / Konsultasi Video** | 5+ hari | WebRTC, rekaman, privacy |
| 49 | SA-10 | **A/B Testing Manager** | 3 hari | Experiment framework, statistik signifikansi |

---

## RINGKASAN EKSEKUTIF

Platform ini sudah sangat kuat dari sisi infrastruktur. **~90% fitur inti (P1 & P2) sudah ada di kode** — audit 14 Mei 2026 memverifikasi seluruh 39 item Prioritas 1 & 2 punya route + UI fungsional di `artifacts/kopihub/src/routes/`. Yang benar-benar belum ada hanya item Prioritas 3 (kompleks/infra eksternal) + verifikasi field `condition_grade` (FA-04). Gap terbesar bukan di fitur yang rumit, tapi di pengalaman pengguna yang lengkap:

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
| **Reschedule mandiri** | ✅ Selesai Sprint 14 — tombol "Pindah Jadwal" + dialog pilih slot + RPC atomik |
| **Paket layanan (Basic/Premium/add-on)** | ✅ Selesai Sprint 14 — tabel `booking_service_packages` + `booking_addons`; wizard booking publik step paket |
| **Deposit via payment gateway** | ❌ Belum — gateway Midtrans/Xendit (konfirmasi manual ✅) |
| **Catatan pelanggan per kunjungan** | ✅ Selesai — inline edit `merchant_notes` di POS booking card |
| **Review post-booking (H+1 otomatis)** | ✅ Selesai Sprint 15 — Edge Function + pg_cron + funnel analitik |
| **Kalender sync (export .ics)** | ✅ Selesai — tombol "Tambah ke Kalender" di riwayat booking pelanggan |

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
| **Reschedule mandiri booking oleh pelanggan** | ✅ Selesai Sprint 14 — tombol "Jadwalkan Ulang" di riwayat booking + RPC atomik | — |
| **Paket & add-on saat booking** (Basic/Standard/Premium) | ✅ Selesai Sprint 14 — step paket di wizard booking publik | — |
| **Deposit booking via payment gateway** | ❌ Belum (konfirmasi manual ✅) | 🔥 TINGGI |
| **Upload dokumen (KTP/SIM) saat booking rental** | ✅ Selesai Sprint 18 — Supabase Storage bucket `booking-documents` | — |
| **Galeri portofolio terintegrasi di halaman publik toko** | ✅ Selesai — `PortfolioGallery` tampil di `/toko/:slug` dengan lightbox + before/after | — |
| **Catatan pelanggan per kunjungan** (riwayat layanan) | ✅ Selesai — inline `merchant_notes` edit di POS booking card | — |
| **Review post-booking otomatis H+1** | ✅ Selesai Sprint 15 — Edge Function + pg_cron + funnel analitik | — |
| **Dashboard POS** date range picker kustom | ✅ Ada — filter dari/sampai bebas + shortcut 7h/30h/90h di booking-analytics | — |
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
| 14 Mei 2026 | Sprint 14 | **Filter POS Sidebar per Kategori** — `deriveCategoryType()` + `onlyFor` per nav item; nav difilter otomatis sesuai kategori toko (FNB/fashion/digital/services/craft) | ✅ |
| 14 Mei 2026 | Sprint 14 | **Homepage Dynamic Category Filter** — chip filter kategori + badge jumlah toko + sort by count di beranda marketplace | ✅ |
| 14 Mei 2026 | Sprint 14 | **M-04 Reschedule Booking Mandiri** — dialog pilih slot baru + update slot_id di `bookings`; tombol "Jadwalkan Ulang" di riwayat booking akun pelanggan | ✅ |
| 14 Mei 2026 | Sprint 14 | **M-20/PD-08 Halaman Produk Digital** — `/akun/digital-products`; list order_items digital + download link + detail pesanan; ditambahkan ke nav akun | ✅ |
| 14 Mei 2026 | Sprint 14 | **M-18 Review Post-Booking** — tabel `booking_reviews`; form ulasan inline (bintang + teks) di riwayat booking pelanggan; panel merchant `/pos-app/booking-reviews` + tombol "Minta Ulasan via WA" | ✅ |
| 14 Mei 2026 | Sprint 15 | **M-18a Auto-Trigger H+1** — Edge Function `send-review-requests`; kolom `review_request_sent_at` di `bookings`; tabel `booking_review_requests`; pg_cron harian 09:00 WIB; banner + highlight card amber di `akun.bookings.tsx`; panel analitik konversi funnel (terkirim → dibuka → diulas) + breakdown bulanan di `pos-app.booking-reviews.tsx` | ✅ |
| 14 Mei 2026 | Sprint 15 | **M-18b Notif Score** — kolom `resend_count` + `is_unresponsive` di `booking_review_requests`; tombol "Kirim Ulang Notif" dengan counter (1/3, 2/3, 3/3); setelah 3 ulang notif tanpa respons sistem otomatis menandai booking sebagai "Tidak Responsif" (badge merah) dan memblokir pengiriman selanjutnya; toast peringatan saat batas tercapai | ✅ |
| 14 Mei 2026 | Sprint 16 | **Sertifikat Toko Terpercaya** — `TrustCertBadge` + `TrustCertCard` + `TrustCertProgress` shared components; kriteria otomatis: avg_rating ≥ 4.5, ≥ 50 ulasan, reply_rate > 80%; badge tampil di `/toko/:slug` (header + panel detail), `/leaderboard` (podium + list), `/pos-app/reviews` (progress bar owner); SQL migration `fase6_trust_cert.sql` dengan trigger auto-update per review insert/update | ✅ |
| 14 Mei 2026 | Sprint 16 | **Tab "Tidak Responsif" + Auto-Blacklist Reset** — tab filter ke-4 di `/pos-app/booking-reviews`; stat card unresponsive yang clickable; banner konteks segmen; settings panel: cooldown selector (15/30/60/90 hari), toggle auto-reset saat page load, tombol bulk reset eligible; tombol "Reset Blacklist" per-booking di kartu individual | ✅ |
| 14 Mei 2026 | Sprint 16 | **M-18c Analitik Pembeli Booking** — `/pos-app/customer-analytics`; 5 segmen otomatis: Pelanggan Setia / Pelanggan Baru / Perlu Diaktivasi / Churn Risk / Tidak Responsif; KPI cards (total pembeli, setia, churn risk, tidak responsif); breakdown bar distribusi segmen; tabel sortable (booking, nilai, terakhir booking); expand per-baris untuk detail + tip + tombol WA reaktivasi/win-back; export CSV | ✅ |
| 14 Mei 2026 | Sprint 17 | **M-09 Flash Sale Terjadwal (customer-facing)** — skema sudah ada (`flash_price`, `flash_starts_at`, `flash_ends_at` di `menu_items`, migration `fase4_promo_notif.sql`); POS management `pos-app.flash-sale.tsx` complete; customer-facing: `FlashSaleBanner` + live countdown di halaman detail produk; section Flash Sale di homepage marketplace; badge harga flash + diskon% di `ProductCard` (import dari `index.tsx`) di seluruh grid produk; shop page sudah fetch kolom flash | ✅ |
| 14 Mei 2026 | Sprint 17 | **M-10 Bundling Produk (customer-facing)** — skema sudah ada (`item_type='bundle'` di `menu_items`, tabel `bundle_items`, migration `fase3_bundle.sql`); POS management `pos-app.bundles.tsx` complete; customer-facing: tambah `item_type` ke SELECT di `toko.$slug.tsx`; section "Paket Hemat" terpisah dengan `BundleCard` (badge PAKET ungu) di halaman toko; komponen `BundleContents` di halaman detail produk bundle (daftar isi paket + thumbnail + qty + perbandingan harga satuan) | ✅ |
| 14 Mei 2026 | Sprint 18 | **M-07 Cart Upsell Extension** — `CartUpsell` + `CartUpsellCard` di `keranjang.tsx`; query `order_items` co-purchase data untuk item di keranjang; 1-klik add upsell suggestions di bawah daftar item keranjang | ✅ |
| 14 Mei 2026 | Sprint 18 | **Bandingkan Harga Floating Bar** di `toko.$slug.tsx` — `CompareToggleButton` overlay ⚖ di setiap kartu produk (max 3); `CompareFloatingBar` fixed bottom dengan slot thumbnail + counter + tombol Bandingkan; `CompareModal` Dialog side-by-side: harga (label "Termurah"), rating (label "Tertinggi"), stok, isi paket (bundle) + aksi "Beli Sekarang" + "Lihat Detail" per kolom; scoped ke toko aktif (tidak konflik dengan `/bandingkan`) | ✅ |
| 14 Mei 2026 | Sprint 18 | **M-13 Preview Produk Digital** — `DigitalPreview` component di `toko.$slug.produk.$productId.tsx`; gambar preview dengan overlay watermark + ikon kunci + teks "Preview — Beli untuk akses penuh"; hanya tampil untuk `item_type='digital'` | ✅ |
| 14 Mei 2026 | Sprint 18 | **M-16 Upload Dokumen KTP/SIM Booking Rental** — step "Dokumen" di wizard booking publik untuk kategori rental (T4); upload ke Supabase Storage bucket `booking-documents`; kolom `document_url` + `document_type` di tabel `bookings`; hanya tampil jika `shop.require_id_upload = true`; preview thumbnails + hapus + validasi ukuran 5MB | ✅ |
| 14 Mei 2026 | Sprint 19 | **F-03 AI Generator Deskripsi Produk + Batch Generate** — backend `POST /api/ai/generate-description` via Google Gemini 1.5 Flash (gratis); tombol "✨ Buat dengan AI" per produk di form tambah/edit menu (nama + foto → deskripsi 2-3 kalimat + tag SEO chips klik-untuk-salin); **Batch Generate**: tombol "✨ Generate Massal (N)" di header halaman Menu menampilkan jumlah produk tanpa deskripsi, dialog konfirmasi + estimasi waktu + progress bar realtime + counter berhasil/gagal + tombol batalkan + delay 4 detik antar request (Gemini rate limit); panel Super Admin `/admin/ai-settings` — input API key masked + uji koneksi langsung ke Gemini + toggle aktif/nonaktif fitur untuk semua merchant + panduan setup; key disimpan di `platform_settings` tabel dengan key `ai_settings` | ✅ |
| 14 Mei 2026 | Sprint 20 | **CSV Export Analitik Booking** — tombol "Ekspor CSV" di header `/pos-app/booking-analytics`; ekspor semua booking dalam rentang tanggal aktif ke file `.csv` dengan kolom: ID, Status, Layanan, Tanggal Slot, Jam, Harga, DP, Status DP, Dibuat; BOM UTF-8 agar Excel/Spreadsheet bisa membaca karakter Indonesia | ✅ |
| 14 Mei 2026 | Sprint 20 | **Kalender Sync (Export .ics)** — tombol "Tambah ke Kalender" di riwayat booking pelanggan (`/akun/bookings`) untuk setiap booking mendatang (pending/confirmed); generate file iCal standar (RFC 5545) dengan DTSTART, DTEND, SUMMARY, LOCATION; langsung download ke perangkat; kompatibel Google Calendar, Apple Calendar, Outlook | ✅ |
| 14 Mei 2026 | Sprint 20 | **SB-07 Catatan Kunjungan Merchant** — inline edit `merchant_notes` di setiap booking card di `/pos-app/booking`; klik untuk aktifkan textarea + simpan/batal; tersimpan di kolom `merchant_notes` tabel `bookings` (migrasi SQL satu baris disertakan sebagai komentar); hanya terlihat oleh merchant, tidak ditampilkan ke pelanggan | ✅ |

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
| **Reschedule mandiri oleh pembeli** | ✅ Selesai Sprint 14 |
| **Paket layanan + add-on saat booking** | ✅ Selesai Sprint 14 |
| **Deposit via payment gateway (Midtrans/Xendit)** | ❌ Belum — gateway belum; konfirmasi manual ✅ |
| **Upload dokumen (KTP/SIM) untuk rental** | ✅ Selesai Sprint 18 — step "Dokumen" di wizard booking; Supabase Storage `booking-documents` |
| **Checklist kondisi sebelum/sesudah rental** | ✅ Selesai Sprint 19 — `pos-app.rental-checklist.tsx`; foto kerusakan + tanda tangan canvas |
| **Review post-booking (notif H+1 otomatis)** | ✅ Selesai Sprint 15 |
| **Kalender sync / export .ics** | ✅ Selesai — tombol di riwayat booking pelanggan; format iCal standar |
| **Catatan pelanggan per kunjungan** | ✅ Selesai — inline merchant notes di POS booking card |
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
| M-02 | **Portofolio / Galeri Karya** di halaman publik toko | Jasa/Kreatif | Kepercayaan | ✅ Selesai |
| M-03 | **Reminder Booking Otomatis** H-1 dan H-3 | Jasa T3&T4 | Retensi | ✅ Selesai |
| M-04 | **Reschedule Booking Mandiri** | Pembeli | UX | ✅ Selesai |
| M-05 | **Perbandingan Produk** | Pembeli | Konversi | ✅ Selesai |
| M-06 | **Return Self-Service** | Pembeli | Kepercayaan | ✅ Selesai |
| M-07 | **Upselling Engine** ("Sering dibeli bersama") | Merchant | AOV | ✅ Selesai |
| M-08 | **Harga Grosir / Bulk Pricing** | Merchant | Pendapatan | ✅ Selesai |
| M-09 | **Cek Ketersediaan Unit Rental** real-time | Rental T4 | Konversi | ✅ Selesai |
| M-10 | **Deposit Booking Online** | Jasa/Rental | Komitmen | ✅ Manual · ❌ Gateway belum |
| M-11 | **Happy Hour / Time-based Pricing** | F&B | Pendapatan | ✅ Selesai |
| M-12 | **Waitlist Virtual** | F&B/Jasa | Retensi | ✅ Selesai |
| M-13 | **Preview Produk Digital** (watermarked sample) | Digital T2 | Konversi | ✅ Selesai Sprint 18 |
| M-14 | **Cashback Wallet** | Pembeli | Retensi | ✅ Selesai |
| M-15 | **Katalog PDF / Link Shareable** | Merchant | Pemasaran | ✅ Selesai |
| M-VB | **Voucher Khusus Booking** | Jasa T3 | Konversi | ✅ Selesai |
| M-16 | **Upload Dokumen KTP/SIM saat Booking Rental** | Rental T4 | Legal/UX | ✅ Selesai Sprint 18 |
| M-17 | **Paket Layanan + Add-on saat Booking** | Jasa T3 | AOV | ✅ Selesai |
| M-18 | **Review Post-Booking Otomatis H+1** | Jasa T3&T4 | Kepercayaan | ✅ Selesai |
| M-19 | **Galeri Portofolio tampil di halaman publik /toko/:slug** | Jasa/Kreatif | Kepercayaan | ✅ Selesai |
| M-20 | **Halaman Produk Digital di Akun** (`/akun/digital-products`) | Digital T2 | UX | ✅ Selesai |
| M-21 | **Sertifikat Toko Terpercaya** — badge otomatis (rating ≥ 4.5, ≥ 50 ulasan, reply > 80%) | Merchant | Kepercayaan | ✅ Selesai Sprint 16 |
| M-22 | **Tab Tidak Responsif + Auto-Blacklist Reset** — cooldown selector, toggle auto-reset, bulk/individual reset | Jasa T3&T4 | Retensi | ✅ Selesai Sprint 16 |
| M-18c | **Analitik Pembeli Booking** — 5 segmen (Setia/Baru/Perlu Aktivasi/Churn Risk/Tidak Responsif) + WA reaktivasi + export CSV | Jasa T3&T4 | Retensi | ✅ Selesai Sprint 16 |

### 🟢 Masa Depan (Dampak Besar, Effort Besar — 3+ hari)

| # | Fitur | Estimasi | Status |
|---|---|---|---|
| F-01 | Group Buy / Patungan | 3 hari | ❌ |
| F-02 | Subscription / Langganan Produk Rutin | 3 hari | ❌ |
| F-03 | AI Generator Deskripsi Produk (foto → nama + deskripsi + tag) + **Batch Generate** | 2 hari | ✅ Selesai Sprint 19 |
| F-04 | Pre-Order Mode | 2 hari | ✅ Selesai Sprint 13 |
| F-05 | Custom Order Form | 2 hari | ✅ Selesai Sprint 13 |
| F-06 | Affiliate Program per Toko | 3 hari | ❌ |
| F-07 | Google Analytics & Meta Pixel Integration | 2 hari | ❌ |
| F-08 | Rating Pembeli 2-Way | 2 hari | ✅ Selesai — tab "Rating Pembeli" di /pos-app/reviews; merchant nilai buyer 1–5★ + komentar per pesanan; buyer lihat reputasinya di /akun; SQL migration f08_buyer_ratings.sql |
| F-09 | Live Streaming Commerce | 7+ hari | ❌ |
| F-10 | BNPL / Cicilan (Kredivo, Akulaku) | 5 hari | ❌ |
| F-11 | Mobile App (React Native / Expo) | 3+ minggu | ❌ |
| F-12 | Merchant Onboarding Email Sequence | 2 hari | ❌ |
| F-13 | Platform Health Score per Toko | 2 hari | ✅ Selesai Sprint 13 |
| F-14 | Automated Payout Scheduler | 2 hari | ❌ |
| F-15 | Multi-Admin Super Admin (Finance/Support/Content) | 2 hari | ❌ |
| F-16 | Deposit via Payment Gateway (Midtrans/Xendit) untuk Booking | 3 hari | ❌ |
| F-17 | Reschedule Mandiri Booking | 2 hari | ✅ Selesai — tombol "Pindah Jadwal" di booking confirmed + dialog pilih slot + atomic RPC + log histori |
| F-18 | Antrean Digital Klinik (nomor antrian + estimasi tunggu) | 2 hari | ✅ Selesai — sesi antrian per loket + board nomor aktif + estimasi tunggu + tambah manual + link publik walk-in |
| F-19 | Checklist Kondisi Rental (sebelum & sesudah) | 2 hari | ✅ Selesai — form checklist per item + foto kerusakan + tanda tangan digital (canvas) + cetak PDF + riwayat |
| F-20 | Lisensi & Limit Download Produk Digital | 2 hari | ✅ Selesai — license key otomatis per pembelian, tipe lisensi personal/komersial/extended, server-side tracking, dashboard merchant + reset/revoke, update download page |
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
| R-07 | Reservasi Meja dari marketplace | ✅ `toko.$slug.reservasi.tsx` + `pos-app.reservasi.tsx` | — |
| R-08 | Pre-Order Katering (tanggal + waktu) | ✅ Pre-order mode | — |
| R-09 | Menu Paket / Combo Builder | ✅ `pos-app.combo-builder.tsx` | — |
| R-10 | Informasi Nutrisi (kalori, protein, lemak) | ✅ Field `nutrition_info` di menu editor | — |
| R-11 | Kitchen Load Monitor (estimasi tunggu) | ✅ `pos-app.kitchen-load.tsx` | — |
| R-12 | Split bill per orang | ✅ | — |

**F&B tidak membutuhkan:** Pilih staff, kalender booking sesi, upload KTP, checklist kondisi, file delivery.

### 6.2 Produk Digital (Tipe 2)

> **Alur utama:** Upload file → pembeli beli → auto-deliver → download. Tidak ada pengiriman fisik, tidak ada booking, tidak ada stok.

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| PD-01 | Upload produk digital (zip, pdf, mp4, dll.) | ✅ | — |
| PD-02 | Auto-delivery file setelah pembayaran | ✅ | — |
| PD-03 | Preview watermarked (sample sebelum beli) | ✅ Selesai Sprint 18 — `DigitalPreview` component dengan overlay watermark | — |
| PD-04 | Lisensi produk (personal use vs. commercial) | ✅ Selesai Sprint 19 — `pos-app.digital-licenses.tsx`; license key otomatis per pembelian, tipe lisensi | — |
| PD-05 | Limit download per lisensi (anti-sharing) | ✅ Selesai Sprint 19 — server-side tracking via `pos-app.digital-licenses.tsx` | — |
| PD-06 | Update versi → pembeli lama dapat notif | ✅ `pos-app.digital-version.tsx` | — |
| PD-07 | Kode aktivasi / serial key untuk software | ✅ Selesai Sprint 19 — `pos-app.digital-licenses.tsx` | — |
| PD-08 | Halaman `/akun/digital-products` (riwayat + download) | ✅ Selesai Sprint 14 — `akun.digital-products.tsx` | — |
| PD-09 | Kursus online dengan progress tracking | ✅ Selesai — `pos-app.kursus.tsx` (927 baris); manajemen kursus + modul + lesson + enrollment | — |

**Produk Digital tidak membutuhkan:** Alamat pengiriman, kurir, stok fisik, KDS, booking jadwal.

### 6.3 Barbershop & Salon (Tipe 3 — Booking Sesi)

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| SB-01 | Booking layanan per slot waktu | ✅ | — |
| SB-02 | Pilih stylist/barber spesifik | ✅ | — |
| SB-03 | Durasi layanan berbeda per jenis | ⚠️ Dasar ada | TINGGI |
| SB-04 | Galeri hasil karya (before/after foto) | ✅ Selesai — `PortfolioGallery` tampil di `/toko/:slug` dengan lightbox + `BeforeAfterSlider` | — |
| SB-05 | Membership / Paket Langganan (10 potong bayar 8) | ✅ Shop membership | SEDANG |
| SB-06 | Pengingat potong rambut (notif 4 minggu setelah kunjungan) | ✅ `pos-app.followup-reminders.tsx` (mode haircut) | — |
| SB-07 | Catatan pelanggan per kunjungan | ✅ Selesai Sprint 20 — inline merchant notes edit di POS booking card | — |
| SB-08 | Reschedule mandiri oleh pelanggan | ✅ Selesai Sprint 14 | — |
| SB-09 | Konfirmasi booking via WA otomatis | ⚠️ Tombol manual ada | TINGGI |
| SB-10 | Deposit online via payment gateway | ❌ (konfirmasi manual ✅) | SEDANG |
| SB-11 | Review post-booking otomatis H+1 | ✅ Selesai Sprint 15 | — |

### 6.4 Rental Mobil, Motor, Alat Camping (Tipe 4 — Booking Rental)

> **Alur utama:** Pilih unit → pilih tanggal mulai-selesai → cek ketersediaan → upload KTP/SIM → deposit → konfirmasi → ambil → gunakan → kembalikan → settlement.

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| RT-01 | Kalender ketersediaan per unit (date-range) | ✅ | — |
| RT-02 | Manajemen armada/unit (ID, foto, kondisi) | ⚠️ Dasar ada | TINGGI |
| RT-03 | Upload dokumen (KTP/SIM) saat booking | ✅ Selesai Sprint 18 | — |
| RT-04 | Hitung deposit otomatis (nilai × durasi) | ✅ `pos-app.rental-deposit-config.tsx` | — |
| RT-05 | Perpanjangan sewa mandiri | ✅ `pos-app.rental-extend.tsx` | — |
| RT-06 | Checklist kondisi sebelum/sesudah sewa | ✅ `pos-app.rental-checklist.tsx` | — |
| RT-07 | Billing denda keterlambatan (per hari) | ✅ `pos-app.rental-fines.tsx` | — |
| RT-08 | Syarat & ketentuan per kategori (T&C digital) | ✅ `pos-app.rental-tnc.tsx` | — |
| RT-09 | Deposit via payment gateway | ❌ (konfirmasi manual ✅) | P3 |
| RT-10 | Notifikasi "Unit siap diambil" | ✅ `pos-app.rental-unit-ready.tsx` | — |

**Rental tidak membutuhkan:** Pilih staff, slot jam, KDS, kasir F&B, daftar menu.

### 6.5 Studio Foto & Fotografer (Tipe 3 + Tipe 2)

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| SF-01 | Booking sesi foto publik | ✅ | — |
| SF-02 | Pilih paket sesi (Basic 1 jam, Standard, Premium) | ✅ `pos-app.studio-packages.tsx` — CRUD paket + tampil di booking | — |
| SF-03 | Pilih lokasi (studio, outdoor, lokasi klien) | ❌ Belum dibangun | TINGGI |
| SF-04 | Portofolio galeri tampil di halaman publik | ✅ `pos-app.portfolio.tsx` + `PortfolioGallery` di toko | — |
| SF-05 | Upload file hasil foto ke klien (link download) | ✅ `pos-app.studio-delivery.tsx` — Drive/WeTransfer link + kirim WA | — |
| SF-06 | Deposit wajib saat booking | ✅ (manual) · ❌ gateway (P3) | — |
| SF-07 | Brief form sebelum sesi | ✅ `pos-app.studio-brief.tsx` — kirim link, klien isi mood/outfit/referensi | — |
| SF-08 | Add-on saat booking (editing ekstra, album, dll.) | ❌ Belum dibangun | SEDANG |
| SF-09 | Review dengan foto hasil karya (klien upload) | ✅ `pos-app.studio-photo-reviews.tsx` · `toko.$slug.ulasan.tsx` · `StudioPhotoReviewsGallery` di halaman toko | — |

### 6.6 Fashion & Pakaian (Tipe 1 + Tipe 5)

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| FA-01 | Size chart per produk | ✅ | — |
| FA-02 | Filter ukuran dan warna di halaman toko | ✅ | — |
| FA-03 | Panduan ukuran interaktif ("Tinggi 165cm → pilih M") | ✅ `pos-app.size-guide.tsx` | — |
| FA-04 | Label "Pre-loved / Second" untuk produk bekas | ⚠️ UI lengkap, perlu migrate kolom DB `condition_grade` | — |
| FA-05 | Lookbook / foto model yang pakai produk | ✅ `pos-app.lookbook.tsx` | — |
| FA-06 | Custom order (warna khusus, ukuran khusus) | ✅ Custom order form | — |
| FA-07 | Notif "Ukuran kamu tersedia lagi" saat restok | ✅ `pos-app.restock-notify.tsx` | — |

### 6.7 Skincare & Kecantikan (Tipe 1)

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| BE-01 | Ingredient list lengkap per produk | ✅ | — |
| BE-02 | Nomor izin BPOM & tanggal kedaluwarsa | ✅ | — |
| BE-03 | Tag skin type: oily, dry, combination, sensitive | ❌ Belum dibangun | TINGGI |
| BE-04 | Quiz rekomendasi produk (jenis kulit) | ✅ `pos-app.skin-quiz.tsx` | — |
| BE-05 | Klaim verifikasi: "Dermatologically tested" | ✅ `pos-app.verified-claims.tsx` | — |
| BE-06 | Bundling skincare routine | ✅ Bundle produk | — |

### 6.8 Klinik & Jasa Kesehatan (Tipe 3)

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| KL-01 | Booking konsultasi dokter/terapis | ✅ Booking sesi ada | — |
| KL-02 | Anamnesis digital sebelum konsultasi | ✅ `pos-app.anamnesis.tsx` | — |
| KL-03 | Rekam medis sederhana per pasien | ❌ Belum dibangun | SEDANG |
| KL-04 | Nomor antrian digital + estimasi waktu tunggu | ✅ `pos-app.antrian.tsx` | — |
| KL-05 | Tagihan & resep digital | ✅ `pos-app.medical-invoice.tsx` | — |
| KL-06 | Telemedicine / konsultasi video | ❌ P3 — WebRTC, infra besar | RENDAH |
| KL-07 | Reminder jadwal kontrol ulang | ✅ `pos-app.followup-reminders.tsx` (mode clinic) | — |

### 6.9 Jasa Digital & Freelancer (Tipe 3 + Tipe 5)

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| JU-01 | Booking konsultasi per jam / per sesi | ✅ Booking sesi ada | — |
| JU-02 | Custom order form (brief klien) | ✅ | — |
| JU-03 | Status history custom order | ✅ | — |
| JU-04 | WA template per perubahan status | ✅ | — |
| JU-05 | Deliver hasil kerja via platform (upload file) | ❌ Belum dibangun | TINGGI |
| JU-06 | Milestone tracking untuk project jangka panjang | ✅ `pos-app.milestones.tsx` | — |
| JU-07 | Escrow per milestone (bayar bertahap sesuai progress) | ✅ Embedded dalam `pos-app.milestones.tsx` | — |
| JU-08 | Kontrak freelance digital | ✅ `pos-app.contracts.tsx` | — |

### 6.10 Kerajinan & Produk Seni (Tipe 1 + Tipe 5)

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| KR-01 | Custom order (spesifikasi warna, ukuran, motif) | ✅ Custom order form | — |
| KR-02 | Estimasi waktu produksi per produk | ✅ Field `production_days` di menu editor | — |
| KR-03 | Certificate of Authenticity (COA) digital | ✅ `pos-app.certificates.tsx` | — |
| KR-04 | Edisi terbatas (limited edition) dengan counter stok | ✅ `pos-app.limited-editions.tsx` | — |
| KR-05 | Galeri proses pembuatan (work-in-progress) | ✅ `pos-app.wip-gallery.tsx` | — |
| KR-06 | Opsi harga grosir / reseller | ✅ Bulk pricing | — |

---

## BAGIAN 7: SUPER ADMIN — BACKLOG

### Yang Perlu Diperbaiki
| Fitur | Masalah | Status |
|---|---|---|
| Broadcast Notifikasi | Hanya ke merchant, belum ke pembeli | ✅ Selesai — `admin.broadcast-buyers.tsx` menangani broadcast khusus ke pembeli terpisah dari merchant |
| Manajemen Pembeli | Hanya lihat data, tidak ada kredit manual | ✅ Selesai — `admin.buyer-actions.tsx` dengan kredit manual, suspend, reset password |
| Churn Analysis | Dashboard ada, tidak ada tindakan otomatis | ✅ Selesai — `admin.churn-reengagement.tsx` dengan auto-kirim email jika tidak login 14 hari |
| Laporan Keuangan | Ada tapi format belum standar akuntansi | ⚠️ Masih perlu format kompatibel Jurnal / Accurate |
| Deteksi Fraud | Hanya rule-based dasar | ✅ Selesai — `admin.fraud-scoring.tsx` dengan skor risiko 0–100 per transaksi (ML-based) |
| Konfigurasi Booking per Kategori | Tidak ada toggle kategori mana yang pakai T3/T4 | ❌ Belum ada — perlu route admin baru |

### Yang Belum Ada
| # | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| SA-01 | ✅ **Merchant Onboarding Automation** | — | Selesai — `admin.onboarding-automation.tsx`: email sequence Hari 1/3/7/14/30, preview merchant baru, kirim manual |
| SA-02 | ✅ **Platform Health Score per Toko** | — | Selesai Sprint 13 |
| SA-03 | ✅ **Automated Payout Scheduler** | — | Selesai — `admin.payout-scheduler.tsx`: jadwal harian/mingguan/bulanan, auto-approve di bawah threshold |
| SA-04 | ✅ **Merchant Tier Program** | — | Selesai — `admin.merchant-tiers.tsx`: Starter → Verified → Top Seller → Elite |
| SA-05 | ❌ **Konfigurasi Booking per Kategori** | TINGGI | Toggle kategori mana yang aktifkan T3/T4, set parameter per kategori — belum ada route admin |
| SA-06 | ✅ **Multi-Admin dengan Role** | — | Selesai — `admin.multi-admin.tsx`: Finance/Support/Content Admin, permission matrix |
| SA-07 | ✅ **Cohort & LTV Analytics** | — | Selesai — `admin.cohort-analytics.tsx`: cohort chart, retensi 3/6/12 bulan, LTV |
| SA-08 | ✅ **Data Export / GDPR Tools** | — | Selesai — `admin.gdpr-tools.tsx`: right-to-erasure, data export, anonymization |
| SA-09 | ✅ **Sandbox / Demo Mode** | — | Selesai — `admin.sandbox.tsx`: seed data dummy per kategori, reset sandbox |
| SA-10 | ❌ **A/B Testing Manager** | P3 | Admin buat eksperimen: versi A vs B, track konversi — butuh experiment framework |
| SA-11 | ✅ **Tax Management** | — | Selesai — `admin.tax-report.tsx`: PPN 11% & PPh Final 0.5%, export summary |
| SA-12 | ✅ **SLA & Response Time Monitor** | — | Selesai — `admin.sla-monitor.tsx`: uptime chart 30 hari, P50/P95 response time |
| SA-13 | ✅ **Affiliate & Partner Management** | — | Selesai — `admin.affiliate.tsx`: tracking link unik, klik & konversi, komisi, payout |

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

---

## BAGIAN 15: POS PANEL PER TIPE BISNIS

> **Masalah Saat Ini:** Semua merchant mendapatkan sidebar POS yang sama persis — 10 grup dengan 70+ menu item. Barbershop melihat menu "Resep & HPP". Rental mobil melihat "KDS Dapur". Ini membingungkan dan tidak profesional.
>
> **Solusi:** Panel POS dikonfigurasi otomatis berdasarkan `business_category` toko. Satu `category_type` → satu set menu yang relevan. Item yang tidak relevan disembunyikan, bukan dihapus.

---

### 15.1 Konsep Implementasi

```
Saat merchant login ke POS:
  1. Baca `coffee_shops.business_category_id`
  2. Join ke `business_categories.category_type` (fnb / booking_session / rental / digital / custom)
  3. Filter NAV_GROUPS berdasarkan `category_type`
  4. Sembunyikan grup/item yang tidak relevan
  5. Tampilkan grup tambahan yang spesifik untuk kategori tersebut

Kode implementasi (pos-app.tsx):
  const shopCategoryType = shop?.category_type ?? "general"
  const visibleGroups = NAV_GROUPS.filter(g => g.showFor.includes(shopCategoryType))
```

---

### 15.2 POS Panel — F&B (Tipe 1A: Restoran, Kafe, Warung)

**Identitas Panel:** Fokus pada kasir cepat, dapur, dan meja. Pesanan masuk dari berbagai sumber dan langsung masuk KDS.

```
SIDEBAR F&B:
├── 🏠 UTAMA
│   ├── Dashboard (omset hari ini, pesanan masuk, meja aktif)
│   └── 🔴 POS Kasir [PROMINENT — akses 1 klik]
│
├── 📋 PESANAN
│   ├── Semua Pesanan (tab: POS / Online / Marketplace)
│   └── 🍳 Kitchen Display (KDS) [tampil menonjol]
│
├── 🍽️ KATALOG & MENU
│   ├── Menu / Produk
│   ├── Kategori Menu
│   ├── Varian (ukuran, topping, level pedas)
│   ├── Bundle / Paket Combo
│   └── Import Menu CSV
│
├── 📦 STOK & DAPUR
│   ├── Stok Terpadu
│   ├── Inventori Bahan Baku
│   ├── Resep & HPP
│   └── Supplier & Purchase Order
│
├── 🪑 MEJA & LAYANAN
│   ├── Manajemen Meja
│   ├── Table Map & QR
│   ├── Reservasi Meja [OPSIONAL — toggle per toko]
│   └── Waitlist Virtual
│
├── 👥 TIM
│   ├── Pegawai & Shift
│   ├── Absensi
│   └── Jadwal Kerja
│
├── 🎯 PELANGGAN & PROMO
│   ├── Database Pelanggan
│   ├── Inbox Chat
│   ├── Promo & Flash Sale
│   ├── Voucher Toko
│   ├── Happy Hour [KHAS F&B]
│   ├── Loyalty & Poin
│   └── Email Marketing (PRO)
│
├── 💰 KEUANGAN & LAPORAN
│   ├── Keuangan & Wallet
│   ├── Laporan Harian (share WA)
│   ├── Laporan Penjualan
│   ├── Profit & Margin (L/R)
│   └── Invoice PDF
│
└── ⚙️ PENGATURAN
    ├── Tampilan Toko (tema, banner)
    ├── QR Code Meja
    ├── Printer Thermal
    ├── Pengaturan Toko
    └── Verifikasi KTP (KYC)

DISEMBUNYIKAN untuk F&B:
  ✗ Booking Jadwal Staff (diganti Reservasi Meja — opsional)
  ✗ Armada / Unit Rental
  ✗ Kalender Ketersediaan Rental
  ✗ Produk Digital
  ✗ Custom Order Form
  ✗ Portofolio Galeri Karya
  ✓ Paket Layanan & Add-on Booking
```

**Dashboard F&B — Widget Utama:**
```
┌─────────────────────────────────────────────────┐
│  Omset Hari Ini        Pesanan Masuk    Meja Aktif │
│  Rp 2.450.000          47 pesanan       8/12 meja  │
│  ↑ 12% vs kemarin      ↑ 5 baru         3 waiting  │
├─────────────────────────────────────────────────┤
│  Top Menu Hari Ini          Stok Kritis           │
│  1. Es Kopi Susu (34)       ⚠ Susu (2 liter)     │
│  2. Nasi Goreng (28)        ⚠ Telur (5 butir)    │
│  3. Roti Bakar (19)                               │
├─────────────────────────────────────────────────┤
│  [Buka Kasir POS]    [Lihat KDS]    [Laporan WA] │
└─────────────────────────────────────────────────┘
```

---

### 15.3 POS Panel — Produk Fisik Non-F&B (Tipe 1B: Fashion, Skincare, Kerajinan, dll.)

**Identitas Panel:** Fokus pada katalog produk, stok, pesanan online, dan pengiriman. Tidak ada dapur, tidak ada meja.

```
SIDEBAR PRODUK FISIK:
├── 🏠 UTAMA
│   ├── Dashboard (penjualan, pesanan, stok menipis)
│   └── POS Kasir [untuk walk-in langsung]
│
├── 📋 PESANAN
│   └── Semua Pesanan (tab: POS Walk-in / Marketplace / Website)
│       [TIDAK ADA KDS]
│
├── 📦 KATALOG & STOK
│   ├── Produk & Katalog
│   ├── Kategori Produk
│   ├── Varian (ukuran, warna, material)
│   ├── Atribut Produk (bahan, ukuran, berat)
│   ├── Bundle / Paket
│   ├── Pre-order Mode [untuk limited drop]
│   ├── Stok Terpadu
│   ├── Import CSV
│   └── Harga Grosir / Bulk Pricing
│
├── 🚚 PENGIRIMAN
│   ├── Delivery & Kurir
│   ├── RajaOngkir
│   └── Label Pengiriman
│
├── 🎯 PELANGGAN & PROMO
│   ├── Database Pelanggan
│   ├── Inbox Chat
│   ├── Promo & Flash Sale
│   ├── Voucher Toko
│   ├── Ulasan Pembeli
│   ├── Q&A Produk
│   ├── Sering Dibeli Bersama [Upsell Engine]
│   ├── Loyalty & Poin
│   └── Email Marketing (PRO)
│
├── 🏪 TAMPILAN TOKO
│   ├── Storefront Builder
│   ├── Katalog Shareable
│   └── Iklan & Promosi
│
├── 💰 KEUANGAN & LAPORAN
│   ├── Keuangan & Wallet
│   ├── Laporan Penjualan
│   ├── Profit & Margin
│   └── Invoice PDF
│
└── ⚙️ PENGATURAN

DISEMBUNYIKAN untuk Produk Fisik Non-F&B:
  ✗ KDS Dapur
  ✗ Manajemen Meja & QR Meja
  ✗ Resep & HPP (hanya ada jika merchant aktifkan)
  ✗ Booking Jadwal Staff
  ✗ Armada Rental
  ✗ Produk Digital
  ✗ Happy Hour (kecuali fashion yang mau promo jam)
```

---

### 15.4 POS Panel — Booking Sesi (Tipe 3: Barber, Salon, Spa, Klinik, Fotografer, Les Privat)

**Identitas Panel:** Booking adalah inti bisnis. Dashboard harus langsung menampilkan jadwal hari ini dan slot yang tersedia/terisi. Tidak ada kasir POS konvensional — transaksi terjadi via booking.

```
SIDEBAR BOOKING SESI:
├── 🏠 UTAMA
│   ├── Dashboard Booking (jadwal hari ini, pending konfirmasi, revenue)
│   └── [TIDAK ADA "POS Kasir" konvensional — hanya Walk-in Booking]
│
├── 📅 BOOKING [GRUP UTAMA — ditaruh paling atas]
│   ├── 🔴 Kalender & Slot [PROMINENT]
│   ├── Booking Masuk (pending → konfirmasi)
│   ├── Riwayat Booking (done / cancelled)
│   ├── Voucher Khusus Booking
│   ├── Analitik Voucher Booking
│   ├── Reminder H-1 / H-3
│   └── Waitlist Virtual
│
├── 💼 LAYANAN & TIM
│   ├── Daftar Layanan (nama, durasi, harga) [bukan "Menu Produk"]
│   ├── Paket Layanan & Add-on [✅ selesai]
│   ├── Staff / Terapis / Fotografer
│   ├── Jadwal Staff (jam tersedia per hari)
│   └── Absensi & Shift
│
├── 🖼️ PORTOFOLIO
│   ├── Galeri Karya / Before-After [KRITIS untuk jasa]
│   └── Kategori Portofolio (mis. Potong / Warna / Waxing)
│
├── 👥 PELANGGAN
│   ├── Database Pelanggan
│   ├── Catatan per Pelanggan (riwayat kunjungan) [❌ belum ada]
│   ├── Inbox Chat
│   ├── Ulasan Pembeli
│   ├── Loyalty Stamp [khas barber/salon]
│   └── Membership / Paket Sesi
│
├── 🎯 PROMO
│   ├── Voucher Toko
│   ├── Flash Sale Layanan
│   └── Iklan & Promosi
│
├── 💰 KEUANGAN & LAPORAN
│   ├── Keuangan & Wallet
│   ├── Laporan Booking (per periode, per staff)
│   ├── Laporan Penjualan
│   └── Invoice PDF
│
└── ⚙️ PENGATURAN BOOKING
    ├── Pengaturan Deposit (% DP, kebijakan refund)
    ├── Kebijakan Pembatalan (H-3/H-1/H-0)
    ├── Min. jam sebelumnya bisa booking
    ├── Maks. hari ke depan yang bisa dibooking
    └── Jam Operasional Toko

DISEMBUNYIKAN untuk Booking Sesi:
  ✗ KDS Dapur
  ✗ Manajemen Meja & QR Meja (kecuali klinik/restoran)
  ✗ Resep & HPP (tidak relevan)
  ✗ Inventori Bahan Baku (tidak relevan)
  ✗ Supplier & Purchase Order
  ✗ RajaOngkir (tidak ada pengiriman)
  ✗ Label Pengiriman
  ✗ Armada / Unit Rental
  ✗ Produk Digital
```

**Dashboard Booking Sesi — Widget Utama:**
```
┌─────────────────────────────────────────────────────────────┐
│  Hari Ini: Senin, 14 Mei 2026                               │
│                                                             │
│  📅 Jadwal Hari Ini          💰 Pendapatan Hari Ini         │
│  12 booking terkonfirmasi    Rp 1.840.000                   │
│   3 pending konfirmasi       ↑ 8% vs minggu lalu            │
│   2 slot masih kosong                                       │
├─────────────────────────────────────────────────────────────┤
│  Booking Berikutnya (Today)                                 │
│  09:00  Andi Saputra     Potong + Creambath   [Reza]        │
│  10:00  Siti Rahayu      Highlight Rambut     [Maya]  DP ✓  │
│  11:00  ——— SLOT KOSONG ———                                 │
│  13:00  Budi Santoso     Shave + Waxing       [Reza]        │
├─────────────────────────────────────────────────────────────┤
│  ⚠ 3 Booking Pending Konfirmasi                             │
│  [Konfirmasi Semua]  [Lihat Detail]  [Tambah Walk-in]       │
└─────────────────────────────────────────────────────────────┘
```

---

### 15.5 POS Panel — Booking Rental (Tipe 4: Rental Mobil, Villa, Pet Hotel, Sewa Alat)

**Identitas Panel:** Armada/unit adalah aset utama. Dashboard menampilkan status unit per hari: tersedia, disewa, dalam perawatan. Booking adalah berdasarkan rentang tanggal, bukan slot jam.

```
SIDEBAR BOOKING RENTAL:
├── 🏠 UTAMA
│   ├── Dashboard Armada (unit tersedia hari ini, sedang disewa, return hari ini)
│   └── Kalender Ketersediaan [overview semua unit]
│
├── 🚗 ARMADA & UNIT [GRUP UTAMA]
│   ├── 🔴 Daftar Armada / Unit [PROMINENT]
│   │    (nama, foto, kondisi, harga/hari, status, nomor polisi/ID unit)
│   ├── Kalender Ketersediaan (per unit, per tanggal)
│   ├── Cek Ketersediaan Real-time
│   └── Kondisi & Perawatan Unit [❌ belum ada]
│
├── 📅 BOOKING RENTAL
│   ├── Booking Masuk (pending → konfirmasi)
│   ├── Booking Aktif (sedang disewa)
│   ├── Return Hari Ini
│   ├── Riwayat Booking
│   ├── Checklist Sebelum/Sesudah [❌ belum ada]
│   └── Dokumen Pelanggan (KTP/SIM uploaded) [❌ belum ada]
│
├── 👥 PELANGGAN
│   ├── Database Pelanggan
│   ├── Riwayat Sewa per Pelanggan
│   ├── Inbox Chat
│   └── Ulasan
│
├── 💰 KEUANGAN & LAPORAN
│   ├── Keuangan & Wallet
│   ├── Laporan Pendapatan per Unit
│   ├── Laporan Utilisasi Armada (hari tersewa / hari tersedia)
│   ├── Denda & Biaya Tambahan [❌ belum ada]
│   └── Invoice PDF
│
└── ⚙️ PENGATURAN RENTAL
    ├── Kebijakan Sewa (min. durasi, max. durasi)
    ├── Deposit (%, kebijakan refund, denda)
    ├── Dokumen wajib (toggle: KTP / SIM / KK)
    └── Biaya denda keterlambatan per jam/hari

DISEMBUNYIKAN untuk Rental:
  ✗ KDS Dapur
  ✗ Manajemen Meja & QR Meja
  ✗ Resep & HPP
  ✗ Inventori Bahan Baku
  ✗ Kasir POS konvensional (ada versi sederhana untuk walk-in)
  ✗ Produk Digital
  ✗ Custom Order Form
```

**Dashboard Rental — Widget Utama:**
```
┌─────────────────────────────────────────────────────────────┐
│  Status Armada — Hari Ini (14 Mei 2026)                     │
│                                                             │
│  🟢 Tersedia: 4 unit    🔴 Disewa: 8 unit    🔧 Servis: 1  │
├─────────────────────────────────────────────────────────────┤
│  Return Hari Ini (jadwal pengembalian)                      │
│  Avanza Hitam B-1234-XX  → Budi S.    Jam 12:00  [Cek]     │
│  Innova Putih B-5678-YY  → Andi K.    Jam 16:00  [Cek]     │
├─────────────────────────────────────────────────────────────┤
│  Booking Baru Masuk (3 pending)                             │
│  Honda Beat   16–18 Mei  Siti R.   DP: Rp 200k   [Konfirm] │
│  Avanza       20–25 Mei  Reza P.   DP: Rp 500k   [Konfirm] │
├─────────────────────────────────────────────────────────────┤
│  Utilisasi Bulan Ini: 73%  |  Revenue: Rp 28.400.000       │
└─────────────────────────────────────────────────────────────┘
```

---

### 15.6 POS Panel — Produk Digital (Tipe 2)

**Identitas Panel:** Tidak ada pengiriman, tidak ada stok fisik. Panel sangat simpel. Fokus pada upload produk, lisensi, dan analitik download.

```
SIDEBAR PRODUK DIGITAL:
├── 🏠 UTAMA
│   └── Dashboard (penjualan hari ini, total download, produk terlaris)
│
├── 💾 PRODUK DIGITAL [GRUP UTAMA]
│   ├── 🔴 Daftar Produk Digital [PROMINENT]
│   ├── Upload / Edit Produk
│   ├── Preview & Watermark [❌ belum ada]
│   ├── Manajemen Lisensi [❌ belum ada]
│   └── Update Versi [❌ belum ada]
│
├── 📋 PESANAN & DOWNLOAD
│   ├── Riwayat Penjualan
│   └── Log Download per Pembeli
│
├── 👥 PELANGGAN & PROMO
│   ├── Database Pembeli
│   ├── Voucher Toko
│   ├── Ulasan Produk
│   └── Q&A Produk
│
├── 💰 KEUANGAN & LAPORAN
│   ├── Keuangan & Wallet
│   ├── Laporan Penjualan
│   └── Invoice PDF
│
└── ⚙️ PENGATURAN

DISEMBUNYIKAN untuk Produk Digital:
  ✗ KDS, Meja, QR, Reservasi
  ✗ Stok fisik, Resep, Inventori, Supplier
  ✗ Booking Jadwal Staff
  ✗ Armada Rental
  ✗ Pengiriman (RajaOngkir, Label, Kurir)
  ✗ Pre-order (bisa ada tapi optional)
```

---

### 15.7 POS Panel — Pre-order & Custom (Tipe 5: Bakeri, Katering, Konveksi, Desainer)

```
SIDEBAR CUSTOM / PRE-ORDER:
├── 🏠 UTAMA
│   └── Dashboard (custom order masuk, jadwal produksi, deadline minggu ini)
│
├── 📝 CUSTOM ORDER [GRUP UTAMA]
│   ├── 🔴 Permintaan Custom [PROMINENT]
│   │    (incoming brief → review → terima/tolak → produksi → selesai)
│   ├── Pre-order Mode
│   ├── Status & Timeline per Order
│   └── WA Template per Status
│
├── 📦 KATALOG
│   ├── Produk Jadi (stok ready)
│   ├── Template Layanan Custom (harga mulai dari)
│   └── Portofolio / Galeri Hasil Karya
│
├── 📅 JADWAL PRODUKSI [opsional]
│   ├── Kalender Deadline
│   └── Queue produksi
│
├── 👥 PELANGGAN & PROMO
│   ├── Database Pelanggan
│   ├── Inbox Chat & Brief
│   ├── Ulasan + Foto Hasil Karya
│   └── Voucher Toko
│
├── 💰 KEUANGAN & LAPORAN
│   ├── Keuangan & Wallet
│   ├── Laporan per Custom Order
│   └── Invoice PDF
│
└── ⚙️ PENGATURAN
```

---

### 15.8 Matriks Visibilitas Menu POS per Tipe

| Menu POS | F&B | Produk Fisik | Booking Sesi | Rental | Digital | Custom |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| POS Kasir | ✅ | ✅ | ⬜ Walk-in | ⬜ | — | ⬜ |
| KDS Dapur | ✅ | — | — | — | — | — |
| Manajemen Meja + QR | ✅ | — | — | — | — | — |
| Reservasi Meja | ⬜ opsional | — | — | — | — | — |
| Menu / Produk | ✅ | ✅ | ⬜ Layanan | — | ✅ Digital | ✅ |
| Resep & HPP | ✅ | — | — | — | — | — |
| Inventori Bahan Baku | ✅ | — | — | — | — | — |
| Kalender & Slot Booking | — | — | ✅ | — | — | — |
| Staff / Terapis | — | — | ✅ | ⬜ Sopir | — | — |
| Portofolio / Galeri | — | — | ✅ | — | — | ✅ |
| Armada / Unit | — | — | — | ✅ | — | — |
| Kalender Rental | — | — | — | ✅ | — | — |
| Checklist Kondisi | — | — | — | ✅ | — | — |
| Pre-order | ⬜ | ✅ | — | — | — | ✅ |
| Custom Order | — | — | — | — | — | ✅ |
| Produk Digital | — | — | — | — | ✅ | — |
| RajaOngkir / Kurir | — | ✅ | — | — | — | ✅ |
| Happy Hour | ✅ | ⬜ | — | — | — | — |
| Membership / Paket | ✅ | ✅ | ✅ | — | ✅ | — |
| Loyalty Stamp | ✅ | ✅ | ✅ | — | — | — |
| Upselling Engine | ✅ | ✅ | ⬜ | — | ✅ | — |
| Waitlist Virtual | ✅ | — | ✅ | — | — | — |
| Reminder H-1/H-3 | — | — | ✅ | ✅ | — | ⬜ |

**Legenda:** ✅ Tampil | ⬜ Opsional (toggle) | — Disembunyikan

---

## BAGIAN 16: DESAIN HALAMAN PUBLIK PER TIPE BISNIS

> **Masalah Saat Ini:** Semua halaman toko (`/toko/:slug`) menampilkan layout yang sama: header toko → grid produk → ulasan. Tidak ada diferensiasi antara barbershop (yang butuh tombol Booking besar), rental mobil (yang butuh kalender), dan toko fashion (yang butuh filter ukuran/warna).
>
> **Solusi:** `toko.$slug.tsx` membaca `business_category_id` dan merender layout yang sesuai. Tidak perlu membuat file route baru — cukup conditional rendering per `category_type`.

---

### 16.1 Prinsip Desain Halaman Publik

```
PRINSIP UTAMA:
1. CTA Utama harus langsung terlihat tanpa scroll (above the fold)
   - F&B: "Pesan Sekarang" / "QR Order"
   - Booking Sesi: "Booking Layanan" (tombol besar, warna primer)
   - Rental: "Cek Ketersediaan & Sewa"
   - Digital: "Lihat Produk" / "Download Preview"

2. Informasi kritis berbeda per tipe:
   - F&B: harga, alergen, jam buka, estimasi siap
   - Booking Sesi: ketersediaan hari ini, durasi layanan, daftar staff
   - Rental: harga/hari, unit tersedia sekarang, syarat dokumen
   - Digital: lisensi, format file, jumlah download

3. Mobile-first: 375px nyaman, tombol CTA sticky di bottom

4. Konten yang tidak relevan DISEMBUNYIKAN (bukan ditampilkan kosong)
   - Rental: tidak ada grid produk "tambah ke keranjang"
   - Digital: tidak ada alamat pengiriman, tidak ada kalender
   - F&B: tidak ada tombol "Booking Layanan" (kecuali reservasi meja diaktifkan)
```

---

### 16.2 Layout Publik — F&B (Restoran, Kafe, Warung)

```
URL: /toko/:slug  (category_type = fnb_*)

┌─────────────────────────────────────────────────────────┐
│  [HEADER MARKETPLACE]                                   │
├─────────────────────────────────────────────────────────┤
│  HERO TOKO                                              │
│  ┌───────┐  Nama Kafe Kopimu ✓ Verified                │
│  │ Logo  │  ⭐ 4.8 (342 ulasan) · Gold Seller           │
│  │  Foto │  📍 Jl. Sudirman No.12, Jakarta              │
│  └───────┘  🕐 Buka 08:00–22:00 · Estimasi 15–25 mnt   │
│             [❤ Follow]  [💬 Chat]  [📍 Maps]            │
├─────────────────────────────────────────────────────────┤
│  TAG INFO (chip row)                                    │
│  [🍽 Dine-in] [🛵 Delivery] [🥡 Takeaway]              │
│  [🌿 Vegetarian Friendly] [🚫 Bebas Gluten] [🅿 Parkir] │
├─────────────────────────────────────────────────────────┤
│  FLASH SALE BANNER (jika ada promo aktif)               │
│  🔥 Flash Sale! Es Kopi Susu Rp 15.000 (hemat 25%)     │
│  Berakhir dalam: 02:34:11                               │
├─────────────────────────────────────────────────────────┤
│  SEARCH DALAM MENU                                      │
│  [🔍 Cari menu...                              ]        │
├─────────────────────────────────────────────────────────┤
│  TAB NAVIGASI                                           │
│  [Menu ●] [Info] [Ulasan (342)]                        │
├─────────────────────────────────────────────────────────┤
│  TAB: MENU                                              │
│  Filter Kategori (scroll horizontal):                   │
│  [Semua] [Kopi] [Non-Kopi] [Makanan] [Snack] [Paket]   │
│                                                         │
│  Grid Produk (2 kolom mobile, 3-4 kolom desktop):       │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐        │
│  │  Foto  │  │  Foto  │  │  Foto  │  │  Foto  │        │
│  │ Es K.  │  │ Nasi G.│  │ Roti B.│  │ Jus A. │        │
│  │Rp 25k  │  │ Rp 35k │  │ Rp 20k │  │ Rp 30k │        │
│  │[+ Pesan│  │[+ Pesan│  │[+ Pesan│  │[+ Pesan│        │
│  └────────┘  └────────┘  └────────┘  └────────┘        │
│                                                         │
│  [Muat lebih banyak]                                    │
├─────────────────────────────────────────────────────────┤
│  TAB: INFO                                              │
│  📍 Alamat lengkap + embed Google Maps                  │
│  🕐 Jam operasional per hari                            │
│  ☎ Telepon + tombol "Call" / "WA"                      │
│  🏷 Fasilitas: WiFi / AC / Parkir / Toilet              │
│  ⚠ Info alergen umum (jika diisi merchant)             │
├─────────────────────────────────────────────────────────┤
│  TAB: ULASAN                                            │
│  ⭐⭐⭐⭐⭐ 4.8 dari 342 ulasan                          │
│  [5★ ████████ 78%] [4★ ████ 15%] [3★ ██ 5%] ...       │
│  Foto Ulasan (grid 6 foto)                              │
│  Daftar ulasan terbaru                                  │
├─────────────────────────────────────────────────────────┤
│  STICKY BOTTOM BAR (mobile)                             │
│  🛒 Keranjang (3 item)      [Pesan Sekarang →]          │
└─────────────────────────────────────────────────────────┘

KHUSUS F&B — Fitur opsional jika diaktifkan:
  + Tombol "Reservasi Meja" (secondary, di bawah tombol Pesan)
  + Section Happy Hour (banner jam promo aktif)
  + Section Waitlist (jika restoran penuh)

TIDAK ADA di halaman F&B:
  ✗ Tombol "Booking Layanan"
  ✗ Kalender slot booking
  ✗ Daftar Staff/Terapis
  ✗ Galeri Before/After
  ✗ Kalender ketersediaan unit (rental)
  ✗ Download produk digital
```

---

### 16.3 Layout Publik — Booking Sesi (Barber, Salon, Spa, Klinik, Fotografer)

```
URL: /toko/:slug  (category_type = beauty_barber / beauty_salon / health_clinic / dll.)

┌─────────────────────────────────────────────────────────┐
│  [HEADER MARKETPLACE]                                   │
├─────────────────────────────────────────────────────────┤
│  HERO TOKO                                              │
│  [FOTO TOKO / GALERI SLIDESHOW — full width]            │
│  ┌───────┐  Fresh Cut Barbershop ✓ Verified             │
│  │ Logo  │  ⭐ 4.9 (218 ulasan) · Platinum              │
│  │       │  📍 Jl. Gatot Subroto No.7, Bandung           │
│  └───────┘  🕐 Buka 09:00–21:00                         │
│             [❤ Follow]  [💬 Chat]  [📍 Maps]            │
├─────────────────────────────────────────────────────────┤
│  🔴 CTA UTAMA — PROMINENT (above the fold)              │
│  ┌─────────────────────────────────────────────────┐    │
│  │  📅 Booking Layanan                              │    │
│  │  Tersedia hari ini: 4 slot kosong               │    │
│  │  [Booking Sekarang →]  (tombol besar, primer)   │    │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  LAYANAN & HARGA                                        │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ ✂ Potong Rambut  │  │ 🎨 Highlight     │            │
│  │ 30 menit         │  │ 90 menit         │            │
│  │ Rp 50.000        │  │ Rp 250.000       │            │
│  │ [Pilih & Booking]│  │ [Pilih & Booking]│            │
│  └──────────────────┘  └──────────────────┘            │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ 🧴 Creambath     │  │ 🪒 Shave         │            │
│  │ 45 menit         │  │ 20 menit         │            │
│  │ Rp 75.000        │  │ Rp 35.000        │            │
│  │ [Pilih & Booking]│  │ [Pilih & Booking]│            │
│  └──────────────────┘  └──────────────────┘            │
├─────────────────────────────────────────────────────────┤
│  TEAM / STAFF                                           │
│  "Pilih stylist favoritmu"                              │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐               │
│  │ Foto │  │ Foto │  │ Foto │  │ Foto │               │
│  │ Reza │  │ Maya │  │ Dika │  │ Lisa │               │
│  │⭐4.9 │  │⭐4.8 │  │⭐4.7 │  │⭐5.0 │               │
│  │Barber│  │Stylis│  │Barber│  │Nail  │               │
│  │[Book]│  │[Book]│  │[Book]│  │[Book]│               │
│  └──────┘  └──────┘  └──────┘  └──────┘               │
├─────────────────────────────────────────────────────────┤
│  GALERI KARYA (Before / After)                          │
│  [Filter: Semua | Potong | Warna | Waxing | Nail]       │
│  Grid foto 3 kolom — klik untuk lightbox                │
│  Before/After slider untuk foto transformasi            │
├─────────────────────────────────────────────────────────┤
│  TAB: ULASAN (218)                                      │
│  ⭐ 4.9 · Foto ulasan · Daftar ulasan terbaru           │
├─────────────────────────────────────────────────────────┤
│  INFO TOKO                                              │
│  📍 Alamat + Maps  🕐 Jam operasional  ☎ Kontak        │
├─────────────────────────────────────────────────────────┤
│  STICKY BOTTOM BAR (mobile)                             │
│  [📅 Booking Sekarang →]              (full width)      │
└─────────────────────────────────────────────────────────┘

TIDAK ADA di halaman Booking Sesi:
  ✗ "Tambah ke Keranjang" konvensional
  ✗ Filter ukuran/warna produk
  ✗ Kalender rental tanggal mulai-selesai
  ✗ Daftar armada/unit
  ✗ Download produk digital
```

---

### 16.4 Layout Publik — Booking Rental (Rental Mobil, Villa, Sewa Alat)

```
URL: /toko/:slug  (category_type = auto_rental_car / property_villa / rental_camping / dll.)

┌─────────────────────────────────────────────────────────┐
│  [HEADER MARKETPLACE]                                   │
├─────────────────────────────────────────────────────────┤
│  HERO TOKO                                              │
│  [FOTO ARMADA — slideshow highlight unit terbaik]       │
│  ┌───────┐  AutoRent Jakarta ✓ Verified                 │
│  │ Logo  │  ⭐ 4.7 (94 ulasan) · Top Seller             │
│  │       │  📍 Jl. MT Haryono No.45, Jakarta Selatan    │
│  └───────┘  🕐 Buka 07:00–20:00                         │
│             [❤ Follow]  [💬 Chat]  [📍 Maps]            │
├─────────────────────────────────────────────────────────┤
│  🔴 CEK KETERSEDIAAN — PROMINENT (above the fold)       │
│  ┌────────────────────────────────────────────────┐     │
│  │  📅 Tanggal Sewa                               │     │
│  │  Mulai: [14 Mei 2026 ▾]  Selesai: [17 Mei ▾] │     │
│  │  [Cek Ketersediaan →]  (tombol besar)          │     │
│  └────────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────┤
│  DAFTAR ARMADA / UNIT TERSEDIA                          │
│  (berubah setelah pilih tanggal — tersedia vs merah)    │
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐      │
│  │ 📷 Foto Avanza      │  │ 📷 Foto Innova       │      │
│  │ Toyota Avanza 2022  │  │ Toyota Innova 2023   │      │
│  │ Manual · 6 orang   │  │ AT · 8 orang         │      │
│  │ 🟢 Tersedia         │  │ 🟢 Tersedia          │      │
│  │ Rp 450.000/hari    │  │ Rp 650.000/hari      │      │
│  │ DP: Rp 200.000     │  │ DP: Rp 300.000       │      │
│  │ [Sewa Sekarang]    │  │ [Sewa Sekarang]      │      │
│  └─────────────────────┘  └─────────────────────┘      │
│  ┌─────────────────────┐  ┌─────────────────────┐      │
│  │ 📷 Foto Xpander     │  │ 📷 Foto Pajero       │      │
│  │ Mitsubishi Xpander  │  │ Mitsubishi Pajero    │      │
│  │ AT · 7 orang       │  │ AT · 7 orang · 4WD   │      │
│  │ 🔴 Tidak Tersedia   │  │ 🟢 Tersedia          │      │
│  │ (14–17 Mei penuh)  │  │ Rp 900.000/hari      │      │
│  │ [Lihat Tanggal Lain]│  │ [Sewa Sekarang]      │      │
│  └─────────────────────┘  └─────────────────────┘      │
├─────────────────────────────────────────────────────────┤
│  SYARAT & KETENTUAN SEWA                                │
│  📋 Dokumen yang dibutuhkan: KTP + SIM A/C              │
│  📋 Minimal sewa: 1 hari                                │
│  📋 Kebijakan deposit: 30% dari total sewa              │
│  📋 Denda keterlambatan: Rp 50.000/jam                  │
├─────────────────────────────────────────────────────────┤
│  ULASAN (94)                                            │
│  ⭐ 4.7 · Daftar ulasan terbaru + foto                  │
├─────────────────────────────────────────────────────────┤
│  INFO TOKO                                              │
│  📍 Alamat + Maps (lokasi ambil kendaraan)              │
│  🕐 Jam operasional  ☎ Kontak WA                       │
├─────────────────────────────────────────────────────────┤
│  STICKY BOTTOM BAR (mobile)                             │
│  Pilih tanggal dulu untuk lihat ketersediaan           │
│  [📅 Cek Ketersediaan →]             (full width)       │
└─────────────────────────────────────────────────────────┘

TIDAK ADA di halaman Rental:
  ✗ Grid menu "tambah ke keranjang" konvensional
  ✗ Tombol "Booking Layanan" (slot jam)
  ✗ Daftar staff/terapis
  ✗ Galeri before/after layanan
  ✗ Download produk digital
```

---

### 16.5 Layout Publik — Produk Digital (Template, E-book, Preset)

```
URL: /toko/:slug  (category_type = digital_product / edu_online)

┌─────────────────────────────────────────────────────────┐
│  [HEADER MARKETPLACE]                                   │
├─────────────────────────────────────────────────────────┤
│  HERO TOKO                                              │
│  [BANNER TOKO — digital aesthetic]                      │
│  ┌───────┐  PixelCraft Templates ✓ Verified             │
│  │ Logo  │  ⭐ 4.9 (512 ulasan) · Platinum              │
│  │       │  💾 Template · Font · Preset · E-book        │
│  └───────┘  [❤ Follow]  [💬 Chat]                       │
├─────────────────────────────────────────────────────────┤
│  FILTER PRODUK                                          │
│  [Semua] [Template] [Font] [Preset Foto] [E-book]       │
│  Lisensi: [Semua ▾]  Urutkan: [Terpopuler ▾]          │
├─────────────────────────────────────────────────────────┤
│  GRID PRODUK DIGITAL (3 kolom mobile, 4 desktop)        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ [Preview]  │  │ [Preview]  │  │ [Preview]  │        │
│  │ WATERMARK  │  │ WATERMARK  │  │ WATERMARK  │        │
│  │            │  │            │  │            │        │
│  │ Template   │  │ Font Pack  │  │ Preset Film│        │
│  │ Sosmed     │  │ Nusantara  │  │ Collection │        │
│  │ ⬇ 1.2k dl │  │ ⬇ 834 dl  │  │ ⬇ 2.1k dl │        │
│  │ 🔒 Personal│  │ 🔓 Comm.  │  │ 🔒 Personal│        │
│  │ Rp 35.000  │  │ Rp 125.000 │  │ Rp 75.000  │        │
│  │ [Beli Now] │  │ [Beli Now] │  │ [Beli Now] │        │
│  └────────────┘  └────────────┘  └────────────┘        │
├─────────────────────────────────────────────────────────┤
│  ULASAN (512)                                           │
│  ⭐ 4.9 · "File langsung dapat, tidak ribet!"           │
├─────────────────────────────────────────────────────────┤
│  INFO TOKO                                              │
│  Kebijakan lisensi · Cara download · Format file        │
└─────────────────────────────────────────────────────────┘

TIDAK ADA di halaman Digital:
  ✗ Alamat pengiriman
  ✗ Pilih kurir
  ✗ Tombol Booking
  ✗ Kalender
  ✗ Daftar staff
```

---

### 16.6 Layout Publik — Custom & Pre-order (Bakeri, Konveksi, Desainer)

```
URL: /toko/:slug  (category_type = fnb_catering / fashion_custom / craft_handmade / dll.)

┌─────────────────────────────────────────────────────────┐
│  HERO TOKO                                              │
│  [PORTOFOLIO SLIDESHOW — foto karya terbaik]            │
│  ┌───────┐  Sweet Moment Bakery ✓ Verified              │
│  │ Logo  │  ⭐ 4.9 (167 ulasan) · Gold Seller           │
│  │       │  🎂 Kue Custom · Pre-order · Katering        │
│  └───────┘  [❤ Follow]  [💬 Chat]  [📍 Maps]            │
├─────────────────────────────────────────────────────────┤
│  CTA UTAMA                                              │
│  [📝 Pesan Custom]    [📦 Lihat Pre-order]              │
├─────────────────────────────────────────────────────────┤
│  PORTOFOLIO / GALERI KARYA                              │
│  [Filter: Semua | Wedding | Ulang Tahun | Corporate]    │
│  Masonry grid foto karya — klik untuk lightbox          │
├─────────────────────────────────────────────────────────┤
│  PRODUK SIAP (stok ready)                               │
│  [Produk jadi yang bisa langsung dibeli]                │
│  Grid produk + filter + add to cart                     │
├─────────────────────────────────────────────────────────┤
│  PRE-ORDER (tanggal tersedia)                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🎂 Kue Ultah Custom (Pre-order)                 │   │
│  │ Tersedia mulai: 20 Mei 2026                     │   │
│  │ Min. order: 1 hari sebelumnya                   │   │
│  │ Harga mulai Rp 250.000                          │   │
│  │ [Pre-order Sekarang]                            │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  CARA PESAN CUSTOM                                      │
│  1️⃣ Isi brief (konsep, tanggal butuh, budget)           │
│  2️⃣ Merchant konfirmasi & kirim penawaran              │
│  3️⃣ Setuju → bayar DP                                  │
│  4️⃣ Proses produksi → update berkala                   │
│  5️⃣ Selesai → bayar sisa → terima pesanan              │
├─────────────────────────────────────────────────────────┤
│  ULASAN + FOTO HASIL KARYA                              │
│  ⭐ 4.9 · Foto ulasan real dari pelanggan               │
└─────────────────────────────────────────────────────────┘
```

---

### 16.7 Halaman Booking (`/toko/:slug/booking`) — UX Flow Lengkap

Halaman ini diakses dari tombol "Booking" di halaman toko. Layout harus mobile-first dan wizard yang jelas.

```
WIZARD BOOKING (Tipe 3 — Booking Sesi):

LANGKAH 1: Pilih Layanan
┌─────────────────────────────────────────────────────────┐
│  ← Kembali                    Booking Layanan           │
│  Fresh Cut Barbershop                         [1/3]     │
│  ─────────────────────────────────────────────────────  │
│  Pilih Layanan yang Ingin Dipesan:                      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ○  ✂ Potong Rambut                              │   │
│  │    30 menit · Rp 50.000                         │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ○  🎨 Highlight / Warna Rambut                  │   │
│  │    90 menit · Rp 250.000                        │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ○  🧴 Creambath + Potong                        │   │
│  │    60 menit · Rp 120.000                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Pilih Staff (opsional):                               │
│  [Siapa saja] [Reza] [Maya] [Dika] [Lisa]              │
│                                                         │
│  [Lanjut: Pilih Tanggal & Waktu →]                     │
└─────────────────────────────────────────────────────────┘

LANGKAH 2: Pilih Tanggal & Slot
┌─────────────────────────────────────────────────────────┐
│  ← Kembali                    Booking Layanan           │
│  Layanan: Potong Rambut (30 menit)            [2/3]     │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Pilih Tanggal:                                         │
│  [Kalender mini — highlight: hari ini, tersedia]        │
│  Mei 2026: ← [L] [S] [S] [R] [K] [J] [S] →            │
│             ... 12  13  14  15  16  17  18 ...         │
│                 ✓   ●       ✓   ✓   ●   ✓              │
│  ● = penuh   ✓ = ada slot   [kosong] = libur            │
│                                                         │
│  Slot Tersedia (Rabu, 14 Mei 2026):                    │
│  [09:00] [09:30] [🔴 penuh] [10:30] [11:00]            │
│  [12:30] [13:00] [🔴 penuh] [14:00] [14:30]            │
│                                                         │
│  [Lanjut: Isi Data Diri →]                             │
└─────────────────────────────────────────────────────────┘

LANGKAH 3: Konfirmasi & Pembayaran
┌─────────────────────────────────────────────────────────┐
│  ← Kembali                    Booking Layanan           │
│  Ringkasan Booking                            [3/3]     │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  📅 Rabu, 14 Mei 2026 · 09:00                          │
│  ✂ Potong Rambut · 30 menit                            │
│  👤 Staff: Reza (atau siapa saja)                       │
│  📍 Fresh Cut Barbershop                               │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  Nama Lengkap   [________________________]              │
│  No. WhatsApp   [________________________]              │
│  Catatan        [________________________] (opsional)   │
│                                                         │
│  Kode Voucher   [________] [Terapkan]                   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  Subtotal:           Rp 50.000                          │
│  Diskon voucher:    -Rp 10.000                          │
│  Total:              Rp 40.000                          │
│                                                         │
│  DP Wajib (30%):     Rp 12.000                         │
│  [ℹ Transfer ke: BCA 1234567890 a/n Fresh Cut]          │
│                                                         │
│  [Konfirmasi Booking]                                   │
│  Dengan menekan tombol ini, Anda menyetujui S&K         │
└─────────────────────────────────────────────────────────┘

SUKSES PAGE:
┌─────────────────────────────────────────────────────────┐
│  ✅ Booking Berhasil!                                   │
│                                                         │
│  ID Booking: #BK-20240514-001                          │
│  Rabu, 14 Mei 2026 · 09:00                             │
│  Fresh Cut Barbershop                                   │
│                                                         │
│  ⚠ Harap transfer DP Rp 12.000 ke:                    │
│  BCA 1234567890 a/n Fresh Cut Barbershop               │
│  dan kirim bukti ke WhatsApp kami                      │
│                                                         │
│  [💬 Konfirmasi via WhatsApp]                          │
│  [📋 Salin Link Batalkan Booking]                      │
│  [← Kembali ke Toko]                                   │
│                                                         │
│  Reminder akan dikirim H-3 dan H-1 sebelum jadwal.     │
└─────────────────────────────────────────────────────────┘
```

---

### 16.8 Logika Conditional Rendering `toko.$slug.tsx`

```typescript
// Implementasi berdasarkan category_type
const categoryType = shop?.business_category?.category_type

const isBookingSession = ["beauty_salon","beauty_barber","beauty_spa",
  "beauty_waxing","beauty_tattoo","creative_photo","creative_video",
  "health_clinic","health_therapy","health_gym","health_massage",
  "pet_grooming","pet_vet","edu_private","edu_group","edu_tutor_center",
  "travel_tour","travel_guide","event_organizer","event_entertainer"
].includes(categoryType)

const isRental = ["auto_rental_car","auto_rental_moto","auto_rental_bike",
  "auto_workshop","auto_washing","rental_camping","rental_tools",
  "rental_event","rental_sport","rental_baby","rental_electronic",
  "rental_costume","rental_vehicle_heavy","property_villa",
  "property_coworking","property_studio","property_kost","pet_hotel",
  "event_venue","travel_transport"
].includes(categoryType)

const isDigital = ["digital_product","edu_online"].includes(categoryType)

const isCustom = ["fnb_catering","fnb_bakery","fashion_custom",
  "home_furniture","home_interior","creative_design","creative_printing",
  "craft_handmade","art_visual","event_organizer"
].includes(categoryType)

const isFnB = categoryType?.startsWith("fnb_")

// Render sections berdasarkan tipe:
return (
  <>
    <ShopHero shop={shop} />

    {/* CTA Utama — berbeda per tipe */}
    {isBookingSession && <BookingCTA shopSlug={slug} />}
    {isRental && <RentalAvailabilityChecker shopSlug={slug} />}
    {isFnB && <FnBOrderCTA shopSlug={slug} />}
    {isDigital && <DigitalProductFilter />}

    {/* Konten per tipe */}
    {isBookingSession && <ServiceList shopId={shop.id} />}
    {isBookingSession && <StaffGrid shopId={shop.id} />}
    {isRental && <FleetGrid shopId={shop.id} selectedDates={dates} />}
    {!isRental && !isDigital && <ProductGrid products={products} />}
    {isDigital && <DigitalProductGrid shopId={shop.id} />}

    {/* Portofolio — untuk jasa & custom */}
    {(isBookingSession || isCustom) && <PortfolioGallery shopId={shop.id} />}

    {/* Reservasi meja — hanya F&B jika diaktifkan */}
    {isFnB && shop.table_reservation_enabled && <TableReservationCTA />}

    {/* Bagian universal */}
    <ReviewsSection shopId={shop.id} />
    <ShopInfoSection shop={shop} />
  </>
)
```

---

## BAGIAN 17: LOGIKA KATEGORI DINAMIS — TAMPIL HANYA YANG ADA TOKONYA

> **Masalah Saat Ini:** Homepage dan halaman `/kategori` menampilkan SEMUA kategori dari database, termasuk kategori yang belum ada satu pun toko aktif. Ini membuat platform terlihat kosong dan tidak profesional.
>
> **Prinsip:** Kategori hanya tampil di homepage jika memiliki minimal 1 toko aktif. Di halaman `/kategori`, kategori tanpa toko ditampilkan tapi dengan state "Jadilah yang pertama!" untuk mendorong pendaftaran.

---

### 17.1 Logika Homepage (`/`)

```typescript
// index.tsx — saat ini:
const { data: cats } = await supabase
  .from("business_categories")
  .select("id, slug, name, icon_url")
  .eq("is_active", true)
  .order("sort_order")

// YANG PERLU DIUBAH — filter berdasarkan shop count:
// Opsi 1: Query dengan subquery count (1 round trip)
const { data: cats } = await supabase.rpc("get_active_categories_with_shops")
// Fungsi ini return: kategori + shop_count, filter WHERE shop_count > 0

// Opsi 2: Query shops, hitung per kategori, filter (2 round trips — lebih simpel):
const [catsRes, shopsRes] = await Promise.all([
  supabase.from("business_categories").select("id,slug,name,icon_url").eq("is_active",true).order("sort_order"),
  supabase.from("coffee_shops").select("business_category_id").eq("is_active",true)
])
const shopCount = {}
for (const s of shopsRes.data ?? []) {
  if (s.business_category_id)
    shopCount[s.business_category_id] = (shopCount[s.business_category_id]??0)+1
}
// Filter: hanya kategori dengan shop_count > 0
// Urutkan: berdasarkan shop_count DESC (kategori terpopuler = paling atas)
const filteredCats = (catsRes.data ?? [])
  .filter(c => (shopCount[c.id]??0) > 0)
  .sort((a,b) => (shopCount[b.id]??0) - (shopCount[a.id]??0))
  .slice(0, 16) // maksimal 16 di homepage
```

**Aturan urutan kategori di homepage:**
```
1. Kategori dengan shop_count terbanyak (paling populer) → paling atas/kiri
2. Jika shop_count sama → ikut sort_order dari admin
3. Maksimal 16 kategori di homepage (scroll horizontal di mobile)
4. Tombol "Lihat semua kategori →" mengarah ke /kategori
```

---

### 17.2 Logika Halaman Kategori (`/kategori`)

```typescript
// kategori.index.tsx — tampilkan SEMUA, tapi diferensiasi visual:

// Kategori dengan toko → card normal, klik ke /kategori/:slug
// Kategori tanpa toko → card greyed out, klik ke halaman daftar dengan CTA

// Visual state:
// Ada toko:     card border normal, warna penuh, "X toko aktif"
// Belum ada:    card opacity-60, badge "Segera Hadir", klik → /signup dengan param kategori

// Implementasi:
{cats.map(c => (
  <div
    key={c.id}
    className={cn(
      "group rounded-xl border bg-card overflow-hidden transition",
      counts[c.id] > 0
        ? "hover:border-primary/50 hover:shadow-md cursor-pointer"
        : "opacity-60 cursor-default"
    )}
  >
    {/* Banner image */}
    <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-primary/5">
      {c.banner_url
        ? <img src={c.banner_url} className="h-full w-full object-cover" />
        : <DefaultCategoryIcon slug={c.slug} />
      }
      {counts[c.id] === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-700">
            Segera Hadir
          </span>
        </div>
      )}
    </div>
    <div className="p-4">
      <h3 className="text-sm font-semibold">{c.name}</h3>
      {c.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
      <div className="mt-2 text-xs">
        {counts[c.id] > 0
          ? <span className="text-primary font-medium">{counts[c.id]} toko aktif</span>
          : <Link to="/signup" className="text-primary hover:underline">Jadilah yang pertama →</Link>
        }
      </div>
    </div>
  </div>
))}
```

---

### 17.3 Logika Halaman per Kategori (`/kategori/:slug`)

```typescript
// kategori.$slug.tsx — tampilkan konten berbeda berdasarkan apakah ada toko:

// JIKA kategori punya toko:
// → Tampilkan grid toko + produk unggulan dari kategori ini
// → Filter: harga, rating, lokasi, metode bayar
// → Sort: Terpopuler / Rating / Terbaru / Terdekat

// JIKA kategori belum punya toko:
// → Tampilkan halaman "Jadilah Merchant Pertama di Kategori Ini"
// → CTA besar: "Daftar Sekarang & Buka Toko Gratis"
// → Info keuntungan: 0% komisi bulan pertama, onboarding gratis, dll.

// Implementasi:
if (shops.length === 0) {
  return <EmptyCategoryPage category={category} />
}

// EmptyCategoryPage:
// - Hero dengan warna/icon kategori
// - "Belum ada toko di kategori [Nama Kategori]"
// - "Kamu bisa jadi yang pertama! Daftar gratis, aktif dalam 5 menit."
// - [Daftar Sekarang] button
// - List keuntungan: no fee pertama, support onboarding, dll.
```

---

### 17.4 Aturan Tampilan Kategori — Ringkasan

| Context | Kondisi | Tampilan |
|---|---|---|
| **Homepage** `/` | shop_count > 0 | Tampil normal, urut berdasarkan shop_count |
| **Homepage** `/` | shop_count = 0 | **TIDAK TAMPIL sama sekali** |
| **Homepage** `/` | Semua kategori kosong | Tampilkan 4-6 kategori placeholder (mode dev) |
| **Halaman Kategori** `/kategori` | shop_count > 0 | Card normal + klik ke halaman kategori |
| **Halaman Kategori** `/kategori` | shop_count = 0 | Card greyed out + badge "Segera Hadir" + link signup |
| **Halaman per Kategori** `/kategori/:slug` | Ada toko | Grid toko + produk + filter |
| **Halaman per Kategori** `/kategori/:slug` | Tidak ada toko | Landing "Jadilah yang Pertama" + CTA daftar |
| **Onboarding merchant** | Pilih kategori | Tampil SEMUA kategori (termasuk yang kosong) |

---

### 17.5 Performa & Caching

```typescript
// Hitungan shop per kategori di-cache untuk menghindari query berulang:

// Di index.tsx: ambil sekali bersamaan dengan data lain (Promise.all)
// Cache di localStorage 5 menit:
const CACHE_KEY = "category_shop_counts"
const CACHE_TTL = 5 * 60 * 1000 // 5 menit

function getCachedCounts() {
  const raw = localStorage.getItem(CACHE_KEY)
  if (!raw) return null
  const { counts, ts } = JSON.parse(raw)
  if (Date.now() - ts > CACHE_TTL) return null
  return counts
}

function setCachedCounts(counts: Record<string, number>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ counts, ts: Date.now() }))
}

// Di Supabase: tambahkan view materialized atau computed column
// Ini bisa diganti dengan Supabase RPC:
// CREATE OR REPLACE FUNCTION get_category_shop_counts()
// RETURNS TABLE(category_id uuid, shop_count bigint)
// LANGUAGE sql STABLE AS $$
//   SELECT business_category_id, COUNT(*) as shop_count
//   FROM coffee_shops
//   WHERE is_active = true AND business_category_id IS NOT NULL
//   GROUP BY business_category_id
// $$;
```

---

### 17.6 Icon Default per Kategori (Tanpa `icon_url`)

Saat ini semua kategori tanpa icon_url menampilkan icon `Store` generik. Harus diganti dengan icon yang relevan per kategori:

```typescript
const CATEGORY_ICONS: Record<string, string> = {
  // F&B
  fnb_restaurant: "🍽️",  fnb_cafe: "☕",  fnb_street: "🥘",
  fnb_catering: "🍱",    fnb_bakery: "🎂", fnb_packaged: "📦",
  fnb_healthy: "🥗",
  // Beauty
  beauty_salon: "💇",    beauty_barber: "✂️",  beauty_spa: "💆",
  beauty_skincare: "🧴", beauty_waxing: "🌸",  beauty_tattoo: "🎨",
  // Otomotif
  auto_rental_car: "🚗", auto_rental_moto: "🏍️", auto_workshop: "🔧",
  auto_washing: "🚿",
  // Rental
  rental_camping: "⛺",  rental_tools: "🔨", rental_event: "🎪",
  rental_electronic: "📷",
  // Properti
  property_villa: "🏡",  property_coworking: "💼", property_kost: "🏠",
  // Digital
  digital_product: "💾", digital_service: "💻", edu_online: "📚",
  // Kesehatan
  health_clinic: "🏥",   health_gym: "🏋️", health_massage: "💆",
  // Fashion
  fashion_ready: "👗",   fashion_custom: "🧵", fashion_preloved: "♻️",
  // Kreatif
  creative_photo: "📸",  creative_design: "🎨",
  // Hewan
  pet_grooming: "🐕",   pet_hotel: "🏠",
  // Wisata
  travel_tour: "✈️",    travel_guide: "🗺️",
  // Event
  event_organizer: "🎉", event_venue: "🏟️",
}
```

---

## BAGIAN X: ANALITIK BOOKING (M-BA)

> **Dirilis:** Mei 2026 | **Status:** Shipped ✅

### Deskripsi

Dashboard analitik khusus untuk pemilik toko yang menggunakan fitur booking sesi/layanan. Menampilkan metrik performa booking dalam satu tampilan terpadu — tanpa perlu export manual ke spreadsheet.

**Route:** `/pos-app/booking-analytics`
**Akses:** FNB & Services (`onlyFor: FNB_SVC`)
**File:** `src/routes/pos-app.booking-analytics.tsx`

### Fitur

| Fitur | Keterangan |
|---|---|
| **KPI Cards** | Total booking, pendapatan deposit, tingkat pembatalan (%), tingkat selesai (%) |
| **Pendapatan Deposit per Hari** | Bar chart — DP yang berhasil terkumpul per hari dalam rentang waktu |
| **Tren Booking Harian** | Line chart — jumlah booking masuk per hari |
| **Distribusi Status Booking** | Donut chart interaktif — proporsi pending / dikonfirmasi / dibatalkan / selesai |
| **Tingkat Pembatalan per Hari** | Bar chart — persentase booking yang dibatalkan per hari |
| **Jam Slot Terpopuler** | Bar chart — distribusi booking berdasarkan jam mulai (temukan peak hour) |
| **Layanan Paling Diminati** | Horizontal bar chart — top 10 layanan berdasarkan jumlah booking |
| **Filter Tanggal** | Pilih rentang bebas atau shortcut 7h / 30h / 90h |

### Data Source

Semua data di-scope per `shop_id` melalui join `bookings ← booking_slots(shop_id)`. Filter waktu berdasarkan `bookings.created_at`. Tidak ada tabel baru — menggunakan tabel `bookings` dan `booking_slots` yang sudah ada.

### Query Pattern

```sql
SELECT b.*, s.slot_date, s.slot_time, s.service_name, s.price
FROM bookings b
JOIN booking_slots s ON s.id = b.slot_id
WHERE s.shop_id = :shop_id
  AND b.created_at BETWEEN :from AND :to
```

### Metrik KPI

| Metrik | Definisi |
|---|---|
| Pendapatan Deposit | SUM(deposit_amount) WHERE deposit_status IN ('paid', 'verified') |
| Tingkat Pembatalan | COUNT(status='cancelled') / COUNT(*) × 100 |
| Tingkat Selesai | COUNT(status IN ('completed','done')) / COUNT(*) × 100 |

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
| category_type | Field di `business_categories` yang menentukan fitur POS & layout publik toko |
| Booking Sesi | Reservasi layanan dengan durasi tetap (potong rambut, foto, pijat) |
| Booking Rental | Reservasi barang/kendaraan/tempat dengan rentang tanggal sewa |
| Booking Tempat | Reservasi meja/venue berdasarkan tanggal + kapasitas |
| Shop Count | Jumlah toko aktif per kategori — menentukan apakah kategori tampil di homepage |
