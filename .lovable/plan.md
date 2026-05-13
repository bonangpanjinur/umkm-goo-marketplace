
# Analisis KopiHub/UMKMgo — Kekurangan, Error, dan Peluang Fitur

Cakupan audit: 169 route (admin/POS/customer/storefront), PRD v5.1, console & network log preview, schema Supabase, modul terbaru (Custom Order, Health Score, Booking).

---

## A. ERROR & MASALAH TEKNIS YANG TERDETEKSI

1. **Preview memakai `placeholder.supabase.co`** (terlihat di network log).
   - Indikasi env `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` tidak ter-inject pada build preview → semua fetch gagal (`Failed to fetch`, retry x3).
   - Dampak: pembeli melihat halaman kosong/skeleton; banner, kategori, produk, flash sale tidak muncul.
   - Aksi: pastikan `.env` ter-load di build artifact `kopihub`, atau fallback graceful ketika placeholder terdeteksi (sudah ada warning, tapi UI tetap stuck loading).

2. **Banyak query `(supabase as any)`** di modul custom-order/portfolio.
   - Risiko: hilang type-safety, schema drift tidak ketahuan saat build.
   - Aksi: regenerasi `types.ts` sesudah migration & hapus `as any`.

3. **Realtime channel name tabrakan potensial**.
   - `cor-merchant-${shop.id}` aman, tapi channel customer (`toko.$slug.custom-order.status`) tidak dibatasi per kontak — bisa bocor event antar tab.
   - Aksi: tambahkan suffix unik (contact hash) + `presence` opsional.

4. **Loading state monolitik** di `pos-app.custom-orders.tsx`: setiap event realtime memicu `load()` penuh → flicker pada list panjang.
   - Aksi: patch incremental (gunakan payload `new`/`old` langsung).

5. **Tidak ada error boundary per route** untuk halaman publik (`toko/$slug/...`). Jika query gagal, user lihat blank.
   - Aksi: wajibkan `errorComponent` & `notFoundComponent` di tiap route loader (sesuai TanStack rule).

6. **Notifikasi WhatsApp masih manual** (membuka tab `wa.me`).
   - Tidak terkirim kalau owner tidak klik. Tidak ada audit pengiriman.
   - Aksi: integrasi Wablas/Fonnte/Twilio + log ke `notifications`.

7. **Email otomatis belum aktif** untuk status custom order (sudah dibahas tapi belum di-setup domain).

8. **Beberapa route legacy duplikat**: `s.$slug.*` (storefront lama) dan `toko.$slug.*` (storefront baru) — bisa membingungkan SEO & user.
   - Aksi: pilih satu canonical + `redirect` dari yang lain.

9. **Image upload belum punya validasi konsisten**: portfolio, product, ulasan, custom order semua handle berbeda.
   - Aksi: buat util `validateImageUpload()` (format, max size, ratio) dan reusable `<ImageDropzone>`.

10. **Health Score** belum punya cron/job recompute — skor stale jika tidak ada trigger order baru.

---

## B. KEKURANGAN UX (Pembeli)

1. Tidak ada **alamat default auto-pick** di checkout (sudah dicatat PRD, belum dibangun).
2. **Pencarian** belum ada filter harga/rating/lokasi; tidak ada saran query (autocomplete).
3. **Wishlist alert harga** masih di localStorage → tidak sinkron antar device.
4. **Push notification** browser belum aktif (service worker ada tapi belum subscribe ke event status).
5. **Riwayat pesanan** belum punya filter status & rentang tanggal.
6. **Track resi** tidak deeplink ke website kurir (JNE/J&T/SiCepat).
7. **Custom order customer view** belum kirim email/WA otomatis kalau status berubah.
8. **Review** belum bisa upload video; tidak ada "helpful" voting.
9. **Bahasa**: campur Indo/English di beberapa tooltip → konsisten ke ID.
10. **Mobile**: viewport 390px — beberapa modal admin (health-score, custom-order timeline) overflow horizontal.

## C. KEKURANGAN UX (Owner / Merchant)

