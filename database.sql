-- 1. PENGGUNA
CREATE TABLE IF NOT EXISTS public.pengguna (
    id_pengguna           VARCHAR(10) NOT NULL,
    nama_pengguna         VARCHAR(50) NOT NULL,
    username              VARCHAR(20) NOT NULL,
    password_hash         VARCHAR(255) NOT NULL,
    peran                 VARCHAR(20) NOT NULL,
    CONSTRAINT pk_pengguna PRIMARY KEY (id_pengguna),
    CONSTRAINT uq_pengguna_username UNIQUE (username)
);

select * from public.pengguna;

-- 2. PEMASOK
CREATE TABLE IF NOT EXISTS public.pemasok (
    id_pemasok            VARCHAR(10) NOT NULL,
    nama_pemasok          VARCHAR(50) NOT NULL,
    telepon               VARCHAR(20) NOT NULL,
    alamat                VARCHAR(255),
    CONSTRAINT pk_pemasok PRIMARY KEY (id_pemasok)
);

select * from public.pemasok;

-- 3. BARANG
CREATE TABLE IF NOT EXISTS public.barang (
    id_barang             VARCHAR(10) NOT NULL,
    nama_barang           VARCHAR(50) NOT NULL,
    satuan                VARCHAR(10) NOT NULL,
    jenis_barang          VARCHAR(15) NOT NULL,
    stok_minimum          NUMERIC(10,2) NOT NULL,
    stok_saat_ini         NUMERIC(10,2) NOT NULL,
    CONSTRAINT pk_barang PRIMARY KEY (id_barang)
);

select * from public.barang;

-- 4. PEMESANAN BARANG
CREATE TABLE IF NOT EXISTS public.pemesanan_barang (
    id_pemesanan          VARCHAR(15) NOT NULL,
    id_pemasok            VARCHAR(10) NOT NULL,
    id_pengguna           VARCHAR(10) NOT NULL,
    tanggal_pemesanan     DATE NOT NULL,
    tanggal_estimasi      DATE NOT NULL,
    status_pemesanan      VARCHAR(20) NOT NULL,
    catatan               VARCHAR(255),
    CONSTRAINT pk_pemesanan_barang PRIMARY KEY (id_pemesanan),
    CONSTRAINT fk_pemesanan_barang_id_pemasok FOREIGN KEY (id_pemasok) REFERENCES public.pemasok (id_pemasok),
    CONSTRAINT fk_pemesanan_barang_id_pengguna FOREIGN KEY (id_pengguna) REFERENCES public.pengguna (id_pengguna)
);

select * from public.pemesanan_barang;

-- 5. DETAIL PESANAN
CREATE TABLE IF NOT EXISTS public.detail_pesanan (
    id_pemesanan          VARCHAR(15) NOT NULL,
    id_barang             VARCHAR(10) NOT NULL,
    jumlah_dipesan        NUMERIC(10,2) NOT NULL,
    harga_pesan           NUMERIC(12,2) NOT NULL,
    CONSTRAINT pk_detail_pesanan PRIMARY KEY (id_pemesanan, id_barang),
    CONSTRAINT fk_detail_pesanan_id_pemesanan FOREIGN KEY (id_pemesanan) REFERENCES public.pemesanan_barang (id_pemesanan),
    CONSTRAINT fk_detail_pesanan_id_barang FOREIGN KEY (id_barang) REFERENCES public.barang (id_barang)
);

select * from public.detail_pesanan;

-- 6. BARANG MASUK
CREATE TABLE IF NOT EXISTS public.barang_masuk (
    id_penerimaan         VARCHAR(15) NOT NULL,
    id_pemesanan          VARCHAR(15) NOT NULL,
    id_pemasok            VARCHAR(10) NOT NULL,
    id_pengguna           VARCHAR(10) NOT NULL,
    tanggal_terima        DATE NOT NULL,
    status_penerimaan     VARCHAR(10) NOT NULL,
    alasan_penolakan      VARCHAR(255),
    CONSTRAINT pk_barang_masuk PRIMARY KEY (id_penerimaan),
    CONSTRAINT fk_barang_masuk_id_pemesanan FOREIGN KEY (id_pemesanan) REFERENCES public.pemesanan_barang (id_pemesanan),
    CONSTRAINT fk_barang_masuk_id_pemasok FOREIGN KEY (id_pemasok) REFERENCES public.pemasok (id_pemasok),
    CONSTRAINT fk_barang_masuk_id_pengguna FOREIGN KEY (id_pengguna) REFERENCES public.pengguna (id_pengguna)
);

