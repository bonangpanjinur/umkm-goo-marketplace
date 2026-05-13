# Rencana Perbaikan KopiHub — Audit & Roadmap

Berdasarkan audit `.lovable/plan.md`, status modul terbaru (saldo, membership, push), dan struktur 176 route saat ini.

---

## 1. ERROR / BUG KRITIS (harus diperbaiki dulu)

| # | Masalah | Dampak | Aksi |
|---|---|---|---|
| E1 | Preview menggunakan `placeholder.supabase.co` (env `VITE_SUPABASE_*` tidak ter-inject di build artifact `kopihub`) | Storefront, banner, produk blank/skeleton stuck | Pastikan `.env` di-load di Vite build, tampilkan banner error eksplisit kalau placeholder, tambahkan retry-cap |
| E2 | Banyak query masih `(supabase as any)` di custom-order/portfolio | Hilang type-safety, schema drift tak ketahuan | Hapus `as any` setelah `types.ts` regen |
| E3 | Channel realtime customer (`toko.$slug.custom-order.status`) tidak per-kontak | Bocor event antar tab/customer | Suffix unik per `contact_hash` |
| E4 | `pos-app.custom-orders.tsx` reload penuh tiap event realtime | Flicker, lag list panjang | Patch incremental dari payload `new`/`old` |
| E5 | Route publik `toko/$slug/*` tanpa `errorComponent`/`notFoundComponent` | User lihat blank ketika query gagal | Wajibkan boundary di tiap route loader |
| E6 | VAPID push: secret belum di-set, `/sw.js` & sender belum ada | Background push belum jalan walau UI super-admin sudah ada | Generate service worker + server route `/api/public/hooks/send-push` (tunggu user input VAPID di admin) |
| E7 | Duplikat storefront `s.$slug.*` dan `toko.$slug.*` | Bingung SEO/user, double indexing | Pilih `toko.$slug.*` canonical, redirect dari `s.$slug.*` |
| E8 | WhatsApp masih buka tab `wa.me` manual | Notif owner sering terlewat | Integrasi Fonnte/Wablas via TanStack server fn + log ke `notifications` |

---

## 2. FITUR YANG HARUS DIPERBAIKI (sudah ada tapi belum tuntas)

| # | Modul | Kekurangan saat ini | Perbaikan |
|---|---|---|---|
| P1 | Checkout | Alamat default tidak auto-pick; ongkir manual pilih | Auto-select alamat utama, auto-hitung ongkir saat alamat dipilih |
| P2 | Pencarian (`search.tsx`) | Tidak ada filter harga/rating/lokasi, tidak ada autocomplete | Tambah filter sidebar + debounce suggestion |
| P3 | Wishlist (`akun.wishlist.tsx`) | Alert harga di localStorage, tidak sinkron antar device | Pindah ke tabel `wishlist_alerts` |
| P4 | Riwayat pesanan (`akun.pesanan.index.tsx`) | Tidak ada filter status & rentang tanggal | Tambah filter UI + query param |
| P5 | Track resi (`track.$orderId.tsx`) | Tidak deeplink ke kurir | Mapping kurir → URL tracking |
| P6 | Custom order customer | Status berubah tidak kirim WA/email | Trigger notification → in-app + WA |
| P7 | Review | Belum bisa upload video, tidak ada "helpful" voting | Field `video_url` + tabel `review_votes` |
| P8 | Mobile (390px) | Modal health-score & custom-order timeline overflow | Audit `overflow-x-auto`, max-w sesuai |
| P9 | Dashboard POS | Tanpa date-range bebas | Tambah `DateRangePicker` shadcn |
| P10 | Bulk action order | Belum ada (status/print label) | Checkbox + bulk action toolbar di `pos-app.orders.tsx` |
| P11 | Stok kritis | Tidak push WA ke owner | Trigger di `low_stock` → notification |
| P12 | Q&A auto-reply (`pos-app.qa.tsx`) | Exact match | Fuzzy + fallback Gemini Flash |
| P13 | Kalender promo (`pos-app.promo-calendar.tsx`) | Tidak sinkron flash sale aktif | Join data flash_sale ke calendar view |
| P14 | Booking reminder | H-1/H-3 belum otomatis | `pg_cron` ke endpoint kirim WA + push |
| P15 | Health score | Belum ada cron recompute | Cron harian recompute + email alert kalau turun |
| P16 | Image upload | Validasi tidak konsisten antar modul | `validateImageUpload()` + `<ImageDropzone>` reusable (komponen sudah ada, belum dipakai semua) |