1. **Dashboard POS** tanpa date-range picker bebas.
2. **Bulk action** order belum ada (status, print label).
3. **Crop image** in-browser belum ada (boros storage).
4. **Stok kritis** tidak push ke WA owner.
5. **Q&A auto-reply** masih exact match; perlu fuzzy/AI.
6. **Tab "Perlu Dibalas"** untuk ulasan > 24 jam.
7. **Kalender Promo** belum sinkron dengan flash sale aktif.
8. **Reminder booking H-1/H-3** belum otomatis (M-03 di PRD).
9. **Reschedule/batal mandiri** customer terbatas (hanya batal).
10. **Portofolio** sudah ada tapi belum bisa tag produk terkait → konversi lemah.
11. **Custom order** belum bisa di-convert ke order resmi (invoice, DP, tracking) hanya brief.

## D. KEKURANGAN ADMIN

1. Fraud detection rule-based saja → tambah skor risiko 0–100.
2. Manajemen kategori belum bisa drag-reorder + icon upload.
3. Churn → belum ada auto-trigger email re-engagement 14 hari.
4. Laporan keuangan belum format Jurnal/Accurate.
5. Broadcast belum bisa target buyer (hanya merchant).
6. Manajemen buyer belum bisa suspend/reset/credit manual.

---

## E. FITUR BARU YANG MENGUNTUNGKAN BISNIS (Prioritas)

Diurutkan dari **dampak GMV/retensi tertinggi vs. effort < 2 hari** sesuai prinsip PRD.

### 🔥 Tier 1 — Quick win, dampak revenue langsung

| # | Fitur | Untuk siapa | Mengapa menguntungkan |
|---|---|---|---|
| 1 | **Abandoned cart recovery WA otomatis** (cron 1 jam setelah cart aktif) | Pembeli + Owner | Recover 8–15% cart yang ditinggal — terbukti naikkan GMV |
| 2 | **Upsell otomatis di kasir & checkout** (engine sudah ada, tinggal aktifkan suggestion ML sederhana: pembeli A juga beli X) | Owner | AOV +10–20% |
| 3 | **Auto-DP untuk Custom Order** (terima brief → generate invoice DP 30% via Midtrans/Xendit, baru masuk antrian) | Owner | Cegah ghost order, cashflow lebih baik |
| 4 | **Reorder dari riwayat 1-klik di WA** (link share riwayat) | Pembeli | Frequency naik, cocok F&B |
| 5 | **Top Up Saldo / Kredit Toko** (pembeli isi saldo dapat bonus 5%) | Pembeli + Owner | Locked-in revenue, tingkatkan retensi |
| 6 | **Membership berbayar toko** (mis. "Member Gold Rp 50rb/bulan: free ongkir + diskon 10%") | Owner | Recurring revenue baru |
| 7 | **Affiliate / dropship link per produk** (komisi otomatis ke akun affiliate) | Owner + reseller | Channel akuisisi gratis |
| 8 | **Payout instan (xendit instant disburse) untuk withdrawal** | Owner | Differentiator vs kompetitor |
| 9 | **Bukti transfer manual + verifikasi otomatis OCR** | Owner | Kurangi metode bayar gagal |
| 10 | **Chat AI assistant untuk merchant** (jawab Q&A produk, draft balasan ulasan) — pakai Gemini Flash | Owner | Hemat waktu balas chat |

### 💡 Tier 2 — Pengalaman & Trust

| # | Fitur | Catatan |
|---|---|---|
| 11 | **Push notification web** untuk status pesanan, custom order, chat | Service worker sudah ada |
| 12 | **Live order tracking dengan peta** (kurir realtime via Mapbox) | Wow factor pembeli |
| 13 | **Verified review badge** (review dari pesanan terverifikasi) | Tingkatkan trust |
| 14 | **Garansi & retur self-serve** (klaim retur dengan upload foto) | Kurangi dispute |
| 15 | **Booking deposit Midtrans/Xendit otomatis** (gantikan transfer manual) | M-10 sebagian belum tuntas |
| 16 | **Reminder booking H-1 & H-3 via WA** | Kurangi no-show 30–50% |
| 17 | **Reschedule booking mandiri** (link unik) | Hemat staf |
| 18 | **Multi-bahasa storefront** (ID/EN) untuk toko ekspor | Cocok fashion/kraft |
| 19 | **Storefront PWA installable per toko** | Retensi pembeli loyal |
| 20 | **Loyalty points cross-store di marketplace** | Tarik pembeli baru |

