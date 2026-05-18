# Arsip migrasi pra-konsolidasi

**Konsolidasi: 18 Mei 2026**

Folder ini berisi **126 file migrasi historis** (rentang `20260512` → `20260517` + ad-hoc seperti `fase3_*`, `m05_*`, `f08_*`) yang sudah digabung menjadi satu file kanonik:

```
supabase/migrations/00000000000000_init_schema.sql
```

## Kenapa diarsipkan?

1. Penamaan campuran timestamp Lovable + manual → urutan apply ambigu kalau di-replay di project baru.
2. Banyak file saling overwrite (rename kolom, drop+recreate policy, dll).
3. File kanonik di-dump langsung dari production DB → **single source of truth**, lebih akurat daripada hasil replay 126 file.

## Boleh dihapus?

Boleh, jika tidak butuh audit historis. Folder ini **tidak** di-pick-up oleh Supabase CLI karena nama folder diawali underscore.

## ⚠️ File kanonik HANYA untuk fresh bootstrap

`00000000000000_init_schema.sql` jangan di-apply ke Cloud yang sudah berisi 126 migration history — akan konflik (tabel sudah ada). Pakai untuk:

- Project Supabase baru.
- Setup local dev dari nol (`supabase db reset`).
- Disaster recovery / spin-up environment baru.
