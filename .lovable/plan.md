## Hasil Audit Owner/Toko & Relasi Super Admin

Audit menyisir 148 route `pos-app.*`, 60 route `admin.*`, dan seluruh `src/lib`. Dibandingkan dengan **191 tabel** dan **120 fungsi** yang benar-benar ada di database.

---

### A. Tabel yang dirujuk kode tapi BELUM ada di database (28)

Dikelompokkan per modul + file pemanggil:

| Modul | Tabel hilang | File terpengaruh |
|---|---|---|
| Loyalty lanjutan | `loyalty_tiers`, `loyalty_rewards`, `loyalty_redemptions`, `loyalty_analytics`, `referral_programs`, `referrals` | `src/lib/loyalty-enhanced.ts` |
| Cashback pembeli | `cashback_wallets`, `cashback_transactions` | `akun.cashback.tsx` |
| Reservasi meja | `reservations`, `reservation_slots`, `reservation_settings`, `tables`, `table_maps` | `pos-app.reservasi.tsx`, `pos-app.tables.tsx`, `pos-app.table-maps.tsx`, `EnhancedOpenBill.tsx`, `order.$slug.tsx`, `src/lib/reservations.ts`, `use-tables.ts` |
| Return / refund | `return_requests` | `akun.returns.tsx` |
| Integrasi pihak ketiga | `third_party_integrations`, `integration_mappings`, `integration_webhooks`, `api_keys`, `api_usage` | `src/lib/third-party-api.ts` |
| Super admin | `admin_users` (multi-admin), `affiliates`, `data_requests` (GDPR), `shop_health_score` | `admin.multi-admin.tsx`, `admin.affiliate.tsx`, `admin.gdpr-tools.tsx`, `admin.health-score*.tsx` |
| Klinik/skin | `shop_skin_quiz`, `shop_product_claims` | `pos-app.skin-quiz.tsx`, `pos-app.verified-claims.tsx` |
| Kurir | `courier_earnings` (view) | `kurir.earnings.tsx` |
| View pendukung | `menu_hpp_view`, `v_shop_capabilities` | `pos-app.menu.tsx`, `pos-app.recipes.tsx`, `use-shop-capabilities.ts` |

### B. RPC dipanggil kode tapi BELUM ada di DB (20)

`increment_slot_booked`, `decrement_slot_booked`, `generate_reservation_slots`, `check_table_availability`, `take_queue_number`, `call_next_queue`, `start_queue_session`, `skip_queue_entry`, `fn_use_booking_voucher`, `award_referral_bonus`, `record_download`, `reset_download_count`, `request_customer_export`, `request_shop_backup`, `reschedule_booking`, `run_plan_maintenance`, `check_api_rate_limit`, `record_api_usage`, `admin_update_min_months`, `admin_undo_min_months`.

Catatan: `approve_invoice` & `reject_invoice` sudah ada (alias dari `approve_plan_invoice`).

### C. Relasi Toko ↔ Super Admin yang masih lemah

1. **KYC** — `shop_verifications` ada, halaman `admin.kyc.tsx` belum melakukan transisi status & notifikasi balik ke owner.
2. **Withdrawals** — `withdrawal_requests` + RPC `approve_withdrawal/reject_withdrawal` sudah ada, tapi `admin.withdrawals.tsx` belum memakai RPC tersebut (langsung UPDATE).
3. **Plan invoice** — alur upload bukti → review → `approve_invoice` sudah jalan; **tetapi** tabel `plan_subscriptions` belum tertulis konsisten saat approve.
4. **Health Score / SLA Monitor** — `admin.health-score.tsx` & `admin.sla-monitor.tsx` baca tabel/view yang belum ada (`shop_health_score`).
5. **Email & WA broadcast** — tabel `email_campaigns`, `email_campaign_recipients`, `wa_broadcasts` sudah ada, **belum ada worker / RPC** untuk benar-benar mengirim; status mentok di `draft`.
6. **Fraud & Disputes** — `admin.fraud.tsx`, `admin.disputes.tsx` belum di-cross-link ke `order_disputes` milik toko (relasi sudah ada, navigasi belum).
7. **Notifikasi owner** — `admin.broadcast.tsx` (super admin → owner) belum menulis ke `owner_notifications`.

---

## Rencana Perbaikan (4 Fase)

### Fase P0 — Skema dasar yang hilang (1 migration besar)

Buat dalam satu migration agar build tidak pecah:

- **Loyalty Enhanced**: `loyalty_tiers`, `loyalty_rewards`, `loyalty_redemptions`, `referral_programs`, `referrals` + RPC `award_referral_bonus`.
- **Cashback**: `cashback_wallets`, `cashback_transactions` (RLS: customer only).
- **Reservasi & meja**: `tables`, `table_maps`, `reservations`, `reservation_slots`, `reservation_settings` + RPC `generate_reservation_slots`, `check_table_availability`, `increment_slot_booked`, `decrement_slot_booked`.
- **Antrian (queue)**: RPC `take_queue_number`, `call_next_queue`, `start_queue_session`, `skip_queue_entry` (tabelnya sudah ada).
- **Return**: `return_requests`.
- **Integrasi pihak ketiga**: `third_party_integrations`, `integration_mappings`, `integration_webhooks`, `api_keys`, `api_usage` + RPC `check_api_rate_limit`, `record_api_usage`.
- **Super admin**: `admin_users`, `affiliates`, `data_requests`, `shop_health_score` + RPC `request_customer_export`, `request_shop_backup`.
- **Klinik**: `shop_skin_quiz`, `shop_product_claims`.
- **Kurir**: view `courier_earnings`.
- **Pendukung**: view `menu_hpp_view` (HPP per menu), view `v_shop_capabilities` (gabungan plan + business_category).
- **Booking voucher**: RPC `fn_use_booking_voucher`, `reschedule_booking`.
- **Digital**: RPC `record_download`, `reset_download_count`.
- **Plan**: RPC `run_plan_maintenance`, `admin_update_min_months`, `admin_undo_min_months`.

Semua tabel pakai standar RLS: `is_shop_owner(shop_id) OR has_role(auth.uid(),'super_admin')`; tabel customer pakai `auth.uid()=user_id`.

### Fase P1 — Wire relasi Owner ↔ Super Admin

- `admin.withdrawals.tsx` → pakai RPC `approve_withdrawal`/`reject_withdrawal` + tulis `owner_notifications`.
- `admin.kyc.tsx` → update `shop_verifications.status`, trigger notifikasi.
- `admin.broadcast.tsx` → setelah kirim, fan-out ke `owner_notifications`.
- `admin.disputes.tsx` ↔ owner `pos-app.orders.tsx`: tambahkan deep-link dua arah.
- `admin.invoices.tsx` (plan): tampilkan bukti bayar + tombol approve/reject memakai RPC yang sudah ada (alih-alih panel mock).
- `pos-app.billing.tsx`: konsisten tulis `plan_subscriptions` saat upgrade trial → pro.

### Fase P2 — Worker / job untuk fitur "draft"

- Email campaign sender: server function (`createServerFn`) iterasi `email_campaign_recipients`, kirim via Resend (atau provider yang sudah dikonfigurasi), update `sent_at`.
- WA broadcast worker: server function bridging ke endpoint Uazapi yang sudah ada, update status per recipient.
- Cron `run_plan_maintenance`: auto expire trial, renewal reminder, suspend overdue.

### Fase P3 — Konsolidasi UX

- Gabungkan `admin.revenue.tsx`, `admin.financial-report.tsx`, `admin.category-revenue.tsx`, `admin.revenue-leakage.tsx` jadi satu halaman tab.
- Gabungkan `pos-app.reports.tsx`, `pos-app.reports.profit.tsx`, `pos-app.laporan-harian.tsx` jadi satu halaman tab.
- Hapus halaman `pos-app.skin-quiz.tsx` & `pos-app.verified-claims.tsx` dari nav kalau bisnis bukan klinik/skincare (sudah ada `useBusinessCategory`).

---

## Detail Teknis Migration P0 (ringkas)

```text
-- Loyalty tiers (per shop), rewards, redemptions
-- Cashback (per customer global)
-- Tables / table_maps (per outlet), reservations (per shop+table)
-- Reservation slots harian (auto-generate)
-- Return requests (relasi order_items)
-- Third-party integrations (Tokopedia/Shopee/etc)
-- admin_users (super admin tambahan, role app_role super_admin)
-- affiliates (program referral platform)
-- data_requests (GDPR: export/delete)
-- shop_health_score (computed view: order_count, complaint_rate, sla)
-- shop_skin_quiz, shop_product_claims
-- courier_earnings (view dari orders + delivery fee)
-- menu_hpp_view (sum ingredient cost dari recipes)
-- v_shop_capabilities (LEFT JOIN shops + plans + business_categories)
```

Setiap RPC baru: `SECURITY DEFINER`, `SET search_path = public`, validasi role dengan `has_role`/`is_shop_owner`.

---

## Urutan eksekusi yang disarankan

1. Setujui plan ini.
2. Saya jalankan **migration P0** dalam satu file (akan minta konfirmasi via tool migrasi).
3. Saya rapikan code-side: ganti referensi tabel yang sebelumnya 404, dan hapus mock.
4. Lanjut P1 wiring relasi (per modul, bisa dicicil sesuai prioritasmu: withdrawal → KYC → broadcast → disputes → invoices).
5. P2 worker (perlu konfirmasi provider email & WA aktif).
6. P3 konsolidasi UX terakhir.

Bilang **"lanjut P0"** untuk mulai migration, atau sebutkan modul prioritas yang mau didahulukan (mis. "P0 tapi skip integrasi pihak ketiga dulu").