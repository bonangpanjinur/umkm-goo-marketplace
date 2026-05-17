
# Analisis Kebutuhan & Kekurangan per Kategori Bisnis

Basis: 11 kategori aktif di `business_categories` + `enabled_features` saat ini + halaman `pos-app.*` yang sudah ada + tema rekomendasi.

Legenda:
- ✅ Sudah ada & cocok
- ⚠️ Ada tapi belum lengkap / butuh penyesuaian
- ❌ Belum ada / masih kosong

---

## 1. F&B / Kuliner (`fnb`) — flow T1+T3
Fitur aktif: POS, MENU, KDS, TABLES, INVENTORY, VARIANTS, RECIPES, COMBO_BUILDER, SUPPLIERS, SHIFTS, RESERVASI, ANTRIAN, WAITLIST, LIMITED_EDITIONS, PRE_ORDERS, CUSTOM_ORDER, CUSTOM_ORDER_QUOTES, FOLLOWUP_REMINDERS

Gap:
- ⚠️ `kitchen-load` / `kds` belum punya indikator beban dapur real-time per station.
- ❌ **Allergen/halal/nutrition badge** di menu — belum ada kolom + UI editor.
- ❌ **Mode dine-in vs takeaway vs delivery** explicit di POS (sekarang masih implicit).
- ❌ **Modifier wajib vs opsional** validation di customer storefront menu.
- ⚠️ `combo-builder` perlu validasi stock real-time saat sesi POS.
- ❌ Halaman **menu rekomendasi/seasonal** terpisah.

## 2. Retail / Toko (`retail`) — flow T1
Fitur aktif: POS, MENU, VARIANTS, INVENTORY, SUPPLIERS, SHIFTS, SIZE_GUIDE, LOOKBOOK, LIMITED_EDITIONS, BUNDLES, PRE_ORDERS

Gap:
- ❌ **Matrix varian (size × color × material)** dengan stok per SKU & barcode — kritis untuk fashion.
- ❌ **Barcode / SKU scanner** native di POS (sekarang ketik manual).
- ❌ **Serial number tracking** untuk elektronik.
- ❌ **Gudang multi-lokasi & stock transfer** (sebagian sudah di `outlets`, tapi tanpa UI transfer stok).
- ⚠️ `size-guide` masih flat — belum per kategori produk.
- ❌ **Retur barang & exchange** workflow (Customer punya `akun.returns` tapi sisi merchant belum).
- ❌ **Label harga / shelf-tag printer** template.

## 3. Jasa Umum (`jasa`) — flow T3
Fitur aktif: BOOKING, STAFF_PICKER, SERVICE_BUNDLES, FOLLOWUP_REMINDERS, ANTRIAN, WAITLIST, PORTFOLIO, CUSTOM_ORDER, CUSTOM_ORDER_QUOTES, LEADS, TESTIMONIALS

Gap:
- ❌ **Service catalog dengan durasi & buffer time** terpisah dari Menu.
- ❌ **Lokasi layanan: onsite/di-tempat-customer** + biaya jarak.
- ❌ **Form intake** (kuesioner pra-layanan) yang dapat dikonfigurasi.
- ⚠️ `staff-picker` belum menampilkan rating & spesialisasi staf.
- ❌ **Recurring booking** (mingguan/bulanan) untuk cleaning, laundry, dll.

## 4. Rental (`rental`) — flow T4
Fitur aktif: RENTAL, RENTAL_AVAILABILITY, RENTAL_DEPOSIT, RENTAL_FINES, RENTAL_CHECKLIST, RENTAL_TNC, RENTAL_EXTEND, RENTAL_UNIT_READY, LEADS, TESTIMONIALS, PORTFOLIO

Gap:
- ❌ **Identitas & verifikasi KYC penyewa** (KTP/SIM upload) — wajib untuk kendaraan.
- ❌ **Asuransi & opsi tambahan** (helmet, child seat, sopir).
- ⚠️ `rental-checklist` belum mendukung foto sebelum/sesudah dengan diff visual.
- ❌ **Geolokasi / GPS tracker hook** untuk unit (opsional via integrasi).
- ❌ **Multi-unit booking** dalam satu transaksi (rombongan).
- ⚠️ Sub-kategori "mobil/motor/alat berat/kostum/sepeda" belum punya field & template — sekarang generic.
- ❌ **Maintenance schedule per unit** (servis berkala).

