# Rencana: Notifikasi, Search/Filter & Timeline Custom Order

## 1. Notifikasi otomatis saat status berubah

**Database (migrasi baru):**
- Tabel `custom_order_status_history` (id, request_id, from_status, to_status, note, changed_by, created_at) — sumber kebenaran timeline.
- Trigger `AFTER UPDATE OF status ON custom_order_requests` → insert ke history + notifikasi.
- Tambah kolom `notify_email` (opsional) di `custom_order_requests` agar pelanggan bisa pilih kanal.
- Function `enqueue_custom_order_notification(request_id, new_status)` yang:
  - Insert row ke tabel baru `custom_order_notifications` (channel, payload, status: pending/sent/failed).
  - Trigger ini berjalan otomatis ketika owner mengubah status.

**Pengiriman:**
- **WhatsApp:** karena belum ada gateway berbayar, gunakan pendekatan praktis yang sudah dipakai di app: tetap manual via `wa.me` link saat owner klik Accept/Reject (sudah jalan), TAPI tambahkan auto-trigger pada perubahan status `in_progress` & `completed` juga (buka tab baru dengan template). Untuk benar-benar otomatis tanpa interaksi owner butuh API berbayar (Twilio/Wablas) — akan ditawarkan sebagai opsi terpisah.
- **Email:** pakai infrastruktur Lovable Email (transactional). Buat template `custom-order-status-update.tsx` dengan props {customerName, shopName, status, ownerNote, statusUrl}. Server route memanggil `sendTransactionalEmail` ketika row baru di `custom_order_notifications` (channel=email) → diproses lewat trigger pg_net atau cron `process_custom_order_notifications` setiap menit.
- Form submit custom order ditambah field email opsional.

## 2. Search & Filter di panel merchant (`pos-app.custom-orders.tsx`)

Tambahkan toolbar di atas list:
- Input search teks: cocok ke `customer_name`, `customer_contact`, `description` (client-side filter, sudah load semua row toko).
- Filter range budget (min–max numerik).
- Filter status (sudah ada, dipertahankan).
- Filter rentang tanggal `created_at` (date range picker shadcn).
- Tombol "Reset filter" + indikator jumlah hasil.
- Sort dropdown: terbaru / deadline terdekat / budget tertinggi.

Semua state di `useState`, diterapkan via `useMemo` ke `items`.

## 3. Timeline per request

- Komponen baru `CustomOrderTimeline.tsx` — vertical timeline (status badge + tanggal + catatan) memakai `custom_order_status_history`.
- Tampilkan di:
  - **Merchant panel**: tombol "Lihat timeline" pada tiap card → expand inline (Collapsible) atau Sheet di kanan.
  - **Customer status page** (`toko.$slug.custom-order.status.tsx`): tampilkan timeline di setiap card request (read via RPC `get_customer_custom_orders` yang akan di-extend untuk join history).
- Owner bisa menambah catatan opsional ketika ubah status (textarea kecil di tombol action) → disimpan di `custom_order_status_history.note`.

## 4. Pembaruan RPC & Types

- Update `get_customer_custom_orders` agar mengembalikan array `history` (jsonb) per request.
- Regenerate `types.ts` setelah migrasi.

## 5. Update PRD

Tandai sub-item F-05 sebagai selesai dengan ringkasan implementasi notifikasi, search/filter, dan timeline.

---

## Detail teknis singkat

```text
custom_order_requests --update status--> trigger
   ├─> insert into custom_order_status_history
   └─> insert into custom_order_notifications (email + wa)
                          │
       cron (process-custom-order-notifications, 1 menit)
                          │
       ├─ email channel  → sendTransactionalEmail("custom-order-status-update")
       └─ wa channel     → tetap manual (link wa.me) di UI merchant
```

## Pertanyaan singkat sebelum eksekusi

1. **WhatsApp otomatis** — hanya ada wa.me (manual klik) atau mau pakai gateway berbayar (Twilio/Wablas)? Default: tetap wa.me + tombol "Kirim WA" otomatis muncul setiap perubahan status.
2. **Email** — saya aktifkan Lovable Email (perlu setup domain pengirim). Lanjut?
