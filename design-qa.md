# Baker design QA

final result: passed

## Sumber dan lingkungan

Referensi utama: seluruh 13 PNG di .design-reference/baker, dari ZIP Untitled (2).zip yang tersedia. Nama ZIP berbeda dari nama kedua di permintaan, tetapi isinya cocok dengan seluruh daftar screenshot. Figma MCP tidak tersedia dan tautan Figma tidak dapat dibuka; tidak ada design context Figma yang diklaim.

Implementasi: Next.js production build pada http://localhost:3002/baker. Chrome melalui Playwright, desktop 1440 × 900 CSS px, deviceScaleFactor 1. Setiap PNG sumber 1440 × 900 px; PNG desktop implementasi 1440 × 900 px. Tidak ada penskalaan dalam perbandingan; gambar gabungan berukuran 2880 × 930 px termasuk label setinggi 30 px. Bukti mobile 390 × 844 CSS px memakai tangkapan full-page.

## Bukti per kondisi

| Sumber visual | Hasil browser | Perbandingan berdampingan | State |
|---|---|---|---|
| [.design-reference/baker/Baker Dashboard.png](<.design-reference/baker/Baker Dashboard.png>) | [dashboard.png](.baker-qa/dashboard.png) | [compare-dashboard.jpg](.baker-qa/compare-dashboard.jpg) | Dashboard awal |
| [.design-reference/baker/Baker Dashboard-1.png](<.design-reference/baker/Baker Dashboard-1.png>) | [logout.png](.baker-qa/logout.png) | [compare-logout.jpg](.baker-qa/compare-logout.jpg) | Modal konfirmasi keluar di atas dashboard awal |
| [.design-reference/baker/Baker Cari Stok Bahan.png](<.design-reference/baker/Baker Cari Stok Bahan.png>) | [stock.png](.baker-qa/stock.png) | [compare-stock.jpg](.baker-qa/compare-stock.jpg) | Pencarian awal dan kategori |
| [.design-reference/baker/Baker Barang Tidak Ditemukan.png](<.design-reference/baker/Baker Barang Tidak Ditemukan.png>) | [stock-empty.png](.baker-qa/stock-empty.png) | [compare-stock-empty.jpg](.baker-qa/compare-stock-empty.jpg) | Pencarian Tepungg tanpa hasil dan saran |
| [.design-reference/baker/Baker Jumlah Kondisi Stok.png](<.design-reference/baker/Baker Jumlah Kondisi Stok.png>) | [stock-detail.png](.baker-qa/stock-detail.png) | [compare-stock-detail.jpg](.baker-qa/compare-stock-detail.jpg) | Pencarian Tepung dan detail Tepung Terigu |
| [.design-reference/baker/Baker Pemakaian Pilih Produk.png](<.design-reference/baker/Baker Pemakaian Pilih Produk.png>) | [production-select.png](.baker-qa/production-select.png) | [compare-production-select.jpg](.baker-qa/compare-production-select.jpg) | Pemilihan produk |
| [.design-reference/baker/Baker Pemakaian Bahan Kurang.png](<.design-reference/baker/Baker Pemakaian Bahan Kurang.png>) | [production-shortage.png](.baker-qa/production-shortage.png) | [compare-production-shortage.jpg](.baker-qa/compare-production-shortage.jpg) | Croissant dengan stok awal kurang |
| [.design-reference/baker/Baker Pemakaian Isi Hasil Produksi.png](<.design-reference/baker/Baker Pemakaian Isi Hasil Produksi.png>) | [production-form.png](.baker-qa/production-form.png) | [compare-production-form.jpg](.baker-qa/compare-production-form.jpg) | Croissant setelah restok simulasi |
| [.design-reference/baker/Baker Pemakaian Data Tidak Valid.png](<.design-reference/baker/Baker Pemakaian Data Tidak Valid.png>) | [production-invalid.png](.baker-qa/production-invalid.png) | [compare-production-invalid.jpg](.baker-qa/compare-production-invalid.jpg) | Tepung 12 kg dan hasil kosong |
| [.design-reference/baker/Baker Pemakaian Konfirmasi Stok Terbaru.png](<.design-reference/baker/Baker Pemakaian Konfirmasi Stok Terbaru.png>) | [production-success.png](.baker-qa/production-success.png) | [compare-production-success.jpg](.baker-qa/compare-production-success.jpg) | Hasil 24 pcs dan perubahan stok |
| [.design-reference/baker/Baker Tentang Alana.png](<.design-reference/baker/Baker Tentang Alana.png>) | [about.png](.baker-qa/about.png) | [compare-about.jpg](.baker-qa/compare-about.jpg) | Informasi usaha |
| [.design-reference/baker/Baker Notifikasi Dropdown.png](<.design-reference/baker/Baker Notifikasi Dropdown.png>) | [notifications.png](.baker-qa/notifications.png) | [compare-notifications.jpg](.baker-qa/compare-notifications.jpg) | Dropdown tiga notifikasi awal |
| [.design-reference/baker/Baker Pencarian.png](<.design-reference/baker/Baker Pencarian.png>) | [search.png](.baker-qa/search.png) | [compare-search.jpg](.baker-qa/compare-search.jpg) | Pencarian cokelat dengan dua hasil |

