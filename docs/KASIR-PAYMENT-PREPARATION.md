# Persiapan pembayaran Kasir — belum diterapkan pada database asli

Tanggal verifikasi: 9 November 2026.

> **Status terkini 9 November 2026:** SQL 003 dan 004 sudah diterapkan pada PostgreSQL asli; gate pembayaran Tunai masih tertutup. Gunakan [laporan penerapan terkini](KASIR-AKTIVASI-PERSIAPAN.md) untuk hasil, backup terbaru, dan keputusan deployment. Isi dokumen ini di bawah merupakan catatan historis sebelum penerapan; katalog terbaru tidak memuat `ff95a7f679` / `bapak kau`.

## Status historis sebelum penerapan

Kode harga resmi Owner, pembayaran Tunai, draft SQL, dan schema Prisma pengujian telah disiapkan. Pembayaran sukses diuji pada PostgreSQL terpisah. Schema aktif, sembilan akun, data stok, dan transaksi PostgreSQL asli tidak diubah.

**Kebijakan yang ditetapkan: pajak 0%, biaya layanan Rp0, total sama dengan subtotal, dan hanya TUNAI. QRIS dan Debit tetap nonaktif. Penerapan database dan aktivasi produksi belum disetujui atau dijalankan.**

## Draft schema dan SQL

SQL: `database/proposals/002-kasir-payment.sql`.

Schema pengujian: `prisma/payment-preview.prisma`, menggunakan 15 model yang sama dan output Client terpisah `app/generated/payment-prisma`. `prisma/schema.prisma` dan output Client aktif tidak diganti.

| Tabel | Kolom | PostgreSQL |
| --- | --- | --- |
| barang | harga_jual | numeric(12,2), nullable |
| transaksi | metode_pembayaran | varchar(10), nullable |
| transaksi | total_bayar | numeric(18,2), nullable |
| transaksi | pajak_layanan | numeric(18,2), nullable |
| transaksi | uang_diterima | numeric(18,2), nullable |
| transaksi | kembalian | numeric(18,2), nullable |
| transaksi | waktu_bayar | timestamptz(6), nullable |
| transaksi | kunci_idempotensi | uuid, nullable, UNIQUE |

Seluruh kolom tanpa default. Tidak ada backfill harga, waktu, atau pembayaran lama. Tidak ada tabel/model tambahan, perubahan primary key, atau penghapusan foreign key.

Constraint draft:

- Harga yang terisi harus positif dan bukan NaN.
- Stok tidak negatif dan bukan NaN. Preflight sumber harus menolak data yang tidak memenuhi aturan; tidak memperbaiki stok otomatis.
- Metadata pembayaran harus seluruhnya NULL (kompatibilitas data lama), atau seluruhnya terisi dengan status Berhasil.
- Metode pada schema dibatasi ke TUNAI; QRIS/DEBIT ditolak.
- Total positif; `pajak_layanan` harus tepat nol; uang diterima mencukupi; kembalian tidak negatif dan sama dengan uang diterima dikurangi total. Nominal NaN ditolak.
- Kunci idempotensi unik, sementara banyak transaksi lama tetap dapat memiliki NULL.

Persamaan total dengan jumlah detail diperiksa server dalam transaksi, karena CHECK biasa tidak dapat memvalidasi agregat lintas baris. Constraint tidak diklaim menggantikan otorisasi server.

Draft memakai BEGIN/COMMIT, lock_timeout 5 detik, statement_timeout 30 detik, dan pengakuan sesi `alana.payment_schema_approved=yes`. Pengakuan tersebut adalah pengaman eksekusi manual, bukan bukti otorisasi administrator atau verifikasi target. SQL tidak memiliki hook startup, tidak memakai IF NOT EXISTS untuk menyembunyikan schema drift, dan tidak dijalankan otomatis terhadap sumber. Jika DDL gagal, lakukan ROLLBACK dan investigasi sebelum mencoba lagi.

## Implementasi kode

### Harga Owner

`setPriceAction()` memakai helper otorisasi Owner yang sudah ada. `setPrice()` memeriksa ulang role Owner ACTIVE dan kredensial di dalam transaksi, mengunci produk, memvalidasi harga positif/maksimal dua desimal serta kapasitas kolom, lalu hanya memperbarui `harga_jual` untuk Produk Hasil.

