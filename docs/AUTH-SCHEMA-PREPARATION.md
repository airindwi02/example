# Rencana perubahan schema autentikasi — belum diterapkan

Pembaruan pengujian dan bootstrap: [AUTH-ISOLATED-TEST-RESULTS.md](./AUTH-ISOLATED-TEST-RESULTS.md). Hambatan image Docker yang dicatat di bawah telah diatasi memakai PostgreSQL Alpine; hasil pengujian baru menggantikan status terhambat sebelumnya. Pemisahan flag dan mode Owner-only juga sudah diimplementasikan, tetap nonaktif.

## Hasil verifikasi

Database sumber PostgreSQL 17 diperiksa dengan BEGIN READ ONLY / SELECT / ROLLBACK. Tabel public.pengguna masih berisi lima kolom: id_pengguna varchar(10), nama_pengguna varchar(50), username varchar(20), password_hash varchar(255), peran varchar(20), seluruhnya NOT NULL. Primary key pk_pengguna dan unique uq_pengguna_username tetap tersedia. Lima akun awal beserta ID, nama, username, password seed, dan role cocok dengan referensi. Tidak ada perubahan data sumber.

Kode yang ditinjau: repository, validasi/role, Server Actions, password, sesi, rate limit, request proxy, gate dashboard, formulir Login/Sign Up, persetujuan Owner, dan script password. Query persiapan menggunakan public.pengguna; schema public dipertahankan. Kolom baru berikut cocok dengan nama dan parameter query yang sudah disiapkan.

| Kolom baru | PostgreSQL | Nullable/default | Penggunaan |
| --- | --- | --- | --- |
| nomor_hp | varchar(32) | Ya / NULL | Nomor telepon wajib divalidasi server untuk akun baru; akun lama belum memiliki data |
| email | varchar(254) | Ya / NULL | Opsional; tidak digunakan sebagai identitas Login |
| status_akun | varchar(10) | Tidak / PENDING | Sign Up eksplisit PENDING; Login/otorisasi hanya menerima ACTIVE |
| diputuskan_oleh | varchar(10) | Ya / NULL | ID Owner yang menyetujui/menolak |
| diputuskan_pada | timestamptz(6) | Ya / NULL | CURRENT_TIMESTAMP dari transaksi keputusan |

Constraint baru: ck_pengguna_status_akun membatasi PENDING/ACTIVE/REJECTED; fk_pengguna_diputuskan_oleh adalah self-reference ke id_pengguna dengan ON DELETE RESTRICT / ON UPDATE RESTRICT. Indeks ix_pengguna_status_username mendukung antrean pending dan pengurutan username. PK, unique username, tipe/ukuran lima kolom lama, dan seluruh relasi tabel lain tidak diubah. Kolom status menggunakan varchar + CHECK, bukan enum baru, agar sesuai parameter SQL aplikasi.

FK hanya memastikan aktor ada; ia tidak membuktikan aktor merupakan Owner ACTIVE. Kewenangan tersebut wajib diperiksa server, diulang di dalam transaksi dengan row lock seperti pada decideAccount. Pemohon tidak boleh menyetujui diri sendiri. Baker/Barista hanya dapat dialihkan satu sama lain saat persetujuan permintaan produksi. Perubahan status atau role administratif tidak boleh dilakukan oleh form biasa.

Pemetaan Prisma yang direncanakan (bukan perubahan schema aktif): String? @db.VarChar(32), String? @db.VarChar(254), String @default("PENDING") @db.VarChar(10), String? @db.VarChar(10), DateTime? @db.Timestamptz(6), dua sisi self-relation berlabel unik, serta @@index([status_akun, username], map: "ix_pengguna_status_username"). Constraint CHECK tetap dicatat di SQL karena bukan deklarasi model Prisma biasa. Introspeksi --print setelah perubahan yang disetujui menjadi sumber verifikasi sebelum schema lokal diperbarui dan client digenerate.

## Berkas SQL yang disiapkan

`database/proposals/001-pengguna-auth.sql` adalah draft mandiri di luar prisma/migrations. Tidak ada migrasi Prisma baseline yang dibuat atau dijalankan untuk database lama ini. Tidak ada hook startup/npm yang mengeksekusinya.

Draft menggunakan transaksi atomic, lock_timeout 5 detik dan statement_timeout 30 detik. Persetujuan session-level alana.auth_schema_approved harus ditetapkan secara manual ke yes pada koneksi penerapan setelah izin pengguna. Tanpa itu draft gagal. Draft menolak schema yang sudah berubah atau penerapan ulang; tidak memakai IF NOT EXISTS untuk menyembunyikan perbedaan struktur.

Persetujuan session bukan pengganti otorisasi DBA: gunakan role deployment yang dibatasi dan verifikasi identitas target secara privat sebelum setiap penerapan. Draft berisi ADD COLUMN, ADD CONSTRAINT, CREATE INDEX, serta kontrol transaksi; tidak ada INSERT, UPDATE, DELETE, DROP, penggantian password, atau aktivasi akun. Jangan menjalankannya pada sumber sebelum izin eksplisit. Default PENDING berlaku pula untuk lima baris lama pada kolom status baru; kelima field lama tetap utuh.