## 5. Kursus / Edukasi (`kursus`) — flow T2+T3
Fitur aktif: DIGITAL, DIGITAL_LICENSES, DIGITAL_VERSION, KURSUS, LEADS, TESTIMONIALS, PORTFOLIO

Gap:
- ❌ **Module/lesson builder** (video, PDF, kuis) — `pos-app.kursus.tsx` masih placeholder list.
- ❌ **Sertifikat otomatis** sesudah selesai (sudah ada `certificates.tsx` tapi belum ter-wire ke progress kursus).
- ❌ **Progress tracking & quiz** di sisi student (`akun.kursus.$courseId` masih ringan).
- ❌ **Live session / Zoom integration**.
- ❌ **Kohort / batch enrollment** dengan jadwal mulai.

## 6. Salon / Beauty (`salon`) — flow T3
Fitur aktif: BOOKING, STAFF_PICKER, SERVICE_BUNDLES, FOLLOWUP_REMINDERS, ANTRIAN, WAITLIST, PORTFOLIO, LOOKBOOK, TESTIMONIALS

Gap:
- ❌ **Riwayat treatment per customer** (formula warna, alergi) — semi rekam-medis ringan.
- ❌ **Membership berbasis sesi** (paket 10x potong) — `membership.tsx` ada tapi belum punya tipe "session-credit".
- ⚠️ `skin-quiz.tsx` ada — perlu mapping otomatis ke rekomendasi treatment.
- ❌ **Sebelum/sesudah gallery per pelanggan** (privacy-aware).
- ❌ **Inventory produk retail (jual shampoo dll)** — feature INVENTORY tidak aktif; perlu opsi toggle.

## 7. Klinik / Medis (`klinik`) — flow T3
Fitur aktif: BOOKING, ANAMNESIS, MEDICAL_INVOICE, PATIENT_RECORDS, ANTRIAN, WAITLIST, FOLLOWUP_REMINDERS, STAFF_PICKER, LEADS, RESERVASI

Gap:
- ❌ **Resep digital (e-prescription) + database obat**.
- ❌ **Tele-konsultasi** (video call slot).
- ❌ **Klaim asuransi / BPJS** template.
- ⚠️ `patient-records` belum punya struktur ICD-10 / tindakan kode BPJS.
- ❌ **Inform-consent digital** + tanda tangan.
- ❌ **Stok obat & expiry alert** (INVENTORY belum aktif untuk klinik).

## 8. Studio Foto (`studio-foto`) — flow T2+T3
Fitur aktif: BOOKING, PORTFOLIO, STUDIO_PACKAGES, STUDIO_DELIVERY, STUDIO_BRIEF, STUDIO_ADDONS, DIGITAL, LEADS, TESTIMONIALS, FLYERS

Gap:
- ⚠️ `studio-delivery` belum punya **gallery selection client-side** (klien pilih foto final dari proof).
- ❌ **Watermark otomatis & expire link**.
- ❌ **Reschedule policy & DP forfeit** explicit.
- ❌ **Multi-fotografer assignment** per sesi.
- ⚠️ `before-after` slider sudah ada komponennya — belum dipakai di studio.

## 9. Travel / Umroh (`travel`) — flow T3
Fitur aktif: UMROH_PACKAGES, UMROH_FACILITIES, UMROH_FAQ, FLYERS, TESTIMONIALS, LEADS, ABOUT_PAGE, RESERVASI, STAFF_PICKER

Gap kritis (kategori paling tidak lengkap untuk travel umum):
- ❌ **Paket travel non-umroh** (tour domestik/internasional) — schema sekarang umroh-centric.
- ❌ **Manifest jamaah & data paspor** (kewajiban hukum umroh).
- ❌ **Pembayaran cicilan / installment** dengan jadwal.
- ❌ **Itinerary harian** editor.
- ❌ **Departure date / quota** per batch.
- ❌ **Dokumen jamaah** (paspor, visa, vaksin) upload tracker.
- ❌ **Travel insurance add-on**.