## Riwayat perbaikan

1. P1: gambar belum termuat pada tangkapan pertama. Capture kini menunggu document.fonts.ready dan img.decode(); bukti final menampilkan semua gambar asli.
2. P1: karakter UTF-8 rusak akibat pembacaan encoding Windows. File diperbaiki, judul dan tanda baca diverifikasi lewat DOM browser.
3. P2: lebar kolom tabel dashboard/stok dan tinggi baris formulir menyimpang. Kolom disesuaikan dan padding baris dikurangi; compare-stock, compare-dashboard, compare-production-form menunjukkan hasil akhir.
4. P2: teks riwayat setelah produksi mendorong lebar tabel. Riwayat memakai lebar kolom tetap, ellipsis untuk teks panjang, dan scroll internal pada viewport sempit; compare-production-success dan mobile-production-success menunjukkan hasil akhir.
5. P2: kondisi tanpa hasil masih menampilkan filter sehingga tabel bergeser. Filter disembunyikan pada state tanpa hasil sesuai sumber; compare-stock-empty menunjukkan hasil akhir.
6. P2: snapshot mobile menangkap sidebar saat transisi. Transisi mobile dihilangkan dan capture menonaktifkan animasi; mobile-dashboard menunjukkan tidak ada sisi sidebar yang tertinggal.

## Permukaan fidelity

- Tipografi: font sans dari Geist yang sudah tersedia di proyek; judul halaman, judul usaha, dan modal menggunakan serif Georgia. Hierarki, ukuran, dan pembungkusan utama dibandingkan. Perbedaan bentuk glif terhadap font Figma yang tidak tersedia dicatat sebagai P3.
- Layout: sidebar 240 px, header 85 px, tiga ringkasan, empat kartu produk, dua kolom konten, panel stok/produksi, dropdown dan modal mengikuti sumber. Grid beradaptasi untuk tablet/mobile.
- Warna: latar #faf6f1 dan sidebar #4a2e20 disampel dari PNG. Warna semantik hijau/kuning/merah, border krem, dan aksen cokelat diterapkan.
- Aset: logo, empat foto produk, banner dashboard, dan ilustrasi Tentang Alana diambil dari screenshot asli. Ikon standar memakai pustaka lucide-react; tidak ada emoji atau gambar produk placeholder.
- Konten: menu dan informasi usaha mengikuti sumber. Tanggal/jam header sengaja merupakan snapshot referensi. Semua data hanya simulasi di React state.

## Perbedaan yang disengaja / batas verifikasi

