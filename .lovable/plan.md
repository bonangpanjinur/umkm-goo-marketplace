# Analisis & Rencana Perbaikan

## Root cause tiap error

### 1. `400 Bad Request` di `orders?select=...order_number,...,order_items(...,notes)`
Skema asli tabel:
- `orders.order_no` (TEXT) — **bukan** `order_number`
- `order_items.note`, `quantity`, `unit_price` — **bukan** `notes`, `qty`, `price`
- `orders.total` — **bukan** `total_price`
- `orders.delivery_address` — **bukan** `customer_address`

File yang masih pakai kolom lama (penyebab 400 / silent break):
- `routes/pos-app.kitchen-load.tsx` → `order_number`, `order_items(...notes)`
- `routes/admin.auto-cancel.tsx` → `order_number`, `total_amount`
- `routes/admin.reconciliation.tsx` → `order_number`
- `routes/pesanan.$orderId.chat.tsx` → `order_number`
- `routes/download.$token.tsx` → `order_number`, `total_price`
- `routes/pos-app.invoice.tsx` → `order_number`, `total_price`, `notes`, `customer_address`, `order_items(qty, price)`
- `routes/pos-app.shipping-labels.tsx` → `order_number`
- `routes/pos-app.digital-licenses.tsx` → `order_number`

### 2. `400 Bad Request` di `notifications?...user_id=eq...`
Skema asli `public.notifications` cuma punya: `recipient_user_id, shop_id, type, title, body, link, severity, read_at, dedupe_key, created_at`.

Code masih pakai kolom yang **tidak ada**:
- `lib/api/notifications.functions.ts` → filter pakai `user_id` & update `dismissed_at` (tidak ada kolom ini)
- `routes/pos-app.notifikasi.tsx` → select `action_url`, filter `recipient_shop_id` (tidak ada)
- `routes/admin.broadcast.tsx` → kemungkinan insert kolom yang tidak ada

### 3. Warning Radix `Missing Description for {DialogContent}`
Beberapa `<DialogContent>` belum punya `<DialogDescription>` atau `aria-describedby`. Tidak crash, tapi mengotori console & a11y. Akan ditambahkan `DialogDescription` (boleh `sr-only`) di dialog yang terpengaruh — khususnya `ThermalPrinterPickerDialog`, `ReceiptPreviewModal`, dan dialog di halaman orders.

### 4. `Chooser dialog is not displaying a port blocked by the Serial blocklist … YS-708`
Chrome **memblokir** printer Bluetooth (YS-708, mayoritas RPP/MPT/Goojprt) di Web **Serial** karena UUID-nya termasuk daftar blok keamanan. Solusi:
- Untuk printer Bluetooth thermal, **wajib** lewat **Web Bluetooth** (GATT) — yang sudah kita punya di `escpos-printer.ts`.
- Di `ThermalPrinterPickerDialog`, tegas pisahkan: USB → Web Serial, Bluetooth → Web Bluetooth. Tambahkan keterangan jelas: "Jika printer Bluetooth tidak muncul di USB, pakai tombol Bluetooth di bawah".
- Filter `pickSerialPort` agar request hanya port USB-Serial (`filters: [{ usbVendorId }]` opsional) supaya tidak iseng nampilkan device BT yang akan diblok.

### 5. Kenapa app terasa lambat
Temuan saat scan kode:
- Banyak halaman owner (orders, marketplace-orders, kitchen-load, dashboard) melakukan `select *` atau select banyak kolom + multiple realtime channel + `fetch` setiap mount tanpa cache.
- `useNotifications` polling + subscribe per user, tapi query gagal 400 → retry loop bikin network sibuk.
- Tidak ada React Query untuk data umum → setiap navigasi refetch dari nol.
- Beberapa list (orders, transactions) tidak pakai pagination/limit memadai (limit 150–1000).
- Bundle besar: `radix-vendor` + recharts + framer-motion + html2canvas + qrcode dimuat di route awal.
- Tidak ada `React.lazy` untuk halaman berat (reports, recharts).

## Rencana perbaikan (urut prioritas)

### A. Hotfix skema (hilangkan 400, ini juga penyebab loading lambat karena retry/fallback)
1. **Notifications hook & API** (`hooks/use-notifications.ts`, `lib/api/notifications.functions.ts`, `routes/pos-app.notifikasi.tsx`, `routes/admin.broadcast.tsx`):
   - Ganti `user_id` → `recipient_user_id`.
   - Hapus pemakaian `dismissed_at` → pakai `read_at` saja (atau tambah kolom via migration jika memang perlu fitur "dismiss" terpisah). Sementara: alias dismiss = set `read_at`.
   - Ganti `action_url` → `link`.
   - Hapus filter `recipient_shop_id` di owner notifikasi → gunakan `recipient_user_id = owner.id` + filter di client by `shop_id`. (Atau tambah migration kolom `recipient_shop_id` kalau memang perlu broadcast per toko — keputusan terpisah.)