select * from public.barang_masuk;

-- 7. DETAIL BARANG MASUK
CREATE TABLE IF NOT EXISTS public.detail_barang_masuk (
    id_detail_masuk       VARCHAR(15) NOT NULL,
    id_penerimaan         VARCHAR(15) NOT NULL,
    id_barang             VARCHAR(10) NOT NULL,
    jumlah_dikirim        NUMERIC(10,2) NOT NULL,
    jumlah_diterima       NUMERIC(10,2) NOT NULL,
    tanggal_kedaluwarsa   DATE,
    kondisi               VARCHAR(20) NOT NULL,
    CONSTRAINT pk_detail_barang_masuk PRIMARY KEY (id_detail_masuk),
    CONSTRAINT fk_detail_barang_masuk_id_penerimaan FOREIGN KEY (id_penerimaan) REFERENCES public.barang_masuk (id_penerimaan),
    CONSTRAINT fk_detail_barang_masuk_id_barang FOREIGN KEY (id_barang) REFERENCES public.barang (id_barang)
);

select * from public.detail_barang_masuk;

-- 8. BARANG DIPAKAI
CREATE TABLE IF NOT EXISTS public.barang_dipakai (
    id_pemakaian          VARCHAR(15) NOT NULL,
    id_pengguna           VARCHAR(10) NOT NULL,
    id_produk_hasil       VARCHAR(10) NOT NULL,
    tanggal               DATE NOT NULL,
    jenis_keluar          VARCHAR(20) NOT NULL,
    jumlah_hasil          NUMERIC(10,2) NOT NULL,
    status_produksi       VARCHAR(10) NOT NULL,
    alasan_gagal          VARCHAR(255),
    CONSTRAINT pk_barang_dipakai PRIMARY KEY (id_pemakaian),
    CONSTRAINT fk_barang_dipakai_id_pengguna FOREIGN KEY (id_pengguna) REFERENCES public.pengguna (id_pengguna),
    CONSTRAINT fk_barang_dipakai_id_produk_hasil FOREIGN KEY (id_produk_hasil) REFERENCES public.barang (id_barang)
);

select * from public.barang_dipakai;

-- 9. DETAIL BARANG DIPAKAI
CREATE TABLE IF NOT EXISTS public.detail_barang_dipakai (
    id_pemakaian          VARCHAR(15) NOT NULL,
    id_detail_masuk       VARCHAR(15) NOT NULL,
    id_barang             VARCHAR(10) NOT NULL,
    jumlah_diminta        NUMERIC(10,2) NOT NULL,
    stok_tersedia         NUMERIC(10,2) NOT NULL,
    jumlah_dipakai        NUMERIC(10,2) NOT NULL,
    CONSTRAINT pk_detail_barang_dipakai PRIMARY KEY (id_pemakaian, id_detail_masuk),
    CONSTRAINT fk_detail_barang_dipakai_id_pemakaian FOREIGN KEY (id_pemakaian) REFERENCES public.barang_dipakai (id_pemakaian),
    CONSTRAINT fk_detail_barang_dipakai_id_detail_masuk FOREIGN KEY (id_detail_masuk) REFERENCES public.detail_barang_masuk (id_detail_masuk),
    CONSTRAINT fk_detail_barang_dipakai_id_barang FOREIGN KEY (id_barang) REFERENCES public.barang (id_barang)
);

select * from public.detail_barang_dipakai;

-- 10. TRANSAKSI
CREATE TABLE IF NOT EXISTS public.transaksi (
    id_transaksi          VARCHAR(15) NOT NULL,
    id_pengguna           VARCHAR(10) NOT NULL,
    tanggal               DATE NOT NULL,
    status_transaksi      VARCHAR(10) NOT NULL,
    alasan_gagal          VARCHAR(255),
    CONSTRAINT pk_transaksi PRIMARY KEY (id_transaksi),
    CONSTRAINT fk_transaksi_id_pengguna FOREIGN KEY (id_pengguna) REFERENCES public.pengguna (id_pengguna)
);

select * from public.transaksi;

