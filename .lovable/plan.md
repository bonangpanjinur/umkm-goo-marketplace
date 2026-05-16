# Konsolidasi Booking & Reservasi Meja

## Tujuan
Satu alur booking terpadu untuk **layanan** dan **reservasi meja**, menghapus halaman reservasi yang redundan dan sebagian broken (mengacu ke tabel `tables` / `table_reservations` yang tidak pernah ada di DB).

## Strategi: 1 tabel, 1 dimensi pembeda
Pakai tabel `bookings` + `booking_slots` yang sudah ada. Tambah satu kolom diskriminator:

- `booking_slots.booking_type text not null default 'service'` — check: `'service' | 'table'`
- `bookings.booking_type text not null default 'service'` — diisi otomatis via trigger dari slot, untuk filter cepat & RLS.

Slot bertipe `table` artinya: `capacity` = jumlah orang, `service_name` = nama meja/area (mis. "Meja 4 (outdoor)"), `price`/`deposit_percent` opsional.

## Perubahan file

1. **Migration** — tambah kolom + trigger isi `bookings.booking_type` dari slot saat insert.
2. **Hapus** `src/routes/toko.$slug.reservasi.tsx` (broken, 786 baris) — diganti redirect tipis ke `/toko/$slug/booking?type=table`.
3. **Hapus** `src/routes/pos-app.reservasi.tsx` (438 baris) — fungsi pindah ke tab di `pos-app.booking.tsx`.
4. **Update** `src/routes/toko.$slug.booking.tsx`:
   - Baca query `?type=table|service` (default `service`).
   - Filter slot berdasarkan `booking_type`.
   - Heading & copy mengikuti tipe ("Reservasi Meja" vs "Booking Layanan").
5. **Update** `src/routes/toko.$slug.tsx` baris 541 — link "Reservasi Meja" → `/toko/$slug/booking?type=table`.
6. **Update** `src/routes/pos-app.booking.tsx` — tambah Tabs "Layanan / Meja" di atas list, filter `booking_type`.

## Yang TIDAK berubah
- Skema `bookings` lain (slot_id, customer, deposit, dst) tetap.
- Cancel/reschedule via token tetap (sudah generic).
- Admin booking-config, reminders, analytics ikut otomatis (pakai tabel yang sama).

## Risiko & mitigasi
- Slot lama otomatis bertipe `service` (default kolom). Aman.
- Halaman reservasi lama broken → praktis tidak ada data produksi yang hilang.