## Backup sebelum penerapan — belum dibuat pada tahap ini

1. Jadwalkan waktu pemeliharaan dan hentikan operasi tulis aplikasi selama penerapan/verifikasi. Catat versi PostgreSQL, schema, constraint/index, jumlah baris setiap tabel, serta baseline privat lima akun awal tanpa mencetak hash/password.
2. Gunakan client pg_dump PostgreSQL 17 yang kompatibel. Simpan koneksi dalam service profile/passfile berizin terbatas, di luar repository; jangan masukkan URL/password ke argumen shell, log, atau dokumen. Untuk layanan terkelola gunakan koneksi backup langsung yang sesuai, bukan asumsi pooler transaksi.
3. Buat backup seluruh database dalam custom format, bukan hanya pengguna, untuk mempertahankan ketergantungan tabel lain. Contoh bentuk perintah setelah service profile aman tersedia:

   `pg_dump --dbname=service=alana_source --format=custom --file=<lokasi-backup-pribadi>/alana-before-auth.dump`

4. Periksa exit code dan peringatan, pastikan file tidak kosong, hitung checksum file secara lokal, dan simpan dengan enkripsi serta akses terbatas. Backup mengandung data sensitif meski terkompresi; jangan simpan dalam Git/workspace atau lampirkan ke percakapan.
5. Periksa daftar objek dengan pg_restore --list. Ini belum membuktikan backup bisa dipulihkan: lakukan restore penuh ke database uji baru yang identitasnya berbeda dan tidak memiliki koneksi aplikasi produksi.
6. Gunakan pg_restore --exit-on-error --single-transaction ke service profile database uji, bukan ke sumber. Pastikan target kosong dan berbeda; tidak perlu --clean pada database asli. Verifikasi 15 tabel, relasi/index, jumlah baris, dan lima identitas/role.
7. Setelah restore drill lulus, ulangi backup menjelang penerapan bila ada perubahan sejak backup uji. Jangan lanjut jika backup atau restore gagal.

pg_dump/pg_restore tidak ditemukan pada PATH lokal saat pemeriksaan. Backup belum dijalankan. Docker tersedia, tetapi image PostgreSQL 17 tidak dapat dijalankan (exec format error); jangan mengandalkan Docker untuk backup sampai hambatan ini diselesaikan.

Referensi: https://www.postgresql.org/docs/17/app-pgdump.html dan https://www.postgresql.org/docs/17/app-pgrestore.html.

## Pengujian terpisah

Tidak ada TEST_DATABASE_URL / DATABASE_TEST_URL / ALANA_TEST_DATABASE_URL yang dikonfigurasi. Harness `scripts/test-auth-schema.cjs` disiapkan tanpa membaca .env dan tanpa menerima URL database luar: ia membuat container postgres:17 dengan port acak khusus loopback, password acak di memori, tanpa mount sumber, dan lima akun sintetis (bukan salinan akun asli). Seluruh INSERT/UPDATE dalam harness hanya menargetkan container yang dibuat invocation tersebut. Container beserta anonymous volume dibersihkan berdasarkan ID container yang dibuatnya sendiri.

Hasil percobaan: Docker engine terjangkau, tetapi container PostgreSQL berhenti sebelum tersedia port; uji image secara langsung menghasilkan `exec /usr/local/bin/docker-entrypoint.sh: exec format error`. Image dan engine melaporkan amd64; akar masalah runtime/image belum dipastikan. Seluruh container percobaan dibersihkan. **SQL migrasi dan alur database belum sempat dieksekusi pada database uji. Jangan menyebutnya sudah lulus integrasi.** Database asli tidak dijadikan fallback.

Setelah runtime PostgreSQL uji berfungsi, jalankan harness secara eksplisit. Ia merencanakan uji: penolakan tanpa izin, penambahan kolom atomic, preservasi lima field akun awal, default PENDING, constraint status/FK, penolakan penerapan ulang, Sign Up melalui Prisma, kontak tersimpan, hash Argon2id, username duplikat, pending ditolak Login, persetujuan Owner, role Barista ke /baker, salah password/role ditolak, sesi HttpOnly, dan Logout. Headers/cookie Next dimock; hasil ini tetap bukan pengujian browser end-to-end.

Tambahkan restore drill database lengkap dan uji browser terpisah sebelum produksi, termasuk Owner baru, REJECTED, self-approval, non-Owner approval, role tampering, kompetisi username/keputusan, kegagalan transaksi, lint dan build. Uji kegagalan DDL di tengah transaksi harus membuktikan rollback tanpa kolom parsial. Uji constraint dengan input salah hanya boleh dilakukan pada database uji.

## Lima akun awal dan risiko