-- 11. DETAIL TRANSAKSI
CREATE TABLE IF NOT EXISTS public.detail_transaksi (
    id_transaksi          VARCHAR(15) NOT NULL,
    id_barang             VARCHAR(10) NOT NULL,
    jumlah_dipesan        NUMERIC(10,2) NOT NULL,
    stok_tersedia         NUMERIC(10,2) NOT NULL,
    jumlah_terjual        NUMERIC(10,2) NOT NULL,
    harga                 NUMERIC(12,2) NOT NULL,
    CONSTRAINT pk_detail_transaksi PRIMARY KEY (id_transaksi, id_barang),
    CONSTRAINT fk_detail_transaksi_id_transaksi FOREIGN KEY (id_transaksi) REFERENCES public.transaksi (id_transaksi),
    CONSTRAINT fk_detail_transaksi_id_barang FOREIGN KEY (id_barang) REFERENCES public.barang (id_barang)
);

select * from public.detail_transaksi;

-- 12. PEMERIKSAAN STOK
CREATE TABLE IF NOT EXISTS public.pemeriksaan_stok (
    id_pemeriksaan        VARCHAR(15) NOT NULL,
    id_pengguna           VARCHAR(10) NOT NULL,
    tanggal               DATE NOT NULL,
    CONSTRAINT pk_pemeriksaan_stok PRIMARY KEY (id_pemeriksaan),
    CONSTRAINT fk_pemeriksaan_stok_id_pengguna FOREIGN KEY (id_pengguna) REFERENCES public.pengguna (id_pengguna)
);

select * from public.pemeriksaan_stok;

-- 13. DETAIL PEMERIKSAAN
CREATE TABLE IF NOT EXISTS public.detail_pemeriksaan (
    id_pemeriksaan        VARCHAR(15) NOT NULL,
    id_barang             VARCHAR(10) NOT NULL,
    stok_sistem           NUMERIC(10,2) NOT NULL,
    stok_fisik            NUMERIC(10,2) NOT NULL,
    kondisi_fisik         VARCHAR(30) NOT NULL,
    tindak_lanjut         VARCHAR(30),
    CONSTRAINT pk_detail_pemeriksaan PRIMARY KEY (id_pemeriksaan, id_barang),
    CONSTRAINT fk_detail_pemeriksaan_id_pemeriksaan FOREIGN KEY (id_pemeriksaan) REFERENCES public.pemeriksaan_stok (id_pemeriksaan),
    CONSTRAINT fk_detail_pemeriksaan_id_barang FOREIGN KEY (id_barang) REFERENCES public.barang (id_barang)
);

select * from public.detail_pemeriksaan;

-- 14. LAPORAN PERSEDIAAN
CREATE TABLE IF NOT EXISTS public.laporan_persediaan (
    id_laporan            VARCHAR(15) NOT NULL,
    id_pengguna           VARCHAR(10) NOT NULL,
    tanggal               DATE NOT NULL,
    periode_awal          DATE NOT NULL,
    periode_akhir         DATE NOT NULL,
    CONSTRAINT pk_laporan_persediaan PRIMARY KEY (id_laporan),
    CONSTRAINT fk_laporan_persediaan_id_pengguna FOREIGN KEY (id_pengguna) REFERENCES public.pengguna (id_pengguna)
);

select * from public.laporan_persediaan;

-- 15. DETAIL LAPORAN
CREATE TABLE IF NOT EXISTS public.detail_laporan (
    id_laporan            VARCHAR(15) NOT NULL,
    id_barang             VARCHAR(10) NOT NULL,
    stok_awal             NUMERIC(10,2) NOT NULL,
    jumlah_masuk          NUMERIC(10,2) NOT NULL,
    jumlah_keluar         NUMERIC(10,2) NOT NULL,
    penyesuaian           NUMERIC(10,2) NOT NULL,
    stok_akhir            NUMERIC(10,2) NOT NULL,
    CONSTRAINT pk_detail_laporan PRIMARY KEY (id_laporan, id_barang),
    CONSTRAINT fk_detail_laporan_id_laporan FOREIGN KEY (id_laporan) REFERENCES public.laporan_persediaan (id_laporan),
    CONSTRAINT fk_detail_laporan_id_barang FOREIGN KEY (id_barang) REFERENCES public.barang (id_barang)
);

select * from public.detail_laporan;


