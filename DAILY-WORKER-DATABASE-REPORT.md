# Integrasi Database Daily Worker

Tanggal verifikasi: 9 November 2026.

## Hasil implementasi

| Fitur | Implementasi PostgreSQL | Batasan |
| --- | --- | --- |
| Dashboard, pencarian, stok | Membaca `barang`, penerimaan, pemeriksaan, pemakaian, dan penjualan melalui Prisma. Stok terkini dan batas minimum berasal dari `barang`. | Tidak ada fallback array dummy. Riwayat hanya memiliki tanggal sesuai schema, bukan jam aktivitas. |
| Penerimaan | Menambah `barang_masuk` dan `detail_barang_masuk`, kemudian menambah `barang.stok_saat_ini` dalam satu transaksi. Pilihan barang, pemasok, dan pesanan berasal dari database. | Wajib memilih pesanan pembelian yang sudah ada karena `id_pemesanan` adalah foreign key wajib. Tidak membuat pesanan fiktif. |
| Pemeriksaan | Menambah `pemeriksaan_stok` dan `detail_pemeriksaan` dengan stok sistem dan hasil hitung fisik. | Selisih pemeriksaan tidak otomatis mengubah stok. |
| Penyesuaian fisik | Menyimpan pemeriksaan dengan `tindak_lanjut = Penyesuaian`, nilai sebelum/sesudah, serta kondisi/alasan singkat pada `kondisi_fisik`; memperbarui stok dalam transaksi yang sama. | Hasil hitung merupakan stok absolut, bukan pengurangan kedua. Catatan bebas dinonaktifkan karena tidak ada kolom penyimpanan. |
| Kedaluwarsa | Membaca tanggal dan jumlah diterima historis dari detail penerimaan. Menampilkan batch serta stok barang terkini. | Tidak tersedia ledger pembuangan, relasi penyesuaian ke batch, atau saldo batch yang lengkap. Pembuangan per batch dinonaktifkan pada UI dan ditolak server. Jumlah diterima historis tidak diubah. |

## Integritas dan otorisasi

- Server Action memeriksa sesi melalui helper autentikasi yang sudah ada. Hanya Daily Worker ACTIVE yang boleh menyimpan.
- Transaksi memeriksa ulang role, status, dan versi kredensial akun. Identitas pencatat berasal dari sesi, bukan input browser.
- Jumlah menggunakan `Prisma.Decimal`, maksimal dua desimal, tanpa nilai negatif, dengan batas kapasitas `numeric(10,2)`.
- Barang dan satuan harus cocok; pemasok serta barang harus cocok dengan pesanan. Jumlah diterima tidak boleh melebihi jumlah dikirim, dan jumlah dikirim tidak boleh melebihi sisa pesanan.
- Penerimaan sebagian wajib menyertakan alasan. Pesanan berstatus batal/ditolak tidak dapat dipakai.
- Baris barang dan pesanan dikunci selama penyimpanan. Penyesuaian menolak snapshot stok yang sudah berubah.
- ID permintaan tetap digunakan ketika penyimpanan diulang. Advisory lock dan pemeriksaan isi riwayat mencegah penerimaan/penyesuaian diterapkan dua kali untuk permintaan yang sama.
- Respons keberhasilan hanya ditampilkan setelah transaksi berhasil. Kegagalan tidak ditutupi dengan perubahan state lokal.
- Setelah penyimpanan, data Daily Worker dan halaman Master Data Owner direvalidasi.

## Pengujian

Semua fixture, INSERT, UPDATE, DELETE, dan simulasi kegagalan dijalankan pada container PostgreSQL 17 Alpine sementara dengan database, port, dan kredensial acak yang terpisah dari database aplikasi. Harness tidak memakai URL database asli untuk operasi penulisan. Container dan server pengujian dibersihkan setelah selesai.

| Pengujian | Hasil |
| --- | --- |
| Unit test Daily Worker | 3 lulus: validasi jumlah/tanggal, penolakan data tidak didukung sebelum transaksi, validasi penerimaan sebagian. |
| Unit test autentikasi | 19 lulus. |
| Penerimaan dan penambahan stok | Lulus, termasuk desimal dan penerimaan sebagian. |
| Permintaan penerimaan identik/bersamaan | Lulus; stok bertambah satu kali untuk ID permintaan yang sama. Permintaan berbeda tetap dijumlahkan dengan benar. |
| Pemeriksaan berbeda dari stok sistem | Lulus; riwayat tersimpan dan stok tetap. |
| Penyesuaian | Lulus; nilai fisik tersimpan, replay tidak mengurangi stok lagi, snapshot lama ditolak. |
| Dua penyesuaian bersamaan | Lulus; hanya satu perubahan dari snapshot yang sama diterima. |
| Validasi dan kapasitas stok | Lulus; jumlah negatif, kelebihan desimal, tanggal tidak valid, barang/satuan/pemasok/pesanan tidak cocok, kelebihan pesanan, dan overflow ditolak. |
| Rollback | Lulus; kegagalan yang dipaksakan sebelum commit membatalkan riwayat dan pembaruan stok. |
| Otorisasi | Lulus; Owner, Kasir, Baker, Barista, dan Daily Worker PENDING ditolak untuk penyimpanan Daily Worker. |
| Konsistensi Owner | Lulus; pembacaan Master Data Owner menunjukkan stok yang sama setelah perubahan Daily Worker. |
| Regresi CRUD Master Data Owner | Lulus, termasuk pengujian database dan browser dari harness Owner yang sudah ada. |
| Persistensi | Lulus melalui refresh browser dan restart server Next.js pengujian. |
| Lint | Lulus tanpa warning ESLint. |
| Production build | Lulus. |

