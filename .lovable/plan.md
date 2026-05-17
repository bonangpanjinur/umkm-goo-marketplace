
# Analisis Kebutuhan & Kekurangan — Update Pasca Fase A/B/C

Konteks: Fase A (kritis), B (penting), C (polish admin + onboarding wizard + subtype + revenue-per-category) sudah selesai. Onboarding wizard sudah menyimpan kategori + subtype dan auto-create outlet awal. Halaman & module yang sudah ada di-cross-check ke daftar `pos-app.*` (282 route file) dan `FEATURE_KEYS`.

Legenda: ✅ selesai · ⚠️ ada tapi belum tuntas · ❌ belum ada

---

## 1. F&B / Kuliner (`fnb`)
Sudah ada: POS, KDS, kitchen-load, combo-builder, tables, table-maps, table-qr, reservasi, antrian, waitlist, recipes, suppliers, shifts, limited-editions, pre-orders, custom-orders, followup-reminders.

Masih kurang:
- ❌ **Allergen / halal / nutrition badge** di menu (kolom + editor + tampil di storefront).
- ❌ **Mode order eksplisit dine-in / takeaway / delivery** di POS (sekarang implicit lewat channel).
- ❌ **Modifier wajib vs opsional** + validasi minimum pilihan di storefront.
- ⚠️ `kitchen-load` belum punya indikator beban real-time per station (grill/cold/bar).
- ❌ **Menu seasonal / rekomendasi rotasi** terpisah dari limited-editions.
- ⚠️ `combo-builder` belum mengunci stok bahan saat checkout.

## 2. Retail / Toko (`retail`)
Sudah ada: POS, variants, inventory, suppliers, shifts, size-guide, lookbook, limited-editions, bundles, pre-orders, **product-returns** (Fase A).

Masih kurang:
- ❌ **Matrix varian (size × color × material)** dengan stok per SKU + barcode (varians sekarang flat list).
- ❌ **Barcode / SKU scanner** native di POS (sekarang ketik manual).
- ❌ **Serial number tracking** untuk elektronik / item bergaransi.
- ❌ **Stock transfer antar outlet** (outlets sudah ada, transfer UI belum).
- ❌ **Label harga / shelf-tag printer** template.
- ⚠️ `size-guide` masih satu tabel global — belum per kategori produk / brand.

## 3. Jasa Umum (`jasa`)
Sudah ada: booking, service-bundles, staff-picker, followup-reminders, antrian, waitlist, portfolio, leads, testimonials.

Masih kurang:
- ❌ **Service catalog dengan durasi + buffer time** terpisah dari Menu (sekarang pakai menu generik).
- ❌ **Lokasi onsite / di tempat customer** + biaya jarak / radius.
- ❌ **Form intake / kuesioner pra-layanan** yang dapat dikonfigurasi.
- ❌ **Recurring booking** (mingguan/bulanan) untuk cleaning, laundry, perawatan.
- ⚠️ `staff-picker` belum menampilkan rating & spesialisasi staf di storefront.

## 4. Rental (`rental`)
Sudah ada: rental-availability, rental-deposit-config, rental-fines, rental-checklist, rental-tnc, rental-extend, rental-unit-ready, **rental-inspections** + bucket foto (Fase A), kyc (umum), subtype mobil/motor/alat-berat/kostum/sepeda di `business_categories.subtypes` (Fase C).

Masih kurang:
- ⚠️ **KYC khusus rental** (KTP + SIM + selfie holding KTP) — `kyc.tsx` ada tapi belum punya template per subtype rental.
- ❌ **Asuransi + add-on** (helm, child seat, sopir, jasa antar).
- ❌ **Multi-unit booking** dalam satu transaksi (rombongan, fleet booking).
- ❌ **Maintenance schedule per unit** (servis berkala, odometer/jam pakai).
- ❌ **Field & form spesifik subtype** (plat nomor + STNK untuk mobil/motor; ukuran/material untuk kostum; sertifikasi operator untuk alat berat) — subtype sudah disimpan tapi UI per subtype belum berbeda.
- ❌ **Integrasi GPS / telematics** (opsional / placeholder).