-- [1/15] PENGGUNA
-- 5 pengguna: id, nama, peran dari Excel; username turunan; password_hash belum valid.
INSERT INTO public.pengguna (id_pengguna, nama_pengguna, username, password_hash, peran) VALUES
    ('USR-01', 'Rina Marlina', 'usr01', 'LOGIN_BELUM_DIKONFIGURASI', 'Daily Worker'),
    ('USR-02', 'Dimas Pratama', 'usr02', 'LOGIN_BELUM_DIKONFIGURASI', 'Baker'),
    ('USR-03', 'Sari Wulandari', 'usr03', 'LOGIN_BELUM_DIKONFIGURASI', 'Barista'),
    ('USR-04', 'Tika Anggraini', 'usr04', 'LOGIN_BELUM_DIKONFIGURASI', 'Kasir'),
    ('USR-05', 'Hendra Saputra', 'usr05', 'LOGIN_BELUM_DIKONFIGURASI', 'Owner')
ON CONFLICT DO NOTHING;

select * from public.pengguna;

-- [2/15] PEMASOK
-- 3 pemasok dari Excel; alamat tidak tersedia -> NULL.
INSERT INTO public.pemasok (id_pemasok, nama_pemasok, telepon, alamat) VALUES
    ('SUP-01', 'CV Tepung Makmur', '0812-7001-1101', NULL),
    ('SUP-02', 'UD Susu Segar Nusantara', '0813-7002-2202', NULL),
    ('SUP-03', 'Toko Kopi Rasa Minang', '0821-7003-3303', NULL)
ON CONFLICT DO NOTHING;

select * from public.pemasok;

-- [3/15] BARANG
-- 10 barang: jenis dari awalan ID; stok minimum dari pemeriksaan; stok kini dari laporan 19-10-2026.
INSERT INTO public.barang (id_barang, nama_barang, satuan, jenis_barang, stok_minimum, stok_saat_ini) VALUES
    ('BHN-01', 'Tepung Terigu Protein Tinggi', 'kg', 'Bahan Baku', 10, 51),
    ('BHN-02', 'Gula Pasir', 'kg', 'Bahan Baku', 8, 31.1),
    ('BHN-03', 'Mentega Tawar', 'kg', 'Bahan Baku', 5, 4),
    ('BHN-04', 'Susu Cair Full Cream', 'liter', 'Bahan Baku', 10, 30),
    ('BHN-05', 'Biji Kopi Arabika', 'kg', 'Bahan Baku', 3, 7.6),
    ('BHN-06', 'Bubuk Cokelat', 'kg', 'Bahan Baku', 2, 4.5),
    ('PRD-01', 'Roti Tawar', 'loaf', 'Produk Hasil', 5, 20),
    ('PRD-02', 'Croissant Butter', 'pcs', 'Produk Hasil', 10, 73),
    ('PRD-03', 'Caffe Latte', 'gelas', 'Produk Hasil', 10, 2),
    ('PRD-04', 'Brownies Cokelat', 'pcs', 'Produk Hasil', 5, 14)
ON CONFLICT DO NOTHING;

select * from public.barang;

-- [4/15] PEMESANAN_BARANG
-- 5 PESANAN SIMULASI: Excel tidak memiliki riwayat pemesanan, identitas dan tanggal buatan.
INSERT INTO public.pemesanan_barang (id_pemesanan, id_pemasok, id_pengguna, tanggal_pemesanan, tanggal_estimasi, status_pemesanan, catatan) VALUES
    ('SIM-PB-01', 'SUP-01', 'USR-01', '2026-10-01', '2026-10-02', 'Simulasi', '[SIMULASI] Pesanan tidak tersedia di Excel; dibuat agar FK barang_masuk valid.'),
    ('SIM-PB-02', 'SUP-02', 'USR-01', '2026-10-02', '2026-10-03', 'Simulasi', '[SIMULASI] Pesanan tidak tersedia di Excel; dibuat agar FK barang_masuk valid.'),
    ('SIM-PB-03', 'SUP-03', 'USR-01', '2026-10-06', '2026-10-07', 'Simulasi', '[SIMULASI] Pesanan tidak tersedia di Excel; dibuat agar FK barang_masuk valid.'),
    ('SIM-PB-04', 'SUP-03', 'USR-01', '2026-10-07', '2026-10-08', 'Simulasi', '[SIMULASI] Pesanan tidak tersedia di Excel; dibuat agar FK barang_masuk valid.'),
    ('SIM-PB-05', 'SUP-01', 'USR-01', '2026-10-13', '2026-10-14', 'Simulasi', '[SIMULASI] Pesanan tidak tersedia di Excel; dibuat agar FK barang_masuk valid.')