Form harga menggunakan panel Master Data yang sudah ada dan hanya tampil bila fitur harga diaktifkan serta schema tersedia. Tidak ada stok yang dapat diubah melalui form harga. Harga kandidat pada uji restore berasal dari transaksi Berhasil terbaru yang diaudit; perubahan harga hanya diterapkan ke database pengujian. Sumber asli tidak diisi.

### Pembayaran Tunai

`checkoutKasirAction()` memeriksa sesi melalui autentikasi yang sudah ada. `payCash()` kemudian:

1. Menolak eksekusi bila policy pengujian tidak sah; memvalidasi UUID v4, metode Tunai, jumlah bulat positif, produk tidak duplikat, nominal dan kutipan harga.
2. Memeriksa ulang Kasir ACTIVE dan kredensial di dalam transaksi.
3. Mengambil advisory lock berdasarkan kunci idempotensi. Jika transaksi sudah ada, memeriksa kepemilikan akun, metode, uang diterima, produk/jumlah dan harga snapshot, lalu mengembalikan hasil lama. Isi atau pemilik berbeda ditolak.
4. Mengunci barang dalam urutan ID konsisten, lalu membaca ulang jenis barang, harga resmi, dan stok.
5. Menolak Bahan Baku, harga kosong, harga yang berubah sejak ditampilkan, dan stok kurang. Harga frontend hanya menjadi kutipan untuk mendeteksi perubahan; bukan sumber harga penyimpanan.
6. Menghitung subtotal/total/kembalian dengan Decimal presisi 40. Pajak dan biaya layanan tetap nol berdasarkan kebijakan yang ditetapkan server, bukan input frontend. Nominal melebihi kapasitas ditolak.
7. Menyimpan header dan detail, lalu mengurangi stok Produk Hasil secara bersyarat dalam satu transaksi Prisma. Pembaruan stok harus memengaruhi satu baris; kegagalan membatalkan seluruh transaksi.

`detail_transaksi.harga` menjadi snapshot harga pada saat penjualan, bukan relasi dinamis ke harga sekarang. Perubahan harga produk tidak mengubah snapshot lama. Stok Bahan Baku tidak dikurangi kembali; pemakaian bahan sudah dicatat oleh Baker.

Tanggal Jakarta dan waktu pembayaran berasal dari server database. Keranjang dan estimasi kembalian menggunakan perhitungan sen integer untuk menghindari kesalahan tampilan pecahan; server tetap menghitung ulang seluruh nilai dengan Decimal.

### Pengulangan setelah koneksi terputus

Browser menyimpan intent (UUID, produk/jumlah, kutipan harga dan nominal) sementara di sessionStorage sebelum mengirim. Tidak ada password atau sesi autentikasi di sana. Jika hasil tidak pasti, aplikasi mempertahankan intent dan menyediakan Periksa/Ulangi Pembayaran Tertunda, termasuk setelah refresh.

Pengulangan memakai UUID dan isi yang sama. Server memeriksa transaksi yang sudah commit sebelum membaca harga/stok terbaru, sehingga respons hilang tidak menyebabkan pengurangan stok kedua. Permintaan yang ditolak secara pasti dapat diperbaiki; setelah sukses pengguna memulai Transaksi Baru. Penyimpanan intent bukan bukti otorisasi dan tidak dapat melewati pemeriksaan server.

Ini menjamin pengulangan **intent yang sama**, bukan mendeteksi dua pesanan sah yang kebetulan berisi produk sama tetapi menggunakan UUID berbeda. Tidak ada klaim integrasi atau debit dana QRIS/bank.

## Pengaman aktivasi

- `ALANA_OWNER_PRICES`: default nonaktif. Masih memerlukan schema siap dan sesi Owner sah.
- Pembayaran saat ini hanya dapat aktif jika seluruh flag pengujian tepat, NODE_ENV=development, URL koneksi cocok dengan URL test yang diberikan harness, host 127.0.0.1, dan nama database tepat `alana_payment_test`.
- `ALANA_PAYMENT_FEE_POLICY=zero` hanya berlaku bersama flag isolated test, development, host loopback, dan database `alana_payment_test`. Mode production dan database aplikasi asli ditolak.
- Tidak ada perubahan `.env` sumber. Pemeriksaan READ ONLY memastikan harga dan pembayaran masih nonaktif pada sumber.
- `paymentReady()` memeriksa keberadaan delapan kolom sebelum kode mengaksesnya. Regresi juga menguji aplikasi dengan schema lama tanpa kolom baru.