## 10. Custom Order (`custom-order`) — flow T5
Fitur aktif: CUSTOM_ORDER, CUSTOM_ORDER_QUOTES, MILESTONES, CONTRACTS, JOB_DELIVERABLES, PRE_ORDERS, PORTFOLIO, LEADS, TESTIMONIALS, FLYERS

Gap:
- ⚠️ `quote.$id` dan `custom-order-quotes` ada — belum ada **versi quote / revisi** dengan diff.
- ❌ **Approval flow tiap milestone** (klien klik approve).
- ❌ **File asset library** per project (revisi gambar, brief).
- ⚠️ `contracts` belum mendukung **tanda tangan digital** (e-sign).
- ❌ **Time tracking & jam billable** untuk freelance.

## 11. Lainnya (`lainnya`) — flow T1+T2+T3+T4+T5
Fitur aktif: campuran (POS, MENU, VARIANTS, INVENTORY, BOOKING, RENTAL, DIGITAL, CUSTOM_ORDER, SHIFTS, ANTRIAN, PORTFOLIO, LEADS, TESTIMONIALS)

Gap:
- ⚠️ Karena super-set, **navigasi penuh sesak** — perlu owner wizard "pilih modul yang ingin diaktifkan" agar UI tidak overwhelm.
- ❌ **Custom feature toggle UI** (`pos-app/capabilities.tsx` baru read-only) — owner harus bisa enable/disable per fitur.

---

## Gap lintas-kategori (Cross-cutting)

1. **Pengelolaan kategori bisnis di Admin** — `admin.categories.tsx` belum punya editor `enabled_features`, `recommended_theme_key`, `product_attributes` via UI; sekarang via migration.
2. **Marketplace category filter** — storefront marketplace belum filter by kategori bisnis (mis. "cari hanya rental mobil").
3. **Onboarding wizard** — `onboarding.tsx` belum menyarankan **template lengkap per kategori** (sample produk + tema + service catalog awal).
4. **Subtype (`business_subtype`)** baru dipakai untuk `umroh|sales`. Perlu diperluas: `mobil|motor|alat-berat|kostum|sepeda` (rental); `fashion|elektronik|grocery|bangunan` (retail); `coffee|resto|bakery|bar` (fnb).
5. **Theme variants per subtype** — saat ini 1 tema per kategori. Idealnya `rental-drive-mobil` vs `rental-drive-motor` dengan hero asset berbeda.
6. **Sample data seeding** per kategori untuk demo cepat.
7. **Field validasi dokumen** (KTP/SIM/paspor) — reusable component belum ada.
8. **Reporting per kategori** — `reports.tsx` masih generic; butuh metric khas (occupancy untuk rental, lead-to-booking untuk jasa, capacity untuk klinik).

---

## Rekomendasi prioritas implementasi

**Fase A — Kritis (high impact, gap besar):**
1. Travel: paket non-umroh + manifest jamaah + cicilan
2. Rental: KYC penyewa + sub-tipe (mobil/motor) + foto checklist before/after
3. Klinik: e-resep + stok obat
4. Retail: matrix varian + barcode scanner + retur

**Fase B — Penting:**
5. Kursus: module builder + progress + sertifikat ter-wire
6. F&B: allergen/halal badge + mode dine-in/takeaway/delivery
7. Salon: riwayat treatment + membership session-credit
8. Studio: client gallery selection + watermark

**Fase C — Polish & platform:**
9. Admin: UI editor `business_categories`
10. Onboarding wizard per kategori dengan sample data
11. Subtype expansion + theme variant per subtype
12. Reporting metric khas per kategori
13. Reusable doc-upload component (KTP/SIM/paspor)

---

## Apa yang TIDAK akan dikerjakan di plan ini
Plan ini **murni analisis** — belum ada perubahan kode. Setelah Anda pilih fase mana yang dieksekusi dulu (A/B/C atau item spesifik), saya buat plan implementasi terpisah dengan migration + UI + theme yang dibutuhkan.

**Mau saya mulai dari fase mana?** Atau pilih item-item spesifik dari daftar di atas?