ON CONFLICT DO NOTHING;

select * from public.pemesanan_barang;

-- [5/15] DETAIL_PESANAN
-- 9 DETAIL PESANAN SIMULASI: jumlah dari jumlah dikirim; harga_pesan=0 hanya PLACEHOLDER.
INSERT INTO public.detail_pesanan (id_pemesanan, id_barang, jumlah_dipesan, harga_pesan) VALUES
    ('SIM-PB-01', 'BHN-01', 50, 0),
    ('SIM-PB-01', 'BHN-02', 30, 0),
    ('SIM-PB-02', 'BHN-03', 10, 0),
    ('SIM-PB-02', 'BHN-04', 40, 0),
    ('SIM-PB-03', 'BHN-05', 8, 0),
    ('SIM-PB-03', 'BHN-06', 5, 0),
    ('SIM-PB-04', 'BHN-05', 8, 0),
    ('SIM-PB-04', 'BHN-06', 5, 0),
    ('SIM-PB-05', 'BHN-01', 25, 0)
ON CONFLICT DO NOTHING;

select * from public.detail_pesanan;

-- [6/15] BARANG_MASUK
-- 5 penerimaan dari Excel, id_pemesanan direferensikan ke pesanan simulasi.
INSERT INTO public.barang_masuk (id_penerimaan, id_pemesanan, id_pemasok, id_pengguna, tanggal_terima, status_penerimaan, alasan_penolakan) VALUES
    ('01/BM-ALN', 'SIM-PB-01', 'SUP-01', 'USR-01', '2026-10-02', 'Diterima', NULL),
    ('02/BM-ALN', 'SIM-PB-02', 'SUP-02', 'USR-01', '2026-10-03', 'Diterima', NULL),
    ('03/BM-ALN', 'SIM-PB-03', 'SUP-03', 'USR-01', '2026-10-07', 'Ditolak', 'Nota pemasok tidak lengkap, input dikembalikan'),
    ('04/BM-ALN', 'SIM-PB-04', 'SUP-03', 'USR-01', '2026-10-08', 'Diterima', NULL),
    ('05/BM-ALN', 'SIM-PB-05', 'SUP-01', 'USR-01', '2026-10-14', 'Diterima', NULL)
ON CONFLICT DO NOTHING;

select * from public.barang_masuk;

-- [7/15] DETAIL_BARANG_MASUK
-- 9 detail penerimaan dari Excel; ID DM-001 s.d. DM-009 merupakan ID TEKNIS buatan.
INSERT INTO public.detail_barang_masuk (id_detail_masuk, id_penerimaan, id_barang, jumlah_dikirim, jumlah_diterima, tanggal_kedaluwarsa, kondisi) VALUES
    ('DM-001', '01/BM-ALN', 'BHN-01', 50, 50, '2027-04-02', 'Baik'),
    ('DM-002', '01/BM-ALN', 'BHN-02', 30, 30, '2027-10-02', 'Baik'),
    ('DM-003', '02/BM-ALN', 'BHN-03', 10, 10, '2026-12-03', 'Baik'),
    ('DM-004', '02/BM-ALN', 'BHN-04', 40, 38, '2026-10-21', 'Sebagian rusak'),
    ('DM-005', '03/BM-ALN', 'BHN-05', 8, 0, '2027-03-08', 'Baik'),
    ('DM-006', '03/BM-ALN', 'BHN-06', 5, 0, '2027-06-08', 'Baik'),
    ('DM-007', '04/BM-ALN', 'BHN-05', 8, 8, '2027-03-08', 'Baik'),
    ('DM-008', '04/BM-ALN', 'BHN-06', 5, 5, '2027-06-08', 'Baik'),
    ('DM-009', '05/BM-ALN', 'BHN-01', 25, 25, '2027-04-14', 'Baik')
ON CONFLICT DO NOTHING;

select * from public.detail_barang_masuk;

