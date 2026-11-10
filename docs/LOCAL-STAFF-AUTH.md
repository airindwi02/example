# Sign Up dan Sign In staf pada localhost

## Cara kerja

Mode ini tidak membutuhkan penetapan password Owner. Staf membuat password sendiri pada /register; server memvalidasi input dan username unik, menghasilkan Argon2id, serta menyimpan akun baru ACTIVE melalui Prisma. Setelah diarahkan ke /login, akun tersebut dapat masuk ke dashboard sesuai role database. Tidak ada perubahan terhadap lima akun awal, termasuk Owner yang tetap PENDING.

Role langsung dibatasi Daily Worker, Kasir, Baker, dan Barista. Kartu Owner tetap tampil mengikuti desain tetapi nonaktif pada Sign Up lokal; server juga menolak permintaan Owner yang dimanipulasi. Kartu Baker/Barista menyediakan pilihan peran produksi pada pendaftaran lokal. Login menggunakan kartu gabungan untuk kedua peran produksi, dengan tujuan /baker.

Mode ACTIVE otomatis membutuhkan seluruh kondisi berikut: flag Login aktif, flag Sign Up aktif, ALANA_LOCAL_STAFF_SIGNUP=enabled, NODE_ENV=development, Host loopback, dan Origin cocok dengan Host. Hanya flag client tidak cukup. Jika flag lokal terbawa ke production, Server Action menolak pendaftaran; repository juga menolak membuat akun ACTIVE lokal. Jalankan server hanya pada 127.0.0.1. Pendaftaran produksi tidak mendapat akses langsung ini.

## Aktivasi lokal

Pengujian dilakukan pada database Docker terpisah. Konfigurasi .env asli belum diubah dan mode baru belum diaktifkan pada server utama. Untuk mencoba menggunakan PostgreSQL project yang sudah memiliki schema terbaru, hentikan server dev lama (Ctrl+C), lalu jalankan berikut pada terminal PowerShell lokal dari E:\example:

```powershell
$env:ALANA_DATABASE_AUTH = 'enabled'
$env:ALANA_SIGNUP = 'enabled'
$env:ALANA_LOCAL_STAFF_SIGNUP = 'enabled'
$env:ALANA_APPROVALS = ''
$env:ALANA_SESSION_SECRET = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
npm run dev -- --hostname 127.0.0.1
```

Secret sesi hanya dibuat di memori proses; jangan mencetaknya. DATABASE_URL tetap memakai konfigurasi server project yang sudah tersedia, tidak perlu disalin ke chat atau argumen. Buka http://127.0.0.1:3000/register, pilih staf, isi formulir, lalu Sign Up. Akun baru benar-benar disimpan pada database yang dikonfigurasi setelah Anda menyalakan mode ini dan menekan Sign Up. Tidak ada akun contoh yang otomatis ditambahkan saat startup.

Setelah pendaftaran berhasil, gunakan username/password yang Anda buat pada /login dan pilih role yang sama. Owner lama tetap tidak dapat Login sampai password/statusnya disiapkan melalui prosedur khusus. Jangan memakai akun seed untuk alur ini. Tidak perlu menjalankan SET OWNER PASSWORD untuk akun yang dibuat melalui Sign Up.

Jangan memakai `npm run build`/`npm start` untuk mode ACTIVE otomatis ini: production sengaja menolaknya. Gunakan terminal khusus sesi lokal; tutup terminal setelah selesai agar flag sementara tidak terbawa. Mengganti secret sesi saat restart akan membatalkan cookie sesi lama. Session HttpOnly, pemeriksaan status/role server, guard dashboard, dan Logout tetap berlaku. Implementasi pembatas percobaan login sudah dihapus; risiko brute-force harus ditinjau kembali sebelum deployment publik.

## Pengujian

`node scripts/test-local-auth-browser.cjs` membuat PostgreSQL 17 Alpine baru tanpa mount/URL sumber, membangun 15 tabel referensi dan lima akun sintetis, lalu menjalankan Next dev pada port loopback acak dengan direktori output terpisah. Playwright Chrome benar-benar mengklik UI; password acak hanya ada di memori. Tidak ada screenshot, trace, video, atau log kredensial yang disimpan. Server uji, container, dan anonymous volume dibersihkan setelah tes.

Kasus: akses tanpa Login, Sign Up Kasir, persistensi ACTIVE/kontak/Argon2id, username duplikat, manipulasi Owner, pendaftaran Barista, password salah, pilihan role salah, Login ke Kasir, refresh, penolakan dashboard Owner, Logout, dan akses setelah Logout. Lima akun awal sintetis dibandingkan persis sebelum/sesudah dan tetap PENDING. Unit test memeriksa guard development/production dan loopback/origin. Ini tidak menulis database asli.

Hasil akhir: tes browser nyata lulus, `npm run test:auth` 17/17 lulus, lint lulus, dan build lulus (34 halaman). Pemeriksaan read-only pada sumber mengonfirmasi lima akun lama cocok dengan referensi untuk ID/nama/username/password seed/role, seluruhnya PENDING. Flag sumber Login dan mode lokal belum diaktifkan. Prisma schema, data stok, transaksi, serta lima akun lama tidak diubah dalam pekerjaan ini.

File implementasi: lib/auth-config.ts, lib/auth-local.ts, lib/auth-policy.ts, lib/auth-repository.ts, app/_auth/actions.ts, AuthMode.tsx, AuthForm.tsx, dan app/layout.tsx. Dukungan pengujian: scripts/test-local-auth-browser.cjs, tests/auth.test.cjs, next.config.ts (output pengujian terpisah), .gitignore, eslint.config.mjs, serta dependensi Playwright pada package.json/lockfile.
