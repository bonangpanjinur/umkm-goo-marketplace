## Masalah

Di `artifacts/kopihub/src/routes/toko.$slug.booking.tsx` baris 925–950, satu `<div>` punya dua atribut `className` (baris 925 dan 944). Vite memunculkan warning *Duplicate "className" attribute*, dan hanya className kedua yang dipakai — sehingga kelas `relative` dan styling state "full slot" (`bg-muted/40 opacity-80`) hilang.

## Perbaikan

Gabungkan dua className jadi satu pada elemen `<div>` slot card:

- Pertahankan `relative` (penting untuk badge/posisi absolut di dalam card).
- Pakai `text-left` + `hover:shadow-md` dari versi kedua.
- Pertahankan tiga kondisi state: `isFull` → muted, `isSelected` → primary ring, default → hover border.
- Hapus blok className kedua (baris 944–950).

Hasil akhir kira-kira:

```tsx
<div
  key={slot.id}
  onClick={() => { /* ... */ }}
  className={`relative text-left rounded-xl border p-4 transition-all ${
    isFull
      ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 opacity-80 cursor-pointer hover:border-amber-400"
      : isSelected
        ? "border-primary bg-primary/5 ring-2 ring-primary cursor-pointer"
        : "border-border hover:border-primary/50 hover:shadow-md cursor-pointer"
  }`}
>
```

## Verifikasi

- Cek dev server logs untuk memastikan warning duplicate className hilang.
- Buka `/toko/<slug>/booking` → step pilih slot, pastikan card slot full vs available vs selected ter-render benar.

Tidak ada perubahan logic/data — murni perbaikan JSX.
