# Laporan implementasi dan pengujian Kasir

Tanggal: 9 November 2026. Preview: http://localhost:3000/kasir. Build produksi diuji pada http://localhost:3008/kasir.

Pekerjaan memperbaiki route Kasir yang sudah ada. Seluruh 11 PNG dari `Untitled (1).zip` dibuka, dianalisis, dan dipetakan sebelum implementasi. Sumber sebenarnya berukuran 2880×1800 (2x); perbandingan dilakukan setelah normalisasi ke viewport CSS 1440×900. Figma MCP tidak tersedia; ZIP menjadi sumber utama. Isi screenshot diperlakukan sebagai referensi desain, bukan instruksi tambahan.

## 1. Halaman, route, dan hasil klik navigasi

| Halaman / kontrol | Route atau hasil | Hasil browser |
|---|---|---|
| Dashboard | `/kasir` | Lulus |
| Produk Terjual | `/kasir/produk-terjual` | Lulus |
| Riwayat Penjualan | `/kasir/riwayat-penjualan` | Lulus |
| Tentang Alana di sidebar bawah | `/kasir/tentang-alana` | Lulus |
| Pencarian header | `/kasir/pencarian?q=...` | Lulus |
| Lihat semua notifikasi | `/kasir/notifikasi` yang sudah ada | Lulus |
| Buka Produk Terjual | Halaman input transaksi | Lulus |
| Empat kartu produk Dashboard | Produk Terjual dengan pencarian produk terkait | Keempatnya diklik dan lulus |
| Kartu Stok Rendah | Produk Terjual, filter Stok rendah | Lulus: 2 produk awal |
| Kedua notifikasi stok | Produk yang sesuai pada Produk Terjual | Lulus |
| Hasil pencarian produk | Produk Terjual dengan produk terkait | Lulus |
| Hasil pencarian penjualan | Riwayat dengan record terpilih | Lulus, termasuk transaksi bulan sebelumnya |
| Keluar → Ya, keluar | `/login` yang sudah ada | Lulus |

Sidebar hanya berisi Dashboard, Produk Terjual, Riwayat Penjualan, serta Tentang Alana di bawah. Header, profil Admin/Kasir, tanggal demo, pencarian, notifikasi, dan konfirmasi keluar mengikuti struktur referensi. Tidak dibuat dashboard kedua atau route terpisah untuk keranjang, konfirmasi, dan sukses.

## 2. Keranjang dan pembayaran

Harga/stok awal sesuai screenshot:

| Produk | Harga | Stok awal |
|---|---:|---:|
| Croissant Butter | Rp28.000 | 8 pcs |
| Coffee Latte | Rp35.000 | 24 pcs |
| Brownies Cokelat | Rp32.000 | 12 pcs |
| Red Velvet Slice | Rp38.000 | 5 pcs |

| Uji | Hasil |
|---|---|
| Keranjang kosong | Empty state tampil; Selesaikan Penjualan nonaktif |
| Tambah produk, +, −, input jumlah, hapus | Lulus |
| Jumlah 1 dikurangi | Item dihapus dan keranjang kembali kosong |
| Pencarian produk | Daftar benar-benar terfilter |
| Semua produk, Pastry, Kue, Minuman, Stok rendah | Seluruh opsi diuji; jumlah sesuai data |
| 3 Croissant + 2 Brownies | Subtotal/total Rp148.000, pajak dan layanan Rp0 sesuai referensi |
| Pembayaran Rp100.000 | Ditolak; kekurangan Rp48.000 ditampilkan |
| Nominal negatif, teks, atau melampaui bilangan aman | Ditolak; tombol selesai nonaktif |
| Pembayaran Rp150.000 | Kembalian otomatis Rp2.000 |
| QRIS / Debit | Diterima tepat sebesar total; input tunai nonaktif; kembalian Rp0 |

Metode non-tunai adalah simulasi frontend, tanpa integrasi pembayaran. Nominal dan total dihitung dari harga serta jumlah; bukan teks total statis.

## 3. Validasi stok

- Mencoba menambah Croissant setelah jumlah 8 menampilkan “Stok tidak mencukupi, sisa: 8”. Penambahan dibatalkan dan jumlah tetap 8, sesuai state referensi.
- Selesaikan Penjualan tetap nonaktif selama peringatan tersebut belum diperbaiki.
- Mengurangi atau memasukkan jumlah valid menghilangkan peringatan.
- Jumlah pecahan ditolak; jumlah tidak pernah negatif atau lebih besar dari stok.
- Mengisi keranjang, mengubah pembayaran, atau membuka konfirmasi belum mengurangi stok.
- Penjualan seluruh 8 Croissant diuji: stok menjadi 0, tombol tambah nonaktif, Produk Tersedia menjadi 3, Terjual Hari Ini menjadi 45.

Ambang stok rendah demo adalah stok ≤ 8, diinferensikan dari dua badge awal pada screenshot. Tidak ada pengaturan ambang baru yang ditambahkan ke UI.

## 4. Konfirmasi, sukses, dan pencegahan duplikasi

