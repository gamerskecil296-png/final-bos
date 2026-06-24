
CREATE SCHEMA IF NOT EXISTS ormawa;
SET search_path TO ormawa, public;
-- ============================================================
--  SIAKAD ORMAWA — PostgreSQL Database Schema
--  Versi   : 1.0.0
--  Deskripsi: Schema lengkap sistem informasi akademik ormawa
--             mencakup RBAC, anggota, kegiatan, keuangan, LPJ
-- ============================================================

-- ============================================================
--  EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
--  ENUM TYPES
-- ============================================================

CREATE TYPE status_anggota      AS ENUM ('aktif', 'tidak_aktif', 'alumni', 'pending');
CREATE TYPE status_proposal     AS ENUM ('draft', 'diajukan', 'direvisi', 'disetujui', 'ditolak');
CREATE TYPE status_kegiatan     AS ENUM ('terjadwal', 'berlangsung', 'selesai', 'dibatalkan');
CREATE TYPE status_pengajuan_dana AS ENUM ('pending', 'disetujui', 'ditolak');
CREATE TYPE jenis_transaksi     AS ENUM ('pemasukan', 'pengeluaran');
CREATE TYPE status_absensi      AS ENUM ('hadir', 'izin', 'alpha');
CREATE TYPE status_pengumuman   AS ENUM ('aktif', 'nonaktif', 'draft');
CREATE TYPE status_notifikasi   AS ENUM ('belum_dibaca', 'sudah_dibaca');
CREATE TYPE jenis_notifikasi    AS ENUM (
    'anggota_baru', 'proposal_masuk', 'proposal_disetujui', 'proposal_ditolak',
    'proposal_direvisi', 'kegiatan_mendatang', 'pengajuan_dana', 'pengumuman_baru',
    'absensi_dibuka', 'ljp_baru'
);
CREATE TYPE public.gender AS ENUM ('L', 'P');


-- ============================================================
--  SKEMA: RBAC (Role-Based Access Control)
-- ============================================================

-- Tabel roles — daftar role yang tersedia
CREATE TABLE public.roles (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama        VARCHAR(50) NOT NULL UNIQUE,          -- e.g. 'super_admin', 'admin_ormawa'
    deskripsi   TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabel permissions — daftar izin aksi yang bisa dilakukan
CREATE TABLE public.permissions (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    modul       VARCHAR(50) NOT NULL,                 -- e.g. 'anggota', 'keuangan'
    aksi        VARCHAR(50) NOT NULL,                 -- e.g. 'create', 'read', 'update', 'delete', 'approve'
    deskripsi   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (modul, aksi)
);

-- Tabel role_permissions — many-to-many role <-> permission
CREATE TABLE public.role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);


-- ============================================================
--  SKEMA: PENGGUNA & PROFIL
-- ============================================================