Kebijakan biaya telah ditetapkan, tetapi aktivasi nyata tetap membutuhkan persetujuan penerapan schema, pengisian harga oleh Owner, preflight backup terbaru, dan langkah aktivasi terpisah. Gate test tidak dapat dipakai terhadap database aplikasi asli.

## Hasil pengujian terpisah

Harness terbaru menggunakan container PostgreSQL 17 Alpine sementara dan restore read-only dari arsip backup tervalidasi pada volume read-only. Karena backup dibuat sebelum pembaruan auth, draft auth yang sudah ada diterapkan hanya pada restore untuk menyelaraskan kolom akun dengan kode saat ini; setelah itu draft pembayaran dan transaksi uji juga berjalan hanya di sana. Harga 4 produk yang sejalan dengan audit sumber dipasok dari hasil audit READ ONLY dan diverifikasi terhadap sejarah pada backup. Harness menambahkan akun serta barang sintetis untuk uji UI, mempertahankan lima akun dan riwayat sumber yang direstore, lalu menghapus container/volume. Ini rehearsal pada snapshot backup, bukan pengganti backup baru menjelang deployment.

| Pengujian | Hasil |
| --- | --- |
| SQL penambahan delapan kolom/constraint | Lulus pada hasil restore backup, terpisah dari database sumber. |
| Prisma schema pengujian | Generate berhasil; Client terpisah membaca model/kolom baru dengan tipe yang benar. |
| Preservasi legacy | Semua 11 header/18 detail transaksi, lima akun hasil restore, dan stok produk sumber tetap sesuai baseline; tidak ada metadata pembayaran lama yang di-backfill. |
| Harga resmi | Hanya Owner ACTIVE; Bahan Baku, harga nol dan harga tidak valid ditolak. Browser Owner berhasil menyimpan harga. |
| Tunai | Total dan kembalian sesuai Decimal, header/detail tersimpan, stok produk berkurang. |
| Harga snapshot | Setelah harga resmi diubah, harga detail transaksi yang sudah tersimpan tetap sama. Kutipan harga usang ditolak; replay transaksi lama tetap mengembalikan hasil lama. |
| Validasi/otorisasi | Nominal kurang/negatif, jumlah pecahan/negatif, metode QRIS/Debit, role lain, akun PENDING dan kredensial berubah ditolak. |
| Idempotensi | Permintaan identik bersamaan hanya tersimpan sekali; isi berbeda dan akun Kasir lain dengan UUID yang sama ditolak. |
| Konflik stok | Dua checkout memperebutkan stok yang sama; hanya transaksi yang stoknya cukup berhasil, saldo tidak negatif. |
| Rollback | Exception yang dipaksakan sebelum commit membatalkan header, detail dan pengurangan stok. |
| Constraint DB | Metadata parsial pada transaksi lama, harga negatif/NaN, stok negatif, pajak nonnol, metode QRIS/DEBIT, dan kembalian tidak sesuai ditolak. |
| Respons hilang setelah commit | Browser di-refresh lalu mengulang intent yang sama; jumlah transaksi hanya bertambah sekali. |
| Persistensi | Struk, pembayaran dan kembalian tetap tersedia setelah refresh dan restart server test. |
| Konsistensi antar-role | Owner, Daily Worker dan Baker membaca stok yang sama. DTO ketiganya juga diuji memakai Client Prisma preview agar Decimal tambahan tidak bocor ke komponen client. |
| Desktop/mobile | Screenshot form Tunai dan harga Owner tersedia lokal di `.payment-db-qa/`, diabaikan Git. Form Tunai diuji pada lebar desktop dan mobile 390px. |
| Regresi | Hasil run terakhir dicatat setelah pengujian tahap ini selesai. |
| Unit test / lint / build | Hasil run terakhir dicatat setelah pengujian tahap ini selesai. |

Peringatan deprecation pg pada sebagian harness regresi terdahulu masih muncul dan tidak menggagalkan assertion.

## File yang disiapkan/diubah

