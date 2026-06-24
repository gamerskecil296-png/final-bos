-- ============================================================
-- SIAKAD — MIGRATION: 05_mahasiswa_schema_sync.sql
-- Tanggal: 2026-06-19
-- Purpose: Sinkronisasi schema mahasiswa.mahasiswa dengan Model GORM
-- ============================================================
-- WARNING: Execute ini SEBELUM menjalankan aplikasi jika ada kolom baru
-- ============================================================

BEGIN;

-- ============================================================
-- 0. TAMBAHKAN KOLOM FAKULTAS_ID (DIPERLUKAN OLEH QUERY)
--    Untuk query cepat tanpa JOIN ke program_studi
-- ============================================================
ALTER TABLE mahasiswa.mahasiswa
    ADD COLUMN IF NOT EXISTS fakultas_id INTEGER REFERENCES fakultas.fakultas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mahasiswa_fk ON mahasiswa.mahasiswa(fakultas_id);

-- ============================================================
-- 1. TAMBAHKAN KOLOM IDENTITAS (NIK, NISN, dll)
-- ============================================================
ALTER TABLE mahasiswa.mahasiswa
    ADD COLUMN IF NOT EXISTS nik VARCHAR(20),
    ADD COLUMN IF NOT EXISTS nisn VARCHAR(20),
    ADD COLUMN IF NOT EXISTS nupn VARCHAR(20),
    ADD COLUMN IF NOT EXISTS npsn VARCHAR(20),
    ADD COLUMN IF NOT EXISTS nirm VARCHAR(20),
    ADD COLUMN IF NOT EXISTS nirl VARCHAR(20),
    ADD COLUMN IF NOT EXISTS nomor_kk VARCHAR(20),
    ADD COLUMN IF NOT EXISTS nomor_kps VARCHAR(20);

-- ============================================================
-- 2. TAMBAHKAN KOLOM BIODATA EXTENDED
-- ============================================================
ALTER TABLE mahasiswa.mahasiswa
    ADD COLUMN IF NOT EXISTS kewarganegaraan VARCHAR(50),
    ADD COLUMN IF NOT EXISTS status_pernikahan VARCHAR(20),
    ADD COLUMN IF NOT EXISTS is_disabilitas VARCHAR(10) DEFAULT 'Tidak',
    ADD COLUMN IF NOT EXISTS jenis_tinggal VARCHAR(50),
    ADD COLUMN IF NOT EXISTS gelar_depan VARCHAR(20),
    ADD COLUMN IF NOT EXISTS gelar_belakang VARCHAR(20),
    ADD COLUMN IF NOT EXISTS jenjang VARCHAR(10);

-- ============================================================
-- 3. TAMBAHKAN KOLOM KONTAK EXTENDED
-- ============================================================
ALTER TABLE mahasiswa.mahasiswa
    ADD COLUMN IF NOT EXISTS email_kampus VARCHAR(100),
    ADD COLUMN IF NOT EXISTS telepon VARCHAR(20),
    ADD COLUMN IF NOT EXISTS alamat_domisili TEXT,
    ADD COLUMN IF NOT EXISTS desa VARCHAR(100),
    ADD COLUMN IF NOT EXISTS desa_domisili VARCHAR(100),
    ADD COLUMN IF NOT EXISTS dusun VARCHAR(100),
    ADD COLUMN IF NOT EXISTS dusun_domisili VARCHAR(100),
    ADD COLUMN IF NOT EXISTS kecamatan VARCHAR(100),
    ADD COLUMN IF NOT EXISTS kecamatan_domisili VARCHAR(100),
    ADD COLUMN IF NOT EXISTS provinsi VARCHAR(100),
    ADD COLUMN IF NOT EXISTS provinsi_domisili VARCHAR(100),
    ADD COLUMN IF NOT EXISTS kode_pos_domisili VARCHAR(10),
    ADD COLUMN IF NOT EXISTS rt VARCHAR(5),
    ADD COLUMN IF NOT EXISTS rw VARCHAR(5),
    ADD COLUMN IF NOT EXISTS rt_domisili VARCHAR(5),
    ADD COLUMN IF NOT EXISTS rw_domisili VARCHAR(5);

