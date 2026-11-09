# Verifikasi backup sebelum perubahan schema autentikasi

## Hasil

Backup database sumber berhasil dibuat pada 9 November 2026, diverifikasi pukul 03:30:38 UTC (10:30:38 WIB). Tidak ada penerapan perubahan schema sumber, perubahan akun, password, status, atau flag autentikasi.

Lokasi privat di luar repository:

`C:\Users\LENOVO\AppData\Local\ALANA\Backups\before-auth-20261109-103032\`

- Arsip: `alana-before-auth-2026-11-09T03-30-33-306Z.dump`
- Format: pg_dump custom, header PGDMP.
- Ukuran: 31.002 byte.
- SHA-256: `6a67eb16ade865d378ed1e4f4b20124830680f5038142358ca091f9657724e49`.
- Manifest nonkredensial: `verification.json` pada folder privat yang sama.

Directory ACL dilindungi dari inheritance parent; hanya SID pengguna Windows saat ini dan SYSTEM diberi FullControl. Kedua file mewarisi ACL folder tersebut. Tidak ada file backup atau data baris pengguna yang dimasukkan ke repository/Git. Format custom terkompresi bukan enkripsi; salinan terenkripsi di media terpisah belum dibuat.

## Target sumber dan snapshot

`scripts/backup-auth-source.cjs` membaca konfigurasi koneksi project tanpa mencetak URL, password, host, atau nama database. Preflight menolak nama database uji yang digunakan harness, memeriksa PostgreSQL major 17, lima kolom pengguna, 15 tabel, lima akun yang persis cocok dengan referensi seed, serta constraint/index yang diharapkan. Identitas sumber tidak diambil dari URL database pengujian.

Inventory sumber dibuat dalam transaksi REPEATABLE READ READ ONLY. Snapshot diekspor untuk pg_dump agar arsip dan baseline pembanding berasal dari snapshot yang sama. Client pg_dump PostgreSQL 17 Alpine dijalankan dengan default_transaction_read_only=on. Kredensial hanya diteruskan sebagai environment proses/container sementara, bukan argumen bernilai rahasia, log, file passphrase, atau Git. Container client backup dibuang setelah selesai.

Backup memakai pg_dump seluruh database tanpa filter tabel/schema dan tanpa membuang owner/ACL dari arsip. Backup ini adalah backup satu database, bukan seluruh cluster PostgreSQL; definisi role cluster, konfigurasi server, dan secret eksternal tidak dicakup pg_dump.

## Uji restore

Arsip lolos pembacaan header dan `pg_restore --list`. Kemudian restore penuh dijalankan dengan --exit-on-error dan --single-transaction pada database baru `alana_restore_check` di container PostgreSQL 17 Alpine yang dibuat khusus. Target kosong, berbeda dari sumber, memakai password acak, dan port loopback acak. Backup di-mount read-only pada target restore. Tidak ada restore yang diarahkan ke sumber.

Restore uji memakai --no-owner dan --no-privileges karena role cluster sumber tidak dibuat pada container. Arsip tetap memuat metadata asal; pemulihan ownership/ACL ke role produksi belum diuji.

Hasil pembandingan snapshot sumber terhadap hasil restore:

| Tabel | Baris |
| --- | ---: |
| barang | 10 |
| barang_dipakai | 8 |
| barang_masuk | 5 |
| detail_barang_dipakai | 25 |
| detail_barang_masuk | 9 |
| detail_laporan | 20 |
| detail_pemeriksaan | 13 |
| detail_pesanan | 9 |
| detail_transaksi | 18 |
| laporan_persediaan | 2 |
| pemasok | 3 |
| pemeriksaan_stok | 2 |
| pemesanan_barang | 5 |
| pengguna | 5 |
| transaksi | 11 |
| **Total** | **145** |

Nama tabel, metadata kolom (termasuk tipe, ukuran, nullable, default, presisi), constraint dan definisi indeks cocok. Fingerprint seluruh isi setiap tabel cocok; nilai fingerprint data tidak dicetak/disimpan ke laporan. Lima akun dibandingkan langsung di memori untuk ID, nama, username, password_hash, dan role: cocok persis. Nilai akun/hash tidak dicetak atau disalin ke laporan.

Setelah restore, sumber diperiksa lagi dalam transaksi read-only: seluruh inventory/fingerprint data dan lima akun tetap sama dengan baseline. Container restore beserta anonymous volume miliknya telah dibersihkan. Arsip dan manifest privat tetap disimpan.

## Kesesuaian draft migrasi

Draft `database/proposals/001-pengguna-auth.sql` cocok dengan struktur yang diperiksa: pengguna masih lima kolom varchar NOT NULL dengan panjang 10/50/20/255/20, PK dan unique username tersedia, lima kolom baru/constraint/index usulan belum ada. Tidak ada penerapan draft pada sumber dalam pekerjaan ini.

Penambahan kolom akan memberi PENDING pada akun lama untuk kolom status baru; lima field lama tetap dipertahankan. Draft tidak mengganti password, mengaktifkan akun, atau mengaktifkan aplikasi. Uji migrasi sebelumnya pada 15 tabel referensi sintetis sudah lulus, termasuk rollback DDL. Restore drill kali ini membuktikan arsip data asli dapat dipulihkan tanpa memodifikasi hasil restore dengan migrasi.

## Risiko yang masih tersisa dan urutan berikutnya

1. Backup lokal memiliki ACL terbatas tetapi belum merupakan salinan terenkripsi/off-device. Jaga backup tetap privat; ownership/ACL produksi dan role cluster perlu prosedur pemulihan tersendiri.
2. Backup mewakili snapshot saat dibuat. Bila sumber berubah, buat/verifikasi backup baru menjelang penerapan. Konfirmasi target dan ulangi preflight dalam jendela pemeliharaan.
3. ALTER TABLE/constraint/index memerlukan lock; draft memiliki lock_timeout 5 detik dan statement_timeout 30 detik. Jangan mengulang otomatis setelah gagal.
4. Runtime readiness saat ini hanya memeriksa keberadaan kolom; perlu preflight tipe/default/constraint/index lengkap sebelum aktivasi aplikasi. Secret sesi dan rate limiter produksi serta uji browser HTTPS tetap diperlukan.
5. Setelah persetujuan eksekusi schema: terapkan hanya draft additive dalam transaksi, verifikasi 10 kolom/constraint/index dan preservasi lima field akun awal, perbarui pemetaan Prisma lokal dan generate client secara terkontrol. Ketiga flag tetap nonaktif.
6. Setelah izin password Owner tersendiri: jalankan mode --owner-only dengan input tersembunyi; jangan menjalankan mode staf. Verifikasi password read-only.
7. Setelah izin status Owner tersendiri: aktifkan hanya Owner awal dan catat bootstrap administratif, tanpa mengubah role/identitas. Empat akun lainnya tetap menunggu izin masing-masing.
8. Baru setelah Owner valid dan ACTIVE, prasyarat sesi/rate limiter siap, dan izin aktivasi diberikan: hidupkan hanya Login/guard, build/restart, uji Owner. Sign Up/persetujuan tetap tertutup hingga Owner benar-benar berhasil masuk dan izin tahap berikutnya diberikan. Ini mencegah aktivasi autentikasi ketika tidak ada Owner yang dapat masuk.

`npm run lint` lulus. Build tidak diulang karena hanya utility backup dan dokumentasi yang ditambahkan; kode runtime/UI/schema Prisma tidak diubah pada tahap ini. Tidak ada migrasi, db push, INSERT/UPDATE/DELETE sumber, password reset, status activation, atau pengaktifan autentikasi yang dijalankan.
