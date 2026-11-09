# Integrasi Kasir: pembacaan database aktif, pembayaran belum dapat diaktifkan

Tanggal: 9 November 2026.

## Kesimpulan

Produk, stok, dashboard, pencarian, notifikasi stok, dan riwayat Kasir kini membaca PostgreSQL melalui Prisma. Keranjang menggunakan state sementara tanpa membuat transaksi atau memotong stok. Sumber produk/transaksi dummy dan penyimpanan penjualan palsu pada reducer dihapus.

**Penyimpanan penjualan dan pembayaran sengaja tetap nonaktif.** Schema tidak menyediakan sumber harga jual terkini yang otoritatif maupun field pembayaran. Ketentuan tugas melarang penggunaan harga dummy, asumsi aturan bisnis, atau perubahan schema otomatis.

## Bukti struktur dan hambatan

Pemeriksaan `prisma/schema.prisma`, kode, SQL project, dan kolom PostgreSQL asli melalui transaksi `READ ONLY` menunjukkan:

- `barang` memiliki ID, nama, jenis, satuan, stok minimum, dan stok saat ini. **Tidak ada harga jual**.
- `detail_transaksi.harga` menyimpan harga pada transaksi historis. Tidak ditemukan aturan bisnis terverifikasi yang menjadikannya harga resmi transaksi berikutnya. Harga transaksi terakhir tidak dipakai sebagai harga jual baru.
- `detail_pesanan.harga_pesan` merupakan harga pemesanan pembelian, bukan sumber harga jual yang telah disetujui.
- `transaksi` hanya memiliki ID, pengguna, tanggal, status, dan alasan gagal. Tidak ada metode pembayaran, uang diterima, kembalian, pajak, atau biaya layanan.
- `detail_transaksi.id_barang` sudah mempunyai foreign key ke `barang`. Relasi ini mendukung referensi stok produk yang sama, tetapi tidak menyediakan aturan harga atau relasi resep. Katalog Kasir dibatasi pada jenis `Produk Hasil`, bukan semua barang persediaan.

Tidak ada schema, tabel, database aplikasi baru, migrasi, atau db push yang dibuat/dijalankan.

## Fitur yang berhasil dihubungkan

| Fitur | Hasil |
| --- | --- |
| Produk siap jual | `readKasir()` membaca `barang` dengan `jenis_barang = Produk Hasil`; nama, ID, satuan, minimum, dan stok asli. Harga katalog `null`, ditampilkan Belum tersedia. |
| Dashboard | Jumlah produk tersedia, stok rendah, serta jumlah item terjual dari transaksi Berhasil/Selesai pada tanggal Jakarta saat ini. Data gagal tidak dihitung sebagai penjualan berhasil. |
| Pencarian/filter | Memakai produk serta riwayat database. Kategori berasal dari jenis barang yang tersedia, bukan kategori contoh rekaan. |
| Keranjang | Tambah, tambah/kurangi jumlah, hapus, validasi bilangan bulat dan stok yang tampil. Keranjang tidak menulis database dan dapat hilang setelah full refresh. |
| Subtotal/total pesanan | Tetap tidak diketahui ketika harga resmi belum tersedia. Tidak menampilkan pesanan tanpa harga sebagai transaksi gratis/Rp0. |
| Perbarui Data | Meminta pembacaan server baru; perubahan stok eksternal terlihat di katalog Kasir. |
| Riwayat | `transaksi` dan `detail_transaksi` beserta barang/pengguna terkait. Tanggal, nomor, item, jumlah, harga historis, status, alasan gagal, dan pencatat asli ditampilkan. |
| Total historis | Total item dihitung dengan Decimal presisi 40 dari harga historis × jumlah terjual. Nilai serialisasi berupa string, tanpa memakai harga katalog atau pembulatan uang implisit. Ini total item, bukan klaim total pembayaran/pajak. |
| Filter riwayat | Hari Ini, 7 Hari, Bulan Ini, Semua, dan pencarian nomor/nama barang; memakai tanggal terkini, bukan Oktober 2026 hardcoded. |
| Detail dan cetak | Tombol Cetak Struk menggunakan data transaksi yang dipilih. Cetakan ditandai sebagai ringkasan transaksi historis dengan status; metadata pembayaran yang tidak tersimpan ditulis Tidak tercatat. |
| Sesi dan role | `requireKasir()` memakai sesi yang sudah tersedia dan hanya menerima Kasir ACTIVE. Auth/Sign Up/Login/Logout tidak diubah. |
| Notifikasi | Berdasarkan stok produk asli terhadap minimum. Tidak ada waktu notifikasi fiktif. Status dibaca dan riwayat kata pencarian tetap state UI sementara. |