- Screenshot referensi memakai beberapa snapshot stok yang berbeda, termasuk ragi 1 kg vs 3 kg. Aplikasi memakai satu state stok konsisten; kontrol Simulasi data stok yang dapat dibuka menyediakan restok untuk mencoba formulir Croissant.
- Status kartu produk dihitung dari stok yang sebenarnya. Karena itu Croissant memperlihatkan Bahan kurang pada stok awal dan sesudah stok terpakai, meskipun beberapa PNG sumber tetap memperlihatkan Bahan cukup.
- Produksi baru benar-benar menambah stok produk dan riwayat; angka pada state sukses sesudah transaksi akan berbeda dari riwayat statis sumber.
- Pesan validasi tambahan menjelaskan cara memperbaiki input. Riwayat pencarian memasukkan kata kunci yang benar-benar dicari.
- Mobile merupakan adaptasi responsif karena ZIP hanya menyediakan referensi desktop. Tabel riwayat besar dapat digeser horizontal di dalam panel.

## Validasi akhir

- npm run lint: lulus tanpa error atau warning.
- npm run build: lulus; 23 halaman berhasil dibuat termasuk seluruh rute Baker.
- 20 skenario browser: lulus; tidak ada pageerror, console error, atau respons HTTP >=400 dalam pengujian.
- 15 pemeriksaan overflow: lima rute Baker pada lebar 360, 768, dan 1024 px lulus.
- Mobile 390 px: seluruh menu, dropdown notifikasi, validasi, simpan produksi dan pencarian lulus.
- /owner, /kasir, /barista dan /login merespons HTTP 200; verifikasi role lain hanya pemeriksaan halaman dapat dibuka.

## Fokus perbandingan dan polish

Perbandingan full-view dilakukan untuk seluruh 13 state. Region formulir diperiksa lagi pada compare-production-form, compare-production-invalid dan compare-production-success; logo/foto dapat dilihat pada dashboard.png serta produk panel. Tidak ada P0/P1/P2 terbuka. P3 tersisa: glif font dan ikon pustaka tidak identik dengan aset vektor Figma; selisih kecil baseline/padding beberapa label.

final result: passed

<!-- DAILY-WORKER-QA -->
# Daily Worker — QA visual

final result: passed

## Referensi dan normalisasi

Sumber: seluruh 23 PNG dari `Untitled (3).zip`, diekstrak ke `.design-reference/daily-worker/`. Figma MCP tidak tersedia; tidak ada design context Figma yang diklaim.

Semua sumber berukuran 2880 × 1800 px dan dinormalisasi 0,5× menjadi 1440 × 900 px. Browser: Chrome melalui Playwright, viewport 1440 × 900 CSS px, DPR 1. Screenshot menunggu font dan gambar termuat. Perbandingan menyatukan sumber dan hasil browser pada skala yang sama, dengan label 28 px di atas gambar.

Implementasi production yang diverifikasi: http://127.0.0.1:3006/daily-worker.

## Bukti seluruh kondisi

