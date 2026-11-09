# Hasil penerapan schema autentikasi

## Lingkup dan waktu

Draft `database/proposals/001-pengguna-auth.sql` diterapkan satu kali pada PostgreSQL asli setelah persetujuan eksplisit pengguna. Commit berhasil pada 9 November 2026 pukul 03:36:34 UTC / 10:36:34 WIB.

SHA-256 draft yang dieksekusi: `e8b38c1d258a97fe38bbfe218a8a488f495c49e709fe242c5e527af492af4aa1`.

Tidak ada migrasi tambahan, db push, penggantian password, aktivasi status ACTIVE, akun baru, atau pengaktifan fitur autentikasi. File SQL draft tetap sebagai artefak yang disetujui; komentar historis di dalamnya bukan status penerapan saat ini.

## Pemeriksaan sebelum eksekusi

- Manifest backup privat, ukuran/hasil restore, dan checksum arsip diverifikasi.
- Backup yang sama direstore ulang ke container PostgreSQL 17 Alpine terpisah dengan mount arsip read-only. Container dan anonymous volume dibersihkan setelah selesai.
- Target sumber diambil dari konfigurasi project, berbeda dari target restore. Sumber cocok persis dengan restore backup untuk 15 tabel, metadata kolom, constraint, indeks, fingerprint seluruh isi tabel, dan lima akun awal.
- Jumlah baris tetap 145; pengguna tetap lima akun dengan lima kolom lama. Kelima kolom/constraint/index tambahan belum tersedia.
- Flag Login database, Sign Up, dan persetujuan tidak aktif.

## Transaksi

Hanya pernyataan draft yang disetujui dijalankan, dengan lock_timeout 5 detik dan statement_timeout 30 detik. COMMIT akhir draft ditunda sampai seluruh pemeriksaan SELECT di dalam transaksi lulus. Tidak ada percobaan ulang otomatis. Tidak ada kegagalan eksekusi DDL atau rollback yang diperlukan pada penerapan ini.

## Hasil schema

| Kolom baru | Tipe | Nullable | Default |
| --- | --- | --- | --- |
| nomor_hp | varchar(32) | Ya | NULL |
| email | varchar(254) | Ya | NULL |
| status_akun | varchar(10) | Tidak | PENDING |
| diputuskan_oleh | varchar(10) | Ya | NULL |
| diputuskan_pada | timestamptz(6) | Ya | NULL |

`ck_pengguna_status_akun` membatasi PENDING/ACTIVE/REJECTED. `fk_pengguna_diputuskan_oleh` menunjuk pengguna.id_pengguna dengan ON UPDATE RESTRICT / ON DELETE RESTRICT. Indeks `ix_pengguna_status_username` ditambahkan. Seluruh constraint/index sebelumnya dan metadata kolom lama tetap sama.

Database tetap memiliki 15 tabel dan 145 baris. Pengguna sekarang memiliki 10 kolom, tetap lima akun. ID, username, nama, role, dan password_hash masing-masing dibandingkan langsung di memori sebelum/sesudah: sama persis. Seluruh akun berstatus PENDING; kontak dan metadata keputusan NULL. Fingerprint seluruh isi 14 tabel lain tidak berubah. Nilai password/hash/kredensial tidak dicetak atau dimasukkan ke laporan.

Pemeriksaan SELECT setelah commit memastikan keadaan sama dengan hasil yang diverifikasi di dalam transaksi. Manifest penerapan nonkredensial disimpan sebagai `schema-application.json` di folder backup privat sebelumnya.

## Prisma dan pengujian

`prisma/schema.prisma` diselaraskan dari introspeksi --print setelah penerapan, mencakup kelima kolom, self-relation pemberi keputusan, dan indeks baru. Jumlah model tetap 15. CHECK constraint tetap berada di PostgreSQL/SQL; introspeksi mencatat keterbatasan pemetaan CHECK Prisma.

Client digenerate ulang dengan Prisma 7.10.1. Query nyata menggunakan helper lib/prisma.ts dalam transaksi read-only berhasil: pengguna.count() = 5, groupBy status_akun = PENDING sebanyak 5, barang.count() = 10. SHOW transaction_read_only menghasilkan on.

- `npm run lint`: lulus.
- `npm run test:auth`: 15/15 lulus (mock, tanpa penulisan sumber).
- `npm run build`: lulus, 34 halaman dan Proxy berhasil dikompilasi.
- HTTP smoke test /login, /register, /owner, /kasir, /baker, /daily-worker, /owner/persetujuan: 200. Login menampilkan mode preview; persetujuan menampilkan belum diaktifkan. Ini bukan pengujian klik/visual browser penuh.
- Ketiga flag sumber terkonfirmasi tidak aktif setelah pengujian.

## File pada tahap ini

- Diperbarui: prisma/schema.prisma dan artefak app/generated/prisma/.
- Diperbarui: scripts/backup-auth-source.cjs agar inventory dapat dipakai tanpa menjalankan backup otomatis.
- Dibuat: scripts/apply-approved-auth-schema.cjs untuk pemeriksaan backup/restore, eksekusi tunggal draft, dan verifikasi sebelum commit. Script memerlukan izin environment eksplisit serta folder backup privat dan menolak schema yang sudah berubah; bukan hook startup.
- Dokumentasi ini beserta penunjuk status pada dokumen rollout.

## Tahap berikutnya — belum dijalankan

1. Minta persetujuan terpisah untuk password Owner pertama; jalankan mode --owner-only melalui input lokal tersembunyi. Tidak ada perubahan empat akun lainnya, role, atau status oleh script tersebut.
2. Verifikasi password Owner secara read-only; kemudian minta izin terpisah untuk status ACTIVE Owner awal dan catat bootstrap administratif.
3. Lengkapi preflight produksi (tipe/default/constraint/index, Owner valid ACTIVE, secret sesi, rate limiter). Setelah izin aktivasi, nyalakan hanya Login/guard, build/restart, dan uji Owner melalui HTTPS.
4. Sign Up/persetujuan tetap tertutup hingga Owner berhasil Login dan persetujuan pengaktifan berikutnya diberikan. Password/status staf awal tetap membutuhkan izin tersendiri.

Backup sebelumnya adalah snapshot sebelum schema baru. Jangan menimpa arsip tersebut; siapkan backup baru sesuai prosedur menjelang perubahan data berikutnya. Tidak ada pekerjaan aktivasi tambahan yang dilakukan pada tahap ini.
