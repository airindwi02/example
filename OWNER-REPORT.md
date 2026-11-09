# Laporan implementasi dan pengujian Owner

Tanggal: 9 November 2026. Implementasi memperbaiki `/owner` yang sudah ada. Sumber visual utama adalah seluruh 26 PNG dari `Untitled.zip`, bukan template dashboard baru. Figma MCP tidak tersedia pada sesi ini.

Preview pengguna: http://localhost:3000/owner. Build produksi juga diuji di http://localhost:3007/owner.

## 1. Halaman, route, dan hasil klik menu

| Menu / halaman | Route | Hasil pengujian browser |
|---|---|---|
| Dashboard | `/owner` | Lulus: ringkasan, dua tabel, empat pintasan, notifikasi, dan keluar |
| Master Data | `/owner/master-data` | Lulus: empat tab, pencarian, rincian kanan, formulir, validasi, simpan, hapus, pagination |
| Laporan | `/owner/laporan` | Lulus: tanggal, kategori, empat filter cepat, laporan, konfirmasi dan unduhan PDF |
| Stok Menipis | `/owner/stok-menipis` | Lulus: Semua/Kritis/Menipis, pencarian, rincian melalui Master Data, empty state |
| Riwayat Masuk | `/owner/riwayat-masuk` | Lulus: periode, pencarian, pilihan transaksi, panel rincian, empty state |
| Riwayat Keluar | `/owner/riwayat-keluar` | Lulus: periode, filter jenis pada header kolom Jenis, pencarian, rincian, empty state |
| Tentang Alana | `/owner/tentang-alana` | Lulus: dibuka dari sidebar bawah; profil usaha, visi, misi, produk, jam buka, kontak, ilustrasi sumber |
| Pencarian global | `/owner/pencarian?q=...` | Lulus: hasil Bahan/Produk/Transaksi, tab, tautan detail, tanpa hasil, hapus riwayat |

Semua menu sidebar diklik melalui browser. Empat pintasan dashboard juga diklik satu per satu dan membuka route yang benar. Form, modal, dropdown, tab, dan toast menjadi state interaksi; tidak dibuat sebagai route terpisah.

## 2. Hasil pengujian Master Data

| Pemeriksaan | Hasil |
|---|---|
| Empat tab Bahan Baku, Satuan, Pemasok, Batas Minimum | Lulus |
| Pencarian Tepung dan rincian Tepung Terigu di panel kanan | Lulus |
| Pagination halaman 1 → 2 → 1 | Lulus; jumlah dan tombol mengikuti data sebenarnya |
| Tambah bahan, ubah nama, cari nama baru, hapus | Lulus; daftar benar-benar berubah |
| Tambah satuan, ubah, cari, hapus satuan baru | Lulus |
| Tambah pemasok, ubah, cari, hapus pemasok baru | Lulus |
| Edit Cokelat Bubuk dan simpan | Lulus; banner sukses dan rincian diperbarui |
| Nama kosong dan minimum `abc` | Ditolak dengan penanda field dan pesan validasi |
| Minimum negatif | Ditolak |
| Minimum 0 melalui tab Batas Minimum | Diterima; peringatan stok turun dari 8 menjadi 7 |
| Batal konfirmasi hapus | Data tetap ada |
| Ya, Hapus | Data dihapus dari state; banner sukses tampil |
| Pindah Master Data → Stok Menipis | Perubahan state tetap tersedia |

Satuan dan pemasok yang masih dipakai bahan dilindungi dari penghapusan agar referensi demo tetap valid. Nama duplikat, simbol satuan duplikat, dan telepon pemasok tidak valid ditangani dalam formulir. Pengujian CRUD memakai record baru sehingga tidak perlu menghapus data asli.

## 3. Hasil pengujian Laporan

- Tanggal dan kategori mengubah baris serta total laporan, bukan hanya pesan.
- Hari Ini, 7 Hari, Bulan Ini, dan Bulan Lalu berfungsi. Bulan Lalu menghasilkan empty state karena ledger demo berada di Oktober.
- Tanggal akhir sebelum tanggal awal ditolak; laporan valid sebelumnya tetap tampil.
- Ekspor Laporan membuka konfirmasi pada posisi referensi.
- Tidak membatalkan ekspor dan menampilkan “File laporan tidak diekspor”, sesuai isi screenshot bernama Ekspor Gagal.
- Ya, Ekspor menghasilkan unduhan PDF nyata. Playwright menangkap event download dan menyimpan `.owner-qa/exported-report.pdf`.
- PDF dibaca menggunakan `pypdf` dengan `strict=True`: 1 halaman valid; judul, periode, lima baris, dan total dapat diekstrak. Bukti: `.owner-qa/pdf-validation.json`.
- Kegagalan pembuatan URL unduhan disimulasikan secara terkendali di browser. Pesan “File laporan gagal diekspor” tampil; tidak ada klaim sukses.
- PDF menggunakan periode dan kategori yang sudah diterapkan, sehingga perubahan draft filter tidak diam-diam mengubah file.