| Screenshot sumber | State browser | Ukuran hasil | Perbandingan |
|---|---|---|---|
| [Worker Dashboard.png](<.design-reference/daily-worker/Worker Dashboard.png>) | [dashboard](.worker-qa/dashboard.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-dashboard.jpg) |
| [Worker Dashboard-1.png](<.design-reference/daily-worker/Worker Dashboard-1.png>) | [logout](.worker-qa/logout.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-logout.jpg) |
| [Worker Notifikasi Dropdown.png](<.design-reference/daily-worker/Worker Notifikasi Dropdown.png>) | [notifications](.worker-qa/notifications.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-notifications.jpg) |
| [Worker Penerimaan Form.png](<.design-reference/daily-worker/Worker Penerimaan Form.png>) | [receiving-form](.worker-qa/receiving-form.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-receiving-form.jpg) |
| [Worker Penerimaan Isian Diperbaiki.png](<.design-reference/daily-worker/Worker Penerimaan Isian Diperbaiki.png>) | [receiving-error](.worker-qa/receiving-error.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-receiving-error.jpg) |
| [Worker Penerimaan Berhasil.png](<.design-reference/daily-worker/Worker Penerimaan Berhasil.png>) | [receiving-success](.worker-qa/receiving-success.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-receiving-success.jpg) |
| [Worker Stok Barang Pilih Barang.png](<.design-reference/daily-worker/Worker Stok Barang Pilih Barang.png>) | [stock-empty](.worker-qa/stock-empty.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-stock-empty.jpg) |
| [Worker Stok Barang Jumlah Terpilih.png](<.design-reference/daily-worker/Worker Stok Barang Jumlah Terpilih.png>) | [stock-selected](.worker-qa/stock-selected.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-stock-selected.jpg) |
| [Worker Kadaluwarsa Daftar.png](<.design-reference/daily-worker/Worker Kadaluwarsa Daftar.png>) | [expiry-list](.worker-qa/expiry-list.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-expiry-list.jpg) |
| [Worker Kadaluwarsa Sesuaikan Stok.png](<.design-reference/daily-worker/Worker Kadaluwarsa Sesuaikan Stok.png>) | [expiry-form](.worker-qa/expiry-form.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-expiry-form.jpg) |
| [Worker Kadaluwarsa Sesuaikan Stok-1.png](<.design-reference/daily-worker/Worker Kadaluwarsa Sesuaikan Stok-1.png>) | [expiry-success](.worker-qa/expiry-success.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-expiry-success.jpg) |
| [Worker Kadaluwarsa Kosong.png](<.design-reference/daily-worker/Worker Kadaluwarsa Kosong.png>) | [expiry-empty](.worker-qa/expiry-empty.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-expiry-empty.jpg) |
| [Worker Pemeriksaan Pilih Barang.png](<.design-reference/daily-worker/Worker Pemeriksaan Pilih Barang.png>) | [inspection-empty](.worker-qa/inspection-empty.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-inspection-empty.jpg) |
| [Worker Pemeriksaan Masukkan Stok Aktual.png](<.design-reference/daily-worker/Worker Pemeriksaan Masukkan Stok Aktual.png>) | [inspection-form](.worker-qa/inspection-form.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-inspection-form.jpg) |
| [Worker Pemeriksaan Isian Diperbaiki.png](<.design-reference/daily-worker/Worker Pemeriksaan Isian Diperbaiki.png>) | [inspection-error](.worker-qa/inspection-error.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-inspection-error.jpg) |
| [Worker Pemeriksaan Data Tersimpan.png](<.design-reference/daily-worker/Worker Pemeriksaan Data Tersimpan.png>) | [inspection-success](.worker-qa/inspection-success.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-inspection-success.jpg) |
| [Worker Penyesuaian Form Hasil Hitung.png](<.design-reference/daily-worker/Worker Penyesuaian Form Hasil Hitung.png>) | [adjustment-form](.worker-qa/adjustment-form.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-adjustment-form.jpg) |
| [Worker Penyesuaian Koreksi Jumlah.png](<.design-reference/daily-worker/Worker Penyesuaian Koreksi Jumlah.png>) | [adjustment-error](.worker-qa/adjustment-error.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-adjustment-error.jpg) |
| [Worker Penyesuaian Ada Selisih Catat.png](<.design-reference/daily-worker/Worker Penyesuaian Ada Selisih Catat.png>) | [adjustment-difference](.worker-qa/adjustment-difference.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-adjustment-difference.jpg) |
| [Penyesuaian Stok Dipertahankan.png](<.design-reference/daily-worker/Penyesuaian Stok Dipertahankan.png>) | [adjustment-equal](.worker-qa/adjustment-equal.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-adjustment-equal.jpg) |
| [Penyesuaian Hasil Tersimpan.png](<.design-reference/daily-worker/Penyesuaian Hasil Tersimpan.png>) | [adjustment-success](.worker-qa/adjustment-success.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-adjustment-success.jpg) |
| [Worker Tentang Alana.png](<.design-reference/daily-worker/Worker Tentang Alana.png>) | [about](.worker-qa/about.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-about.jpg) |
| [Worker Pencarian.png](<.design-reference/daily-worker/Worker Pencarian.png>) | [search](.worker-qa/search.png) | 1440 × 900 | [Berdampingan](.worker-qa/compare-search.jpg) |

## Hasil pemeriksaan fidelity

