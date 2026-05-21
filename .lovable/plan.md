# Audit Owner/Toko + Super Admin & Rencana Perbaikan

## 1) Fix segera — error migrasi `is_shop_owner(uuid)`

**Penyebab.** Migrasi `20260521060819` (tabel `shop_api_keys`) memakai `public.is_shop_owner(shop_id)` versi 1‑argumen, tapi DB Anda hanya punya versi 2‑argumen `is_shop_owner(_shop_id, _user_id)` dari `00000000000000_init_schema.sql`. Versi 1‑arg dibuat di `20260521054044_…sql` (P0 owner audit), dan migrasi itu kemungkinan belum berjalan (atau berhenti di tengah).

**Perbaikan:** jalankan dulu SQL berikut di SQL Editor, lalu re‑run migrasi `20260521060819`:

```sql
CREATE OR REPLACE FUNCTION public.is_shop_owner(_shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.id = _shop_id AND s.owner_id = auth.uid()
  );
$$;
```

Kalau mau aman jangka panjang: jalankan ulang `20260521054044` dan `20260521055647` secara berurutan — keduanya idempotent (pakai `IF NOT EXISTS` / `CREATE OR REPLACE`). Migrasi `20260521054044` juga membuat 25 tabel (queue/studio/klinik/digital/lookbook/milestone) yang kalau belum ada akan bikin banyak halaman owner 400.

Sebagai pengaman, saya akan tambahkan **migrasi guard** baru yang mendefinisikan ulang `is_shop_owner(uuid)` di awal supaya migrasi setelahnya tidak pernah gagal lagi karena urutan.

---

## 2) Audit fitur Owner/Toko (149 route `pos-app.*`)

Saya kelompokkan berdasarkan status integrasi DB & UX. Detail per‑modul akan saya verifikasi satu per satu saat eksekusi; daftar di bawah adalah temuan tingkat tinggi dari kode + memory `owner-audit-may2026`.

### A. Sudah jalan (DB + UI OK)
POS inti, Orders, KDS, Menu+Variants, Inventory, Outlets, Customers, Loyalty dasar, Promos, Vouchers, Tables/Reservasi, Bookings, Reports/Keuangan, Shifts, Audit Logs, Notifikasi, Domain, Appearance/Theme, Website Builder, Billing, Permissions, Staff, Inbox, Rajaongkir (baru), Rekening Bank.

### B. Wajib diperbaiki (P0 — error/regresi pengguna)
1. **Migrasi 20260521054044/055647/060819 belum tuntas** → banyak halaman owner 400. → Re‑run + guard `is_shop_owner`.
2. **`shop_api_keys`** belum dibuat di DB user → halaman Rajaongkir gagal simpan. Setelah fix #1 ini ikut beres.
3. **Halaman yang masih panggil tabel lama / kolom lama** (mis. `order_number`, `coffee_shops`, `booking_waitlists`) — perlu sweep terakhir. Saya akan grep & perbaiki sisa referensi.
4. **`get_my_entitlements`** sudah dibetulkan, tapi pastikan semua gating Pro/Bisnis baca `active_plan_code` (bukan hardcode).

### C. Belum/parsial integrasi DB (P1)
- `pos-app.email-marketing.tsx` — pakai tabel `email_campaigns*` (sudah dibuat di P0) tapi belum punya pengirim. Perlu server‑fn kirim batch + cron status.
- `pos-app.broadcast-wa.tsx` — perlu integrasi WA gateway (uazapi via server‑fn proxy) + log.
- `pos-app.flash-sale.tsx`, `happy-hour.tsx`, `promo-calendar.tsx` — UI ada, sebagian masih mock. Perlu wiring ke `promos` + cron aktivasi.
- `pos-app.purchase-orders*`, `suppliers`, `restock-notify` — perlu validasi insert ke `purchase_orders/items`, hubungkan ke `inventory_movements`.
- `pos-app.kyc.tsx`, `pos-app.verified-claims.tsx` — perlu storage bucket + RLS + status review oleh super admin.
- `pos-app.subscriptions.tsx` (membership pelanggan) — perlu billing cycle worker.
- `pos-app.wallet-config.tsx` & `wallet-approvals.tsx` — alur withdrawal end‑to‑end ke super admin.
- `pos-app.iklan.tsx` — perlu ledger debit saldo iklan + impression counter.
- Modul vertikal (studio/klinik/umroh/digital/rental/kursus) — tabel sudah dibuat tapi belum semua UI CRUD lengkap. Perlu pass minimal CRUD + RLS check.

### D. UX redundan / perlu konsolidasi (P2)
- "Tampilan Toko / Website Builder / Storefront Builder" sudah disatukan via `TampilanTabs` ✅ — verifikasi tidak ada entry sidebar ganda lagi.
- Banyak halaman laporan (`reports`, `reports.profit`, `laporan-harian`, `marketplace-analytics`, `customer-analytics`) — perlu landing "Laporan" tunggal dengan tab.
- Halaman printer (`printers`, ESC/POS picker) — tambah indikator status koneksi & test print.

