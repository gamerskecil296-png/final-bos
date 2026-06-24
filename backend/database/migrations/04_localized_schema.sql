-- ============================================================
-- SIAKAD — SCHEMA INDONESIA DEFINITIF (Full Localized)
-- Migration: 04_localized_schema.sql
-- Versi  : 1.0.0
-- Catatan :
--   - Ini adalah schema resmi dengan nama tabel & kolom Bahasa Indonesia.
--   - Selaras penuh dengan GORM models di backend/models/models.go.
--   - Menggunakan IF NOT EXISTS agar aman dieksekusi berulang.
--   - Kolom "extended" adalah kolom tambahan yang dibutuhkan app
--     namun tidak ada di schema inti awal (sudah ditambahkan di sini).
--   - Tabel aspirasi menggunakan UUID (bukan SERIAL) karena logic
--     Student Voice sudah bergantung pada UUID.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. SISTEM OTENTIKASI & PERAN
-- ============================================================

CREATE TABLE IF NOT EXISTS peran (
    id     SERIAL PRIMARY KEY,
    nama_peran VARCHAR(50) NOT NULL,
    deskripsi  TEXT
);

CREATE TABLE IF NOT EXISTS pengguna (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR(100) UNIQUE NOT NULL,
    kata_sandi  TEXT NOT NULL,
    peran_id    INTEGER REFERENCES peran(id) ON DELETE RESTRICT,
    aktif       BOOLEAN DEFAULT TRUE,
    deleted_at  TIMESTAMPTZ,  -- Soft delete (GORM gorm.DeletedAt)
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pengguna_deleted ON pengguna(deleted_at);

-- ============================================================
-- 2. STRUKTUR ORGANISASI FAKULTAS
-- ============================================================

CREATE TABLE IF NOT EXISTS fakultas (
    id             SERIAL PRIMARY KEY,
    nama_fakultas  VARCHAR(100) NOT NULL,
    kode_fakultas  VARCHAR(10)  UNIQUE NOT NULL,
    dekan          VARCHAR(100),
    dibuat_pada    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS program_studi (
    id          SERIAL PRIMARY KEY,
    fakultas_id INTEGER REFERENCES fakultas(id) ON DELETE CASCADE,
    nama_prodi  VARCHAR(100) NOT NULL,
    kode_prodi  VARCHAR(10)  UNIQUE NOT NULL,
    jenjang     VARCHAR(10),
    akreditasi  VARCHAR(20),
    kapasitas   INTEGER,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prodi_fakultas ON program_studi(fakultas_id);

-- ============================================================
-- 3. SDM — DOSEN & MAHASISWA
-- ============================================================

CREATE TABLE IF NOT EXISTS dosen (
    id          SERIAL PRIMARY KEY,
    pengguna_id INTEGER REFERENCES pengguna(id) ON DELETE CASCADE,
    nidn        VARCHAR(20) UNIQUE,
    nama_dosen  VARCHAR(150) NOT NULL,
    fakultas_id INTEGER REFERENCES fakultas(id),
    prodi_id    INTEGER REFERENCES program_studi(id),
    jabatan     VARCHAR(50),
    apakah_dpa  BOOLEAN DEFAULT FALSE,
    foto_url    TEXT,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dosen_pengguna   ON dosen(pengguna_id);
CREATE INDEX IF NOT EXISTS idx_dosen_fakultas   ON dosen(fakultas_id);
CREATE INDEX IF NOT EXISTS idx_dosen_prodi      ON dosen(prodi_id);

CREATE TABLE IF NOT EXISTS mahasiswa (
    id              SERIAL PRIMARY KEY,
    pengguna_id     INTEGER REFERENCES pengguna(id) ON DELETE CASCADE,
    nim             VARCHAR(20) UNIQUE NOT NULL,
    nama_mahasiswa  VARCHAR(150) NOT NULL,
    prodi_id        INTEGER REFERENCES program_studi(id) ON DELETE RESTRICT,
    dosen_pa_id     INTEGER REFERENCES dosen(id) ON DELETE SET NULL,
    status_akun     VARCHAR(20) DEFAULT 'Aktif',
    ipk             DECIMAL(3,2) DEFAULT 0.00,
    total_sks       INTEGER DEFAULT 0,
    tahun_masuk     INTEGER,
    alamat          TEXT,
    no_hp           VARCHAR(20),
    dibuat_pada     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Kolom extended — dibutuhkan fitur profil & dashboard
    current_semester INTEGER DEFAULT 1,
    foto_url         TEXT,
    email_personal   VARCHAR(100),
    tempat_lahir     VARCHAR(100),
    tanggal_lahir    DATE,
    jenis_kelamin    VARCHAR(10),
    agama            VARCHAR(30),
    kota             VARCHAR(50),
    kode_pos         VARCHAR(10),
    golongan_darah   VARCHAR(5),
    credit_limit     INTEGER DEFAULT 24
);

CREATE INDEX IF NOT EXISTS idx_mahasiswa_pengguna ON mahasiswa(pengguna_id);
CREATE INDEX IF NOT EXISTS idx_mahasiswa_prodi    ON mahasiswa(prodi_id);
CREATE INDEX IF NOT EXISTS idx_mahasiswa_dosen_pa ON mahasiswa(dosen_pa_id);

-- ============================================================
-- 4. LAYANAN MAHASISWA (STUDENT SERVICES)
-- ============================================================

CREATE TABLE IF NOT EXISTS prestasi (
    id            SERIAL PRIMARY KEY,
    mahasiswa_id  INTEGER REFERENCES mahasiswa(id) ON DELETE CASCADE,
    nama_prestasi VARCHAR(255) NOT NULL,
    bidang        VARCHAR(100),
    tingkat       VARCHAR(50),
    peringkat     VARCHAR(50),
    tahun         INTEGER,
    penyelenggara VARCHAR(255),
    sertifikat_url TEXT,
    status        VARCHAR(20) DEFAULT 'MENUNGGU',
    poin_skpi     INTEGER DEFAULT 0,
    dibuat_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Kolom extended — dibutuhkan fitur verifikasi admin
    catatan       TEXT,
    verified_by   INTEGER,
    verified_at   TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prestasi_mahasiswa ON prestasi(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_prestasi_status    ON prestasi(status);

CREATE TABLE IF NOT EXISTS beasiswa (
    id            SERIAL PRIMARY KEY,
    nama_beasiswa VARCHAR(200) NOT NULL,
    penyelenggara VARCHAR(150),
    deskripsi     TEXT,
    min_ipk       DECIMAL(3,2),
    deadline      TIMESTAMP,
    kuota         INTEGER,
    status        VARCHAR(20) DEFAULT 'Buka',
    dibuat_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Kolom extended
    kategori          VARCHAR(50),
    persyaratan       TEXT,
    nilai_bantuan     DECIMAL(15,2),
    sisa_kuota        INTEGER,
    is_berbasis_ekonomi BOOLEAN DEFAULT FALSE,
    is_aktif          BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_beasiswa_status ON beasiswa(status);

CREATE TABLE IF NOT EXISTS pendaftaran_beasiswa (
    id           SERIAL PRIMARY KEY,
    beasiswa_id  INTEGER REFERENCES beasiswa(id) ON DELETE CASCADE,
    mahasiswa_id INTEGER REFERENCES mahasiswa(id) ON DELETE CASCADE,
    dokumen_url  TEXT,
    status       VARCHAR(20) DEFAULT 'Proses',
    catatan      TEXT,
    dibuat_pada  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Kolom extended
    nomor_referensi VARCHAR(50) UNIQUE,
    motivasi        TEXT,
    prestasi        TEXT,
    diupdate_pada   TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daftar_beasiswa_mahasiswa ON pendaftaran_beasiswa(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_daftar_beasiswa_beasiswa  ON pendaftaran_beasiswa(beasiswa_id);

-- ============================================================
-- 5. STUDENT VOICE (ASPIRASI)
-- Catatan: id menggunakan UUID, bukan SERIAL, karena tiket aspirasi
-- sudah menggunakan UUID di seluruh logic dan endpoint API.
-- ============================================================

CREATE TABLE IF NOT EXISTS aspirasi (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mahasiswa_id  INTEGER REFERENCES mahasiswa(id) ON DELETE CASCADE,
    judul         VARCHAR(255) NOT NULL,
    deskripsi     TEXT,
    kategori      VARCHAR(50),
    status        VARCHAR(20) DEFAULT 'proses',
    tanggapan     TEXT,
    dibuat_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Kolom extended Student Voice module
    nomor_tiket   VARCHAR(50) UNIQUE,
    fakultas_id   INTEGER REFERENCES fakultas(id),
    lampiran_url  VARCHAR(500),
    is_anonim     BOOLEAN DEFAULT FALSE,
    level_saat_ini VARCHAR(20) DEFAULT 'fakultas',
    diupdate_pada  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_aspirasi_mahasiswa ON aspirasi(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_aspirasi_status    ON aspirasi(status);
CREATE INDEX IF NOT EXISTS idx_aspirasi_fakultas  ON aspirasi(fakultas_id);

CREATE TABLE IF NOT EXISTS tiket_timeline_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tiket_id       UUID NOT NULL REFERENCES aspirasi(id) ON DELETE CASCADE,
    tipe_event     VARCHAR(100),
    level          VARCHAR(50),
    isi_respons    TEXT,
    dilakukan_oleh INTEGER,
    dibuat_pada    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_timeline_tiket ON tiket_timeline_events(tiket_id);

-- ============================================================
-- 6. KESEHATAN & KONSELING
-- ============================================================

CREATE TABLE IF NOT EXISTS konseling (
    id           SERIAL PRIMARY KEY,
    mahasiswa_id INTEGER REFERENCES mahasiswa(id) ON DELETE CASCADE,
    jenis        VARCHAR(50),
    tanggal      DATE,
    jam          VARCHAR(10),
    status       VARCHAR(20) DEFAULT 'pending',
    konselor     VARCHAR(100),
    catatan      TEXT,
    dibuat_pada  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Kolom extended
    jadwal_id    INTEGER,
    keluhan_awal TEXT
);

CREATE INDEX IF NOT EXISTS idx_konseling_mahasiswa ON konseling(mahasiswa_id);

CREATE TABLE IF NOT EXISTS program_screening (
    id          SERIAL PRIMARY KEY,
    periode     VARCHAR(100) NOT NULL,
    target_smt  VARCHAR(50),
    status      VARCHAR(20) DEFAULT 'Berlangsung',
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hasil_screening (
    id           SERIAL PRIMARY KEY,
    mahasiswa_id INTEGER REFERENCES mahasiswa(id) ON DELETE CASCADE,
    program_id   INTEGER REFERENCES program_screening(id) ON DELETE CASCADE,
    kondisi      VARCHAR(50), -- Prima, Pantauan, Riwayat
    catatan      TEXT,
    dibuat_pada  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hasil_screening_mahasiswa ON hasil_screening(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_hasil_screening_program   ON hasil_screening(program_id);

-- ============================================================
-- 7. PKKMB & KONTEN
-- ============================================================

CREATE TABLE IF NOT EXISTS pkkmb_kegiatan (
    id          SERIAL PRIMARY KEY,
    judul       VARCHAR(255) NOT NULL,
    tanggal     DATE,
    jam_mulai   VARCHAR(10),
    jam_selesai VARCHAR(10),
    lokasi      VARCHAR(255),
    pemateri    VARCHAR(150),
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS berita (
    id          SERIAL PRIMARY KEY,
    judul       VARCHAR(255) NOT NULL,
    konten      TEXT,
    kategori    VARCHAR(50),
    penulis     VARCHAR(100),
    status      VARCHAR(20) DEFAULT 'Terbit',
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Kolom extended
    thumbnail    TEXT,
    views        INTEGER DEFAULT 0,
    diupdate_pada TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pendaftaran_mahasiswa_baru (
    id           SERIAL PRIMARY KEY,
    nomor_daftar VARCHAR(50) UNIQUE NOT NULL,
    nama_lengkap VARCHAR(150) NOT NULL,
    email        VARCHAR(100),
    pilihan_prodi VARCHAR(100),
    status       VARCHAR(20) DEFAULT 'Pending',
    dibuat_pada  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Kolom extended
    no_hp          VARCHAR(20),
    jalur          VARCHAR(30),
    nilai_rapor    DECIMAL(5,2),
    tanggal_daftar TIMESTAMP,
    diupdate_pada  TIMESTAMP
);

-- ============================================================
-- 8. MODUL AKADEMIK & KRS
-- ============================================================

CREATE TABLE IF NOT EXISTS periode_akademik (
    id           SERIAL PRIMARY KEY,
    nama_periode VARCHAR(100) NOT NULL,
    semester     VARCHAR(20),
    is_aktif     BOOLEAN DEFAULT FALSE,
    krs_buka     BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS mata_kuliah (
    id       SERIAL PRIMARY KEY,
    kode_mk  VARCHAR(20) UNIQUE NOT NULL,
    nama_mk  VARCHAR(150) NOT NULL,
    sks      INTEGER,
    semester INTEGER,
    prodi_id INTEGER REFERENCES program_studi(id),
    is_aktif BOOLEAN DEFAULT TRUE,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mk_prodi ON mata_kuliah(prodi_id);

CREATE TABLE IF NOT EXISTS jadwal_kuliah (
    id             SERIAL PRIMARY KEY,
    mk_id          INTEGER REFERENCES mata_kuliah(id),
    dosen_id       INTEGER REFERENCES dosen(id),
    periode_id     INTEGER REFERENCES periode_akademik(id),
    hari           INTEGER,
    jam_mulai      VARCHAR(10),
    jam_selesai    VARCHAR(10),
    ruangan        VARCHAR(50),
    kuota          INTEGER DEFAULT 40,
    sisa_kuota     INTEGER DEFAULT 40,
    tahun_akademik VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_jadwal_mk      ON jadwal_kuliah(mk_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_dosen   ON jadwal_kuliah(dosen_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_periode ON jadwal_kuliah(periode_id);

CREATE TABLE IF NOT EXISTS krs_header (
    id           SERIAL PRIMARY KEY,
    mahasiswa_id INTEGER REFERENCES mahasiswa(id),
    periode_id   INTEGER REFERENCES periode_akademik(id),
    status       VARCHAR(30) DEFAULT 'draft',
    total_sks    INTEGER DEFAULT 0,
    catatan_wali TEXT,
    dikirim_pada TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_krs_header_mahasiswa ON krs_header(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_krs_header_periode   ON krs_header(periode_id);

CREATE TABLE IF NOT EXISTS krs_detail (
    id       SERIAL PRIMARY KEY,
    krs_id   INTEGER REFERENCES krs_header(id) ON DELETE CASCADE,
    jadwal_id INTEGER REFERENCES jadwal_kuliah(id)
);

CREATE INDEX IF NOT EXISTS idx_krs_detail_krs    ON krs_detail(krs_id);
CREATE INDEX IF NOT EXISTS idx_krs_detail_jadwal ON krs_detail(jadwal_id);

-- ============================================================
-- 9. MODUL KENCANA (PKKMB Digital)
-- ============================================================

CREATE TABLE IF NOT EXISTS kencana_tahap (
    id              SERIAL PRIMARY KEY,
    nama            VARCHAR(50)  NOT NULL,
    label           VARCHAR(100) NOT NULL,
    urutan          INTEGER,
    tanggal_mulai   TIMESTAMP,
    tanggal_selesai TIMESTAMP,
    status          VARCHAR(20) DEFAULT 'akan_datang',
    is_aktif        BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS kencana_materi (
    id          SERIAL PRIMARY KEY,
    tahap_id    INTEGER REFERENCES kencana_tahap(id),
    judul       VARCHAR(255) NOT NULL,
    deskripsi   TEXT,
    file_url    TEXT,
    tipe        VARCHAR(20),
    urutan      INTEGER,
    is_aktif    BOOLEAN DEFAULT TRUE,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kencana_materi_tahap ON kencana_materi(tahap_id);

CREATE TABLE IF NOT EXISTS kencana_kuis (
    id            SERIAL PRIMARY KEY,
    materi_id     INTEGER REFERENCES kencana_materi(id),
    judul         VARCHAR(255),
    passing_grade INTEGER DEFAULT 75,
    bobot_persen  DECIMAL(5,2) DEFAULT 0,
    durasi_menit  INTEGER,
    is_aktif      BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_kencana_kuis_materi ON kencana_kuis(materi_id);

CREATE TABLE IF NOT EXISTS kuis_soal (
    id            SERIAL PRIMARY KEY,
    kuis_id       INTEGER REFERENCES kencana_kuis(id),
    pertanyaan    TEXT,
    opsi_a        VARCHAR(255),
    opsi_b        VARCHAR(255),
    opsi_c        VARCHAR(255),
    opsi_d        VARCHAR(255),
    kunci_jawaban VARCHAR(5),
    urutan        INTEGER
);

CREATE INDEX IF NOT EXISTS idx_kuis_soal_kuis ON kuis_soal(kuis_id);

CREATE TABLE IF NOT EXISTS kencana_hasil_kuis (
    id           SERIAL PRIMARY KEY,
    mahasiswa_id INTEGER REFERENCES mahasiswa(id),
    kuis_id      INTEGER REFERENCES kencana_kuis(id),
    skor         DECIMAL(5,2),
    jumlah_benar INTEGER,
    total_soal   INTEGER,
    lulus        BOOLEAN,
    percobaan_ke INTEGER,
    dibuat_pada  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hasil_kuis_mahasiswa ON kencana_hasil_kuis(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_hasil_kuis_kuis      ON kencana_hasil_kuis(kuis_id);

-- ============================================================
-- 10. DASHBOARD & UMUM
-- ============================================================

CREATE TABLE IF NOT EXISTS pengumuman (
    id              SERIAL PRIMARY KEY,
    judul           VARCHAR(255) NOT NULL,
    isi_singkat     TEXT,
    isi_lengkap     TEXT,
    kategori        VARCHAR(50),
    is_pinned       BOOLEAN DEFAULT FALSE,
    is_aktif        BOOLEAN DEFAULT TRUE,
    diterbitkan_pada TIMESTAMP,
    dibuat_pada     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diupdate_pada   TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kegiatan_kampus (
    id              SERIAL PRIMARY KEY,
    judul           VARCHAR(255) NOT NULL,
    deskripsi       TEXT,
    tanggal_mulai   TIMESTAMP NOT NULL,
    tanggal_selesai TIMESTAMP,
    kategori        VARCHAR(50),
    is_aktif        BOOLEAN DEFAULT TRUE,
    dibuat_pada     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS log_aktivitas (
    id           SERIAL PRIMARY KEY,
    mahasiswa_id INTEGER NOT NULL REFERENCES mahasiswa(id),
    tipe         VARCHAR(50) NOT NULL,
    deskripsi    TEXT NOT NULL,
    tautan       VARCHAR(300),
    dibuat_pada  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_log_aktivitas_mahasiswa ON log_aktivitas(mahasiswa_id);

-- ============================================================
-- 11. NOTIFIKASI & AUTENTIKASI LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS riwayat_login (
    id           SERIAL PRIMARY KEY,
    pengguna_id  INTEGER NOT NULL REFERENCES pengguna(id),
    alamat_ip    VARCHAR(50),
    user_agent   TEXT,
    status       VARCHAR(20),
    dibuat_pada  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_riwayat_login_pengguna ON riwayat_login(pengguna_id);

CREATE TABLE IF NOT EXISTS preferensi_notifikasi (
    id               SERIAL PRIMARY KEY,
    pengguna_id      INTEGER NOT NULL UNIQUE REFERENCES pengguna(id),
    notif_prestasi   BOOLEAN DEFAULT TRUE,
    notif_beasiswa   BOOLEAN DEFAULT TRUE,
    notif_konseling  BOOLEAN DEFAULT TRUE,
    notif_aspirasi   BOOLEAN DEFAULT TRUE,
    notif_kencana    BOOLEAN DEFAULT TRUE,
    notif_pengumuman BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS notifikasi (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pengguna_id  INTEGER NOT NULL REFERENCES pengguna(id),
    tipe         VARCHAR(50)  NOT NULL,
    judul        VARCHAR(200) NOT NULL,
    pesan        TEXT NOT NULL,
    tautan       VARCHAR(300),
    sudah_dibaca BOOLEAN DEFAULT FALSE,
    dibaca_pada  TIMESTAMP,
    dibuat_pada  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifikasi_pengguna ON notifikasi(pengguna_id, sudah_dibaca);
CREATE INDEX IF NOT EXISTS idx_notifikasi_dibuat   ON notifikasi(dibuat_pada);

-- ============================================================
-- 12. AUDIT & PENGATURAN SISTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS log_audit (
    id          SERIAL PRIMARY KEY,
    pengguna_id INTEGER REFERENCES pengguna(id),
    aksi        VARCHAR(100),
    entitas     VARCHAR(100),
    entitas_id  INTEGER,
    nilai_lama  TEXT,
    nilai_baru  TEXT,
    alamat_ip   VARCHAR(50),
    user_agent  TEXT,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_log_audit_pengguna ON log_audit(pengguna_id);

CREATE TABLE IF NOT EXISTS pengaturan_akademik (
    id              SERIAL PRIMARY KEY,
    tahun_aktif     VARCHAR(20),
    semester_aktif  VARCHAR(20),
    krs_buka        BOOLEAN DEFAULT FALSE,
    nilai_buka      BOOLEAN DEFAULT FALSE,
    diubah_oleh     INTEGER,
    diupdate_pada   TIMESTAMP
);