Driver PostgreSQL menampilkan peringatan deprecation nonfatal saat pengujian transaksi Prisma. Seluruh assertion dan commit/rollback yang diuji berhasil; dependency tidak diganti dalam tahap ini.

## Pengujian browser dan tampilan

Playwright menggunakan Chrome lokal dan database sementara. Alur login Daily Worker, simpan penerimaan, baca stok setelah refresh, pemeriksaan, validasi negatif, serta simpan penyesuaian diuji melalui browser.

Navigasi yang diperiksa: Dashboard, Penerimaan, Stok Barang, Kadaluwarsa, Pemeriksaan, Penyesuaian, dan Tentang Alana. Pencarian memakai data database pengujian. Panel batch menampilkan batasan dan tombol pembuangan tetap nonaktif. Akses tanpa sesi dan akses Daily Worker ke dashboard Owner ditolak.

Screenshot desktop 1440×1000 dan mobile 390×844 tersedia lokal di `.worker-db-qa/` (diabaikan Git). Tidak ada overflow halaman pada ukuran mobile tersebut; tabel lebar tetap dapat digulir di kontainernya. Sidebar, warna, tipografi, kartu, dan struktur panel lama dipertahankan. Form penerimaan menambahkan field yang diperlukan schema dalam gaya komponen yang sama. Data, label historis batch, dan tanggal aktivitas menyesuaikan kemampuan database, sehingga tidak mengklaim kecocokan piksel penuh terhadap angka/jam contoh Figma.

## File yang dibuat/diubah dalam tahap ini

- `lib/worker-types.ts`: kontrak data dan perintah penyimpanan.
- `lib/worker-service.ts`: pembacaan Prisma, validasi, transaksi, locking, idempotensi, dan pemeriksaan role di transaksi.
- `lib/worker-data.ts`: pembacaan server dengan sesi Daily Worker.
- `app/daily-worker/actions.ts`: Server Action penyimpanan dan revalidasi.
- `app/daily-worker/data.ts`: tipe/helper, tanggal terkini, penghapusan seed dummy.
- `app/daily-worker/WorkerState.tsx`: cache respons database dan status pending; menggantikan reducer simulasi.
- `app/daily-worker/layout.tsx`, `WorkerShell.tsx`: pemuatan data server dan ringkasan dari data asli.
- `app/daily-worker/WorkerDashboard.tsx`, `ReceivingPage.tsx`, `StockPage.tsx`, `InspectionPage.tsx`, `AdjustmentPage.tsx`, `ExpiryPage.tsx`, `SearchPage.tsx`: integrasi data, form, pesan, serta batasan schema.
- `scripts/test-daily-worker.cjs`, `tests/worker.test.cjs`: pengujian terisolasi/browser dan unit test.
- `package.json`: perintah pengujian Daily Worker.
- `.gitignore`: mengabaikan screenshot pengujian baru.
- `DAILY-WORKER-DATABASE-REPORT.md`: laporan ini.

## Database asli

Verifikasi dilakukan dengan `SELECT 1` serta pembacaan jumlah data dalam transaksi `READ ONLY`. Hasil: 15 tabel, 9 akun, 10 barang, 3 pemasok, 5 header penerimaan, dan 2 header pemeriksaan pada saat pemeriksaan. Checksum `prisma/schema.prisma` sama dengan checksum sebelum tahap ini.

Tidak ada migrasi, db push, perubahan schema, pengujian tulis, perubahan akun, stok, atau transaksi yang dijalankan terhadap database asli oleh pekerjaan ini. Sistem Login, Sign Up, sesi, modul Owner, Baker/Barista, dan Kasir tidak diubah. Kode Daily Worker siap melakukan penyimpanan nyata ketika pengguna Daily Worker aktif menekan Simpan; tidak ada penyimpanan otomatis saat membuka halaman.

Tahap ini berhenti pada Daily Worker. Dukungan pembuangan per batch dan catatan bebas memerlukan rancangan serta persetujuan schema terpisah.

## Menjalankan ulang pengujian

```powershell
npm.cmd run test:worker
npm.cmd run test:auth
npm.cmd run test:worker:isolated
npm.cmd run lint
npm.cmd run build
```

Pengujian terisolasi memerlukan Docker, image `postgres:17-alpine`, dan Chrome lokal. Jangan menjalankan dua harness browser bersamaan karena keduanya memakai direktori build pengujian yang sama. Tidak perlu mengubah `.env` untuk menjalankan harness.