- Tipografi: sans Geist yang sudah tersedia di proyek dan judul serif Georgia. Hierarki, bobot, ukuran, wrapping, dan kepadatan dibandingkan; bentuk glif tidak dijamin identik dengan font Figma yang tidak tersedia.
- Layout: sidebar 240 px, header 85 px, ringkasan tugas Daily Worker, tabel tindakan/aktivitas, empat pintasan, form dan panel informasi. Dashboard tidak memakai kartu produksi Baker.
- Warna: cokelat, krem, putih, border, aksen kuning, serta status merah/hijau/biru mengikuti PNG. Semua CSS berada dalam namespace Daily Worker.
- Aset: logo, banner, dan ilustrasi usaha dipotong dari gambar sumber asli. Ikon UI memakai pustaka yang sudah terpasang; tidak menggambar ulang foto atau logo.
- Copy: tujuh menu, heading halaman, label input, alasan penyesuaian, informasi usaha, dan konfirmasi mengikuti sumber. Validasi tambahan melindungi stok demo.

## Riwayat temuan dan perbaikan

1. [P2, diperbaiki] Panel stok terlalu tinggi dan jarak formulir/dropdown menyimpang. Padding, tinggi pesan, ukuran tombol, dan baris riwayat diselaraskan. Bukti final: compare-stock-selected, compare-receiving-error, compare-notifications.
2. [P2, diperbaiki] Banner sukses menggeser empty state kadaluwarsa. Banner dipindahkan ke bawah daftar pemantauan. Bukti final: compare-expiry-empty.
3. [P1, diperbaiki] Pengurangan parsial perlu dapat dilanjutkan pada batch yang sama. Pemilihan ulang mereset form menggunakan revisi seleksi; pengujian membuktikan 3 → 2 → 0 L tanpa pencatatan ganda. Bukti: edge-results.json.
4. [P2, diperbaiki] Area klik penutup menu mobile berada di bawah sidebar. Area penutup diposisikan di luar sidebar dan menu dapat digulir pada viewport pendek. Bukti: responsive-results.json dan edge-results.json.
5. [P2, diperbaiki] Modal keluar terpotong di kanan pada mobile meskipun lebar dokumen tidak overflow. Grid modal dan max-width diperbaiki; tes kini memeriksa seluruh dialog berada di viewport. Bukti final: mobile-logout.png dan kedua suite responsif/edge.

## Perbedaan yang disengaja dan batas fidelity

- Data menggunakan satu state konsisten. Setelah transaksi, stok, tanggal terakhir masuk, status pemeriksaan, riwayat, aktivitas, dan jumlah peringatan benar-benar berubah; beberapa PNG sumber memperlihatkan data lama pada state sukses.
- Preview penerimaan kosong tidak menambahkan 20 kg secara implisit: 15 kg tetap 15 kg sampai jumlah diisi. Ini berbeda dari panel contoh pada PNG kosong yang sudah menampilkan 35 kg.
- Tombol simpan terkunci sesudah sukses untuk mencegah pencatatan ganda. Pemeriksaan/penyesuaian memiliki tombol melanjutkan ke barang lain; penerimaan menyediakan catat lagi/reset.
- Tanggal kadaluwarsa Cokelat memakai 15/11/2026 secara konsisten dengan daftar 30 hari; screenshot pencarian memakai tanggal berbeda. Jumlah barang perlu cek dihitung dari tabel, bukan menyalin angka notifikasi yang berbeda.
- Header memakai tanggal/jam snapshot 22 Oktober 2026 untuk mencocokkan referensi. Katalog 248 barang dan seluruh riwayat adalah dummy.
- Mobile/tablet merupakan adaptasi responsif dari referensi desktop. Tabel lebar memiliki scroll internal agar kolom tidak dipaksa mengecil.

## Sisa polish P3

Bentuk ikon pustaka dan glif font belum identik dengan aset Figma; beberapa baseline/padding label, posisi isi panel kosong Stok Barang, dan jarak kecil pada daftar pencarian masih berbeda. Tidak ada temuan P0/P1/P2 terbuka setelah perbaikan.

## Verifikasi interaksi dan responsif

