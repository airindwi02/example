-- DRAFT: NOT APPLIED TO THE ORIGINAL DATABASE.
-- Run only after explicit target/backup/schema approval. No automatic startup hook.
-- A separate session-level approval is required before this file can run.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $approval$
BEGIN
  IF current_setting('alana.auth_schema_approved', true) IS DISTINCT FROM 'yes' THEN
    RAISE EXCEPTION 'Explicit schema approval is required';
  END IF;
  IF to_regclass('public.pengguna') IS NULL THEN
    RAISE EXCEPTION 'Expected existing pengguna table';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'pengguna') <> 5
     OR EXISTS (
       SELECT 1 FROM (VALUES ('nomor_hp'), ('email'), ('status_akun'),
         ('diputuskan_oleh'), ('diputuskan_pada')) AS proposed(name)
       JOIN information_schema.columns c ON c.column_name = proposed.name
       WHERE c.table_schema = 'public' AND c.table_name = 'pengguna'
     ) THEN
    RAISE EXCEPTION 'Unexpected or already modified schema; stop for review';
  END IF;
END
$approval$;

ALTER TABLE public.pengguna
  ADD COLUMN nomor_hp varchar(32),
  ADD COLUMN email varchar(254),
  ADD COLUMN status_akun varchar(10) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN diputuskan_oleh varchar(10),
  ADD COLUMN diputuskan_pada timestamptz(6),
  ADD CONSTRAINT ck_pengguna_status_akun
    CHECK (status_akun IN ('PENDING', 'ACTIVE', 'REJECTED')),
  ADD CONSTRAINT fk_pengguna_diputuskan_oleh
    FOREIGN KEY (diputuskan_oleh) REFERENCES public.pengguna(id_pengguna)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_pengguna_status_username ON public.pengguna(status_akun, username);

-- Existing fields, primary key, username uniqueness and incoming foreign keys stay intact.
-- Existing accounts receive PENDING, never ACTIVE, for the new status field.
-- No password replacement, approval, or bootstrap activation is included here.
COMMIT;
