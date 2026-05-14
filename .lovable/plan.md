
# Analisis Menu Pegawai (Tim)

## Yang sudah ada
- Tambah pegawai manual + opsi buat akun login (email/sandi).
- Undang via email (token invite).
- Edit pegawai manual, upload avatar, validasi nama/HP.
- Reset sandi & set sandi manual untuk anggota aktif.
- Daftar Anggota Aktif, Pegawai Manual, Undangan Pending.
- Realtime sync ke halaman Jadwal.

## Kekurangan yang ditemukan

### Fitur
1. **Tidak ada pencarian/filter** — daftar bisa panjang, tak ada search bar, filter peran, atau filter outlet.
2. **Tidak ada bulk action** — tidak bisa pilih banyak untuk hapus / pindah outlet / ganti peran sekaligus.
3. **Tidak ada status aktif/nonaktif** — hanya "hapus permanen". Tidak bisa nonaktifkan sementara (cuti, resign sementara).
4. **Tidak terlihat aktivitas pegawai** — tidak ada info "terakhir login", "jumlah shift bulan ini", "transaksi yang ditangani".
5. **Tidak ada riwayat audit** — siapa undang, siapa reset sandi, kapan peran diubah.
6. **Tidak ada role detail / izin granular** — hanya 3 peran fix (manager/kasir/barista), tidak bisa custom permission.
7. **Anggota aktif tidak bisa diedit** — hanya manual yang bisa edit. Anggota dengan login tak bisa ganti peran/outlet dari UI ini (harus hapus & undang ulang).
8. **Tidak ada "promote" pegawai manual → akun login** — owner harus hapus & buat ulang.
9. **Undangan tidak bisa di-resend / kirim ulang via email** — hanya copy link manual.
10. **Tidak ada limit / kuota info** — owner tak tahu berapa banyak pegawai yang dipakai vs paket.
11. **Tidak ada export** (CSV daftar pegawai untuk HR/payroll).
12. **Field pegawai minim** — tidak ada tanggal masuk, tarif/upah per jam, alamat, catatan internal, dokumen (KTP).

### UI/UX
1. **Dua tabel terpisah (Aktif vs Manual) membingungkan** — pegawai yang sama bisa muncul di dua tempat (saat manual + login). Sebaiknya satu daftar terpadu dengan badge "Login aktif" / "Manual".
2. **Tidak responsif di mobile** — tabel lebar, scroll horizontal terpotong di viewport 889px ke bawah.
3. **Action icon-only tanpa label** — tombol kunci/reset/hapus hanya ikon, owner awam bingung. Perlu dropdown menu "..." dengan label jelas.
4. **Empty state minim** — saat 0 pegawai, tidak ada CTA besar atau ilustrasi pemandu.
5. **Form Tambah pegawai panjang vertikal** — di layar pendek perlu scroll. Bisa dipecah jadi tab (Info → Akses login) atau accordion.
6. **Kredensial baru ditampilkan dalam dialog tertutup** — kalau owner tutup tanpa salin, hilang selamanya. Perlu konfirmasi/warning sebelum tutup.
7. **Tidak ada indikator outlet** di header — bila owner punya banyak outlet, sulit tahu konteks aktif.
8. **Avatar fallback** hanya 1 huruf — sebaiknya pakai inisial 2 huruf + warna konsisten per nama.
9. **Tidak ada loading skeleton** — hanya spinner satu titik, terasa kosong.
10. **Tidak ada konfirmasi destruktif yang ramah** — pakai `confirm()` browser asli (jelek). Sebaiknya pakai AlertDialog shadcn.
11. **Undangan pending tidak menunjukkan kadaluarsa visual** — tanggal teks saja, tak ada warning "akan expired 2 hari lagi".

---

# Rencana Perbaikan (bertahap)

## Fase 1 — Quick wins UX (prioritas tinggi)
1. **Search bar + filter** (peran, outlet, status) di atas daftar.
2. **Gabungkan dua tabel** jadi satu dengan kolom "Tipe akses" (Login / Manual) sebagai badge.
3. **Ganti `confirm()` → AlertDialog** shadcn untuk hapus, reset, revoke.
4. **Action menu (DropdownMenu "...")** menggantikan deretan ikon — label jelas: "Edit", "Ubah sandi", "Kirim reset", "Nonaktifkan", "Hapus".
5. **Empty state ramah** dengan ilustrasi + dua CTA besar (Tambah / Undang).
6. **Loading skeleton** untuk daftar.
7. **Responsif mobile** — daftar jadi card di breakpoint kecil.
8. **Avatar inisial 2 huruf + warna deterministik** dari nama.

## Fase 2 — Fitur penting
9. **Edit anggota aktif (login)** — buka dialog yang sama untuk ubah peran & outlet.
10. **Status Aktif/Nonaktif** — tambah kolom `is_active` di `staff_members` & `user_roles`; sembunyikan dari Jadwal saat nonaktif.
11. **Resend undangan** — tombol kirim ulang + perpanjang `expires_at`.
12. **Promote manual → login** — tombol "Aktifkan akun login" pada pegawai manual.
13. **Field tambahan**: tanggal masuk, upah/jam, catatan internal (kolom baru di `staff_members`).
14. **Indikator kadaluarsa undangan** — badge merah/kuning bila < 3 hari.

## Fase 3 — Insight & operasional
15. **Statistik mini per pegawai**: jumlah shift bulan ini, transaksi tertangani, terakhir login.
16. **Audit log** sederhana (`staff_audit_logs`) — undang, reset, ubah peran, hapus.
17. **Export CSV** daftar pegawai.
18. **Bulk action** (pilih banyak → ubah outlet/peran/nonaktif).

---

# Catatan teknis (untuk implementasi)

- **Migrasi DB** dibutuhkan di Fase 2 & 3:
  - `ALTER TABLE staff_members ADD COLUMN is_active boolean DEFAULT true, hire_date date, hourly_rate numeric, notes text;`
  - `ALTER TABLE user_roles ADD COLUMN is_active boolean DEFAULT true;`
  - Tabel baru `staff_audit_logs (id, shop_id, actor_id, target_user_id, action, meta jsonb, created_at)` + RLS owner-only.
- **API server** (`artifacts/api-server/src/routes/staff.ts`) perlu endpoint baru: `update-user-role`, `resend-invitation`, `promote-to-login`.
- **Komponen baru** yang perlu dibuat: `StaffRow`, `StaffFilters`, `StaffActionsMenu`, `StaffEmptyState`, `StaffSkeleton`.
- File utama yang berubah: `artifacts/kopihub/src/routes/pos-app.employees.tsx` (refaktor besar — pecah jadi sub-komponen di folder `artifacts/kopihub/src/components/employees/`).

---

**Saran eksekusi**: kerjakan **Fase 1 dulu** (UX) karena dampaknya besar tanpa migrasi DB. Lalu konfirmasi sebelum lanjut ke Fase 2 (perlu migrasi).

Pilih: lanjut implementasi Fase 1, atau ada item yang ingin kamu prioritaskan/buang?
