-- Reviewed rollout proposal. Never run automatically. Production execution needs separate explicit approval.
-- This file changes schema only; it never changes prices, users, transactions, details or stock.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$
DECLARE
  public_tables integer;
  payment_columns integer;
  invalid_stock integer;
  bad_status integer;
BEGIN
  IF current_setting('alana.payment_schema_approved', true) IS DISTINCT FROM 'yes' THEN
    RAISE EXCEPTION 'Explicit schema execution approval is required';
  END IF;
  IF current_database() NOT IN ('apsi_db','alana_payment_test','alana_orders_test','alana_worker_test','alana_baker_test','alana_kasir_test','alana_master_test','alana_auth_test','alana_browser_test','alana_owner_setup_test') OR current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Unexpected payment schema target';
  END IF;
  SELECT count(*) INTO public_tables FROM pg_tables WHERE schemaname = 'public';
  IF public_tables <> 15 THEN RAISE EXCEPTION 'Expected 15 public tables; found %', public_tables; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='barang' AND column_name='stok_saat_ini' AND data_type='numeric' AND numeric_precision=10 AND numeric_scale=2) OR
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='barang' AND column_name='jenis_barang' AND data_type='character varying' AND character_maximum_length=15) OR
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='transaksi' AND column_name='status_transaksi' AND data_type='character varying' AND character_maximum_length=10) OR
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='detail_transaksi' AND column_name='harga' AND data_type='numeric' AND numeric_precision=12 AND numeric_scale=2) THEN
    RAISE EXCEPTION 'Required existing payment-related columns do not match the reviewed schema';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_transaksi_id_pengguna' AND contype='f') OR
     NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_detail_transaksi_id_transaksi' AND contype='f') OR
     NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_detail_transaksi_id_barang' AND contype='f') OR
     NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pk_transaksi' AND contype='p') OR
     NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pk_detail_transaksi' AND contype='p') THEN
    RAISE EXCEPTION 'Required transaction/detail relations or keys do not match the reviewed schema';
  END IF;
  SELECT count(*) INTO payment_columns FROM information_schema.columns
    WHERE table_schema='public' AND ((table_name='barang' AND column_name='harga_jual') OR
      (table_name='transaksi' AND column_name IN ('metode_pembayaran','total_bayar','pajak_layanan','uang_diterima','kembalian','waktu_bayar','kunci_idempotensi')));
  IF payment_columns <> 0 THEN RAISE EXCEPTION 'Payment columns already exist; inspect schema drift'; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('ck_barang_harga_jual','ck_barang_stok_nonnegative','uq_transaksi_idempotensi','ck_transaksi_payment_bundle')) THEN
    RAISE EXCEPTION 'Payment constraint name already exists; inspect schema drift';
  END IF;
  SELECT count(*) INTO invalid_stock FROM public.barang WHERE stok_saat_ini < 0 OR stok_saat_ini = 'NaN'::numeric;
  IF invalid_stock <> 0 THEN RAISE EXCEPTION 'Negative or NaN stock must be investigated before rollout'; END IF;
  SELECT count(*) INTO bad_status FROM public.transaksi WHERE status_transaksi NOT IN ('Berhasil','Gagal');
  IF bad_status <> 0 THEN RAISE EXCEPTION 'Unexpected legacy transaction status found'; END IF;
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

DO $$
DECLARE
  payment_columns integer;
BEGIN
  SELECT count(*) INTO payment_columns FROM information_schema.columns
    WHERE table_schema='public' AND ((table_name='barang' AND column_name='harga_jual' AND data_type='numeric' AND numeric_precision=12 AND numeric_scale=2 AND is_nullable='YES') OR
      (table_name='transaksi' AND column_name IN ('metode_pembayaran','total_bayar','pajak_layanan','uang_diterima','kembalian','waktu_bayar','kunci_idempotensi')));
  IF payment_columns <> 8 THEN RAISE EXCEPTION 'Post-DDL payment column verification failed'; END IF;
  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('barang','harga_jual','numeric',12,2,NULL::integer,NULL::integer),
      ('transaksi','metode_pembayaran','character varying',NULL::integer,NULL::integer,10,NULL::integer),
      ('transaksi','total_bayar','numeric',18,2,NULL::integer,NULL::integer),
      ('transaksi','pajak_layanan','numeric',18,2,NULL::integer,NULL::integer),
      ('transaksi','uang_diterima','numeric',18,2,NULL::integer,NULL::integer),
      ('transaksi','kembalian','numeric',18,2,NULL::integer,NULL::integer),
      ('transaksi','waktu_bayar','timestamp with time zone',NULL::integer,NULL::integer,NULL::integer,6),
      ('transaksi','kunci_idempotensi','uuid',NULL::integer,NULL::integer,NULL::integer,NULL::integer)
    ) AS expected(table_name,column_name,data_type,numeric_precision,numeric_scale,character_maximum_length,datetime_precision)
    LEFT JOIN information_schema.columns actual ON actual.table_schema='public' AND actual.table_name=expected.table_name AND actual.column_name=expected.column_name
    WHERE actual.column_name IS NULL OR actual.data_type<>expected.data_type OR actual.is_nullable<>'YES' OR
      actual.numeric_precision IS DISTINCT FROM expected.numeric_precision OR actual.numeric_scale IS DISTINCT FROM expected.numeric_scale OR
      actual.character_maximum_length IS DISTINCT FROM expected.character_maximum_length OR actual.datetime_precision IS DISTINCT FROM expected.datetime_precision
  ) THEN RAISE EXCEPTION 'Payment column type, precision, or nullability verification failed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='uq_transaksi_idempotensi' AND contype='u') OR
     NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_transaksi_payment_bundle' AND contype='c') OR
     NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_barang_harga_jual' AND contype='c') OR
     NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_barang_stok_nonnegative' AND contype='c') THEN
    RAISE EXCEPTION 'Post-DDL payment constraint verification failed';
  END IF;
END $$;
COMMIT;
