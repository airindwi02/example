# Usulan Permission Matrix: Pesanan Barang

**Status: usulan untuk dikonfirmasi kepada asisten praktikum.** Keputusan sementara pengguna untuk implementasi lokal, bukan persetujuan akademik atau perubahan matriks resmi.

| Fitur | Owner ACTIVE | Daily Worker ACTIVE | Baker/Barista ACTIVE | Kasir ACTIVE |
|---|---|---|---|---|
| Membuat, melihat, dan membatalkan pesanan barang | Diizinkan | Ditolak | Ditolak | Ditolak |
| Melihat pesanan yang masih dapat diterima | Diizinkan | Diizinkan | Ditolak | Ditolak |
| Mencatat penerimaan barang | Ditolak | Diizinkan | Ditolak | Ditolak |

Pemeriksaan role dilakukan di backend pada halaman/action. Penyimpanan pesanan mengunci dan memeriksa ulang akun Owner ACTIVE di transaksi. Penyimpanan penerimaan tetap memakai pemeriksaan Daily Worker ACTIVE yang sudah ada.

## Status dan transisi sementara

- `Dipesan` saat header serta detail berhasil dibuat dalam satu transaksi.
- `Dipesan` → `Diterima Sebagian` ketika penerimaan positif telah dicatat tetapi sekurangnya satu detail belum lengkap.
- `Dipesan` atau `Diterima Sebagian` → `Selesai` hanya jika seluruh jumlah setiap detail sudah diterima.
- `Dipesan` → `Dibatalkan` hanya sebelum ada penerimaan.
- Pesanan `Diterima Sebagian`, `Selesai`, dan `Dibatalkan` tidak dapat dibatalkan.

## Tambahan desain yang perlu diselaraskan dengan Figma

Referensi Owner yang tersedia belum memiliki layar pemesanan. Halaman `/owner/pesanan` ditambahkan sebagai rancangan sementara dengan pola visual Owner yang ada: sidebar, tabel, panel rincian, filter, dan dialog form. Minta konfirmasi apakah tambahan menu/halaman dan susunan field ini sesuai sebelum desain dianggap final.