2. **Orders / order_items** di file-file di atas:
   - `order_number` → `order_no`
   - `order_items(..., notes)` → `order_items(..., note)`
   - `total_price` → `total`; `qty/price` → `quantity/unit_price`; `customer_address` → `delivery_address`
   - Sesuaikan render (alias supaya UI tetap pakai variable lama bila perlu).

### B. A11y dialog
Tambahkan `<DialogDescription className="sr-only">…</DialogDescription>` di:
- `ThermalPrinterPickerDialog`
- `ReceiptPreviewModal`
- Dialog konfirmasi void / refund di `pos-app.orders.tsx`
- Audit cepat dialog lain via `rg "<DialogContent"` lalu pastikan tiap satu punya Title + Description.

### C. Printer Bluetooth (YS-708 dsb.)
- Di `escpos-printer.ts → pickSerialPort` tambah `filters` (atau biarkan kosong) + log jelas; di UI tegaskan "Untuk printer Bluetooth, gunakan tombol Bluetooth".
- Pada `pickBluetoothPrinter`, tambah service UUID umum (`000018f0-0000-1000-8000-00805f9b34fb`, `0000ff00-…`, dll.) supaya YS-708 muncul.
- Tampilkan tooltip alasan kenapa BT diblok di Serial (tidak men-spam toast error).

### D. Optimasi kecepatan
1. **React Query (sudah dependency)** — bungkus query owner yang sering dipakai (`useShop`, `useOutlet`, `useNotifications`, `orders today`, `dashboard summary`) dengan `useQuery` + `staleTime: 30_000`.
2. **Code-splitting per route berat**: `pos-app.reports.tsx`, `admin.*`, halaman builder, `marketplace-orders` → `const X = lazy(() => import(...))` di route module saat dimuat (TanStack Router otomatis split per route file kalau import statis dipindah ke dynamic).
3. **Trim select kolom** — banyak query masih ambil 30+ kolom; ambil kolom yang dipakai saja.
4. **Pagination orders/transactions** — default 30 rows + tombol "Muat lagi" (atau infinite query). Saat ini bisa 150–1000.
5. **Realtime channel reuse** — `pos-app.orders` & `useRealtimeOrders` membuat channel terpisah. Konsolidasi jadi 1 channel per `shop_id` di provider.
6. **Hapus polling redundan**: `useNotifications` punya BroadcastChannel + supabase realtime + interval; cukup realtime saja.
7. **Index DB** — verifikasi index untuk query panas:
   - `orders(shop_id, status, created_at desc)` — ada `business_date` index. Tambah composite kalau perlu (migration terpisah).
   - `notifications(recipient_user_id, created_at desc)` — sudah ada.
8. **Bundle**:
   - Lazy `html2canvas`/`qrcode` (hanya saat user klik cetak/QR).
   - Pisah `recharts` ke chunk lazy.
9. **Service Worker** — pastikan `sw.js` cache aset statis (sudah ada manifest, perlu cek strategi caching).

### E. (Opsional) Migration kolom yang sering dibutuhkan
Hanya jika user setuju:
- `notifications.dismissed_at timestamptz null` (kalau mau pisahkan baca vs dibuang).
- `notifications.recipient_shop_id uuid null` (kalau mau notifikasi level toko).
- `notifications.action_url text null` (alias `link`).
Tanpa ini, kita pakai skema existing dan mapping di client.

## Urutan eksekusi yang saya usulkan
1. **Fase 1 (kritis, langsung)**: A + B + C — hilangkan semua 400 & warning + printer BT.
2. **Fase 2 (perf cepat)**: D1, D3, D4, D6 — efek besar dengan perubahan minimal.
3. **Fase 3 (perf lanjutan)**: D2, D5, D8 — code-splitting, channel reuse, bundle.
4. **Fase 4 (opsional)**: E — migration tambahan kalau memang dibutuhkan fitur dismiss / per-toko.

## Pertanyaan singkat sebelum eksekusi
- Untuk notifikasi "dismiss" di customer (`dismissAllNotifications`): apakah cukup ditandai sebagai `read_at` saja, atau kamu mau tabel beneran punya kolom `dismissed_at` (perlu migration)?
- Notifikasi owner di `pos-app.notifikasi.tsx` saat ini filter by `recipient_shop_id`. Apakah kita lanjut tambah kolom `recipient_shop_id` (migration) atau ubah jadi notifikasi per-user owner (filter `recipient_user_id = owner.id`)?

Begitu kamu jawab 2 pertanyaan itu (atau bilang "pakai default: read_at + per-user"), saya langsung kerjakan Fase 1 + Fase 2.
