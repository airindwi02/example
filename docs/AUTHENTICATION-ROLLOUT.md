# Persiapan autentikasi ALANA

Setup Owner melalui browser: [OWNER-BROWSER-SETUP.md](./OWNER-BROWSER-SETUP.md). Formulir /register tetap sama, dengan kode setup khusus Owner pertama dan persetujuan untuk Owner berikutnya. Kode disiapkan dan diuji pada database terpisah; belum diaktifkan atau dijalankan untuk membuat Owner pada database asli. Batas uji UAC interaktif dicatat secara eksplisit.

Alur browser localhost terbaru: [LOCAL-STAFF-AUTH.md](./LOCAL-STAFF-AUTH.md). Mode pengembangan opsional mendukung Sign Up staf langsung ACTIVE tanpa bootstrap Owner; pendaftaran Owner tetap ditolak dan kelima akun lama dipertahankan. Tidak berlaku pada produksi. Instruksi persetujuan/Owner di bawah tetap untuk alur terkontrol di luar mode lokal ini.

Status penerapan schema terbaru: [AUTH-SCHEMA-APPLICATION.md](./AUTH-SCHEMA-APPLICATION.md). Lima kolom sudah diterapkan dengan izin eksplisit; kelima akun tetap PENDING, password belum diubah, dan seluruh fitur autentikasi tetap nonaktif. Bagian persiapan sebelum penerapan di bawah adalah catatan tahap sebelumnya.

Status terbaru: lihat [AUTH-ISOLATED-TEST-RESULTS.md](./AUTH-ISOLATED-TEST-RESULTS.md) untuk pengujian PostgreSQL Alpine yang lulus, flag Login/Sign Up/persetujuan terpisah, dan script yang kini wajib memakai --owner-only atau --staff-only. Instruksi batch lama di bawah bersifat historis; jangan menjalankannya tanpa lingkup eksplisit dan izin terpisah.

Rencana schema dan urutan bootstrap terbaru: lihat [AUTH-SCHEMA-PREPARATION.md](./AUTH-SCHEMA-PREPARATION.md). Dokumen itu mencatat prasyarat pemisahan flag Login/Sign Up dan script Owner-only sebelum aktivasi; keduanya belum diterapkan.

## Status saat ini

Kode telah disiapkan tetapi **tidak diaktifkan**. Tidak ada perubahan schema atau data database yang dilakukan oleh implementasi ini. Tidak ada script penulisan yang dijalankan oleh install/build/start.

`ALANA_DATABASE_AUTH` harus tetap tidak diisi sampai seluruh persetujuan dan pemeriksaan aktivasi selesai. Mode sekarang mempertahankan demo frontend lama, bukan autentikasi atau kontrol akses produksi. Demo tidak membuat cookie sesi asli dan tidak boleh dipublikasikan sebagai aplikasi dengan data terlindungi.

## Usulan schema — belum diterapkan

Tambahan pada `public.pengguna`:

| Kolom | Tipe usulan | Aturan |
| --- | --- | --- |
| nomor_hp | varchar(32), nullable | Wajib pada pendaftaran baru; akun lama boleh null |
| email | varchar(254), nullable | Opsional; bukan identitas login |
| status_akun | varchar(10), NOT NULL, default PENDING | CHECK: PENDING / ACTIVE / REJECTED |
| diputuskan_oleh | varchar(10), nullable | FK ke pengguna.id_pengguna; tidak menghapus akun secara cascade |
| diputuskan_pada | timestamptz, nullable | Waktu keputusan |

Index usulan `(status_akun, username)` untuk daftar persetujuan. Unique username yang sudah ada dipertahankan. Akun lama tidak otomatis ACTIVE. Tidak ada migrasi/DDL dalam paket implementasi ini. Setelah persetujuan schema terpisah, verifikasi struktur, perbarui schema Prisma secara terkontrol, dan generate client. Repository persiapan memakai SQL Prisma terparameterisasi terhadap kolom usulan, tanpa `Unsafe` atau interpolasi identifier.

## Aktivasi aman — memerlukan persetujuan terpisah

1. Tinjau perubahan schema dan siapkan backup serta database uji terpisah. Terapkan perubahan hanya setelah izin eksplisit.
2. Uji alur tulis dengan database uji. Tidak ada fallback URL pengujian ke database asli.
3. Tetapkan password lima akun awal setelah izin perubahan password. Script hanya mengubah password_hash akun yang persis cocok dengan referensi seed; menolak akun yang sudah berubah. Script tidak membuat akun, tidak mengaktifkan status, dan tidak mengubah identitas/role.
4. Script memerlukan terminal lokal serta environment sementara `ALANA_ALLOW_INITIAL_PASSWORD_WRITE=approved`, lalu konfirmasi interaktif. Jalankan manual dengan Node kondisi `react-server` dan runner tsx: `node --conditions=react-server --import tsx scripts/set-initial-passwords.ts`. Jangan menaruh password di argumen shell atau environment; masukkan melalui prompt tersembunyi. Hapus environment izin sesudahnya. Script ini **belum dijalankan**.
5. Setelah persetujuan data terpisah, tandai akun Owner awal ACTIVE dan catat keputusan administratif. Pertahankan semua identitas/role. Akun awal lain diaktifkan hanya sesuai persetujuan. Ini bukan pekerjaan otomatis script password.
6. Lakukan pemeriksaan preflight read-only: kolom/constraint tersedia; Owner awal ACTIVE; password Owner dapat diverifikasi Argon2id melalui input lokal. Jangan mengaktifkan guard sebelum pemeriksaan ini berhasil.
7. Sediakan `ALANA_SESSION_SECRET` acak minimal 32 karakter melalui secret manager/environment server. Jangan masukkan nilainya ke kode, log, Git, atau NEXT_PUBLIC.
8. Implementasi saat ini tidak memakai Redis maupun pembatas percobaan login. Sebelum deployment publik, risiko brute-force harus ditinjau dan mitigasi yang sesuai harus disetujui.
9. Baru set `ALANA_DATABASE_AUTH=enabled`, build ulang dan restart, lalu jalankan smoke test Owner pada lingkungan HTTPS. Flag build/runtime harus sama. Jika gagal, jangan longgarkan validasi atau menerima password seed. Rollback aktivasi sebelum publikasi, tanpa mengubah data.

