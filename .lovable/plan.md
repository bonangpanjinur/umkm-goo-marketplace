
# Rencana — Konsolidasi PRD jadi Single Source of Truth

## Tujuan
Hanya ada **satu** dokumen rencana: `PRD_MARKETPLACE.md`. File `.lovable/plan.md` dihapus. Semua isi `plan.md` (Fase 2 seed) + progres F-16 + gap aktual diserap ke PRD.

## Temuan Audit (codebase vs PRD)

**Codebase sekarang:** 271 route di `artifacts/kopihub/src/routes/` (PRD masih mencatat 226 — versi 15 Mei).

**Yang sudah selesai tapi belum tercatat di PRD:**
1. ✅ **Fase 1 F-16** — rename code `require_deposit→deposit_required`, `deposit_percent→deposit_percentage`, `cancellation_token→cancel_token`, status `waiting_payment/verified→pending/paid` di 8 file (toko/pos-app/checkout/booking-cancel/booking-analytics/settings/payments). Migrasi DB tambah kolom `deposit_status`, `deposit_required`, index, plus `shops.deposit_notes/percentage/require_id_upload`.
2. ✅ **Webhook idempotency** — `webhook_logs` di `payments.ts` sekarang pakai `RETURNING id` + filter `WHERE id=logId`.
3. ✅ **Fase 2 seed** — 11 `business_categories`, 3 `plans` + 12 `plan_features`, 4 `features` master, role `super_admin` + `owner` untuk owner pertama, 12 `platform_settings` default.
4. ✅ **Booking reschedule mandiri** (`booking.reschedule.$token.tsx`).
5. ✅ **Plan-billing webhook + checkout** (`api/public/webhooks/plan-billing.$provider.ts`).
6. ✅ **Subscriptions / recurring billing** (`pos-app.subscriptions.tsx`).
7. ✅ Infra role multi-UMKM (pelayan/gudang/koki/helper/supervisor), `has_role` RPC, `/kurir` portal, audit helpers, realtime order toast, `SetupChecklist` widget.

**Bug/gap yang masih open (belum di PRD):**
- B5: `markDepositPaid` masih trust client — webhook harus jadi truth source.
- B6: dualism config deposit (`shops.booking_config.deposit_*` jsonb vs `shops.deposit_*` kolom) — perlu deprecate JSON path.
- Cron auto-cancel booking pending DP > 24 jam — belum ada.
- F-16 client gateway init (Midtrans Snap) — belum ada.
- Hardening: RLS policies `USING (true)`, `search_path` mutable, public bucket listing, extensions di schema `public`.
- Item PRIORITAS SEDANG yang masih ❌: SF-04 Portfolio publik, SF-03 Lokasi sesi, SF-09 Review foto, BE-03 Skin type tag, KL-03 Rekam medis, JU-05 Deliver hasil kerja, SA-05 Booking config per kategori.

## Aksi (dieksekusi pada turn berikutnya)

### A. Hapus file rencana ganda
- `rm .lovable/plan.md` (isinya sudah obsolete; Fase 2 sudah dieksekusi).

### B. Update PRD_MARKETPLACE.md (in-place, surgical)
1. **Header versi** → `Versi 6.2 | Diperbarui: 17 Mei 2026`.
2. **Banner audit (baris 23-28)** → ganti tanggal jadi "17 Mei 2026", angka route 271, catatan: status Fase Cloud + F-16 diselaraskan.
3. **Sisip seksi baru** sebelum "BAGIAN 0" (di atas baris 215), judul:
   **`BAGIAN F: STATUS FASE INTEGRASI CLOUD & F-16`**
   Isi:
   - F-16 Fase 1: code align ✅
   - F-16 Fase 2: seed inti ✅ (tabel 11 kategori, 3 plan, super_admin, 12 settings — copy ringkas dari plan.md)
   - F-16 Fase 3: konsolidasi config deposit ❌ (deprecate `booking_config.deposit_*`, jadikan kolom `shops.deposit_*` satu-satunya truth)
   - F-16 Fase 4: cron auto-cancel + e2e + audit log eskalasi ❌
   - F-16 Fase 5: hardening RLS / search_path / bucket / extension ❌
   - F-16 Fase 6 (baru): Midtrans Snap client init + redirect handler ❌
4. **Update tabel ⚠️ Sebagian Selesai (baris 76-84)** → tambah baris:
   - B5 markDepositPaid (perlu pindah ke webhook-only)
   - B6 Dualism deposit config (perlu satu sumber)
5. **Update tabel P3 (baris 105-121)** → tandai F-16 sebagai "🔧 Sebagian — gateway init belum, infra DB ✅".
6. **Update Backlog Aktual (baris 2950-2962)** → isi tabel "Belum diimplementasi" dengan list gap di atas; tambah seksi "Sprint 17 Mei 2026 — Selesai ✅" dengan item Fase 1 & 2.
7. **Penyelarasan tujuan marketplace** → tambah sub-bagian singkat di RINGKASAN EKSEKUTIF (baris 198-213) yang nyatakan:
   - Marketplace = etalase multi-kategori (F&B, retail, jasa, rental, kursus, salon, klinik, studio foto, travel, custom, lainnya — 11 kategori sesuai seed).
   - Booking gateway-ready (DP via Midtrans) jadi syarat go-live Tipe 3/4 dengan deposit > 0.
   - Single source config: kolom kanonik di `shops` & `bookings`, JSON `booking_config` deprecated.

### C. Tidak mengubah
- Konten BAGIAN 0–17 (alur tipe, kategori, tema, POS panel, layout publik) — sudah akurat, hanya status angka yang lewat di seksi audit.
- Tidak menyentuh kode aplikasi pada turn ini (cuma dokumen).

## Hasil Akhir
- 1 file rencana saja: `PRD_MARKETPLACE.md` (v6.2).
- `.lovable/plan.md` tidak ada lagi.
- Status F-16 + Fase Cloud terbaca jelas di PRD.
- Backlog "Belum diimplementasi" terisi konkret → siap dipakai sebagai antrian sprint berikut (Fase 3 F-16 jadi kandidat #1).