-- Tabel users — akun login sistem
CREATE TABLE public.users (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   TEXT        NOT NULL,                  -- bcrypt hash
    role_id         UUID        NOT NULL REFERENCES roles(id),
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    email_verified  BOOLEAN     NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabel anggota — profil lengkap anggota ormawa
CREATE TABLE public.anggota (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID          UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    nim             VARCHAR(20)   NOT NULL UNIQUE,
    nama_lengkap    VARCHAR(150)  NOT NULL,
    foto_url        TEXT,
    gender          gender,
    tanggal_lahir   DATE,
    jurusan         VARCHAR(100)  NOT NULL,
    program_studi   VARCHAR(100),
    angkatan        SMALLINT      NOT NULL,               -- e.g. 2022
    no_hp           VARCHAR(20),
    alamat          TEXT,
    status          status_anggota NOT NULL DEFAULT 'pending',
    tanggal_bergabung DATE        DEFAULT CURRENT_DATE,
    tanggal_nonaktif  DATE,
    approved_by     UUID          REFERENCES users(id),   -- admin yang approve
    approved_at     TIMESTAMPTZ,
    catatan         TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ============================================================
--  SKEMA: STRUKTUR ORGANISASI
-- ============================================================

-- Tabel periode_kepengurusan — tahun kepengurusan
CREATE TABLE periode_kepengurusan (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama            VARCHAR(100) NOT NULL,              -- e.g. 'Periode 2024/2025'
    tahun_mulai     SMALLINT    NOT NULL,
    tahun_selesai   SMALLINT    NOT NULL,
    is_aktif        BOOLEAN     NOT NULL DEFAULT FALSE, -- hanya 1 yang aktif
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tahun CHECK (tahun_selesai >= tahun_mulai)
);

-- Tabel divisi — departemen/divisi dalam ormawa
CREATE TABLE divisi (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    periode_id      UUID        NOT NULL REFERENCES periode_kepengurusan(id) ON DELETE CASCADE,
    nama            VARCHAR(100) NOT NULL,
    deskripsi       TEXT,
    urutan          SMALLINT    DEFAULT 0,              -- untuk sorting bagan org
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabel jabatan — posisi dalam struktur organisasi
CREATE TABLE jabatan (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama            VARCHAR(100) NOT NULL,              -- e.g. 'Ketua BEM', 'Kepala Divisi'
    level           SMALLINT    NOT NULL DEFAULT 3,     -- 1=ketua, 2=wakil/sekum, 3=kabid, 4=anggota
    deskripsi       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabel kepengurusan — anggota yang menjabat posisi tertentu
CREATE TABLE kepengurusan (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    periode_id      UUID        NOT NULL REFERENCES periode_kepengurusan(id) ON DELETE CASCADE,
    anggota_id      UUID        NOT NULL REFERENCES anggota(id) ON DELETE CASCADE,
    jabatan_id      UUID        NOT NULL REFERENCES jabatan(id),
    divisi_id       UUID        REFERENCES divisi(id),
    tanggal_mulai   DATE        NOT NULL,
    tanggal_selesai DATE,
    is_aktif        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
--  SKEMA: PROPOSAL KEGIATAN
-- ============================================================

-- Tabel proposal — pengajuan proposal kegiatan
CREATE TABLE proposal (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_proposal       VARCHAR(30)   NOT NULL UNIQUE,   -- e.g. 'PROP/2025/001'
    judul               VARCHAR(255)  NOT NULL,
    deskripsi           TEXT          NOT NULL,
    tujuan              TEXT          NOT NULL,
    sasaran             TEXT,
    lokasi              VARCHAR(255),
    tanggal_mulai       DATE          NOT NULL,
    tanggal_selesai     DATE          NOT NULL,
    estimasi_peserta    INTEGER,
    anggaran_diajukan   NUMERIC(15,2) NOT NULL DEFAULT 0,
    anggaran_disetujui  NUMERIC(15,2),
    divisi_id           UUID          REFERENCES divisi(id),
    pengaju_id          UUID          NOT NULL REFERENCES users(id),   -- pengurus/admin
    penanggung_jawab_id UUID          REFERENCES anggota(id),
    status              status_proposal NOT NULL DEFAULT 'draft',
    current_reviewer_id UUID          REFERENCES users(id),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tgl_proposal CHECK (tanggal_selesai >= tanggal_mulai)
);

-- Tabel proposal_dokumen — file pendukung proposal
CREATE TABLE proposal_dokumen (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id     UUID        NOT NULL REFERENCES proposal(id) ON DELETE CASCADE,
    nama_file       VARCHAR(255) NOT NULL,
    file_url        TEXT        NOT NULL,
    ukuran_byte     BIGINT,
    tipe_file       VARCHAR(50),
    uploaded_by     UUID        NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabel proposal_review — riwayat review/approval proposal
CREATE TABLE proposal_review (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id     UUID            NOT NULL REFERENCES proposal(id) ON DELETE CASCADE,
    reviewer_id     UUID            NOT NULL REFERENCES users(id),
    status_lama     status_proposal NOT NULL,
    status_baru     status_proposal NOT NULL,
    komentar        TEXT,
    reviewed_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);


-- ============================================================
--  SKEMA: JADWAL & KEGIATAN
-- ============================================================

-- Tabel kegiatan — kegiatan yang telah disetujui & dijadwalkan
CREATE TABLE kegiatan (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id     UUID            UNIQUE REFERENCES proposal(id),   -- bisa null jika tanpa proposal
    judul           VARCHAR(255)    NOT NULL,
    deskripsi       TEXT,
    lokasi          VARCHAR(255),
    tanggal_mulai   TIMESTAMPTZ     NOT NULL,
    tanggal_selesai TIMESTAMPTZ     NOT NULL,
    estimasi_peserta INTEGER,
    status          status_kegiatan NOT NULL DEFAULT 'terjadwal',
    divisi_id       UUID            REFERENCES divisi(id),
    pic_id          UUID            REFERENCES anggota(id),           -- penanggung jawab
    created_by      UUID            NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tgl_kegiatan CHECK (tanggal_selesai >= tanggal_mulai)
);

-- Tabel kegiatan_dokumentasi — foto/file dokumentasi kegiatan
CREATE TABLE kegiatan_dokumentasi (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    kegiatan_id     UUID        NOT NULL REFERENCES kegiatan(id) ON DELETE CASCADE,
    judul           VARCHAR(255),
    file_url        TEXT        NOT NULL,
    tipe            VARCHAR(20) NOT NULL DEFAULT 'foto',  -- foto | video | dokumen
    uploaded_by     UUID        NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
--  SKEMA: ABSENSI
-- ============================================================

-- Tabel sesi_absensi — sesi absensi per kegiatan
CREATE TABLE sesi_absensi (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    kegiatan_id     UUID        NOT NULL REFERENCES kegiatan(id) ON DELETE CASCADE,
    nama_sesi       VARCHAR(100) NOT NULL DEFAULT 'Absensi Utama',
    qr_token        TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    dibuka_pada     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ditutup_pada    TIMESTAMPTZ,
    is_aktif        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_by      UUID        NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabel absensi — rekap kehadiran per anggota per sesi
CREATE TABLE absensi (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    sesi_id         UUID            NOT NULL REFERENCES sesi_absensi(id) ON DELETE CASCADE,
    anggota_id      UUID            NOT NULL REFERENCES anggota(id) ON DELETE CASCADE,
    status          status_absensi  NOT NULL DEFAULT 'alpha',
    checkin_at      TIMESTAMPTZ,
    metode          VARCHAR(20)     NOT NULL DEFAULT 'qr',   -- qr | manual
    keterangan      TEXT,
    diubah_oleh     UUID            REFERENCES users(id),    -- jika diubah manual oleh admin
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (sesi_id, anggota_id)
);


-- ============================================================
--  SKEMA: KEUANGAN
-- ============================================================

-- Tabel kas — saldo kas organisasi per periode
CREATE TABLE kas (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    periode_id      UUID          NOT NULL REFERENCES periode_kepengurusan(id),
    saldo_awal      NUMERIC(15,2) NOT NULL DEFAULT 0,
    saldo_akhir     NUMERIC(15,2) GENERATED ALWAYS AS (saldo_awal) STORED, -- akan diupdate via trigger
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (periode_id)
);

-- Tabel transaksi — setiap pemasukan/pengeluaran
CREATE TABLE transaksi (
    id              UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
    kas_id          UUID              NOT NULL REFERENCES kas(id),
    kegiatan_id     UUID              REFERENCES kegiatan(id),       -- opsional, jika terkait kegiatan
    kode_transaksi  VARCHAR(30)       NOT NULL UNIQUE,               -- e.g. 'TRX/2025/0001'
    jenis           jenis_transaksi   NOT NULL,
    judul           VARCHAR(255)      NOT NULL,
    keterangan      TEXT,
    jumlah          NUMERIC(15,2)     NOT NULL CHECK (jumlah > 0),
    tanggal         DATE              NOT NULL DEFAULT CURRENT_DATE,
    bukti_url       TEXT,                                            -- foto nota/bukti
    dicatat_oleh    UUID              NOT NULL REFERENCES users(id),
    disetujui_oleh  UUID              REFERENCES users(id),
    created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- Tabel pengajuan_dana — pengajuan dana dari pengurus ke admin
CREATE TABLE pengajuan_dana (
    id              UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id     UUID                    REFERENCES proposal(id),
    kegiatan_id     UUID                    REFERENCES kegiatan(id),
    pengaju_id      UUID                    NOT NULL REFERENCES users(id),
    judul           VARCHAR(255)            NOT NULL,
    keperluan       TEXT                    NOT NULL,
    jumlah          NUMERIC(15,2)           NOT NULL CHECK (jumlah > 0),
    status          status_pengajuan_dana   NOT NULL DEFAULT 'pending',
    disetujui_oleh  UUID                    REFERENCES users(id),
    disetujui_at    TIMESTAMPTZ,
    catatan_admin   TEXT,
    transaksi_id    UUID                    REFERENCES transaksi(id), -- terhubung ke transaksi jika disetujui
    created_at      TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

-- Tabel anggaran_kegiatan — rencana anggaran per pos per kegiatan
CREATE TABLE anggaran_kegiatan (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    kegiatan_id     UUID          NOT NULL REFERENCES kegiatan(id) ON DELETE CASCADE,
    nama_pos        VARCHAR(150)  NOT NULL,               -- e.g. 'Konsumsi', 'Sewa Gedung'
    jumlah_rencana  NUMERIC(15,2) NOT NULL DEFAULT 0,
    jumlah_realisasi NUMERIC(15,2) DEFAULT 0,
    keterangan      TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ============================================================
--  SKEMA: LPJ (LAPORAN PERTANGGUNGJAWABAN)
-- ============================================================

-- Tabel lpj — laporan pertanggungjawaban kegiatan
CREATE TABLE lpj (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    kegiatan_id         UUID        NOT NULL UNIQUE REFERENCES kegiatan(id),
    judul               VARCHAR(255) NOT NULL,
    ringkasan_kegiatan  TEXT        NOT NULL,
    evaluasi            TEXT,
    rekomendasi         TEXT,
    total_anggaran      NUMERIC(15,2) DEFAULT 0,
    total_realisasi     NUMERIC(15,2) DEFAULT 0,
    total_peserta       INTEGER       DEFAULT 0,
    pembuat_id          UUID        NOT NULL REFERENCES users(id),
    disetujui_oleh      UUID        REFERENCES users(id),
    disetujui_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabel lpj_dokumen — file lampiran LPJ
CREATE TABLE lpj_dokumen (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    lpj_id          UUID        NOT NULL REFERENCES lpj(id) ON DELETE CASCADE,
    nama_file       VARCHAR(255) NOT NULL,
    file_url        TEXT        NOT NULL,
    tipe            VARCHAR(20) NOT NULL DEFAULT 'dokumen',   -- foto | dokumen
    uploaded_by     UUID        NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
--  SKEMA: PENGUMUMAN
-- ============================================================

-- Tabel pengumuman
CREATE TABLE pengumuman (
    id              UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    judul           VARCHAR(255)        NOT NULL,
    isi             TEXT                NOT NULL,
    target_role_id  UUID                REFERENCES roles(id),  -- null = semua role
    status          status_pengumuman   NOT NULL DEFAULT 'draft',
    tanggal_mulai   DATE                NOT NULL DEFAULT CURRENT_DATE,
    tanggal_selesai DATE,
    dibuat_oleh     UUID                NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);


-- ============================================================
--  SKEMA: NOTIFIKASI
-- ============================================================

-- Tabel notifikasi — notifikasi per user
CREATE TABLE notifikasi (
    id              UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    jenis           jenis_notifikasi    NOT NULL,
    judul           VARCHAR(255)        NOT NULL,
    pesan           TEXT                NOT NULL,
    link_terkait    TEXT,                               -- e.g. '/proposal/uuid-xxx'
    status          status_notifikasi   NOT NULL DEFAULT 'belum_dibaca',
    dibaca_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);


-- ============================================================
--  SKEMA: AUDIT LOG
-- ============================================================

-- Tabel audit_log — log seluruh aktivitas penting di sistem
CREATE TABLE audit_log (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
    aksi            VARCHAR(100) NOT NULL,              -- e.g. 'approve_proposal'
    modul           VARCHAR(50)  NOT NULL,              -- e.g. 'proposal'
    target_id       UUID,                               -- id record yang dimodifikasi
    data_lama       JSONB,                              -- snapshot sebelum perubahan
    data_baru       JSONB,                              -- snapshot setelah perubahan
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ============================================================
--  INDEXES
-- ============================================================

-- users
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role_id ON public.users(role_id);

-- anggota
CREATE INDEX idx_anggota_nim ON public.anggota(nim);
CREATE INDEX idx_anggota_status ON public.anggota(status);
CREATE INDEX idx_anggota_jurusan ON public.anggota(jurusan);
CREATE INDEX idx_anggota_angkatan ON public.anggota(angkatan);
CREATE INDEX idx_anggota_user_id ON public.anggota(user_id);

-- kepengurusan
CREATE INDEX idx_kepengurusan_periode ON kepengurusan(periode_id);
CREATE INDEX idx_kepengurusan_anggota ON kepengurusan(anggota_id);

-- proposal
CREATE INDEX idx_proposal_status      ON proposal(status);
CREATE INDEX idx_proposal_pengaju     ON proposal(pengaju_id);
CREATE INDEX idx_proposal_divisi      ON proposal(divisi_id);
CREATE INDEX idx_proposal_tanggal     ON proposal(tanggal_mulai, tanggal_selesai);

-- kegiatan
CREATE INDEX idx_kegiatan_status      ON kegiatan(status);
CREATE INDEX idx_kegiatan_tanggal     ON kegiatan(tanggal_mulai, tanggal_selesai);
CREATE INDEX idx_kegiatan_divisi      ON kegiatan(divisi_id);

-- absensi
CREATE INDEX idx_absensi_sesi         ON absensi(sesi_id);
CREATE INDEX idx_absensi_anggota      ON absensi(anggota_id);
CREATE INDEX idx_absensi_status       ON absensi(status);

-- transaksi
CREATE INDEX idx_transaksi_kas        ON transaksi(kas_id);
CREATE INDEX idx_transaksi_jenis      ON transaksi(jenis);
CREATE INDEX idx_transaksi_tanggal    ON transaksi(tanggal);
CREATE INDEX idx_transaksi_kegiatan   ON transaksi(kegiatan_id);

-- notifikasi
CREATE INDEX idx_notifikasi_user      ON notifikasi(user_id);
CREATE INDEX idx_notifikasi_status    ON notifikasi(status);
CREATE INDEX idx_notifikasi_created   ON notifikasi(created_at DESC);

-- audit log
CREATE INDEX idx_audit_user           ON audit_log(user_id);
CREATE INDEX idx_audit_modul          ON audit_log(modul);
CREATE INDEX idx_audit_created        ON audit_log(created_at DESC);

-- pengumuman
CREATE INDEX idx_pengumuman_status    ON pengumuman(status);
CREATE INDEX idx_pengumuman_tgl       ON pengumuman(tanggal_mulai, tanggal_selesai);


-- ============================================================
--  TRIGGERS: updated_at otomatis
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at          BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_anggota_updated_at        BEFORE UPDATE ON public.anggota FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_roles_updated_at          BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_divisi_updated_at         BEFORE UPDATE ON divisi          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_kepengurusan_updated_at   BEFORE UPDATE ON kepengurusan    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_proposal_updated_at       BEFORE UPDATE ON proposal        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_kegiatan_updated_at       BEFORE UPDATE ON kegiatan        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_absensi_updated_at        BEFORE UPDATE ON absensi         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_transaksi_updated_at      BEFORE UPDATE ON transaksi       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pengajuan_dana_updated_at BEFORE UPDATE ON pengajuan_dana  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_anggaran_updated_at       BEFORE UPDATE ON anggaran_kegiatan FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_lpj_updated_at            BEFORE UPDATE ON lpj             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pengumuman_updated_at     BEFORE UPDATE ON pengumuman      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_periode_updated_at        BEFORE UPDATE ON periode_kepengurusan FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_kas_updated_at            BEFORE UPDATE ON kas             FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
--  TRIGGER: hanya 1 periode aktif sekaligus
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_single_active_periode()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_aktif = TRUE THEN
        UPDATE periode_kepengurusan
        SET    is_aktif = FALSE
        WHERE  id <> NEW.id AND is_aktif = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_single_active_periode
BEFORE INSERT OR UPDATE ON periode_kepengurusan
FOR EACH ROW EXECUTE FUNCTION enforce_single_active_periode();


-- ============================================================
--  VIEWS
-- ============================================================

-- View: ringkasan keuangan per periode
CREATE OR REPLACE VIEW v_ringkasan_keuangan AS
SELECT
    k.id                                                        AS kas_id,
    p.nama                                                      AS periode,
    k.saldo_awal,
    COALESCE(SUM(t.jumlah) FILTER (WHERE t.jenis = 'pemasukan'), 0)  AS total_pemasukan,
    COALESCE(SUM(t.jumlah) FILTER (WHERE t.jenis = 'pengeluaran'), 0) AS total_pengeluaran,
    k.saldo_awal
        + COALESCE(SUM(t.jumlah) FILTER (WHERE t.jenis = 'pemasukan'), 0)
        - COALESCE(SUM(t.jumlah) FILTER (WHERE t.jenis = 'pengeluaran'), 0) AS saldo_akhir
FROM kas k
JOIN periode_kepengurusan p ON p.id = k.periode_id
LEFT JOIN transaksi t       ON t.kas_id = k.id
GROUP BY k.id, p.nama, k.saldo_awal;

-- View: rekap kehadiran anggota
CREATE OR REPLACE VIEW v_rekap_absensi AS
SELECT
    a.anggota_id,
    mb.nama_lengkap,
    mb.nim,
    COUNT(*)                                            AS total_kegiatan,
    COUNT(*) FILTER (WHERE a.status = 'hadir')          AS hadir,
    COUNT(*) FILTER (WHERE a.status = 'izin')           AS izin,
    COUNT(*) FILTER (WHERE a.status = 'alpha')          AS alpha,
    ROUND(
        COUNT(*) FILTER (WHERE a.status = 'hadir')::NUMERIC
        / NULLIF(COUNT(*), 0) * 100, 2
    )                                                   AS persen_kehadiran
FROM absensi a
JOIN anggota mb ON mb.id = a.anggota_id
GROUP BY a.anggota_id, mb.nama_lengkap, mb.nim;

-- View: proposal dengan info pengaju & divisi
CREATE OR REPLACE VIEW v_proposal_detail AS
SELECT
    p.id,
    p.kode_proposal,
    p.judul,
    p.status,
    p.tanggal_mulai,
    p.tanggal_selesai,
    p.anggaran_diajukan,
    p.anggaran_disetujui,
    d.nama                  AS divisi,
    u.email                 AS email_pengaju,
    a.nama_lengkap          AS nama_pengaju,
    p.updated_at
FROM proposal p
LEFT JOIN divisi d      ON d.id = p.divisi_id
LEFT JOIN users u       ON u.id = p.pengaju_id
LEFT JOIN anggota a     ON a.user_id = p.pengaju_id;

-- View: dashboard stats (dipakai untuk widget dashboard admin)
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM anggota WHERE status = 'aktif')                                   AS anggota_aktif,
    (SELECT COUNT(*) FROM anggota WHERE status = 'pending')                                  AS anggota_pending,
    (SELECT COUNT(*) FROM kegiatan
     WHERE DATE_TRUNC('month', tanggal_mulai) = DATE_TRUNC('month', NOW()))                 AS kegiatan_bulan_ini,
    (SELECT COUNT(*) FROM pengumuman WHERE status = 'aktif')                                 AS pengumuman_aktif,
    (SELECT COUNT(*) FROM proposal WHERE status = 'diajukan')                                AS proposal_pending,
    (SELECT saldo_awal
        + COALESCE(SUM(t.jumlah) FILTER (WHERE t.jenis='pemasukan'),0)
        - COALESCE(SUM(t.jumlah) FILTER (WHERE t.jenis='pengeluaran'),0)
     FROM kas k
     JOIN periode_kepengurusan pr ON pr.id = k.periode_id AND pr.is_aktif = TRUE
     LEFT JOIN transaksi t ON t.kas_id = k.id
     GROUP BY k.saldo_awal LIMIT 1)                                                          AS saldo_kas;


-- ============================================================
--  DATA SEED: RBAC — Roles & Permissions
-- ============================================================

INSERT INTO public.roles (nama, deskripsi) VALUES
    ('super_admin',   'Akses penuh ke seluruh sistem termasuk pengaturan RBAC'),
    ('admin_ormawa',  'Kelola anggota, kegiatan, keuangan, dan persetujuan proposal'),
    ('pengurus',      'Input data, buat proposal, kelola absensi divisinya'),
    ('anggota',       'Hanya bisa melihat informasi dan profil sendiri');

INSERT INTO public.permissions (modul, aksi, deskripsi) VALUES
    -- Anggota
    ('anggota', 'create',   'Tambah anggota baru'),
    ('anggota', 'read',     'Lihat daftar & detail anggota'),
    ('anggota', 'update',   'Edit data anggota'),
    ('anggota', 'delete',   'Hapus anggota'),
    ('anggota', 'approve',  'Setujui/tolak pendaftaran anggota'),
    ('anggota', 'export',   'Export data anggota'),
    -- Proposal
    ('proposal', 'create',  'Buat proposal kegiatan'),
    ('proposal', 'read',    'Lihat daftar & detail proposal'),
    ('proposal', 'update',  'Edit proposal'),
    ('proposal', 'delete',  'Hapus proposal'),
    ('proposal', 'approve', 'Setujui/tolak/revisi proposal'),
    -- Kegiatan
    ('kegiatan', 'create',  'Buat kegiatan'),
    ('kegiatan', 'read',    'Lihat jadwal kegiatan'),
    ('kegiatan', 'update',  'Edit kegiatan'),
    ('kegiatan', 'delete',  'Hapus kegiatan'),
    -- Absensi
    ('absensi', 'create',   'Buat sesi absensi & generate QR'),
    ('absensi', 'read',     'Lihat rekap absensi'),
    ('absensi', 'update',   'Edit status absensi manual'),
    ('absensi', 'export',   'Export laporan absensi'),
    -- Keuangan
    ('keuangan', 'create',  'Catat transaksi'),
    ('keuangan', 'read',    'Lihat laporan keuangan'),
    ('keuangan', 'update',  'Edit transaksi'),
    ('keuangan', 'delete',  'Hapus transaksi'),
    ('keuangan', 'approve', 'Setujui pengajuan dana'),
    ('keuangan', 'export',  'Export laporan keuangan'),
    -- LPJ
    ('lpj', 'create',       'Buat LPJ kegiatan'),
    ('lpj', 'read',         'Lihat LPJ'),
    ('lpj', 'update',       'Edit LPJ'),
    ('lpj', 'approve',      'Setujui LPJ'),
    ('lpj', 'export',       'Export LPJ ke PDF'),
    -- Pengumuman
    ('pengumuman', 'create', 'Buat pengumuman'),
    ('pengumuman', 'read',   'Lihat pengumuman'),
    ('pengumuman', 'update', 'Edit pengumuman'),
    ('pengumuman', 'delete', 'Hapus pengumuman'),
    -- Struktur Organisasi
    ('organisasi', 'create', 'Tambah jabatan/divisi'),
    ('organisasi', 'read',   'Lihat struktur organisasi'),
    ('organisasi', 'update', 'Edit struktur organisasi'),
    -- RBAC & Sistem
    ('rbac',    'manage',    'Kelola role & permission'),
    ('sistem',  'audit',     'Lihat audit log'),
    ('sistem',  'backup',    'Backup & restore data'),
    ('sistem',  'setting',   'Pengaturan sistem');

-- Assign permissions ke role super_admin (semua)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, permissions p WHERE r.nama = 'super_admin';

-- Assign permissions ke role admin_ormawa
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
JOIN public.permissions p ON (p.modul, p.aksi) IN (
    ('anggota','create'),('anggota','read'),('anggota','update'),('anggota','approve'),('anggota','export'),
    ('proposal','read'),('proposal','approve'),
    ('kegiatan','create'),('kegiatan','read'),('kegiatan','update'),('kegiatan','delete'),
    ('absensi','create'),('absensi','read'),('absensi','update'),('absensi','export'),
    ('keuangan','create'),('keuangan','read'),('keuangan','update'),('keuangan','approve'),('keuangan','export'),
    ('lpj','read'),('lpj','approve'),('lpj','export'),
    ('pengumuman','create'),('pengumuman','read'),('pengumuman','update'),('pengumuman','delete'),
    ('organisasi','create'),('organisasi','read'),('organisasi','update')
)
WHERE r.nama = 'admin_ormawa';

-- Assign permissions ke role pengurus
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
JOIN public.permissions p ON (p.modul, p.aksi) IN (
    ('anggota','read'),
    ('proposal','create'),('proposal','read'),('proposal','update'),
    ('kegiatan','read'),
    ('absensi','create'),('absensi','read'),('absensi','update'),
    ('keuangan','read'),
    ('lpj','create'),('lpj','read'),('lpj','update'),
    ('pengumuman','read'),
    ('organisasi','read')
)
WHERE r.nama = 'pengurus';

-- Assign permissions ke role anggota
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
JOIN public.permissions p ON (p.modul, p.aksi) IN (
    ('anggota','read'),
    ('kegiatan','read'),
    ('pengumuman','read'),
    ('organisasi','read')
)
WHERE r.nama = 'anggota';


-- ============================================================
--  END OF SCHEMA
-- ============================================================