# Laporan uji Baker / Barista

Preview production: http://localhost:3002/baker

## Hasil klik menu

| Menu | Rute | Hasil |
|---|---|---|
| Dashboard | /baker | Lulus desktop/mobile; ringkasan, kartu produk, bahan menipis, produksi terakhir muncul |
| Cari Stok Bahan | /baker/stok-bahan | Lulus desktop/mobile; kategori, cari, kosong, saran dan detail bekerja |
| Pemakaian Bahan | /baker/pemakaian-bahan | Lulus desktop/mobile; pilih produk, stok kurang, validasi, simpan dan produksi lagi bekerja |
| Tentang Alana | /baker/tentang-alana | Lulus desktop/mobile; informasi usaha sesuai sumber |

## Interaksi browser

| Skenario | Hasil |
|---|---|
| Dashboard tampil dan delapan bahan menipis | Lulus |
| Sidebar Cari Stok Bahan dan seluruh kategori | Lulus |
| Pencarian tidak ditemukan dan saran | Lulus |
| Cari Tepung lalu buka detail jumlah/kondisi | Lulus |
| Saran bahan membuka detail | Lulus |
| Sidebar Pemakaian Bahan dan pilihan produk | Lulus |
| Croissant stok kurang dan simpan terblokir | Lulus |
| Restok simulasi membuka form bahan cukup | Lulus |
| Input melebihi stok dan hasil kosong ditolak tanpa mutasi | Lulus |
| Input negatif, nol, dan pecahan hasil ditolak | Lulus |
| Simpan produksi mengurangi stok dan menambah produk/riwayat tepat sekali | Lulus |
| Semua produk dapat dipilih | Lulus |
| Dashboard menampilkan hasil simulasi dan tautan produk | Lulus |
| Sidebar bawah Tentang Alana | Lulus |
| Notifikasi dropdown tandai dibaca dan buka bahan | Lulus |
| Notifikasi navigasi detail dalam rute yang sama dan lihat semua | Lulus |
| Pencarian global, tab, detail bahan/produk, dan riwayat pencarian | Lulus |
| Modal keluar, fokus keyboard, batal dan konfirmasi ke login | Lulus |
| Mobile 390px seluruh menu dan overflow | Lulus |
| Rute role lain tetap tersedia tanpa 404 | Lulus |

## Tambahan responsif

Lima rute Baker diuji pada 360, 768 dan 1024 px tanpa overflow halaman. Pada 390 px diuji pula validasi hasil 0, simpan Coffee Latte, perubahan stok, serta pencarian global. Bukti: .baker-qa/responsive-results.json dan screenshot mobile-*.png.

## Pemeriksaan teknis

- npm run lint: lulus, tanpa warning/error.
- npm run build: lulus, semua rute Baker tersedia.
- Error JavaScript/konsol: 0 pada suite utama.
- Respons gagal/404: 0 pada suite utama.
- Database/PostgreSQL/migrasi/auth backend: tidak diubah atau dijalankan.
- Prisma schema dan kode role lain: tidak disentuh oleh pekerjaan ini.

## Mencoba alur stok cukup

1. Buka Pemakaian Bahan dan pilih Croissant Butter untuk melihat stok kurang.
2. Buka Simulasi data stok di bawah riwayat lalu klik Simulasikan restok bahan.
3. Isi pemakaian / hasil produksi, lalu Simpan Produksi.
4. Stok tepung 10 → 4 kg, mentega 5 → 2 kg; produk bertambah 24 pcs. Navigasi antarhalaman mempertahankan state. Refresh mereset dummy data.

## Bukti dan keterbatasan

Seluruh 13 screenshot dibandingkan pada [design-qa.md](design-qa.md). File JSON bukti: [.baker-qa/results.json](.baker-qa/results.json). Tampilan mengikuti screenshot dengan beberapa perbedaan font/ikon kecil serta data yang berubah sesuai transaksi. Figma MCP tidak tersedia.

Untuk mengulang uji: pasang Playwright lokal dengan npm.cmd install --no-save --package-lock=false @playwright/test@1.65.0, jalankan production server, set BAKER_TEST_URL ke URL /baker lalu jalankan node .baker-qa/test.cjs. Skrip responsive.cjs memakai port 3002. Browser yang dipakai adalah Chrome terpasang di sistem.
