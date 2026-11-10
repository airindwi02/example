# Checklist Modul 4 sebelum deployment

Status pemeriksaan: 10 November 2026. Deployment tidak termasuk dalam tahap ini.

## Acuan

- Laporan dan rancangan Modul 0 sampai Modul 3.
- Instruksi kerja Modul 4 dan materi `m4-prakt-apsi-2026.pdf`.
- ERD/SQL pada `database.sql`, schema Prisma, permission berdasarkan role, dan antarmuka yang sudah ada.

## Hasil yang sudah lulus

- PostgreSQL lokal `apsi_db` dibaca dalam transaksi read-only: 15 tabel, 155 baris, dan relasi sumber tetap tersedia.
- Sembilan akun lokal tetap tersedia: empat ACTIVE (Owner, Kasir, Baker, Daily Worker) dan lima PENDING. Empat akun ACTIVE memakai format Argon2id.
- Neon yang dikonfigurasi adalah database `neondb`, schema `public`. Kolom autentikasi, harga jual, dan pembayaran sudah tersedia.
- Lint, TypeScript, dan build Production lulus. Build menghasilkan 35 route dan Proxy untuk kontrol akses.
- Unit test autentikasi, session, role, Owner order, Daily Worker, Baker/Barista, Kasir, serta pembayaran lulus.
- Pengujian PostgreSQL dan browser terisolasi lulus untuk Sign Up, persetujuan, login/logout, route guard, Master Data Owner, pesanan, penerimaan, pemeriksaan, penyesuaian, produksi, stok, katalog, riwayat, dan tampilan mobile.
- Pembayaran Tunai terisolasi lulus untuk pemeriksaan harga/stok, stok tidak cukup, harga berubah, rollback, idempotency, pajak 0%, biaya layanan Rp0, total dan kembalian. QRIS dan Debit ditolak.
- Redis dan pembatas percobaan login sudah dihapus dari implementasi sesuai keputusan pengembangan saat ini. Login tetap memakai validasi akun, Argon2id, status, role, dan session terenkripsi.
- Smoke test langsung pada localhost lulus untuk empat akun ACTIVE: Owner, Kasir, Baker/Barista, dan Daily Worker. Password benar/salah diverifikasi tanpa mencetak password maupun hash; session HttpOnly, redirect dashboard, dan penolakan akses lintas role juga lulus.
- Aset publik yang berada di folder bernama sama dengan role tidak lagi tertangkap Proxy. Pemeriksaan `/owner/dashboard-art.png` menghasilkan HTTP 200 tanpa membuka halaman Owner kepada pengguna tanpa session.
- Pemeriksaan terbaru: test autentikasi 20/20, test logika role dan pembayaran 20/20, ESLint, TypeScript, dan build Production lokal semuanya lulus.
- Tidak ada CSS atau komponen desain yang diubah pada tahap ini.

## Pemblokir sebelum deployment

1. Neon belum berisi data bisnis ALANA: tabel `barang`, `transaksi`, dan `detail_transaksi` masih kosong.
2. Neon hanya memiliki lima akun PENDING dengan hash lama/non-Argon2id. Karena itu belum ada akun Neon yang bisa login.
3. Migrasi 155 baris dari localhost ke Neon belum dijalankan. ID, foreign key, riwayat, dan sequence harus dipertahankan serta diverifikasi setelah restore/migrasi.
4. Password yang sempat dibagikan melalui percakapan tergolong lemah/terekspos. Password lokal tidak diubah pada tahap ini, tetapi wajib diganti secara aman sebelum Production tanpa mencatat nilai barunya di terminal atau source code.
5. Kesesuaian visual akhir dengan Figma perlu diperiksa berdampingan oleh pemilik desain. Pengujian saat ini memastikan route, interaksi, role, responsif, dan tidak ada perubahan CSS dalam tahap ini.
6. Tanpa pembatas percobaan login, Production lebih rentan terhadap brute-force. Perlindungan ini perlu ditinjau kembali sebelum deployment publik.

## Urutan eksekusi berikutnya setelah persetujuan database

1. Buat backup baru `apsi_db` dan Neon, verifikasi daftar isi serta restore keduanya ke database sementara.
2. Migrasikan seluruh 155 baris dari `apsi_db` ke Neon dalam urutan foreign key yang benar atau melalui restore terkontrol.
3. Verifikasi jumlah baris per tabel, fingerprint data, foreign key, constraint, dan tidak adanya orphan.
4. Pastikan empat akun ACTIVE tetap memiliki ID, username, role, status, dan hash Argon2id yang sama; lima akun PENDING tetap PENDING.
5. Jalankan aplikasi lokal terhadap Neon dan lakukan smoke test login Owner, Kasir, Baker, serta Daily Worker dengan password dimasukkan langsung oleh pemilik akun.
6. Uji seluruh menu terhadap Neon, termasuk perubahan stok lintas role dan transaksi Tunai.
7. Tinjau kembali perlindungan brute-force sebelum aplikasi dibuka ke internet.
8. Setelah semua pemeriksaan lulus, barulah commit/push dan deployment dapat dipertimbangkan.

Tidak ada langkah dalam dokumen ini yang menjalankan `prisma db push`, `migrate reset`, seed, migrasi data, atau deployment secara otomatis.