- Schema saja tidak mengaktifkan siapa pun: kelimanya mendapatkan PENDING untuk kolom baru. ID, nama, username, role, dan password lama tidak disentuh. Login database tetap nonaktif.
- Jangan memberi ACTIVE berdasarkan urutan ID, pilihan frontend, atau dugaan usr01 adalah Owner. Owner awal diidentifikasi dari peran aktual database.
- ADD COLUMN/constraint/index memerlukan lock. Jalankan dalam jendela pemeliharaan; timeout harus membatalkan transaksi alih-alih menunggu tanpa batas. Jangan mengulang otomatis setelah timeout; periksa ulang kondisi target.
- Setelah COMMIT jangan melakukan rollback dengan DROP COLUMN: tindakan itu menghilangkan kontak/status/audit baru. Bila aplikasi bermasalah, hentikan rollout dan gunakan versi aplikasi nonaktif secara privat; perbaiki ke depan atau lakukan restore terencana dengan izin terpisah dan rekonsiliasi penulisan setelah backup. Preview demo bukan mode aman untuk publikasi data terlindungi.
- Bootstrap Owner pertama tidak boleh mengisi diputuskan_oleh dengan ID diri sendiri seolah persetujuan biasa. Aktivasi administratif awal boleh memiliki metadata keputusan NULL dan harus dicatat pada catatan operasional privat setelah izin khusus. Persetujuan akun berikutnya selalu mencatat Owner dan waktu.

## Temuan kode yang harus dibereskan sebelum aktivasi, bukan perubahan tahap ini

1. Saat ini ALANA_DATABASE_AUTH mengaktifkan Login, Sign Up, dan persetujuan bersama. Diperlukan pengaman terpisah untuk menahan Sign Up/persetujuan sampai Login Owner sudah diuji; pengaman harus diperiksa Server Action, bukan UI saja. Flag aplikasi tetap nonaktif sekarang.
2. Script set-initial-passwords.ts memproses kelima akun sebagai satu batch. Untuk urutan Owner lebih dahulu, siapkan mode Owner-only dengan pemeriksaan identitas dan tetap menolak overwrite hash yang sudah valid. Jangan menjalankan script batch dengan persetujuan yang hanya mencakup Owner.
3. assertAuthSchema saat ini hanya memeriksa keberadaan kolom. Preflight sebelum aktivasi perlu memeriksa tipe, panjang, default, CHECK/FK/index, Owner ACTIVE dan keberhasilan verifikasi password, serta secret sesi dan rate limiter produksi.
4. field() pada Server Action mengubah input terlalu panjang menjadi string kosong. Email opsional yang melampaui 254 karakter dapat hilang diam-diam. Ubah menjadi error validasi eksplisit sebelum Sign Up diaktifkan, agar data tidak dibuang.

Kode runtime/UI tidak diubah dalam tahap persiapan schema ini; temuan di atas menjadi prasyarat aktivasi yang perlu ditinjau.

## Urutan aktivasi dan persetujuan

1. Persetujuan terpisah: perbaikan prasyarat kode/bootstrap bertahap; uji pada database terisolasi sampai lulus.
2. Persetujuan schema asli: backup/restore drill terverifikasi, konfirmasi target privat, jalankan draft additive setelah review, verifikasi hasil dan lima identitas. Auth tetap nonaktif; tidak ada aktivasi/password terselip dalam SQL.
3. Persetujuan data password Owner: input tersembunyi, Argon2id; hanya Owner yang dicakup izin. Jalankan verifikasi read-only terhadap password input, bukan mencetak hash.
4. Persetujuan status Owner: ubah hanya Owner awal menjadi ACTIVE secara administratif. Kelima akun tidak diaktifkan massal. Audit administratif terpisah tanpa kredensial.
5. Persetujuan aktivasi Login/guard: secret/rate limiter siap, build/runtime konsisten, Sign Up/persetujuan tetap tertahan. Uji Login Owner melalui HTTPS dan pastikan dashboard Owner bisa dibuka serta akses antar-role ditolak.
6. Setelah Owner berhasil Login, persetujuan mengaktifkan Sign Up dan persetujuan akun. Uji akun baru: tersimpan PENDING, diverifikasi Owner, ACTIVE, baru dapat Login. Akun REJECTED/pending tetap tidak memperoleh sesi.
7. Persetujuan terpisah untuk password/status empat akun awal lainnya dan setiap pengujian tulis di database asli. Tidak ada izin dari rencana ini yang dianggap izin eksekusi otomatis.

## Status akhir tahap persiapan

Hanya draft SQL, harness uji terisolasi, dan dokumen persiapan yang dibuat. Schema Prisma aktif, kredensial, database asli, flag autentikasi, desain, dan dashboard tidak diubah. Tidak ada backup sumber, migrasi sumber, password reset, atau aktivasi yang dijalankan.

Pemeriksaan lokal: `node --check scripts/test-auth-schema.cjs` lulus, `npm run lint` lulus, dan `npm run test:auth` 13/13 lulus. Ini tidak menggantikan uji SQL pada PostgreSQL atau restore drill. Build tidak diulang karena tidak ada perubahan kode runtime Next.js pada tahap ini.
