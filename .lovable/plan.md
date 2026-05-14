## Cakupan

Empat fitur untuk halaman **Jadwal** dan **Tim**. Saya pertahankan stack yang sudah ada (Supabase langsung dari client + RLS owner) dan menambah trigger DB untuk audit & validasi konflik agar konsisten meski jadwal diubah lewat realtime.

### 1. Validasi konflik jadwal (real-time)

**Masalah:** Saat ini `shifts` bisa di-insert/update tanpa cek apakah pegawai sudah punya shift yang overlap di hari yang sama.

**Solusi:**
- **DB trigger** `validate_shift_no_overlap` di tabel `shifts` (BEFORE INSERT/UPDATE):
  - Reject jika ada shift lain untuk `(shop_id, user_id, day_of_week)` yang range jamnya tumpang tindih (`tstzrange`/`OVERLAPS`).
  - Reject jika `end_time <= start_time` (kecuali overnight — untuk sekarang larang dulu, kasih pesan jelas).
- **Frontend** `pos-app.schedule.tsx`:
  - Cek overlap di sisi client sebelum submit (pakai data `shifts` yang sudah dimuat) → tampilkan inline error di dialog dengan daftar shift yang bentrok.
  - Tangkap error dari trigger dan tampilkan toast yang ramah.

**Catatan:** "sudah check-in / selesai" butuh tabel attendance (mis. clock_in/clock_out) yang belum ada di skema. Saya tidak akan membuat tabel baru di luar konteks; saya tinggalkan TODO singkat di kode dan fokus ke overlap. Kalau Anda ingin attendance, kita garap di siklus berikutnya.

### 2. Aksi massal di halaman Tim

Di `pos-app.employees.tsx`:
- Tambah kolom checkbox di setiap row daftar pegawai (login + manual) dan kartu undangan pending.
- Sticky toolbar saat ≥1 dipilih: **Aktifkan**, **Nonaktifkan**, **Kirim ulang undangan** (hanya muncul kalau seleksi mengandung undangan pending).
- Implementasi:
  - Aktifkan/nonaktifkan: panggil `staff/update-role` (sudah ada) berturut-turut dengan `Promise.allSettled`, tampilkan ringkasan toast (`X berhasil, Y gagal`).
  - Resend invitations: panggil `staff/resend-invitation` per id, sama polanya.
  - Konfirmasi pakai `AlertDialog` sebelum eksekusi.

### 3. Audit log perubahan jadwal

- **DB trigger** `log_shift_change` di `shifts` (AFTER INSERT/UPDATE/DELETE) → insert ke `staff_audit_logs`:
  - `action = 'shift_create' | 'shift_update' | 'shift_delete'`
  - `actor_id = auth.uid()`, `target_user_id = NEW.user_id` (atau OLD jika delete)
  - `meta = { day_of_week, start_time, end_time, outlet_id, before, after }`
- **UI** baru di `pos-app.schedule.tsx`: tombol **Riwayat** di header → `Sheet` slide-in yang menampilkan 50 entri terakhir dari `staff_audit_logs` di `shop_id` ini, di-scope ke `action LIKE 'shift_%'`. Format: ikon, "Budi memperbarui shift Andi (Sen 08:00–16:00 → 09:00–17:00) · 5 menit lalu".
  - Resolve nama actor lewat `profiles.display_name`, target lewat `profiles` atau `staff_members`.

### 4. Buat jadwal otomatis dari template

Dialog baru di `pos-app.schedule.tsx` — tombol header **Buat dari template**:
1. **Step 1 — pilih template:**
   - Pilihan default cepat: *Pagi 07–15*, *Siang 11–19*, *Malam 15–23*, atau *Custom* (masukkan jam sendiri).
   - Pilih hari (multi-select Sen–Min, default Sen–Jum).
   - Pilih outlet.
   - Filter pegawai: by peran (manager/cashier/barista/all) atau pilih manual.
2. **Step 2 — preview:**
   - Tampilkan tabel kandidat shift yang akan dibuat (pegawai × hari).
   - Setiap baris bisa diubah jam/outlet, atau di-toggle skip.
   - Tampilkan badge merah untuk baris yang bentrok dengan shift existing (pakai logic yang sama dengan validasi).
3. **Step 3 — simpan:**
   - Insert batch lewat `supabase.from('shifts').insert(rows)`.
   - Yang ditolak trigger akan di-skip dengan toast ringkas (`X dibuat, Y dilewati karena bentrok`).

## Detail teknis

### Migrasi SQL

```sql
-- Trigger: tolak overlap
CREATE OR REPLACE FUNCTION validate_shift_no_overlap() RETURNS trigger ...
  -- cek end_time > start_time
  -- cek tidak ada shift lain untuk (shop_id,user_id,day_of_week) yang overlap
CREATE TRIGGER trg_validate_shift_no_overlap BEFORE INSERT OR UPDATE ON shifts ...

-- Trigger: audit
CREATE OR REPLACE FUNCTION log_shift_change() RETURNS trigger ...
CREATE TRIGGER trg_log_shift_change AFTER INSERT OR UPDATE OR DELETE ON shifts ...

-- Tambah RLS SELECT untuk staff_audit_logs (owner only) — cek apakah sudah ada
```

### Frontend

- `pos-app.schedule.tsx`: tambah state untuk template dialog, audit sheet, helper `findOverlap()`. Refactor `save()` untuk surface error trigger.
- `pos-app.employees.tsx`: tambah `Set<string>` selection state, toolbar, helper `bulkAction()`.
- Re-use komponen shadcn yang sudah ada (`Sheet`, `Checkbox`, `AlertDialog`).

### Yang tidak saya kerjakan
- Tabel attendance / clock-in (skema baru besar — tunggu sinyal Anda).
- Audit log untuk perubahan profil pegawai (sudah ada lewat `staff/update-role` yang menulis manual). Saya hanya perlu menampilkannya — bisa saya gabungkan ke sheet yang sama dengan filter tab "Semua / Jadwal / Pegawai".

## Urutan eksekusi

1. Migrasi DB (overlap + audit shift + RLS check).
2. Schedule: validasi overlap + tangkap error.
3. Schedule: dialog template + preview.
4. Schedule: sheet riwayat audit.
5. Employees: bulk action toolbar.

Lanjut implementasi?