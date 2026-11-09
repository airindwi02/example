# Integrasi PostgreSQL Baker/Barista

Tanggal verifikasi: 9 November 2026.

## Fitur yang terhubung

| Fitur | Sumber dan perilaku |
| --- | --- |
| Dashboard | Barang dengan `jenis_barang = Bahan Baku` dan `Produk Hasil`, stok, jumlah pemakaian/produksi per tanggal, serta riwayat berasal dari Prisma. Tidak ada angka operasional dummy. |
| Cari Stok Bahan | Membaca `barang`, stok saat ini, satuan, batas minimum, kategori, pemasok penerimaan, dan tanggal batch historis. Pencarian/filter memakai data hasil pembacaan database. |
| Perbarui Data | Memuat ulang data server. Perubahan penerimaan Daily Worker terlihat tanpa membuat restok simulasi. Refresh browser juga membaca PostgreSQL kembali. |
| Pemakaian Bahan | Memilih produk hasil, bahan, batch penerimaan, dan jumlah aktual. Server menyimpan `barang_dipakai` beserta `detail_barang_dipakai`, mengurangi stok bahan, dan mencatat hasil produksi dalam satu transaksi Prisma. |
| Hasil produksi | Schema sudah memiliki `id_produk_hasil`, `jumlah_hasil`, `status_produksi`, dan `alasan_gagal`. Produksi selesai menambah stok produk sebesar hasil aktual. Produksi gagal memakai hasil nol dan alasan wajib; bahan yang benar-benar terpakai tetap dicatat/dikurangi. |
| Riwayat | Tanggal, produk, hasil beserta satuan, bahan/jumlah/batch, status, alasan gagal, dan nama pencatat berasal dari database. Tidak dibuat jam aktivitas fiktif karena schema hanya menyimpan tanggal. |
| Pencarian global dan notifikasi | Memakai bahan/produk asli serta kondisi stok terhadap stok minimum. Riwayat kata pencarian dan tanda baca notifikasi tetap merupakan state antarmuka sementara. |

`initialMaterials`, resep dummy, target dummy, riwayat awal dummy, dan tombol simulasi restok telah dihapus dari implementasi Baker. State React menyimpan cache respons server serta input form, bukan sumber stok operasional.

## Keamanan dan integritas

- Helper server memeriksa sesi autentikasi yang sudah ada. Hanya akun Baker atau Barista ACTIVE dapat membaca modul dan menjalankan penyimpanan.
- Transaksi memeriksa ulang role, status, dan kredensial akun sebelum perubahan. ID pencatat diambil dari sesi.
- Input divalidasi di server: ID, produk/bahan yang benar, kesesuaian satuan, batch, kondisi batch, kedaluwarsa, jumlah positif dengan maksimal dua desimal, hasil produksi, alasan gagal, dan kapasitas kolom desimal.
- Batch wajib sesuai bahan, berkondisi `Baik`, belum kedaluwarsa, dan memiliki batas penerimaan yang belum tercatat dipakai. Tidak ada batch fiktif atau relasi resep buatan.
- Jumlah beberapa batch untuk bahan yang sama dijumlahkan sebelum memeriksa stok barang. Stok diperiksa ulang setelah row lock, menggunakan `Prisma.Decimal`.
- Baris stok bahan dan produk dikunci dalam urutan ID yang konsisten. Perubahan Daily Worker menggunakan baris stok yang sama, sehingga tidak ada lost update pada alur yang diuji.
- ID permintaan disimpan sebagai primary key `id_pemakaian`. Advisory lock dan pemeriksaan isi riwayat membuat pengulangan permintaan identik tidak menyimpan/mengurangi stok lagi. Pemakaian ulang ID dengan isi berbeda ditolak.
- Form dikunci selama penyimpanan. Token tetap untuk pengulangan permintaan; token baru dibuat ketika pengguna memulai pencatatan berikutnya.
- Kegagalan transaksi membatalkan header, detail, pengurangan bahan, serta penambahan produk sekaligus. Tidak ada pesan sukses hanya berdasarkan perubahan state lokal.
- Setelah berhasil, jalur Baker, Daily Worker, dan Master Data Owner direvalidasi. Tidak ada perubahan kode autentikasi atau modul lain.

## Kemampuan dan batasan schema

