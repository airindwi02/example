# Hasil penerapan schema dan harga Kasir

Tanggal: 9 November 2026.

**SQL 003 dan SQL 004 telah diterapkan ke PostgreSQL asli sesuai persetujuan pengguna. Harga resmi tersimpan. Pembayaran Tunai masih nonaktif; QRIS/Debit dan deployment tidak diaktifkan.**

## Target dan backup pre-activation

Target yang diverifikasi saat eksekusi: PostgreSQL 17 pada `127.0.0.1:5432`, database `apsi_db`, schema `public`, container `postgres-apsi-alpine`.

Backup terbaru dibuat tepat sebelum perubahan, di luar repo:

`C:\Users\LENOVO\AppData\Local\ALANA\Backups\before-cash-payment-approved-20261109-225953\alana-before-cash-payment-2026-11-09T15-59-56-466Z.dump`

- Custom format, 32.691 byte, SHA-256 `1dadf5a9110276920e784f76be4e790cdc7fa8b4f42520da8386734ccfe347d2`.
- `pg_restore --list` berhasil. Restore penuh pada PostgreSQL 17 terpisah cocok untuk 15 tabel, kolom, relasi, constraints, indexes, fingerprint data setiap tabel, dan akun.
- Manifest: `C:\Users\LENOVO\AppData\Local\ALANA\Backups\before-cash-payment-approved-20261109-225953\payment-backup-verification.json`.
- Folder memiliki ACL terbatas untuk akun Windows lokal dan SYSTEM.

Salinan DPAPI tanpa menimpa arsip asli: `alana-before-cash-payment-2026-11-09T15-59-56-466Z.dump.dpapi`, SHA-256 `9d1bf152e8db668c0a57550b44d99baf56a5acb7a3271695c2d6e3d993b03d95`. Hash sesudah dekripsi sama dengan arsip asli. Salinan terenkripsi juga berhasil dipulihkan dan diuji penuh pada PostgreSQL terpisah. DPAPI `CurrentUser` hanya dapat dibuka dari profil Windows yang sama; backup asli tetap tersedia di folder ber-ACL terbatas.

Snapshot sebelum perubahan mencatat 15 tabel, 9 pengguna, 10 barang, 11 transaksi, dan 18 detail transaksi. Status transaksi: 8 Berhasil dan 3 Gagal. Katalog berisi enam Bahan Baku dan empat Produk Hasil. `ff95a7f679` / `bapak kau` memang telah dihapus pengguna; produk itu tidak dibuat ulang.

## Hasil SQL 003

[SQL 003](../database/proposals/003-kasir-payment-final.sql) berhasil menambah tepat delapan kolom nullable:

- `barang.harga_jual numeric(12,2)`.
- `transaksi.metode_pembayaran varchar(10)`.
- `transaksi.total_bayar`, `pajak_layanan`, `uang_diterima`, `kembalian`: `numeric(18,2)`.
- `transaksi.waktu_bayar timestamptz(6)`.
- `transaksi.kunci_idempotensi uuid`.

Empat constraint telah diverifikasi tervalidasi: harga jual positif, stok tidak negatif, idempotensi unique, serta bundle pembayaran legacy-null atau pembayaran Tunai lengkap. Aturannya membatasi metode ke TUNAI, pajak nol, uang diterima cukup, dan kembalian sama dengan selisih uang diterima dan total. Tidak ada kolom biaya layanan tersendiri; kebijakan aplikasi menggunakan biaya layanan Rp0 dan total sama dengan subtotal.

Kesebelas transaksi legacy tetap tersimpan dan seluruh metadata pembayaran masih NULL. Tidak ada backfill transaksi lama.

## Hasil SQL 004 dan preservasi data

[SQL 004](../database/proposals/004-kasir-approved-prices.sql) berhasil memperbarui tepat satu record untuk setiap harga berikut:

| ID | Produk | Harga tersimpan |
|---|---|---:|
| PRD-01 | Roti Tawar | Rp18.000,00 |
| PRD-02 | Croissant Butter | Rp22.000,00 |
| PRD-03 | Caffe Latte | Rp25.000,00 |
| PRD-04 | Brownies Cokelat | Rp20.000,00 |

SELECT READ ONLY mengonfirmasi identitas dan harga produk. Tidak ada harga terisi pada produk lain atau bahan baku. Harga sejarah 15 detail transaksi Berhasil tidak berubah.

Setelah SQL 004, seluruh data pre-existing cocok baris demi baris dengan restore pre-activation setelah mengabaikan kolom baru dan empat `harga_jual` yang memang diisi. Verifikasi memastikan akun, stok, transaksi historis, detail transaksi, status, serta tabel lain tidak berubah. Jumlah tetap 9 pengguna, 10 barang, 11 transaksi, 18 detail transaksi, 15 tabel.

## Sinkronisasi Prisma dan feature gate

Schema aktif dan preview cocok dengan delapan kolom. `prisma7.config.ts` adalah konfigurasi Prisma 7 project. Validate dan generate untuk keduanya lulus. Prisma Client aktif berhasil membaca keempat harga serta 11 transaksi legacy dengan seluruh kolom pembayaran NULL.

`.env` tidak diubah dan diabaikan Git. Gate harga Owner dan checkout Tunai tetap tertutup; pemeriksaan `readKasir` menampilkan `paymentsEnabled: false`. Tidak ada QRIS/Debit. Tidak ada deployment.

Query transaksi Owner/Kasir menggunakan kolom legacy eksplisit, sehingga tidak meminta kolom pembayaran sebelum siap. Prisma SELECT setelah penerapan berjalan dalam transaksi READ ONLY untuk verifikasi.

## Pengujian akhir

- Restore rehearsal backup baru dan suite pembayaran/browser pada database terpisah: lulus. Mencakup SQL 003/004, legacy, Tunai pada clone, harga, pajak/kembalian, stok, idempotensi, konkurensi, validasi, rollback, otorisasi, refresh, dan restart.
- Regresi database/browser Pesanan, Daily Worker, Baker, Kasir, Owner Master Data, Owner setup, auth schema, dan login: lulus pada database terpisah.
- 38 unit test lulus.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`, Prisma validate/generate untuk schema aktif dan preview, serta `git diff --check`: lulus.
- Dua trailing whitespace di `database.sql` telah dibuang tanpa mengubah token SQL.
- Seluruh container uji dibersihkan. Tidak ada migrasi atau `prisma db push` dijalankan.

## Berkas yang diubah

Perubahan pemeriksaan akhir: `lib/kasir-service.ts`, `lib/owner-operations.ts`, `database.sql` (spasi saja), dan dokumen ini.

Berkas persiapan/implementasi pembayaran pada rangkaian pekerjaan ini: `prisma/schema.prisma`, `prisma/payment-preview.prisma`, `database/proposals/002-kasir-payment.sql`, SQL 003 dan 004, `lib/payment-policy.ts`, `lib/payment-service.ts`, `lib/kasir-cart.ts`, `lib/owner-master-service.ts`, `lib/owner-master-types.ts`, `lib/worker-service.ts`; action/UI Kasir serta form harga Owner; harness audit, backup, dan test terisolasi; unit/regression tests; `package.json`, `package-lock.json`, `.gitignore`, serta dokumen persiapan pembayaran. Backup dan file metadata disimpan di luar repo.

## Langkah yang masih memerlukan persetujuan

Penerapan DDL dan harga selesai. Langkah berikutnya—membuka gate harga Owner atau mengaktifkan checkout Tunai—belum dilakukan dan memerlukan persetujuan terpisah. QRIS/Debit tetap tidak didukung. Neon/Vercel belum siap: policy yang tersedia hanya mengizinkan loopback development atau database test; deployment memerlukan policy production dan backup/restore rehearsal khusus target. Jangan menyalin flag lokal ke Vercel.