## 5. Kursus / Edukasi (`kursus`)
Sudah ada: digital, digital-licenses, digital-version, kursus (placeholder), certificates, akun.kursus.$courseId (ringan).

Masih kurang (gap terbesar dari semua kategori):
- ❌ **Module / lesson builder** (video, PDF, kuis, urutan, durasi) — `pos-app.kursus.tsx` belum jadi builder.
- ❌ **Progress tracking & quiz engine** di sisi student (`akun.kursus.$courseId` belum punya state lesson completion).
- ❌ **Sertifikat otomatis** terpicu saat progress 100% (sertifikat sudah ada tapi belum ter-wire ke progress).
- ❌ **Kohort / batch enrollment** dengan tanggal mulai + kapasitas.
- ❌ **Live session / Zoom / Meet link** per pertemuan.
- ❌ **Diskusi / Q&A** per pelajaran.

## 6. Salon / Beauty (`salon`)
Sudah ada: booking, staff-picker, service-bundles, antrian, waitlist, portfolio, lookbook, skin-quiz, membership, **customer-treatments** (Fase B, riwayat + foto + alergi).

Masih kurang:
- ❌ **Membership berbasis sesi (paket 10x potong)** — `membership.tsx` belum punya tipe `session-credit` + counter pemakaian.
- ❌ **Inventory produk retail (jual shampoo / serum)** — feature `INVENTORY` belum default-on untuk salon; perlu di-enable via subtype salon yang menjual produk.
- ⚠️ `skin-quiz` belum auto-recommend treatment (hasil belum tersambung ke service catalog).
- ❌ **Before/after gallery per pelanggan** dengan privacy toggle (komponen `BeforeAfterSlider` sudah ada tapi belum dipakai di salon).

## 7. Klinik / Medis (`klinik`)
Sudah ada: booking, anamnesis, patient-records, medical-invoice, antrian, waitlist, **medications** + **prescriptions** (Fase A: stok obat + low-stock/expiry + resep digital).

Masih kurang:
- ⚠️ `patient-records` belum punya struktur ICD-10 / kode tindakan BPJS.
- ❌ **Klaim asuransi / BPJS** template & export.
- ❌ **Tele-konsultasi** (video call slot + link).
- ❌ **Informed-consent digital** + tanda tangan.
- ⚠️ **Stok obat expiry** sudah ter-track; belum ada notifikasi otomatis (cron / email) ke owner.

## 8. Studio Foto (`studio-foto`)
Sudah ada: booking, portfolio, studio-packages, studio-delivery, studio-brief, studio-addons, studio-locations, studio-photo-reviews, **studio-gallery** (Fase B: token share + watermark + limit pilihan).

Masih kurang:
- ❌ **Multi-fotografer assignment** per sesi (job sharing).
- ❌ **Reschedule policy & DP forfeit** explicit (rules + UI).
- ⚠️ Komponen `BeforeAfterSlider` belum dipakai di studio (retouch sebelum/sesudah).
- ❌ **Watermark editor** (logo + posisi + opacity) — saat ini watermark hardcoded.
- ❌ **Auto-expire share link** per kebijakan paket.

## 9. Travel (`travel`)
Sudah ada: umroh-packages, umroh-facilities, umroh-faq, flyers, testimonials, leads, about-page, **travel-manifest** + **travel-installments** (Fase A), subtype umroh/wisata-domestik/wisata-internasional (Fase C).