-- [8/15] BARANG_DIPAKAI
-- 8 catatan produksi dari Excel; kode 01/BM-ALN dst mengikuti aslinya.
INSERT INTO public.barang_dipakai (id_pemakaian, id_pengguna, id_produk_hasil, tanggal, jenis_keluar, jumlah_hasil, status_produksi, alasan_gagal) VALUES
    ('01/BM-ALN', 'USR-02', 'PRD-01', '2026-10-04', 'Produksi', 40, 'Selesai', NULL),
    ('02/BM-ALN', 'USR-02', 'PRD-02', '2026-10-05', 'Produksi', 60, 'Selesai', NULL),
    ('03/BM-ALN', 'USR-03', 'PRD-03', '2026-10-06', 'Produksi', 50, 'Selesai', NULL),
    ('04/BM-ALN', 'USR-03', 'PRD-03', '2026-10-07', 'Produksi', 0, 'Gagal', 'Stok Biji Kopi Arabika tidak mencukupi, notifikasi dikirim ke Owner'),
    ('05/BM-ALN', 'USR-03', 'PRD-03', '2026-10-10', 'Produksi', 50, 'Selesai', NULL),
    ('06/BM-ALN', 'USR-02', 'PRD-04', '2026-10-12', 'Produksi', 30, 'Selesai', NULL),
    ('07/BM-ALN', 'USR-02', 'PRD-01', '2026-10-15', 'Produksi', 40, 'Selesai', NULL),
    ('08/BM-ALN', 'USR-02', 'PRD-02', '2026-10-17', 'Produksi', 60, 'Selesai', NULL)
ON CONFLICT DO NOTHING;

select * from public.barang_dipakai;

-- [9/15] DETAIL_BARANG_DIPAKAI
-- 25 detail produksi dari Excel; id_detail_masuk adalah ASUMSI relasi batch. Lihat catatan!
INSERT INTO public.detail_barang_dipakai (id_pemakaian, id_detail_masuk, id_barang, jumlah_diminta, stok_tersedia, jumlah_dipakai) VALUES
    ('01/BM-ALN', 'DM-001', 'BHN-01', 12, 70, 12),
    ('01/BM-ALN', 'DM-002', 'BHN-02', 1.5, 40, 1.5),
    ('01/BM-ALN', 'DM-003', 'BHN-03', 1, 16, 1),
    ('02/BM-ALN', 'DM-001', 'BHN-01', 8, 58, 8),
    ('02/BM-ALN', 'DM-003', 'BHN-03', 4, 15, 4),
    ('02/BM-ALN', 'DM-002', 'BHN-02', 0.8, 38.5, 0.8),
    ('03/BM-ALN', 'DM-007', 'BHN-05', 1.2, 2, 1.2),
    ('03/BM-ALN', 'DM-004', 'BHN-04', 10, 50, 10),
    ('03/BM-ALN', 'DM-002', 'BHN-02', 0.5, 37.7, 0.5),
    ('04/BM-ALN', 'DM-007', 'BHN-05', 2.4, 0.8, 0),
    ('04/BM-ALN', 'DM-004', 'BHN-04', 16, 40, 0),
    ('04/BM-ALN', 'DM-002', 'BHN-02', 0.8, 37.2, 0),
    ('05/BM-ALN', 'DM-007', 'BHN-05', 1.2, 8.8, 1.2),
    ('05/BM-ALN', 'DM-004', 'BHN-04', 10, 40, 10),
    ('05/BM-ALN', 'DM-002', 'BHN-02', 0.5, 37.2, 0.5),
    ('06/BM-ALN', 'DM-008', 'BHN-06', 1.5, 6, 1.5),
    ('06/BM-ALN', 'DM-002', 'BHN-02', 3, 36.7, 3),
    ('06/BM-ALN', 'DM-003', 'BHN-03', 2, 11, 2),
    ('06/BM-ALN', 'DM-001', 'BHN-01', 3, 50, 3),
    ('07/BM-ALN', 'DM-009', 'BHN-01', 12, 72, 12),
    ('07/BM-ALN', 'DM-002', 'BHN-02', 1.5, 33.7, 1.5),
    ('07/BM-ALN', 'DM-003', 'BHN-03', 1, 9, 1),
    ('08/BM-ALN', 'DM-009', 'BHN-01', 8, 59, 8),
    ('08/BM-ALN', 'DM-003', 'BHN-03', 4, 8, 4),
    ('08/BM-ALN', 'DM-002', 'BHN-02', 0.8, 31.9, 0.8)
