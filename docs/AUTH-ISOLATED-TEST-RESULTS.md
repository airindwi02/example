# Hasil pengujian terisolasi dan bootstrap bertahap

## Status persetujuan

Persetujuan pengguna hanya mencakup rancangan/persiapan dan penulisan pada database pengujian yang terpisah. Tidak ada perubahan schema, password, identitas, role, atau status pada PostgreSQL asli. Flag aplikasi asli tetap nonaktif. Script password interaktif tidak dijalankan.

## Masalah Docker dan solusi

Image glibc `postgres:17` gagal memuat `/lib/x86_64-linux-gnu/libc.so.6` dengan `invalid ELF header`; entrypoint juga menghasilkan `exec format error`. Ini bukan kegagalan autentikasi atau SQL aplikasi. Image alternatif `postgres:17-alpine` berhasil menjalankan PostgreSQL 17.11. Tidak ada penghapusan image lama atau perubahan engine Docker.

Harness memakai image Alpine, container unik baru, password acak hanya di memori/environment proses anak, port acak pada 127.0.0.1, dan tanpa mount direktori atau URL database sumber. Ia tidak membaca .env. Setelah tes, hanya container miliknya dan anonymous volume miliknya yang dibersihkan. Tidak diperlukan layanan PostgreSQL eksternal.

## Pengujian database yang dilakukan

`node scripts/test-auth-schema.cjs` menjalankan SQL draft pada database sementara. Ia membuat 15 tabel dari pernyataan CREATE TABLE referensi lokal, tanpa menjalankan INSERT seed sumber; lima akun sintetis digunakan untuk uji preservasi. Hasil ini bukan pengujian terhadap salinan backup lengkap sumber.

- Guard persetujuan menolak draft tanpa izin session-level.
- Kegagalan DDL di tengah transaksi membatalkan penambahan kolom, tanpa schema parsial.
- Lima kolom baru berhasil ditambahkan. Lima field lama lima akun sintetis tetap persis sama sebelum/sesudah migrasi, termasuk nilai seed sintetis.
- Semua constraint lama pada 15 tabel tetap tersedia dengan definisi yang sama.
- Status kelima akun lama di database uji menjadi PENDING; kontak dan metadata keputusan NULL. Tidak ada akun diaktifkan oleh migrasi.
- Status tidak dikenal dan aktor keputusan yang tidak ada ditolak database.
- Penerapan ulang draft ditolak, bukan diam-diam mengabaikan drift.
- Bootstrap Owner sintetis dilakukan hanya pada database uji, terpisah dari migrasi. Login Owner berhasil sementara Sign Up dan persetujuan masih tertutup; kedua aksi ditolak tanpa menambah akun.
- Setelah flag uji dibuka, Sign Up nyata melalui Prisma menyimpan kontak dan Argon2id dengan status PENDING. Username duplikat ditolak, password plaintext tidak disimpan.
- Login pending ditolak. Owner menyetujui akun produksi menjadi Barista, dengan ID aktor dan waktu keputusan tersimpan. Login salah role/password ditolak; role produksi masuk /baker.
- Sesi HttpOnly dibuat dan Logout menghapus cookie.

Harness menggunakan cookie/header Next.js mock dan menjalankan fungsi server sebenarnya terhadap Prisma/PostgreSQL uji. Ini bukan browser end-to-end. Tidak ada pengujian tulis terhadap sumber. Unit test melengkapi kasus self-approval, staf mencoba persetujuan, status REJECTED, akses antar-role, cookie rusak/kedaluwarsa, pembatasan percobaan, dan seleksi bootstrap Owner-only.

## Pengaktifan terpisah

Semua variabel berikut tetap tidak diaktifkan pada aplikasi sumber:

| Flag server | Efek ketika bernilai enabled |
| --- | --- |
| ALANA_DATABASE_AUTH | Login database, pemeriksaan sesi/role/status dashboard |
| ALANA_APPROVALS | Persetujuan Owner; juga memerlukan flag Login aktif |
| ALANA_SIGNUP | Sign Up database; juga memerlukan flag Login aktif |

Pengaman berlaku pada Server Action dan UI; memanggil aksi langsung tidak melewati flag. Aktivasi Login saja tidak membuka pendaftaran atau keputusan Owner. Build/runtime harus memakai nilai flag konsisten. Default tanpa ketiga flag mempertahankan preview lama; preview bukan mode keamanan produksi.

## Password Owner pertama

Script sekarang wajib diberi lingkup eksplisit: `--owner-only` atau `--staff-only`; tidak ada mode default atau --all. Owner dipilih dari role database yang cocok dengan referensi lima akun, bukan username atau urutan ID. Mode Owner-only menyiapkan tepat satu perubahan password_hash, tidak mengubah empat akun lain dan tidak mengubah status.

Script menolak identitas/role yang sudah berubah dan hash akun terpilih yang bukan lagi seed, sehingga tidak menimpa password yang telah disiapkan. Mode staff-only dapat dijalankan kelak dengan izin terpisah meski Owner sudah memiliki Argon2id. Password antarakun terpilih harus berbeda; input juga ditolak jika cocok dengan password Argon2id akun awal yang sudah diinisialisasi.

Persetujuan terpisah tetap wajib sebelum menjalankan: environment sementara ALANA_ALLOW_INITIAL_PASSWORD_WRITE=approved, terminal lokal, dan konfirmasi SET OWNER PASSWORD atau SET STAFF PASSWORDS. Input tersembunyi dan konfirmasi password diperlukan. Minimal 12 karakter untuk password bootstrap. Password tidak dimasukkan ke argumen shell, file, log, atau Git. Script ini **belum dijalankan**. Helper seleksi lingkup diuji dengan data sintetis tanpa database asli.

## Urutan berikutnya

1. Backup seluruh database asli dan buktikan restore pada target terpisah sebelum izin penerapan. Tes container sintetis tidak menggantikan restore drill.
2. Setelah persetujuan eksekusi schema asli: terapkan SQL additive, verifikasi data/constraint; semua flag tetap nonaktif.
3. Setelah izin password Owner: jalankan Owner-only dengan input lokal, lalu verifikasi read-only.
4. Setelah izin status Owner: aktifkan hanya Owner awal. Catat bootstrap administratif secara privat; jangan membuat persetujuan diri sendiri semu.
5. Setelah prasyarat secret, rate limiter, dan preflight lengkap: aktifkan hanya ALANA_DATABASE_AUTH, build/restart, lalu uji Login Owner HTTPS.
6. Setelah Owner berhasil Login dan izin aktivasi berikutnya diberikan: buka persetujuan dan Sign Up. Empat akun awal lain tetap menunggu izin password/status tersendiri.

Pemeriksaan tipe/default/constraint/index dalam preflight produksi masih perlu diperluas; pengecekan runtime sekarang hanya memeriksa keberadaan kolom. Tidak ada flag aktif atau perubahan database asli yang dilakukan oleh langkah persiapan ini.

## Verifikasi akhir

- Integrasi PostgreSQL Alpine: lulus, termasuk rollback DDL dan preservasi constraint dari 15 tabel referensi.
- `npm run test:auth`: 15/15 lulus.
- `npm run lint`: lulus.
- `npm run build`: lulus, 34 halaman dan Proxy berhasil dikompilasi.
- SELECT sumber dalam transaksi read-only: 5 akun, 5 kolom, seluruh identitas/username/password seed/role cocok dengan referensi. Ketiga flag sumber tidak aktif.
- Mode password Owner-only/staff-only hanya disiapkan dan helper seleksinya diuji; script interaktif tidak dijalankan. Tidak ada penerapan SQL draft pada PostgreSQL asli.
