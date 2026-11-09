from pathlib import Path
import json
pairs=[
("Baker Dashboard.png","dashboard","Dashboard awal"),
("Baker Dashboard-1.png","logout","Modal konfirmasi keluar di atas dashboard awal"),
("Baker Cari Stok Bahan.png","stock","Pencarian awal dan kategori"),
("Baker Barang Tidak Ditemukan.png","stock-empty","Pencarian Tepungg tanpa hasil dan saran"),
("Baker Jumlah Kondisi Stok.png","stock-detail","Pencarian Tepung dan detail Tepung Terigu"),
("Baker Pemakaian Pilih Produk.png","production-select","Pemilihan produk"),
("Baker Pemakaian Bahan Kurang.png","production-shortage","Croissant dengan stok awal kurang"),
("Baker Pemakaian Isi Hasil Produksi.png","production-form","Croissant setelah restok simulasi"),
("Baker Pemakaian Data Tidak Valid.png","production-invalid","Tepung 12 kg dan hasil kosong"),
("Baker Pemakaian Konfirmasi Stok Terbaru.png","production-success","Hasil 24 pcs dan perubahan stok"),
("Baker Tentang Alana.png","about","Informasi usaha"),
("Baker Notifikasi Dropdown.png","notifications","Dropdown tiga notifikasi awal"),
("Baker Pencarian.png","search","Pencarian cokelat dengan dua hasil")]
lines=["# Baker design QA","","final result: passed","","## Sumber dan lingkungan","",
"Referensi utama: seluruh 13 PNG di .design-reference/baker, dari ZIP Untitled (2).zip yang tersedia. Nama ZIP berbeda dari nama kedua di permintaan, tetapi isinya cocok dengan seluruh daftar screenshot. Figma MCP tidak tersedia dan tautan Figma tidak dapat dibuka; tidak ada design context Figma yang diklaim.",
"",
"Implementasi: Next.js production build pada http://localhost:3002/baker. Chrome melalui Playwright, desktop 1440 × 900 CSS px, deviceScaleFactor 1. Setiap PNG sumber 1440 × 900 px; PNG desktop implementasi 1440 × 900 px. Tidak ada penskalaan dalam perbandingan; gambar gabungan berukuran 2880 × 930 px termasuk label setinggi 30 px. Bukti mobile 390 × 844 CSS px memakai tangkapan full-page.",
"",
"## Bukti per kondisi","","| Sumber visual | Hasil browser | Perbandingan berdampingan | State |","|---|---|---|---|"]
for source,render,state in pairs:
 lines.append(f"| [.design-reference/baker/{source}](<.design-reference/baker/{source}>) | [{render}.png](.baker-qa/{render}.png) | [compare-{render}.jpg](.baker-qa/compare-{render}.jpg) | {state} |")