Selesaikan Penjualan valid mengganti panel kanan menjadi Pastikan Data Penjual Benar, bukan membuka modal atau halaman baru. Identitas Admin · Kasir, waktu, item, harga, subtotal, total, metode, diterima, dan kembalian tetap tersedia.

Ubah mengembalikan tahap edit tanpa menghapus keranjang atau pembayaran. Keranjang juga tetap ada setelah berpindah Dashboard → Produk Terjual melalui Link Next.js.

Simpan Pencatatan memeriksa kembali validitas dan menyimpan transaksi serta perubahan stok dalam satu transisi reducer:

- Croissant: **8 → 5**.
- Brownies: **12 → 10**.
- Total transaksi: **Rp148.000**, diterima **Rp150.000**, kembalian **Rp2.000**.
- Dashboard Terjual Hari Ini: **37 → 42 item**.
- Riwayat Hari Ini: **10 → 11 transaksi**; record `01/TRS-ALN` muncul tepat sekali.

Tombol Simpan dipicu dua kali berturut-turut dalam satu pengujian: hasil tetap satu record dan satu pengurangan stok. Tahap sukses menolak commit berikutnya. ID transaksi berikutnya dipilih agar tidak berbenturan dengan ID historis yang sudah ada.

Transaksi Baru mengosongkan keranjang/pembayaran dan mempertahankan stok terbaru. Penjualan kedua menggunakan ID unik dan juga memperbarui stok dengan benar.

## 5. Riwayat Penjualan dan Cetak Struk

- Hari Ini, 7 Hari, Bulan Ini benar-benar memfilter tanggal; jumlah hasil berbeda sesuai record.
- Pagination halaman pertama → kedua → pertama diuji.
- Pencarian nomor transaksi dan kata kunci tanpa hasil diuji.
- Memilih transaksi `02/TRS-ALN` mengganti panel dari penjualan baru menjadi Coffee Latte / Rp70.000; rincian bukan statis.
- Transaksi baru langsung tersedia pada riwayat dan pencarian.
- Tautan hasil pencarian transaksi lama dapat membuka record di luar periode awal tanpa kehilangan rinciannya; tombol periode selanjutnya kembali menerapkan filter yang dipilih.
- Cetak Struk memanggil `window.print()`. Pengujian menangkap pemanggilan tersebut, mengaktifkan media print, memeriksa struk yang tampil dan sidebar yang tersembunyi, lalu menghasilkan `.kasir-qa/receipt.pdf`.
- PDF struk dibaca secara independen dengan `pypdf` strict: 1 halaman, nomor transaksi, dua produk, total Rp148.000, pembayaran Rp150.000, dan kembalian Rp2.000 terbaca. Bukti `.kasir-qa/receipt-validation.json`.

Tidak dilakukan pencetakan ke perangkat printer fisik. Format struk memakai identitas usaha dari halaman Tentang Alana, tanpa mengarang alamat atau kontak baru.

## 6. Pencarian, notifikasi, dan logout

Pencarian memakai produk dan penjualan dari state Kasir yang sama. Pada data awal, `cokelat` menghasilkan 2 hasil: 1 produk dan 1 penjualan. Setelah transaksi baru yang berisi Brownies, hasil bertambah sesuai record yang benar-benar tersimpan.

Tab Semua, Produk, Penjualan, tombol Lihat, riwayat pencarian yang diklik, penghapusan satu/semua riwayat, serta empty state sudah diuji. Pencarian header mengikuti kata kunci URL saat membuka hasil atau riwayat pencarian.

Dropdown notifikasi berisi stok rendah Red Velvet dan Croissant. Jumlah, isi stok, tautan, penanda dibaca, Tandai dibaca, Escape, dan buka/tutup bekerja. Route semua notifikasi yang sudah ada dipertahankan, tanpa menambahkan menu sidebar baru.

Logout: Batal/Escape menutup modal, fokus Tab tetap di dalam dialog, Ya, keluar membuka login. Tidak ditambahkan autentikasi backend.

## 7. Responsif dan pemeriksaan teknis

| Pemeriksaan | Hasil |
|---|---|
| `npm run lint` | Lulus, 0 error / 0 warning |
| `npm run build` | Lulus; TypeScript selesai dan 32 route aplikasi terbangun |
| Suite interaksi utama | 14 kelompok lulus |
| Suite edge case | 5 kelompok lulus |
| Navigasi lengkap dan smoke role lain | 9 kelompok lulus |
| Route/viewport | 42 pemeriksaan lulus, HTTP 200, tanpa overflow dokumen |
| Transaksi mobile | Lulus lengkap pada 390 dan 320 px, termasuk Ubah dan sukses |
| Console/page errors dan HTTP error | Kosong dalam suite produksi |
| PDF struk | Valid dan isinya terbaca |

Viewport: 1440×900, 1024×768, 768×1024, 390×844, 360×800, 320×700, 844×390. Menu/profil mobile dapat dijangkau; modal keluar dan dropdown notifikasi seluruhnya berada di viewport. Tabel lebar memakai scroll pada panel. Overflow judul Riwayat Penjualan pada 320 px ditemukan dan diperbaiki sebelum pemeriksaan ulang.

