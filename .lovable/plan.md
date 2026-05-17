## Bug yang ditemukan

Dev-server gagal mem-parse `artifacts/kopihub/src/routes/pos-app.audit-logs.tsx`:

```
Pre-transform error: Expected corresponding JSX closing tag for <Fragment>. (357:20)
```

Akibat: route `/pos-app/audit-logs` (dan kemungkinan modul `pos-app` lain via HMR) gagal di-load. Ini error blokir, bukan warning.

## Penyebab

Di dalam `filtered.map((l) => { ... return (<Fragment key={l.id}> ... </Fragment>) })`, code-splitter TanStack Start kesulitan mem-parse `<Fragment>` bernama dengan key + isi tabel multi-baris. Open/close JSX-nya sebenarnya seimbang, tapi transformer tetap menolak.

## Rencana perbaikan

Ganti pola `<Fragment key={l.id}>...</Fragment>` di dalam `.map()` menjadi mengembalikan **array dua `<tr>`** dengan key per-baris — pola yang aman untuk semua transformer:

```tsx
{filtered.flatMap((l) => {
  // ...derive meta, reason, target, isOpen
  const rows = [
    <tr key={`${l.id}-main`} className="hover:bg-muted/30"> ...row utama... </tr>,
  ];
  if (isOpen) {
    rows.push(
      <tr key={`${l.id}-detail`} className="bg-muted/20">
        <td colSpan={6} className="px-4 py-3">
          <pre>{JSON.stringify(l.meta, null, 2)}</pre>
        </td>
      </tr>,
    );
  }
  return rows;
})}
```

Setelah itu hapus import `Fragment` dari `"react"` karena tidak terpakai lagi.

## Verifikasi

1. Cek dev-server log tidak lagi memunculkan "Pre-transform error".
2. Buka `/pos-app/audit-logs` di preview, pastikan tabel render, tombol "Detail" tetap meng-expand baris JSON.

## File yang berubah

- `artifacts/kopihub/src/routes/pos-app.audit-logs.tsx` (refactor map → flatMap, hapus import Fragment)