1. **Produksi dasar didukung.** Produk hasil harus sudah tersedia di tabel `barang`. Pemakaian tidak dapat disimpan sebagai pemakaian tanpa produk, karena foreign key `id_produk_hasil` wajib terisi.
2. **Resep/BOM, target produksi, dan harga produk tidak tersedia sebagai struktur khusus.** Tidak ada resep otomatis, perhitungan kebutuhan berdasarkan resep, target hardcoded, atau harga rekaan. Pengguna memasukkan pemakaian dan hasil nyata.
3. **Batch penerimaan wajib.** Stok barang tanpa batch penerimaan yang sah tidak dialokasikan secara fiktif; pengguna harus memeriksa asal penerimaannya.
4. **Batas riwayat batch bukan saldo fisik lengkap.** Nilainya adalah jumlah diterima dikurangi pemakaian terkait yang tercatat. Penyesuaian stok umum dan penjualan tidak seluruhnya memiliki relasi batch. Server memeriksa kedua batas: riwayat penerimaan batch dan stok barang terkini. UI menjelaskan batasan ini, bukan menyatakan saldo batch sebagai inventaris fisik terverifikasi.
5. **Jam dan urutan kejadian dalam tanggal yang sama tidak tersedia.** Riwayat diurutkan berdasarkan tanggal lalu ID; tidak mengklaim urutan jam produksi. Tidak ada schema/tabel/kolom baru yang dibuat.

## Hasil pengujian terisolasi

Harness membuat container PostgreSQL 17 Alpine dengan database, port loopback, dan kredensial sementara terpisah dari database asli. Struktur fixture berasal dari SQL tabel yang sudah ada; seluruh data pengujian adalah data sintetis. URL database asli tidak digunakan untuk penulisan. Server pengujian, browser, dan container dibersihkan setelah selesai.

| Pengujian | Hasil |
| --- | --- |
| Unit test Baker | 5 lulus: batas jumlah, produksi gagal, payload/duplikasi batch, penolakan sebelum transaksi, kondisi stok tanpa ID khusus. |
| Unit test autentikasi | 19 lulus. |
| Unit test Daily Worker | 3 lulus. |
| Pemakaian dan hasil produksi | Lulus: header/detail tersimpan, stok bahan berkurang tepat, stok produk bertambah tepat. |
| Stok kurang/negatif | Ditolak tanpa perubahan riwayat atau stok. |
| Klik berulang dan replay | Lulus: hanya satu pemakaian/pengurangan stok untuk permintaan yang sama; perubahan payload ditolak. |
| Dua pemakaian bersamaan | Lulus: hanya permintaan yang masih memiliki stok mencukupi diterima. |
| Validasi batch | Batch salah barang, rusak, kedaluwarsa, tidak ditemukan, dan jumlah melebihi batas riwayat ditolak. |
| Beberapa bahan/batch | Lulus, termasuk agregasi jumlah satu bahan dari beberapa batch. |
| Produksi gagal | Lulus: hasil nol, alasan wajib, stok produk tidak bertambah. |
| Rollback/overflow | Lulus: kegagalan yang dipaksakan sebelum commit membatalkan seluruh perubahan; kapasitas stok produk diperiksa. |
| Konsistensi Owner/Daily Worker | Pembacaan ketiga modul menunjukkan stok barang yang sama. Penerimaan Daily Worker terlihat di Baker setelah Perbarui Data. |
| Konflik dengan Daily Worker | Lulus: transaksi pemakaian berjalan dengan stok terkunci; penyesuaian dengan snapshot lama ditolak bila stok telah berubah. |
| Otorisasi | Baker dan Barista ACTIVE diterima; Owner, Kasir, Daily Worker, Baker PENDING/REJECTED, dan kredensial sesi yang berubah ditolak. |
| Persistensi | Stok dan riwayat tetap tersedia setelah refresh browser dan restart server pengujian. |
| Regresi CRUD Owner | Harness database/browser Master Data Owner lulus. |
| Regresi Daily Worker | Harness database/browser Daily Worker lulus. |
| Lint | Lulus. |
| Production build | Lulus. |

Driver PostgreSQL masih mengeluarkan peringatan deprecation nonfatal saat transaksi Prisma pada harness integrasi. Seluruh assertion dan pemeriksaan rollback berhasil. Dependency tidak diganti pada tahap ini.

