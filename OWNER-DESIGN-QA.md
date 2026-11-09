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
