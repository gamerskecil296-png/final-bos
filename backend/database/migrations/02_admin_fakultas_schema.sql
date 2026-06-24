DROP SCHEMA IF EXISTS fakultas_admin CASCADE;
CREATE SCHEMA IF NOT EXISTS fakultas_admin;
SET search_path TO fakultas_admin, public;
-- ============================================================
--  SIAKAD ADMIN FAKULTAS — PostgreSQL Database Schema
--  Versi   : 3.0.0 (Localized Indo + New Features)
--  Changelog:
--    v3.0.0 - Refactor nama tabel ke Bahasa Indonesia
--           - Tambah: periode_akademik, pengajuan_surat, program_mbkm,
--             organisasi_mahasiswa, proposal_ormawa, proposal_fakultas,
--             pkkmb_materi, pkkmb_tugas, pkkmb_kelulusan, pengumuman, berita
--           - Kolom baru: semester_sekarang, diperbarui_pada (mahasiswa/dosen),
--             catatan & diverifikasi_pada (prestasi),
--             thumbnail/dilihat/diperbarui_pada (berita),
--             deskripsi & wajib (pkkmb_kegiatan)
-- ============================================================

-- ============================================================
--  EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
--  ENUM TYPES (Bahasa Indonesia)
-- ============================================================

DO $$ BEGIN
    CREATE TYPE status_aspirasi_fak AS ENUM ('proses', 'klarifikasi', 'selesai', 'ditolak');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_approval_indo AS ENUM ('Menunggu', 'Terverifikasi', 'Ditolak', 'Diterima');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