- `database/proposals/002-kasir-payment.sql`: draft DDL saja.
- `prisma/payment-preview.prisma`: schema persiapan/testing dengan output generator terpisah.
- `lib/payment-policy.ts`, `lib/payment-service.ts`: gate, validasi, harga Owner, transaksi Tunai dan replay.
- `lib/kasir-service.ts`, `lib/kasir-cart.ts`: pembacaan harga/metadata saat schema siap serta perhitungan tampilan tepat.
- `app/kasir/actions.ts`, `CashPayment.tsx`, `KasirState.tsx`, `KasirSales.tsx`, `KasirHistory.tsx`, `data.ts`: Server Action, form/konfirmasi/hasil, pemulihan intent, data struk dan kompatibilitas mode lama.
- `app/owner/master-data/price-actions.ts`, `app/owner/OwnerPriceForm.tsx`, `app/owner/MasterDataClient.tsx`: pengelolaan harga dalam panel yang ada.
- `lib/owner-master-service.ts`, `lib/owner-master-types.ts`: harga resmi terjaga gate dan DTO string.
- `lib/worker-service.ts`: proyeksi field DTO eksplisit, agar kolom Decimal tambahan tidak ikut tersebar saat Client aktif kelak diselaraskan. Logika stok tidak diganti.
- `scripts/test-payment.cjs`, `tests/payment.test.cjs`: pengujian baru; `scripts/test-kasir-db.cjs` mendapat diagnostik kegagalan restart test.
- `package.json`, `.gitignore`, dokumen ini.

Tidak ada perubahan Login, Sign Up, sesi, schema Prisma aktif, struktur database asli, atau desain stylesheet Figma.

## Status sumber dan keputusan yang masih diperlukan

SELECT dalam transaksi READ ONLY pada database asli menunjukkan: 9 akun, 11 transaksi, 18 detail, **0 dari delapan kolom baru**, dan fitur harga/pembayaran masih false. Checksum `prisma/schema.prisma` sama dengan sebelum pekerjaan. Tidak ada INSERT, UPDATE, DELETE, perubahan harga, atau DDL yang dijalankan terhadap sumber oleh pekerjaan ini.

### Audit harga dan katalog pada sumber (READ ONLY)

Tidak tersedia kolom harga jual resmi sebelum draft. Status transaksi: 8 Berhasil dan 3 Gagal. Dari transaksi Berhasil ditemukan 15 baris detail penjualan Produk Hasil dengan harga satuan dan jumlah positif. Kandidat memakai harga terakhir per produk; seluruh harga pada tanggal terakhir tidak ambigu dan riwayat yang tampil konsisten:

| ID / Produk | Kategori | Riwayat harga Berhasil | Tanggal terakhir | Kandidat awal | Status |
| --- | --- | --- | --- | --- | --- |
| PRD-01 — Roti Tawar | Produk Hasil | 5 × Rp18.000,00 | 19 Okt 2026 | Rp18.000,00 | Tervalidasi dari transaksi Berhasil |
| PRD-02 — Croissant Butter | Produk Hasil | 3 × Rp22.000,00 | 17 Okt 2026 | Rp22.000,00 | Tervalidasi dari transaksi Berhasil |
| PRD-03 — Caffe Latte | Produk Hasil | 5 × Rp25.000,00 | 19 Okt 2026 | Rp25.000,00 | Tervalidasi dari transaksi Berhasil |
| PRD-04 — Brownies Cokelat | Produk Hasil | 2 × Rp20.000,00 | 17 Okt 2026 | Rp20.000,00 | Tervalidasi dari transaksi Berhasil |
| ff95a7f679 — bapak kau | Produk Hasil | Tidak ada | — | — | Belum ada harga |

Katalog sumber juga memiliki enam Bahan Baku: BHN-01 Tepung Terigu Protein Tinggi (kg), BHN-02 Gula Pasir (kg), BHN-03 Mentega Tawar (kg), BHN-04 Susu Cair Full Cream (liter), BHN-05 Biji Kopi Arabika (kg), dan BHN-06 Bubuk Cokelat (kg). Harga pembelian bahan tidak digunakan sebagai harga jual. Kandidat tersebut tidak diisikan ke database asli; harness hanya memakainya pada hasil restore yang terpisah.

Masih diperlukan:

1. Persetujuan terpisah atas penerapan SQL pada database asli setelah backup/restore rehearsal terbaru.
2. Owner meninjau dan mengonfirmasi harga kandidat transaksi historis untuk PRD-01 sampai PRD-04; harga tidak berubah otomatis.
3. Owner menentukan harga produk `ff95a7f679`, karena tidak ada riwayat harga sah.
4. Persetujuan terpisah untuk aktivasi pengelolaan harga dan pembayaran Tunai. QRIS/Debit tetap nonaktif.

## Backup dan penerapan berikutnya — belum dijalankan

1. Pertahankan fitur baru off. Identifikasi sumber secara privat dan ulangi preflight tabel, tipe/nullable/default, constraint/index, data legacy, akun dan stok. Hentikan jika ada drift atau stok negatif/NaN.
2. Buat **backup baru** seluruh database dengan pg_dump custom di lokasi privat di luar Git; kredensial tidak melalui log atau argumen shell. Jangan menganggap backup autentikasi lama masih mutakhir.
3. Catat checksum, periksa pg_restore --list, lalu restore ke target terpisah. Cocokkan tabel, constraint, jumlah/fingerprint data serta identitas akun secara privat.
4. Terapkan draft pada hasil restore itu dan ulangi pengujian pembayaran/regresi. Backup terbaru dan restore atas data nyata belum dikerjakan pada tahap ini.
5. Tinjau hasil dan minta izin penerapan sumber. Gunakan jendela pemeliharaan untuk menghindari perubahan data selama preflight/DDL. Jalankan satu kali dalam transaksi; bila gagal rollback, jangan melakukan retry atau perbaikan data otomatis.
6. Setelah kolom/constraint sumber diverifikasi, gabungkan hanya field preview ke schema aktif dengan tetap mempertahankan output generator aktif. Generate Client, lint, unit/integrasi dan build; verifikasi kompatibilitas modul. Jangan menyalin output generator preview menjadi konfigurasi aktif secara buta.
7. Aktifkan pengelolaan harga setelah izin, isi harga resmi melalui Owner. Implementasikan policy pembayaran nyata yang disetujui, lalu minta izin aktivasi Tunai dan uji tulis sumber secara terpisah.
8. Jika aplikasi bermasalah setelah DDL, tutup flag baru dan perbaiki ke depan. Jangan DROP kolom berisi pembayaran atau restore menimpa transaksi baru tanpa rencana rekonsiliasi dan persetujuan.

## Menjalankan pengujian

```powershell
npx.cmd --no-install prisma generate --schema prisma/payment-preview.prisma --config prisma7.config.ts
npm.cmd run test:payment
$env:ALANA_PAYMENT_TEST_BACKUP='<path to verified custom-format .dump>'
$env:ALANA_PAYMENT_TEST_PRICE_CANDIDATES='{"PRD-01":"18000.00","PRD-02":"22000.00","PRD-03":"25000.00","PRD-04":"20000.00"}'
npm.cmd run test:payment:isolated
Remove-Item Env:ALANA_PAYMENT_TEST_BACKUP,Env:ALANA_PAYMENT_TEST_PRICE_CANDIDATES
npm.cmd run lint
npm.cmd run build
```

Docker dan Chrome lokal diperlukan untuk harness. Jalankan harness browser bergantian karena memakai direktori build test bersama. Kedua environment variable harus menunjuk pada backup tervalidasi dan hasil audit READ ONLY terkini; tanpa keduanya harness berhenti. Jangan menyimpan variabel tersebut pada `.env`.

Jika draft gagal sebelum COMMIT pada restore uji, transaksi DDL di-rollback dengan menghapus container pengujian; jangan mencoba kembali pada sumber. Untuk kegagalan sebelum COMMIT pada penerapan yang kelak disetujui, jalankan `ROLLBACK` pada sesi yang sama dan verifikasi schema read-only. Setelah COMMIT, tutup flag fitur dan lakukan perbaikan maju; jangan DROP kolom berisi pembayaran atau menimpa transaksi baru dengan restore tanpa rencana rekonsiliasi.

Pekerjaan berhenti sebelum penerapan PostgreSQL asli. Nilai harga di tabel audit adalah kandidat dari transaksi lama dan perlu dikonfirmasi Owner sebelum pengisian.
