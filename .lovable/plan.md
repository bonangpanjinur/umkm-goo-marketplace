## Analisis awal

Error `dist-check failed with exit status 1` masih terlalu umum, jadi perbaikannya harus menargetkan jalur yang dipakai harness untuk membangun dan menemukan output aplikasi.

Temuan dari konfigurasi saat ini:

1. **Ada dua jalur build yang tidak sepenuhnya selaras**
   - Root `package.json` membangun dari `artifacts/kopihub`, lalu menyalin hasil ke root `dist/public`.
   - Artifact config `.replit-artifact/artifact.toml` membangun package `@workspace/kopihub` dan membaca output dari `artifacts/kopihub/dist/public`.
   - Jika dist-check memakai salah satu jalur ini secara berbeda, hasil build bisa sukses tetapi lokasi output yang dicek kosong/salah.

2. **Root `dist` saat ini kosong**
   - Ini mengindikasikan output root hanya ada setelah script root dijalankan. Bila dist-check memeriksa root `dist/public` tanpa menjalankan script yang tepat, check gagal.

3. **Skrip root masih menggunakan `cd` + path relatif panjang**
   - Skrip seperti `cd artifacts/kopihub && ... && cd ../.. && cp -R ...` rentan gagal jika working directory harness berbeda atau jika salah satu path tidak tersedia.

4. **Masih ada area runtime/backend risk, tapi bukan penyebab utama dist-check**
   - Route notifikasi dan beberapa fitur POS memakai tabel/RPC backend, tetapi file route sudah terdaftar dan tipe notifikasi ada di generated types.
   - Risiko ini lebih relevan untuk runtime dan Batch A Type Safety, bukan kegagalan dist-check langsung.

## Rencana perbaikan

### 1. Stabilkan script build root
- Ubah root `package.json` agar `build` dan `build:dev` tidak bergantung pada `cd` berantai.
- Gunakan `bun --cwd artifacts/kopihub run build` atau command absolut yang konsisten.
- Setelah build artifact selesai, mirror output ke root `dist/public` dengan path eksplisit.
- Pastikan script menghapus output lama sebelum menyalin agar dist-check tidak membaca artifact basi.

### 2. Selaraskan output artifact dan root
- Pertahankan `artifacts/kopihub/vite.config.ts` dengan `outDir: artifacts/kopihub/dist/public` karena ini dipakai artifact production config.
- Pastikan root `dist/public/index.html` selalu dibuat oleh root script.
- Jangan mengubah `routeTree.gen.ts` karena file ini auto-generated.

### 3. Periksa dependency command yang dipakai harness
- Pastikan root script tidak mengasumsikan `pnpm` jika environment menjalankan `bun`.
- Jika perlu, buat script root memakai `bun --cwd` untuk konsisten dengan workspace saat ini.
- Hindari menyentuh dependency atau lockfile kecuali error menunjukkan dependency hilang.

### 4. Bersihkan potensi TypeScript path mismatch ringan
- Periksa ulang route baru `/akun/notifikasi` dan import komponen notifikasi hanya jika ada indikasi dari dist-check/log.
- Jika error berasal dari TanStack typed link, ganti cast route dinamis dengan pola aman tanpa mengganggu routing.

### 5. Validasi setelah perubahan
- Verifikasi melalui sinyal harness/dist-check yang muncul setelah perubahan.
- Cek bahwa dua target output berikut tersedia:
  - `artifacts/kopihub/dist/public/index.html`
  - `dist/public/index.html`
- Jika dist-check masih gagal, lanjutkan dari log spesifik pertama, bukan menebak area lain.

## File yang kemungkinan diubah

- `package.json` root: perbaikan utama script `build`, `build:dev`, dan bila perlu `typecheck`.
- File route/komponen hanya disentuh jika log dist-check menunjukkan error kode spesifik.

## Batasan

Saya tidak akan mengubah schema database atau fitur POS dalam perbaikan ini, karena targetnya adalah menyelesaikan `dist-check` terlebih dahulu.