--  1. PERAN (Roles)
-- ============================================================
CREATE TABLE IF NOT EXISTS fakultas_admin.peran (
    id           SERIAL PRIMARY KEY,
    nama_peran   VARCHAR(50) NOT NULL UNIQUE,
    deskripsi    TEXT,
    dibuat_pada  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  2. FAKULTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS fakultas_admin.fakultas (
    id              SERIAL PRIMARY KEY,
    nama_fakultas   VARCHAR(100) NOT NULL,
    kode_fakultas   VARCHAR(10)  UNIQUE NOT NULL,
    dekan           VARCHAR(100),
    dibuat_pada     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  3. PENGGUNA (Users)
-- ============================================================
CREATE TABLE IF NOT EXISTS fakultas_admin.pengguna (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(150) NOT NULL UNIQUE,
    kata_sandi      TEXT NOT NULL,
    peran_id        INTEGER REFERENCES fakultas_admin.peran(id),
    fakultas_id     INTEGER REFERENCES fakultas_admin.fakultas(id) ON DELETE SET NULL,
    aktif           BOOLEAN DEFAULT TRUE,
    dibuat_pada     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  4. PROGRAM STUDI
-- ============================================================
CREATE TABLE IF NOT EXISTS fakultas_admin.program_studi (
    id              SERIAL PRIMARY KEY,
    fakultas_id     INTEGER NOT NULL REFERENCES fakultas_admin.fakultas(id) ON DELETE CASCADE,
    kode_prodi      VARCHAR(20) UNIQUE NOT NULL,
    nama_prodi      VARCHAR(150) NOT NULL,
    akreditasi      VARCHAR(5) DEFAULT 'B',
    jenjang         VARCHAR(20) DEFAULT 'S1',
    dibuat_pada     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  5. DOSEN
-- ============================================================
CREATE TABLE IF NOT EXISTS fakultas_admin.dosen (
    id              SERIAL PRIMARY KEY,
    pengguna_id     INTEGER UNIQUE REFERENCES fakultas_admin.pengguna(id) ON DELETE SET NULL,
    fakultas_id     INTEGER NOT NULL REFERENCES fakultas_admin.fakultas(id) ON DELETE CASCADE,
    nidn            VARCHAR(20) UNIQUE,
    nama_dosen      VARCHAR(255) NOT NULL,
    apakah_dpa      BOOLEAN DEFAULT FALSE,
    dibuat_pada     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- [NEW] Pelacakan pembaruan profil dosen
);

ALTER TABLE fakultas_admin.program_studi
    ADD COLUMN IF NOT EXISTS kaprodi_id INTEGER REFERENCES fakultas_admin.dosen(id) ON DELETE SET NULL;

-- ============================================================
--  6. MAHASISWA
-- ============================================================
CREATE TABLE IF NOT EXISTS fakultas_admin.mahasiswa (
    id                SERIAL PRIMARY KEY,
    pengguna_id       INTEGER UNIQUE REFERENCES fakultas_admin.pengguna(id) ON DELETE SET NULL,
    nim               VARCHAR(20) NOT NULL UNIQUE,
    nama_mahasiswa    VARCHAR(255) NOT NULL,
    prodi_id          INTEGER NOT NULL REFERENCES fakultas_admin.program_studi(id),
    dosen_pa_id       INTEGER REFERENCES fakultas_admin.dosen(id),
    semester_sekarang INTEGER DEFAULT 1,                     -- [NEW] Posisi semester aktif
    tahun_masuk       INTEGER,
    jenis_kelamin     CHAR(1),
    ipk               DECIMAL(3,2) DEFAULT 0.00,
    credit_limit      INTEGER DEFAULT 24,
    status_akun       VARCHAR(20) DEFAULT 'Aktif',
    dibuat_pada       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP    -- [NEW] Timestamp sinkronisasi data
);

-- ============================================================
--  7. PERIODE AKADEMIK [NEW]
--     Untuk mengatur tahun ajaran dan semester aktif
-- ============================================================
CREATE TABLE IF NOT EXISTS fakultas_admin.periode_akademik (
    id              SERIAL PRIMARY KEY,
    nama_periode    VARCHAR(100) NOT NULL,  -- "Ganjil 2025/2026"
    semester        VARCHAR(20),            -- "Ganjil" / "Genap"
    tahun_ajaran    VARCHAR(20),
    tanggal_mulai   DATE,
    tanggal_selesai DATE,
    is_aktif        BOOLEAN DEFAULT FALSE,
    krs_buka        BOOLEAN DEFAULT FALSE,
    dibuat_pada     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  8. PRESTASI MAHASISWA
-- ============================================================
CREATE TABLE IF NOT EXISTS fakultas_admin.prestasi (
    id                SERIAL PRIMARY KEY,
    mahasiswa_id      INTEGER NOT NULL REFERENCES fakultas_admin.mahasiswa(id) ON DELETE CASCADE,
    nama_prestasi     VARCHAR(255) NOT NULL,
    bidang            VARCHAR(50) NOT NULL,
    tingkat           VARCHAR(50) NOT NULL,
    peringkat         VARCHAR(50),
    tahun             INTEGER NOT NULL,
    penyelenggara     VARCHAR(255),
    sertifikat_url    TEXT,
    status            status_approval_indo DEFAULT 'Menunggu',
    poin_skpi         INTEGER DEFAULT 0,
    catatan           TEXT,                       -- [NEW] Feedback dari admin/dekanat saat verifikasi
    diverifikasi_pada TIMESTAMP,                 -- [NEW] Timestamp resmi persetujuan prestasi
    diverifikasi_oleh INTEGER REFERENCES fakultas_admin.pengguna(id),
    dibuat_pada       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  9. PKKMB — Kegiatan + Kolom Baru
-- ============================================================
CREATE TABLE IF NOT EXISTS fakultas_admin.pkkmb_kegiatan (
    id          SERIAL PRIMARY KEY,
    judul       VARCHAR(255) NOT NULL,
    deskripsi   TEXT,                    -- [NEW] Detail agenda kegiatan
    tanggal     DATE,
    jam_mulai   VARCHAR(10),
    jam_selesai VARCHAR(10),
    lokasi      VARCHAR(255),
    pemateri    VARCHAR(150),
    wajib       BOOLEAN DEFAULT TRUE,   -- [NEW] Flag wajib/opsional
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- pkkmb_materi: Penyimpanan file dan link materi pembekalan [NEW]
CREATE TABLE IF NOT EXISTS fakultas_admin.pkkmb_materi (
    id          SERIAL PRIMARY KEY,
    kegiatan_id INTEGER REFERENCES fakultas_admin.pkkmb_kegiatan(id) ON DELETE CASCADE,
    judul       VARCHAR(255) NOT NULL,
    deskripsi   TEXT,
    tipe        VARCHAR(20),   -- pdf, video, link
    file_url    TEXT,
    urutan      INTEGER DEFAULT 1,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- pkkmb_tugas: Pengelolaan penugasan selama PKKMB [NEW]
CREATE TABLE IF NOT EXISTS fakultas_admin.pkkmb_tugas (
    id          SERIAL PRIMARY KEY,
    kegiatan_id INTEGER REFERENCES fakultas_admin.pkkmb_kegiatan(id) ON DELETE CASCADE,
    judul       VARCHAR(255) NOT NULL,
    deskripsi   TEXT,
    deadline    TIMESTAMP,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- pkkmb_kelulusan: Monitoring evaluasi akhir kelulusan PKKMB [NEW]
CREATE TABLE IF NOT EXISTS fakultas_admin.pkkmb_kelulusan (
    id                SERIAL PRIMARY KEY,
    mahasiswa_id      INTEGER NOT NULL REFERENCES fakultas_admin.mahasiswa(id) ON DELETE CASCADE,
    tahun_pelaksanaan INTEGER NOT NULL,
    nilai_akademik    DECIMAL(5,2) DEFAULT 0.00,
    kehadiran         INTEGER DEFAULT 0,
    status_kelulusan  VARCHAR(50) DEFAULT 'Tidak Lulus',
    sertifikat_url    TEXT,
    catatan           TEXT,
    dibuat_pada       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  10. KESEHATAN
-- ============================================================
CREATE TABLE IF NOT EXISTS fakultas_admin.kesehatan (
    id                 SERIAL PRIMARY KEY,
    mahasiswa_id       INTEGER NOT NULL REFERENCES fakultas_admin.mahasiswa(id) ON DELETE CASCADE,
    tanggal_screening  DATE NOT NULL,
    golongan_darah     VARCHAR(5),
    tinggi_badan_cm    INTEGER,
    berat_badan_kg     INTEGER,
    tekanan_darah      VARCHAR(20),
    alergi             TEXT,
    buta_warna         VARCHAR(20) DEFAULT 'Tidak',
    riwayat_penyakit   TEXT,
    kategori_kesehatan VARCHAR(50),
    catatan_medis      TEXT,
    dibuat_pada        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  11. ASPIRASI FAKULTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS fakultas_admin.aspirasi_fakultas (
    id                SERIAL PRIMARY KEY,
    mahasiswa_id      INTEGER NOT NULL REFERENCES fakultas_admin.mahasiswa(id) ON DELETE CASCADE,
    topik             VARCHAR(255) NOT NULL,
    deskripsi         TEXT NOT NULL,
    kategori          VARCHAR(50),
    status            status_aspirasi_fak DEFAULT 'proses',
    tanggapan         TEXT,
    tanggal_tanggapan TIMESTAMP,
    ditangani_oleh    INTEGER REFERENCES fakultas_admin.pengguna(id),
    dibuat_pada       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  12. BEASISWA INTERNAL
-- ============================================================
CREATE TABLE IF NOT EXISTS fakultas_admin.beasiswa_internal (
    id              SERIAL PRIMARY KEY,
    nama_beasiswa   VARCHAR(255) NOT NULL,
    penyelenggara   VARCHAR(255) NOT NULL,
    kuota           INTEGER NOT NULL DEFAULT 0,
    persyaratan     TEXT,
    nominal         DECIMAL(15,2) DEFAULT 0,   -- [ATTR] DECIMAL(15,2) akurasi nilai rupiah
    min_ipk         DECIMAL(3,2) DEFAULT 0.00,
    tanggal_buka    DATE NOT NULL,
    tanggal_tutup   DATE NOT NULL,
    status_buka     BOOLEAN DEFAULT TRUE,
    dibuat_pada     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fakultas_admin.pendaftaran_beasiswa (
    id                 SERIAL PRIMARY KEY,
    mahasiswa_id       INTEGER NOT NULL REFERENCES fakultas_admin.mahasiswa(id) ON DELETE CASCADE,
    beasiswa_id        INTEGER NOT NULL REFERENCES fakultas_admin.beasiswa_internal(id) ON DELETE CASCADE,
    ipk_saat_mendaftar DECIMAL(3,2),
    berkas_url         TEXT,
    status             status_approval_indo DEFAULT 'Menunggu',
    catatan_reviewer   TEXT,
    direview_oleh      INTEGER REFERENCES fakultas_admin.pengguna(id),
    direview_pada      TIMESTAMP,
    dibuat_pada        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  13. KONSELING
-- ============================================================
CREATE TABLE IF NOT EXISTS fakultas_admin.konseling (
    id                SERIAL PRIMARY KEY,
    mahasiswa_id      INTEGER NOT NULL REFERENCES fakultas_admin.mahasiswa(id) ON DELETE CASCADE,
    tanggal_konseling DATE NOT NULL,
    topik             VARCHAR(255) NOT NULL,
    catatan           TEXT,
    status            status_approval_indo DEFAULT 'Menunggu',
    konselor_id       INTEGER REFERENCES fakultas_admin.pengguna(id),
    dibuat_pada       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  14. E-PERSURATAN [NEW]
--      Layanan pengajuan surat administratif mahasiswa
-- ============================================================
CREATE TABLE IF NOT EXISTS fakultas_admin.pengajuan_surat (
    id            SERIAL PRIMARY KEY,
    mahasiswa_id  INTEGER NOT NULL REFERENCES fakultas_admin.mahasiswa(id) ON DELETE CASCADE,
    jenis_surat   VARCHAR(100) NOT NULL,  -- Aktif Kuliah, Keterangan Lulus, dll
    keperluan     TEXT,
    status        VARCHAR(30) DEFAULT 'diajukan',  -- diajukan, diproses, siap_ambil, selesai, ditolak
    file_url      TEXT,
    catatan_admin TEXT,
    diproses_oleh INTEGER REFERENCES fakultas_admin.pengguna(id),
    dibuat_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  15. PROGRAM MBKM [NEW]
--      Pelacakan keterlibatan mahasiswa dalam Merdeka Belajar
-- ============================================================
CREATE TABLE IF NOT EXISTS fakultas_admin.program_mbkm (
    id             SERIAL PRIMARY KEY,
    mahasiswa_id   INTEGER NOT NULL REFERENCES fakultas_admin.mahasiswa(id) ON DELETE CASCADE,
    jenis_mbkm     VARCHAR(100) NOT NULL,  -- Magang, Studi Independen, Kampus Mengajar, dll
    mitra_nama     VARCHAR(255),
    durasi_bulan   INTEGER,
    sks_konversi   INTEGER DEFAULT 0,
    status         VARCHAR(30) DEFAULT 'terdaftar',  -- terdaftar, berjalan, rekon_sks, selesai, ditolak
    catatan        TEXT,
    disetujui_oleh INTEGER REFERENCES fakultas_admin.pengguna(id),
    dibuat_pada    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  16. ORMAWA [NEW]
--      Master data dan proposal kegiatan organisasi mahasiswa
-- ============================================================

-- organisasi_mahasiswa: Master data Ormawa di tingkat fakultas
CREATE TABLE IF NOT EXISTS fakultas_admin.organisasi_mahasiswa (
    id              SERIAL PRIMARY KEY,
    kode_org        VARCHAR(20) UNIQUE NOT NULL,  -- [ATTR] UNIQUE constraint
    nama_org        VARCHAR(255) NOT NULL,
    tipe            VARCHAR(50),   -- BEM, DPM, UKM, Himpunan
    ketua_nama      VARCHAR(150),
    jumlah_anggota  INTEGER DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'Aktif',
    deskripsi       TEXT,
    dibuat_pada     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- proposal_ormawa: Pengajuan anggaran dan kegiatan dari Ormawa ke Dekanat
CREATE TABLE IF NOT EXISTS fakultas_admin.proposal_ormawa (
    id            SERIAL PRIMARY KEY,
    org_id        INTEGER NOT NULL REFERENCES fakultas_admin.organisasi_mahasiswa(id) ON DELETE CASCADE,
    pengaju_id    INTEGER REFERENCES fakultas_admin.mahasiswa(id),
    judul         VARCHAR(255) NOT NULL,
    deskripsi     TEXT,
    anggaran      DECIMAL(15,2) DEFAULT 0,  -- [ATTR] DECIMAL(15,2) akurasi nilai rupiah
    dokumen_url   TEXT,
    status        VARCHAR(30) DEFAULT 'diajukan',
    catatan_admin TEXT,
    direview_oleh INTEGER REFERENCES fakultas_admin.pengguna(id),
    dibuat_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- proposal_fakultas: Pengajuan kegiatan internal/struktural fakultas
CREATE TABLE IF NOT EXISTS fakultas_admin.proposal_fakultas (
    id               SERIAL PRIMARY KEY,
    pengaju_id       INTEGER REFERENCES fakultas_admin.pengguna(id),
    judul            VARCHAR(255) NOT NULL,
    deskripsi        TEXT,
    anggaran         DECIMAL(15,2) DEFAULT 0,  -- [ATTR] DECIMAL(15,2) akurasi nilai rupiah
    dokumen_url      TEXT,
    status           VARCHAR(30) DEFAULT 'diajukan',
    catatan_reviewer TEXT,
    direview_oleh    INTEGER REFERENCES fakultas_admin.pengguna(id),
    dibuat_pada      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  17. PENGUMUMAN FAKULTAS [NEW]
--      Sistem broadcast informasi resmi fakultas
-- ============================================================
CREATE TABLE IF NOT EXISTS fakultas_admin.pengumuman (
    id               SERIAL PRIMARY KEY,
    judul            VARCHAR(255) NOT NULL,
    isi_singkat      TEXT,
    isi_lengkap      TEXT,
    kategori         VARCHAR(50),   -- Akademik, Kemahasiswaan, Umum, PKKMB
    is_pinned        BOOLEAN DEFAULT FALSE,
    is_aktif         BOOLEAN DEFAULT TRUE,
    dibuat_oleh      INTEGER REFERENCES fakultas_admin.pengguna(id),
    diterbitkan_pada TIMESTAMP,
    dibuat_pada      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  18. BERITA FAKULTAS [NEW — w/ thumbnail, dilihat, diperbarui_pada]
-- ============================================================
CREATE TABLE IF NOT EXISTS fakultas_admin.berita (
    id              SERIAL PRIMARY KEY,
    judul           VARCHAR(255) NOT NULL,
    konten          TEXT,
    kategori        VARCHAR(50),
    penulis         VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'Terbit',
    thumbnail       TEXT,                               -- [NEW] Link gambar utama
    dilihat         INTEGER DEFAULT 0,                  -- [NEW] Counter view statistik
    dibuat_pada     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- [NEW] Info update artikel
);

-- ============================================================
--  INITIAL DATA SEED (Peran)
-- ============================================================
INSERT INTO fakultas_admin.peran (nama_peran, deskripsi)
VALUES
    ('super_admin',    'Akses penuh sistem'),
    ('fakultas_admin', 'Akses manajemen fakultas'),
    ('dosen',          'Akses bimbingan akademik'),
    ('mahasiswa',      'Akses umum mahasiswa')
ON CONFLICT (nama_peran) DO NOTHING;

-- ============================================================
--  INDEXING (Optimization)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_fak_fakultas_kode        ON fakultas_admin.fakultas(kode_fakultas);
CREATE INDEX IF NOT EXISTS idx_fak_pengguna_email       ON fakultas_admin.pengguna(email);
CREATE INDEX IF NOT EXISTS idx_fak_mahasiswa_nim        ON fakultas_admin.mahasiswa(nim);
CREATE INDEX IF NOT EXISTS idx_fak_mahasiswa_prodi      ON fakultas_admin.mahasiswa(prodi_id);
CREATE INDEX IF NOT EXISTS idx_fak_prestasi_status      ON fakultas_admin.prestasi(status);
CREATE INDEX IF NOT EXISTS idx_fak_prestasi_mahasiswa   ON fakultas_admin.prestasi(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_fak_aspirasi_status      ON fakultas_admin.aspirasi_fakultas(status);
CREATE INDEX IF NOT EXISTS idx_fak_beasiswa_apps        ON fakultas_admin.pendaftaran_beasiswa(status);
CREATE INDEX IF NOT EXISTS idx_fak_pkkmb_materi         ON fakultas_admin.pkkmb_materi(kegiatan_id);
CREATE INDEX IF NOT EXISTS idx_fak_pkkmb_tugas          ON fakultas_admin.pkkmb_tugas(kegiatan_id);
CREATE INDEX IF NOT EXISTS idx_fak_pkkmb_kelulusan      ON fakultas_admin.pkkmb_kelulusan(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_fak_surat_mahasiswa      ON fakultas_admin.pengajuan_surat(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_fak_surat_status         ON fakultas_admin.pengajuan_surat(status);
CREATE INDEX IF NOT EXISTS idx_fak_mbkm_mahasiswa       ON fakultas_admin.program_mbkm(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_fak_mbkm_status          ON fakultas_admin.program_mbkm(status);
CREATE INDEX IF NOT EXISTS idx_fak_ormawa_kode          ON fakultas_admin.organisasi_mahasiswa(kode_org);
CREATE INDEX IF NOT EXISTS idx_fak_proposal_ormawa      ON fakultas_admin.proposal_ormawa(org_id, status);
CREATE INDEX IF NOT EXISTS idx_fak_proposal_fakultas    ON fakultas_admin.proposal_fakultas(status);
CREATE INDEX IF NOT EXISTS idx_fak_pengumuman_aktif     ON fakultas_admin.pengumuman(is_aktif, is_pinned);
CREATE INDEX IF NOT EXISTS idx_fak_berita_status        ON fakultas_admin.berita(status);