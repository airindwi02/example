# Kasir — QA terhadap 11 screenshot

## Artefak dan normalisasi

- Source visual truth: `.design-reference/kasir/*.png`, 11 screenshot asli `Untitled (1).zip` pada 2880×1800 px.
- Normalisasi: `.design-reference/kasir/normalized/*.png`, downsample 2x ke 1440×900 px. Ukuran layout sumber adalah 1440×900 CSS px, bukan sidebar 480 px.
- Implementasi: `/kasir` dan lima route turunannya yang sudah ada; browser Chrome lokal, viewport 1440×900, deviceScaleFactor 1.
- Tangkapan produksi: `.kasir-qa/01-dashboard.png` sampai `11-search.png`; pemetaan lengkap `.kasir-qa/pairs.json` dan `KASIR-SCREENSHOT-MAP.md`.
- Perbandingan full-view: `comparison-1.png` sampai `comparison-4.png` pada `.kasir-qa/`, sumber di kiri dan implementasi di kanan dalam input gambar yang sama. Kedua sisi diskalakan 50% secara identik.
- Fokus pada kepadatan asli: `focus-cart.png`, `focus-confirm.png`, `focus-success.png`, `focus-products.png`, `focus-notifications.png`.
- Bukti responsif: `responsive-*.png`, `mobile-390-sale-success.png`, `mobile-320-sale-success.png`.

## Riwayat temuan dan perbaikan

| Iterasi | Temuan | Perbaikan dan bukti ulang |
|---|---|---|
| Awal | P1: dashboard/layout generik, menu About tidak di bawah, foto berupa bidang gradien | Shell 240 px, header 85 px, tiga menu utama, About/profil bawah; aset asli dari screenshot. Perbandingan 1, 3, 4 |
| Awal | P1: transaksi belum memperbarui katalog dan riwayat bersama | Satu provider/reducer untuk produk, cart, penjualan dan receipt; suite transaksi membuktikan stok/dashboard/riwayat berubah sekali |
| Awal | P1: konfirmasi/sukses berupa tampilan berbeda dari panel referensi | Tahap edit/konfirmasi/sukses berada di panel kanan halaman Produk Terjual; perbandingan 2–3 |
| Visual pertama | P2: tombol dashboard terlalu lebar | Disesuaikan menjadi 212 px pada desktop; perbandingan 1 hasil ulang |
| Visual pertama | P2: data pembayaran konfirmasi terlalu pucat | Warna readonly/disabled pada konfirmasi dibuat terbaca; `focus-confirm.png` hasil ulang |
| Visual pertama | P2: ritme subtotal/pajak/total menggeser cluster ringkasan | Margin sebelum/sesudah Total diselaraskan tanpa memindahkan kontrol pembayaran dan CTA; `focus-cart.png`, `focus-confirm.png` hasil ulang |
| Responsif | P2: judul Riwayat Penjualan melewati 320 px | Ukuran header layar sempit disesuaikan; 42 pemeriksaan route/viewport diulang dan lulus |

Temuan utama diperbaiki, ditangkap ulang dengan state dan viewport sama, lalu dibandingkan kembali. Build dan lint tidak dihitung sebagai perbandingan visual.

## Lima permukaan fidelity

1. **Font dan tipografi:** serif pada brand/header/About dan sans pada UI; hierarki h2/h3, angka total, harga, label, tabel dan badge diperiksa. Glif belum identik dengan sumber; tersisa P3.
2. **Layout dan jarak:** sidebar/header, tiga kartu ringkasan, empat kartu produk, lebar CTA dashboard, dua kolom 696/400 px, panel pesanan pada y160, formulir dan footer, tabel/detail, dropdown dan modal diperiksa. Pada mobile kolom bertumpuk dan tabel dapat digulir di dalam panel.
3. **Warna dan token:** cokelat-krem-putih, border cokelat kartu produk, stok amber/hijau, error merah, sukses hijau, overlay, dan keadaan disabled mengikuti sumber. Semua selector implementasi memiliki namespace Kasir.
4. **Kualitas aset:** logo, ilustrasi dashboard/About dan empat foto produk memakai crop aset visual asli. Foto produk disimpan dari sumber 2x. Tidak ada gradien placeholder atau gambar tiruan CSS/SVG. Ikon memakai pustaka tersedia; perbedaan bentuk kecil dicatat P3.
5. **Copy dan konten:** nama/harga/stok awal, label, pesan stok, ringkasan, konfirmasi, sukses, About, kontak, dan jam buka mengikuti screenshot. Footer, tanggal filter, nomor unik dan hasil transaksi memakai data yang benar; perbedaan dari sumber yang inkonsisten dijelaskan di `KASIR-REPORT.md` bagian 9.

## Cakupan state dan interaksi

Seluruh 11 state dibandingkan: Dashboard; logout; Produk Terjual kosong; keranjang/pembayaran; stok tidak mencukupi; konfirmasi; sukses/stok berkurang; riwayat/detail; About; dropdown notifikasi; pencarian.

Capture riwayat dilakukan setelah transaksi contoh tersimpan, sehingga receipt dan stok sesuai transaksi yang sama. Tanggal/total/jumlah halaman historis berbeda dari beberapa angka sumber karena filter dan perhitungan benar-benar berjalan. Capture pencarian memakai data awal agar dua hasil `cokelat` sama dengan sumber.

14 kelompok interaksi utama, 5 edge case, dan 9 kelompok navigasi/smoke lulus. 42 pemeriksaan route/viewport lulus, ditambah transaksi penuh pada 390 dan 320 px. Error console/page dan HTTP pada suite produksi kosong. Cetak struk memanggil fungsi print, layout print diperiksa, PDF struk valid dan dapat dibaca. Tidak ada P0/P1/P2 terbuka setelah perbaikan.

## Follow-up P3 dan batas kesamaan

- Font asli dan ikon Figma dapat memperbaiki bentuk glif/baseline.
- Select native dan beberapa border/jarak kecil masih mengikuti browser.
- Highlight kata yang cocok pada hasil pencarian belum identik; isi, jumlah hasil, tab dan tautan sudah benar.
- Riwayat pencarian memasukkan kata kunci terbaru, berbeda dari state daftar lama pada sumber.

Tidak diklaim pixel-perfect. Perbedaan angka akibat data yang konsisten dipisahkan dari penilaian layout.

## Checklist akhir

- [x] Semua 11 screenshot dibuka dan dipetakan.
- [x] Densitas 2x dinormalisasi sebelum perbandingan.
- [x] Semua state ditangkap melalui browser dan dibandingkan berdampingan.
- [x] Region penting diperiksa pada kepadatan asli.
- [x] Temuan P1/P2 diperbaiki dan dibandingkan ulang.
- [x] Transaksi, validasi, stok, riwayat, cetak, pencarian, notifikasi, logout diuji.
- [x] Desktop/tablet/mobile, overflow, serta batas dialog/dropdown diperiksa.
- [x] Lint/build lulus; batas perubahan database/role lain diverifikasi.

final result: passed