Masih kurang:
- ❌ **Itinerary harian editor** (hari-per-hari, jam, lokasi, foto).
- ❌ **Departure date / quota per batch** terstruktur (sekarang teks bebas di package).
- ❌ **Dokumen jamaah tracker** (paspor + visa + vaksin + status) terpisah dari manifest.
- ❌ **Travel insurance add-on** sebagai SKU opsional.
- ❌ **Refund / cancellation policy** per paket + tier.
- ❌ **Paket non-umroh UI berbeda** — schema sudah generic, tapi form di `pos-app.umroh-packages` masih bias umroh; perlu form alternatif untuk subtype `wisata-*`.

## 10. Custom Order (`custom-order`)
Sudah ada: custom-orders, custom-order-quotes, milestones, contracts, job-deliverables, pre-orders, wip-gallery, portfolio, leads, testimonials, flyers.

Masih kurang:
- ⚠️ **Quote versioning + diff** antar revisi.
- ❌ **Approval flow tiap milestone** (klien klik approve → trigger invoice / next phase).
- ❌ **File asset library** per project (revisi gambar, brief, referensi) terpusat.
- ⚠️ `contracts` belum mendukung **e-sign / tanda tangan digital**.
- ❌ **Time tracking & jam billable** untuk freelance / jasa kreatif.

## 11. Lainnya (`lainnya`)
Super-set semua flow.

Masih kurang:
- ⚠️ Navigasi penuh sesak — perlu **wizard "pilih modul"** post-onboarding (capabilities.tsx sekarang read-only).
- ❌ **Feature toggle UI** (enable/disable per FEATURE_KEY) yang menulis ke `shops.feature_overrides`.

---

## Gap lintas-kategori (Cross-cutting)

1. ⚠️ **Subtype gating UI** — subtype sudah tersimpan, tapi sebagian halaman (rental, salon, retail) belum mem-fork tampilan/field berdasarkan subtype. Perlu helper `useShopSubtype()` + pattern conditional form.
2. ❌ **Sample data seeding per kategori** (menu/produk/paket awal) saat onboarding selesai — sekarang outlet dibuat kosong.
3. ❌ **Template tema per subtype** (mis. `rental-drive-mobil` vs `rental-drive-motor`) — registry tema masih 1 tema per kategori.
4. ❌ **Reusable doc-upload component** (KTP/SIM/paspor) dengan OCR placeholder + validasi format.
5. ⚠️ **Reporting per kategori** — `reports.tsx` masih generic. Perlu metric khas: occupancy (rental), lead-to-booking (jasa/salon), capacity-fill (klinik), batch-fill (travel), course-completion (kursus).
6. ❌ **Marketplace category & subtype filter** di storefront marketplace.
7. ❌ **Feature toggle owner UI** di `pos-app.capabilities.tsx` (write ke `shops.feature_overrides.enable/disable`).
8. ⚠️ **Notifikasi otomatis** untuk: obat hampir expired, stok rendah, jadwal maintenance rental, batch travel hampir penuh — semua data ada, scheduler/cron belum dibangun.

---

## Rekomendasi prioritas berikutnya

**Fase D — UX gating & customisasi pemilik:**
- Feature toggle owner UI (`capabilities.tsx` writable).
- Subtype-aware form fork (rental subtype, retail subtype, salon subtype).
- Sample data seeding per kategori saat onboarding.

**Fase E — Module spesifik dengan ROI tinggi:**
- Kursus: module/lesson builder + progress tracking + auto-certificate.
- Retail: matrix varian + barcode scanner + stock transfer.
- Travel: itinerary harian + batch+quota + dokumen tracker.
- F&B: allergen/halal + mode dine-in/takeaway/delivery + modifier required.

**Fase F — Polish & otomasi:**
- Reporting metric khas per kategori.
- Scheduler notifikasi (expiry/low-stock/maintenance).
- E-sign kontrak + quote versioning.
- Reusable doc-upload (KTP/SIM/paspor).
- Marketplace filter kategori + subtype.

---

Mau saya lanjut dari Fase D, E, atau langsung pilih beberapa item spesifik (mis. "kursus builder + matrix varian + feature toggle UI")?
