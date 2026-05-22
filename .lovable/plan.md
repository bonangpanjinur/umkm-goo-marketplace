## Apa yang masih kurang (hasil audit lanjutan Mei 2026)

### A. Fitur owner masih pakai mock / fake delay
1. **`pos-app/email-marketing`** — masih `DEMO_CAMPAIGNS` + delay 1.2 dtk. Tabel `email_campaigns` & `email_campaign_recipients` sudah ada tapi belum di-wire.
2. **`pos-app/storefront-builder`** — save pakai `setTimeout(800)`, tidak persist ke `storefront_layouts`.
3. **`pos-app/custom-css`** — fake save, belum simpan ke kolom `shops.custom_css`.
4. **`pos-app/rajaongkir`** — checker masih DEMO_RESULTS (kunci & preferensi sudah disimpan, tinggal panggil API).
5. **`pos-app/digital-version`** — UX `tablesMissing` + fake delay, perlu wire ke tabel digital yang sudah dibuat.
6. **`pos-app/variants`** — sebagian aksi simpan fake delay.

### B. Fitur "copy SQL" yang masih placeholder
Halaman berikut menampilkan blok SQL untuk di-copy & dijalankan manual, bukan otomatis pakai tabel yang sudah ada (atau tabelnya memang belum dibuat):
`antrian`, `flash-sale`, `happy-hour`, `bulk-pricing`, `waitlist`, `restock-notify`, `rental-tnc`, `rental-availability`, `broadcast-wa`, `marketplace-orders`, `booking-reviews`, `portfolio`. Sebagian besar tabelnya **sudah dibuat di P0 sebelumnya**; tinggal hapus copy-SQL CTA dan wire ke DB.

### C. Konflik / duplikat route admin
File dengan dua titik (kemungkinan typo, bisa menyebabkan route ganda atau tidak terdaftar):
- `admin.health-score..tsx` ↔ `admin.health-score.tsx`
- `admin.plans..matrix.tsx` (tidak ada pair tunggal)
- `admin.shops..tsx` ↔ `admin.shops.tsx`

### D. Performa & realtime (P3 dari audit lama, masih terbuka)
- Beberapa subscribe realtime owner tanpa filter `shop_id` → traffic boros & potensi bocor lintas toko di sisi UI.
- Daftar besar masih `limit(150/500)` tanpa pagination cursor: notifications, orders, customers, inventory, reviews.
- View legacy `coffee_shops` masih ada — drop kalau tak ada referensi.

### E. UX / konsistensi
- `pos-app.sandbox` & `admin.sandbox` masih test ground.
- KDS belum punya filter outlet (kalau toko punya >1 outlet).
- Halaman publik `/sekitar` & `NearbyShopsSection` sekarang punya peta + URL persist (Phase 4 baru saja selesai) — belum ada filter "buka sekarang" / "rating min".

---

## Rencana pengembangan

### Phase 1 — Quick wins housekeeping (hari 1)
- Hapus / merge file route admin bertitik-dua (`admin.health-score..tsx`, `admin.shops..tsx`, `admin.plans..matrix.tsx`).
- Hapus tombol "Copy SQL" pada halaman yang tabelnya sudah ada; tampilkan empty state normal.
- Drop view legacy `coffee_shops` setelah grep memastikan tidak dipakai.

### Phase 2 — Wire fitur P0 sisa (1–2 hari)
- **Email Marketing**: list kampanye dari `email_campaigns`, form kirim → insert ke `email_campaign_recipients`, status diisi oleh worker.
- **Storefront Builder**: load/save layout JSON ke `storefront_layouts` (per shop, per page). Versi terakhir di-publish jadi yang tampil publik.
- **Custom CSS**: simpan ke kolom `shops.custom_css`, inject `<style>` di route publik `/toko/$slug` & `/s/$slug`.
- **RajaOngkir Checker**: panggil endpoint via server fn (key dari `shop_api_keys`), tampilkan tarif & estimasi nyata.
- **Digital Version & Variants**: hapus fake delay, sambungkan CRUD ke tabel asli.

### Phase 3 — Hapus mode "copy SQL" pada modul yang sudah ada tabelnya (1 hari)
Untuk masing-masing route (antrian, flash-sale, happy-hour, bulk-pricing, waitlist, restock-notify, rental-tnc, rental-availability, broadcast-wa, marketplace-orders, booking-reviews, portfolio):
1. Verifikasi tabel exist di DB (linter / read schema).
2. Hapus block `*_SQL` + tombol copy.
3. Aktifkan list / form CRUD-nya.
4. Buat migrasi guard jika tabel ternyata hilang.

### Phase 4 — Performa & realtime (1 hari)
- Tambah filter `.filter('shop_id', 'eq', shopId)` di semua channel realtime owner.
- Konversi list besar ke keyset pagination (mengikuti pola `OrdersTodayDialog`): notifications, customers, inventory, reviews.
- Tambah index DB di kolom yang dipakai keyset (`created_at`, `id`) bila belum ada.

### Phase 5 — UX polish discovery & KDS (½ hari)
- Filter "Buka sekarang" & rating minimum di `/sekitar` (memakai `shops.open_hours` + `rating_avg`).
- Selector outlet di KDS (filter `outlet_id`).
- Hapus / kunci halaman `*.sandbox.*` di build produksi.

### Phase 6 — Hardening keamanan (½ hari)
- Jalankan `supabase--linter` + `security--run_security_scan` setelah perubahan tabel/RLS.
- Pastikan semua tabel baru tersentuh pakai pola `is_shop_owner(shop_id) OR has_role(...,'super_admin')`.
- Update `mem://features/owner-audit-may2026` & `mem://features/security-rls-posture`.

---

## Catatan teknis singkat
- Schema sudah punya: `email_campaigns`, `email_campaign_recipients`, `storefront_layouts`, `shops.custom_css`, `shop_api_keys`, dan semua tabel queue/studio/klinik/digital/lookbook/portfolio dari P0.
- Worker email/WA belum dibuat — Phase 2 cukup tulis pending; pengiriman dipending atau dijadikan Phase 7.
- Server-side calls (RajaOngkir, email worker) memakai `createServerFn` di `src/lib/*.functions.ts` sesuai konvensi proyek.

## Urutan eksekusi yang disarankan
Phase 1 → 2 → 3 → 4 → 5 → 6.
Saya bisa mulai dari Phase 1 (housekeeping) supaya routing & SQL placeholder bersih, lalu lanjut wire fitur P0.
