-- DRAFT. Never invoked by application startup. Review target and verified backup first.
-- Approved for isolated tests only. No backfill, prices, account or stock updates.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$ BEGIN
 IF current_setting('alana.payment_schema_approved', true) IS DISTINCT FROM 'yes' THEN
  RAISE EXCEPTION 'Explicit schema execution approval is required';
 END IF;
END $$;
ALTER TABLE public.barang ADD COLUMN harga_jual numeric(12,2);
ALTER TABLE public.transaksi
 ADD COLUMN metode_pembayaran varchar(10),
 ADD COLUMN total_bayar numeric(18,2),
 ADD COLUMN pajak_layanan numeric(18,2),
 ADD COLUMN uang_diterima numeric(18,2),
 ADD COLUMN kembalian numeric(18,2),
 ADD COLUMN waktu_bayar timestamptz(6),
 ADD COLUMN kunci_idempotensi uuid;
ALTER TABLE public.barang
 ADD CONSTRAINT ck_barang_harga_jual CHECK (harga_jual IS NULL OR (harga_jual > 0 AND harga_jual <> 'NaN'::numeric)),
 ADD CONSTRAINT ck_barang_stok_nonnegative CHECK (stok_saat_ini >= 0 AND stok_saat_ini <> 'NaN'::numeric);
ALTER TABLE public.transaksi
 ADD CONSTRAINT uq_transaksi_idempotensi UNIQUE (kunci_idempotensi),
 ADD CONSTRAINT ck_transaksi_payment_bundle CHECK (
  (metode_pembayaran IS NULL AND total_bayar IS NULL AND pajak_layanan IS NULL AND uang_diterima IS NULL AND kembalian IS NULL AND waktu_bayar IS NULL AND kunci_idempotensi IS NULL)
  OR
  (metode_pembayaran IS NOT NULL AND total_bayar IS NOT NULL AND pajak_layanan IS NOT NULL AND uang_diterima IS NOT NULL AND kembalian IS NOT NULL AND waktu_bayar IS NOT NULL AND kunci_idempotensi IS NOT NULL
   AND status_transaksi = 'Berhasil' AND metode_pembayaran = 'TUNAI'
   AND total_bayar > 0 AND pajak_layanan = 0 AND uang_diterima >= total_bayar AND kembalian >= 0
   AND total_bayar <> 'NaN'::numeric AND pajak_layanan <> 'NaN'::numeric AND uang_diterima <> 'NaN'::numeric AND kembalian <> 'NaN'::numeric
   AND kembalian = uang_diterima - total_bayar)
 );
COMMIT;