Seluruh 23 state dibandingkan full-view. Region form diperiksa pada receiving-error/success, inspection-error/success, dan adjustment-difference/success; modal, dropdown, dan panel stok juga dibandingkan sebagai region fokus melalui gambar berdampingan yang sama.

Empat tahap form/navigation dan suite edge menyimpan 54 pemeriksaan fungsi yang lulus. Suite menyeluruh memiliki 14 kelompok uji; termasuk 32 pemeriksaan rute/viewport pada 360, 390, 768, dan 1024 px, tujuh menu desktop/mobile, semua pintasan/tindakan dashboard, pagination sampai halaman terakhir, form mobile, dan smoke test 10 rute sebelumnya. Ukuran konten diperiksa setelah heading dan font termuat.

Console/page errors: 0. Respons HTTP >= 400 dalam suite menyeluruh: 0. Dialog keluar dan dropdown notifikasi diuji tetap seluruhnya berada dalam viewport. Mobile pendek 390 × 500 juga lulus.

Bukti: `.worker-qa/stage1-results.json` hingga `stage4-results.json`, `responsive-results.json`, `edge-results.json`, `captures.json`, screenshot `mobile-*.png` dan `responsive-*.png`.

final result: passed


---

# Owner - 26 reference states

# Owner — QA implementasi terhadap 26 screenshot

## Artefak dan normalisasi

- Sumber visual: `.design-reference/owner/*.png`, hasil ekstraksi `Untitled.zip`, 26 PNG 1440×900.
- Pemetaan state: `OWNER-SCREENSHOT-MAP.md`.
- Implementasi: `/owner` dan turunannya; screenshot produksi `.owner-qa/01-dashboard.png` sampai `26-search.png` (nama lengkap pada `.owner-qa/pairs.json`).
- Viewport CSS: 1440×900; deviceScaleFactor 1. Sumber dan tangkapan sama-sama 1440×900, tanpa browser chrome.
- Perbandingan full-view: `.owner-qa/comparison-1.png` sampai `comparison-9.png`. Setiap baris menempatkan sumber di kiri dan implementasi di kanan pada skala 50% yang sama; ini mencakup seluruh 26 state.
- Pemeriksaan detail pada kepadatan asli: `.owner-qa/focus-form.png`, `focus-export.png`, `focus-header.png`.
- Responsif: screenshot `responsive-*.png`; hasil mesin `responsive-results.json`.

## Riwayat temuan dan perbaikan

| Iterasi | Temuan | Perbaikan dan bukti akhir |
|---|---|---|
| Awal | P1: sidebar/header generik dan halaman detail readonly tidak mengikuti alur | Satu shell Owner, state bersama, route lama dipertahankan, panel/tab/modal sesuai klasifikasi sumber. Perbandingan 1–9 |
| Pertama | P2: kolom Satuan tambahan pada Bahan Baku mengubah kepadatan tabel | Dikembalikan ke Nama Bahan/Kategori/Stok/Batas Min./Aksi; perbandingan 1 dan 3 |
| Pertama | P2: label/input form turun terlalu jauh, tombol footer terlalu tinggi | Ritme label/input dan grid tombol diselaraskan, footer di dasar panel; `focus-form.png` dan perbandingan 3 |
| Pertama | P2: tombol Hapus berwarna cokelat dan konfirmasi terlalu rendah | Tindakan destruktif merah, ikon X dan penempatan panel mengikuti sumber; perbandingan 4 |
| Pertama | P2: judul modal ekspor serif rata tengah berbeda dari sumber | Sans tebal, teks rata kiri, dimensi dan posisi kanan atas diperbaiki; `focus-export.png` dan perbandingan 6 |
| Pertama | P2: judul/kartu laporan, angka bertanda tambahan, dan satuan mengubah tampilan | Kartu dan tabel diselaraskan; angka tetap dihitung dari ledger valid; perbandingan 5–6 |
| Responsif | P2: filter riwayat melampaui layar 320 px | Filter membungkus; 56 pemeriksaan route/viewport ulang lulus |
| Berikutnya | P2: hierarki empty state dan tabel stok sehat belum lengkap | Posisi isi empty state disesuaikan, kolom Status/Aman dan satuan selisih ditambahkan; perbandingan 7 |