### 📊 Tier 3 — Insight & Operasional Owner

| # | Fitur | Catatan |
|---|---|---|
| 21 | **Smart inventory forecast** (prediksi stok habis berdasar musim/hari) | Sudah ada estimasi linear; upgrade dgn weighted MA |
| 22 | **Profit margin alert** (notif jika margin produk < threshold) | |
| 23 | **Competitor price scraper** (opsional, untuk fashion/elektronik) | |
| 24 | **Heatmap jam ramai** per outlet | Bantu jadwal staf |
| 25 | **AI menu writer** — generate deskripsi & foto product (Gemini image) | |
| 26 | **Auto-tag produk** dari foto (Gemini Vision) | Hemat input |
| 27 | **Refund analytics** dashboard | |
| 28 | **Tax invoice e-Faktur Coretax** integrasi | Wajib UMKM PKP |
| 29 | **Export ke Tokopedia/Shopee** (sync stok & order) | Multi-channel = GMV besar |
| 30 | **Print label kurir batch** (sudah ada single, tambah bulk) | |

### 🎯 Tier 4 — Untuk Super Admin

| # | Fitur | Catatan |
|---|---|---|
| 31 | **Buyer suspend/reset/credit manual** | |
| 32 | **Broadcast targeting ke buyer** (segment by tier/last order/cart abandon) | |
| 33 | **Fraud risk score 0–100** + auto-hold transaksi suspect | |
| 34 | **Health score cron job** + email alert merchant skor turun | |
| 35 | **Plan upgrade nudge** in-app saat usage mendekati limit | Naikkan ARPU |
| 36 | **Marketplace SEO sitemap dinamis per kategori & kota** | Trafik organik |
| 37 | **A/B testing framework banner & flash sale** | |

---

## F. REKOMENDASI ROADMAP 4 MINGGU KE DEPAN

```text
Minggu 1  → Fix env preview + abandoned cart WA + push notification
Minggu 2  → Auto-DP custom order + reminder booking H-1 + bulk action order
Minggu 3  → Membership berbayar toko + top-up saldo + verified review badge
Minggu 4  → AI chat assistant merchant + AI menu writer + fraud risk score
```

Semua item dipecah agar masing-masing < 2 hari engineering, sesuai prinsip PRD.

---

## G. CATATAN TEKNIS UNTUK IMPLEMENTASI

- Hindari `as any` saat akses tabel baru — selalu jalankan migration → tunggu regen `types.ts`.
- Untuk WA otomatis, gunakan provider Indonesia (Fonnte / Wablas) via TanStack server function — bukan Edge Function.
- Push notification: aktifkan `PushNotificationManager.tsx` yang sudah ada + simpan subscription per `user_id`.
- Email: aktifkan domain Lovable Email, template React Email per event (custom order, booking, cart, payout).
- Cron jobs: pakai `pg_cron` ke endpoint `/api/public/cron/*` dengan signature secret.
- Realtime: tambahkan filter spesifik per user/contact agar event tidak menyebar ke seluruh channel.
- Image: buat komponen `<ImageDropzone>` reusable + `validateImageUpload()` di `lib/image.ts`.

---

## Pertanyaan untuk kamu

Saya butuh konfirmasi prioritas sebelum mulai eksekusi:

1. Mau saya fokus dulu ke **fix bug & polish** (Tier A + B) atau langsung ke **fitur revenue** (Tier 1)?
2. Untuk WA otomatis, pilih **Fonnte** (murah, populer ID) atau **Wablas** (fitur lengkap)?
3. Email otomatis — boleh saya setup **Lovable Email** dengan domain default `noreply@kopihub.lovable.app` dulu, baru nanti custom domain?
4. Apakah membership berbayar toko & top-up saldo masuk roadmap (perlu integrasi payment gateway lebih dalam)?
