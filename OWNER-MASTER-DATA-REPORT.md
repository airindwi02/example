# CRUD Master Data Owner — hasil implementasi

## Lingkup

Halaman `/owner/master-data` sekarang membaca `barang` dan `pemasok` melalui Prisma/PostgreSQL, bukan OwnerState atau array contoh. Layout, kelas CSS, warna, tabel, panel tambah/ubah/hapus, pencarian, pagination, serta komponen pesan tetap memakai halaman yang ada. Data dan jenis barang mengikuti database; bukan kategori contoh lama.

Login, Sign Up, sesi, schema Prisma, serta modul Kasir/Baker/Daily Worker tidak diubah. Ringkasan dashboard/laporan Owner di luar Master Data belum diintegrasikan pada tahap ini. OwnerSectionLayout hanya mendapat `unoptimized` pada logo: optimizer Next tidak meneruskan cookie ke aset yang dilindungi, sehingga pemuatan langsung browser diperlukan agar logo tetap terlihat. Tidak ada perubahan pengaman autentikasi.

## Hasil fitur

| Fitur | Hasil |
| --- | --- |
| Barang CREATE | ID acak 10 karakter, metadata tervalidasi, stok awal 0 |
| Barang READ | Query barang aktual, Decimal dikonversi ke DTO tampilan |
| Barang UPDATE | Nama, jenis, satuan, batas minimum; stok tidak termasuk whitelist update |
| Barang DELETE | Konfirmasi UI, lock baris, stok harus 0 dan seluruh 7 relasi harus tidak digunakan; FK tetap menjadi pengaman akhir |
| Pemasok CREATE/READ/UPDATE | id_pemasok, nama_pemasok, telepon, alamat sesuai model |
| Pemasok DELETE | Ditolak jika digunakan pada pemesanan/penerimaan; tidak menghapus anak secara cascade |
| Batas minimum | Memakai stok_minimum pada barang dengan validasi Decimal(10,2) |
| Satuan | Daftar distinct barang.satuan; tidak ada tabel/model satuan tersendiri |
| Pesan | Berhasil hanya setelah transaksi selesai; kesalahan validasi/relasi/akses ditampilkan melalui panel yang ada |

Tidak ada CRUD satuan palsu. Tombol tambah/ubah/hapus pada tab Satuan dinonaktifkan dan diberi penjelasan; satuan baru/ubah dimasukkan melalui formulir barang (maksimal 10 karakter).

Model barang tidak memiliki kolom id_pemasok/default supplier. Pemasok barang dan "Bahan Dipasok" diturunkan dari relasi riwayat barang_masuk/detail_barang_masuk, sehingga hanya ditampilkan, bukan ditulis ke kolom yang tidak ada. Form pemasok menyimpan **Alamat**, bukan menganggap "Bahan Dipasok" sebagai kolom database. Dimensi/layout form tetap memakai komponen lama. Tidak ada schema/tabel/relasi baru.

## Otorisasi dan transaksi

SSR pembacaan dan setiap Server Action memerlukan authenticatedAccount dengan Owner ACTIVE. Tidak ada fallback dummy atau izin karena preview/development. Transaksi perubahan memeriksa ulang pengguna, role, status, dan hash kredensial yang terkait sesi; row lock menjaga pemeriksaan dari perubahan otorisasi bersamaan. Staf tidak dapat mengirim actorId untuk mengaku Owner.

Nama duplikat diperiksa case-insensitive pada jalur aplikasi dengan advisory lock bersama. Validasi panjang mengikuti schema; batas minimum wajib nonnegatif, maksimal 99999999.99, dua desimal dengan titik. Payload yang mencoba menyertakan stock/stok_saat_ini pada barang ditolak. Delete memakai FOR UPDATE dan pemeriksaan penggunaan relasi; tidak ada penghapusan stok, transaksi, atau riwayat agar master bisa dihapus.

## File

Baru:

- `lib/owner-master-types.ts`: kontrak DTO dan input/result.
- `lib/owner-master-service.ts`: query dan operasi CRUD, validasi, pemeriksaan akses transaksi, relasi/stock deletion guard.
- `lib/owner-master.ts`: pengaman Owner dan pemuatan data server.
- `app/owner/master-data/actions.ts`: Server Actions.
- `scripts/test-owner-master.cjs`: pengujian PostgreSQL/browser terisolasi.
- Laporan ini.

Diperbarui:

- `app/owner/master-data/page.tsx`: pemuatan server di Suspense, error aman.
- `app/owner/MasterDataClient.tsx`: menghapus mutasi array dummy; memanggil action dan menerima snapshot DB setelah sukses.
- `app/owner/OwnerSectionLayout.tsx`: pemuatan logo langsung browser, ukuran/desain sama.
- `.gitignore`: mengabaikan `.owner-master-qa/`.

## Pengujian

`node --conditions=react-server --import tsx scripts/test-owner-master.cjs` membuat PostgreSQL 17 Alpine sementara, 15 tabel referensi, dan pengguna sintetis. DATABASE_URL test diisi hanya ke container yang dibuat invocation tersebut; tidak ada fallback ke URL sumber. Test membuat fixture stock/relasi dan melakukan seluruh INSERT/UPDATE/DELETE hanya pada database ini. Server uji menggunakan port loopback dan output Next terpisah, serta dibersihkan bersama container setelah tes.

| Pemeriksaan | Hasil |
| --- | --- |
| CRUD lengkap barang dan pemasok melalui service | Lulus |
| CRUD lengkap melalui klik browser | Lulus |
| Refresh penuh mempertahankan perubahan | Lulus |
| Restart server dengan database sama mempertahankan perubahan | Lulus |
| Edit metadata tidak mengubah stok yang sudah ada | Lulus |
| Payload stok, angka negatif/overflow/desimal berlebih, panjang data, nama duplikat | Ditolak |
| Foreign key tidak valid | Ditolak database |
| Hapus barang berstok/berelasi dan pemasok yang digunakan | Ditolak tanpa menghapus riwayat |
| Empat role staf dan Owner PENDING melakukan mutasi | Ditolak backend |
| Akses browser tanpa sesi atau Kasir ke Master Data | Dialihkan oleh guard |
| Mapping pemasok/jenis barang dari relasi nyata | Lulus |
| Satuan read-only | Lulus |
| Desktop 1440px dan mobile 390px | Diperiksa; tidak ada overflow halaman; tabel menggunakan scroll internal |
| Logo Owner dimuat dengan sesi | Lulus |
| Unit test autentikasi regresi | 19/19 lulus |
| npm run lint | Lulus |
| npm run build | Lulus, 34 halaman |

Bukti desktop/mobile sintetis: `.owner-master-qa/desktop.png` dan `mobile.png` (diabaikan Git). Dibandingkan dengan screenshot referensi Owner Master Data Bahan Baku; susunan sidebar/header, toolbar, tabel, serta panel kanan dipertahankan. Data baris berbeda karena sekarang berasal dari DB, bukan menyalin angka screenshot.

## Database asli

Tidak ada pengujian perubahan pada PostgreSQL asli. Pemeriksaan sumber hanya SELECT: 15 tabel, 10 barang, 3 pemasok, 9 pengguna, 11 transaksi. Checksum file schema Prisma sama dengan sebelum pengerjaan. Tidak ada migrasi, db push, reset password, perubahan status akun, atau operasi tulis stok/transaksi dari alat pengujian.

Implementasi backend kini menulis ke database project bila Owner sendiri menekan Simpan/Ya, Hapus pada aplikasi. Selama pekerjaan ini tombol tersebut hanya diuji pada server/database sementara. Untuk pengujian tulis sumber oleh agen masih diperlukan persetujuan pengguna terpisah.

Pekerjaan berhenti pada Master Data Owner; tidak melanjutkan integrasi Daily Worker, Baker/Barista, Kasir, dashboard ringkasan, maupun laporan.
