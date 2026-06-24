-- ============================================================
-- SIAKAD — MIGRATION: 06_backfill_fakultas_id.sql
-- Tanggal: 2026-06-19
-- Purpose: Auto-fill fakultas_id di mahasiswa dari relasi prodi
-- ============================================================
-- WARNING: Execute SETELAH 05_mahasiswa_schema_sync.sql
-- ============================================================

BEGIN;

-- Backfill fakultas_id di mahasiswa.mahasiswa dari relasi prodi
UPDATE mahasiswa.mahasiswa m
SET fakultas_id = p.fakultas_id
FROM program_studi p
WHERE m.prodi_id = p.id
  AND m.fakultas_id IS NULL;

-- Verifikasi
DO $$
DECLARE
    total_mhs INTEGER;
    filled_mhs INTEGER;
    null_fakultas INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_mhs FROM mahasiswa.mahasiswa;
    SELECT COUNT(*) INTO filled_mhs FROM mahasiswa.mahasiswa WHERE fakultas_id IS NOT NULL;
    SELECT COUNT(*) INTO null_fakultas FROM mahasiswa.mahasiswa WHERE fakultas_id IS NULL;

    RAISE NOTICE '=== MAHASISWA FAKULTAS BACKFILL REPORT ===';
    RAISE NOTICE 'Total mahasiswa: %', total_mhs;
    RAISE NOTICE 'Dengan fakultas_id: %', filled_mhs;
    RAISE NOTICE 'Tanpa fakultas_id (NULL): %', null_fakultas;
    RAISE NOTICE '=======================================';
END $$;

-- Jika ada yang NULL, tampilkan detail
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT m.id, m.nim, m.nama_mahasiswa, p.nama_prodi
        FROM mahasiswa.mahasiswa m
        LEFT JOIN program_studi p ON m.prodi_id = p.id
        WHERE m.fakultas_id IS NULL
    LOOP
        RAISE WARNING 'Mahasiswa tanpa fakultas_id: ID=% NIM=% Nama=% Prodi=%',
            rec.id, rec.nim, rec.nama_mahasiswa, rec.nama_prodi;
    END LOOP;
END $$;

COMMIT;

-- ============================================================
-- QUICK FIX: Jika ada mahasiswa tanpa prodi_id, assign ke default
-- ============================================================
-- UPDATE mahasiswa.mahasiswa
-- SET prodi_id = (SELECT id FROM program_studi WHERE nama_prodi LIKE '%Umum%' LIMIT 1)
-- WHERE prodi_id IS NULL;