Nama/satuan barang historis mengikuti relasi barang yang tersedia sekarang; schema tidak menyimpan snapshot nama/satuan sebelum perubahan Master Data. Jam transaksi tidak direka karena kolom tanggal bertipe date.

## Pembayaran dan stok

Tombol penyelesaian serta isian pembayaran dinonaktifkan dengan alasan yang terlihat. `checkoutKasirAction()` memeriksa sesi, sedangkan `checkoutKasir()` memeriksa ulang akun, role, status, dan kredensial sebelum menolak pembayaran. Fungsi tersebut tidak memiliki cabang INSERT/UPDATE/DELETE atau pemotongan stok.

Mengubah tombol, harga, atau total di browser tidak mengaktifkan pembayaran server. Pengulangan permintaan tetap ditolak dan tidak menghasilkan transaksi ganda. **Ini penolakan menyeluruh selama fitur belum siap, bukan implementasi idempotensi pembayaran aktif.**

Konsistensi stok dibuktikan dengan pembacaan produk yang sama melalui Kasir, Owner, Daily Worker, dan Baker. Tidak ada stok bahan baku atau produk yang dikurangi oleh keranjang/pembayaran Kasir saat ini.

Agar penjualan baru dapat diaktifkan, masih diperlukan keputusan dan persetujuan terpisah untuk sumber harga jual resmi, aturan perhitungan pembayaran/pajak, serta tempat penyimpanan metadata pembayaran. Sesudah kontrak itu tersedia, transaksi atomik, penguncian stok produk, validasi harga server, idempotensi, dan rollback pembayaran perlu diimplementasikan serta diuji. Tidak ada rancangan schema yang diterapkan otomatis pada tahap ini.

## Hasil pengujian

Semua penulisan fixture hanya dilakukan pada container PostgreSQL 17 Alpine sementara yang dibuat harness, dengan port dan kredensial terpisah. Harness tidak memakai URL database asli untuk penulisan. Resource pengujian dibersihkan setelah selesai.

| Pengujian | Hasil |
| --- | --- |
| Unit Kasir | 5 lulus: edit keranjang, jumlah tidak valid/stok kurang, harga tidak tersedia, format uang besar, penolakan checkout/replay dan otorisasi. |
| Unit autentikasi | 19 lulus. |
| Unit Daily Worker | 3 lulus. |
| Unit Baker | 5 lulus. |
| Pembacaan produk | Lulus; Bahan Baku tidak masuk katalog produk. |
| Harga/riwayat | Lulus; harga katalog tidak diambil dari sejarah, detail dan total historis berasal dari transaksi asli fixture. |
| Keranjang browser | Lulus: tambah, tambah/kurangi jumlah, hapus, dan penolakan jumlah melebihi stok. |
| Checkout | Lulus untuk penolakan aman: harga/total palsu, permintaan berulang, role lain; jumlah transaksi dan stok tetap. |
| Konsistensi antar-role | Lulus; produk yang sama memiliki stok yang sama pada pembacaan keempat modul. |
| Refresh stok | Lulus; perubahan stok di database pengujian muncul setelah Perbarui Data. |
| Riwayat dan restart | Lulus; transaksi tetap muncul setelah refresh browser dan restart Next.js pengujian. |
| Cetak | Lulus; tombol memanggil `window.print`, mode print menampilkan nomor dan isi transaksi yang dipilih. Tidak menguji printer fisik. |
| Keamanan browser | Lulus: akses tanpa Login, akses Kasir ke Owner, akses Baker ke Kasir, dan Logout. |
| Desktop/mobile | Lulus pada 1440×1000 dan 390×844; semua tautan sidebar serta menu mobile berfungsi, tidak ada overflow halaman atau error JavaScript. |
| Regresi Owner | Harness database dan browser Master Data Owner lulus. |
| Regresi Daily Worker | Harness database dan browser Daily Worker lulus. |
| Regresi Baker/Barista | Harness database dan browser Baker lulus. |
| Lint | Lulus. |
| Build | Lulus. |