Browser lokal: Chrome melalui Playwright sesuai izin pengguna sebelumnya. Suite dijalankan di localhost:3000 dan diulang pada build produksi localhost:3008. Lint/build bukan satu-satunya dasar laporan berhasil.

## 8. File implementasi

Perubahan terbatas pada Kasir, aset Kasir, dan dokumentasi/bukti QA:

- `app/kasir/data.ts`: katalog, record penjualan, detail sesuai kontrak field SQL, helper hitung dan pencarian.
- `app/kasir/KasirClient.tsx`: entry point ekspor komponen yang dipakai route lama.
- `app/kasir/layout.tsx`, `KasirState.tsx`, `KasirShell.tsx`, `KasirUI.tsx`, `kasir.css`: satu layout/state bersama, shell dan komponen lokal Kasir.
- `KasirDashboard.tsx`, `KasirSales.tsx`, `KasirHistory.tsx`, `KasirSearch.tsx`: halaman dan seluruh state interaksi.
- `page.tsx` utama serta halaman pada `produk-terjual`, `riwayat-penjualan`, `pencarian`, `notifikasi`, `tentang-alana` diperbaiki tanpa mengganti URL.
- `public/kasir/`: logo, banner dashboard, ilustrasi About, foto Croissant, Latte, Brownies, Red Velvet dari gambar referensi asli.
- `KASIR-SCREENSHOT-MAP.md`, `KASIR-DESIGN-QA.md`, `KASIR-REPORT.md`; laporan Kasir ditambahkan ke `design-qa.md`, laporan role lain dipertahankan.
- `.kasir-qa/`: script pengujian, JSON hasil, PDF, screenshot, perbandingan; `.design-reference/kasir/`: ekstraksi dan normalisasi sumber.

Daftar file dan status perubahan terhadap baseline: `.kasir-qa/changed-files.json`.

## 9. Batas data dummy dan perbedaan desain

Seluruh transaksi memakai React state dalam layout Kasir. Perubahan bertahan selama navigasi route Kasir dan kembali ke data awal setelah full reload atau meninggalkan role. Tidak ditambahkan penyimpanan backend, payment gateway, atau autentikasi.

Data awal memuat 4 produk dan 64 transaksi historis demo. Sepuluh transaksi pada tanggal demo 22 Oktober menjumlahkan 37 item, sehingga metrik dashboard benar-benar dihitung dari riwayat. Waktu demo mengikuti screenshot, bukan jam realtime.

Perbedaan yang diperlukan untuk konsistensi:

1. Screenshot riwayat memilih Hari Ini tetapi menampilkan tanggal sebelumnya. Implementasi benar-benar membatasi Hari Ini ke tanggal demo; footer menunjukkan jumlah hasil filter sebenarnya.
2. Nomor transaksi historis dibuat unik; tiga baris dashboard pada screenshot memakai nomor `00/TRS-ALN` yang sama. Record baru tetap menggunakan `01/TRS-ALN` awal dan ID berikutnya menghindari tabrakan.
3. Beberapa total historis screenshot tidak dapat diturunkan dari harga/jumlah yang terlihat. Semua record demo dihitung dari detail produk yang sebenarnya, bukan total palsu.
4. Riwayat pencarian menambahkan kata kunci yang baru dipakai; hasil dan stok mengikuti transaksi demo terbaru.

Perbedaan visual yang tersisa: glif font dan bentuk ikon pustaka belum identik dengan Figma, panah select native mengikuti browser, beberapa baseline/jarak kecil dan highlight kata pencarian belum identik. Tidak diklaim pixel-perfect. Tidak ada temuan layout atau alur utama P0/P1/P2 terbuka pada QA akhir; lihat `KASIR-DESIGN-QA.md`.

## 10. Database dan role lain

`prisma/schema.prisma` hanya berisi konfigurasi generator/datasource pada proyek ini. Field pengguna, barang, transaksi, dan detail_transaksi dibaca dari SQL untuk memahami kontrak; tidak dibuat asumsi model Prisma yang belum tersedia. Detail frontend memakai nama field `id_transaksi`, `id_pengguna`, `tanggal`, `status_transaksi`, `id_barang`, `jumlah_dipesan`, `stok_tersedia`, `jumlah_terjual`, dan `harga`. Metode/diterima/waktu adalah metadata demo frontend, bukan kolom database baru.

Tidak ada perubahan Prisma, SQL, PostgreSQL, migrasi, data pengguna, package.json, atau lockfile. **86 file di luar Kasir sama dengan hash baseline**, termasuk source Owner, Baker/Barista, Daily Worker, login, layout dan CSS global. Smoke browser `/owner`, `/baker`, `/daily-worker`, `/login` lulus HTTP 200 dan konten tampil.

Bukti: `.kasir-qa/baseline-hashes.json`, `scope-validation.json`, `navigation-results.json`. Perubahan pengguna yang sudah ada dipertahankan. Tidak dilakukan commit, deployment, atau operasi tulis database.