Generator PDF mengikuti struktur objek, stream, cross-reference dan trailer dari [PDF Association Basics](https://pdfa.org/download-area/cheat-sheets/Basics.pdf). Tidak ada library PDF ditambahkan ke dependensi aplikasi.

## 4. Hasil pengujian riwayat

Riwayat Masuk menampilkan TM-0045 sebagai pilihan awal. Memilih TM-0044 memperbarui pemasok dan rincian menjadi Susu Cair / CV Dairy Fresh. Pencarian tanpa hasil menampilkan empty state.

Riwayat Keluar menampilkan Croissant Butter beserta gambar sumber. Memilih TK-0044 mengganti detail menjadi Tepung Terigu. Filter Pemakaian menghilangkan transaksi Penjualan. Pencarian tanpa hasil menampilkan empty state.

Pada kedua riwayat, Hari Ini menampilkan 2 transaksi dan 7 Hari / Semua menampilkan 9 transaksi demo. Detail menampilkan snapshot transaksi historis, bukan mengganti stok saat ini. Tombol pagination nonaktif jika tidak ada halaman berikutnya.

## 5. Notifikasi, pencarian, stok kosong, dan keluar

- Lonceng membuka dropdown empat notifikasi awal. Tandai dibaca mengubah indikator menjadi 0 baru. Lihat semua peringatan membuka Stok Menipis.
- Peringatan Cokelat Bubuk dan Ragi Instan mengikuti nama, stok, dan minimum pada state Owner.
- Pencarian `cokelat` menemukan 1 bahan, 1 produk, dan 2 transaksi terbaru per barang. Tab Bahan menampilkan satu hasil; klik hasil membuka rincian Master Data.
- Kata kunci tanpa hasil dan hapus semua riwayat pencarian sudah diuji.
- Filter stok Kritis menampilkan 4 bahan. Pencarian tanpa hasil memiliki empty state tersendiri.
- Empty state global stok sehat dicapai melalui formulir: kedelapan minimum bahan diubah menjadi 0, lalu Stok Menipis menampilkan “Tidak ada stok menipis”. Dashboard ikut menampilkan 0. Tidak ditambahkan tombol simulasi pada UI.
- Keluar membuka modal; Batal mempertahankan halaman; Ya, keluar membuka `/login`. Ini navigasi simulasi frontend, bukan autentikasi backend baru.
- Escape menutup dropdown/modal. Fokus Tab tetap di dalam modal konfirmasi.

## 6. Responsif, error, lint, dan build

Delapan route Owner diperiksa pada 1440×900, 1024×768, 768×1024, 390×844, 360×800, 320×700, dan 844×390: **56 pemeriksaan route/viewport lulus, HTTP 200, tanpa overflow dokumen**. Tabel lebar memakai scroll horizontal di dalam panel agar kolom tetap terbaca.

Pada mobile, menu sidebar, modal keluar, notifikasi, dan modal ekspor juga diperiksa seluruhnya berada di dalam viewport. Overflow filter riwayat pada 320 px yang ditemukan pada iterasi awal sudah diperbaiki dengan wrapping.

| Pemeriksaan akhir | Hasil |
|---|---|
| `npm run lint` | Lulus, 0 error / 0 warning |
| `npm run build` | Lulus, TypeScript dan 32 route aplikasi selesai |
| Suite interaksi produksi | 16 kelompok lulus; console/page errors dan HTTP error kosong |
| Pemeriksaan tambahan di localhost:3000 | 6 kelompok lulus |
| Suite responsif produksi | Lulus pada 7 ukuran layar |
| Pemeriksaan PDF independen | Lulus |
| Pemeriksaan batas perubahan | 73 file di luar Owner sama dengan hash sebelum pekerjaan |

Build memerlukan izin proses lokal karena sandbox memblokir spawn TypeScript dengan EPERM. Build ulang dengan izin tersebut berhasil; tidak diperlukan perubahan konfigurasi Next.js.

## 7. File yang ditambahkan atau diubah

Implementasi berada di `app/owner/`:

- Diperbaiki: `page.tsx`, `OwnerDashboardClient.tsx`, `OwnerSectionLayout.tsx`, `data.ts`, dan `page.tsx` pada `master-data`, `laporan`, `stok-menipis`, `riwayat-masuk`, `riwayat-keluar`.
- Ditambahkan: `layout.tsx`, `OwnerState.tsx`, `OwnerUI.tsx`, `owner.css`, `MasterDataClient.tsx`, `ReportClient.tsx`, `HistoryClient.tsx`, `LowStockClient.tsx`, `SearchClient.tsx`, `exportPdf.ts`.
- Route baru yang diperlukan dalam namespace yang sama: `tentang-alana/page.tsx`, `pencarian/page.tsx`.
- Aset asli dari referensi: `public/owner/logo.png`, `dashboard-art.png`, `about-art.png`, `croissant.png`.
- Dokumentasi: `OWNER-SCREENSHOT-MAP.md`, `OWNER-REPORT.md`, `OWNER-DESIGN-QA.md`; hasil QA Owner ditambahkan ke `design-qa.md` tanpa menghapus laporan role sebelumnya.
- Bukti browser, PDF, hasil JSON, script pengujian, dan perbandingan visual: `.owner-qa/`. Referensi hasil ekstraksi: `.design-reference/owner/`.

Daftar file mesin yang membandingkan baseline tersedia di `.owner-qa/changed-files.json`.

## 8. Batas data dummy dan perbedaan dari referensi

Seluruh data Owner dan perubahan formulir memakai React state dalam layout Owner. Perubahan bertahan saat berpindah route Owner dan kembali ke data awal setelah full reload / keluar role. Tidak ada persistensi database atau autentikasi backend baru.

Data detail demo terdiri dari 38 bahan, 9 satuan, 9 pemasok, 9 riwayat masuk, 9 riwayat keluar, 4 produk pencarian, dan ledger laporan lima bahan. Ringkasan dashboard awal 248 item mencakup 38 bahan yang dapat diedit dan 210 item agregat demo di luar daftar bahan; angka 37 transaksi dan 5 mendekati kedaluwarsa merupakan metrik agregat referensi. Data detail belum mewakili seluruh angka agregat tersebut.

Perbedaan yang sengaja dipertahankan untuk perilaku yang benar:

1. Footer satuan/pemasok/riwayat menampilkan jumlah demo sebenarnya, bukan menyalin angka 38 atau 126 yang tidak sesuai jumlah record.
2. Edit tidak mengurangi jumlah data. Hapus benar-benar menghilangkan record, sedangkan screenshot sukses memperlihatkan beberapa angka dan baris yang saling bertentangan.
3. Lima baris laporan pada referensi menjumlahkan masuk 160, keluar 196, penyesuaian -1; kartunya menampilkan 320 / 285 / -4. Implementasi menghitung 160 / 196 / -1 dari ledger yang benar-benar ditampilkan. Bahan menipis pada laporan adalah 3 dari lima bahan tersebut, sedangkan peringatan seluruh persediaan adalah 8.
4. Stok awal Mentega dibuat 9 sehingga `9 + 10 − 16 − 1 = 2`; nilai awal 8 pada screenshot tidak menghasilkan stok akhir 2.
5. Periode dan nama file ekspor mengikuti filter aktual, bukan tanggal 22 pada modal referensi ketika filter berakhir tanggal 24.
6. Riwayat pencarian menambahkan kata kunci yang baru dipakai. Pencarian transaksi menampilkan transaksi terbaru per barang; klik produk membuka rincian riwayat terkait karena referensi tidak menyediakan halaman detail produk Owner terpisah.

Sisa perbedaan visual kecil: bentuk glif font/ikon pustaka, panah select native, beberapa baseline dan jarak beberapa piksel. Tidak diklaim pixel-perfect. Seluruh 26 state sudah dibandingkan berdampingan pada ukuran sumber; temuan layout/form/modal utama telah diperbaiki. Lihat `OWNER-DESIGN-QA.md`.

## 9. Database dan role lain

Tidak ada perubahan `prisma/schema.prisma`, SQL, PostgreSQL, migrasi, data pengguna, package.json, atau package-lock.json selama pekerjaan Owner. Hash 73 file di luar Owner, termasuk source Baker/Barista, Daily Worker, Kasir, login, layout dan CSS global, sama dengan baseline tugas. Perubahan pengguna yang sudah ada sebelumnya dipertahankan.

Bukti batas perubahan: `.owner-qa/baseline-hashes.json` dan `.owner-qa/scope-validation.json`. Tidak dilakukan commit, deployment, ataupun operasi tulis database.