## Login dan persetujuan

Server menolak akun non-ACTIVE dan role tidak dikenal. Pilihan role UI harus cocok dengan role database; pilihan Baker/Barista menerima Baker atau Barista. Cookie terenkripsi HttpOnly, SameSite=Lax, Secure pada produksi, berlaku absolut 8 jam. Sesi tidak memuat password/hash; fingerprint HMAC kredensial di dalam sesi membatalkan sesi setelah perubahan password. Status/role dibaca ulang pada setiap pemeriksaan server. Logout menghapus cookie browser; cookie stateless yang sudah disalin pihak lain tidak memiliki daftar pencabutan individual, tetapi tunduk pada kedaluwarsa/status/fingerprint. Pencabutan per sesi memerlukan penyimpanan sesi tambahan di tahap berikutnya.

Persetujuan tersedia di `/owner/persetujuan`; hanya Owner ACTIVE, bukan pemohon sendiri. Semua keputusan memerlukan password Owner lagi (termasuk pemberian Owner baru). Identitas pemohon harus diverifikasi Owner di luar formulir. Server mengunci baris, memeriksa ulang otorisasi serta status PENDING, lalu mencatat keputusan. Untuk permintaan produksi saja, Owner dapat memilih Baker atau Barista. Tidak ada self-service peningkatan role.

## Pengujian

`npm run test:auth` memakai mock repository/cookie dan password acak di memori, bukan database. Mencakup status/role, signup pending, kegagalan password/hash, sesi, persetujuan, serta guard aktivasi. Lint dan build tidak menjalankan script password. Pengujian PostgreSQL nyata untuk INSERT/UPDATE, perlombaan username, persetujuan, dan perubahan password ditunda sampai database uji disediakan dan schema disetujui. Jangan memakai `DATABASE_URL` asli sebagai database uji. Pengujian browser alur aktif juga menunggu bootstrap dan persetujuan.

## Inventaris implementasi

File baru:

- `lib/auth-policy.ts`, `lib/auth-config.ts`, `lib/auth-repository.ts`, `lib/auth.ts`, `lib/password.ts`, `lib/session.ts`.
- `app/_auth/actions.ts`, `app/_auth/AuthMode.tsx`, `app/_auth/DashboardGate.tsx`, `app/_auth/LogoutLink.tsx`.
- `app/owner/persetujuan/page.tsx`, `ApprovalForm.tsx`, `approval.css` pada direktori yang sama.
- `proxy.ts`, `scripts/set-initial-passwords.ts`, `tests/auth.test.cjs`, dokumen ini.

File yang diubah pada tahap ini:

- `app/layout.tsx`, `app/_auth/AuthForm.tsx`.
- `app/owner/layout.tsx`, `app/owner/OwnerSectionLayout.tsx`.
- `app/kasir/layout.tsx`, `app/kasir/KasirShell.tsx`.
- `app/baker/layout.tsx`, `app/baker/BakerClient.tsx`.
- `app/daily-worker/layout.tsx`, `app/daily-worker/WorkerShell.tsx`.
- `package.json`, `package-lock.json`.

`lib/prisma.ts`, schema aktif, SQL referensi, kredensial, serta desain/CSS Login lama tidak diubah pada tahap ini. Validasi demo lama dipertahankan hanya pada mode preview yang tidak membuat sesi nyata; mode database tidak memanggilnya.

## Hasil verifikasi tahap kode

- 13 unit test lulus dengan repository/cookie mock; test harness menolak akses Prisma nyata kecuali mock disediakan.
- `npm run lint`: lulus.
- `npm run build`: lulus, 34 halaman dan Proxy berhasil dikompilasi.
- Smoke test HTTP `/login`, `/register`, `/owner`, `/kasir`, `/baker`, `/daily-worker`, `/owner/persetujuan`: seluruhnya 200 dalam mode persiapan. Halaman persetujuan menampilkan status belum diaktifkan. Ini bukan pengujian login database aktif atau perbandingan visual browser.
- Pemeriksaan database hanya `BEGIN READ ONLY` / `SELECT` / `ROLLBACK`: 5 akun awal cocok dengan seed untuk ID, nama, username, role, dan nilai password; tabel pengguna masih 5 kolom. Flag autentikasi database terkonfirmasi tidak aktif.
- Tidak ada migration, db push, DDL, INSERT, UPDATE, DELETE, penetapan password, atau aktivasi akun yang dijalankan pada database asli. Script penetapan password tidak dijalankan.
