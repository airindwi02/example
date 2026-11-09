-- Separate approved price preparation. Never run automatically; separate explicit approval is required.
-- Only the four listed Produk Hasil may be updated. Legacy detail_transaksi prices are not touched.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$
DECLARE
  approved_ids text[] := ARRAY['PRD-01','PRD-02','PRD-03','PRD-04'];
  verified integer;
  affected integer;
  price_column_type record;
BEGIN
  IF current_setting('alana.payment_prices_approved', true) IS DISTINCT FROM 'yes' THEN
    RAISE EXCEPTION 'Explicit price execution approval is required';
  END IF;
  IF current_database() NOT IN ('apsi_db','alana_payment_test') OR current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Unexpected price update target';
  END IF;
  SELECT data_type,numeric_precision,numeric_scale,is_nullable INTO price_column_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='barang' AND column_name='harga_jual';
  IF price_column_type.data_type IS DISTINCT FROM 'numeric' OR price_column_type.numeric_precision IS DISTINCT FROM 12 OR price_column_type.numeric_scale IS DISTINCT FROM 2 OR price_column_type.is_nullable IS DISTINCT FROM 'YES' THEN
    RAISE EXCEPTION 'barang.harga_jual is missing or has an unexpected type';
  END IF;
  SELECT count(*) INTO verified FROM public.barang WHERE
    (id_barang='PRD-01' AND nama_barang='Roti Tawar' AND jenis_barang='Produk Hasil') OR
    (id_barang='PRD-02' AND nama_barang='Croissant Butter' AND jenis_barang='Produk Hasil') OR
    (id_barang='PRD-03' AND nama_barang='Caffe Latte' AND jenis_barang='Produk Hasil') OR
    (id_barang='PRD-04' AND nama_barang='Brownies Cokelat' AND jenis_barang='Produk Hasil');
  IF verified <> 4 THEN RAISE EXCEPTION 'Approved product IDs, names, or categories do not match'; END IF;
  IF EXISTS (SELECT 1 FROM public.barang WHERE id_barang=ANY(approved_ids) AND harga_jual IS NOT NULL AND harga_jual <> CASE id_barang WHEN 'PRD-01' THEN 18000.00 WHEN 'PRD-02' THEN 22000.00 WHEN 'PRD-03' THEN 25000.00 WHEN 'PRD-04' THEN 20000.00 END) THEN
    RAISE EXCEPTION 'An approved product already has a different price';
  END IF;
  IF EXISTS (SELECT 1 FROM public.barang WHERE id_barang <> ALL(approved_ids) AND harga_jual IS NOT NULL) THEN
    RAISE EXCEPTION 'A product outside the approved list already has a price';
  END IF;
  IF EXISTS (SELECT 1 FROM public.barang WHERE jenis_barang='Bahan Baku' AND harga_jual IS NOT NULL) THEN
    RAISE EXCEPTION 'A raw material unexpectedly has a sale price';
  END IF;
  IF EXISTS (SELECT 1 FROM public.barang WHERE id_barang='ff95a7f679' AND (nama_barang <> 'bapak kau' OR jenis_barang <> 'Produk Hasil' OR harga_jual IS NOT NULL)) THEN
    RAISE EXCEPTION 'The unpriced product identity or price has changed';
  END IF;

  UPDATE public.barang SET harga_jual=18000.00 WHERE id_barang='PRD-01' AND nama_barang='Roti Tawar' AND jenis_barang='Produk Hasil' AND (harga_jual IS NULL OR harga_jual=18000.00);
  GET DIAGNOSTICS affected=ROW_COUNT; IF affected <> 1 THEN RAISE EXCEPTION 'Roti Tawar update count was %, expected one', affected; END IF;
  UPDATE public.barang SET harga_jual=22000.00 WHERE id_barang='PRD-02' AND nama_barang='Croissant Butter' AND jenis_barang='Produk Hasil' AND (harga_jual IS NULL OR harga_jual=22000.00);
  GET DIAGNOSTICS affected=ROW_COUNT; IF affected <> 1 THEN RAISE EXCEPTION 'Croissant Butter update count was %, expected one', affected; END IF;
  UPDATE public.barang SET harga_jual=25000.00 WHERE id_barang='PRD-03' AND nama_barang='Caffe Latte' AND jenis_barang='Produk Hasil' AND (harga_jual IS NULL OR harga_jual=25000.00);
  GET DIAGNOSTICS affected=ROW_COUNT; IF affected <> 1 THEN RAISE EXCEPTION 'Caffe Latte update count was %, expected one', affected; END IF;
  UPDATE public.barang SET harga_jual=20000.00 WHERE id_barang='PRD-04' AND nama_barang='Brownies Cokelat' AND jenis_barang='Produk Hasil' AND (harga_jual IS NULL OR harga_jual=20000.00);
  GET DIAGNOSTICS affected=ROW_COUNT; IF affected <> 1 THEN RAISE EXCEPTION 'Brownies Cokelat update count was %, expected one', affected; END IF;
END $$;
COMMIT;