## Browser dan tampilan

Chrome lokal melalui Playwright menguji login, pencarian bahan, kondisi tanpa hasil, detail stok, validasi server, penyimpanan pemakaian, klik Simpan berulang, riwayat, pembaruan setelah penerimaan Daily Worker, pencarian global, notifikasi, serta Logout dan akses tanpa sesi/antar-role.

Klik sidebar Dashboard, Cari Stok Bahan, Pemakaian Bahan, dan Tentang Alana berhasil. Menu mobile juga dibuka dan digunakan. Screenshot desktop 1440×1000 dan mobile 390×844 tersedia lokal di `.baker-db-qa/`, termasuk formulir beberapa bahan. Tidak ditemukan overflow halaman atau error JavaScript pada pengujian akhir; tabel lebar bergulir dalam kontainernya.

Sidebar, palet cokelat-krem, kartu, ilustrasi, modal Logout, dan struktur panel lama dipertahankan. Angka dummy diganti data asli. Isian bahan/batch/status mengikuti field database dalam gaya komponen yang sama. Tidak mengklaim identik piksel dengan resep/target/jam contoh Figma yang tidak memiliki sumber database.

## File dibuat/diubah pada tahap ini

- `lib/baker-types.ts`: DTO pembacaan, perintah penyimpanan, dan hasil.
- `lib/baker-service.ts`: pembacaan Prisma, validasi, transaksi, locking, serta idempotensi.
- `lib/baker-data.ts`: otorisasi/pemuatan data server.
- `app/baker/actions.ts`: Server Action penyimpanan dan revalidasi.
- `app/baker/layout.tsx`: memasok data server ke komponen Baker tanpa fallback dummy.
- `app/baker/BakerClient.tsx`: dashboard, stok, pencarian, notifikasi, riwayat, serta cache data server.
- `app/baker/UsageForm.tsx`: formulir produk/bahan/batch aktual dan konfirmasi stok.
- `app/baker/data.ts`: tipe dan helper tampilan; menghapus seed operasional.
- `app/baker/baker.css`: gaya field pilihan bahan/batch sesuai panel yang sudah ada.
- `tests/baker.test.cjs`, `scripts/test-baker-db.cjs`: unit test dan integrasi/browser terisolasi.
- `package.json`: perintah tes Baker.
- `.gitignore`: mengecualikan screenshot pengujian.
- `BAKER-DATABASE-REPORT.md`: laporan ini.

## Verifikasi database asli dan penggunaan

Pemeriksaan database asli hanya memakai query baca dalam transaksi `READ ONLY`. Pada pemeriksaan terakhir terdapat 15 tabel, 9 akun, 10 barang, 5 penerimaan, 2 pemeriksaan, dan 8 pemakaian—sesuai baseline. Ada 8 batch bahan berkondisi Baik yang tidak melewati tanggal kedaluwarsa/bertanggal kosong; saldo riwayat dan stok tetap diperiksa kembali saat pengguna menyimpan.

Checksum `prisma/schema.prisma` tetap sama. Tidak ada INSERT, UPDATE, DELETE, migrasi, db push, perubahan akun, atau perubahan stok/transaksi yang dijalankan terhadap database asli oleh pekerjaan ini. Login, Sign Up, dan sesi tidak diubah.

Untuk memakai fitur, login dengan akun Baker/Barista ACTIVE, buka Pemakaian Bahan, pilih produk hasil, pilih bahan dan batch, isi jumlah pemakaian serta hasil/status produksi, lalu Simpan. Tombol Simpan menjalankan transaksi nyata pada database yang dikonfigurasi aplikasi; membuka halaman atau Perbarui Data tidak menulis data.

```powershell
npm.cmd run test:baker
npm.cmd run test:baker:isolated
npm.cmd run test:auth
npm.cmd run test:worker
npm.cmd run lint
npm.cmd run build
```

Harness terisolasi memerlukan Docker dan Chrome lokal, tanpa perubahan `.env`. Jalankan harness browser secara bergantian karena direktori build pengujian dipakai bersama.

Pekerjaan berhenti pada Baker/Barista. Integrasi Kasir belum dikerjakan.