ON CONFLICT DO NOTHING;
select * from public.detail_barang_dipakai;

-- [10/15] TRANSAKSI
-- 11 transaksi asli dari Excel; status gagal dipertahankan.
INSERT INTO public.transaksi (id_transaksi, id_pengguna, tanggal, status_transaksi, alasan_gagal) VALUES
    ('01/TRS-ALN', 'USR-04', '2026-10-05', 'Berhasil', NULL),
    ('02/TRS-ALN', 'USR-04', '2026-10-06', 'Berhasil', NULL),
    ('03/TRS-ALN', 'USR-04', '2026-10-07', 'Gagal', 'Stok Caffe Latte tidak cukup untuk pesanan'),
    ('04/TRS-ALN', 'USR-04', '2026-10-08', 'Berhasil', NULL),
    ('05/TRS-ALN', 'USR-04', '2026-10-10', 'Berhasil', NULL),
    ('06/TRS-ALN', 'USR-04', '2026-10-12', 'Berhasil', NULL),
    ('07/TRS-ALN', 'USR-04', '2026-10-13', 'Gagal', 'Stok Brownies Cokelat tidak cukup untuk pesanan'),
    ('08/TRS-ALN', 'USR-04', '2026-10-15', 'Berhasil', NULL),
    ('09/TRS-ALN', 'USR-04', '2026-10-17', 'Berhasil', NULL),
    ('010/TRS-ALN', 'USR-04', '2026-10-18', 'Gagal', 'Stok Caffe Latte tidak cukup untuk pesanan'),
    ('011/TRS-ALN', 'USR-04', '2026-10-19', 'Berhasil', NULL)
ON CONFLICT DO NOTHING;
select * from public.transaksi;

-- [11/15] DETAIL_TRANSAKSI
-- 18 detail penjualan asli dari Excel.
INSERT INTO public.detail_transaksi (id_transaksi, id_barang, jumlah_dipesan, stok_tersedia, jumlah_terjual, harga) VALUES
    ('01/TRS-ALN', 'PRD-01', 10, 40, 10, 18000),
    ('01/TRS-ALN', 'PRD-02', 5, 60, 5, 22000),
    ('02/TRS-ALN', 'PRD-03', 20, 50, 20, 25000),
    ('02/TRS-ALN', 'PRD-01', 8, 30, 8, 18000),
    ('03/TRS-ALN', 'PRD-03', 35, 30, 0, 25000),
    ('04/TRS-ALN', 'PRD-03', 30, 30, 30, 25000),
    ('04/TRS-ALN', 'PRD-02', 10, 55, 10, 22000),
    ('05/TRS-ALN', 'PRD-03', 25, 50, 25, 25000),
    ('05/TRS-ALN', 'PRD-01', 12, 22, 12, 18000),
    ('06/TRS-ALN', 'PRD-04', 12, 30, 12, 20000),
    ('07/TRS-ALN', 'PRD-04', 25, 18, 0, 20000),
    ('08/TRS-ALN', 'PRD-01', 20, 50, 20, 18000),
    ('08/TRS-ALN', 'PRD-03', 15, 25, 15, 25000),
    ('09/TRS-ALN', 'PRD-02', 30, 103, 30, 22000),
    ('09/TRS-ALN', 'PRD-04', 4, 18, 4, 20000),
    ('010/TRS-ALN', 'PRD-03', 15, 10, 0, 25000),
    ('011/TRS-ALN', 'PRD-01', 10, 30, 10, 18000),
    ('011/TRS-ALN', 'PRD-03', 8, 10, 8, 25000)
ON CONFLICT DO NOTHING;
select * from public.detail_transaksi;

-- [12/15] PEMERIKSAAN_STOK
-- 2 pemeriksaan stok asli dari Excel.
INSERT INTO public.pemeriksaan_stok (id_pemeriksaan, id_pengguna, tanggal) VALUES
    ('01/PS-ALN', 'USR-01', '2026-10-15'),
    ('02/PS-ALN', 'USR-01', '2026-10-19')
ON CONFLICT DO NOTHING;
select * from public.pemeriksaan_stok;

