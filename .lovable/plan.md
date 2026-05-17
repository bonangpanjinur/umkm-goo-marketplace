# Analisis Menyeluruh UMKMgo & Rencana Perbaikan

Audit cepat terhadap 286 route, struktur server functions, dan dokumen `.lovable/plan.md`. Berikut potret kondisi saat ini dan rencana perbaikan bertingkat.

## 1. Potret Kondisi

### Yang sudah kuat
- **Cakupan fitur sangat luas**: 286 halaman mencakup 11 kategori UMKM (F&B, retail, jasa, rental, kursus, salon, klinik, studio foto, travel, custom-order, lainnya) + portal Admin, Owner (`pos-app`), Kurir, Customer (`/akun`, `/s/$slug`, `/toko/$slug`).
- **Infrastruktur multi-tenant**: roles via RPC `has_role`, subtype kategori usaha, feature flags (`feature_overrides`), gating nav per kategori.
- **Backend modern**: Supabase + TanStack Start server functions, Drizzle untuk payment, webhook Midtrans/Xendit pakai Web Crypto (isomorphic safe).
- **Sudah selesai Fase A/B/C/D/E sebagian** sesuai `.lovable/plan.md` — termasuk module/lesson builder kursus dengan DnD + status draft/published + preview.

### Masalah utama yang teridentifikasi
| # | Area | Masalah | Dampak |
|---|------|---------|--------|
| 1 | **Type safety** | ~1.399 occurrences `as any` di `src/` | Kehilangan auto-complete, bug runtime tak tertangkap |
| 2 | **Error handling route** | 0 route punya `errorComponent`/`notFoundComponent` (dari 286) | Runtime error → blank screen, UX buruk |
| 3 | **Test coverage** | Hanya 2 unit test + 1 e2e spec | Regresi gampang lolos saat scope sebesar ini |
| 4 | **Bundle size** | `pos-app.tsx` 910 baris, `pos-app.pos.tsx` 1001 baris | First-load lambat, sulit di-maintain |
| 5 | **Notifikasi otomatis** | Data ada (obat ED, stok rendah, maintenance, batch travel), scheduler/cron belum dibangun | Owner tak tahu sampai cek manual |
| 6 | **Subtype gating UI** | Subtype tersimpan, tapi banyak form (rental, salon, retail, travel) belum fork field per subtype | UX tidak relevan per jenis usaha |
| 7 | **Sample data seeding** | Outlet baru kosong setelah onboarding | Bounce rate owner baru tinggi |
| 8 | **Reporting per kategori** | `reports.tsx` masih generic | Owner tak dapat metric khas: occupancy rental, batch-fill travel, course-completion kursus |
| 9 | **Gap fitur per kategori** | Lihat `.lovable/plan.md` — masih ada item di F&B (allergen, dine-in/takeaway, modifier required), Retail (matrix varian flat — meski file `variant-matrix.tsx` sudah ada perlu integrasi POS + barcode scanner), Travel (form bias umroh untuk subtype wisata), Custom Order (e-sign), Klinik (BPJS/ICD-10), Studio (watermark editor, multi-fotografer) | Pengalaman per vertikal tidak setara |
| 10 | **Marketplace** | Belum ada filter kategori + subtype di storefront marketplace publik | Discovery lemah |
| 11 | **Operational** | Belum ada audit/observability dashboard yang menggabungkan webhook log + edge function log + error boundary catches | Sulit triage produksi |

### Risiko keamanan & data
- RLS sudah ada (per memory), tapi 1.399 `as any` membuat client bisa kirim kolom yang tidak terduga — perlu audit insert/update di route Owner.
- Webhook Midtrans/Xendit sudah signature-verified (Fase sebelumnya), tapi belum ada **idempotency log** terpusat untuk replay attack / double-credit.
- Belum ada **rate-limit** di server route `/api/public/*` selain signature check.

---

## 2. Rencana Perbaikan (Fase F → I)

Disusun by ROI: stabilitas dulu, baru fitur baru.