---

## 3. FITUR YANG MASIH KURANG (belum ada sama sekali)

### Tier A — Quick win revenue (prioritas)
- **A1 Abandoned cart recovery** — cron 1 jam → WA otomatis (recover 8–15% cart)
- **A2 Auto-DP custom order** — invoice DP 30% via Midtrans/Xendit sebelum masuk antrian
- **A3 Reorder 1-klik dari riwayat** — link share via WA
- **A4 Bukti transfer + verifikasi OCR** — kurangi gagal bayar manual
- **A5 Affiliate/dropship link per produk** — komisi otomatis

### Tier B — Trust & UX
- **B1 Verified review badge** (review dari pesanan terverifikasi)
- **B2 Garansi & retur self-serve** dengan upload foto klaim
- **B3 Live tracking peta** (Mapbox kurir realtime)
- **B4 Booking deposit otomatis** via Midtrans/Xendit (gantikan transfer manual)
- **B5 Reschedule booking mandiri** via link unik
- **B6 Storefront PWA installable per toko**

### Tier C — Insight owner
- **C1 Smart inventory forecast** (weighted MA, bukan linear)
- **C2 Profit margin alert** (notif kalau margin < threshold)
- **C3 AI menu writer & auto-tag foto** (Gemini Vision/Image)
- **C4 Refund analytics dashboard**
- **C5 Heatmap jam ramai per outlet**
- **C6 Print label kurir batch** (single sudah ada)

### Tier D — Super admin
- **D1 Fraud risk score 0–100** + auto-hold
- **D2 Buyer suspend/reset/credit manual** (`admin.users.tsx` extend)
- **D3 Broadcast targeting buyer** (segment by tier/cart abandon)
- **D4 Plan-upgrade nudge** in-app saat dekat limit
- **D5 SEO sitemap dinamis** per kategori & kota

---

## 4. ROADMAP 4 MINGGU

```text
Minggu 1 (FIX & POLISH)
  ├─ E1: fix env preview + graceful fallback
  ├─ E2: hapus (supabase as any)
  ├─ E3+E4: realtime per-contact + incremental patch
  ├─ E5: error/notFound boundary di route publik
  └─ E7: redirect s.$slug → toko.$slug

Minggu 2 (PUSH & WA)
  ├─ E6: service worker + sender VAPID + endpoint /api/public/hooks/send-push
  ├─ E8: integrasi Fonnte/Wablas via createServerFn
  ├─ P6: trigger notif custom order → WA + in-app
  └─ P11: trigger stok kritis → WA owner

Minggu 3 (CHECKOUT & UX)
  ├─ P1: auto-pick alamat + auto-ongkir
  ├─ P2: filter & autocomplete pencarian
  ├─ P4: filter riwayat pesanan
  ├─ P5: deeplink kurir
  ├─ P9+P10: date-range + bulk action order
  └─ A1: abandoned cart WA

Minggu 4 (REVENUE & TRUST)
  ├─ A2: auto-DP custom order
  ├─ B1: verified review badge
  ├─ B4+P14: booking deposit + reminder H-1/H-3
  ├─ C1: weighted MA forecast
  └─ D1: fraud risk score 0–100
```

---

## 5. PERTANYAAN UNTUK DIPUTUSKAN

1. **Mulai dari mana?** (a) Minggu 1 fix bug dulu, atau (b) loncat ke Tier A revenue, atau (c) ambil 1 item spesifik
2. **WA provider:** Fonnte (murah, populer ID) atau Wablas (lengkap)?
3. **Push notification:** lanjut implementasi service worker + sender sekarang (pakai VAPID dummy untuk testing) atau tunggu user input VAPID asli di admin?
4. **Storefront canonical:** boleh saya redirect `s.$slug.*` → `toko.$slug.*`?
