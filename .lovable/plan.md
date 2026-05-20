## Tujuan

Hilangkan masalah print struk yang masih ikut layout A4 / banyak whitespace dengan memisahkan total proses print dari halaman dashboard. Struk dirender di **popup window khusus** dengan CSS thermal kaku (58 mm / 80 mm), auto-print, auto-close.

## Akar masalah saat ini

`src/lib/receipt-printer.ts` → `printReceiptNode()` memakai trik `body * { visibility:hidden }` + `window.print()` dari halaman POS. Di banyak browser/printer driver hal ini tetap memakai ukuran kertas default printer (A4/Letter), menyebabkan struk kecil di tengah + banyak whitespace. `openReceiptInNewWindow()` sudah ada tapi menyalin `outerHTML` node bersama seluruh Tailwind/CSS dashboard (termasuk warna gelap & shadow) sehingga hasilnya tidak bersih, dan tidak auto-close.

## Solusi

### 1. `src/lib/receipt-printer.ts` — tambah `printThermal()`

API baru:

```ts
printThermal({
  node: HTMLElement,        // sumber markup struk (komponen Receipt yang sudah ada)
  paper?: "58" | "80",      // default getReceiptPaper(scopeKey)
  scopeKey?: string,
  autoClose?: boolean,      // default true
}): "ok" | "blocked"
```

Implementasi:
- `window.open("", "_blank", "width=420,height=640,noopener=no")` — kalau `null` → return `"blocked"` (caller fallback ke preview modal).
- Tulis dokumen HTML minimal: **tidak** menyalin stylesheet dashboard. Inline-kan CSS thermal kaku (lihat §3) + `data-receipt-paper` di `<body>` + `<div class="receipt-container">{node.outerHTML}</div>`.
- Skrip di popup:
  ```html
  <script>
    window.addEventListener('load', () => {
      requestAnimationFrame(() => {
        window.focus(); window.print();
      });
    });
    window.addEventListener('afterprint', () => window.close());
    // fallback close jika afterprint tidak fire (Safari)
    setTimeout(() => window.close(), 8000);
  </script>
  ```
- Tetap pertahankan `printReceiptNode` & `openReceiptInNewWindow` untuk back-compat, tapi internal-nya delegasi ke `printThermal`. Hilangkan trik `visibility:hidden` lama agar dashboard tidak pernah ikut ke print pipeline.

### 2. `src/components/pos/ReceiptThermal.tsx` — wrapper baru (opsional, tipis)

Wrapper yang membungkus komponen struk yang sudah ada (`<Receipt/>`, `<KitchenTicket/>`, dst.) dengan `<div className="receipt-container">…</div>`. Caller di POS cukup render komponen struk seperti biasa di dalam `<div ref>` lalu panggil `printThermal({ node: ref.current })`. Tidak perlu mengubah komponen struk yang sudah ada.

### 3. CSS thermal kaku (di-inline di popup, BUKAN di `styles.css`)

```css
@page { size: 80mm auto; margin: 0; }
body[data-receipt-paper="58"] @page { size: 58mm auto; }

html, body {
  width: 80mm;
  margin: 0 !important;
  padding: 0 !important;
  background: #fff;
  color: #000;
  font-family: ui-monospace, "Courier New", monospace;
  font-size: 11px;
  line-height: 1.35;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body[data-receipt-paper="58"], body[data-receipt-paper="58"] html { width: 58mm; }

.receipt-container { width: 72mm; padding: 4mm 4mm; box-sizing: border-box; }
body[data-receipt-paper="58"] .receipt-container { width: 50mm; padding: 3mm; }

.receipt-container * {
  color: #000 !important;
  background: transparent !important;
  box-shadow: none !important;
  border-color: #000 !important;
}
.receipt-container img { max-width: 100%; filter: grayscale(1) contrast(1.2); }
.no-print { display: none !important; }
```

Karena `@page` di dalam at-rule conditional tidak bisa baca atribut, kita pilih ukuran dengan menulis HTML berbeda per paper (`@page { size: 58mm auto; … }` atau `80mm`) — sudah ada akses ke `paper` di `printThermal`, jadi cukup string-template-kan ukuran sebelum di-write ke popup.

### 4. Migrasi call site

Yang harus dipindah ke `printThermal`:
- `src/routes/pos-app.orders.tsx` (baris 430, 832)
- `src/routes/pos-app.pos.tsx` (auto-print setelah checkout, lihat baris ~890)
- `src/components/orders/OrdersTodayDialog.tsx` (baris 331, 1175)
- `src/components/ReceiptPreviewModal.tsx` — tombol "Cetak Sekarang" → panggil `printThermal` (hapus iframe handler, gunakan popup baru). "Buka di Tab Baru" tetap pakai popup tanpa auto-print.

Pola pemanggilan baru:
```ts
const res = printThermal({ node: hiddenReceiptRef.current, paper, scopeKey });
if (res === "blocked") setPreviewOpen(true); // fallback modal preview
```

`window.print()` langsung di halaman lain (`pos-app.online-orders.tsx`, `pos-app.purchase-orders.$poId.tsx`, `pos-app.medical-invoice.tsx`, `pos-app.certificates.tsx`, `pos-app.contracts.tsx`, `pos-app.table-qr.tsx`, `pos-app.rental-checklist.tsx`) **tidak dalam scope** karena itu dokumen A4/format lain (PO, sertifikat, kontrak, invoice medis, QR meja). Permintaan ini eksplisit untuk struk thermal POS.

### 5. Cleanup `styles.css`

- Hapus blok `@media print { body * { visibility:hidden } … }` (baris 190-194) dan `.print-host` print override (205-216) supaya halaman dashboard **tidak pernah** ikut ter-print. `.print-host` cukup tetap sebagai off-screen container untuk ref.
- `@page receipt-58/80` tidak lagi dibutuhkan di dokumen utama (ukuran sekarang di-set di popup) — hapus.

### 6. Verifikasi

1. Buka `/pos-app/orders`, klik "Cetak Struk" → muncul popup kecil, dialog print tampil dengan ukuran 80 mm (atau 58 mm sesuai picker), tidak ada halaman dashboard di belakang preview, popup menutup otomatis setelah print/cancel.
2. Checkout di `/pos-app/pos` → auto-print via popup, tidak ada whitespace.
3. Jika popup di-block browser → muncul preview modal lama sebagai fallback.
4. Test 58 mm vs 80 mm: width struk full lebar kertas, font monospace, hitam-putih.

## Catatan untuk user

Browser tetap mengingat ukuran kertas yang dipilih per printer. Saat **pertama kali** mencetak di printer thermal, di dialog print Chrome pilih "More settings → Paper size: 80mm × 297mm" (atau ukuran kustom 58mm) dan centang "Background graphics" sekali — setelah itu Chrome akan menggunakan setting ini otomatis. `@page size` mengontrol layout, tapi driver fisik perlu printer yang benar dipilih.