### Fase F — Stabilitas & QA (1 batch)
Tujuan: turunkan bug rate sebelum menambah fitur baru.
1. **Error boundary global + per-route grup**: tambah `defaultErrorComponent` di `router.tsx`, `notFoundComponent` di `__root.tsx`, dan `errorComponent` di grup route penting (`pos-app.tsx`, `admin.tsx`, `s.$slug.tsx`, `kurir.tsx`, `akun.tsx`).
2. **Hapus `as any` di hotspots**: target 200 occurrences pertama di route Owner yang paling sering dipakai (`pos-app.pos.tsx`, `pos-app.orders.tsx`, `pos-app.inventory.tsx`, `pos-app.menu.tsx`). Pakai tipe dari `src/integrations/supabase/types.ts`.
3. **Code splitting**: pisah `pos-app.pos.tsx` jadi `CartPanel`, `MenuGrid`, `PaymentDialog` lazy-loaded (sebagian sudah ada di `components/pos/refactor/` — tinggal wire).
4. **Smoke test pack**: tambah Playwright spec untuk 5 alur kritis (login owner, buat order POS, checkout customer marketplace, login kurir + ambil order, admin lihat shops).

### Fase G — Notifikasi & Automasi ✅
1. ✅ **Scheduler tunggal** `/api/public/hooks/scheduler` (pg_cron tiap 15 menit) — obat hampir ED (≤30 hari), stok rendah (ingredients + medications), maintenance rental (≤7 hari), batch travel ≤7 hari & terisi <80%, auto-cancel order pending lewat deadline `platform_settings`. Notifikasi pakai `owner_notifications.dedupe_key` agar idempotent.
2. ✅ **Idempotency log webhook** — tabel `webhook_events` (unique provider+event_id). Webhook plan-billing memeriksa duplikat sebelum memproses; replay → 200 tanpa side-effect.

