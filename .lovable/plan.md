## Hasil Analisis

Saya jalankan typecheck (`tsc --noEmit`), Vite build production, dan Supabase linter di seluruh project. **Tidak ada compile error / build error tersisa** — `dist-check` sudah lulus (output ke `artifacts/kopihub/dist/public/index.html`, 3551 modul ter-transform sukses dalam 11s).

Tapi audit menemukan **4 kategori utang teknis** yang perlu dirapikan agar app stabil & aman menjelang produksi.

### Temuan

**1. Type-safety dilewati di 16 file (78 cast `supabase as any`)**
Banyak query menggunakan cast karena `src/integrations/supabase/types.ts` tertinggal dari schema (mis. tabel `tables`, `printers`, beberapa RPC baru). Risiko: nama kolom salah → silent failure di runtime, tidak tertangkap typecheck. File terdampak antara lain:
- `hooks/use-tables.ts`, `lib/loyalty-enhanced.ts`, `lib/reservations.ts`, `lib/receipt-printer.ts`, `lib/parked-carts.ts`, `lib/third-party-api.ts`
- `routes/pos-app.categories.tsx`, `pos-app.printers.tsx`, `pos-app.pos.tsx`, `pos-app.inventory.tsx`, `pos-app.reports.profit.tsx`, `pos-app.marketplace-analytics.tsx`, `admin.analytics.tsx`, `s.$slug.menu.$menuId.tsx`
- `components/EnhancedOpenBill.tsx`, `components/customer/ReviewDialog.tsx`

**2. Supabase linter: 143 warning keamanan**
- 1× extension di schema `public`
- 4× public storage bucket dengan policy listing terlalu luas
- 137× `SECURITY DEFINER` function bisa di-execute oleh `anon`/`authenticated` tanpa perlu (perlu `REVOKE EXECUTE FROM PUBLIC` selektif)

**3. Bundle JS terlalu besar**
Main chunk **2.17 MB** (606 KB gzip). Belum ada code-splitting per route. Mengakibatkan TTFB lambat, terutama di mobile.

**4. Sourcemap warning di 5 komponen shadcn**
`label.tsx`, `select.tsx`, `sheet.tsx`, `dialog.tsx`, `tooltip.tsx` — kosmetik tapi mengganggu log build.

---

## Rencana Perbaikan (4 Batch)

### Batch A — Type Safety (Prioritas tinggi)
- Regenerasi `types.ts` lewat migration kosong (memicu refresh otomatis), lalu hapus 78 cast `(supabase as any)` satu-per-satu.
- Verifikasi setiap RPC baru (`mark_notification_read`, `marketplace_checkout`, `escrow_*`, dll.) sudah ada di `Database["public"]["Functions"]`.
- Untuk tabel legacy yang benar-benar tidak ada (cek: `tables`, `printers`, `kds_stations`, `loyalty_*` enhanced) — putuskan: buat migration tabelnya, atau hapus fitur yang menggantungnya.

### Batch B — Security Hardening
- `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC, anon, authenticated` untuk semua SECURITY DEFINER yang hanya dipanggil internal/trigger.
- Untuk RPC yang memang client-callable (mis. `marketplace_checkout`), pastikan ada validasi `auth.uid()` di body fungsi.
- Pindahkan extension dari `public` ke schema `extensions`.
- Persempit policy `storage.objects` pada bucket publik (allow `SELECT` per-prefix, bukan blanket).

### Batch C — Performance Bundle
- Pecah route besar dengan dynamic import (lazy route components TanStack Router).
- Tambah `build.rollupOptions.output.manualChunks` untuk vendor (`react`, `recharts`, `@radix-ui/*`, `framer-motion`).
- Target: main chunk < 800 KB gzip.

### Batch D — Polish (cepat)
- Tambah `// @ts-nocheck` atau update sourcemap untuk 5 komponen shadcn yang warning.
- Cek route `/kategori` (yang sedang user buka) — verifikasi data loading, fallback empty-state, SEO meta.

---

## Detail Teknis (untuk developer)

```text
Build status:  PASS  (vite build → dist/public, 11.42s)
Typecheck:     PASS  (tsc --noEmit, 0 errors)
Linter DB:     143 WARN (0 ERROR)
Bundle main:   2,172 KB raw / 606 KB gzip
Casts:         78× (supabase as any) di 16 file
```

Urutan eksekusi yang disarankan: **A → B → C → D**. Batch A & B paling kritis untuk stabilitas; C & D bisa dijalankan paralel setelahnya.

Setujui rencana ini, atau pilih batch tertentu yang mau saya kerjakan duluan?