### E. Performance (P2)
- Lanjutkan Fase 2 React Query ke: Inventory, Customers, Menu list, Reports (staleTime 30–60s, trim kolom, pagination 30).
- Realtime channel global — saat ini per page subscribe sendiri. Pindahkan ke provider tingkat layout.

---

## 3) Relasi Owner ↔ Super Admin (cek end‑to‑end)

| Alur | Owner side | Super Admin side | Status |
|---|---|---|---|
| Tagihan paket | `pos-app.billing` upload bukti → `plan_invoices.payment_proof_url` | `admin.invoices` approve/reject via `approve_invoice/reject_invoice` | ✅ Setelah fix sebelumnya |
| Withdrawal saldo | `pos-app.keuangan.tarik` request | `admin.withdrawals` approve | ⚠ Cek status transisi & notif |
| KYC | `pos-app.kyc` submit | `admin.kyc` review | ⚠ Belum wired penuh |
| Domain custom | `pos-app.domain` add → `domain-bridge` | `admin.domains` verify | ⚠ SSL probe sudah, perlu badge status di admin |
| Disputes/Refund | order action | `admin.disputes` | ⚠ Belum ada channel buyer→admin escalation |
| Fraud/Health score | otomatis | `admin.fraud-scoring`, `health-score` | ⚠ Trigger metrik perlu cron |
| Iklan/Banner | `pos-app.iklan` topup | `admin.ads` approve creative | ⚠ Belum ada moderation queue |
| Plan/Feature flag | konsumsi `entitlements` | `admin.plans`, `admin.feature-flags` | ✅ Sudah dibetulkan |
| Notifikasi/Broadcast | per shop | `admin.broadcast`, `notification-templates` | ⚠ Templating belum dipakai |
| Audit | `pos-app.audit-logs` (per shop) | `admin.audit` (cross shop) | ✅ |

---

## 4) Rencana Perbaikan Bertahap

### Fase P0 — Stop the bleeding (segera, 1 batch migrasi + sweep code)
1. Migrasi guard: redefinisikan `public.is_shop_owner(uuid)` 1‑arg di awal.
2. Re‑run 20260521054044 + 055647 + 060819 (idempotent).
3. Sweep grep sisa nama kolom/ tabel lama (`order_number`, `coffee_shops`, `booking_waitlists`, `buyer_user_id`, `metadata` di audit).
4. Verifikasi `get_my_entitlements` & gating Pro/Bisnis di semua halaman premium.

### Fase P1 — Integrasi DB yang masih bolong
5. Wire Email Marketing send‑batch (server‑fn + cron `email_campaigns`).
6. Wire Broadcast WA via uazapi (server‑fn proxy + audit log).
7. Wire KYC submit/review (bucket `kyc-docs` + RLS + status workflow super admin).
8. Wire Wallet/Withdrawal end‑to‑end + notifikasi owner saat status berubah.
9. Wire Disputes channel buyer→admin (tabel `disputes` + RLS + state machine).
10. Tutup CRUD minimal modul vertikal yang tabelnya sudah ada (studio/klinik/umroh/digital/rental/kursus/lookbook/milestone).

### Fase P2 — Konsolidasi UX & performa
11. Landing "Laporan" tunggal dengan tab (gabungkan reports/profit/harian/analytics).
12. Pindahkan realtime subscribe ke provider layout `pos-app.tsx`.
13. Lanjut Fase 2 React Query ke Inventory/Customers/Menu/Reports.
14. Indikator printer + test print.

### Fase P3 — Polishing & growth
15. Cron untuk health‑score, fraud‑score, churn‑reengagement.
16. Moderation queue iklan/banner.
17. Templating notifikasi (super admin → owner/buyer).
18. Multi‑outlet shipping & inventory transfer UI.

---

## Detail teknis (untuk eksekusi)

- Tambah file migrasi baru `…_fix_is_shop_owner_guard.sql` berisi `CREATE OR REPLACE FUNCTION public.is_shop_owner(_shop_id uuid) …` agar urutan migrasi tidak pernah pecah.
- Sweep regex: `\border_number\b|\bcoffee_shops\b|\bbooking_waitlists\b|\bbuyer_user_id\b` di `artifacts/kopihub/src/**`.
- Untuk modul vertikal, pakai pola RLS standar: `USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'))`.
- Server‑fn baru (Email/WA/KYC/Withdrawal) di `artifacts/kopihub/src/lib/api/*.functions.ts` — pola standar React Query.
- Update memory `owner-audit-may2026` setelah P0 & P1 selesai.

---

## Saran eksekusi

Saya sarankan kerjakan **Fase P0 dulu (1–4)** karena itu yang bikin error sekarang. Setelah Anda konfirmasi P0 bersih di DB Anda, kita lanjut P1 modul per modul (mulai dari yang paling sering Anda pakai — biasanya Email Marketing + Wallet/Withdrawal + KYC). Apakah saya boleh mulai dari P0?