**Belum diuji/dinyatakan berhasil:** pembayaran sukses, penyimpanan transaksi baru beserta detail, pengurangan stok oleh pembayaran, konflik dua pembayaran sukses, dan rollback pembayaran aktif. Fitur-fitur ini belum diaktifkan karena hambatan harga/metadata di atas. Tidak ada transaksi dummy yang dibuat sebagai pengganti pada aplikasi.

Regresi modul terdahulu masih menampilkan peringatan deprecation driver pg yang sudah ada sebelumnya; seluruh assertion pengujian tersebut lulus.

## File dibuat/diubah

- `lib/kasir-service.ts`: pembacaan database, perhitungan historis Decimal, guard checkout yang menolak tanpa menulis.
- `lib/kasir-data.ts`: sesi/otorisasi dan pemuatan data Kasir server.
- `lib/kasir-cart.ts`: aturan keranjang sementara dan total yang membedakan harga tidak diketahui dari nol.
- `app/kasir/actions.ts`: boundary server checkout yang tetap tertutup.
- `app/kasir/layout.tsx`: data server ke provider tanpa fallback dummy.
- `app/kasir/data.ts`: DTO/helper; menghapus produk, harga, transaksi, tanggal/jam dummy.
- `app/kasir/KasirState.tsx`: state input keranjang/UI; menghapus simulasi penyimpanan dan pengurangan stok.
- `app/kasir/KasirSales.tsx`: produk aktual, keranjang, pembaruan data, dan penjelasan pembayaran nonaktif.
- `app/kasir/KasirDashboard.tsx`, `KasirHistory.tsx`, `KasirSearch.tsx`, `KasirShell.tsx`: data asli, filter tanggal, cetak, profil, dan notifikasi.
- `tests/kasir.test.cjs`, `scripts/test-kasir-db.cjs`: unit test dan pengujian terisolasi/browser.
- `package.json`, `.gitignore`: perintah pengujian dan pengecualian screenshot.
- `KASIR-DATABASE-REPORT.md`: laporan ini.

Struktur sidebar, palet, gambar, panel, tabel, dan modal Logout Kasir dipertahankan. Konten simulasi pembayaran berhasil dihapus, bukan dipertahankan sebagai keberhasilan palsu. Screenshot lokal di `.kasir-db-qa/` diabaikan Git. Tidak ada halaman baru atau perubahan desain stylesheet.

## Database asli dan langkah berikutnya

Database asli hanya diperiksa melalui SELECT dalam transaksi `READ ONLY`. Baseline terverifikasi: 9 akun dan 11 transaksi (8 Berhasil, 3 Gagal). Checksum schema Prisma sama dengan sebelum tahap ini. Tidak ada perubahan akun, stok, transaksi, struktur, konfigurasi autentikasi, atau kredensial database asli yang dilakukan oleh pekerjaan ini.

```powershell
npm.cmd run test:kasir
npm.cmd run test:kasir:isolated
npm.cmd run lint
npm.cmd run build
```

Harness terisolasi memerlukan Docker dan Chrome lokal. Tidak perlu mengubah `.env`; jalankan harness browser secara bergantian karena direktori build pengujiannya digunakan bersama.

Pekerjaan berhenti pada Kasir dengan batasan pembayaran yang dinyatakan di atas. Laporan Owner belum dikerjakan.
