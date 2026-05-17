# E2E POS UMKMgo (Playwright)

Test E2E untuk alur kasir: open bill → multi-cart park → checkout (mock print) → void/cancel.

## Setup (sekali)

```bash
pnpm install
pnpm --filter @workspace/kopihub exec playwright install chromium
```

## Menjalankan

```bash
# Dengan dev server otomatis dijalankan Playwright (port 5173)
pnpm --filter @workspace/kopihub test:e2e

# Atau pakai server yang sudah jalan
E2E_BASE_URL=http://localhost:5173 \
  pnpm --filter @workspace/kopihub test:e2e
```

## Kredensial demo

Default: `owner@umkmgo.id` / `demo1234` (sudah di-seed migrasi sandbox).
Override:

```bash
E2E_EMAIL=anda@contoh.com E2E_PASSWORD=rahasia \
  pnpm --filter @workspace/kopihub test:e2e
```

## Mock cetak

`e2e/fixtures.ts` memasang `addInitScript` yang mengganti `window.print` &
`window.open` dengan stub — sehingga test tidak memunculkan dialog cetak nyata
dan bisa dijalankan berulang di CI. Jumlah panggilan tersedia di
`window.__printCalls` / `window.__openCalls`.

## Catatan

- File test menggunakan selector toleran (role + regex). Untuk reliability
  tertinggi, tambahkan `data-testid` pada elemen kunci di POS UI.
- `workers: 1` agar tidak tabrakan dengan shift POS yang single-user.