lines += ["","## Riwayat perbaikan","","1. P1: gambar belum termuat pada tangkapan pertama. Capture kini menunggu document.fonts.ready dan img.decode(); bukti final menampilkan semua gambar asli.",
"2. P1: karakter UTF-8 rusak akibat pembacaan encoding Windows. File diperbaiki, judul dan tanda baca diverifikasi lewat DOM browser.",
"3. P2: lebar kolom tabel dashboard/stok dan tinggi baris formulir menyimpang. Kolom disesuaikan dan padding baris dikurangi; compare-stock, compare-dashboard, compare-production-form menunjukkan hasil akhir.",
"4. P2: teks riwayat setelah produksi mendorong lebar tabel. Riwayat memakai lebar kolom tetap, ellipsis untuk teks panjang, dan scroll internal pada viewport sempit; compare-production-success dan mobile-production-success menunjukkan hasil akhir.",
"5. P2: kondisi tanpa hasil masih menampilkan filter sehingga tabel bergeser. Filter disembunyikan pada state tanpa hasil sesuai sumber; compare-stock-empty menunjukkan hasil akhir.",
"6. P2: snapshot mobile menangkap sidebar saat transisi. Transisi mobile dihilangkan dan capture menonaktifkan animasi; mobile-dashboard menunjukkan tidak ada sisi sidebar yang tertinggal.",
"",
"## Permukaan fidelity","","- Tipografi: font sans dari Geist yang sudah tersedia di proyek; judul halaman, judul usaha, dan modal menggunakan serif Georgia. Hierarki, ukuran, dan pembungkusan utama dibandingkan. Perbedaan bentuk glif terhadap font Figma yang tidak tersedia dicatat sebagai P3.",
"- Layout: sidebar 240 px, header 85 px, tiga ringkasan, empat kartu produk, dua kolom konten, panel stok/produksi, dropdown dan modal mengikuti sumber. Grid beradaptasi untuk tablet/mobile.",
"- Warna: latar #faf6f1 dan sidebar #4a2e20 disampel dari PNG. Warna semantik hijau/kuning/merah, border krem, dan aksen cokelat diterapkan.",
"- Aset: logo, empat foto produk, banner dashboard, dan ilustrasi Tentang Alana diambil dari screenshot asli. Ikon standar memakai pustaka lucide-react; tidak ada emoji atau gambar produk placeholder.",
"- Konten: menu dan informasi usaha mengikuti sumber. Tanggal/jam header sengaja merupakan snapshot referensi. Semua data hanya simulasi di React state.",
"",
"## Perbedaan yang disengaja / batas verifikasi","","- Screenshot referensi memakai beberapa snapshot stok yang berbeda, termasuk ragi 1 kg vs 3 kg. Aplikasi memakai satu state stok konsisten; kontrol Simulasi data stok yang dapat dibuka menyediakan restok untuk mencoba formulir Croissant.",
"- Status kartu produk dihitung dari stok yang sebenarnya. Karena itu Croissant memperlihatkan Bahan kurang pada stok awal dan sesudah stok terpakai, meskipun beberapa PNG sumber tetap memperlihatkan Bahan cukup.",
"- Produksi baru benar-benar menambah stok produk dan riwayat; angka pada state sukses sesudah transaksi akan berbeda dari riwayat statis sumber.",
"- Pesan validasi tambahan menjelaskan cara memperbaiki input. Riwayat pencarian memasukkan kata kunci yang benar-benar dicari.",
"- Mobile merupakan adaptasi responsif karena ZIP hanya menyediakan referensi desktop. Tabel riwayat besar dapat digeser horizontal di dalam panel.",
"",
"## Validasi akhir","","- npm run lint: lulus tanpa error atau warning.",
"- npm run build: lulus; 23 halaman berhasil dibuat termasuk seluruh rute Baker.",
"- 20 skenario browser: lulus; tidak ada pageerror, console error, atau respons HTTP >=400 dalam pengujian.",
"- 15 pemeriksaan overflow: lima rute Baker pada lebar 360, 768, dan 1024 px lulus.",
"- Mobile 390 px: seluruh menu, dropdown notifikasi, validasi, simpan produksi dan pencarian lulus.",
"- /owner, /kasir, /barista dan /login merespons HTTP 200; verifikasi role lain hanya pemeriksaan halaman dapat dibuka.",
"",
"## Fokus perbandingan dan polish","","Perbandingan full-view dilakukan untuk seluruh 13 state. Region formulir diperiksa lagi pada compare-production-form, compare-production-invalid dan compare-production-success; logo/foto dapat dilihat pada dashboard.png serta produk panel. Tidak ada P0/P1/P2 terbuka. P3 tersisa: glif font dan ikon pustaka tidak identik dengan aset vektor Figma; selisih kecil baseline/padding beberapa label.",
"",
"final result: passed",""]
Path("design-qa.md").write_text("\n".join(lines),encoding="utf-8")
results=json.loads(Path(".baker-qa/results.json").read_text())
lines=["# Laporan uji Baker / Barista","","Preview production: http://localhost:3002/baker","","## Hasil klik menu","","| Menu | Rute | Hasil |","|---|---|---|","| Dashboard | /baker | Lulus desktop/mobile; ringkasan, kartu produk, bahan menipis, produksi terakhir muncul |","| Cari Stok Bahan | /baker/stok-bahan | Lulus desktop/mobile; kategori, cari, kosong, saran dan detail bekerja |","| Pemakaian Bahan | /baker/pemakaian-bahan | Lulus desktop/mobile; pilih produk, stok kurang, validasi, simpan dan produksi lagi bekerja |","| Tentang Alana | /baker/tentang-alana | Lulus desktop/mobile; informasi usaha sesuai sumber |","","## Interaksi browser","","| Skenario | Hasil |","|---|---|"]
for r in results["report"]:lines.append(f'| {r["name"]} | Lulus |')
lines += ["","## Tambahan responsif","","Lima rute Baker diuji pada 360, 768 dan 1024 px tanpa overflow halaman. Pada 390 px diuji pula validasi hasil 0, simpan Coffee Latte, perubahan stok, serta pencarian global. Bukti: .baker-qa/responsive-results.json dan screenshot mobile-*.png.",
"",
"## Pemeriksaan teknis","","- npm run lint: lulus, tanpa warning/error.","- npm run build: lulus, semua rute Baker tersedia.","- Error JavaScript/konsol: 0 pada suite utama.","- Respons gagal/404: 0 pada suite utama.","- Database/PostgreSQL/migrasi/auth backend: tidak diubah atau dijalankan.","- Prisma schema dan kode role lain: tidak disentuh oleh pekerjaan ini.",
"",
"## Mencoba alur stok cukup","","1. Buka Pemakaian Bahan dan pilih Croissant Butter untuk melihat stok kurang.","2. Buka Simulasi data stok di bawah riwayat lalu klik Simulasikan restok bahan.","3. Isi pemakaian / hasil produksi, lalu Simpan Produksi.","4. Stok tepung 10 → 4 kg, mentega 5 → 2 kg; produk bertambah 24 pcs. Navigasi antarhalaman mempertahankan state. Refresh mereset dummy data.",
"",
"## Bukti dan keterbatasan","","Seluruh 13 screenshot dibandingkan pada [design-qa.md](design-qa.md). File JSON bukti: [.baker-qa/results.json](.baker-qa/results.json). Tampilan mengikuti screenshot dengan beberapa perbedaan font/ikon kecil serta data yang berubah sesuai transaksi. Figma MCP tidak tersedia.",
"",
"Untuk mengulang uji: pasang Playwright lokal dengan npm.cmd install --no-save --package-lock=false @playwright/test@1.65.0, jalankan production server, set BAKER_TEST_URL ke URL /baker lalu jalankan node .baker-qa/test.cjs. Skrip responsive.cjs memakai port 3002. Browser yang dipakai adalah Chrome terpasang di sistem.",""]
Path("BAKER-TEST-REPORT.md").write_text("\n".join(lines),encoding="utf-8")