Semua temuan di atas diperbaiki, ditangkap ulang pada state/viewport yang sama, lalu dibandingkan kembali. Build/lint bukan pengganti perbandingan visual.

## Lima permukaan fidelity

1. **Font dan tipografi:** heading shell/brand/about memakai serif, konten memakai sans aplikasi; judul, label, tabel, dan hierarki berat font diperiksa. Glif belum identik dengan sumber; tersisa sebagai P3.
2. **Layout dan jarak:** sidebar 240 px, header 85 px, konten mulai x272, kolom utama/detail 696/400 px pada viewport sumber, kartu dan tabel, serta form/footer diperiksa. Perubahan kecil antialiasing dan baseline masih ada; tidak mengubah kepadatan atau menyembunyikan kontrol.
3. **Warna dan token:** cokelat sidebar, krem latar, putih panel, garis krem, badge amber/merah/hijau/biru, overlay, dan tombol destruktif dipetakan melalui CSS Owner. CSS tidak mengubah role lain.
4. **Kualitas aset:** logo, banner dashboard, ilustrasi Tentang Alana, dan foto croissant diambil dari aset visual asli dalam screenshot. Bukan gambar placeholder atau aproksimasi CSS/SVG. Ikon UI memakai pustaka yang sudah tersedia; bentuknya merupakan perbedaan P3.
5. **Copy dan konten:** menu, judul, profil usaha, visi/misi, jam buka, kontak, pesan validasi, konfirmasi, dan toast mengikuti referensi. Angka demo, tanggal file, footer, serta hasil perubahan data dihitung secara benar; rincian perbedaan ada di `OWNER-REPORT.md` bagian 8.

## State, interaksi, dan pengecualian yang dijelaskan

Dashboard/logout; empat tab Master Data; tambah/ubah/invalid/detail/hapus/simpan; lima state laporan; dua state stok; dua state masing-masing riwayat; About; notifikasi; dan pencarian telah dibandingkan.

Capture empty state riwayat memakai kata kunci tanpa hasil, sehingga input berisi kata kunci, sementara sumber kosong. Capture stok sehat memakai perubahan minimum melalui form; badge notifikasi ikut berubah karena peringatan data sudah selesai. Ini perbedaan state data yang terjelaskan, bukan tombol simulasi tambahan.

Laporan mempertahankan aritmetika valid dan total sesuai lima baris; jumlah data riwayat/satuan/pemasok sesuai record sebenarnya. Angka yang saling bertentangan dalam screenshot tidak disalin sebagai data palsu. Tidak diklaim pixel-perfect.

Suite produksi mencatat 16 kelompok interaksi lulus, 56 pemeriksaan route/viewport lulus, tidak ada console/page error atau HTTP error. Enam kelompok tambahan di localhost:3000 memeriksa seluruh pintasan, filter, error ekspor, minimum negatif, dan keyboard. PDF sungguh diunduh dan dibaca oleh pembaca independen. Tidak ada P0/P1/P2 terbuka setelah perbaikan.

## Follow-up P3

- Font asli Figma dan ikon sumber dapat meningkatkan kesamaan glif/baseline.
- Select dan date picker masih memakai kontrol native yang tampilannya mengikuti browser.
- Beberapa jarak label dan border tombol berbeda beberapa piksel.

## Checklist akhir

- [x] Seluruh 26 sumber dibuka dan dipetakan.
- [x] Seluruh 26 state ditangkap pada 1440×900 dan dibandingkan berdampingan.
- [x] Region form, modal ekspor, header diperiksa pada kepadatan asli.
- [x] Temuan utama diperbaiki dan dibandingkan ulang.
- [x] Navigasi dan interaksi diuji di browser, termasuk hasil unduhan.
- [x] Desktop/tablet/mobile dan batas viewport modal/dropdown diperiksa.
- [x] Lint dan build lulus; batas perubahan role/database diverifikasi dengan hash.

final result: passed


---

# Kasir - 11 reference states

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