-- ============================================================
-- 4. TAMBAHKAN KOLOM DATA KELUARGA
-- ============================================================
ALTER TABLE mahasiswa.mahasiswa
    ADD COLUMN IF NOT EXISTS nama_ayah VARCHAR(150),
    ADD COLUMN IF NOT EXISTS nama_ibu_kandung VARCHAR(150),
    ADD COLUMN IF NOT EXISTS nama_wali VARCHAR(150),
    ADD COLUMN IF NOT EXISTS pekerjaan_ayah VARCHAR(100),
    ADD COLUMN IF NOT EXISTS pekerjaan_ibu VARCHAR(100),
    ADD COLUMN IF NOT EXISTS penghasilan_ortu INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pekerjaan VARCHAR(100);

-- ============================================================
-- 5. TAMBAHKAN KOLOM PENDIDIKAN SEBELUMNYA
-- ============================================================
ALTER TABLE mahasiswa.mahasiswa
    ADD COLUMN IF NOT EXISTS asal_sekolah VARCHAR(200),
    ADD COLUMN IF NOT EXISTS no_ijazah_sma VARCHAR(50),
    ADD COLUMN IF NOT EXISTS gelombang VARCHAR(20),
    ADD COLUMN IF NOT EXISTS sistem_kuliah VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tanggal_daftar TIMESTAMP,
    ADD COLUMN IF NOT EXISTS kategori_ukt VARCHAR(50),
    ADD COLUMN IF NOT EXISTS kontak_darurat VARCHAR(100);

-- ============================================================
-- 6. TAMBAHKAN KOLOM TRANSFER
-- ============================================================
ALTER TABLE mahasiswa.mahasiswa
    ADD COLUMN IF NOT EXISTS is_transfer VARCHAR(10) DEFAULT 'Tidak',
    ADD COLUMN IF NOT EXISTS nim_lama VARCHAR(20),
    ADD COLUMN IF NOT EXISTS universitas_asal VARCHAR(200),
    ADD COLUMN IF NOT EXISTS prodi_asal VARCHAR(200),
    ADD COLUMN IF NOT EXISTS ipk_asal VARCHAR(10),
    ADD COLUMN IF NOT EXISTS sks_asal VARCHAR(10);

-- ============================================================
-- 7. PERBAIKI NAMA KOLOM JIKA PERLU (snake_case vs camelCase)
--    Schema menggunakan snake_case, Model GORM PascalCase
-- ============================================================
-- Kolom semester_sekarang vs SemesterSekarang -> standarisasi
ALTER TABLE mahasiswa.mahasiswa
    ADD COLUMN IF NOT EXISTS status_akademik VARCHAR(50) DEFAULT 'Aktif',
    ADD COLUMN IF NOT EXISTS jalur_masuk VARCHAR(50);

-- ============================================================
-- 8. TAMBAHKAN INDEX UNTUK KOLOM BARU
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_mahasiswa_nik ON mahasiswa.mahasiswa(nik);
CREATE INDEX IF NOT EXISTS idx_mahasiswa_nisn ON mahasiswa.mahasiswa(nisn);
CREATE INDEX IF NOT EXISTS idx_mahasiswa_email_kampus ON mahasiswa.mahasiswa(email_kampus);
CREATE INDEX IF NOT EXISTS idx_mahasiswa_status_akademik ON mahasiswa.mahasiswa(status_akademik);

COMMIT;

-- ============================================================
-- VERIFIKASI: Jalankan query ini untuk melihat struktur akhir
-- ============================================================
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'mahasiswa'
--   AND table_name = 'mahasiswa'
-- ORDER BY ordinal_position;