### Fase H — Penyelesaian fitur per kategori (high-ROI sisa)
1. ✅ **F&B**: kolom `allergens[]` + `is_halal` + `available_modes[]` + `nutrition_info` di form menu (advanced tab), badge Halal/mode di halaman produk storefront, modifier `is_required` (sudah ada). _Sisa_: `min_select` modifier (perlu migration).
2. ✅ **Retail (sebagian)**: kolom `barcode` di `menu_items` + `menu_item_variants` (+ index sku/barcode per shop), input SKU/Barcode di form menu, scanner `@zxing/browser` (`BarcodeScannerDialog`) terintegrasi di POS — lookup barcode/SKU → menu_items dulu lalu fallback ke varian, auto add-to-cart. _Sisa_: UI CRUD varian (matrix size × color) dan stok per varian di POS.
3. ✅ **Jasa/Salon/Klinik (slot generator)**: dialog `RecurringSlotDialog` di `/pos-app/booking` — generate slot mingguan berdasarkan template (rentang tanggal, weekdays, jam mulai/akhir, interval, durasi, kapasitas, harga, DP%) dengan skip-existing, batch insert chunked 200 baris. Mode `service` & `table`.
4. ✅ **Travel (form alternatif)**: `/pos-app/umroh-packages` sekarang men-fork field berdasarkan `package_type` (umroh/hajj vs tour-domestic/tour-international/event). Subtype shop dipakai untuk default tipe. Field hotel Mekkah/Madinah & harga Quad/Triple/Double hanya untuk umroh/hajj; tour pakai "Transportasi" + "Harga per Orang". Tambah filter tipe, badge tipe di kartu, dan textarea includes/excludes per baris.
4. **Custom Order**: ~~e-sign kontrak~~ ✅ H.5 — `SignaturePad.tsx`, route `/kontrak/$token`, bucket `contract-signatures`, tombol Salin Link di `pos-app.contracts.tsx`. Detail Custom Order (`pos-app.custom-orders.tsx`) sekarang punya panel kontrak tertaut (`custom_order_requests.contract_id` → `freelance_contracts`): tombol "Buat kontrak", Salin link TTD, kirim WA, dan preview + tombol Unduh PNG tanda tangan dari storage.
5. ✅ **Klinik** H.6 — `patient_records` punya kolom NIK/`bpjs_number`/`payer_type` (umum/bpjs/asuransi) + badge BPJS di header. `patient_visits` punya `icd10_code`/`icd10_label`. Tabel referensi `icd10_codes` (44 kode primer berbahasa Indonesia) + komponen `Icd10Picker.tsx` (popover search by kode/nama/kategori) terpasang di dialog kunjungan.
6. ✅ **Studio** H.7 — Watermark editor (`/pos-app/studio-watermark`) dengan logo upload (bucket `studio-watermarks`), teks, posisi (6 opsi termasuk tile), opasitas, skala, rotasi + live preview. Settings disimpan di `shops.watermark_settings` (jsonb). Multi-fotografer (`/pos-app/studio-photographers`) CRUD tim (nama, peran, kontak, warna label, status aktif). Dropdown fotografer terpasang di dialog galeri klien (`pos-app.studio-gallery.tsx`) — `studio_galleries.photographer_id` & `bookings.photographer_id` (FK SET NULL).
7. ✅ **Subtype-aware form helper** H.8 — `useShopSubtype()` (`src/lib/use-shop-subtype.ts`) membaca `v_shop_capabilities` & expose `category`, `subtype`, `flows`, `is()`, `isCategory()`, `matches({category|subtype|feature|flow})`. Wrapper `<SubtypeField subtype={[...]} category=... feature=... flow=... invert any=[...] fallback=...>` (`src/components/SubtypeField.tsx`) untuk gating field/section per kategori/subtype tanpa boilerplate.
8. ✅ **Sample data seeding** H.9 — `src/lib/seed-sample-data.ts` berisi template per kategori (fnb/retail/jasa/rental/kursus/salon/klinik/studio-foto/travel/custom-order/lainnya) → insert ke `categories`+`menu_items` dan/atau `service_bundles`. Tombol "Tambahkan" di Step 5 onboarding (`onboarding.tsx`) memicu seeding sekali pakai dengan feedback jumlah item.

### Fase I — Reporting & Marketplace polish
1. ✅ **Reporting per kategori** I.1 — `pos-app.reports.tsx` sekarang pakai Tabs (Penjualan + tab kategori). Komponen di `src/components/reports/CategoryReports.tsx`: `RentalReport` (occupancy unit-hari + ranking per unit), `TravelReport` (% terisi per `umroh_packages`), `KursusReport` (enroll vs `course_certificates`), `KlinikReport` (kunjungan harian, top ICD-10, breakdown penjamin), `LeadConversionReport` (jasa/salon/studio: leads→won, booking→confirmed, sumber leads). Tabs tampil otomatis via `useShopSubtype().category`.
2. **Marketplace filter** kategori + subtype + lokasi di `index.tsx` & `katalog.$slug.tsx`.
3. **Owner observability**: gabung webhook log + audit log + error boundary catches ke 1 halaman `admin.observability` (sudah ada `admin.activity.tsx` — perluas).

---

## 3. Saran Eksekusi

- Saya rekomendasikan **mulai dari Fase F** (stabilitas) sebelum menambah fitur baru — 1.399 `as any` dan 0 error boundary adalah bom waktu untuk app sebesar ini.
- Jika Anda ingin tetap lanjut menambah fitur, bisa **paralel** Fase F.1 + F.4 (error boundary + smoke test) dengan Fase H.1 (F&B allergen/mode order).
- Setiap fase bisa dikerjakan dalam beberapa pesan; biar tidak terlalu besar per batch.

**Pertanyaan untuk Anda**: mulai dari mana?
- (A) Fase F penuh — stabilitas dulu.
- (B) Fase F.1 + F.4 paralel dengan Fase H.1 (F&B).
- (C) Langsung Fase H — fitur per kategori.
- (D) Lain (sebutkan).