-- [13/15] DETAIL_PEMERIKSAAN
-- 13 detail pemeriksaan asli dari Excel.
INSERT INTO public.detail_pemeriksaan (id_pemeriksaan, id_barang, stok_sistem, stok_fisik, kondisi_fisik, tindak_lanjut) VALUES
    ('01/PS-ALN', 'BHN-01', 60, 59, 'Baik', 'Disesuaikan'),
    ('01/PS-ALN', 'BHN-02', 32.2, 31.9, 'Baik', 'Disesuaikan'),
    ('01/PS-ALN', 'BHN-03', 8, 8, 'Baik', NULL),
    ('01/PS-ALN', 'BHN-04', 30, 30, 'Mendekati kedaluwarsa', NULL),
    ('01/PS-ALN', 'BHN-05', 7.6, 7.6, 'Baik', NULL),
    ('01/PS-ALN', 'BHN-06', 4.5, 4.5, 'Baik', NULL),
    ('01/PS-ALN', 'PRD-01', 30, 30, 'Baik', NULL),
    ('01/PS-ALN', 'PRD-02', 45, 43, 'Baik', 'Disesuaikan'),
    ('01/PS-ALN', 'PRD-03', 10, 10, 'Baik', 'Notifikasi Owner'),
    ('01/PS-ALN', 'PRD-04', 18, 18, 'Baik', NULL),
    ('02/PS-ALN', 'BHN-03', 4, 4, 'Baik', 'Notifikasi Owner'),
    ('02/PS-ALN', 'BHN-04', 30, 30, 'Mendekati kedaluwarsa', NULL),
    ('02/PS-ALN', 'PRD-03', 2, 2, 'Baik', 'Notifikasi Owner')
ON CONFLICT DO NOTHING;
select * from public.detail_pemeriksaan;

-- [14/15] LAPORAN_PERSEDIAAN
-- 2 laporan persediaan dari Excel.
INSERT INTO public.laporan_persediaan (id_laporan, id_pengguna, tanggal, periode_awal, periode_akhir) VALUES
    ('01/LP-ALN', 'USR-05', '2026-10-15', '2026-10-01', '2026-10-15'),
    ('02/LP-ALN', 'USR-05', '2026-10-19', '2026-10-16', '2026-10-19')
ON CONFLICT DO NOTHING;
select * from public.laporan_persediaan;

-- [15/15] DETAIL_LAPORAN
-- 20 detail laporan asli dari Excel.
INSERT INTO public.detail_laporan (id_laporan, id_barang, stok_awal, jumlah_masuk, jumlah_keluar, penyesuaian, stok_akhir) VALUES
    ('01/LP-ALN', 'BHN-01', 20, 75, 35, -1, 59),
    ('01/LP-ALN', 'BHN-02', 10, 30, 7.8, -0.3, 31.9),
    ('01/LP-ALN', 'BHN-03', 6, 10, 8, 0, 8),
    ('01/LP-ALN', 'BHN-04', 12, 38, 20, 0, 30),
    ('01/LP-ALN', 'BHN-05', 2, 8, 2.4, 0, 7.6),
    ('01/LP-ALN', 'BHN-06', 1, 5, 1.5, 0, 4.5),
    ('01/LP-ALN', 'PRD-01', 0, 80, 50, 0, 30),
    ('01/LP-ALN', 'PRD-02', 0, 60, 15, -2, 43),
    ('01/LP-ALN', 'PRD-03', 0, 100, 90, 0, 10),
    ('01/LP-ALN', 'PRD-04', 0, 30, 12, 0, 18),
    ('02/LP-ALN', 'BHN-01', 59, 0, 8, 0, 51),
    ('02/LP-ALN', 'BHN-02', 31.9, 0, 0.8, 0, 31.1),
    ('02/LP-ALN', 'BHN-03', 8, 0, 4, 0, 4),
    ('02/LP-ALN', 'BHN-04', 30, 0, 0, 0, 30),
    ('02/LP-ALN', 'BHN-05', 7.6, 0, 0, 0, 7.6),
    ('02/LP-ALN', 'BHN-06', 4.5, 0, 0, 0, 4.5),
    ('02/LP-ALN', 'PRD-01', 30, 0, 10, 0, 20),
    ('02/LP-ALN', 'PRD-02', 43, 60, 30, 0, 73),
    ('02/LP-ALN', 'PRD-03', 10, 0, 8, 0, 2),
    ('02/LP-ALN', 'PRD-04', 18, 0, 4, 0, 14)
ON CONFLICT DO NOTHING;
select * from public.detail_laporan;
COMMIT;

